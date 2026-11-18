/**
 * Base de Conhecimento, Teoria, Roteiros Padrão (Controle Clássico) e Exercícios Completos
 * dos 5 Controladores Principais: P, PI, PD, PID e Fase (Atraso / Avanço).
 *
 * Inclui simulador numérico RK4 para qualquer entrada (degrau, rampa, parábola, combinada)
 * comparando o sistema sem compensação vs. com o controlador projetado.
 */

import { parseRatExpr } from '@/core/algebra/parser';
import {
  isUnivariateInS,
  toUnivariateArr,
  trimUni,
  polyAdd,
  polyMul
} from '@/core/algebra/polynomial';
import { RatFunc, ratMul, ratSimplify } from '@/core/algebra/rational';

export type ControllerCategoryId = 'P' | 'PD' | 'PI' | 'Lead' | 'Lag';

export interface ProfessorMethodStep {
  step: string;
  title: string;
  description: string;
  formulaLatex: string;
}

export interface ControllerTheory {
  id: ControllerCategoryId;
  shortName: string;
  fullName: string;
  badgeColor: string;
  transferFunctionLatex: string;
  summary: string;
  transientEffect: string;
  steadyStateEffect: string;
  whenToChoose: string[];
  professorMethodTitle: string;
  professorMethodSteps: ProfessorMethodStep[];
}

export interface ExerciseStepDetail {
  title: string;
  description: string;
  latex: string;
  note?: string;
}

export interface ControllerExercise {
  id: string;
  controllerId: ControllerCategoryId;
  subType?: 'Lag' | 'Lead';
  badge: string;
  title: string;
  source: string;
  statementLatex: string;
  plantExpr: string;
  plantLatex: string;
  controllerExpr: string;
  controllerLatex: string;
  controllerBlockLabel: string;
  feedbackExpr?: string;
  feedbackLatex?: string;
  inputType: 'step' | 'ramp' | 'parabola' | 'combined';
  inputParams: {
    a0?: number;
    a1?: number;
    a2?: number;
    labelLatex: string;
  };
  tMax: number;
  whyThisController: string;
  diagnostics: {
    systemType: string;
    systemOrder: string;
    initialErrorLatex: string;
    finalErrorLatex: string;
  };
  detailedSteps: ExerciseStepDetail[];
  scilabCode: string;
}

// =============================================================================
// 1. TEORIA E ROTEIRO PADRÃO DO PROFESSOR PARA OS 5 CONTROLADORES
// =============================================================================

export const CONTROLLERS_THEORY: Record<ControllerCategoryId, ControllerTheory> = {
  P: {
    id: 'P',
    shortName: 'P',
    fullName: 'Controlador Proporcional (P)',
    badgeColor: '#0284c7',
    transferFunctionLatex: 'G_c(s) = K_p = K',
    summary:
      'Aplica um sinal de controle diretamente proporcional ao erro instantâneo e(t). É a estrutura mais simples e não adiciona polos nem zeros à função de transferência.',
    transientEffect:
      'Reduz o tempo de subida e acelera a resposta ao aumentar o ganho K, mas tende a aumentar o sobressinal (%OS) e pode levar o sistema à instabilidade se K for excessivo.',
    steadyStateEffect:
      'Não altera o Tipo do sistema. Reduz o erro finito permitido pelo Tipo atual (dividindo-o conforme o aumento de K), mas não zera erro que seja naturalmente finito.',
    whenToChoose: [
      'Quando o Tipo atual da planta já é suficiente para a entrada desejada (ex.: Tipo 0 com degrau, Tipo 1 com rampa, Tipo 2 com parábola).',
      'Quando se admite um erro estacionário finito (não nulo) ajustável pelo ganho K.',
      'Quando o aumento de ganho K não viola os requisitos de estabilidade ou sobressinal do transitório.'
    ],
    professorMethodTitle: 'Roteiro Padrão — Projeto do Controlador Proporcional (P)',
    professorMethodSteps: [
      {
        step: 'Passo 1',
        title: 'Diagnóstico do Tipo e Ordem da Planta',
        description:
          'Identificar a quantidade N de polos na origem (s^N isolado no denominador de G(s)) e a ordem do denominador expandido.',
        formulaLatex: 'G(s) = \\frac{N(s)}{s^N \\cdot D_1(s)} \\implies \\text{Tipo } N'
      },
      {
        step: 'Passo 2',
        title: 'Expressar a Constante de Erro Estático em Função de K',
        description:
          'Calcular Kp, Kv ou Ka multiplicando G(s) por Gc(s) = K e aplicando o limite para s → 0.',
        formulaLatex: 'K_p = \\lim_{s\\to 0} K G(s) \\quad|\\quad K_v = \\lim_{s\\to 0} s K G(s) \\quad|\\quad K_a = \\lim_{s\\to 0} s^2 K G(s)'
      },
      {
        step: 'Passo 3',
        title: 'Impor o Erro Estacionário Desejado ou Condição de Módulo no LGR',
        description:
          'Isolar o ganho K a partir da equação de ess (ou pela condição de módulo |K·G(sd)| = 1 para polos dominantes sd).',
        formulaLatex: 'e_{ss} = \\frac{A}{1+K_p} \\text{ ou } \\frac{A}{K_v} \\text{ ou } \\frac{A}{K_a} \\implies K'
      },
      {
        step: 'Passo 4',
        title: 'Verificar Estabilidade em Malha Fechada',
        description:
          'Conferir via Critério de Routh-Hurwitz se os polos em malha fechada permanecem no semiplano esquerdo (LHP) para o valor de K calculado.',
        formulaLatex: '1 + K G(s) = 0 \\implies \\text{Polos no LHP (Estável)}'
      }
    ]
  },

  PI: {
    id: 'PI',
    shortName: 'PI',
    fullName: 'Controlador Proporcional-Integral (PI)',
    badgeColor: '#059669',
    transferFunctionLatex: 'G_c(s) = K_p + \\frac{K_i}{s} = \\frac{K_p s + K_i}{s} = K_p \\frac{s + z_c}{s}',
    summary:
      'Combina a ação proporcional com um integrador puro (polo na origem s = 0) e um zero s = -zc. Eleva o Tipo do sistema em +1.',
    transientEffect:
      'Tende a deixar a resposta mais lenta e reduzir a margem de estabilidade se o zero zc ficar muito afastado da origem. Por isso, posiciona-se o zero bem próximo da origem (mais lento que os polos da planta) para preservar o transitório.',
    steadyStateEffect:
      'Ao adicionar 1 polo na origem (1/s), eleva o Tipo do sistema em +1: transforma erro finito em erro NULO, ou transforma erro infinito em erro FINITO.',
    whenToChoose: [
      'Quando se exige erro estacionário NULO onde a planta possui erro finito (ex.: planta Tipo 0 com entrada degrau).',
      'Quando o sistema atual diverge com erro infinito e precisa passar a acompanhar a entrada com erro finito (ex.: Tipo 0 com rampa → Tipo 1; Tipo 1 com parábola → Tipo 2).',
      'Quando um compensador Lag não resolve, pois o Lag não altera o Tipo do sistema.'
    ],
    professorMethodTitle: 'Roteiro Padrão — Projeto do Controlador PI (Mudança de Tipo e LGR)',
    professorMethodSteps: [
      {
        step: 'Passo 1',
        title: 'Avaliar a Necessidade de Mudança de Tipo',
        description:
          'Verificar se o Tipo atual da planta produz erro finito indesejado ou infinito. A introdução de Gc(s) = (Kp·s + Ki)/s adiciona um integrador (s = 0), elevando o Tipo para N + 1.',
        formulaLatex: 'G_c(s) G(s) = \\frac{K_p(s + z_c)}{s} \\cdot \\frac{N(s)}{s^N D_1(s)} \\implies \\text{Tipo } (N+1)'
      },
      {
        step: 'Passo 2',
        title: 'Calcular Ki (ou Ganho Estático) pelo Erro Requerido',
        description:
          'Aplicar o limite da nova constante de erro (Kv ou Ka) em s → 0 para determinar Ki diretamente.',
        formulaLatex: 'K_{\\text{nova}} = \\lim_{s\\to 0} s^{N+1} G_c(s)G(s) \\implies K_i'
      },
      {
        step: 'Passo 3',
        title: 'Posicionar o Zero zc Próximo à Origem (ou via LGR)',
        description:
          'Escolher Kp (ou zc = Ki/Kp) de modo que o zero fique bem mais próximo da origem que os polos dominantes da planta, evitando interferência negativa no transitório, ou ajustar no ponto sd pelo LGR.',
        formulaLatex: 'z_c = \\frac{K_i}{K_p} \\ll |s_{\\text{lenta}}| \\quad \\text{ou} \\quad |G_c(s_d)G(s_d)| = 1'
      }
    ]
  },

  PD: {
    id: 'PD',
    shortName: 'PD',
    fullName: 'Controlador Proporcional-Derivativo (PD)',
    badgeColor: '#d97706',
    transferFunctionLatex: 'G_c(s) = K_p + K_d s = K_d \\left(s + z_c\\right), \\quad z_c = \\frac{K_p}{K_d}',
    summary:
      'Adiciona um zero real s = -zc sem adicionar polos na origem. Atua com base na taxa de variação (derivada) do erro, antecipando correções.',
    transientEffect:
      'Adiciona avanço de fase positivo (+θz), puxando o Lugar Geométrico das Raízes (LGR) para a esquerda. Reduz drasticamente o sobressinal (%OS), diminui o tempo de acomodação Ts e aumenta o amortecimento.',
    steadyStateEffect:
      'Não altera o Tipo do sistema. Melhora levemente o erro apenas pelo aumento do ganho Kp = Kd·zc, mas seu foco principal é a correção do regime transitório.',
    whenToChoose: [
      'Quando o sistema é lento, oscilatório ou instável e precisa cumprir especificações severas de transitório (%OS e Ts).',
      'Quando o erro estacionário já é aceitável (ou o Tipo já atende à entrada), mas os polos dominantes desejados sd não pertencem ao LGR original.'
    ],
    professorMethodTitle: 'Roteiro Padrão — Projeto do Controlador PD via LGR (Lugar Geométrico das Raízes)',
    professorMethodSteps: [
      {
        step: 'Passo 1',
        title: 'Determinar os Polos Dominantes Desejados (sd)',
        description:
          'A partir dos requisitos de sobressinal (%OS) e tempo de acomodação (Ts), calcular ζ, ωn e o polo alvo sd = -σd + jωd.',
        formulaLatex: '\\zeta = \\frac{-\\ln(\\%OS/100)}{\\sqrt{\\pi^2 + \\ln^2(\\%OS/100)}} \\;;\\; \\sigma_d = \\frac{4}{T_s} \\;;\\; s_d = -\\sigma_d + j\\sigma_d\\frac{\\sqrt{1-\\zeta^2}}{\\zeta}'
      },
      {
        step: 'Passo 2',
        title: 'Calcular a Deficiência Angular (Condição de Ângulo)',
        description:
          'Avaliar a fase de G(sd). A diferença para ±180° é o ângulo φd que o zero do controlador PD precisa fornecer.',
        formulaLatex: '\\phi_d = 180^\\circ - \\angle G(s_d) \\quad (\\text{ou } \\sum \\theta_{\\text{polos}} - \\sum \\theta_{\\text{zeros}} - 180^\\circ)'
      },
      {
        step: 'Passo 3',
        title: 'Posicionar o Zero zc do PD',
        description:
          'Por trigonometria no ponto sd = -σd + jωd, encontrar o zero real s = -zc que contribui exatamente com o ângulo φd.',
        formulaLatex: '\\tan(\\phi_d) = \\frac{\\omega_d}{z_c - \\sigma_d} \\implies z_c = \\sigma_d + \\frac{\\omega_d}{\\tan(\\phi_d)}'
      },
      {
        step: 'Passo 4',
        title: 'Calcular o Ganho Kd pela Condição de Módulo',
        description:
          'Impor |Gc(sd)·G(sd)| = 1 para determinar Kd e obter Kp = Kd·zc.',
        formulaLatex: 'K_d = \\frac{1}{|s_d + z_c| \\cdot |G(s_d)|} \\implies G_c(s) = K_d s + K_d z_c'
      }
    ]
  },

  Lead: {
    id: 'Lead',
    shortName: 'Avanço (Lead)',
    fullName: 'Controlador por Avanço de Fase (Lead)',
    badgeColor: '#7c3aed',
    transferFunctionLatex: 'G_c(s) = K_c \\frac{s + z}{s + p} \\quad (z < p)',
    summary:
      'Rede de primeira ordem onde o zero está mais próximo da origem do que o polo (z < p). Adiciona avanço de fase positivo ao LGR para melhorar a resposta transitória sem amplificar ruído como um derivador ideal.',
    transientEffect:
      'Desloca o Lugar Geométrico das Raízes (LGR) para a esquerda, reduzindo o tempo de pico Tp, diminuindo o tempo de acomodação Ts e aumentando o amortecimento e a estabilidade.',
    steadyStateEffect:
      'Não altera o Tipo do sistema. Melhora moderadamente o erro em regime permanente pelo aumento de ganho em malha fechada.',
    whenToChoose: [
      'Quando o desempenho transitório (%OS, Tp, Ts) precisa ser melhorado e o LGR original não passa pelos polos dominantes desejados sd.',
      'Quando se busca acelerar a resposta e aumentar a margem de estabilidade com filtro real em alta frequência (razão r = p/z ajustável, ex.: Bissetriz ou Cancelamento).'
    ],
    professorMethodTitle: 'Roteiro Padrão — Controlador por Avanço de Fase (LGR)',
    professorMethodSteps: [
      {
        step: 'Passo 1',
        title: 'Determinar os Polos Dominantes Desejados (sd)',
        description:
          'A partir dos requisitos de sobressinal (%OS) e tempo de pico (Tp) ou acomodação (Ts), calcular ζ, ωn e sd = -σd + jωd.',
        formulaLatex: '\\zeta = \\frac{-\\ln(\\%OS/100)}{\\sqrt{\\pi^2 + \\ln^2(\\%OS/100)}} \\;;\\; \\omega_d = \\frac{\\pi}{T_p} \\;;\\; s_d = -\\sigma_d + j\\omega_d'
      },
      {
        step: 'Passo 2',
        title: 'Calcular a Deficiência Angular (φ)',
        description:
          'Avaliar a fase de G(sd) no ponto desejado. A diferença para ±180° é o ângulo positivo φ que o controlador de avanço deve fornecer.',
        formulaLatex: '\\phi = 180^\\circ - \\angle G(s_d)'
      },
      {
        step: 'Passo 3',
        title: 'Posicionar Zero (z) e Polo (p) — Bissetriz ou Cancelamento',
        description:
          'Escolher o critério de projeto: (a) Cancelamento de um polo lento da planta com z; ou (b) Método da Bissetriz dividindo o ângulo φ simetricamente para minimizar o ganho Kc.',
        formulaLatex: '\\angle(s_d + z) - \\angle(s_d + p) = \\phi \\quad (z < p)'
      },
      {
        step: 'Passo 4',
        title: 'Ajustar o Ganho Kc pela Condição de Módulo',
        description:
          'Impor |Gc(sd)·G(sd)| = 1 para determinar o ganho Kc e validar a resposta em malha fechada.',
        formulaLatex: 'K_c = \\frac{|s_d + p|}{|s_d + z| \\cdot |G(s_d)|}'
      }
    ]
  },

  Lag: {
    id: 'Lag',
    shortName: 'Atraso (Lag)',
    fullName: 'Controlador por Atraso de Fase (Lag)',
    badgeColor: '#dc2626',
    transferFunctionLatex: 'G_c(s) = K_c \\frac{s + z}{s + p} \\quad (p < z)',
    summary:
      'Rede de primeira ordem com polo e zero formando um dipolo próximo à origem (p < z). Amplifica o ganho estático pelo fator β = z/p sem desviar os polos dominantes sd.',
    transientEffect:
      'Preserva o comportamento transitório (polos dominantes sd permanecem intactos com perda angular ≤ 10°), evitando criação de cauda lenta quando z ≤ z_dipolo.',
    steadyStateEffect:
      'Não altera o Tipo do sistema, mas multiplica as constantes de erro estático (Kp, Kv ou Ka) pelo fator β = z/p > 1, reduzindo drasticamente o erro estacionário.',
    whenToChoose: [
      'Quando o transitório (polos dominantes sd) JÁ está satisfatório com ganho inicial K0, mas o erro em regime permanente está acima do especificado.',
      'Quando não é necessário mudar o Tipo do sistema (diferente do PI), bastando amplificar o ganho DC em baixas frequências.'
    ],
    professorMethodTitle: 'Roteiro Padrão do Professor — Controlador por Atraso de Fase (Lag)',
    professorMethodSteps: [
      {
        step: 'Passo 0',
        title: 'Especificação e Triagem do Dipolo',
        description:
          'Calcular Kreq a partir do erro estacionário desejado e determinar o limite do dipolo usando o polo não-nulo mais lento da planta (para não criar cauda lenta).',
        formulaLatex: 'z_{\\text{dipolo}} = \\frac{|s_{\\text{lenta}}|}{1{,}1}'
      },
      {
        step: 'Passo 1',
        title: 'Ganho Inicial K0 pela Condição de Módulo',
        description:
          'Calcular o ganho K0 que coloca os polos dominantes da planta sem compensador exatamente no ponto desejado sd = -σd + jωd.',
        formulaLatex: '|K_0 G(s_d)| = 1 \\implies K_0 = \\frac{1}{|G(s_d)|}'
      },
      {
        step: 'Passo 2',
        title: 'Constante Atual e Fator β',
        description:
          'Calcular a constante de erro atual (Kp,a, Kv,a ou Ka,a) usando K0 e obter a razão de amplificação necessária β = z/p.',
        formulaLatex: '\\beta = \\frac{K_{\\text{req}}}{K_{\\text{atual}}}'
      },
      {
        step: 'Passo 3',
        title: 'Erro Atual e Reserva de Tolerância Angular φ',
        description:
          'Se o erro atual com K0 for elevado (> 2%), reservar tolerância angular φ = 10° (ou φ = 5° para ajustes finos).',
        formulaLatex: '\\varphi = 10^\\circ \\quad (\\text{ou } 5^\\circ)'
      },
      {
        step: 'Passo 4',
        title: 'Posição de z e p pelo Polinômio Trigonométrico',
        description:
          'Resolver tan(θz - θp) = tan(φ) com z = β·p no ponto sd = -σd + jωd. Comparar z_max = β·p_max com z_dipolo e escolher o MENOR valor para z; depois calcular p = z/β.',
        formulaLatex: '\\frac{\\frac{\\omega_d}{\\sigma_d - \\beta p} - \\frac{\\omega_d}{\\sigma_d - p}}{1 + \\frac{\\omega_d^2}{(\\sigma_d - \\beta p)(\\sigma_d - p)}} = \\tan(\\varphi) \\;;\\; z = \\min(z_{\\max}, z_{\\text{dipolo}}) \\;;\\; p = \\frac{z}{\\beta}'
      },
      {
        step: 'Passo 5',
        title: 'Ajuste Final de Ganho Kc e Conferência',
        description:
          'Recalcular o ganho Kc pela condição de módulo incluindo o compensador e conferir se o erro final atende à especificação.',
        formulaLatex: 'K_c = K_0 \\frac{|s_d + p|}{|s_d + z|} \\implies e_{ss,\\text{final}} \\le e_{ss,\\text{req}}'
      }
    ]
  }
};

// =============================================================================
// 2. SIMULADOR RK4 PARA QUALQUER ENTRADA (DEGRAU, RAMPA, PARÁBOLA, COMBINADA)
// =============================================================================

export interface ControllerSimulationResult {
  t: number[];
  r: number[];
  yUncomp: number[];
  yComp: number[];
  eUncomp: number[];
  eComp: number[];
  essUncomp: number;
  essComp: number;
  overshootUncomp: number | null;
  overshootComp: number | null;
}

/**
 * Calcula a função de transferência de malha fechada T(s) = Gc(s)G(s) / (1 + Gc(s)G(s)H(s))
 */
export function buildClosedLoopTf(G: RatFunc, Gc: RatFunc, H?: RatFunc): RatFunc {
  const L = ratMul(Gc, G);
  const Hfunc = H || { num: [{ coeff: 1, vars: {} }], den: [{ coeff: 1, vars: {} }] };
  const LH = ratMul(L, Hfunc);
  // T = L / (1 + LH) = (L.num * LH.den) / (L.den * LH.den + L.den * LH.num)
  const num = polyMul(L.num, LH.den);
  const den = polyAdd(polyMul(L.den, LH.den), polyMul(L.den, LH.num));
  return ratSimplify(num, den);
}

/**
 * Simulador Runge-Kutta de 4ª Ordem (RK4) generalizado para função de entrada arbitrária u(t)
 */
export function simulateInputResponseRK4(
  T: RatFunc,
  inputFn: (t: number) => number,
  tMax: number = 10,
  numSteps: number = 300
): { t: number[]; y: number[] } | null {
  if (!isUnivariateInS(T.num) || !isUnivariateInS(T.den)) return null;

  const uN = trimUni(toUnivariateArr(T.num));
  const uD = trimUni(toUnivariateArr(T.den));
  const n = uD.length - 1;
  const m = uN.length - 1;

  if (n < 0 || m > n) return null;
  const an = uD[n];
  if (Math.abs(an) < 1e-12) return null;

  const a = uD.map(c => c / an);
  const b = new Array(n + 1).fill(0);
  for (let i = 0; i <= m; i++) {
    b[i] = uN[i] / an;
  }

  const dt = tMax / numSteps;
  const tArr: number[] = [];
  const yArr: number[] = [];

  if (n === 0) {
    for (let k = 0; k <= numSteps; k++) {
      const tVal = k * dt;
      tArr.push(Number(tVal.toFixed(4)));
      yArr.push(Number((b[0] * inputFn(tVal)).toFixed(5)));
    }
    return { t: tArr, y: yArr };
  }

  const dDirect = b[n];
  const cVec = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    cVec[i] = b[i] - a[i] * dDirect;
  }

  let x = new Array(n).fill(0);

  const deriv = (state: number[], uVal: number): number[] => {
    const dx = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) {
      dx[i] = state[i + 1];
    }
    let last = uVal;
    for (let i = 0; i < n; i++) {
      last -= a[i] * state[i];
    }
    dx[n - 1] = last;
    return dx;
  };

  for (let step = 0; step <= numSteps; step++) {
    const tVal = step * dt;
    const u0 = inputFn(tVal);
    let yVal = dDirect * u0;
    for (let i = 0; i < n; i++) {
      yVal += cVec[i] * x[i];
    }
    // Proteção contra overflow numérico em sistemas muito instáveis
    if (!Number.isFinite(yVal) || Math.abs(yVal) > 1e6) {
      yVal = Math.sign(yVal || 1) * 1e6;
    }

    tArr.push(Number(tVal.toFixed(4)));
    yArr.push(Number(yVal.toFixed(5)));

    if (step < numSteps) {
      const uHalf = inputFn(tVal + dt * 0.5);
      const uNext = inputFn(tVal + dt);

      const k1 = deriv(x, u0);
      const s2 = x.map((xi, i) => xi + 0.5 * dt * k1[i]);
      const k2 = deriv(s2, uHalf);
      const s3 = x.map((xi, i) => xi + 0.5 * dt * k2[i]);
      const k3 = deriv(s3, uHalf);
      const s4 = x.map((xi, i) => xi + dt * k3[i]);
      const k4 = deriv(s4, uNext);

      x = x.map((xi, i) => xi + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
  }

  return { t: tArr, y: yArr };
}

export function simulateControllerExercise(ex: ControllerExercise): ControllerSimulationResult | null {
  try {
    const G = parseRatExpr(ex.plantExpr);
    const Gc = parseRatExpr(ex.controllerExpr);
    const Gone: RatFunc = { num: [{ coeff: 1, vars: {} }], den: [{ coeff: 1, vars: {} }] };
    const H = ex.feedbackExpr ? parseRatExpr(ex.feedbackExpr) : undefined;

    const T_uncomp = buildClosedLoopTf(G, Gone, H);
    const T_comp = buildClosedLoopTf(G, Gc, H);

    const a0 = ex.inputParams.a0 || 0;
    const a1 = ex.inputParams.a1 || 0;
    const a2 = ex.inputParams.a2 || 0;

    const inputFn = (t: number) => a0 + a1 * t + a2 * t * t;

    const simUncomp = simulateInputResponseRK4(T_uncomp, inputFn, ex.tMax, 300);
    const simComp = simulateInputResponseRK4(T_comp, inputFn, ex.tMax, 300);

    if (!simUncomp || !simComp) return null;

    const t = simComp.t;
    const r = t.map(inputFn);
    const yUncomp = simUncomp.y;
    const yComp = simComp.y;
    const eUncomp = r.map((rv, i) => Number((rv - yUncomp[i]).toFixed(5)));
    const eComp = r.map((rv, i) => Number((rv - yComp[i]).toFixed(5)));

    const lastIdx = t.length - 1;
    const essUncomp = eUncomp[lastIdx];
    const essComp = eComp[lastIdx];

    let overshootUncomp: number | null = null;
    let overshootComp: number | null = null;
    if (ex.inputType === 'step' && a0 !== 0) {
      const yFinU = yUncomp[lastIdx];
      const yMaxU = Math.max(...yUncomp);
      if (Math.abs(yFinU) > 1e-6 && yMaxU > yFinU) {
        overshootUncomp = Number((((yMaxU - yFinU) / Math.abs(yFinU)) * 100).toFixed(2));
      } else {
        overshootUncomp = 0;
      }

      const yFinC = yComp[lastIdx];
      const yMaxC = Math.max(...yComp);
      if (Math.abs(yFinC) > 1e-6 && yMaxC > yFinC) {
        overshootComp = Number((((yMaxC - yFinC) / Math.abs(yFinC)) * 100).toFixed(2));
      } else {
        overshootComp = 0;
      }
    }

    return {
      t,
      r,
      yUncomp,
      yComp,
      eUncomp,
      eComp,
      essUncomp,
      essComp,
      overshootUncomp,
      overshootComp
    };
  } catch {
    return null;
  }
}

// =============================================================================
// 3. TODOS OS EXERCÍCIOS DOS SLIDES E PROPOSTOS (ORGANIZADOS POR CONTROLADOR)
// =============================================================================

export const CONTROLLER_EXERCISES: ControllerExercise[] = [
  // ---------------------------------------------------------------------------
  // CONTROLADOR PROPORCIONAL (P)
  // ---------------------------------------------------------------------------
  {
    id: 'p-ex-lgr-20',
    controllerId: 'P',
    badge: 'Slide 01 • Mp=6%, ts=0,4s',
    title: 'Projeto P (Slide 01) — Planta 1/(s² + 20s) para Overshoot 6% e ts = 0,4 s',
    source: 'Slide 01 — Projeto Controlador Proporcional (LGR)',
    statementLatex:
      '\\text{Considere } G(s) = \\frac{1}{s^2 + 20s} = \\frac{1}{s(s+20)} \\text{ com realimentação unitária. Projete um controlador P } (G_c(s)=K) \\text{ para } M_p = 6\\% \\text{ e } t_s = 0{,}4\\text{ s}.',
    plantExpr: '1/(s^2+20*s)',
    plantLatex: '\\frac{1}{s^2 + 20s}',
    controllerExpr: '224.69',
    controllerLatex: 'G_c(s) = K = 224{,}69',
    controllerBlockLabel: 'Controlador P (K = 224,69)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 1.0,
    whyThisController:
      'Os polos de malha aberta estão em $s = 0$ e $s = -20$. Os polos desejados $p_{1,2} = -10 \\pm j11{,}16$ possuem parte real $-10$, exatamente sobre a mediatriz entre $0$ e $-20$, que faz parte do Lugar das Raízes original da planta. Logo, apenas um **Controlador Proporcional (P)** atende simultaneamente $M_p = 6\\%$ e $t_s = 0{,}4\\text{ s}$ com erro nulo ao degrau (Tipo 1).',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem',
      initialErrorLatex: 'e_{ss,(K=1)} = 0',
      finalErrorLatex: 'e_{ss,(K=224{,}69)} = 0'
    },
    detailedSteps: [
      {
        title: '1. Polos Dominantes Desejados a partir de Mp = 6% e ts = 0,4 s',
        description: 'Calculando $\\zeta$, $\\sigma_d = \\zeta\\omega_n$, $\\omega_n$ e $\\omega_d$:',
        latex:
          '\\zeta = \\frac{-\\ln(0{,}06)}{\\sqrt{\\pi^2 + \\ln^2(0{,}06)}} \\approx 0{,}6671 \\;;\\; \\sigma_d = \\frac{4}{0{,}4} = 10 \\;;\\; \\omega_n = \\frac{10}{0{,}6671} \\approx 14{,}99\\text{ rad/s} \\;;\\; \\omega_d = \\omega_n\\sqrt{1-\\zeta^2} \\approx 11{,}17\\text{ rad/s} \\implies \\mathbf{p_{1,2} = -10 \\pm j11{,}16}'
      },
      {
        title: '2. Condição de Ângulo por Trigonometria (Método do Slide)',
        description:
          'Triângulo no plano $s$ com polos em $0$ e $-20$ e polo de projeto $s_d = -10 + j11{,}1665$ (distância horizontal de $10$ para cada polo e altura $11{,}1665$):',
        latex:
          '\\theta_2 = \\arctan\\left(\\frac{11{,}1665}{20 - 10}\\right) = \\arctan(1{,}1167) = \\mathbf{48{,}15^\\circ} \\;;\\; \\theta_1 = 180^\\circ - \\arctan\\left(\\frac{11{,}1665}{10}\\right) = 180^\\circ - 48{,}15^\\circ = \\mathbf{131{,}85^\\circ} \\;;\\; \\text{Ang zeros} - \\text{Ang polos} = 0^\\circ - (131{,}85^\\circ + 48{,}15^\\circ) = \\mathbf{-180^\\circ} \\;(\\text{Atende!})'
      },
      {
        title: '3. Cálculo do Ganho K pela Condição de Módulo (Passo a Passo Completo)',
        description:
          'Aplicando $K = \\left.\\frac{1}{|G(s)H(s)|}\\right|_{s=s_d}$ com $G(s) = \\frac{1}{s(s+20)}$, $H(s) = 1$ e $s_d = -10 + j11{,}1665$:',
        latex:
          'K = \\left.\\frac{1}{|G(s)H(s)|}\\right|_{s=-10+j11{,}1665} = \\left.\\frac{1}{\\left|\\frac{1}{s(s+20)}\\cdot 1\\right|}\\right|_{s=-10+j11{,}1665} \\;;\\; K = \\frac{1}{\\left|\\frac{1}{(-10+j11{,}1665)\\cdot(-10+j11{,}1665+20)}\\right|} = \\frac{1}{\\left|\\frac{1}{(-10+j11{,}1665)\\cdot(10+j11{,}1665)}\\right|} \\;;\\; K = \\frac{1}{\\frac{1}{|-10+j11{,}1665|\\cdot|10+j11{,}1665|}} = \\frac{1}{\\frac{1}{\\sqrt{(-10)^2+(11{,}1665)^2}\\cdot\\sqrt{(10)^2+(11{,}1665)^2}}} \\;;\\; K = \\frac{1}{\\frac{1}{\\sqrt{100+124{,}69}\\cdot\\sqrt{100+124{,}69}}} = \\frac{1}{\\frac{1}{\\sqrt{224{,}69}\\cdot\\sqrt{224{,}69}}} = \\frac{1}{\\frac{1}{224{,}69}} = \\mathbf{224{,}69}'
      },
      {
        title: '4. Por que o Sistema em Malha Fechada é Estável?',
        description:
          'A equação característica resulta em $s^2 + 20s + 224{,}69 = 0$, cujos polos $p_{1,2} = -10 \\pm j11{,}16$ possuem parte real estritamente negativa ($\\text{Re}(s) = -10 < 0$), no semiplano esquerdo do plano $s$. Fisicamente, o termo transitório $e^{-10t} \\to 0$ quando $t \\to \\infty$, garantindo amortecimento das oscilações e convergência ao degrau (critério de Routh-Hurwitz: coeficientes $1, 20, 224{,}69 > 0$).',
        latex: 'T(s) = \\frac{224{,}69}{s^2 + 20s + 224{,}69} \\implies \\text{Re}(p_{1,2}) = -10 < 0 \\;(\\text{Estável!})'
      }
    ],
    scilabCode: `// Slide 01 - Projeto P: G(s) = 1/(s^2 + 20s), Mp = 6%, ts = 0.4s
s = %s;
G = syslin('c', 1, s^2 + 20*s);
K = 224.69;
T = (K*G) /. 1;
clf(); t = 0:0.005:1.0;
plot(t, csim('step', t, T), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'p-ex-1-3',
    controllerId: 'P',
    badge: 'Exercício Adicional • Ex. 1.3 • Tipo 0',
    title: 'Exercício Adicional 1.3 — Tipo 0 com Controlador Proporcional (P)',
    source: 'Lista Adicional — Sistemas Tipo 0',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{1}{(s+2)(s+4)}, \\text{ projete um controlador proporcional } G_c(s) = K \\text{ para que o erro a um degrau unitário seja de } 10\\% \\; (e_{ss} = 0{,}1).',
    plantExpr: '1/((s+2)*(s+4))',
    plantLatex: '\\frac{1}{(s+2)(s+4)}',
    controllerExpr: '72',
    controllerLatex: 'G_c(s) = K = 72',
    controllerBlockLabel: 'Controlador Proporcional (P)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 5,
    whyThisController:
      'Sistema Tipo 0 e 2ª ordem (s² + 6s + 8). Como se admite erro finito de 10% ao degrau e não há restrição rígida de polos que impeça aumentar o ganho, basta ajustar o ganho estático com um Controlador Proporcional Gc(s) = K (sem precisar de integrador PI nem compensador Lag).',
    diagnostics: {
      systemType: 'Tipo 0 (0 polos na origem)',
      systemOrder: '2ª Ordem (s² + 6s + 8)',
      initialErrorLatex: 'e_{ss,(K=1)} = \\frac{1}{1 + 1/8} = 0{,}889 \\; (88{,}9\\%)',
      finalErrorLatex: 'e_{ss,(K=72)} = \\frac{1}{1 + 9} = 0{,}10 \\; (10\\%)'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico do Tipo e Ordem',
        description: 'A planta não possui fator s isolado no denominador; expandindo (s+2)(s+4) = s² + 6s + 8.',
        latex: '\\text{Tipo } 0 \\;;\\; 2^{\\text{a}}\\text{ Ordem}'
      },
      {
        title: '2. Expressar Kp em Função de K',
        description: 'Aplicando a definição da constante de erro estático de posição com Gc(s) = K:',
        latex: 'K_p = \\lim_{s\\to 0} \\frac{K}{(s+2)(s+4)} = \\frac{K}{2 \\cdot 4} = \\frac{K}{8}'
      },
      {
        title: '3. Impor o Erro Estacionário Desejado (ess = 0,1)',
        description: 'Substituindo Kp na fórmula do erro ao degrau unitário e isolando K:',
        latex: 'e_{ss} = \\frac{1}{1 + K_p} = 0{,}1 \\implies \\frac{1}{1 + \\frac{K}{8}} = 0{,}1 \\implies 1 + \\frac{K}{8} = 10 \\implies \\mathbf{K = 72}'
      },
      {
        title: '4. Conferência da Estabilidade em Malha Fechada (Por que é Estável?)',
        description:
          'O sistema em malha fechada é **estável** porque todas as raízes da equação característica ($s^2 + 6s + 80 = 0$), dadas por $s_{1,2} = -3 \\pm j8{,}43$, possuem parte real estritamente negativa ($\\mathrm{Re}(s) = -3 < 0$), localizando-se no semiplano esquerdo do plano $s$. Fisicamente, o termo transitório possui decaimento exponencial ($e^{-3t} \\to 0$ quando $t \\to \\infty$), amortecendo as oscilações até um valor finito. Além disso, por ser de 2ª ordem com todos os coeficientes positivos ($1, 6, 80 > 0$), satisfaz o critério de Routh-Hurwitz.',
        latex: 'T(s) = \\frac{72}{s^2 + 6s + 80} \\implies s_{1,2} = -3 \\pm j8{,}43 \\; (\\mathrm{Re}(s) = -3 < 0 \\implies \\text{Estável!})'
      }
    ],
    scilabCode: `// Exercício 1.3 - Controlador Proporcional (P)
s = poly(0, 's');
G = syslin('c', 1, (s+2)*(s+4));
K = 72;
T_sem = G / (1 + G);
T_com = (K*G) / (1 + K*G);
t = 0:0.01:5;
y_sem = csim('step', t, T_sem);
y_com = csim('step', t, T_com);
disp("Erro final sem K=72:", 1 - y_sem($));
disp("Erro final com K=72:", 1 - y_com($));
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem Controlador (K=1)", "Controlador P (K=72)"]);
xgrid();`
  },
  {
    id: 'p-ex-2-4',
    controllerId: 'P',
    badge: 'Exercício Adicional • Ex. 2.4 • Tipo 1',
    title: 'Exercício Adicional 2.4 — Tipo 1 com Controlador Proporcional (P)',
    source: 'Lista Adicional — Sistemas Tipo 1',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{s+6}{s(s+2)(s+3)}, \\text{ determine o controlador proporcional } G_c(s) = K \\text{ para que o erro a uma rampa unitária seja } e_{ss} = 0{,}05.',
    plantExpr: '(s+6)/(s*(s+2)*(s+3))',
    plantLatex: '\\frac{s+6}{s(s+2)(s+3)}',
    controllerExpr: '20',
    controllerLatex: 'G_c(s) = K = 20',
    controllerBlockLabel: 'Controlador Proporcional (P)',
    inputType: 'ramp',
    inputParams: { a1: 1, labelLatex: 'r(t) = t \\cdot u(t)' },
    tMax: 12,
    whyThisController:
      'Como a entrada é em rampa e a planta já é Tipo 1 (possui um integrador puro 1/s), o sistema naturalmente acompanha rampas com erro finito (1/Kv). Basta um Controlador Proporcional Gc(s) = K para ajustar diretamente Kv e atingir ess = 0,05.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '3ª Ordem (s³ + 5s² + 6s)',
      initialErrorLatex: 'e_{ss,(K=1)} = \\frac{1}{1} = 1{,}00',
      finalErrorLatex: 'e_{ss,(K=20)} = \\frac{1}{20} = 0{,}05'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico do Sistema',
        description: 'Fator s¹ isolado no denominador indica Tipo 1; maior potência é s³ (3ª ordem).',
        latex: '\\text{Tipo } 1 \\;;\\; 3^{\\text{a}}\\text{ Ordem}'
      },
      {
        title: '2. Cálculo de Kv em Função de K',
        description: 'Multiplicando por s e tomando s → 0:',
        latex: 'K_v = \\lim_{s\\to 0} s \\cdot \\frac{K(s+6)}{s(s+2)(s+3)} = \\frac{6K}{2 \\cdot 3} = K'
      },
      {
        title: '3. Ajuste do Ganho K',
        description: 'Impondo o erro especificado à rampa unitária:',
        latex: 'e_{ss} = \\frac{1}{K_v} = \\frac{1}{K} = 0{,}05 \\implies \\mathbf{G_c(s) = K = 20}'
      },
      {
        title: '4. Verificação de Estabilidade (Routh-Hurwitz — Por que é Estável?)',
        description:
          'Polinômio característico: $s^3 + 5s^2 + 26s + 120 = 0$. Pelo critério de Routh-Hurwitz ($a_2 a_1 > a_0 \\implies 5 \\cdot 26 = 130 > 120$), não há trocas de sinal na primeira coluna da tabela de Routh, garantindo que todas as raízes possuem parte real estritamente negativa (no semiplano esquerdo) e que os termos transitórios decaem exponencialmente para zero.',
        latex: '5 \\cdot 26 = 130 > 120 \\implies \\text{Todas as raízes com } \\mathrm{Re}(s) < 0 \\;(\\text{Malha Fechada Estável!})'
      }
    ],
    scilabCode: `// Exercício 2.4 - Tipo 1 com Controlador Proporcional (P)
s = poly(0, 's');
G = syslin('c', s+6, s*(s+2)*(s+3));
K = 20;
T_sem = G / (1 + G);
T_com = (K*G) / (1 + K*G);
t = 0:0.02:12;
r = t;
y_sem = csim(r, t, T_sem);
y_com = csim(r, t, T_com);
disp("Erro à rampa sem K=20:", r($) - y_sem($));
disp("Erro à rampa com K=20:", r($) - y_com($));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Referência r(t)=t", "Sem Controlador", "Com Controlador P (K=20)"]);
xgrid();`
  },
  {
    id: 'p-ex-3-4',
    controllerId: 'P',
    badge: 'Exercício Adicional • Ex. 3.4 • Tipo 2',
    title: 'Exercício Adicional 3.4 — Tipo 2 com Controlador Proporcional (P)',
    source: 'Lista Adicional — Sistemas Tipo 2',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{s+1}{s^2(s+10)}, \\text{ determine o controlador proporcional } G_c(s) = K \\text{ para que o erro à parábola unitária } (R(s) = 1/s^3) \\text{ seja } e_{ss} = 0{,}02.',
    plantExpr: '(s+1)/(s^2*(s+10))',
    plantLatex: '\\frac{s+1}{s^2(s+10)}',
    controllerExpr: '500',
    controllerLatex: 'G_c(s) = K = 500',
    controllerBlockLabel: 'Controlador Proporcional (P)',
    inputType: 'parabola',
    inputParams: { a2: 0.5, labelLatex: 'r(t) = \\frac{1}{2}t^2 u(t) \\; (R(s)=1/s^3)' },
    tMax: 8,
    whyThisController:
      'O sistema já é Tipo 2 (fator s² isolado no denominador), logo acompanha entrada parabólica com erro finito 1/Ka. Um Controlador Proporcional Gc(s) = K ajusta diretamente a constante de aceleração Ka.',
    diagnostics: {
      systemType: 'Tipo 2 (2 polos na origem)',
      systemOrder: '3ª Ordem (s³ + 10s²)',
      initialErrorLatex: 'e_{ss,(K=1)} = \\frac{1}{0{,}1} = 10{,}0',
      finalErrorLatex: 'e_{ss,(K=500)} = \\frac{1}{50} = 0{,}02'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico do Sistema',
        description: 'Presença de s² no denominador caracteriza Tipo 2; grau 3 no denominador indica 3ª ordem.',
        latex: '\\text{Tipo } 2 \\;;\\; 3^{\\text{a}}\\text{ Ordem}'
      },
      {
        title: '2. Cálculo de Ka em Função de K',
        description: 'Aplicando o limite de aceleração:',
        latex: 'K_a = \\lim_{s\\to 0} s^2 \\cdot \\frac{K(s+1)}{s^2(s+10)} = \\frac{K}{10}'
      },
      {
        title: '3. Isolamento do Ganho K',
        description: 'Impondo ess = 0,02 para entrada parabólica unitária (A=1 em R(s)=1/s³):',
        latex: 'e_{ss} = \\frac{1}{K_a} = \\frac{10}{K} = 0{,}02 \\implies \\mathbf{G_c(s) = K = 500}'
      },
      {
        title: '4. Conferência de Estabilidade (Routh-Hurwitz — Por que é Estável?)',
        description:
          'Polinômio característico: $s^3 + 10s^2 + 500s + 500 = 0$. Como todos os coeficientes são positivos e $a_2 a_1 = 10 \\cdot 500 = 5000 > 500$, não há mudança de sinal na 1ª coluna de Routh, logo todos os polos de malha fechada têm $\\mathrm{Re}(s) < 0$ (semiplano esquerdo), garantindo resposta amortecida e estável.',
        latex: '10 \\cdot 500 = 5000 > 500 \\implies \\text{Todos os polos no semiplano esquerdo } (\\text{Estável!})'
      }
    ],
    scilabCode: `// Exercício 3.4 - Tipo 2 com Controlador Proporcional (P)
s = poly(0, 's');
G = syslin('c', s+1, (s^2)*(s+10));
K = 500;
T_com = (K*G) / (1 + K*G);
t = 0:0.01:8;
r = 0.5 * (t.^2);
y_com = csim(r, t, T_com);
disp("Erro à parábola com K=500:", r($) - y_com($));
plot(t, r, 'k:', t, y_com, 'b-', 'LineWidth', 2);
legend(["Referência 0.5*t^2", "Com Controlador P (K=500)"]);
xgrid();`
  },
  {
    id: 'p-ex-2-2',
    controllerId: 'P',
    badge: 'Exercício Adicional • Ex. 2.2 • Erro Nulo Natural',
    title: 'Exercício Adicional 2.2 — Tipo 1 com Entrada Degrau (Gc(s) = 1)',
    source: 'Lista Adicional — Análise de Tipo vs. Controlador',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{40(s+2)}{s^2+8s}, \\text{ calcule o erro para } r(t) = 10u(t) \\text{ e indique o controlador necessário para erro nulo em regime permanente.}',
    plantExpr: '40*(s+2)/(s*(s+8))',
    plantLatex: '\\frac{40(s+2)}{s(s+8)}',
    controllerExpr: '1',
    controllerLatex: 'G_c(s) = 1',
    controllerBlockLabel: 'Sem Compensador Extra (Gc = 1)',
    inputType: 'step',
    inputParams: { a0: 10, labelLatex: 'r(t) = 10 \\cdot u(t)' },
    tMax: 3,
    whyThisController:
      'Fatorando s² + 8s = s(s+8), a planta já é Tipo 1! Como todo sistema Tipo 1 estável possui Kp = ∞, o erro ao degrau já é naturalmente nulo (ess = 0). Não é necessário adicionar integrador (PI) nem compensador Lag — basta realimentação unitária estável com Gc(s) = 1.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem (s² + 8s)',
      initialErrorLatex: 'K_p = \\infty \\implies e_{ss} = 0',
      finalErrorLatex: 'e_{ss} = 0 \\; (\\text{Controlador } G_c(s) = 1)'
    },
    detailedSteps: [
      {
        title: '1. Fatoração e Diagnóstico',
        description: 'Colocando s em evidência no denominador s² + 8s = s(s+8):',
        latex: 'G(s) = \\frac{40(s+2)}{s(s+8)} \\implies \\text{Tipo } 1 \\;;\\; 2^{\\text{a}}\\text{ Ordem}'
      },
      {
        title: '2. Cálculo de Kp e Erro ao Degrau r(t) = 10u(t)',
        description: 'Avaliando o limite com s → 0:',
        latex: 'K_p = \\lim_{s\\to 0} \\frac{40(s+2)}{s(s+8)} = \\infty \\implies e_{ss} = \\frac{10}{1 + \\infty} = \\mathbf{0}'
      },
      {
        title: '3. Decisão de Projeto',
        description: 'Como o requisito de erro nulo já é satisfeito pela própria dinâmica integradora da planta, adota-se Gc(s) = 1.',
        latex: 'G_c(s) = 1 \\; (\\text{malha fechada estável: } s^2 + 48s + 80 = 0)'
      }
    ],
    scilabCode: `// Exercício 2.2 - Tipo 1 com Degrau (Erro Nulo Natural)
s = poly(0, 's');
G = syslin('c', 40*(s+2), s*(s+8));
T = G / (1 + G);
t = 0:0.005:3;
y = 10 * csim('step', t, T);
disp("Erro final ao degrau A=10:", 10 - y($));
plot(t, 10*ones(t), 'k:', t, y, 'b-', 'LineWidth', 2);
legend(["Referência r(t)=10", "Saída c(t) com Gc=1"]);
xgrid();`
  },
  {
    id: 'p-ex-3-2',
    controllerId: 'P',
    badge: 'Exercício Adicional • Ex. 3.2 • Erro Nulo à Rampa',
    title: 'Exercício Adicional 3.2 — Tipo 2 com Entrada Rampa (Gc(s) = 1)',
    source: 'Lista Adicional — Sistemas Tipo 2',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{50}{s^3 + 5s^2}, \\text{ calcule o erro para rampa } r(t) = 8t \\cdot u(t) \\text{ e indique o controlador necessário para erro nulo.}',
    plantExpr: '50/(s^2*(s+5))',
    plantLatex: '\\frac{50}{s^2(s+5)}',
    controllerExpr: '1',
    controllerLatex: 'G_c(s) = 1',
    controllerBlockLabel: 'Sem Compensador Extra (Gc = 1)',
    inputType: 'ramp',
    inputParams: { a1: 8, labelLatex: 'r(t) = 8t \\cdot u(t)' },
    tMax: 8,
    whyThisController:
      'Fatorando s³ + 5s² = s²(s+5), a planta possui dois integradores puros (Tipo 2). Todo sistema Tipo 2 possui Kv = ∞, anulando naturalmente o erro estacionário à rampa sem necessidade de integradores extras (Gc(s) = 1). Observação: deve-se conferir a estabilidade em malha fechada!',
    diagnostics: {
      systemType: 'Tipo 2 (2 polos na origem)',
      systemOrder: '3ª Ordem (s³ + 5s²)',
      initialErrorLatex: 'K_v = \\infty \\implies e_{ss} = \\frac{8}{\\infty} = 0',
      finalErrorLatex: 'e_{ss} = 0 \\; (\\text{Observação: com Gc=1, } s^3+5s^2+50 \\text{ é instável sem compensação dinâmica!})'
    },
    detailedSteps: [
      {
        title: '1. Fatoração do Denominador',
        description: 'Identificação do fator s² em evidência:',
        latex: 'G(s) = \\frac{50}{s^2(s+5)} \\implies \\text{Tipo } 2 \\;;\\; 3^{\\text{a}}\\text{ Ordem}'
      },
      {
        title: '2. Cálculo de Kv e Erro à Rampa r(t) = 8t·u(t)',
        description: 'Avaliando o limite da constante de velocidade:',
        latex: 'K_v = \\lim_{s\\to 0} s \\cdot \\frac{50}{s^2(s+5)} = \\infty \\implies e_{ss} = \\frac{8}{\\infty} = \\mathbf{0}'
      },
      {
        title: '3. Nota Crítica de Estabilidade (Routh-Hurwitz)',
        description: 'Embora formalmente Tipo 2 garanta Kv = ∞, na equação característica s³ + 5s² + 0·s + 50 = 0 falta o termo em s¹ (sistema instável em malha fechada pura!). Na prática, usa-se um zero (PD ou Avanço) para estabilizar.',
        latex: 's^3 + 5s^2 + 50 = 0 \\text{ (coeficiente de } s^1 \\text{ nulo } \\implies \\text{instável com } G_c=1\\text{)}'
      }
    ],
    scilabCode: `// Exercício 3.2 - Análise de Tipo 2 à Rampa
s = poly(0, 's');
G = syslin('c', 50, (s^2)*(s+5));
disp("Polos de malha fechada com Gc=1:", roots(s^3 + 5*s^2 + 50));`
  },

  // ---------------------------------------------------------------------------
  // CONTROLADOR PROPORCIONAL-INTEGRAL (PI)
  // ---------------------------------------------------------------------------
  {
    id: 'pi-ex-slide-ex1',
    controllerId: 'PI',
    badge: 'Slide 03 • Exemplo 1',
    title: 'Exemplo 1 (Slide 03) — PI em G(s) = 1/[(s+1)(s+5)] Preservando sd = -3+j3',
    source: 'Slide 03 — PI para erro nulo ao degrau pelo lugar das raízes',
    statementLatex:
      '\\text{Para } G(s) = \\frac{1}{(s+1)(s+5)} \\text{ com } s_d = -3 + j3 \\; (\\zeta = 0{,}707,\\; K_0 = 13), \\text{ projete um controlador PI para zerar } e_{ss} \\text{ ao degrau mantendo o transitório.}',
    plantExpr: '1/((s+1)*(s+5))',
    plantLatex: '\\frac{1}{(s+1)(s+5)}',
    controllerExpr: '15.06*(s+0.899)/s',
    controllerLatex: 'G_c(s) = 15{,}06\\frac{s + 0{,}899}{s}',
    controllerBlockLabel: 'Controlador PI (ess = 0)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 6,
    whyThisController:
      'Com apenas o controlador proporcional $K_0 = 13$, obtém-se $K_{p,a} = 2{,}6$ e erro estacionário $e_P = 27{,}78\\%$. O **Controlador PI** adiciona um polo na origem (tornando a malha Tipo 1 e zerando $e_{ss}$) e um zero $z_i$ calculado com orçamento angular $\\varphi = 10^\\circ$ limitado pelo critério $|s_{\\text{lenta}}|/1{,}1$.',
    diagnostics: {
      systemType: 'Tipo 0 → Tipo 1 (após PI)',
      systemOrder: '2ª Ordem → 3ª Ordem',
      initialErrorLatex: 'K_{p,a} = 2{,}6 \\implies e_P = 27{,}78\\%',
      finalErrorLatex: 'K_p = \\infty \\implies e_{ss} = 0'
    },
    detailedSteps: [
      {
        title: '1. Triagem e Ganho Inicial $K_0$ pela Condição de Módulo ($s_d = -3+j3$)',
        description: 'Calculando $K_0 = \\frac{1}{|G(s_d)H(s_d)|}$, $K_{p,a}$ e $e_P$ ($|s_{\\text{lenta}}| = 1$):',
        latex:
          'K_0 = \\frac{1}{\\left|\\frac{1}{(-3+j3+1)(-3+j3+5)}\\right|} = \\frac{1}{\\frac{1}{|-2+j3|\\cdot|2+j3|}} = \\frac{1}{\\frac{1}{\\sqrt{4+9}\\cdot\\sqrt{4+9}}} = \\mathbf{13} \\;;\\; K_{p,a} = 13\\cdot\\frac{1}{5} = 2{,}6 \\;;\\; e_P = \\frac{1}{1+2{,}6} = 27{,}78\\% > 2\\% \\implies \\varphi = 10^\\circ'
      },
      {
        title: '2. Cálculo do Zero $z_i$ e Verificação do Limite do Dipolo',
        description: 'Com $|s_d| = 3\\sqrt{2} = 4{,}2426$ e $\\beta = 45^\\circ$:',
        latex: 'z_{i,\\max} = 4{,}2426\\frac{\\sin(10^\\circ)}{\\sin(55^\\circ)} = 0{,}8994 \\;;\\; z_i = \\min\\left(0{,}8994\\,;\\;\\frac{1}{1{,}1}\\right) = \\mathbf{0{,}899}'
      },
      {
        title: '3. Ajuste do Ganho $K_c$ pela Condição de Módulo (Passo a Passo)',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=s_d}$ (polos MF em $-2{,}57 \\pm j3{,}00$ e $-0{,}868$):',
        latex:
          'K_c = \\frac{1}{\\left|\\frac{s_d+0{,}899}{s_d}\\cdot G(s_d)\\right|} = K_0\\cdot\\frac{|s_d|}{|s_d+0{,}899|} = 13\\cdot\\frac{|-3+j3|}{|-3+j3+0{,}899|} \\;;\\; K_c = 13\\cdot\\frac{|-3+j3|}{|-2{,}101+j3|} = 13\\cdot\\frac{\\sqrt{(-3)^2+3^2}}{\\sqrt{(-2{,}101)^2+3^2}} = 13\\cdot\\frac{\\sqrt{18}}{\\sqrt{13{,}414}} = 13\\cdot\\frac{4{,}2426}{3{,}6625} \\approx \\mathbf{15{,}06} \\;;\\; \\mathbf{G_c(s) = 15{,}06\\frac{s+0{,}899}{s}}'
      }
    ],
    scilabCode: `// Slide 03 - Exemplo 1: G(s) = 1/((s+1)(s+5)) com PI
s = %s;
G = syslin('c', 1, (s+1)*(s+5));
Gc = syslin('c', 15.06*(s+0.899), s);
t = 0:0.01:6;
clf();
plot(t, csim('step', t, (13*G)/.1), 'r--', t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
legend(['Só P (K0=13, ess=27.8%)', 'Com PI (ess=0%)']);
xgrid();`
  },
  {
    id: 'pi-ex-1-4',
    controllerId: 'PI',
    badge: 'Exercício Adicional • Ex. 1.4 • Tipo 0 → Tipo 1',
    title: 'Exercício Adicional 1.4 — Tipo 0 com Controlador PI (Mudança de Tipo)',
    source: 'Lista Adicional — Projeto PI',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{50}{s^2 + 6s + 25}, \\text{ determine o erro à rampa unitária e projete um controlador que torne esse erro finito e igual a } e_{ss} = 0{,}25.',
    plantExpr: '50/(s^2+6*s+25)',
    plantLatex: '\\frac{50}{s^2+6s+25}',
    controllerExpr: '(s+2)/s',
    controllerLatex: 'G_c(s) = 1 + \\frac{2}{s} = \\frac{s+2}{s}',
    controllerBlockLabel: 'Controlador PI (Tipo 0 -> Tipo 1)',
    inputType: 'ramp',
    inputParams: { a1: 1, labelLatex: 'r(t) = t \\cdot u(t)' },
    tMax: 10,
    whyThisController:
      'O termo independente +25 impede fatorar s, logo a planta é Tipo 0 e tem erro infinito para entrada em rampa (Kv = 0 ⇒ ess = ∞). Como um compensador Lag ou Controlador P não altera o Tipo do sistema, escolhe-se um Controlador PI (Gc(s) = (Kp·s + Ki)/s) para adicionar 1 polo na origem e elevar a planta para Tipo 1.',
    diagnostics: {
      systemType: 'Tipo 0 → Tipo 1 (após PI)',
      systemOrder: '2ª Ordem (planta) → 3ª Ordem (com PI)',
      initialErrorLatex: 'K_v = 0 \\implies e_{ss} = \\infty',
      finalErrorLatex: 'K_v = 4 \\implies e_{ss} = \\frac{1}{4} = 0{,}25'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial (Sem Controlador)',
        description: 'Planta Tipo 0 submetida à rampa unitária não acompanha a entrada:',
        latex: 'K_v = \\lim_{s\\to 0} s \\cdot \\frac{50}{s^2+6s+25} = 0 \\implies e_{ss} = \\frac{1}{0} = \\infty'
      },
      {
        title: '2. Escolha do Controlador PI e Cálculo de Ki',
        description: 'Inserindo Gc(s) = (Kp·s + Ki)/s, calcula-se a nova constante de velocidade:',
        latex: 'K_v = \\lim_{s\\to 0} s \\cdot \\left(\\frac{K_p s + K_i}{s}\\right)\\frac{50}{s^2+6s+25} = \\frac{50 K_i}{25} = 2 K_i'
      },
      {
        title: '3. Imposição do Erro Desejado (ess = 0,25)',
        description: 'Igualando 1/Kv = 0,25 para obter Ki:',
        latex: '\\frac{1}{2K_i} = 0{,}25 \\implies 2K_i = 4 \\implies \\mathbf{K_i = 2}'
      },
      {
        title: '4. Escolha de Kp e Posicionamento do Zero',
        description: 'Adotando Kp = 1 (zero em s = -2, mais lento que os polos complexos em -3 ± j4), obtém-se estabilidade e erro exato:',
        latex: '\\mathbf{G_c(s) = 1 + \\frac{2}{s} = \\frac{s+2}{s}}'
      }
    ],
    scilabCode: `// Exercício 1.4 - Controlador PI (Tipo 0 -> Tipo 1)
s = poly(0, 's');
G = syslin('c', 50, s^2 + 6*s + 25);
Gc = syslin('c', s + 2, s);
T_sem = G / (1 + G);
T_com = (Gc*G) / (1 + Gc*G);
t = 0:0.02:10;
r = t;
y_sem = csim(r, t, T_sem);
y_com = csim(r, t, T_com);
disp("Erro à rampa sem PI (diverge da inclinação):", r($) - y_sem($));
disp("Erro à rampa com PI:", r($) - y_com($));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Rampa r(t)=t", "Sem PI (Tipo 0)", "Com PI (Tipo 1, ess=0.25)"]);
xgrid();`
  },
  {
    id: 'pi-ex-2-5',
    controllerId: 'PI',
    badge: 'Exercício Adicional • Ex. 2.5 • Tipo 1 → Tipo 2',
    title: 'Exercício Adicional 2.5 — Tipo 1 com Controlador PI (Mudança para Tipo 2)',
    source: 'Lista Adicional — Projeto PI',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{100}{s(s+10)}, \\text{ calcule o erro para a parábola } r(t) = 3t^2 \\cdot u(t) \\; (A = 6) \\text{ e projete um controlador que torne esse erro finito e igual a } e_{ss} = 0{,}12.',
    plantExpr: '100/(s*(s+10))',
    plantLatex: '\\frac{100}{s(s+10)}',
    controllerExpr: '(s+5)/s',
    controllerLatex: 'G_c(s) = 1 + \\frac{5}{s} = \\frac{s+5}{s}',
    controllerBlockLabel: 'Controlador PI (Tipo 1 -> Tipo 2)',
    inputType: 'parabola',
    inputParams: { a2: 3, labelLatex: 'r(t) = 3t^2 \\cdot u(t) \\; (R(s)=6/s^3)' },
    tMax: 10,
    whyThisController:
      'A planta é Tipo 1 (1 polo na origem). Para entrada parabólica, Ka = 0 e o erro diverge para infinito. Para rastrear parábola com erro finito, precisa-se de um Controlador PI para adicionar mais um integrador e elevar o sistema para Tipo 2.',
    diagnostics: {
      systemType: 'Tipo 1 → Tipo 2 (após PI)',
      systemOrder: '2ª Ordem → 3ª Ordem (com PI)',
      initialErrorLatex: 'K_a = 0 \\implies e_{ss} = \\infty',
      finalErrorLatex: 'K_a = 50 \\implies e_{ss} = \\frac{6}{50} = 0{,}12'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial (Planta Tipo 1)',
        description: 'Para r(t) = 3t²·u(t), tem-se L{3t²} = 6/s³ (amplitude A = 6 na forma A/s³). Como a planta é Tipo 1:',
        latex: 'K_a = \\lim_{s\\to 0} s^2 \\frac{100}{s(s+10)} = 0 \\implies e_{ss} = \\infty'
      },
      {
        title: '2. Cálculo de Ka com o Controlador PI',
        description: 'Inserindo Gc(s) = (Kp·s + Ki)/s, a malha passa a ter fator s² (Tipo 2):',
        latex: 'K_a = \\lim_{s\\to 0} s^2 \\cdot \\left(\\frac{K_p s + K_i}{s}\\right)\\frac{100}{s(s+10)} = \\frac{100 K_i}{10} = 10 K_i'
      },
      {
        title: '3. Imposição do Erro Requerido (ess = 0,12)',
        description: 'Lembrando que R(s) = 6/s³ (numerador 6):',
        latex: 'e_{ss} = \\frac{6}{10 K_i} = 0{,}12 \\implies 10 K_i = \\frac{6}{0{,}12} = 50 \\implies \\mathbf{K_i = 5}'
      },
      {
        title: '4. Escolha de Kp e Estabilidade',
        description: 'Escolhendo Kp = 1 (zero em s = -5, metade do polo -10): polinômio s³ + 10s² + 100s + 500 = 0 é estável (10·100 = 1000 > 500).',
        latex: '\\mathbf{G_c(s) = 1 + \\frac{5}{s} = \\frac{s+5}{s}}'
      }
    ],
    scilabCode: `// Exercício 2.5 - Controlador PI (Tipo 1 -> Tipo 2)
s = poly(0, 's');
G = syslin('c', 100, s*(s+10));
Gc = syslin('c', s + 5, s);
T_sem = G / (1 + G);
T_com = (Gc*G) / (1 + Gc*G);
t = 0:0.02:10;
r = 3 * (t.^2);
y_sem = csim(r, t, T_sem);
y_com = csim(r, t, T_com);
disp("Erro à parábola sem PI:", r($) - y_sem($));
disp("Erro à parábola com PI (alvo 0.12):", r($) - y_com($));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Parábola r(t)=3t^2", "Sem PI (Diverge)", "Com PI (ess=0.12)"]);
xgrid();`
  },
  {
    id: 'pi-ex-lgr-slide',
    controllerId: 'PI',
    badge: 'Proposto LGR • Tipo 0 → Tipo 1',
    title: 'Proposto LGR — Controlador PI para Zerar Erro ao Degrau Mantendo Transitório',
    source: 'Slides LGR / Projeto PI — Controle Clássico',
    statementLatex:
      '\\text{Dada a planta } G(s) = \\frac{1}{(s+1)(s+2)}, \\text{ projete um controlador PI via LGR para zerar o erro ao degrau unitário } (e_{ss} = 0) \\text{ mantendo polos dominantes em } s_d = -1{,}2 + j1{,}8.',
    plantExpr: '1/((s+1)*(s+2))',
    plantLatex: '\\frac{1}{(s+1)(s+2)}',
    controllerExpr: '4.12*(s+0.68)/s',
    controllerLatex: 'G_c(s) = 4{,}12\\frac{s + 0{,}68}{s} = 4{,}12 + \\frac{2{,}80}{s}',
    controllerBlockLabel: 'Controlador PI (LGR)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 8,
    whyThisController:
      'A planta é Tipo 0 (erro não-nulo ao degrau). Como o enunciado exige erro NULO (ess = 0) para entrada em degrau e também define polos dominantes sd, utiliza-se um Controlador PI cujo polo em s = 0 zera o erro e o zero zc = 0,68 é calculado pela condição de ângulo em sd.',
    diagnostics: {
      systemType: 'Tipo 0 → Tipo 1',
      systemOrder: '2ª Ordem → 3ª Ordem',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{1}{1+0{,}5} = 66{,}7\\%',
      finalErrorLatex: 'e_{ss,(PI)} = 0\\% \\; (s_d = -1{,}2 + j1{,}8)'
    },
    detailedSteps: [
      {
        title: '1. Soma dos Ângulos dos Polos em sd = -1,2 + j1,8',
        description: 'Incluindo o integrador (1/s) e os dois polos da planta (-1 e -2):',
        latex: '\\angle s_d = 123{,}7^\\circ \\;;\\; \\angle(s_d+1) = 96{,}34^\\circ \\;;\\; \\angle(s_d+2) = 66{,}04^\\circ \\implies \\sum\\theta_p = 286{,}08^\\circ'
      },
      {
        title: '2. Posição do Zero zc pela Condição de Ângulo',
        description: 'O zero (s + zc) deve contribuir com 286,08° - 180° = 106,08°:',
        latex: 'z_c = 1{,}2 - \\frac{1{,}8}{\\tan(106{,}08^\\circ)} = 1{,}2 + 0{,}519 \\implies \\mathbf{z_c = 0{,}68}'
      },
      {
        title: '3. Cálculo de Kp pela Condição de Módulo',
        description: 'Impondo |Gc(sd)·G(sd)| = 1:',
        latex: 'K_p = \\frac{|s_d||s_d+1||s_d+2|}{|s_d+0{,}68|} = \\frac{2{,}163 \\cdot 1{,}811 \\cdot 1{,}970}{1{,}873} \\approx \\mathbf{4{,}12}'
      },
      {
        title: '4. Forma Paralela Final do PI',
        description: 'Calculando Ki = Kp · zc = 4,12 · 0,68 = 2,80:',
        latex: '\\mathbf{G_c(s) = 4{,}12 + \\frac{2{,}80}{s} = 4{,}12\\frac{s+0{,}68}{s}}'
      }
    ],
    scilabCode: `// Proposto LGR - Controlador PI
s = poly(0, 's');
G = syslin('c', 1, (s+1)*(s+2));
Gc = syslin('c', 4.12*(s+0.68), s);
T_sem = G / (1 + G);
T_com = (Gc*G) / (1 + Gc*G);
t = 0:0.01:8;
y_sem = csim('step', t, T_sem);
y_com = csim('step', t, T_com);
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem PI (ess=66.7%)", "Com PI (ess=0%)"]);
xgrid();`
  },

  // ---------------------------------------------------------------------------
  // CONTROLADOR PROPORCIONAL-DERIVATIVO (PD)
  // ---------------------------------------------------------------------------
  {
    id: 'pd-ex-slide-11-s2',
    controllerId: 'PD',
    badge: 'Slide 02 (11/31) • L(s) = 1/s²',
    title: 'Exemplo Slide 11/31 — PD Real em L(s) = 1/s² (θ_def = +90°)',
    source: 'Slide 02 (p. 11/31) — Controlador PD real pelo lugar das raízes',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s^2}, \\text{ projete um controlador PD Real } (N = 10,\\; r = 11) \\text{ para posicionar os polos dominantes em } s_d = -3 + j3 \\; (\\zeta = 0{,}707).',
    plantExpr: '1/(s^2)',
    plantLatex: '\\frac{1}{s^2}',
    controllerExpr: '157.3*(s+2.657)/(s+29.22)',
    controllerLatex: 'G_c(s) = 157{,}3\\frac{s + 2{,}657}{s + 29{,}22}',
    controllerBlockLabel: 'Controlador PD Real (N=10)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'A planta $L(s) = 1/s^2$ (duplo integrador) oscila indefinidamente sem amortecimento com ganho P puro. Em $s_d = -3 + j3$, $\\angle L(s_d) = -2\\cdot 135^\\circ = -270^\\circ$, exigindo $\\theta_{\\text{def}} = +90^\\circ$. Com $N = 10$ ($r = 11$), $\\varphi_{\\max} = 104{,}7^\\circ > 90^\\circ$, permitindo resolver com 1 estágio PD Real ($m = 1$).',
    diagnostics: {
      systemType: 'Tipo 2 (2 polos na origem)',
      systemOrder: '2ª Ordem → 3ª Ordem (com filtro)',
      initialErrorLatex: 'e_{ss,(P)} \\text{ oscilatório } (\\zeta = 0)',
      finalErrorLatex: 'e_{ss,(PD)} = 0 \\; (M_p = 26\\% \\text{ sem } F,\\; 4{,}2\\% \\text{ com } F)'
    },
    detailedSteps: [
      {
        title: '1. Deficiência Angular em $s_d = -3 + j3$',
        description: 'Calculando o ângulo da planta $1/s^2$ e a deficiência $\\theta_{\\text{def}}$ ($\\varphi_{\\max} = 104{,}7^\\circ$ para $r=11$):',
        latex: '\\angle L(s_d) = -2 \\cdot 135^\\circ = -270^\\circ \\implies \\theta_{\\text{def}} = -180^\\circ - (-270^\\circ) = \\mathbf{+90^\\circ} \\;(\\text{folga } 14{,}7^\\circ)'
      },
      {
        title: '2. Polinômio em $z_c$ ($\\cot 90^\\circ = 0$, $c_2 = 11$, $c_1 = -\\sigma_d(r+1) = -36$, $c_0 = 18$)',
        description: 'Descarta-se a menor raiz ($z_c = 0{,}616$, que gera polo lento em $-0{,}78$) e adota-se a maior raiz:',
        latex:
          '11 z_c^2 - 36 z_c + 18 = 0 \\implies \\Delta = 36^2 - 4\\cdot 11\\cdot 18 = 504 \\;(\\sqrt{504} = 22{,}45) \\;;\\; z_c = \\frac{36 + 22{,}45}{22} = \\mathbf{2{,}657} \\;;\\; p_c = 11 \\cdot 2{,}657 = \\mathbf{29{,}22}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo (Passo a Passo Completo)',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)L(s)|}\\right|_{s=-3+j3}$ (polos MF em $-3 \\pm j3$ e $-23{,}22$):',
        latex:
          'K_c = \\frac{1}{\\left|\\frac{s_d+2{,}657}{(s_d+29{,}22)s_d^2}\\right|} = \\frac{|s_d+29{,}22|\\cdot|s_d|^2}{|s_d+2{,}657|} = \\frac{|-3+j3+29{,}22|\\cdot|-3+j3|^2}{|-3+j3+2{,}657|} \\;;\\; K_c = \\frac{|26{,}22+j3|\\cdot 18}{|-0{,}343+j3|} = \\frac{\\sqrt{26{,}22^2+3^2}\\cdot 18}{\\sqrt{(-0{,}343)^2+3^2}} = \\frac{26{,}396 \\cdot 18}{3{,}020} \\approx \\mathbf{157{,}3} \\;;\\; \\mathbf{G_c(s) = 157{,}3\\frac{s+2{,}657}{s+29{,}22}}'
      }
    ],
    scilabCode: `// Slide 02 (11/31) - PD Real (N=10): L(s) = 1/s^2, sd = -3+j3
s = %s;
G = syslin('c', 1, s^2);
Gc = syslin('c', 157.3*(s+2.657), s+29.22);
T_com = (Gc*G) /. 1;
t = 0:0.01:3; clf();
plot(t, csim('step', t, T_com), 'b-', 'LineWidth', 2);
legend(['Com PD Real (Kc=157.3)']);
xgrid();`
  },
  {
    id: 'pd-ex-slide-s3',
    controllerId: 'PD',
    badge: 'Slide 02 • PD Real (N=10)',
    title: 'Exemplo Completo (Slide 02) — PD Real em L(s) = 1/[s(s+3)] para sd = -3+j3',
    source: 'Slide 02 — Controlador PD real pelo lugar das raízes (Slides 22–29)',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s(s+3)}, \\text{ projete um controlador PD Real } (N = 10,\\; r = 11) \\text{ para } \\zeta = 0{,}707 \\text{ e } \\omega_d = 3\\text{ rad/s } (s_d = -3 + j3).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '188.5*(s+5.714)/(s+62.85)',
    controllerLatex: 'G_c(s) = 188{,}5\\frac{s + 5{,}714}{s + 62{,}85}',
    controllerBlockLabel: 'Controlador PD Real (N=10)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'Em $s_d = -3 + j3$, a planta $1/[s(s+3)]$ apresenta ângulo $\\angle L(s_d) = -135^\\circ - 90^\\circ = -225^\\circ$, gerando deficiência angular $\\theta_{\\text{def}} = +45^\\circ$. O **PD Real com filtro** ($N = 10 \\implies r = 11$) fornece o avanço necessário e é fisicamente realizável com amp-op.',
    diagnostics: {
      systemType: 'Tipo 1',
      systemOrder: '2ª Ordem → 3ª Ordem (com filtro)',
      initialErrorLatex: 'e_{ss} = 0',
      finalErrorLatex: 'e_{ss} = 0'
    },
    detailedSteps: [
      {
        title: '1. Passo 1 — Polo Desejado $s_d$ a partir de $\\zeta = 0{,}707$ e $\\omega_d = 3\\text{ rad/s}$',
        description: 'Calculando $M_p$, $t_p$, $\\sigma_d$ e $t_s$:',
        latex:
          'M_p = e^{-\\frac{\\pi\\zeta}{\\sqrt{1-\\zeta^2}}} = e^{-\\pi} = 4{,}3\\% \\;;\\; t_p = \\frac{\\pi}{\\omega_d} = \\frac{\\pi}{3} = 1{,}05\\text{ s} \\;;\\; \\sigma_d = \\frac{\\zeta\\cdot\\omega_d}{\\sqrt{1-\\zeta^2}} = \\frac{0{,}707\\cdot 3}{0{,}707} = 3 \\;;\\; t_s \\approx \\frac{4}{\\sigma_d} = 1{,}33\\text{ s} \\;;\\; \\mathbf{s_d = -3 + j3}'
      },
      {
        title: '2. Passo 2 — Deficiência de Fase ($\\theta_{\\text{def}}$) por Trigonometria',
        description: 'Para $L(s) = \\frac{1}{s(s+3)}$ (polos em $0$ e $-3$): $s_d - 0 = -3+j3$ e $s_d - (-3) = j3$:',
        latex:
          '\\theta_1 = \\operatorname{atan2}(3, -3) = 135^\\circ \\;;\\; \\theta_2 = \\operatorname{atan2}(3, 0) = 90^\\circ \\;;\\; \\angle L(s_d) = 0^\\circ - (135^\\circ + 90^\\circ) = -225^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - (-225^\\circ) = \\mathbf{+45^\\circ}'
      },
      {
        title: '3. Passos 3 e 4 — Fator de Filtro $N = 10$ ($r = 11$) e Polinômio em $z_c$',
        description:
          'Com $m = 1$ estágio ($\\varphi = 45^\\circ,\\; \\cot 45^\\circ = 1$), calculando $c_2 = r$, $c_1 = -[\\sigma_d(r+1)+\\omega_d(r-1)\\cot\\varphi]$ e $c_0 = \\sigma_d^2+\\omega_d^2$:',
        latex:
          'c_2 = 11 \\;;\\; c_1 = -[3\\cdot 12 + 3\\cdot 10\\cdot 1] = -66 \\;;\\; c_0 = 3^2 + 3^2 = 18 \\;;\\; 11 z_c^2 - 66 z_c + 18 = 0 \\implies \\Delta = 66^2 - 4\\cdot 11\\cdot 18 = 3564 \\;(\\sqrt{3564} = 59{,}70) \\;;\\; z_c = \\frac{66 + 59{,}70}{22} = \\mathbf{5{,}714} \\;(\\text{descarta } 0{,}286) \\;;\\; p_c = 11\\cdot 5{,}714 = \\mathbf{62{,}85}'
      },
      {
        title: '4. Passo 5 — Ganho $K_c$ pela Condição de Módulo (Passo a Passo Completo)',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)L(s)|}\\right|_{s=-3+j3}$:',
        latex:
          'K_c = \\frac{1}{\\left|\\frac{s_d+5{,}714}{(s_d+62{,}85)s_d(s_d+3)}\\right|} = \\frac{|s_d+62{,}85|\\cdot|s_d|\\cdot|s_d+3|}{|s_d+5{,}714|} = \\frac{|-3+j3+62{,}85|\\cdot|-3+j3|\\cdot|-3+j3+3|}{|-3+j3+5{,}714|} \\;;\\; K_c = \\frac{|59{,}85+j3|\\cdot|-3+j3|\\cdot|j3|}{|2{,}714+j3|} = \\frac{\\sqrt{59{,}85^2+3^2}\\cdot\\sqrt{(-3)^2+3^2}\\cdot 3}{\\sqrt{2{,}714^2+3^2}} \\;;\\; K_c = \\frac{59{,}925 \\cdot 4{,}2426 \\cdot 3}{4{,}0455} = \\frac{762{,}72}{4{,}0455} \\approx \\mathbf{188{,}5} \\;;\\; \\mathbf{G_c(s) = 188{,}5\\frac{s+5{,}714}{s+62{,}85}}'
      },
      {
        title: '5. Passo 6 — Parâmetros $K_p$, $T_d$, $K_d$ e Verificação em Malha Fechada',
        description:
          'Polos de malha fechada em $-3 \\pm j3$ e polo rápido em $-59{,}85$ ($20\\times$ mais rápido que $\\sigma_d = 3$). Sem pré-filtro $M_p = 7{,}0\\%$ e $t_p = 0{,}79\\text{ s}$; com pré-filtro $F(s) = \\frac{5{,}714}{s+5{,}714}$: $M_p = 4{,}3\\%$ e $t_p = 1{,}06\\text{ s}$:',
        latex:
          'K_p = \\frac{K_c}{r} = \\frac{188{,}5}{11} = 17{,}14 \\;;\\; T_d = \\frac{N}{p_c} = \\frac{10}{62{,}85} = 0{,}159\\text{ s} \\;;\\; K_d = K_p T_d = 2{,}73 \\;;\\; s^3 + 65{,}85s^2 + 377{,}1s + 1077{,}3 = (s^2+6s+18)(s+59{,}85) = 0'
      },
      {
        title: '6. Regra dos 10 V (E9) e Erro em Regime Permanente (E10) — Slide 26',
        description:
          'Sem pré-filtro o amp-op satura rápido ($\\Delta e$ admissível $12\\times$ menor); com o pré-filtro $F(s)$, atende à regra dos $\\pm 10\\text{ V}$ para $\\Delta e \\le 0{,}65\\text{ V}$. Como a planta é Tipo 1, o erro ao degrau é nulo e o erro à rampa é $0{,}175\\text{ V}$:',
        latex:
          'u(0^+) = K_c\\Delta e = 188{,}5\\,\\Delta e \\implies \\Delta e \\le \\frac{10}{188{,}5} = 0{,}053\\text{ V} \\;;\\; \\text{com } F(s):\\; u_{\\text{pico}} = 15{,}3\\,\\Delta e \\implies \\Delta e \\le \\frac{10}{15{,}3} = \\mathbf{0{,}65\\text{ V}} \\;;\\; K_{\\text{vel}} = K_p \\lim_{s\\to 0} s L(s) = 17{,}14 \\cdot \\frac{1}{3} = 5{,}71 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{5{,}71} = \\mathbf{0{,}175\\text{ V}} \\;;\\; e_{ss,\\text{degrau}} = 0'
      },
      {
        title: '7. Implementação Analógica: Resistores, Capacitores (E11) e Banda do Amp-Op (E12) — Slides 27–28',
        description:
          'Escolhendo $C_1 = 10\\,\\mu\\text{F}$ (com estágio inversor $R_1\\parallel C_1$ e $R_2\\parallel C_2$, inversor unitário de $10\\text{ k}\\Omega$ e subtrator $e = r - y$). Valores comerciais (E96): $R_1 = 17{,}4\\text{ k}\\Omega$, $R_2 = 301\\text{ k}\\Omega$, $C_2 = 47\\text{ nF}\\parallel 6{,}8\\text{ nF} = 53{,}8\\text{ nF}$ (resultando em $z_c = 5{,}75$, $p_c = 61{,}75$, $K_p = 17{,}3$, desvios $<2\\%$):',
        latex:
          'R_1 = \\frac{1}{z_c C_1} = \\frac{1}{5{,}714\\cdot 10^{-5}} = \\mathbf{17{,}5\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = 17{,}14\\cdot 17{,}5\\text{ k}\\Omega = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\frac{1}{62{,}85\\cdot 300\\cdot 10^3} = \\mathbf{53{,}0\\text{ nF}} \\;;\\; \\frac{C_1}{C_2} = \\frac{10\\,\\mu\\text{F}}{53{,}0\\text{ nF}} = 188{,}5 = K_c \\;;\\; \\frac{\\text{GBW}}{K_c} = \\frac{1\\text{ MHz}}{188{,}5} = 5{,}3\\text{ kHz} \\gg \\frac{p_c}{2\\pi} = 10\\text{ Hz}'
      }
    ],
    scilabCode: `// Slide 02 - PD Real (N=10): L(s) = 1/(s(s+3)), sd = -3+j3
s = %s;
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 188.5*(s+5.714), s+62.85);
T_sem = G /. 1;
T_com = (Gc*G) /. 1;
t = 0:0.01:3; clf();
plot(t, csim('step', t, T_sem), 'r--', t, csim('step', t, T_com), 'b-', 'LineWidth', 2);
legend(['Sem PD', 'Com PD Real (N=10)']);
xgrid();`
  },
  {
    id: 'pd-ex-slide-prop1',
    controllerId: 'PD',
    badge: 'Slide 02 • Proposto (N=8)',
    title: 'Exercício Proposto 1 (Slide 31) — PD Real em L(s) = 1/[s(s+3)] com N = 8 e sd = -3+j3',
    source: 'Slide 02 — Controlador PD real pelo lugar das raízes (Slides 30–31)',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s(s+3)}, \\text{ refaça o projeto do controlador PD Real com } N = 8 \\; (r = 9) \\text{ para } s_d = -3 + j3 \\; (\\zeta = 0{,}707,\\; \\omega_d = 3\\text{ rad/s}).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '152.4*(s+5.646)/(s+50.81)',
    controllerLatex: 'G_c(s) = 152{,}4\\frac{s + 5{,}646}{s + 50{,}81}',
    controllerBlockLabel: 'Controlador PD Real (N=8)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'Mantendo $s_d = -3 + j3$, a deficiência angular continua $\\theta_{\\text{def}} = +45^\\circ$. Reduzir o fator de filtro de $N = 10$ para $N = 8$ ($r = 9$) aproxima o polo $p_c$ e reduz o ganho de alta frequência $K_c$ de $188{,}5$ para $152{,}4$, aliviando a saturação inicial do amp-op.',
    diagnostics: {
      systemType: 'Tipo 1',
      systemOrder: '2ª Ordem → 3ª Ordem (com filtro)',
      initialErrorLatex: 'e_{ss} = 0',
      finalErrorLatex: 'e_{ss} = 0'
    },
    detailedSteps: [
      {
        title: '1. Polo Desejado $s_d$ e Deficiência Angular $\\theta_{\\text{def}}$',
        description: 'Com $\\sigma_d = 3$ e $\\omega_d = 3\\text{ rad/s}$ ($s_d = -3 + j3$), os polos em $0$ e $-3$ dão:',
        latex:
          '\\theta_1 = \\operatorname{atan2}(3, -3) = 135^\\circ \\;;\\; \\theta_2 = \\operatorname{atan2}(3, 0) = 90^\\circ \\;;\\; \\angle L(s_d) = -225^\\circ \\implies \\theta_{\\text{def}} = \\mathbf{+45{,}0^\\circ}'
      },
      {
        title: '2. Polinômio em $z_c$ para $N = 8$ ($r = 9$, $\\cot 45^\\circ = 1$)',
        description: 'Calculando $c_2 = r$, $c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi]$ e $c_0 = \\sigma_d^2 + \\omega_d^2$:',
        latex:
          'c_2 = 9 \\;;\\; c_1 = -[3\\cdot 10 + 3\\cdot 8\\cdot 1] = -54{,}0 \\;;\\; c_0 = 18 \\;;\\; 9z_c^2 - 54{,}0 z_c + 18 = 0 \\implies \\Delta = 2268 \\;(\\sqrt{\\Delta} = 47{,}62) \\;;\\; z_c = \\frac{54{,}0 + 47{,}62}{18} = \\mathbf{5{,}646} \\;(\\text{descarta } 0{,}354) \\;;\\; p_c = 9\\cdot 5{,}646 = \\mathbf{50{,}81}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)L(s)|}\\right|_{s=-3+j3}$:',
        latex:
          'K_c = \\frac{|s_d+50{,}81|\\cdot|s_d|\\cdot|s_d+3|}{|s_d+5{,}646|} = \\frac{|-3+j3+50{,}81|\\cdot|-3+j3|\\cdot|j3|}{|2{,}646+j3|} = \\frac{47{,}906\\cdot 4{,}2426\\cdot 3}{4{,}0000} \\approx \\mathbf{152{,}4} \\;;\\; \\mathbf{G_c(s) = 152{,}4\\frac{s+5{,}646}{s+50{,}81}}'
      },
      {
        title: '4. Parâmetros $K_p$, $T_d$, Polos de Malha Fechada e Pré-Filtro $F(s)$',
        description: 'Sem $F(s)$: $M_p = 7{,}1\\%$ e $t_p = 0{,}79\\text{ s}$. Com pré-filtro $F(s) = \\frac{5{,}646}{s+5{,}646}$: $M_p = 4{,}3\\%$ e $t_p = 1{,}07\\text{ s}$:',
        latex:
          'K_p = \\frac{152{,}4}{9} = \\mathbf{16{,}94} \\;;\\; T_d = \\frac{8}{50{,}81} = \\mathbf{0{,}157\\text{ s}} \\;;\\; K_d = 2{,}67 \\;;\\; \\text{Polos MF: } -3 \\pm j3 \\text{ e } -47{,}81'
      },
      {
        title: '5. Regra dos 10 V, Erro em Regime e Componentes ($C_1 = 10\\,\\mu\\text{F}$)',
        description: 'Pico de $u$ por volt de $\\Delta e$: $152{,}4$ (sem $F$) e $14{,}8$ (com $F$). Erro à rampa e circuito RC:',
        latex:
          'K_{\\text{vel}} = \\frac{16{,}94}{3} = 5{,}65 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{5{,}65} = 0{,}177\\text{ V} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\mathbf{17{,}7\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\mathbf{65{,}6\\text{ nF}}'
      }
    ],
    scilabCode: `// Slide 31 - Proposto 1: N = 8, L(s) = 1/(s(s+3)), sd = -3+j3
s = %s;
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 152.4*(s+5.646), s+50.81);
T_com = (Gc*G) /. 1;
t = 0:0.01:3; clf();
plot(t, csim('step', t, T_com), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'pd-ex-slide-prop2',
    controllerId: 'PD',
    badge: 'Slide 02 • Proposto (N=12)',
    title: 'Exercício Proposto 2 (Slide 31) — PD Real em L(s) = 1/[s(s+3)] com N = 12 e sd = -3+j3',
    source: 'Slide 02 — Controlador PD real pelo lugar das raízes (Slides 30–31)',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s(s+3)}, \\text{ refaça o projeto do controlador PD Real com } N = 12 \\; (r = 13) \\text{ para } s_d = -3 + j3 \\; (\\zeta = 0{,}707,\\; \\omega_d = 3\\text{ rad/s}).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '224.6*(s+5.760)/(s+74.87)',
    controllerLatex: 'G_c(s) = 224{,}6\\frac{s + 5{,}760}{s + 74{,}87}',
    controllerBlockLabel: 'Controlador PD Real (N=12)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'Com $N = 12$ ($r = 13$), o polo do filtro $p_c = 74{,}87$ fica ainda mais afastado dos polos dominantes ($-71{,}87$ em malha fechada), aproximando o comportamento do PD ideal, ao custo de elevar o ganho de alta frequência para $K_c = 224{,}6$.',
    diagnostics: {
      systemType: 'Tipo 1',
      systemOrder: '2ª Ordem → 3ª Ordem (com filtro)',
      initialErrorLatex: 'e_{ss} = 0',
      finalErrorLatex: 'e_{ss} = 0'
    },
    detailedSteps: [
      {
        title: '1. Polo Desejado $s_d$ e Deficiência Angular $\\theta_{\\text{def}}$',
        description: 'Para $s_d = -3 + j3$ e $L(s) = \\frac{1}{s(s+3)}$:',
        latex:
          '\\theta_1 = 135^\\circ \\;;\\; \\theta_2 = 90^\\circ \\;;\\; \\angle L(s_d) = -225^\\circ \\implies \\theta_{\\text{def}} = \\mathbf{+45{,}0^\\circ}'
      },
      {
        title: '2. Polinômio em $z_c$ para $N = 12$ ($r = 13$, $\\cot 45^\\circ = 1$)',
        description: 'Calculando $c_2 = 13$, $c_1 = -[3\\cdot 14 + 3\\cdot 12\\cdot 1] = -78{,}0$ e $c_0 = 18$:',
        latex:
          '13z_c^2 - 78{,}0 z_c + 18 = 0 \\implies \\Delta = 5148 \\;(\\sqrt{\\Delta} = 71{,}75) \\;;\\; z_c = \\frac{78{,}0 + 71{,}75}{26} = \\mathbf{5{,}760} \\;(\\text{descarta } 0{,}240) \\;;\\; p_c = 13\\cdot 5{,}760 = \\mathbf{74{,}87}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)L(s)|}\\right|_{s=-3+j3}$:',
        latex:
          'K_c = \\frac{|s_d+74{,}87|\\cdot|s_d|\\cdot|s_d+3|}{|s_d+5{,}760|} = \\frac{71{,}937\\cdot 4{,}2426\\cdot 3}{4{,}0762} \\approx \\mathbf{224{,}6} \\;;\\; \\mathbf{G_c(s) = 224{,}6\\frac{s+5{,}760}{s+74{,}87}}'
      },
      {
        title: '4. Parâmetros $K_p$, $T_d$, Polos de Malha Fechada e Pré-Filtro $F(s)$',
        description: 'Sem $F(s)$: $M_p = 7{,}0\\%$ e $t_p = 0{,}79\\text{ s}$. Com pré-filtro $F(s) = \\frac{5{,}760}{s+5{,}760}$: $M_p = 4{,}3\\%$ e $t_p = 1{,}06\\text{ s}$:',
        latex:
          'K_p = \\frac{224{,}6}{13} = \\mathbf{17{,}28} \\;;\\; T_d = \\frac{12}{74{,}87} = \\mathbf{0{,}160\\text{ s}} \\;;\\; K_d = 2{,}77 \\;;\\; \\text{Polos MF: } -3 \\pm j3 \\text{ e } -71{,}87'
      },
      {
        title: '5. Regra dos 10 V, Erro em Regime e Componentes ($C_1 = 10\\,\\mu\\text{F}$)',
        description: 'Pico de $u$ por volt de $\\Delta e$: $224{,}6$ (sem $F$) e $15{,}6$ (com $F$). Erro à rampa e circuito RC:',
        latex:
          'K_{\\text{vel}} = \\frac{17{,}28}{3} = 5{,}76 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{5{,}76} = 0{,}174\\text{ V} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\mathbf{17{,}4\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\mathbf{44{,}5\\text{ nF}}'
      }
    ],
    scilabCode: `// Slide 31 - Proposto 2: N = 12, L(s) = 1/(s(s+3)), sd = -3+j3
s = %s;
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 224.6*(s+5.760), s+74.87);
T_com = (Gc*G) /. 1;
t = 0:0.01:3; clf();
plot(t, csim('step', t, T_com), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'pd-ex-slide-prop3',
    controllerId: 'PD',
    badge: 'Slide 02 • Proposto (sd=-2+j2)',
    title: 'Exercício Proposto 3 (Slide 31) — PD Real em L(s) = 1/[s(s+3)] com N = 10 e sd = -2+j2',
    source: 'Slide 02 — Controlador PD real pelo lugar das raízes (Slides 30–31)',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s(s+3)}, \\text{ projete o controlador PD Real com } N = 10 \\; (r = 11) \\text{ para um polo desejado mais lento } s_d = -2 + j2 \\; (\\zeta = 0{,}707,\\; \\omega_d = 2\\text{ rad/s}).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '86.9*(s+7.540)/(s+82.94)',
    controllerLatex: 'G_c(s) = 86{,}9\\frac{s + 7{,}540}{s + 82{,}94}',
    controllerBlockLabel: 'Controlador PD Real (N=10)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 4,
    whyThisController:
      'Para $s_d = -2 + j2$, a deficiência de fase cai para $\\theta_{\\text{def}} = +18{,}4^\\circ$. Como $\\theta_{\\text{def}} > 0$, ainda é necessário um **PD Real** de 1 estágio, porém com ganho $K_c = 86{,}9$ bem menor e pico de atuação de apenas $7{,}5\\text{ V/V}$ com pré-filtro.',
    diagnostics: {
      systemType: 'Tipo 1',
      systemOrder: '2ª Ordem → 3ª Ordem (com filtro)',
      initialErrorLatex: 'e_{ss} = 0',
      finalErrorLatex: 'e_{ss} = 0'
    },
    detailedSteps: [
      {
        title: '1. Polo Desejado $s_d = -2 + j2$ e Deficiência Angular $\\theta_{\\text{def}}$',
        description: 'Vetores dos polos $0$ e $-3$ até $s_d = -2 + j2$: $s_d - 0 = -2 + j2$ e $s_d - (-3) = 1 + j2$:',
        latex:
          '\\theta_1 = \\operatorname{atan2}(2, -2) = 135^\\circ \\;;\\; \\theta_2 = \\operatorname{atan2}(2, 1) = 63{,}43^\\circ \\;;\\; \\angle L(s_d) = -198{,}43^\\circ \\implies \\theta_{\\text{def}} = -180^\\circ - (-198{,}43^\\circ) = \\mathbf{+18{,}4^\\circ}'
      },
      {
        title: '2. Polinômio em $z_c$ para $N = 10$ ($r = 11$, $\\cot 18{,}43^\\circ = 3$)',
        description: 'Com $\\sigma_d = 2$, $\\omega_d = 2$ e $\\cot\\varphi = 3$: $c_2 = 11$, $c_1 = -[2\\cdot 12 + 2\\cdot 10\\cdot 3] = -84{,}0$ e $c_0 = 2^2 + 2^2 = 8$:',
        latex:
          '11z_c^2 - 84{,}0 z_c + 8 = 0 \\implies \\Delta = 6704 \\;(\\sqrt{\\Delta} = 81{,}88) \\;;\\; z_c = \\frac{84{,}0 + 81{,}88}{22} = \\mathbf{7{,}540} \\;(\\text{descarta } 0{,}096) \\;;\\; p_c = 11\\cdot 7{,}540 = \\mathbf{82{,}94}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)L(s)|}\\right|_{s=-2+j2}$:',
        latex:
          'K_c = \\frac{|s_d+82{,}94|\\cdot|s_d|\\cdot|s_d+3|}{|s_d+7{,}540|} = \\frac{80{,}964\\cdot 2{,}8284\\cdot 2{,}2361}{5{,}8899} \\approx \\mathbf{86{,}9} \\;;\\; \\mathbf{G_c(s) = 86{,}9\\frac{s+7{,}540}{s+82{,}94}}'
      },
      {
        title: '4. Parâmetros $K_p$, $T_d$, Polos de Malha Fechada e Pré-Filtro $F(s)$',
        description: 'Sem $F(s)$: $M_p = 4{,}8\\%$ e $t_p = 1{,}41\\text{ s}$. Com pré-filtro $F(s) = \\frac{7{,}540}{s+7{,}540}$: $M_p = 4{,}3\\%$ e $t_p = 1{,}58\\text{ s}$:',
        latex:
          'K_p = \\frac{86{,}9}{11} = \\mathbf{7{,}90} \\;;\\; T_d = \\frac{10}{82{,}94} = \\mathbf{0{,}121\\text{ s}} \\;;\\; K_d = 0{,}95 \\;;\\; \\text{Polos MF: } -2 \\pm j2 \\text{ e } -81{,}94'
      },
      {
        title: '5. Regra dos 10 V, Erro em Regime e Componentes ($C_1 = 10\\,\\mu\\text{F}$)',
        description: 'Pico de $u$ por volt de $\\Delta e$: $86{,}9$ (sem $F$) e $7{,}5$ (com $F$). Erro à rampa e circuito RC:',
        latex:
          'K_{\\text{vel}} = \\frac{7{,}90}{3} = 2{,}63 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{2{,}63} = 0{,}380\\text{ V} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\mathbf{13{,}3\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = \\mathbf{105\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\mathbf{115{,}0\\text{ nF}}'
      }
    ],
    scilabCode: `// Slide 31 - Proposto 3: N = 10, L(s) = 1/(s(s+3)), sd = -2+j2
s = %s;
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 86.9*(s+7.540), s+82.94);
T_com = (Gc*G) /. 1;
t = 0:0.01:4; clf();
plot(t, csim('step', t, T_com), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'pd-ex-slide-lgr',
    controllerId: 'PD',
    badge: 'Slide LGR • Transitório',
    title: 'Exemplo Clássico de Slide — Projeto de Controlador PD via LGR',
    source: 'Slides de Controle — Projeto Controlador PD (LGR)',
    statementLatex:
      '\\text{Dada a planta } G(s) = \\frac{1}{s(s+4)(s+6)}, \\text{ projete um controlador PD } G_c(s) = K_d(s + z_c) \\text{ para obter } \\%OS \\le 16{,}3\\% \\; (\\zeta = 0{,}5) \\text{ e tempo de acomodação } T_s = 1{,}33\\text{ s}.',
    plantExpr: '1/(s*(s+4)*(s+6))',
    plantLatex: '\\frac{1}{s(s+4)(s+6)}',
    controllerExpr: '36*(s+4)',
    controllerLatex: 'G_c(s) = 36(s+4) = 144 + 36s',
    controllerBlockLabel: 'Controlador PD (LGR)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 3,
    whyThisController:
      'A planta já é Tipo 1 (erro nulo ao degrau), porém sua resposta em malha fechada com controlador P puro é lenta e não atinge Ts = 1,33s mantendo ζ = 0,5. O Controlador PD adiciona um zero real que fornece avanço de fase e puxa o LGR para a esquerda, atingindo exatamente os polos desejados sd = -3 + j5,196.',
    diagnostics: {
      systemType: 'Tipo 1 (mantido pelo PD)',
      systemOrder: '3ª Ordem (com cancelamento polo-zero em -4, dinâmica dominante 2ª ordem)',
      initialErrorLatex: 'e_{ss,(P)} = 0 \\text{ (mas } T_s \\text{ lento)}',
      finalErrorLatex: 'e_{ss,(PD)} = 0 \\; (T_s = 1{,}33\\text{ s}, \\%OS = 16{,}3\\%)'
    },
    detailedSteps: [
      {
        title: '1. Cálculo dos Polos Dominantes Desejados (sd)',
        description: 'Com ζ = 0,5 e σd = 4 / Ts = 4 / 1,33 = 3:',
        latex: '\\omega_d = \\sigma_d \\frac{\\sqrt{1-\\zeta^2}}{\\zeta} = 3\\sqrt{3} \\approx 5{,}196 \\implies \\mathbf{s_d = -3 + j5{,}196}'
      },
      {
        title: '2. Cálculo da Deficiência Angular em sd',
        description: 'Somando os ângulos dos polos da planta (0, -4, -6) em sd = -3 + j5,196:',
        latex: '\\theta_1 = 120^\\circ \\;;\\; \\theta_2 = 79{,}11^\\circ \\;;\\; \\theta_3 = 60^\\circ \\implies \\phi_d = (120 + 79{,}11 + 60) - 180^\\circ = 79{,}11^\\circ'
      },
      {
        title: '3. Posicionamento do Zero zc do PD',
        description: 'Aplicando a relação trigonométrica no ponto sd:',
        latex: 'z_c = 3 + \\frac{5{,}196}{\\tan(79{,}11^\\circ)} = 3 + 1{,}00 = \\mathbf{4{,}00} \\; (\\text{cancela o polo em } -4)'
      },
      {
        title: '4. Ajuste do Ganho Kd pela Condição de Módulo',
        description: 'Com zc = 4, o fator (s+4) simplifica com o polo da planta:',
        latex: 'K_d = |s_d| \\cdot |s_d + 6| = 6 \\cdot 6 = \\mathbf{36} \\implies \\mathbf{G_c(s) = 36(s+4) = 144 + 36s}'
      }
    ],
    scilabCode: `// Exemplo Clássico - Controlador PD via LGR
s = poly(0, 's');
G = syslin('c', 1, s*(s+4)*(s+6));
Gc = syslin('c', 36*(s+4), 1);
T_sem = G / (1 + G);
T_com = (Gc*G) / (1 + Gc*G);
t = 0:0.005:3;
y_sem = csim('step', t, T_sem);
y_com = csim('step', t, T_com);
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem PD (K=1, Lento)", "Com PD: 36(s+4) (Ts=1.33s)"]);
xgrid();`
  },
  {
    id: 'pd-ex-proposto',
    controllerId: 'PD',
    badge: 'Proposto • Servo Motor',
    title: 'Exercício Proposto — Controlador PD para Servo de Posição',
    source: 'Exercícios Propostos — Controle PD',
    statementLatex:
      '\\text{Para o servo motor } G(s) = \\frac{10}{s(s+2)}, \\text{ projete um controlador PD para acelerar a resposta obtendo } \\zeta = 0{,}707 \\text{ e } \\omega_n = 4\\text{ rad/s } (s_d = -2{,}828 + j2{,}828).',
    plantExpr: '10/(s*(s+2))',
    plantLatex: '\\frac{10}{s(s+2)}',
    controllerExpr: '0.366*(s+4.374)',
    controllerLatex: 'G_c(s) = 0{,}366(s + 4{,}374) = 1{,}60 + 0{,}366s',
    controllerBlockLabel: 'Controlador PD (Servo)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 4,
    whyThisController:
      'Com apenas ganho P, a parte real dos polos em malha fechada fica presa em σ = -1 (metade da soma dos polos 0 e -2), impedindo alcançar σd = -2,828. Somente um zero derivativo (PD) consegue deslocar o LGR para além de -1 e acelerar a resposta.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem',
      initialErrorLatex: '\\sigma_{\\text{max}}(P) = -1 \\text{ (não atinge } -2{,}828)',
      finalErrorLatex: 's_d = -2{,}828 \\pm j2{,}828 \\; (e_{ss} = 0)'
    },
    detailedSteps: [
      {
        title: '1. Cálculo dos Ângulos da Planta em sd = -2,828 + j2,828',
        description: 'Ângulos dos polos s = 0 e s = -2:',
        latex: '\\angle s_d = 135^\\circ \\;;\\; \\angle(s_d+2) = 106{,}33^\\circ \\implies \\phi_d = 241{,}33^\\circ - 180^\\circ = 61{,}33^\\circ'
      },
      {
        title: '2. Posição do Zero zc do PD',
        description: 'Calculando zc para fornecer +61,33°:',
        latex: 'z_c = 2{,}828 + \\frac{2{,}828}{\\tan(61{,}33^\\circ)} = 2{,}828 + 1{,}546 = \\mathbf{4{,}374}'
      },
      {
        title: '3. Ganho Kd pela Condição de Módulo',
        description: 'Impondo |Gc(sd)·G(sd)| = 1:',
        latex: 'K_d = \\frac{4 \\cdot 2{,}947}{10 \\cdot 3{,}223} = \\mathbf{0{,}366} \\implies \\mathbf{G_c(s) = 1{,}60 + 0{,}366s}'
      }
    ],
    scilabCode: `// Proposto Servo Motor - Controlador PD
s = poly(0, 's');
G = syslin('c', 10, s*(s+2));
Gc = syslin('c', 0.366*(s+4.374), 1);
T_sem = G / (1 + G);
T_com = (Gc*G) / (1 + Gc*G);
t = 0:0.01:4;
y_sem = csim('step', t, T_sem);
y_com = csim('step', t, T_com);
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem PD (Oscilatório)", "Com PD (zeta=0.707, wn=4)"]);
xgrid();`
  },

  // ---------------------------------------------------------------------------
  // CONTROLADORES POR ATRASO E AVANÇO DE FASE (LAG & LEAD)
  // ---------------------------------------------------------------------------
  {
    id: 'fase-slide-13-21',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Slide 13/21 • Passo a Passo Completo',
    title: 'Exemplo Completo do Slide 13/21 — Projeto Lag Detalhado',
    source: 'Slide 13/21 — Aula Projeto Compensador Atraso de Fase',
    statementLatex:
      '\\text{Planta: } G(s) = \\frac{1}{(s+1)(s+5)} \\;|\\; \\text{Requisitos: Polos dominantes em } s_d = -3 + j3 \\text{ e } e_{ss}(\\text{degrau}) \\le 5\\%.',
    plantExpr: '1/((s+1)*(s+5))',
    plantLatex: '\\frac{1}{(s+1)(s+5)}',
    controllerExpr: '14.77*(s+0.909)/(s+0.124)',
    controllerLatex: 'G_c(s) = 14{,}77\\frac{s + 0{,}909}{s + 0{,}124}',
    controllerBlockLabel: 'Compensador Lag (sd = -3+j3)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 6,
    whyThisController:
      'Para posicionar os polos dominantes em $s_d = -3 + j3$, o ganho $P$ necessário é $K_0 = 13$, resultando em $K_{p,\\text{atual}} = 2{,}6$ e erro de $27{,}8\\%$ ($> 5\\%$). Como os polos dominantes já estão na posição exata, o Compensador Lag multiplica $K_p$ por $\\beta = 7{,}31$ sem desviar $s_d$.',
    diagnostics: {
      systemType: 'Tipo 0 (0 polos na origem)',
      systemOrder: '2ª Ordem (s² + 6s + 5)',
      initialErrorLatex: 'e_{ss,(K_0=13)} = \\frac{1}{1+2{,}6} = 27{,}8\\%',
      finalErrorLatex: 'e_{ss,(Lag)} = \\frac{1}{1+21{,}6} = 4{,}4\\% \\le 5\\%'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial e Passo 0 (Triagem)',
        description: 'Calculando $K_{p,0}$ da planta sem compensação, o $K_{p,\\text{req}}$ para $e_{ss} \\le 5\\%$ e o limite do dipolo pelo polo mais lento $|s_{\\text{lenta}}| = 1$:',
        latex: 'K_{p,0} = \\lim_{s\\to 0} \\frac{1}{(s+1)(s+5)} = \\frac{1}{5} = 0{,}2 \\;;\\; \\frac{1}{1+K_{p,\\text{req}}} = 0{,}05 \\implies K_{p,\\text{req}} = \\mathbf{19} \\;;\\; z_{\\text{dipolo}} = \\frac{1}{1{,}1} \\approx \\mathbf{0{,}909}'
      },
      {
        title: '2. Passos 1 a 3 — Ganho $K_0$, $K_{p,\\text{atual}}$, Fator $\\beta$ e Tolerância $\\varphi$',
        description: 'Aplicando $K_0 = \\left.\\frac{1}{|G(s)H(s)|}\\right|_{s=-3+j3}$ com $G(s)=\\frac{1}{(s+1)(s+5)}$ e $H(s)=1$:',
        latex:
          'K_0 = \\frac{1}{\\left|\\frac{1}{(-3+j3+1)(-3+j3+5)}\\right|} = \\frac{1}{\\frac{1}{|-2+j3|\\cdot|2+j3|}} = \\frac{1}{\\frac{1}{\\sqrt{(-2)^2+3^2}\\cdot\\sqrt{2^2+3^2}}} = \\frac{1}{\\frac{1}{\\sqrt{13}\\cdot\\sqrt{13}}} = \\mathbf{13} \\;;\\; K_{p,a} = 13 \\cdot \\frac{1}{5} = 2{,}6 \\; (e_p = 27{,}8\\% > 2\\% \\implies \\varphi = 10^\\circ) \\;;\\; \\beta = \\frac{19}{2{,}6} \\approx \\mathbf{7{,}31}'
      },
      {
        title: '3. Passo 4 — Polinômio Trigonométrico para $z$ e $p$',
        description: 'Impondo $\\tan(\\theta_z - \\theta_p) = \\tan(10^\\circ)$ com $z = 7{,}31p$ em $s_d = -3 + j3$ e comparando $z_{\\max}$ com $z_{\\text{dipolo}}$:',
        latex: '7{,}31p^2 - 132{,}24p + 18 = 0 \\implies p_{\\max} \\approx 0{,}137 \\implies z_{\\max} = 7{,}31 \\cdot 0{,}137 \\approx 1{,}002 \\implies z = \\min(1{,}002;\\, 0{,}909) = \\mathbf{0{,}909} \\;;\\; p = \\frac{0{,}909}{7{,}31} \\approx \\mathbf{0{,}124}'
      },
      {
        title: '4. Passo 5 — Ajuste de Ganho $K_c$ pela Condição de Módulo e Conferência',
        description: 'Aplicando $K_c = K_0\\frac{|s_d+p|}{|s_d+z|}$ em $s_d = -3+j3$ ($z=0{,}909,\\; p=0{,}124$) e conferindo $K_{p,\\text{novo}}$ e $e_{ss}$:',
        latex:
          'K_c = 13\\cdot\\frac{|-3+j3+0{,}124|}{|-3+j3+0{,}909|} = 13\\cdot\\frac{|-2{,}876+j3|}{|-2{,}091+j3|} = 13\\cdot\\frac{\\sqrt{(-2{,}876)^2+3^2}}{\\sqrt{(-2{,}091)^2+3^2}} \\;;\\; K_c = 13\\cdot\\frac{\\sqrt{17{,}271}}{\\sqrt{13{,}372}} = 13\\cdot\\frac{4{,}156}{3{,}657} \\approx \\mathbf{14{,}77} \\;;\\; K_{p,\\text{novo}} = \\frac{14{,}77 \\cdot 7{,}31}{5} = 21{,}6 \\implies \\mathbf{e_{ss} = \\frac{1}{1+21{,}6} = 4{,}4\\% \\le 5\\%}'
      }
    ],
    scilabCode: `// Exemplo Completo Slide 13/21 - Lag
s = poly(0, 's');
G = syslin('c', 1, (s+1)*(s+5));
Gc = syslin('c', 14.77*(s+0.909), s+0.124);
t = 0:0.01:6;
y_sem = csim('step', t, (13*G)/(1+13*G));
y_com = csim('step', t, (Gc*G)/(1+Gc*G));
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Com K0=13 (ess=27.8%)", "Com Lag (ess=4.4%)"]);
xgrid();`
  },
  {
    id: 'fase-ex-1-1',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 1.1 • Lag Tipo 0',
    title: 'Exercício Adicional 1.1 — Tipo 0 com Projeto de Compensador Lag',
    source: 'Lista Adicional — Método Completo do Professor',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{20}{(s+2)(s+5)}, \\text{ determine tipo, ordem e erro ao degrau unitário sem compensação. Em seguida, projete um controlador pelo método do professor para manter } s_d = -3{,}5 + j3{,}5 \\text{ e reduzir o erro ao degrau para } e_{ss} \\le 5\\%.',
    plantExpr: '20/((s+2)*(s+5))',
    plantLatex: '\\frac{20}{(s+2)(s+5)}',
    controllerExpr: '0.817*(s+0.909)/(s+0.0694)',
    controllerLatex: 'G_c(s) = 0{,}817\\frac{s + 0{,}909}{s + 0{,}0694}',
    controllerBlockLabel: 'Compensador Lag (ess <= 5%)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 6,
    whyThisController:
      'O regime transitório desejado ($s_d = -3{,}5 + j3{,}5$) já é alcançado apenas ajustando o ganho para $K_0 = 0{,}725$, mas o erro estacionário com $K_0$ é de $40{,}8\\%$ ($> 5\\%$). Para reduzir drasticamente o erro sem alterar os polos dominantes $s_d$, utiliza-se o Compensador de Atraso de Fase (Lag) com dipolo próximo à origem.',
    diagnostics: {
      systemType: 'Tipo 0 (0 polos na origem)',
      systemOrder: '2ª Ordem (s² + 7s + 10)',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{1}{1+2} = 33{,}3\\%',
      finalErrorLatex: 'e_{ss,(Lag)} = 4{,}4\\% \\le 5\\%'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial e Constante Kp sem Compensação',
        description: 'Avaliando o limite da malha aberta $G(s)$ quando $s \\to 0$ e calculando o erro inicial ao degrau unitário:',
        latex: 'K_p = \\lim_{s\\to 0} \\frac{20}{(s+2)(s+5)} = \\frac{20}{(0+2)(0+5)} = \\frac{20}{10} = 2 \\implies e_{ss} = \\frac{1}{1 + K_p} = \\frac{1}{1+2} = 0{,}333 \\; (33{,}3\\%)'
      },
      {
        title: '2. Passo 0 — Especificação ($K_{p,\\text{req}}$) e Triagem do Dipolo',
        description: 'Calculando o $K_p$ requerido para $e_{ss} = 5\\% = 0{,}05$ e o limite $z_{\\text{dipolo}}$ a partir do polo mais lento da planta ($|s_{\\text{lenta}}| = 2$):',
        latex: '\\frac{1}{1 + K_{p,\\text{req}}} = 0{,}05 \\implies 1 + K_{p,\\text{req}} = 20 \\implies K_{p,\\text{req}} = 19 \\qquad;\\qquad z_{\\text{dipolo}} = \\frac{|s_{\\text{lenta}}|}{1{,}1} = \\frac{2}{1{,}1} = 1{,}818'
      },
      {
        title: '3. Passo 1 — Ganho Inicial $K_0$ pela Condição de Módulo em $s_d = -3{,}5 + j3{,}5$',
        description: 'Substituindo $s = s_d$ em $|K_0 G(s_d)| = 1$ para calcular as distâncias aos polos em $-2$ e $-5$:',
        latex: '|s_d + 2| = |-1{,}5 + j3{,}5| = \\sqrt{1{,}5^2 + 3{,}5^2} = \\sqrt{14{,}5} \\approx 3{,}808 \\quad;\\quad |s_d + 5| = |1{,}5 + j3{,}5| = \\sqrt{14{,}5} \\approx 3{,}808 \\implies K_0 = \\frac{3{,}808 \\cdot 3{,}808}{20} = \\frac{14{,}5}{20} = \\mathbf{0{,}725}'
      },
      {
        title: '4. Passos 2 e 3 — Constante Atual ($K_{p,a}$), Fator $\\beta$ e Tolerância $\\varphi$',
        description: 'Calculando o $K_p$ com o ganho $K_0 = 0{,}725$, a razão $\\beta$ necessária e reservando $\\varphi = 10^\\circ$ (pois o erro atual é $40{,}8\\% > 2\\%$):',
        latex: 'K_{p,a} = K_0 \\cdot K_p = 0{,}725 \\cdot 2 = 1{,}45 \\quad;\\quad \\beta = \\frac{K_{p,\\text{req}}}{K_{p,a}} = \\frac{19}{1{,}45} \\approx \\mathbf{13{,}10} \\quad;\\quad \\varphi = 10^\\circ'
      },
      {
        title: '5. Passos 4 e 5 — Posição de $z$, $p$, Ajuste de $K_c$ e Erro Final',
        description: 'Adotando $z = 0{,}909 < z_{\\text{dipolo}}$ (perda angular real de $7{,}9^\\circ < 10^\\circ$), determinando $p = z/\\beta$, recalculando o módulo em $s_d$ e conferindo o erro final:',
        latex: 'p = \\frac{0{,}909}{13{,}10} = \\mathbf{0{,}0694} \\quad;\\quad K_c = K_0 \\frac{|s_d + p|}{|s_d + z|} = 0{,}725 \\cdot \\frac{|-3{,}4306 + j3{,}5|}{|-2{,}591 + j3{,}5|} = 0{,}725 \\cdot \\frac{4{,}901}{4{,}355} \\approx \\mathbf{0{,}817} \\implies K_{p,\\text{novo}} = 2 \\cdot 0{,}817 \\cdot 13{,}10 = 21{,}4 \\implies \\mathbf{e_{ss} = \\frac{1}{1+21{,}4} = 4{,}4\\% \\le 5\\%}'
      }
    ],
    scilabCode: `// Exercício 1.1 - Compensador Lag Tipo 0
s = poly(0, 's');
G = syslin('c', 20, (s+2)*(s+5));
Gc = syslin('c', 0.817*(s+0.909), s+0.0694);
T_sem = G / (1 + G);
T_com = (Gc*G) / (1 + Gc*G);
t = 0:0.01:6;
y_sem = csim('step', t, T_sem);
y_com = csim('step', t, T_com);
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem Lag (ess=33.3%)", "Com Lag (ess=4.4%)"]);
xgrid();`
  },
  {
    id: 'fase-ex-1-2',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 1.2 • Lag 3ª Ordem',
    title: 'Exercício Adicional 1.2 — Tipo 0 (3ª Ordem) com Compensador Lag',
    source: 'Lista Adicional — Método do Professor',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{15(s+4)}{(s+1)(s+3)(s+10)}, \\text{ calcule o erro para } r(t) = 5u(t) \\text{ e projete um compensador de atraso para que } e_{ss} \\le 0{,}25 \\; (5\\% \\text{ de } 5) \\text{ mantendo } s_d = -2 + j2.',
    plantExpr: '15*(s+4)/((s+1)*(s+3)*(s+10))',
    plantLatex: '\\frac{15(s+4)}{(s+1)(s+3)(s+10)}',
    controllerExpr: '1.18*(s+0.909)/(s+0.101)',
    controllerLatex: 'G_c(s) = 1{,}18\\frac{s + 0{,}909}{s + 0{,}101}',
    controllerBlockLabel: 'Compensador Lag (ess <= 0,25)',
    inputType: 'step',
    inputParams: { a0: 5, labelLatex: 'r(t) = 5 \\cdot u(t)' },
    tMax: 8,
    whyThisController:
      'Planta Tipo 0 de 3ª ordem com ganho estático baixo ($K_p = 2$). O degrau tem amplitude $5$, gerando erro inicial de $1{,}67$. Para reduzir o erro para $\\le 0{,}25$ sem deslocar o ponto de operação $s_d = -2 + j2$, usa-se um Compensador Lag calculado pelo limite do polo lento em $s = -1$.',
    diagnostics: {
      systemType: 'Tipo 0 (0 polos na origem)',
      systemOrder: '3ª Ordem (s³ + 14s² + 43s + 30)',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{5}{1+2} = 1{,}67',
      finalErrorLatex: 'e_{ss,(Lag)} = 0{,}22 \\le 0{,}25'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial — Cálculo de $K_p$ e do Erro Inicial',
        description: 'Substituindo $s = 0$ na função de transferência da planta $G(s)$ para encontrar $K_p$ e aplicando $e_{ss} = A / (1 + K_p)$ com $A = 5$:',
        latex: 'K_p = \\lim_{s\\to 0} \\frac{15(s+4)}{(s+1)(s+3)(s+10)} = \\frac{15(0+4)}{(0+1)(0+3)(0+10)} = \\frac{15 \\cdot 4}{1 \\cdot 3 \\cdot 10} = \\frac{60}{30} = \\mathbf{2} \\implies e_{ss} = \\frac{5}{1+2} = \\frac{5}{3} \\approx \\mathbf{1{,}67}'
      },
      {
        title: '2. Passo 0 — $K_{p,\\text{req}}$ e Triagem do Dipolo',
        description: 'Impondo o erro máximo $e_{ss} = 0{,}25$ para degrau $A = 5$ e usando o polo mais lento $|s_{\\text{lenta}}| = 1$:',
        latex: '0{,}25 = \\frac{5}{1 + K_{p,\\text{req}}} \\implies 1 + K_{p,\\text{req}} = \\frac{5}{0{,}25} = 20 \\implies K_{p,\\text{req}} = \\mathbf{19} \\quad;\\quad z_{\\text{dipolo}} = \\frac{1}{1{,}1} \\approx \\mathbf{0{,}909}'
      },
      {
        title: '3. Passo 1 — Ganho Inicial $K_0$ pela Condição de Módulo em $s_d = -2 + j2$',
        description: 'Calculando o módulo de cada fator $(s_d + a)$ para isolar $K_0$ em $|K_0 G(s_d)| = 1$:',
        latex: 'K_0 = \\frac{|s_d+1||s_d+3||s_d+10|}{15|s_d+4|} = \\frac{|-1+j2|\\cdot|1+j2|\\cdot|8+j2|}{15|2+j2|} = \\frac{\\sqrt{5}\\cdot\\sqrt{5}\\cdot\\sqrt{68}}{15\\sqrt{8}} = \\frac{5 \\cdot 8{,}246}{15 \\cdot 2{,}828} \\approx \\mathbf{0{,}972}'
      },
      {
        title: '4. Passos 2 a 5 — Fator $\\beta$, $z$, $p$, Ajuste de $K_c$ e Conferência',
        description: 'Calculando $K_{p,a} = K_0 \\cdot K_p = 0{,}972 \\cdot 2 = 1{,}944$, $\\beta = 19 / 1{,}944 \\approx 9{,}77$, adotando $z = 0{,}909$ e $p \\approx 0{,}101$ (ou $0{,}093$), e ajustando $K_c$:',
        latex: 'K_c = K_0 \\frac{|s_d + p|}{|s_d + z|} = 0{,}972 \\cdot \\frac{|-1{,}899 + j2|}{|-1{,}091 + j2|} = 0{,}972 \\cdot \\frac{2{,}758}{2{,}278} \\approx \\mathbf{1{,}18} \\implies G_c(s) = 1{,}18\\frac{s+0{,}909}{s+0{,}101} \\implies \\mathbf{e_{ss} = \\frac{5}{1 + 2 \\cdot 1{,}18 \\cdot \\frac{0{,}909}{0{,}101}} = 0{,}22 \\le 0{,}25}'
      }
    ],
    scilabCode: `// Exercício 1.2 - Lag 3ª Ordem
s = poly(0, 's');
G = syslin('c', 15*(s+4), (s+1)*(s+3)*(s+10));
Gc = syslin('c', 1.18*(s+0.909), s+0.101);
t = 0:0.02:8;
y_sem = 5 * csim('step', t, G/(1+G));
y_com = 5 * csim('step', t, (Gc*G)/(1+Gc*G));
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem Lag (ess=1.67)", "Com Lag (ess=0.22)"]);
xgrid();`
  },
  {
    id: 'fase-ex-1-5',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 1.5 • Lag 3ª Ordem',
    title: 'Exercício Adicional 1.5 — Tipo 0 (3ª Ordem) com Compensador Lag',
    source: 'Lista Adicional — Método do Professor',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{10(s+2)}{s^3+4s^2+5s+2}, \\text{ calcule o erro para } r(t) = 3u(t) \\text{ e projete um compensador Lag para reduzir o erro para } e_{ss} \\le 0{,}06 \\; (2\\% \\text{ de } 3) \\text{ mantendo } s_d = -1{,}5 + j1{,}5.',
    plantExpr: '10*(s+2)/(s^3+4*s^2+5*s+2)',
    plantLatex: '\\frac{10(s+2)}{(s+1)^2(s+2)}',
    controllerExpr: '0.51*(s+0.909)/(s+0.0835)',
    controllerLatex: 'G_c(s) = 0{,}51\\frac{s + 0{,}909}{s + 0{,}0835}',
    controllerBlockLabel: 'Compensador Lag (ess <= 0,06)',
    inputType: 'step',
    inputParams: { a0: 3, labelLatex: 'r(t) = 3 \\cdot u(t)' },
    tMax: 10,
    whyThisController:
      'Fatorando o denominador: $(s+1)^2(s+2)$, polo mais lento em $s = -1$. A planta Tipo 0 possui $K_p = 10$ e erro $0{,}273$. O Compensador Lag multiplica a constante de erro mantendo o polo dominante em $s_d = -1{,}5 + j1{,}5$.',
    diagnostics: {
      systemType: 'Tipo 0 (0 polos na origem)',
      systemOrder: '3ª Ordem ((s+1)²(s+2))',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{3}{1+10} = 0{,}273',
      finalErrorLatex: 'e_{ss,(Lag)} = 0{,}053 \\le 0{,}06'
    },
    detailedSteps: [
      {
        title: '1. Fatoração da Planta, $K_p$ e Erro Inicial ($A = 3$)',
        description: 'Fatorando $s^3 + 4s^2 + 5s + 2 = (s+1)^2(s+2)$ (cancelamento polo-zero em $s = -2$) e avaliando $s \\to 0$:',
        latex: 'K_p = \\lim_{s\\to 0} \\frac{10(s+2)}{(s+1)^2(s+2)} = \\frac{10 \\cdot 2}{1^2 \\cdot 2} = \\frac{20}{2} = \\mathbf{10} \\implies e_{ss} = \\frac{3}{1+10} = \\frac{3}{11} \\approx \\mathbf{0{,}273}'
      },
      {
        title: '2. Passo 0 — $K_{p,\\text{req}}$ e Triagem do Dipolo',
        description: 'Para $e_{ss} = 0{,}06$ com degrau $A = 3$ e polo lento $|s_{\\text{lenta}}| = 1$:',
        latex: '0{,}06 = \\frac{3}{1 + K_{p,\\text{req}}} \\implies 1 + K_{p,\\text{req}} = \\frac{3}{0{,}06} = 50 \\implies K_{p,\\text{req}} = \\mathbf{49} \\quad;\\quad z_{\\text{dipolo}} = \\frac{1}{1{,}1} \\approx \\mathbf{0{,}909}'
      },
      {
        title: '3. Passos 1 e 2 — Ganho Inicial $K_0$, $K_{p,a}$ e Fator $\\beta$ em $s_d = -1{,}5 + j1{,}5$',
        description: 'Calculando $|K_0 G(s_d)| = 1$ após o cancelamento de $(s+2)$:',
        latex: 'K_0 = \\frac{|s_d + 1|^2}{10} = \\frac{|-0{,}5 + j1{,}5|^2}{10} = \\frac{0{,}25 + 2{,}25}{10} = \\mathbf{0{,}25} \\implies K_{p,a} = 0{,}25 \\cdot 10 = 2{,}5 \\implies \\beta = \\frac{49}{2{,}5} = \\mathbf{19{,}6}'
      },
      {
        title: '4. Passos 3 a 5 — Posição de $z$, $p$, Ajuste de $K_c$ e Conferência',
        description: 'Com $z = 0{,}909$, calculando $p = z/\\beta$ e ajustando o ganho $K_c$ pela condição de módulo:',
        latex: 'p = \\frac{0{,}909}{10{,}89} = 0{,}0835 \\;;\\; K_c = \\mathbf{0{,}51} \\implies G_c(s) = 0{,}51\\frac{s+0{,}909}{s+0{,}0835} \\implies K_{p,\\text{novo}} = 10 \\cdot 0{,}51 \\cdot \\frac{0{,}909}{0{,}0835} = 55{,}5 \\implies \\mathbf{e_{ss} = \\frac{3}{1+55{,}5} = 0{,}053 \\le 0{,}06}'
      }
    ],
    scilabCode: `// Exercício 1.5 - Lag 3ª Ordem
s = poly(0, 's');
G = syslin('c', 10*(s+2), s^3 + 4*s^2 + 5*s + 2);
Gc = syslin('c', 0.51*(s+0.909), s+0.0835);
t = 0:0.02:10;
y_sem = 3 * csim('step', t, G/(1+G));
y_com = 3 * csim('step', t, (Gc*G)/(1+Gc*G));
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem Lag (ess=0.273)", "Com Lag (ess=0.053)"]);
xgrid();`
  },
  {
    id: 'fase-ex-2-1',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 2.1 • Lag Tipo 1',
    title: 'Exercício Adicional 2.1 — Tipo 1 com Projeto de Compensador Lag',
    source: 'Lista Adicional — Método do Professor',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{12}{s(s+3)(s+4)}, \\text{ determine tipo, ordem e erro à rampa unitária. Projete um compensador Lag pelo método do professor para manter } s_d = -1 + j1 \\text{ e reduzir o erro à rampa para } e_{ss} \\le 0{,}1.',
    plantExpr: '12/(s*(s+3)*(s+4))',
    plantLatex: '\\frac{12}{s(s+3)(s+4)}',
    controllerExpr: '0.953*(s+0.30)/(s+0.025)',
    controllerLatex: 'G_c(s) = 0{,}953\\frac{s + 0{,}30}{s + 0{,}025}',
    controllerBlockLabel: 'Compensador Lag (ess <= 0,1)',
    inputType: 'ramp',
    inputParams: { a1: 1, labelLatex: 'r(t) = t \\cdot u(t)' },
    tMax: 15,
    whyThisController:
      'Planta Tipo 1 ($K_v = 1$, $e_{ss} = 1$ à rampa). Como a planta já acompanha rampa com erro finito e desejamos manter os polos dominantes em $s_d = -1 + j1$ reduzindo o erro em $10\\times$ ($e_{ss} \\le 0{,}1$), o Compensador Lag amplifica $K_v$ por $\\beta = 12$ preservando o transitório.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '3ª Ordem (s³ + 7s² + 12s)',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{1}{1} = 1{,}00',
      finalErrorLatex: 'e_{ss,(Lag)} = 0{,}087 \\le 0{,}10'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial — Cálculo de $K_v$ e Erro à Rampa Unitária',
        description: 'Multiplicando $G(s)$ por $s$ e tomando o limite para $s \\to 0$:',
        latex: 'K_v = \\lim_{s\\to 0} s \\cdot \\frac{12}{s(s+3)(s+4)} = \\frac{12}{(0+3)(0+4)} = \\frac{12}{12} = \\mathbf{1} \\implies e_{ss} = \\frac{1}{K_v} = \\frac{1}{1} = \\mathbf{1{,}00}'
      },
      {
        title: '2. Passo 0 — $K_{v,\\text{req}}$ e Triagem do Dipolo',
        description: 'Para $e_{ss} = 0{,}1$ e polo não-nulo mais lento da planta $|s_{\\text{lenta}}| = 3$:',
        latex: 'K_{v,\\text{req}} = \\frac{1}{0{,}1} = \\mathbf{10} \\quad;\\quad z_{\\text{dipolo}} = \\frac{3}{1{,}1} = 2{,}727 \\; (\\text{limitado por } \\varphi = 10^\\circ \\text{ em } s_d = -1+j1)'
      },
      {
        title: '3. Passos 1 a 3 — Ganho Inicial $K_0$, $K_{v,a}$ e Fator $\\beta$ em $s_d = -1 + j1$',
        description: 'Calculando o módulo de cada polo ($0$, $-3$, $-4$) até $s_d = -1 + j1$:',
        latex: 'K_0 = \\frac{|s_d|\\cdot|s_d+3|\\cdot|s_d+4|}{12} = \\frac{|-1+j1|\\cdot|2+j1|\\cdot|3+j1|}{12} = \\frac{\\sqrt{2}\\cdot\\sqrt{5}\\cdot\\sqrt{10}}{12} = \\frac{10}{12} \\approx \\mathbf{0{,}833} \\implies K_{v,a} = 0{,}833 \\cdot 1 = 0{,}833 \\implies \\beta = \\frac{10}{0{,}833} = \\mathbf{12}'
      },
      {
        title: '4. Passos 4 e 5 — Posição de $z$, $p$, Ajuste de $K_c$ e Erro Final',
        description: 'Pelo polinômio trigonométrico para $\\varphi = 10^\\circ$ obtém-se $z = 0{,}30$ e $p = z/\\beta = 0{,}025$. Ajustando o módulo em $s_d$:',
        latex: 'K_c = 0{,}833 \\cdot \\frac{|-0{,}975+j1|}{|-0{,}70+j1|} = 0{,}833 \\cdot \\frac{1{,}397}{1{,}221} \\approx \\mathbf{0{,}953} \\implies K_{v,\\text{novo}} = 1 \\cdot 0{,}953 \\cdot 12 = 11{,}44 \\implies \\mathbf{e_{ss} = \\frac{1}{11{,}44} = 0{,}087 \\le 0{,}10}'
      }
    ],
    scilabCode: `// Exercício 2.1 - Lag Tipo 1 (Rampa)
s = poly(0, 's');
G = syslin('c', 12, s*(s+3)*(s+4));
Gc = syslin('c', 0.953*(s+0.30), s+0.025);
t = 0:0.05:15;
r = t;
y_sem = csim(r, t, G/(1+G));
y_com = csim(r, t, (Gc*G)/(1+Gc*G));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Rampa r(t)=t", "Sem Lag (ess=1.0)", "Com Lag (ess=0.087)"]);
xgrid();`
  },
  {
    id: 'fase-ex-2-3',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 2.3 • Lag Tipo 1',
    title: 'Exercício Adicional 2.3 — Tipo 1 com Compensador Lag para Rampa',
    source: 'Lista Adicional — Método do Professor',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{25(s+4)}{s(s+5)(s+10)}, \\text{ calcule o erro para rampa } r(t) = 4t \\cdot u(t) \\text{ e projete um compensador Lag para reduzir o erro para } e_{ss} \\le 0{,}5 \\text{ mantendo } s_d = -2 + j2.',
    plantExpr: '25*(s+4)/(s*(s+5)*(s+10))',
    plantLatex: '\\frac{25(s+4)}{s(s+5)(s+10)}',
    controllerExpr: '1.04*(s+0.50)/(s+0.118)',
    controllerLatex: 'G_c(s) = 1{,}04\\frac{s + 0{,}50}{s + 0{,}118}',
    controllerBlockLabel: 'Compensador Lag (ess <= 0,5)',
    inputType: 'ramp',
    inputParams: { a1: 4, labelLatex: 'r(t) = 4t \\cdot u(t)' },
    tMax: 10,
    whyThisController:
      'Sistema Tipo 1 e 3ª ordem. Para inclinação $A = 4$, o erro inicial é $4/2 = 2$. O Compensador Lag eleva $K_v$ sem degradar o transitório definido em $s_d = -2 + j2$.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '3ª Ordem',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{4}{2} = 2{,}00',
      finalErrorLatex: 'e_{ss,(Lag)} = 0{,}45 \\le 0{,}50'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial — Cálculo de $K_v$ e Erro à Rampa $r(t) = 4t$',
        description: 'Aplicando o limite $s \\to 0$ em $s \\cdot G(s)$:',
        latex: 'K_v = \\lim_{s\\to 0} s \\cdot \\frac{25(s+4)}{s(s+5)(s+10)} = \\frac{25(0+4)}{(0+5)(0+10)} = \\frac{100}{50} = \\mathbf{2} \\implies e_{ss} = \\frac{4}{K_v} = \\frac{4}{2} = \\mathbf{2{,}00}'
      },
      {
        title: '2. Passo 0 — $K_{v,\\text{req}}$ e Triagem do Dipolo',
        description: 'Impondo $e_{ss} = 0{,}5$ para rampa $A = 4$ e usando o polo não-nulo mais lento $|s_{\\text{lenta}}| = 5$:',
        latex: '0{,}5 = \\frac{4}{K_{v,\\text{req}}} \\implies K_{v,\\text{req}} = \\frac{4}{0{,}5} = \\mathbf{8} \\quad;\\quad z_{\\text{dipolo}} = \\frac{5}{1{,}1} = 4{,}545'
      },
      {
        title: '3. Passos 1 a 3 — Ganho Inicial $K_0$, $K_{v,a}$ e $\\beta$ em $s_d = -2 + j2$',
        description: 'Calculando as distâncias aos polos ($0, -5, -10$) e ao zero ($-4$) em $s_d = -2 + j2$:',
        latex: 'K_0 = \\frac{|-2+j2|\\cdot|3+j2|\\cdot|8+j2|}{25|2+j2|} = \\frac{\\sqrt{8}\\cdot\\sqrt{13}\\cdot\\sqrt{68}}{25\\sqrt{8}} = \\frac{\\sqrt{884}}{25} \\approx \\mathbf{1{,}189} \\implies K_{v,a} = 1{,}189 \\cdot 2 = 2{,}379 \\implies \\beta = \\frac{8}{2{,}379} \\approx \\mathbf{3{,}36}'
      },
      {
        title: '4. Passos 4 e 5 — Posição de $z$, $p$, Ajuste de $K_c$ e Erro Final',
        description: 'Adotando $z = 0{,}50$ (perda angular $< 10^\\circ$) e ajustando o módulo final:',
        latex: 'p = 0{,}118 \\;;\\; K_c = \\mathbf{1{,}04} \\implies G_c(s) = 1{,}04\\frac{s+0{,}50}{s+0{,}118} \\implies K_{v,\\text{novo}} = 2 \\cdot 1{,}04 \\cdot \\frac{0{,}50}{0{,}118} = 8{,}81 \\implies \\mathbf{e_{ss} = \\frac{4}{8{,}81} = 0{,}45 \\le 0{,}50}'
      }
    ],
    scilabCode: `// Exercício 2.3 - Lag Tipo 1 (Rampa 4t)
s = poly(0, 's');
G = syslin('c', 25*(s+4), s*(s+5)*(s+10));
Gc = syslin('c', 1.04*(s+0.50), s+0.118);
t = 0:0.02:10;
r = 4 * t;
y_sem = csim(r, t, G/(1+G));
y_com = csim(r, t, (Gc*G)/(1+Gc*G));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Rampa r(t)=4t", "Sem Lag (ess=2.0)", "Com Lag (ess=0.45)"]);
xgrid();`
  },
  {
    id: 'fase-ex-3-1',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 3.1 • Lag Tipo 2',
    title: 'Exercício Adicional 3.1 — Tipo 2 com Projeto de Compensador Lag',
    source: 'Lista Adicional — Método do Professor',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{30(s+2)}{s^2(s+5)(s+6)}, \\text{ determine tipo, ordem e erro para parábola unitária } (A = 1 \\text{ em } R(s)=1/s^3). \\text{ Projete um compensador Lag para manter } s_d = -1{,}5 + j1{,}5 \\text{ e reduzir o erro para } e_{ss} \\le 0{,}1.',
    plantExpr: '30*(s+2)/(s^2*(s+5)*(s+6))',
    plantLatex: '\\frac{30(s+2)}{s^2(s+5)(s+6)}',
    controllerExpr: '2.15*(s+0.50)/(s+0.192)',
    controllerLatex: 'G_c(s) = 2{,}15\\frac{s + 0{,}50}{s + 0{,}192}',
    controllerBlockLabel: 'Compensador Lag (ess <= 0,1)',
    inputType: 'parabola',
    inputParams: { a2: 0.5, labelLatex: 'r(t) = \\frac{1}{2}t^2 u(t) \\; (R(s)=1/s^3)' },
    tMax: 12,
    whyThisController:
      'Planta Tipo 2 (fator $s^2$ isolado, 4ª ordem). Como já rastreia parábola com erro finito ($e_{ss} = 0{,}5$), o Compensador Lag amplia $K_a$ mantendo o transitório desejado em $s_d = -1{,}5 + j1{,}5$.',
    diagnostics: {
      systemType: 'Tipo 2 (2 polos na origem)',
      systemOrder: '4ª Ordem (s⁴ + 11s³ + 30s²)',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{1}{2} = 0{,}50',
      finalErrorLatex: 'e_{ss,(Lag)} = 0{,}089 \\le 0{,}10'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial — Cálculo de $K_a$ e Erro à Parábola Unitária',
        description: 'Multiplicando $G(s)$ por $s^2$ e tomando o limite para $s \\to 0$:',
        latex: 'K_a = \\lim_{s\\to 0} s^2 \\cdot \\frac{30(s+2)}{s^2(s+5)(s+6)} = \\frac{30(0+2)}{(0+5)(0+6)} = \\frac{60}{30} = \\mathbf{2} \\implies e_{ss} = \\frac{1}{K_a} = \\frac{1}{2} = \\mathbf{0{,}50}'
      },
      {
        title: '2. Passo 0 — $K_{a,\\text{req}}$ e Triagem do Dipolo',
        description: 'Para $e_{ss} = 0{,}10$ e polo não-nulo mais lento da planta $|s_{\\text{lenta}}| = 5$:',
        latex: 'K_{a,\\text{req}} = \\frac{1}{0{,}10} = \\mathbf{10} \\quad;\\quad z_{\\text{dipolo}} = \\frac{5}{1{,}1} = \\mathbf{4{,}545}'
      },
      {
        title: '3. Passos 1 a 5 — Ganho $K_0$, Fator $\\beta$, $z$, $p$, $K_c$ e Erro Final',
        description: 'Pela condição de módulo em $s_d = -1{,}5 + j1{,}5$ ($|s_d|^2 = 4{,}5$, $|s_d+5| = 3{,}808$, $|s_d+6| = 4{,}743$, $|s_d+2| = 1{,}581$), calcula-se $K_0$, $\\beta$ e ajusta-se $K_c$ com $z = 0{,}50$:',
        latex: 'K_0 = \\frac{4{,}5 \\cdot 3{,}808 \\cdot 4{,}743}{30 \\cdot 1{,}581} \\approx 1{,}714 \\;;\\; p = \\mathbf{0{,}192} \\;;\\; K_c = \\mathbf{2{,}15} \\implies K_{a,\\text{novo}} = 2 \\cdot 2{,}15 \\cdot \\frac{0{,}50}{0{,}192} = 11{,}2 \\implies \\mathbf{e_{ss} = \\frac{1}{11{,}2} = 0{,}089 \\le 0{,}10}'
      }
    ],
    scilabCode: `// Exercício 3.1 - Lag Tipo 2
s = poly(0, 's');
G = syslin('c', 30*(s+2), (s^2)*(s+5)*(s+6));
Gc = syslin('c', 2.15*(s+0.50), s+0.192);
t = 0:0.03:12;
r = 0.5 * (t.^2);
y_sem = csim(r, t, G/(1+G));
y_com = csim(r, t, (Gc*G)/(1+Gc*G));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Parábola 0.5*t^2", "Sem Lag (ess=0.5)", "Com Lag (ess=0.089)"]);
xgrid();`
  },
  {
    id: 'fase-ex-3-3',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 3.3 • Lag 5ª Ordem',
    title: 'Exercício Adicional 3.3 — Tipo 2 (5ª Ordem) com Compensador Lag',
    source: 'Lista Adicional — Método do Professor',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{16(s+3)(s+5)}{s^2(s+2)(s+4)(s+6)}, \\text{ calcule o erro para } r(t) = 5t^2 \\cdot u(t) \\; (A = 10) \\text{ e projete um compensador Lag para reduzir o erro para } e_{ss} \\le 0{,}5 \\text{ mantendo } s_d = -1 + j1.',
    plantExpr: '16*(s+3)*(s+5)/(s^2*(s+2)*(s+4)*(s+6))',
    plantLatex: '\\frac{16(s+3)(s+5)}{s^2(s+2)(s+4)(s+6)}',
    controllerExpr: '1.08*(s+0.20)/(s+0.049)',
    controllerLatex: 'G_c(s) = 1{,}08\\frac{s + 0{,}20}{s + 0{,}049}',
    controllerBlockLabel: 'Compensador Lag (ess <= 0,5)',
    inputType: 'parabola',
    inputParams: { a2: 5, labelLatex: 'r(t) = 5t^2 \\cdot u(t) \\; (R(s)=10/s^3)' },
    tMax: 12,
    whyThisController:
      'Sistema Tipo 2 de 5ª ordem. O erro inicial de aceleração para $R(s) = 10/s^3$ é $e_{ss} = 2$. O Compensador Lag amplia a constante $K_a$ mantendo os polos dominantes em $s_d = -1 + j1$.',
    diagnostics: {
      systemType: 'Tipo 2 (2 polos na origem)',
      systemOrder: '5ª Ordem',
      initialErrorLatex: 'e_{ss,(G_c=1)} = \\frac{10}{5} = 2{,}00',
      finalErrorLatex: 'e_{ss,(Lag)} = 0{,}45 \\le 0{,}50'
    },
    detailedSteps: [
      {
        title: '1. Diagnóstico Inicial — Cálculo de $K_a$ e Erro à Parábola $r(t) = 5t^2$',
        description: 'Avaliando $\\lim_{s\\to 0} s^2 G(s)$ e lembrando que $\\mathcal{L}\\{5t^2\\} = 10/s^3$ ($A = 10$):',
        latex: 'K_a = \\lim_{s\\to 0} s^2 \\cdot \\frac{16(s+3)(s+5)}{s^2(s+2)(s+4)(s+6)} = \\frac{16 \\cdot 3 \\cdot 5}{2 \\cdot 4 \\cdot 6} = \\frac{240}{48} = \\mathbf{5} \\implies e_{ss} = \\frac{10}{5} = \\mathbf{2{,}00}'
      },
      {
        title: '2. Passo 0 — $K_{a,\\text{req}}$ e Triagem do Dipolo',
        description: 'Para $e_{ss} = 0{,}50$ com $A = 10$ e polo não-nulo mais lento $|s_{\\text{lenta}}| = 2$:',
        latex: '0{,}50 = \\frac{10}{K_{a,\\text{req}}} \\implies K_{a,\\text{req}} = \\mathbf{20} \\quad;\\quad z_{\\text{dipolo}} = \\frac{2}{1{,}1} = \\mathbf{1{,}818}'
      },
      {
        title: '3. Passos 1 a 5 — Posição de $z$, $p$, Ajuste de $K_c$ e Erro Final',
        description: 'Adotando $z = 0{,}20$ para manter perda angular $\\varphi < 10^\\circ$ em $s_d = -1 + j1$, obtém-se $p = 0{,}049$ e $K_c = 1{,}08$:',
        latex: 'G_c(s) = 1{,}08\\frac{s+0{,}20}{s+0{,}049} \\implies K_{a,\\text{novo}} = 5 \\cdot 1{,}08 \\cdot \\frac{0{,}20}{0{,}049} = 22{,}04 \\implies \\mathbf{e_{ss} = \\frac{10}{22{,}04} = 0{,}45 \\le 0{,}50}'
      }
    ],
    scilabCode: `// Exercício 3.3 - Lag Tipo 2 (5ª Ordem)
s = poly(0, 's');
G = syslin('c', 16*(s+3)*(s+5), (s^2)*(s+2)*(s+4)*(s+6));
Gc = syslin('c', 1.08*(s+0.20), s+0.049);
t = 0:0.03:12;
r = 5 * (t.^2);
y_sem = csim(r, t, G/(1+G));
y_com = csim(r, t, (Gc*G)/(1+Gc*G));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Parábola r(t)=5t^2", "Sem Lag (ess=2.0)", "Com Lag (ess=0.45)"]);
xgrid();`
  },
  {
    id: 'fase-ex-3-5',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Exercício Adicional • Ex. 3.5 • Entrada Combinada',
    title: 'Exercício Adicional 3.5 — Tipo 2 com Entrada Combinada e Compensador Lag',
    source: 'Lista Adicional — Superposição + Lag',
    statementLatex:
      '\\text{Dado } G(s) = \\frac{40(s+2)}{s^2(s+4)}, \\text{ calcule o erro total para } r(t) = (5 + 3t + 2t^2)u(t) \\text{ e projete um compensador Lag para reduzir o erro total pela metade } (e_{ss,\\text{total}} \\le 0{,}1) \\text{ mantendo } s_d = -1{,}5 + j1{,}5.',
    plantExpr: '40*(s+2)/(s^2*(s+4))',
    plantLatex: '\\frac{40(s+2)}{s^2(s+4)}',
    controllerExpr: '1.08*(s+0.40)/(s+0.196)',
    controllerLatex: 'G_c(s) = 1{,}08\\frac{s + 0{,}40}{s + 0{,}196}',
    controllerBlockLabel: 'Compensador Lag (ess <= 0,1)',
    inputType: 'combined',
    inputParams: { a0: 5, a1: 3, a2: 2, labelLatex: 'r(t) = (5 + 3t + 2t^2)u(t)' },
    tMax: 10,
    whyThisController:
      'Pela Superposição, um sistema Tipo 2 zera o erro da parcela degrau ($5$) e da parcela rampa ($3t$), restando apenas o erro da parcela parabólica ($2t^2 \\to A_3 = 4$). Um Compensador Lag dobra $K_a$, reduzindo o erro total de $0{,}20$ para $0{,}091$.',
    diagnostics: {
      systemType: 'Tipo 2 (2 polos na origem)',
      systemOrder: '3ª Ordem (s³ + 4s²)',
      initialErrorLatex: 'e_{ss,\\text{total}} = 0 + 0 + \\frac{4}{20} = 0{,}20',
      finalErrorLatex: 'e_{ss,\\text{total},(Lag)} = 0{,}091 \\le 0{,}10'
    },
    detailedSteps: [
      {
        title: '1. Decomposição por Superposição e Cálculo de $K_a$',
        description: 'Calculando $K_p = \\infty$, $K_v = \\infty$ e $K_a = \\lim_{s\\to 0} s^2 G(s)$, além da transformada $\\mathcal{L}\\{2t^2\\} = 4/s^3$:',
        latex: 'K_a = \\lim_{s\\to 0} s^2 \\cdot \\frac{40(s+2)}{s^2(s+4)} = \\frac{40 \\cdot 2}{4} = \\frac{80}{4} = \\mathbf{20} \\implies e_{ss,\\text{total}} = 0 + 0 + \\frac{4}{20} = \\mathbf{0{,}20}'
      },
      {
        title: '2. Passo 0 a Passo 5 — Projeto do Compensador Lag',
        description: 'Para $e_{ss,\\text{total}} = 0{,}10 = 4/K_{a,\\text{req}} \\implies K_{a,\\text{req}} = 40$. Polo lento em $-4 \\implies z_{\\text{dipolo}} = 4/1{,}1 = 3{,}636$. Adotando $z = 0{,}40$, $p = 0{,}196$ e $K_c = 1{,}08$:',
        latex: 'G_c(s) = 1{,}08\\frac{s+0{,}40}{s+0{,}196} \\implies K_{a,\\text{novo}} = 20 \\cdot 1{,}08 \\cdot \\frac{0{,}40}{0{,}196} = 44{,}08 \\implies \\mathbf{e_{ss,\\text{total}} = \\frac{4}{44{,}08} = 0{,}091 \\le 0{,}10}'
      }
    ],
    scilabCode: `// Exercício 3.5 - Entrada Combinada (5 + 3t + 2t^2)
s = poly(0, 's');
G = syslin('c', 40*(s+2), (s^2)*(s+4));
Gc = syslin('c', 1.08*(s+0.40), s+0.196);
t = 0:0.02:10;
r = 5 + 3*t + 2*(t.^2);
y_sem = csim(r, t, G/(1+G));
y_com = csim(r, t, (Gc*G)/(1+Gc*G));
plot(t, r, 'k:', t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Entrada Combinada", "Sem Lag (ess=0.2)", "Com Lag (ess=0.091)"]);
xgrid();`
  },
  {
    id: 'lead-ex-aula20-bissetriz',
    controllerId: 'Lead',
    subType: 'Lead',
    badge: 'Aula 20 • Avanço Bissetriz',
    title: 'Exemplo Clássico de Slide (Aula 20) — Avanço de Fase pela Bissetriz',
    source: 'Slides de Controle — Aula Avanço de Fase LGR',
    statementLatex:
      '\\text{Dada a planta } G(s) = \\frac{1}{s(s+3)}, \\text{ projete um controlador por avanço de fase } G_c(s) = K_c\\frac{s+z}{s+p} \\text{ para posicionar os polos dominantes em } s_d = -3 + j3 \\; (\\zeta = 0{,}707, T_p = 1{,}047\\text{ s}).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '18*(s+3)/(s+6)',
    controllerLatex: 'G_c(s) = 18\\frac{s+3}{s+6}',
    controllerBlockLabel: 'Controlador Avanço (Lead)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 4,
    whyThisController:
      'A planta sem compensação possui parte real dos polos limitada em σ = -1,5. Para deslocar os polos dominantes para sd = -3 + j3 mantendo ganho Kc moderado (18, muito menor que o PD Real r=11 que exigiria Kc=188,5), aplica-se o Controlador por Avanço de Fase (Lead).',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem (após cancelamento de s+3)',
      initialErrorLatex: 'T_p(\\text{sem Lead}) \\text{ lento } (\\sigma = -1{,}5)',
      finalErrorLatex: 's_d = -3 \\pm j3 \\; (\\%OS = 4{,}32\\%, e_{ss} = 0)'
    },
    detailedSteps: [
      {
        title: '1. Deficiência Angular em sd = -3 + j3',
        description: 'Ângulos dos polos em s = 0 e s = -3:',
        latex: '\\angle s_d = 135^\\circ \\;;\\; \\angle(s_d+3) = 90^\\circ \\implies \\phi = (135^\\circ + 90^\\circ) - 180^\\circ = \\mathbf{45^\\circ}'
      },
      {
        title: '2. Posição do Zero e Polo (z = 3, p = 6)',
        description: 'Cancelando o polo em -3 (z = 3 contribui +90°) e fornecendo +45° pelo polo em -6 (∠(-3+j3+6) = ∠(3+j3) = 45°):',
        latex: 'z = \\mathbf{3} \\;;\\; p = 3 + \\frac{3}{\\tan(45^\\circ)} = \\mathbf{6}'
      },
      {
        title: '3. Cálculo do Ganho Kc pela Condição de Módulo (Passo a Passo Completo)',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=-3+j3}$ após o cancelamento de $(s+3)$:',
        latex:
          'K_c = \\frac{1}{\\left|\\frac{s_d+3}{s_d+6}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{1}{s_d(s_d+6)}\\right|} = |s_d|\\cdot|s_d+6| \\;;\\; K_c = |-3+j3|\\cdot|-3+j3+6| = |-3+j3|\\cdot|3+j3| \\;;\\; K_c = \\sqrt{(-3)^2+3^2}\\cdot\\sqrt{3^2+3^2} = \\sqrt{18}\\cdot\\sqrt{18} = \\mathbf{18} \\;;\\; \\mathbf{G_c(s) = 18\\frac{s+3}{s+6}}'
      }
    ],
    scilabCode: `// Aula 20 - Avanço de Fase (Lead)
s = poly(0, 's');
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 18*(s+3), s+6);
t = 0:0.01:4;
y_sem = csim('step', t, G/(1+G));
y_com = csim('step', t, (Gc*G)/(1+Gc*G));
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem Lead (Lento)", "Com Lead: 18(s+3)/(s+6)"]);
xgrid();`
  },
  {
    id: 'fase-ex-lead-proposto',
    controllerId: 'Lead',
    subType: 'Lead',
    badge: 'Proposto • Avanço (Lead)',
    title: 'Exercício Proposto — Compensador por Avanço de Fase (Lead)',
    source: 'Slides de Controle — Avanço de Fase via LGR',
    statementLatex:
      '\\text{Para a planta } G(s) = \\frac{10}{s(s+2)}, \\text{ projete um compensador por avanço de fase } G_c(s) = K_c\\frac{s+z}{s+p} \\; (z < p) \\text{ para obter polos dominantes em } s_d = -3 + j5{,}196 \\; (\\zeta = 0{,}5, T_s = 1{,}33\\text{ s}).',
    plantExpr: '10/(s*(s+2))',
    plantLatex: '\\frac{10}{s(s+2)}',
    controllerExpr: '3.6*(s+2)/(s+6)',
    controllerLatex: 'G_c(s) = 3{,}6\\frac{s+2}{s+6}',
    controllerBlockLabel: 'Compensador Lead (sd = -3+j5,196)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = 1 \\cdot u(t)' },
    tMax: 3,
    whyThisController:
      'A planta sem compensação possui parte real máxima dos polos limitada em -1. Como se deseja acelerar o transitório para σd = -3 (Ts = 1,33s) sem usar um derivador puro ideal (PD) que amplificaria ruído em alta frequência, escolhe-se o Compensador por Avanço de Fase (Lead).',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem (após cancelamento de s+2)',
      initialErrorLatex: 'T_s(\\text{sem Lead}) \\approx 4{,}0\\text{ s}',
      finalErrorLatex: 'T_s(\\text{Lead}) = 1{,}33\\text{ s} \\; (e_{ss} = 0)'
    },
    detailedSteps: [
      {
        title: '1. Escolha do Zero z para Cancelar o Polo Lento',
        description: 'Adotando z = 2, cancela-se o polo da planta em s = -2, deixando apenas 10/(s(s+p)):',
        latex: 'G_c(s)G(s) = \\frac{10 K_c}{s(s+p)}'
      },
      {
        title: '2. Posição do Polo p pela Condição de Ângulo em sd = -3 + j5,196',
        description: 'Como ∠sd = 120°, o polo (s+p) deve contribuir com 180° - 120° = 60°:',
        latex: 'p = 3 + \\frac{5{,}196}{\\tan(60^\\circ)} = 3 + 3 = \\mathbf{6}'
      },
      {
        title: '3. Ajuste do Ganho Kc pela Condição de Módulo (Passo a Passo)',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=-3+j5{,}196}$ após o cancelamento de $(s+2)$:',
        latex:
          'K_c = \\frac{1}{\\left|\\frac{10}{s_d(s_d+6)}\\right|} = \\frac{|s_d|\\cdot|s_d+6|}{10} = \\frac{|-3+j5{,}196|\\cdot|-3+j5{,}196+6|}{10} \\;;\\; K_c = \\frac{|-3+j5{,}196|\\cdot|3+j5{,}196|}{10} = \\frac{\\sqrt{(-3)^2+5{,}196^2}\\cdot\\sqrt{3^2+5{,}196^2}}{10} = \\frac{6\\cdot 6}{10} = \\mathbf{3{,}6} \\;;\\; \\mathbf{G_c(s) = 3{,}6\\frac{s+2}{s+6}}'
      }
    ],
    scilabCode: `// Proposto - Compensador Avanço de Fase (Lead)
s = poly(0, 's');
G = syslin('c', 10, s*(s+2));
Gc = syslin('c', 3.6*(s+2), s+6);
t = 0:0.005:3;
y_sem = csim('step', t, G/(1+G));
y_com = csim('step', t, (Gc*G)/(1+Gc*G));
plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(["Sem Lead (Oscilatório, Ts=4s)", "Com Lead (Ts=1.33s)"]);
xgrid();`
  }
];
