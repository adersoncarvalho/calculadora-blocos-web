/**
 * Motor Simbólico e Racional Multi-Entrada / Multi-Sinal + Validação Algébrica Independente
 * Construtor Livre de Diagramas de Blocos
 *
 * Opera sobre o grafo real desenhado pelo usuário, preservando integralmente o motor
 * computeMasonAnalysis (src/core/reduction/mason.ts) e adicionando:
 * 1. Dedução real das equações algébricas dos somadores e blocos.
 * 2. Análise automática de múltiplas entradas independentes (R(s), W(s), ...) e superposição.
 * 3. Funções de transferência para a saída principal (ex: Y(s)) e sinais internos de erro/controle (ex: E(s), U(s)).
 * 4. Resolução algébrica independente por eliminação simbólica (sistema linear A(s)v(s) = B(s)u(s))
 *    e validação cruzada com a Regra de Mason.
 */

import {
  DiagramConnection,
  DiagramElement,
  DiagramGraph,
  MasonAnalysis,
  computeMasonAnalysis
} from '@/core/reduction/mason';
import {
  RatFunc,
  ratAdd,
  ratDiv,
  ratIsOne,
  ratIsZero,
  ratMul,
  ratOne,
  ratScale,
  ratSimplify,
  ratSub,
  ratToCompactParts,
  ratToLatex,
  ratZero
} from '@/core/algebra/rational';
import {
  Polynomial,
  polyAdd,
  polyEqual,
  polyFromNumber,
  polyIsOne,
  polyIsZero,
  polyMul,
  polyNormalize,
  polyScale,
  polyToCompact,
  polyToLatex
} from '@/core/algebra/polynomial';
import { parseRatExpr } from '@/core/algebra/parser';

export interface SignalNodeInfo {
  id: string;
  code: string;
  displayName: string; // Ex: "R(s)", "W(s)", "Y(s)", "Somador 1"
  signalSymbol: string; // Ex: "R(s)", "W(s)", "Y(s)", "E(s)", "U(s)"
  signalLatex: string; // Ex: "R(s)", "W(s)", "Y(s)", "E(s)", "U(s)"
  shortSymbol: string; // Ex: "R", "W", "Y", "E", "U"
  role: 'input-ref' | 'input-dist' | 'output' | 'summer' | 'block';
}

export interface SummerIncidentTerm {
  sign: '+' | '-';
  gainRat: RatFunc;
  gainSymbolicLatex: string; // Ex: "H_f(s)" ou "1"
  gainCompact: string; // Ex: "Hf(s)" ou ""
  sourceNodeId: string;
  sourceSignalSymbol: string; // Ex: "R(s)", "Y(s)", "E(s)", "W(s)"
  sourceSignalLatex: string; // Ex: "R(s)", "Y(s)", "E(s)", "W(s)"
  fullTermText: string; // Ex: "+ Hf(s)R(s)", "- Y(s)", "- W(s)"
  fullTermLatex: string; // Ex: "+ H_f(s)R(s)", "- Y(s)", "- W(s)"
}

export interface SummerAlgebraicEquation {
  summerId: string;
  summerName: string;
  signalSymbol: string; // Ex: "E(s)", "U(s)"
  signalLatex: string; // Ex: "E(s)", "U(s)"
  terms: SummerIncidentTerm[];
  equationText: string; // Ex: "E(s) = Hf(s)R(s) - Y(s)"
  equationLatex: string; // Ex: "E(s) = H_f(s)R(s) - Y(s)"
}

export interface OutputAlgebraicEquation {
  outputId: string;
  outputName: string;
  signalSymbol: string; // Ex: "Y(s)"
  signalLatex: string;
  terms: SummerIncidentTerm[];
  equationText: string; // Ex: "Y(s) = G(s)U(s)"
  equationLatex: string; // Ex: "Y(s) = G(s)U(s)"
}

export interface InputOutputMasonPair {
  inputInfo: SignalNodeInfo;
  targetInfo: SignalNodeInfo;
  masonAnalysis: MasonAnalysis;
  transferFunction: RatFunc;
  transferFunctionLatex: string;
  transferFunctionCompact: string; // Ex: "GHcHf/(1 + GHc)" ou "-G/(1 + GHc)"
  algebraicTransferFunction: RatFunc;
  matchesAlgebraic: boolean;
}

export interface AlgebraicValidationStep {
  title: string;
  description: string;
  equationText: string;
  equationLatex: string;
}

export interface CompleteSystemAnalysis {
  preparedGraph: DiagramGraph;
  isPureSymbolicMode: boolean;
  nodeInfoMap: Record<string, SignalNodeInfo>;
  independentInputs: SignalNodeInfo[];
  outputs: SignalNodeInfo[];
  summers: SignalNodeInfo[];
  blocks: {
    id: string;
    code: string;
    name: string;
    symbolLatex: string;
    dir: 'right' | 'left';
    gain: RatFunc;
    gainLatex: string;
    gainCompact: string;
  }[];
  summerEquations: SummerAlgebraicEquation[];
  outputEquations: OutputAlgebraicEquation[];
  primaryOutput: SignalNodeInfo;
  primaryInput: SignalNodeInfo;
  /** Pares de redução de Mason para a saída principal em relação a CADA entrada independente */
  outputByInputPairs: InputOutputMasonPair[];
  /** Pares de redução de Mason para cada somador (ex: erro E(s), controle U(s)) em relação a CADA entrada */
  summerByInputPairs: InputOutputMasonPair[];
  /** Expressão completa da saída principal por superposição de todas as entradas independentes */
  superpositionOutputText: string;
  superpositionOutputLatex: string;
  /** Expressões completas por superposição para cada sinal interno (ex: E(s), U(s)) */
  superpositionSummers: {
    summerInfo: SignalNodeInfo;
    text: string;
    latex: string;
  }[];
  /** Passo a passo da Validação Algébrica Independente */
  algebraicValidationSteps: AlgebraicValidationStep[];
  allValidationsMatch: boolean;
}

/**
 * Extrai o identificador simbólico limpo de um bloco a partir do nome visual definido pelo usuário.
 * Ex: "Hf(s)" -> "Hf", "Hc(s)" -> "Hc", "G(s)" -> "G", "G1(s)" -> "G1", "H2(s)" -> "H2"
 */
export function extractSymbolicIdentifierFromName(name?: string, fallbackCode?: string): string {
  const raw = (name || fallbackCode || 'G').trim();
  const withoutS = raw.replace(/\(\s*s\s*\)$/i, '').trim();
  const clean = withoutS.replace(/[^A-Za-z0-9_]/g, '');
  return clean || fallbackCode || 'G';
}

/**
 * Formata um nome de elemento ou sinal para LaTeX limpo, sem expor IDs técnicos ou timestamps.
 * Ex: "Hf(s)" -> "H_f(s)", "Hc(s)" -> "H_c(s)", "G1(s)" -> "G_{1}(s)", "R(s)" -> "R(s)", "ref(s)" -> "\\text{ref}(s)"
 */
export function formatCleanSignalLatex(rawName?: string, fallbackCode?: string): string {
  const base = (rawName || fallbackCode || 'X').trim();
  if (!base) return 'X(s)';

  const hasS = /\(\s*s\s*\)$/i.test(base);
  const core = hasS ? base.replace(/\(\s*s\s*\)$/i, '').trim() : base;

  if (/^[a-z]{3,}$/.test(core)) {
    return `\\text{${core}}${hasS ? '(s)' : ''}`;
  }

  const matchSub = core.match(/^([A-Za-z])_?([0-9]+|[A-Za-z])$/);
  if (matchSub) {
    const prefix = matchSub[1];
    const sub = matchSub[2];
    return `${prefix}_{${sub}}${hasS ? '(s)' : ''}`;
  }

  if (/^[A-Za-z]$/.test(core)) {
    return `${core}${hasS ? '(s)' : ''}`;
  }

  const safe = core.replace(/_/g, '\\_');
  return `\\text{${safe}}${hasS ? '(s)' : ''}`;
}

/**
 * Formata o LaTeX de um RatFunc convertendo variáveis simbólicas como Hf -> H_f, Hc -> H_c
 */
export function formatRatFuncLatex(R: RatFunc): string {
  const norm = ratSimplify(R.num, R.den);
  const isNegNum = !polyIsOne(norm.den) && norm.num.length > 0 && norm.num.every(t => t.coeff < 0);
  const absRat: RatFunc = isNegNum
    ? { num: polyScale(norm.num, -1), den: norm.den }
    : norm;
  const baseLatex = ratToLatex(absRat);
  const formatted = baseLatex
    .replace(/(?<!\\)([GHWRC])_\{?([a-zA-Z0-9]+)\}?/g, '$1_{$2}')
    .replace(/(?<!\\)([GHWRC])([a-z0-9]+)/g, '$1_{$2}');
  return isNegNum ? `-${formatted}` : formatted;
}

/**
 * Formata uma função racional em texto algébrico compacto exato:
 * Ex: "GHcHf/(1 + GHc)" ou "-G/(1 + GHc)" ou "10/(s + 12)"
 */
export function formatRatFuncCompact(R: RatFunc): string {
  const norm = ratSimplify(R.num, R.den);
  if (polyIsZero(norm.num)) return '0';
  if (polyIsOne(norm.den)) return polyToCompact(norm.num);

  // Verifica se o numerador é inteiramente negativo (ex: -G)
  const isNegNum = norm.num.length > 0 && norm.num.every(t => t.coeff < 0);
  const posNum = isNegNum ? polyScale(norm.num, -1) : norm.num;
  const numStr = polyToCompact(posNum);
  const denStr = polyToCompact(norm.den);

  const wrappedNum = posNum.length > 1 ? `(${numStr})` : numStr;
  const wrappedDen = norm.den.length > 1 || denStr.includes(' ') ? `(${denStr})` : denStr;

  return `${isNegNum ? '-' : ''}${wrappedNum}/${wrappedDen}`;
}

/**
 * Executa a Regra de Mason para um par específico (inputId -> targetId) preservando TODOS os laços
 * do diagrama (inclusive laços que passam pelo nó de saída Y(s) ou pelo somador analisado E(s)).
 */
export function runMasonForInputTargetPair(
  cleanGraph: DiagramGraph,
  inputId: string,
  targetId: string
): MasonAnalysis {
  const VIRTUAL_IN = '__MASON_VIRTUAL_IN__';
  const VIRTUAL_OUT = '__MASON_VIRTUAL_OUT__';

  // Mapa de IDs para que apenas VIRTUAL_IN seja 'IN' e VIRTUAL_OUT seja 'OUT'
  const encodeId = (id: string): string => {
    if (id === 'IN') return '__NODE_ORIG_IN__';
    if (id === 'OUT') return '__NODE_ORIG_OUT__';
    return id;
  };
  const decodeId = (id: string): string => {
    if (id === '__NODE_ORIG_IN__') return 'IN';
    if (id === '__NODE_ORIG_OUT__') return 'OUT';
    return id;
  };

  // Mantém apenas a entrada ativa (as demais entradas independentes são zeradas por superposição)
  const activeElements: DiagramElement[] = cleanGraph.elements
    .filter(el => el.type !== 'input' || el.id === inputId)
    .map(el => ({
      ...el,
      id: encodeId(el.id),
      // Transforma nós de entrada/saída reais em nós internos de ganho 1 para que mason.ts permita ciclos passando por Y(s)
      type: el.type === 'block' ? 'block' : el.type === 'pickoff' ? 'pickoff' : 'summer',
      rat: el.type === 'block' ? el.rat : ratOne()
    }));

  const activeIds = new Set(activeElements.map(e => e.id));

  const activeConnections: DiagramConnection[] = cleanGraph.connections
    .filter(c => !c.isPending && c.from && c.to)
    .map(c => ({
      ...c,
      from: encodeId(c.from),
      to: encodeId(c.to)
    }))
    .filter(c => activeIds.has(c.from) && activeIds.has(c.to));

  const wrappedElements: DiagramElement[] = [
    { id: 'IN', type: 'input', name: VIRTUAL_IN, rat: ratOne() },
    ...activeElements,
    { id: 'OUT', type: 'output', name: VIRTUAL_OUT, rat: ratOne() }
  ];

  const wrappedConnections: DiagramConnection[] = [
    { id: '__conn_vin__', from: 'IN', to: encodeId(inputId), sign: '+' },
    ...activeConnections,
    { id: '__conn_vout__', from: encodeId(targetId), to: 'OUT', sign: '+' }
  ];

  const rawResult = computeMasonAnalysis({
    elements: wrappedElements,
    connections: wrappedConnections
  });

  // Remove os nós virtuais 'IN' e 'OUT' das pontas dos caminhos diretos e decodifica os IDs reais
  const decodedPaths = rawResult.forwardPaths.map(fp => ({
    gain: fp.gain,
    nodes: fp.nodes
      .filter(n => n !== 'IN' && n !== 'OUT')
      .map(decodeId)
  }));

  const decodedLoops = rawResult.loops.map(lp => ({
    gain: lp.gain,
    nodes: lp.nodes.map(decodeId)
  }));

  const decodedElements = cleanGraph.elements.map(el => ({ ...el }));

  return {
    forwardPaths: decodedPaths,
    loops: decodedLoops,
    disjointPairs: rawResult.disjointPairs,
    delta: rawResult.delta,
    cofactors: rawResult.cofactors,
    totalT: rawResult.totalT,
    elements: decodedElements
  };
}

/**
 * Resolve o sistema linear algébrico A(s) * v(s) = B(s) * u(s) por Eliminação Gaussiana Simbólica
 * sobre o corpo de funções racionais RatFunc (totalmente independente da Regra de Mason!).
 */
export function solveAlgebraicLinearSystem(
  cleanGraph: DiagramGraph,
  inputId: string,
  targetId: string
): RatFunc {
  // Todos os nós exceto as outras entradas independentes
  const nodes = cleanGraph.elements.filter(el => el.type !== 'input' || el.id === inputId);
  const n = nodes.length;
  const idxMap = new Map<string, number>();
  nodes.forEach((el, i) => idxMap.set(el.id, i));

  const targetIdx = idxMap.get(targetId);
  const inputIdx = idxMap.get(inputId);
  if (targetIdx === undefined || inputIdx === undefined) return ratZero();

  // Matriz aumentada [A | b] de dimensão n x (n + 1)
  const aug: RatFunc[][] = Array.from({ length: n }, () =>
    Array.from({ length: n + 1 }, () => ratZero())
  );

  for (let i = 0; i < n; i++) {
    aug[i][i] = ratOne();
  }

  // Equação do nó de entrada ativa: v_in = 1 (excitação unitária)
  // Equação de cada outro nó v_i: v_i - g_i * sum(sign_{j->i} * v_j) = 0
  nodes.forEach((node, i) => {
    if (node.id === inputId) {
      aug[i][n] = ratOne();
      return;
    }
    const nodeGain = node.type === 'block' ? node.rat || ratOne() : ratOne();
    const incoming = cleanGraph.connections.filter(c => !c.isPending && c.to === node.id);
    incoming.forEach(c => {
      const j = idxMap.get(c.from);
      if (j === undefined) return;
      const edgeGain = c.sign === '-' ? ratScale(nodeGain, -1) : nodeGain;
      // v_i - edgeGain * v_j = 0  =>  A[i][j] += -edgeGain
      aug[i][j] = ratSub(aug[i][j], edgeGain);
    });
  });

  // Eliminação Gaussiana Simbólica com pivoteamento parcial
  for (let col = 0; col < n; col++) {
    let pivotRow = -1;
    for (let row = col; row < n; row++) {
      if (!ratIsZero(aug[row][col])) {
        pivotRow = row;
        break;
      }
    }
    if (pivotRow === -1) continue;

    if (pivotRow !== col) {
      const tmp = aug[col];
      aug[col] = aug[pivotRow];
      aug[pivotRow] = tmp;
    }

    const pivotVal = aug[col][col];
    for (let j = col; j <= n; j++) {
      aug[col][j] = ratDiv(aug[col][j], pivotVal);
    }

    for (let row = 0; row < n; row++) {
      if (row !== col && !ratIsZero(aug[row][col])) {
        const factor = aug[row][col];
        for (let j = col; j <= n; j++) {
          aug[row][j] = ratSub(aug[row][j], ratMul(factor, aug[col][j]));
        }
      }
    }
  }

  return ratSimplify(aug[targetIdx][n].num, aug[targetIdx][n].den);
}

/**
 * Executa a análise completa do diagrama de blocos:
 * - Resolves symbolic / rational block gains
 * - Constrói equações algébricas reais dos somadores e saídas
 * - Calcula Mason para todas as entradas independentes e sinais internos
 * - Executa a Validação Algébrica Independente passo a passo
 */
export function analyzeCompleteBlockDiagram(
  rawGraph: DiagramGraph,
  preferredInputId?: string,
  preferredOutputId?: string
): CompleteSystemAnalysis {
  const validConnections = rawGraph.connections.filter(
    c => !c.isPending && c.from && c.to && c.from !== c.to
  );

  const rawBlocks = rawGraph.elements.filter(e => e.type === 'block');

  // Verifica se todos os blocos estão com ganho inicial padrão ('1' ou vazio) e sem rat customizado != 1
  const hasExplicitNonUnitRational = rawBlocks.some(b => {
    const expr = (b.expr ?? '').trim();
    const symId = extractSymbolicIdentifierFromName(b.name, b.code);
    if (expr && expr !== '1' && expr.replace(/\(\s*s\s*\)$/i, '') !== symId) {
      return true;
    }
    if (b.rat && !ratIsOne(b.rat)) {
      return true;
    }
    return false;
  });

  const isPureSymbolicMode = !hasExplicitNonUnitRational;

  // Prepara os elementos com seus respectivos RatFunc
  const preparedElements: DiagramElement[] = rawGraph.elements.map(el => {
    if (el.type !== 'block') {
      return { ...el, rat: ratOne() };
    }
    const expr = (el.expr ?? '').trim();
    const symId = extractSymbolicIdentifierFromName(el.name, el.code);

    let effectiveRat: RatFunc;
    if (isPureSymbolicMode && (!expr || expr === '1')) {
      effectiveRat = parseRatExpr(symId);
    } else if (expr) {
      effectiveRat = parseRatExpr(expr);
    } else if (el.rat) {
      effectiveRat = el.rat;
    } else {
      effectiveRat = parseRatExpr(symId);
    }

    return {
      ...el,
      rat: effectiveRat
    };
  });

  const preparedGraph: DiagramGraph = {
    elements: preparedElements,
    connections: validConnections
  };

  // Ordena entradas: primeiro referências, depois perturbações
  const inputElements = preparedElements
    .filter(e => e.type === 'input')
    .sort((a, b) => {
      const aDist = a.subType === 'disturbance' ? 1 : 0;
      const bDist = b.subType === 'disturbance' ? 1 : 0;
      return aDist - bDist;
    });

  const outputElements = preparedElements.filter(e => e.type === 'output');

  // Ordena somadores da esquerda para a direita (ou na ordem topológica do caminho direto)
  const summerElements = preparedElements
    .filter(e => e.type === 'summer')
    .sort((a, b) => (a.x ?? 0) - (b.x ?? 0));

  const nodeInfoMap: Record<string, SignalNodeInfo> = {};

  inputElements.forEach((inp, idx) => {
    const isDist = inp.subType === 'disturbance';
    const rawName = (inp.name || (isDist ? 'W(s)' : 'R(s)')).trim();
    const signalSymbol = /\(\s*s\s*\)$/i.test(rawName) ? rawName : `${rawName}(s)`;
    const shortSymbol = signalSymbol.replace(/\(\s*s\s*\)$/i, '');
    nodeInfoMap[inp.id] = {
      id: inp.id,
      code: inp.code || (isDist ? `W${idx + 1}` : `R${idx + 1}`),
      displayName: rawName,
      signalSymbol,
      signalLatex: formatCleanSignalLatex(signalSymbol, inp.code),
      shortSymbol,
      role: isDist ? 'input-dist' : 'input-ref'
    };
  });

  outputElements.forEach((out, idx) => {
    const rawName = (out.name || 'Y(s)').trim();
    const signalSymbol = /\(\s*s\s*\)$/i.test(rawName) ? rawName : `${rawName}(s)`;
    const shortSymbol = signalSymbol.replace(/\(\s*s\s*\)$/i, '');
    nodeInfoMap[out.id] = {
      id: out.id,
      code: out.code || `C${idx + 1}`,
      displayName: rawName,
      signalSymbol,
      signalLatex: formatCleanSignalLatex(signalSymbol, out.code),
      shortSymbol,
      role: 'output'
    };
  });

  summerElements.forEach((sum, idx) => {
    const rawName = (sum.name || `S${idx + 1}`).trim();
    const isGenericSummerName = /^(S\d+|Somador\s*\d+|∑)$/i.test(rawName);
    // No 1º somador usa E(s) (erro), no 2º somador usa U(s) (controle), nos demais S_k(s),
    // salvo se o usuário tiver definido um nome de sinal específico (ex: E(s), U(s))
    let signalSymbol: string;
    if (!isGenericSummerName) {
      signalSymbol = /\(\s*s\s*\)$/i.test(rawName) ? rawName : `${rawName}(s)`;
    } else if (idx === 0) {
      signalSymbol = 'E(s)';
    } else if (idx === 1) {
      signalSymbol = 'U(s)';
    } else {
      signalSymbol = `S_${idx + 1}(s)`;
    }
    const shortSymbol = signalSymbol.replace(/\(\s*s\s*\)$/i, '');
    nodeInfoMap[sum.id] = {
      id: sum.id,
      code: sum.code || `S${idx + 1}`,
      displayName: isGenericSummerName ? `Somador ${idx + 1} (${rawName})` : rawName,
      signalSymbol,
      signalLatex: formatCleanSignalLatex(signalSymbol),
      shortSymbol,
      role: 'summer'
    };
  });

  preparedElements
    .filter(e => e.type === 'block')
    .forEach((blk, idx) => {
      const rawName = (blk.name || `G${idx + 1}(s)`).trim();
      const signalSymbol = /\(\s*s\s*\)$/i.test(rawName) ? rawName : `${rawName}(s)`;
      const shortSymbol = signalSymbol.replace(/\(\s*s\s*\)$/i, '');
      nodeInfoMap[blk.id] = {
        id: blk.id,
        code: blk.code || `G${idx + 1}`,
        displayName: rawName,
        signalSymbol,
        signalLatex: formatCleanSignalLatex(signalSymbol, blk.code),
        shortSymbol,
        role: 'block'
      };
    });

  // Identifica blocos cuja saída vai diretamente para um nó de Saída (com sinal '+'),
  // pois o sinal na saída desse bloco é o próprio sinal de saída Y(s) quando realimentado!
  const blockToDirectOutputMap = new Map<string, SignalNodeInfo>();
  outputElements.forEach(out => {
    const incomingToOut = validConnections.filter(c => c.to === out.id && c.sign !== '-');
    if (incomingToOut.length === 1) {
      const srcId = incomingToOut[0].from;
      const srcEl = preparedElements.find(e => e.id === srcId);
      if (srcEl && srcEl.type === 'block') {
        blockToDirectOutputMap.set(srcId, nodeInfoMap[out.id]);
      }
    }
  });

  // Função que rastreia uma conexão incidente (u -> target) até sua fonte de sinal primária
  // (Entrada independente, Saída, ou Somador), acumulando os blocos intermediários em série!
  const traceIncidentSignalBranch = (
    conn: DiagramConnection,
    isTracingForOutputNode: boolean = false
  ): SummerIncidentTerm => {
    let currId = conn.from;
    let sign: '+' | '-' = conn.sign === '-' ? '-' : '+';
    let accGain = ratOne();
    const blockSymbolsLatex: string[] = [];
    const blockSymbolsCompact: string[] = [];
    const visited = new Set<string>();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const currEl = preparedElements.find(e => e.id === currId);
      if (!currEl) break;

      // Se chegou a uma Entrada, Somador ou Saída, é um nó de sinal primário!
      if (currEl.type === 'input' || currEl.type === 'summer' || currEl.type === 'output') {
        break;
      }

      // Se estamos rastreando uma realimentação para um somador e currId é a planta cuja saída é Y(s)
      if (!isTracingForOutputNode && blockToDirectOutputMap.has(currId) && blockSymbolsLatex.length === 0) {
        const outInfo = blockToDirectOutputMap.get(currId)!;
        return {
          sign,
          gainRat: ratOne(),
          gainSymbolicLatex: '1',
          gainCompact: '',
          sourceNodeId: outInfo.id,
          sourceSignalSymbol: outInfo.signalSymbol,
          sourceSignalLatex: outInfo.signalLatex,
          fullTermText: `${sign} ${outInfo.signalSymbol}`,
          fullTermLatex: `${sign} ${outInfo.signalLatex}`
        };
      }

      // Caso contrário, currEl é um bloco funcional: acumula seu ganho e sobe para sua entrada
      if (currEl.type === 'block') {
        const bInfo = nodeInfoMap[currEl.id];
        const bRat = currEl.rat || ratOne();
        accGain = ratMul(bRat, accGain);

        // Se o bloco tem ganho racional explícito != 1 e não estamos em modo puramente simbólico,
        // exibe tanto o símbolo quanto o ganho
        const bSymLatex = bInfo ? bInfo.signalLatex : formatCleanSignalLatex(currEl.name, currEl.code);
        const bSymCompact = bInfo ? bInfo.signalSymbol : currEl.name || 'G(s)';
        blockSymbolsLatex.unshift(bSymLatex);
        blockSymbolsCompact.unshift(bSymCompact);

        const inConns = validConnections.filter(c => c.to === currEl.id);
        if (inConns.length === 1) {
          if (inConns[0].sign === '-') {
            sign = sign === '+' ? '-' : '+';
          }
          currId = inConns[0].from;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const srcInfo = nodeInfoMap[currId] || {
      id: currId,
      code: currId,
      displayName: currId,
      signalSymbol: `${currId}(s)`,
      signalLatex: formatCleanSignalLatex(currId),
      shortSymbol: currId,
      role: 'input-ref' as const
    };

    const gainSymbolicLatex =
      blockSymbolsLatex.length > 0 ? blockSymbolsLatex.join(' ') : '1';
    const gainCompact =
      blockSymbolsCompact.length > 0 ? blockSymbolsCompact.join('') : '';

    const fullTermText = gainCompact
      ? `${sign} ${gainCompact}${srcInfo.signalSymbol}`
      : `${sign} ${srcInfo.signalSymbol}`;

    const fullTermLatex =
      gainSymbolicLatex !== '1'
        ? `${sign} ${gainSymbolicLatex}${srcInfo.signalLatex}`
        : `${sign} ${srcInfo.signalLatex}`;

    return {
      sign,
      gainRat: accGain,
      gainSymbolicLatex,
      gainCompact,
      sourceNodeId: srcInfo.id,
      sourceSignalSymbol: srcInfo.signalSymbol,
      sourceSignalLatex: srcInfo.signalLatex,
      fullTermText,
      fullTermLatex
    };
  };

  // Constrói as equações algébricas reais de cada Somador (Seção 2.1 e 3.2)
  const summerEquations: SummerAlgebraicEquation[] = summerElements.map(sum => {
    const sInfo = nodeInfoMap[sum.id];
    const incoming = validConnections.filter(c => c.to === sum.id);
    // Ordena termos para que os sinais '+' venham primeiro (ex: Hf(s)R(s) - Y(s))
    const rawTerms = incoming.map(c => traceIncidentSignalBranch(c, false));
    rawTerms.sort((a, b) => (a.sign === '+' ? 0 : 1) - (b.sign === '+' ? 0 : 1));

    const rhsText =
      rawTerms.length === 0
        ? '0'
        : rawTerms
            .map((t, i) => {
              if (i === 0 && t.sign === '+') {
                return t.fullTermText.replace(/^\+\s*/, '');
              }
              return t.fullTermText;
            })
            .join(' ');

    const rhsLatex =
      rawTerms.length === 0
        ? '0'
        : rawTerms
            .map((t, i) => {
              if (i === 0 && t.sign === '+') {
                return t.fullTermLatex.replace(/^\+\s*/, '');
              }
              return t.fullTermLatex;
            })
            .join(' ');

    return {
      summerId: sum.id,
      summerName: sInfo.displayName,
      signalSymbol: sInfo.signalSymbol,
      signalLatex: sInfo.signalLatex,
      terms: rawTerms,
      equationText: `${sInfo.signalSymbol} = ${rhsText}`,
      equationLatex: `${sInfo.signalLatex} = ${rhsLatex}`
    };
  });

  // Constrói as equações algébricas de cada Saída (ex: Y(s) = G(s)U(s))
  const outputEquations: OutputAlgebraicEquation[] = outputElements.map(out => {
    const oInfo = nodeInfoMap[out.id];
    const incoming = validConnections.filter(c => c.to === out.id);
    const rawTerms = incoming.map(c => traceIncidentSignalBranch(c, true));
    rawTerms.sort((a, b) => (a.sign === '+' ? 0 : 1) - (b.sign === '+' ? 0 : 1));

    const rhsText =
      rawTerms.length === 0
        ? '0'
        : rawTerms
            .map((t, i) => (i === 0 && t.sign === '+' ? t.fullTermText.replace(/^\+\s*/, '') : t.fullTermText))
            .join(' ');

    const rhsLatex =
      rawTerms.length === 0
        ? '0'
        : rawTerms
            .map((t, i) => (i === 0 && t.sign === '+' ? t.fullTermLatex.replace(/^\+\s*/, '') : t.fullTermLatex))
            .join(' ');

    return {
      outputId: out.id,
      outputName: oInfo.displayName,
      signalSymbol: oInfo.signalSymbol,
      signalLatex: oInfo.signalLatex,
      terms: rawTerms,
      equationText: `${oInfo.signalSymbol} = ${rhsText}`,
      equationLatex: `${oInfo.signalLatex} = ${rhsLatex}`
    };
  });

  const independentInputs = inputElements.map(e => nodeInfoMap[e.id]);
  const outputs = outputElements.map(e => nodeInfoMap[e.id]);
  const summers = summerElements.map(e => nodeInfoMap[e.id]);

  const primaryInput =
    independentInputs.find(i => i.id === preferredInputId) ||
    independentInputs[0] || {
      id: 'IN',
      code: 'R1',
      displayName: 'R(s)',
      signalSymbol: 'R(s)',
      signalLatex: 'R(s)',
      shortSymbol: 'R',
      role: 'input-ref'
    };

  const primaryOutput =
    outputs.find(o => o.id === preferredOutputId) ||
    outputs[0] || {
      id: 'OUT',
      code: 'C1',
      displayName: 'Y(s)',
      signalSymbol: 'Y(s)',
      signalLatex: 'Y(s)',
      shortSymbol: 'Y',
      role: 'output'
    };

  // Calcula os pares de Mason e a solução algébrica independente para CADA entrada -> Saída Principal
  const buildPairAnalysis = (inp: SignalNodeInfo, tgt: SignalNodeInfo): InputOutputMasonPair => {
    const masonAnalysis = runMasonForInputTargetPair(preparedGraph, inp.id, tgt.id);
    const tf = ratSimplify(masonAnalysis.totalT.num, masonAnalysis.totalT.den);
    const rawAlgTf = solveAlgebraicLinearSystem(preparedGraph, inp.id, tgt.id);
    // Equivalência algébrica exata de funções racionais: N_1(s) * D_2(s) === N_2(s) * D_1(s)
    const matchesAlgebraic = polyEqual(
      polyNormalize(polyMul(tf.num, rawAlgTf.den)),
      polyNormalize(polyMul(rawAlgTf.num, tf.den))
    );
    const algTf = matchesAlgebraic ? tf : rawAlgTf;

    return {
      inputInfo: inp,
      targetInfo: tgt,
      masonAnalysis,
      transferFunction: tf,
      transferFunctionLatex: formatRatFuncLatex(tf),
      transferFunctionCompact: formatRatFuncCompact(tf),
      algebraicTransferFunction: algTf,
      matchesAlgebraic
    };
  };

  const outputByInputPairs: InputOutputMasonPair[] = independentInputs.map(inp =>
    buildPairAnalysis(inp, primaryOutput)
  );

  const summerByInputPairs: InputOutputMasonPair[] = [];
  summers.forEach(sumInfo => {
    independentInputs.forEach(inp => {
      summerByInputPairs.push(buildPairAnalysis(inp, sumInfo));
    });
  });

  // Constrói a expressão de Superposição para um sinal alvo a partir dos seus pares por entrada
  const buildSuperpositionStrings = (
    targetInfo: SignalNodeInfo,
    pairs: InputOutputMasonPair[]
  ): { text: string; latex: string } => {
    const nonZeroPairs = pairs.filter(p => !ratIsZero(p.transferFunction));
    if (nonZeroPairs.length === 0) {
      return {
        text: `${targetInfo.signalSymbol} = 0`,
        latex: `${targetInfo.signalLatex} = 0`
      };
    }

    const textParts: string[] = [];
    const latexParts: string[] = [];

    nonZeroPairs.forEach((p, idx) => {
      const comp = p.transferFunctionCompact;
      const isNegative = comp.startsWith('-');
      const absComp = isNegative ? comp.slice(1) : comp;

      const norm = p.transferFunction;
      const isNegNum = norm.num.length > 0 && norm.num.every(t => t.coeff < 0);
      const absRat: RatFunc = isNegNum
        ? { num: polyScale(norm.num, -1), den: norm.den }
        : norm;
      const absLatex = formatRatFuncLatex(absRat);

      if (idx === 0) {
        textParts.push(
          `${isNegative ? '-' : ''}[${absComp}]${p.inputInfo.signalSymbol}`
        );
        latexParts.push(
          `${isNegative ? '-' : ''}\\left[${absLatex}\\right]${p.inputInfo.signalLatex}`
        );
      } else {
        textParts.push(
          `${isNegative ? '- ' : '+ '}[${absComp}]${p.inputInfo.signalSymbol}`
        );
        latexParts.push(
          `${isNegative ? '- ' : '+ '}\\left[${absLatex}\\right]${p.inputInfo.signalLatex}`
        );
      }
    });

    return {
      text: `${targetInfo.signalSymbol} = ${textParts.join(' ')}`,
      latex: `${targetInfo.signalLatex} = ${latexParts.join(' ')}`
    };
  };

  const mainSuperposition = buildSuperpositionStrings(primaryOutput, outputByInputPairs);
  const superpositionSummers = summers.map(sumInfo => {
    const sPairs = summerByInputPairs.filter(p => p.targetInfo.id === sumInfo.id);
    const sup = buildSuperpositionStrings(sumInfo, sPairs);
    return {
      summerInfo: sumInfo,
      text: sup.text,
      latex: sup.latex
    };
  });

  // =========================================================================
  // PASSO A PASSO DA VALIDAÇÃO ALGÉBRICA INDEPENDENTE (SEÇÃO 5 & 3.2)
  // =========================================================================
  const algebraicValidationSteps: AlgebraicValidationStep[] = [];

  // Passo 1: Sistema de equações dos somadores e da saída
  const allSysEqText = [
    ...summerEquations.map(s => s.equationText),
    ...outputEquations.map(o => o.equationText)
  ].join(' ;  ');

  const allSysEqLatex = [
    ...summerEquations.map(s => s.equationLatex),
    ...outputEquations.map(o => o.equationLatex)
  ].join(' \\\\[4pt] ');

  algebraicValidationSteps.push({
    title: '1. Equações Algébricas dos Somadores e Blocos',
    description:
      'A partir das conexões direcionadas e polaridades de cada somador e bloco, escrevemos o sistema de equações de sinais no domínio de Laplace:',
    equationText: allSysEqText,
    equationLatex: `\\begin{cases} ${allSysEqLatex} \\end{cases}`
  });

  // Passo 2: Substituição progressiva dos sinais intermediários na equação da saída
  const mainOutEq = outputEquations.find(o => o.outputId === primaryOutput.id) || outputEquations[0];
  if (mainOutEq) {
    let subText = mainOutEq.equationText.split('=')[1]?.trim() || '';
    let subLatex = mainOutEq.equationLatex.split('=')[1]?.trim() || '';

    // Substitui da última equação de somador até a primeira (ex: U(s), depois E(s))
    for (let i = summerEquations.length - 1; i >= 0; i--) {
      const sEq = summerEquations[i];
      const sRhsText = sEq.equationText.split('=')[1]?.trim() || '';
      const sRhsLatex = sEq.equationLatex.split('=')[1]?.trim() || '';
      if (subText.includes(sEq.signalSymbol)) {
        subText = subText.split(sEq.signalSymbol).join(`(${sRhsText})`);
      }
      if (subLatex.includes(sEq.signalLatex)) {
        subLatex = subLatex.split(sEq.signalLatex).join(`\\left(${sRhsLatex}\\right)`);
      }
    }

    algebraicValidationSteps.push({
      title: '2. Substituição das Variáveis Intermediárias dos Somadores',
      description: `Substituindo sucessivamente as expressões dos somadores na equação da saída ${primaryOutput.signalSymbol}:`,
      equationText: `${primaryOutput.signalSymbol} = ${subText}`,
      equationLatex: `${primaryOutput.signalLatex} = ${subLatex}`
    });
  }

  // Passo 3 e 4: Expansão distributiva e Agrupamento dos termos em Y(s) usando o determinante \Delta(s)
  const refMason = outputByInputPairs[0]?.masonAnalysis;
  const commonDelta = refMason ? refMason.delta : ratOne();
  const loopPartOfDelta = ratSub(commonDelta, ratOne()); // \Delta - 1 (termos de realimentação que multiplicam Y(s))

  // Termos forçantes das entradas no membro direito (antes de dividir por \Delta):
  const rhsInputTermsText: string[] = [];
  const rhsInputTermsLatex: string[] = [];
  outputByInputPairs.forEach((p, idx) => {
    // Numerador equivalente sobre o denominador de \Delta: P_k * \Delta_k
    const numTerm = ratMul(p.transferFunction, commonDelta);
    if (ratIsZero(numTerm)) return;
    const comp = formatRatFuncCompact(numTerm);
    const isNeg = comp.startsWith('-');
    const absComp = isNeg ? comp.slice(1) : comp;

    const isNegNum = numTerm.num.length > 0 && numTerm.num.every(t => t.coeff < 0);
    const absRat: RatFunc = isNegNum
      ? { num: polyScale(numTerm.num, -1), den: numTerm.den }
      : numTerm;
    const absLatex = formatRatFuncLatex(absRat);

    if (idx === 0) {
      rhsInputTermsText.push(
        `${isNeg ? '-' : ''}${absComp === '1' ? '' : absComp}${p.inputInfo.shortSymbol}`
      );
      rhsInputTermsLatex.push(
        `${isNeg ? '-' : ''}${absLatex === '1' ? '' : absLatex}${p.inputInfo.signalLatex}`
      );
    } else {
      rhsInputTermsText.push(
        `${isNeg ? '- ' : '+ '}${absComp === '1' ? '' : absComp}${p.inputInfo.shortSymbol}`
      );
      rhsInputTermsLatex.push(
        `${isNeg ? '- ' : '+ '}${absLatex === '1' ? '' : absLatex}${p.inputInfo.signalLatex}`
      );
    }
  });

  const feedbackTermComp = formatRatFuncCompact(loopPartOfDelta);
  const feedbackTermLatex = formatRatFuncLatex(loopPartOfDelta);

  if (!ratIsZero(loopPartOfDelta)) {
    const expSign = feedbackTermComp.startsWith('-') ? '+ ' : '- ';
    const absFbComp = feedbackTermComp.replace(/^-/, '');
    const absFbLatex = feedbackTermLatex.replace(/^-/, '');

    algebraicValidationSteps.push({
      title: '3. Expansão Distributiva dos Ganhos e Sinais',
      description: 'Desenvolvendo os produtos dos ganhos dos blocos pelas entradas e pela realimentação da saída:',
      equationText: `${primaryOutput.signalSymbol} = ${rhsInputTermsText.join(' ')} ${expSign}${absFbComp}${primaryOutput.shortSymbol}`,
      equationLatex: `${primaryOutput.signalLatex} = ${rhsInputTermsLatex.join(' ')} ${expSign}${absFbLatex}${primaryOutput.signalLatex}`
    });

    algebraicValidationSteps.push({
      title: `4. Agrupamento dos Termos Dependentes de ${primaryOutput.signalSymbol}`,
      description: `Transpondo o termo de realimentação para o membro esquerdo e colocando ${primaryOutput.signalSymbol} em evidência:`,
      equationText: `${primaryOutput.signalSymbol}(${formatRatFuncCompact(commonDelta)}) = ${rhsInputTermsText.join(' ')}`,
      equationLatex: `${primaryOutput.signalLatex}\\left(${formatRatFuncLatex(commonDelta)}\\right) = ${rhsInputTermsLatex.join(' ')}`
    });
  }

  // Passo 5: Isolamento final da saída e comparação com Mason
  algebraicValidationSteps.push({
    title: '5. Isolamento da Saída e Expressão Final por Superposição',
    description:
      'Dividindo ambos os membros pelo polinômio/fator característico de malha fechada, obtemos a resposta completa do sistema:',
    equationText: mainSuperposition.text,
    equationLatex: mainSuperposition.latex
  });

  const blocks = preparedElements
    .filter(e => e.type === 'block')
    .map(b => {
      const r = b.rat || ratOne();
      return {
        id: b.id,
        code: b.code || b.id,
        name: b.name || b.code || b.id,
        symbolLatex: formatCleanSignalLatex(b.name, b.code),
        dir: (b.dir === 'left' ? 'left' : 'right') as 'right' | 'left',
        gain: r,
        gainLatex: formatRatFuncLatex(r),
        gainCompact: formatRatFuncCompact(r)
      };
    });

  const allValidationsMatch =
    outputByInputPairs.every(p => p.matchesAlgebraic) &&
    summerByInputPairs.every(p => p.matchesAlgebraic);

  return {
    preparedGraph,
    isPureSymbolicMode,
    nodeInfoMap,
    independentInputs,
    outputs,
    summers,
    blocks,
    summerEquations,
    outputEquations,
    primaryOutput,
    primaryInput,
    outputByInputPairs,
    summerByInputPairs,
    superpositionOutputText: mainSuperposition.text,
    superpositionOutputLatex: mainSuperposition.latex,
    superpositionSummers,
    algebraicValidationSteps,
    allValidationsMatch
  };
}
