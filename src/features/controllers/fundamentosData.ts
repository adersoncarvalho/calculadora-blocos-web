/**
 * Conteúdo das Aulas Introdutórias de Controladores (EEL6005):
 * - 0000.1: Ações de Controle (On/Off, P, I, PI, PD, PID e Tabela Resumo)
 * - 0000.2: 3 Estudos de Caso separados em 7 exercícios individuais
 * - 0000.3: Controlador Derivativo Puro vs. PD Teórico vs. PD Prático com Filtro (N = 8 a 20)
 */

export interface FundamentoExerciseItem {
  id: string;
  groupId: 'caso1' | 'caso2' | 'caso3';
  shortLabel: string;
  badge: string;
  title: string;
  source: string;
  statement: string;
  steps: {
    title: string;
    description: string;
    latex?: string;
  }[];
  diagram?: {
    controllerLabel: string;
    controllerLatex: string;
    plantLatex: string;
    plantExpr: string;
    controllerExpr: string;
  };
  simConfig?: {
    mode: 'reference' | 'disturbance';
    plantExpr: string;
    ctrlExpr: string;
    ctrlLabel: string;
    compareExpr?: string;
    compareLabel?: string;
    tMax: number;
  };
}

export interface FundamentoGroup {
  id: 'caso1' | 'caso2' | 'caso3';
  title: string;
  plantLatex: string;
  slidesRange: string;
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

export const FUNDAMENTO_GROUPS: FundamentoGroup[] = [
  {
    id: 'caso1',
    title: 'Estudo de Caso 1 — Controle de Nível',
    plantLatex: '\\frac{R}{RCs+1}',
    slidesRange: 'Slides 2–5'
  },
  {
    id: 'caso2',
    title: 'Estudo de Caso 2 — Controle de Torque / Distúrbio',
    plantLatex: '\\frac{1}{s(Js+b)}',
    slidesRange: 'Slides 6–8'
  },
  {
    id: 'caso3',
    title: 'Estudo de Caso 3 — Resposta a Torques de Perturbação',
    plantLatex: '\\frac{1}{Js^2}',
    slidesRange: 'Slides 9–11'
  }
];

export const FUNDAMENTO_EXERCISES: FundamentoExerciseItem[] = [
  // =========================================================================
  // ESTUDO DE CASO 1 — CONTROLE DE NÍVEL (Slides 2-5)
  // =========================================================================
  {
    id: 'caso1-p',
    groupId: 'caso1',
    shortLabel: 'Controlador Proporcional (P)',
    badge: 'Caso 1 • Controlador P',
    title: 'Controle de Nível com Controlador Proporcional $G_c(s) = K$',
    source: 'Aula 0000.2 • Slide 3',
    statement:
      'Para o tanque de nível com planta $G_p(s) = \\frac{R}{RCs+1}$ em realimentação unitária negativa e controlador proporcional $G_c(s) = K$, calcule o erro em regime permanente para entrada em degrau unitário (simulação com $R=1,\\; C=1,\\; K=4$).',
    steps: [
      {
        title: '1. Tipo do Sistema e Constante de Erro de Posição ($K_{pos}$)',
        description: 'Como não há integrador ($s=0$) na malha aberta, o sistema é **Tipo 0**:',
        latex: 'K_{pos} = \\lim_{s\\to 0} FT_{MA} = \\lim_{s\\to 0} K\\frac{R}{RCs+1} = \\mathbf{KR}'
      },
      {
        title: '2. Erro em Regime Permanente ($e_{ss}$) ao Degrau Unitário',
        description: 'O erro estacionário é finito e diferente de zero (para $R=1, K=4$: $e_{ss} = 1/(1+4) = 0{,}20 = 20\\%$):',
        latex: 'e_{ss} = \\frac{1}{1 + K_{pos}} = \\mathbf{\\frac{1}{1 + KR}}'
      }
    ],
    diagram: {
      controllerLabel: 'Controlador P',
      controllerLatex: 'G_c(s) = K',
      plantLatex: '\\frac{R}{RCs+1}',
      plantExpr: '1/(s+1)',
      controllerExpr: '4'
    },
    simConfig: {
      mode: 'reference',
      plantExpr: '1/(s+1)',
      ctrlExpr: '4',
      ctrlLabel: 'Controlador P (K=4, ess=20%)',
      tMax: 5
    }
  },
  {
    id: 'caso1-i',
    groupId: 'caso1',
    shortLabel: 'Controlador Integral (I)',
    badge: 'Caso 1 • Controlador I',
    title: 'Controle de Nível com Controlador Integral $G_c(s) = K/s$',
    source: 'Aula 0000.2 • Slide 4',
    statement:
      'Para o mesmo tanque de nível $G_p(s) = \\frac{R}{RCs+1}$ em realimentação unitária negativa, substitui-se o controlador por um integrador puro $G_c(s) = \\frac{K}{s}$ (simulação com $R=1,\\; C=1,\\; K=4$).',
    steps: [
      {
        title: '1. Elevação para Sistema Tipo 1 e Cálculo de $K_{pos}$',
        description: 'O polo na origem adicionado pelo integrador torna o sistema **Tipo 1**:',
        latex: 'K_{pos} = \\lim_{s\\to 0} FT_{MA} = \\lim_{s\\to 0} \\frac{K}{s}\\cdot\\frac{R}{RCs+1} = \\mathbf{\\infty}'
      },
      {
        title: '2. Erro em Regime Permanente ($e_{ss}$)',
        description: 'Com $K_{pos} = \\infty$, o erro estacionário ao degrau é completamente eliminado:',
        latex: 'e_{ss} = \\frac{1}{1 + K_{pos}} = \\frac{1}{1 + \\infty} = \\mathbf{0}'
      }
    ],
    diagram: {
      controllerLabel: 'Controlador I',
      controllerLatex: 'G_c(s) = \\frac{K}{s}',
      plantLatex: '\\frac{R}{RCs+1}',
      plantExpr: '1/(s+1)',
      controllerExpr: '4/s'
    },
    simConfig: {
      mode: 'reference',
      plantExpr: '1/(s+1)',
      ctrlExpr: '4/s',
      ctrlLabel: 'Controlador I (K=4, ess=0%)',
      compareExpr: '4',
      compareLabel: 'Apenas P (K=4, ess=20%)',
      tMax: 6
    }
  },
  {
    id: 'caso1-pi',
    groupId: 'caso1',
    shortLabel: 'Exercício Proposto: Controlador PI',
    badge: 'Caso 1 • Exercício Proposto (PI)',
    title: 'Exercício Proposto — Tanque de Nível com Controlador PI',
    source: 'Aula 0000.2 • Slide 5',
    statement:
      '**EXERCÍCIO PROPOSTO:** Calcular o erro em regime permanente do sistema de controle de nível ($G_p(s) = \\frac{R}{RCs+1}$) para uma entrada em degrau unitário utilizando um controlador proporcional-integral (PI), $G_c(s) = K\\left(1 + \\frac{1}{sT_i}\\right)$ (simulação com $R=1,\\; C=1,\\; K=4,\\; T_i=1$).',
    steps: [
      {
        title: '1. Forma Polo-Zero do Controlador PI e Tipo do Sistema',
        description: 'Reescrevendo o PI para evidenciar o polo na origem e o zero em $-1/T_i$:',
        latex: 'G_c(s) = K\\left(1 + \\frac{1}{sT_i}\\right) = K\\frac{sT_i + 1}{sT_i} \\implies \\text{Sistema Tipo 1}'
      },
      {
        title: '2. Cálculo de $K_{pos}$ e do Erro em Regime Permanente ($e_{ss}$)',
        description: 'Aplicando o limite de posição em malha aberta:',
        latex: 'K_{pos} = \\lim_{s\\to 0} K\\frac{sT_i+1}{sT_i}\\cdot\\frac{R}{RCs+1} = \\infty \\;;\\; e_{ss} = \\frac{1}{1 + K_{pos}} = \\mathbf{0}'
      }
    ],
    diagram: {
      controllerLabel: 'Controlador PI',
      controllerLatex: 'G_c(s) = K\\left(1 + \\frac{1}{sT_i}\\right)',
      plantLatex: '\\frac{R}{RCs+1}',
      plantExpr: '1/(s+1)',
      controllerExpr: '4*(s+1)/s'
    },
    simConfig: {
      mode: 'reference',
      plantExpr: '1/(s+1)',
      ctrlExpr: '4*(s+1)/s',
      ctrlLabel: 'Controlador PI (K=4, Ti=1, ess=0%)',
      compareExpr: '4',
      compareLabel: 'Apenas P (K=4, ess=20%)',
      tMax: 6
    }
  },

  // =========================================================================
  // ESTUDO DE CASO 2 — CONTROLE DE TORQUE / DISTÚRBIO (Slides 6-8)
  // =========================================================================
  {
    id: 'caso2-p',
    groupId: 'caso2',
    shortLabel: 'Controlador P com distúrbio D(s)=1/s',
    badge: 'Caso 2 • Controlador P (Distúrbio)',
    title: 'Controle de Torque com Distúrbio $D(s) = 1/s$ e Controlador P',
    source: 'Aula 0000.2 • Slide 7',
    statement:
      'Para a planta $G_p(s) = \\frac{1}{s(Js+b)}$ com distúrbio em degrau unitário $D(s) = 1/s$ aplicado na entrada da planta (e $R(s) = 0$), calcule o erro em regime permanente utilizando controlador proporcional $G_c(s) = K$ (simulação da saída ao distúrbio com $J=1,\\; b=2,\\; K=4$).',
    steps: [
      {
        title: '1. Expressão do Erro ao Distúrbio $E(s) = -C(s)$',
        description: 'Com $R(s) = 0$ e $G_c(s) = K$, a função de transferência de $D(s)$ até $E(s)$ é:',
        latex: '\\frac{E(s)}{D(s)} = \\frac{-G_p(s)}{1 + K G_p(s)} = \\frac{-\\frac{1}{s(Js+b)}}{1 + \\frac{K}{s(Js+b)}} = \\frac{-1}{Js^2 + bs + K}'
      },
      {
        title: '2. Teorema do Valor Final para $D(s) = 1/s$',
        description: 'O controlador P não consegue anular o erro causado pelo distúrbio constante:',
        latex: 'e_{ss} = \\lim_{s\\to 0} s\\,E(s) = \\lim_{s\\to 0} s\\cdot\\frac{1}{s}\\cdot\\frac{-1}{Js^2 + bs + K} = \\mathbf{-\\frac{1}{K}}'
      }
    ],
    diagram: {
      controllerLabel: 'Controlador P',
      controllerLatex: 'G_c(s) = K',
      plantLatex: '\\frac{1}{s(Js+b)}',
      plantExpr: '1/(s*(s+2))',
      controllerExpr: '4'
    },
    simConfig: {
      mode: 'disturbance',
      plantExpr: '1/(s*(s+2))',
      ctrlExpr: '4',
      ctrlLabel: 'Saída ao distúrbio com P (y_ss = 1/K = 0,25)',
      tMax: 8
    }
  },
  {
    id: 'caso2-pi',
    groupId: 'caso2',
    shortLabel: 'Controlador PI com distúrbio D(s)=1/s',
    badge: 'Caso 2 • Controlador PI (Distúrbio)',
    title: 'Controle de Torque com Distúrbio $D(s) = 1/s$ e Controlador PI',
    source: 'Aula 0000.2 • Slide 8',
    statement:
      'Para a mesma planta $G_p(s) = \\frac{1}{s(Js+b)}$ submetida ao distúrbio em degrau unitário $D(s) = 1/s$, avalie o erro estacionário com controlador Proporcional-Integral $G_c(s) = K\\left(1 + \\frac{1}{sT_i}\\right)$ (simulação com $J=1,\\; b=2,\\; K=4,\\; T_i=2$).',
    steps: [
      {
        title: '1. Expressão do Erro com Controlador PI antes do Distúrbio',
        description: 'Substituindo $G_c(s) = K\\left(1 + \\frac{1}{sT_i}\\right)$ na malha de perturbação:',
        latex: 'E(s) = \\frac{1}{s}\\cdot\\frac{-1}{Js^2 + bs + K\\left(1 + \\frac{1}{sT_i}\\right)}'
      },
      {
        title: '2. Teorema do Valor Final — Rejeição Completa',
        description: 'Quando $s \\to 0$, o termo $\\frac{K}{sT_i}$ no denominador tende a $\\infty$, zerando o erro devido ao distúrbio:',
        latex: 'e_{ss} = \\lim_{s\\to 0} s\\,E(s) = \\lim_{s\\to 0} \\frac{-1}{Js^2 + bs + K\\left(1 + \\frac{1}{sT_i}\\right)} = \\mathbf{0}'
      }
    ],
    diagram: {
      controllerLabel: 'Controlador PI',
      controllerLatex: 'G_c(s) = K\\left(1 + \\frac{1}{sT_i}\\right)',
      plantLatex: '\\frac{1}{s(Js+b)}',
      plantExpr: '1/(s*(s+2))',
      controllerExpr: '4*(s+0.5)/s'
    },
    simConfig: {
      mode: 'disturbance',
      plantExpr: '1/(s*(s+2))',
      ctrlExpr: '4*(s+0.5)/s',
      ctrlLabel: 'Saída ao distúrbio com PI (y_ss = 0)',
      compareExpr: '4',
      compareLabel: 'Com P (y_ss = 0,25)',
      tMax: 12
    }
  },

  // =========================================================================
  // ESTUDO DE CASO 3 — RESPOSTA A TORQUES DE PERTURBAÇÃO (Slides 9-11)
  // =========================================================================
  {
    id: 'caso3-p',
    groupId: 'caso3',
    shortLabel: 'Controlador Proporcional (P)',
    badge: 'Caso 3 • Controlador P',
    title: 'Planta Duplo Integrador $\\frac{1}{Js^2}$ com Controlador Proporcional (P)',
    source: 'Aula 0000.2 • Slide 10',
    statement:
      'Para a planta $G_p(s) = \\frac{1}{Js^2}$ em realimentação unitária negativa com controlador proporcional $G_c(s) = K$, obtenha a função de transferência de malha fechada e analise as raízes (simulação ao degrau com $J=1,\\; K=4$).',
    steps: [
      {
        title: '1. Função de Transferência de Malha Fechada',
        description: 'Calculando $T(s) = \\frac{G_c(s)G_p(s)}{1 + G_c(s)G_p(s)}$:',
        latex: '\\frac{C(s)}{R(s)} = \\frac{\\frac{K}{Js^2}}{1 + \\frac{K}{Js^2}} = \\mathbf{\\frac{K}{Js^2 + K}}'
      },
      {
        title: '2. Raízes Puramente Imaginárias (Resposta Indesejada)',
        description: 'Sem termo em $s$ no denominador, os polos ficam sobre o eixo $j\\omega$ e o sistema oscila indefinidamente sem amortecimento:',
        latex: 'Js^2 + K = 0 \\implies s_{1,2} = \\pm j\\sqrt{\\frac{K}{J}} \\quad (\\zeta = 0)'
      }
    ],
    diagram: {
      controllerLabel: 'Controlador P',
      controllerLatex: 'G_c(s) = K',
      plantLatex: '\\frac{1}{Js^2}',
      plantExpr: '1/(s^2)',
      controllerExpr: '4'
    },
    simConfig: {
      mode: 'reference',
      plantExpr: '1/(s^2)',
      ctrlExpr: '4',
      ctrlLabel: 'Controlador P (K=4 — Oscilação sustentada)',
      tMax: 10
    }
  },
  {
    id: 'caso3-pd',
    groupId: 'caso3',
    shortLabel: 'Controlador Proporcional-Derivativo (PD)',
    badge: 'Caso 3 • Controlador PD',
    title: 'Planta Duplo Integrador $\\frac{1}{Js^2}$ com Controlador PD $G_c(s) = K(1 + T_d s)$',
    source: 'Aula 0000.2 • Slide 11',
    statement:
      'Para a mesma planta $G_p(s) = \\frac{1}{Js^2}$, insere-se o controlador Proporcional-Derivativo $G_c(s) = K(1 + T_d s)$ para estabilizar o sistema e reduzir o sobressinal (simulação com $J=1,\\; K=4,\\; T_d=0{,}6\\text{ s}$).',
    steps: [
      {
        title: '1. Função de Transferência de Malha Fechada',
        description: 'A ação derivativa introduz o termo de amortecimento $KT_d s$ no polinômio característico:',
        latex: '\\frac{C(s)}{R(s)} = \\mathbf{\\frac{K(1 + T_d s)}{Js^2 + KT_d s + K}}'
      },
      {
        title: '2. Raízes com Parte Real Negativa (Estabilização)',
        description: 'Com $\\text{Re}(s_{1,2}) = -\\frac{KT_d}{2J} < 0$, o sistema torna-se **estável**, amortecido e com resposta desejada:',
        latex: 's_{1,2} = -\\frac{KT_d}{2J} \\pm j\\sqrt{\\frac{K}{J} - \\left(\\frac{KT_d}{2J}\\right)^2}'
      }
    ],
    diagram: {
      controllerLabel: 'Controlador PD',
      controllerLatex: 'G_c(s) = K(1 + T_d s)',
      plantLatex: '\\frac{1}{Js^2}',
      plantExpr: '1/(s^2)',
      controllerExpr: '4*(1+0.6*s)'
    },
    simConfig: {
      mode: 'reference',
      plantExpr: '1/(s^2)',
      ctrlExpr: '4*(1+0.6*s)',
      ctrlLabel: 'Controlador PD (K=4, Td=0,6s — Estável)',
      compareExpr: '4',
      compareLabel: 'Apenas P (K=4 — Oscilatório)',
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
