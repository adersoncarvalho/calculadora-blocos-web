import { describe, it, expect } from 'vitest';
import { calculateCompensator, CompensatorInputs } from '../src/features/compensator/compensatorEngine';

describe('Compensator Design Engine (EEL6005 / Aula 18 & Aula 19)', () => {
  // =========================================================================
  // CASO DE TESTE AULA 18 - PD REAL
  // =========================================================================
  const aula18Inputs: CompensatorInputs = {
    type: 'lead',
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    plant: {
      num: [1],
      den: [1, 3, 0],
      label: '1 / [s(s+3)]'
    }
  };

  it('calcula corretamente o polo desejado sd = -3 ± j3 a partir de Tp e PO%', () => {
    const res = calculateCompensator(aula18Inputs);
    expect(res.zeta).toBeCloseTo(0.707, 2);
    expect(res.wn).toBeCloseTo(4.242, 2);
    expect(res.wd).toBeCloseTo(3.0, 1);
    expect(res.sigmaD).toBeCloseTo(3.0, 1);
    expect(res.sd.re).toBeCloseTo(-3.0, 1);
    expect(res.sd.im).toBeCloseTo(3.0, 1);
  });

  it('determina a deficiência angular da planta em +45°', () => {
    const res = calculateCompensator(aula18Inputs);
    expect(res.theta1).toBeCloseTo(135.0, 1);
    expect(res.theta2).toBeCloseTo(90.0, 1);
    expect(res.thetaPlanta).toBeCloseTo(-225.0, 1);
    expect(res.phiDef).toBeCloseTo(45.0, 1);
  });

  it('determina as raízes de zc e seleciona a maior raiz zc ≈ 5.714 e pc ≈ 62.85', () => {
    const res = calculateCompensator(aula18Inputs);
    expect(res.r).toBe(11);
    expect(res.zc).toBeCloseTo(5.7136, 2);
    expect(res.pc).toBeCloseTo(62.8496, 1);
  });

  it('calcula o ganho Kc ≈ 188.55 e os parâmetros industriais Kp ≈ 17.14 e Td ≈ 0.159s', () => {
    const res = calculateCompensator(aula18Inputs);
    expect(res.Kc).toBeCloseTo(188.55, 0);
    expect(res.Kp).toBeCloseTo(17.14, 1);
    expect(res.Td).toBeCloseTo(0.1591, 3);
  });

  it('calcula a resposta ao degrau com pré-filtro atingindo Mp ≈ 4.3% e atenuação de u(t)', () => {
    const res = calculateCompensator(aula18Inputs);
    expect(res.simulation.Mp_withFilter).toBeCloseTo(4.3, 0);
    expect(res.simulation.tp_withFilter).toBeCloseTo(1.06, 1);
    expect(res.simulation.uMax_withFilter).toBeLessThan(res.Kc);
  });

  it('gera script Scilab válido contendo as funções e parâmetros da Aula 18', () => {
    const res = calculateCompensator(aula18Inputs);
    expect(res.scilabScript).toContain('sd1 = -3 + 3*%i;');
    expect(res.scilabScript).toContain('N = 10');
    expect(res.scilabScript).toContain('csim("step"');
  });

  // =========================================================================
  // CASO DE TESTE AULA 19 - CONTROLADOR PI (EXEMPLO 1)
  // G(s) = 1/[(s+1)(s+5)], sd = -3 + j3, zeta = 0.707
  // =========================================================================
  it('Aula 19 - Exemplo 1: calcula corretamente K0, eP, phi=10°, zi=0.899 e Kc=15.06', () => {
    const inputsEx1: CompensatorInputs = {
      type: 'pi',
      Tp: 1.047,
      PO: 4.32,
      N: 10,
      R1: 47e3,
      plant: {
        num: [1],
        den: [1, 6, 5], // (s+1)(s+5) = s^2 + 6s + 5
        label: '1 / [(s+1)(s+5)]',
        poles: [-1, -5]
      }
    };

    const res = calculateCompensator(inputsEx1);
    expect(res.piDetails).toBeDefined();
    if (res.piDetails) {
      expect(res.piDetails.K0).toBeCloseTo(13.0, 1);
      expect(res.piDetails.Ka).toBeCloseTo(2.6, 1);
      expect(res.piDetails.eP).toBeCloseTo(0.278, 2);
      expect(res.piDetails.phiBudgetDeg).toBe(10);
      expect(res.piDetails.zi_max).toBeCloseTo(0.899, 2);
      expect(res.piDetails.zi_dipolo).toBeCloseTo(0.909, 2);
      expect(res.piDetails.zi_lim).toBeCloseTo(0.899, 2);
      expect(res.piDetails.limitingFactor).toBe('angulo');
      expect(res.Kc).toBeCloseTo(15.06, 1);
      expect(res.piDetails.R2).toBeCloseTo(708e3, -3);
      expect(res.piDetails.C * 1e6).toBeCloseTo(1.57, 1);
    }
  });

  // =========================================================================
  // CASO DE TESTE AULA 19 - CONTROLADOR PI (EXEMPLO 2 - COM ZERO)
  // G(s) = (s+3)/[(s+0.5)(s+4)(s+6)], sd = -3.97 + j3.98
  // =========================================================================
  it('Aula 19 - Exemplo 2: valida limite do dipolo zi=0.4545, Kc=24.26 e componentes', () => {
    // (s+0.5)(s+4)(s+6) = (s+0.5)(s^2 + 10s + 24) = s^3 + 10.5s^2 + 29s + 12
    const inputsEx2: CompensatorInputs = {
      type: 'pi',
      Tp: 1.0,
      PO: 4.32,
      N: 10,
      R1: 22e3,
      sdManual: { re: -3.97, im: 3.98 },
      plant: {
        num: [1, 3], // s + 3
        den: [1, 10.5, 29, 12],
        label: '(s+3) / [(s+0.5)(s+4)(s+6)]',
        poles: [-0.5, -4, -6],
        zeros: [-3]
      }
    };

    const res = calculateCompensator(inputsEx2);
    expect(res.piDetails).toBeDefined();
    if (res.piDetails) {
      expect(res.piDetails.K0).toBeCloseTo(22.92, 1);
      expect(res.piDetails.Ka).toBeCloseTo(5.73, 1);
      expect(res.piDetails.eP).toBeCloseTo(0.149, 2);
      expect(res.piDetails.phiBudgetDeg).toBe(10);
      expect(res.piDetails.zi_max).toBeCloseTo(1.191, 2);
      expect(res.piDetails.zi_dipolo).toBeCloseTo(0.4545, 2);
      expect(res.piDetails.zi_lim).toBeCloseTo(0.4545, 2);
      expect(res.piDetails.limitingFactor).toBe('dipolo');
      expect(res.Kc).toBeCloseTo(24.26, 1);
      expect(res.piDetails.R2).toBeCloseTo(534e3, -3);
      expect(res.piDetails.C * 1e6).toBeCloseTo(4.12, 1);
    }
  });

  // =========================================================================
  // CASO DE TESTE AULA 19 - EXERCÍCIO PROPOSTO A
  // G(s) = 1/[(s+0.1)(s+10)], sd = -5.05 + j5.05
  // =========================================================================
  it('Aula 19 - Exercício A: valida phi=5°, zi=0.0909 e Kc=50.46', () => {
    // (s+0.1)(s+10) = s^2 + 10.1s + 1
    const inputsPropA: CompensatorInputs = {
      type: 'pi',
      Tp: 1.0,
      PO: 4.32,
      N: 10,
      R1: 10e3,
      sdManual: { re: -5.05, im: 5.05 },
      plant: {
        num: [1],
        den: [1, 10.1, 1],
        label: '1 / [(s+0.1)(s+10)]',
        poles: [-0.1, -10]
      }
    };

    const res = calculateCompensator(inputsPropA);
    expect(res.piDetails).toBeDefined();
    if (res.piDetails) {
      expect(res.piDetails.K0).toBeCloseTo(50.0, 0);
      expect(res.piDetails.Ka).toBeCloseTo(50.0, 0);
      expect(res.piDetails.eP).toBeCloseTo(0.0196, 3);
      expect(res.piDetails.phiBudgetDeg).toBe(5);
      expect(res.piDetails.zi_lim).toBeCloseTo(0.0909, 2);
      expect(res.Kc).toBeCloseTo(50.46, 1);
    }
  });
});
