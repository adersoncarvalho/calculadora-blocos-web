/**
 * Lista P2 Controle 1 — Todas as 23 Questões Resolvidas Passo a Passo
 * Métodos do Prof. Dr. Leandro C. Brolin (EEL6005 — Lugar das Raízes: P, PD Real, PI, Avanço e Atraso de Fase)
 */

export type ListaCategory = 'all' | 'transitorio' | 'teorica' | 'pratica';

export interface ListaStep {
  title: string;
  description: string;
  latex?: string;
}

export interface ListaQuestion {
  id: string;
  number: number;
  category: Exclude<ListaCategory, 'all'>;
  badge: string;
  title: string;
  statement: string;
  steps: ListaStep[];
  // Campos extras para as questões práticas de projeto (Q20 a Q23)
  practicalData?: {
    plantExpr: string;
    plantLatex: string;
    controllerExpr: string;
    controllerLatex: string;
    controllerBlockLabel: string;
    uncompGainExpr?: string; // Ex: K0 = 164.6 na Q21, ou Katual = 4.6046 na Q22
    uncompLabel?: string;
    tMax: number;
    scilabCode: string;
  };
}

export const LISTA_P2_QUESTIONS: ListaQuestion[] = [
  // =========================================================================
  // BLOCO 1: PARÂMETROS TRANSITÓRIOS E POLOS DOMINANTES (Q1 a Q3)
  // =========================================================================
  {
    id: 'q1',
    number: 1,
    category: 'transitorio',
    badge: 'Questão 1 • Transitório',
    title: 'Questão 1 — Cálculo de $M_p$, $t_p$ e $t_s$ a partir dos Polos Dominantes',
    statement:
      'Deseja-se projetar um sistema de controle em malha fechada e foi dado como requisito de projeto os polos desejados dominantes como sendo $p_1 = -10 + j18$ e $p_2 = -10 - j18$. Sendo assim, calcule o sobressinal desejado, tempo de pico desejado e o tempo de estabelecimento desejado.',
    steps: [
      {
        title: '1. Identificar $\\sigma_d$ e $\\omega_d$ a partir de $s_d = -\\sigma_d \\pm j\\omega_d$',
        description: 'Extraindo a parte real negativa e a parte imaginária dos polos dominantes:',
        latex: '\\sigma_d = 10 \\;;\\; \\omega_d = 18\\text{ rad/s}'
      },
      {
        title: '2. Calcular a frequência natural $\\omega_n$ e o fator de amortecimento $\\zeta$',
        description: 'Pelas relações trigonométricas no plano $s$:',
        latex: '\\omega_n = \\sqrt{\\sigma_d^2 + \\omega_d^2} = \\sqrt{10^2 + 18^2} = \\sqrt{424} \\approx 20{,}5913\\text{ rad/s} \\;;\\; \\zeta = \\frac{\\sigma_d}{\\omega_n} = \\frac{10}{20{,}5913} \\approx 0{,}4856'
      },
      {
        title: '3. Calcular o sobressinal máximo ($M_p$)',
        description: 'Aplicando a fórmula exponencial do sobressinal percentual:',
        latex: 'M_p = e^{-\\frac{\\zeta\\pi}{\\sqrt{1-\\zeta^2}}} = e^{-\\frac{\\sigma_d \\pi}{\\omega_d}} = e^{-\\frac{10\\pi}{18}} \\approx 0{,}1746 = \\mathbf{17{,}46\\%}'
      },
      {
        title: '4. Calcular o tempo de pico ($t_p$) e o tempo de estabelecimento ($t_s$ a $2\\%$)',
        description: 'Substituindo $\\omega_d = 18$ e $\\sigma_d = 10$:',
        latex: 't_p = \\frac{\\pi}{\\omega_d} = \\frac{\\pi}{18} \\approx \\mathbf{0{,}1745\\text{ s}} \\;;\\; t_s = \\frac{4}{\\sigma_d} = \\frac{4}{10} = \\mathbf{0{,}40\\text{ s}}'
      }
    ]
  },
  {
    id: 'q2',
    number: 2,
    category: 'transitorio',
    badge: 'Questão 2 • Polos Dominantes',
    title: 'Questão 2 — Polos Dominantes para $M_p = 16\\%$ e $t_s = 5\\text{ s}$',
    statement:
      'Deseja-se projetar um sistema de controle em malha fechada e foi dado como requisito de projeto o sobressinal máximo de $16\\%$ e tempo de estabelecimento de $5\\text{ s}$. Sendo assim, calcule os polos dominantes de projeto.',
    steps: [
      {
        title: '1. Calcular o fator de amortecimento $\\zeta$ a partir de $M_p = 0{,}16$',
        description: 'Invertendo a equação do sobressinal máximo:',
        latex: '\\zeta = \\frac{-\\ln(M_p)}{\\sqrt{\\pi^2 + \\ln^2(M_p)}} = \\frac{-\\ln(0{,}16)}{\\sqrt{\\pi^2 + \\ln^2(0{,}16)}} \\approx \\mathbf{0{,}5039}'
      },
      {
        title: '2. Calcular a parte real $\\sigma_d$ a partir de $t_s = 5\\text{ s}$ (critério de $2\\%$)',
        description: 'Usando a aproximação padrão de $4$ constantes de tempo:',
        latex: '\\sigma_d = \\frac{4}{t_s} = \\frac{4}{5} = \\mathbf{0{,}8\\text{ s}^{-1}}'
      },
      {
        title: '3. Calcular $\\omega_n$, $\\omega_d$ e os polos dominantes de projeto',
        description: 'Determinando a frequência natural e a frequência amortecida:',
        latex: '\\omega_n = \\frac{\\sigma_d}{\\zeta} = \\frac{0{,}8}{0{,}5039} \\approx 1{,}5877\\text{ rad/s} \\;;\\; \\omega_d = \\omega_n\\sqrt{1-\\zeta^2} = 1{,}5877\\sqrt{1-0{,}5039^2} \\approx 1{,}3714\\text{ rad/s} \\;;\\; \\mathbf{p_{1,2} = -0{,}8000 \\pm j1{,}3714}'
      }
    ]
  },
  {
    id: 'q3',
    number: 3,
    category: 'transitorio',
    badge: 'Questão 3 • Polos Dominantes',
    title: 'Questão 3 — Polos Dominantes para $M_p = 10\\%$ e $t_p = 2\\text{ s}$',
    statement:
      'Deseja-se projetar um sistema de controle em malha fechada e foi dado como requisito de projeto o sobressinal máximo de $10\\%$ e tempo de pico de $2\\text{ s}$. Sendo assim, calcule os polos dominantes de projeto.',
    steps: [
      {
        title: '1. Calcular o fator de amortecimento $\\zeta$ a partir de $M_p = 0{,}10$',
        description: 'Substituindo $M_p = 0{,}10$:',
        latex: '\\zeta = \\frac{-\\ln(0{,}10)}{\\sqrt{\\pi^2 + \\ln^2(0{,}10)}} \\approx \\mathbf{0{,}5912}'
      },
      {
        title: '2. Calcular $\\omega_d$ a partir de $t_p = 2\\text{ s}$',
        description: 'Pela relação do tempo de pico:',
        latex: '\\omega_d = \\frac{\\pi}{t_p} = \\frac{\\pi}{2} \\approx \\mathbf{1{,}5708\\text{ rad/s}}'
      },
      {
        title: '3. Calcular a parte real $\\sigma_d$ e os polos dominantes',
        description: 'Relacionando $\\sigma_d$ e $\\omega_d$ via $\\zeta$:',
        latex: '\\sigma_d = \\frac{\\zeta \\cdot \\omega_d}{\\sqrt{1-\\zeta^2}} = \\frac{0{,}5912 \\cdot 1{,}5708}{\\sqrt{1-0{,}5912^2}} \\approx \\mathbf{1{,}1513\\text{ s}^{-1}} \\;;\\; \\mathbf{p_{1,2} = -1{,}1513 \\pm j1{,}5708}'
      }
    ]
  },

  // =========================================================================
  // BLOCO 2: QUESTÕES TEÓRICAS E CONCEITUAIS (Q4 a Q19)
  // =========================================================================
  {
    id: 'q4',
    number: 4,
    category: 'teorica',
    badge: 'Questão 4 • Diagnóstico PI',
    title: 'Questão 4 — Análise de Controlador PI em Planta Tipo 1 com Entrada Rampa',
    statement:
      'Você foi contratado para realizar um projeto de um sistema de controle cuja função de transferência da planta é $G(s) = \\frac{s+1}{s(s+5)(s+10)}$. O sistema deve operar com uma entrada em rampa. O que você diria sobre projetar um controlador PI para este sistema?',
    steps: [
      {
        title: '1. Triagem da Planta',
        description: 'A planta já possui um polo na origem ($s = 0$), portanto é uma planta **Tipo 1**.',
        latex: 'G(s) = \\frac{s+1}{s(s+5)(s+10)} \\implies \\text{Tipo } 1'
      },
      {
        title: '2. Erro em Regime à Rampa com e sem PI',
        description:
          'Com um controlador P ou PD, a malha permanece Tipo 1 e o erro à rampa é finito ($e_{ss} = 1/K_v$). Ao inserir um controlador PI ($G_c(s) = K_c\\frac{s+z_i}{s}$), adiciona-se um segundo polo na origem, tornando o sistema **Tipo 2**.',
        latex: 'G_c(s)G(s) = K_c\\frac{(s+z_i)(s+1)}{s^2(s+5)(s+10)} \\implies K_v = \\infty \\implies e_{ss,\\text{rampa}} = 0'
      },
      {
        title: '3. Análise Crítica e Recomendação (Método do Professor)',
        description:
          'O sistema Tipo 2 zera o erro à rampa ($K_v = \\infty$), porém o duplo integrador introduz $-180^\\circ$ de fase já na origem e tende a tornar o sistema instável ou muito oscilatório sem compensação adicional. Assim, se o objetivo for apenas reduzir o erro à rampa mantendo o transitório, deve-se usar um **compensador de atraso de fase (Lag)**; se for exigido erro nulo à rampa (Tipo 2), deve-se estabilizar o sistema antes com um **controlador PD real ou avanço de fase (Lead)**.'
      }
    ]
  },
  {
    id: 'q5',
    number: 5,
    category: 'teorica',
    badge: 'Questão 5 • Controlador P',
    title: 'Questão 5 — Quando Utilizar um Controlador Proporcional (P)?',
    statement: 'Para quais situações devemos utilizar um controlador Proporcional?',
    steps: [
      {
        title: '1. Condição de Ângulo já Satisfeita',
        description:
          'Quando os polos dominantes desejados $s_d$ já pertencem ao Lugar das Raízes da planta original, isto é, quando a deficiência de fase é nula ($\\theta_{\\text{def}} \\approx 0^\\circ$).',
        latex: '\\angle L(s_d) = -180^\\circ \\implies \\theta_{\\text{def}} = 0^\\circ'
      },
      {
        title: '2. Erro em Regime Permanente Aceitável',
        description:
          'Quando o erro em regime permanente obtido com o ganho $K = \\frac{1}{|L(s_d)|}$ já atende às especificações do processo (erro finito permitido pelo Tipo atual).'
      }
    ]
  },
  {
    id: 'q6',
    number: 6,
    category: 'teorica',
    badge: 'Questão 6 • Controlador PI',
    title: 'Questão 6 — Quando Utilizar um Controlador Proporcional-Integral (PI)?',
    statement: 'Para quais situações devemos utilizar um controlador Proporcional-Integral?',
    steps: [
      {
        title: '1. Zerar Erro ao Degrau (Mudança de Tipo)',
        description:
          'Em plantas **Tipo 0** (de fase mínima) quando se deseja **zerar** o erro em regime permanente para entrada em degrau ($e_{ss} = 0$), elevando o Tipo da malha de $0$ para $1$.',
        latex: 'G_c(s) = K_c \\frac{s + z_i}{s}'
      },
      {
        title: '2. Preservação do Transitório via Dipolo',
        description:
          'Quando a resposta transitória já foi (ou pode ser) atendida por um controlador P ou PD, desejando-se preservar os polos dominantes $s_d$, o $M_p$ e o $t_s$ por meio de um dipolo polo-zero próximo à origem ($z_i$ pequeno).'
      }
    ]
  },
  {
    id: 'q7',
    number: 7,
    category: 'teorica',
    badge: 'Questão 7 • Controlador PD',
    title: 'Questão 7 — Quando Utilizar um Controlador Proporcional-Derivativo (PD)?',
    statement: 'Para quais situações devemos utilizar um controlador Proporcional-Derivativo?',
    steps: [
      {
        title: '1. Deficiência de Fase Positiva',
        description:
          'Quando há deficiência de fase positiva ($\\theta_{\\text{def}} > 0^\\circ$) no ponto $s_d$, sendo necessário deslocar o Lugar das Raízes para a esquerda no plano $s$.'
      },
      {
        title: '2. Melhoria do Transitório com PD Realizável',
        description:
          'Quando se deseja melhorar a resposta transitória (reduzir $t_s$, aumentar a velocidade e/ou reduzir $M_p$), utilizando a versão realizável (**PD Real** com filtro $N \\in [8, 12]$ e razão $r = p_c / z_c = N + 1$) para limitar o ganho em alta frequência e atenuar ruídos.',
        latex: 'G_c(s) = K_c \\frac{s + z_c}{s + p_c}, \\quad r = \\frac{p_c}{z_c} = N + 1'
      }
    ]
  },
  {
    id: 'q8',
    number: 8,
    category: 'teorica',
    badge: 'Questão 8 • Avanço de Fase',
    title: 'Questão 8 — Quando Utilizar um Controlador por Avanço de Fase (Lead)?',
    statement: 'Para quais situações devemos utilizar um controlador Avanço de Fase?',
    steps: [
      {
        title: '1. Grau de Liberdade na Razão $r = p_c / z_c$',
        description:
          'Quando há deficiência de fase positiva ($\\theta_{\\text{def}} > 0^\\circ$) para melhorar o transitório, mas deseja-se usar a razão $r = p_c / z_c > 1$ como **grau de liberdade** (em vez de fixar $r = N + 1$ como no PD real).'
      },
      {
        title: '2. Critérios Flexíveis de Projeto',
        description:
          'Permite escolher o critério mais conveniente: **Bissetriz** (menor $r$ e menor ganho $K_c$), **Cancelamento de polo** (redução de ordem) ou **Erro em regime** (fixando o ganho DC $K_p = K_c / r$).'
      }
    ]
  },
  {
    id: 'q9',
    number: 9,
    category: 'teorica',
    badge: 'Questão 9 • Conceitual',
    title: 'Questão 9 — Por que Não Utilizar um Controlador Puramente Integral?',
    statement: 'Por que não é interessante utilizarmos um controlador puramente integral?',
    steps: [
      {
        title: '1. Atraso de Fase Constante de $-90^\\circ$',
        description:
          'O controlador puramente integral adiciona um polo na origem sem nenhum zero para compensar sua fase, introduzindo $-90^\\circ$ de atraso de fase em todas as frequências.',
        latex: 'G_c(s) = \\frac{K_i}{s} \\implies \\angle G_c(j\\omega) = -90^\\circ'
      },
      {
        title: '2. Degradação do Transitório e Instabilidade',
        description:
          'Esse atraso empurra o Lugar das Raízes para a direita, degradando o transitório (aumento de $M_p$ e $t_s$) e reduzindo a margem de estabilidade, podendo tornar o sistema instável.'
      }
    ]
  },
  {
    id: 'q10',
    number: 10,
    category: 'teorica',
    badge: 'Questão 10 • Conceitual',
    title: 'Questão 10 — Por que Não se Utiliza um Controlador Puramente Derivativo?',
    statement: 'Por que não se utiliza um controlador puramente derivativo?',
    steps: [
      {
        title: '1. Cego ao Erro Constante',
        description:
          'Para um erro constante em regime permanente, a derivada é nula ($\\frac{de}{dt} = 0$), logo o controlador não atua para corrigir erro estacionário.'
      },
      {
        title: '2. Amplificação de Ruídos e Irrealizabilidade Física',
        description:
          'O ganho $|G_c(j\\omega)| = K_d \\omega$ cresce sem limite com a frequência, amplificando fortemente ruídos de medição, gerando impulso na saída frente a degraus e sendo fisicamente irrealizável sem um polo de filtragem.'
      }
    ]
  },
  {
    id: 'q11',
    number: 11,
    category: 'teorica',
    badge: 'Questão 11 • Revisão TVF',
    title: 'Questão 11 — Revisão Completa do Erro em Regime Permanente',
    statement: 'Revise toda a parte de cálculo do erro de regime permanente.',
    steps: [
      {
        title: '1. Formulação Geral via Teorema do Valor Final',
        description:
          'Para realimentação unitária com malha aberta $L(s) = G_c(s)G(s)$ e malha fechada estável:',
        latex: 'e_{ss} = \\lim_{s\\to 0} s \\cdot E(s) = \\lim_{s\\to 0} \\frac{s \\cdot R(s)}{1 + L(s)}'
      },
      {
        title: '2. Resumo das Três Entradas Canônicas',
        description:
          'Avaliando degrau ($R(s) = 1/s$), rampa ($R(s) = 1/s^2$) e parábola ($R(s) = 1/s^3$):',
        latex: 'e_{ss,\\text{degrau}} = \\frac{1}{1+K_p}, \\; K_p = \\lim_{s\\to 0} L(s) \\;;\\; e_{ss,\\text{rampa}} = \\frac{1}{K_v}, \\; K_v = \\lim_{s\\to 0} sL(s) \\;;\\; e_{ss,\\text{parábola}} = \\frac{1}{K_a}, \\; K_a = \\lim_{s\\to 0} s^2L(s)'
      }
    ]
  },
  {
    id: 'q12',
    number: 12,
    category: 'teorica',
    badge: 'Questão 12 • Módulo e Ângulo',
    title: 'Questão 12 — Dedução e Aplicação das Condições de Módulo e Ângulo',
    statement: 'Deduza as expressões da condição de ângulo e módulo. Explique onde podemos aplicar estas condições.',
    steps: [
      {
        title: '1. Dedução a partir da Equação Característica',
        description:
          'Da equação característica $1 + G_c(s)L(s) = 0$ avaliada no polo desejado $s = s_d$, tem-se $G_c(s_d)L(s_d) = -1 = 1\\angle(-180^\\circ \\pm k\\cdot 360^\\circ)$:',
        latex: '|G_c(s_d)| \\cdot |L(s_d)| = 1 \\implies |G_c(s_d)| = \\frac{1}{|L(s_d)|} \\;;\\; \\angle G_c(s_d) + \\angle L(s_d) = -180^\\circ \\implies \\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d)'
      },
      {
        title: '2. Aplicações no Projeto',
        description:
          'A **condição de ângulo** verifica se $s_d$ pertence ao LGR (P) e determina as posições de polos e zeros de compensadores (PD, PI, Avanço, Atraso). A **condição de módulo** calcula o ganho $K$ ou $K_c$ necessário para posicionar os polos de malha fechada exatamente em $s_d$.'
      }
    ]
  },
  {
    id: 'q13',
    number: 13,
    category: 'teorica',
    badge: 'Questão 13 • Conceito LGR',
    title: 'Questão 13 — Conceito do Método do Lugar das Raízes (LGR)',
    statement: 'Explique o conceito do método do Lugar das Raízes.',
    steps: [
      {
        title: 'Definição e Propriedade Fundamental',
        description:
          'O Lugar das Raízes é a representação gráfica no plano complexo $s$ da trajetória de todos os polos de malha fechada do sistema quando um parâmetro (geralmente o ganho $K$) varia de $0$ a $+\\infty$. Os ramos partem dos polos de malha aberta ($K = 0$) e caminham para os zeros de malha aberta finitos ou no infinito ($K \\to \\infty$), permitindo analisar estabilidade e projetar controladores diretamente no plano $s$.'
      }
    ]
  },
  {
    id: 'q14',
    number: 14,
    category: 'teorica',
    badge: 'Questão 14 • Polos Dominantes',
    title: 'Questão 14 — Polos Dominantes vs. Polos Não Dominantes',
    statement:
      'Defina o que são polos dominantes de um sistema. Explique qual é a diferença entre a influência que os polos dominantes e os não dominantes na resposta do sistema.',
    steps: [
      {
        title: '1. Definição de Polos Dominantes',
        description:
          'São os polos de malha fechada mais próximos do eixo imaginário $j\\omega$ (menor $|\\text{Re}(s)| = \\sigma_d$).'
      },
      {
        title: '2. Diferença de Influência',
        description:
          'Os **polos dominantes** possuem a maior constante de tempo ($\\tau = 1/\\sigma_d$) e governam $M_p$, $t_p$ e $t_s$. Os **polos não dominantes** estão bem mais à esquerda ($|\\text{Re}(p_{nd})| \\ge 5\\sigma_d$ a $10\\sigma_d$), decaindo rapidamente com influência desprezível na resposta transitória principal.'
      }
    ]
  },
  {
    id: 'q15',
    number: 15,
    category: 'teorica',
    badge: 'Questão 15 • Reta de ζ Constante',
    title: 'Questão 15 — Reta de Amortecimento Constante no LGR',
    statement:
      'Explique o que é a reta de amortecimento constante plotada junto com o Lugar das Raízes. Qual é a utilidade desta reta durante o procedimento de projeto dos controladores?',
    steps: [
      {
        title: 'Significado Geométrico e Utilidade no Projeto',
        description:
          'É a semirreta que parte da origem formando um ângulo $\\beta = \\arccos(\\zeta)$ com o eixo real negativo. Todos os pontos sobre ela possuem o mesmo fator de amortecimento $\\zeta$ e o mesmo $M_p$ teórico. Sua utilidade é localizar, na interseção com o LGR, o polo dominante $s_d$ que atende ao amortecimento especificado.',
        latex: '\\beta = \\arccos(\\zeta)'
      }
    ]
  },
  {
    id: 'q16',
    number: 16,
    category: 'teorica',
    badge: 'Questão 16 • Restrições LGR',
    title: 'Questão 16 — Restrições para Utilização do LGR',
    statement: 'Quais são as restrições para a utilização do método do Lugar das Raízes como ferramenta de projeto de controladores.',
    steps: [
      {
        title: 'Premissas Obrigatórias',
        description:
          '1) O sistema deve ser Linear e Invariante no Tempo (LTI) com função de transferência racional (atraso puro requer aproximação como Padé); 2) A equação característica deve estar na forma $1 + K\\cdot F(s) = 0$ com um único parâmetro variando linearmente; 3) O projeto analítico assume aproximação por segunda ordem dominante (sem zeros próximos ou polos lentos interferindo fortemente).'
      }
    ]
  },
  {
    id: 'q17',
    number: 17,
    category: 'teorica',
    badge: 'Questão 17 • Aproximação 2ª Ordem',
    title: 'Questão 17 — Influência de Polos Extras e Zeros na Aproximação de 2ª Ordem',
    statement:
      'Por que a precisão do resultado do projeto de um controlador efetuado via método do Lugar das Raízes é afetada em relação ao quanto o sistema se aproxima de um modelo de segunda ordem?',
    steps: [
      {
        title: 'Impacto de Polos Adicionais e Zeros Próximos',
        description:
          'As fórmulas de projeto ($M_p, t_p, t_s$) são exatas apenas para um sistema padrão de segunda ordem sem zeros. **Polos adicionais próximos** desaceleram a resposta e reduzem $M_p$; **zeros próximos** (da planta ou do controlador) introduzem efeito derivativo que aumenta $M_p$ e antecipa $t_p$. Por isso, deve-se sempre simular no tempo após o projeto.'
      }
    ]
  },
  {
    id: 'q18',
    number: 18,
    category: 'teorica',
    badge: 'Questão 18 • Posição do Zero PI',
    title: 'Questão 18 — Influência da Posição do Zero $z_i$ no Controlador PI',
    statement:
      'A função de transferência de um controlador Proporcional-Integral (PI) é constituída por um polo na origem e um zero próximo da origem. Descreva qual é a influência que a variação da posição do zero do compensador causa na resposta do sistema, tanto do ponto de vista da parte transitória quanto da parte de regime permanente.',
    steps: [
      {
        title: '1. Efeito no Regime Permanente',
        description:
          'Em planta Tipo 0, qualquer $z_i > 0$ garante $K_p = \\infty$ e $e_{ss} = 0$ ao degrau.'
      },
      {
        title: '2. Efeito no Regime Transitório',
        description:
          'Um $z_i$ grande aumenta o atraso de fase $\\varphi = \\angle s_d - \\angle(s_d+z_i)$, deslocando $s_d$ para a direita (maior $M_p$ e $t_s$). Um $z_i$ muito pequeno quase não afeta $s_d$, mas deixa o polo real preso entre $0$ e $-z_i$ muito lento, criando uma cauda longa que aumenta $t_s$. Por isso usa-se o critério do professor:',
        latex: 'z_i = \\min\\left(z_{i,\\max} \\;;\\; \\frac{|s_{\\text{lenta}}|}{1{,}1}\\right)'
      }
    ]
  },
  {
    id: 'q19',
    number: 19,
    category: 'teorica',
    badge: 'Questão 19 • Posição do Zero Lead',
    title: 'Questão 19 — Escolha Prática e Influência do Zero $z_c$ no Avanço de Fase',
    statement:
      'Durante o procedimento do projeto de um compensador Avanço de Fase, o valor do zero do compensador pode ser fixado e através da condição de ângulo calcula-se o polo do compensador. Do ponto de vista prático, como você escolheria o valor do zero do compensador? A posição deste zero pode influenciar do desempenho da resposta do sistema? Se sim, como você agiria durante o procedimento de projeto para encontrar o compensador que melhor atenda aos critérios de desempenho.',
    steps: [
      {
        title: '1. Escolha Prática e Influência',
        description:
          'Pode-se escolher $z_c$ igual ao módulo de um polo real estável da planta (**cancelamento de polo**) ou pelo **critério da bissetriz** ($z_c = |s_d|/q$), evitando zeros muito próximos à origem. Um zero próximo à origem pode gerar um polo real lento de malha fechada (aumentando $t_s$) e acentuar o efeito derivativo (aumentando $M_p$); um zero muito à esquerda pode exigir um polo $-p_c$ muito distante e ganho $K_c$ elevado.'
      },
      {
        title: '2. Procedimento Corretivo',
        description:
          'Calcular $p_c$ e $K_c$, verificar a posição dos polos não dominantes e simular ao degrau. Caso $M_p$ fique acima da meta devido ao efeito derivativo do zero, inserir um **pré-filtro** na referência ou deslocar $z_c$ para a esquerda.'
      }
    ]
  },

  // =========================================================================
  // BLOCO 3: QUESTÕES PRÁTICAS DE PROJETO COM SIMULAÇÃO E SCILAB (Q20 a Q23)
  // =========================================================================
  {
    id: 'q20',
    number: 20,
    category: 'pratica',
    badge: 'Questão 20 • Projeto P',
    title: 'Questão 20 — Projeto de Controlador Proporcional (P) para $\\zeta = 0{,}174$',
    statement:
      'Considere o sistema com planta $G(s) = \\frac{1}{(s+1)(s+2)(s+10)}$ em realimentação unitária negativa. Deseja-se projetar um controlador para este sistema de modo que ele opere com fator de amortecimento máximo de $0{,}174$, sendo este o único critério de desempenho a ser respeitado. Escolha qual controlador será suficiente, apresente os cálculos e verifique no Scilab.',
    steps: [
      {
        title: '1. Escolha do Controlador',
        description:
          'Como o único critério é $\\zeta = 0{,}174$ e a reta $\\zeta = 0{,}174$ intercepta o Lugar das Raízes da planta original, um **Controlador Proporcional (P)**, $G_c(s) = K$, é suficiente.'
      },
      {
        title: '2. Polo Desejado $s_d$ pela Condição de Ângulo',
        description:
          'Com $\\beta = \\arccos(0{,}174) \\approx 79{,}98^\\circ$ e $s_d = -0{,}174\\omega_n + j0{,}9847\\omega_n$, impõe-se $\\angle G(s_d) = -180^\\circ$:',
        latex: '-\\angle(s_d+1) - \\angle(s_d+2) - \\angle(s_d+10) = -180^\\circ \\implies \\omega_n \\approx 3{,}9863\\text{ rad/s} \\;;\\; \\mathbf{s_d = -0{,}6936 + j3{,}9255}'
      },
      {
        title: '3. Ganho $K$ pela Condição de Módulo',
        description: 'Calculando as distâncias dos polos ($-1, -2, -10$) até $s_d$:',
        latex: 'K = |s_d+1|\\cdot|s_d+2|\\cdot|s_d+10| = 3{,}9374 \\cdot 4{,}1372 \\cdot 10{,}1005 \\approx \\mathbf{164{,}53}'
      },
      {
        title: '4. Verificação dos Polos e Simulação',
        description:
          'Os polos de malha fechada são $p_{1,2} = -0{,}6936 \\pm j3{,}9255$ e $p_3 = -11{,}6128$ ($16{,}7\\times$ mais distante que $\\sigma_d$, validando a aproximação de 2ª ordem). Na simulação ao degrau: $M_p = 54{,}05\\%$ e $t_s = 5{,}14\\text{ s}$.'
      }
    ],
    practicalData: {
      plantExpr: '1/((s+1)*(s+2)*(s+10))',
      plantLatex: '\\frac{1}{(s+1)(s+2)(s+10)}',
      controllerExpr: '164.53',
      controllerLatex: 'G_c(s) = K = 164{,}53',
      controllerBlockLabel: 'Controlador P (ζ = 0,174)',
      tMax: 8,
      scilabCode: `// Questão 20 - Lista P2 Controle 1 (Controlador P)
s = %s;
G = syslin('c', 1, (s+1)*(s+2)*(s+10));
clf();
evans(G, 300);
sgrid(0.174, []); // Usar datatip na interseção para confirmar s_d e K = 164.53
K = 164.53;
T = (K*G) /. 1;
figure();
t = 0:0.01:8;
plot(t, csim('step', t, T), 'b-', 'LineWidth', 2);
xgrid();`
    }
  },
  {
    id: 'q21',
    number: 21,
    category: 'pratica',
    badge: 'Questão 21 • Projeto PI',
    title: 'Questão 21 — Projeto de Controlador PI Preservando o Transitório da Q20',
    statement:
      'Para a mesma planta da Questão 20 ($G(s) = \\frac{1}{(s+1)(s+2)(s+10)}$), foi inserido um controlador proporcional $K = 164{,}6$ obtendo resposta transitória suficiente, porém o erro em regime permanente apresentou valor elevado. Projete um controlador para minimizar o erro estacionário mantendo as características transitórias atingidas.',
    steps: [
      {
        title: '1. Erro em Regime Permanente Antes ($K_0 = 164{,}6$, Planta Tipo 0)',
        description: 'Calculando $K_{p,a} = K_0 \\cdot G(0)$ e o erro inicial ao degrau unitário:',
        latex: 'K_{p,a} = 164{,}6 \\cdot \\frac{1}{(0+1)(0+2)(0+10)} = \\frac{164{,}6}{20} = 8{,}23 \\;;\\; e_{ss,\\text{antes}} = \\frac{1}{1 + 8{,}23} = \\frac{1}{9{,}23} \\approx \\mathbf{10{,}83\\%}'
      },
      {
        title: '2. Escolha do Controlador e Triagem (Método do Professor)',
        description:
          'Para **zerar** o erro ao degrau em planta Tipo 0 mantendo o transitório, utiliza-se o **Controlador PI**, $G_c(s) = K_c\\frac{s+z_i}{s}$. Triagem: Tipo 0, fase mínima, $|s_{\\text{lenta}}| = 1$ (polo em $-1$).'
      },
      {
        title: '3. Cálculo de $z_i$ com Orçamento Angular $\\varphi = 5^\\circ$',
        description: 'Com $s_d = -0{,}6934 + j3{,}9262$ ($|s_d| = 3{,}9869$, $\\beta = 79{,}98^\\circ$):',
        latex: 'z_{i,\\max} = |s_d|\\frac{\\sin(\\varphi)}{\\sin(\\beta+\\varphi)} = 3{,}9869\\frac{\\sin(5^\\circ)}{\\sin(84{,}98^\\circ)} \\approx 0{,}3488 \\;;\\; z_i = \\min\\left(0{,}3488\\,;\\; \\frac{1}{1{,}1}\\right) = \\mathbf{0{,}3488}'
      },
      {
        title: '4. Ganho $K_c$ pela Condição de Módulo e Conferência',
        description:
          'Calculando $K_c$ e verificando que $K_{p,\\text{novo}} = \\infty \\implies e_{ss} = 0$, com $M_p = 52{,}31\\%$ (antes $54{,}05\\%$) e $t_p = 0{,}901\\text{ s}$ (antes $0{,}888\\text{ s}$):',
        latex: 'K_c = K_0 \\frac{|s_d|}{|s_d + z_i|} = 164{,}6 \\cdot \\frac{3{,}9869}{|-0{,}3446 + j3{,}9262|} \\approx \\mathbf{166{,}51} \\;;\\; \\mathbf{G_c(s) = 166{,}51\\frac{s + 0{,}3488}{s}}'
      }
    ],
    practicalData: {
      plantExpr: '1/((s+1)*(s+2)*(s+10))',
      plantLatex: '\\frac{1}{(s+1)(s+2)(s+10)}',
      controllerExpr: '166.51*(s+0.3488)/s',
      controllerLatex: 'G_c(s) = 166{,}51\\frac{s+0{,}3488}{s}',
      controllerBlockLabel: 'Controlador PI (ess = 0)',
      uncompGainExpr: '164.6',
      uncompLabel: 'Apenas P (K=164,6)',
      tMax: 10,
      scilabCode: `// Questão 21 - Lista P2 Controle 1 (PI preservando transitório)
s = %s;
G = syslin('c', 1, (s+1)*(s+2)*(s+10));
Gc_PI = syslin('c', 166.51*(s + 0.3488), s);
t = 0:0.01:10;
clf();
plot(t, csim('step', t, (164.6*G)/.1), 'r--', t, csim('step', t, (Gc_PI*G)/.1), 'b-', 'LineWidth', 2);
legend(['Apenas P (K=164.6, ess=10.83%)', 'Com PI (ess=0%)']);
xgrid();`
    }
  },
  {
    id: 'q22',
    number: 22,
    category: 'pratica',
    badge: 'Questão 22 • PD Real',
    title: 'Questão 22 — Projeto de Controlador PD Real para Reduzir $t_s$ pela Metade',
    statement:
      'Considere a planta $G(s) = \\frac{s+6}{(s+2)(s+3)(s+5)}$ operando com realimentação unitária e polos dominantes possuindo $\\zeta = 0{,}707$. Projete um controlador capaz de manter $\\zeta = 0{,}707$ porém reduzindo o tempo de estabelecimento pela metade. Verifique os critérios e proponha melhoria caso necessário.',
    steps: [
      {
        title: '1. Operação Atual ($\\zeta = 0{,}707$)',
        description:
          'Pela condição de ângulo sobre a reta $\\beta = \\arccos(0{,}707) = 45{,}01^\\circ$, encontra-se $s_{\\text{atual}} = -2{,}3168 + j2{,}3175$ e $K_{\\text{atual}} = 4{,}6046$ (na simulação: $t_{s,\\text{atual}} = 1{,}833\\text{ s}$ e $M_p = 4{,}02\\%$).'
      },
      {
        title: '2. Novo Polo Desejado ($t_s$ pela Metade, $\\zeta = 0{,}707$)',
        description: 'Dobrando a parte real $\\sigma_d$ mantendo o ângulo de $45^\\circ$:',
        latex: 's_d = 2 \\cdot s_{\\text{atual}} = -4{,}6337 + j4{,}6351 \\quad (\\omega_n = 6{,}5540\\text{ rad/s})'
      },
      {
        title: '3. Deficiência de Fase ($\\theta_{\\text{def}}$) em $s_d$',
        description: 'Somando os ângulos do zero ($-6$) e dos polos ($-2, -3, -5$):',
        latex: '\\angle L(s_d) = \\angle(s_d+6) - \\angle(s_d+2) - \\angle(s_d+3) - \\angle(s_d+5) = -240{,}93^\\circ \\;;\\; \\theta_{\\text{def}} = -180^\\circ - (-240{,}93^\\circ) = \\mathbf{+60{,}93^\\circ}'
      },
      {
        title: '4. Projeto do Controlador PD Real ($N = 10 \\implies r = N+1 = 11$)',
        description:
          'Resolvendo o polinômio da condição de ângulo em $z_c$ ($19{,}7868 z_c^2 - 146{,}380 z_c + 77{,}267 = 0$): $z_{c1} = 0{,}5721$ (descartada: gera polo lento em $-0{,}996$) e $z_{c2} = 6{,}8256$:',
        latex: 'z_c = \\mathbf{6{,}8256} \\;;\\; p_c = 11 \\cdot 6{,}8256 = \\mathbf{75{,}0814}'
      },
      {
        title: '5. Ganho $K_c$ pela Condição de Módulo e Análise Final',
        description:
          'Polos de malha fechada: $-4{,}6337 \\pm j4{,}6351$, $-5{,}4484$ e $-70{,}3655$. Na simulação: $t_s = 0{,}793\\text{ s} < 1{,}833/2 = 0{,}917\\text{ s}$ (atendido!), porém $M_p = 8{,}04\\%$ (acima de $4{,}32\\%$) devido ao efeito derivativo dos zeros em $-6$ e $-6{,}8256$. **Solução:** inserir um pré-filtro na referência.',
        latex: 'K_c = \\frac{|s_d+p_c|}{|s_d+z_c|} \\cdot \\frac{1}{|L(s_d)|} \\approx \\mathbf{347{,}12} \\;;\\; \\mathbf{G_c(s) = 347{,}12\\frac{s + 6{,}8256}{s + 75{,}0814}}'
      }
    ],
    practicalData: {
      plantExpr: '(s+6)/((s+2)*(s+3)*(s+5))',
      plantLatex: '\\frac{s+6}{(s+2)(s+3)(s+5)}',
      controllerExpr: '347.12*(s+6.8256)/(s+75.0814)',
      controllerLatex: 'G_c(s) = 347{,}12\\frac{s + 6{,}8256}{s + 75{,}0814}',
      controllerBlockLabel: 'Controlador PD Real (N=10)',
      uncompGainExpr: '4.6046',
      uncompLabel: 'Sem PD (K=4,60)',
      tMax: 3,
      scilabCode: `// Questão 22 - Lista P2 Controle 1 (PD Real N=10)
s = %s;
G = syslin('c', (s+6), (s+2)*(s+3)*(s+5));
Gc = syslin('c', 347.12*(s + 6.8256), s + 75.0814);
T_antes = (4.6046*G) /. 1;
T_depois = (Gc*G) /. 1;
clf(); t = 0:0.005:3;
plot(t, csim('step', t, T_antes), 'r--', t, csim('step', t, T_depois), 'b-', 'LineWidth', 2);
legend(['Atual (K=4.60, ts=1.83s)', 'Com PD Real (ts=0.79s)']);
xgrid();`
    }
  },
  {
    id: 'q23',
    number: 23,
    category: 'pratica',
    badge: 'Questão 23 • Avanço Bissetriz',
    title: 'Questão 23 — Segunda Opção para a Q22: Avanço de Fase pela Bissetriz',
    statement:
      'Utilize uma segunda opção de controlador para projetar o sistema apresentado na Questão 22 ($G(s) = \\frac{s+6}{(s+2)(s+3)(s+5)}$ com $s_d = -4{,}6337 + j4{,}6351$).',
    steps: [
      {
        title: '1. Escolha da Segunda Opção e Cálculo de $q = \\sqrt{r}$ (Critério da Bissetriz)',
        description:
          'Utilizando um **Compensador por Avanço de Fase (Lead)** pelo critério da Bissetriz para $s_d = -4{,}6337 + j4{,}6351$ ($|s_d| = 6{,}5540$, $\\zeta = 0{,}707$, $\\varphi = 60{,}93^\\circ$):',
        latex: 'q = \\frac{1 + \\frac{\\sqrt{1-\\zeta^2}}{\\sin\\varphi}}{\\zeta + \\sqrt{1-\\zeta^2}\\cdot\\cot\\varphi} = \\frac{1 + \\frac{0{,}7072}{0{,}8740}}{0{,}707 + 0{,}7072 \\cdot 0{,}5559} \\approx \\mathbf{1{,}6444} \\implies r = q^2 \\approx \\mathbf{2{,}7041}'
      },
      {
        title: '2. Zero e Polo do Compensador de Avanço',
        description: 'Calculando $z_c = |s_d|/q$ e $p_c = |s_d| \\cdot q$:',
        latex: 'z_c = \\frac{6{,}5540}{1{,}6444} \\approx \\mathbf{3{,}9857} \\;;\\; p_c = 6{,}5540 \\cdot 1{,}6444 \\approx \\mathbf{10{,}7774}'
      },
      {
        title: '3. Ganho $K_c$ pela Condição de Módulo e Comparação com a Q22',
        description:
          'Polos de malha fechada em $-4{,}6337 \\pm j4{,}6351$, $-4{,}1691$ e $-7{,}3410$. Simulação: $M_p = 7{,}56\\%$ e $t_s = 0{,}923\\text{ s}$. Em relação ao PD Real (Q22), a bissetriz reduziu o ganho em **$8{,}4\\times$** ($41{,}45$ contra $347{,}12$), com $t_s$ no limite devido ao polo real em $-4{,}1691$.',
        latex: 'K_c = \\frac{|s_d+p_c|}{|s_d+z_c|} \\cdot \\frac{1}{|L(s_d)|} \\approx \\mathbf{41{,}45} \\implies \\mathbf{G_c(s) = 41{,}45\\frac{s + 3{,}9857}{s + 10{,}7774}}'
      }
    ],
    practicalData: {
      plantExpr: '(s+6)/((s+2)*(s+3)*(s+5))',
      plantLatex: '\\frac{s+6}{(s+2)(s+3)(s+5)}',
      controllerExpr: '41.45*(s+3.9857)/(s+10.7774)',
      controllerLatex: 'G_c(s) = 41{,}45\\frac{s + 3{,}9857}{s + 10{,}7774}',
      controllerBlockLabel: 'Avanço de Fase (Bissetriz)',
      uncompGainExpr: '4.6046',
      uncompLabel: 'Sem Avanço (K=4,60)',
      tMax: 3,
      scilabCode: `// Questão 23 - Lista P2 Controle 1 (Avanço de Fase - Bissetriz)
s = %s;
G = syslin('c', (s+6), (s+2)*(s+3)*(s+5));
Gc = syslin('c', 41.45*(s + 3.9857), s + 10.7774);
T_antes = (4.6046*G) /. 1;
T_depois = (Gc*G) /. 1;
clf(); t = 0:0.005:3;
plot(t, csim('step', t, T_antes), 'r--', t, csim('step', t, T_depois), 'b-', 'LineWidth', 2);
legend(['Atual (K=4.60, ts=1.83s)', 'Avanço Bissetriz (Kc=41.45)']);
xgrid();`
    }
  }
];
