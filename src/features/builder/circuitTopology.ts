/**
 * Topologia do circuito do Construtor Livre:
 *  - Normalização do SENTIDO DO SINAL das conexões (linhas desenhadas "de trás para frente").
 *  - Validação topológica do circuito antes de apresentar uma resolução como concluída.
 *
 * Motivação (bug corrigido): o editor permite desenhar uma linha partindo de qualquer um dos
 * 8 pontos de um elemento. Se o usuário desenhava a realimentação partindo do somador até H2(s)
 * (ou de H1(s) até C(s)), a conexão ficava armazenada no sentido inverso ao fluxo de sinal.
 * O motor matemático obedecia literalmente a `from → to`, a malha de realimentação deixava de
 * existir e o resultado aparecia como C(s)/R(s) = G1G2G3, sem nenhum aviso.
 */

import { DiagramConnection, DiagramElement, DiagramGraph } from '../../core/reduction/mason';

export type PortRole = 'in' | 'out' | 'unknown';

const EAST_PORTS = ['E', 'NE', 'SE'];
const WEST_PORTS = ['W', 'NW', 'SW'];

/**
 * Papel de um ponto de conexão de um elemento no fluxo de sinal.
 * Bloco orientado para a direita: entrada à esquerda (W), saída à direita (E).
 * Bloco orientado para a esquerda (realimentação H): entrada à direita (E), saída à esquerda (W).
 * Portas N/S de blocos são ambíguas.
 */
export function getPortRole(el: DiagramElement | undefined, port?: string): PortRole {
  if (!el || !port) return 'unknown';
  if (el.type === 'input') return 'out';
  if (el.type !== 'block') return 'unknown';
  const isLeft = el.dir === 'left';
  if (EAST_PORTS.includes(port)) return isLeft ? 'in' : 'out';
  if (WEST_PORTS.includes(port)) return isLeft ? 'out' : 'in';
  return 'unknown';
}

export interface DirectionCorrection {
  connId: string;
  originalFromId: string;
  originalToId: string;
  newFromId: string;
  newToId: string;
  newSign: '+' | '-';
  reason: string;
}

function defaultSummerSign(targetPort: string | undefined, src: DiagramElement | undefined): '+' | '-' {
  return targetPort === 'S' || targetPort === 'SW' || targetPort === 'SE' || src?.dir === 'left' ? '-' : '+';
}

function flipConnection(
  c: DiagramConnection,
  elementsById: Map<string, DiagramElement>
): DiagramConnection {
  const newTo = elementsById.get(c.from);
  const newFrom = elementsById.get(c.to);
  // A polaridade só é significativa na entrada de um somador. Se a conexão passa a terminar em um
  // somador e foi criada apontando para um bloco (sinal "+" padrão), aplica-se a mesma convenção
  // de polaridade padrão do editor (entradas inferiores ou vindas de blocos de realimentação: "−").
  let sign: '+' | '-' = c.sign === '-' ? '-' : '+';
  const originalTarget = elementsById.get(c.to);
  if (newTo?.type === 'summer' && originalTarget?.type !== 'summer') {
    sign = c.sign === '-' ? '-' : defaultSummerSign(c.fromPort, newFrom);
  }
  return {
    ...c,
    from: c.to,
    to: c.from,
    fromPort: c.toPort,
    toPort: c.fromPort,
    sign,
    manualPoints: Array.isArray(c.manualPoints) ? [...c.manualPoints].reverse() : c.manualPoints,
    waypoints: Array.isArray(c.waypoints) ? [...c.waypoints].reverse() : c.waypoints
  };
}

/**
 * Corrige o sentido das conexões desenhadas ao contrário do fluxo de sinal.
 * 1) Regras de portas: saída de um bloco nunca é destino; entrada de um bloco nunca é origem;
 *    uma entrada independente R(s)/D(s) nunca recebe sinal.
 * 2) Regras de grau (para conexões ambíguas, ex.: portas N/S): cada bloco precisa de exatamente
 *    uma entrada e ao menos uma saída; cada somador precisa de exatamente uma saída.
 */
export function normalizeSignalDirections(graph: DiagramGraph): {
  graph: DiagramGraph;
  corrections: DirectionCorrection[];
} {
  const elementsById = new Map<string, DiagramElement>();
  graph.elements.forEach(e => elementsById.set(e.id, e));
  const corrections: DirectionCorrection[] = [];
  const nameOf = (id: string) => elementsById.get(id)?.name || id;

  let conns: DiagramConnection[] = graph.connections.map(c => ({ ...c }));
  const ambiguous = new Set<string>();

  // ---------- Passo 1: votação pelas portas ----------
  conns = conns.map(c => {
    if (c.isPending || !c.from || !c.to) return c;
    const fromEl = elementsById.get(c.from);
    const toEl = elementsById.get(c.to);
    let flipVotes = 0;
    let keepVotes = 0;
    if (toEl?.type === 'input') flipVotes += 10;
    if (fromEl?.type === 'input') keepVotes += 10;
    const fromRole = getPortRole(fromEl, c.fromPort);
    const toRole = getPortRole(toEl, c.toPort);
    if (fromEl?.type === 'block') {
      if (fromRole === 'in') flipVotes++;
      if (fromRole === 'out') keepVotes++;
    }
    if (toEl?.type === 'block') {
      if (toRole === 'out') flipVotes++;
      if (toRole === 'in') keepVotes++;
    }
    if (flipVotes > keepVotes) {
      const flipped = flipConnection(c, elementsById);
      corrections.push({
        connId: c.id,
        originalFromId: c.from,
        originalToId: c.to,
        newFromId: flipped.from,
        newToId: flipped.to,
        newSign: flipped.sign === '-' ? '-' : '+',
        reason: `A linha foi desenhada de ${nameOf(c.from)} para ${nameOf(c.to)}, mas o ponto utilizado é ${
          toEl?.type === 'input' ? 'uma entrada independente' : 'contrário ao fluxo do bloco'
        }. Sentido do sinal corrigido para ${nameOf(flipped.from)} → ${nameOf(flipped.to)}.`
      });
      return flipped;
    }
    if (flipVotes === keepVotes) ambiguous.add(c.id);
    return c;
  });

  // ---------- Passo 2: regras de grau para conexões ambíguas ----------
  const violations = (list: DiagramConnection[]): number => {
    let v = 0;
    const active = list.filter(c => !c.isPending && c.from && c.to);
    graph.elements.forEach(el => {
      const inc = active.filter(c => c.to === el.id).length;
      const out = active.filter(c => c.from === el.id).length;
      if (el.type === 'block') {
        if (inc !== 1) v += Math.abs(inc - 1);
        if (out === 0) v += 1;
      } else if (el.type === 'summer') {
        if (out !== 1) v += Math.abs(out - 1);
        if (inc === 0) v += 1;
      } else if (el.type === 'input') {
        v += inc * 2;
      } else if (el.type === 'output') {
        if (inc === 0) v += 1;
      }
    });
    return v;
  };

  let improved = true;
  let guard = 0;
  while (improved && guard < 50) {
    improved = false;
    guard++;
    const base = violations(conns);
    if (base === 0) break;
    for (const id of Array.from(ambiguous)) {
      const idx = conns.findIndex(c => c.id === id);
      if (idx < 0) continue;
      const candidate = [...conns];
      candidate[idx] = flipConnection(conns[idx], elementsById);
      if (violations(candidate) < base) {
        const orig = conns[idx];
        corrections.push({
          connId: orig.id,
          originalFromId: orig.from,
          originalToId: orig.to,
          newFromId: candidate[idx].from,
          newToId: candidate[idx].to,
          newSign: candidate[idx].sign === '-' ? '-' : '+',
          reason: `A linha entre ${nameOf(orig.from)} e ${nameOf(orig.to)} estava no sentido inverso ao fluxo de sinal (bloco/somador sem entrada ou sem saída). Sentido corrigido para ${nameOf(
            candidate[idx].from
          )} → ${nameOf(candidate[idx].to)}.`
        });
        conns = candidate;
        ambiguous.delete(id);
        improved = true;
        break;
      }
    }
  }

  return { graph: { ...graph, connections: conns }, corrections };
}

// =============================================================================
// VALIDAÇÃO TOPOLÓGICA DO CIRCUITO
// =============================================================================

export type ValidationStatus = 'ok' | 'warning' | 'error';

export interface CircuitValidationCheck {
  id: string;
  label: string;
  status: ValidationStatus;
  detail: string;
}

export interface CircuitValidationReport {
  checks: CircuitValidationCheck[];
  hasErrors: boolean;
  errorMessages: string[];
  corrections: DirectionCorrection[];
}

export interface TopologyPathInfo {
  forwardPathsNodes: string[][];
  loopsNodes: string[][];
}

/**
 * Executa as 8 verificações obrigatórias antes de considerar a resolução concluída.
 * `paths` deve ser obtido do mesmo grafo normalizado usado em todos os cálculos.
 */
export function validateCircuitTopology(
  graph: DiagramGraph,
  inputId: string,
  outputId: string,
  paths: TopologyPathInfo,
  corrections: DirectionCorrection[] = [],
  finalTfMatches: boolean = true
): CircuitValidationReport {
  const checks: CircuitValidationCheck[] = [];
  const elementsById = new Map<string, DiagramElement>();
  graph.elements.forEach(e => elementsById.set(e.id, e));
  const nameOf = (id: string) => elementsById.get(id)?.name || elementsById.get(id)?.code || id;

  const pending = graph.connections.filter(c => c.isPending || !c.from || !c.to);
  const active = graph.connections.filter(c => !c.isPending && c.from && c.to);
  const dangling = active.filter(c => !elementsById.has(c.from) || !elementsById.has(c.to));

  // 1. Conexões identificadas
  checks.push({
    id: 'connections',
    label: 'Todas as conexões foram identificadas',
    status: pending.length > 0 || dangling.length > 0 ? 'error' : corrections.length > 0 ? 'warning' : 'ok',
    detail:
      pending.length > 0
        ? `${pending.length} conexão(ões) interrompida(s) sem destino.`
        : dangling.length > 0
        ? `${dangling.length} conexão(ões) apontam para elementos inexistentes.`
        : corrections.length > 0
        ? `${active.length} conexões identificadas; ${corrections.length} estava(m) desenhada(s) no sentido inverso e teve(tiveram) o sentido do sinal corrigido.`
        : `${active.length} conexões identificadas com sentido de sinal consistente.`
  });

  const blocks = graph.elements.filter(e => e.type === 'block');
  const fwdNodes = new Set(paths.forwardPathsNodes.flat());
  const loopNodes = new Set(paths.loopsNodes.flat());

  // 2. Caminho direto
  const fwdBlocks = blocks.filter(b => fwdNodes.has(b.id));
  checks.push({
    id: 'forward',
    label: 'Blocos do caminho direto reconhecidos',
    status: paths.forwardPathsNodes.length === 0 ? 'error' : 'ok',
    detail:
      paths.forwardPathsNodes.length === 0
        ? `Não existe caminho de sinal contínuo de ${nameOf(inputId)} até ${nameOf(outputId)}.`
        : `${paths.forwardPathsNodes.length} caminho(s) direto(s): ${paths.forwardPathsNodes
            .map(p => p.filter(id => elementsById.get(id)?.type === 'block').map(nameOf).join(' · ') || '1')
            .join(' ; ')}.`
  });

  // 3. Realimentação
  const loopBlocks = blocks.filter(b => loopNodes.has(b.id) && !fwdNodes.has(b.id));
  checks.push({
    id: 'feedback',
    label: 'Caminho de realimentação percorrido',
    status: 'ok',
    detail:
      paths.loopsNodes.length === 0
        ? 'Nenhuma malha fechada encontrada (sistema em malha aberta para este par entrada/saída).'
        : `${paths.loopsNodes.length} malha(s): ${paths.loopsNodes
            .map(l => l.filter(id => elementsById.get(id)?.type === 'block').map(nameOf).join(' · ') || '1')
            .join(' ; ')}.`
  });

  // 4. Derivação ligada ao retorno
  const pickoffSources = graph.elements.filter(el => active.filter(c => c.from === el.id).length >= 2);
  const pickoffToFeedback = pickoffSources.filter(el =>
    active.some(c => c.from === el.id && loopNodes.has(c.to) && !fwdNodes.has(c.to))
  );
  const outputTapped = active.some(c => c.from === outputId && loopNodes.has(c.to));
  const hasPickoffOrOutputTap = pickoffSources.length > 0 || outputTapped;

  checks.push({
    id: 'pickoff',
    label: 'Derivação conectada ao caminho de retorno',
    status: paths.loopsNodes.length > 0 && !hasPickoffOrOutputTap ? 'warning' : 'ok',
    detail:
      outputTapped
        ? `A realimentação deriva diretamente da saída ${nameOf(outputId)} para o ramo de retorno.`
        : pickoffToFeedback.length > 0
        ? `Ponto(s) de derivação em ${pickoffToFeedback.map(e => nameOf(e.id)).join(', ')} alimenta(m) a realimentação.`
        : pickoffSources.length > 0
        ? `Ponto(s) de derivação em ${pickoffSources.map(e => nameOf(e.id)).join(', ')}.`
        : 'Não há pontos de derivação no circuito.'
  });

  // 5. Retorno chega ao somador
  const loopsWithoutSummer = paths.loopsNodes.filter(l => !l.some(id => elementsById.get(id)?.type === 'summer'));
  checks.push({
    id: 'summer-entry',
    label: 'Realimentação chega a um terminal de somador',
    status: loopsWithoutSummer.length > 0 ? 'warning' : 'ok',
    detail:
      paths.loopsNodes.length === 0
        ? 'Não aplicável (sem malhas).'
        : loopsWithoutSummer.length > 0
        ? `${loopsWithoutSummer.length} malha(s) fecham sem passar por um somador (soma implícita em bloco/saída).`
        : 'Todas as malhas fecham em uma entrada de somador.'
  });

  // 6. Polaridades
  const summers = graph.elements.filter(e => e.type === 'summer');
  const polarityText = summers
    .map(s => {
      const inc = active.filter(c => c.to === s.id);
      return `${nameOf(s.id)}: ${inc.map(c => `${c.sign === '-' ? '−' : '+'}${nameOf(c.from)}`).join(' ')}`;
    })
    .join(' | ');
  const summerNoInput = summers.filter(s => active.filter(c => c.to === s.id).length === 0);
  const summerBadOut = summers.filter(s => active.filter(c => c.from === s.id).length !== 1);
  checks.push({
    id: 'polarity',
    label: 'Polaridades dos somadores respeitadas',
    status: summerNoInput.length > 0 || summerBadOut.length > 0 ? 'error' : 'ok',
    detail:
      summerNoInput.length > 0
        ? `Somador(es) sem entradas: ${summerNoInput.map(s => nameOf(s.id)).join(', ')}.`
        : summerBadOut.length > 0
        ? `Somador(es) com número de saídas diferente de 1: ${summerBadOut.map(s => nameOf(s.id)).join(', ')}.`
        : polarityText || 'Não há somadores no circuito.'
  });

  // 7. Nenhum bloco ignorado
  const ignored = blocks.filter(b => !fwdNodes.has(b.id) && !loopNodes.has(b.id));
  const blockNoIn = blocks.filter(b => active.filter(c => c.to === b.id).length === 0);
  const blockNoOut = blocks.filter(b => active.filter(c => c.from === b.id).length === 0);
  const blockMultiIn = blocks.filter(b => active.filter(c => c.to === b.id).length > 1);
  const problems: string[] = [];
  if (blockNoIn.length) problems.push(`sem entrada: ${blockNoIn.map(b => nameOf(b.id)).join(', ')}`);
  if (blockNoOut.length) problems.push(`sem saída: ${blockNoOut.map(b => nameOf(b.id)).join(', ')}`);
  if (blockMultiIn.length)
    problems.push(`com mais de uma entrada (use um somador): ${blockMultiIn.map(b => nameOf(b.id)).join(', ')}`);
  const ignoredRelevant = ignored.filter(b => !blockNoIn.includes(b) && !blockNoOut.includes(b));
  if (ignoredRelevant.length)
    problems.push(`fora de qualquer caminho direto ou malha: ${ignoredRelevant.map(b => nameOf(b.id)).join(', ')}`);
  checks.push({
    id: 'ignored',
    label: 'Nenhum bloco ignorado',
    status: problems.length > 0 ? (blockNoIn.length || blockNoOut.length || blockMultiIn.length ? 'error' : 'warning') : 'ok',
    detail:
      problems.length > 0
        ? `Bloco(s) ${problems.join('; ')}.`
        : `Todos os ${blocks.length} blocos participam de caminhos diretos (${fwdBlocks.length}) ou malhas (${loopBlocks.length}).`
  });

  // 8. FT final x topologia
  checks.push({
    id: 'consistency',
    label: 'Função de transferência final corresponde à topologia',
    status: finalTfMatches ? 'ok' : 'error',
    detail: finalTfMatches
      ? 'A redução gráfica progressiva e a eliminação algébrica das equações dos somadores produzem a mesma função de transferência.'
      : 'A redução gráfica e a eliminação algébrica divergem — verifique conexões e polaridades.'
  });

  const errorMessages = checks.filter(c => c.status === 'error').map(c => `${c.label}: ${c.detail}`);
  return { checks, hasErrors: errorMessages.length > 0, errorMessages, corrections };
}
