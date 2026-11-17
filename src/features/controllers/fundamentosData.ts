/**
 * Conteúdo das Aulas Introdutórias de Controladores (EEL6005):
 * - 0000.1: Ações de Controle (On/Off, P, I, PI, PD, PID e Tabela Resumo)
 * - 0000.2: Estudos de Caso (Nível, Distúrbio em Torque e Duplo Integrador 1/(Js²))
 * - 0000.3: Controlador Derivativo Puro vs. PD Teórico vs. PD Prático com Filtro (N = 8 a 20)
 */

export interface FundamentoCaseStudy {
  id: string;
  badge: string;
  title: string;
  source: string;
  statement: string;
  steps: {
    title: string;
    description: string;
    latex?: string;
  }[];
  simConfig?: {
    plantExpr: string;
    plantLatex: string;
    uncompExpr: string;
    uncompLabel: string;
    compExpr: string;
    compLabel: string;
    controllerLatex: string;
    tMax: number;
  };
}

export const BASIC_ACTIONS = [
  {
    id: 'onoff',
    name: 'Liga / Desliga (On/Off)',
    formulaLatex: 'u(t) = \\begin{cases} U_{\\max}, & e(t) > 0 \\\\ U_{\\min}, & e(t) < 0 \\end{cases}',
    summary: 'Atuador comuta entre dois estados extremos (ex.: termostato simples). Barato, porém gera oscilação contínua (ciclo limite) em torno da referência.'
  },
  {
    id: 'P',
    name: 'Proporcional (P)',
    formulaLatex: 'G_c(s) = K_p',
    summary: 'Acelera a resposta e reduz o erro estacionário, mas não elimina o erro ao degrau em plantas Tipo 0. Implementação simples com ganho ajustável.'
  },
  {
    id: 'I',
    name: 'Integral (I)',
    formulaLatex: 'G_c(s) = \\frac{K_i}{s}',
    summary: 'Eleva o Tipo do sistema em +1 e elimina o erro estacionário ao degrau, mas deixa a resposta mais lenta e oscilatória; sistemas Tipo ≥ 3 tendem à instabilidade.'
  },
  {
    id: 'PI',
    name: 'Proporcional-Integral (PI)',
    formulaLatex: 'G_c(s) = K_p\\left(1 + \\frac{1}{T_i s}\\right) = K_p\\frac{s + 1/T_i}{s}',
    summary: 'Une o polo na origem (erro nulo ao degrau) com um zero em $-1/T_i$ que puxa o LGR para a esquerda, tornando o PI mais estável que o integrador puro.'
  },
  {
    id: 'PD',
    name: 'Proporcional-Derivativo (PD)',
    formulaLatex: 'G_{PD}(s) = K_p(1 + T_d s) \\quad\\text{(ideal)}\\qquad G_{PD,\\text{real}}(s) = K_p\\left[1 + \\frac{T_d s}{(T_d/N)s + 1}\\right]',
    summary: 'Ação antecipativa que melhora o amortecimento, reduz sobressinal e estabiliza plantas como $1/(Js^2)$. Na prática exige filtro passa-baixas ($N = 8\\text{ a }20$).'
  },
  {
    id: 'PID',
    name: 'Proporcional-Integral-Derivativo (PID)',
    formulaLatex: 'G_{PID}(s) = K_p\\left(1 + \\frac{1}{T_i s} + T_d s\\right)',
    summary: 'Soma das três ações: $K_p$ acelera a subida, $K_i$ elimina o erro estacionário e $K_d$ reduz o sobressinal e o tempo de estabelecimento.'
  }
];

export const PID_SUMMARY_TABLE = [
  { param: 'Kp', riseTime: 'Diminui', overshoot: 'Aumenta', settlingTime: 'Sem alteração', steadyError: 'Diminui' },
  { param: 'Ki', riseTime: 'Diminui', overshoot: 'Aumenta', settlingTime: 'Aumenta', steadyError: 'Elimina' },
  { param: 'Kd', riseTime: 'Sem alteração', overshoot: 'Diminui', settlingTime: 'Diminui', steadyError: 'Sem alteração' }
];

export const FUNDAMENTO_CASE_STUDIES: FundamentoCaseStudy[] = [
  {
    id: 'nivel-p-i-pi',
    badge: 'Estudo de Caso 1 • Controle de Nível',
    title: 'Tanque de Nível $G_p(s) = \\frac{R}{RCs+1}$ — Comparação P, I e Exercício Proposto PI',
    source: 'Aula 0000.2 (Slides 2–5)',
    statement:
      'Para um tanque de nível com função de transferência $G_p(s) = \\frac{R}{RCs + 1}$ (na simulação abaixo: $R = 1,\\; C = 1 \\implies G_p(s) = \\frac{1}{s+1}$) em realimentação unitária negativa, analise o erro estacionário ao degrau unitário com controlador **P** ($K$), **I** ($K/s$) e resolva o **Exercício Proposto com PI**.',
    steps: [
      {
        title: '1. Controlador Proporcional P ($G_c(s) = K$)',
        description: 'Sistema Tipo 0 em realimentação unitária. A constante de erro estático de posição é finita:',
        latex: 'K_{pos} = \\lim_{s\\to 0} K\\frac{R}{RCs+1} = KR \\;;\\; e_{ss} = \\frac{1}{1+K_{pos}} = \\frac{1}{1+KR} \\neq 0'
      },
      {
        title: '2. Controlador Integral I ($G_c(s) = K/s$)',
        description: 'O integrador eleva o sistema para Tipo 1, zerando o erro estacionário ao degrau:',
        latex: 'K_{pos} = \\lim_{s\\to 0} \\frac{K}{s}\\cdot\\frac{R}{RCs+1} = \\infty \\;;\\; e_{ss} = \\frac{1}{1+\\infty} = \\mathbf{0}'
      },
      {
        title: '3. Resolução do Exercício Proposto — Controlador PI ($G_c(s) = K\\left(1 + \\frac{1}{sT_i}\\right)$)',
        description:
          'Escrevendo o PI na forma polo-zero $G_c(s) = K\\frac{sT_i + 1}{sT_i}$, o polo na origem mantém o sistema como **Tipo 1** e o zero em $-1/T_i$ melhora a estabilidade:',
        latex: 'K_{pos} = \\lim_{s\\to 0} K\\frac{sT_i+1}{sT_i}\\cdot\\frac{R}{RCs+1} = \\infty \\;;\\; e_{ss} = \\frac{1}{1+K_{pos}} = \\mathbf{0}'
      }
    ],
    simConfig: {
      plantExpr: '1/(s+1)',
      plantLatex: '\\frac{1}{s+1}',
      uncompExpr: '4',
      uncompLabel: 'Apenas P (K=4, ess=20%)',
      compExpr: '4*(s+1)/s',
      compLabel: 'Com PI (K=4, Ti=1, ess=0%)',
      controllerLatex: 'G_c(s) = 4\\frac{s+1}{s}',
      tMax: 6
    }
  },
  {
    id: 'torque-disturbio',
    badge: 'Estudo de Caso 2 • Distúrbio de Torque',
    title: 'Rejeição a Distúrbio em Degrau $D(s) = 1/s$ — Controlador P vs. PI',
    source: 'Aula 0000.2 (Slides 6–8)',
    statement:
      'Considere a planta $G_p(s) = \\frac{1}{s(Js+b)}$ submetida a um distúrbio em degrau unitário $D(s) = 1/s$ antes da planta (com referência nula $R(s)=0$). Compare o erro estacionário causado pelo distúrbio usando controlador **P** ($K$) e **PI** ($K(1+1/(sT_i))$).',
    steps: [
      {
        title: '1. Expressão do Erro ao Distúrbio com Controlador P ($G_c(s) = K$)',
        description: 'Aplicando o Teorema do Valor Final para $D(s) = 1/s$:',
        latex: 'e_{ss,D} = \\lim_{s\\to 0} s\\,E(s) = \\lim_{s\\to 0} s\\cdot\\frac{1}{s}\\cdot\\frac{-1}{Js^2 + bs + K} = \\mathbf{-\\frac{1}{K}}'
      },
      {
        title: '2. Rejeição Completa do Distúrbio com Controlador PI',
        description: 'Inserindo o integrador antes do ponto de entrada do distúrbio, o ganho em baixa frequência vai a infinito no ramo direto:',
        latex: 'e_{ss,D} = \\lim_{s\\to 0} s\\cdot\\frac{1}{s}\\cdot\\frac{-1}{Js^2 + bs + K\\left(1 + \\frac{1}{sT_i}\\right)} = \\frac{-1}{\\infty} = \\mathbf{0}'
      }
    ]
  },
  {
    id: 'duplo-integrador-pd',
    badge: 'Estudo de Caso 3 • Estabilização com PD',
    title: 'Planta Duplo Integrador $G_p(s) = \\frac{1}{Js^2}$ — Oscilação com P vs. Estabilização com PD',
    source: 'Aula 0000.2 (Slides 9–11)',
    statement:
      'Para uma planta inercial pura $G_p(s) = \\frac{1}{Js^2}$ (na simulação abaixo: $J = 1,\\; K = 4,\\; T_d = 0{,}6\\text{ s}$), compare a resposta em malha fechada com controlador **Proporcional (P)** e **Proporcional-Derivativo (PD)**.',
    steps: [
      {
        title: '1. Controlador P ($G_c(s) = K$) — Raízes Puramente Imaginárias',
        description: 'Sem termo em $s$ no denominador (amortecimento nulo), os polos ficam sobre o eixo $j\\omega$ em $\\pm j\\sqrt{K/J}$, gerando oscilação senoidal sustentada indesejada:',
        latex: '\\frac{C(s)}{R(s)} = \\frac{K}{Js^2 + K} \\implies s_{1,2} = \\pm j\\sqrt{\\frac{K}{J}}'
      },
      {
        title: '2. Controlador PD ($G_c(s) = K(1 + T_d s)$) — Sistema Estável e Amortecido',
        description: 'A ação derivativa adiciona o termo de amortecimento $KT_d s$ ao polinômio característico, trazendo os polos para o semiplano esquerdo:',
        latex: '\\frac{C(s)}{R(s)} = \\frac{K(1 + T_d s)}{Js^2 + KT_d s + K} \\implies \\text{Re}(s_{1,2}) = -\\frac{KT_d}{2J} < 0'
      }
    ],
    simConfig: {
      plantExpr: '1/(s^2)',
      plantLatex: '\\frac{1}{Js^2}',
      uncompExpr: '4',
      uncompLabel: 'Apenas P (K=4 — Oscilatório)',
      compExpr: '4*(1+0.6*s)',
      compLabel: 'Com PD (K=4, Td=0,6s — Estável)',
      controllerLatex: 'G_c(s) = 4(1 + 0{,}6s)',
      tMax: 10
    }
  }
];

export const PD_PRACTICAL_POINTS = [
  {
    title: '1. Por que o Controlador D puro ($C(s) = K_d s$) não existe?',
    items: [
      '**Irrealizável fisicamente:** grau do numerador maior que o do denominador (sistema impróprio e não causal).',
      '**Não corrige erro constante:** se o erro é constante, $\\frac{de}{dt} = 0$, então a saída derivativa é nula.',
      '**Amplificação de ruído:** o ganho $|j\\omega K_d| \\to \\infty$ quando $\\omega \\to \\infty$, saturando o atuador com qualquer ruído de sensor.'
    ]
  },
  {
    title: '2. Por que o PD Teórico ($K_p(1 + T_d s)$) também é impróprio?',
    items: [
      'Tem grau $1/0$ ($n > m$): exige um **impulso infinito (Delta de Dirac)** na saída do atuador diante de uma variação em degrau.',
      'No domínio discreto seria não causal, exigindo amostras futuras do erro $e[k+1]$.'
    ]
  },
  {
    title: '3. Solução Industrial: PD Real com Filtro Passa-Baixas',
    items: [
      'Função de transferência própria ($1/1$): $C_{PD,\\text{real}}(s) = K_p\\left[1 + \\frac{T_d s}{(T_d/N)s + 1}\\right]$, com fator típico $N = 8\\text{ a }20$.',
      'Insere um polo rápido em $p = -N/T_d$, mantendo ganho DC $C(0) = K_p$ e limitando o ganho máximo em alta frequência para $K_{\\max} = K_p(1+N)$.',
      'Na realização com Amp-Op, basta adicionar um resistor $R_{\\text{in}}$ em série com o capacitor $C$: $C(s) = -\\frac{R_f C s}{R_{\\text{in}} C s + 1}$.'
    ]
  }
];
