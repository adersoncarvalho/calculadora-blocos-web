import { describe, it, expect } from 'vitest';
import {
  CONTROLLERS_THEORY,
  CONTROLLER_EXERCISES,
  simulateControllerExercise
} from '../src/features/controllers/controllersData';

describe('Laboratório dos 5 Controladores Principais (P, PI, PD, PID, Fase)', () => {
  it('1. Deve conter exatamente os 5 controladores principais com teoria e roteiro padrão do professor', () => {
    const keys = Object.keys(CONTROLLERS_THEORY);
    expect(keys).toEqual(['P', 'PI', 'PD', 'PID', 'Fase']);
    for (const k of keys) {
      const th = CONTROLLERS_THEORY[k as keyof typeof CONTROLLERS_THEORY];
      expect(th.professorMethodSteps.length).toBeGreaterThanOrEqual(3);
      expect(th.whenToChoose.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('2. Cada um dos 5 controladores deve possuir exercícios dos slides e propostos', () => {
    for (const cat of ['P', 'PI', 'PD', 'PID', 'Fase'] as const) {
      const exs = CONTROLLER_EXERCISES.filter(e => e.controllerId === cat);
      expect(exs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('3. Deve simular todos os exercícios sem erros de execução ou funções impróprias', () => {
    for (const ex of CONTROLLER_EXERCISES) {
      const sim = simulateControllerExercise(ex);
      expect(sim).not.toBeNull();
      expect(sim!.t.length).toBeGreaterThan(50);
      expect(sim!.yComp.every(v => Number.isFinite(v))).toBe(true);
      // Todos os projetos com controlador (com exceção do Ex 3.2 que explicitamente demonstra instabilidade com Gc=1) devem ser estáveis
      if (ex.id !== 'p-ex-3-2') {
        expect(Math.abs(sim!.yComp[sim!.yComp.length - 1])).toBeLessThan(1e4);
      }
    }
  });

  it('4. Deve validar numericamente a redução do erro estacionário nos exercícios de P, PI, PD, PID e Lag/Lead', () => {
    const byId = (id: string) => CONTROLLER_EXERCISES.find(e => e.id === id)!;

    // Ex 1.3: P => ess = 0.10
    const sim13 = simulateControllerExercise(byId('p-ex-1-3'))!;
    expect(Math.abs(sim13.essComp - 0.1)).toBeLessThan(0.01);

    // Ex 2.4: P Tipo 1 rampa => ess = 0.05
    const sim24 = simulateControllerExercise(byId('p-ex-2-4'))!;
    expect(Math.abs(sim24.essComp - 0.05)).toBeLessThan(0.01);

    // Ex 1.4: PI Tipo 0->1 rampa => ess = 0.25
    const sim14 = simulateControllerExercise(byId('pi-ex-1-4'))!;
    expect(Math.abs(sim14.essComp - 0.25)).toBeLessThan(0.01);

    // Ex 2.5: PI Tipo 1->2 parábola => ess = 0.12
    const sim25 = simulateControllerExercise(byId('pi-ex-2-5'))!;
    expect(Math.abs(sim25.essComp - 0.12)).toBeLessThan(0.02);

    // PD Slide LGR: erro nulo ao degrau e %OS ~ 16.3%
    const simPd = simulateControllerExercise(byId('pd-ex-slide-lgr'))!;
    expect(Math.abs(simPd.essComp)).toBeLessThan(0.01);
    expect(simPd.overshootComp!).toBeGreaterThan(12);
    expect(simPd.overshootComp!).toBeLessThan(20);

    // PID Slide LGR: erro nulo ao degrau
    const simPid = simulateControllerExercise(byId('pid-ex-slide'))!;
    expect(Math.abs(simPid.essComp)).toBeLessThan(0.01);

    // Lead Proposto: erro nulo ao degrau e %OS ~ 16.3%
    const simLead = simulateControllerExercise(byId('fase-ex-lead-proposto'))!;
    expect(Math.abs(simLead.essComp)).toBeLessThan(0.01);
  });
});
