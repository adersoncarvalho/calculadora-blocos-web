import { describe, it, expect } from 'vitest';
import { autoLayoutDiagram, computeSmartConnectionPath } from '../src/features/builder/layoutEngine';
import { DiagramGraph } from '../src/core/reduction/mason';

describe('Layout Engine & Orthogonal Routing', () => {
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

  it('deve calcular rota ortogonal válida para conexões de avanço e retorno', () => {
    const src = { id: 'g1', type: 'block' as const, name: 'G1', x: 200, y: 180 };
    const tgt = { id: 's1', type: 'summer' as const, name: 'S1', x: 100, y: 180, dir: 'left' as const };
    const conn = { id: 'c1', from: 'g1', to: 's1', sign: '-' as const };

    const { pathD, signPos } = computeSmartConnectionPath(src, tgt, conn);
    expect(pathD.startsWith('M')).toBe(true);
    expect(signPos).toBeDefined();
  });
});
