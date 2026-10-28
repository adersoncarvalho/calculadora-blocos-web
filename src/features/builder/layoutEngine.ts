import { DiagramGraph, DiagramElement, DiagramConnection } from '@/core/reduction/mason';

export const GRID_SIZE = 20;
export const SNAP_STEP = 10;

export type CompassDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type LegacyPortSide = 'left' | 'right' | 'top' | 'bottom';
export type PortSide = CompassDirection | LegacyPortSide;

export interface Point {
  x: number;
  y: number;
}

export interface PortPosition {
  x: number;
  y: number;
  side: CompassDirection;
  label: string;
  dx: number;
  dy: number;
}

export interface BoundingBox {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const COMPASS_PORTS_META: { side: CompassDirection; label: string; dx: number; dy: number }[] = [
  { side: 'N', label: 'Norte (N)', dx: 0, dy: -1 },
  { side: 'NE', label: 'Nordeste (NE)', dx: 1, dy: -1 },
  { side: 'E', label: 'Leste (L)', dx: 1, dy: 0 },
  { side: 'SE', label: 'Sudeste (SE)', dx: 1, dy: 1 },
  { side: 'S', label: 'Sul (S)', dx: 0, dy: 1 },
  { side: 'SW', label: 'Sudoeste (SO)', dx: -1, dy: 1 },
  { side: 'W', label: 'Oeste (O)', dx: -1, dy: 0 },
  { side: 'NW', label: 'Noroeste (NO)', dx: -1, dy: -1 }
];

export function snapToGrid(val: number, step: number = SNAP_STEP): number {
  return Math.round(val / step) * step;
}

export function snapPointToGrid(pt: Point, step: number = SNAP_STEP): Point {
  return {
    x: snapToGrid(pt.x, step),
    y: snapToGrid(pt.y, step)
  };
}

export function normalizePortSide(side?: string): CompassDirection {
  switch (side) {
    case 'N':
    case 'top':
      return 'N';
    case 'NE':
      return 'NE';
    case 'E':
    case 'right':
      return 'E';
    case 'SE':
      return 'SE';
    case 'S':
    case 'bottom':
      return 'S';
    case 'SW':
      return 'SW';
    case 'W':
    case 'left':
      return 'W';
    case 'NW':
      return 'NW';
    default:
      return 'E';
  }
}

/**
 * Retorna a caixa delimitadora (bounding box) lógica de qualquer elemento do diagrama
 */
export function getElementBoundingBox(el: DiagramElement, padding: number = 0): BoundingBox {
  const x = el.x ?? 100;
  const y = el.y ?? 100;

  if (el.type === 'summer') {
    const r = 22;
    return {
      id: el.id,
      left: x - r - padding,
      top: y - r - padding,
      right: x + r + padding,
      bottom: y + r + padding
    };
  }

  if (el.type === 'input' || el.type === 'output') {
    const hw = 36;
    const hh = 20;
    return {
      id: el.id,
      left: x - hw - padding,
      top: y - hh - padding,
      right: x + hw + padding,
      bottom: y + hh + padding
    };
  }

  // Bloco G(s) ou H(s)
  const hw = 56;
  const hh = 28;
  return {
    id: el.id,
    left: x - hw - padding,
    top: y - hh - padding,
    right: x + hw + padding,
    bottom: y + hh + padding
  };
}

/**
 * Retorna os 8 pontos de conexão (Rosa dos Ventos: N, NE, E, SE, S, SW, W, NW) ao redor de um elemento
 */
export function getElementEightPorts(el: DiagramElement): PortPosition[] {
  const x = el.x ?? 100;
  const y = el.y ?? 100;

  if (el.type === 'summer') {
    const r = 22;
    const d = Math.round(r * Math.SQRT1_2); // ~16px
    return [
      { side: 'N', label: 'Norte (N)', x, y: y - r, dx: 0, dy: -1 },
      { side: 'NE', label: 'Nordeste (NE)', x: x + d, y: y - d, dx: 1, dy: -1 },
      { side: 'E', label: 'Leste (L)', x: x + r, y, dx: 1, dy: 0 },
      { side: 'SE', label: 'Sudeste (SE)', x: x + d, y: y + d, dx: 1, dy: 1 },
      { side: 'S', label: 'Sul (S)', x, y: y + r, dx: 0, dy: 1 },
      { side: 'SW', label: 'Sudoeste (SO)', x: x - d, y: y + d, dx: -1, dy: 1 },
      { side: 'W', label: 'Oeste (O)', x: x - r, y, dx: -1, dy: 0 },
      { side: 'NW', label: 'Noroeste (NO)', x: x - d, y: y - d, dx: -1, dy: -1 }
    ];
  }

  if (el.type === 'input' || el.type === 'output') {
    const hw = 36;
    const hh = 20;
    return [
      { side: 'N', label: 'Norte (N)', x, y: y - hh, dx: 0, dy: -1 },
      { side: 'NE', label: 'Nordeste (NE)', x: x + hw - 4, y: y - hh + 2, dx: 1, dy: -1 },
      { side: 'E', label: 'Leste (L)', x: x + hw, y, dx: 1, dy: 0 },
      { side: 'SE', label: 'Sudeste (SE)', x: x + hw - 4, y: y + hh - 2, dx: 1, dy: 1 },
      { side: 'S', label: 'Sul (S)', x, y: y + hh, dx: 0, dy: 1 },
      { side: 'SW', label: 'Sudoeste (SO)', x: x - hw + 4, y: y + hh - 2, dx: -1, dy: 1 },
      { side: 'W', label: 'Oeste (O)', x: x - hw, y, dx: -1, dy: 0 },
      { side: 'NW', label: 'Noroeste (NO)', x: x - hw + 4, y: y - hh + 2, dx: -1, dy: -1 }
    ];
  }

  // Bloco retangular G(s) ou H(s): largura 112 (hw=56), altura 56 (hh=28)
  const hw = 56;
  const hh = 28;
  return [
    { side: 'N', label: 'Norte (N)', x, y: y - hh, dx: 0, dy: -1 },
    { side: 'NE', label: 'Nordeste (NE)', x: x + hw, y: y - hh, dx: 1, dy: -1 },
    { side: 'E', label: 'Leste (L)', x: x + hw, y, dx: 1, dy: 0 },
    { side: 'SE', label: 'Sudeste (SE)', x: x + hw, y: y + hh, dx: 1, dy: 1 },
    { side: 'S', label: 'Sul (S)', x, y: y + hh, dx: 0, dy: 1 },
    { side: 'SW', label: 'Sudoeste (SO)', x: x - hw, y: y + hh, dx: -1, dy: 1 },
    { side: 'W', label: 'Oeste (O)', x: x - hw, y, dx: -1, dy: 0 },
    { side: 'NW', label: 'Noroeste (NO)', x: x - hw, y: y - hh, dx: -1, dy: -1 }
  ];
}

/**
 * Retorna as coordenadas de uma porta específica de um elemento (compatível com 8 direções e nomes legados)
 */
export function getElementPort(el: DiagramElement, side: PortSide): PortPosition {
  const normalized = normalizePortSide(side);
  const ports = getElementEightPorts(el);
  return ports.find(p => p.side === normalized) || ports[2]; // default 'E'
}

/**
 * Verifica se um segmento ortogonal (p1 -> p2) cruza o interior de alguma caixa de obstáculo
 */
function segmentIntersectsBox(p1: Point, p2: Point, box: BoundingBox): boolean {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  // Segmento horizontal
  if (Math.abs(p1.y - p2.y) < 1) {
    const y = p1.y;
    if (y > box.top && y < box.bottom) {
      if (maxX > box.left && minX < box.right) {
        return true;
      }
    }
    return false;
  }

  // Segmento vertical
  if (Math.abs(p1.x - p2.x) < 1) {
    const x = p1.x;
    if (x > box.left && x < box.right) {
      if (maxY > box.top && minY < box.bottom) {
        return true;
      }
    }
    return false;
  }

  return false;
}

function pathIntersectsAnyBox(points: Point[], boxes: BoundingBox[]): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    for (const box of boxes) {
      if (segmentIntersectsBox(points[i], points[i + 1], box)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Remove pontos colineares redundantes mantendo apenas vértices reais (cantos de 90°)
 */
export function simplifyOrthogonalPoints(pts: Point[]): Point[] {
  if (pts.length <= 2) return pts;
  const dedup: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = dedup[dedup.length - 1];
    if (Math.abs(pts[i].x - prev.x) > 0.5 || Math.abs(pts[i].y - prev.y) > 0.5) {
      dedup.push(pts[i]);
    }
  }
  if (dedup.length <= 2) return dedup;

  const result: Point[] = [dedup[0]];
  for (let i = 1; i < dedup.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = dedup[i];
    const next = dedup[i + 1];
    const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    if (!sameX && !sameY) {
      result.push(curr);
    }
  }
  result.push(dedup[dedup.length - 1]);
  return result;
}

/**
 * Calcula um ponto de escape externo na grade logo fora da porta para evitar atravessar o próprio bloco
 */
function getPortStubPoint(port: PortPosition, el: DiagramElement, targetHint?: Point): Point {
  const clearance = 20;
  if (port.side === 'N') return { x: port.x, y: snapToGrid(port.y - clearance) };
  if (port.side === 'S') return { x: port.x, y: snapToGrid(port.y + clearance) };
  if (port.side === 'E') return { x: snapToGrid(port.x + clearance), y: port.y };
  if (port.side === 'W') return { x: snapToGrid(port.x - clearance), y: port.y };

  // Portas diagonais da rosa dos ventos (NE, SE, SW, NW): sai na direção dominante sem entrar no bloco
  if (targetHint) {
    const absDx = Math.abs(targetHint.x - port.x);
    const absDy = Math.abs(targetHint.y - port.y);
    if (absDy > absDx) {
      return { x: port.x, y: snapToGrid(port.y + port.dy * clearance) };
    }
  }
  return { x: snapToGrid(port.x + port.dx * clearance), y: port.y };
}

/**
 * Roteador Ortogonal Inteligente em Grade com Desvio de Obstáculos (Não atravessa o interior de blocos)
 */
export function computeOrthogonalGridSegment(
  pStart: Point,
  pEnd: Point,
  boxes: BoundingBox[],
  preferVerticalEnd: boolean = false
): Point[] {
  // 1. Linha reta direta se alinhado
  if (Math.abs(pStart.x - pEnd.x) < 2) {
    const direct = [pStart, { x: pStart.x, y: pEnd.y }];
    if (!pathIntersectsAnyBox(direct, boxes)) return direct;
  }
  if (Math.abs(pStart.y - pEnd.y) < 2) {
    const direct = [pStart, { x: pEnd.x, y: pStart.y }];
    if (!pathIntersectsAnyBox(direct, boxes)) return direct;
  }

  // 2. Tentativa em L (1 dobra)
  const lHorizFirst: Point[] = [pStart, { x: pEnd.x, y: pStart.y }, pEnd];
  const lVertFirst: Point[] = [pStart, { x: pStart.x, y: pEnd.y }, pEnd];

  if (preferVerticalEnd) {
    if (!pathIntersectsAnyBox(lHorizFirst, boxes)) return lHorizFirst;
    if (!pathIntersectsAnyBox(lVertFirst, boxes)) return lVertFirst;
  } else {
    if (!pathIntersectsAnyBox(lVertFirst, boxes) && pEnd.x > pStart.x) return lVertFirst;
    if (!pathIntersectsAnyBox(lHorizFirst, boxes)) return lHorizFirst;
    if (!pathIntersectsAnyBox(lVertFirst, boxes)) return lVertFirst;
  }

  // 3. Tentativa em Z (degrau ortogonal pelo meio na grade)
  const midX = snapToGrid((pStart.x + pEnd.x) / 2);
  const zMidX: Point[] = [
    pStart,
    { x: midX, y: pStart.y },
    { x: midX, y: pEnd.y },
    pEnd
  ];
  if (!pathIntersectsAnyBox(zMidX, boxes)) return zMidX;

  const midY = snapToGrid((pStart.y + pEnd.y) / 2);
  const zMidY: Point[] = [
    pStart,
    { x: pStart.x, y: midY },
    { x: pEnd.x, y: midY },
    pEnd
  ];
  if (!pathIntersectsAnyBox(zMidY, boxes)) return zMidY;

  // 4. Desvio por canais livres na grade (acima ou abaixo dos obstáculos que estão no caminho)
  const candidateChannelsY: number[] = [];
  const baseMinY = Math.min(pStart.y, pEnd.y);
  const baseMaxY = Math.max(pStart.y, pEnd.y);

  boxes.forEach(b => {
    candidateChannelsY.push(snapToGrid(b.top - 20));
    candidateChannelsY.push(snapToGrid(b.bottom + 20));
    candidateChannelsY.push(snapToGrid(b.top - 40));
    candidateChannelsY.push(snapToGrid(b.bottom + 40));
  });
  candidateChannelsY.push(snapToGrid(baseMinY - 60));
  candidateChannelsY.push(snapToGrid(baseMaxY + 60));
  candidateChannelsY.push(snapToGrid(baseMinY - 100));
  candidateChannelsY.push(snapToGrid(baseMaxY + 100));

  // Ordena canais pelo menor deslocamento total
  candidateChannelsY.sort(
    (a, b) =>
      Math.abs(a - pStart.y) + Math.abs(a - pEnd.y) - (Math.abs(b - pStart.y) + Math.abs(b - pEnd.y))
  );

  for (const cy of candidateChannelsY) {
    const uPath: Point[] = [
      pStart,
      { x: pStart.x, y: cy },
      { x: pEnd.x, y: cy },
      pEnd
    ];
    if (!pathIntersectsAnyBox(uPath, boxes)) {
      return uPath;
    }
  }

  // 5. Desvio por canais verticais X
  const candidateChannelsX: number[] = [];
  boxes.forEach(b => {
    candidateChannelsX.push(snapToGrid(b.left - 20));
    candidateChannelsX.push(snapToGrid(b.right + 20));
  });
  for (const cx of candidateChannelsX) {
    const hPath: Point[] = [
      pStart,
      { x: cx, y: pStart.y },
      { x: cx, y: pEnd.y },
      pEnd
    ];
    if (!pathIntersectsAnyBox(hPath, boxes)) {
      return hPath;
    }
  }

  return preferVerticalEnd ? lHorizFirst : zMidX;
}

/**
 * Calcula rota ortogonal completa para pré-visualização do Lápis ou conexões pendentes
 */
export function computePencilPreviewPath(
  src: DiagramElement,
  fromPort: PortSide | undefined,
  waypoints: Point[],
  cursorPt: Point,
  allElements: DiagramElement[],
  targetEl?: DiagramElement,
  toPort?: PortSide
): { pathD: string; points: Point[]; anchors: Point[]; snappedCursor: Point } {
  const startPort = getElementPort(src, fromPort || 'E');
  const startPt: Point = { x: startPort.x, y: startPort.y };
  const snappedCursor = snapPointToGrid(cursorPt, SNAP_STEP);

  const obstacles = allElements.map(el => getElementBoundingBox(el, 8));

  const chain: Point[] = [startPt];
  const firstTarget = waypoints.length > 0 ? waypoints[0] : snappedCursor;
  const startStub = getPortStubPoint(startPort, src, firstTarget);

  if (waypoints.length === 0) {
    if (targetEl && toPort) {
      const endPort = getElementPort(targetEl, toPort);
      const endStub = getPortStubPoint(endPort, targetEl, startStub);
      const preferVert = endPort.side === 'N' || endPort.side === 'S';
      const midPts = computeOrthogonalGridSegment(startStub, endStub, obstacles, preferVert);
      chain.push(...midPts, { x: endPort.x, y: endPort.y });
    } else {
      const midPts = computeOrthogonalGridSegment(startStub, snappedCursor, obstacles, false);
      chain.push(...midPts);
    }
  } else {
    // Passa por cada waypoint já fixado pelo usuário
    let curr = startStub;
    chain.push(startStub);
    for (let i = 0; i < waypoints.length; i++) {
      const wp = snapPointToGrid(waypoints[i], SNAP_STEP);
      const seg = computeOrthogonalGridSegment(curr, wp, obstacles, false);
      chain.push(...seg.slice(1));
      curr = wp;
    }
    if (targetEl && toPort) {
      const endPort = getElementPort(targetEl, toPort);
      const endStub = getPortStubPoint(endPort, targetEl, curr);
      const preferVert = endPort.side === 'N' || endPort.side === 'S';
      const tailSeg = computeOrthogonalGridSegment(curr, endStub, obstacles, preferVert);
      chain.push(...tailSeg.slice(1), { x: endPort.x, y: endPort.y });
    } else {
      const tailSeg = computeOrthogonalGridSegment(curr, snappedCursor, obstacles, false);
      chain.push(...tailSeg.slice(1));
    }
  }

  const cleanPoints = simplifyOrthogonalPoints(chain);
  const pathD = cleanPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const anchors = cleanPoints.slice(1, cleanPoints.length - 1);

  return {
    pathD,
    points: cleanPoints,
    anchors,
    snappedCursor
  };
}

/**
 * Calcula a posição ideal do sinal (+ / -) próxima à porta de entrada do somador
 */
function computeSignPosition(endPort: PortPosition, prevPt: Point): Point {
  const { x, y, side } = endPort;
  switch (side) {
    case 'N':
      return { x: x - 14, y: y - 10 };
    case 'NE':
      return { x: x + 14, y: y - 10 };
    case 'E':
      return { x: x + 14, y: y - 10 };
    case 'SE':
      return { x: x + 14, y: y + 18 };
    case 'S':
      return { x: x - 14, y: y + 16 };
    case 'SW':
      return { x: x - 14, y: y + 18 };
    case 'W':
      return { x: x - 12, y: y - 10 };
    case 'NW':
      return { x: x - 14, y: y - 10 };
    default:
      return { x: x - 12, y: y - 10 };
  }
}

/**
 * Calcula rota ortogonal limpa (Manhattan) entre dois elementos sem atravessar blocos.
 * Suporta todas as 8 portas da rosa dos ventos, conexões pendentes (interrompidas) e pontos de ancoragem.
 */
export function computeSmartConnectionPath(
  src: DiagramElement,
  tgt: DiagramElement | undefined | null,
  conn: DiagramConnection,
  connIndex: number = 0,
  totalConns: number = 1,
  allElements: DiagramElement[] = []
): {
  pathD: string;
  signPos: Point;
  midPoint: Point;
  points: Point[];
  anchors: Point[];
  endPoint: Point;
} {
  const waypoints: Point[] = Array.isArray(conn.waypoints)
    ? conn.waypoints
    : conn.waypoint
    ? [conn.waypoint]
    : [];

  // Caso especial: conexão temporariamente interrompida (pendente) sem bloco de destino ainda
  if (!tgt || conn.isPending) {
    const lastPt = waypoints.length > 0 ? waypoints[waypoints.length - 1] : { x: (src.x || 100) + 100, y: src.y || 100 };
    const priorWps = waypoints.length > 1 ? waypoints.slice(0, -1) : [];
    const preview = computePencilPreviewPath(src, conn.fromPort as PortSide, priorWps, lastPt, allElements);
    const pts = preview.points;
    const endPoint = pts[pts.length - 1] || lastPt;
    const midIdx = Math.floor(pts.length / 2);
    const midPoint = pts[midIdx] || endPoint;
    return {
      pathD: preview.pathD,
      signPos: { x: endPoint.x - 12, y: endPoint.y - 10 },
      midPoint,
      points: pts,
      anchors: preview.anchors,
      endPoint
    };
  }

  const isFeedback = src.dir === 'left' || (src.x || 0) > (tgt.x || 0);

  // Determinação inteligente da porta de origem (entre as 8 direções)
  let startPort: PortPosition;
  if (conn.fromPort) {
    startPort = getElementPort(src, conn.fromPort as PortSide);
  } else if (src.subType === 'disturbance') {
    startPort = (tgt.y || 0) >= (src.y || 0) ? getElementPort(src, 'S') : getElementPort(src, 'N');
  } else if (isFeedback) {
    if (src.type === 'block' && src.dir === 'left') {
      startPort = getElementPort(src, 'W');
    } else {
      startPort = (tgt.y || 0) < (src.y || 0) ? getElementPort(src, 'N') : getElementPort(src, 'S');
    }
  } else {
    startPort = getElementPort(src, 'E');
  }

  // Determinação inteligente da porta de destino (entre as 8 direções)
  let endPort: PortPosition;
  if (conn.toPort) {
    endPort = getElementPort(tgt, conn.toPort as PortSide);
  } else if (src.subType === 'disturbance' && tgt.type === 'summer') {
    endPort = (src.y || 0) <= (tgt.y || 0) ? getElementPort(tgt, 'N') : getElementPort(tgt, 'S');
  } else if (isFeedback) {
    if (tgt.type === 'summer') {
      endPort = (src.y || 0) < (tgt.y || 0) ? getElementPort(tgt, 'N') : getElementPort(tgt, 'S');
    } else if (tgt.dir === 'left') {
      endPort = getElementPort(tgt, 'E');
    } else {
      endPort = getElementPort(tgt, 'W');
    }
  } else {
    if (tgt.type === 'summer') {
      if ((src.y || 0) < (tgt.y || 0) - 35) {
        endPort = getElementPort(tgt, 'N');
      } else if ((src.y || 0) > (tgt.y || 0) + 35) {
        endPort = getElementPort(tgt, 'S');
      } else {
        endPort = getElementPort(tgt, 'W');
      }
    } else {
      endPort = getElementPort(tgt, 'W');
    }
  }

  const p1: Point = { x: startPort.x, y: startPort.y };
  const p2: Point = { x: endPort.x, y: endPort.y };

  const obstacles = allElements
    .filter(el => el.id !== src.id && el.id !== tgt.id)
    .map(el => getElementBoundingBox(el, 10));

  let rawPoints: Point[] = [];

  // Se houver waypoints definidos pelo usuário (pelo Lápis ou arraste de ancoragem)
  if (waypoints.length > 0) {
    rawPoints.push(p1);
    let curr = p1;
    for (const wp of waypoints) {
      const snappedWp = snapPointToGrid(wp, SNAP_STEP);
      if (Math.abs(curr.x - snappedWp.x) > 1 && Math.abs(curr.y - snappedWp.y) > 1) {
        rawPoints.push({ x: snappedWp.x, y: curr.y });
      }
      rawPoints.push(snappedWp);
      curr = snappedWp;
    }
    if (Math.abs(curr.x - p2.x) > 1 && Math.abs(curr.y - p2.y) > 1) {
      if (endPort.side === 'N' || endPort.side === 'S') {
        rawPoints.push({ x: p2.x, y: curr.y });
      } else {
        rawPoints.push({ x: curr.x, y: p2.y });
      }
    }
    rawPoints.push(p2);
  } else {
    const preferVerticalEnd = endPort.side === 'N' || endPort.side === 'S';

    // Caso 1: Entrada vertical em porta Norte ou Sul (ex: perturbação W(s) ou realimentação chegando no somador)
    if (preferVerticalEnd && !isFeedback) {
      if (Math.abs(p1.x - p2.x) < 4) {
        rawPoints = [p1, p2];
      } else if (startPort.side === 'S' || startPort.side === 'N') {
        const midY = snapToGrid((p1.y + p2.y) / 2);
        rawPoints = [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
      } else {
        rawPoints = [p1, { x: p2.x, y: p1.y }, p2];
      }
    }
    // Caso 2: Linha reta horizontal quase alinhada
    else if (Math.abs(p1.y - p2.y) < 4 && p2.x > p1.x && !pathIntersectsAnyBox([p1, p2], obstacles)) {
      rawPoints = [p1, { x: p2.x, y: p1.y }, p2];
    }
    // Caso 3: Caminho direto com desnível ou desvio de obstáculo
    else if (p2.x > p1.x && !isFeedback) {
      rawPoints = computeOrthogonalGridSegment(p1, p2, obstacles, preferVerticalEnd);
    }
    // Caso 4: Realimentação (retorno da direita para a esquerda)
    else {
      if (tgt.type === 'summer' && (endPort.side === 'S' || endPort.side === 'N')) {
        if (startPort.side === 'W' && Math.abs(p1.y - p2.y) > 25) {
          rawPoints = [p1, { x: p2.x, y: p1.y }, p2];
        } else {
          // Retorno unitário direto (ex: saída de G(s) voltando por baixo ao Somador 1)
          const allBoxes = allElements.map(el => getElementBoundingBox(el, 10));
          const maxBottom = allBoxes.reduce((m, b) => Math.max(m, b.bottom), Math.max(p1.y, p2.y));
          const channelY = endPort.side === 'N'
            ? snapToGrid(Math.min(p1.y, p2.y) - 60 - connIndex * 20)
            : snapToGrid(Math.max(maxBottom + 40, Math.max(p1.y, p2.y) + 60 + connIndex * 20));
          const outX = startPort.side === 'E' ? snapToGrid(p1.x + 30) : p1.x;
          rawPoints = [
            p1,
            { x: outX, y: p1.y },
            { x: outX, y: channelY },
            { x: p2.x, y: channelY },
            p2
          ];
        }
      } else if (src.type === 'block' && src.dir !== 'left' && tgt.dir === 'left') {
        const dropX = snapToGrid(Math.max(p1.x + 20, (tgt.x || 0) + 80));
        rawPoints = [p1, { x: dropX, y: p1.y }, { x: dropX, y: p2.y }, p2];
      } else {
        const channelY = snapToGrid(Math.max(p1.y, p2.y) + 60 + connIndex * 20);
        const outX = startPort.side === 'E' ? snapToGrid(p1.x + 20) : p1.x;
        const inX = endPort.side === 'W' ? snapToGrid(p2.x - 20) : p2.x;
        rawPoints = [
          p1,
          { x: outX, y: p1.y },
          { x: outX, y: channelY },
          { x: inX, y: channelY },
          { x: inX, y: p2.y },
          p2
        ];
      }
    }
  }

  const points = simplifyOrthogonalPoints(rawPoints);
  const pathD = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  // Pontos de ancoragem (todos os cantos intermediários + ponto médio do maior segmento)
  const corners = points.slice(1, points.length - 1);
  let longestSegMid: Point = {
    x: Math.round((p1.x + p2.x) / 2),
    y: Math.round((p1.y + p2.y) / 2)
  };
  let maxLen = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (len > maxLen) {
      maxLen = len;
      longestSegMid = {
        x: Math.round((a.x + b.x) / 2),
        y: Math.round((a.y + b.y) / 2)
      };
    }
  }

  const midPoint = waypoints.length > 0 ? waypoints[waypoints.length - 1] : longestSegMid;
  const anchors = corners.length > 0 ? corners : [midPoint];
  const prevToEnd = points.length >= 2 ? points[points.length - 2] : p1;
  const signPos = computeSignPosition(endPort, prevToEnd);

  return {
    pathD,
    signPos,
    midPoint,
    points,
    anchors,
    endPoint: p2
  };
}

/**
 * Divide uma expressão racional em Numerador e Denominador para edição no painel lateral
 */
export function splitTransferFunction(expr: string = '1'): { num: string; den: string } {
  const trimmed = expr.trim();
  if (!trimmed) return { num: '1', den: '1' };

  // Procura a barra '/' de nível superior (fora de parênteses)
  let depth = 0;
  let slashIndex = -1;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === '/' && depth === 0) {
      slashIndex = i;
      break;
    }
  }

  if (slashIndex === -1) {
    return { num: trimmed, den: '1' };
  }

  const stripOuterParens = (s: string) => {
    const t = s.trim();
    if (t.startsWith('(') && t.endsWith(')')) {
      let d = 0;
      for (let i = 0; i < t.length - 1; i++) {
        if (t[i] === '(') d++;
        else if (t[i] === ')') d--;
        if (d === 0) return t;
      }
      return t.slice(1, -1).trim();
    }
    return t;
  };

  const rawNum = stripOuterParens(trimmed.slice(0, slashIndex));
  const rawDen = stripOuterParens(trimmed.slice(slashIndex + 1));

  return {
    num: rawNum || '1',
    den: rawDen || '1'
  };
}

/**
 * Combina Numerador e Denominador em uma string de função de transferência válida
 */
export function combineTransferFunction(num: string, den: string): string {
  const n = num.trim() || '1';
  const d = den.trim() || '1';
  if (d === '1' || d === '') return n;

  const needsParens = (s: string) => /[+\-]/.test(s) && !(s.startsWith('(') && s.endsWith(')'));
  const formattedNum = needsParens(n) ? `(${n})` : n;
  const formattedDen = needsParens(d) ? `(${d})` : d;
  return `${formattedNum}/${formattedDen}`;
}

/**
 * Algoritmo Inteligente de Auto-Layout para Diagramas de Controle
 * Espaça os blocos horizontalmente na grade e posiciona entradas de perturbação W(s) e malhas de retorno.
 */
export function autoLayoutDiagram(graph: DiagramGraph): DiagramGraph {
  const elements: DiagramElement[] = graph.elements.map(e => ({ ...e }));
  const connections: DiagramConnection[] = graph.connections.map(c => ({ ...c, waypoints: undefined, waypoint: undefined }));

  const primaryInputs = elements.filter(e => e.type === 'input' && e.subType !== 'disturbance');
  const disturbanceInputs = elements.filter(e => e.type === 'input' && e.subType === 'disturbance');
  const outputs = elements.filter(e => e.type === 'output');
  const summers = elements.filter(e => e.type === 'summer');
  const forwardBlocks = elements.filter(e => e.type === 'block' && e.dir !== 'left');
  const feedbackBlocks = elements.filter(e => e.type === 'block' && e.dir === 'left');

  const trunkElements: DiagramElement[] = [];
  const startEl = primaryInputs[0] || elements[0];
  if (startEl) trunkElements.push(startEl);

  const visited = new Set<string>(trunkElements.map(e => e.id));
  disturbanceInputs.forEach(d => visited.add(d.id));

  let current = startEl;
  while (current) {
    const nextConns = connections.filter(c => c.from === current.id && !c.isPending);
    let nextEl: DiagramElement | undefined;

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

  primaryInputs.forEach(inp => {
    if (!visited.has(inp.id)) {
      trunkElements.unshift(inp);
      visited.add(inp.id);
    }
  });

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

  const BASE_Y = 220;
  let currentX = 100;

  trunkElements.forEach(el => {
    el.y = BASE_Y;
    el.x = snapToGrid(currentX, GRID_SIZE);

    if (el.type === 'input') {
      currentX += 140;
    } else if (el.type === 'summer') {
      currentX += 140;
    } else if (el.type === 'block') {
      currentX += 180;
    } else if (el.type === 'output') {
      currentX += 120;
    } else {
      currentX += 140;
    }
  });

  // Posiciona Entradas de Perturbação W(s) diretamente acima do somador onde entram
  disturbanceInputs.forEach((dist, idx) => {
    const outConn = connections.find(c => c.from === dist.id);
    const targetEl = outConn ? elements.find(e => e.id === outConn.to) : null;
    if (targetEl) {
      dist.x = snapToGrid(targetEl.x || 360, GRID_SIZE);
      dist.y = snapToGrid((targetEl.y || BASE_Y) - 120, GRID_SIZE);
    } else {
      dist.x = snapToGrid(360 + idx * 160, GRID_SIZE);
      dist.y = snapToGrid(BASE_Y - 120, GRID_SIZE);
    }
  });

  // Posiciona Blocos de Realimentação H(s) em camadas inferiores limpas
  feedbackBlocks.forEach((fb, idx) => {
    const outConn = connections.find(c => c.from === fb.id);
    const inConn = connections.find(c => c.to === fb.id);

    const targetSummer = outConn ? elements.find(e => e.id === outConn.to) : null;
    const sourceBlock = inConn ? elements.find(e => e.id === inConn.from) : null;

    let targetX = 480;
    if (targetSummer && sourceBlock) {
      targetX = snapToGrid(((targetSummer.x || 300) + (sourceBlock.x || 600)) / 2, GRID_SIZE);
    } else if (targetSummer) {
      targetX = snapToGrid((targetSummer.x || 300) + 160, GRID_SIZE);
    } else if (sourceBlock) {
      targetX = snapToGrid((sourceBlock.x || 600) - 160, GRID_SIZE);
    } else {
      targetX = snapToGrid(320 + idx * 180, GRID_SIZE);
    }

    fb.x = targetX;
    fb.dir = 'left';

    const tierIndex = idx % 3;
    fb.y = snapToGrid(BASE_Y + 120 + tierIndex * 80, GRID_SIZE);
  });

  return {
    elements,
    connections
  };
}
