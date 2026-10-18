import { describe, it, expect } from 'vitest';
import {
  polyFromNumber,
  polyFromVar,
  polyAdd,
  polySub,
  polyMul,
  polyToLatex,
  polyToCompact,
  polyEqual,
  gcdUni,
  divUni
} from '../src/core/algebra/polynomial';

import {
  ratAdd,
  ratSub,
  ratMul,
  ratDiv,
  ratFeedback,
  ratToLatex,
  ratToCompactParts,
  ratEval,
  ratOne
} from '../src/core/algebra/rational';

import { parseRatExpr } from '../src/core/algebra/parser';

describe('Motor Algébrico de Polinômios', () => {
  it('deve somar e subtrair polinômios corretamente', () => {
    // (s + 2) + (2s + 3) = 3s + 5
    const p1 = polyAdd(polyFromVar('s'), polyFromNumber(2));
    const p2 = polyAdd(polyMul(polyFromNumber(2), polyFromVar('s')), polyFromNumber(3));
    const sum = polyAdd(p1, p2);
    expect(polyToCompact(sum)).toBe('3s + 5');

    const diff = polySub(p2, p1);
    expect(polyToCompact(diff)).toBe('s + 1');
  });

  it('deve multiplicar polinômios distributivamente', () => {
    // (s + 1) * (s + 2) = s^2 + 3s + 2
    const p1 = polyAdd(polyFromVar('s'), polyFromNumber(1));
    const p2 = polyAdd(polyFromVar('s'), polyFromNumber(2));
    const prod = polyMul(p1, p2);
    expect(polyToCompact(prod)).toBe('s^2 + 3s + 2');
  });

  it('deve executar divisão euclidiana de polinômios', () => {
    // (s^2 + 3s + 2) / (s + 1) = s + 2, resto 0
    const A = [2, 3, 1]; // 2 + 3s + s^2
    const B = [1, 1];    // 1 + s
    const res = divUni(A, B);
    expect(res).not.toBeNull();
    expect(res!.quot).toEqual([2, 1]); // s + 2
    expect(res!.rem.every(c => Math.abs(c) < 1e-8)).toBe(true);
  });

  it('deve calcular o MDC polinomial entre (s+1)(s+2) e (s+1)(s+3)', () => {
    // A = s^2 + 3s + 2 = (s+1)(s+2)
    // B = s^2 + 4s + 3 = (s+1)(s+3)
    // MDC = s + 1
    const A = [2, 3, 1];
    const B = [3, 4, 1];
    const g = gcdUni(A, B);
    // lead is 1, so [1, 1] means s + 1
    expect(g).toEqual([1, 1]);
  });
});

describe('Motor de Funções Racionais e Topologias Canônicas', () => {
  it('deve calcular a associação em cascata (Simulação 01): G1 * G2', () => {
    const G1 = parseRatExpr('4/(s+1)');
    const G2 = parseRatExpr('5/(s+2)');
    const Geq = ratMul(G1, G2);

    expect(polyToCompact(Geq.num)).toBe('20');
    expect(polyToCompact(Geq.den)).toBe('s^2 + 3s + 2');
    expect(ratToLatex(Geq)).toBe('\\frac{20}{s^{2} + 3s + 2}');
  });

  it('deve calcular a associação em paralelo (Simulação 06): G1 + G2 com MMC', () => {
    const G1 = parseRatExpr('6/(s+2)');
    const G2 = parseRatExpr('3/(s+4)');
    const Geq = ratAdd(G1, G2);

    // 6(s+4) + 3(s+2) = 6s + 24 + 3s + 6 = 9s + 30
    // (s+2)(s+4) = s^2 + 6s + 8
    expect(polyToCompact(Geq.num)).toBe('9s + 30');
    expect(polyToCompact(Geq.den)).toBe('s^2 + 6s + 8');
  });

  it('deve calcular a malha fechada clássica com realimentação negativa (Simulação 11): G / (1 + GH)', () => {
    const G = parseRatExpr('10/(s+2)');
    const H = parseRatExpr('1');
    const T = ratFeedback(G, H, '-');

    // 10 / (s + 2 + 10) = 10 / (s + 12)
    expect(polyToCompact(T.num)).toBe('10');
    expect(polyToCompact(T.den)).toBe('s + 12');
  });

  it('deve calcular malha fechada com dinâmica no retorno (Simulação 13): G=8/(s+3), H=2/(s+1)', () => {
    const G = parseRatExpr('8/(s+3)');
    const H = parseRatExpr('2/(s+1)');
    const T = ratFeedback(G, H, '-');

    // G/(1+GH) = [8(s+1)] / [(s+3)(s+1) + 16] = (8s + 8) / (s^2 + 4s + 19)
    expect(polyToCompact(T.num)).toBe('8s + 8');
    expect(polyToCompact(T.den)).toBe('s^2 + 4s + 19');
  });

  it('deve calcular realimentação positiva regenerativa (Simulação 14): G=4/(s+5), H=0.5', () => {
    const G = parseRatExpr('4/(s+5)');
    const H = parseRatExpr('0.5'); // ou 1/2
    const T = ratFeedback(G, H, '+');

    // 4 / [ (s+5) - 4*0.5 ] = 4 / (s + 3)
    expect(polyToCompact(T.num)).toBe('4');
    expect(polyToCompact(T.den)).toBe('s + 3');
  });

  it('deve simplificar cancelamentos de fatores comuns automaticamente', () => {
    // (s+1)/(s^2 + 3s + 2) = 1/(s+2)
    const expr = parseRatExpr('(s+1)/(s^2 + 3s + 2)');
    expect(polyToCompact(expr.num)).toBe('1');
    expect(polyToCompact(expr.den)).toBe('s + 2');
  });

  it('deve avaliar a resposta numérica em frequência s=0 (Ganho DC)', () => {
    // T(s) = 20 / (s^2 + 3s + 2) => T(0) = 20 / 2 = 10
    const T = parseRatExpr('20/(s^2 + 3s + 2)');
    expect(ratEval(T, 0)).toBe(10);
  });
});
