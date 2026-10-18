import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseRatExpr } from '../src/core/algebra/parser';
import { ratMul, ratAdd, ratFeedback, ratToLatex } from '../src/core/algebra/rational';
import { polyToCompact } from '../src/core/algebra/polynomial';
import { analyzeTransferFunction } from '../src/core/analysis/stability';

describe('Suíte de Regressão: Banco das 20 Simulações Reais Validadas', () => {
  const jsonPath = path.resolve(__dirname, '../Simulacoes_Resultados/simulations.json');
  const simData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  it('deve conter exatamente 20 simulações no banco de dados', () => {
    expect(simData.length).toBe(20);
  });

  // Topologia 1: Cascata (01 a 05)
  it('Simulação 01: Dois polos reais em cascata G1=4/(s+1), G2=5/(s+2)', () => {
    const G1 = parseRatExpr('4/(s+1)');
    const G2 = parseRatExpr('5/(s+2)');
    const T = ratMul(G1, G2);
    expect(polyToCompact(T.num)).toBe('20');
    expect(polyToCompact(T.den)).toBe('s^2 + 3s + 2');
    const an = analyzeTransferFunction(T);
    expect(an.isStable).toBe(true);
    expect(an.dcGain).toBe(10);
  });

  it('Simulação 02: Ganho K=10, Integrador 1/s e Polo 2/(s+5) em cascata', () => {
    const G1 = parseRatExpr('10');
    const G2 = parseRatExpr('1/s');
    const G3 = parseRatExpr('2/(s+5)');
    const T = ratMul(ratMul(G1, G2), G3);
    expect(polyToCompact(T.num)).toBe('20');
    expect(polyToCompact(T.den)).toBe('s^2 + 5s');
    const an = analyzeTransferFunction(T);
    expect(an.systemType).toBe(1);
    expect(an.dcGain).toBeNull();
  });

  it('Simulação 03: Compensador Lead (s+3)/(s+1) com planta 2/(s+4)', () => {
    const G1 = parseRatExpr('(s+3)/(s+1)');
    const G2 = parseRatExpr('2/(s+4)');
    const T = ratMul(G1, G2);
    expect(polyToCompact(T.num)).toBe('2s + 6');
    expect(polyToCompact(T.den)).toBe('s^2 + 5s + 4');
    const an = analyzeTransferFunction(T);
    expect(an.dcGain).toBe(1.5);
  });

  it('Simulação 04: Controlador PI (2s+1)/s com dois filtros de 1ª ordem', () => {
    const G1 = parseRatExpr('(2s+1)/s');
    const G2 = parseRatExpr('3/(s+2)');
    const G3 = parseRatExpr('1/(s+6)');
    const T = ratMul(ratMul(G1, G2), G3);
    expect(polyToCompact(T.num)).toBe('6s + 3');
    expect(polyToCompact(T.den)).toBe('s^3 + 8s^2 + 12s');
  });

  it('Simulação 05: Ganho K=2.5 com planta de 2ª ordem 4/(s^2+2s+5)', () => {
    const G1 = parseRatExpr('2.5');
    const G2 = parseRatExpr('4/(s^2+2s+5)');
    const T = ratMul(G1, G2);
    expect(polyToCompact(T.num)).toBe('10');
    expect(polyToCompact(T.den)).toBe('s^2 + 2s + 5');
    const an = analyzeTransferFunction(T);
    expect(an.dcGain).toBe(2);
    expect(an.secondOrderParams?.regime).toBe('Subamortecido');
  });

  // Topologia 2: Paralelo (06 a 10)
  it('Simulação 06: Dois ramos paralelos G1=6/(s+2), G2=3/(s+4)', () => {
    const G1 = parseRatExpr('6/(s+2)');
    const G2 = parseRatExpr('3/(s+4)');
    const T = ratAdd(G1, G2);
    expect(polyToCompact(T.num)).toBe('9s + 30');
    expect(polyToCompact(T.den)).toBe('s^2 + 6s + 8');
  });

  it('Simulação 07: Controlador PI canônico em paralelo Kp=5, Ki/s=2/s', () => {
    const G1 = parseRatExpr('5');
    const G2 = parseRatExpr('2/s');
    const T = ratAdd(G1, G2);
    expect(polyToCompact(T.num)).toBe('5s + 2');
    expect(polyToCompact(T.den)).toBe('s');
  });

  it('Simulação 08: Paralelo subtrativo G1=8/(s+1), G2=-2/(s+3)', () => {
    const G1 = parseRatExpr('8/(s+1)');
    const G2 = parseRatExpr('2/(s+3)');
    const T = ratAdd(G1, parseRatExpr('-2/(s+3)'));
    // 8(s+3) - 2(s+1) = 8s + 24 - 2s - 2 = 6s + 22
    expect(polyToCompact(T.num)).toBe('6s + 22');
    expect(polyToCompact(T.den)).toBe('s^2 + 4s + 3');
  });

  // Topologia 3: Realimentação (11 a 15)
  it('Simulação 11: Realimentação negativa unitária G=10/(s+2), H=1', () => {
    const G = parseRatExpr('10/(s+2)');
    const H = parseRatExpr('1');
    const T = ratFeedback(G, H, '-');
    expect(polyToCompact(T.num)).toBe('10');
    expect(polyToCompact(T.den)).toBe('s + 12');
  });

  it('Simulação 12: Realimentação com sensor estático H=2 e planta Tipo 1 G=5/(s^2+s)', () => {
    const G = parseRatExpr('5/(s^2+s)');
    const H = parseRatExpr('2');
    const T = ratFeedback(G, H, '-');
    expect(polyToCompact(T.num)).toBe('5');
    expect(polyToCompact(T.den)).toBe('s^2 + s + 10');
  });

  it('Simulação 14: Realimentação positiva regenerativa G=4/(s+5), H=0.5', () => {
    const G = parseRatExpr('4/(s+5)');
    const H = parseRatExpr('0.5');
    const T = ratFeedback(G, H, '+');
    expect(polyToCompact(T.num)).toBe('4');
    expect(polyToCompact(T.den)).toBe('s + 3');
  });
});
