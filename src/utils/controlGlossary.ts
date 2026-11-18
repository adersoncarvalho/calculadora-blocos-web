export interface GlossaryEntry {
  symbol: string;
  name: string;
  meaning: string;
  purpose: string;
}

export const CONTROL_GLOSSARY: Record<string, GlossaryEntry> = {
  Mp: {
    symbol: 'Mp',
    name: 'Sobressinal Máximo (Overshoot)',
    meaning: 'Porcentagem máxima que a saída ultrapassa o valor final desejado no primeiro pico.',
    purpose: 'Mede o quanto o sistema oscila; valores menores indicam resposta mais amortecida e segura.'
  },
  tp: {
    symbol: 'tp',
    name: 'Tempo de Pico',
    meaning: 'Instante de tempo em que a resposta ao degrau atinge seu primeiro pico máximo (π / ωd).',
    purpose: 'Indica a rapidez inicial com que o sistema reage logo após a mudança de referência.'
  },
  ts: {
    symbol: 'ts',
    name: 'Tempo de Estabelecimento (Acomodação)',
    meaning: 'Tempo necessário para a saída entrar e permanecer na faixa de ±2% em torno do valor final (≈ 4 / σd).',
    purpose: 'Define quanto tempo o sistema leva para estabilizar de fato após o transitório.'
  },
  Ts: {
    symbol: 'Ts',
    name: 'Tempo de Estabelecimento (2%)',
    meaning: 'Tempo até a resposta ficar definitivamente dentro de ±2% do regime permanente.',
    purpose: 'Especifica a velocidade global de acomodação da malha fechada.'
  },
  σd: {
    symbol: 'σd',
    name: 'Atenuação Real Desejada',
    meaning: 'Módulo da parte real do polo dominante desejado (sd = −σd + jωd).',
    purpose: 'Controla a taxa de decaimento exponencial (e^−σd·t) e fixa diretamente o tempo de acomodação ts ≈ 4/σd.'
  },
  sd: {
    symbol: 'sd',
    name: 'Polo Dominante Desejado',
    meaning: 'Ponto alvo no plano complexo s (−σd + jωd) que traduz as especificações de Mp e ts.',
    purpose: 'Serve de referência geométrica no Lugar das Raízes para calcular ângulos, zeros, polos e ganhos do controlador.'
  },
  ζ: {
    symbol: 'ζ',
    name: 'Fator de Amortecimento',
    meaning: 'Parâmetro adimensional (entre 0 e 1 em sistemas subamortecidos) ligado ao ângulo do polo no plano s.',
    purpose: 'Determina diretamente o sobressinal Mp (ex.: ζ = 0,707 gera Mp = 4,3%).'
  },
  ωd: {
    symbol: 'ωd',
    name: 'Frequência Natural Amortecida (rad/s)',
    meaning: 'Parte imaginária do polo dominante (ωd = ωn·√(1 − ζ²)).',
    purpose: 'Define a frequência das oscilações no transitório e o tempo de pico tp = π / ωd.'
  },
  ωn: {
    symbol: 'ωn',
    name: 'Frequência Natural Não-Amortecida (rad/s)',
    meaning: 'Distância radial do polo até a origem no plano s (|sd| = √(σd² + ωd²)).',
    purpose: 'Mede a velocidade intrínseca de resposta do sistema antes do amortecimento.'
  },
  θdef: {
    symbol: 'θdef',
    name: 'Deficiência Angular (Ângulo a Compensar)',
    meaning: 'Diferença entre −180° e o ângulo atual da planta em sd: θdef = −180° − ∠L(sd).',
    purpose: 'Indica se falta avanço de fase (θdef > 0 → PD Real ou Avanço) ou se há excesso de fase (atraso) para sd pertencer ao LGR.'
  },
  φ: {
    symbol: 'φ',
    name: 'Ângulo de Fase do Estágio / Orçamento Angular',
    meaning: 'Contribuição angular exigida do compensador (no PD/Lead) ou perda máxima tolerada de ângulo (no PI/Lag: 5° ou 10°).',
    purpose: 'Garante que o polo desejado sd permaneça no Lugar das Raízes sem deformar o transitório.'
  },
  zc: {
    symbol: 'zc',
    name: 'Zero do Controlador / Compensador',
    meaning: 'Valor positivo tal que o controlador possui um zero em s = −zc no semiplano esquerdo.',
    purpose: 'Fornece avanço de fase para puxar o LGR para a esquerda (PD/Lead) ou forma dipolo para elevar ganho em baixa frequência (Lag).'
  },
  pc: {
    symbol: 'pc',
    name: 'Polo do Controlador / Compensador',
    meaning: 'Valor positivo tal que o controlador possui um polo em s = −pc no semiplano esquerdo.',
    purpose: 'Torna o PD fisicamente realizável filtrando ruído em alta frequência (pc = r·zc) ou ajusta o ganho estático no Lag.'
  },
  zi: {
    symbol: 'zi',
    name: 'Zero do Controlador PI',
    meaning: 'Zero em s = −zi associado ao polo integrador na origem (1/s) do controlador PI.',
    purpose: 'Cancela parte do atraso de fase do integrador para zerar o erro ao degrau sem destruir o transitório.'
  },
  Kc: {
    symbol: 'Kc',
    name: 'Ganho do Controlador / Compensador',
    meaning: 'Ganho multiplicador de Gc(s) obtido pela condição de módulo |Gc(sd)·L(sd)| = 1.',
    purpose: 'Faz com que as raízes da equação característica passem exatamente pelo polo desejado sd.'
  },
  K0: {
    symbol: 'K0',
    name: 'Ganho Proporcional Inicial em sd',
    meaning: 'Ganho de controlador P puro necessário para posicionar os polos dominantes da planta em sd.',
    purpose: 'Serve de ponto de partida para avaliar o erro estacionário inicial e projetar PI ou Atraso de Fase.'
  },
  Kp: {
    symbol: 'Kp',
    name: 'Ganho Proporcional / Constante de Posição',
    meaning: 'No controlador, é o ganho em baixa frequência (Kp = Kc / r); no erro em regime, é lim s→0 Gc(s)G(s).',
    purpose: 'Define a sensibilidade proporcional da malha e o erro estacionário ao degrau: ess = 1 / (1 + Kp).'
  },
  Kd: {
    symbol: 'Kd',
    name: 'Ganho Derivativo',
    meaning: 'Peso da ação derivativa proporcional à taxa de variação do erro (Kd = Kp·Td).',
    purpose: 'Antecipa tendências do erro para amortecer oscilações e acelerar a resposta.'
  },
  Ki: {
    symbol: 'Ki',
    name: 'Ganho Integral',
    meaning: 'Peso da ação integral proporcional à integral do erro ao longo do tempo (Ki = Kp·zi).',
    purpose: 'Acumula qualquer erro residual até zerar o erro em regime permanente ao degrau.'
  },
  Td: {
    symbol: 'Td',
    name: 'Constante de Tempo Derivativa (s)',
    meaning: 'Relação entre ação derivativa e proporcional no PD (Td = N / pc).',
    purpose: 'Determina por quanto tempo a ação derivativa "antecipa" o comportamento futuro do erro.'
  },
  N: {
    symbol: 'N',
    name: 'Fator do Filtro Derivativo',
    meaning: 'Relação entre a frequência do polo do filtro e o ganho derivativo (tipicamente N = 10).',
    purpose: 'Limita o ganho em alta frequência para evitar amplificação de ruído e saturação do circuito.'
  },
  r: {
    symbol: 'r',
    name: 'Razão Polo/Zero do Compensador (pc / zc)',
    meaning: 'Relação entre a posição do polo e do zero (no PD Real, r = N + 1; na bissetriz, r = q²).',
    purpose: 'Controla o ganho máximo de alta frequência (Kc = r·Kp) e a folga angular do estágio.'
  },
  q: {
    symbol: 'q',
    name: 'Fator Geométrico da Bissetriz',
    meaning: 'Razão que posiciona zero e polo simetricamente em torno de |sd|: zc = |sd|/q e pc = |sd|·q.',
    purpose: 'Minimiza o ganho Kc necessário para fornecer o avanço de fase φ no método da bissetriz.'
  },
  β: {
    symbol: 'β',
    name: 'Fator de Atenuação do Atraso de Fase (Lag)',
    meaning: 'Razão z / p = Kreq / Katual (> 1) do compensador por atraso de fase.',
    purpose: 'Multiplica o ganho estático em baixa frequência para reduzir o erro em regime sem deslocar sd.'
  },
  ess: {
    symbol: 'ess',
    name: 'Erro em Regime Permanente (Steady-State Error)',
    meaning: 'Diferença entre a referência r(t) e a saída c(t) quando t → ∞.',
    purpose: 'Mede a precisão final do sistema para entradas em degrau, rampa ou parábola.'
  },
  eP: {
    symbol: 'eP',
    name: 'Erro Estacionário com Controlador P',
    meaning: 'Erro ao degrau obtido apenas com ganho proporcional K0: eP = 1 / (1 + Ka).',
    purpose: 'Define se o orçamento angular permitido para PI/Lag será φ = 5° (se eP ≤ 2%) ou φ = 10° (se eP > 2%).'
  },
  Kvel: {
    symbol: 'Kvel',
    name: 'Constante de Erro de Velocidade (Kv)',
    meaning: 'Limite lim s→0 [s · Gc(s) · G(s)] para sistemas Tipo 1.',
    purpose: 'Determina o erro em regime permanente a uma entrada em rampa unitária: ess = 1 / Kvel.'
  },
  Kpos: {
    symbol: 'Kpos',
    name: 'Constante de Erro de Posição',
    meaning: 'Ganho estático em malha aberta lim s→0 [Gc(s) · G(s)] para sistemas Tipo 0.',
    purpose: 'Determina o erro em regime permanente a uma entrada em degrau unitário: ess = 1 / (1 + Kpos).'
  },
  Δ: {
    symbol: 'Δ',
    name: 'Discriminante de Bhaskara',
    meaning: 'Termo b² − 4ac da equação do 2º grau usada para encontrar o zero zc ou polo p.',
    purpose: 'Permite calcular analiticamente as duas raízes possíveis e escolher a que não degrada o transitório.'
  },
  GBW: {
    symbol: 'GBW',
    name: 'Produto Ganho-Banda do Amp-Op (Hz)',
    meaning: 'Largura de banda de ganho unitário do amplificador operacional usado na montagem.',
    purpose: 'Verifica se o circuito físico acompanha o polo rápido: exige-se GBW / Kc ≫ pc / (2π).'
  },
  R1: {
    symbol: 'R1',
    name: 'Resistor de Entrada do Estágio Analógico',
    meaning: 'Resistor ligado ao ramo de entrada do amplificador operacional (R1 = 1 / (zc·C1)).',
    purpose: 'Fixa a localização do zero zc do compensador na implementação analógica.'
  },
  R2: {
    symbol: 'R2',
    name: 'Resistor de Realimentação do Estágio Analógico',
    meaning: 'Resistor na malha de realimentação do amp-op (R2 = Kp·R1 ou β·R1).',
    purpose: 'Define o ganho em baixa frequência Kp (ou fator β) do circuito compensador.'
  },
  C1: {
    symbol: 'C1',
    name: 'Capacitor de Entrada do Estágio Analógico',
    meaning: 'Capacitor escolhido como referência de projeto (ex.: 10 µF) em paralelo com R1.',
    purpose: 'Permite dimensionar valores práticos e comerciais para R1, R2 e C2.'
  },
  C2: {
    symbol: 'C2',
    name: 'Capacitor de Realimentação do Estágio Analógico',
    meaning: 'Capacitor em paralelo com R2 (C2 = 1 / (pc·R2)).',
    purpose: 'Fixa o polo de filtragem pc do compensador e define o ganho de alta frequência Kc = C1/C2.'
  },
  LGR: {
    symbol: 'LGR',
    name: 'Lugar das Raízes (Root Locus)',
    meaning: 'Trajetória descrita pelos polos de malha fechada no plano complexo s conforme o ganho K varia de 0 a ∞.',
    purpose: 'Permite visualizar e projetar graficamente estabilidade, sobressinal e velocidade de resposta.'
  },
  PD: {
    symbol: 'PD',
    name: 'Controlador Proporcional-Derivativo',
    meaning: 'Controlador que soma ação proporcional ao erro e ação derivativa proporcional à velocidade do erro.',
    purpose: 'Fornece avanço de fase para acelerar o transitório e reduzir oscilações (sem alterar o Tipo da planta).'
  },
  PI: {
    symbol: 'PI',
    name: 'Controlador Proporcional-Integral',
    meaning: 'Controlador que adiciona um polo integrador na origem (1/s) e um zero zi próximo à origem.',
    purpose: 'Aumenta o Tipo da malha e zera o erro em regime permanente ao degrau.'
  },
  Lead: {
    symbol: 'Lead',
    name: 'Compensador por Avanço de Fase',
    meaning: 'Rede com zero mais próximo da origem que o polo (zc < pc) que adiciona fase positiva.',
    purpose: 'Acelera a resposta transitória e melhora a estabilidade relativa com ganho Kc menor que o PD.'
  },
  Lag: {
    symbol: 'Lag',
    name: 'Compensador por Atraso de Fase',
    meaning: 'Rede com polo mais próximo da origem que o zero (p < z) formando um dipolo próximo a s = 0.',
    purpose: 'Aumenta o ganho em baixa frequência para reduzir o erro em regime sem alterar os polos dominantes.'
  },
  'amp-op': {
    symbol: 'Amp-Op',
    name: 'Amplificador Operacional',
    meaning: 'Circuito integrado analógico de alto ganho usado com resistores e capacitores.',
    purpose: 'Implementa fisicamente as funções de transferência dos controladores P, PI, PD, Lead e Lag.'
  },
  'pré-filtro': {
    symbol: 'F(s) — Pré-Filtro',
    name: 'Pré-Filtro de Referência',
    meaning: 'Bloco passa-baixas zc/(s + zc) colocado na entrada de referência R(s) antes do somador.',
    purpose: 'Cancela o efeito do zero do controlador na resposta ao degrau, reduzindo Mp e o pico inicial u(0+).'
  },
  'Routh-Hurwitz': {
    symbol: 'Critério de Routh-Hurwitz',
    name: 'Critério Algébrico de Estabilidade',
    meaning: 'Teste aplicado aos coeficientes do polinômio característico sem precisar calcular suas raízes.',
    purpose: 'Garante se todos os polos de malha fechada estão no semiplano esquerdo (sistema estável).'
  },
  Gc: {
    symbol: 'Gc(s)',
    name: 'Função de Transferência do Controlador',
    meaning: 'Bloco controlador/compensador inserido em série com a planta na malha direta.',
    purpose: 'Adiciona polos, zeros e ganho para ajustar o transitório e o erro em regime permanente.'
  },
  Ka: {
    symbol: 'Ka',
    name: 'Constante de Erro Estático Inicial (com Puro P)',
    meaning: 'Ganho estático em baixa frequência obtido apenas com o ganho proporcional K0 (Ka = K0·G(0)).',
    purpose: 'Permite calcular o erro inicial eP e determinar o fator β necessário no Lag ou PI.'
  },
  c2: {
    symbol: 'c2',
    name: 'Coeficiente Quadrático do Polinômio em zc',
    meaning: 'Coeficiente de zc² na equação c2·zc² + c1·zc + c0 = 0 (igual a r = N + 1 no PD Real ou β no Lag).',
    purpose: 'Entra na fórmula de Bhaskara para encontrar o zero zc que fornece exatamente o ângulo φ.'
  },
  c1: {
    symbol: 'c1',
    name: 'Coeficiente Linear do Polinômio em zc',
    meaning: 'Coeficiente de zc: c1 = −[σd(r + 1) + ωd(r − 1)·cot(φ)].',
    purpose: 'Combina as coordenadas de sd, a razão r e o ângulo desejado φ na equação quadrática.'
  },
  c0: {
    symbol: 'c0',
    name: 'Termo Independente do Polinômio em zc',
    meaning: 'Termo constante c0 = σd² + ωd² = |sd|².',
    purpose: 'Representa o quadrado da distância do polo desejado sd até a origem na equação de projeto.'
  }
};
