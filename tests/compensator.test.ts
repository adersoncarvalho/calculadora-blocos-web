import { describe, it, expect } from 'vitest';
import { calculateCompensator, CompensatorInputs } from '../src/features/compensator/compensatorEngine';

describe('Compensator Design Engine (EEL6005 / Aula 18)', () => {
  const baseInputs: CompensatorInputs = {
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
    const res = calculateCompensator(baseInputs);
    expect(res.zeta).toBeCloseTo(0.707, 2);
    expect(res.wn).toBeCloseTo(4.242, 2);
    expect(res.wd).toBeCloseTo(3.0, 1);
    expect(res.sigmaD).toBeCloseTo(3.0, 1);
    expect(res.sd.re).toBeCloseTo(-3.0, 1);
    expect(res.sd.im).toBeCloseTo(3.0, 1);
  });

  it('determina a deficiência angular da planta em +45°', () => {
    const res = calculateCompensator(baseInputs);
    expect(res.theta1).toBeCloseTo(135.0, 1);
    expect(res.theta2).toBeCloseTo(90.0, 1);
    expect(res.thetaPlanta).toBeCloseTo(-225.0, 1);
    expect(res.phiDef).toBeCloseTo(45.0, 1);
  });

  it('determina as raízes de zc e seleciona a maior raiz zc ≈ 5.714 e pc ≈ 62.85', () => {
    const res = calculateCompensator(baseInputs);
    expect(res.r).toBe(11);
    expect(res.zc).toBeCloseTo(5.7136, 2);
    expect(res.pc).toBeCloseTo(62.8496, 1);
  });

  it('calcula o ganho Kc ≈ 188.55 e os parâmetros industriais Kp ≈ 17.14 e Td ≈ 0.159s', () => {
    const res = calculateCompensator(baseInputs);
    expect(res.Kc).toBeCloseTo(188.55, 0);
    expect(res.Kp).toBeCloseTo(17.14, 1);
    expect(res.Td).toBeCloseTo(0.1591, 3);
  });

  it('calcula a resposta ao degrau com pré-filtro atingindo Mp ≈ 4.3% e atenuação de u(t)', () => {
    const res = calculateCompensator(baseInputs);
    expect(res.simulation.Mp_withFilter).toBeCloseTo(4.3, 0);
    expect(res.simulation.tp_withFilter).toBeCloseTo(1.06, 1);
    expect(res.simulation.uMax_withFilter).toBeLessThan(res.Kc);
  });

  it('gera script Scilab válido contendo as funções e parâmetros da Aula 18', () => {
    const res = calculateCompensator(baseInputs);
    expect(res.scilabScript).toContain('sd1 = -3 + 3*%i;');
    expect(res.scilabScript).toContain('N = 10');
    expect(res.scilabScript).toContain('csim("step"');
  });
});
