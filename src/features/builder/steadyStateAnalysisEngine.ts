/**
 * Motor Matemático Modular para Análise de Regime Permanente e Erro Estacionário
 * (Etapas Didáticas, TVF, Estabilidade Routh-Hurwitz, Entradas Clássicas e Personalizadas)
 *
 * Em conformidade rigorosa com a metodologia didática e notação dos professores de Controle:
 * Ogata (Engenharia de Controle Moderno) e Norman Nise (Engenharia de Sistemas de Controle).
 */

import {
  Polynomial,
  polyNormalize,
  polyFromNumber,
  polyFromVar,
  polyAdd,
  polySub,
  polyMul,
  polyScale,
  polyEqual,
  polyIsZero,
  polyIsOne,
  polyToLatex,
  polyToCompact,
  isUnivariateInS,
  toUnivariateArr,
  trimUni
} from '@/core/algebra/polynomial';

import {
  RatFunc,
  ratSimplify,
  ratFromPoly,
  ratOne,
  ratZero,
  ratIsZero,
  ratIsOne,
  ratScale,
  ratAdd,
  ratSub,
  ratMul,
  ratDiv,
  ratToLatex
} from '@/core/algebra/rational';

import { parseRatExpr } from '@/core/algebra/parser';
import { checkRouthHurwitz, analyzeTransferFunction, StabilityReport } from '@/core/analysis/stability';

// =============================================================================
// TIPOS E INTERFACES DE DADOS
// =============================================================================

export type StandardSignalType = 'step' | 'ramp' | 'parabola' | 'custom';
export type CustomSignalDomain = 'time' | 'laplace';

export interface SteadyStateInputConfig {
  type: StandardSignalType;
  amplitude: number; // A (ex: 5, 2)
  customExpr: string; // Ex: "5*t^2", "3*t + 2", "5*e^(-2t)", "2*sin(3*t)", ou "10/s^3"
  customDomain: CustomSignalDomain;
}

export interface DidacticStep {
  stepNumber: number;
  title: string;
  description: string;
  latex: string;
  notes?: string;
}

export interface SteadyStateTableEntry {
  inputName: string;
  inputTimeLatex: string;
  inputLaplaceLatex: string;
  systemTypeDesc: string;
  essLatex: string;
  status: 'zero' | 'finite' | 'infinite' | 'unstable' | 'inconclusive';
  interpretation: string;
}

export interface SourceSteadyStateAnalysis {
  sourceId: string;
  sourceName: string;
  sourceSymbol: string;
  transferFunction: RatFunc; // C(s) / X(s)
  transferFunctionLatex: string;
  errorTransferFunction: RatFunc; // E(s) / X(s)
  errorTransferFunctionLatex: string;
  inputLaplace: RatFunc;
  inputLaplaceLatex: string;
  errorSignal: RatFunc; // E(s)
  errorSignalLatex: string;
  sTimesError: RatFunc; // s * E(s)
  sTimesErrorLatex: string;
  essValue: number | null;
  essLatex: string;
  classification: 'zero' | 'finite' | 'infinite' | 'unstable' | 'inconclusive';
  isApplicable: boolean;
  validityReason: string;
  interpretation: string;
}

export interface SteadyStateComprehensiveReport {
  isFullyCalculated: boolean;
  openLoopTf: RatFunc | null; // G_ma(s) = G(s)*H(s)
  openLoopTfLatex: string;
  systemType: number | null; // 0, 1, 2, ...
  systemTypeJustification: string;
  kpLatex: string;
  kvLatex: string;
  kaLatex: string;
  kpValue: number | null;
  kvValue: number | null;
  kaValue: number | null;

  referenceConfig: SteadyStateInputConfig;
  referenceTimeLatex: string;
  referenceLaplaceLatex: string;
  referenceLaplaceRat: RatFunc;

  closedLoopTf: RatFunc; // T(s) = C(s)/R(s)
  closedLoopTfLatex: string;
  errorTf: RatFunc; // E(s)/R(s)
  errorTfLatex: string;
  errorSignal: RatFunc; // E(s)
  errorSignalLatex: string;
  sTimesError: RatFunc; // s*E(s)
  sTimesErrorLatex: string;
  tvfLimitLatex: string;

  essValue: number | null;
  essLatex: string;
  essClassification: 'zero' | 'finite' | 'infinite' | 'unstable' | 'inconclusive';

  isTvfApplicable: boolean;
  tvfValidityReason: string;
  stabilityReport?: StabilityReport;

  didacticSteps: DidacticStep[];
  comparisonTable: SteadyStateTableEntry[];

  disturbanceAnalysis: SourceSteadyStateAnalysis | null;
  noiseAnalysis: SourceSteadyStateAnalysis | null;

  superpositionTotalEssLatex: string;
  pedagogicalInterpretation: string[];
  scilabSnippet: string;
}

// =============================================================================
// PARSER SEGURO PARA ENTRADAS TEMPORAIS r(t) E LAPLACE R(s)
// =============================================================================

export interface ParsedSignalResult {
  rat: RatFunc;
  timeLatex: string;
  laplaceLatex: string;
  isRecognized: boolean;
  errorMessage?: string;
}

/**
 * Converte expressão temporal r(t) em transformada de Laplace R(s) de maneira
 * estritamente algébrica e segura, sem eval() ou scripts dinâmicos.
 *
 * Suporta:
 * - Constantes / degraus: A => A/s
 * - Polinômios em t: c1*t + c0 => c1/s^2 + c0/s
 * - Potências: c*t^2 => 2*c/s^3, c*t^n => c*n!/s^(n+1)
 * - Exponenciais: c*e^(-a*t) ou c*exp(-a*t) => c/(s + a)
 * - Senos: c*sin(w*t) => (c*w)/(s^2 + w^2)
 * - Cossenos: c*cos(w*t) => (c*s)/(s^2 + w^2)
 * - Combinações lineares das formas acima.
 */
export function parseTimeDomainSignal(expr: string, defaultAmplitude: number = 1): ParsedSignalResult {
  const raw = expr.trim();
  if (!raw) {
    // Padrão: degrau de amplitude A
    const num = polyFromNumber(defaultAmplitude);
    const den = polyFromVar('s');
    return {
      rat: { num, den },
      timeLatex: `r(t) = ${defaultAmplitude} \\cdot u(t)`,
      laplaceLatex: `R(s) = \\frac{${defaultAmplitude}}{s}`,
      isRecognized: true
    };
  }

  // Limpeza de símbolos comuns
  let s = raw
    .replace(/\s+/g, '')
    .replace(/\\cdot/g, '*')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/u\(t\)/gi, '')
    .replace(/r\(t\)\s*=\s*/gi, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');

  if (s.endsWith('*')) s = s.slice(0, -1);
  if (!s) s = `${defaultAmplitude}`;

  // Caso 1: Apenas número constante A (ex: "5", "2.5")
  const numOnly = Number(s);
  if (!Number.isNaN(numOnly)) {
    return {
      rat: { num: polyFromNumber(numOnly), den: polyFromVar('s') },
      timeLatex: `r(t) = ${numOnly} \\cdot u(t)`,
      laplaceLatex: `R(s) = \\frac{${numOnly}}{s}`,
      isRecognized: true
    };
  }

  // Caso 2: Senoide c*sin(w*t)
  const sinMatch = s.match(/^([+-]?[0-9.]*)\*?sin\(([0-9.]*)\*?t\)$/i);
  if (sinMatch) {
    const ampStr = sinMatch[1];
    const wStr = sinMatch[2];
    const amp = ampStr === '' || ampStr === '+' ? 1 : ampStr === '-' ? -1 : parseFloat(ampStr) || 1;
    const w = wStr === '' ? 1 : parseFloat(wStr) || 1;
    const w2 = w * w;
    const numCoeff = amp * w;
    // num = numCoeff, den = s^2 + w2
    const num = polyFromNumber(numCoeff);
    const den = polyAdd(polyMul(polyFromVar('s'), polyFromVar('s')), polyFromNumber(w2));
    return {
      rat: { num, den },
      timeLatex: `r(t) = ${amp !== 1 ? amp : ''}\\sin(${w !== 1 ? w : ''}t)`,
      laplaceLatex: `R(s) = \\frac{${numCoeff}}{s^2 + ${w2}}`,
      isRecognized: true
    };
  }

  // Caso 3: Cossenoide c*cos(w*t)
  const cosMatch = s.match(/^([+-]?[0-9.]*)\*?cos\(([0-9.]*)\*?t\)$/i);
  if (cosMatch) {
    const ampStr = cosMatch[1];
    const wStr = cosMatch[2];
    const amp = ampStr === '' || ampStr === '+' ? 1 : ampStr === '-' ? -1 : parseFloat(ampStr) || 1;
    const w = wStr === '' ? 1 : parseFloat(wStr) || 1;
    const w2 = w * w;
    // num = amp * s, den = s^2 + w2
    const num = polyMul(polyFromNumber(amp), polyFromVar('s'));
    const den = polyAdd(polyMul(polyFromVar('s'), polyFromVar('s')), polyFromNumber(w2));
    return {
      rat: { num, den },
      timeLatex: `r(t) = ${amp !== 1 ? amp : ''}\\cos(${w !== 1 ? w : ''}t)`,
      laplaceLatex: `R(s) = \\frac{${amp !== 1 ? amp : ''}s}{s^2 + ${w2}}`,
      isRecognized: true
    };
  }

  // Caso 4: Exponencial c*exp(-a*t) ou c*e^(-a*t)
  const expMatch = s.match(/^([+-]?[0-9.]*)\*?(?:exp\(|e\^\(?)([+-]?[0-9.]*)\*?t\)?$/i);
  if (expMatch) {
    const ampStr = expMatch[1];
    const aStr = expMatch[2];
    const amp = ampStr === '' || ampStr === '+' ? 1 : ampStr === '-' ? -1 : parseFloat(ampStr) || 1;
    const alpha = aStr === '' || aStr === '+' ? 1 : aStr === '-' ? -1 : parseFloat(aStr) || 1;
    // e^(alpha * t) => 1 / (s - alpha). Ex: e^(-2t) => alpha = -2 => den = s - (-2) = s + 2
    const poleConst = -alpha;
    const num = polyFromNumber(amp);
    const den = polyAdd(polyFromVar('s'), polyFromNumber(poleConst));
    return {
      rat: { num, den },
      timeLatex: `r(t) = ${amp !== 1 ? amp : ''}e^{${alpha}t}`,
      laplaceLatex: `R(s) = \\frac{${amp}}{${polyToLatex(den)}}`,
      isRecognized: true
    };
  }

  // Caso 5: Polinômio em t (ex: 5*t^2, 3*t + 2, 4*t^2 + 2*t, 2*t + 5, t^3)
  // Dividir em monômios por '+' ou '-'
  const monoRegex = /([+-]?[^+-]+)/g;
  const terms = s.match(monoRegex);
  if (terms && terms.length > 0) {
    let accumulatedRat = ratZero();
    let validPoly = true;

    for (const term of terms) {
      const cleanTerm = term.trim();
      if (!cleanTerm) continue;

      // c * t^power
      const pMatch = cleanTerm.match(/^([+-]?[0-9.]*)\*?t(?:\^([0-9]+))?$/i);
      if (pMatch) {
        const cStr = pMatch[1];
        const pStr = pMatch[2];
        const coeff = cStr === '' || cStr === '+' ? 1 : cStr === '-' ? -1 : parseFloat(cStr);
        const power = pStr ? parseInt(pStr, 10) : 1;
        if (Number.isNaN(coeff) || Number.isNaN(power) || power < 0) {
          validPoly = false;
          break;
        }
        // L{t^n} = n! / s^(n+1)
        let fact = 1;
        for (let k = 2; k <= power; k++) fact *= k;
        const laplaceNum = coeff * fact;
        const laplacePower = power + 1;

        // Construir s^(power + 1)
        const denPoly: Polynomial = [{ coeff: 1, vars: { s: laplacePower } }];
        const numPoly = polyFromNumber(laplaceNum);
        accumulatedRat = ratAdd(accumulatedRat, { num: numPoly, den: denPoly });
        continue;
      }

      // Constante pura no polinômio (ex: "+ 2", "- 5")
      const cOnly = Number(cleanTerm);
      if (!Number.isNaN(cOnly)) {
        accumulatedRat = ratAdd(accumulatedRat, {
          num: polyFromNumber(cOnly),
          den: polyFromVar('s')
        });
        continue;
      }

      validPoly = false;
      break;
    }

    if (validPoly && !ratIsZero(accumulatedRat)) {
      const lat = ratToLatex(accumulatedRat);
      return {
        rat: accumulatedRat,
        timeLatex: `r(t) = ${raw}`,
        laplaceLatex: `R(s) = ${lat}`,
        isRecognized: true
      };
    }
  }

  // Se não foi reconhecida como forma temporal elementar:
  return {
    rat: ratOne(),
    timeLatex: `r(t) = ${raw}`,
    laplaceLatex: '\\text{Transformada não reconhecida}',
    isRecognized: false,
    errorMessage: `A expressão temporal "${raw}" não pôde ser convertida analiticamente para o domínio de Laplace. Formatos suportados: polinômios em t (ex: 5*t^2, 3t+2), exponenciais (ex: 5*e^(-2t)), senoides (ex: 2*sin(3t), cos(4t)) ou insira diretamente R(s).`
  };
}

/**
 * Converte expressão no domínio de Laplace informada diretamente pelo usuário
 */
export function parseLaplaceDomainSignal(expr: string): ParsedSignalResult {
  const raw = expr.trim();
  if (!raw) {
    return {
      rat: { num: polyFromNumber(1), den: polyFromVar('s') },
      timeLatex: 'r(t) = 1 \\cdot u(t)',
      laplaceLatex: 'R(s) = \\frac{1}{s}',
      isRecognized: true
    };
  }

  try {
    const rat = parseRatExpr(raw);
    const lat = ratToLatex(rat);
    return {
      rat,
      timeLatex: '\\mathcal{L}^{-1}\\{R(s)\\}',
      laplaceLatex: `R(s) = ${lat}`,
      isRecognized: true
    };
  } catch (err) {
    return {
      rat: ratOne(),
      timeLatex: '\\text{Indefinido}',
      laplaceLatex: '\\text{Expressão R(s) inválida}',
      isRecognized: false,
      errorMessage: `Erro ao interpretar a expressão R(s) "${raw}". Verifique a sintaxe (ex: 10/s^3 ou 2/(s+3)).`
    };
  }
}

// =============================================================================
// CÁLCULO E CLASSIFICAÇÃO DO ERRO ESTACIONÁRIO E TIPO DO SISTEMA
// =============================================================================

/**
 * Encontra a menor potência de 's' com coeficiente não nulo em um polinômio
 */
export function findLowestPowerOfS(P: Polynomial): number {
  const norm = polyNormalize(P);
  if (polyIsZero(norm)) return 0;
  let minPower = Infinity;
  for (const t of norm) {
    const p = t.vars.s || 0;
    if (p < minPower) minPower = p;
  }
  return minPower === Infinity ? 0 : minPower;
}

/**
 * Identifica o tipo do sistema a partir da função de transferência de malha aberta G_ma(s) = N(s)/D(s).
 * Tipo N = quantidade de integradores puros (polos em s=0) após cancelamentos válidos.
 */
export function identifySystemType(openLoopTf: RatFunc): {
  systemType: number;
  justification: string;
} {
  const norm = ratSimplify(openLoopTf.num, openLoopTf.den);
  if (polyIsZero(norm.num)) {
    return {
      systemType: 0,
      justification: 'A malha aberta é identicamente nula, correspondendo a um sistema de Tipo 0.'
    };
  }

  const pDen = findLowestPowerOfS(norm.den);
  const pNum = findLowestPowerOfS(norm.num);
  const type = Math.max(0, pDen - pNum);

  let justification = '';
  if (type === 0) {
    justification =
      'O denominador de malha aberta não possui polo na origem (termo constante não-nulo para s=0), configurando um Sistema de Tipo 0.';
  } else if (type === 1) {
    justification =
      'O denominador de malha aberta possui 1 polo puro na origem (termo s¹ em evidência), configurando um Sistema de Tipo 1 (possui um integrador puro).';
  } else if (type === 2) {
    justification =
      'O denominador de malha aberta possui 2 polos puros na origem (termo s² em evidência), configurando um Sistema de Tipo 2 (possui duplo integrador).';
  } else {
    justification = `O denominador de malha aberta possui ${type} polos puros na origem (termo s^${type} em evidência), configurando um Sistema de Tipo ${type}.`;
  }

  return { systemType: type, justification };
}

/**
 * Calcula os coeficientes de erro estático Kp, Kv, Ka a partir de G_ma(s)
 */
export function computeStaticErrorConstants(
  openLoopTf: RatFunc,
  sysType: number
): {
  kpValue: number | null;
  kpLatex: string;
  kvValue: number | null;
  kvLatex: string;
  kaValue: number | null;
  kaLatex: string;
} {
  // G_ma(s) = N(s) / D(s)
  const norm = ratSimplify(openLoopTf.num, openLoopTf.den);

  // Kp = lim s->0 G_ma(s)
  let kpValue: number | null = null;
  let kpLatex = '';
  if (sysType === 0) {
    const num0 = evaluatePolyAtZero(norm.num);
    const den0 = evaluatePolyAtZero(norm.den);
    if (den0 !== 0) {
      kpValue = num0 / den0;
      kpLatex = formatNumberOrFraction(kpValue);
    } else {
      kpLatex = '\\infty';
    }
  } else {
    kpValue = null;
    kpLatex = '\\infty';
  }

  // Kv = lim s->0 s * G_ma(s)
  let kvValue: number | null = null;
  let kvLatex = '';
  if (sysType === 0) {
    kvValue = 0;
    kvLatex = '0';
  } else if (sysType === 1) {
    // Fatorar um 's' do denominador
    const denDividedByS = dividePolyByS(norm.den, 1);
    const num0 = evaluatePolyAtZero(norm.num);
    const den0 = evaluatePolyAtZero(denDividedByS);
    if (den0 !== 0) {
      kvValue = num0 / den0;
      kvLatex = formatNumberOrFraction(kvValue);
    } else {
      kvLatex = '\\infty';
    }
  } else {
    kvValue = null;
    kvLatex = '\\infty';
  }

  // Ka = lim s->0 s^2 * G_ma(s)
  let kaValue: number | null = null;
  let kaLatex = '';
  if (sysType < 2) {
    kaValue = 0;
    kaLatex = '0';
  } else if (sysType === 2) {
    const denDividedByS2 = dividePolyByS(norm.den, 2);
    const num0 = evaluatePolyAtZero(norm.num);
    const den0 = evaluatePolyAtZero(denDividedByS2);
    if (den0 !== 0) {
      kaValue = num0 / den0;
      kaLatex = formatNumberOrFraction(kaValue);
    } else {
      kaLatex = '\\infty';
    }
  } else {
    kaValue = null;
    kaLatex = '\\infty';
  }

  return { kpValue, kpLatex, kvValue, kvLatex, kaValue, kaLatex };
}

function evaluatePolyAtZero(P: Polynomial): number {
  const norm = polyNormalize(P);
  const constTerm = norm.find(t => !t.vars.s || t.vars.s === 0);
  return constTerm ? constTerm.coeff : 0;
}

function dividePolyByS(P: Polynomial, power: number): Polynomial {
  const norm = polyNormalize(P);
  return norm.map(t => {
    const currentPow = t.vars.s || 0;
    const newPow = Math.max(0, currentPow - power);
    const nv = { ...t.vars };
    if (newPow === 0) delete nv.s;
    else nv.s = newPow;
    return { coeff: t.coeff, vars: nv };
  });
}

function formatNumberOrFraction(val: number): string {
  if (Math.abs(val - Math.round(val)) < 1e-6) {
    return `${Math.round(val)}`;
  }
  return val.toFixed(4).replace(/\.?0+$/, '');
}

/**
 * Avalia o Teorema do Valor Final:
 * e_ss = lim_{s -> 0} s * E(s)
 *
 * Realiza rigorosamente:
 * 1. Cancelamento exato de potências de 's' comuns entre numerador e denominador de s*E(s)
 * 2. Análise do comportamento no limite s -> 0
 * 3. Verificação de estabilidade dos polos de malha fechada
 */
export function evaluateFinalValueTheorem(
  errorSignal: RatFunc,
  closedLoopTf: RatFunc
): {
  sTimesError: RatFunc;
  sTimesErrorLatex: string;
  limitLatex: string;
  essValue: number | null;
  essLatex: string;
  classification: 'zero' | 'finite' | 'infinite' | 'unstable' | 'inconclusive';
  isApplicable: boolean;
  validityReason: string;
} {
  // s * E(s)
  const sPoly = polyFromVar('s');
  const rawSTimesError: RatFunc = {
    num: polyMul(sPoly, errorSignal.num),
    den: errorSignal.den
  };

  // Simplificação com cancelamento de raízes
  const sTimesError = ratSimplify(rawSTimesError.num, rawSTimesError.den);
  const sTimesErrorLatex = ratToLatex(sTimesError);

  // Verificação de estabilidade do sistema em malha fechada
  let isApplicable = true;
  let validityReason =
    'Condições de validade do Teorema do Valor Final plenamente satisfeitas: os polos em malha fechada situam-se no semiplano esquerdo (LHP).';

  if (isUnivariateInS(closedLoopTf.den)) {
    const uD = trimUni(toUnivariateArr(closedLoopTf.den));
    const coeffsDesc = [...uD].reverse();
    const routh = checkRouthHurwitz(coeffsDesc);
    const stab = analyzeTransferFunction(closedLoopTf);
    const hasUnstablePole = stab.poles.some(p => p.re > 1e-5);
    const hasImagAxisPole = stab.poles.some(p => Math.abs(p.re) <= 1e-5);

    if (hasUnstablePole || !routh.isStable) {
      isApplicable = false;
      validityReason =
        'O Teorema do Valor Final NÃO é aplicável: o sistema em malha fechada é instável (possui polos com parte real positiva), de modo que a resposta temporal diverge e não atinge regime estacionário.';
      return {
        sTimesError,
        sTimesErrorLatex,
        limitLatex: '\\text{Não aplicável (sistema instável)}',
        essValue: null,
        essLatex: '\\text{Inaplicável (instável)}',
        classification: 'unstable',
        isApplicable,
        validityReason
      };
    } else if (hasImagAxisPole) {
      isApplicable = false;
      validityReason =
        'O Teorema do Valor Final NÃO é aplicável diretamente: o sistema possui polos puramente imaginários (s = ±jω), produzindo oscilação permanente sustentada sem limite assintótico constante.';
      return {
        sTimesError,
        sTimesErrorLatex,
        limitLatex: '\\text{Não aplicável (resposta oscilatória)}',
        essValue: null,
        essLatex: '\\text{Limite Inexistente}',
        classification: 'inconclusive',
        isApplicable,
        validityReason
      };
    }
  }

  // Se o numerador de s*E(s) for identicamente zero
  if (polyIsZero(sTimesError.num)) {
    return {
      sTimesError,
      sTimesErrorLatex,
      limitLatex: '\\lim_{s \\to 0} s E(s) = 0',
      essValue: 0,
      essLatex: 'e_{ss} = 0',
      classification: 'zero',
      isApplicable,
      validityReason
    };
  }

  // Avaliação no limite s -> 0
  const pNum = findLowestPowerOfS(sTimesError.num);
  const pDen = findLowestPowerOfS(sTimesError.den);

  if (pNum > pDen) {
    // Numerador possui potência maior de s que se anula no numerador => limite é 0
    return {
      sTimesError,
      sTimesErrorLatex,
      limitLatex: '\\lim_{s \\to 0} s E(s) = 0',
      essValue: 0,
      essLatex: 'e_{ss} = 0',
      classification: 'zero',
      isApplicable,
      validityReason
    };
  }

  if (pDen > pNum) {
    // Denominador possui polo remanescente em s=0 => limite vai a infinito!
    const diff = pDen - pNum;
    return {
      sTimesError,
      sTimesErrorLatex,
      limitLatex: `\\lim_{s \\to 0} s E(s) = \\lim_{s \\to 0} \\frac{N_0}{s^{${diff}} D_0} = \\infty`,
      essValue: null,
      essLatex: 'e_{ss} = \\infty',
      classification: 'infinite',
      isApplicable,
      validityReason
    };
  }

  // pNum === pDen (geralmente ambos 0 após fatoração de s)
  // Avaliar termos constantes
  const n0 = evaluatePolyAtZero(sTimesError.num);
  const d0 = evaluatePolyAtZero(sTimesError.den);

  if (d0 === 0) {
    return {
      sTimesError,
      sTimesErrorLatex,
      limitLatex: '\\lim_{s \\to 0} s E(s) = \\infty',
      essValue: null,
      essLatex: 'e_{ss} = \\infty',
      classification: 'infinite',
      isApplicable,
      validityReason
    };
  }

  const val = n0 / d0;
  const valFormatted = formatNumberOrFraction(val);

  return {
    sTimesError,
    sTimesErrorLatex,
    limitLatex: `\\lim_{s \\to 0} s E(s) = \\frac{${formatNumberOrFraction(n0)}}{${formatNumberOrFraction(d0)}} = ${valFormatted}`,
    essValue: val,
    essLatex: `e_{ss} = ${valFormatted}`,
    classification: 'finite',
    isApplicable,
    validityReason
  };
}

// =============================================================================
// GERADOR DO RELATÓRIO DIDÁTICO INTEGRAL E COMPARAÇÃO ENTRE ENTRADAS
// =============================================================================

/**
 * Constrói a tabela comparativa entre Degrau, Rampa, Parábola e Personalizada
 */
export function buildComparisonTable(
  sysType: number,
  kpLatex: string,
  kvLatex: string,
  kaLatex: string,
  amplitudeA: number,
  customEntry?: {
    name: string;
    timeLat: string;
    laplaceLat: string;
    essLat: string;
    status: 'zero' | 'finite' | 'infinite' | 'unstable' | 'inconclusive';
  }
): SteadyStateTableEntry[] {
  const table: SteadyStateTableEntry[] = [];
  const aStr = amplitudeA === 1 ? '1' : `${amplitudeA}`;

  // 1. Degrau
  let stepEss = '';
  let stepStatus: 'zero' | 'finite' | 'infinite' = 'zero';
  let stepInterp = '';
  if (sysType === 0) {
    stepEss = `\\frac{${aStr}}{1 + K_p} = \\frac{${aStr}}{1 + ${kpLatex}}`;
    stepStatus = 'finite';
    stepInterp = 'Erro constante não-nulo (sistema Tipo 0 acompanha o degrau com offset).';
  } else {
    stepEss = '0';
    stepStatus = 'zero';
    stepInterp = `Erro estacionário nulo (o integrador puro do sistema Tipo ${sysType} anula completamente o erro ao degrau).`;
  }
  table.push({
    inputName: 'Degrau Unitário / Padrão',
    inputTimeLatex: `r(t) = ${aStr} \\cdot u(t)`,
    inputLaplaceLatex: `R(s) = \\frac{${aStr}}{s}`,
    systemTypeDesc: `Tipo ${sysType}`,
    essLatex: stepEss,
    status: stepStatus,
    interpretation: stepInterp
  });

  // 2. Rampa
  let rampEss = '';
  let rampStatus: 'zero' | 'finite' | 'infinite' = 'infinite';
  let rampInterp = '';
  if (sysType === 0) {
    rampEss = '\\infty';
    rampStatus = 'infinite';
    rampInterp = 'Erro infinito (sistema Tipo 0 não tem integradores suficientes para acompanhar rampa de velocidade).';
  } else if (sysType === 1) {
    rampEss = `\\frac{${aStr}}{K_v} = \\frac{${aStr}}{${kvLatex}}`;
    rampStatus = 'finite';
    rampInterp = 'Erro constante finito (sistema Tipo 1 segue a rampa com atraso de posição constante).';
  } else {
    rampEss = '0';
    rampStatus = 'zero';
    rampInterp = `Erro nulo (sistemas Tipo ${sysType} possuem integradores múltiplos e anulam o erro à rampa).`;
  }
  table.push({
    inputName: 'Rampa de Velocidade',
    inputTimeLatex: `r(t) = ${aStr}t \\cdot u(t)`,
    inputLaplaceLatex: `R(s) = \\frac{${aStr}}{s^2}`,
    systemTypeDesc: `Tipo ${sysType}`,
    essLatex: rampEss,
    status: rampStatus,
    interpretation: rampInterp
  });

  // 3. Parábola de Aceleração
  let parabEss = '';
  let parabStatus: 'zero' | 'finite' | 'infinite' = 'infinite';
  let parabInterp = '';
  if (sysType < 2) {
    parabEss = '\\infty';
    parabStatus = 'infinite';
    parabInterp = `Erro infinito (sistema Tipo ${sysType} diverge ao tentar acompanhar aceleração contínua).`;
  } else if (sysType === 2) {
    parabEss = `\\frac{2 \\cdot ${aStr}}{K_a} = \\frac{${2 * amplitudeA}}{${kaLatex}}`;
    parabStatus = 'finite';
    parabInterp = 'Erro constante finito (sistema Tipo 2 acompanha parábola com defasagem constante).';
  } else {
    parabEss = '0';
    parabStatus = 'zero';
    parabInterp = 'Erro nulo (sistema Tipo 3+ anula o erro de aceleração).';
  }
  table.push({
    inputName: 'Parábola de Aceleração',
    inputTimeLatex: `r(t) = ${aStr}t^2 \\cdot u(t)`,
    inputLaplaceLatex: `R(s) = \\frac{${2 * amplitudeA}}{s^3}`,
    systemTypeDesc: `Tipo ${sysType}`,
    essLatex: parabEss,
    status: parabStatus,
    interpretation: parabInterp
  });

  // 4. Entrada Personalizada (se fornecida)
  if (customEntry) {
    table.push({
      inputName: `Personalizada: ${customEntry.name}`,
      inputTimeLatex: customEntry.timeLat,
      inputLaplaceLatex: customEntry.laplaceLat,
      systemTypeDesc: `Tipo ${sysType}`,
      essLatex: customEntry.essLat,
      status: customEntry.status,
      interpretation: 'Resultado obtido via aplicação direta do Teorema do Valor Final.'
    });
  }

  return table;
}

/**
 * Gera script Scilab complementar de validação do erro estacionário
 */
export function generateSteadyStateScilabSnippet(
  closedLoopTf: RatFunc,
  errorTf: RatFunc,
  inputConfig: SteadyStateInputConfig,
  essResultLatex: string
): string {
  if (!isUnivariateInS(closedLoopTf.num) || !isUnivariateInS(closedLoopTf.den)) {
    return '// Circuito simbólico: defina os parâmetros numéricos no script principal para simulação numérica de regime permanente.';
  }

  const uNumT = trimUni(toUnivariateArr(closedLoopTf.num));
  const uDenT = trimUni(toUnivariateArr(closedLoopTf.den));
  const uNumE = trimUni(toUnivariateArr(errorTf.num));
  const uDenE = trimUni(toUnivariateArr(errorTf.den));

  const numTStr = `[${uNumT.join(', ')}]`;
  const denTStr = `[${uDenT.join(', ')}]`;
  const numEStr = `[${uNumE.join(', ')}]`;
  const denEStr = `[${uDenE.join(', ')}]`;

  const amp = inputConfig.amplitude;
  let signalDef = `// Entrada degrau r(t) = ${amp}\nt = 0:0.01:25;\nr_t = ${amp} * ones(t);\nR_s = ${amp}/s;`;
  let csimCall = `c_t = csim('step', t, T_mf) * ${amp};`;

  if (inputConfig.type === 'ramp') {
    signalDef = `// Entrada rampa r(t) = ${amp}*t\nt = 0:0.01:25;\nr_t = ${amp} * t;\nR_s = ${amp}/(s^2);`;
    csimCall = `// Simulação para entrada rampa via syslin\nc_t = csim(r_t, t, T_mf);`;
  } else if (inputConfig.type === 'parabola') {
    signalDef = `// Entrada parabólica r(t) = ${amp}*t^2\nt = 0:0.01:25;\nr_t = ${amp} * (t.^2);\nR_s = ${2 * amp}/(s^3);`;
    csimCall = `// Simulação para entrada parabólica\nc_t = csim(r_t, t, T_mf);`;
  }

  return `// =========================================================================
// SCRIPT COMPLEMENTAR SCILAB — ANÁLISE DE REGIME PERMANENTE E ERRO ESTACIONÁRIO
// Compatível com Scilab 6.x / 2024.x
// =========================================================================

s = poly(0, 's');

// 1. Definição das Funções de Transferência
num_T = poly(${numTStr}, 's', 'coeff');
den_T = poly(${denTStr}, 's', 'coeff');
T_mf = syslin('c', num_T, den_T);

num_E = poly(${numEStr}, 's', 'coeff');
den_E = poly(${denEStr}, 's', 'coeff');
E_over_R = syslin('c', num_E, den_E);

// 2. Sinal de Entrada
${signalDef}

// 3. Resposta Temporal e Cálculo Numérico do Erro
${csimCall}
e_t = r_t - c_t;

// Valor em regime permanente numérico (t -> fim da simulação)
e_ss_num = e_t($);
disp("=== RESULTADOS DA ANÁLISE DE REGIME PERMANENTE ===");
disp("Erro estacionário calculado no Scilab (t_final):", e_ss_num);
disp("Valor analítico esperado via Teorema do Valor Final: ${essResultLatex}");

// 4. Gráfico Comparativo: Entrada r(t), Saída c(t) e Erro e(t)
figure('BackgroundColor', [1 1 1]);
subplot(2, 1, 1);
plot(t, r_t, 'r--', 'LineWidth', 2);
plot(t, c_t, 'b-', 'LineWidth', 2);
legend(["Referência r(t)", "Saída c(t)"], 4);
xtitle("Acompanhamento de Referência no Tempo", "Tempo (s)", "Amplitude");
xgrid(color('gray'));

subplot(2, 1, 2);
plot(t, e_t, 'm-', 'LineWidth', 2);
legend(["Erro e(t) = r(t) - c(t)"], 1);
xtitle("Evolução do Erro de Rastreamento", "Tempo (s)", "Erro e(t)");
xgrid(color('gray'));
`;
}

/**
 * Função mestre que executa a análise integral de Regime Permanente e Erro Estacionário.
 * Respeita estritamente:
 * - Se feedback for unitário: E(s)/R(s) = 1 / (1 + G(s)) = 1 - T(s)
 * - Se feedback for não-unitário: utiliza o nó do somador e blocos sensores H(s)
 * - Aplica TVF passo a passo com verificação de estabilidade
 * - Processa perturbação D(s) e ruído N(s) por superposição
 */
export function analyzeSteadyStateAndError(
  closedLoopTf: RatFunc,
  openLoopTfCandidate: RatFunc | null,
  errorTfCandidate: RatFunc | null,
  inputConfig: SteadyStateInputConfig,
  disturbancePair?: { tf: RatFunc; name: string } | null,
  noisePair?: { tf: RatFunc; name: string } | null
): SteadyStateComprehensiveReport {
  // 1. Determinação da Relação Erro/Referência E(s)/R(s)
  // Se fornecido candidato do somador ou realimentação, usamos; senão, erro unitário clássico E/R = 1 - T
  const errorTf = errorTfCandidate
    ? ratSimplify(errorTfCandidate.num, errorTfCandidate.den)
    : ratSimplify(polySub(closedLoopTf.den, closedLoopTf.num), closedLoopTf.den);

  const errorTfLatex = ratToLatex(errorTf);
  const closedLoopTfLatex = ratToLatex(closedLoopTf);

  // 2. Determinação de Malha Aberta G_ma(s) = G(s)*H(s)
  // Em malha unitária: G_ma = T / (1 - T) = T.num / (T.den - T.num)
  let openLoopTf: RatFunc;
  if (openLoopTfCandidate && !ratIsZero(openLoopTfCandidate)) {
    openLoopTf = ratSimplify(openLoopTfCandidate.num, openLoopTfCandidate.den);
  } else {
    const diffDen = polySub(closedLoopTf.den, closedLoopTf.num);
    openLoopTf = ratSimplify(closedLoopTf.num, diffDen);
  }
  const openLoopTfLatex = ratToLatex(openLoopTf);

  // 3. Identificação do Tipo do Sistema
  const { systemType, justification: systemTypeJustification } = identifySystemType(openLoopTf);

  // 4. Coeficientes Estáticos de Erro
  const { kpValue, kpLatex, kvValue, kvLatex, kaValue, kaLatex } = computeStaticErrorConstants(
    openLoopTf,
    systemType
  );

  // 5. Determinação do Sinal de Entrada R(s)
  let refSignal: ParsedSignalResult;
  const A = inputConfig.amplitude || 1;

  if (inputConfig.type === 'step') {
    refSignal = {
      rat: { num: polyFromNumber(A), den: polyFromVar('s') },
      timeLatex: `r(t) = ${A} \\cdot u(t)`,
      laplaceLatex: `R(s) = \\frac{${A}}{s}`,
      isRecognized: true
    };
  } else if (inputConfig.type === 'ramp') {
    const s2Poly: Polynomial = [{ coeff: 1, vars: { s: 2 } }];
    refSignal = {
      rat: { num: polyFromNumber(A), den: s2Poly },
      timeLatex: `r(t) = ${A}t \\cdot u(t)`,
      laplaceLatex: `R(s) = \\frac{${A}}{s^2}`,
      isRecognized: true
    };
  } else if (inputConfig.type === 'parabola') {
    // Conforme enunciado do usuário: r(t) = A*t^2 => R(s) = (2*A)/s^3
    const s3Poly: Polynomial = [{ coeff: 1, vars: { s: 3 } }];
    refSignal = {
      rat: { num: polyFromNumber(2 * A), den: s3Poly },
      timeLatex: `r(t) = ${A}t^2 \\cdot u(t)`,
      laplaceLatex: `R(s) = \\frac{${2 * A}}{s^3}`,
      isRecognized: true
    };
  } else {
    // Personalizada
    if (inputConfig.customDomain === 'laplace') {
      refSignal = parseLaplaceDomainSignal(inputConfig.customExpr);
    } else {
      refSignal = parseTimeDomainSignal(inputConfig.customExpr, A);
    }
  }

  // 6. Expressão do Erro E(s) = [E(s)/R(s)] * R(s)
  const errorSignal = ratMul(errorTf, refSignal.rat);
  const errorSignalLatex = ratToLatex(errorSignal);

  // 7. Aplicação do Teorema do Valor Final: e_ss = lim s->0 s*E(s)
  const tvfResult = evaluateFinalValueTheorem(errorSignal, closedLoopTf);

  // 8. Construção das 10 Etapas Didáticas Detalhadas (Passo a Passo)
  const didacticSteps: DidacticStep[] = [
    {
      stepNumber: 1,
      title: 'Entrada Temporal Fornecida r(t)',
      description: 'Definição da excitação de referência aplicada à malha:',
      latex: refSignal.timeLatex,
      notes: `Amplitude configurada pelo usuário: A = ${A}.`
    },
    {
      stepNumber: 2,
      title: 'Transformada de Laplace da Entrada R(s)',
      description: 'Conversão da entrada do domínio do tempo para o domínio da frequência complexa de Laplace:',
      latex: refSignal.laplaceLatex
    },
    {
      stepNumber: 3,
      title: 'Função de Transferência de Malha Fechada T(s) = C(s)/R(s)',
      description: 'Relação entrada-saída global obtida a partir da redução topológica do circuito:',
      latex: `T(s) = \\frac{C(s)}{R(s)} = ${closedLoopTfLatex}`
    },
    {
      stepNumber: 4,
      title: 'Função de Transferência do Erro E(s)/R(s)',
      description: 'Dedução da relação entre o sinal de erro e a referência com base na realimentação do diagrama:',
      latex: `\\frac{E(s)}{R(s)} = 1 - T(s) = ${errorTfLatex}`
    },
    {
      stepNumber: 5,
      title: 'Cálculo Algébrico do Sinal de Erro E(s)',
      description: 'Multiplicação da relação de transferência do erro pela transformada de Laplace da entrada, com simplificação de fatores comuns:',
      latex: `E(s) = \\left(\\frac{E(s)}{R(s)}\\right) \\cdot R(s) = \\left(${errorTfLatex}\\right) \\cdot \\left(${ratToLatex(refSignal.rat)}\\right) = ${errorSignalLatex}`
    },
    {
      stepNumber: 6,
      title: 'Aplicação do Teorema do Valor Final (TVF)',
      description: 'Formulação assintótica do erro em regime permanente para t tendendo ao infinito:',
      latex: 'e_{ss} = \\lim_{t \\to \\infty} e(t) = \\lim_{s \\to 0} s E(s)'
    },
    {
      stepNumber: 7,
      title: 'Substituição Algébrica do Termo s·E(s)',
      description: 'Multiplicação por s e cancelamento do termo de integração da transformada:',
      latex: `s E(s) = s \\cdot \\left(${errorSignalLatex}\\right) = ${tvfResult.sTimesErrorLatex}`
    },
    {
      stepNumber: 8,
      title: 'Simplificação Algébrica e Passagem ao Limite s -> 0',
      description: 'Aplicação do limite nos polinômios do numerador e denominador:',
      latex: tvfResult.limitLatex
    },
    {
      stepNumber: 9,
      title: 'Verificação Rigorosa das Condições de Validade (Estabilidade)',
      description: 'Inspeção da localização dos polos de malha fechada e aplicabilidade do TVF:',
      latex: `\\text{Condição de Estabilidade: } ${tvfResult.isApplicable ? '\\text{Atendida (Polos no semiplano esquerdo)}' : '\\text{VIOLADA}'}`,
      notes: tvfResult.validityReason
    },
    {
      stepNumber: 10,
      title: 'Resultado Final e Interpretação de Engenharia',
      description: 'Valor definitivo do erro estacionário e capacidade de rastreamento:',
      latex: `\\boxed{${tvfResult.essLatex}}`,
      notes:
        systemType !== null
          ? `O sistema possui Tipo ${systemType} (${systemTypeJustification}). Constantes de erro calculadas: K_p = ${kpLatex}, K_v = ${kvLatex}, K_a = ${kaLatex}.`
          : undefined
    }
  ];

  // 9. Tabela comparativa entre Degrau, Rampa, Parábola e Personalizada
  const customEntryForTable =
    inputConfig.type === 'custom'
      ? {
          name: inputConfig.customExpr || 'Personalizada',
          timeLat: refSignal.timeLatex,
          laplaceLat: refSignal.laplaceLatex,
          essLat: tvfResult.essLatex,
          status: tvfResult.classification
        }
      : undefined;

  const comparisonTable = buildComparisonTable(
    systemType,
    kpLatex,
    kvLatex,
    kaLatex,
    A,
    customEntryForTable
  );

  // 10. Análise de Perturbação D(s) (Superposição)
  let disturbanceAnalysis: SourceSteadyStateAnalysis | null = null;
  if (disturbancePair && !ratIsZero(disturbancePair.tf)) {
    const dStep = { num: polyFromNumber(1), den: polyFromVar('s') }; // Degrau unitário D(s) = 1/s
    // Erro devido à perturbação: e_D = -c_D => E_D(s) = -T_D(s)*D(s)
    const errDTf = ratScale(disturbancePair.tf, -1);
    const errDSig = ratMul(errDTf, dStep);
    const tvfD = evaluateFinalValueTheorem(errDSig, closedLoopTf);
    disturbanceAnalysis = {
      sourceId: 'dist-1',
      sourceName: disturbancePair.name || 'Perturbação D(s)',
      sourceSymbol: 'D(s)',
      transferFunction: disturbancePair.tf,
      transferFunctionLatex: ratToLatex(disturbancePair.tf),
      errorTransferFunction: errDTf,
      errorTransferFunctionLatex: ratToLatex(errDTf),
      inputLaplace: dStep,
      inputLaplaceLatex: 'D(s) = \\frac{1}{s}',
      errorSignal: errDSig,
      errorSignalLatex: ratToLatex(errDSig),
      sTimesError: tvfD.sTimesError,
      sTimesErrorLatex: tvfD.sTimesErrorLatex,
      essValue: tvfD.essValue,
      essLatex: tvfD.essLatex,
      classification: tvfD.classification,
      isApplicable: tvfD.isApplicable,
      validityReason: tvfD.validityReason,
      interpretation:
        tvfD.classification === 'zero'
          ? 'Rejeição total de perturbação em regime estacionário: integradores anteriores ao ponto de injeção anulam o impacto de D(s).'
          : 'A perturbação produz desvio estacionário constante na saída do sistema.'
    };
  }

  // 11. Análise de Ruído N(s) (Superposição)
  let noiseAnalysis: SourceSteadyStateAnalysis | null = null;
  if (noisePair && !ratIsZero(noisePair.tf)) {
    const nStep = { num: polyFromNumber(1), den: polyFromVar('s') }; // Ruído N(s) = 1/s
    const errNTf = ratScale(noisePair.tf, -1);
    const errNSig = ratMul(errNTf, nStep);
    const tvfN = evaluateFinalValueTheorem(errNSig, closedLoopTf);
    noiseAnalysis = {
      sourceId: 'noise-1',
      sourceName: noisePair.name || 'Ruído N(s)',
      sourceSymbol: 'N(s)',
      transferFunction: noisePair.tf,
      transferFunctionLatex: ratToLatex(noisePair.tf),
      errorTransferFunction: errNTf,
      errorTransferFunctionLatex: ratToLatex(errNTf),
      inputLaplace: nStep,
      inputLaplaceLatex: 'N(s) = \\frac{1}{s}',
      errorSignal: errNSig,
      errorSignalLatex: ratToLatex(errNSig),
      sTimesError: tvfN.sTimesError,
      sTimesErrorLatex: tvfN.sTimesErrorLatex,
      essValue: tvfN.essValue,
      essLatex: tvfN.essLatex,
      classification: tvfN.classification,
      isApplicable: tvfN.isApplicable,
      validityReason: tvfN.validityReason,
      interpretation:
        tvfN.classification === 'zero'
          ? 'O ruído de alta frequência/medição é completamente atenuado em baixa frequência (s=0).'
          : 'O ruído no sensor ou malha gera um erro de medição que se propaga para o regime estacionário.'
    };
  }

  // 12. Superposição Total
  let superpositionTotalEssLatex = `e_{ss, total} = ${tvfResult.essLatex.replace('e_{ss} = ', '')}`;
  if (disturbanceAnalysis && disturbanceAnalysis.essValue !== null) {
    const dVal = disturbanceAnalysis.essValue;
    superpositionTotalEssLatex += ` ${dVal >= 0 ? '+' : '-'} ${Math.abs(dVal)} \\text{ (efeito de D)}`;
  }
  if (noiseAnalysis && noiseAnalysis.essValue !== null) {
    const nVal = noiseAnalysis.essValue;
    superpositionTotalEssLatex += ` ${nVal >= 0 ? '+' : '-'} ${Math.abs(nVal)} \\text{ (efeito de N)}`;
  }

  // 13. Interpretação Didática de Engenharia
  const pedagogicalInterpretation: string[] = [
    `Classificação Topológica: O sistema foi identificado como Tipo ${systemType} com base nos polos de malha aberta G_ma(s) = G(s)H(s).`,
    `Capacidade de Rastreamento: ${
      systemType === 0
        ? 'Sistemas Tipo 0 rastreiam degraus com erro posicional finito proporcional a 1/(1+Kp), mas não conseguem acompanhar rampas ou parábolas.'
        : systemType === 1
        ? 'Sistemas Tipo 1 possuem 1 integrador puro na malha: anulam perfeitamente o erro ao degrau (e_ss = 0), seguem rampas com erro finito constante (e_ss = A/Kv) e acumulam erro infinito diante de parábolas.'
        : 'Sistemas Tipo 2+ possuem integradores múltiplos: anulam o erro ao degrau e à rampa, e conseguem acompanhar aceleração parabólica com erro finito.'
    }`,
    `Significado Físico do Erro: O erro estacionário e_ss representa a defasagem assintótica entre o comando desejado r(t) e a saída real c(t) quando todas as oscilações transitórias se extinguem.`
  ];

  // 14. Código Scilab Complementar
  const scilabSnippet = generateSteadyStateScilabSnippet(
    closedLoopTf,
    errorTf,
    inputConfig,
    tvfResult.essLatex
  );

  return {
    isFullyCalculated: true,
    openLoopTf,
    openLoopTfLatex,
    systemType,
    systemTypeJustification,
    kpLatex,
    kvLatex,
    kaLatex,
    kpValue,
    kvValue,
    kaValue,
    referenceConfig: inputConfig,
    referenceTimeLatex: refSignal.timeLatex,
    referenceLaplaceLatex: refSignal.laplaceLatex,
    referenceLaplaceRat: refSignal.rat,
    closedLoopTf,
    closedLoopTfLatex,
    errorTf,
    errorTfLatex,
    errorSignal,
    errorSignalLatex,
    sTimesError: tvfResult.sTimesError,
    sTimesErrorLatex: tvfResult.sTimesErrorLatex,
    tvfLimitLatex: tvfResult.limitLatex,
    essValue: tvfResult.essValue,
    essLatex: tvfResult.essLatex,
    essClassification: tvfResult.classification,
    isTvfApplicable: tvfResult.isApplicable,
    tvfValidityReason: tvfResult.validityReason,
    didacticSteps,
    comparisonTable,
    disturbanceAnalysis,
    noiseAnalysis,
    superpositionTotalEssLatex,
    pedagogicalInterpretation,
    scilabSnippet
  };
}
