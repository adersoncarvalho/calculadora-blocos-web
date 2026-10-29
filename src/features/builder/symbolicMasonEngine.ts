/**
 * Motor Algébrico e Simbólico de Sistemas de Controle — Construtor Livre
 * Metodologia Didática: Álgebra de Diagramas de Blocos, Equacionamento de Somadores,
 * Substituição Progressiva, Superposição, Erro Estacionário (Teorema do Valor Final)
 * e Geração Automática de Scripts Scilab (.sce).
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
  isUnivariateInS,
  polyAdd,
  polyEqual,
  polyFromNumber,
  polyIsOne,
  polyIsZero,
  polyMul,
  polyNormalize,
  polyScale,
  polyToCompact,
  polyToLatex,
  toUnivariateArr,
  trimUni
} from '@/core/algebra/polynomial';
import { parseRatExpr, parseRatNumDen } from '@/core/algebra/parser';
import {
  StabilityReport,
  analyzeTransferFunction,
  checkRouthHurwitz
} from '@/core/analysis/stability';

export interface SignalNodeInfo {
  id: string;
  code: string;
  displayName: string; // Ex: "R(s)", "D(s)", "Y(s)", "Somador 1"
  signalSymbol: string; // Ex: "R(s)", "D(s)", "Y(s)", "E(s)", "U(s)"
  signalLatex: string; // Ex: "R(s)", "D(s)", "Y(s)", "E(s)", "U(s)"
  shortSymbol: string; // Ex: "R", "D", "Y", "E", "U"
  role: 'input-ref' | 'input-dist' | 'output' | 'summer' | 'block';
}

export interface SummerIncidentTerm {
  sign: '+' | '-';
  gainRat: RatFunc;
  gainSymbolicLatex: string; // Ex: "H_f(s)" ou "1"
  gainCompact: string; // Ex: "Hf(s)" ou ""
  sourceNodeId: string;
  sourceSignalSymbol: string; // Ex: "R(s)", "Y(s)", "E(s)", "D(s)"
  sourceSignalLatex: string; // Ex: "R(s)", "Y(s)", "E(s)", "D(s)"
  fullTermText: string; // Ex: "+ Hf(s)R(s)", "- Y(s)", "- D(s)"
  fullTermLatex: string; // Ex: "+ H_f(s)R(s)", "- Y(s)", "- D(s)"
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

export interface BlockConstitutiveRelation {
  blockId: string;
  blockCode: string;
  blockName: string;
  blockSymbolLatex: string;
  inputSignalSymbol: string;
  inputSignalLatex: string;
  outputSignalSymbol: string;
  outputSignalLatex: string;
  gain: RatFunc;
  gainLatex: string;
  gainCompact: string;
  nature: 'numeric' | 'symbolic-parametric' | 'symbolic-generic';
  relationText: string; // Ex: "Y(s) = G(s) * U(s)"
  relationLatex: string; // Ex: "Y(s) = G(s) \\cdot U(s)"
}

export interface PickoffPointInfo {
  sourceId: string;
  sourceName: string;
  signalSymbol: string;
  signalLatex: string;
  destinations: string[];
}

export interface DetailedMethodStep {
  stepNumber: number;
  title: string;
  usedEquationLatex: string;
  substitutionLatex: string;
  operationDescription: string;
  resultLatex: string;
  resultText: string;
  explanation: string;
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
  zeroedInputsText: string; // Ex: "D(s) = 0"
  zeroedInputsLatex: string;
  unsimplifiedNumLatex: string;
  unsimplifiedDenLatex: string;
}

export interface AlgebraicValidationStep {
  title: string;
  description: string;
  equationText: string;
  equationLatex: string;
}

export interface SteadyStateInputAnalysis {
  inputInfo: SignalNodeInfo;
  inputAmplitudeSymbol: string; // Ex: "r_0" ou "d_0"
  outputSteadyStateRat: RatFunc; // T_Y(0)
  outputSteadyStateLatex: string;
  outputSteadyStateCompact: string;
  errorSteadyStateRat: RatFunc | null; // T_E(0)
  errorSteadyStateLatex: string | null;
  errorSteadyStateCompact: string | null;
}

export interface SteadyStateReport {
  applicable: boolean;
  isSymbolic: boolean;
  reasonText: string;
  conditionLatex: string;
  systemType: number | null;
  kpLatex: string | null;
  kvLatex: string | null;
  kaLatex: string | null;
  perInputResults: SteadyStateInputAnalysis[];
  totalOutputSteadyStateLatex: string;
  totalErrorSteadyStateLatex: string | null;
  pedagogicalNotes: string[];
  stabilityReport?: StabilityReport;
}

export interface ScilabSimulationPreviewSeries {
  label: string;
  color: string;
  t: number[];
  y: number[];
  finalValue: number;
}

export interface ScilabGenerationReport {
  isFullyNumeric: boolean;
  pendingSymbolicParams: string[];
  scriptCode: string;
  previewSeries: ScilabSimulationPreviewSeries[];
}

export interface CompleteSystemAnalysis {
  preparedGraph: DiagramGraph;
  isPureSymbolicMode: boolean;
  nodeInfoMap: Record<string, SignalNodeInfo>;
  independentInputs: SignalNodeInfo[];
  outputs: SignalNodeInfo[];
  summers: SignalNodeInfo[];
  pickoffPoints: PickoffPointInfo[];
  blocks: {
    id: string;
    code: string;
    name: string;
    symbolLatex: string;
    dir: 'right' | 'left';
    gain: RatFunc;
    gainLatex: string;
    gainCompact: string;
    nature: 'numeric' | 'symbolic-parametric' | 'symbolic-generic';
  }[];
  blockRelations: BlockConstitutiveRelation[];
  summerEquations: SummerAlgebraicEquation[];
  outputEquations: OutputAlgebraicEquation[];
  primaryOutput: SignalNodeInfo;
  primaryInput: SignalNodeInfo;
  /** Pares de funções de transferência para a saída principal em relação a CADA entrada independente */
  outputByInputPairs: InputOutputMasonPair[];
  /** Pares de funções de transferência para cada somador (ex: erro E(s), controle U(s)) em relação a CADA entrada */
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
  /** Passo a passo da substituição e desenvolvimento algébrico (Etapas 4 e 5) */
  progressiveSubstitutionSteps: DetailedMethodStep[];
  /** Passo a passo da Validação Algébrica Independente */
  algebraicValidationSteps: AlgebraicValidationStep[];
  allValidationsMatch: boolean;
  /** Análise de Regime Permanente via Teorema do Valor Final (Etapa 9) */
  steadyStateReport: SteadyStateReport;
  /** Geração Automática de Script Scilab (.sce) e Prévia Numérica (Seção 7) */
  scilabReport: ScilabGenerationReport;
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
 * Ex: "Hf(s)" -> "H_f(s)", "Hc(s)" -> "H_c(s)", "G1(s)" -> "G_{1}(s)", "R(s)" -> "R(s)", "theta_d(s)" -> "\\theta_{d}(s)"
 */
export function formatCleanSignalLatex(rawName?: string, fallbackCode?: string): string {
  const base = (rawName || fallbackCode || 'X').trim();
  if (!base) return 'X(s)';

  const hasS = /\(\s*s\s*\)$/i.test(base);
  const core = hasS ? base.replace(/\(\s*s\s*\)$/i, '').trim() : base;

  if (/^\\?theta_?([a-zA-Z0-9]+)$/i.test(core)) {
    const m = core.match(/^\\?theta_?([a-zA-Z0-9]+)$/i)!;
    return `\\theta_{${m[1]}}${hasS ? '(s)' : ''}`;
  }
  if (/^\\?theta$/i.test(core)) {
    return `\\theta${hasS ? '(s)' : ''}`;
  }
  if (/^\\?tau_?([a-zA-Z0-9]+)$/i.test(core)) {
    const m = core.match(/^\\?tau_?([a-zA-Z0-9]+)$/i)!;
    return `\\tau_{${m[1]}}${hasS ? '(s)' : ''}`;
  }

  // Palavras inteiramente minúsculas com 3+ letras como "ref" -> \text{ref}(s)
  if (/^[a-z]{3,}$/.test(core)) {
    return `\\text{${core}}${hasS ? '(s)' : ''}`;
  }

  // Padrão Letra + Subscrito numérico ou literal curto (ex: G1, H2, Hf, Hc, S1, W1, Km, Kd, Ka, Td)
  const subMatch = core.match(/^([A-Za-z])_?([a-zA-Z0-9]{1,3})$/);
  if (subMatch) {
    const [, prefix, sub] = subMatch;
    return `${prefix}_{${sub}}${hasS ? '(s)' : ''}`;
  }

  if (/^[A-Za-z]$/.test(core)) {
    return `${core}${hasS ? '(s)' : ''}`;
  }

  const safe = core.replace(/_/g, '\\_');
  return `\\text{${safe}}${hasS ? '(s)' : ''}`;
}

/**
 * Formata o LaTeX de um RatFunc convertendo variáveis simbólicas como Hf -> H_f, Km -> K_m, tau_1 -> \tau_1
 */
export function formatRatFuncLatex(R: RatFunc): string {
  const norm = ratSimplify(R.num, R.den);
  const isNegNum = !polyIsOne(norm.den) && norm.num.length > 0 && norm.num.every(t => t.coeff < 0);
  const absRat: RatFunc = isNegNum
    ? { num: polyScale(norm.num, -1), den: norm.den }
    : norm;
  const baseLatex = ratToLatex(absRat);
  const formatted = baseLatex
    .replace(/\btau_\{?(\d+)\}?/g, '\\tau_{$1}')
    .replace(/\btheta_\{?([a-zA-Z0-9]+)\}?/g, '\\theta_{$1}')
    .replace(/(?<!\\)([GHWRCKTD])_\{?([a-zA-Z0-9]+)\}?/g, '$1_{$2}')
    .replace(/(?<!\\)([GHWRCKTD])([a-z0-9]+)/g, '$1_{$2}');
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
 * Calcula a função de transferência entre um par específico (inputId -> targetId)
 * preservando integralmente todos os laços de realimentação do circuito.
 */
export function runMasonForInputTargetPair(
  cleanGraph: DiagramGraph,
  inputId: string,
  targetId: string
): MasonAnalysis {
  const VIRTUAL_IN = '__MASON_VIRTUAL_IN__';
  const VIRTUAL_OUT = '__MASON_VIRTUAL_OUT__';

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
      type: el.type === 'block' ? 'block' : 'summer',
      rat: el.type === 'block' ? el.rat || ratOne() : ratOne()
    }));

  const validOriginalIds = new Set(activeElements.map(e => e.id));

  const activeConnections: DiagramConnection[] = cleanGraph.connections
    .filter(c => !c.isPending && c.from && c.to)
    .map(c => ({
      ...c,
      from: encodeId(c.from),
      to: encodeId(c.to)
    }))
    .filter(c => validOriginalIds.has(c.from) && validOriginalIds.has(c.to));

  const encodedInputId = encodeId(inputId);
  const encodedTargetId = encodeId(targetId);

  const wrappedElements: DiagramElement[] = [
    { id: 'IN', type: 'input', name: VIRTUAL_IN, rat: ratOne() },
    ...activeElements,
    { id: 'OUT', type: 'output', name: VIRTUAL_OUT, rat: ratOne() }
  ];

  const wrappedConnections: DiagramConnection[] = [
    { id: '__conn_virtual_in__', from: 'IN', to: encodedInputId, sign: '+' },
    ...activeConnections,
    { id: '__conn_virtual_out__', from: encodedTargetId, to: 'OUT', sign: '+' }
  ];

  const rawResult = computeMasonAnalysis({
    elements: wrappedElements,
    connections: wrappedConnections
  });

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
 * sobre o corpo de funções racionais RatFunc.
 */
export function solveAlgebraicLinearSystem(
  cleanGraph: DiagramGraph,
  inputId: string,
  targetId: string
): RatFunc {
  const nodes = cleanGraph.elements.filter(el => el.type !== 'input' || el.id === inputId);
  const n = nodes.length;
  const idxMap = new Map<string, number>();
  nodes.forEach((el, i) => idxMap.set(el.id, i));

  const targetIdx = idxMap.get(targetId);
  const inputIdx = idxMap.get(inputId);
  if (targetIdx === undefined || inputIdx === undefined) return ratZero();

  const aug: RatFunc[][] = Array.from({ length: n }, () =>
    Array.from({ length: n + 1 }, () => ratZero())
  );

  for (let i = 0; i < n; i++) {
    aug[i][i] = ratOne();
  }

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
      aug[i][j] = ratSub(aug[i][j], edgeGain);
    });
  });

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
 * Avalia simbolicamente ou numericamente um polinômio em s -> 0 (removendo todos os termos com potência de s >= 1).
 */
export function evaluatePolynomialAtSZero(P: Polynomial): Polynomial {
  const termsAtZero = P.filter(t => !t.vars.s || t.vars.s === 0);
  return polyNormalize(termsAtZero);
}

/**
 * Avalia simbolicamente ou numericamente uma função racional T(s) quando s -> 0.
 * Também extrai o número de polos na origem (fator s^N em D(s)).
 */
export function evaluateRatFuncAtSZero(R: RatFunc): {
  originPoles: number;
  valueAtZero: RatFunc | null; // null se denominador zerar em s=0
  reducedAtZero: RatFunc; // lim_{s->0} s^N * R(s)
} {
  const norm = ratSimplify(R.num, R.den);
  if (polyIsZero(norm.num)) {
    return { originPoles: 0, valueAtZero: ratZero(), reducedAtZero: ratZero() };
  }

  // Conta menor potência de s presente em todos os termos do denominador D(s)
  let minDenS = Infinity;
  for (const t of norm.den) {
    const sExp = t.vars.s || 0;
    if (sExp < minDenS) minDenS = sExp;
  }
  const originPoles = minDenS === Infinity ? 0 : minDenS;

  const factoredDen: Polynomial = norm.den.map(t => {
    const nv = { ...t.vars };
    if (originPoles > 0) {
      nv.s = (nv.s || 0) - originPoles;
      if (nv.s === 0) delete nv.s;
    }
    return { coeff: t.coeff, vars: nv };
  });

  const numAt0 = evaluatePolynomialAtSZero(norm.num);
  const denAt0 = evaluatePolynomialAtSZero(factoredDen);

  const reducedAtZero = ratSimplify(numAt0, denAt0);
  const valueAtZero = originPoles === 0 && !polyIsZero(denAt0) ? reducedAtZero : null;

  return {
    originPoles,
    valueAtZero,
    reducedAtZero
  };
}

/**
 * Coleta todas as variáveis simbólicas (exceto 's') presentes em uma lista de funções racionais.
 */
export function extractSymbolicVariables(rats: RatFunc[]): string[] {
  const set = new Set<string>();
  for (const r of rats) {
    for (const t of [...r.num, ...r.den]) {
      for (const k of Object.keys(t.vars)) {
        if (k !== 's' && t.vars[k] !== 0) {
          set.add(k);
        }
      }
    }
  }
  return Array.from(set).sort();
}

/**
 * Simula numericamente a resposta ao degrau unitário de uma função de transferência própria T(s) = N(s)/D(s)
 * usando integração Runge-Kutta de 4ª ordem (RK4) na forma canônica controlável.
 */
export function simulateStepResponseRK4(
  T: RatFunc,
  tMax: number = 10,
  numSteps: number = 250
): { t: number[]; y: number[] } | null {
  if (!isUnivariateInS(T.num) || !isUnivariateInS(T.den)) return null;

  const uN = trimUni(toUnivariateArr(T.num));
  const uD = trimUni(toUnivariateArr(T.den));
  const n = uD.length - 1;
  const m = uN.length - 1;

  if (n < 0 || m > n) return null;
  const an = uD[n];
  if (Math.abs(an) < 1e-12) return null;

  // Normaliza pelo coeficiente líder a_n de s^n
  const a = uD.map(c => c / an); // a[0]..a[n], onde a[n] = 1
  const b = new Array(n + 1).fill(0);
  for (let i = 0; i <= m; i++) {
    b[i] = uN[i] / an;
  }

  const dt = tMax / numSteps;
  const tArr: number[] = [];
  const yArr: number[] = [];

  // Caso estático de ordem 0: y(t) = b[0]
  if (n === 0) {
    for (let k = 0; k <= numSteps; k++) {
      tArr.push(Number((k * dt).toFixed(4)));
      yArr.push(Number(b[0].toFixed(5)));
    }
    return { t: tArr, y: yArr };
  }

  // Forma canônica controlável com termo direto D = b[n]:
  // x'_1 = x_2
  // ...
  // x'_n = -a[0]*x_1 - a[1]*x_2 - ... - a[n-1]*x_n + u(t), onde u(t) = 1 (degrau unitário)
  // y(t) = (b[0] - a[0]*b[n])*x_1 + ... + (b[n-1] - a[n-1]*b[n])*x_n + b[n]*u(t)
  const dDirect = b[n];
  const cVec = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    cVec[i] = b[i] - a[i] * dDirect;
  }

  let x = new Array(n).fill(0);

  const deriv = (state: number[]): number[] => {
    const dx = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) {
      dx[i] = state[i + 1];
    }
    let last = 1; // u(t) = 1
    for (let i = 0; i < n; i++) {
      last -= a[i] * state[i];
    }
    dx[n - 1] = last;
    return dx;
  };

  for (let step = 0; step <= numSteps; step++) {
    const curT = step * dt;
    let yVal = dDirect;
    for (let i = 0; i < n; i++) {
      yVal += cVec[i] * x[i];
    }
    if (!Number.isFinite(yVal) || Math.abs(yVal) > 1e6) break;

    tArr.push(Number(curT.toFixed(4)));
    yArr.push(Number(yVal.toFixed(5)));

    // Passo RK4
    const k1 = deriv(x);
    const x2 = x.map((xi, idx) => xi + 0.5 * dt * k1[idx]);
    const k2 = deriv(x2);
    const x3 = x.map((xi, idx) => xi + 0.5 * dt * k2[idx]);
    const k3 = deriv(x3);
    const x4 = x.map((xi, idx) => xi + dt * k3[idx]);
    const k4 = deriv(x4);

    x = x.map((xi, idx) => xi + (dt / 6) * (k1[idx] + 2 * k2[idx] + 2 * k3[idx] + k4[idx]));
  }

  return { t: tArr, y: yArr };
}

/**
 * Executa a análise completa do diagrama de blocos segundo a metodologia do professor:
 * - Etapa 1: Identificação de sinais, blocos, somadores, pontos de derivação e polaridades
 * - Etapa 2: Equações algébricas dos somadores
 * - Etapa 3: Relações constitutivas dos blocos
 * - Etapa 4: Substituição progressiva das equações
 * - Etapa 5: Desenvolvimento algébrico, distributiva, MMC, agrupamento e isolamento
 * - Etapa 6: Funções de transferência individuais (Y(s)/R(s), Y(s)/D(s), E(s)/R(s), E(s)/D(s))
 * - Etapa 7: Princípio da Superposição
 * - Etapa 8: Resultado final e Validação Algébrica Independente
 * - Etapa 9: Regime Permanente (Erro Estacionário via Teorema do Valor Final)
 * - Seção 7: Script Scilab (.sce) e prévia gráfica numérica
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

  // Verifica se todos os blocos possuem expressão vazia ou '1' sem polinômio numérico explícito
  const hasExplicitNonUnitRational = rawBlocks.some(b => {
    const nTrim = (b.num ?? '').trim();
    const dTrim = (b.den ?? '').trim();
    const expr = (b.expr ?? '').trim();
    const symId = extractSymbolicIdentifierFromName(b.name, b.code);

    if (nTrim && dTrim && (nTrim !== '1' || dTrim !== '1') && nTrim !== symId) {
      return true;
    }
    if (expr && expr !== '1' && expr.replace(/\(\s*s\s*\)$/i, '') !== symId) {
      return true;
    }
    if (b.rat && !ratIsOne(b.rat)) {
      return true;
    }
    return false;
  });

  const isPureSymbolicMode = !hasExplicitNonUnitRational;

  const blockNatures: Record<string, 'numeric' | 'symbolic-parametric' | 'symbolic-generic'> = {};

  // Prepara cada elemento usando parseRatNumDen (garantindo que fatores do denominador nunca subam para o numerador)
  const preparedElements: DiagramElement[] = rawGraph.elements.map(el => {
    if (el.type !== 'block') {
      return { ...el, rat: ratOne() };
    }
    const nTrim = (el.num ?? '').trim();
    const dTrim = (el.den ?? '').trim();
    const expr = (el.expr ?? '').trim();
    const symId = extractSymbolicIdentifierFromName(el.name, el.code);

    let effectiveRat: RatFunc;
    const isBlankBlock = !nTrim && !dTrim && !expr;

    if (isBlankBlock || (isPureSymbolicMode && (!expr || expr === '1') && (!nTrim || nTrim === '1') && (!dTrim || dTrim === '1'))) {
      effectiveRat = parseRatExpr(symId);
      blockNatures[el.id] = 'symbolic-generic';
    } else if (nTrim || dTrim) {
      effectiveRat = parseRatNumDen(nTrim || '1', dTrim || '1', expr);
      const isNum = isUnivariateInS(effectiveRat.num) && isUnivariateInS(effectiveRat.den);
      blockNatures[el.id] = isNum ? 'numeric' : 'symbolic-parametric';
    } else if (expr) {
      effectiveRat = parseRatExpr(expr);
      const isNum = isUnivariateInS(effectiveRat.num) && isUnivariateInS(effectiveRat.den);
      blockNatures[el.id] = isNum ? 'numeric' : 'symbolic-parametric';
    } else if (el.rat) {
      effectiveRat = el.rat;
      const isNum = isUnivariateInS(effectiveRat.num) && isUnivariateInS(effectiveRat.den);
      blockNatures[el.id] = isNum ? 'numeric' : 'symbolic-parametric';
    } else {
      effectiveRat = parseRatExpr(symId);
      blockNatures[el.id] = 'symbolic-generic';
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

  // Ordena entradas: primeiro referências R(s), depois perturbações D(s)/W(s)
  const inputElements = preparedElements
    .filter(e => e.type === 'input')
    .sort((a, b) => {
      const aDist = a.subType === 'disturbance' ? 1 : 0;
      const bDist = b.subType === 'disturbance' ? 1 : 0;
      return aDist - bDist;
    });

  const outputElements = preparedElements.filter(e => e.type === 'output');

  const summerElements = preparedElements
    .filter(e => e.type === 'summer')
    .sort((a, b) => (a.x ?? 0) - (b.x ?? 0));

  const nodeInfoMap: Record<string, SignalNodeInfo> = {};

  inputElements.forEach((inp, idx) => {
    const isDist = inp.subType === 'disturbance';
    const rawName = (inp.name || (isDist ? 'D(s)' : 'R(s)')).trim();
    const signalSymbol = /\(\s*s\s*\)$/i.test(rawName) ? rawName : `${rawName}(s)`;
    const shortSymbol = signalSymbol.replace(/\(\s*s\s*\)$/i, '');
    nodeInfoMap[inp.id] = {
      id: inp.id,
      code: inp.code || (isDist ? `D${idx + 1}` : `R${idx + 1}`),
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

  // Identifica blocos cuja saída vai diretamente para um nó de Saída (com sinal '+')
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

  // Identifica Pontos de Derivação (nós que enviam o mesmo sinal para 2 ou mais ramos de saída)
  const pickoffPoints: PickoffPointInfo[] = [];
  preparedElements.forEach(el => {
    const outConns = validConnections.filter(c => c.from === el.id);
    if (outConns.length >= 2) {
      const directOut = blockToDirectOutputMap.get(el.id);
      const info = directOut || nodeInfoMap[el.id];
      const destNames = outConns.map(c => {
        const tgtInfo = nodeInfoMap[c.to];
        return tgtInfo ? tgtInfo.displayName : c.to;
      });
      pickoffPoints.push({
        sourceId: el.id,
        sourceName: nodeInfoMap[el.id]?.displayName || el.id,
        signalSymbol: info?.signalSymbol || 'X(s)',
        signalLatex: info?.signalLatex || 'X(s)',
        destinations: destNames
      });
    }
  });

  /**
   * Rastreia uma conexão que entra em um somador (ou saída) de volta até o sinal base
   * (uma entrada R(s)/D(s), um somador E(s)/U(s), ou a própria saída Y(s) quando realimentada)
   */
  const traceIncidentSignalBranch = (
    conn: DiagramConnection,
    isTracingForOutputNode: boolean = false
  ): SummerIncidentTerm => {
    const sign: '+' | '-' = conn.sign === '-' ? '-' : '+';
    const visited = new Set<string>();
    let curId = conn.from;

    const blockNamesText: string[] = [];
    const blockNamesLatex: string[] = [];
    let accumulatedGain = ratOne();

    while (curId && !visited.has(curId)) {
      visited.add(curId);
      const curEl = preparedElements.find(e => e.id === curId);
      if (!curEl) break;

      if (!isTracingForOutputNode && blockToDirectOutputMap.has(curId)) {
        const outSignal = blockToDirectOutputMap.get(curId)!;
        const gainCompact = blockNamesText.join('');
        const gainSymbolicLatex = blockNamesLatex.length > 0 ? blockNamesLatex.join(' ') : '1';
        const fullTermText = `${sign} ${gainCompact}${outSignal.signalSymbol}`;
        const fullTermLatex = `${sign} ${
          blockNamesLatex.length > 0 ? `${gainSymbolicLatex}` : ''
        }${outSignal.signalLatex}`;
        return {
          sign,
          gainRat: accumulatedGain,
          gainSymbolicLatex,
          gainCompact,
          sourceNodeId: outSignal.id,
          sourceSignalSymbol: outSignal.signalSymbol,
          sourceSignalLatex: outSignal.signalLatex,
          fullTermText,
          fullTermLatex
        };
      }

      if (curEl.type === 'input' || curEl.type === 'summer' || curEl.type === 'output') {
        const baseSignal = nodeInfoMap[curId];
        const gainCompact = blockNamesText.join('');
        const gainSymbolicLatex = blockNamesLatex.length > 0 ? blockNamesLatex.join(' ') : '1';
        const fullTermText = `${sign} ${gainCompact}${baseSignal.signalSymbol}`;
        const fullTermLatex = `${sign} ${
          blockNamesLatex.length > 0 ? `${gainSymbolicLatex}` : ''
        }${baseSignal.signalLatex}`;
        return {
          sign,
          gainRat: accumulatedGain,
          gainSymbolicLatex,
          gainCompact,
          sourceNodeId: baseSignal.id,
          sourceSignalSymbol: baseSignal.signalSymbol,
          sourceSignalLatex: baseSignal.signalLatex,
          fullTermText,
          fullTermLatex
        };
      }

      const bInfo = nodeInfoMap[curId];
      blockNamesText.unshift(bInfo.signalSymbol);
      blockNamesLatex.unshift(bInfo.signalLatex);
      accumulatedGain = ratMul(curEl.rat || ratOne(), accumulatedGain);

      const inConns = validConnections.filter(c => c.to === curId);
      if (inConns.length === 1) {
        curId = inConns[0].from;
      } else {
        break;
      }
    }

    const fallbackInfo = nodeInfoMap[conn.from] || {
      id: conn.from,
      signalSymbol: 'X(s)',
      signalLatex: 'X(s)'
    };
    return {
      sign,
      gainRat: accumulatedGain,
      gainSymbolicLatex: '1',
      gainCompact: '',
      sourceNodeId: fallbackInfo.id,
      sourceSignalSymbol: fallbackInfo.signalSymbol,
      sourceSignalLatex: fallbackInfo.signalLatex,
      fullTermText: `${sign} ${fallbackInfo.signalSymbol}`,
      fullTermLatex: `${sign} ${fallbackInfo.signalLatex}`
    };
  };

  // Etapa 2: Equações algébricas reais de cada Somador
  const summerEquations: SummerAlgebraicEquation[] = summerElements.map(sum => {
    const sInfo = nodeInfoMap[sum.id];
    const incoming = validConnections.filter(c => c.to === sum.id);
    const rawTerms = incoming.map(c => traceIncidentSignalBranch(c, false));

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
      summerId: sum.id,
      summerName: sInfo.displayName,
      signalSymbol: sInfo.signalSymbol,
      signalLatex: sInfo.signalLatex,
      terms: rawTerms,
      equationText: `${sInfo.signalSymbol} = ${rhsText}`,
      equationLatex: `${sInfo.signalLatex} = ${rhsLatex}`
    };
  });

  // Equações algébricas de cada Saída (ex: Y(s) = G(s)U(s))
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

  // Etapa 3: Relações constitutivas entrada-saída de cada bloco
  const blockRelations: BlockConstitutiveRelation[] = preparedElements
    .filter(e => e.type === 'block')
    .map((blk, idx) => {
      const bInfo = nodeInfoMap[blk.id];
      const inConn = validConnections.find(c => c.to === blk.id);
      const srcInfo = inConn ? blockToDirectOutputMap.get(inConn.from) || nodeInfoMap[inConn.from] : undefined;
      const inSym = srcInfo ? srcInfo.signalSymbol : `X_{\\text{in},${idx + 1}}(s)`;
      const inLat = srcInfo ? srcInfo.signalLatex : `X_{\\text{in},${idx + 1}}(s)`;

      const directOut = blockToDirectOutputMap.get(blk.id);
      const outSym = directOut ? directOut.signalSymbol : `${bInfo.signalSymbol} ${inSym}`;
      const outLat = directOut ? directOut.signalLatex : `V_{${bInfo.code}}(s)`;

      const g = blk.rat || ratOne();
      const gainLatex = formatRatFuncLatex(g);
      const gainCompact = formatRatFuncCompact(g);
      const nature = blockNatures[blk.id] || 'symbolic-generic';

      const relationText = directOut
        ? `${directOut.signalSymbol} = ${bInfo.signalSymbol} * ${inSym}`
        : `V_${bInfo.code}(s) = ${bInfo.signalSymbol} * ${inSym}`;
      const relationLatex = directOut
        ? `${directOut.signalLatex} = ${bInfo.signalLatex} \\cdot ${inLat}${
            nature !== 'symbolic-generic' ? ` = \\left(${gainLatex}\\right) \\cdot ${inLat}` : ''
          }`
        : `${outLat} = ${bInfo.signalLatex} \\cdot ${inLat}${
            nature !== 'symbolic-generic' ? ` = \\left(${gainLatex}\\right) \\cdot ${inLat}` : ''
          }`;

      return {
        blockId: blk.id,
        blockCode: bInfo.code,
        blockName: bInfo.displayName,
        blockSymbolLatex: bInfo.signalLatex,
        inputSignalSymbol: inSym,
        inputSignalLatex: inLat,
        outputSignalSymbol: outSym,
        outputSignalLatex: outLat,
        gain: g,
        gainLatex,
        gainCompact,
        nature,
        relationText,
        relationLatex
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

  const buildPairAnalysis = (inp: SignalNodeInfo, tgt: SignalNodeInfo): InputOutputMasonPair => {
    const masonAnalysis = runMasonForInputTargetPair(preparedGraph, inp.id, tgt.id);
    const tf = ratSimplify(masonAnalysis.totalT.num, masonAnalysis.totalT.den);
    const rawAlgTf = solveAlgebraicLinearSystem(preparedGraph, inp.id, tgt.id);
    const matchesAlgebraic = polyEqual(
      polyNormalize(polyMul(tf.num, rawAlgTf.den)),
      polyNormalize(polyMul(rawAlgTf.num, tf.den))
    );
    const algTf = matchesAlgebraic ? tf : rawAlgTf;

    const otherInputs = independentInputs.filter(other => other.id !== inp.id);
    const zeroedInputsText =
      otherInputs.length > 0
        ? otherInputs.map(o => `${o.signalSymbol} = 0`).join(', ')
        : 'Entrada única ativa';
    const zeroedInputsLatex =
      otherInputs.length > 0
        ? otherInputs.map(o => `${o.signalLatex} = 0`).join(', \\; ')
        : '\\text{Entrada única ativa}';

    return {
      inputInfo: inp,
      targetInfo: tgt,
      masonAnalysis,
      transferFunction: tf,
      transferFunctionLatex: formatRatFuncLatex(tf),
      transferFunctionCompact: formatRatFuncCompact(tf),
      algebraicTransferFunction: algTf,
      matchesAlgebraic,
      zeroedInputsText,
      zeroedInputsLatex,
      unsimplifiedNumLatex: formatRatFuncLatex({ num: tf.num, den: polyFromNumber(1) }),
      unsimplifiedDenLatex: formatRatFuncLatex({ num: tf.den, den: polyFromNumber(1) })
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
        textParts.push(`${isNegative ? '-' : ''}[${absComp}]${p.inputInfo.signalSymbol}`);
        latexParts.push(`${isNegative ? '-' : ''}\\left[${absLatex}\\right]${p.inputInfo.signalLatex}`);
      } else {
        textParts.push(`${isNegative ? '- ' : '+ '}[${absComp}]${p.inputInfo.signalSymbol}`);
        latexParts.push(`${isNegative ? '- ' : '+ '}\\left[${absLatex}\\right]${p.inputInfo.signalLatex}`);
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
  // ETAPAS 4 E 5: SUBSTITUIÇÃO PROGRESSIVA E DESENVOLVIMENTO ALGÉBRICO
  // =========================================================================
  const progressiveSubstitutionSteps: DetailedMethodStep[] = [];
  const mainOutEq = outputEquations.find(o => o.outputId === primaryOutput.id) || outputEquations[0];

  if (mainOutEq) {
    let curText = mainOutEq.equationText.split('=')[1]?.trim() || '';
    let curLatex = mainOutEq.equationLatex.split('=')[1]?.trim() || '';

    progressiveSubstitutionSteps.push({
      stepNumber: 1,
      title: `Equação de partida para a saída ${primaryOutput.signalSymbol}`,
      usedEquationLatex: mainOutEq.equationLatex,
      substitutionLatex: `${primaryOutput.signalLatex} = ${curLatex}`,
      operationDescription: 'Identificação do ramo diretamente conectado ao terminal de saída do sistema.',
      resultLatex: `${primaryOutput.signalLatex} = ${curLatex}`,
      resultText: `${primaryOutput.signalSymbol} = ${curText}`,
      explanation: `Expressamos a saída ${primaryOutput.signalSymbol} em função do sinal imediatamente anterior no diagrama.`
    });

    for (let i = summerEquations.length - 1; i >= 0; i--) {
      const sEq = summerEquations[i];
      const sRhsText = sEq.equationText.split('=')[1]?.trim() || '';
      const sRhsLatex = sEq.equationLatex.split('=')[1]?.trim() || '';
      if (curText.includes(sEq.signalSymbol) || curLatex.includes(sEq.signalLatex)) {
        const nextText = curText.split(sEq.signalSymbol).join(`(${sRhsText})`);
        const nextLatex = curLatex.split(sEq.signalLatex).join(`\\left(${sRhsLatex}\\right)`);
        progressiveSubstitutionSteps.push({
          stepNumber: progressiveSubstitutionSteps.length + 1,
          title: `Substituição do sinal intermediário ${sEq.signalSymbol} (${sEq.summerName})`,
          usedEquationLatex: sEq.equationLatex,
          substitutionLatex: `${sEq.signalLatex} \\longrightarrow \\left(${sRhsLatex}\\right)`,
          operationDescription: `Substituição algébrica de ${sEq.signalSymbol} na expressão de ${primaryOutput.signalSymbol}.`,
          resultLatex: `${primaryOutput.signalLatex} = ${nextLatex}`,
          resultText: `${primaryOutput.signalSymbol} = ${nextText}`,
          explanation: `Eliminamos a variável intermediária ${sEq.signalSymbol} substituindo sua equação do ${sEq.summerName}.`
        });
        curText = nextText;
        curLatex = nextLatex;
      }
    }

    // Passo de Agrupamento e Isolamento da Saída
    const firstPair = outputByInputPairs[0];
    if (firstPair) {
      const charDenLatex = formatRatFuncLatex({ num: firstPair.transferFunction.den, den: polyFromNumber(1) });
      const rhsTermsLatex = outputByInputPairs
        .filter(p => !ratIsZero(p.transferFunction))
        .map((p, idx) => {
          const numLat = formatRatFuncLatex({ num: p.transferFunction.num, den: polyFromNumber(1) });
          return `${idx > 0 && !numLat.startsWith('-') ? '+ ' : ''}\\left(${numLat}\\right)${p.inputInfo.signalLatex}`;
        })
        .join(' ');

      progressiveSubstitutionSteps.push({
        stepNumber: progressiveSubstitutionSteps.length + 1,
        title: `Aplicação da distributiva, MMC e agrupamento dos termos em ${primaryOutput.signalSymbol}`,
        usedEquationLatex: `${primaryOutput.signalLatex} = ${curLatex}`,
        substitutionLatex: `\\left(${charDenLatex}\\right) ${primaryOutput.signalLatex} = ${rhsTermsLatex || '0'}`,
        operationDescription:
          'Expansão distributiva dos produtos de blocos em série, redução ao mesmo denominador (MMC) e transposição dos termos de realimentação para o membro esquerdo.',
        resultLatex: mainSuperposition.latex,
        resultText: mainSuperposition.text,
        explanation: `Colocando ${primaryOutput.signalSymbol} em evidência no lado esquerdo e dividindo ambos os membros pelo polinômio característico de malha fechada (${charDenLatex}), isolamos a saída ${primaryOutput.signalSymbol}.`
      });
    }
  }

  // =========================================================================
  // VALIDAÇÃO ALGÉBRICA INDEPENDENTE (SEÇÃO 5.4)
  // =========================================================================
  const algebraicValidationSteps: AlgebraicValidationStep[] = [];

  const allSysEqText = [
    ...summerEquations.map(s => s.equationText),
    ...outputEquations.map(o => o.equationText)
  ].join(' ;  ');

  const allSysEqLatex = [
    ...summerEquations.map(s => s.equationLatex),
    ...outputEquations.map(o => o.equationLatex)
  ].join(' \\\\[4pt] ');

  algebraicValidationSteps.push({
    title: '1. Sistema Linear de Equações de Nós e Somadores',
    description:
      'A partir das conexões direcionadas e polaridades de cada somador e bloco, montamos o sistema linear A(s)v(s) = B(s)u(s) no domínio de Laplace:',
    equationText: allSysEqText,
    equationLatex: `\\begin{cases} ${allSysEqLatex} \\end{cases}`
  });

  if (progressiveSubstitutionSteps.length > 0) {
    const lastSub = progressiveSubstitutionSteps[progressiveSubstitutionSteps.length - 1];
    algebraicValidationSteps.push({
      title: '2. Substituição Progressiva e Isolamento Algébrico',
      description:
        'Substituindo os sinais internos dos somadores na equação da saída principal e agrupando os termos realimentados:',
      equationText: lastSub.resultText,
      equationLatex: `${lastSub.substitutionLatex} \\implies ${lastSub.resultLatex}`
    });
  }

  outputByInputPairs.forEach((pair, idx) => {
    algebraicValidationSteps.push({
      title: `${idx + 3}. Resolução Algébrica para a entrada ${pair.inputInfo.signalSymbol} (${pair.zeroedInputsText})`,
      description: `Anulando as demais entradas independentes (${pair.zeroedInputsText}) e isolando a razão entre ${pair.targetInfo.signalSymbol} e ${pair.inputInfo.signalSymbol}:`,
      equationText: `${pair.targetInfo.signalSymbol}/${pair.inputInfo.signalSymbol} = ${pair.transferFunctionCompact}`,
      equationLatex: `\\left.\\frac{${pair.targetInfo.signalLatex}}{${pair.inputInfo.signalLatex}}\\right|_{${pair.zeroedInputsLatex}} = ${pair.transferFunctionLatex}`
    });
  });

  const allValidationsMatch =
    outputByInputPairs.every(p => p.matchesAlgebraic) &&
    summerByInputPairs.every(p => p.matchesAlgebraic);

  const blocks = preparedElements
    .filter(e => e.type === 'block')
    .map(b => {
      const bInfo = nodeInfoMap[b.id];
      const g = b.rat || ratOne();
      return {
        id: b.id,
        code: bInfo.code,
        name: bInfo.displayName,
        symbolLatex: bInfo.signalLatex,
        dir: (b.dir || 'right') as 'right' | 'left',
        gain: g,
        gainLatex: formatRatFuncLatex(g),
        gainCompact: formatRatFuncCompact(g),
        nature: blockNatures[b.id] || 'symbolic-generic'
      };
    });

  // =========================================================================
  // ETAPA 9: ANÁLISE EM REGIME PERMANENTE (TEOREMA DO VALOR FINAL)
  // =========================================================================
  const allTfs = [
    ...outputByInputPairs.map(p => p.transferFunction),
    ...summerByInputPairs.map(p => p.transferFunction)
  ];
  const symbolicVars = extractSymbolicVariables(allTfs);
  const isSymbolic = symbolicVars.length > 0;

  let applicable = true;
  let reasonText =
    'Condições satisfeitas: utilizando o Teorema do Valor Final para entradas em degrau R(s) = r₀/s e D(s) = d₀/s.';
  const conditionLatex =
    'y_{rp} = \\lim_{t \\to \\infty} y(t) = \\lim_{s \\to 0} s Y(s) \\qquad ; \\qquad e_{rp} = \\lim_{t \\to \\infty} e(t) = \\lim_{s \\to 0} s E(s)';

  let stabilityReport: StabilityReport | undefined = undefined;
  if (!isSymbolic && outputByInputPairs.length > 0) {
    stabilityReport = analyzeTransferFunction(outputByInputPairs[0].transferFunction);
    const uD = trimUni(toUnivariateArr(outputByInputPairs[0].transferFunction.den));
    const coeffsDesc = [...uD].reverse();
    const routh = checkRouthHurwitz(coeffsDesc);
    const hasUnstablePole = stabilityReport.poles.some(p => p.re > 1e-5);
    const hasImagAxisPole = stabilityReport.poles.some(p => Math.abs(p.re) <= 1e-5);

    if (hasUnstablePole || !routh.isStable) {
      applicable = false;
      reasonText = `O Teorema do Valor Final NÃO é aplicável a este circuito: ${stabilityReport.stabilityText}. Como existem polos com parte real positiva ou sobre o eixo imaginário, a resposta temporal diverge ou oscila indefinidamente e não atinge regime permanente constante.`;
    } else if (hasImagAxisPole) {
      applicable = false;
      reasonText =
        'O Teorema do Valor Final NÃO é aplicável diretamente: o denominador de malha fechada possui raízes sobre o eixo imaginário (s = jω), gerando resposta oscilatória ou rampa ilimitada para entrada em degrau.';
    }
  } else if (isSymbolic) {
    reasonText = `Análise algébrica simbólica sob a hipótese necessária de que os parâmetros (${symbolicVars.join(
      ', '
    )}) garantam que todas as raízes do polinômio característico estejam no semiplano esquerdo (Re(s) < 0).`;
  }

  const primaryErrorSummer = summers[0];
  const perInputResults: SteadyStateInputAnalysis[] = independentInputs.map((inp, idx) => {
    const outPair = outputByInputPairs.find(p => p.inputInfo.id === inp.id);
    const errPair = primaryErrorSummer
      ? summerByInputPairs.find(
          p => p.inputInfo.id === inp.id && p.targetInfo.id === primaryErrorSummer.id
        )
      : undefined;

    const ampSym =
      inp.role === 'input-dist'
        ? independentInputs.filter(i => i.role === 'input-dist').length > 1
          ? `d_{${idx}}`
          : 'd_0'
        : 'r_0';

    const outEval = outPair ? evaluateRatFuncAtSZero(outPair.transferFunction) : null;
    const outRat = outEval?.valueAtZero || ratZero();

    const errEval = errPair ? evaluateRatFuncAtSZero(errPair.transferFunction) : null;
    const errRat = errEval ? errEval.valueAtZero : null;

    return {
      inputInfo: inp,
      inputAmplitudeSymbol: ampSym,
      outputSteadyStateRat: outRat,
      outputSteadyStateLatex: outEval?.valueAtZero
        ? formatRatFuncLatex(outRat)
        : '\\infty \\text{ (polo em } s=0\\text{)}',
      outputSteadyStateCompact: outEval?.valueAtZero ? formatRatFuncCompact(outRat) : 'infinito',
      errorSteadyStateRat: errRat,
      errorSteadyStateLatex: errEval
        ? errEval.valueAtZero
          ? formatRatFuncLatex(errEval.valueAtZero)
          : '\\infty'
        : null,
      errorSteadyStateCompact: errEval
        ? errEval.valueAtZero
          ? formatRatFuncCompact(errEval.valueAtZero)
          : 'infinito'
        : null
    };
  });

  const outSteadyTerms = perInputResults
    .filter(r => !ratIsZero(r.outputSteadyStateRat))
    .map((r, i) => {
      const lat = r.outputSteadyStateLatex;
      const isNeg = lat.startsWith('-');
      const absLat = isNeg ? lat.slice(1) : lat;
      if (i === 0) {
        return `${isNeg ? '-' : ''}\\left(${absLat}\\right) ${r.inputAmplitudeSymbol}`;
      }
      return `${isNeg ? '- ' : '+ '}\\left(${absLat}\\right) ${r.inputAmplitudeSymbol}`;
    });

  const totalOutputSteadyStateLatex = applicable
    ? `y_{rp} = ${outSteadyTerms.length > 0 ? outSteadyTerms.join(' ') : '0'}`
    : '\\text{Não aplicável (sistema instável em malha fechada)}';

  const errSteadyTerms = perInputResults
    .filter(r => r.errorSteadyStateRat && !ratIsZero(r.errorSteadyStateRat))
    .map((r, i) => {
      const lat = r.errorSteadyStateLatex || '0';
      const isNeg = lat.startsWith('-');
      const absLat = isNeg ? lat.slice(1) : lat;
      if (i === 0) {
        return `${isNeg ? '-' : ''}\\left(${absLat}\\right) ${r.inputAmplitudeSymbol}`;
      }
      return `${isNeg ? '- ' : '+ '}\\left(${absLat}\\right) ${r.inputAmplitudeSymbol}`;
    });

  const totalErrorSteadyStateLatex = primaryErrorSummer
    ? applicable
      ? `e_{rp} = ${errSteadyTerms.length > 0 ? errSteadyTerms.join(' ') : '0'}`
      : '\\text{Não aplicável}'
    : null;

  const pedagogicalNotes: string[] = [];
  // Verifica se é o caso de Motor CC em Malha Aberta (Km e Kd presentes sem malha fechada)
  const hasKm = symbolicVars.includes('Km') || symbolicVars.includes('K_m');
  const hasKd = symbolicVars.includes('Kd') || symbolicVars.includes('K_d');
  const hasLoops = outputByInputPairs[0]?.masonAnalysis.loops.length > 0;

  if (hasKm && hasKd && !hasLoops) {
    pedagogicalNotes.push(
      'Análise de Malha Aberta (Estudo de Caso Motor CC): Ajustando o ganho do controlador para K = 1/Km, o ganho estático para a referência torna-se K·Km = 1 (eliminando o erro estacionário de seguimento de referência sem perturbação).'
    );
    pedagogicalNotes.push(
      'Entretanto, sob ação da perturbação em degrau D(s) = d₀/s com K = 1/Km, a saída em regime permanente vale y_rp = r₀ - d₀·(Kd/Km), resultando no erro estacionário residual e_rp = -d₀·(Kd/Km), que não pode ser eliminado em malha aberta.'
    );
  } else if (hasKm && hasKd && hasLoops) {
    pedagogicalNotes.push(
      'Análise de Malha Fechada (Estudo de Caso Motor CC): A realimentação introduz o fator (1 + K·Km) no denominador tanto da resposta à referência quanto da resposta à perturbação.'
    );
    pedagogicalNotes.push(
      'Escolhendo um valor elevado para o ganho K do controlador, obtém-se simultaneamente bom seguimento de referência (y_rp,R = [K·Km/(1 + K·Km)]·r₀ ≈ r₀) e forte rejeição de perturbação (y_rp,D = -[Kd/(1 + K·Km)]·d₀ ≈ 0).'
    );
  } else if (independentInputs.length > 1) {
    pedagogicalNotes.push(
      'Rastreamento de Referência vs. Rejeição de Perturbação: Para bom seguimento da referência deseja-se |Y(s)/R(s)| ≈ 1 em baixas frequências, enquanto para rejeição de perturbações deseja-se minimizar |Y(s)/D(s)| ≈ 0.'
    );
  }

  const steadyStateReport: SteadyStateReport = {
    applicable,
    isSymbolic,
    reasonText,
    conditionLatex,
    systemType: stabilityReport ? stabilityReport.systemType : null,
    kpLatex:
      stabilityReport && stabilityReport.dcGain !== null
        ? `${stabilityReport.dcGain}`
        : perInputResults[0]
        ? perInputResults[0].outputSteadyStateLatex
        : null,
    kvLatex: null,
    kaLatex: null,
    perInputResults,
    totalOutputSteadyStateLatex,
    totalErrorSteadyStateLatex,
    pedagogicalNotes,
    stabilityReport
  };

  // =========================================================================
  // SEÇÃO 7: GERAÇÃO AUTOMÁTICA DO SCRIPT SCILAB (.SCE) E PRÉVIA NUMÉRICA
  // =========================================================================
  const scilabReport = buildScilabReport(
    independentInputs,
    primaryOutput,
    outputByInputPairs,
    summerByInputPairs,
    symbolicVars,
    stabilityReport
  );

  return {
    preparedGraph,
    isPureSymbolicMode,
    nodeInfoMap,
    independentInputs,
    outputs,
    summers,
    pickoffPoints,
    blocks,
    blockRelations,
    summerEquations,
    outputEquations,
    primaryOutput,
    primaryInput,
    outputByInputPairs,
    summerByInputPairs,
    superpositionOutputText: mainSuperposition.text,
    superpositionOutputLatex: mainSuperposition.latex,
    superpositionSummers,
    progressiveSubstitutionSteps,
    algebraicValidationSteps,
    allValidationsMatch,
    steadyStateReport,
    scilabReport
  };
}

/**
 * Gera o script Scilab (.sce) completo e sincronizado com o circuito resolvido,
 * respeitando rigorosamente a ordem crescente dos coeficientes em poly([c0 c1 ... cn], 's', 'coeff').
 */
function buildScilabReport(
  independentInputs: SignalNodeInfo[],
  primaryOutput: SignalNodeInfo,
  outputByInputPairs: InputOutputMasonPair[],
  summerByInputPairs: InputOutputMasonPair[],
  symbolicVars: string[],
  stabilityReport?: StabilityReport
): ScilabGenerationReport {
  const isFullyNumeric = symbolicVars.length === 0;
  const lines: string[] = [];

  lines.push('// =========================================================================');
  lines.push('// Script de Verificação e Simulação no Scilab (.sce)');
  lines.push('// Gerado automaticamente pelo Laboratório de Sistemas de Controle (EEL6005)');
  lines.push('// =========================================================================');
  lines.push('');
  lines.push('clear;');
  lines.push('clc;');
  lines.push('clf();');
  lines.push('');
  lines.push('// Variável complexa de Laplace');
  lines.push("s = %s;");
  lines.push('');

  const previewSeries: ScilabSimulationPreviewSeries[] = [];
  const colors = ['#0284c7', '#dc2626', '#059669', '#7c3aed'];

  // Determina horizonte de tempo adequado à dinâmica do sistema
  let tMax = 10;
  if (stabilityReport?.secondOrderParams?.ts2Percent && Number.isFinite(stabilityReport.secondOrderParams.ts2Percent)) {
    tMax = Math.max(5, Math.min(60, Math.ceil(stabilityReport.secondOrderParams.ts2Percent * 1.6)));
  }

  if (isFullyNumeric) {
    const tfVarNames: { varName: string; stepVar: string; pair: InputOutputMasonPair; idx: number }[] = [];

    outputByInputPairs.forEach((pair, idx) => {
      const inpShort = pair.inputInfo.shortSymbol.replace(/[^A-Za-z0-9_]/g, '') || `U${idx + 1}`;
      const numAsc = trimUni(toUnivariateArr(pair.transferFunction.num));
      const denAsc = trimUni(toUnivariateArr(pair.transferFunction.den));

      const formatAscArray = (arr: number[]) =>
        `[${arr.map(c => Number(c.toFixed(6))).join(' ')}]`;

      const explainAscTerms = (arr: number[]) =>
        arr.map((c, p) => `${Number(c.toFixed(4))}*s^${p}`).join(' + ');

      const suffix = outputByInputPairs.length === 1 ? '' : `_${inpShort}`;
      const numVar = `num${suffix}`;
      const denVar = `den${suffix}`;
      const tfVar = `T${suffix}`;
      const stepVar = `y${suffix}`;

      lines.push(`// -------------------------------------------------------------------------`);
      lines.push(`// Função de Transferência: ${pair.targetInfo.signalSymbol} / ${pair.inputInfo.signalSymbol}`);
      lines.push(`// Expressão: ${pair.transferFunctionCompact}`);
      lines.push(`// Nota: Em poly([...], 's', 'coeff'), os coeficientes estão em ordem CRESCENTE de potências de s`);
      lines.push(`// Numerador (${explainAscTerms(numAsc)})`);
      lines.push(`${numVar} = poly(${formatAscArray(numAsc)}, 's', 'coeff');`);
      lines.push(`// Denominador (${explainAscTerms(denAsc)})`);
      lines.push(`${denVar} = poly(${formatAscArray(denAsc)}, 's', 'coeff');`);
      lines.push(`${tfVar} = syslin('c', ${numVar}, ${denVar});`);
      lines.push('');
      lines.push(`disp("=== FUNÇÃO DE TRANSFERÊNCIA ${pair.targetInfo.signalSymbol} / ${pair.inputInfo.signalSymbol} ===");`);
      lines.push(`disp(${tfVar});`);
      lines.push('');
      lines.push(`// Cálculo dos Polos e Zeros de ${tfVar}`);
      lines.push(`p${suffix} = poles(${tfVar});`);
      lines.push(`z${suffix} = roots(${numVar});`);
      lines.push(`disp("Polos de ${tfVar}:");`);
      lines.push(`disp(p${suffix});`);
      lines.push(`disp("Zeros de ${tfVar}:");`);
      lines.push(`disp(z${suffix});`);
      lines.push('');

      tfVarNames.push({ varName: tfVar, stepVar, pair, idx });

      // Calcula série numérica real para prévia gráfica na interface
      const sim = simulateStepResponseRK4(pair.transferFunction, tMax, 250);
      if (sim && sim.t.length > 1) {
        previewSeries.push({
          label: `Resposta parcial: ${pair.targetInfo.signalSymbol} devido a ${pair.inputInfo.signalSymbol}`,
          color: colors[idx % colors.length],
          t: sim.t,
          y: sim.y,
          finalValue: sim.y[sim.y.length - 1]
        });
      }
    });

    lines.push('// -------------------------------------------------------------------------');
    lines.push('// Simulação Temporal (Resposta ao Degrau Unitário)');
    lines.push('// -------------------------------------------------------------------------');
    lines.push(`t = 0:0.01:${tMax};`);
    lines.push('');

    tfVarNames.forEach((item, idx) => {
      lines.push(`${item.stepVar} = csim('step', t, ${item.varName});`);
      lines.push(`scf(${idx + 1});`);
      lines.push(`plot(t, ${item.stepVar}, 'LineWidth', 2);`);
      lines.push(
        `xtitle("Resposta ao Degrau Unitário: ${item.pair.targetInfo.signalSymbol} / ${item.pair.inputInfo.signalSymbol}", "Tempo (s)", "Amplitude ${item.pair.targetInfo.signalSymbol}");`
      );
      lines.push('xgrid();');
      lines.push('');
    });

    if (tfVarNames.length > 1) {
      const sumExpr = tfVarNames.map(item => item.stepVar).join(' + ');
      const legendStr = tfVarNames
        .map(item => `"Contribuição de ${item.pair.inputInfo.signalSymbol}"`)
        .concat([`"Resposta Total ${primaryOutput.signalSymbol} (Superposição)"`])
        .join(', ');
      const plotVars = tfVarNames.map(item => `t, ${item.stepVar}`).join(', ') + ', t, y_total';

      lines.push('// -------------------------------------------------------------------------');
      lines.push('// Resposta Total utilizando o Princípio da Superposição');
      lines.push('// -------------------------------------------------------------------------');
      lines.push(`y_total = ${sumExpr};`);
      lines.push(`scf(${tfVarNames.length + 1});`);
      lines.push(`plot(${plotVars}, 'LineWidth', 2);`);
      lines.push(
        `xtitle("Resposta Total por Superposição — ${primaryOutput.signalSymbol}", "Tempo (s)", "Amplitude");`
      );
      lines.push(`legend([${legendStr}]);`);
      lines.push('xgrid();');

      // Adiciona a curva de superposição total na prévia gráfica se houver múltiplas séries compatíveis
      if (previewSeries.length === tfVarNames.length && previewSeries[0].t.length > 0) {
        const refT = previewSeries[0].t;
        const totY = refT.map((_, i) =>
          Number(previewSeries.reduce((acc, s) => acc + (s.y[i] || 0), 0).toFixed(5))
        );
        previewSeries.push({
          label: `Resposta Total ${primaryOutput.signalSymbol} (Superposição)`,
          color: '#059669',
          t: refT,
          y: totY,
          finalValue: totY[totY.length - 1]
        });
      }
    }
  } else {
    // Circuito possui parâmetros simbólicos pendentes
    lines.push('// ATENÇÃO: O diagrama possui parâmetros simbólicos ainda não definidos numericamente:');
    lines.push(`// Parâmetros pendentes: ${symbolicVars.join(', ')}`);
    lines.push('// Preencha os valores numéricos abaixo no Scilab antes de executar a simulação:');
    lines.push('');
    symbolicVars.forEach(v => {
      lines.push(`${v.replace(/_/g, '')} = 1; // <-- INSIRA AQUI O VALOR NUMÉRICO DE ${v.replace(/_/g, '')}`);
    });
    lines.push('');

    const polyToScilabExpr = (P: Polynomial): string => {
      const norm = polyNormalize(P);
      if (norm.length === 0) return '0';
      return norm
        .map((t, idx) => {
          const c = t.coeff;
          const absC = Math.abs(c);
          const sign = c < 0 ? (idx === 0 ? '-' : ' - ') : idx === 0 ? '' : ' + ';
          const vKeys = Object.keys(t.vars).sort();
          const factors: string[] = [];
          if (vKeys.length === 0 || Math.abs(absC - 1) > 1e-9) {
            factors.push(`${Number(absC.toFixed(6))}`);
          }
          for (const vk of vKeys) {
            const cleanV = vk.replace(/_/g, '');
            const exp = t.vars[vk];
            factors.push(exp === 1 ? cleanV : `(${cleanV}^${exp})`);
          }
          return `${sign}${factors.join('*')}`;
        })
        .join('');
    };

    outputByInputPairs.forEach((pair, idx) => {
      const inpShort = pair.inputInfo.shortSymbol.replace(/[^A-Za-z0-9_]/g, '') || `U${idx + 1}`;
      const suffix = outputByInputPairs.length === 1 ? '' : `_${inpShort}`;
      const numExpr = polyToScilabExpr(pair.transferFunction.num);
      const denExpr = polyToScilabExpr(pair.transferFunction.den);

      lines.push(`// Função de Transferência Simbólica: ${pair.targetInfo.signalSymbol} / ${pair.inputInfo.signalSymbol}`);
      lines.push(`num${suffix} = ${numExpr};`);
      lines.push(`den${suffix} = ${denExpr};`);
      lines.push(`T${suffix} = syslin('c', num${suffix}, den${suffix});`);
      lines.push(`disp("=== FUNÇÃO DE TRANSFERÊNCIA ${pair.targetInfo.signalSymbol} / ${pair.inputInfo.signalSymbol} ===");`);
      lines.push(`disp(T${suffix});`);
      lines.push(`disp("Polos de T${suffix}:");`);
      lines.push(`disp(poles(T${suffix}));`);
      lines.push('');
    });

    lines.push('t = 0:0.01:10;');
    outputByInputPairs.forEach((pair, idx) => {
      const inpShort = pair.inputInfo.shortSymbol.replace(/[^A-Za-z0-9_]/g, '') || `U${idx + 1}`;
      const suffix = outputByInputPairs.length === 1 ? '' : `_${inpShort}`;
      lines.push(`y${suffix} = csim('step', t, T${suffix});`);
      lines.push(`scf(${idx + 1});`);
      lines.push(`plot(t, y${suffix}, 'LineWidth', 2);`);
      lines.push(
        `xtitle("Resposta ao Degrau: ${pair.targetInfo.signalSymbol} / ${pair.inputInfo.signalSymbol}", "Tempo (s)", "Amplitude");`
      );
      lines.push('xgrid();');
      lines.push('');
    });

    if (outputByInputPairs.length > 1) {
      const sumVars = outputByInputPairs
        .map((pair, idx) => {
          const inpShort = pair.inputInfo.shortSymbol.replace(/[^A-Za-z0-9_]/g, '') || `U${idx + 1}`;
          return `y_${inpShort}`;
        })
        .join(' + ');
      lines.push('// Resposta Total utilizando Superposição');
      lines.push(`y_total = ${sumVars};`);
      lines.push(`scf(${outputByInputPairs.length + 1});`);
      lines.push(`plot(t, y_total, 'LineWidth', 2);`);
      lines.push(`xtitle("Resposta Total por Superposição — ${primaryOutput.signalSymbol}", "Tempo (s)", "Amplitude");`);
      lines.push('xgrid();');
    }
  }

  return {
    isFullyNumeric,
    pendingSymbolicParams: symbolicVars.map(v => v.replace(/_/g, '')),
    scriptCode: lines.join('\n'),
    previewSeries
  };
}

/**
 * Biblioteca de Estudos de Caso e Exercícios Didáticos da Disciplina EEL6005 (Seção 6)
 * Todos os circuitos são carregados como grafos reais e editáveis no Construtor Livre.
 */
export interface ClassroomCaseStudy {
  id: string;
  title: string;
  subtitle: string;
  slideRef: string;
  pedagogicalSummary: string;
  graph: DiagramGraph;
}

export const CLASSROOM_CASE_STUDIES: ClassroomCaseStudy[] = [
  {
    id: 'motor_dc_ma',
    title: 'Estudo de Caso 1A — Motor CC em Malha Aberta',
    subtitle: 'Seguimento de referência R(s) e rejeição de perturbação D(s) em Malha Aberta (K = 1/Km)',
    slideRef: 'Aula Influência das Entradas — Slides 7, 8 e 9',
    pedagogicalSummary:
      'Demonstra que em malha aberta o ajuste K = 1/Km anula o erro estacionário para a referência em degrau (y_rp = 1), mas não permite reduzir o erro estacionário e_rp = -d₀(Kd/Km) causado pela perturbação D(s).',
    graph: {
      elements: [
        { id: 'r_ma', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 240 },
        {
          id: 'ctrl_k',
          code: 'G1',
          type: 'block',
          subType: 'G',
          name: 'K(s)',
          num: 'K',
          den: '1',
          expr: 'K',
          rat: parseRatNumDen('K', '1'),
          dir: 'right',
          x: 260,
          y: 240
        },
        {
          id: 'planta_gp',
          code: 'G2',
          type: 'block',
          subType: 'G',
          name: 'Gp(s)',
          num: 'Km',
          den: '(1+s*tau1)*(1+s*tau2)',
          expr: 'Km/((1+s*tau1)*(1+s*tau2))',
          rat: parseRatNumDen('Km', '(1+s*tau1)*(1+s*tau2)'),
          dir: 'right',
          x: 460,
          y: 240
        },
        { id: 'd_ma', code: 'D1', type: 'input', subType: 'disturbance', name: 'D(s)', x: 660, y: 80 },
        {
          id: 'dist_gd',
          code: 'G3',
          type: 'block',
          subType: 'G',
          name: 'Gd(s)',
          num: 'Kd',
          den: '(1+s*tau1)*(1+s*tau2)',
          expr: 'Kd/((1+s*tau1)*(1+s*tau2))',
          rat: parseRatNumDen('Kd', '(1+s*tau1)*(1+s*tau2)'),
          dir: 'right',
          x: 660,
          y: 160
        },
        { id: 'sum_ma', code: 'S1', type: 'summer', name: 'S1', x: 660, y: 240 },
        { id: 'y_ma', code: 'C1', type: 'output', name: 'Y(s)', x: 820, y: 240 }
      ],
      connections: [
        { id: 'c_ma_1', from: 'r_ma', to: 'ctrl_k', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_ma_2', from: 'ctrl_k', to: 'planta_gp', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_ma_3', from: 'planta_gp', to: 'sum_ma', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_ma_4', from: 'd_ma', to: 'dist_gd', fromPort: 'S', toPort: 'N', sign: '+' },
        { id: 'c_ma_5', from: 'dist_gd', to: 'sum_ma', fromPort: 'S', toPort: 'N', sign: '-' },
        { id: 'c_ma_6', from: 'sum_ma', to: 'y_ma', fromPort: 'E', toPort: 'W', sign: '+' }
      ]
    }
  },
  {
    id: 'motor_dc_mf',
    title: 'Estudo de Caso 1B — Motor CC em Malha Fechada',
    subtitle: 'Controle em Malha Fechada com atenuação de perturbação D(s) pelo ganho K',
    slideRef: 'Aula Influência das Entradas — Slides 10, 11 e 12',
    pedagogicalSummary:
      'Com realimentação negativa Va(s) = K[R(s) - Y(s)], o denominador passa a ser (1+sτ₁)(1+sτ₂) + K·Km. Um ganho K elevado aproxima Y(s)/R(s) de 1 e reduz o efeito da perturbação D(s) para próximo de zero.',
    graph: {
      elements: [
        { id: 'r_mf', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 80, y: 240 },
        { id: 's1_mf', code: 'S1', type: 'summer', name: 'S1', x: 200, y: 240 },
        {
          id: 'ctrl_k_mf',
          code: 'G1',
          type: 'block',
          subType: 'G',
          name: 'K(s)',
          num: 'K',
          den: '1',
          expr: 'K',
          rat: parseRatNumDen('K', '1'),
          dir: 'right',
          x: 340,
          y: 240
        },
        {
          id: 'planta_gp_mf',
          code: 'G2',
          type: 'block',
          subType: 'G',
          name: 'Gp(s)',
          num: 'Km',
          den: '(1+s*tau1)*(1+s*tau2)',
          expr: 'Km/((1+s*tau1)*(1+s*tau2))',
          rat: parseRatNumDen('Km', '(1+s*tau1)*(1+s*tau2)'),
          dir: 'right',
          x: 520,
          y: 240
        },
        { id: 'd_mf', code: 'D1', type: 'input', subType: 'disturbance', name: 'D(s)', x: 700, y: 80 },
        {
          id: 'dist_gd_mf',
          code: 'G3',
          type: 'block',
          subType: 'G',
          name: 'Gd(s)',
          num: 'Kd',
          den: '(1+s*tau1)*(1+s*tau2)',
          expr: 'Kd/((1+s*tau1)*(1+s*tau2))',
          rat: parseRatNumDen('Kd', '(1+s*tau1)*(1+s*tau2)'),
          dir: 'right',
          x: 700,
          y: 160
        },
        { id: 's2_mf', code: 'S2', type: 'summer', name: 'S2', x: 700, y: 240 },
        { id: 'y_mf', code: 'C1', type: 'output', name: 'Y(s)', x: 860, y: 240 }
      ],
      connections: [
        { id: 'c_mf_1', from: 'r_mf', to: 's1_mf', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_mf_2', from: 's1_mf', to: 'ctrl_k_mf', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_mf_3', from: 'ctrl_k_mf', to: 'planta_gp_mf', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_mf_4', from: 'planta_gp_mf', to: 's2_mf', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_mf_5', from: 'd_mf', to: 'dist_gd_mf', fromPort: 'S', toPort: 'N', sign: '+' },
        { id: 'c_mf_6', from: 'dist_gd_mf', to: 's2_mf', fromPort: 'S', toPort: 'N', sign: '-' },
        { id: 'c_mf_7', from: 's2_mf', to: 'y_mf', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_mf_8', from: 'y_mf', to: 's1_mf', fromPort: 'S', toPort: 'S', sign: '-' }
      ]
    }
  },
  {
    id: 'navio_rolamento',
    title: 'Exercício 2 — Estabilização de Rolamento de Navio',
    subtitle: 'Controle com hidrofólios Ka, planta 9/(s²+1.2s+9), sensor K1 e perturbação de ondas Td(s)',
    slideRef: 'Aula Influência das Entradas — Slide 13',
    pedagogicalSummary:
      'Analisa a rejeição do torque de perturbação das ondas Td(s) sobre o ângulo de rolamento θ(s), sendo o ângulo desejado θ_d(s) = 0°. Permite comparar a atenuação das ondas em Malha Fechada versus Malha Aberta.',
    graph: {
      elements: [
        { id: 'theta_d', code: 'R1', type: 'input', subType: 'reference', name: 'theta_d(s)', x: 80, y: 240 },
        { id: 's_err', code: 'S1', type: 'summer', name: 'S1', x: 220, y: 240 },
        {
          id: 'ka_blk',
          code: 'G1',
          type: 'block',
          subType: 'G',
          name: 'Ka(s)',
          num: 'Ka',
          den: '1',
          expr: 'Ka',
          rat: parseRatNumDen('Ka', '1'),
          dir: 'right',
          x: 360,
          y: 240
        },
        { id: 'td_in', code: 'D1', type: 'input', subType: 'disturbance', name: 'Td(s)', x: 500, y: 100 },
        { id: 's_onda', code: 'S2', type: 'summer', name: 'S2', x: 500, y: 240 },
        {
          id: 'navio_gp',
          code: 'G2',
          type: 'block',
          subType: 'G',
          name: 'Gp(s)',
          num: '9',
          den: 's^2+1.2*s+9',
          expr: '9/(s^2+1.2*s+9)',
          rat: parseRatNumDen('9', 's^2+1.2*s+9'),
          dir: 'right',
          x: 680,
          y: 240
        },
        {
          id: 'sensor_k1',
          code: 'H1',
          type: 'block',
          subType: 'H',
          name: 'K1(s)',
          num: 'K1',
          den: '1',
          expr: 'K1',
          rat: parseRatNumDen('K1', '1'),
          dir: 'left',
          x: 460,
          y: 380
        },
        { id: 'theta_out', code: 'C1', type: 'output', name: 'theta(s)', x: 860, y: 240 }
      ],
      connections: [
        { id: 'c_nav_1', from: 'theta_d', to: 's_err', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_nav_2', from: 's_err', to: 'ka_blk', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_nav_3', from: 'ka_blk', to: 's_onda', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_nav_4', from: 'td_in', to: 's_onda', fromPort: 'S', toPort: 'N', sign: '+' },
        { id: 'c_nav_5', from: 's_onda', to: 'navio_gp', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_nav_6', from: 'navio_gp', to: 'theta_out', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c_nav_7', from: 'navio_gp', to: 'sensor_k1', fromPort: 'S', toPort: 'E', sign: '+' },
        { id: 'c_nav_8', from: 'sensor_k1', to: 's_err', fromPort: 'W', toPort: 'S', sign: '-' }
      ]
    }
  },
  {
    id: 'aula_alg_ex3',
    title: 'Exemplo 3 Numérico — Aula Álgebra de Blocos',
    subtitle: 'Redução de malhas aninhadas com integradores (1/s) e derivadores (s)',
    slideRef: 'Aula Álgebra de Blocos — Slide 11',
    pedagogicalSummary:
      'Exemplo numérico completo dos slides de Álgebra de Blocos: resulta em C(s)/R(s) = (s³ + 1) / (2s⁴ + s² + 2s), permitindo gerar e executar imediatamente a simulação numérica no Scilab.',
    graph: {
      elements: [
        { id: 'r_ex3', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 80, y: 240 },
        { id: 's1_ex3', code: 'S1', type: 'summer', name: 'S1', x: 200, y: 240 },
        {
          id: 'g1_ex3',
          code: 'G1',
          type: 'block',
          subType: 'G',
          name: 'G1(s)',
          num: 's',
          den: '1',
          expr: 's',
          rat: parseRatNumDen('s', '1'),
          dir: 'right',
          x: 340,
          y: 240
        },
        {
          id: 'g2_ex3',
          code: 'G2',
          type: 'block',
          subType: 'G',
          name: 'G2(s)',
          num: 's',
          den: '1',
          expr: 's',
          rat: parseRatNumDen('s', '1'),
          dir: 'right',
          x: 500,
          y: 240
        },
        {
          id: 'g3_ex3',
          code: 'G3',
          type: 'block',
          subType: 'G',
          name: 'G3(s)',
          num: '1',
          den: 's',
          expr: '1/s',
          rat: parseRatNumDen('1', 's'),
          dir: 'right',
          x: 420,
          y: 340
        },
        { id: 's2_ex3', code: 'S2', type: 'summer', name: 'S2', x: 640, y: 240 },
        {
          id: 'g4_ex3',
          code: 'G4',
          type: 'block',
          subType: 'G',
          name: 'G4(s)',
          num: '1',
          den: 's',
          expr: '1/s',
          rat: parseRatNumDen('1', 's'),
          dir: 'right',
          x: 780,
          y: 240
        },
        {
          id: 'h1_ex3',
          code: 'H1',
          type: 'block',
          subType: 'H',
          name: 'H1(s)',
          num: 's',
          den: '1',
          expr: 's',
          rat: parseRatNumDen('s', '1'),
          dir: 'left',
          x: 500,
          y: 440
        },
        { id: 'c_ex3', code: 'C1', type: 'output', name: 'C(s)', x: 920, y: 240 }
      ],
      connections: [
        { id: 'ce3_1', from: 'r_ex3', to: 's1_ex3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'ce3_2', from: 's1_ex3', to: 'g1_ex3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'ce3_3', from: 'g1_ex3', to: 'g2_ex3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'ce3_4', from: 'g2_ex3', to: 's2_ex3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'ce3_5', from: 's1_ex3', to: 'g3_ex3', fromPort: 'S', toPort: 'W', sign: '+' },
        { id: 'ce3_6', from: 'g3_ex3', to: 's2_ex3', fromPort: 'E', toPort: 'S', sign: '+' },
        { id: 'ce3_7', from: 's2_ex3', to: 'g4_ex3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'ce3_8', from: 'g4_ex3', to: 'c_ex3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'ce3_9', from: 's2_ex3', to: 's1_ex3', fromPort: 'N', toPort: 'N', sign: '-' },
        { id: 'ce3_10', from: 'g4_ex3', to: 'h1_ex3', fromPort: 'S', toPort: 'E', sign: '+' },
        { id: 'ce3_11', from: 'h1_ex3', to: 's1_ex3', fromPort: 'W', toPort: 'S', sign: '-' }
      ]
    }
  }
];
