/**
 * Redução Gráfica Progressiva de Diagramas de Blocos (Álgebra de Blocos)
 *
 * Opera sobre a MESMA representação interna normalizada do circuito usada pelas equações dos
 * somadores, pela eliminação algébrica e pelo script Scilab. Cada transformação gera um
 * diagrama equivalente (snapshot) e as equações correspondentes:
 *
 *  - Associação em série (cascata)            G_a · G_b
 *  - Associação em paralelo                   G_a ± G_b
 *  - Deslocamento do somador para antes de um bloco (compensação 1/G no ramo de realimentação)
 *  - Malha fechada canônica                   G / (1 ± G·H)
 *  - Laço próprio                             1 / (1 − L)
 *  - Deslocamento de ponto de soma/derivação  (eliminação de nó interno — caso geral)
 *
 * Nenhuma fórmula é fixa para um exercício específico: tudo decorre da topologia.
 */

import { DiagramGraph } from '../../core/reduction/mason';
import {
  RatFunc,
  ratOne,
  ratMul,
  ratDiv,
  ratSub,
  ratAdd,
  ratScale,
  ratIsOne,
  ratIsZero
} from '../../core/algebra/rational';

export type RNodeKind = 'input' | 'output' | 'summer' | 'node';

export interface RNode {
  id: string;
  kind: RNodeKind;
  latex: string;
}

export interface REdge {
  id: string;
  from: string;
  to: string;
  /** Ganho efetivo do ramo (numérico ou simbólico, conforme os blocos) — sem o sinal */
  gain: RatFunc;
  /** Mesmo ganho expresso apenas pelos símbolos dos blocos (G1, G2, H1, ...) — sem o sinal */
  sym: RatFunc;
  /** Rótulo LaTeX exibido dentro do bloco do diagrama equivalente ('1' = fio simples) */
  label: string;
  /** Polaridade na entrada do somador (só é diferente de '+' quando o destino é somador) */
  sign: '+' | '-';
}

export interface RDiagram {
  nodes: RNode[];
  edges: REdge[];
  inputId: string;
  outputId: string;
}

export type ReductionRule =
  | 'original'
  | 'series'
  | 'parallel'
  | 'move-summer'
  | 'feedback'
  | 'simplify'
  | 'self-loop'
  | 'eliminate-node'
  | 'final';

export interface ReductionEquation {
  latex: string;
  note?: string;
}

export interface ReductionStep {
  index: number;
  rule: ReductionRule;
  title: string;
  description: string;
  equations: ReductionEquation[];
  diagram: RDiagram;
}

export interface GraphicalReductionResult {
  success: boolean;
  error?: string;
  steps: ReductionStep[];
  finalGain: RatFunc;
  finalSym: RatFunc;
  finalLatex: string;
  finalSymLatex: string;
}

export interface GraphicalReductionOptions {
  /** Símbolo de cada bloco: RatFunc simbólica (ex.: G1) e rótulo LaTeX (ex.: G_{1}(s)) */
  blockSymbols: Record<string, { sym: RatFunc; label: string }>;
  /** Rótulo LaTeX dos sinais (entradas, saídas) */
  signalLatex: Record<string, string>;
  /** Formatador LaTeX de RatFunc */
  formatLatex: (r: RatFunc) => string;
}

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------

const eff = (e: REdge, which: 'gain' | 'sym'): RatFunc => (e.sign === '-' ? ratScale(e[which], -1) : e[which]);

const ratEquals = (a: RatFunc, b: RatFunc): boolean => ratIsZero(ratSub(a, b));

function wrapLatex(l: string): string {
  const t = l.trim();
  if (t === '1') return '';
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if ((ch === '+' || ch === '-') && depth === 0 && i > 0) return `\\left(${t}\\right)`;
  }
  if (t.startsWith('-')) return `\\left(${t}\\right)`;
  return t;
}

const stripS = (l: string) => l.replace(/\(s\)$/, '');

function cloneDiagram(d: RDiagram): RDiagram {
  return {
    inputId: d.inputId,
    outputId: d.outputId,
    nodes: d.nodes.map(n => ({ ...n })),
    edges: d.edges.map(e => ({ ...e }))
  };
}

// -----------------------------------------------------------------------------
// Motor
// -----------------------------------------------------------------------------

export function reduceBlockDiagramGraphically(
  graph: DiagramGraph,
  inputId: string,
  outputId: string,
  opts: GraphicalReductionOptions
): GraphicalReductionResult {
  const fmt = opts.formatLatex;
  let edgeCounter = 0;
  let eqCounter = 0;
  let heqCounter = 0;
  let tCounter = 0;
  const newEdgeId = () => `re_${++edgeCounter}`;

  const elementsById = new Map(graph.elements.map(e => [e.id, e]));
  const nodes = new Map<string, RNode>();
  let edges: REdge[] = [];

  const nodeOf = (elId: string): string => {
    const el = elementsById.get(elId);
    return el?.type === 'block' ? `n:${elId}` : elId;
  };

  const isSummerNode = (id: string) => nodes.get(id)?.kind === 'summer';

  /**
   * Cria um ramo cujo ganho efetivo é sign·abs. A polaridade só é mantida separada quando o
   * destino é um somador; nos demais casos o sinal é incorporado ao ganho e ao rótulo.
   */
  const makeEdge = (
    from: string,
    to: string,
    absGain: RatFunc,
    absSym: RatFunc,
    label: string,
    sign: '+' | '-' = '+'
  ): REdge => {
    if (sign === '-' && isSummerNode(to)) {
      return { id: newEdgeId(), from, to, gain: absGain, sym: absSym, label, sign: '-' };
    }
    if (sign === '-') {
      const negLabel = label === '1' ? '-1' : `-${wrapLatex(label)}`;
      return {
        id: newEdgeId(),
        from,
        to,
        gain: ratScale(absGain, -1),
        sym: ratScale(absSym, -1),
        label: negLabel,
        sign: '+'
      };
    }
    return { id: newEdgeId(), from, to, gain: absGain, sym: absSym, label, sign: '+' };
  };

  // ---------- Construção do diagrama interno (só a entrada ativa — superposição) ----------
  graph.elements.forEach(el => {
    if (el.type === 'input') {
      if (el.id === inputId) nodes.set(el.id, { id: el.id, kind: 'input', latex: opts.signalLatex[el.id] || 'R(s)' });
    } else if (el.type === 'output') {
      nodes.set(el.id, {
        id: el.id,
        kind: el.id === outputId ? 'output' : 'node',
        latex: opts.signalLatex[el.id] || 'C(s)'
      });
    } else if (el.type === 'summer') {
      nodes.set(el.id, { id: el.id, kind: 'summer', latex: '' });
    } else if (el.type === 'block') {
      nodes.set(`n:${el.id}`, { id: `n:${el.id}`, kind: 'node', latex: '' });
    } else {
      nodes.set(el.id, { id: el.id, kind: 'node', latex: '' });
    }
  });

  graph.connections
    .filter(c => !c.isPending && c.from && c.to)
    .forEach(c => {
      const fromEl = elementsById.get(c.from);
      const toEl = elementsById.get(c.to);
      if (!fromEl || !toEl) return;
      if (fromEl.type === 'input' && fromEl.id !== inputId) return; // entrada zerada
      if (toEl.type === 'input') return;
      const src = nodeOf(c.from);
      const sign: '+' | '-' = c.sign === '-' ? '-' : '+';
      if (toEl.type === 'block') {
        const bs = opts.blockSymbols[toEl.id];
        const g = toEl.rat || ratOne();
        edges.push(makeEdge(src, `n:${toEl.id}`, g, bs?.sym || g, bs?.label || 'G(s)', sign));
      } else {
        edges.push(makeEdge(src, c.to, ratOne(), ratOne(), '1', sign));
      }
    });

  // Saída alimentada por um único fio vindo de um bloco: o sinal do bloco É a saída.
  const target = outputId;
  const contractInto = (keep: string, drop: string) => {
    edges = edges
      .map(e => ({ ...e, from: e.from === drop ? keep : e.from, to: e.to === drop ? keep : e.to }))
      .filter(e => !(e.from === keep && e.to === keep && e.label === '1' && e.sign === '+'));
    nodes.delete(drop);
  };
  {
    const inT = edges.filter(e => e.to === target);
    if (inT.length === 1 && inT[0].label === '1' && inT[0].sign === '+' && nodes.get(inT[0].from)?.kind === 'node') {
      contractInto(target, inT[0].from);
    }
  }

  // ---------- Poda: mantém apenas nós entre a entrada e a saída ----------
  const prune = () => {
    const fwd = new Set<string>([inputId]);
    const stack = [inputId];
    while (stack.length) {
      const cur = stack.pop()!;
      edges.filter(e => e.from === cur).forEach(e => {
        if (!fwd.has(e.to)) {
          fwd.add(e.to);
          stack.push(e.to);
        }
      });
    }
    const bwd = new Set<string>([target]);
    const st2 = [target];
    while (st2.length) {
      const cur = st2.pop()!;
      edges.filter(e => e.to === cur).forEach(e => {
        if (!bwd.has(e.from)) {
          bwd.add(e.from);
          st2.push(e.from);
        }
      });
    }
    Array.from(nodes.keys()).forEach(id => {
      if (!(fwd.has(id) && bwd.has(id))) nodes.delete(id);
    });
    edges = edges.filter(e => nodes.has(e.from) && nodes.has(e.to));
  };
  prune();

  const steps: ReductionStep[] = [];
  const snapshot = (rule: ReductionRule, title: string, description: string, equations: ReductionEquation[]) => {
    steps.push({
      index: steps.length + 1,
      rule,
      title,
      description,
      equations,
      diagram: cloneDiagram({ nodes: Array.from(nodes.values()), edges, inputId, outputId: target })
    });
  };

  const empty: GraphicalReductionResult = {
    success: false,
    steps,
    finalGain: ratOne(),
    finalSym: ratOne(),
    finalLatex: '',
    finalSymLatex: ''
  };

  if (!nodes.has(inputId) || !nodes.has(target)) {
    return { ...empty, error: 'Não existe caminho de sinal contínuo entre a entrada e a saída selecionadas.' };
  }

  snapshot(
    'original',
    'Diagrama original',
    'Diagrama montado no Construtor Livre, com todos os blocos, somadores, pontos de derivação, conexões e polaridades efetivamente conectados entre a entrada e a saída analisadas (demais entradas independentes zeradas).',
    []
  );

  const numericSuffix = (gain: RatFunc, sym: RatFunc): string =>
    ratEquals(gain, sym) ? '' : ` = ${fmt(gain)}`;

  /** Gera nome curto para rótulos longos, registrando a definição. */
  const shortName = (label: string, defs: ReductionEquation[], gain: RatFunc, sym: RatFunc): string => {
    if (label.length <= 30) return label;
    const name = `G_{\\mathrm{eq}${++eqCounter}}(s)`;
    defs.push({ latex: `${name} = ${label} = ${fmt(sym)}${numericSuffix(gain, sym)}` });
    return name;
  };

  const combineSeriesLabel = (a: string, b: string): string => {
    if (a === '1') return b;
    if (b === '1') return a;
    const ma = a.match(/^([A-Za-z])_\{([0-9a-z]+)\}\(s\)$/);
    const mb = b.match(/^([A-Za-z])_\{([0-9a-z]+)\}\(s\)$/);
    if (ma && mb && ma[1] === mb[1]) return `${ma[1]}_{${ma[2]}${mb[2]}}(s)`;
    return `${wrapLatex(a)}\\,${wrapLatex(b)}`;
  };

  const inEdges = (id: string) => edges.filter(e => e.to === id && e.from !== id);
  const outEdges = (id: string) => edges.filter(e => e.from === id && e.to !== id);

  const reachable = (from: string, to: string): boolean => {
    const seen = new Set<string>([from]);
    const st = [from];
    while (st.length) {
      const cur = st.pop()!;
      if (cur === to) return true;
      edges.filter(e => e.from === cur).forEach(e => {
        if (!seen.has(e.to)) {
          seen.add(e.to);
          st.push(e.to);
        }
      });
    }
    return false;
  };

  // ---------- Regras ----------

  const applySeries = (): boolean => {
    const eqs: ReductionEquation[] = [];
    let any = false;
    let nonTrivial = false;
    let removedSummer = false;
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of Array.from(nodes.values())) {
        if (n.kind === 'input' || n.id === target) continue;
        if (edges.some(e => e.from === n.id && e.to === n.id)) continue;
        const ins = inEdges(n.id);
        const outs = outEdges(n.id);
        if (ins.length !== 1 || outs.length !== 1) continue;
        const a = ins[0];
        const b = outs[0];
        const g = ratMul(eff(a, 'gain'), eff(b, 'gain'));
        const sy = ratMul(eff(a, 'sym'), eff(b, 'sym'));
        const negative = (a.sign === '-') !== (b.sign === '-');
        let label = combineSeriesLabel(a.label, b.label);
        const trivial = a.label === '1' || b.label === '1';
        if (!trivial) {
          nonTrivial = true;
          const shortL = shortName(label, eqs, g, sy);
          eqs.push({
            latex: `${shortL} = ${wrapLatex(a.label)}\\,${wrapLatex(b.label)} = ${fmt(negative ? ratScale(sy, -1) : sy)}${numericSuffix(
              negative ? ratScale(g, -1) : g,
              negative ? ratScale(sy, -1) : sy
            )}`
          });
          label = shortL;
        }
        if (n.kind === 'summer') removedSummer = true;
        const absG = negative ? ratScale(g, -1) : g;
        const absS = negative ? ratScale(sy, -1) : sy;
        const ne = makeEdge(a.from, b.to, absG, absS, label, negative ? '-' : '+');
        edges = edges.filter(e => e.id !== a.id && e.id !== b.id);
        edges.push(ne);
        nodes.delete(n.id);
        any = true;
        changed = true;
        break;
      }
    }
    if (!any) return false;
    if (nonTrivial || removedSummer) {
      snapshot(
        'series',
        'Associação de blocos em série (cascata)',
        removedSummer && !nonTrivial
          ? 'Somador com uma única entrada atua apenas como ligação direta do sinal (com sua polaridade) e é absorvido pelo ramo.'
          : 'Blocos ligados em cascata, sem derivação ou soma entre eles, são substituídos por um único bloco cuja função de transferência é o produto das funções individuais.',
        eqs
      );
    }
    return true;
  };

  const applyParallel = (): boolean => {
    const eqs: ReductionEquation[] = [];
    let any = false;
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < edges.length && !changed; i++) {
        for (let j = i + 1; j < edges.length; j++) {
          const a = edges[i];
          const b = edges[j];
          if (a.from !== b.from || a.to !== b.to || a.from === a.to) continue;
          const g = ratAdd(eff(a, 'gain'), eff(b, 'gain'));
          const sy = ratAdd(eff(a, 'sym'), eff(b, 'sym'));
          const la = `${a.sign === '-' ? '-' : ''}${wrapLatex(a.label) || '1'}`;
          const lb = `${b.sign === '-' ? '-' : '+'} ${wrapLatex(b.label) || '1'}`;
          let label = `${la} ${lb}`;
          label = shortName(label, eqs, g, sy);
          eqs.push({ latex: `${label} = ${la} ${lb} = ${fmt(sy)}${numericSuffix(g, sy)}` });
          const ne = makeEdge(a.from, a.to, g, sy, label, '+');
          edges = edges.filter(e => e.id !== a.id && e.id !== b.id);
          edges.push(ne);
          any = true;
          changed = true;
          break;
        }
      }
    }
    if (any) {
      snapshot(
        'parallel',
        'Associação de blocos em paralelo',
        'Ramos que partem do mesmo sinal e chegam ao mesmo ponto de soma são substituídos por um único bloco igual à soma algébrica (com as polaridades) das funções de transferência.',
        eqs
      );
    }
    return any;
  };

  const applySelfLoop = (): boolean => {
    const loop = edges.find(e => e.from === e.to);
    if (!loop) return false;
    const n = loop.from;
    const L = eff(loop, 'gain');
    const Ls = eff(loop, 'sym');
    edges = edges.filter(e => e.id !== loop.id);
    const factor = ratDiv(ratOne(), ratSub(ratOne(), L));
    const factorS = ratDiv(ratOne(), ratSub(ratOne(), Ls));
    const eqs: ReductionEquation[] = [
      {
        latex: `\\frac{1}{1 - \\left(${loop.sign === '-' ? '-' : ''}${loop.label}\\right)} = ${fmt(factorS)}${numericSuffix(factor, factorS)}`,
        note: 'Laço próprio: o sinal realimenta o próprio nó; todos os ramos que chegam ao nó são divididos por (1 − L).'
      }
    ];
    edges = edges.map(e => {
      if (e.to !== n) return e;
      const g = ratMul(e.gain, factor);
      const sy = ratMul(e.sym, factorS);
      const label = shortName(`\\frac{${e.label}}{1 - \\left(${loop.sign === '-' ? '-' : ''}${loop.label}\\right)}`, eqs, g, sy);
      return { ...e, gain: g, sym: sy, label };
    });
    snapshot('self-loop', 'Eliminação de laço próprio', 'Aplicação da relação de malha fechada a um laço que começa e termina no mesmo sinal.', eqs);
    return true;
  };

  const applyMoveSummer = (): boolean => {
    for (const S of Array.from(nodes.values())) {
      if (S.kind !== 'summer') continue;
      const ins = inEdges(S.id);
      const outs = outEdges(S.id);
      if (ins.length !== 2 || outs.length !== 1) continue;
      const out = outs[0];
      const Z = out.to;
      const back = ins.find(e => e.from === Z);
      const fwd = ins.find(e => e.from !== Z);
      if (!back || !fwd) continue;
      if (fwd.label === '1' || fwd.from === S.id) continue;
      if (reachable(S.id, fwd.from)) continue; // a entrada direta não pode pertencer à malha
      const fwdG = fwd.gain;
      const fwdS = fwd.sym;
      const heqName = `H_{\\mathrm{eq}${heqCounter > 0 ? heqCounter + 1 : ''}}(s)`;
      heqCounter++;
      const heqG = ratDiv(back.gain, fwdG);
      const heqS = ratDiv(back.sym, fwdS);
      const midId = `m:${S.id}:${heqCounter}`;
      nodes.set(midId, { id: midId, kind: 'node', latex: '' });
      const eIn = makeEdge(fwd.from, S.id, ratOne(), ratOne(), '1', fwd.sign);
      const eFb = makeEdge(Z, S.id, heqG, heqS, heqName, back.sign);
      const eBlk = makeEdge(S.id, midId, fwdG, fwdS, fwd.label, '+');
      const eRest: REdge = { ...out, id: newEdgeId(), from: midId };
      edges = edges.filter(e => e.id !== fwd.id && e.id !== back.id && e.id !== out.id);
      edges.push(eIn, eFb, eBlk, eRest);
      snapshot(
        'move-summer',
        `Deslocamento do somador para antes do bloco ${fwd.label}`,
        `O somador estava localizado depois de ${fwd.label}. Para deixar a malha na forma canônica, o somador é deslocado para antes desse bloco. Para preservar a equivalência, o sinal que entra pelo ramo de realimentação passa a ser dividido por ${fwd.label}, e ${fwd.label} passa a integrar o caminho direto.`,
        [
          {
            latex: `${heqName} = \\frac{${back.label}}{${fwd.label}} = ${fmt(heqS)}${numericSuffix(heqG, heqS)}`,
            note: 'Compensação do ramo de realimentação ao deslocar o somador para antes do bloco.'
          }
        ]
      );
      return true;
    }
    return false;
  };

  const applyFeedback = (): boolean => {
    for (const S of Array.from(nodes.values())) {
      if (S.kind !== 'summer') continue;
      const outs = outEdges(S.id);
      if (outs.length !== 1) continue;
      const fwd = outs[0];
      const Z = fwd.to;
      const backs = edges.filter(e => e.from === Z && e.to === S.id);
      if (backs.length !== 1 || Z === S.id) continue;
      const back = backs[0];
      const G = eff(fwd, 'gain');
      const Gs = eff(fwd, 'sym');
      const H = back.gain;
      const Hs = back.sym;
      const negative = back.sign === '-';
      const loopG = negative ? ratScale(ratMul(G, H), -1) : ratMul(G, H);
      const loopS = negative ? ratScale(ratMul(Gs, Hs), -1) : ratMul(Gs, Hs);
      const T = ratDiv(G, ratSub(ratOne(), loopG));
      const Ts = ratDiv(Gs, ratSub(ratOne(), loopS));
      const op = negative ? '+' : '-';
      const remainingInputs = inEdges(S.id).filter(e => e.id !== back.id);
      const isLast =
        Z === target && remainingInputs.length === 1 && remainingInputs[0].from === inputId && nodes.size <= 3;
      const tName = isLast ? 'T(s)' : `T_{${++tCounter}}(s)`;
      const gl = fwd.label;
      const hl = back.label;
      const gsL = fmt(Gs);
      const hsL = fmt(Hs);
      const substituted = `\\frac{${gsL}}{1 ${op} ${wrapLatex(gsL) || '1'}\\,${wrapLatex(hsL) || '1'}}`;
      const simplified = fmt(Ts);
      const eqs: ReductionEquation[] = [
        {
          latex: `${tName} = \\frac{${gl}}{1 ${op} ${wrapLatex(gl) || '1'}\\,${wrapLatex(hl) || '1'}}`,
          note: negative
            ? 'Realimentação negativa: T(s) = G(s) / [1 + G(s)H(s)].'
            : 'Realimentação positiva: T(s) = G(s) / [1 − G(s)H(s)].'
        },
        { latex: `${tName} = ${substituted}`, note: 'Substituição das funções equivalentes.' }
      ];
      edges = edges.filter(e => e.id !== fwd.id && e.id !== back.id);
      edges.push(makeEdge(S.id, Z, T, Ts, tName, '+'));
      snapshot(
        'feedback',
        'Aplicação da fórmula de malha fechada',
        `A malha formada pelo caminho direto ${gl} e pelo ramo de realimentação ${hl} (polaridade ${
          negative ? 'negativa' : 'positiva'
        } no somador) é substituída por um único bloco equivalente.`,
        eqs
      );
      const needsSimplification = substituted.replace(/\s/g, '') !== simplified.replace(/\s/g, '');
      if (needsSimplification) {
        const simpEqs: ReductionEquation[] = [{ latex: `${tName} = ${substituted} = ${simplified}` }];
        if (!ratEquals(T, Ts)) simpEqs.push({ latex: `${tName} = ${fmt(T)}`, note: 'Com os valores numéricos dos blocos.' });
        snapshot(
          'simplify',
          'Simplificação algébrica',
          'Os produtos do denominador são efetuados e os fatores comuns entre numerador e denominador são cancelados.',
          simpEqs
        );
      }
      return true;
    }
    return false;
  };

  const applyEliminate = (): boolean => {
    const candidates = Array.from(nodes.values()).filter(
      n => n.kind !== 'input' && n.id !== target && !edges.some(e => e.from === n.id && e.to === n.id)
    );
    if (candidates.length === 0) return false;
    candidates.sort((a, b) => inEdges(a.id).length * outEdges(a.id).length - inEdges(b.id).length * outEdges(b.id).length);
    const n = candidates[0];
    const ins = inEdges(n.id);
    const outs = outEdges(n.id);
    const eqs: ReductionEquation[] = [];
    const created: REdge[] = [];
    ins.forEach(a => {
      outs.forEach(b => {
        const g = ratMul(eff(a, 'gain'), eff(b, 'gain'));
        const sy = ratMul(eff(a, 'sym'), eff(b, 'sym'));
        const negative = (a.sign === '-') !== (b.sign === '-');
        let label = combineSeriesLabel(a.label, b.label);
        label = shortName(label, eqs, g, sy);
        created.push(makeEdge(a.from, b.to, negative ? ratScale(g, -1) : g, negative ? ratScale(sy, -1) : sy, label, negative ? '-' : '+'));
      });
    });
    edges = edges.filter(e => e.from !== n.id && e.to !== n.id);
    edges.push(...created);
    nodes.delete(n.id);
    snapshot(
      'eliminate-node',
      n.kind === 'summer' ? 'Deslocamento de ponto de soma' : 'Deslocamento de ponto de derivação',
      n.kind === 'summer'
        ? 'O somador é deslocado/distribuído: cada sinal que entrava nele passa a seguir diretamente para os destinos da sua saída, multiplicado pelos blocos do trajeto (mesma equação de soma, reescrita).'
        : 'O ponto de derivação é deslocado: cada ramo que sai dele passa a partir do sinal anterior, multiplicado pelo bloco que foi atravessado (compensação do deslocamento).',
      eqs.length > 0 ? eqs : created.map(e => ({ latex: `${e.sign === '-' ? '-' : ''}${e.label} = ${fmt(eff(e, 'sym'))}` }))
    );
    return true;
  };

  const isDone = () =>
    nodes.size === 2 && edges.length === 1 && edges[0].from === inputId && edges[0].to === target;

  let guard = 0;
  while (!isDone() && guard < 200) {
    guard++;
    prune();
    if (isDone()) break;
    if (applySeries()) continue;
    if (applyParallel()) continue;
    if (applySelfLoop()) continue;
    if (applyMoveSummer()) continue;
    if (applyFeedback()) continue;
    if (applyEliminate()) continue;
    break;
  }
  prune();

  if (!isDone()) {
    return { ...empty, error: 'Não foi possível concluir a redução gráfica deste circuito (topologia incompleta).' };
  }

  const finalEdge = edges[0];
  const finalGain = eff(finalEdge, 'gain');
  const finalSym = eff(finalEdge, 'sym');
  const finalSymLatex = fmt(finalSym);
  const finalLatex = fmt(finalGain);
  const outL = opts.signalLatex[target] || 'C(s)';
  const inL = opts.signalLatex[inputId] || 'R(s)';
  const finalEqs: ReductionEquation[] = [{ latex: `\\boxed{\\frac{${outL}}{${inL}} = ${finalSymLatex}}` }];
  if (!ratEquals(finalGain, finalSym)) {
    finalEqs.push({ latex: `\\frac{${outL}}{${inL}} = ${finalLatex}`, note: 'Substituindo as funções de transferência numéricas informadas.' });
  }
  edges = [{ ...finalEdge, label: 'T(s)' }];
  snapshot(
    'final',
    'Resultado final',
    'Diagrama reduzido a um único bloco entre a entrada e a saída.',
    finalEqs
  );

  // Rótulos iguais a 1 na saída final não fazem sentido como bloco
  if (ratIsOne(finalGain) && steps.length > 0) {
    steps[steps.length - 1].diagram.edges[0].label = '1';
  }

  return { success: true, steps, finalGain, finalSym, finalLatex, finalSymLatex };
}

export { stripS };
