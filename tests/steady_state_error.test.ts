import { describe, it, expect } from 'vitest';
import {
  parseTimeDomainSignal,
  parseLaplaceDomainSignal,
  identifySystemType,
  computeStaticErrorConstants,
  evaluateFinalValueTheorem,
  analyzeSteadyStateAndError,
  buildComparisonTable
} from '../src/features/builder/steadyStateAnalysisEngine';
import { parseRatExpr } from '../src/core/algebra/parser';
import { ratSimplify, ratToLatex, ratOne, ratZero } from '../src/core/algebra/rational';
import { polyToCompact, polyEqual } from '../src/core/algebra/polynomial';

describe('Análise de Regime Permanente e Erro Estacionário (TVF)', () => {
  // =========================================================================
  // CASO DE TESTE OBRIGATÓRIO (ENUNCIADO DO USUÁRIO):
  // G(s) = 100*(s+2)*(s+6) / [s*(s+3)*(s+4)]
  // Realimentação negativa unitária (H = 1)
  // Entrada parabólica r(t) = 5*t^2 => R(s) = 10/s^3
  // =========================================================================
  it('1. Deve validar com exatidão o caso de teste obrigatório da planta com realimentação unitária', () => {
    // G(s) = 100*(s+2)*(s+6) / (s*(s+3)*(s+4))
    // Numerador: 100*(s^2 + 8s + 12) = 100s^2 + 800s + 1200
    // Denominador: s*(s^2 + 7s + 12) = s^3 + 7s^2 + 12s
    const G = parseRatExpr('(100*s^2 + 800*s + 1200) / (s^3 + 7*s^2 + 12*s)');

    // Malha Fechada: T(s) = G(s) / (1 + G(s))
    // Denominador de malha fechada = (s^3 + 7s^2 + 12s) + (100s^2 + 800s + 1200)
    // = s^3 + 107s^2 + 812s + 1200
    const T = parseRatExpr('(100*s^2 + 800*s + 1200) / (s^3 + 107*s^2 + 812*s + 1200)');

    // Relação de Erro: E(s)/R(s) = 1 / (1 + G(s)) = 1 - T(s)
    // = (s^3 + 7s^2 + 12s) / (s^3 + 107s^2 + 812s + 1200)
    const expectedEoverR = parseRatExpr('(s^3 + 7*s^2 + 12*s) / (s^3 + 107*s^2 + 812*s + 1200)');

    // Executar análise com entrada parabólica r(t) = 5*t^2 (A = 5)
    const reportParabola = analyzeSteadyStateAndError(
      T,
      G, // malha aberta G
      expectedEoverR,
      {
        type: 'parabola',
        amplitude: 5,
        customExpr: '5*t^2',
        customDomain: 'time'
      }
    );

    // 1.1 Verificar identificação do tipo do sistema (Tipo 1 com integrador na origem)
    expect(reportParabola.systemType).toBe(1);
    expect(reportParabola.systemTypeJustification).toContain('1 polo puro na origem');

    // 1.2 Verificar constantes de erro estático
    // Kp = infinito
    expect(reportParabola.kpLatex).toBe('\\infty');
    // Kv = lim s->0 s*G(s) = 1200 / 12 = 100
    expect(reportParabola.kvValue).toBe(100);
    expect(reportParabola.kvLatex).toBe('100');
    // Ka = 0
    expect(reportParabola.kaValue).toBe(0);

    // 1.3 Verificar relação E(s)/R(s)
    expect(polyToCompact(reportParabola.errorTf.num)).toBe('s^3 + 7s^2 + 12s');
    expect(polyToCompact(reportParabola.errorTf.den)).toBe('s^3 + 107s^2 + 812s + 1200');

    // 1.4 Verificar sinal de entrada R(s) = 10/s^3
    expect(reportParabola.referenceLaplaceLatex).toContain('10');
    expect(reportParabola.referenceLaplaceLatex).toContain('s^3');

    // 1.5 Verificar sinal de erro E(s) = 10*(s^2 + 7s + 12) / [s^2 * (s^3 + 107s^2 + 812s + 1200)]
    // Ao multiplicar (s^3 + 7s^2 + 12s) * (10 / s^3), cancela-se um 's':
    // Numerador: 10*(s^2 + 7s + 12) = 10s^2 + 70s + 120
    // Denominador: s^2 * (s^3 + 107s^2 + 812s + 1200) = s^5 + 107s^4 + 812s^3 + 1200s^2
    expect(polyToCompact(reportParabola.errorSignal.num)).toBe('10s^2 + 70s + 120');
    expect(polyToCompact(reportParabola.errorSignal.den)).toBe('s^5 + 107s^4 + 812s^3 + 1200s^2');

    // 1.6 Verificar s * E(s)
    // s * E(s) = 10*(s^2 + 7s + 12) / [s * (s^3 + 107s^2 + 812s + 1200)]
    expect(polyToCompact(reportParabola.sTimesError.num)).toBe('10s^2 + 70s + 120');
    expect(polyToCompact(reportParabola.sTimesError.den)).toBe('s^4 + 107s^3 + 812s^2 + 1200s');

    // 1.7 Verificar aplicação do Teorema do Valor Final: e_ss = infinito
    expect(reportParabola.essClassification).toBe('infinite');
    expect(reportParabola.essLatex).toBe('e_{ss} = \\infty');
    expect(reportParabola.isTvfApplicable).toBe(true); // O sistema em malha fechada é estável
  });

  it('2. Deve calcular e_ss = 0 para entrada em degrau e e_ss = 0.02 para entrada em rampa na mesma planta', () => {
    const G = parseRatExpr('(100*s^2 + 800*s + 1200) / (s^3 + 7*s^2 + 12*s)');
    const T = parseRatExpr('(100*s^2 + 800*s + 1200) / (s^3 + 107*s^2 + 812*s + 1200)');
    const EoverR = parseRatExpr('(s^3 + 7*s^2 + 12*s) / (s^3 + 107*s^2 + 812*s + 1200)');

    // 2.1 Entrada em degrau: r(t) = 5*u(t) (A = 5)
    const reportStep = analyzeSteadyStateAndError(T, G, EoverR, {
      type: 'step',
      amplitude: 5,
      customExpr: '5',
      customDomain: 'time'
    });
    expect(reportStep.essClassification).toBe('zero');
    expect(reportStep.essLatex).toBe('e_{ss} = 0');
    expect(reportStep.essValue).toBe(0);

    // 2.2 Entrada em rampa: r(t) = 2*t*u(t) (A = 2)
    // e_ss = A / Kv = 2 / 100 = 0.02
    const reportRamp = analyzeSteadyStateAndError(T, G, EoverR, {
      type: 'ramp',
      amplitude: 2,
      customExpr: '2*t',
      customDomain: 'time'
    });
    expect(reportRamp.essClassification).toBe('finite');
    expect(reportRamp.essValue).toBeCloseTo(0.02, 5);
    expect(reportRamp.essLatex).toBe('e_{ss} = 0.02');
  });

  // =========================================================================
  // TESTES DE ENTRADAS PERSONALIZADAS E PARSER TEMPORAL/LAPLACE
  // =========================================================================
  describe('Parser de Entradas Temporais e Domínio de Laplace', () => {
    it('deve converter polinômios em t para Laplace corretamente', () => {
      // 3t + 2 => 3/s^2 + 2/s = (2s + 3)/s^2
      const res1 = parseTimeDomainSignal('3*t + 2');
      expect(res1.isRecognized).toBe(true);
      expect(polyToCompact(res1.rat.num)).toBe('2s + 3');
      expect(polyToCompact(res1.rat.den)).toBe('s^2');

      // 4t^2 + 2t => 8/s^3 + 2/s^2 = (2s + 8)/s^3
      const res2 = parseTimeDomainSignal('4*t^2 + 2*t');
      expect(res2.isRecognized).toBe(true);
      expect(polyToCompact(res2.rat.num)).toBe('2s + 8');
      expect(polyToCompact(res2.rat.den)).toBe('s^3');
    });

    it('deve converter exponenciais para Laplace corretamente', () => {
      // 5*e^(-2t) => 5 / (s + 2)
      const res = parseTimeDomainSignal('5*e^(-2t)');
      expect(res.isRecognized).toBe(true);
      expect(polyToCompact(res.rat.num)).toBe('5');
      expect(polyToCompact(res.rat.den)).toBe('s + 2');
    });

    it('deve converter senoides e cossenos para Laplace', () => {
      // 2*sin(3t) => 2*3 / (s^2 + 9) = 6 / (s^2 + 9)
      const resSin = parseTimeDomainSignal('2*sin(3*t)');
      expect(resSin.isRecognized).toBe(true);
      expect(polyToCompact(resSin.rat.num)).toBe('6');
      expect(polyToCompact(resSin.rat.den)).toBe('s^2 + 9');

      // 3*cos(4t) => 3s / (s^2 + 16)
      const resCos = parseTimeDomainSignal('3*cos(4*t)');
      expect(resCos.isRecognized).toBe(true);
      expect(polyToCompact(resCos.rat.num)).toBe('3s');
      expect(polyToCompact(resCos.rat.den)).toBe('s^2 + 16');
    });

    it('deve interpretar expressões diretas de Laplace R(s)', () => {
      const resLaplace = parseLaplaceDomainSignal('10/s^3');
      expect(resLaplace.isRecognized).toBe(true);
      expect(polyToCompact(resLaplace.rat.num)).toBe('10');
      expect(polyToCompact(resLaplace.rat.den)).toBe('s^3');
    });
  });

  // =========================================================================
  // TESTES DE SUPERPOSIÇÃO: PERTURBAÇÃO D(s) E RUÍDO N(s)
  // =========================================================================
  describe('Superposição com Perturbação e Ruído', () => {
    it('deve analisar separadamente perturbação e ruído respeitando a superposição', () => {
      const T = parseRatExpr('10 / (s + 10)');
      const G = parseRatExpr('10 / s');
      const EoverR = parseRatExpr('s / (s + 10)');

      // Perturbação D(s): C(s)/D(s) = 2 / (s + 10)
      const distTf = parseRatExpr('2 / (s + 10)');

      // Ruído N(s): C(s)/N(s) = -10 / (s + 10)
      const noiseTf = parseRatExpr('-10 / (s + 10)');

      const report = analyzeSteadyStateAndError(
        T,
        G,
        EoverR,
        { type: 'step', amplitude: 1, customExpr: '1', customDomain: 'time' },
        { tf: distTf, name: 'Perturbação de Carga D(s)' },
        { tf: noiseTf, name: 'Ruído no Sensor N(s)' }
      );

      expect(report.disturbanceAnalysis).not.toBeNull();
      expect(report.disturbanceAnalysis?.sourceSymbol).toBe('D(s)');
      expect(report.disturbanceAnalysis?.essValue).toBeCloseTo(-0.2, 3); // -T_D(0)*D0 = -2/10 = -0.2

      expect(report.noiseAnalysis).not.toBeNull();
      expect(report.noiseAnalysis?.sourceSymbol).toBe('N(s)');
      expect(report.noiseAnalysis?.essValue).toBeCloseTo(1, 3); // -T_N(0)*N0 = -(-10/10) = 1.0

      expect(report.superpositionTotalEssLatex).toContain('efeito de D');
      expect(report.superpositionTotalEssLatex).toContain('efeito de N');
    });
  });

  // =========================================================================
  // TESTES DE TABELA COMPARATIVA E SCRIPTS SCILAB
  // =========================================================================
  describe('Tabela Comparativa e Geração Scilab', () => {
    it('deve montar a tabela comparativa com as 3 entradas padrão e interpretação correta', () => {
      const table = buildComparisonTable(1, '\\infty', '100', '0', 2);
      expect(table).toHaveLength(3);
      expect(table[0].inputName).toContain('Degrau');
      expect(table[0].essLatex).toBe('0');
      expect(table[1].inputName).toContain('Rampa');
      expect(table[1].essLatex).toContain('100');
      expect(table[2].inputName).toContain('Parábola');
      expect(table[2].essLatex).toBe('\\infty');
    });

    it('deve gerar código Scilab complementar executável', () => {
      const T = parseRatExpr('10 / (s^2 + 3*s + 10)');
      const EoverR = parseRatExpr('(s^2 + 3*s) / (s^2 + 3*s + 10)');
      const report = analyzeSteadyStateAndError(T, null, EoverR, {
        type: 'ramp',
        amplitude: 2,
        customExpr: '2*t',
        customDomain: 'time'
      });

      expect(report.scilabSnippet).toContain("s = poly(0, 's');");
      expect(report.scilabSnippet).toContain('csim');
      expect(report.scilabSnippet).toContain('e_t = r_t - c_t;');
      expect(report.scilabSnippet).toContain('subplot');
    });
  });
});
