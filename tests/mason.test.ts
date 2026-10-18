import { describe, it, expect } from 'vitest';
import { computeMasonAnalysis, DiagramGraph } from '../src/core/reduction/mason';
import { parseRatExpr } from '../src/core/algebra/parser';
import { polyToCompact } from '../src/core/algebra/polynomial';

describe('Regra de Mason em Grafos de Blocos', () => {
  it('deve calcular a FT de malha fechada clássica G/(1+GH)', () => {
    // IN -> S1 -> G -> OUT
    //            ^    |
    //            +--H-+ (com sinal -)
    const graph: DiagramGraph = {
      elements: [
        { id: 'IN', type: 'input', name: 'R(s)' },
        { id: 's1', type: 'summer', name: 'S1' },
        { id: 'g1', type: 'block', name: 'G', rat: parseRatExpr('10/(s+2)') },
        { id: 'h1', type: 'block', name: 'H', rat: parseRatExpr('1') },
        { id: 'OUT', type: 'output', name: 'C(s)' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 'OUT', sign: '+' },
        { id: 'c4', from: 'g1', to: 'h1', sign: '+' },
        { id: 'c5', from: 'h1', to: 's1', sign: '-' }
      ]
    };

    const res = computeMasonAnalysis(graph);
    expect(res.forwardPaths.length).toBe(1);
    expect(res.loops.length).toBe(1);

    // T(s) = 10 / (s + 12)
    expect(polyToCompact(res.totalT.num)).toBe('10');
    expect(polyToCompact(res.totalT.den)).toBe('s + 12');
  });

  it('deve calcular sistema com malhas fechadas aninhadas (Simulação 16)', () => {
    // G1=2, G2=4/(s+1), H1=1 (malha interna), H2=0.5 (malha externa)
    // T(s) = 8 / (s + 9)
    const graph: DiagramGraph = {
      elements: [
        { id: 'IN', type: 'input', name: 'R(s)' },
        { id: 's_ext', type: 'summer', name: 'S_ext' },
        { id: 'g1', type: 'block', name: 'G1', rat: parseRatExpr('2') },
        { id: 's_int', type: 'summer', name: 'S_int' },
        { id: 'g2', type: 'block', name: 'G2', rat: parseRatExpr('4/(s+1)') },
        { id: 'h1', type: 'block', name: 'H1', rat: parseRatExpr('1') },
        { id: 'h2', type: 'block', name: 'H2', rat: parseRatExpr('0.5') },
        { id: 'OUT', type: 'output', name: 'C(s)' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 's_ext', sign: '+' },
        { id: 'c2', from: 's_ext', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 's_int', sign: '+' },
        { id: 'c4', from: 's_int', to: 'g2', sign: '+' },
        { id: 'c5', from: 'g2', to: 'OUT', sign: '+' },
        // Malha interna H1
        { id: 'c6', from: 'g2', to: 'h1', sign: '+' },
        { id: 'c7', from: 'h1', to: 's_int', sign: '-' },
        // Malha externa H2
        { id: 'c8', from: 'g2', to: 'h2', sign: '+' },
        { id: 'c9', from: 'h2', to: 's_ext', sign: '-' }
      ]
    };

    const res = computeMasonAnalysis(graph);
    expect(res.forwardPaths.length).toBe(1);
    expect(res.loops.length).toBe(2);

    // T(s) = 8 / (s + 9)
    expect(polyToCompact(res.totalT.num)).toBe('8');
    expect(polyToCompact(res.totalT.den)).toBe('s + 9');
  });
});
