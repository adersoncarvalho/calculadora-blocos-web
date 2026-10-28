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
  moveConnectionCorner,
  validateTransferFunction,
  alignElementsOnGrid
} from '../src/features/builder/layoutEngine';
import { DiagramGraph, DiagramElement, computeMasonAnalysis } from '../src/core/reduction/mason';
import { ratToLatex } from '../src/core/algebra/rational';
import { formatElementSymbolToLatex } from '../src/features/builder/MasonDeductionView';
import {
  analyzeCompleteBlockDiagram,
  runMasonForInputTargetPair
} from '../src/features/builder/symbolicMasonEngine';

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

  it('deve formatar símbolos matemáticos para LaTeX corretamente e identificar laços disjuntos no memorial', () => {
    expect(formatElementSymbolToLatex('G1(s)')).toBe('G_{1}(s)');
    expect(formatElementSymbolToLatex('Hf(s)')).toBe('H_{f}(s)');
    expect(formatElementSymbolToLatex('ref(s)')).toBe('\\text{ref}(s)');
    expect(formatElementSymbolToLatex('R(s)')).toBe('R(s)');
    expect(formatElementSymbolToLatex('S1')).toBe('S_{1}');

    // Sistema com 2 malhas disjuntas em série:
    // IN -> S1 -> G1 -> S2 -> G2 -> OUT
    // L1: G1 -> H1 -> S1 (-)
    // L2: G2 -> H2 -> S2 (-)
    const disjointGraph: DiagramGraph = {
      elements: [
        { id: 'IN', type: 'input', name: 'R(s)' },
        { id: 's1', type: 'summer', name: 'S1' },
        { id: 'g1', type: 'block', name: 'G1(s)', expr: '2' },
        { id: 'h1', type: 'block', name: 'H1(s)', expr: '3', dir: 'left' },
        { id: 's2', type: 'summer', name: 'S2' },
        { id: 'g2', type: 'block', name: 'G2(s)', expr: '4' },
        { id: 'h2', type: 'block', name: 'H2(s)', expr: '5', dir: 'left' },
        { id: 'OUT', type: 'output', name: 'C(s)' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 'h1', sign: '+' },
        { id: 'c4', from: 'h1', to: 's1', sign: '-' },
        { id: 'c5', from: 'g1', to: 's2', sign: '+' },
        { id: 'c6', from: 's2', to: 'g2', sign: '+' },
        { id: 'c7', from: 'g2', to: 'h2', sign: '+' },
        { id: 'c8', from: 'h2', to: 's2', sign: '-' },
        { id: 'c9', from: 'g2', to: 'OUT', sign: '+' }
      ]
    };

    const res = computeMasonAnalysis(disjointGraph);
    expect(res.loops).toHaveLength(2);
    expect(res.disjointPairs).toHaveLength(1);
    // L1 = -6, L2 = -20, L1*L2 = 120 => Delta = 1 - (-6 - 20) + 120 = 147
    // P1 = 2 * 4 = 8 => T(s) = 8 / 147
    expect(ratToLatex(res.delta)).toBe('147');
    expect(ratToLatex(res.totalT)).toBe('\\frac{8}{147}');
  });

  it('Teste 1 & 2 (Obrigatórios): deve analisar o sistema 2-DOF completo simbolicamente, gerar equações reais dos somadores, validar por eliminação algébrica independente e atualizar sinais ao inverter polaridade de W(s)', () => {
    // Topologia da Seção 3:
    // R(s) -> Hf(s) -> Somador 1 (+) -> Hc(s) -> Somador 2 (+) -> G(s) -> Y(s)
    // Realimentação unitária negativa: Y(s) -> Somador 1 (-)
    // Perturbação negativa: W(s) -> Somador 2 (-)
    // Blocos inseridos genericamente com valor inicial 1/1 (num='1', den='1', expr='1')
    const baseGraph: DiagramGraph = {
      elements: [
        { id: 'r1', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 80, y: 220 },
        { id: 'hf', code: 'G1', type: 'block', name: 'Hf(s)', num: '1', den: '1', expr: '1', x: 220, y: 220 },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 360, y: 220 },
        { id: 'hc', code: 'G2', type: 'block', name: 'Hc(s)', num: '1', den: '1', expr: '1', x: 500, y: 220 },
        { id: 's2', code: 'S2', type: 'summer', name: 'S2', x: 640, y: 220 },
        { id: 'w1', code: 'W1', type: 'input', subType: 'disturbance', name: 'W(s)', x: 640, y: 80 },
        { id: 'g', code: 'G3', type: 'block', name: 'G(s)', num: '1', den: '1', expr: '1', x: 780, y: 220 },
        { id: 'y1', code: 'C1', type: 'output', name: 'Y(s)', x: 940, y: 220 }
      ],
      connections: [
        { id: 'c1', from: 'r1', to: 'hf', sign: '+' },
        { id: 'c2', from: 'hf', to: 's1', sign: '+' },
        { id: 'c3', from: 's1', to: 'hc', sign: '+' },
        { id: 'c4', from: 'hc', to: 's2', sign: '+' },
        { id: 'c5', from: 'w1', to: 's2', sign: '-' },
        { id: 'c6', from: 's2', to: 'g', sign: '+' },
        { id: 'c7', from: 'g', to: 'y1', sign: '+' },
        { id: 'c8', from: 'y1', to: 's1', sign: '-' }
      ]
    };

    const fullAnalysis = analyzeCompleteBlockDiagram(baseGraph, 'r1', 'y1');

    // 1. Verifica equações reais dos somadores e da saída (Seção 2.1 e 3.2)
    expect(fullAnalysis.summerEquations.map(eq => eq.equationText)).toEqual([
      'E(s) = Hf(s)R(s) - Y(s)',
      'U(s) = Hc(s)E(s) - W(s)'
    ]);
    expect(fullAnalysis.outputEquations.map(eq => eq.equationText)).toEqual([
      'Y(s) = G(s)U(s)'
    ]);

    // 2. Verifica reconhecimento automático das 2 entradas independentes: R(s) e W(s)
    expect(fullAnalysis.independentInputs.map(i => i.id)).toEqual(['r1', 'w1']);

    // 3. Verifica funções de transferência da saída Y(s) e do erro E(s) para R(s) e W(s) (Seção 3.3 a 3.6)
    const tfYR = fullAnalysis.outputByInputPairs.find(
      tf => tf.inputInfo.id === 'r1' && tf.targetInfo.id === 'y1'
    )!;
    const tfYW = fullAnalysis.outputByInputPairs.find(
      tf => tf.inputInfo.id === 'w1' && tf.targetInfo.id === 'y1'
    )!;
    const tfER = fullAnalysis.summerByInputPairs.find(
      tf => tf.inputInfo.id === 'r1' && tf.targetInfo.id === 's1'
    )!;
    const tfEW = fullAnalysis.summerByInputPairs.find(
      tf => tf.inputInfo.id === 'w1' && tf.targetInfo.id === 's1'
    )!;

    // Verifica formatação compacta e LaTeX canônica (ex.: GHcHf/(1 + GHc))
    expect(tfYR.transferFunctionCompact).toBe('GHcHf/(1 + GHc)');
    expect(tfYW.transferFunctionCompact).toBe('-G/(1 + GHc)');
    expect(tfER.transferFunctionCompact).toBe('Hf/(1 + GHc)');
    expect(tfEW.transferFunctionCompact).toBe('G/(1 + GHc)');

    expect(tfYR.transferFunctionLatex).toBe('\\frac{GH_{c}H_{f}}{1 + GH_{c}}');
    expect(tfYW.transferFunctionLatex).toBe('-\\frac{G}{1 + GH_{c}}');
    expect(tfER.transferFunctionLatex).toBe('\\frac{H_{f}}{1 + GH_{c}}');
    expect(tfEW.transferFunctionLatex).toBe('\\frac{G}{1 + GH_{c}}');

    // 4. Verifica expressão final por superposição (Seção 3.7)
    expect(fullAnalysis.superpositionOutputText).toBe(
      'Y(s) = [GHcHf/(1 + GHc)]R(s) - [G/(1 + GHc)]W(s)'
    );

    // 5. Verifica validação algébrica independente (Seção 5)
    expect(fullAnalysis.allValidationsMatch).toBe(true);
    expect(tfYR.matchesAlgebraic).toBe(true);
    expect(tfYW.matchesAlgebraic).toBe(true);
    expect(tfER.matchesAlgebraic).toBe(true);
    expect(tfEW.matchesAlgebraic).toBe(true);

    // =========================================================================
    // TESTE 2: INVERSÃO DE POLARIDADE DA PERTURBAÇÃO W(s) NO SOMADOR 2 (- PARA +)
    // =========================================================================
    const invertedGraph: DiagramGraph = {
      ...baseGraph,
      connections: baseGraph.connections.map(c =>
        c.id === 'c5' ? { ...c, sign: '+' as const } : c
      )
    };

    const invertedAnalysis = analyzeCompleteBlockDiagram(invertedGraph, 'r1', 'y1');

    // Equação do Somador 2 atualizada automaticamente para + W(s)
    expect(invertedAnalysis.summerEquations.map(eq => eq.equationText)).toEqual([
      'E(s) = Hf(s)R(s) - Y(s)',
      'U(s) = Hc(s)E(s) + W(s)'
    ]);

    const tfYW_plus = invertedAnalysis.outputByInputPairs.find(
      tf => tf.inputInfo.id === 'w1' && tf.targetInfo.id === 'y1'
    )!;
    const tfEW_plus = invertedAnalysis.summerByInputPairs.find(
      tf => tf.inputInfo.id === 'w1' && tf.targetInfo.id === 's1'
    )!;

    expect(tfYW_plus.transferFunctionCompact).toBe('G/(1 + GHc)');
    expect(tfEW_plus.transferFunctionCompact).toBe('-G/(1 + GHc)');
    expect(invertedAnalysis.superpositionOutputText).toBe(
      'Y(s) = [GHcHf/(1 + GHc)]R(s) + [G/(1 + GHc)]W(s)'
    );
    expect(invertedAnalysis.allValidationsMatch).toBe(true);
  });

  it('Teste 3, 4 & 5 (Obrigatórios): deve analisar sistema com 3 entradas independentes (R, W1, W2) e laços múltiplos/disjuntos com validação algébrica 100% coincidente', () => {
    const multiInputGraph: DiagramGraph = {
      elements: [
        { id: 'r1', type: 'input', subType: 'reference', name: 'R(s)' },
        { id: 'w1', type: 'input', subType: 'disturbance', name: 'W1(s)' },
        { id: 'w2', type: 'input', subType: 'disturbance', name: 'W2(s)' },
        { id: 's1', type: 'summer', name: 'S1' },
        { id: 'g1', type: 'block', name: 'G1(s)', num: '1', den: '1', expr: '1' },
        { id: 'h1', type: 'block', name: 'H1(s)', num: '1', den: '1', expr: '1' },
        { id: 's2', type: 'summer', name: 'S2' },
        { id: 'g2', type: 'block', name: 'G2(s)', num: '1', den: '1', expr: '1' },
        { id: 'h2', type: 'block', name: 'H2(s)', num: '1', den: '1', expr: '1' },
        { id: 'y1', type: 'output', name: 'Y(s)' }
      ],
      connections: [
        { id: 'c1', from: 'r1', to: 's1', sign: '+' },
        { id: 'c2', from: 'w1', to: 's1', sign: '-' },
        { id: 'c3', from: 's1', to: 'g1', sign: '+' },
        { id: 'c4', from: 'g1', to: 'h1', sign: '+' },
        { id: 'c5', from: 'h1', to: 's1', sign: '-' },
        { id: 'c6', from: 'g1', to: 's2', sign: '+' },
        { id: 'c7', from: 'w2', to: 's2', sign: '+' },
        { id: 'c8', from: 's2', to: 'g2', sign: '+' },
        { id: 'c9', from: 'g2', to: 'h2', sign: '+' },
        { id: 'c10', from: 'h2', to: 's2', sign: '-' },
        { id: 'c11', from: 'g2', to: 'y1', sign: '+' }
      ]
    };

    const res = analyzeCompleteBlockDiagram(multiInputGraph, 'r1', 'y1');
    expect(res.independentInputs).toHaveLength(3);
    expect(res.allValidationsMatch).toBe(true);

    // Verifica que existem pares de laços disjuntos (L1 = -G1*H1 e L2 = -G2*H2)
    const masonR = runMasonForInputTargetPair(multiInputGraph, 'r1', 'y1');
    expect(masonR.loops).toHaveLength(2);
    expect(masonR.disjointPairs).toHaveLength(1);
  });

  it('Teste 6 (Obrigatório): deve permitir arrastar segmentos horizontais, verticais e dobras/vértices livremente sem travar por colisão com obstáculos', () => {
    const src: DiagramElement = { id: 'g1', type: 'block', name: 'G1(s)', x: 200, y: 220 };
    const obs: DiagramElement = { id: 'obs', type: 'block', name: 'OBS', x: 350, y: 280 };
    const tgt: DiagramElement = { id: 's1', type: 'summer', name: 'S1', x: 500, y: 220 };
    const conn = { id: 'c_fb', from: 'g1', to: 's1', fromPort: 'S', toPort: 'S', sign: '-' as const };

    const initialRoute = computeSmartConnectionPath(src, tgt, conn, 0, 1, [src, obs, tgt]);
    const horizSeg = initialRoute.segments.find(s => s.orientation === 'horizontal')!;
    expect(horizSeg).toBeDefined();

    // Mesmo movendo para Y = 280 (onde está o obstáculo), o ajuste manual do usuário NÃO deve travar
    const movedOverObs = moveConnectionSegment(
      initialRoute.points,
      horizSeg.index,
      280,
      [src, obs, tgt],
      'g1',
      's1'
    );
    expect(movedOverObs.some(p => p.y === 280)).toBe(true);

    // E ao mover uma dobra/vértice intermediário (moveConnectionCorner), preserva a ortogonalidade na grade de 20px
    const cornerMoved = moveConnectionCorner(movedOverObs, 1, { x: 204, y: 342 });
    expect(cornerMoved.some(p => p.y === 340)).toBe(true);
    for (let i = 0; i < cornerMoved.length - 1; i++) {
      const a = cornerMoved[i];
      const b = cornerMoved[i + 1];
      expect(Math.abs(a.x - b.x) < 1 || Math.abs(a.y - b.y) < 1).toBe(true);
    }
  });
});
