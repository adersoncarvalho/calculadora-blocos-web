import { DiagramGraph, DiagramElement, DiagramConnection } from '@/core/reduction/mason';

export const GRID_SIZE = 20;
export const SNAP_STEP = 20;

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

export interface DraggableSegment {
  index: number;
  p1: Point;
  p2: Point;
  orientation: 'horizontal' | 'vertical';
  midX: number;
  midY: number;
  length: number;
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

export function snapToGrid(val: number, step: number = GRID_SIZE): number {
  const res = Math.round(val / step) * step;
  return Object.is(res, -0) ? 0 : res;
}

export function snapPointToGrid(pt: Point, step: number = GRID_SIZE): Point {
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
    const r = 20;
    return {
      id: el.id,
      left: x - r - padding,
      top: y - r - padding,
      right: x + r + padding,
      bottom: y + r + padding
    };
  }

  if (el.type === 'input' || el.type === 'output') {
    const hw = 40;
    const hh = 20;
    return {
      id: el.id,
      left: x - hw - padding,
      top: y - hh - padding,
      right: x + hw + padding,
      bottom: y + hh + padding
    };
  }

  // Bloco G(s) ou H(s): largura 120 (hw=60), altura 60 (hh=30) alinhado à grade de 20px
  const hw = 60;
  const hh = 30;
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
    const r = 20;
    const d = Math.round(r * Math.SQRT1_2);
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
    const hw = 40;
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

  // Bloco retangular G(s) ou H(s): largura 120 (hw=60), altura 60 (hh=30)
  const hw = 60;
  const hh = 30;
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
export function segmentIntersectsBox(p1: Point, p2: Point, box: BoundingBox): boolean {
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

export function pathIntersectsAnyBox(points: Point[], boxes: BoundingBox[]): boolean {
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
 * Extrai a lista de segmentos horizontais e verticais arrastáveis de uma polilinha ortogonal
 */
export function getDraggableSegments(points: Point[]): DraggableSegment[] {
  const segments: DraggableSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    const orientation: 'horizontal' | 'vertical' = dx >= dy ? 'horizontal' : 'vertical';
    const length = dx + dy;
    segments.push({
      index: i,
      p1,
      p2,
      orientation,
      midX: Math.round((p1.x + p2.x) / 2),
      midY: Math.round((p1.y + p2.y) / 2),
      length
    });
  }
  return segments;
}

/**
 * Move manualmente um segmento horizontal (verticalmente) ou vertical (horizontalmente)
 * alinhado à grade de 20px, mantendo continuidade dos segmentos adjacentes,
 * preservando os pontos de conexão nos blocos e evitando atravessar obstáculos.
 */
export function moveConnectionSegment(
  currentPoints: Point[],
  segmentIndex: number,
  targetCoord: number,
  allElements: DiagramElement[] = [],
  srcId?: string,
  tgtId?: string
): Point[] {
  if (currentPoints.length < 2 || segmentIndex < 0 || segmentIndex >= currentPoints.length - 1) {
    return currentPoints;
  }

  const snappedCoord = snapToGrid(targetCoord, GRID_SIZE);
  const pts = currentPoints.map(p => ({ ...p }));
  const n = pts.length;
  const pA = pts[segmentIndex];
  const pB = pts[segmentIndex + 1];
  const isHorizontal = Math.abs(pA.y - pB.y) <= Math.abs(pA.x - pB.x);

  const startOrigin = { ...pts[0] };
  const endDest = { ...pts[n - 1] };

  let candidate: Point[] = [];

  if (isHorizontal) {
    const newY = snappedCoord;
    if (segmentIndex === 0 && n === 2) {
      // Segmento único ligando origem e destino: cria canal intermediário preservando as portas nas pontas
      const stubStart = snapToGrid(startOrigin.x + (endDest.x >= startOrigin.x ? GRID_SIZE : -GRID_SIZE), GRID_SIZE);
      const stubEnd = snapToGrid(endDest.x + (endDest.x >= startOrigin.x ? -GRID_SIZE : GRID_SIZE), GRID_SIZE);
      candidate = [
        startOrigin,
        { x: stubStart, y: startOrigin.y },
        { x: stubStart, y: newY },
        { x: stubEnd, y: newY },
        { x: stubEnd, y: endDest.y },
        endDest
      ];
    } else if (segmentIndex === 0) {
      // Primeiro segmento horizontal: preserva pts[0] na porta e desloca o trecho a partir de um stub ou da própria porta
      const stubX = snapToGrid(startOrigin.x + (pB.x >= startOrigin.x ? GRID_SIZE : -GRID_SIZE), GRID_SIZE);
      pts[1].y = newY;
      candidate = [
        startOrigin,
        { x: stubX, y: startOrigin.y },
        { x: stubX, y: newY },
        ...pts.slice(1)
      ];
    } else if (segmentIndex === n - 2) {
      // Último segmento horizontal: preserva pts[n-1] na porta
      const stubX = snapToGrid(endDest.x + (endDest.x >= pA.x ? -GRID_SIZE : GRID_SIZE), GRID_SIZE);
      pts[n - 2].y = newY;
      candidate = [
        ...pts.slice(0, n - 1),
        { x: stubX, y: newY },
        { x: stubX, y: endDest.y },
        endDest
      ];
    } else {
      // Segmento interno: move Y de ambos os extremos mantendo os segmentos verticais adjacentes contínuos
      pts[segmentIndex].y = newY;
      pts[segmentIndex + 1].y = newY;
      candidate = pts;
    }
  } else {
    // Segmento vertical movido horizontalmente (em X)
    const newX = snappedCoord;
    if (segmentIndex === 0 && n === 2) {
      const stubStart = snapToGrid(startOrigin.y + (endDest.y >= startOrigin.y ? GRID_SIZE : -GRID_SIZE), GRID_SIZE);
      const stubEnd = snapToGrid(endDest.y + (endDest.y >= startOrigin.y ? -GRID_SIZE : GRID_SIZE), GRID_SIZE);
      candidate = [
        startOrigin,
        { x: startOrigin.x, y: stubStart },
        { x: newX, y: stubStart },
        { x: newX, y: stubEnd },
        { x: endDest.x, y: stubEnd },
        endDest
      ];
    } else if (segmentIndex === 0) {
      const stubY = snapToGrid(startOrigin.y + (pB.y >= startOrigin.y ? GRID_SIZE : -GRID_SIZE), GRID_SIZE);
      pts[1].x = newX;
      candidate = [
        startOrigin,
        { x: startOrigin.x, y: stubY },
        { x: newX, y: stubY },
        ...pts.slice(1)
      ];
    } else if (segmentIndex === n - 2) {
      const stubY = snapToGrid(endDest.y + (endDest.y >= pA.y ? -GRID_SIZE : GRID_SIZE), GRID_SIZE);
      pts[n - 2].x = newX;
      candidate = [
        ...pts.slice(0, n - 1),
        { x: newX, y: stubY },
        { x: endDest.x, y: stubY },
        endDest
      ];
    } else {
      pts[segmentIndex].x = newX;
      pts[segmentIndex + 1].x = newX;
      candidate = pts;
    }
  }

  const simplified = simplifyOrthogonalPoints(candidate);
  return simplified;
}

/**
 * Move manualmente um vértice de curva/canto (ponto de passagem interno) na grade de 20px,
 * ajustando os segmentos ortogonais adjacentes e preservando os pontos de conexão nos blocos.
 */
export function moveConnectionCorner(
  currentPoints: Point[],
  cornerIndex: number,
  targetPt: Point
): Point[] {
  if (currentPoints.length < 3 || cornerIndex <= 0 || cornerIndex >= currentPoints.length - 1) {
    return currentPoints;
  }

  const snapped = snapPointToGrid(targetPt, GRID_SIZE);
  const pts = currentPoints.map(p => ({ ...p }));
  const prev = pts[cornerIndex - 1];
  const curr = pts[cornerIndex];
  const next = pts[cornerIndex + 1];

  const prevIsHoriz = Math.abs(prev.y - curr.y) <= Math.abs(prev.x - curr.x);
  const nextIsHoriz = Math.abs(curr.y - next.y) <= Math.abs(curr.x - next.x);

  pts[cornerIndex] = { x: snapped.x, y: snapped.y };

  // Ajusta o vértice anterior se não for a porta fixa de origem (índice 0)
  if (cornerIndex - 1 > 0) {
    if (prevIsHoriz) {
      pts[cornerIndex - 1].y = snapped.y;
    } else {
      pts[cornerIndex - 1].x = snapped.x;
    }
  }

  // Ajusta o vértice seguinte se não for a porta fixa de destino (índice n - 1)
  if (cornerIndex + 1 < pts.length - 1) {
    if (nextIsHoriz) {
      pts[cornerIndex + 1].y = snapped.y;
    } else {
      pts[cornerIndex + 1].x = snapped.x;
    }
  }

  // Reconecta ortogonalmente caso o vértice seja adjacente à porta de origem ou destino
  const result: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = result[result.length - 1];
    const b = pts[i];
    if (Math.abs(a.x - b.x) > 1 && Math.abs(a.y - b.y) > 1) {
      if (i === 1) {
        if (prevIsHoriz) result.push({ x: b.x, y: a.y });
        else result.push({ x: a.x, y: b.y });
      } else {
        if (nextIsHoriz) result.push({ x: a.x, y: b.y });
        else result.push({ x: b.x, y: a.y });
      }
    }
    result.push(b);
  }

  return simplifyOrthogonalPoints(result);
}

/**
 * Reconstrói um caminho ajustado manualmente quando os blocos conectados são movimentados,
 * garantindo ortogonalidade e preservando os ajustes manuais feitos pelo usuário.
 */
function buildManualOrthogonalPath(
  p1: Point,
  p2: Point,
  manualInteriorPoints: Point[],
  endSide: CompassDirection,
  _obstacles: BoundingBox[]
): Point[] | null {
  if (!manualInteriorPoints || manualInteriorPoints.length === 0) return null;

  const interior = manualInteriorPoints.map(p => snapPointToGrid(p, GRID_SIZE));
  const chain: Point[] = [p1];

  const first = interior[0];
  if (Math.abs(p1.x - first.x) > 1 && Math.abs(p1.y - first.y) > 1) {
    // Conecta p1 ao primeiro vértice manual mantendo ortogonalidade
    if (interior.length >= 2 && Math.abs(interior[0].y - interior[1].y) < 1) {
      chain.push({ x: p1.x, y: first.y });
    } else {
      chain.push({ x: first.x, y: p1.y });
    }
  }

  for (let i = 0; i < interior.length; i++) {
    const prev = chain[chain.length - 1];
    const curr = interior[i];
    if (Math.abs(prev.x - curr.x) > 1 && Math.abs(prev.y - curr.y) > 1) {
      chain.push({ x: curr.x, y: prev.y });
    }
    chain.push(curr);
  }

  const last = chain[chain.length - 1];
  if (Math.abs(last.x - p2.x) > 1 && Math.abs(last.y - p2.y) > 1) {
    if (endSide === 'N' || endSide === 'S') {
      chain.push({ x: p2.x, y: last.y });
    } else {
      chain.push({ x: last.x, y: p2.y });
    }
  }
  chain.push(p2);

  return simplifyOrthogonalPoints(chain);
}

/**
 * Calcula um ponto de escape externo na grade logo fora da porta para evitar atravessar o próprio bloco
 */
function getPortStubPoint(port: PortPosition, el: DiagramElement, targetHint?: Point): Point {
  const clearance = GRID_SIZE;
  if (port.side === 'N') return { x: port.x, y: snapToGrid(port.y - clearance) };
  if (port.side === 'S') return { x: port.x, y: snapToGrid(port.y + clearance) };
  if (port.side === 'E') return { x: snapToGrid(port.x + clearance), y: port.y };
  if (port.side === 'W') return { x: snapToGrid(port.x - clearance), y: port.y };

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
  if (Math.abs(pStart.x - pEnd.x) < 2) {
    const direct = [pStart, { x: pStart.x, y: pEnd.y }];
    if (!pathIntersectsAnyBox(direct, boxes)) return direct;
  }
  if (Math.abs(pStart.y - pEnd.y) < 2) {
    const direct = [pStart, { x: pEnd.x, y: pStart.y }];
    if (!pathIntersectsAnyBox(direct, boxes)) return direct;
  }

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

  const midX = snapToGrid((pStart.x + pEnd.x) / 2, GRID_SIZE);
  const zMidX: Point[] = [
    pStart,
    { x: midX, y: pStart.y },
    { x: midX, y: pEnd.y },
    pEnd
  ];
  if (!pathIntersectsAnyBox(zMidX, boxes)) return zMidX;

  const midY = snapToGrid((pStart.y + pEnd.y) / 2, GRID_SIZE);
  const zMidY: Point[] = [
    pStart,
    { x: pStart.x, y: midY },
    { x: pEnd.x, y: midY },
    pEnd
  ];
  if (!pathIntersectsAnyBox(zMidY, boxes)) return zMidY;

  const candidateChannelsY: number[] = [];
  const baseMinY = Math.min(pStart.y, pEnd.y);
  const baseMaxY = Math.max(pStart.y, pEnd.y);

  boxes.forEach(b => {
    candidateChannelsY.push(snapToGrid(b.top - 20, GRID_SIZE));
    candidateChannelsY.push(snapToGrid(b.bottom + 20, GRID_SIZE));
    candidateChannelsY.push(snapToGrid(b.top - 40, GRID_SIZE));
    candidateChannelsY.push(snapToGrid(b.bottom + 40, GRID_SIZE));
  });
  candidateChannelsY.push(snapToGrid(baseMinY - 60, GRID_SIZE));
  candidateChannelsY.push(snapToGrid(baseMaxY + 60, GRID_SIZE));
  candidateChannelsY.push(snapToGrid(baseMinY - 100, GRID_SIZE));
  candidateChannelsY.push(snapToGrid(baseMaxY + 100, GRID_SIZE));

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

  const candidateChannelsX: number[] = [];
  boxes.forEach(b => {
    candidateChannelsX.push(snapToGrid(b.left - 20, GRID_SIZE));
    candidateChannelsX.push(snapToGrid(b.right + 20, GRID_SIZE));
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
 * Calcula rota ortogonal completa para pré-visualização da ferramenta Criar Conexão ou conexões pendentes
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
  const snappedCursor = snapPointToGrid(cursorPt, GRID_SIZE);

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
    let curr = startStub;
    chain.push(startStub);
    for (let i = 0; i < waypoints.length; i++) {
      const wp = snapPointToGrid(waypoints[i], GRID_SIZE);
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

function computeSignPosition(endPort: PortPosition): Point {
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
 * Suporta todas as 8 portas da rosa dos ventos, conexões pendentes, ajuste manual de segmentos e pontos de ancoragem.
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
  segments: DraggableSegment[];
  endPoint: Point;
} {
  const waypoints: Point[] = Array.isArray(conn.waypoints)
    ? conn.waypoints
    : conn.waypoint
    ? [conn.waypoint]
    : [];

  // Caso especial: conexão temporariamente interrompida (pendente) sem bloco de destino ainda
  if (!tgt || conn.isPending) {
    const lastPt =
      waypoints.length > 0
        ? waypoints[waypoints.length - 1]
        : { x: (src.x || 100) + 100, y: src.y || 100 };
    const priorWps = waypoints.length > 1 ? waypoints.slice(0, -1) : [];
    const preview = computePencilPreviewPath(
      src,
      conn.fromPort as PortSide,
      priorWps,
      lastPt,
      allElements
    );
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
      segments: getDraggableSegments(pts),
      endPoint
    };
  }

  const isFeedback = src.dir === 'left' || (src.x || 0) > (tgt.x || 0);

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
    .map(el => getElementBoundingBox(el, 8));

  let points: Point[] | null = null;

  // 1. Tenta preservar o trajeto manual dos segmentos se existir e não atravessar obstáculos
  if (Array.isArray(conn.manualPoints) && conn.manualPoints.length > 0) {
    points = buildManualOrthogonalPath(p1, p2, conn.manualPoints, endPort.side, obstacles);
  }

  // 2. Se não houver manualPoints (ou se a geometria colidiu ao mover um bloco), usa waypoints ou roteamento inteligente
  if (!points) {
    let rawPoints: Point[] = [];
    if (waypoints.length > 0) {
      rawPoints.push(p1);
      let curr = p1;
      for (const wp of waypoints) {
        const snappedWp = snapPointToGrid(wp, GRID_SIZE);
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

      if (preferVerticalEnd && !isFeedback) {
        if (Math.abs(p1.x - p2.x) < 4) {
          rawPoints = [p1, p2];
        } else if (startPort.side === 'S' || startPort.side === 'N') {
          const midY = snapToGrid((p1.y + p2.y) / 2, GRID_SIZE);
          rawPoints = [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
        } else {
          rawPoints = [p1, { x: p2.x, y: p1.y }, p2];
        }
      } else if (Math.abs(p1.y - p2.y) < 4 && p2.x > p1.x && !pathIntersectsAnyBox([p1, p2], obstacles)) {
        rawPoints = [p1, { x: p2.x, y: p1.y }, p2];
      } else if (p2.x > p1.x && !isFeedback) {
        rawPoints = computeOrthogonalGridSegment(p1, p2, obstacles, preferVerticalEnd);
      } else {
        if (tgt.type === 'summer' && (endPort.side === 'S' || endPort.side === 'N')) {
          if (startPort.side === 'W' && Math.abs(p1.y - p2.y) > 25 && !pathIntersectsAnyBox([p1, { x: p2.x, y: p1.y }, p2], obstacles)) {
            rawPoints = [p1, { x: p2.x, y: p1.y }, p2];
          } else {
            const allBoxes = allElements.map(el => getElementBoundingBox(el, 10));
            const maxBottom = allBoxes.reduce((m, b) => Math.max(m, b.bottom), Math.max(p1.y, p2.y));
            const channelY =
              endPort.side === 'N'
                ? snapToGrid(Math.min(p1.y, p2.y) - 60 - connIndex * 20, GRID_SIZE)
                : snapToGrid(Math.max(maxBottom + 40, Math.max(p1.y, p2.y) + 60 + connIndex * 20), GRID_SIZE);
            const outX = startPort.side === 'E' ? snapToGrid(p1.x + 40, GRID_SIZE) : p1.x;
            rawPoints = [
              p1,
              { x: outX, y: p1.y },
              { x: outX, y: channelY },
              { x: p2.x, y: channelY },
              p2
            ];
          }
        } else if (src.type === 'block' && src.dir !== 'left' && tgt.dir === 'left') {
          const dropX = snapToGrid(Math.max(p1.x + 20, (tgt.x || 0) + 80), GRID_SIZE);
          rawPoints = [p1, { x: dropX, y: p1.y }, { x: dropX, y: p2.y }, p2];
        } else {
          const channelY = snapToGrid(Math.max(p1.y, p2.y) + 60 + connIndex * 20, GRID_SIZE);
          const outX = startPort.side === 'E' ? snapToGrid(p1.x + 20, GRID_SIZE) : p1.x;
          const inX = endPort.side === 'W' ? snapToGrid(p2.x - 20, GRID_SIZE) : p2.x;
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
    points = simplifyOrthogonalPoints(rawPoints);
  }

  const pathD = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const segments = getDraggableSegments(points);

  const corners = points.slice(1, points.length - 1);
  let longestSegMid: Point = {
    x: Math.round((p1.x + p2.x) / 2),
    y: Math.round((p1.y + p2.y) / 2)
  };
  let maxLen = -1;
  for (const seg of segments) {
    if (seg.length > maxLen) {
      maxLen = seg.length;
      longestSegMid = { x: seg.midX, y: seg.midY };
    }
  }

  const midPoint = waypoints.length > 0 ? waypoints[waypoints.length - 1] : longestSegMid;
  const anchors = corners.length > 0 ? corners : [midPoint];
  const signPos = computeSignPosition(endPort);

  return {
    pathD,
    signPos,
    midPoint,
    points,
    anchors,
    segments,
    endPoint: p2
  };
}

/**
 * Divide uma expressão racional em Numerador e Denominador para edição no painel lateral.
 * Preserva campos vazios quando a função de transferência ainda não foi definida.
 */
export function splitTransferFunction(expr: string = ''): { num: string; den: string } {
  const trimmed = expr.trim();
  if (!trimmed) return { num: '', den: '' };

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
    num: rawNum,
    den: rawDen
  };
}

/**
 * Verifica se a expressão inteira está envolvida por um único par externo de parênteses balanceados
 * Ex: "(s+1)" -> true ; "(s+1)(s+2)" -> false ; "(1+s*tau1)*(1+s*tau2)" -> false
 */
export function isEnclosedInMatchingParens(s: string): boolean {
  const t = s.trim();
  if (!t.startsWith('(') || !t.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '(') depth++;
    else if (t[i] === ')') depth--;
    if (depth === 0 && i < t.length - 1) return false;
  }
  return depth === 0;
}

/**
 * Combina Numerador e Denominador em uma string de função de transferência.
 * Se ambos estiverem vazios, retorna string vazia (bloco genérico ainda não definido).
 */
export function combineTransferFunction(num: string, den: string): string {
  const n = num.trim();
  const d = den.trim();
  if (!n && !d) return '';
  if (!n) return '';
  if (!d || d === '1') return n;

  const needsParensNum = (s: string) =>
    !isEnclosedInMatchingParens(s) && /[+\-/]/.test(s);
  const needsParensDen = (s: string) =>
    !isEnclosedInMatchingParens(s) && (/[+\-*/\s()]/.test(s) || /\d[A-Za-z_]/.test(s));

  const formattedNum = needsParensNum(n) ? `(${n})` : n;
  const formattedDen = needsParensDen(d) ? `(${d})` : d;
  return `${formattedNum}/${formattedDen}`;
}

/**
 * Valida se a função de transferência de um bloco G(s) ou H(s) é sintaticamente válida.
 * Blocos sem valor numérico informado são tratados como blocos simbólicos genéricos pelo motor matemático.
 */
export function validateTransferFunction(
  expr?: string,
  num?: string,
  den?: string
): { valid: boolean; isEmpty?: boolean; error?: string } {
  const raw = (expr ?? '').trim();
  if (!raw) {
    return { valid: false, isEmpty: true, error: 'Bloco simbólico genérico (sem parâmetros numéricos definidos).' };
  }
  if (raw.endsWith('/') || raw.startsWith('/')) {
    return { valid: false, isEmpty: false, error: 'Fração incompleta: informe numerador e denominador.' };
  }
  if (num !== undefined && den !== undefined) {
    if (!num.trim() && !den.trim()) {
      return { valid: false, isEmpty: true, error: 'Bloco simbólico genérico (sem parâmetros numéricos definidos).' };
    }
    if (!num.trim()) {
      return { valid: false, isEmpty: false, error: 'O numerador N(s) não pode ficar vazio.' };
    }
    if (!den.trim()) {
      return { valid: false, isEmpty: false, error: 'O denominador D(s) não pode ficar vazio.' };
    }
    if (den.trim() === '0') {
      return { valid: false, isEmpty: false, error: 'O denominador D(s) não pode ser zero.' };
    }
  }
  let depth = 0;
  for (const ch of raw) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) {
      return { valid: false, isEmpty: false, error: 'Parênteses desbalanceados na expressão.' };
    }
  }
  if (depth !== 0) {
    return { valid: false, isEmpty: false, error: 'Parênteses abertos sem fechamento na expressão.' };
  }
  return { valid: true, isEmpty: false };
}

/**
 * Alinha múltiplos elementos selecionados (sem mover elementos bloqueados)
 */
export function alignElementsOnGrid(
  elements: DiagramElement[],
  selectedIds: string[],
  mode: 'align-y' | 'align-x' | 'distribute-x' | 'distribute-y'
): DiagramElement[] {
  const selected = elements.filter(e => selectedIds.includes(e.id) && !e.locked);
  if (selected.length < 2) return elements;

  const updated = elements.map(e => ({ ...e }));

  if (mode === 'align-y') {
    const targetY = snapToGrid(selected[0].y ?? 220, GRID_SIZE);
    updated.forEach(e => {
      if (selectedIds.includes(e.id) && !e.locked) e.y = targetY;
    });
  } else if (mode === 'align-x') {
    const targetX = snapToGrid(selected[0].x ?? 220, GRID_SIZE);
    updated.forEach(e => {
      if (selectedIds.includes(e.id) && !e.locked) e.x = targetX;
    });
  } else if (mode === 'distribute-x' && selected.length >= 3) {
    const sorted = [...selected].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
    const minX = sorted[0].x ?? 100;
    const maxX = sorted[sorted.length - 1].x ?? 500;
    const step = (maxX - minX) / (sorted.length - 1);
    sorted.forEach((item, idx) => {
      const target = updated.find(u => u.id === item.id);
      if (target && !target.locked) {
        target.x = snapToGrid(minX + idx * step, GRID_SIZE);
      }
    });
  } else if (mode === 'distribute-y' && selected.length >= 3) {
    const sorted = [...selected].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
    const minY = sorted[0].y ?? 100;
    const maxY = sorted[sorted.length - 1].y ?? 500;
    const step = (maxY - minY) / (sorted.length - 1);
    sorted.forEach((item, idx) => {
      const target = updated.find(u => u.id === item.id);
      if (target && !target.locked) {
        target.y = snapToGrid(minY + idx * step, GRID_SIZE);
      }
    });
  }

  return updated;
}

/**
 * Algoritmo Inteligente de Auto-Layout para Diagramas de Controle
 */
export function autoLayoutDiagram(graph: DiagramGraph): DiagramGraph {
  const elements: DiagramElement[] = graph.elements.map(e => ({ ...e }));
  const connections: DiagramConnection[] = graph.connections.map(c => ({
    ...c,
    waypoints: undefined,
    waypoint: undefined,
    manualPoints: undefined
  }));

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

  const BASE_Y = 240;
  let currentX = 120;

  trunkElements.forEach(el => {
    if (!el.locked) {
      el.y = BASE_Y;
      el.x = snapToGrid(currentX, GRID_SIZE);
    }

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

  disturbanceInputs.forEach((dist, idx) => {
    if (dist.locked) return;
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

  feedbackBlocks.forEach((fb, idx) => {
    if (fb.locked) return;
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
