import { describe, it, expect } from 'vitest';
import { parseRatExpr } from '../src/core/algebra/parser';
import { analyzeTransferFunction, checkRouthHurwitz } from '../src/core/analysis/stability';

describe('Análise de Estabilidade, Polos e Parâmetros Canônicos', () => {
  it('deve analisar sistema de 1ª ordem estável: G(s) = 4 / (s + 2)', () => {
    const T = parseRatExpr('4/(s+2)');
    const analysis = analyzeTransferFunction(T);

    expect(analysis.isStable).toBe(true);
    expect(analysis.order).toBe(1);
    expect(analysis.systemType).toBe(0);
    expect(analysis.dcGain).toBe(2);
    expect(analysis.poles).toEqual([{ re: -2, im: 0 }]);
  });

  it('deve analisar sistema de 2ª ordem subamortecido: G(s) = 5 / (s^2 + 2s + 5)', () => {
    const T = parseRatExpr('5/(s^2 + 2s + 5)');
    const analysis = analyzeTransferFunction(T);

    expect(analysis.isStable).toBe(true);
    expect(analysis.order).toBe(2);
    expect(analysis.dcGain).toBe(1);
    expect(analysis.secondOrderParams).toBeDefined();
    expect(analysis.secondOrderParams!.regime).toBe('Subamortecido');
    expect(analysis.secondOrderParams!.wn).toBeCloseTo(Math.sqrt(5), 3);
    expect(analysis.secondOrderParams!.zeta).toBeCloseTo(2 / (2 * Math.sqrt(5)), 3);
    expect(analysis.secondOrderParams!.ts2Percent).toBeCloseTo(4, 2);

    // Polos em -1 +- 2j
    expect(analysis.poles.some(p => p.re === -1 && Math.abs(p.im) === 2)).toBe(true);
  });

  it('deve identificar polo na origem e Sistema Tipo 1 (Simulação 02)', () => {
    const T = parseRatExpr('20/(s^2 + 5s)');
    const analysis = analyzeTransferFunction(T);

    expect(analysis.isStable).toBe(false);
    expect(analysis.systemType).toBe(1);
    expect(analysis.dcGain).toBeNull();
    expect(analysis.stabilityText).toContain('Marginalmente Estável');
  });

  it('deve detectar instabilidade pelo Critério de Routh-Hurwitz: D(s) = s^3 + s^2 + 2s + 24', () => {
    // Linha de s^1 na tabela de Routh: (1*2 - 1*24) / 1 = -22 < 0 => Instável
    const routh = checkRouthHurwitz([1, 1, 2, 24]);
    expect(routh.isStable).toBe(false);
  });
});
