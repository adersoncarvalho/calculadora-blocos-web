import { DiagramGraph, DiagramElement, DiagramConnection } from '@/core/reduction/mason';

export interface Point {
  x: number;
  y: number;
}

export interface PortPosition {
  x: number;
  y: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * Retorna as coordenadas do ponto de conexão (porta) de um elemento
 */
export function getElementPort(
  el: DiagramElement,
  side: 'left' | 'right' | 'top' | 'bottom'
): PortPosition {
  const x = el.x || 100;
  const y = el.y || 100;

  if (el.type === 'summer') {
    const r = 18;
    switch (side) {
      case 'left': return { x: x - r, y, side };
      case 'right': return { x: x + r, y, side };
      case 'top': return { x, y: y - r, side };
      case 'bottom': return { x, y: y + r, side };
    }
  }

  if (el.type === 'input' || el.type === 'output') {
    const r = 20;
    switch (side) {
      case 'left': return { x: x - r, y, side };
      case 'right': return { x: x + r, y, side };
      case 'top': return { x, y: y - r, side };
      case 'bottom': return { x, y: y + r, side };
    }
  }

  // Bloco retangular padrão: w = 110, h = 50
  const hw = 55;
  const hh = 25;
  switch (side) {
    case 'left': return { x: x - hw, y, side };
    case 'right': return { x: x + hw, y, side };
    case 'top': return { x, y: y - hh, side };
    case 'bottom': return { x, y: y + hh, side };
  }
}

/**
 * Calcula rota ortogonal limpa (Manhattan) entre dois elementos sem atravessar blocos
 */
export function computeSmartConnectionPath(
  src: DiagramElement,
  tgt: DiagramElement,
  conn: DiagramConnection,
  connIndex: number = 0,
  totalConns: number = 1
): { pathD: string; signPos: Point; midPoint: Point } {
  const isFeedback = (src.dir === 'left' || (src.x || 0) > (tgt.x || 0));

  let startPort: PortPosition;
  let endPort: PortPosition;

  // Se a conexão tiver portas explicitamente definidas (ex: ao clicar exatamente no pino 'top', 'bottom', 'left', 'right')
  if (conn.fromPort && ['left', 'right', 'top', 'bottom'].includes(conn.fromPort)) {
    startPort = getElementPort(src, conn.fromPort as 'left' | 'right' | 'top' | 'bottom');
  } else if (isFeedback) {
    // Linha de retorno: sai do lado esquerdo do bloco de feedback (ou topo/fundo)
    if (src.type === 'block' && src.dir === 'left') {
      startPort = getElementPort(src, 'left');
    } else {
      // Se saindo do ramo direto para o feedback
      startPort = (tgt.y || 0) < (src.y || 0) ? getElementPort(src, 'top') : getElementPort(src, 'bottom');
    }
  } else {
    // Caminho direto: esquerda para direita
    startPort = getElementPort(src, 'right');
  }

  if (conn.toPort && ['left', 'right', 'top', 'bottom'].includes(conn.toPort)) {
    endPort = getElementPort(tgt, conn.toPort as 'left' | 'right' | 'top' | 'bottom');
  } else if (isFeedback) {
    if (tgt.type === 'summer') {
      // Entra no somador por baixo ou por cima
      endPort = (src.y || 0) < (tgt.y || 0) ? getElementPort(tgt, 'top') : getElementPort(tgt, 'bottom');
    } else if (tgt.dir === 'left') {
      endPort = getElementPort(tgt, 'right');
    } else {
      endPort = getElementPort(tgt, 'left');
    }
  } else {
    // Se o destino for um somador e a fonte estiver significativamente acima ou abaixo, entra pelo topo ou fundo
    if (tgt.type === 'summer') {
      if ((src.y || 0) < (tgt.y || 0) - 25) {
        endPort = getElementPort(tgt, 'top');
      } else if ((src.y || 0) > (tgt.y || 0) + 25) {
        endPort = getElementPort(tgt, 'bottom');
      } else {
        endPort = getElementPort(tgt, 'left');
      }
    } else {
      endPort = getElementPort(tgt, 'left');
    }
  }

  const { x: x1, y: y1 } = startPort;
  const { x: x2, y: y2 } = endPort;

  let pathD = '';
  let signPos: Point = { x: x2 - 12, y: y2 - 10 };
  let midPoint: Point = { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };

  // Se o usuário já arrastou a linha manualmente, usa o ponto de ancoragem/waypoint personalizado
  if (conn.waypoint) {
    const wx = conn.waypoint.x;
    const wy = conn.waypoint.y;
    // Rota ortogonal passando pelo ponto personalizado (wx, wy)
    pathD = `M ${x1} ${y1} L ${wx} ${y1} L ${wx} ${wy} L ${wx} ${y2} L ${x2} ${y2}`;
    midPoint = { x: wx, y: wy };
    signPos = { x: x2 - 12, y: y2 - 10 };
    return { pathD, signPos, midPoint };
  }

  // Caso 1: Entrada vertical em porta 'top' ou 'bottom' (ex: somador)
  if (endPort.side === 'top' || endPort.side === 'bottom') {
    // A linha corre horizontalmente até a vertical do somador e desce/sobe direto no pino superior/inferior
    pathD = `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
    signPos = {
      x: x2 + (x1 < x2 ? -14 : 14),
      y: endPort.side === 'top' ? y2 - 12 : y2 + 16
    };
    midPoint = { x: Math.round((x1 + x2) / 2), y: y1 };
  }
  // Caso 2: Linha reta horizontal quase alinhada
  else if (Math.abs(y1 - y2) < 4 && x2 > x1) {
    pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
    signPos = { x: x2 - 12, y: y2 - 10 };
    midPoint = { x: Math.round((x1 + x2) / 2), y: y1 };
  }
  // Caso 3: Caminho direto com desnível (degrau ortogonal)
  else if (x2 > x1 && !isFeedback) {
    const midX = Math.round((x1 + x2) / 2);
    pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    signPos = { x: x2 - 12, y: y2 - 10 };
    midPoint = { x: midX, y: Math.round((y1 + y2) / 2) };
  }
  // Caso 4: Linha de Realimentação (retorno da direita para a esquerda)
  else {
    if (tgt.type === 'summer') {
      // Sai da esquerda do bloco de realimentação, vai até a coluna vertical do somador e sobe/desce
      pathD = `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
      signPos = {
        x: x2 + (src.x && src.x < x2 ? -14 : 14),
        y: y2 + (y1 > y2 ? 16 : -14)
      };
      midPoint = { x: Math.round((x1 + x2) / 2), y: y1 };
    } else if (src.type === 'block' && src.dir === 'right' && tgt.dir === 'left') {
      // Descida da saída direta para o bloco de realimentação
      const dropX = Math.max(x1, (tgt.x || 0) + 70);
      pathD = `M ${x1} ${y1} L ${dropX} ${y1} L ${dropX} ${y2} L ${x2} ${y2}`;
      signPos = { x: x2 - 10, y: y2 - 10 };
      midPoint = { x: dropX, y: Math.round((y1 + y2) / 2) };
    } else {
      // Contorno padrão com canaleta
      const channelY = Math.max(y1, y2) + 40 + (connIndex * 15);
      pathD = `M ${x1} ${y1} L ${x1} ${channelY} L ${x2} ${channelY} L ${x2} ${y2}`;
      signPos = { x: x2 - 12, y: y2 + 16 };
      midPoint = { x: Math.round((x1 + x2) / 2), y: channelY };
    }
  }

  return { pathD, signPos, midPoint };
}

/**
 * Algoritmo Inteligente de Auto-Layout para Diagramas de Controle
 * Espaça os blocos horizontalmente com generosidade e distribui
 * laços de realimentação em camadas verticais desobstruídas.
 */
export function autoLayoutDiagram(graph: DiagramGraph): DiagramGraph {
  const elements = graph.elements.map(e => ({ ...e }));
  const connections = graph.connections.map(c => ({ ...c }));

  const inputs = elements.filter(e => e.type === 'input');
  const outputs = elements.filter(e => e.type === 'output');
  const summers = elements.filter(e => e.type === 'summer');
  const forwardBlocks = elements.filter(e => e.type === 'block' && e.dir !== 'left');
  const feedbackBlocks = elements.filter(e => e.type === 'block' && e.dir === 'left');

  // Identifica a sequência direta (Main Trunk) através do fluxo de conexões
  const trunkElements: DiagramElement[] = [];

  // Começa pelo input (ou cria um padrão)
  const startEl = inputs[0] || elements[0];
  if (startEl) trunkElements.push(startEl);

  const visited = new Set<string>(trunkElements.map(e => e.id));

  // Percorre as conexões de avanço para ordenar o ramo direto
  let current = startEl;
  while (current) {
    const nextConns = connections.filter(c => c.from === current.id);
    let nextEl: DiagramElement | undefined;

    // Prioriza somadores e blocos diretos
    for (const c of nextConns) {
      const candidate = elements.find(e => e.id === c.to);
      if (candidate && !visited.has(candidate.id) && candidate.dir !== 'left') {
        nextEl = candidate;
        break;
      }
    }

    if (nextEl) {
      trunkElements.push(nextEl);
      visited.add(nextEl.id);
      current = nextEl;
    } else {
      break;
    }
  }

  // Adiciona quaisquer somadores ou blocos de avanço restantes que não foram visitados
  summers.forEach(s => {
    if (!visited.has(s.id)) {
      trunkElements.push(s);
      visited.add(s.id);
    }
  });

  forwardBlocks.forEach(b => {
    if (!visited.has(b.id)) {
      trunkElements.push(b);
      visited.add(b.id);
    }
  });

  outputs.forEach(out => {
    if (!visited.has(out.id)) {
      trunkElements.push(out);
      visited.add(out.id);
    }
  });

  // Posicionamento Horizontal do Ramo Direto com Amplo Espaçamento
  const BASE_Y = 180;
  let currentX = 80;

  trunkElements.forEach(el => {
    el.y = BASE_Y;
    el.x = currentX;

    if (el.type === 'input') {
      currentX += 130;
    } else if (el.type === 'summer') {
      currentX += 120;
    } else if (el.type === 'block') {
      currentX += 170; // Amplo espaçamento de 170px para blocos de 110px de largura!
    } else if (el.type === 'output') {
      currentX += 100;
    } else {
      currentX += 140;
    }
  });

  // Posicionamento dos Blocos de Realimentação (H1, H2, H3...)
  // Agrupa e distribui em camadas verticais (Tiers)
  feedbackBlocks.forEach((fb, idx) => {
    // Descobre para qual somador ele envia sinal
    const outConn = connections.find(c => c.from === fb.id);
    const inConn = connections.find(c => c.to === fb.id);

    const targetSummer = outConn ? elements.find(e => e.id === outConn.to) : null;
    const sourceBlock = inConn ? elements.find(e => e.id === inConn.from) : null;

    let targetX = 500;
    if (targetSummer && sourceBlock) {
      targetX = Math.round(((targetSummer.x || 300) + (sourceBlock.x || 600)) / 2);
    } else if (targetSummer) {
      targetX = (targetSummer.x || 300) + 160;
    } else if (sourceBlock) {
      targetX = (sourceBlock.x || 600) - 160;
    } else {
      targetX = 300 + idx * 180;
    }

    fb.x = targetX;
    fb.dir = 'left';

    // Se o nome ou posição sugerir laço superior (feedforward) ou se for o 1º de múltiplos
    if (idx === 0 && feedbackBlocks.length > 2) {
      // Coloca um laço superior para equilibrar o diagrama visualmente
      fb.y = 80;
    } else {
      // Camadas inferiores escalonadas: Tier 1 = 290, Tier 2 = 380, Tier 3 = 470
      const tierIndex = (feedbackBlocks.length > 2 && idx === 0) ? 0 : (idx % 3);
      fb.y = 290 + tierIndex * 85;
    }
  });

  return {
    elements,
    connections
  };
}
