import { describe, it, expect } from 'vitest';
import {
  analyzeCompleteBlockDiagram,
  runMasonForInputTargetPair,
  formatRatFuncLatex
} from '../src/features/builder/symbolicMasonEngine';
import { DiagramGraph, DiagramElement, DiagramConnection } from '../src/core/reduction/mason';
import { normalizeSignalDirections, validateCircuitTopology } from '../src/features/builder/circuitTopology';
import { reduceBlockDiagramGraphically } from '../src/features/builder/graphicalReduction';
import { parseRatExpr, parseRatNumDen } from '../src/core/algebra/parser';
import { ratSimplify, ratToLatex } from '../src/core/algebra/rational';

describe('Resolução Analítica, Realimentação e Álgebra de Diagramas de Blocos', () => {
  // =========================================================================
  // CASO DE TESTE 1: CIRCUITO DO ENUNCIADO — RESOLUÇÃO SIMBÓLICA PURA
  // R(s) -> G1(s) -> S1(+) -> G2(s) -> G3(s) -> C(s)
  // Retorno: C(s) -> H1(s) -> H2(s) -> S1(-)
  // =========================================================================
  it('1. Deve resolver o circuito do enunciado simbolicamente com C(s)/R(s) = G1G2G3 / (1 + G2G3H1H2)', () => {
    const circuitGraph: DiagramGraph = {
      elements: [
        { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 220 },
        { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)', expr: '', num: '', den: '', x: 220, y: 220, dir: 'right' },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 340, y: 220 },
        { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)', expr: '', num: '', den: '', x: 460, y: 220, dir: 'right' },
        { id: 'g3', code: 'G3', type: 'block', name: 'G3(s)', expr: '', num: '', den: '', x: 580, y: 220, dir: 'right' },
        { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 740, y: 220 },
        { id: 'h1', code: 'H1', type: 'block', name: 'H1(s)', expr: '', num: '', den: '', x: 580, y: 340, dir: 'left' },
        { id: 'h2', code: 'H2', type: 'block', name: 'H2(s)', expr: '', num: '', den: '', x: 420, y: 340, dir: 'left' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c2', from: 'g1', to: 's1', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c3', from: 's1', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c4', from: 'g2', to: 'g3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c5', from: 'g3', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'f1', from: 'OUT', to: 'h1', fromPort: 'S', toPort: 'E', sign: '+' },
        { id: 'f2', from: 'h1', to: 'h2', fromPort: 'W', toPort: 'E', sign: '+' },
        { id: 'f3', from: 'h2', to: 's1', fromPort: 'W', toPort: 'S', sign: '-' }
      ]
    };

    const analysis = analyzeCompleteBlockDiagram(circuitGraph, 'IN', 'OUT');
    expect(analysis.outputByInputPairs).toHaveLength(1);
    const tfPair = analysis.outputByInputPairs[0];

    // Verifica a função de transferência compacta e LaTeX esperada
    expect(tfPair.transferFunctionCompact).toBe('G1G2G3/(1 + G2G3H1H2)');
    expect(tfPair.transferFunctionLatex).toBe('\\frac{G_{1}G_{2}G_{3}}{1 + G_{2}G_{3}H_{1}H_{2}}');

    // Verifica que a realimentação foi identificada e não ignorada
    expect(tfPair.masonAnalysis.loops).toHaveLength(1);
    expect(analysis.allValidationsMatch).toBe(true);

    // Verifica as etapas da redução gráfica progressiva
    expect(analysis.graphicalReduction.success).toBe(true);
    const steps = analysis.graphicalReduction.steps;
    expect(steps.length).toBeGreaterThanOrEqual(5);

    // Etapa 1: Diagrama original
    expect(steps[0].rule).toBe('original');

    // Etapa 2: Associação em série G2 e G3, H1 e H2
    const seriesStep = steps.find(s => s.rule === 'series');
    expect(seriesStep).toBeDefined();

    // Etapa 3: Movimentação do somador
    const moveStep = steps.find(s => s.rule === 'move-summer');
    expect(moveStep).toBeDefined();
    expect(moveStep?.equations[0].latex).toContain('H_{1}H_{2}');
    expect(moveStep?.equations[0].latex).toContain('G_{1}');

    // Etapa 4: Malha fechada
    const fbStep = steps.find(s => s.rule === 'feedback');
    expect(fbStep).toBeDefined();

    // Etapa 5: Simplificação
    const simpStep = steps.find(s => s.rule === 'simplify');
    expect(simpStep).toBeDefined();
    expect(simpStep?.equations[0].latex).toContain('1 + G_{2}G_{3}H_{1}H_{2}');

    // Validação Topológica (8/8)
    expect(analysis.validationReport.hasErrors).toBe(false);
    expect(analysis.validationReport.checks).toHaveLength(8);
    expect(analysis.validationReport.checks.every(c => c.status === 'ok')).toBe(true);
  });

  // =========================================================================
  // CASO DE TESTE 2: RESOLUÇÃO NUMÉRICA DO MESMO CIRCUITO
  // G1 = 10/(s+12), G2 = 2, G3 = 3/(s+1), H1 = 1, H2 = 4
  // =========================================================================
  it('2. Deve resolver o circuito atribuindo funções numéricas e conferir com a substituição na fórmula simbólica', () => {
    const numericGraph: DiagramGraph = {
      elements: [
        { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 220 },
        { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)', num: '10', den: 's+12', expr: '10/(s+12)', x: 220, y: 220, dir: 'right' },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 340, y: 220 },
        { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)', num: '2', den: '1', expr: '2', x: 460, y: 220, dir: 'right' },
        { id: 'g3', code: 'G3', type: 'block', name: 'G3(s)', num: '3', den: 's+1', expr: '3/(s+1)', x: 580, y: 220, dir: 'right' },
        { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 740, y: 220 },
        { id: 'h1', code: 'H1', type: 'block', name: 'H1(s)', num: '1', den: '1', expr: '1', x: 580, y: 340, dir: 'left' },
        { id: 'h2', code: 'H2', type: 'block', name: 'H2(s)', num: '4', den: '1', expr: '4', x: 420, y: 340, dir: 'left' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c2', from: 'g1', to: 's1', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c3', from: 's1', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c4', from: 'g2', to: 'g3', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c5', from: 'g3', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'f1', from: 'OUT', to: 'h1', fromPort: 'S', toPort: 'E', sign: '+' },
        { id: 'f2', from: 'h1', to: 'h2', fromPort: 'W', toPort: 'E', sign: '+' },
        { id: 'f3', from: 'h2', to: 's1', fromPort: 'W', toPort: 'S', sign: '-' }
      ]
    };

    // G1 = 10/(s+12), G2 = 2, G3 = 3/(s+1), H1 = 1, H2 = 4
    // G2 * G3 = 6 / (s+1)
    // H1 * H2 = 4
    // Denominador = 1 + G2*G3*H1*H2 = 1 + (6/(s+1))*4 = 1 + 24/(s+1) = (s + 25)/(s + 1)
    // Numerador = G1 * G2 * G3 = (10/(s+12)) * (6/(s+1)) = 60 / [(s+12)(s+1)]
    // T(s) = Numerador / Denominador = 60 / [(s+12)(s+25)] = 60 / (s^2 + 37s + 300)
    const analysis = analyzeCompleteBlockDiagram(numericGraph, 'IN', 'OUT');
    const tfPair = analysis.outputByInputPairs[0];

    const lat = ratToLatex(tfPair.transferFunction);
    expect(lat).toContain('60');
    expect(lat).toContain('300');
    expect(lat).toContain('37');
    expect(analysis.allValidationsMatch).toBe(true);
    expect(analysis.scilabReport.isFullyNumeric).toBe(true);
  });

  // =========================================================================
  // CASO DE TESTE 3: REALIMENTAÇÃO POSITIVA (+) NO SOMADOR
  // =========================================================================
  it('3. Deve suportar realimentação positiva (+) resultando em denominador 1 - G2G3H1H2', () => {
    const posFeedbackGraph: DiagramGraph = {
      elements: [
        { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 220 },
        { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)', expr: '', num: '', den: '', x: 220, y: 220, dir: 'right' },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 340, y: 220 },
        { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)', expr: '', num: '', den: '', x: 460, y: 220, dir: 'right' },
        { id: 'g3', code: 'G3', type: 'block', name: 'G3(s)', expr: '', num: '', den: '', x: 580, y: 220, dir: 'right' },
        { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 740, y: 220 },
        { id: 'h1', code: 'H1', type: 'block', name: 'H1(s)', expr: '', num: '', den: '', x: 580, y: 340, dir: 'left' },
        { id: 'h2', code: 'H2', type: 'block', name: 'H2(s)', expr: '', num: '', den: '', x: 420, y: 340, dir: 'left' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 'g1', sign: '+' },
        { id: 'c2', from: 'g1', to: 's1', sign: '+' },
        { id: 'c3', from: 's1', to: 'g2', sign: '+' },
        { id: 'c4', from: 'g2', to: 'g3', sign: '+' },
        { id: 'c5', from: 'g3', to: 'OUT', sign: '+' },
        { id: 'f1', from: 'OUT', to: 'h1', sign: '+' },
        { id: 'f2', from: 'h1', to: 'h2', sign: '+' },
        { id: 'f3', from: 'h2', to: 's1', sign: '+' } // Sinal positivo (+)
      ]
    };

    const analysis = analyzeCompleteBlockDiagram(posFeedbackGraph, 'IN', 'OUT');
    const tfPair = analysis.outputByInputPairs[0];

    expect(tfPair.transferFunctionCompact).toBe('G1G2G3/(1 - G2G3H1H2)');
    expect(analysis.allValidationsMatch).toBe(true);
  });

  // =========================================================================
  // CASO DE TESTE 4: BLOCOS EM PARALELO
  // =========================================================================
  it('4. Deve associar blocos em paralelo somando algebricamente suas funções', () => {
    const parallelGraph: DiagramGraph = {
      elements: [
        { id: 'IN', type: 'input', name: 'R(s)' },
        { id: 'ga', type: 'block', name: 'Ga(s)', expr: '' },
        { id: 'gb', type: 'block', name: 'Gb(s)', expr: '' },
        { id: 's1', type: 'summer', name: 'S1' },
        { id: 'OUT', type: 'output', name: 'C(s)' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 'ga', sign: '+' },
        { id: 'c2', from: 'IN', to: 'gb', sign: '+' },
        { id: 'c3', from: 'ga', to: 's1', sign: '+' },
        { id: 'c4', from: 'gb', to: 's1', sign: '-' },
        { id: 'c5', from: 's1', to: 'OUT', sign: '+' }
      ]
    };

    const analysis = analyzeCompleteBlockDiagram(parallelGraph, 'IN', 'OUT');
    const tfPair = analysis.outputByInputPairs[0];

    expect(tfPair.transferFunctionCompact).toBe('Ga - Gb');
  });

  // =========================================================================
  // CASO DE TESTE 5: NORMALIZAÇÃO DE LINHAS DESENHADAS NO SENTIDO INVERSO
  // =========================================================================
  it('5. Deve corrigir conexões traçadas no sentido inverso sem perder a malha de realimentação', () => {
    const invertedGraph: DiagramGraph = {
      elements: [
        { id: 'IN', code: 'R1', type: 'input', name: 'R(s)' },
        { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)', dir: 'right' },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1' },
        { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)', dir: 'right' },
        { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)' },
        { id: 'h1', code: 'H1', type: 'block', name: 'H1(s)', dir: 'left' }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c2', from: 'g1', to: 's1', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c3', from: 's1', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
        { id: 'c4', from: 'g2', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' },
        // Linha desenhada de S1 até H1 (ao contrário do fluxo real H1 -> S1):
        { id: 'f_rev', from: 's1', to: 'h1', fromPort: 'S', toPort: 'W', sign: '+' },
        { id: 'f_in', from: 'OUT', to: 'h1', fromPort: 'S', toPort: 'E', sign: '+' }
      ]
    };

    const { graph: normalized, corrections } = normalizeSignalDirections(invertedGraph);
    expect(corrections.length).toBeGreaterThanOrEqual(1);

    const analysis = analyzeCompleteBlockDiagram(invertedGraph, 'IN', 'OUT');
    const tfPair = analysis.outputByInputPairs[0];

    expect(tfPair.transferFunctionCompact).toBe('G1G2/(1 + G2H1)');
    expect(tfPair.masonAnalysis.loops).toHaveLength(1);
    expect(analysis.validationReport.corrections.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // CASO DE TESTE 6: CIRCUITO COM MÚLTIPLAS ENTRADAS (R E D)
  // =========================================================================
  it('6. Deve analisar separadamente e por superposição circuitos com múltiplas entradas (R e D)', () => {
    const multiGraph: DiagramGraph = {
      elements: [
        { id: 'r1', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)' },
        { id: 'd1', code: 'D1', type: 'input', subType: 'disturbance', name: 'D(s)' },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1' },
        { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)' },
        { id: 's2', code: 'S2', type: 'summer', name: 'S2' },
        { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)' },
        { id: 'y1', code: 'C1', type: 'output', name: 'Y(s)' }
      ],
      connections: [
        { id: 'c1', from: 'r1', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 's2', sign: '+' },
        { id: 'c4', from: 'd1', to: 's2', sign: '+' },
        { id: 'c5', from: 's2', to: 'g2', sign: '+' },
        { id: 'c6', from: 'g2', to: 'y1', sign: '+' },
        { id: 'c7', from: 'y1', to: 's1', sign: '-' }
      ]
    };

    const analysis = analyzeCompleteBlockDiagram(multiGraph, 'r1', 'y1');
    expect(analysis.independentInputs).toHaveLength(2);

    const tfR = analysis.outputByInputPairs.find(p => p.inputInfo.id === 'r1')!;
    const tfD = analysis.outputByInputPairs.find(p => p.inputInfo.id === 'd1')!;

    expect(tfR.transferFunctionCompact).toBe('G1G2/(1 + G1G2)');
    expect(tfD.transferFunctionCompact).toBe('G2/(1 + G1G2)');

    expect(analysis.superpositionOutputText).toContain('G1G2/(1 + G1G2)');
    expect(analysis.superpositionOutputText).toContain('G2/(1 + G1G2)');
  });

  // =========================================================================
  // CASO DE TESTE 7: INTEGRIDADE COMPLETA DAS ETAPAS 0 A 10
  // =========================================================================
  it('7. Deve garantir que todas as etapas analíticas (0 a 10) possuam dados e equações estruturados', () => {
    const cascadeGraph: DiagramGraph = {
      elements: [
        { id: 'r1', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)' },
        { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)' },
        { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)' },
        { id: 'y1', code: 'C1', type: 'output', name: 'C(s)' }
      ],
      connections: [
        { id: 'c1', from: 'r1', to: 'g1', sign: '+' },
        { id: 'c2', from: 'g1', to: 'g2', sign: '+' },
        { id: 'c3', from: 'g2', to: 'y1', sign: '+' }
      ]
    };

    const res = analyzeCompleteBlockDiagram(cascadeGraph, 'r1', 'y1');

    // Etapa 0: Validação topológica
    expect(res.validationReport).toBeDefined();
    expect(res.validationReport.checks.length).toBe(8);

    // Etapa 1: Nós e Variáveis
    expect(res.independentInputs.length).toBe(1);
    expect(res.outputs.length).toBe(1);

    // Etapa 2: Somadores (pode ser 0 para cascata)
    expect(res.summerEquations).toBeDefined();

    // Etapa 3: Relações dos blocos
    expect(res.blockRelations.length).toBe(2);
    expect(res.blockRelations[0].relationLatex).toBeDefined();

    // Etapa 4: Substituição progressiva
    expect(res.progressiveSubstitutionSteps).toBeDefined();

    // Etapa 5: Redução gráfica
    expect(res.graphicalReduction).toBeDefined();
    expect(res.graphicalReduction.steps.length).toBeGreaterThan(0);

    // Etapa 6: Funções de transferência
    expect(res.outputByInputPairs.length).toBe(1);
    expect(res.outputByInputPairs[0].transferFunctionLatex).toContain('G_{1}G_{2}');

    // Etapa 7: Superposição
    expect(res.superpositionOutputLatex).toBeDefined();
    expect(res.superpositionOutputLatex).toContain('G_{1}G_{2}');

    // Etapa 8: Validação
    expect(res.algebraicValidationSteps).toBeDefined();

    // Etapa 9: TVF
    expect(res.steadyStateReport).toBeDefined();
    expect(res.steadyStateReport.conditionLatex).toBeDefined();

    // Etapa 10: Scilab
    expect(res.scilabReport).toBeDefined();
    expect(res.scilabReport.scriptCode).toContain('syslin');
  });

  // =========================================================================
  // CASO DE TESTE 8: CIRCUITO COM REFERÊNCIA R(s), PERTURBAÇÃO D(s) E RUÍDO N(s)
  // =========================================================================
  it('8. Deve suportar Ruído N(s) como entrada independente com superposição [R(s), D(s), N(s)]', () => {
    const threeInputGraph: DiagramGraph = {
      elements: [
        { id: 'r1', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)' },
        { id: 'd1', code: 'D1', type: 'input', subType: 'disturbance', name: 'D(s)' },
        { id: 'n1', code: 'N1', type: 'input', subType: 'noise', name: 'N(s)' },
        { id: 's1', code: 'S1', type: 'summer', name: 'S1' },
        { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)' },
        { id: 's2', code: 'S2', type: 'summer', name: 'S2' },
        { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)' },
        { id: 'y1', code: 'C1', type: 'output', name: 'Y(s)' },
        { id: 's3', code: 'S3', type: 'summer', name: 'S3' },
        { id: 'h1', code: 'H1', type: 'block', name: 'H(s)', dir: 'left' }
      ],
      connections: [
        // Ramo direto principal: R -> S1(+) -> G1 -> S2(+) -> G2 -> Y
        { id: 'c1', from: 'r1', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 's2', sign: '+' },
        { id: 'c4', from: 'd1', to: 's2', sign: '+' },
        { id: 'c5', from: 's2', to: 'g2', sign: '+' },
        { id: 'c6', from: 'g2', to: 'y1', sign: '+' },
        // Realimentação com ruído de medição: Y -> S3(+) & N -> S3(+) -> H -> S1(-)
        { id: 'c7', from: 'y1', to: 's3', sign: '+' },
        { id: 'c8', from: 'n1', to: 's3', sign: '+' },
        { id: 'c9', from: 's3', to: 'h1', sign: '+' },
        { id: 'c10', from: 'h1', to: 's1', sign: '-' }
      ]
    };

    const analysis = analyzeCompleteBlockDiagram(threeInputGraph, 'r1', 'y1');

    // 1. Deve identificar exatamente 3 entradas independentes com tipos próprios
    expect(analysis.independentInputs).toHaveLength(3);
    const inpR = analysis.independentInputs.find(i => i.role === 'input-ref');
    const inpD = analysis.independentInputs.find(i => i.role === 'input-dist');
    const inpN = analysis.independentInputs.find(i => i.role === 'input-noise');

    expect(inpR).toBeDefined();
    expect(inpR?.displayName).toBe('R(s)');

    expect(inpD).toBeDefined();
    expect(inpD?.displayName).toBe('D(s)');

    expect(inpN).toBeDefined();
    expect(inpN?.displayName).toBe('N(s)');
    expect(inpN?.shortSymbol).toBe('N');

    // 2. Deve calcular funções de transferência individuais para cada entrada
    const tfR = analysis.outputByInputPairs.find(p => p.inputInfo.id === 'r1')!;
    const tfD = analysis.outputByInputPairs.find(p => p.inputInfo.id === 'd1')!;
    const tfN = analysis.outputByInputPairs.find(p => p.inputInfo.id === 'n1')!;

    expect(tfR).toBeDefined();
    expect(tfD).toBeDefined();
    expect(tfN).toBeDefined();

    // R: G1G2 / (1 + G1G2H)
    expect(tfR.transferFunctionCompact).toBe('G1G2/(1 + G1G2H)');

    // D: G2 / (1 + G1G2H)
    expect(tfD.transferFunctionCompact).toBe('G2/(1 + G1G2H)');

    // N: -G1G2H / (1 + G1G2H) (sinal negativo por entrar pelo somador de realimentação negativa)
    expect(tfN.transferFunctionCompact).toBe('-G1G2H/(1 + G1G2H)');

    // 3. Superposição completa da saída deve conter os três termos
    expect(analysis.superpositionOutputText).toContain('G1G2/(1 + G1G2H)');
    expect(analysis.superpositionOutputText).toContain('G2/(1 + G1G2H)');
    expect(analysis.superpositionOutputText).toContain('G1G2H/(1 + G1G2H)');

    // 4. Scilab deve conter suporte aos três canais
    expect(analysis.scilabReport.scriptCode).toContain('Y(s) / R(s)');
    expect(analysis.scilabReport.scriptCode).toContain('Y(s) / D(s)');
    expect(analysis.scilabReport.scriptCode).toContain('Y(s) / N(s)');
  });
});
