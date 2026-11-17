import { describe, it, expect } from 'vitest';
import {
  CONTROLLERS_THEORY,
  CONTROLLER_EXERCISES,
  simulateControllerExercise,
  buildClosedLoopTf,
  simulateInputResponseRK4
} from '../src/features/controllers/controllersData';
import { LISTA_P2_QUESTIONS } from '../src/features/controllers/listaP2Data';
import { parseRatExpr } from '../src/core/algebra/parser';

describe('Laboratório dos 5 Controladores Principais (P, PD, PI, Avanço/Lead, Atraso/Lag)', () => {
  it('1. Deve conter exatamente os 5 controladores separados com teoria e roteiro padrão do professor', () => {
    const keys = Object.keys(CONTROLLERS_THEORY);
    expect(keys).toEqual(['P', 'PI', 'PD', 'Lead', 'Lag']);
    for (const k of keys) {
      const th = CONTROLLERS_THEORY[k as keyof typeof CONTROLLERS_THEORY];
      expect(th.professorMethodSteps.length).toBeGreaterThanOrEqual(3);
      expect(th.whenToChoose.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('2. Cada um dos 5 controladores deve possuir exercícios dos slides e propostos', () => {
    for (const cat of ['P', 'PD', 'PI', 'Lead', 'Lag'] as const) {
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

    // Lead Aula 20 Bissetriz: erro nulo ao degrau e %OS ~ 4.32%
    const simLeadAula20 = simulateControllerExercise(byId('lead-ex-aula20-bissetriz'))!;
    expect(Math.abs(simLeadAula20.essComp)).toBeLessThan(0.01);
    expect(simLeadAula20.overshootComp!).toBeGreaterThan(2);
    expect(simLeadAula20.overshootComp!).toBeLessThan(7);

    // Lead Proposto: erro nulo ao degrau e %OS ~ 16.3%
    const simLead = simulateControllerExercise(byId('fase-ex-lead-proposto'))!;
    expect(Math.abs(simLead.essComp)).toBeLessThan(0.01);
  });

  it('5. Deve conter todas as 23 questões da Lista P2 Controle 1 e simular Q20 a Q23 corretamente', () => {
    expect(LISTA_P2_QUESTIONS).toHaveLength(23);
    const practicalIds = ['q20', 'q21', 'q22', 'q23'];
    for (const qid of practicalIds) {
      const q = LISTA_P2_QUESTIONS.find(item => item.id === qid)!;
      expect(q.practicalData).toBeDefined();
      const G = parseRatExpr(q.practicalData!.plantExpr);
      const Gc = parseRatExpr(q.practicalData!.controllerExpr);
      const T = buildClosedLoopTf(G, Gc);
      const sim = simulateInputResponseRK4(T, () => 1, q.practicalData!.tMax, 300);
      expect(sim).not.toBeNull();
      expect(sim!.y.every(v => Number.isFinite(v))).toBe(true);
    }
    // Q21 (PI) deve zerar o erro estacionário ao degrau
    const q21 = LISTA_P2_QUESTIONS.find(item => item.id === 'q21')!;
    const sim21 = simulateInputResponseRK4(
      buildClosedLoopTf(parseRatExpr(q21.practicalData!.plantExpr), parseRatExpr(q21.practicalData!.controllerExpr)),
      () => 1,
      25,
      400
    )!;
    expect(Math.abs(1 - sim21.y[sim21.y.length - 1])).toBeLessThan(0.02);
  });
});
