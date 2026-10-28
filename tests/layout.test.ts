import { describe, it, expect } from 'vitest';
import {
  autoLayoutDiagram,
  computeSmartConnectionPath,
  getElementEightPorts,
  getElementBoundingBox,
  splitTransferFunction,
  combineTransferFunction,
  getDraggableSegments,
  moveConnectionSegment,
  validateTransferFunction,
  alignElementsOnGrid
} from '../src/features/builder/layoutEngine';
import { DiagramGraph, DiagramElement, computeMasonAnalysis } from '../src/core/reduction/mason';
import { ratToLatex } from '../src/core/algebra/rational';

describe('Layout Engine, 8-Point Compass Routing & 2-DOF Exercise Integration', () => {
  it('deve espaçar blocos de avanço garantindo distância mínima de 120px', () => {
    const rawGraph: DiagramGraph = {
      elements: [
        { id: 'IN', type: 'input', name: 'X(s)', x: 0, y: 0 },
        { id: 's1', type: 'summer', name: 'S1', x: 0, y: 0 },
        { id: 'g1', type: 'block', name: 'G1', expr: '1', x: 0, y: 0 },
        { id: 'g2', type: 'block', name: 'G2', expr: '1', x: 0, y: 0 },
        { id: 'OUT', type: 'output', name: 'Y(s)', x: 0, y: 0 }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 'g2', sign: '+' },
        { id: 'c4', from: 'g2', to: 'OUT', sign: '+' }
      ]
    };

    const laidOut = autoLayoutDiagram(rawGraph);
    const g1 = laidOut.elements.find(e => e.id === 'g1')!;
    const g2 = laidOut.elements.find(e => e.id === 'g2')!;

    expect(g2.x! - g1.x!).toBeGreaterThanOrEqual(150);
  });

  it('deve fornecer exatamente os 8 pontos da rosa dos ventos (N, NE, E, SE, S, SW, W, NW) para todos os elementos', () => {
    const elements: DiagramElement[] = [
      { id: 'g1', type: 'block', name: 'G(s)', x: 300, y: 200 },
      { id: 's1', type: 'summer', name: 'S1', x: 200, y: 200 },
      { id: 'r1', type: 'input', name: 'ref(s)', x: 100, y: 200 },
      { id: 'w1', type: 'input', subType: 'disturbance', name: 'W(s)', x: 400, y: 100 },
      { id: 'c1', type: 'output', name: 'y(s)', x: 600, y: 200 }
    ];

    for (const el of elements) {
      const ports = getElementEightPorts(el);
      expect(ports).toHaveLength(8);
      expect(ports.map(p => p.side)).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
    }
  });

  it('deve calcular rota estritamente ortogonal sem segmentos diagonais e sem atravessar obstáculos intermediários', () => {
    const src: DiagramElement = { id: 'g1', type: 'block', name: 'G1', x: 160, y: 220 };
    const obstacle: DiagramElement = { id: 'obs', type: 'block', name: 'OBS', x: 340, y: 220 };
    const tgt: DiagramElement = { id: 'g2', type: 'block', name: 'G2', x: 520, y: 220 };
    const conn = { id: 'c1', from: 'g1', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' as const };

    const { points, anchors } = computeSmartConnectionPath(src, tgt, conn, 0, 1, [src, obstacle, tgt]);
    expect(points.length).toBeGreaterThanOrEqual(4); // Desviou do bloco intermediário
    expect(anchors.length).toBeGreaterThanOrEqual(2);

    const obsBox = getElementBoundingBox(obstacle, 2);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const isHorizontal = Math.abs(a.y - b.y) < 1;
      const isVertical = Math.abs(a.x - b.x) < 1;
      expect(isHorizontal || isVertical).toBe(true);

      // Garante que não cruza o interior do obstáculo
      if (isHorizontal && a.y > obsBox.top && a.y < obsBox.bottom) {
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const crosses = maxX > obsBox.left && minX < obsBox.right;
        expect(crosses).toBe(false);
      }
    }
  });

  it('deve preservar conexões interrompidas temporariamente (pendentes) com seus pontos de ancoragem e bolinha final', () => {
    const src: DiagramElement = { id: 'hf', type: 'block', name: 'Hf(s)', x: 200, y: 220 };
    const pendingConn = {
      id: 'pending_1',
      from: 'hf',
      to: '',
      fromPort: 'E',
      waypoints: [
        { x: 320, y: 220 },
        { x: 320, y: 300 }
      ],
      isPending: true
    };

    const res = computeSmartConnectionPath(src, null, pendingConn, 0, 1, [src]);
    expect(res.endPoint).toEqual({ x: 320, y: 300 });
    expect(res.pathD.startsWith('M')).toBe(true);
    expect(res.anchors.length).toBeGreaterThanOrEqual(1);
  });

  it('deve separar e recombinar Numerador e Denominador de funções de transferência corretamente', () => {
    expect(splitTransferFunction('5/(s+3)')).toEqual({ num: '5', den: 's+3' });
    expect(splitTransferFunction('(s+1)/(s^2+3s+2)')).toEqual({ num: 's+1', den: 's^2+3s+2' });
    expect(splitTransferFunction('10')).toEqual({ num: '10', den: '1' });

    expect(combineTransferFunction('5', 's+3')).toBe('5/(s+3)');
    expect(combineTransferFunction('s+2', 's+5')).toBe('(s+2)/(s+5)');
    expect(combineTransferFunction('10', '1')).toBe('10');
  });

  it('deve montar e reduzir por Mason o sistema de controle 2-DOF do exercício (ref, Hf, S1, Hc, S2, W, G, y)', () => {
    // Montagem completa do exercício da imagem 2:
    // ref(s) -> Hf(s) -> S1 (+) -> Hc(s) -> S2 (+) -> G(s) -> y(s)
    // Perturbação W(s) -> S2 (-)
    // Realimentação negativa de G(s) -> S1 (-)
    // Usando valores racionais: Hf(s) = 2, Hc(s) = 3, G(s) = 4/(s+1)
    const exerciseGraphRef: DiagramGraph = {
      elements: [
        { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'ref(s)', x: 80, y: 220 },
        { id: 'hf', code: 'G1', type: 'block', name: 'Hf(s)', expr: '2', x: 220, y: 220, dir: 'right' },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 360, y: 220 },
        { id: 'hc', code: 'G2', type: 'block', name: 'Hc(s)', expr: '3', x: 500, y: 220, dir: 'right' },
        { id: 's2', code: 'S2', type: 'summer', name: 'S2', x: 640, y: 220 },
        { id: 'g', code: 'G3', type: 'block', name: 'G(s)', expr: '4/(s+1)', x: 780, y: 220, dir: 'right' },
        { id: 'OUT', code: 'C1', type: 'output', name: 'y(s)', x: 940, y: 220 }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 'hf', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c2', from: 'hf', to: 's1', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c3', from: 's1', to: 'hc', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c4', from: 'hc', to: 's2', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c5', from: 's2', to: 'g', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c6', from: 'g', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c7', from: 'g', to: 's1', fromPort: 'S', toPort: 'S', sign: '-' }
      ]
    };

    // P1 = Hf * Hc * G = 2 * 3 * 4/(s+1) = 24/(s+1)
    // L1 = -Hc * G = -12/(s+1)
    // T(s) = y(s)/ref(s) = (24/(s+1)) / (1 + 12/(s+1)) = 24 / (s + 13)
    const analysisRef = computeMasonAnalysis(exerciseGraphRef);
    expect(analysisRef.forwardPaths).toHaveLength(1);
    expect(analysisRef.loops).toHaveLength(1);
    expect(ratToLatex(analysisRef.totalT)).toContain('24');
    expect(ratToLatex(analysisRef.totalT)).toContain('13');
  });

  it('deve suportar blocos G(s) e H(s) inicialmente genéricos (vazios) e validar funções de transferência', () => {
    expect(splitTransferFunction('')).toEqual({ num: '', den: '' });
    expect(combineTransferFunction('', '')).toBe('');

    const emptyCheck = validateTransferFunction('', '', '');
    expect(emptyCheck.isEmpty).toBe(true);
    expect(emptyCheck.valid).toBe(false);

    const validCheck = validateTransferFunction('10/(s+2)', '10', 's+2');
    expect(validCheck.isEmpty).toBe(false);
    expect(validCheck.valid).toBe(true);

    const invalidDenCheck = validateTransferFunction('10/0', '10', '0');
    expect(invalidDenCheck.valid).toBe(false);
  });

  it('deve identificar segmentos arrastáveis e mover segmentos horizontais/verticais na grade de 20px preservando portas', () => {
    const src: DiagramElement = { id: 'g1', type: 'block', name: 'G1(s)', x: 200, y: 220 };
    const s1: DiagramElement = { id: 's1', type: 'summer', name: 'S1', x: 500, y: 220 };
    const conn = { id: 'c_fb', from: 'g1', to: 's1', fromPort: 'S', toPort: 'S', sign: '-' as const };

    const initialRoute = computeSmartConnectionPath(src, s1, conn, 0, 1, [src, s1]);
    const segments = getDraggableSegments(initialRoute.points);
    expect(segments.length).toBeGreaterThanOrEqual(1);

    const horizSeg = segments.find(s => s.orientation === 'horizontal');
    expect(horizSeg).toBeDefined();

    // Arrastar segmento horizontal para Y = 363 -> deve alinhar na grade em 360 e preservar extremos nas portas
    const movedPoints = moveConnectionSegment(initialRoute.points, horizSeg!.index, 363, [src, s1], 'g1', 's1');
    expect(movedPoints[0]).toEqual(initialRoute.points[0]);
    expect(movedPoints[movedPoints.length - 1]).toEqual(initialRoute.points[initialRoute.points.length - 1]);
    expect(movedPoints.some(p => p.y === 360)).toBe(true);

    // Verifica persistência via manualPoints mesmo após recalcular a rota
    const persistedRoute = computeSmartConnectionPath(
      src,
      s1,
      { ...conn, manualPoints: movedPoints.slice(1, -1) },
      0,
      1,
      [src, s1]
    );
    expect(persistedRoute.points.some(p => p.y === 360)).toBe(true);
  });

  it('deve alinhar múltiplos elementos na grade respeitando elementos bloqueados (locked)', () => {
    const elements: DiagramElement[] = [
      { id: 'b1', type: 'block', name: 'G1(s)', x: 200, y: 180 },
      { id: 'b2', type: 'block', name: 'G2(s)', x: 380, y: 260 },
      { id: 'b3', type: 'block', name: 'G3(s)', x: 540, y: 310, locked: true }
    ];

    const aligned = alignElementsOnGrid(elements, ['b1', 'b2', 'b3'], 'align-y');
    const b1 = aligned.find(e => e.id === 'b1')!;
    const b2 = aligned.find(e => e.id === 'b2')!;
    const b3 = aligned.find(e => e.id === 'b3')!;

    expect(b1.y).toBe(b2.y);
    expect(b3.y).toBe(310); // Permaneceu bloqueado
  });
});
