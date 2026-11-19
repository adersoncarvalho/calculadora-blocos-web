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
  initialControllerLabel?: string;
  initialControllerLatex?: string;
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
    professorMethodTitle: 'Procedimento Padrão — Projeto do Controlador PI via LGR (Slide 03)',
    professorMethodSteps: [
      {
        step: 'Passo 0',
        title: 'Triagem: Tipo 0, Fase Mínima e Polo/Zero Mais Lento |s_lenta|',
        description:
          'Confirmar que a planta é Tipo 0, de fase mínima (sem zeros no semiplano direito) e identificar a menor singularidade não-nula |s_lenta|.',
        formulaLatex: '|s_{\\text{lenta}}| = \\min_i |s_i| \\; (s_i \\neq 0)'
      },
      {
        step: 'Passo 1',
        title: 'P ou PD em sd: Ganho K0 (Transitório Já Definido)',
        description:
          'Calcular o ganho K0 = 1/|G(sd)| que posiciona os polos dominantes em sd (atendendo ζ e ωn/ts desejados).',
        formulaLatex: 'K_0 = \\frac{1}{|G(s_d)|}'
      },
      {
        step: 'Passo 2',
        title: 'Constante Estática Ka e Erro Inicial eP',
        description:
          'Calcular o ganho estático Ka = K0·G(0) obtido com o P puro e o respectivo erro estacionário ao degrau unitário eP.',
        formulaLatex: 'K_a = K_0 \\cdot G(0) \\quad \\text{e} \\quad e_P = \\frac{1}{1 + K_a}'
      },
      {
        step: 'Passo 3',
        title: 'Orçamento Angular φ (5° ou 10°)',
        description:
          'Escolher a perda angular máxima tolerada do integrador em sd conforme o erro inicial eP.',
        formulaLatex: '\\varphi = 5^\\circ \\;\\text{se } e_P \\le 2\\%, \\;\\text{senão } \\varphi = 10^\\circ'
      },
      {
        step: 'Passo 4',
        title: 'Cálculo do Zero zi (Limite Angular vs. Dipolo)',
        description:
          'Calcular zi,max pela lei dos senos no triângulo do LGR (com β = arctan(ωd/σd)) e limitar pelo critério do dipolo |s_lenta|/1,1.',
        formulaLatex: 'z_{i,\\max} = |s_d|\\frac{\\sin\\varphi}{\\sin(\\beta+\\varphi)} \\quad \\text{e} \\quad z_i = z_{i,\\text{lim}} = \\min\\left(z_{i,\\max}\\,;\\,\\frac{|s_{\\text{lenta}}|}{1{,}1}\\right)'
      },
      {
        step: 'Passo 5',
        title: 'Ajuste de Ganho Kc pela Condição de Módulo',
        description:
          'Recalcular o ganho Kc = 1/|Gc_bar(sd)G(sd)| = K0·|sd|/|sd + zi| para manter os polos dominantes em sd.',
        formulaLatex: 'K_c = K_0 \\cdot \\frac{|s_d|}{|s_d + z_i|}'
      },
      {
        step: 'Passo 6',
        title: 'Simular P e PI: Mp, ts, Valor Final, Cauda e Regra dos 10 V',
        description:
          'Comparar as respostas ao degrau (P vs. PI), conferir se a cauda lenta entra na faixa de 2% e verificar a saturação do amp-op (±10 V).',
        formulaLatex: 'u(0^+) = K_c \\cdot \\Delta e \\implies \\Delta e \\le \\frac{10}{K_c}'
      },
      {
        step: 'Passo 7',
        title: 'Dimensionamento RC e Anti-Windup',
        description:
          'Escolher R1 comercial e calcular R2 e C para o PI analógico, prevendo proteção anti-windup contra saturação do integrador.',
        formulaLatex: 'R_2 = K_c \\cdot R_1, \\quad C = \\frac{1}{z_i \\cdot R_2}'
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
    professorMethodTitle: 'Procedimento do Professor — Controlador PD Real via LGR (Slide 30)',
    professorMethodSteps: [
      {
        step: 'Passo 1',
        title: 'Especificações → Polo Desejado (sd)',
        description:
          'A partir dos requisitos de sobressinal (Mp ou %OS), tempo de pico (tp) ou tempo de acomodação (ts), calcular ζ, ωn e o polo dominante desejado sd = -σd + jωd.',
        formulaLatex: '\\zeta = \\frac{-\\ln(M_p)}{\\sqrt{\\pi^2 + \\ln^2(M_p)}} \\;;\\; \\sigma_d = \\frac{4}{t_s} \\;;\\; \\omega_d = \\frac{\\pi}{t_p} \\;;\\; s_d = -\\sigma_d + j\\omega_d'
      },
      {
        step: 'Passo 2',
        title: 'Deficiência Angular θdef pela Condição de Ângulo',
        description:
          'Avaliar a fase total da malha aberta original ∠L(sd) somando ângulos de zeros e subtraindo ângulos de polos. A diferença para -180° é θdef.',
        formulaLatex: '\\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d) \\quad (\\text{equivalente módulo } 360^\\circ)'
      },
      {
        step: 'Passo 3',
        title: 'Tipo de Controlador pelo Sinal de θdef',
        description:
          'Se θdef = 0°, basta controlador P. Se θdef > 0°, é preciso adiantar fase (PD real ou avanço). Se θdef < 0°, o ponto sd pede atraso de fase.',
        formulaLatex: '\\theta_{\\text{def}} > 0^\\circ \\implies \\text{PD Real (ou Avanço de Fase)}'
      },
      {
        step: 'Passo 4',
        title: 'Fator de Filtro N, Razão r = N + 1 e Estágios m (conforme φmax)',
        description:
          'Escolher o fator de filtro derivativo N (tipicamente N = 10, logo r = N + 1 = 11) e conferir o avanço máximo φmax de um estágio; se θdef > φmax, dividir em m estágios idênticos (θdef/m).',
        formulaLatex: 'r = N + 1 \\;;\\; \\varphi_{\\max} = \\arcsin\\!\\left(\\frac{r - 1}{r + 1}\\right) \\;;\\; m = \\left\\lceil \\frac{\\theta_{\\text{def}}}{\\varphi_{\\max}} \\right\\rceil'
      },
      {
        step: 'Passo 5',
        title: 'Polinômio em zc → Posições de zc e pc',
        description:
          'Impor ∠G_c(sd) = θdef/m com pc = r·zc. Resolver a equação quadrática em zc por Bhaskara e adotar a MAIOR raiz positiva (evita zero lento); depois calcular pc = r·zc.',
        formulaLatex: 'r z_c^2 - \\left[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\!\\left(\\frac{\\theta_{\\text{def}}}{m}\\right)\\right] z_c + (\\sigma_d^2 + \\omega_d^2) = 0 \\;;\\; p_c = r\\cdot z_c'
      },
      {
        step: 'Passo 6',
        title: 'Ganhos Kc, Kp e Td pela Condição de Módulo',
        description:
          'Aplicar a condição de módulo literal |Gc(sd)·G(sd)| = 1 sem inverter antecipadamente para obter Kc, e converter para a forma paralela Kp e Td.',
        formulaLatex: 'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} \\;;\\; K_p = \\frac{K_c}{r} \\;;\\; T_d = \\frac{r - 1}{r\\cdot z_c} = \\frac{N}{p_c}'
      },
      {
        step: 'Passo 7',
        title: 'Simulação, Pré-Filtro, Regra dos 10 V e Erro em Regime',
        description:
          'Simular a resposta ao degrau e o esforço de controle u(t). Lembrar que o zero do PD altera Mp e tp (usar pré-filtro se necessário), conferir o pico inicial u(0⁺) ≤ 10 V e avaliar o erro estacionário.',
        formulaLatex: 'u(0^+) = K_c \\cdot r(0^+) \\le 10\\text{ V} \\;;\\; F(s) = \\frac{z_c}{s + z_c} \\;(\\text{pré-filtro opcional})'
      },
      {
        step: 'Passo 8',
        title: 'Componentes R1, R2, C1, C2 e Simulação com Saturação',
        description:
          'Dimensionar o circuito analógico com amp-op a partir de zc, pc e Kc (escolhendo C1 e C2 comerciais) e validar em simulação com saturação do atuador.',
        formulaLatex: 'z_c = \\frac{1}{R_1 C_1} \\;;\\; p_c = \\frac{1}{R_2 C_2} \\;;\\; K_c = \\frac{C_1}{C_2} \\;\\left(\\text{ou } K_p = \\frac{R_2}{R_1}\\right)'
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
    professorMethodTitle: 'Procedimento Padrão — Compensador por Avanço de Fase via LGR (Slide 04)',
    professorMethodSteps: [
      {
        step: 'Passo 1',
        title: 'Especificações → Polo Desejado (sd)',
        description:
          'Converter os requisitos de sobressinal (Mp), tempo de pico (tp) ou acomodação (ts) em ζ, σd, ωd e sd = −σd + jωd.',
        formulaLatex: '\\zeta = \\frac{-\\ln(M_p)}{\\sqrt{\\pi^2 + \\ln^2(M_p)}} \\;;\\; \\sigma_d = \\frac{4}{t_s} \\;;\\; \\omega_d = \\frac{\\pi}{t_p} \\;;\\; s_d = -\\sigma_d + j\\omega_d'
      },
      {
        step: 'Passo 2',
        title: 'Deficiência Angular: θdef = −180° − ∠L(sd)',
        description:
          'Avaliar a fase da planta L(sd) e calcular quanto ângulo positivo falta para satisfazer a condição de ângulo do LGR.',
        formulaLatex: '\\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d)'
      },
      {
        step: 'Passo 3',
        title: 'Tipo de Controlador pelo Sinal de θdef',
        description:
          'Confirmar que θdef > 0 (falta avanço de fase); caso contrário, avaliar atraso de fase ou ajuste proporcional.',
        formulaLatex: '\\theta_{\\text{def}} > 0 \\implies \\text{Avanço de Fase (Lead) ou PD Real}'
      },
      {
        step: 'Passo 4',
        title: 'Escolher o Critério: Bissetriz, Cancelamento, r Fixo ou Erro',
        description:
          'Definir a estratégia: bissetriz (minimiza Kc), cancelamento de polo lento, r = N + 1 fixo ou especificação de erro.',
        formulaLatex: 'q = \\frac{1 + \\frac{\\sqrt{1-\\zeta^2}}{\\sin\\varphi}}{\\zeta + \\sqrt{1-\\zeta^2}\\cot\\varphi} \\;(\\text{bissetriz}) \\quad \\text{ou} \\quad r = N + 1 \\;(\\text{fixo})'
      },
      {
        step: 'Passo 5',
        title: 'Calcular zc e pc',
        description:
          'Determinar o zero −zc e o polo −pc conforme o critério escolhido e verificar ∠(sd + zc) − ∠(sd + pc) = φ.',
        formulaLatex: 'z_c = \\frac{|s_d|}{q},\\; p_c = |s_d|\\cdot q \\quad \\text{ou} \\quad c_2 z_c^2 + c_1 z_c + c_0 = 0,\\; p_c = r\\cdot z_c'
      },
      {
        step: 'Passo 6',
        title: 'Kc pela Condição de Módulo e Kp = Kc / r',
        description:
          'Aplicar Kc = 1/|Gc_bar(sd)·L(sd)| pela regra dos 7 passos (sem inverter antecipadamente) e calcular Kp = Kc / r.',
        formulaLatex: 'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} \\;;\\; K_p = \\frac{K_c}{r}'
      },
      {
        step: 'Passo 7',
        title: 'Simulação, Pré-Filtro, Regra dos 10 V e Erro em Regime',
        description:
          'Conferir Mp, tp e dominância do 3º polo; avaliar necessidade de pré-filtro F(s) = zc/(s + zc), pico u(0+) ≤ 10 V e erro em regime.',
        formulaLatex: 'u(0^+) = K_c\\Delta e \\le 10\\text{ V} \\;;\\; K_{\\text{vel}} = K_p\\lim_{s\\to 0} s L(s)'
      },
      {
        step: 'Passo 8',
        title: 'R1, R2, C1, C2 e Simulação com Saturação',
        description:
          'Escolher C1, calcular R1, R2 e C2 do estágio analógico, conferir banda GBW/Kc ≫ pc/(2π) e simular com saturação ±10 V.',
        formulaLatex: 'R_1 = \\frac{1}{z_c C_1},\\; R_2 = K_p R_1,\\; C_2 = \\frac{1}{p_c R_2}'
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
    professorMethodTitle: 'Procedimento do Professor — Compensador por Atraso de Fase (Lag) via LGR (Slide 20)',
    professorMethodSteps: [
      {
        step: 'Passo 0',
        title: 'Triagem: Tipo 0 ou 1, Fase Mínima e |slenta|',
        description:
          'Identificar o Tipo do sistema (0 para degrau, 1 para rampa), confirmar que é de fase mínima e identificar o módulo do polo real não-nulo mais lento da planta |slenta| (polos na origem não entram).',
        formulaLatex: 'z_{\\text{dipolo}} = \\frac{|s_{\\text{lenta}}|}{1{,}1}'
      },
      {
        step: 'Passo 1',
        title: 'P ou PD em sd: Ganho Inicial K0 e Constante Atual Ka',
        description:
          'Calcular o ganho K0 pela condição de módulo literal |K0·G(sd)| = 1 no ponto desejado sd = -σd + jωd, e obter a constante de erro atual Ka (Kpos para Tipo 0 ou Kvel para Tipo 1).',
        formulaLatex: 'K_0 = \\frac{1}{|G(s_d)|} \\;;\\; K_{\\text{pos},a} = K_0 G(0) \\quad \\text{ou} \\quad K_{\\text{vel},a} = K_0 \\lim_{s\\to 0} s G(s)'
      },
      {
        step: 'Passo 2',
        title: 'Razão de Amplificação β = Kreq / Ka',
        description:
          'A partir do erro estacionário especificado, determinar Kreq e calcular o fator mínimo β = z/p que o compensador de atraso deve multiplicar em baixa frequência.',
        formulaLatex: '\\beta = \\frac{K_{\\text{req}}}{K_a}'
      },
      {
        step: 'Passo 3',
        title: 'Tolerância Angular φ (5° ou 10°)',
        description:
          'Em plantas Tipo 0, usar φ = 5° se o erro atual eP ≤ 2%, senão φ = 10°. Em plantas Tipo 1, adotar φ = 10°.',
        formulaLatex: '\\varphi = 5^\\circ \\;(\\text{se } e_P \\le 2\\%) \\quad \\text{senão } \\varphi = 10^\\circ \\;(\\text{Tipo 1: } 10^\\circ)'
      },
      {
        step: 'Passo 4',
        title: 'Escolha de z: Menor entre zmax(φ), Dipolo e Regra da Cauda (Tipo 1)',
        description:
          'Resolver o polinômio angular com z = β·p para achar zmax(φ) = β·pmax, comparar com |slenta|/1,1 e, em plantas Tipo 1, aplicar a regra da cauda (A = 2%) para escolher o MENOR valor de z.',
        formulaLatex: '\\beta p^2 - \\left[\\sigma_d(\\beta+1) + \\omega_d(\\beta-1)\\cot\\varphi\\right] p + (\\sigma_d^2+\\omega_d^2) = 0 \\;;\\; z = \\min\\!\\left(z_{\\max}(\\varphi)\\,;\\, \\frac{|s_{\\text{lenta}}|}{1{,}1}\\,;\\, \\frac{A}{\\frac{1}{K_{\\text{vel},a}} - \\frac{1}{K_{\\text{vel,req}}}}\\right)'
      },
      {
        step: 'Passo 5',
        title: 'Polo p = z/β e Ganho Kc pela Condição de Módulo Literal',
        description:
          'Calcular o polo p = z/β, conferir a perda angular real Δθperda = |∠(sd+z) - ∠(sd+p)| ≤ φ e recalcular Kc pela condição de módulo literal sem inverter antecipadamente.',
        formulaLatex: 'p = \\frac{z}{\\beta} \\;;\\; K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} \\implies e_{ss,\\text{final}} \\le e_{ss,\\text{req}}'
      },
      {
        step: 'Passo 6',
        title: 'Simular P e Atraso (Verificação de Mp, ts e Cauda)',
        description:
          'Comparar as respostas do sistema só com P (K0) e com Atraso (Gc): em Tipo 0 com eP > 2% e z < 0,8·|slenta|, a cauda lenta tende a aumentar o tempo de acomodação ts.',
        formulaLatex: 'G_c(s) = K_c\\frac{s + z}{s + p} \\;;\\; \\text{conferir } M_p,\\; t_s,\\; e_{ss} \\text{ e cauda}'
      },
      {
        step: 'Passo 7',
        title: 'Componentes Analógicos (C, R1, R2, R4)',
        description:
          'Escolher capacitor comercial C (ex.: 10 µF) e resistor R3 (ex.: 10 kΩ) para o estágio inversor de ganho, obtendo R1, R2 e R4 (avaliar implementação digital se R1 ou R2 ficarem na casa de MΩ).',
        formulaLatex: 'R_1 = \\frac{1}{z\\cdot C} \\;;\\; R_2 = \\beta\\cdot R_1 \\;;\\; R_4 = K_c\\cdot R_3'
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
  uComp: number[] | null;
  uPeak: number | null;
  prefilterZc: number | null;
  yCompPrefilter: number[] | null;
  eCompPrefilter: number[] | null;
  uCompPrefilter: number[] | null;
  overshootPrefilter: number | null;
  uPeakPrefilter: number | null;
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
 * Calcula a função de transferência do esforço de controle U(s)/R(s) = Gc(s) / (1 + Gc(s)G(s)H(s))
 */
export function buildControlEffortTf(G: RatFunc, Gc: RatFunc, H?: RatFunc): RatFunc {
  const L = ratMul(Gc, G);
  const Hfunc = H || { num: [{ coeff: 1, vars: {} }], den: [{ coeff: 1, vars: {} }] };
  const LH = ratMul(L, Hfunc);
  // U/R = Gc / (1 + LH) = (Gc.num * LH.den) / (Gc.den * (LH.den + LH.num))
  const num = polyMul(Gc.num, LH.den);
  const den = polyMul(Gc.den, polyAdd(LH.den, LH.num));
  return ratSimplify(num, den);
}

/**
 * Extrai o primeiro zero real positivo zc > 0 de Gc(s) (para pré-filtro F(s) = zc / (s + zc) em PD/Lead)
 */
function extractRealPositiveZero(Gc: RatFunc): number | null {
  try {
    if (!isUnivariateInS(Gc.num)) return null;
    const uN = trimUni(toUnivariateArr(Gc.num));
    if (uN.length === 2 && Math.abs(uN[1]) > 1e-12) {
      const zc = uN[0] / uN[1];
      return zc > 1e-4 ? Number(zc.toFixed(4)) : null;
    }
    // Se grau 2 (ex: 2 estágios idênticos (s+zc)^2): verifica raiz real dupla ou real negativa
    if (uN.length === 3 && Math.abs(uN[2]) > 1e-12) {
      const b = uN[1] / uN[2];
      const c = uN[0] / uN[2];
      const disc = b * b - 4 * c;
      if (disc >= -1e-4 && b > 0 && c > 0) {
        const zc = (b - Math.sqrt(Math.max(0, disc))) / 2;
        return zc > 1e-4 ? Number(zc.toFixed(4)) : null;
      }
    }
    return null;
  } catch {
    return null;
  }
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
    const Tu_comp = buildControlEffortTf(G, Gc, H);

    const a0 = ex.inputParams.a0 || 0;
    const a1 = ex.inputParams.a1 || 0;
    const a2 = ex.inputParams.a2 || 0;

    const inputFn = (t: number) => a0 + a1 * t + a2 * t * t;

    const simUncomp = simulateInputResponseRK4(T_uncomp, inputFn, ex.tMax, 300);
    const simComp = simulateInputResponseRK4(T_comp, inputFn, ex.tMax, 300);
    const simU = simulateInputResponseRK4(Tu_comp, inputFn, ex.tMax, 300);

    if (!simUncomp || !simComp) return null;

    const t = simComp.t;
    const r = t.map(inputFn);
    const yUncomp = simUncomp.y;
    const yComp = simComp.y;
    const eUncomp = r.map((rv, i) => Number((rv - yUncomp[i]).toFixed(5)));
    const eComp = r.map((rv, i) => Number((rv - yComp[i]).toFixed(5)));
    const uComp = simU ? simU.y : null;
    const uPeak = uComp ? Number(Math.max(...uComp.map(v => Math.abs(v))).toFixed(3)) : null;

    // Pré-filtro F(s) = zc / (s + zc) para PD Real e Avanço de Fase (Lead)
    let prefilterZc: number | null = null;
    let yCompPrefilter: number[] | null = null;
    let eCompPrefilter: number[] | null = null;
    let uCompPrefilter: number[] | null = null;
    let overshootPrefilter: number | null = null;
    let uPeakPrefilter: number | null = null;

    if (ex.controllerId === 'PD' || ex.controllerId === 'Lead') {
      const zc = extractRealPositiveZero(Gc);
      if (zc !== null) {
        prefilterZc = zc;
        const F: RatFunc = {
          num: [{ coeff: zc, vars: {} }],
          den: [{ coeff: 1, vars: { s: 1 } }, { coeff: zc, vars: {} }]
        };
        const T_pref = ratMul(F, T_comp);
        const Tu_pref = ratMul(F, Tu_comp);
        const simYPref = simulateInputResponseRK4(T_pref, inputFn, ex.tMax, 300);
        const simUPref = simulateInputResponseRK4(Tu_pref, inputFn, ex.tMax, 300);
        if (simYPref) {
          yCompPrefilter = simYPref.y;
          eCompPrefilter = r.map((rv, i) => Number((rv - simYPref.y[i]).toFixed(5)));
          if (ex.inputType === 'step' && a0 !== 0) {
            const yFinP = yCompPrefilter[yCompPrefilter.length - 1];
            const yMaxP = Math.max(...yCompPrefilter);
            overshootPrefilter =
              Math.abs(yFinP) > 1e-6 && yMaxP > yFinP
                ? Number((((yMaxP - yFinP) / Math.abs(yFinP)) * 100).toFixed(2))
                : 0;
          }
        }
        if (simUPref) {
          uCompPrefilter = simUPref.y;
          uPeakPrefilter = Number(Math.max(...simUPref.y.map(v => Math.abs(v))).toFixed(3));
        }
      }
    }

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
      uComp,
      uPeak,
      prefilterZc,
      yCompPrefilter,
      eCompPrefilter,
      uCompPrefilter,
      overshootPrefilter,
      uPeakPrefilter,
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
        title: '2. Cálculo de $|s_d|$, $\\beta$, Zero $z_i$ e Limite do Dipolo',
        description:
          'Calculando o módulo $|s_d|$ por Pitágoras e o ângulo complementar $\\beta = 180^\\circ - \\angle s_d = \\arctan(\\omega_d/\\sigma_d)$ no triângulo do polo desejado $s_d = -3 + j3$:',
        latex:
          '|s_d| = \\sqrt{(-\\sigma_d)^2 + \\omega_d^2} = \\sqrt{(-3)^2 + 3^2} = \\sqrt{18} = 4{,}2426 \\;;\\; \\beta = \\arctan\\left(\\frac{\\omega_d}{\\sigma_d}\\right) = \\arctan\\left(\\frac{3}{3}\\right) = 45^\\circ \\;;\\; z_{i,\\max} = |s_d|\\frac{\\sin\\varphi}{\\sin(\\beta+\\varphi)} = 4{,}2426\\frac{\\sin 10^\\circ}{\\sin(45^\\circ+10^\\circ)} = 4{,}2426\\frac{0{,}1736}{0{,}8192} = 0{,}8994 \\;;\\; z_i = \\min\\left(z_{i,\\max}\\,;\\,\\frac{|s_{\\text{lenta}}|}{1{,}1}\\right) = \\min\\left(0{,}8994\\,;\\,\\frac{1}{1{,}1}\\right) = \\mathbf{0{,}899} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(s_d+z_i) - \\angle s_d| = |\\angle(-2{,}101+j3) - \\angle(-3+j3)| = \\left|\\left(180^\\circ - \\arctan\\frac{3}{2{,}101}\\right) - \\left(180^\\circ - \\arctan\\frac{3}{3}\\right)\\right| = |125{,}00^\\circ - 135{,}00^\\circ| = \\mathbf{10{,}0^\\circ}'
      },
      {
        title: '3. Ajuste do Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos)',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=s_d}$ sem inverter antecipadamente (polos MF em $-2{,}57 \\pm j3{,}00$ e $-0{,}868$):',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_i}{s_d}\\cdot\\frac{1}{(s_d+1)(s_d+5)}\\right|} = \\frac{1}{\\left|\\frac{-3+j3+0{,}899}{-3+j3}\\cdot\\frac{1}{(-3+j3+1)(-3+j3+5)}\\right|} \\;;\\; K_c = \\frac{1}{\\left|\\frac{-2{,}101+j3}{-3+j3}\\cdot\\frac{1}{(-2+j3)(2+j3)}\\right|} = \\frac{1}{\\frac{|-2{,}101+j3|}{|-3+j3|\\cdot|-2+j3|\\cdot|2+j3|}} = \\frac{1}{\\frac{\\sqrt{(-2{,}101)^2+3^2}}{\\sqrt{(-3)^2+3^2}\\cdot\\sqrt{(-2)^2+3^2}\\cdot\\sqrt{2^2+3^2}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{4{,}414+9}}{\\sqrt{9+9}\\cdot\\sqrt{4+9}\\cdot\\sqrt{4+9}}} = \\frac{1}{\\frac{3{,}6625}{4{,}2426\\cdot 3{,}6056\\cdot 3{,}6056}} = \\frac{1}{\\frac{3{,}6625}{55{,}154}} = \\frac{1}{0{,}066405} \\approx \\mathbf{15{,}06} \\;;\\; \\mathbf{G_c(s) = 15{,}06\\frac{s+0{,}899}{s}}'
      },
      {
        title: '4. Verificação, Regra dos 10 V e Componentes ($R_1 = 47\\text{ k}\\Omega$) — Slide 11',
        description:
          'Comparando com P puro ($M_p = 4{,}3\\%$, $t_s = 1{,}41\\text{ s}$, $e_P = 27{,}8\\%$): com PI temos $M_p = 4{,}7\\%$, $t_s = 1{,}39\\text{ s}$, $e_{ss,\\text{degrau}} = 0$ e $e_{ss,\\text{rampa}} = 1/2{,}71 = 0{,}37$. Pela função do PI inversor $K_c\\frac{s + 1/(R_2 C)}{s}$ com $R_2 = K_c R_1$ e $C = 1/(z_i R_2)$:',
        latex:
          '\\Delta e \\le \\frac{10}{K_c} = \\frac{10}{15{,}06} = \\mathbf{0{,}66\\text{ V}} \\;;\\; R_2 = K_c R_1 = 15{,}06\\cdot 47\\text{ k}\\Omega = \\mathbf{708\\text{ k}\\Omega} \\;;\\; C = \\frac{1}{z_i R_2} = \\frac{1}{0{,}899\\cdot 708\\cdot 10^3} = \\mathbf{1{,}57\\,\\mu\\text{F}}'
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
    id: 'pi-ex-slide-ex2',
    controllerId: 'PI',
    badge: 'Slide 03 • Exemplo 2',
    title: 'Exemplo 2 (Slide 03) — PI em Planta com Zero G(s) = (s+3)/[(s+0,5)(s+4)(s+6)]',
    source: 'Slide 03 — PI para erro nulo ao degrau pelo lugar das raízes (Slides 12–13)',
    statementLatex:
      '\\text{Para } G(s) = \\frac{s+3}{(s+0{,}5)(s+4)(s+6)} \\text{ com } s_d = -3{,}97 + j3{,}98 \\; (\\zeta = 0{,}707), \\text{ projete um controlador PI para zerar } e_{ss} \\text{ ao degrau preservando o transitório.}',
    plantExpr: '(s+3)/((s+0.5)*(s+4)*(s+6))',
    plantLatex: '\\frac{s+3}{(s+0{,}5)(s+4)(s+6)}',
    controllerExpr: '24.26*(s+0.4545)/s',
    controllerLatex: 'G_c(s) = 24{,}26\\frac{s + 0{,}4545}{s}',
    controllerBlockLabel: 'Controlador PI (Limite Dipolo)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'A planta é Tipo 0 com zero em $-3$ e polo mais lento em $-0{,}5$ ($|s_{\\text{lenta}}| = 0{,}5$). Com P puro ($K_0 = 22{,}92$), o erro ao degrau é $14{,}9\\%$. Aqui o limite do dipolo ($|s_{\\text{lenta}}|/1{,}1 = 0{,}4545$) é menor que o limite angular ($z_{i,\\max} = 1{,}191$): usar $z_i = 1{,}191$ faria o zero passar do polo $-0{,}5$ e degradar $t_s$ de $0{,}70\\text{ s}$ para $2{,}29\\text{ s}$ ($M_p = 15{,}3\\%$).',
    diagnostics: {
      systemType: 'Tipo 0 → Tipo 1 (após PI)',
      systemOrder: '3ª Ordem → 4ª Ordem',
      initialErrorLatex: 'K_a = 5{,}73 \\implies e_P = 14{,}9\\%',
      finalErrorLatex: 'e_{ss,\\text{degrau}} = 0 \\; (M_p = 0{,}0\\%,\\; t_s = 0{,}82\\text{ s})'
    },
    detailedSteps: [
      {
        title: '1. Triagem Inicial e Ganho $K_0$ pela Condição de Módulo ($s_d = -3{,}97 + j3{,}98$)',
        description:
          'Singularidades em $0{,}5;\\, 3;\\, 4;\\, 6 \\implies |s_{\\text{lenta}}| = 0{,}5$. Aplicando $K_0 = \\frac{1}{|G(s_d)|}$ passo a passo com $|a+jb| = \\sqrt{a^2+b^2}$, o ganho estático $G(0)$ e o erro $e_P$:',
        latex:
          '\\beta = \\arccos(\\zeta) = \\arccos(0{,}707) = 45^\\circ \\implies \\omega_d = \\sigma_d\\tan 45^\\circ = \\sigma_d \\;;\\; \\angle G(s_d) = 103{,}7^\\circ - (131{,}1^\\circ + 89{,}6^\\circ + 63{,}0^\\circ) = -180^\\circ \\implies \\mathbf{s_d = -3{,}97 + j3{,}98} \\;;\\; K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+3}{(s_d+0{,}5)(s_d+4)(s_d+6)}\\right|} = \\frac{1}{\\left|\\frac{-3{,}97+j3{,}98+3}{(-3{,}97+j3{,}98+0{,}5)(-3{,}97+j3{,}98+4)(-3{,}97+j3{,}98+6)}\\right|} \\;;\\; K_0 = \\frac{1}{\\frac{|-0{,}97+j3{,}98|}{|-3{,}47+j3{,}98|\\cdot|0{,}03+j3{,}98|\\cdot|2{,}03+j3{,}98|}} = \\frac{1}{\\frac{\\sqrt{(-0{,}97)^2+3{,}98^2}}{\\sqrt{(-3{,}47)^2+3{,}98^2}\\cdot\\sqrt{0{,}03^2+3{,}98^2}\\cdot\\sqrt{2{,}03^2+3{,}98^2}}} = \\frac{1}{\\frac{4{,}097}{5{,}280\\cdot 3{,}980\\cdot 4{,}468}} = \\frac{1}{\\frac{4{,}097}{93{,}89}} = \\frac{1}{0{,}04364} = \\mathbf{22{,}92} \\;;\\; G(0) = \\frac{3}{0{,}5\\cdot 4\\cdot 6} = 0{,}25 \\;;\\; K_a = K_0 G(0) = 22{,}92\\cdot 0{,}25 = 5{,}73 \\;;\\; e_P = \\frac{1}{1+K_a} = \\frac{1}{6{,}73} = 14{,}9\\% > 2\\% \\implies \\varphi = 10^\\circ'
      },
      {
        title: '2. Cálculo de $|s_d|$, $\\beta$, $z_{i,\\max}$ e Restrição do Dipolo ($|s_{\\text{lenta}}|/1{,}1$)',
        description:
          'Calculando $|s_d|$ por Pitágoras e $\\beta = 180^\\circ - \\angle s_d = \\arctan(\\omega_d/\\sigma_d)$ para $s_d = -3{,}97 + j3{,}98$:',
        latex:
          '|s_d| = \\sqrt{(-\\sigma_d)^2 + \\omega_d^2} = \\sqrt{(-3{,}97)^2 + 3{,}98^2} = 5{,}622 \\;;\\; \\beta = \\arctan\\left(\\frac{\\omega_d}{\\sigma_d}\\right) = \\arctan\\left(\\frac{3{,}98}{3{,}97}\\right) = 45{,}1^\\circ \\;;\\; z_{i,\\max} = |s_d|\\frac{\\sin\\varphi}{\\sin(\\beta+\\varphi)} = 5{,}622\\frac{\\sin 10^\\circ}{\\sin(45{,}1^\\circ+10^\\circ)} = 5{,}622\\frac{0{,}1736}{0{,}8202} = 1{,}191 \\;;\\; z_i = \\min\\left(z_{i,\\max}\\,;\\,\\frac{|s_{\\text{lenta}}|}{1{,}1}\\right) = \\min(1{,}191\\,;\\, 0{,}4545) = \\mathbf{0{,}4545} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(s_d+z_i) - \\angle s_d| = |\\angle(-3{,}5155+j3{,}98) - \\angle(-3{,}97+j3{,}98)| = \\left|\\left(180^\\circ - \\arctan\\frac{3{,}98}{3{,}5155}\\right) - \\left(180^\\circ - \\arctan\\frac{3{,}98}{3{,}97}\\right)\\right| = |131{,}45^\\circ - 134{,}93^\\circ| = \\mathbf{3{,}5^\\circ}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos)',
        description:
          'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=s_d}$ sem inverter antecipadamente:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_i}{s_d}\\cdot\\frac{s_d+3}{(s_d+0{,}5)(s_d+4)(s_d+6)}\\right|} = \\frac{1}{\\left|\\frac{-3{,}97+j3{,}98+0{,}4545}{-3{,}97+j3{,}98}\\cdot\\frac{-3{,}97+j3{,}98+3}{(-3{,}97+j3{,}98+0{,}5)(-3{,}97+j3{,}98+4)(-3{,}97+j3{,}98+6)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{|-3{,}5155+j3{,}98|\\cdot|-0{,}97+j3{,}98|}{|-3{,}97+j3{,}98|\\cdot|-3{,}47+j3{,}98|\\cdot|0{,}03+j3{,}98|\\cdot|2{,}03+j3{,}98|}} = \\frac{1}{\\frac{\\sqrt{(-3{,}5155)^2+3{,}98^2}\\cdot\\sqrt{(-0{,}97)^2+3{,}98^2}}{\\sqrt{(-3{,}97)^2+3{,}98^2}\\cdot\\sqrt{(-3{,}47)^2+3{,}98^2}\\cdot\\sqrt{0{,}03^2+3{,}98^2}\\cdot\\sqrt{2{,}03^2+3{,}98^2}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{12{,}359+15{,}840}\\cdot\\sqrt{0{,}941+15{,}840}}{\\sqrt{15{,}761+15{,}840}\\cdot\\sqrt{12{,}041+15{,}840}\\cdot\\sqrt{0{,}001+15{,}840}\\cdot\\sqrt{4{,}121+15{,}840}}} = \\frac{1}{\\frac{\\sqrt{28{,}199}\\cdot\\sqrt{16{,}781}}{\\sqrt{31{,}601}\\cdot\\sqrt{27{,}881}\\cdot\\sqrt{15{,}841}\\cdot\\sqrt{19{,}961}}} \\;;\\; K_c = \\frac{1}{\\frac{5{,}310\\cdot 4{,}097}{5{,}622\\cdot 5{,}280\\cdot 3{,}980\\cdot 4{,}468}} = \\frac{1}{\\frac{21{,}754}{527{,}84}} = \\frac{1}{0{,}04121} \\approx \\mathbf{24{,}26} \\;;\\; \\mathbf{G_c(s) = 24{,}26\\frac{s+0{,}4545}{s}}'
      },
      {
        title: '4. Verificação, Regra dos 10 V e Componentes ($R_1 = 22\\text{ k}\\Omega$) — Slide 13',
        description:
          'Polos MF com $z_i = 0{,}4545$: $-3{,}80 \\pm j3{,}96$, $-2{,}46$ e $-0{,}447$ ($M_p = 0{,}0\\%$, $t_s = 0{,}82\\text{ s}$). Usando $R_1 = 22\\text{ k}\\Omega$ para evitar $R_2 > 1\\text{ M}\\Omega$:',
        latex:
          '\\Delta e \\le \\frac{10}{K_c} = \\frac{10}{24{,}26} = \\mathbf{0{,}41\\text{ V}} \\;;\\; R_2 = K_c R_1 = 24{,}26\\cdot 22\\text{ k}\\Omega = \\mathbf{534\\text{ k}\\Omega} \\;;\\; C = \\frac{1}{z_i R_2} = \\frac{1}{0{,}4545\\cdot 534\\cdot 10^3} = \\mathbf{4{,}12\\,\\mu\\text{F}}'
      }
    ],
    scilabCode: `// Slide 03 - Exemplo 2: G(s) = (s+3)/((s+0.5)(s+4)(s+6)) com PI
s = %s;
G = syslin('c', s+3, (s+0.5)*(s+4)*(s+6));
Gc = syslin('c', 24.26*(s+0.4545), s);
t = 0:0.01:3; clf();
plot(t, csim('step', t, (22.92*G)/.1), 'r--', t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
legend(['Só P (K0=22.92, ess=14.9%)', 'Com PI (zi=0.4545, ess=0%)']);
xgrid();`
  },
  {
    id: 'pi-ex-slide-propA',
    controllerId: 'PI',
    badge: 'Slide 03 • Proposto A',
    title: 'Exercício Proposto A (Slide 22) — PI em G(s) = 1/[(s+0,1)(s+10)] (ζ = 0,707)',
    source: 'Slide 03 — PI para erro nulo ao degrau pelo lugar das raízes (Slides 21–22)',
    statementLatex:
      '\\text{Para } G(s) = \\frac{1}{(s+0{,}1)(s+10)} \\text{ com } \\zeta = 0{,}707, \\text{ projete o PI para zerar } e_{ss} \\text{ ao degrau preservando o transitório do P.}',
    plantExpr: '1/((s+0.1)*(s+10))',
    plantLatex: '\\frac{1}{(s+0{,}1)(s+10)}',
    controllerExpr: '50.46*(s+0.0909)/s',
    controllerLatex: 'G_c(s) = 50{,}46\\frac{s + 0{,}0909}{s}',
    controllerBlockLabel: 'Controlador PI (Proposto A)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'Com P puro ($K_0 = 50{,}0$), o erro estacionário já é pequeno ($e_P = 1{,}96\\% \\le 2\\% \\implies \\varphi = 5^\\circ$), mas o polo lento em $-0{,}1$ impõe pelo critério do dipolo $z_i = |s_{\\text{lenta}}|/1{,}1 = 0{,}0909$. Isso mantém $M_p = 4{,}3\\%$ e $t_s = 0{,}83\\text{ s}$ intactos, ao custo de um capacitor grande ($21{,}8\\,\\mu\\text{F}$).',
    diagnostics: {
      systemType: 'Tipo 0 → Tipo 1 (após PI)',
      systemOrder: '2ª Ordem → 3ª Ordem',
      initialErrorLatex: 'K_a = 50{,}0 \\implies e_P = 1{,}96\\%',
      finalErrorLatex: 'e_{ss,\\text{degrau}} = 0 \\; (M_p = 4{,}3\\%,\\; t_s = 0{,}83\\text{ s})'
    },
    detailedSteps: [
      {
        title: '1. Polo Desejado $s_d$ no LGR do P e Ganho $K_0$ (Passo a Passo)',
        description:
          'Pelo centróide (mediatriz) dos polos de malha aberta $-0{,}1$ e $-10$ no LGR, calculamos $\\sigma_d$, $\\omega_d$, $s_d$, e depois $K_0 = \\frac{1}{|G(s_d)|}$, $K_a$ e $e_P$:',
        latex:
          '\\sigma_a = \\frac{\\sum p_i - \\sum z_i}{n - m} = \\frac{-0{,}1 + (-10) - 0}{2 - 0} = \\frac{-10{,}1}{2} = -5{,}05 \\implies \\sigma_d = 5{,}05 \\;;\\; \\omega_d = \\sigma_d\\frac{\\sqrt{1-\\zeta^2}}{\\zeta} = 5{,}05\\cdot\\frac{\\sqrt{1-0{,}707^2}}{0{,}707} = 5{,}05\\cdot\\frac{0{,}707}{0{,}707} = 5{,}05 \\implies s_d = -\\sigma_d + j\\omega_d = \\mathbf{-5{,}05 + j5{,}05} \\;;\\; K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{1}{(s_d+0{,}1)(s_d+10)}\\right|} = \\frac{1}{\\left|\\frac{1}{(-5{,}05+j5{,}05+0{,}1)(-5{,}05+j5{,}05+10)}\\right|} \\;;\\; K_0 = \\frac{1}{\\frac{1}{|-4{,}95+j5{,}05|\\cdot|4{,}95+j5{,}05|}} = \\frac{1}{\\frac{1}{\\sqrt{(-4{,}95)^2+5{,}05^2}\\cdot\\sqrt{4{,}95^2+5{,}05^2}}} = \\frac{1}{\\frac{1}{\\sqrt{24{,}503+25{,}502}\\cdot\\sqrt{24{,}503+25{,}502}}} \\;;\\; K_0 = \\frac{1}{\\frac{1}{\\sqrt{50{,}005}\\cdot\\sqrt{50{,}005}}} = \\frac{1}{\\frac{1}{7{,}071\\cdot 7{,}071}} = \\frac{1}{\\frac{1}{50{,}005}} = \\frac{1}{0{,}0200} = \\mathbf{50{,}0} \\;;\\; G(0) = \\frac{1}{0{,}1\\cdot 10} = 1 \\;;\\; K_a = K_0 G(0) = 50{,}0 \\;;\\; e_P = \\frac{1}{1+K_a} = \\frac{1}{51{,}0} = 1{,}96\\% \\le 2\\% \\implies \\varphi = 5^\\circ'
      },
      {
        title: '2. Cálculo de $|s_d|$, $\\beta$, $z_i$ e Limite do Dipolo',
        description:
          'Calculando $|s_d|$ e $\\beta = \\arctan(\\omega_d/\\sigma_d)$ em $s_d = -5{,}05 + j5{,}05$; com $|s_{\\text{lenta}}| = 0{,}1$, quem limita é o dipolo:',
        latex:
          '|s_d| = \\sqrt{(-5{,}05)^2+5{,}05^2} = 7{,}142 \\;;\\; \\beta = \\arctan\\left(\\frac{5{,}05}{5{,}05}\\right) = 45^\\circ \\;;\\; z_{i,\\max} = |s_d|\\frac{\\sin\\varphi}{\\sin(\\beta+\\varphi)} = 7{,}142\\frac{\\sin 5^\\circ}{\\sin 50^\\circ} = 7{,}142\\cdot\\frac{0{,}08716}{0{,}7660} = 0{,}813 \\;;\\; z_i = \\min\\left(z_{i,\\max}\\,;\\,\\frac{|s_{\\text{lenta}}|}{1{,}1}\\right) = \\min\\left(0{,}813\\,;\\,\\frac{0{,}1}{1{,}1}\\right) = \\mathbf{0{,}0909} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(s_d+z_i) - \\angle s_d| = |\\angle(-4{,}9591+j5{,}05) - \\angle(-5{,}05+j5{,}05)| = \\left|\\left(180^\\circ - \\arctan\\frac{5{,}05}{4{,}9591}\\right) - \\left(180^\\circ - \\arctan\\frac{5{,}05}{5{,}05}\\right)\\right| = |134{,}48^\\circ - 135{,}00^\\circ| = \\mathbf{0{,}5^\\circ}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos) e Componentes ($R_1 = 10\\text{ k}\\Omega$)',
        description:
          'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ (polos MF: $-5{,}01 \\pm j5{,}05$ e $-0{,}091$, $M_p = 4{,}3\\%$, $t_s = 0{,}83\\text{ s}$):',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_i}{s_d}\\cdot\\frac{1}{(s_d+0{,}1)(s_d+10)}\\right|} = \\frac{1}{\\left|\\frac{-5{,}05+j5{,}05+0{,}0909}{-5{,}05+j5{,}05}\\cdot\\frac{1}{(-5{,}05+j5{,}05+0{,}1)(-5{,}05+j5{,}05+10)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{|-4{,}959+j5{,}05|}{|-5{,}05+j5{,}05|\\cdot|-4{,}95+j5{,}05|\\cdot|4{,}95+j5{,}05|}} = \\frac{1}{\\frac{\\sqrt{(-4{,}959)^2+5{,}05^2}}{\\sqrt{(-5{,}05)^2+5{,}05^2}\\cdot\\sqrt{(-4{,}95)^2+5{,}05^2}\\cdot\\sqrt{4{,}95^2+5{,}05^2}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{24{,}593+25{,}502}}{\\sqrt{25{,}502+25{,}502}\\cdot\\sqrt{24{,}503+25{,}502}\\cdot\\sqrt{24{,}503+25{,}502}}} = \\frac{1}{\\frac{\\sqrt{50{,}095}}{\\sqrt{51{,}005}\\cdot\\sqrt{50{,}005}\\cdot\\sqrt{50{,}005}}} \\;;\\; K_c = \\frac{1}{\\frac{7{,}078}{7{,}142\\cdot 7{,}071\\cdot 7{,}071}} = \\frac{1}{\\frac{7{,}078}{357{,}12}} = \\frac{1}{0{,}01982} = \\mathbf{50{,}46} \\;;\\; R_2 = K_c R_1 = 50{,}46\\cdot 10\\text{ k}\\Omega = \\mathbf{505\\text{ k}\\Omega} \\;;\\; C = \\frac{1}{z_i R_2} = \\frac{1}{0{,}0909\\cdot 505\\cdot 10^3} = \\mathbf{21{,}8\\,\\mu\\text{F}}'
      }
    ],
    scilabCode: `// Slide 22 - Proposto A: G(s) = 1/((s+0.1)(s+10)) com PI
s = %s;
G = syslin('c', 1, (s+0.1)*(s+10));
Gc = syslin('c', 50.46*(s+0.0909), s);
t = 0:0.01:3; clf();
plot(t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'pi-ex-slide-propB',
    controllerId: 'PI',
    badge: 'Slide 03 • Proposto B',
    title: 'Exercício Proposto B (Slide 22) — PI em G(s) = (s+6)/[(s+2)(s+4)(s+12)] (ζ = 0,6)',
    source: 'Slide 03 — PI para erro nulo ao degrau pelo lugar das raízes (Slides 21–22)',
    statementLatex:
      '\\text{Para } G(s) = \\frac{s+6}{(s+2)(s+4)(s+12)} \\text{ com } \\zeta = 0{,}6, \\text{ projete o PI para zerar } e_{ss} \\text{ ao degrau e compare } \\varphi = 10^\\circ \\text{ com } \\varphi = 5^\\circ.',
    plantExpr: '(s+6)/((s+2)*(s+4)*(s+12))',
    plantLatex: '\\frac{s+6}{(s+2)(s+4)(s+12)}',
    controllerExpr: '92.0*(s+1.807)/s',
    controllerLatex: 'G_c(s) = 92{,}0\\frac{s + 1{,}807}{s}',
    controllerBlockLabel: 'Controlador PI (Proposto B)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'Para $\\zeta = 0{,}6$ em $s_d = -5{,}57 + j7{,}42$, tem-se $K_0 = 82{,}5$ e $e_P = 16{,}2\\% > 2\\% \\implies \\varphi = 10^\\circ$. Nenhum orçamento preserva simultaneamente $M_p$ e $t_s$: com $\\varphi = 10^\\circ$ ($z_i = 1{,}807$), mantém-se $t_s$ ($0{,}93\\text{ s}$), mas $M_p$ sobe de $13{,}1\\%$ para $19{,}5\\%$; com $\\varphi = 5^\\circ$ ($z_i = 0{,}952$), $M_p$ cai para $8{,}6\\%$, mas $t_s$ alonga para $1{,}69\\text{ s}$.',
    diagnostics: {
      systemType: 'Tipo 0 → Tipo 1 (após PI)',
      systemOrder: '3ª Ordem → 4ª Ordem',
      initialErrorLatex: 'K_a = 5{,}16 \\implies e_P = 16{,}2\\%',
      finalErrorLatex: 'e_{ss,\\text{degrau}} = 0 \\; (M_p = 19{,}5\\%,\\; t_s = 0{,}93\\text{ s})'
    },
    detailedSteps: [
      {
        title: '1. Polo Desejado $s_d$ no LGR para $\\zeta = 0{,}6$ e Ganho $K_0$ (Passo a Passo)',
        description:
          'Sobre a reta de amortecimento $\\beta = \\arccos(\\zeta)$ no LGR ($\\angle G(s_d) = -180^\\circ$), determinamos $s_d$ e aplicamos $K_0 = \\frac{1}{|G(s_d)|}$:',
        latex:
          '\\beta = \\arccos(0{,}6) = 53{,}13^\\circ \\implies \\omega_d = \\sigma_d\\frac{\\sqrt{1-0{,}6^2}}{0{,}6} = \\frac{4}{3}\\sigma_d \\;;\\; \\angle G(s_d) = 86{,}7^\\circ - (115{,}7^\\circ + 101{,}9^\\circ + 49{,}1^\\circ) = -180^\\circ \\implies \\mathbf{s_d = -5{,}57 + j7{,}42} \\;;\\; K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+6}{(s_d+2)(s_d+4)(s_d+12)}\\right|} = \\frac{1}{\\left|\\frac{-5{,}57+j7{,}42+6}{(-5{,}57+j7{,}42+2)(-5{,}57+j7{,}42+4)(-5{,}57+j7{,}42+12)}\\right|} \\;;\\; K_0 = \\frac{1}{\\frac{|0{,}43+j7{,}42|}{|-3{,}57+j7{,}42|\\cdot|-1{,}57+j7{,}42|\\cdot|6{,}43+j7{,}42|}} = \\frac{1}{\\frac{\\sqrt{0{,}43^2+7{,}42^2}}{\\sqrt{(-3{,}57)^2+7{,}42^2}\\cdot\\sqrt{(-1{,}57)^2+7{,}42^2}\\cdot\\sqrt{6{,}43^2+7{,}42^2}}} = \\frac{1}{\\frac{7{,}432}{8{,}234\\cdot 7{,}584\\cdot 9{,}818}} = \\frac{1}{0{,}01212} = \\mathbf{82{,}5} \\;;\\; G(0) = \\frac{6}{2\\cdot 4\\cdot 12} = \\frac{1}{16} \\;;\\; K_a = K_0 G(0) = 5{,}16 \\;;\\; e_P = \\frac{1}{1+5{,}16} = 16{,}2\\% > 2\\% \\implies \\varphi = 10^\\circ'
      },
      {
        title: '2. Cálculo de $|s_d|$, $\\beta$, $z_i$ ($\\varphi = 10^\\circ$ vs. $5^\\circ$) e Limite do Dipolo',
        description:
          'Calculando $|s_d|$, $\\beta = \\arccos(\\zeta) = \\arctan(\\omega_d/\\sigma_d)$ e comparando com $|s_{\\text{lenta}}|/1{,}1 = 2/1{,}1 = 1{,}818$:',
        latex:
          '|s_d| = \\sqrt{(-5{,}57)^2+7{,}42^2} = 9{,}278 \\;;\\; \\beta = \\arctan\\left(\\frac{7{,}42}{5{,}57}\\right) = 53{,}13^\\circ \\;;\\; z_{i,\\max}(10^\\circ) = |s_d|\\frac{\\sin 10^\\circ}{\\sin(53{,}13^\\circ+10^\\circ)} = 9{,}278\\frac{\\sin 10^\\circ}{\\sin 63{,}13^\\circ} = 1{,}807 \\implies z_i = \\min(1{,}807\\,;\\,1{,}818) = \\mathbf{1{,}807} \\;;\\; \\Delta\\theta_{\\text{perda}}(10^\\circ) = |\\angle(-3{,}763+j7{,}42) - \\angle(-5{,}57+j7{,}42)| = |116{,}89^\\circ - 126{,}89^\\circ| = \\mathbf{10{,}0^\\circ} \\;;\\; \\text{para } \\varphi = 5^\\circ:\\; z_i = 9{,}278\\frac{\\sin 5^\\circ}{\\sin 58{,}13^\\circ} = \\mathbf{0{,}952} \\;(\\Delta\\theta_{\\text{perda}} = |121{,}90^\\circ - 126{,}89^\\circ| = \\mathbf{5{,}0^\\circ})'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos) e Componentes ($R_1 = 10\\text{ k}\\Omega$)',
        description:
          'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ com $\\varphi = 10^\\circ$ (polos MF: $-4{,}54 \\pm j7{,}60$, $-7{,}14$ e $-1{,}78$):',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_i}{s_d}\\cdot\\frac{s_d+6}{(s_d+2)(s_d+4)(s_d+12)}\\right|} = \\frac{1}{\\left|\\frac{-5{,}57+j7{,}42+1{,}807}{-5{,}57+j7{,}42}\\cdot\\frac{-5{,}57+j7{,}42+6}{(-5{,}57+j7{,}42+2)(-5{,}57+j7{,}42+4)(-5{,}57+j7{,}42+12)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{|-3{,}763+j7{,}42|\\cdot|0{,}43+j7{,}42|}{|-5{,}57+j7{,}42|\\cdot|-3{,}57+j7{,}42|\\cdot|-1{,}57+j7{,}42|\\cdot|6{,}43+j7{,}42|}} = \\frac{1}{\\frac{\\sqrt{14{,}160+55{,}056}\\cdot\\sqrt{0{,}185+55{,}056}}{\\sqrt{31{,}025+55{,}056}\\cdot\\sqrt{12{,}745+55{,}056}\\cdot\\sqrt{2{,}465+55{,}056}\\cdot\\sqrt{41{,}345+55{,}056}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{69{,}217}\\cdot\\sqrt{55{,}241}}{\\sqrt{86{,}081}\\cdot\\sqrt{67{,}801}\\cdot\\sqrt{57{,}521}\\cdot\\sqrt{96{,}401}}} = \\frac{1}{\\frac{8{,}320\\cdot 7{,}432}{9{,}278\\cdot 8{,}234\\cdot 7{,}584\\cdot 9{,}818}} = \\frac{1}{\\frac{61{,}835}{5688{,}9}} = \\frac{1}{0{,}01087} = \\mathbf{92{,}0} \\;;\\; R_2 = K_c R_1 = 92{,}0\\cdot 10\\text{ k}\\Omega = \\mathbf{920\\text{ k}\\Omega} \\;;\\; C = \\frac{1}{z_i R_2} = \\frac{1}{1{,}807\\cdot 920\\cdot 10^3} = \\mathbf{0{,}60\\,\\mu\\text{F}}'
      }
    ],
    scilabCode: `// Slide 22 - Proposto B: G(s) = (s+6)/((s+2)(s+4)(s+12)) com PI
s = %s;
G = syslin('c', s+6, (s+2)*(s+4)*(s+12));
Gc = syslin('c', 92.0*(s+1.807), s);
t = 0:0.01:3; clf();
plot(t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
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
        title: '1. Método dos Ângulos dos Polos em $s_d = -1{,}2 + j1{,}8$',
        description:
          'Traçando os vetores do integrador ($0$) e dos polos da planta ($-1$ e $-2$) até $s_d = -1{,}2 + j1{,}8$: para $s_d$ ($-1{,}2+j1{,}8$, 2º quadrante) usamos $180^\\circ - \\arctan(1{,}8/1{,}2) = 123{,}7^\\circ$; para $s_d+1$ ($-0{,}2+j1{,}8$, 2º quadrante) usamos $180^\\circ - \\arctan(1{,}8/0{,}2) = 96{,}34^\\circ$; para $s_d+2$ ($0{,}8+j1{,}8$, 1º quadrante) usamos $\\arctan(1{,}8/0{,}8) = 66{,}04^\\circ$:',
        latex: '\\angle s_d = 123{,}7^\\circ \\;;\\; \\angle(s_d+1) = 96{,}34^\\circ \\;;\\; \\angle(s_d+2) = 66{,}04^\\circ \\implies \\sum\\theta_p = 286{,}08^\\circ'
      },
      {
        title: '2. Posição do Zero $z_c$ pela Condição de Ângulo do LGR',
        description:
          'Para que $s_d$ pertença ao LGR, $\\theta_z - \\sum\\theta_p = -180^\\circ$, logo o zero $(s + z_c)$ deve contribuir com $\\theta_z = 286{,}08^\\circ - 180^\\circ = 106{,}08^\\circ$ (no 2º quadrante, onde $-1{,}2 + z_c < 0$, ou seja, $z_c < 1{,}2$). Usando $\\tan(180^\\circ - \\theta_z) = \\frac{\\omega_d}{\\sigma_d - z_c}$:',
        latex: 'z_c = 1{,}2 - \\frac{1{,}8}{\\tan(106{,}08^\\circ)} = 1{,}2 - \\frac{1{,}8}{-3{,}469} = 1{,}2 + 0{,}519 \\implies \\mathbf{z_c = 0{,}68}'
      },
      {
        title: '3. Cálculo de $K_p$ pela Condição de Módulo (Passo a Passo)',
        description:
          'Impondo $|G_c(s_d) G(s_d)| = 1$ e calculando cada módulo complexo por $|a + jb| = \\sqrt{a^2 + b^2}$:',
        latex:
          'K_p = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+0{,}68}{s_d}\\cdot\\frac{1}{(s_d+1)(s_d+2)}\\right|} = \\frac{1}{\\left|\\frac{-1{,}2+j1{,}8+0{,}68}{(-1{,}2+j1{,}8)(-1{,}2+j1{,}8+1)(-1{,}2+j1{,}8+2)}\\right|} \\;;\\; K_p = \\frac{1}{\\frac{|-0{,}52+j1{,}8|}{|-1{,}2+j1{,}8|\\cdot|-0{,}2+j1{,}8|\\cdot|0{,}8+j1{,}8|}} = \\frac{1}{\\frac{\\sqrt{(-0{,}52)^2+1{,}8^2}}{\\sqrt{(-1{,}2)^2+1{,}8^2}\\cdot\\sqrt{(-0{,}2)^2+1{,}8^2}\\cdot\\sqrt{0{,}8^2+1{,}8^2}}} = \\frac{1}{\\frac{1{,}873}{2{,}163\\cdot 1{,}811\\cdot 1{,}970}} = \\frac{1}{0{,}2427} \\approx \\mathbf{4{,}12}'
      },
      {
        title: '4. Forma Paralela Final do Controlador PI ($K_p + K_i/s$)',
        description:
          'Expandindo $K_p\\frac{s+z_c}{s} = K_p + \\frac{K_p z_c}{s}$, obtemos $K_i = K_p \\cdot z_c = 4{,}12 \\cdot 0{,}68 = 2{,}80$:',
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
        title: '1. Método da Deficiência Angular em $s_d = -3 + j3$ e Avanço Máximo $\\varphi_{\\max}$ (Slides 9–11)',
        description:
          'Pela condição de ângulo do LGR, $\\angle G_c(s_d) + \\angle L(s_d) = -180^\\circ$. Como $L(s) = 1/s^2$ tem dois polos na origem ($p_{1,2} = 0$) e $s_d = -3 + j3$ está no 2º quadrante, calculamos $\\theta_{\\text{def}} = +90^\\circ$. Para saber quantos estágios $m$ são necessários ($\\theta_{\\text{def}}/m \\le \\varphi_{\\max}$), calculamos o avanço máximo $\\varphi_{\\max}$ de 1 estágio com $r = N + 1 = 11$ e $\\zeta = \\sigma_d/|s_d| = 3/\\sqrt{18} = 0{,}707$ (Slides 9–10):',
        latex:
          '\\theta_p = 180^\\circ - \\arctan\\left(\\frac{\\omega_d}{\\sigma_d}\\right) = 180^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 135^\\circ \\;;\\; \\angle L(s_d) = \\sum\\theta_z - \\sum\\theta_p = 0^\\circ - 2\\theta_p = -270^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d) = -180^\\circ - (-270^\\circ) = \\mathbf{+90^\\circ} \\;;\\; \\cot\\varphi_{\\max} = \\frac{2\\sqrt{r} - \\zeta(r+1)}{\\sqrt{1-\\zeta^2}\\,(r-1)} = \\frac{2\\sqrt{11} - 0{,}707(11+1)}{0{,}707(11-1)} = \\frac{6{,}633 - 8{,}484}{7{,}070} = \\frac{-1{,}851}{7{,}070} = -0{,}2618 \\;;\\; \\varphi_{\\max} = 90^\\circ + \\arctan(0{,}2618) = 90^\\circ + 14{,}67^\\circ = \\mathbf{104{,}7^\\circ} \\;(\\ge 90^\\circ \\implies m = 1\\text{ estágio, folga de } 104{,}7^\\circ - 90^\\circ = \\mathbf{14{,}7^\\circ})'
      },
      {
        title: '2. Derivação do Polinômio em $z_c$ ($r = N+1$, $\\varphi = 90^\\circ \\implies \\cot 90^\\circ = 0$)',
        description:
          'Da condição de fase $\\cot\\varphi = \\frac{(\\sigma_d - z_c)(\\sigma_d - r z_c) + \\omega_d^2}{\\omega_d(r-1)z_c}$ com $p_c = r z_c$, obtém-se $c_2 z_c^2 + c_1 z_c + c_0 = 0$. Escolhemos a maior raiz por Bhaskara (a menor $0{,}616$ gera polo lento em $-0{,}78$):',
        latex:
          'r = N + 1 = 10 + 1 = 11 \\;;\\; c_2 = r = 11 \\;;\\; c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi] = -[3(11+1) + 3(11-1)\\cot 90^\\circ] = -36 \\;;\\; c_0 = \\sigma_d^2 + \\omega_d^2 = 3^2 + 3^2 = 18 \\;;\\; c_2 z_c^2 + c_1 z_c + c_0 = 0 \\implies 11 z_c^2 - 36 z_c + 18 = 0 \\;;\\; \\Delta = c_1^2 - 4 c_2 c_0 = (-36)^2 - 4\\cdot 11\\cdot 18 = 504 \\;(\\sqrt{\\Delta} = 22{,}45) \\;;\\; z_c = \\frac{-c_1 + \\sqrt{\\Delta}}{2 c_2} = \\frac{36 + 22{,}45}{2\\cdot 11} = \\mathbf{2{,}657} \\;;\\; p_c = r\\cdot z_c = 11 \\cdot 2{,}657 = \\mathbf{29{,}22} \\;;\\; \\angle(s_d+z_c) = \\angle(-3+j3+2{,}657) = \\angle(-0{,}343+j3) = 180^\\circ - \\arctan\\left(\\frac{3}{0{,}343}\\right) = 96{,}52^\\circ \\;;\\; \\angle(s_d+p_c) = \\angle(-3+j3+29{,}22) = \\angle(26{,}22+j3) = \\arctan\\left(\\frac{3}{26{,}22}\\right) = 6{,}53^\\circ \\;;\\; \\angle G_c(s_d) = \\angle(s_d+z_c) - \\angle(s_d+p_c) = 96{,}52^\\circ - 6{,}53^\\circ = \\mathbf{90{,}00^\\circ}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo e 3º Polo de Malha Fechada',
        description:
          'Isolando $K_c$ em $|K_c \\bar{G}_c(s_d) L(s_d)| = 1$ e calculando o 3º polo pela soma das raízes de $s^3 + p_c s^2 + K_c s + K_c z_c = 0$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d^2}\\right|} = \\frac{1}{\\left|\\frac{-3+j3+2{,}657}{-3+j3+29{,}22}\\cdot\\frac{1}{(-3+j3)^2}\\right|} \\;;\\; K_c = \\frac{1}{\\left|\\frac{-0{,}343+j3}{26{,}22+j3}\\cdot\\frac{1}{(-3+j3)^2}\\right|} = \\frac{1}{\\frac{|-0{,}343+j3|}{|26{,}22+j3|\\cdot|-3+j3|^2}} = \\frac{1}{\\frac{\\sqrt{(-0{,}343)^2+3^2}}{\\sqrt{26{,}22^2+3^2}\\cdot(3^2+3^2)}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{0{,}118+9}}{\\sqrt{687{,}49+9}\\cdot 18}} = \\frac{1}{\\frac{\\sqrt{9{,}118}}{\\sqrt{696{,}49}\\cdot 18}} = \\frac{1}{\\frac{3{,}020}{26{,}391\\cdot 18}} = \\frac{1}{\\frac{3{,}020}{475{,}04}} = \\frac{1}{0{,}006356} \\approx \\mathbf{157{,}3} \\;;\\; 1 + G_c(s)L(s) = 0 \\implies s^2(s+p_c) + K_c(s+z_c) = s^3 + p_c s^2 + K_c s + K_c z_c = 0 \\;;\\; p_1 + p_2 + p_3 = -p_c \\implies (-2\\sigma_d) + p_3 = -p_c \\implies p_3 = -p_c - (-2\\sigma_d) = -29{,}22 + 6 = \\mathbf{-23{,}22} \\;;\\; \\mathbf{G_c(s) = 157{,}3\\frac{s+2{,}657}{s+29{,}22}}'
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
        title: '1. Passo 1 — Método de Conversão das Especificações em Polo Desejado ($s_d$)',
        description:
          'Equações de 2ª ordem padrão a partir de $\\zeta = 0{,}707$ e $\\omega_d = 3\\text{ rad/s}$ ($s_d = -\\sigma_d + j\\omega_d$):',
        latex:
          'M_p = e^{-\\frac{\\pi\\zeta}{\\sqrt{1-\\zeta^2}}} = e^{-\\frac{\\pi\\cdot 0{,}707}{\\sqrt{1-0{,}707^2}}} = e^{-\\pi} = 4{,}3\\% \\;;\\; t_p = \\frac{\\pi}{\\omega_d} = \\frac{\\pi}{3} = 1{,}05\\text{ s} \\;;\\; \\sigma_d = \\frac{\\zeta\\cdot\\omega_d}{\\sqrt{1-\\zeta^2}} = \\frac{0{,}707\\cdot 3}{0{,}707} = 3 \\;;\\; t_s \\approx \\frac{4}{\\sigma_d} = \\frac{4}{3} = 1{,}33\\text{ s} \\;;\\; s_d = -\\sigma_d + j\\omega_d = \\mathbf{-3 + j3}'
      },
      {
        title: '2. Passo 2 — Método da Deficiência Angular ($\\theta_{\\text{def}}$) por Trigonometria',
        description:
          'Condição de ângulo do LGR: $\\angle G_c(s_d) + \\angle L(s_d) = -180^\\circ$. Calculando o ângulo de cada polo ($p_1 = 0$, $p_2 = -3$) até $s_d = -3 + j3$:',
        latex:
          '\\theta_1 = 180^\\circ - \\arctan\\left(\\frac{\\omega_d}{|-\\sigma_d - p_1|}\\right) = 180^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\angle(s_d - p_2) = \\angle(-3+j3 - (-3)) = \\angle(0+j3) = 90^\\circ \\;;\\; \\angle L(s_d) = \\sum\\theta_z - \\sum\\theta_p = 0^\\circ - (\\theta_1 + \\theta_2) = -(135^\\circ + 90^\\circ) = -225^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d) = -180^\\circ - (-225^\\circ) = \\mathbf{+45^\\circ}'
      },
      {
        title: '3. Passos 3 e 4 — Equações do Polinômio em $z_c$ ($N = 10 \\implies r = N + 1$)',
        description:
          'Da condição de fase $\\angle(s_d + z_c) - \\angle(s_d + r z_c) = \\varphi$ ($\\varphi = 45^\\circ$) com $p_c = r z_c$, obtém-se $c_2 z_c^2 + c_1 z_c + c_0 = 0$. Escolhe-se a maior raiz por Bhaskara (descarta-se $0{,}286$ para evitar zero lento):',
        latex:
          'r = N + 1 = 10 + 1 = 11 \\;;\\; c_2 = r = 11 \\;;\\; c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi] = -[3(11+1) + 3(11-1)\\cot 45^\\circ] = -66 \\;;\\; c_0 = \\sigma_d^2 + \\omega_d^2 = 3^2 + 3^2 = 18 \\;;\\; c_2 z_c^2 + c_1 z_c + c_0 = 0 \\implies 11 z_c^2 - 66 z_c + 18 = 0 \\;;\\; \\Delta = c_1^2 - 4 c_2 c_0 = (-66)^2 - 4\\cdot 11\\cdot 18 = 3564 \\;(\\sqrt{\\Delta} = 59{,}70) \\;;\\; z_c = \\frac{-c_1 + \\sqrt{\\Delta}}{2 c_2} = \\frac{66 + 59{,}70}{2\\cdot 11} = \\mathbf{5{,}714} \\; (> \\sigma_d = 3) \\;;\\; p_c = r\\cdot z_c = 11\\cdot 5{,}714 = \\mathbf{62{,}85} \\;;\\; \\angle(s_d+z_c) = \\angle(-3+j3+5{,}714) = \\angle(2{,}714+j3) = \\arctan\\left(\\frac{3}{2{,}714}\\right) = 47{,}87^\\circ \\;;\\; \\angle(s_d+p_c) = \\angle(-3+j3+62{,}85) = \\angle(59{,}85+j3) = \\arctan\\left(\\frac{3}{59{,}85}\\right) = 2{,}87^\\circ \\;;\\; \\angle G_c(s_d) = \\angle(s_d+z_c) - \\angle(s_d+p_c) = 47{,}87^\\circ - 2{,}87^\\circ = \\mathbf{45{,}00^\\circ}'
      },
      {
        title: '4. Passo 5 — Método da Condição de Módulo para $K_c$ (Passo a Passo)',
        description:
          'Pela condição de módulo $|K_c \\bar{G}_c(s_d) L(s_d)| = 1$, isolamos $K_c$ e aplicamos $|a+jb| = \\sqrt{a^2+b^2}$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{-3+j3+5{,}714}{-3+j3+62{,}85}\\cdot\\frac{1}{(-3+j3)(-3+j3+3)}\\right|} \\;;\\; K_c = \\frac{1}{\\left|\\frac{2{,}714+j3}{59{,}85+j3}\\cdot\\frac{1}{(-3+j3)(j3)}\\right|} = \\frac{1}{\\frac{|2{,}714+j3|}{|59{,}85+j3|\\cdot|-3+j3|\\cdot|j3|}} = \\frac{1}{\\frac{\\sqrt{2{,}714^2+3^2}}{\\sqrt{59{,}85^2+3^2}\\cdot\\sqrt{(-3)^2+3^2}\\cdot 3}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{7{,}366+9}}{\\sqrt{3582{,}02+9}\\cdot\\sqrt{9+9}\\cdot 3}} = \\frac{1}{\\frac{\\sqrt{16{,}366}}{\\sqrt{3591{,}02}\\cdot\\sqrt{18}\\cdot 3}} = \\frac{1}{\\frac{4{,}0455}{59{,}925\\cdot 4{,}2426\\cdot 3}} = \\frac{1}{\\frac{4{,}0455}{762{,}71}} = \\frac{1}{0{,}005304} \\approx \\mathbf{188{,}5} \\;;\\; \\mathbf{G_c(s) = 188{,}5\\frac{s+5{,}714}{s+62{,}85}}'
      },
      {
        title: '5. Passo 6 — Equações para $(K_p, T_d, K_d)$ e Fatoração em Malha Fechada',
        description:
          'Comparando $G_c(s) = K_c\\frac{s+z_c}{s+p_c}$ com $K_p\\left(1 + \\frac{Ns}{s+N/T_d}\\right)$ e usando a soma das raízes de $s(s+3)(s+p_c) + K_c(s+z_c) = 0$. Sem pré-filtro, $T_{\\text{sem}}(s) = \\frac{188{,}5(s+5{,}714)}{(s^2+6s+18)(s+59{,}85)}$ possui o zero em $-5{,}714$, que adiciona o termo derivativo $+\\frac{1}{z_c}\\dot{c}_0(t)$ à resposta ao degrau e antecipa o pico para $t_p = 0{,}79\\text{ s}$ com $M_p = 7{,}0\\%$; ao multiplicar pelo pré-filtro $F(s) = \\frac{5{,}714}{s+5{,}714}$, o fator $(s+5{,}714)$ cancela e recupera $M_p = 4{,}3\\%$ ($t_p = 1{,}06\\text{ s}$):',
        latex:
          'K_c = K_p(N+1) = K_p r \\implies K_p = \\frac{K_c}{r} = \\frac{188{,}5}{11} = 17{,}14 \\;;\\; p_c = \\frac{N}{T_d} \\implies T_d = \\frac{N}{p_c} = \\frac{10}{62{,}85} = 0{,}159\\text{ s} \\;;\\; K_d = K_p T_d = 17{,}14\\cdot 0{,}159 = 2{,}73 \\;;\\; 1 + G_c(s)L(s) = 0 \\implies 1 + K_c\\frac{s+z_c}{s+p_c}\\cdot\\frac{1}{s(s+3)} = 0 \\;;\\; s(s+3)(s+p_c) + K_c(s+z_c) = 0 \\implies s\\big(s^2 + (3+p_c)s + 3p_c\\big) + K_c s + K_c z_c = 0 \\;;\\; s^3 + (3 + p_c)s^2 + (3p_c + K_c)s + K_c z_c = 0 \\;;\\; p_1 + p_2 + p_3 = -(3 + p_c) \\;\\text{ com }\\; p_{1,2} = -\\sigma_d \\pm j\\omega_d \\implies (-2\\sigma_d) + p_3 = -(3 + p_c) \\;;\\; p_3 = -(3 + p_c) - (-2\\sigma_d) = -(3 + 62{,}85) + 6 = \\mathbf{-59{,}85} \\;;\\; s^3 + (3+62{,}85)s^2 + (3\\cdot 62{,}85 + 188{,}5)s + 188{,}5\\cdot 5{,}714 = 0 \\;;\\; s^3 + 65{,}85s^2 + (188{,}55 + 188{,}5)s + 1077{,}1 = 0 \\;;\\; (s+3-j3)(s+3+j3)(s+59{,}85) = (s^2+6s+18)(s+59{,}85) = s^3 + 65{,}85s^2 + 377{,}1s + 1077{,}3 = 0'
      },
      {
        title: '6. Regra dos 10 V (E9) e Erro em Regime Permanente (E10) — Slide 26',
        description:
          'Teorema do Valor Inicial para o pico de controle $u(0^+)$ e constante de erro de velocidade $K_{\\text{vel}}$ para rampa unitária:',
        latex:
          'u(0^+) = \\lim_{s\\to\\infty} s\\,G_c(s)\\frac{\\Delta e}{s} = K_c\\Delta e = 188{,}5\\,\\Delta e \\implies \\Delta e \\le \\frac{10}{K_c} = \\frac{10}{188{,}5} = 0{,}053\\text{ V} \\;;\\; \\text{com } F(s):\\; u_{\\text{pico}} = 15{,}3\\,\\Delta e \\implies \\Delta e \\le \\frac{10}{15{,}3} = \\mathbf{0{,}65\\text{ V}} \\;;\\; K_{\\text{vel}} = \\lim_{s\\to 0} s\\,G_c(s)L(s) = K_p\\lim_{s\\to 0}\\frac{1}{s+3} = \\frac{17{,}14}{3} = 5{,}71 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{K_{\\text{vel}}} = \\frac{1}{5{,}71} = \\mathbf{0{,}175\\text{ V}} \\;;\\; e_{ss,\\text{degrau}} = 0'
      },
      {
        title: '7. Método de Síntese Analógica com Amp-Op (E11 e E12) — Slides 27–28',
        description:
          'Da razão de impedâncias $\\frac{Z_2(s)}{Z_1(s)} = \\frac{C_1}{C_2}\\frac{s + 1/(R_1 C_1)}{s + 1/(R_2 C_2)} = K_c\\frac{s+z_c}{s+p_c}$, escolhendo $C_1 = 10\\,\\mu\\text{F}$ (com valores comerciais E96: $R_1 = 17{,}4\\text{ k}\\Omega$, $R_2 = 301\\text{ k}\\Omega$, $C_2 = 47\\text{ nF}\\parallel 6{,}8\\text{ nF} = 53{,}8\\text{ nF}$, desvios $<2\\%$):',
        latex:
          'R_1 = \\frac{1}{z_c C_1} = \\frac{1}{5{,}714\\cdot 10^{-5}} = \\mathbf{17{,}5\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = 17{,}14\\cdot 17{,}5\\text{ k}\\Omega = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\frac{1}{62{,}85\\cdot 300\\cdot 10^3} = \\mathbf{53{,}0\\text{ nF}} \\;;\\; K_c = \\frac{C_1}{C_2} = \\frac{10\\,\\mu\\text{F}}{53{,}0\\text{ nF}} = 188{,}5 \\;;\\; f_{\\text{disp}} = \\frac{\\text{GBW}}{K_c} = \\frac{1\\text{ MHz}}{188{,}5} = 5{,}3\\text{ kHz} \\gg f_p = \\frac{p_c}{2\\pi} = \\frac{62{,}85}{6{,}283} = 10\\text{ Hz}'
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
        title: '1. Polo Desejado $s_d$ e Método da Deficiência Angular ($\\theta_{\\text{def}}$)',
        description:
          'Calculando $\\sigma_d$ a partir de $\\zeta = 0{,}707$ e $\\omega_d = 3\\text{ rad/s}$, e aplicando a condição de ângulo do LGR $\\angle G_c(s_d) + \\angle L(s_d) = -180^\\circ$:',
        latex:
          '\\sigma_d = \\frac{\\zeta\\omega_d}{\\sqrt{1-\\zeta^2}} = \\frac{0{,}707\\cdot 3}{0{,}707} = 3 \\implies s_d = -\\sigma_d + j\\omega_d = -3 + j3 \\;;\\; \\theta_1 = 180^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\angle(-3+j3 - (-3)) = \\angle(0+j3) = 90^\\circ \\;;\\; \\angle L(s_d) = -(135^\\circ + 90^\\circ) = -225^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d) = -180^\\circ - (-225^\\circ) = \\mathbf{+45{,}0^\\circ}'
      },
      {
        title: '2. Equações do Polinômio em $z_c$ para $N = 8$ ($r = N + 1$)',
        description:
          'Com $\\varphi = 45^\\circ$ e $p_c = r z_c$, substituímos $\\sigma_d = 3$, $\\omega_d = 3$ e $r = 9$ nas equações do polinômio e resolvemos por Bhaskara (descarta-se $0{,}354$ para evitar zero lento):',
        latex:
          'r = N + 1 = 8 + 1 = 9 \\;;\\; c_2 = r = 9 \\;;\\; c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi] = -[3(9+1) + 3(9-1)\\cot 45^\\circ] = -54{,}0 \\;;\\; c_0 = \\sigma_d^2 + \\omega_d^2 = 3^2 + 3^2 = 18 \\;;\\; c_2 z_c^2 + c_1 z_c + c_0 = 0 \\implies 9z_c^2 - 54{,}0 z_c + 18 = 0 \\;;\\; \\Delta = c_1^2 - 4 c_2 c_0 = (-54)^2 - 4\\cdot 9\\cdot 18 = 2268 \\;(\\sqrt{\\Delta} = 47{,}62) \\;;\\; z_c = \\frac{-c_1 + \\sqrt{\\Delta}}{2 c_2} = \\frac{54{,}0 + 47{,}62}{2\\cdot 9} = \\mathbf{5{,}646} \\; (> \\sigma_d = 3) \\;;\\; p_c = r\\cdot z_c = 9\\cdot 5{,}646 = \\mathbf{50{,}81} \\;;\\; \\angle(s_d+z_c) = \\angle(-3+j3+5{,}646) = \\angle(2{,}646+j3) = \\arctan\\left(\\frac{3}{2{,}646}\\right) = 48{,}59^\\circ \\;;\\; \\angle(s_d+p_c) = \\angle(-3+j3+50{,}81) = \\angle(47{,}81+j3) = \\arctan\\left(\\frac{3}{47{,}81}\\right) = 3{,}59^\\circ \\;;\\; \\angle G_c(s_d) = \\angle(s_d+z_c) - \\angle(s_d+p_c) = 48{,}59^\\circ - 3{,}59^\\circ = \\mathbf{45{,}00^\\circ}'
      },
      {
        title: '3. Método da Condição de Módulo para o Ganho $K_c$',
        description:
          'Isolando $K_c$ em $|K_c \\bar{G}_c(s_d)L(s_d)| = 1$ e calculando cada módulo $|a+jb| = \\sqrt{a^2+b^2}$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{-3+j3+5{,}646}{-3+j3+50{,}81}\\cdot\\frac{1}{(-3+j3)(-3+j3+3)}\\right|} \\;;\\; K_c = \\frac{1}{\\left|\\frac{2{,}646+j3}{47{,}81+j3}\\cdot\\frac{1}{(-3+j3)(j3)}\\right|} = \\frac{1}{\\frac{|2{,}646+j3|}{|47{,}81+j3|\\cdot|-3+j3|\\cdot|j3|}} = \\frac{1}{\\frac{\\sqrt{2{,}646^2+3^2}}{\\sqrt{47{,}81^2+3^2}\\cdot\\sqrt{(-3)^2+3^2}\\cdot 3}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{7{,}001+9}}{\\sqrt{2285{,}80+9}\\cdot\\sqrt{9+9}\\cdot 3}} = \\frac{1}{\\frac{\\sqrt{16{,}001}}{\\sqrt{2294{,}80}\\cdot\\sqrt{18}\\cdot 3}} = \\frac{1}{\\frac{4{,}0002}{47{,}904\\cdot 4{,}2426\\cdot 3}} = \\frac{1}{\\frac{4{,}0002}{609{,}71}} = \\frac{1}{0{,}006561} \\approx \\mathbf{152{,}4} \\;;\\; \\mathbf{G_c(s) = 152{,}4\\frac{s+5{,}646}{s+50{,}81}}'
      },
      {
        title: '4. Equações para $(K_p, T_d, K_d)$, Polo Rápido e Pré-Filtro $F(s)$',
        description:
          'Sem $F(s)$: $M_p = 7{,}1\\%$, $t_p = 0{,}79\\text{ s}$; com $F(s) = \\frac{5{,}646}{s+5{,}646}$: $M_p = 4{,}3\\%$, $t_p = 1{,}07\\text{ s}$:',
        latex:
          'K_c = K_p(N+1) = K_p r \\implies K_p = \\frac{K_c}{r} = \\frac{152{,}4}{9} = \\mathbf{16{,}94} \\;;\\; p_c = \\frac{N}{T_d} \\implies T_d = \\frac{N}{p_c} = \\frac{8}{50{,}81} = \\mathbf{0{,}157\\text{ s}} \\;;\\; K_d = K_p T_d = 16{,}94\\cdot 0{,}157 = 2{,}67 \\;;\\; 1 + G_c(s)L(s) = 0 \\implies 1 + K_c\\frac{s+z_c}{s+p_c}\\cdot\\frac{1}{s(s+3)} = 0 \\;;\\; s(s+3)(s+p_c) + K_c(s+z_c) = 0 \\implies s\\big(s^2 + (3+p_c)s + 3p_c\\big) + K_c s + K_c z_c = 0 \\;;\\; s^3 + (3 + p_c)s^2 + (3p_c + K_c)s + K_c z_c = 0 \\;;\\; p_1 + p_2 + p_3 = -(3 + p_c) \\;\\text{ com }\\; p_{1,2} = -\\sigma_d \\pm j\\omega_d \\implies (-2\\sigma_d) + p_3 = -(3 + p_c) \\;;\\; p_3 = -(3 + p_c) - (-2\\sigma_d) = -(3 + 50{,}81) + 6 = \\mathbf{-47{,}81} \\;;\\; s^3 + (3+50{,}81)s^2 + (3\\cdot 50{,}81 + 152{,}4)s + 152{,}4\\cdot 5{,}646 = 0 \\;;\\; s^3 + 53{,}81s^2 + 304{,}8s + 860{,}5 = (s^2+6s+18)(s+47{,}81) = 0'
      },
      {
        title: '5. Regra dos 10 V, Erro à Rampa ($K_{\\text{vel}}$) e Dimensionamento RC ($C_1 = 10\\,\\mu\\text{F}$)',
        description:
          'Pico de atuação por volt de $\\Delta e$: $152{,}4$ (sem $F$) e $14{,}8$ (com $F$). Aplicando as equações de erro em regime e da razão de impedâncias $Z_2(s)/Z_1(s)$:',
        latex:
          'K_{\\text{vel}} = K_p\\lim_{s\\to 0}\\frac{1}{s+3} = \\frac{16{,}94}{3} = 5{,}65 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{K_{\\text{vel}}} = \\frac{1}{5{,}65} = 0{,}177\\text{ V} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\frac{1}{5{,}646\\cdot 10^{-5}} = \\mathbf{17{,}7\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = 16{,}94\\cdot 17{,}7\\text{ k}\\Omega = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\frac{1}{50{,}81\\cdot 300\\cdot 10^3} = \\mathbf{65{,}6\\text{ nF}}'
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
        title: '1. Polo Desejado $s_d$ e Método da Deficiência Angular ($\\theta_{\\text{def}}$)',
        description:
          'Calculando $\\sigma_d$ a partir de $\\zeta = 0{,}707$ e $\\omega_d = 3\\text{ rad/s}$, e aplicando $\\angle G_c(s_d) + \\angle L(s_d) = -180^\\circ$:',
        latex:
          '\\sigma_d = \\frac{\\zeta\\omega_d}{\\sqrt{1-\\zeta^2}} = \\frac{0{,}707\\cdot 3}{0{,}707} = 3 \\implies s_d = -\\sigma_d + j\\omega_d = -3 + j3 \\;;\\; \\theta_1 = 180^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\angle(-3+j3 - (-3)) = \\angle(0+j3) = 90^\\circ \\;;\\; \\angle L(s_d) = -(135^\\circ + 90^\\circ) = -225^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d) = -180^\\circ - (-225^\\circ) = \\mathbf{+45{,}0^\\circ}'
      },
      {
        title: '2. Equações do Polinômio em $z_c$ para $N = 12$ ($r = N + 1$)',
        description:
          'Com $\\varphi = 45^\\circ$ e $p_c = r z_c$, substituímos $\\sigma_d = 3$, $\\omega_d = 3$ e $r = 13$ nas equações do polinômio e resolvemos por Bhaskara (descarta-se $0{,}240$):',
        latex:
          'r = N + 1 = 12 + 1 = 13 \\;;\\; c_2 = r = 13 \\;;\\; c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi] = -[3(13+1) + 3(13-1)\\cot 45^\\circ] = -78{,}0 \\;;\\; c_0 = \\sigma_d^2 + \\omega_d^2 = 3^2 + 3^2 = 18 \\;;\\; c_2 z_c^2 + c_1 z_c + c_0 = 0 \\implies 13z_c^2 - 78{,}0 z_c + 18 = 0 \\;;\\; \\Delta = c_1^2 - 4 c_2 c_0 = (-78)^2 - 4\\cdot 13\\cdot 18 = 5148 \\;(\\sqrt{\\Delta} = 71{,}75) \\;;\\; z_c = \\frac{-c_1 + \\sqrt{\\Delta}}{2 c_2} = \\frac{78{,}0 + 71{,}75}{2\\cdot 13} = \\mathbf{5{,}760} \\; (> \\sigma_d = 3) \\;;\\; p_c = r\\cdot z_c = 13\\cdot 5{,}760 = \\mathbf{74{,}87} \\;;\\; \\angle(s_d+z_c) = \\angle(-3+j3+5{,}760) = \\angle(2{,}760+j3) = \\arctan\\left(\\frac{3}{2{,}760}\\right) = 47{,}39^\\circ \\;;\\; \\angle(s_d+p_c) = \\angle(-3+j3+74{,}87) = \\angle(71{,}87+j3) = \\arctan\\left(\\frac{3}{71{,}87}\\right) = 2{,}39^\\circ \\;;\\; \\angle G_c(s_d) = \\angle(s_d+z_c) - \\angle(s_d+p_c) = 47{,}39^\\circ - 2{,}39^\\circ = \\mathbf{45{,}00^\\circ}'
      },
      {
        title: '3. Método da Condição de Módulo para o Ganho $K_c$',
        description:
          'Isolando $K_c$ em $|K_c \\bar{G}_c(s_d) L(s_d)| = 1$ e calculando $|a+jb| = \\sqrt{a^2+b^2}$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{-3+j3+5{,}760}{-3+j3+74{,}87}\\cdot\\frac{1}{(-3+j3)(-3+j3+3)}\\right|} \\;;\\; K_c = \\frac{1}{\\left|\\frac{2{,}760+j3}{71{,}87+j3}\\cdot\\frac{1}{(-3+j3)(j3)}\\right|} = \\frac{1}{\\frac{|2{,}760+j3|}{|71{,}87+j3|\\cdot|-3+j3|\\cdot|j3|}} = \\frac{1}{\\frac{\\sqrt{2{,}760^2+3^2}}{\\sqrt{71{,}87^2+3^2}\\cdot\\sqrt{(-3)^2+3^2}\\cdot 3}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{7{,}618+9}}{\\sqrt{5165{,}30+9}\\cdot\\sqrt{9+9}\\cdot 3}} = \\frac{1}{\\frac{\\sqrt{16{,}618}}{\\sqrt{5174{,}30}\\cdot\\sqrt{18}\\cdot 3}} = \\frac{1}{\\frac{4{,}0765}{71{,}933\\cdot 4{,}2426\\cdot 3}} = \\frac{1}{\\frac{4{,}0765}{915{,}54}} = \\frac{1}{0{,}004453} \\approx \\mathbf{224{,}6} \\;;\\; \\mathbf{G_c(s) = 224{,}6\\frac{s+5{,}760}{s+74{,}87}}'
      },
      {
        title: '4. Equações para $(K_p, T_d, K_d)$, Polo Rápido e Pré-Filtro $F(s)$',
        description:
          'Sem $F(s)$: $M_p = 7{,}0\\%$, $t_p = 0{,}79\\text{ s}$; com $F(s) = \\frac{5{,}760}{s+5{,}760}$: $M_p = 4{,}3\\%$, $t_p = 1{,}06\\text{ s}$:',
        latex:
          'K_c = K_p(N+1) = K_p r \\implies K_p = \\frac{K_c}{r} = \\frac{224{,}6}{13} = \\mathbf{17{,}28} \\;;\\; p_c = \\frac{N}{T_d} \\implies T_d = \\frac{N}{p_c} = \\frac{12}{74{,}87} = \\mathbf{0{,}160\\text{ s}} \\;;\\; K_d = K_p T_d = 17{,}28\\cdot 0{,}160 = 2{,}77 \\;;\\; 1 + G_c(s)L(s) = 0 \\implies 1 + K_c\\frac{s+z_c}{s+p_c}\\cdot\\frac{1}{s(s+3)} = 0 \\;;\\; s(s+3)(s+p_c) + K_c(s+z_c) = 0 \\implies s\\big(s^2 + (3+p_c)s + 3p_c\\big) + K_c s + K_c z_c = 0 \\;;\\; s^3 + (3 + p_c)s^2 + (3p_c + K_c)s + K_c z_c = 0 \\;;\\; p_1 + p_2 + p_3 = -(3 + p_c) \\;\\text{ com }\\; p_{1,2} = -\\sigma_d \\pm j\\omega_d \\implies (-2\\sigma_d) + p_3 = -(3 + p_c) \\;;\\; p_3 = -(3 + p_c) - (-2\\sigma_d) = -(3 + 74{,}87) + 6 = \\mathbf{-71{,}87} \\;;\\; s^3 + (3+74{,}87)s^2 + (3\\cdot 74{,}87 + 224{,}6)s + 224{,}6\\cdot 5{,}760 = 0 \\;;\\; s^3 + 77{,}87s^2 + 449{,}2s + 1293{,}7 = (s^2+6s+18)(s+71{,}87) = 0'
      },
      {
        title: '5. Regra dos 10 V, Erro à Rampa ($K_{\\text{vel}}$) e Dimensionamento RC ($C_1 = 10\\,\\mu\\text{F}$)',
        description:
          'Pico de atuação por volt de $\\Delta e$: $224{,}6$ (sem $F$) e $15{,}6$ (com $F$). Aplicando as equações de erro em regime e da razão de impedâncias $Z_2(s)/Z_1(s)$:',
        latex:
          'K_{\\text{vel}} = K_p\\lim_{s\\to 0}\\frac{1}{s+3} = \\frac{17{,}28}{3} = 5{,}76 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{K_{\\text{vel}}} = \\frac{1}{5{,}76} = 0{,}174\\text{ V} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\frac{1}{5{,}760\\cdot 10^{-5}} = \\mathbf{17{,}4\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = 17{,}28\\cdot 17{,}4\\text{ k}\\Omega = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\frac{1}{74{,}87\\cdot 300\\cdot 10^3} = \\mathbf{44{,}5\\text{ nF}}'
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
        title: '1. Polo Desejado $s_d = -2 + j2$ e Método da Deficiência Angular ($\\theta_{\\text{def}}$)',
        description:
          'Calculando $\\sigma_d$ a partir de $\\zeta = 0{,}707$ e $\\omega_d = 2\\text{ rad/s}$, e aplicando $\\angle G_c(s_d) + \\angle L(s_d) = -180^\\circ$:',
        latex:
          '\\sigma_d = \\frac{\\zeta\\omega_d}{\\sqrt{1-\\zeta^2}} = \\frac{0{,}707\\cdot 2}{0{,}707} = 2 \\implies s_d = -\\sigma_d + j\\omega_d = -2 + j2 \\;;\\; \\theta_1 = 180^\\circ - \\arctan\\left(\\frac{2}{2}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\arctan\\left(\\frac{2}{3-2}\\right) = 63{,}43^\\circ \\;;\\; \\angle L(s_d) = -(135^\\circ + 63{,}43^\\circ) = -198{,}43^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d) = -180^\\circ - (-198{,}43^\\circ) = \\mathbf{+18{,}4^\\circ}'
      },
      {
        title: '2. Equações do Polinômio em $z_c$ para $N = 10$ ($r = N + 1$, $\\cot 18{,}43^\\circ = 3$)',
        description:
          'Substituindo $\\sigma_d = 2$, $\\omega_d = 2$, $r = 11$ e $\\cot\\varphi = 3$ nas equações do polinômio e resolvendo por Bhaskara (descarta-se $0{,}096$):',
        latex:
          'r = N + 1 = 10 + 1 = 11 \\;;\\; c_2 = r = 11 \\;;\\; c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi] = -[2(11+1) + 2(11-1)\\cdot 3] = -84{,}0 \\;;\\; c_0 = \\sigma_d^2 + \\omega_d^2 = 2^2 + 2^2 = 8 \\;;\\; c_2 z_c^2 + c_1 z_c + c_0 = 0 \\implies 11z_c^2 - 84{,}0 z_c + 8 = 0 \\;;\\; \\Delta = c_1^2 - 4 c_2 c_0 = (-84)^2 - 4\\cdot 11\\cdot 8 = 6704 \\;(\\sqrt{\\Delta} = 81{,}88) \\;;\\; z_c = \\frac{-c_1 + \\sqrt{\\Delta}}{2 c_2} = \\frac{84{,}0 + 81{,}88}{2\\cdot 11} = \\mathbf{7{,}540} \\; (> \\sigma_d = 2) \\;;\\; p_c = r\\cdot z_c = 11\\cdot 7{,}540 = \\mathbf{82{,}94} \\;;\\; \\angle(s_d+z_c) = \\angle(-2+j2+7{,}540) = \\angle(5{,}540+j2) = \\arctan\\left(\\frac{2}{5{,}540}\\right) = 19{,}85^\\circ \\;;\\; \\angle(s_d+p_c) = \\angle(-2+j2+82{,}94) = \\angle(80{,}94+j2) = \\arctan\\left(\\frac{2}{80{,}94}\\right) = 1{,}42^\\circ \\;;\\; \\angle G_c(s_d) = \\angle(s_d+z_c) - \\angle(s_d+p_c) = 19{,}85^\\circ - 1{,}42^\\circ = \\mathbf{18{,}43^\\circ}'
      },
      {
        title: '3. Método da Condição de Módulo para o Ganho $K_c$',
        description:
          'Isolando $K_c$ em $|K_c \\bar{G}_c(s_d) L(s_d)| = 1$ e calculando $|a+jb| = \\sqrt{a^2+b^2}$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{-2+j2+7{,}540}{-2+j2+82{,}94}\\cdot\\frac{1}{(-2+j2)(-2+j2+3)}\\right|} \\;;\\; K_c = \\frac{1}{\\left|\\frac{5{,}540+j2}{80{,}94+j2}\\cdot\\frac{1}{(-2+j2)(1+j2)}\\right|} = \\frac{1}{\\frac{|5{,}540+j2|}{|80{,}94+j2|\\cdot|-2+j2|\\cdot|1+j2|}} = \\frac{1}{\\frac{\\sqrt{5{,}540^2+2^2}}{\\sqrt{80{,}94^2+2^2}\\cdot\\sqrt{(-2)^2+2^2}\\cdot\\sqrt{1^2+2^2}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{30{,}692+4}}{\\sqrt{6551{,}28+4}\\cdot\\sqrt{4+4}\\cdot\\sqrt{1+4}}} = \\frac{1}{\\frac{\\sqrt{34{,}692}}{\\sqrt{6555{,}28}\\cdot\\sqrt{8}\\cdot\\sqrt{5}}} = \\frac{1}{\\frac{5{,}8900}{80{,}965\\cdot 2{,}8284\\cdot 2{,}2361}} = \\frac{1}{\\frac{5{,}8900}{512{,}07}} = \\frac{1}{0{,}011502} \\approx \\mathbf{86{,}9} \\;;\\; \\mathbf{G_c(s) = 86{,}9\\frac{s+7{,}540}{s+82{,}94}}'
      },
      {
        title: '4. Equações para $(K_p, T_d, K_d)$, Polo Rápido e Pré-Filtro $F(s)$',
        description:
          'Sem $F(s)$: $M_p = 4{,}8\\%$, $t_p = 1{,}41\\text{ s}$; com $F(s) = \\frac{7{,}540}{s+7{,}540}$: $M_p = 4{,}3\\%$, $t_p = 1{,}58\\text{ s}$:',
        latex:
          'K_c = K_p(N+1) = K_p r \\implies K_p = \\frac{K_c}{r} = \\frac{86{,}9}{11} = \\mathbf{7{,}90} \\;;\\; p_c = \\frac{N}{T_d} \\implies T_d = \\frac{N}{p_c} = \\frac{10}{82{,}94} = \\mathbf{0{,}121\\text{ s}} \\;;\\; K_d = K_p T_d = 7{,}90\\cdot 0{,}121 = 0{,}95 \\;;\\; 1 + G_c(s)L(s) = 0 \\implies 1 + K_c\\frac{s+z_c}{s+p_c}\\cdot\\frac{1}{s(s+3)} = 0 \\;;\\; s(s+3)(s+p_c) + K_c(s+z_c) = 0 \\implies s\\big(s^2 + (3+p_c)s + 3p_c\\big) + K_c s + K_c z_c = 0 \\;;\\; s^3 + (3 + p_c)s^2 + (3p_c + K_c)s + K_c z_c = 0 \\;;\\; p_1 + p_2 + p_3 = -(3 + p_c) \\;\\text{ com }\\; p_{1,2} = -\\sigma_d \\pm j\\omega_d \\implies (-2\\sigma_d) + p_3 = -(3 + p_c) \\;;\\; p_3 = -(3 + p_c) - (-2\\sigma_d) = -(3 + 82{,}94) + 4 = \\mathbf{-81{,}94} \\;;\\; s^3 + (3+82{,}94)s^2 + (3\\cdot 82{,}94 + 86{,}9)s + 86{,}9\\cdot 7{,}540 = 0 \\;;\\; s^3 + 85{,}94s^2 + 335{,}7s + 655{,}2 = (s^2+4s+8)(s+81{,}94) = 0'
      },
      {
        title: '5. Regra dos 10 V, Erro à Rampa ($K_{\\text{vel}}$) e Dimensionamento RC ($C_1 = 10\\,\\mu\\text{F}$)',
        description:
          'Pico de atuação por volt de $\\Delta e$: $86{,}9$ (sem $F$) e $7{,}5$ (com $F$). Aplicando as equações de erro em regime e da razão de impedâncias $Z_2(s)/Z_1(s)$:',
        latex:
          'K_{\\text{vel}} = K_p\\lim_{s\\to 0}\\frac{1}{s+3} = \\frac{7{,}90}{3} = 2{,}63 \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{K_{\\text{vel}}} = \\frac{1}{2{,}63} = 0{,}380\\text{ V} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\frac{1}{7{,}540\\cdot 10^{-5}} = \\mathbf{13{,}3\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = 7{,}90\\cdot 13{,}3\\text{ k}\\Omega = \\mathbf{105\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\frac{1}{82{,}94\\cdot 105\\cdot 10^3} = \\mathbf{115{,}0\\text{ nF}}'
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
        title: '1. Método de Cálculo dos Polos Dominantes Desejados ($s_d$)',
        description:
          'Pelo critério de $2\\%$, $T_s \\approx \\frac{4}{\\sigma_d} \\implies \\sigma_d = \\frac{4}{1{,}33} = 3$. Como $\\sigma_d = \\zeta\\omega_n$ e $\\omega_d = \\omega_n\\sqrt{1-\\zeta^2}$, dividindo as duas expressões temos $\\omega_d = \\sigma_d\\frac{\\sqrt{1-\\zeta^2}}{\\zeta}$. Para $\\zeta = 0{,}5$, $\\frac{\\sqrt{1-0{,}25}}{0{,}5} = \\sqrt{3}$:',
        latex: '\\omega_d = 3\\sqrt{3} \\approx 5{,}196\\text{ rad/s} \\implies \\mathbf{s_d = -3 + j5{,}196}'
      },
      {
        title: '2. Método da Deficiência Angular em $s_d = -3 + j5{,}196$',
        description:
          'Calculando o ângulo de cada polo ($0$, $-4$, $-6$) até $s_d$: em $0$ ($-3+j5{,}196$, 2º quad.): $180^\\circ - \\arctan(5{,}196/3) = 120^\\circ$; em $-4$ ($1+j5{,}196$, 1º quad.): $\\arctan(5{,}196/1) = 79{,}11^\\circ$; em $-6$ ($3+j5{,}196$, 1º quad.): $\\arctan(5{,}196/3) = 60^\\circ$. Pela condição $\\phi_d - \\sum\\theta_p = -180^\\circ$:',
        latex: '\\theta_1 = 120^\\circ \\;;\\; \\theta_2 = 79{,}11^\\circ \\;;\\; \\theta_3 = 60^\\circ \\implies \\phi_d = (120^\\circ + 79{,}11^\\circ + 60^\\circ) - 180^\\circ = \\mathbf{79{,}11^\\circ}'
      },
      {
        title: '3. Posicionamento do Zero $z_c$ do PD por Trigonometria',
        description:
          'Como $\\phi_d = 79{,}11^\\circ < 90^\\circ$, o zero $-z_c$ fica à esquerda de $-\\sigma_d$ ($z_c > 3$) no triângulo retângulo de altura $\\omega_d = 5{,}196$ e base $(z_c - 3) = \\frac{\\omega_d}{\\tan\\phi_d}$:',
        latex: 'z_c = 3 + \\frac{5{,}196}{\\tan(79{,}11^\\circ)} = 3 + 1{,}00 = \\mathbf{4{,}00} \\; (\\text{cancela exatamente o polo em } -4)'
      },
      {
        title: '4. Ajuste do Ganho $K_d$ pela Condição de Módulo (Passo a Passo)',
        description:
          'Impondo $|K_d(s_d+4) \\cdot \\frac{1}{s_d(s_d+4)(s_d+6)}| = 1$, o fator $(s_d+4)$ simplifica-se e calculamos $|s_d| = \\sqrt{(-3)^2 + 5{,}196^2} = 6$ e $|s_d+6| = \\sqrt{3^2 + 5{,}196^2} = 6$:',
        latex:
          'K_d = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|(s_d+4)\\cdot\\frac{1}{s_d(s_d+4)(s_d+6)}\\right|} = \\frac{1}{\\left|\\frac{1}{s_d(s_d+6)}\\right|} = \\frac{1}{\\frac{1}{|-3+j5{,}196|\\cdot|-3+j5{,}196+6|}} \\;;\\; K_d = \\frac{1}{\\frac{1}{\\sqrt{(-3)^2+5{,}196^2}\\cdot\\sqrt{3^2+5{,}196^2}}} = \\frac{1}{\\frac{1}{\\sqrt{9+27}\\cdot\\sqrt{9+27}}} = \\frac{1}{\\frac{1}{6\\cdot 6}} = \\frac{1}{\\frac{1}{36}} = \\mathbf{36} \\implies \\mathbf{G_c(s) = 36(s+4) = 144 + 36s}'
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
        title: '1. Método da Deficiência Angular em $s_d = -2{,}828 + j2{,}828$',
        description:
          'A partir de $\\zeta = 0{,}707$ e $\\omega_n = 4\\text{ rad/s}$, temos $\\sigma_d = \\zeta\\omega_n = 2{,}828$ e $\\omega_d = \\omega_n\\sqrt{1-\\zeta^2} = 2{,}828$. Para os polos em $0$ ($-2{,}828+j2{,}828$, 2º quad.) e $-2$ ($-0{,}828+j2{,}828$, 2º quad.), aplicamos $180^\\circ - \\arctan(\\text{Im}/|\\text{Re}|)$:',
        latex:
          '\\theta_1 = 180^\\circ - \\arctan\\left(\\frac{2{,}828}{2{,}828}\\right) = 135^\\circ \\;;\\; \\theta_2 = 180^\\circ - \\arctan\\left(\\frac{2{,}828}{0{,}828}\\right) = 106{,}33^\\circ \\implies \\phi_d = (135^\\circ + 106{,}33^\\circ) - 180^\\circ = \\mathbf{61{,}33^\\circ}'
      },
      {
        title: '2. Posição do Zero $z_c$ do PD por Trigonometria',
        description:
          'Como $\\phi_d = 61{,}33^\\circ < 90^\\circ$, o zero $-z_c$ fica à esquerda de $-2{,}828$, formando um triângulo retângulo de altura $\\omega_d = 2{,}828$ e base $(z_c - 2{,}828) = \\frac{\\omega_d}{\\tan\\phi_d}$:',
        latex: 'z_c = 2{,}828 + \\frac{2{,}828}{\\tan(61{,}33^\\circ)} = 2{,}828 + 1{,}546 = \\mathbf{4{,}374}'
      },
      {
        title: '3. Ganho $K_d$ pela Condição de Módulo (Passo a Passo)',
        description:
          'Impondo $|K_d(s_d+4{,}374)\\cdot\\frac{10}{s_d(s_d+2)}| = 1$ e calculando cada módulo complexo $|a+jb| = \\sqrt{a^2+b^2}$:',
        latex:
          'K_d = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|(s_d+4{,}374)\\cdot\\frac{10}{s_d(s_d+2)}\\right|} = \\frac{1}{\\left|\\frac{10(-2{,}828+j2{,}828+4{,}374)}{(-2{,}828+j2{,}828)(-2{,}828+j2{,}828+2)}\\right|} \\;;\\; K_d = \\frac{1}{\\frac{10\\cdot|1{,}546+j2{,}828|}{|-2{,}828+j2{,}828|\\cdot|-0{,}828+j2{,}828|}} = \\frac{1}{\\frac{10\\cdot\\sqrt{1{,}546^2+2{,}828^2}}{\\sqrt{(-2{,}828)^2+2{,}828^2}\\cdot\\sqrt{(-0{,}828)^2+2{,}828^2}}} = \\frac{1}{\\frac{10\\cdot 3{,}223}{4{,}000\\cdot 2{,}947}} = \\frac{1}{2{,}734} \\approx \\mathbf{0{,}366} \\implies \\mathbf{G_c(s) = 1{,}60 + 0{,}366s}'
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
        description: 'Aplicando $K_0 = \\left.\\frac{1}{|G(s)H(s)|}\\right|_{s=-3+j3}$ com $G(s)=\\frac{1}{(s+1)(s+5)}$ e $H(s)=1$, expandindo quadrados e somas dentro das raízes:',
        latex:
          'K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{1}{(-3+j3+1)(-3+j3+5)}\\right|} = \\frac{1}{\\frac{1}{|-2+j3|\\cdot|2+j3|}} = \\frac{1}{\\frac{1}{\\sqrt{(-2)^2+3^2}\\cdot\\sqrt{2^2+3^2}}} = \\frac{1}{\\frac{1}{\\sqrt{4+9}\\cdot\\sqrt{4+9}}} = \\frac{1}{\\frac{1}{\\sqrt{13}\\cdot\\sqrt{13}}} = \\frac{1}{\\frac{1}{13}} = \\mathbf{13} \\;;\\; K_{p,a} = K_0\\cdot G(0) = 13 \\cdot \\frac{1}{5} = 2{,}6 \\;\\left(e_p = \\frac{1}{1+2{,}6} = 27{,}8\\% > 2\\% \\implies \\varphi = 10^\\circ\\right) \\;;\\; \\beta = \\frac{K_{p,\\text{req}}}{K_{p,a}} = \\frac{19}{2{,}6} \\approx \\mathbf{7{,}31}'
      },
      {
        title: '3. Passo 4 — Polinômio Trigonométrico para $z$ e $p$',
        description: 'Impondo $\\tan(\\theta_z - \\theta_p) = \\tan(10^\\circ)$ com $z = \\beta p$ ($\\sigma_d = 3,\\; \\omega_d = 3,\\; \\beta = 7{,}31,\\; \\cot 10^\\circ = 5{,}6713$): $c_2 = \\beta$, $c_1 = -[\\sigma_d(\\beta+1)+\\omega_d(\\beta-1)\\cot\\varphi]$ e $c_0 = \\sigma_d^2+\\omega_d^2$. Resolvendo por Bhaskara e comparando $z_{\\max}$ com $z_{\\text{dipolo}}$:',
        latex: 'c_2 = 7{,}31 \\;;\\; c_1 = -[3(7{,}31+1) + 3(7{,}31-1)\\cdot 5{,}6713] = -[24{,}93 + 107{,}36] = -132{,}29 \\;;\\; c_0 = 3^2 + 3^2 = 18 \\;;\\; 7{,}31p^2 - 132{,}29p + 18 = 0 \\implies \\Delta = (-132{,}29)^2 - 4\\cdot 7{,}31\\cdot 18 = 17500{,}64 - 526{,}32 = 16974{,}32 \\;(\\sqrt{\\Delta} = 130{,}29) \\;;\\; p_{\\max} = \\frac{132{,}29 - 130{,}29}{2\\cdot 7{,}31} = \\frac{2{,}00}{14{,}62} \\approx 0{,}137 \\implies z_{\\max} = 7{,}31 \\cdot 0{,}137 \\approx 1{,}002 \\;;\\; z = \\min(1{,}002\\,;\\, 0{,}909) = \\mathbf{0{,}909} \\;;\\; p = \\frac{z}{\\beta} = \\frac{0{,}909}{7{,}31} \\approx \\mathbf{0{,}124} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(s_d+z) - \\angle(s_d+p)| = |\\angle(-2{,}091+j3) - \\angle(-2{,}876+j3)| = |124{,}88^\\circ - 133{,}79^\\circ| = \\mathbf{8{,}9^\\circ}'
      },
      {
        title: '4. Passo 5 — Ajuste de Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos) e Conferência',
        description: 'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=-3+j3}$ sem inverter antecipadamente ($z=0{,}909,\\; p=0{,}124$) e conferindo $K_{p,\\text{novo}}$ e $e_{ss}$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z}{s_d+p}\\cdot\\frac{1}{(s_d+1)(s_d+5)}\\right|} = \\frac{1}{\\left|\\frac{-3+j3+0{,}909}{-3+j3+0{,}124}\\cdot\\frac{1}{(-3+j3+1)(-3+j3+5)}\\right|} \\;;\\; K_c = \\frac{1}{\\left|\\frac{-2{,}091+j3}{-2{,}876+j3}\\cdot\\frac{1}{(-2+j3)(2+j3)}\\right|} = \\frac{1}{\\frac{\\sqrt{(-2{,}091)^2+3^2}}{\\sqrt{(-2{,}876)^2+3^2}\\cdot\\sqrt{(-2)^2+3^2}\\cdot\\sqrt{2^2+3^2}}} = \\frac{1}{\\frac{\\sqrt{4{,}372+9}}{\\sqrt{8{,}271+9}\\cdot\\sqrt{4+9}\\cdot\\sqrt{4+9}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{13{,}372}}{\\sqrt{17{,}271}\\cdot\\sqrt{13}\\cdot\\sqrt{13}}} = \\frac{1}{\\frac{3{,}657}{4{,}156\\cdot 3{,}606\\cdot 3{,}606}} = \\frac{1}{\\frac{3{,}657}{54{,}03}} = \\frac{1}{0{,}06769} \\approx \\mathbf{14{,}77} \\;;\\; K_{p,\\text{novo}} = \\frac{14{,}77 \\cdot 7{,}31}{5} = 21{,}6 \\implies \\mathbf{e_{ss} = \\frac{1}{1+21{,}6} = 4{,}4\\% \\le 5\\%}'
      },
      {
        title: '5. Verificação, Comparação com PI e Componentes ($C = 10\\,\\mu\\text{F},\\; R_3 = 10\\text{ k}\\Omega$) — Slide 14',
        description:
          'Polos MF com Atraso: $-2{,}62 \\pm j3{,}00$ e $-0{,}885$ ($M_p = 4{,}8\\%$, $t_s = 1{,}41\\text{ s}$, $e_{ss} = 4{,}4\\%$). Se precisar $e_{ss} = 0$, usa-se PI ($M_p = 4{,}7\\%$, $t_s = 1{,}39\\text{ s}$). Estágio 1 e Estágio 2 do circuito analógico:',
        latex:
          'R_1 = \\frac{1}{z C} = \\frac{1}{0{,}909\\cdot 10^{-5}} = \\mathbf{110\\text{ k}\\Omega} \\;;\\; R_2 = \\beta R_1 = 7{,}31\\cdot 110\\text{ k}\\Omega = \\mathbf{804\\text{ k}\\Omega} \\;;\\; R_4 = K_c R_3 = 14{,}77\\cdot 10\\text{ k}\\Omega = \\mathbf{148\\text{ k}\\Omega}'
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
    id: 'lag-ex-slide-exB',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Slide 05 • Exemplo B (Tipo 1)',
    title: 'Exemplo B (Slides 15–16) — Atraso de Fase em Tipo 1 G(s) = 1/[s(s+4)] (Regra da Cauda)',
    source: 'Slide 05 — Compensador de atraso de fase pelo lugar das raízes (Slides 15–16)',
    statementLatex:
      '\\text{Para a planta Tipo 1 } G(s) = \\frac{1}{s(s+4)} \\text{ com } s_d = -2 + j2 \\; (\\zeta = 0{,}707), \\text{ projete um compensador por atraso de fase para obter } e_{ss}(\\text{rampa unitária}) \\le 0{,}1 \\; (K_{\\text{vel,req}} = 10) \\text{ preservando o transitório.}',
    plantExpr: '1/(s*(s+4))',
    plantLatex: '\\frac{1}{s(s+4)}',
    controllerExpr: '8.08*(s+0.05)/(s+0.01)',
    controllerLatex: 'G_c(s) = 8{,}08\\frac{s + 0{,}05}{s + 0{,}01}',
    controllerBlockLabel: 'Compensador Lag (Tipo 1 • Cauda)',
    inputType: 'ramp',
    inputParams: { a0: 1, labelLatex: 'r(t) = t\\cdot u(t)' },
    tMax: 8,
    whyThisController:
      'Em planta Tipo 1, usar apenas o critério angular ($z = 0{,}706$) gera uma cauda lenta de $+0{,}56$ e eleva $M_p$ para $27{,}7\\%$. A **regra da cauda** ($A = 2\\%$) limita $z_{\\text{cauda}} = \\frac{0{,}02}{1/K_{\\text{vel},a} - 1/K_{\\text{vel,req}}} = 0{,}05$, preservando o transitório do P ($M_p = 6{,}5\\%$, $t_s = 2{,}6\\text{ s}$).',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem → 3ª Ordem',
      initialErrorLatex: 'K_{\\text{vel},a} = 2 \\implies e_{ss}(\\text{rampa}) = 0{,}50',
      finalErrorLatex: 'K_{\\text{vel,novo}} = 10{,}1 \\implies e_{ss}(\\text{rampa}) = 0{,}099 \\le 0{,}1'
    },
    detailedSteps: [
      {
        title: '1. Ganho $K_0$, $K_{\\text{vel},a}$ e Fator $\\beta$ ($s_d = -2 + j2$)',
        description:
          'Triagem: Tipo 1, $|s_{\\text{lenta}}| = 4 \\implies 4/1{,}1 = 3{,}64$ (o polo na origem não entra). Calculando $K_0 = \\frac{1}{|G(s_d)|}$ passo a passo e $K_{\\text{vel},a} = K_0\\lim_{s\\to 0} s G(s)$:',
        latex:
          'K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{1}{s_d(s_d+4)}\\right|} = \\frac{1}{\\left|\\frac{1}{(-2+j2)(-2+j2+4)}\\right|} = \\frac{1}{\\frac{1}{|-2+j2|\\cdot|2+j2|}} = \\frac{1}{\\frac{1}{\\sqrt{(-2)^2+2^2}\\cdot\\sqrt{2^2+2^2}}} = \\frac{1}{\\frac{1}{\\sqrt{4+4}\\cdot\\sqrt{4+4}}} = \\frac{1}{\\frac{1}{\\sqrt{8}\\cdot\\sqrt{8}}} = \\frac{1}{\\frac{1}{8}} = \\mathbf{8} \\;;\\; K_{\\text{vel},a} = K_0\\lim_{s\\to 0}\\frac{1}{s+4} = \\frac{8}{4} = 2 \\;;\\; \\beta = \\frac{K_{\\text{vel,req}}}{K_{\\text{vel},a}} = \\frac{10}{2} = \\mathbf{5} \\;;\\; \\varphi = 10^\\circ'
      },
      {
        title: '2. Três Limites para $z$: Polinômio Angular, Dipolo e Regra da Cauda ($A = 2\\%$)',
        description:
          'Para o polinômio angular com $z = \\beta p$ ($\\sigma_d = 2,\\; \\omega_d = 2,\\; \\beta = 5,\\; \\cot 10^\\circ = 5{,}671$): $c_2 = \\beta$, $c_1 = -[\\sigma_d(\\beta+1)+\\omega_d(\\beta-1)\\cot\\varphi]$ e $c_0 = \\sigma_d^2+\\omega_d^2$. Em plantas Tipo 1, a regra da cauda limita $z$ antes do ângulo e do dipolo:',
        latex:
          'c_2 = 5 \\;;\\; c_1 = -[2(5+1) + 2(5-1)\\cdot 5{,}671] = -57{,}37 \\;;\\; c_0 = 2^2+2^2 = 8 \\;;\\; 5p^2 - 57{,}37p + 8 = 0 \\implies \\Delta = (-57{,}37)^2 - 4\\cdot 5\\cdot 8 = 3131{,}35 \\;(\\sqrt{\\Delta} = 55{,}96) \\;;\\; p_{\\max} = \\frac{57{,}37 - 55{,}96}{10} = 0{,}1412 \\implies z_{\\max} = 5\\cdot 0{,}1412 = 0{,}706 \\;;\\; z_{\\text{dipolo}} = \\frac{4}{1{,}1} = 3{,}64 \\;;\\; z_{\\text{cauda}} = \\frac{A}{\\frac{1}{K_{\\text{vel},a}} - \\frac{1}{K_{\\text{vel,req}}}} = \\frac{0{,}02}{\\frac{1}{2} - \\frac{1}{10}} = \\mathbf{0{,}05} \\;;\\; z = \\mathbf{0{,}05} \\;;\\; p = \\frac{z}{\\beta} = \\mathbf{0{,}01} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(-1{,}95+j2) - \\angle(-1{,}99+j2)| = |134{,}27^\\circ - 134{,}86^\\circ| = \\mathbf{0{,}6^\\circ}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos) e Conferência de $K_{\\text{vel,novo}}$',
        description:
          'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ em $s_d = -2 + j2$ sem inverter antecipadamente:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z}{s_d+p}\\cdot\\frac{1}{s_d(s_d+4)}\\right|} = \\frac{1}{\\left|\\frac{-2+j2+0{,}05}{-2+j2+0{,}01}\\cdot\\frac{1}{(-2+j2)(-2+j2+4)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{|-1{,}95+j2|}{|-1{,}99+j2|\\cdot|-2+j2|\\cdot|2+j2|}} = \\frac{1}{\\frac{\\sqrt{(-1{,}95)^2+2^2}}{\\sqrt{(-1{,}99)^2+2^2}\\cdot\\sqrt{(-2)^2+2^2}\\cdot\\sqrt{2^2+2^2}}} = \\frac{1}{\\frac{\\sqrt{3{,}802+4}}{\\sqrt{3{,}960+4}\\cdot\\sqrt{4+4}\\cdot\\sqrt{4+4}}} = \\frac{1}{\\frac{\\sqrt{7{,}803}}{\\sqrt{7{,}960}\\cdot\\sqrt{8}\\cdot\\sqrt{8}}} \\;;\\; K_c = \\frac{1}{\\frac{2{,}793}{2{,}821\\cdot 2{,}828\\cdot 2{,}828}} = \\frac{1}{\\frac{2{,}793}{22{,}57}} = \\frac{1}{0{,}12376} = \\mathbf{8{,}08} \\;;\\; K_{\\text{vel,novo}} = K_c\\cdot\\beta\\cdot\\frac{K_{\\text{vel},a}}{K_0} = 8{,}08\\cdot 5\\cdot\\frac{2}{8} = 10{,}1 \\implies e_{ss} = \\frac{1}{10{,}1} = \\mathbf{0{,}099 \\le 0{,}1}'
      },
      {
        title: '4. Implementação ($C = 10\\,\\mu\\text{F}$ vs. $47\\,\\mu\\text{F}$ ou Digital) — Slide 16',
        description:
          'Como $z = 0{,}05$ equivale a constante de tempo de $20\\text{ s}$, no analógico exige $R_1 = 2\\text{ M}\\Omega$ e $R_2 = 10\\text{ M}\\Omega$ para $C = 10\\,\\mu\\text{F}$ (ou $426\\text{ k}\\Omega$ e $2{,}1\\text{ M}\\Omega$ com $C = 47\\,\\mu\\text{F}$); em CLP/microcontrolador a constante longa não custa nada:',
        latex:
          'R_1 = \\frac{1}{z C} = \\frac{1}{0{,}05\\cdot 10^{-5}} = \\mathbf{2{,}0\\text{ M}\\Omega} \\;;\\; R_2 = \\beta R_1 = 5\\cdot 2{,}0\\text{ M}\\Omega = \\mathbf{10\\text{ M}\\Omega}'
      }
    ],
    scilabCode: `// Slide 05 - Exemplo B: Tipo 1 G(s) = 1/(s(s+4)) com Atraso
s = %s;
G = syslin('c', 1, s*(s+4));
Gc = syslin('c', 8.08*(s+0.05), s+0.01);
t = 0:0.02:8; clf();
plot(t, csim('step', t, (8*G)/.1), 'r--', t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
legend(['Só P (K0=8)', 'Com Lag (z=0.05, p=0.01)']);
xgrid();`
  },
  {
    id: 'lag-ex-slide-propC',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Slide 05 • Proposto C (Tipo 0)',
    title: 'Exercício Proposto C (Slide 21) — Atraso em G(s) = (s+4)/[(s+1)(s+2)(s+8)]',
    source: 'Slide 05 — Compensador de atraso de fase pelo lugar das raízes (Slides 20–21)',
    statementLatex:
      '\\text{Para } G(s) = \\frac{s+4}{(s+1)(s+2)(s+8)} \\text{ com } \\zeta = 0{,}707, \\text{ projete um compensador por atraso para } e_{ss}(\\text{degrau}) \\le 5\\% \\; (K_{\\text{pos,req}} = 19).',
    plantExpr: '(s+4)/((s+1)*(s+2)*(s+8))',
    plantLatex: '\\frac{s+4}{(s+1)(s+2)(s+8)}',
    controllerExpr: '11.51*(s+0.665)/(s+0.0875)',
    controllerLatex: 'G_c(s) = 11{,}51\\frac{s + 0{,}665}{s + 0{,}0875}',
    controllerBlockLabel: 'Compensador Lag (Proposto C)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 5,
    whyThisController:
      'Em $s_d = -2 + j2$, o ganho $K_0 = 10$ resulta em $K_{\\text{pos},a} = 2{,}5$ ($e_P = 28{,}6\\%$). Aqui quem limita é o critério angular ($z_{\\max} = 0{,}665 < z_{\\text{dipolo}} = 0{,}909$); a cauda de $-9\\%$ fica fora da faixa de $2\\%$, fazendo $t_s$ subir de $2{,}02\\text{ s}$ para $3{,}06\\text{ s}$.',
    diagnostics: {
      systemType: 'Tipo 0 (com zero em -4)',
      systemOrder: '3ª Ordem → 4ª Ordem',
      initialErrorLatex: 'K_{\\text{pos},a} = 2{,}5 \\implies e_P = 28{,}6\\%',
      finalErrorLatex: 'K_{\\text{pos,novo}} = 21{,}9 \\implies e_{ss} = 4{,}4\\% \\le 5\\%'
    },
    detailedSteps: [
      {
        title: '1. Polo Desejado $s_d = -2 + j2$, Ganho $K_0$, $K_{\\text{pos},a}$ e Fator $\\beta$',
        description:
          'Aplicando $K_0 = \\frac{1}{|G(s_d)|}$ passo a passo com $|a+jb| = \\sqrt{a^2+b^2}$, $G(0) = \\frac{4}{1\\cdot 2\\cdot 8} = 0{,}25$ e $\\beta = \\frac{K_{\\text{pos,req}}}{K_{\\text{pos},a}}$:',
        latex:
          '\\beta = \\arccos(0{,}707) = 45^\\circ \\implies \\omega_d = \\sigma_d \\;;\\; \\angle G(-2+j2) = 45^\\circ - (116{,}57^\\circ + 90^\\circ + 18{,}43^\\circ) = -180^\\circ \\implies \\mathbf{s_d = -2 + j2} \\;;\\; K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+4}{(s_d+1)(s_d+2)(s_d+8)}\\right|} = \\frac{1}{\\left|\\frac{-2+j2+4}{(-2+j2+1)(-2+j2+2)(-2+j2+8)}\\right|} \\;;\\; K_0 = \\frac{1}{\\frac{|2+j2|}{|-1+j2|\\cdot|j2|\\cdot|6+j2|}} = \\frac{1}{\\frac{\\sqrt{2^2+2^2}}{\\sqrt{(-1)^2+2^2}\\cdot 2\\cdot\\sqrt{6^2+2^2}}} = \\frac{1}{\\frac{\\sqrt{4+4}}{\\sqrt{1+4}\\cdot 2\\cdot\\sqrt{36+4}}} = \\frac{1}{\\frac{\\sqrt{8}}{\\sqrt{5}\\cdot 2\\cdot\\sqrt{40}}} = \\frac{1}{\\frac{2{,}8284}{2{,}2361\\cdot 2\\cdot 6{,}3246}} = \\frac{1}{0{,}1000} = \\mathbf{10} \\;;\\; K_{\\text{pos},a} = K_0 G(0) = 10\\cdot 0{,}25 = 2{,}5 \\;;\\; e_P = \\frac{1}{1+2{,}5} = 28{,}6\\% > 2\\% \\implies \\varphi = 10^\\circ \\;;\\; \\beta = \\frac{19}{2{,}5} = \\mathbf{7{,}6}'
      },
      {
        title: '2. Escolha de $z$ e $p$ (Polinômio Angular vs. Dipolo $|s_{\\text{lenta}}|/1{,}1$)',
        description:
          'Com $\\sigma_d = 2$, $\\omega_d = 2$, $\\beta = 7{,}6$ e $\\cot 10^\\circ = 5{,}671$: $c_2 = 7{,}6$, $c_1 = -[2(8{,}6) + 2(6{,}6)\\cdot 5{,}671] = -92{,}06$ e $c_0 = 8$. Aqui o ângulo limita antes do dipolo ($1/1{,}1 = 0{,}909$):',
        latex:
          '7{,}6p^2 - 92{,}06p + 8 = 0 \\implies \\Delta = (-92{,}06)^2 - 4\\cdot 7{,}6\\cdot 8 = 8232{,}01 \\;(\\sqrt{\\Delta} = 90{,}73) \\;;\\; p_{\\max} = \\frac{92{,}06 - 90{,}73}{2\\cdot 7{,}6} = 0{,}0875 \\implies z_{\\max} = 7{,}6\\cdot 0{,}0875 = 0{,}665 \\;;\\; z = \\min(0{,}665\\,;\\, 0{,}909) = \\mathbf{0{,}665} \\;;\\; p = \\frac{z}{\\beta} = \\mathbf{0{,}0875} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(-1{,}335+j2) - \\angle(-1{,}9125+j2)| = |123{,}72^\\circ - 133{,}72^\\circ| = \\mathbf{10{,}0^\\circ}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos) e Componentes ($C = 10\\,\\mu\\text{F},\\; R_3 = 10\\text{ k}\\Omega$)',
        description:
          'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$; resposta: $M_p$ vai de $6{,}0\\%$ para $4{,}0\\%$ e $t_s$ sobe de $2{,}02\\text{ s}$ para $3{,}06\\text{ s}$ pela cauda de $-9\\%$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z}{s_d+p}\\cdot\\frac{s_d+4}{(s_d+1)(s_d+2)(s_d+8)}\\right|} = \\frac{1}{\\left|\\frac{-2+j2+0{,}665}{-2+j2+0{,}0875}\\cdot\\frac{-2+j2+4}{(-2+j2+1)(-2+j2+2)(-2+j2+8)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{|-1{,}335+j2|\\cdot|2+j2|}{|-1{,}9125+j2|\\cdot|-1+j2|\\cdot|j2|\\cdot|6+j2|}} = \\frac{1}{\\frac{\\sqrt{(-1{,}335)^2+2^2}\\cdot\\sqrt{2^2+2^2}}{\\sqrt{(-1{,}9125)^2+2^2}\\cdot\\sqrt{(-1)^2+2^2}\\cdot 2\\cdot\\sqrt{6^2+2^2}}} = \\frac{1}{\\frac{\\sqrt{1{,}782+4}\\cdot\\sqrt{4+4}}{\\sqrt{3{,}658+4}\\cdot\\sqrt{1+4}\\cdot 2\\cdot\\sqrt{36+4}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{5{,}782}\\cdot\\sqrt{8}}{\\sqrt{7{,}658}\\cdot\\sqrt{5}\\cdot 2\\cdot\\sqrt{40}}} = \\frac{1}{\\frac{2{,}4046\\cdot 2{,}8284}{2{,}7672\\cdot 2{,}2361\\cdot 2\\cdot 6{,}3246}} = \\frac{1}{\\frac{6{,}801}{78{,}27}} = \\frac{1}{0{,}08690} = \\mathbf{11{,}51} \\;;\\; K_{\\text{pos,novo}} = 21{,}9 \\implies e_{ss} = \\frac{1}{1+21{,}9} = 4{,}4\\% \\;;\\; R_1 = \\frac{1}{z C} = \\mathbf{150\\text{ k}\\Omega} \\;;\\; R_2 = \\beta R_1 = \\mathbf{1{,}14\\text{ M}\\Omega} \\;;\\; R_4 = K_c R_3 = \\mathbf{115\\text{ k}\\Omega}'
      }
    ],
    scilabCode: `// Slide 21 - Proposto C: G(s) = (s+4)/((s+1)(s+2)(s+8)) com Atraso
s = %s;
G = syslin('c', s+4, (s+1)*(s+2)*(s+8));
Gc = syslin('c', 11.51*(s+0.665), s+0.0875);
t = 0:0.01:5; clf();
plot(t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'lag-ex-slide-propD',
    controllerId: 'Lag',
    subType: 'Lag',
    badge: 'Slide 05 • Proposto D (Tipo 1)',
    title: 'Exercício Proposto D (Slide 21) — Atraso em Tipo 1 G(s) = 1/[s(s+2)(s+10)]',
    source: 'Slide 05 — Compensador de atraso de fase pelo lugar das raízes (Slides 20–21)',
    statementLatex:
      '\\text{Para } G(s) = \\frac{1}{s(s+2)(s+10)} \\text{ com } \\zeta = 0{,}707, \\text{ projete um compensador por atraso para } e_{ss}(\\text{rampa unitária}) \\le 0{,}1 \\; (K_{\\text{vel,req}} = 10).',
    plantExpr: '1/(s*(s+2)*(s+10))',
    plantLatex: '\\frac{1}{s(s+2)(s+10)}',
    controllerExpr: '16.69*(s+0.018)/(s+0.00149)',
    controllerLatex: 'G_c(s) = 16{,}69\\frac{s + 0{,}018}{s + 0{,}00149}',
    controllerBlockLabel: 'Compensador Lag (Proposto D)',
    inputType: 'ramp',
    inputParams: { a0: 1, labelLatex: 'r(t) = t\\cdot u(t)' },
    tMax: 10,
    whyThisController:
      'Em $s_d = -0{,}9 + j0{,}9$, $K_0 = 16{,}54$ e $K_{\\text{vel},a} = 0{,}827$, exigindo $\\beta = 12{,}1$. A regra da cauda ($A = 2\\%$) impõe $z = 0{,}018$ (constante de tempo de $55\\text{ s}$), resultando em resistores inviáveis no analógico ($5{,}5\\text{ M}\\Omega$ e $67\\text{ M}\\Omega$); recomenda-se implementação digital ou aceitar cauda $A$ maior.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '3ª Ordem → 4ª Ordem',
      initialErrorLatex: 'K_{\\text{vel},a} = 0{,}827 \\implies e_{ss}(\\text{rampa}) = 1{,}21',
      finalErrorLatex: 'K_{\\text{vel,novo}} = 10{,}1 \\implies e_{ss}(\\text{rampa}) = 0{,}099 \\le 0{,}1'
    },
    detailedSteps: [
      {
        title: '1. Polo Desejado $s_d = -0{,}9 + j0{,}9$, Ganho $K_0$, $K_{\\text{vel},a}$ e $\\beta$',
        description:
          'Aplicando $K_0 = \\frac{1}{|G(s_d)|}$ passo a passo (sem inverter antecipadamente) e $K_{\\text{vel},a} = K_0\\lim_{s\\to 0} s G(s) = \\frac{K_0}{2\\cdot 10}$:',
        latex:
          '\\beta = \\arccos(0{,}707) = 45^\\circ \\implies \\omega_d = \\sigma_d \\;;\\; \\angle G(-0{,}9+j0{,}9) = -(135^\\circ + 39{,}3^\\circ + 5{,}6^\\circ) = -180^\\circ \\implies \\mathbf{s_d = -0{,}9 + j0{,}9} \\;;\\; K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{1}{s_d(s_d+2)(s_d+10)}\\right|} = \\frac{1}{\\left|\\frac{1}{(-0{,}9+j0{,}9)(-0{,}9+j0{,}9+2)(-0{,}9+j0{,}9+10)}\\right|} \\;;\\; K_0 = \\frac{1}{\\frac{1}{|-0{,}9+j0{,}9|\\cdot|1{,}1+j0{,}9|\\cdot|9{,}1+j0{,}9|}} = \\frac{1}{\\frac{1}{\\sqrt{(-0{,}9)^2+0{,}9^2}\\cdot\\sqrt{1{,}1^2+0{,}9^2}\\cdot\\sqrt{9{,}1^2+0{,}9^2}}} = \\frac{1}{\\frac{1}{\\sqrt{0{,}81+0{,}81}\\cdot\\sqrt{1{,}21+0{,}81}\\cdot\\sqrt{82{,}81+0{,}81}}} = \\frac{1}{\\frac{1}{\\sqrt{1{,}62}\\cdot\\sqrt{2{,}02}\\cdot\\sqrt{83{,}62}}} = \\frac{1}{\\frac{1}{1{,}2728\\cdot 1{,}4213\\cdot 9{,}1444}} = \\frac{1}{0{,}06045} = \\mathbf{16{,}54} \\;;\\; K_{\\text{vel},a} = \\frac{16{,}54}{20} = 0{,}827 \\;;\\; \\beta = \\frac{K_{\\text{vel,req}}}{K_{\\text{vel},a}} = \\frac{10}{0{,}827} = \\mathbf{12{,}1} \\;;\\; \\varphi = 10^\\circ'
      },
      {
        title: '2. Três Limites para $z$: Polinômio Angular, Dipolo e Regra da Cauda ($A = 2\\%$)',
        description:
          'Com $\\sigma_d = 0{,}9$, $\\omega_d = 0{,}9$, $\\beta = 12{,}1$ e $\\cot 10^\\circ = 5{,}671$: $c_2 = 12{,}1$, $c_1 = -[0{,}9(13{,}1)+0{,}9(11{,}1)\\cdot 5{,}671] = -68{,}45$ e $c_0 = 0{,}9^2+0{,}9^2 = 1{,}62$. A cauda impõe $z = 0{,}018$:',
        latex:
          '12{,}1p^2 - 68{,}45p + 1{,}62 = 0 \\implies \\Delta = 4606{,}46 \\;(\\sqrt{\\Delta} = 67{,}87) \\implies z_{\\max} = 12{,}1\\cdot\\frac{68{,}45 - 67{,}87}{24{,}2} = 0{,}288 \\;;\\; z_{\\text{dipolo}} = \\frac{2}{1{,}1} = 1{,}818 \\;;\\; z_{\\text{cauda}} = \\frac{0{,}02}{\\frac{1}{0{,}827} - \\frac{1}{10}} = \\mathbf{0{,}018} \\;;\\; z = \\mathbf{0{,}018} \\;;\\; p = \\frac{z}{\\beta} = \\frac{0{,}018}{12{,}1} = \\mathbf{0{,}00149} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(-0{,}882+j0{,}9) - \\angle(-0{,}8985+j0{,}9)| = |134{,}42^\\circ - 134{,}95^\\circ| = \\mathbf{0{,}5^\\circ}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo e Discussão Analógica vs. Digital',
        description:
          '$M_p$: $4{,}3\\% \\to 6{,}4\\%$; $t_s$: $4{,}78\\text{ s} \\to 6{,}02\\text{ s}$. Com $C = 10\\,\\mu\\text{F}$ e $R_3 = 10\\text{ k}\\Omega$, $R_1 = 5{,}5\\text{ M}\\Omega$ e $R_2 = 67\\text{ M}\\Omega$ são inviáveis no analógico — ideal implementar digitalmente:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z}{s_d+p}\\cdot\\frac{1}{s_d(s_d+2)(s_d+10)}\\right|} = \\frac{1}{\\left|\\frac{-0{,}9+j0{,}9+0{,}018}{-0{,}9+j0{,}9+0{,}00149}\\cdot\\frac{1}{(-0{,}9+j0{,}9)(-0{,}9+j0{,}9+2)(-0{,}9+j0{,}9+10)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{|-0{,}882+j0{,}9|}{|-0{,}8985+j0{,}9|\\cdot|-0{,}9+j0{,}9|\\cdot|1{,}1+j0{,}9|\\cdot|9{,}1+j0{,}9|}} = \\frac{1}{\\frac{\\sqrt{(-0{,}882)^2+0{,}9^2}}{\\sqrt{(-0{,}8985)^2+0{,}9^2}\\cdot\\sqrt{(-0{,}9)^2+0{,}9^2}\\cdot\\sqrt{1{,}1^2+0{,}9^2}\\cdot\\sqrt{9{,}1^2+0{,}9^2}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{0{,}778+0{,}810}}{\\sqrt{0{,}807+0{,}810}\\cdot\\sqrt{0{,}810+0{,}810}\\cdot\\sqrt{1{,}210+0{,}810}\\cdot\\sqrt{82{,}810+0{,}810}}} = \\frac{1}{\\frac{\\sqrt{1{,}588}}{\\sqrt{1{,}617}\\cdot\\sqrt{1{,}620}\\cdot\\sqrt{2{,}020}\\cdot\\sqrt{83{,}620}}} \\;;\\; K_c = \\frac{1}{\\frac{1{,}2601}{1{,}2717\\cdot 1{,}2728\\cdot 1{,}4213\\cdot 9{,}1444}} = \\frac{1}{\\frac{1{,}2601}{21{,}037}} = \\frac{1}{0{,}05990} = \\mathbf{16{,}69} \\;;\\; K_{\\text{vel,novo}} = 10{,}1 \\implies e_{ss} = \\mathbf{0{,}099} \\;;\\; R_4 = K_c R_3 = \\mathbf{167\\text{ k}\\Omega}'
      }
    ],
    scilabCode: `// Slide 21 - Proposto D: G(s) = 1/(s(s+2)(s+10)) com Atraso
s = %s;
G = syslin('c', 1, s*(s+2)*(s+10));
Gc = syslin('c', 16.69*(s+0.018), s+0.00149);
t = 0:0.05:10; clf();
plot(t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
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
        title: '3. Passo 1 — Ganho Inicial $K_0$ pela Condição de Módulo em $s_d = -3{,}5 + j3{,}5$ (Regra dos 7 Passos)',
        description: 'Aplicando $K_0 = \\left.\\frac{1}{|G(s)|}\\right|_{s=-3{,}5+j3{,}5}$ sem inverter antecipadamente:',
        latex: 'K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{20}{(s_d+2)(s_d+5)}\\right|} = \\frac{1}{\\left|\\frac{20}{(-3{,}5+j3{,}5+2)(-3{,}5+j3{,}5+5)}\\right|} = \\frac{1}{\\frac{20}{|-1{,}5+j3{,}5|\\cdot|1{,}5+j3{,}5|}} \\;;\\; K_0 = \\frac{1}{\\frac{20}{\\sqrt{(-1{,}5)^2+3{,}5^2}\\cdot\\sqrt{1{,}5^2+3{,}5^2}}} = \\frac{1}{\\frac{20}{\\sqrt{2{,}25+12{,}25}\\cdot\\sqrt{2{,}25+12{,}25}}} = \\frac{1}{\\frac{20}{\\sqrt{14{,}5}\\cdot\\sqrt{14{,}5}}} = \\frac{1}{\\frac{20}{14{,}5}} = \\frac{1}{1{,}3793} = \\mathbf{0{,}725}'
      },
      {
        title: '4. Passos 2 e 3 — Constante Atual ($K_{p,a}$), Fator $\\beta$ e Tolerância $\\varphi$',
        description: 'Calculando o $K_p$ com o ganho $K_0 = 0{,}725$, a razão $\\beta$ necessária e reservando $\\varphi = 10^\\circ$ (pois o erro atual é $40{,}8\\% > 2\\%$):',
        latex: 'K_{p,a} = K_0 \\cdot K_p = 0{,}725 \\cdot 2 = 1{,}45 \\;;\\; e_{p,a} = \\frac{1}{1+1{,}45} = 40{,}8\\% > 2\\% \\implies \\varphi = 10^\\circ \\;;\\; \\beta = \\frac{K_{p,\\text{req}}}{K_{p,a}} = \\frac{19}{1{,}45} \\approx \\mathbf{13{,}10}'
      },
      {
        title: '5. Passos 4 e 5 — Posição de $z$, $p$, Perda Angular e Ganho $K_c$ (Regra dos 7 Passos)',
        description: 'Adotando $z = 0{,}909 < z_{\\text{dipolo}}$, determinando $p = z/\\beta$, conferindo $\\Delta\\theta_{\\text{perda}} < 10^\\circ$ e aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ sem atalhos:',
        latex: 'p = \\frac{z}{\\beta} = \\frac{0{,}909}{13{,}10} = \\mathbf{0{,}0694} \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(s_d+z) - \\angle(s_d+p)| = |\\angle(-2{,}591+j3{,}5) - \\angle(-3{,}4306+j3{,}5)| = |126{,}51^\\circ - 134{,}43^\\circ| = \\mathbf{7{,}9^\\circ} < 10^\\circ \\;;\\; K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z}{s_d+p}\\cdot\\frac{20}{(s_d+2)(s_d+5)}\\right|} = \\frac{1}{\\left|\\frac{-3{,}5+j3{,}5+0{,}909}{-3{,}5+j3{,}5+0{,}0694}\\cdot\\frac{20}{(-3{,}5+j3{,}5+2)(-3{,}5+j3{,}5+5)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{20|-2{,}591+j3{,}5|}{|-3{,}4306+j3{,}5|\\cdot|-1{,}5+j3{,}5|\\cdot|1{,}5+j3{,}5|}} = \\frac{1}{\\frac{20\\sqrt{(-2{,}591)^2+3{,}5^2}}{\\sqrt{(-3{,}4306)^2+3{,}5^2}\\cdot\\sqrt{(-1{,}5)^2+3{,}5^2}\\cdot\\sqrt{1{,}5^2+3{,}5^2}}} = \\frac{1}{\\frac{20\\sqrt{6{,}713+12{,}25}}{\\sqrt{11{,}769+12{,}25}\\cdot\\sqrt{2{,}25+12{,}25}\\cdot\\sqrt{2{,}25+12{,}25}}} \\;;\\; K_c = \\frac{1}{\\frac{20\\sqrt{18{,}963}}{\\sqrt{24{,}019}\\cdot\\sqrt{14{,}5}\\cdot\\sqrt{14{,}5}}} = \\frac{1}{\\frac{20\\cdot 4{,}355}{4{,}901\\cdot 14{,}5}} = \\frac{1}{\\frac{87{,}094}{71{,}063}} = \\frac{1}{1{,}2256} \\approx \\mathbf{0{,}816} \\;(\\approx 0{,}817) \\;;\\; K_{p,\\text{novo}} = K_p\\cdot K_c\\cdot\\frac{z}{p} = 2\\cdot 0{,}817\\cdot 13{,}10 = 21{,}4 \\implies \\mathbf{e_{ss} = \\frac{1}{1+21{,}4} = 4{,}4\\% \\le 5\\%}'
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
        title: '3. Passo 1 — Ganho Inicial $K_0$ pela Condição de Módulo em $s_d = -2 + j2$ (Regra dos 7 Passos)',
        description: 'Aplicando $K_0 = \\left.\\frac{1}{|G(s)|}\\right|_{s=-2+j2}$ sem inverter antecipadamente:',
        latex: 'K_0 = \\frac{1}{|G(s_d)|} = \\frac{1}{\\left|\\frac{15(s_d+4)}{(s_d+1)(s_d+3)(s_d+10)}\\right|} = \\frac{1}{\\left|\\frac{15(-2+j2+4)}{(-2+j2+1)(-2+j2+3)(-2+j2+10)}\\right|} = \\frac{1}{\\frac{15|2+j2|}{|-1+j2|\\cdot|1+j2|\\cdot|8+j2|}} \\;;\\; K_0 = \\frac{1}{\\frac{15\\sqrt{2^2+2^2}}{\\sqrt{(-1)^2+2^2}\\cdot\\sqrt{1^2+2^2}\\cdot\\sqrt{8^2+2^2}}} = \\frac{1}{\\frac{15\\sqrt{4+4}}{\\sqrt{1+4}\\cdot\\sqrt{1+4}\\cdot\\sqrt{64+4}}} = \\frac{1}{\\frac{15\\sqrt{8}}{\\sqrt{5}\\cdot\\sqrt{5}\\cdot\\sqrt{68}}} = \\frac{1}{\\frac{15\\cdot 2{,}8284}{5\\cdot 8{,}2462}} = \\frac{1}{\\frac{42{,}426}{41{,}231}} = \\frac{1}{1{,}0290} \\approx \\mathbf{0{,}972}'
      },
      {
        title: '4. Passos 2 a 5 — Fator $\\beta$, $z$, $p$, Ganho $K_c$ (Regra dos 7 Passos) e Conferência',
        description: 'Calculando $K_{p,a} = K_0 \\cdot K_p = 0{,}972 \\cdot 2 = 1{,}944$, $\\beta = 19 / 1{,}944 \\approx 9{,}77$, adotando $z = 0{,}909$ e $p = 0{,}101$ ($z/p = 9{,}0$), e aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ sem atalhos:',
        latex: 'K_{p,a} = K_0\\cdot K_p = 0{,}972\\cdot 2 = 1{,}944 \\;;\\; \\beta = \\frac{K_{p,\\text{req}}}{K_{p,a}} = \\frac{19}{1{,}944} \\approx 9{,}77 \\;;\\; \\Delta\\theta_{\\text{perda}} = |\\angle(-1{,}091+j2) - \\angle(-1{,}899+j2)| = |118{,}61^\\circ - 133{,}52^\\circ| = \\mathbf{14{,}9^\\circ} \\;;\\; K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z}{s_d+p}\\cdot\\frac{15(s_d+4)}{(s_d+1)(s_d+3)(s_d+10)}\\right|} = \\frac{1}{\\left|\\frac{-2+j2+0{,}909}{-2+j2+0{,}101}\\cdot\\frac{15(-2+j2+4)}{(-2+j2+1)(-2+j2+3)(-2+j2+10)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{15|-1{,}091+j2|\\cdot|2+j2|}{|-1{,}899+j2|\\cdot|-1+j2|\\cdot|1+j2|\\cdot|8+j2|}} = \\frac{1}{\\frac{15\\sqrt{(-1{,}091)^2+2^2}\\cdot\\sqrt{2^2+2^2}}{\\sqrt{(-1{,}899)^2+2^2}\\cdot\\sqrt{(-1)^2+2^2}\\cdot\\sqrt{1^2+2^2}\\cdot\\sqrt{8^2+2^2}}} \\;;\\; K_c = \\frac{1}{\\frac{15\\sqrt{1{,}190+4}\\cdot\\sqrt{4+4}}{\\sqrt{3{,}606+4}\\cdot\\sqrt{1+4}\\cdot\\sqrt{1+4}\\cdot\\sqrt{64+4}}} = \\frac{1}{\\frac{15\\sqrt{5{,}190}\\cdot\\sqrt{8}}{\\sqrt{7{,}606}\\cdot\\sqrt{5}\\cdot\\sqrt{5}\\cdot\\sqrt{68}}} = \\frac{1}{\\frac{15\\cdot 2{,}2782\\cdot 2{,}8284}{2{,}7579\\cdot 5\\cdot 8{,}2462}} = \\frac{1}{\\frac{96{,}657}{113{,}713}} = \\frac{1}{0{,}8500} \\approx \\mathbf{1{,}18} \\;;\\; G_c(s) = 1{,}18\\frac{s+0{,}909}{s+0{,}101} \\;;\\; K_{p,\\text{novo}} = K_p\\cdot K_c\\cdot\\frac{z}{p} = 2\\cdot 1{,}18\\cdot\\frac{0{,}909}{0{,}101} = 21{,}2 \\implies \\mathbf{e_{ss} = \\frac{5}{1 + 21{,}2} = 0{,}22 \\le 0{,}25}'
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
        title: '1. Método da Deficiência Angular em $s_d = -3 + j3$',
        description:
          'Para os polos da planta em $0$ e $-3$, calculamos o ângulo de cada vetor até $s_d = -3 + j3$ e aplicamos $\\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d)$:',
        latex:
          '\\theta_1 = 180^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\angle(-3+j3 - (-3)) = \\angle(0+j3) = 90^\\circ \\;;\\; \\angle L(s_d) = 0^\\circ - (135^\\circ + 90^\\circ) = -225^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - (-225^\\circ) = \\mathbf{+45^\\circ}'
      },
      {
        title: '2. Posição do Zero e Polo pela Fórmula da Bissetriz ($z_c = 3,\\; p_c = 6$)',
        description:
          'Com $\\zeta = 0{,}707$, $\\sqrt{1-\\zeta^2} = 0{,}707$, $\\sin 45^\\circ = 0{,}707$ e $\\cot 45^\\circ = 1$, aplicamos a fórmula da bissetriz e conferimos a diferença angular $\\angle(s_d+z_c) - \\angle(s_d+p_c)$:',
        latex:
          'q = \\frac{1 + \\frac{\\sqrt{1-\\zeta^2}}{\\sin\\varphi}}{\\zeta + \\sqrt{1-\\zeta^2}\\cot\\varphi} = \\frac{1 + \\frac{0{,}707}{0{,}707}}{0{,}707 + 0{,}707\\cdot 1} = \\frac{2}{1{,}414} = 1{,}414 \\;;\\; r = q^2 = \\mathbf{2} \\;;\\; |s_d| = \\sqrt{(-3)^2+3^2} = \\sqrt{9+9} = \\sqrt{18} = 4{,}243 \\;;\\; z_c = \\frac{|s_d|}{q} = \\frac{4{,}243}{1{,}414} = \\mathbf{3{,}000} \\;;\\; p_c = |s_d|\\cdot q = 4{,}243\\cdot 1{,}414 = \\mathbf{6{,}000} \\;;\\; \\angle(s_d+3) - \\angle(s_d+6) = \\angle(0+j3) - \\angle(3+j3) = 90^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 90^\\circ - 45^\\circ = \\mathbf{45^\\circ}'
      },
      {
        title: '3. Cálculo do Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos)',
        description:
          'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=-3+j3}$ após o cancelamento de $(s+3)$ ($K_p = K_c/r$):',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+3}{s_d+6}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{1}{s_d(s_d+6)}\\right|} = \\frac{1}{\\left|\\frac{1}{(-3+j3)(-3+j3+6)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{1}{|-3+j3|\\cdot|3+j3|}} = \\frac{1}{\\frac{1}{\\sqrt{(-3)^2+3^2}\\cdot\\sqrt{3^2+3^2}}} = \\frac{1}{\\frac{1}{\\sqrt{9+9}\\cdot\\sqrt{9+9}}} = \\frac{1}{\\frac{1}{\\sqrt{18}\\cdot\\sqrt{18}}} = \\frac{1}{\\frac{1}{18}} = \\mathbf{18{,}0} \\;;\\; K_p = \\frac{K_c}{r} = \\frac{18{,}0}{2} = \\mathbf{9{,}0} \\;;\\; \\mathbf{G_c(s) = 18\\frac{s+3}{s+6}}'
      },
      {
        title: '4. Regra dos 10 V, Erro à Rampa ($K_{\\text{vel}}$), Componentes ($C_1 = 10\\,\\mu\\text{F}$) e Banda — Slide 9',
        description:
          'Como $(s+3)$ cancela, $T(s) = \\frac{18}{s^2+6s+18}$ é de 2ª ordem pura sem zeros ($M_p = 4{,}3\\%$, $t_p = 1{,}05\\text{ s}$ sem pré-filtro). Limites práticos e síntese analógica:',
        latex:
          'u(0^+) = K_c\\Delta e = 18\\Delta e \\implies \\Delta e \\le \\frac{10}{K_c} = \\frac{10}{18} = \\mathbf{0{,}56\\text{ V}} \\;;\\; K_{\\text{vel}} = K_p\\lim_{s\\to 0}\\frac{1}{s+3} = \\frac{9{,}0}{3} = 3{,}00 \\implies e_{ss,\\text{rampa}} = \\frac{1}{K_{\\text{vel}}} = \\frac{1}{3{,}00} = \\mathbf{0{,}333\\text{ V}} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\frac{1}{3\\cdot 10^{-5}} = \\mathbf{33{,}3\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = 9{,}0\\cdot 33{,}3\\text{ k}\\Omega = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\frac{1}{6\\cdot 300\\cdot 10^3} = \\mathbf{556\\text{ nF}} \\;;\\; \\frac{\\text{GBW}}{K_c} = \\frac{1\\text{ MHz}}{18} = 55{,}6\\text{ kHz} \\gg \\frac{p_c}{2\\pi} = \\frac{6}{6{,}283} = 0{,}95\\text{ Hz}'
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
    id: 'lead-ex-slide-prop-r9',
    controllerId: 'Lead',
    subType: 'Lead',
    badge: 'Slide 04 • Proposto (r = 9 fixo)',
    title: 'Exercício Proposto 1 (Slide 14) — Avanço com r = 9 fixo (N = 8) em L(s) = 1/[s(s+3)] (sd = -3+j3)',
    source: 'Slide 04 — Compensador por avanço de fase pelo lugar das raízes (Slides 13–14)',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s(s+3)}, \\text{ refaça o projeto do compensador por avanço de fase pelo critério } r = N + 1 = 9 \\text{ fixo } (N = 8) \\text{ para } s_d = -3 + j3 \\; (\\zeta = 0{,}707,\\; \\theta_{\\text{def}} = +45^\\circ).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '152.4*(s+5.646)/(s+50.81)',
    controllerLatex: 'G_c(s) = 152{,}4\\frac{s + 5{,}646}{s + 50{,}81}',
    controllerBlockLabel: 'Compensador Lead (r=9 fixo)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'Usando o critério de razão fixa $r = 9$ ($N = 8$) em $s_d = -3 + j3$, o 3º polo em malha fechada fica em $-47{,}81$ (bem mais rápido que os polos dominantes $-3 \\pm j3$), garantindo dominância de 2ª ordem. Em contrapartida, exige $K_c = 152{,}4$ (maior que $K_c = 18$ da bissetriz) e pré-filtro $F(s)$ para reduzir $M_p$ de $7{,}1\\%$ para $4{,}3\\%$.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem → 3ª Ordem (3º polo em -47,81)',
      initialErrorLatex: 'T_p(\\text{sem Lead}) \\text{ lento } (\\sigma = -1{,}5)',
      finalErrorLatex: 'K_{\\text{vel}} = 5{,}65 \\; (e_{ss,\\text{rampa}} = 0{,}177\\text{ V})'
    },
    detailedSteps: [
      {
        title: '1. Deficiência Angular em $s_d = -3 + j3$',
        description:
          'Para os polos em $0$ ($-3+j3$, 2º quadrante) e $-3$ ($0+j3$, $+j\\omega$), aplicamos $\\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d)$:',
        latex:
          '\\theta_1 = 180^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\angle(-3+j3 - (-3)) = \\angle(0+j3) = 90^\\circ \\;;\\; \\angle L(s_d) = 0^\\circ - (135^\\circ + 90^\\circ) = -225^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - (-225^\\circ) = \\mathbf{+45{,}0^\\circ}'
      },
      {
        title: '2. Zero e Polo pelo Critério $r = 9$ Fixo (Polinômio em $z_c$, $\\cot 45^\\circ = 1$)',
        description:
          'Substituindo $\\sigma_d = 3$, $\\omega_d = 3$ e $r = 9$ em $c_2 z_c^2 + c_1 z_c + c_0 = 0$ e escolhendo a maior raiz (descarta-se $0{,}354$):',
        latex:
          'c_2 = r = 9 \\;;\\; c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi] = -[3(10) + 3(8)(1)] = -54{,}0 \\;;\\; c_0 = \\sigma_d^2 + \\omega_d^2 = 3^2 + 3^2 = 18 \\;;\\; 9z_c^2 - 54{,}0z_c + 18 = 0 \\implies \\Delta = (-54)^2 - 4\\cdot 9\\cdot 18 = 2268 \\;(\\sqrt{\\Delta} = 47{,}62) \\;;\\; z_c = \\frac{54{,}0 + 47{,}62}{18} = \\mathbf{5{,}646} \\;;\\; p_c = r\\cdot z_c = 9\\cdot 5{,}646 = \\mathbf{50{,}81} \\;;\\; \\angle(s_d+z_c) - \\angle(s_d+p_c) = 48{,}59^\\circ - 3{,}59^\\circ = \\mathbf{45{,}00^\\circ}'
      },
      {
        title: '3. Ganho $K_c$, $K_p$ e 3º Polo de Malha Fechada (Regra dos 7 Passos)',
        description:
          'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|}$ sem inverter antecipadamente e obtendo $p_3$ por Girard:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{2{,}646+j3}{47{,}81+j3}\\cdot\\frac{1}{(-3+j3)(j3)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{7{,}001+9}}{\\sqrt{2285{,}80+9}\\cdot\\sqrt{9+9}\\cdot 3}} = \\frac{1}{\\frac{4{,}0002}{47{,}904\\cdot 4{,}2426\\cdot 3}} = \\frac{1}{\\frac{4{,}0002}{609{,}71}} = \\frac{1}{0{,}006561} \\approx \\mathbf{152{,}4} \\;;\\; K_p = \\frac{K_c}{r} = \\frac{152{,}4}{9} = \\mathbf{16{,}94} \\;;\\; p_3 = -(3 + p_c) - (-2\\sigma_d) = -(3 + 50{,}81) + 6 = \\mathbf{-47{,}81}'
      },
      {
        title: '4. Simulação, Pré-Filtro, Regra dos 10 V e Componentes ($C_1 = 10\\,\\mu\\text{F}$) — Slide 14',
        description:
          'Sem $F(s)$: $M_p = 7{,}1\\%$, $t_p = 0{,}79\\text{ s}$, pico de $u = 152{,}4\\text{ V/V}$; com $F(s) = \\frac{5{,}646}{s+5{,}646}$: $M_p = 4{,}3\\%$, $t_p = 1{,}07\\text{ s}$, pico de $u = 14{,}8\\text{ V/V}$:',
        latex:
          'K_{\\text{vel}} = \\frac{K_p}{3} = \\frac{16{,}94}{3} = 5{,}65 \\implies e_{ss,\\text{rampa}} = \\frac{1}{5{,}65} = \\mathbf{0{,}177\\text{ V}} \\;;\\; R_1 = \\frac{1}{5{,}646\\cdot 10^{-5}} = \\mathbf{17{,}7\\text{ k}\\Omega} \\;;\\; R_2 = 16{,}94\\cdot 17{,}7\\text{ k}\\Omega = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{50{,}81\\cdot 300\\cdot 10^3} = \\mathbf{65{,}6\\text{ nF}}'
      }
    ],
    scilabCode: `// Slide 14 - Proposto Avanço r=9 fixo (N=8): sd = -3+j3
s = %s;
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 152.4*(s+5.646), s+50.81);
t = 0:0.01:3; clf();
plot(t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'lead-ex-slide-prop-r13',
    controllerId: 'Lead',
    subType: 'Lead',
    badge: 'Slide 04 • Proposto (r = 13 fixo)',
    title: 'Exercício Proposto 2 (Slide 14) — Avanço com r = 13 fixo (N = 12) em L(s) = 1/[s(s+3)] (sd = -3+j3)',
    source: 'Slide 04 — Compensador por avanço de fase pelo lugar das raízes (Slides 13–14)',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s(s+3)}, \\text{ refaça o projeto do compensador por avanço de fase pelo critério } r = N + 1 = 13 \\text{ fixo } (N = 12) \\text{ para } s_d = -3 + j3 \\; (\\zeta = 0{,}707,\\; \\theta_{\\text{def}} = +45^\\circ).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '224.6*(s+5.760)/(s+74.87)',
    controllerLatex: 'G_c(s) = 224{,}6\\frac{s + 5{,}760}{s + 74{,}87}',
    controllerBlockLabel: 'Compensador Lead (r=13 fixo)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 3,
    whyThisController:
      'Com $r = 13$ ($N = 12$) fixo, o 3º polo em malha fechada afasta-se ainda mais para $-71{,}87$, mas o ganho de alta frequência sobe para $K_c = 224{,}6$ (contra $152{,}4$ para $r=9$ e $18{,}0$ na bissetriz). O pré-filtro $F(s)$ reduz o pico de $u$ de $224{,}6$ para $15{,}6\\text{ V/V}$ e mantém $M_p = 4{,}3\\%$.',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem → 3ª Ordem (3º polo em -71,87)',
      initialErrorLatex: 'T_p(\\text{sem Lead}) \\text{ lento } (\\sigma = -1{,}5)',
      finalErrorLatex: 'K_{\\text{vel}} = 5{,}76 \\; (e_{ss,\\text{rampa}} = 0{,}174\\text{ V})'
    },
    detailedSteps: [
      {
        title: '1. Deficiência Angular em $s_d = -3 + j3$',
        description:
          'Para os polos em $0$ e $-3$, obtemos a mesma deficiência angular:',
        latex:
          '\\theta_1 = 180^\\circ - \\arctan\\left(\\frac{3}{3}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\angle(0+j3) = 90^\\circ \\;;\\; \\angle L(s_d) = -225^\\circ \\implies \\theta_{\\text{def}} = -180^\\circ - (-225^\\circ) = \\mathbf{+45{,}0^\\circ}'
      },
      {
        title: '2. Zero e Polo pelo Critério $r = 13$ Fixo (Polinômio em $z_c$, $\\cot 45^\\circ = 1$)',
        description:
          'Substituindo $\\sigma_d = 3$, $\\omega_d = 3$ e $r = 13$ em $c_2 z_c^2 + c_1 z_c + c_0 = 0$ e escolhendo a maior raiz (descarta-se $0{,}240$):',
        latex:
          'c_2 = r = 13 \\;;\\; c_1 = -[\\sigma_d(r+1) + \\omega_d(r-1)\\cot\\varphi] = -[3(14) + 3(12)(1)] = -78{,}0 \\;;\\; c_0 = \\sigma_d^2 + \\omega_d^2 = 18 \\;;\\; 13z_c^2 - 78{,}0z_c + 18 = 0 \\implies \\Delta = (-78)^2 - 4\\cdot 13\\cdot 18 = 5148 \\;(\\sqrt{\\Delta} = 71{,}75) \\;;\\; z_c = \\frac{78{,}0 + 71{,}75}{26} = \\mathbf{5{,}760} \\;;\\; p_c = r\\cdot z_c = 13\\cdot 5{,}760 = \\mathbf{74{,}87} \\;;\\; \\angle(s_d+z_c) - \\angle(s_d+p_c) = 47{,}39^\\circ - 2{,}39^\\circ = \\mathbf{45{,}00^\\circ}'
      },
      {
        title: '3. Ganho $K_c$, $K_p$ e 3º Polo de Malha Fechada (Regra dos 7 Passos)',
        description:
          'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|}$ sem inverter antecipadamente e obtendo $p_3$ por Girard:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{2{,}760+j3}{71{,}87+j3}\\cdot\\frac{1}{(-3+j3)(j3)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{7{,}618+9}}{\\sqrt{5165{,}30+9}\\cdot\\sqrt{9+9}\\cdot 3}} = \\frac{1}{\\frac{4{,}0765}{71{,}933\\cdot 4{,}2426\\cdot 3}} = \\frac{1}{\\frac{4{,}0765}{915{,}54}} = \\frac{1}{0{,}004453} \\approx \\mathbf{224{,}6} \\;;\\; K_p = \\frac{K_c}{r} = \\frac{224{,}6}{13} = \\mathbf{17{,}28} \\;;\\; p_3 = -(3 + p_c) - (-2\\sigma_d) = -(3 + 74{,}87) + 6 = \\mathbf{-71{,}87}'
      },
      {
        title: '4. Simulação, Pré-Filtro, Regra dos 10 V e Componentes ($C_1 = 10\\,\\mu\\text{F}$) — Slide 14',
        description:
          'Sem $F(s)$: $M_p = 7{,}0\\%$, $t_p = 0{,}79\\text{ s}$, pico de $u = 224{,}6\\text{ V/V}$; com $F(s) = \\frac{5{,}760}{s+5{,}760}$: $M_p = 4{,}3\\%$, $t_p = 1{,}06\\text{ s}$, pico de $u = 15{,}6\\text{ V/V}$:',
        latex:
          'K_{\\text{vel}} = \\frac{K_p}{3} = \\frac{17{,}28}{3} = 5{,}76 \\implies e_{ss,\\text{rampa}} = \\frac{1}{5{,}76} = \\mathbf{0{,}174\\text{ V}} \\;;\\; R_1 = \\frac{1}{5{,}760\\cdot 10^{-5}} = \\mathbf{17{,}4\\text{ k}\\Omega} \\;;\\; R_2 = 17{,}28\\cdot 17{,}4\\text{ k}\\Omega = \\mathbf{300\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{74{,}87\\cdot 300\\cdot 10^3} = \\mathbf{44{,}5\\text{ nF}}'
      }
    ],
    scilabCode: `// Slide 14 - Proposto Avanço r=13 fixo (N=12): sd = -3+j3
s = %s;
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 224.6*(s+5.760), s+74.87);
t = 0:0.01:3; clf();
plot(t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
xgrid();`
  },
  {
    id: 'lead-ex-slide-prop-bissetriz',
    controllerId: 'Lead',
    subType: 'Lead',
    badge: 'Slide 04 • Proposto (Bissetriz)',
    title: 'Exercício Proposto (Slide 14) — Avanço pela Bissetriz em L(s) = 1/[s(s+3)] (sd = -2+j2)',
    source: 'Slide 04 — Compensador por avanço de fase pelo lugar das raízes (Slides 13–14)',
    statementLatex:
      '\\text{Dada } L(s) = \\frac{1}{s(s+3)}, \\text{ projete um compensador por avanço de fase pelo critério da bissetriz para } s_d = -2 + j2 \\; (\\zeta = 0{,}707,\\; \\theta_{\\text{def}} = +18{,}4^\\circ).',
    plantExpr: '1/(s*(s+3))',
    plantLatex: '\\frac{1}{s(s+3)}',
    controllerExpr: '7.2*(s+2.472)/(s+3.24)',
    controllerLatex: 'G_c(s) = 7{,}2\\frac{s + 2{,}472}{s + 3{,}24}',
    controllerBlockLabel: 'Compensador Lead (Bissetriz • r=1,31)',
    inputType: 'step',
    inputParams: { a0: 1, labelLatex: 'r(t) = u(t)' },
    tMax: 5,
    whyThisController:
      'Pelo critério da bissetriz com $\\theta_{\\text{def}} = +18{,}4^\\circ$, obtém-se razão $r = 1{,}31$ e ganho $K_c = 7{,}2$ (muito menor que $K_c = 86{,}9$ do PD Real $N=10$). Contudo, atenção: com $r$ pequeno, o 3º polo em malha fechada cai em $-2{,}24$ (próximo aos polos dominantes $-2 \\pm j2$), reduzindo $M_p$ sem pré-filtro para $3{,}1\\%$ ($t_p = 1{,}67\\text{ s}$).',
    diagnostics: {
      systemType: 'Tipo 1 (1 polo na origem)',
      systemOrder: '2ª Ordem → 3ª Ordem (3º polo em -2,24)',
      initialErrorLatex: 'K_{\\text{vel}} \\text{ sem compensação: } 1/3',
      finalErrorLatex: 'K_{\\text{vel}} = 1{,}84 \\; (e_{ss,\\text{rampa}} = 0{,}543\\text{ V})'
    },
    detailedSteps: [
      {
        title: '1. Deficiência Angular em $s_d = -2 + j2$',
        description:
          'Para os polos em $0$ ($-2+j2$, 2º quadrante) e $-3$ ($-2+j2+3 = 1+j2$, 1º quadrante), aplicamos $\\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d)$:',
        latex:
          '\\theta_1 = 180^\\circ - \\arctan\\left(\\frac{2}{2}\\right) = 135^\\circ \\;;\\; \\theta_2 = \\arctan\\left(\\frac{2}{1}\\right) = 63{,}43^\\circ \\;;\\; \\angle L(s_d) = 0^\\circ - (135^\\circ + 63{,}43^\\circ) = -198{,}43^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - (-198{,}43^\\circ) = \\mathbf{+18{,}4^\\circ}'
      },
      {
        title: '2. Zero e Polo pela Fórmula da Bissetriz ($\\zeta = 0{,}707,\\; \\varphi = 18{,}43^\\circ$)',
        description:
          'Calculando $|s_d|$ por Pitágoras, $\\sin(18{,}43^\\circ) = 0{,}3162$, $\\cot(18{,}43^\\circ) = 3{,}000$, e aplicando a fórmula da bissetriz:',
        latex:
          '|s_d| = \\sqrt{(-2)^2+2^2} = \\sqrt{4+4} = \\sqrt{8} = 2{,}828 \\;;\\; q = \\frac{1 + \\frac{\\sqrt{1-\\zeta^2}}{\\sin\\varphi}}{\\zeta + \\sqrt{1-\\zeta^2}\\cot\\varphi} = \\frac{1 + \\frac{0{,}707}{0{,}3162}}{0{,}707 + 0{,}707\\cdot 3} = \\frac{3{,}236}{2{,}828} = 1{,}144 \\;;\\; r = q^2 = \\mathbf{1{,}31} \\;;\\; z_c = \\frac{|s_d|}{q} = \\frac{2{,}828}{1{,}144} = \\mathbf{2{,}472} \\;;\\; p_c = |s_d|\\cdot q = 2{,}828\\cdot 1{,}144 = \\mathbf{3{,}24}'
      },
      {
        title: '3. Ganho $K_c$, $K_p$ e Polos de Malha Fechada (Regra dos 7 Passos)',
        description:
          'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|}$ sem inverter antecipadamente e obtendo $p_3$ pela relação de Girard:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)L(s_d)|} = \\frac{1}{\\left|\\frac{s_d+z_c}{s_d+p_c}\\cdot\\frac{1}{s_d(s_d+3)}\\right|} = \\frac{1}{\\left|\\frac{-2+j2+2{,}472}{-2+j2+3{,}24}\\cdot\\frac{1}{(-2+j2)(-2+j2+3)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{|0{,}472+j2|}{|1{,}24+j2|\\cdot|-2+j2|\\cdot|1+j2|}} = \\frac{1}{\\frac{\\sqrt{0{,}472^2+2^2}}{\\sqrt{1{,}24^2+2^2}\\cdot\\sqrt{(-2)^2+2^2}\\cdot\\sqrt{1^2+2^2}}} = \\frac{1}{\\frac{\\sqrt{0{,}223+4}}{\\sqrt{1{,}538+4}\\cdot\\sqrt{4+4}\\cdot\\sqrt{1+4}}} \\;;\\; K_c = \\frac{1}{\\frac{\\sqrt{4{,}223}}{\\sqrt{5{,}538}\\cdot\\sqrt{8}\\cdot\\sqrt{5}}} = \\frac{1}{\\frac{2{,}055}{2{,}353\\cdot 2{,}828\\cdot 2{,}236}} = \\frac{1}{\\frac{2{,}055}{14{,}88}} = \\frac{1}{0{,}1381} \\approx \\mathbf{7{,}2} \\;;\\; K_p = \\frac{K_c}{r} = \\frac{7{,}24}{1{,}31} = \\mathbf{5{,}53} \\;;\\; s(s+3)(s+p_c) + K_c(s+z_c) = 0 \\implies p_1 + p_2 + p_3 = -(3 + p_c) \\implies p_3 = -(3 + 3{,}24) - (-4) = \\mathbf{-2{,}24} \\;\\text{(Polos MF: } -2\\pm j2 \\text{ e } -2{,}24\\text{)}'
      },
      {
        title: '4. Limites Práticos e Componentes ($C_1 = 10\\,\\mu\\text{F}$) — Slide 14',
        description:
          'Pico de atuação: $7{,}2\\text{ V/V}$ sem filtro ($3{,}4\\text{ V/V}$ com $F(s)$); erro à rampa $0{,}543\\text{ V}$ e conferência de banda:',
        latex:
          'u(0^+) = K_c\\Delta e = 7{,}2\\Delta e \\implies \\Delta e \\le \\frac{10}{7{,}2} = \\mathbf{1{,}39\\text{ V}} \\;;\\; K_{\\text{vel}} = \\frac{K_p}{3} = \\frac{5{,}53}{3} = 1{,}84 \\implies e_{ss,\\text{rampa}} = \\frac{1}{1{,}84} = \\mathbf{0{,}543\\text{ V}} \\;;\\; R_1 = \\frac{1}{z_c C_1} = \\frac{1}{2{,}472\\cdot 10^{-5}} = \\mathbf{40{,}5\\text{ k}\\Omega} \\;;\\; R_2 = K_p R_1 = 5{,}53\\cdot 40{,}5\\text{ k}\\Omega = \\mathbf{224\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{1}{p_c R_2} = \\frac{1}{3{,}24\\cdot 224\\cdot 10^3} = \\mathbf{1382\\text{ nF}} \\;;\\; \\frac{\\text{GBW}}{K_c} = \\frac{1\\text{ MHz}}{7{,}2} = 138{,}9\\text{ kHz} \\gg \\frac{p_c}{2\\pi} = 0{,}52\\text{ Hz}'
      }
    ],
    scilabCode: `// Slide 14 - Proposto Avanço Bissetriz: sd = -2+j2
s = %s;
G = syslin('c', 1, s*(s+3));
Gc = syslin('c', 7.2*(s+2.472), s+3.24);
t = 0:0.02:5; clf();
plot(t, csim('step', t, (Gc*G)/.1), 'b-', 'LineWidth', 2);
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
        title: '1. Escolha do Zero $z$ para Cancelar o Polo Lento da Planta',
        description:
          'Adotando $z = 2$, o zero do compensador cancela o polo da planta em $s = -2$, reduzindo a função de transferência de malha aberta para um sistema de 2ª ordem em $s$ e $(s+p)$:',
        latex: '\\bar{G}_c(s)G(s) = \\frac{s+2}{s+p}\\cdot\\frac{10}{s(s+2)} = \\frac{10}{s(s+p)}'
      },
      {
        title: '2. Posição do Polo $p$ pela Condição de Ângulo em $s_d = -3 + j5{,}196$',
        description:
          'Calculando o ângulo do polo na origem e impondo a condição de ângulo $-(\\angle s_d + \\theta_p) = -180^\\circ$:',
        latex:
          '\\angle s_d = 180^\\circ - \\arctan\\left(\\frac{\\omega_d}{\\sigma_d}\\right) = 180^\\circ - \\arctan\\left(\\frac{5{,}196}{3}\\right) = 180^\\circ - 60^\\circ = 120^\\circ \\;;\\; \\theta_p = 180^\\circ - \\angle s_d = 180^\\circ - 120^\\circ = 60^\\circ \\;;\\; p = \\sigma_d + \\frac{\\omega_d}{\\tan\\theta_p} = 3 + \\frac{5{,}196}{\\tan(60^\\circ)} = 3 + \\frac{5{,}196}{1{,}732} = 3 + 3 = \\mathbf{6}'
      },
      {
        title: '3. Ajuste do Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos)',
        description:
          'Aplicando $K_c = \\left.\\frac{1}{|\\bar{G}_c(s)G(s)|}\\right|_{s=-3+j5{,}196}$ após o cancelamento de $(s+2)$:',
        latex:
          'K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|} = \\frac{1}{\\left|\\frac{s_d+2}{s_d+6}\\cdot\\frac{10}{s_d(s_d+2)}\\right|} = \\frac{1}{\\left|\\frac{10}{s_d(s_d+6)}\\right|} = \\frac{1}{\\left|\\frac{10}{(-3+j5{,}196)(-3+j5{,}196+6)}\\right|} \\;;\\; K_c = \\frac{1}{\\frac{10}{|-3+j5{,}196|\\cdot|3+j5{,}196|}} = \\frac{1}{\\frac{10}{\\sqrt{(-3)^2+5{,}196^2}\\cdot\\sqrt{3^2+5{,}196^2}}} = \\frac{1}{\\frac{10}{\\sqrt{9+27}\\cdot\\sqrt{9+27}}} = \\frac{1}{\\frac{10}{\\sqrt{36}\\cdot\\sqrt{36}}} = \\frac{1}{\\frac{10}{6\\cdot 6}} = \\frac{1}{\\frac{10}{36}} = \\frac{1}{0{,}2778} = \\mathbf{3{,}6} \\;;\\; \\mathbf{G_c(s) = 3{,}6\\frac{s+2}{s+6}}'
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
