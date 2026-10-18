import { describe, it, expect } from 'vitest';
import { normalizeDiagramGraph, SAMPLE_DIAGRAMS } from '../src/features/builder/visionService';
import { computeMasonAnalysis } from '../src/core/reduction/mason';

describe('Vision-to-Diagram Service & Normalizer', () => {
  it('deve normalizar grafo válido preservando nós e sinais de realimentação', () => {
    const raw = {
      elements: [
        { id: 'IN', type: 'input', name: 'R(s)', x: 60, y: 150 },
        { id: 's1', type: 'summer', name: 'S1', x: 180, y: 150 },
        { id: 'g1', type: 'block', name: 'G1', expr: '10/(s+2)', x: 360, y: 150, dir: 'right' },
        { id: 'h1', type: 'block', name: 'H1', expr: '2', x: 360, y: 250, dir: 'left' },
        { id: 'OUT', type: 'output', name: 'C(s)', x: 580, y: 150 }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 'OUT', sign: '+' },
        { id: 'c4', from: 'g1', to: 'h1', sign: '+' },
        { id: 'c5', from: 'h1', to: 's1', sign: '-' }
      ]
    };

    const normalized = normalizeDiagramGraph(raw);
    expect(normalized.elements.length).toBe(5);
    expect(normalized.connections.length).toBe(5);

    // Deve ser processável pelo algoritmo de Mason sem erros
    const analysis = computeMasonAnalysis(normalized);
    expect(analysis.forwardPaths.length).toBe(1);
    expect(analysis.loops.length).toBe(1);
    expect(analysis.totalT).toBeDefined();
    expect(analysis.totalT.num.length).toBeGreaterThan(0);
  });

  it('deve injetar automaticamente nós de IN e OUT se o modelo omitir', () => {
    const raw = {
      elements: [
        { id: 'blk1', type: 'block', name: 'G1', expr: '5/(s+1)', x: 200, y: 150 }
      ],
      connections: []
    };

    const normalized = normalizeDiagramGraph(raw);
    const hasInput = normalized.elements.some(e => e.type === 'input');
    const hasOutput = normalized.elements.some(e => e.type === 'output');

    expect(hasInput).toBe(true);
    expect(hasOutput).toBe(true);
  });

  it('deve validar todos os modelos pré-carregados (samples) com a Regra de Mason', () => {
    expect(SAMPLE_DIAGRAMS.length).toBeGreaterThanOrEqual(2);

    for (const sample of SAMPLE_DIAGRAMS) {
      const normalized = normalizeDiagramGraph(sample.graph);
      const analysis = computeMasonAnalysis(normalized);
      expect(analysis.forwardPaths.length).toBeGreaterThan(0);
      expect(analysis.totalT).toBeDefined();
    }
  });
});
