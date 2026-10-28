'use client';

import React, { useMemo, useState } from 'react';
import {
  DiagramConnection,
  DiagramElement,
  DiagramGraph,
  FeedbackLoop,
  MasonAnalysis,
  cloneGraphForReduction
} from '@/core/reduction/mason';
import {
  RatFunc,
  ratAdd,
  ratMul,
  ratOne,
  ratScale,
  ratSimplify,
  ratToCompactParts,
  ratToLatex,
  ratZero
} from '@/core/algebra/rational';
import {
  Polynomial,
  polyAdd,
  polyEqual,
  polyFromNumber,
  polyIsOne,
  polyIsZero,
  polyMul,
  polyScale,
  polyToCompact,
  polyToLatex
} from '@/core/algebra/polynomial';
import { MathView } from '@/components/MathView';

export type SplitPanelMode = 'split' | 'circuit-maximized' | 'calc-maximized';

interface MasonDeductionViewProps {
  analysis: MasonAnalysis;
  graph?: DiagramGraph;
  inputElement?: DiagramElement | null;
  outputElement?: DiagramElement | null;
  splitMode?: SplitPanelMode;
  onChangeSplitMode?: (mode: SplitPanelMode) => void;
  onClose?: () => void;
}

interface DisjointLoopCombination {
  order: number; // 2 = pares, 3 = ternas, 4 = quadras...
  loopIndices: number[]; // 1-based indices
  gain: RatFunc;
}

interface EdgeStepDetail {
  fromId: string;
  toId: string;
  fromLabelLatex: string;
  toLabelLatex: string;
  sign: '+' | '-';
  blockSymbolLatex: string | null;
  gain: RatFunc;
  gainLatex: string;
}

interface PathDetailedDerivation {
  index: number; // 1-based
  nodes: string[];
  nodeLabelsLatex: string[];
  edges: EdgeStepDetail[];
  overallSign: '+' | '-';
  symbolicFactorsLatex: string[];
  substitutedFactorsLatex: string[];
  rawUnreducedNum: Polynomial;
  rawUnreducedDen: Polynomial;
  hasMultipleFractions: boolean;
  finalGain: RatFunc;
  finalGainLatex: string;
}

interface LoopDetailedDerivation {
  index: number; // 1-based
  nodes: string[];
  closedNodeLabelsLatex: string[];
  edges: EdgeStepDetail[];
  negativeSignsCount: number;
  overallSign: '+' | '-';
  symbolicFactorsLatex: string[];
  substitutedFactorsLatex: string[];
  rawUnreducedNum: Polynomial;
  rawUnreducedDen: Polynomial;
  hasMultipleFractions: boolean;
  finalGain: RatFunc;
  finalGainLatex: string;
}

interface PairComparisonDetail {
  i: number; // 1-based
  j: number; // 1-based
  sharedNodesLatex: string[];
  isDisjoint: boolean;
  gainProduct?: RatFunc;
  gainProductLatex?: string;
}

interface CofactorDetailedDerivation {
  pathIndex: number; // 1-based
  loopTouchStatus: {
    loopIndex: number;
    touches: boolean;
    sharedNodesLatex: string[];
    loopGain: RatFunc;
    loopGainLatex: string;
  }[];
  activeLoopIndices: number[];
  activeDisjointCombinations: DisjointLoopCombination[];
  cofactorValue: RatFunc;
  cofactorLatex: string;
  pathTimesCofactor: RatFunc;
  pathTimesCofactorLatex: string;
}

/**
 * Converte um nome ou código de elemento (ex.: "G1(s)", "Hf(s)", "ref(s)", "S1", "C(s)")
 * para notação matemática LaTeX elegante e segura para KaTeX / Overleaf.
 */
export function formatElementSymbolToLatex(rawName?: string, fallbackCode?: string): string {
  const base = (rawName || fallbackCode || 'X').trim();
  if (!base) return 'X(s)';

  // Verifica se termina com (s)
  const hasS = /\(\s*s\s*\)$/i.test(base);
  const core = hasS ? base.replace(/\(\s*s\s*\)$/i, '').trim() : base;

  // Palavras inteiramente em minúsculas com 3 ou mais letras (ex.: ref, out, erro)
  if (/^[a-z]{3,}$/.test(core)) {
    return `\\text{${core}}${hasS ? '(s)' : ''}`;
  }

  // Caso padrão: Letra seguida de subscrito numérico ou de 1 letra (ex: G1, H2, Hf, Hc, R1, C1, W1, S1)
  const matchSub = core.match(/^([A-Za-z])_?([0-9]+|[A-Za-z])$/);
  if (matchSub) {
    const prefix = matchSub[1];
    const sub = matchSub[2];
    return `${prefix}_{${sub}}${hasS ? '(s)' : ''}`;
  }

  // Palavras curtas como ref, out, in, erro, u, y
  if (/^[A-Za-z]{2,}$/.test(core)) {
    return `\\text{${core}}${hasS ? '(s)' : ''}`;
  }

  // Símbolo simples de 1 letra, ex: R, C, G, H, W, Y, U, E
  if (/^[A-Za-z]$/.test(core)) {
    return `${core}${hasS ? '(s)' : ''}`;
  }

  // Fallback escapando caracteres especiais
  const safe = core.replace(/_/g, '\\_');
  return `\\text{${safe}}${hasS ? '(s)' : ''}`;
}

/**
 * Envolve uma expressão LaTeX em parênteses adaptativos \left( ... \right) quando necessário para multiplicação/subtração
 */
function wrapParensLatex(latex: string, force: boolean = false): string {
  const t = latex.trim();
  if (force) return `\\left(${t}\\right)`;
  if (t.startsWith('-')) return `\\left(${t}\\right)`;
  // Se contém + ou - fora de chaves externas
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth = Math.max(0, depth - 1);
    else if ((ch === '+' || ch === '-') && depth === 0 && i > 0) {
      return `\\left(${t}\\right)`;
    }
  }
  return t;
}

/**
 * Formata um polinômio envolvendo em parênteses se tiver mais de um termo ou coeficiente negativo
 */
function formatPolyFactorLatex(P: Polynomial): string {
  const lat = polyToLatex(P);
  if (P.length > 1 || (P.length === 1 && P[0].coeff < 0)) {
    return `\\left(${lat}\\right)`;
  }
  return lat;
}

/**
 * Formata uma função racional não simplificada N(s)/D(s) em LaTeX
 */
function rawPolyPairToLatex(num: Polynomial, den: Polynomial): string {
  const nLat = polyToLatex(num);
  const dLat = polyToLatex(den);
  if (polyIsZero(num)) return '0';
  if (polyIsOne(den)) return nLat;
  return `\\frac{${nLat}}{${dLat}}`;
}

function setsAreDisjoint(a: string[], b: string[]): boolean {
  return !a.some(item => b.includes(item));
}

export const MasonDeductionView: React.FC<MasonDeductionViewProps> = ({
  analysis,
  graph,
  inputElement,
  outputElement,
  splitMode = 'split',
  onChangeSplitMode,
  onClose
}) => {
  const [copiedType, setCopiedType] = useState<'none' | 'final-latex' | 'final-text' | 'memorial'>('none');
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true
  });

  const toggleStep = (stepNumber: number) => {
    setOpenSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const setAllSteps = (open: boolean) => {
    setOpenSteps({ 1: open, 2: open, 3: open, 4: open, 5: open, 6: open, 7: open, 8: open });
  };

  // =========================================================================
  // MOTOR DE DERIVAÇÃO PASSO A PASSO FIEL AO GRAFO E AO ALGORITMO DE MASON
  // =========================================================================
  const derivation = useMemo(() => {
    const rawGraph: DiagramGraph = graph || {
      elements: analysis.elements || [],
      connections: []
    };
    const G = cloneGraphForReduction(rawGraph);
    const elementsMap = new Map<string, DiagramElement>();
    G.elements.forEach(el => elementsMap.set(el.id, el));
    analysis.elements?.forEach(el => {
      if (!elementsMap.has(el.id)) elementsMap.set(el.id, el);
    });

    const inEl =
      inputElement ||
      elementsMap.get('IN') ||
      G.elements.find(e => e.type === 'input') || {
        id: 'IN',
        type: 'input',
        name: 'R(s)',
        code: 'R1'
      };

    const outEl =
      outputElement ||
      elementsMap.get('OUT') ||
      G.elements.find(e => e.type === 'output') || {
        id: 'OUT',
        type: 'output',
        name: 'C(s)',
        code: 'C1'
      };

    const inputSymbolLatex = formatElementSymbolToLatex(inEl.name, inEl.code || 'R(s)');
    const outputSymbolLatex = formatElementSymbolToLatex(outEl.name, outEl.code || 'C(s)');

    const getElementLabelLatex = (nodeId: string): string => {
      if (nodeId === 'IN') return inputSymbolLatex;
      if (nodeId === 'OUT') return outputSymbolLatex;
      const el = elementsMap.get(nodeId);
      if (!el) return formatElementSymbolToLatex(nodeId);
      return formatElementSymbolToLatex(el.name, el.code || el.id);
    };

    const getElementDisplayName = (nodeId: string): string => {
      if (nodeId === 'IN') return inEl.name || 'R(s)';
      if (nodeId === 'OUT') return outEl.name || 'C(s)';
      const el = elementsMap.get(nodeId);
      return el ? el.name || el.code || el.id : nodeId;
    };

    // Blocos, somadores e ramos direcionados para a Etapa 1
    const blocksList = G.elements
      .filter(e => e.type === 'block')
      .map(b => {
        const rat = b.rat || ratOne();
        return {
          id: b.id,
          code: b.code || b.id,
          name: b.name,
          dir: b.dir === 'left' ? 'Realimentação (←)' : 'Avanço / Direto (→)',
          symbolLatex: formatElementSymbolToLatex(b.name, b.code || b.id),
          exprText: b.expr || '1',
          gain: rat,
          gainLatex: ratToLatex(rat)
        };
      });

    const summersList = G.elements
      .filter(e => e.type === 'summer')
      .map(s => {
        const incoming = G.connections.filter(c => c.to === s.id);
        const sLatex = formatElementSymbolToLatex(s.name, s.code || s.id);
        const termsLatex = incoming.map((c, idx) => {
          const srcLatex = getElementLabelLatex(c.from);
          const sign = c.sign === '-' ? '-' : idx === 0 ? '+' : '+';
          return `${sign} ${srcLatex}`;
        });
        const equationLatex =
          termsLatex.length > 0 ? `${sLatex} = ${termsLatex.join(' ')}` : `${sLatex} = 0`;
        return {
          id: s.id,
          code: s.code || s.id,
          name: s.name,
          symbolLatex: sLatex,
          incoming: incoming.map(c => ({
            fromId: c.from,
            fromName: getElementDisplayName(c.from),
            fromLatex: getElementLabelLatex(c.from),
            sign: (c.sign || '+') as '+' | '-'
          })),
          equationLatex
        };
      });

    const directedEdges = G.connections.map(c => {
      const toEl = elementsMap.get(c.to);
      const sign: '+' | '-' = c.sign === '-' ? '-' : '+';
      let baseGain = toEl?.type === 'block' ? toEl.rat || ratOne() : ratOne();
      if (sign === '-') baseGain = ratScale(baseGain, -1);
      const blockSym =
        toEl?.type === 'block' ? formatElementSymbolToLatex(toEl.name, toEl.code || toEl.id) : null;
      return {
        id: c.id,
        fromId: c.from,
        toId: c.to,
        fromName: getElementDisplayName(c.from),
        toName: getElementDisplayName(c.to),
        fromLatex: getElementLabelLatex(c.from),
        toLatex: getElementLabelLatex(c.to),
        sign,
        blockSymbolLatex: blockSym,
        gain: baseGain,
        gainLatex: ratToLatex(baseGain)
      };
    });

    // Helper para inspecionar uma transição (u -> v)
    const buildEdgeDetail = (u: string, v: string): EdgeStepDetail => {
      const conn: DiagramConnection | undefined = G.connections.find(
        c => c.from === u && c.to === v
      );
      const sign: '+' | '-' = conn?.sign === '-' ? '-' : '+';
      const toEl = elementsMap.get(v);
      let gain = toEl?.type === 'block' ? toEl.rat || ratOne() : ratOne();
      if (sign === '-') gain = ratScale(gain, -1);
      const blockSym =
        toEl?.type === 'block' ? formatElementSymbolToLatex(toEl.name, toEl.code || toEl.id) : null;
      return {
        fromId: u,
        toId: v,
        fromLabelLatex: getElementLabelLatex(u),
        toLabelLatex: getElementLabelLatex(v),
        sign,
        blockSymbolLatex: blockSym,
        gain,
        gainLatex: ratToLatex(gain)
      };
    };

    // Etapa 2: Caminhos Diretos Detalhados
    const detailedPaths: PathDetailedDerivation[] = analysis.forwardPaths.map((fp, idx) => {
      const edges: EdgeStepDetail[] = [];
      for (let i = 0; i < fp.nodes.length - 1; i++) {
        edges.push(buildEdgeDetail(fp.nodes[i], fp.nodes[i + 1]));
      }
      const negCount = edges.filter(e => e.sign === '-').length;
      const overallSign: '+' | '-' = negCount % 2 === 1 ? '-' : '+';

      const symbolicFactorsLatex: string[] = [];
      const substitutedFactorsLatex: string[] = [];
      let rawNum = polyFromNumber(overallSign === '-' ? -1 : 1);
      let rawDen = polyFromNumber(1);
      let blockCount = 0;

      edges.forEach(edge => {
        const toEl = elementsMap.get(edge.toId);
        if (toEl?.type === 'block') {
          blockCount++;
          const bRat = toEl.rat || ratOne();
          const sym = formatElementSymbolToLatex(toEl.name, toEl.code || toEl.id);
          symbolicFactorsLatex.push(edge.sign === '-' ? `\\left(-${sym}\\right)` : sym);
          substitutedFactorsLatex.push(
            edge.sign === '-'
              ? `\\left(-${ratToLatex(bRat)}\\right)`
              : wrapParensLatex(ratToLatex(bRat), true)
          );
          rawNum = polyMul(rawNum, bRat.num);
          rawDen = polyMul(rawDen, bRat.den);
        } else if (edge.sign === '-') {
          symbolicFactorsLatex.push('(-1)');
          substitutedFactorsLatex.push('(-1)');
        }
      });

      if (symbolicFactorsLatex.length === 0) {
        symbolicFactorsLatex.push('1');
        substitutedFactorsLatex.push('1');
      }

      return {
        index: idx + 1,
        nodes: fp.nodes,
        nodeLabelsLatex: fp.nodes.map(getElementLabelLatex),
        edges,
        overallSign,
        symbolicFactorsLatex,
        substitutedFactorsLatex,
        rawUnreducedNum: rawNum,
        rawUnreducedDen: rawDen,
        hasMultipleFractions: blockCount >= 2,
        finalGain: fp.gain,
        finalGainLatex: ratToLatex(fp.gain)
      };
    });

    // Etapa 3: Laços Individuais Detalhados
    const detailedLoops: LoopDetailedDerivation[] = analysis.loops.map((lp, idx) => {
      const edges: EdgeStepDetail[] = [];
      for (let i = 0; i < lp.nodes.length; i++) {
        const u = lp.nodes[i];
        const v = lp.nodes[(i + 1) % lp.nodes.length];
        edges.push(buildEdgeDetail(u, v));
      }
      const negCount = edges.filter(e => e.sign === '-').length;
      const overallSign: '+' | '-' = negCount % 2 === 1 ? '-' : '+';

      const symbolicFactorsLatex: string[] = [];
      const substitutedFactorsLatex: string[] = [];
      if (overallSign === '-') {
        symbolicFactorsLatex.push('(-1)');
        substitutedFactorsLatex.push('(-1)');
      } else {
        symbolicFactorsLatex.push('(+1)');
        substitutedFactorsLatex.push('(+1)');
      }

      let rawNum = polyFromNumber(overallSign === '-' ? -1 : 1);
      let rawDen = polyFromNumber(1);
      let blockCount = 0;

      edges.forEach(edge => {
        const toEl = elementsMap.get(edge.toId);
        if (toEl?.type === 'block') {
          blockCount++;
          const bRat = toEl.rat || ratOne();
          const sym = formatElementSymbolToLatex(toEl.name, toEl.code || toEl.id);
          symbolicFactorsLatex.push(sym);
          substitutedFactorsLatex.push(wrapParensLatex(ratToLatex(bRat), true));
          rawNum = polyMul(rawNum, bRat.num);
          rawDen = polyMul(rawDen, bRat.den);
        }
      });

      const closedNodes = [...lp.nodes, lp.nodes[0]];

      return {
        index: idx + 1,
        nodes: lp.nodes,
        closedNodeLabelsLatex: closedNodes.map(getElementLabelLatex),
        edges,
        negativeSignsCount: negCount,
        overallSign,
        symbolicFactorsLatex,
        substitutedFactorsLatex,
        rawUnreducedNum: rawNum,
        rawUnreducedDen: rawDen,
        hasMultipleFractions: blockCount >= 2,
        finalGain: lp.gain,
        finalGainLatex: ratToLatex(lp.gain)
      };
    });

    // Etapa 4: Análise Completa de Laços Disjuntos (Pares 2 a 2, Ternas 3 a 3 e Ordens Superiores)
    const pairComparisons: PairComparisonDetail[] = [];
    for (let i = 0; i < analysis.loops.length; i++) {
      for (let j = i + 1; j < analysis.loops.length; j++) {
        const shared = analysis.loops[i].nodes.filter(n => analysis.loops[j].nodes.includes(n));
        const isDisjoint = shared.length === 0;
        const prod = isDisjoint ? ratMul(analysis.loops[i].gain, analysis.loops[j].gain) : undefined;
        pairComparisons.push({
          i: i + 1,
          j: j + 1,
          sharedNodesLatex: shared.map(getElementLabelLatex),
          isDisjoint,
          gainProduct: prod,
          gainProductLatex: prod ? ratToLatex(prod) : undefined
        });
      }
    }

    // Todas as combinações mutuamente disjuntas de ordem >= 2 (pares, ternas, quadras...)
    const allDisjointCombinations: DisjointLoopCombination[] = [];
    const mLoops = analysis.loops.length;
    function findDisjointCombinations(
      startIdx: number,
      chosenIndices: number[],
      chosenNodes: string[],
      prodGain: RatFunc
    ) {
      for (let i = startIdx; i < mLoops; i++) {
        const lp = analysis.loops[i];
        if (setsAreDisjoint(chosenNodes, lp.nodes)) {
          const nextIndices = [...chosenIndices, i + 1];
          const nextGain = ratMul(prodGain, lp.gain);
          if (nextIndices.length >= 2) {
            allDisjointCombinations.push({
              order: nextIndices.length,
              loopIndices: nextIndices,
              gain: nextGain
            });
          }
          findDisjointCombinations(i + 1, nextIndices, [...chosenNodes, ...lp.nodes], nextGain);
        }
      }
    }
    findDisjointCombinations(0, [], [], ratOne());

    const disjointPairsOrder2 = allDisjointCombinations.filter(c => c.order === 2);
    const disjointHigherOrders = allDisjointCombinations.filter(c => c.order >= 3);

    // Etapa 5: Desenvolvimento Algébrico do Determinante Geral \Delta(s)
    const sumIndividualLoops = analysis.loops.reduce((acc, lp) => ratAdd(acc, lp.gain), ratZero());
    const sumDisjointPairs = disjointPairsOrder2.reduce((acc, c) => ratAdd(acc, c.gain), ratZero());
    const sumDisjointTriplets = allDisjointCombinations
      .filter(c => c.order === 3)
      .reduce((acc, c) => ratAdd(acc, c.gain), ratZero());

    // Fração combinada dos termos de malha (Delta - 1) para exibir a soma no denominador comum:
    // Delta = 1 + loopContribution => (D_L + N_L) / D_L
    const loopContribution = ratAdd(analysis.delta, ratScale(ratOne(), -1));

    // Etapa 6: Determinantes Complementares (Cofatores \Delta_k) para cada Caminho Direto P_k
    const detailedCofactors: CofactorDetailedDerivation[] = analysis.forwardPaths.map((fp, idx) => {
      const pNodes = fp.nodes;
      const loopTouchStatus = analysis.loops.map((lp, lIdx) => {
        const shared = lp.nodes.filter(n => pNodes.includes(n));
        return {
          loopIndex: lIdx + 1,
          touches: shared.length > 0,
          sharedNodesLatex: shared.map(getElementLabelLatex),
          loopGain: lp.gain,
          loopGainLatex: ratToLatex(lp.gain)
        };
      });

      const activeLoopIndices = loopTouchStatus.filter(s => !s.touches).map(s => s.loopIndex);
      const activeDisjointCombinations = allDisjointCombinations.filter(comb =>
        comb.loopIndices.every(li => activeLoopIndices.includes(li))
      );

      const dk = analysis.cofactors[idx] || ratOne();
      const pkDk = ratMul(fp.gain, dk);

      return {
        pathIndex: idx + 1,
        loopTouchStatus,
        activeLoopIndices,
        activeDisjointCombinations,
        cofactorValue: dk,
        cofactorLatex: ratToLatex(dk),
        pathTimesCofactor: pkDk,
        pathTimesCofactorLatex: ratToLatex(pkDk)
      };
    });

    // Etapa 7 & 8: Soma do Numerador, Divisão pelo Determinante e Simplificação Final
    const numeratorSum = detailedCofactors.reduce(
      (acc, c) => ratAdd(acc, c.pathTimesCofactor),
      ratZero()
    );

    // Multiplicação cruzada antes do cancelamento entre Numerador Total (A/B) e Delta (C/D):
    // T_bruto = (A * D) / (B * C)
    const rawCrossNum = polyMul(numeratorSum.num, analysis.delta.den);
    const rawCrossDen = polyMul(numeratorSum.den, analysis.delta.num);
    const hasCommonDenominatorCancel =
      !polyIsOne(numeratorSum.den) && polyEqual(numeratorSum.den, analysis.delta.den);

    const simplifiedFinal = ratSimplify( analysis.totalT.num, analysis.totalT.den );
    const rawCrossLatex = rawPolyPairToLatex(rawCrossNum, rawCrossDen);
    const finalTotalTLatex = ratToLatex(analysis.totalT);
    const compactFinalParts = ratToCompactParts(analysis.totalT);
    const compactFinalText = compactFinalParts.isFraction
      ? `(${compactFinalParts.num}) / (${compactFinalParts.den})`
      : compactFinalParts.num;

    return {
      G,
      inEl,
      outEl,
      inputSymbolLatex,
      outputSymbolLatex,
      blocksList,
      summersList,
      directedEdges,
      detailedPaths,
      detailedLoops,
      pairComparisons,
      disjointPairsOrder2,
      disjointHigherOrders,
      allDisjointCombinations,
      sumIndividualLoops,
      sumDisjointPairs,
      sumDisjointTriplets,
      loopContribution,
      detailedCofactors,
      numeratorSum,
      rawCrossNum,
      rawCrossDen,
      rawCrossLatex,
      hasCommonDenominatorCancel,
      simplifiedFinal,
      finalTotalTLatex,
      compactFinalText
    };
  }, [analysis, graph, inputElement, outputElement]);

  // =========================================================================
  // GERADOR DO DOCUMENTO LATEX COMPLETO (.tex) PARA COMPILAÇÃO NO OVERLEAF
  // =========================================================================
  const generateOverleafLatexDocument = (): string => {
    const {
      inEl,
      outEl,
      inputSymbolLatex,
      outputSymbolLatex,
      blocksList,
      summersList,
      directedEdges,
      detailedPaths,
      detailedLoops,
      pairComparisons,
      disjointPairsOrder2,
      disjointHigherOrders,
      sumIndividualLoops,
      sumDisjointPairs,
      loopContribution,
      detailedCofactors,
      numeratorSum,
      rawCrossLatex,
      hasCommonDenominatorCancel,
      finalTotalTLatex
    } = derivation;

    const lines: string[] = [];
    lines.push(`% ==========================================================================`);
    lines.push(`% MEMORIAL DE CÁLCULO DETALHADO — REGRA DO GANHO DE MASON`);
    lines.push(`% Gerado automaticamente pelo Construtor Livre de Diagramas de Blocos`);
    lines.push(`% Compatível com Overleaf / pdfLaTeX / XeLaTeX`);
    lines.push(`% ==========================================================================`);
    lines.push(`\\documentclass[12pt,a4paper]{article}`);
    lines.push(`\\usepackage[utf8]{inputenc}`);
    lines.push(`\\usepackage[T1]{fontenc}`);
    lines.push(`\\usepackage[brazil]{babel}`);
    lines.push(`\\usepackage{amsmath,amssymb,amsfonts,mathtools}`);
    lines.push(`\\usepackage{geometry}`);
    lines.push(`\\usepackage{booktabs}`);
    lines.push(`\\usepackage{enumitem}`);
    lines.push(`\\usepackage{xcolor}`);
    lines.push(`\\geometry{margin=2.2cm}`);
    lines.push(`\\setlength{\\parindent}{0pt}`);
    lines.push(`\\setlength{\\parskip}{6pt}`);
    lines.push(``);
    lines.push(`\\title{\\textbf{Memorial de Cálculo Detalhado — Redução por Regra de Mason}}`);
    lines.push(
      `\\author{Sistema de Controle: Relação Entrada $${inputSymbolLatex}$ $\\rightarrow$ Saída $${outputSymbolLatex}$}`
    );
    lines.push(`\\date{\\today}`);
    lines.push(``);
    lines.push(`\\begin{document}`);
    lines.push(`\\maketitle`);
    lines.push(`\\hrule`);
    lines.push(`\\vspace{8pt}`);

    // ETAPA 1
    lines.push(`\\section*{Etapa 1 — Identificação do Grafo e Representação do Sistema}`);
    lines.push(`\\begin{itemize}[leftmargin=*]`);
    lines.push(`  \\item \\textbf{Nó de Entrada considerado:} $${inputSymbolLatex}$ (${inEl.name || 'Entrada'})`);
    lines.push(`  \\item \\textbf{Nó de Saída considerado:} $${outputSymbolLatex}$ (${outEl.name || 'Saída'})`);
    lines.push(
      `  \\item \\textbf{Função de Transferência desejada:} $T(s) = \\dfrac{${outputSymbolLatex}}{${inputSymbolLatex}}$`
    );
    lines.push(`\\end{itemize}`);

    if (blocksList.length > 0) {
      lines.push(`\\subsection*{1.1 Blocos e Funções de Transferência}`);
      lines.push(`\\begin{itemize}[leftmargin=*]`);
      blocksList.forEach(b => {
        lines.push(`  \\item Bloco \\textbf{${b.code}} ($${b.symbolLatex}$ — ${b.dir}):`);
        lines.push(`  \\[ ${b.symbolLatex} = ${b.gainLatex} \\]`);
      });
      lines.push(`\\end{itemize}`);
    }

    if (summersList.length > 0) {
      lines.push(`\\subsection*{1.2 Somadores e Equações de Sinais}`);
      lines.push(`\\begin{itemize}[leftmargin=*]`);
      summersList.forEach(s => {
        lines.push(`  \\item Somador \\textbf{${s.code}} ($${s.symbolLatex}$):`);
        lines.push(`  \\[ ${s.equationLatex} \\]`);
      });
      lines.push(`\\end{itemize}`);
    }

    lines.push(`\\subsection*{1.3 Conexões Direcionadas do Grafo}`);
    lines.push(`\\begin{itemize}[leftmargin=*]`);
    directedEdges.forEach(e => {
      lines.push(
        `  \\item Ramo $${e.fromLatex} \\xrightarrow{\\text{sinal } (${e.sign})} ${e.toLatex}$ com ganho de transmissão $g(s) = ${e.gainLatex}$`
      );
    });
    lines.push(`\\end{itemize}`);

    // ETAPA 2
    lines.push(`\\section*{Etapa 2 — Identificação dos Caminhos Diretos ($P_k$)}`);
    lines.push(
      `Um caminho direto é qualquer trajetória orientada contínua que parte do nó de entrada $${inputSymbolLatex}$ e atinge o nó de saída $${outputSymbolLatex}$ sem percorrer nenhum nó mais de uma vez.`
    );
    detailedPaths.forEach(p => {
      lines.push(`\\subsection*{Caminho Direto $P_{${p.index}}(s)$}`);
      lines.push(`\\begin{itemize}[leftmargin=*]`);
      lines.push(`  \\item \\textbf{Sequência de nós:} $${p.nodeLabelsLatex.join(' \\rightarrow ')}$`);
      lines.push(`  \\item \\textbf{Multiplicação dos ganhos ao longo do caminho:}`);
      lines.push(`  \\begin{align*}`);
      lines.push(`    P_{${p.index}}(s) &= ${p.symbolicFactorsLatex.join(' \\cdot ')} \\\\`);
      lines.push(`    P_{${p.index}}(s) &= ${p.substitutedFactorsLatex.join(' \\cdot ')} \\\\`);
      if (p.hasMultipleFractions) {
        lines.push(
          `    P_{${p.index}}(s) &= ${rawPolyPairToLatex(p.rawUnreducedNum, p.rawUnreducedDen)} \\\\`
        );
      }
      lines.push(`    P_{${p.index}}(s) &= \\mathbf{${p.finalGainLatex}}`);
      lines.push(`  \\end{align*}`);
      lines.push(`\\end{itemize}`);
    });

    // ETAPA 3
    lines.push(`\\section*{Etapa 3 — Identificação dos Laços Individuais ($L_i$)}`);
    if (detailedLoops.length === 0) {
      lines.push(
        `O diagrama não apresenta ciclos fechados de realimentação ($M = 0$). Portanto, $\\sum_{i} L_i(s) = 0$.`
      );
    } else {
      detailedLoops.forEach(lp => {
        lines.push(`\\subsection*{Laço Individual $L_{${lp.index}}(s)$}`);
        lines.push(`\\begin{itemize}[leftmargin=*]`);
        lines.push(
          `  \\item \\textbf{Trajetória fechada:} $${lp.closedNodeLabelsLatex.join(' \\rightarrow ')}$`
        );
        lines.push(
          `  \\item \\textbf{Sinal resultante da malha:} $(${lp.overallSign}1)$ (${lp.negativeSignsCount} entrada(s) inversora(s) no ciclo)`
        );
        lines.push(`  \\item \\textbf{Desenvolvimento do ganho do laço:}`);
        lines.push(`  \\begin{align*}`);
        lines.push(`    L_{${lp.index}}(s) &= ${lp.symbolicFactorsLatex.join(' \\cdot ')} \\\\`);
        lines.push(`    L_{${lp.index}}(s) &= ${lp.substitutedFactorsLatex.join(' \\cdot ')} \\\\`);
        if (lp.hasMultipleFractions) {
          lines.push(
            `    L_{${lp.index}}(s) &= ${rawPolyPairToLatex(lp.rawUnreducedNum, lp.rawUnreducedDen)} \\\\`
          );
        }
        lines.push(`    L_{${lp.index}}(s) &= \\mathbf{${lp.finalGainLatex}}`);
        lines.push(`  \\end{align*}`);
        lines.push(`\\end{itemize}`);
      });
    }

    // ETAPA 4
    lines.push(`\\section*{Etapa 4 — Identificação dos Laços Disjuntos}`);
    if (detailedLoops.length < 2) {
      lines.push(
        `Como o sistema possui ${detailedLoops.length} laço(s), não existem combinações de dois ou mais laços. Logo, todos os produtos de laços disjuntos são nulos.`
      );
    } else {
      lines.push(`\\subsection*{4.1 Análise de Pares de Laços (2 a 2)}`);
      lines.push(`\\begin{itemize}[leftmargin=*]`);
      pairComparisons.forEach(pc => {
        if (pc.isDisjoint) {
          lines.push(
            `  \\item Par $(L_{${pc.i}}, L_{${pc.j}})$: $V(L_{${pc.i}}) \\cap V(L_{${pc.j}}) = \\emptyset$ (\\textbf{Disjuntos}). Produto: $L_{${pc.i}}(s)L_{${pc.j}}(s) = ${pc.gainProductLatex}$`
          );
        } else {
          lines.push(
            `  \\item Par $(L_{${pc.i}}, L_{${pc.j}})$: compartilham os nós $\\{${pc.sharedNodesLatex.join(', ')}\\} \\neq \\emptyset$ (\\textbf{Tocam-se}).`
          );
        }
      });
      lines.push(`\\end{itemize}`);

      if (disjointPairsOrder2.length === 0) {
        lines.push(`Não existem pares de laços disjuntos: $\\sum_{i,j} L_i(s)L_j(s) = 0$.`);
      }

      lines.push(`\\subsection*{4.2 Combinações de Três ou Mais Laços Disjuntos ($r \\ge 3$)}`);
      if (disjointHigherOrders.length === 0) {
        lines.push(
          `Não existem combinações de três ou mais laços mutuamente disjuntos ($\\sum_{i,j,k} L_i L_j L_k = 0$).`
        );
      } else {
        lines.push(`\\begin{itemize}[leftmargin=*]`);
        disjointHigherOrders.forEach(comb => {
          const prodSym = comb.loopIndices.map(idx => `L_{${idx}}(s)`).join(' \\cdot ');
          lines.push(
            `  \\item Combinação de ordem ${comb.order}: $${prodSym} = ${ratToLatex(comb.gain)}$`
          );
        });
        lines.push(`\\end{itemize}`);
      }
    }

    // ETAPA 5
    lines.push(`\\section*{Etapa 5 — Determinante Geral de Mason ($\\Delta$)}`);
    lines.push(`A expressão geral do determinante do grafo de Mason é dada por:`);
    lines.push(
      `\\[ \\Delta(s) = 1 - \\sum_{i} L_i(s) + \\sum_{i,j} L_i(s)L_j(s) - \\sum_{i,j,k} L_i(s)L_j(s)L_k(s) + \\cdots \\]`
    );
    if (detailedLoops.length > 0) {
      const sumTerms = detailedLoops.map(lp => `\\left(${lp.finalGainLatex}\\right)`).join(' + ');
      lines.push(`Soma dos laços individuais:`);
      lines.push(`\\[ \\sum_{i} L_i(s) = ${sumTerms} = ${ratToLatex(sumIndividualLoops)} \\]`);
    }
    lines.push(`Substituindo na expressão de $\\Delta(s)$:`);
    lines.push(`\\begin{align*}`);
    lines.push(
      `  \\Delta(s) &= 1 - \\left(${ratToLatex(sumIndividualLoops)}\\right) + \\left(${ratToLatex(
        sumDisjointPairs
      )}\\right) \\\\`
    );
    if (!polyIsOne(loopContribution.den) && !polyIsZero(loopContribution.num)) {
      const dLat = polyToLatex(loopContribution.den);
      const nLat = polyToLatex(loopContribution.num);
      lines.push(`  \\Delta(s) &= 1 + \\frac{${nLat}}{${dLat}} = \\frac{\\left(${dLat}\\right) + \\left(${nLat}\\right)}{${dLat}} \\\\`);
    }
    lines.push(`  \\Delta(s) &= \\mathbf{${ratToLatex(analysis.delta)}}`);
    lines.push(`\\end{align*}`);

    // ETAPA 6
    lines.push(`\\section*{Etapa 6 — Determinantes Complementares (Cofatores $\\Delta_k$)}`);
    detailedCofactors.forEach(cf => {
      lines.push(`\\subsection*{Cofator $\\Delta_{${cf.pathIndex}}(s)$ associado ao Caminho $P_{${cf.pathIndex}}(s)$}`);
      lines.push(`\\begin{itemize}[leftmargin=*]`);
      cf.loopTouchStatus.forEach(st => {
        if (st.touches) {
          lines.push(
            `  \\item Laço $L_{${st.loopIndex}}$: toca $P_{${cf.pathIndex}}$ no(s) nó(s) $\\{${st.sharedNodesLatex.join(', ')}\\}$ $\\Rightarrow$ excluído de $\\Delta_{${cf.pathIndex}}$.`
          );
        } else {
          lines.push(
            `  \\item Laço $L_{${st.loopIndex}}$: não compartilha nós com $P_{${cf.pathIndex}}$ ($V(P_{${cf.pathIndex}}) \\cap V(L_{${st.loopIndex}}) = \\emptyset$) $\\Rightarrow$ participa de $\\Delta_{${cf.pathIndex}}$.`
          );
        }
      });
      lines.push(`  \\item Resultado do determinante complementar: $\\Delta_{${cf.pathIndex}}(s) = \\mathbf{${cf.cofactorLatex}}$`);
      lines.push(
        `  \\item Produto parcial: $P_{${cf.pathIndex}}(s)\\Delta_{${cf.pathIndex}}(s) = \\left(${
          detailedPaths[cf.pathIndex - 1]?.finalGainLatex || '1'
        }\\right) \\cdot \\left(${cf.cofactorLatex}\\right) = \\mathbf{${cf.pathTimesCofactorLatex}}$`
      );
      lines.push(`\\end{itemize}`);
    });

    // ETAPA 7
    lines.push(`\\section*{Etapa 7 — Aplicação da Fórmula de Mason}`);
    lines.push(`\\[ T(s) = \\frac{\\displaystyle\\sum_{k=1}^{${detailedPaths.length}} P_k(s)\\Delta_k(s)}{\\Delta(s)} \\]`);
    const numExpansion = detailedCofactors.map(cf => `\\left(${cf.pathTimesCofactorLatex}\\right)`).join(' + ');
    lines.push(`Desenvolvendo o numerador $\\sum_{k=1}^{${detailedPaths.length}} P_k(s)\\Delta_k(s)$:`);
    lines.push(`\\[ \\sum_{k=1}^{${detailedPaths.length}} P_k(s)\\Delta_k(s) = ${numExpansion} = ${ratToLatex(numeratorSum)} \\]`);
    lines.push(`Dividindo pelo determinante geral $\\Delta(s)$:`);
    lines.push(
      `\\[ T(s) = \\frac{${ratToLatex(numeratorSum)}}{${ratToLatex(analysis.delta)}} \\]`
    );

    // ETAPA 8
    lines.push(`\\section*{Etapa 8 — Simplificação Algébrica e Resultado Final}`);
    if (hasCommonDenominatorCancel) {
      lines.push(
        `Cancelando o denominador polinomial comum $\\left(${polyToLatex(
          numeratorSum.den
        )}\\right)$ entre o numerador e o determinante $\\Delta(s)$, e simplificando os fatores irredutíveis:`
      );
    } else if (rawCrossLatex !== finalTotalTLatex) {
      lines.push(`Realizando a divisão de frações racionais e cancelando fatores comuns:`);
      lines.push(`\\[ T(s) = ${rawCrossLatex} = ${finalTotalTLatex} \\]`);
    }
    lines.push(`\\vspace{6pt}`);
    lines.push(`\\[ \\boxed{T(s) = \\frac{${outputSymbolLatex}}{${inputSymbolLatex}} = ${finalTotalTLatex}} \\]`);
    lines.push(`\\end{document}`);

    return lines.join('\n');
  };

  const handleDownloadLatexFile = () => {
    const texContent = generateOverleafLatexDocument();
    const blob = new Blob([texContent], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'memorial_mason_completo.tex';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async (content: string, type: 'final-latex' | 'final-text' | 'memorial') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedType(type);
      setTimeout(() => setCopiedType('none'), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const {
    inEl,
    outEl,
    inputSymbolLatex,
    outputSymbolLatex,
    blocksList,
    summersList,
    directedEdges,
    detailedPaths,
    detailedLoops,
    pairComparisons,
    disjointPairsOrder2,
    disjointHigherOrders,
    sumIndividualLoops,
    sumDisjointPairs,
    sumDisjointTriplets,
    loopContribution,
    detailedCofactors,
    numeratorSum,
    rawCrossLatex,
    hasCommonDenominatorCancel,
    finalTotalTLatex,
    compactFinalText
  } = derivation;

  const stepCardStyle: React.CSSProperties = {
    background: '#070b16',
    border: '1px solid rgba(56, 189, 248, 0.16)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
  };

  const stepHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.85)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    userSelect: 'none'
  };

  const mathBoxStyle: React.CSSProperties = {
    background: '#0a1020',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    borderRadius: '8px',
    padding: '12px 14px',
    overflowX: 'auto',
    maxWidth: '100%'
  };

  return (
    <div
      data-testid="mason-deduction-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--text)',
        paddingBottom: '28px'
      }}
    >
      {/* CABEÇALHO DO PAINEL 2 — DESENVOLVIMENTO DOS CÁLCULOS */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.28)',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.16)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.4px'
                }}
              >
                PAINEL 2 — DESENVOLVIMENTO DOS CÁLCULOS
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Método de Redução de Mason (8 Etapas Detalhadas)
              </span>
            </div>
            <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.08rem', color: '#f8fafc', fontWeight: 800 }}>
              Resolução Matemática Passo a Passo
            </h3>
          </div>

          {/* Controles de Janela / Divisão e Fechamento */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {onChangeSplitMode && (
              <>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => onChangeSplitMode('circuit-maximized')}
                  style={{ padding: '5px 9px', fontSize: '0.74rem' }}
                  title="Minimizar temporariamente o painel dos cálculos e expandir o circuito"
                >
                  🗕 Minimizar Cálculos
                </button>
                {splitMode !== 'split' && (
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => onChangeSplitMode('split')}
                    style={{
                      padding: '5px 9px',
                      fontSize: '0.74rem',
                      borderColor: '#38bdf8',
                      color: '#38bdf8'
                    }}
                    title="Restaurar visualização dividida lado a lado (Circuito + Cálculos)"
                  >
                    ⚖️ Restaurar Ambos
                  </button>
                )}
                {splitMode !== 'calc-maximized' && (
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => onChangeSplitMode('calc-maximized')}
                    style={{ padding: '5px 9px', fontSize: '0.74rem' }}
                    title="Maximizar temporariamente o painel dos cálculos (minimiza o circuito)"
                  >
                    🗖 Maximizar Cálculos
                  </button>
                )}
              </>
            )}
            {onClose && (
              <button
                type="button"
                className="filter-btn"
                onClick={onClose}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.74rem',
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.35)'
                }}
                title="Fechar painel de cálculos"
              >
                ✕ Fechar
              </button>
            )}
          </div>
        </div>

        {/* Barra de Ações do Memorial (Download .tex, Copiar, Expandir/Recolher Etapas) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.07)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="download-latex-memorial-btn"
              onClick={handleDownloadLatexFile}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#ffffff',
                border: '1px solid #38bdf8',
                borderRadius: '7px',
                padding: '7px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
              }}
              title="Baixar documento LaTeX (.tex) completo pronto para compilar no Overleaf"
            >
              📥 Baixar Memorial LaTeX (.tex)
            </button>

            <button
              type="button"
              className="filter-btn"
              onClick={() => handleCopyText(generateOverleafLatexDocument(), 'memorial')}
              style={{
                padding: '6px 12px',
                fontSize: '0.76rem',
                borderColor: copiedType === 'memorial' ? '#10b981' : undefined,
                color: copiedType === 'memorial' ? '#10b981' : undefined
              }}
            >
              {copiedType === 'memorial' ? '✓ Código .tex Copiado!' : '📋 Copiar Código .tex'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="filter-btn"
              onClick={() => setAllSteps(true)}
              style={{ padding: '4px 9px', fontSize: '0.72rem' }}
            >
              ▼ Expandir Todas as Etapas
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => setAllSteps(false)}
              style={{ padding: '4px 9px', fontSize: '0.72rem' }}
            >
              ▲ Recolher Etapas
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ETAPA 1 — IDENTIFICAÇÃO DO GRAFO
         ===================================================================== */}
      <div style={stepCardStyle} data-testid="mason-step-1">
        <div style={stepHeaderStyle} onClick={() => toggleStep(1)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#38bdf8',
                color: '#020617',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 1
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Identificação do Grafo e Representação do Sistema
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[1] ? '▲' : '▼'}</span>
        </div>

        {openSteps[1] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1.1 Nós de Entrada e Saída */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                1.1. Identificação dos Nós de Entrada e Saída
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Nó de Entrada (Excitação):</div>
                  <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>
                    <MathView math={`\\text{Entrada: } ${inputSymbolLatex}`} inline />{' '}
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({inEl.code || inEl.id})</span>
                  </div>
                </div>
                <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Nó de Saída (Resposta):</div>
                  <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>
                    <MathView math={`\\text{Saída: } ${outputSymbolLatex}`} inline />{' '}
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({outEl.code || outEl.id})</span>
                  </div>
                </div>
                <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Relação de Transferência Alvo:</div>
                  <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>
                    <MathView math={`T(s) = \\frac{${outputSymbolLatex}}{${inputSymbolLatex}}`} inline />
                  </div>
                </div>
              </div>
            </div>

            {/* 1.2 Blocos e seus respectivos ganhos */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                1.2. Blocos Funcionais e Ganhos de Transferência ({blocksList.length})
              </div>
              {blocksList.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Nenhum bloco funcional intermediário presente (conexão direta).
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px' }}>
                  {blocksList.map(b => (
                    <div
                      key={b.id}
                      style={{
                        background: '#060a14',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.07)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px' }}>
                        <span>
                          Bloco <b style={{ color: '#e2e8f0' }}>{b.code}</b>
                        </span>
                        <span>{b.dir}</span>
                      </div>
                      <MathView math={`${b.symbolLatex} = ${b.gainLatex}`} block />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 1.3 Somadores e Sinais das Entradas */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                1.3. Somadores e Equações Algébricas dos Sinais ({summersList.length})
              </div>
              {summersList.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  O circuito não possui nós somadores.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {summersList.map(s => (
                    <div
                      key={s.id}
                      style={{
                        background: '#060a14',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: '#a7f3d0', fontWeight: 700, marginBottom: '4px' }}>
                        Somador {s.name} ({s.code}):
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Entradas incidentes:{' '}
                        {s.incoming.map((inc, i) => (
                          <span key={i} style={{ marginRight: '10px' }}>
                            <MathView math={`(${inc.sign})\\;${inc.fromLatex}`} inline />
                          </span>
                        ))}
                      </div>
                      <MathView math={s.equationLatex} block />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 1.4 Conexões Direcionadas do Grafo */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a855f7', marginBottom: '8px' }}>
                1.4. Conexões Direcionadas e Ganhos de Transmissão dos Ramos ({directedEdges.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
                {directedEdges.map(edge => (
                  <div
                    key={edge.id}
                    style={{
                      background: '#060a14',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(168, 85, 247, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <MathView
                      math={`${edge.fromLatex} \\xrightarrow{(${edge.sign})} ${edge.toLatex}`}
                      inline
                    />
                    <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      <MathView math={`g = ${edge.gainLatex}`} inline />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 2 — IDENTIFICAÇÃO DOS CAMINHOS DIRETOS (P_k)
         ===================================================================== */}
      <div style={stepCardStyle} data-testid="mason-step-2">
        <div style={stepHeaderStyle} onClick={() => toggleStep(2)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#0ea5e9',
                color: '#020617',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 2
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Identificação e Desenvolvimento dos Caminhos Diretos (<MathView math="P_k" inline />)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[2] ? '▲' : '▼'}</span>
        </div>

        {openSteps[2] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Um caminho direto <MathView math="P_k(s)" inline /> é uma trajetória orientada que parte da entrada{' '}
              <MathView math={inputSymbolLatex} inline /> e atinge a saída <MathView math={outputSymbolLatex} inline />{' '}
              sem passar duas vezes pelo mesmo nó. O ganho total do caminho é o produto dos ganhos de todos os ramos percorridos:
            </div>

            {detailedPaths.map(p => (
              <div
                key={p.index}
                style={{
                  ...mathBoxStyle,
                  borderLeft: '3px solid #38bdf8'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#38bdf8' }}>
                    Caminho Direto <MathView math={`P_{${p.index}}(s)`} inline />
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Sinal resultante do caminho: <MathView math={`(${p.overallSign}1)`} inline />
                  </span>
                </div>

                {/* Sequência de nós */}
                <div style={{ background: '#060a14', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Sequência de nós percorrida:
                  </div>
                  <MathView math={p.nodeLabelsLatex.join(' \\longrightarrow ')} block />
                </div>

                {/* Ganhos individuais dos ramos */}
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Ganhos nos ramos percorridos:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {p.edges.map((e, eIdx) => (
                    <span
                      key={eIdx}
                      style={{
                        background: '#060a14',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '5px',
                        padding: '4px 8px',
                        fontSize: '0.76rem'
                      }}
                    >
                      <MathView
                        math={`${e.fromLabelLatex} \\to ${e.toLabelLatex}: \\; ${
                          e.blockSymbolLatex ? `${e.sign === '-' ? '-' : '+'}${e.blockSymbolLatex} = ` : ''
                        }${e.gainLatex}`}
                        inline
                      />
                    </span>
                  ))}
                </div>

                {/* Multiplicação desenvolvida passo a passo */}
                <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <div style={{ fontSize: '0.74rem', color: '#93c5fd', fontWeight: 700, marginBottom: '4px' }}>
                    Desenvolvimento da multiplicação dos ganhos:
                  </div>
                  <MathView
                    math={`\\begin{aligned}
P_{${p.index}}(s) &= ${p.symbolicFactorsLatex.join(' \\cdot ')} \\\\[4pt]
P_{${p.index}}(s) &= ${p.substitutedFactorsLatex.join(' \\cdot ')}${
                      p.hasMultipleFractions
                        ? ` \\\\[4pt] P_{${p.index}}(s) &= ${rawPolyPairToLatex(p.rawUnreducedNum, p.rawUnreducedDen)}`
                        : ''
                    } \\\\[6pt]
\\mathbf{P_{${p.index}}(s)} &= \\mathbf{${p.finalGainLatex}}
\\end{aligned}`}
                    block
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 3 — IDENTIFICAÇÃO DOS LAÇOS INDIVIDUAIS (L_i)
         ===================================================================== */}
      <div style={stepCardStyle} data-testid="mason-step-3">
        <div style={stepHeaderStyle} onClick={() => toggleStep(3)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#a855f7',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 3
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Identificação e Desenvolvimento dos Laços Individuais (<MathView math="L_i" inline />)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[3] ? '▲' : '▼'}</span>
        </div>

        {openSteps[3] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Um laço individual <MathView math="L_i(s)" inline /> é qualquer caminho fechado que parte de um nó e retorna a ele mesmo sem repetir nós intermediários, incorporando os sinais <MathView math="(+)" inline /> e <MathView math="(-)" inline /> das realimentações nos somadores.
            </div>

            {detailedLoops.length === 0 ? (
              <div style={{ ...mathBoxStyle, borderLeft: '3px solid #a855f7' }}>
                <div style={{ fontSize: '0.84rem', color: '#e9d5ff', marginBottom: '6px', fontWeight: 700 }}>
                  Sistema em Malha Aberta (Nenhum laço fechado identificado):
                </div>
                <MathView math="M = 0 \implies \sum_{i} L_i(s) = 0" block />
              </div>
            ) : (
              detailedLoops.map(lp => (
                <div
                  key={lp.index}
                  style={{
                    ...mathBoxStyle,
                    borderLeft: '3px solid #a855f7'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#c084fc' }}>
                      Laço Fechado <MathView math={`L_{${lp.index}}(s)`} inline />
                    </span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        background: lp.overallSign === '-' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: lp.overallSign === '-' ? '#fca5a5' : '#6ee7b7'
                      }}
                    >
                      Realimentação {lp.overallSign === '-' ? 'Negativa' : 'Positiva'}:{' '}
                      <MathView math={`(${lp.overallSign}1)`} inline />
                    </span>
                  </div>

                  {/* Sequência fechada de nós */}
                  <div style={{ background: '#060a14', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Sequência de nós do ciclo fechado:
                    </div>
                    <MathView math={lp.closedNodeLabelsLatex.join(' \\longrightarrow ')} block />
                  </div>

                  {/* Ganhos e sinais de cada transição */}
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Ganhos e sinais ao longo do ciclo:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {lp.edges.map((e, eIdx) => (
                      <span
                        key={eIdx}
                        style={{
                          background: '#060a14',
                          border: '1px solid rgba(168, 85, 247, 0.2)',
                          borderRadius: '5px',
                          padding: '4px 8px',
                          fontSize: '0.76rem'
                        }}
                      >
                        <MathView
                          math={`${e.fromLabelLatex} \\xrightarrow{(${e.sign})} ${e.toLabelLatex}: \\; ${e.gainLatex}`}
                          inline
                        />
                      </span>
                    ))}
                  </div>

                  {/* Multiplicação passo a passo */}
                  <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.22)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#d8b4fe', fontWeight: 700, marginBottom: '4px' }}>
                      Demonstração da multiplicação dos ganhos do laço:
                    </div>
                    <MathView
                      math={`\\begin{aligned}
L_{${lp.index}}(s) &= ${lp.symbolicFactorsLatex.join(' \\cdot ')} \\\\[4pt]
L_{${lp.index}}(s) &= ${lp.substitutedFactorsLatex.join(' \\cdot ')}${
                        lp.hasMultipleFractions
                          ? ` \\\\[4pt] L_{${lp.index}}(s) &= ${rawPolyPairToLatex(lp.rawUnreducedNum, lp.rawUnreducedDen)}`
                          : ''
                      } \\\\[6pt]
\\mathbf{L_{${lp.index}}(s)} &= \\mathbf{${lp.finalGainLatex}}
\\end{aligned}`}
                      block
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 4 — IDENTIFICAÇÃO DOS LAÇOS DISJUNTOS
         ===================================================================== */}
      <div style={stepCardStyle} data-testid="mason-step-4">
        <div style={stepHeaderStyle} onClick={() => toggleStep(4)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#f59e0b',
                color: '#020617',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 4
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Identificação e Multiplicação dos Laços Disjuntos
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[4] ? '▲' : '▼'}</span>
        </div>

        {openSteps[4] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Dois ou mais laços são mutuamente disjuntos quando não compartilham nenhum nó em comum (<MathView math="V(L_i) \cap V(L_j) = \emptyset" inline />).
            </div>

            {/* 4.1 Pares de Laços (2 a 2) */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
                4.1. Verificação de Pares de Laços (2 a 2)
              </div>

              {detailedLoops.length < 2 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  O sistema possui apenas {detailedLoops.length} laço(s) individual(is). Logo, não existem pares de laços a formar:
                  <MathView math="\sum_{i,j} L_i(s)L_j(s) = 0" block />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pairComparisons.map((pc, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#060a14',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: pc.isDisjoint
                          ? '1px solid rgba(16, 185, 129, 0.35)'
                          : '1px solid rgba(245, 158, 11, 0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <MathView math={`\\text{Par } (L_{${pc.i}}, L_{${pc.j}})`} inline />
                        <span
                          style={{
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            color: pc.isDisjoint ? '#34d399' : '#fbbf24'
                          }}
                        >
                          {pc.isDisjoint ? '✓ LAÇOS DISJUNTOS (NÃO SE TOCAM)' : '✗ LAÇOS SE TOCAM'}
                        </span>
                      </div>

                      {pc.isDisjoint ? (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Interseção de nós: <MathView math={`V(L_{${pc.i}}) \\cap V(L_{${pc.j}}) = \\emptyset`} inline />
                          </div>
                          <MathView
                            math={`L_{${pc.i}}(s) \\cdot L_{${pc.j}}(s) = \\left(${
                              detailedLoops[pc.i - 1].finalGainLatex
                            }\\right) \\cdot \\left(${detailedLoops[pc.j - 1].finalGainLatex}\\right) = \\mathbf{${
                              pc.gainProductLatex
                            }}`}
                            block
                          />
                        </div>
                      ) : (
                        <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Compartilham o(s) nó(s):{' '}
                          <MathView
                            math={`V(L_{${pc.i}}) \\cap V(L_{${pc.j}}) = \\{ ${pc.sharedNodesLatex.join(', ')} \\} \\neq \\emptyset`}
                            inline
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {disjointPairsOrder2.length === 0 && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        fontSize: '0.8rem',
                        color: '#fde68a'
                      }}
                    >
                      Conclusão para pares (2 a 2): Não existem pares de laços disjuntos neste diagrama.
                      <MathView math="\sum_{i,j} L_i(s)L_j(s) = 0" block />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4.2 Combinações de 3 ou mais laços disjuntos */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
                4.2. Combinações de Três ou Mais Laços Mutuamente Disjuntos (<MathView math="r \ge 3" inline />)
              </div>
              {disjointHigherOrders.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Não existem ternas ou combinações de ordem <MathView math="r \ge 3" inline /> de laços mutuamente disjuntos:
                  <MathView math="\sum_{i,j,k} L_i(s)L_j(s)L_k(s) = 0" block />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {disjointHigherOrders.map((comb, cIdx) => {
                    const symProd = comb.loopIndices.map(i => `L_{${i}}(s)`).join(' \\cdot ');
                    const valProd = comb.loopIndices
                      .map(i => `\\left(${detailedLoops[i - 1]?.finalGainLatex || '1'}\\right)`)
                      .join(' \\cdot ');
                    return (
                      <div
                        key={cIdx}
                        style={{
                          background: '#060a14',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700, marginBottom: '4px' }}>
                          Combinação Disjunta de Ordem {comb.order}:
                        </div>
                        <MathView
                          math={`${symProd} = ${valProd} = \\mathbf{${ratToLatex(comb.gain)}}`}
                          block
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 5 — DETERMINANTE DE MASON (\Delta)
         ===================================================================== */}
      <div style={stepCardStyle} data-testid="mason-step-5">
        <div style={stepHeaderStyle} onClick={() => toggleStep(5)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#10b981',
                color: '#020617',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 5
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Cálculo do Determinante Geral de Mason (<MathView math="\Delta" inline />)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[5] ? '▲' : '▼'}</span>
        </div>

        {openSteps[5] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                5.1. Expressão Geral do Determinante de Mason
              </div>
              <MathView
                math="\Delta(s) = 1 - \sum_{i} L_i(s) + \sum_{i,j} L_i(s)L_j(s) - \sum_{i,j,k} L_i(s)L_j(s)L_k(s) + \cdots"
                block
              />
            </div>

            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
                5.2. Substituição dos Termos e Desenvolvimento Algébrico
              </div>

              {detailedLoops.length > 0 && (
                <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Soma dos ganhos dos laços individuais (<MathView math="\sum_i L_i(s)" inline />):
                  </div>
                  <MathView
                    math={`\\sum_{i=1}^{${detailedLoops.length}} L_i(s) = ${detailedLoops
                      .map(l => `\\left(${l.finalGainLatex}\\right)`)
                      .join(' + ')} = ${ratToLatex(sumIndividualLoops)}`}
                    block
                  />
                </div>
              )}

              <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 700, marginBottom: '4px' }}>
                  Substituição completa em <MathView math="\Delta(s)" inline /> e redução ao mesmo denominador:
                </div>
                <MathView
                  math={`\\begin{aligned}
\\Delta(s) &= 1 - \\left(${ratToLatex(sumIndividualLoops)}\\right)${
                    disjointPairsOrder2.length > 0
                      ? ` + \\left(${ratToLatex(sumDisjointPairs)}\\right)`
                      : ' + 0'
                  }${
                    disjointHigherOrders.length > 0
                      ? ` - \\left(${ratToLatex(sumDisjointTriplets)}\\right)`
                      : ''
                  } \\\\[4pt]
${
  !polyIsOne(loopContribution.den) && !polyIsZero(loopContribution.num)
    ? `\\Delta(s) &= 1 + \\frac{${polyToLatex(loopContribution.num)}}{${polyToLatex(
        loopContribution.den
      )}} = \\frac{${formatPolyFactorLatex(loopContribution.den)} + ${formatPolyFactorLatex(
        loopContribution.num
      )}}{${polyToLatex(loopContribution.den)}} \\\\[6pt]`
    : ''
}
\\mathbf{\\Delta(s)} &= \\mathbf{${ratToLatex(analysis.delta)}}
\\end{aligned}`}
                  block
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 6 — DETERMINANTES ASSOCIADOS AOS CAMINHOS DIRETOS (\Delta_k)
         ===================================================================== */}
      <div style={stepCardStyle} data-testid="mason-step-6">
        <div style={stepHeaderStyle} onClick={() => toggleStep(6)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#06b6d4',
                color: '#020617',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 6
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Determinantes Complementares dos Caminhos Diretos (<MathView math="\Delta_k" inline />)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[6] ? '▲' : '▼'}</span>
        </div>

        {openSteps[6] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Para cada caminho direto <MathView math="P_k" inline />, o determinante complementar (cofator) <MathView math="\Delta_k(s)" inline /> é obtido a partir de <MathView math="\Delta(s)" inline /> removendo todos os laços que tocam ao menos um nó de <MathView math="P_k" inline />:
            </div>

            {detailedCofactors.map(cf => (
              <div
                key={cf.pathIndex}
                style={{
                  ...mathBoxStyle,
                  borderLeft: '3px solid #06b6d4'
                }}
              >
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#22d3ee', marginBottom: '8px' }}>
                  Determinante Complementar <MathView math={`\\Delta_{${cf.pathIndex}}(s)`} inline /> (associado a{' '}
                  <MathView math={`P_{${cf.pathIndex}}(s)`} inline />)
                </div>

                {/* Análise de toque de cada laço com o caminho P_k */}
                {cf.loopTouchStatus.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    {cf.loopTouchStatus.map(st => (
                      <div
                        key={st.loopIndex}
                        style={{
                          background: '#060a14',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          border: st.touches
                            ? '1px solid rgba(239, 68, 68, 0.2)'
                            : '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <span>
                          Laço <MathView math={`L_{${st.loopIndex}}`} inline />:{' '}
                          {st.touches ? (
                            <>
                              toca <MathView math={`P_{${cf.pathIndex}}`} inline /> em{' '}
                              <MathView math={`\\{ ${st.sharedNodesLatex.join(', ')} \\}`} inline />
                            </>
                          ) : (
                            <>
                              não compartilha nós com <MathView math={`P_{${cf.pathIndex}}`} inline /> (
                              <MathView
                                math={`V(P_{${cf.pathIndex}}) \\cap V(L_{${st.loopIndex}}) = \\emptyset`}
                                inline
                              />
                              )
                            </>
                          )}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.73rem',
                            color: st.touches ? '#fca5a5' : '#34d399'
                          }}
                        >
                          {st.touches ? 'Excluído do cofator' : 'Participa do cofator'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cálculo explícito de \Delta_k e P_k * \Delta_k */}
                <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                  {cf.activeLoopIndices.length === 0 ? (
                    <MathView
                      math={`\\begin{aligned}
\\Delta_{${cf.pathIndex}}(s) &= 1 - 0 = \\mathbf{1} \\\\[4pt]
P_{${cf.pathIndex}}(s)\\Delta_{${cf.pathIndex}}(s) &= \\left(${
                        detailedPaths[cf.pathIndex - 1]?.finalGainLatex || '1'
                      }\\right) \\cdot 1 = \\mathbf{${cf.pathTimesCofactorLatex}}
\\end{aligned}`}
                      block
                    />
                  ) : (
                    <MathView
                      math={`\\begin{aligned}
\\Delta_{${cf.pathIndex}}(s) &= 1 - \\left(${cf.activeLoopIndices
                        .map(li => detailedLoops[li - 1]?.finalGainLatex || '0')
                        .join(' + ')}\\right) = \\mathbf{${cf.cofactorLatex}} \\\\[4pt]
P_{${cf.pathIndex}}(s)\\Delta_{${cf.pathIndex}}(s) &= \\left(${
                        detailedPaths[cf.pathIndex - 1]?.finalGainLatex || '1'
                      }\\right) \\cdot \\left(${cf.cofactorLatex}\\right) = \\mathbf{${cf.pathTimesCofactorLatex}}
\\end{aligned}`}
                      block
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 7 — APLICAÇÃO DA FÓRMULA DE MASON
         ===================================================================== */}
      <div style={stepCardStyle} data-testid="mason-step-7">
        <div style={stepHeaderStyle} onClick={() => toggleStep(7)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#6366f1',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 7
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Aplicação da Fórmula Geral de Mason
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[7] ? '▲' : '▼'}</span>
        </div>

        {openSteps[7] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Fórmula Geral */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                7.1. Fórmula do Ganho de Mason
              </div>
              <MathView
                math={`T(s) = \\frac{\\displaystyle\\sum_{k=1}^{${detailedPaths.length}} P_k(s)\\Delta_k(s)}{\\Delta(s)} = \\frac{${detailedPaths
                  .map(p => `P_{${p.index}}(s)\\Delta_{${p.index}}(s)`)
                  .join(' + ')}}{\\Delta(s)}`}
                block
              />
            </div>

            {/* Soma do Numerador */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                7.2. Desenvolvimento da Soma do Numerador
              </div>
              <MathView
                math={`\\begin{aligned}
N_{\\text{Mason}}(s) &= \\sum_{k=1}^{${detailedPaths.length}} P_k(s)\\Delta_k(s) \\\\[4pt]
N_{\\text{Mason}}(s) &= ${detailedCofactors
                  .map(cf => `\\left(${cf.pathTimesCofactorLatex}\\right)`)
                  .join(' + ')} \\\\[4pt]
\\mathbf{N_{\\text{Mason}}(s)} &= \\mathbf{${ratToLatex(numeratorSum)}}
\\end{aligned}`}
                block
              />
            </div>

            {/* Substituição e Divisão pelo Denominador */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                7.3. Divisão pelo Determinante Geral <MathView math="\Delta(s)" inline />
              </div>
              <MathView
                math={`\\begin{aligned}
T(s) &= \\frac{N_{\\text{Mason}}(s)}{\\Delta(s)} = \\frac{\\;${ratToLatex(
                  numeratorSum
                )}\\;}{\\;${ratToLatex(analysis.delta)}\\;} \\\\[6pt]
T(s) &= \\left(${ratToLatex(numeratorSum)}\\right) \\cdot \\left(\\frac{${polyToLatex(
                  analysis.delta.den
                )}}{${polyToLatex(analysis.delta.num)}}\\right)
\\end{aligned}`}
                block
              />
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 8 — RESULTADO FINAL E SIMPLIFICAÇÃO ALGÉBRICA
         ===================================================================== */}
      <div
        style={{
          ...stepCardStyle,
          border: '1.5px solid #38bdf8',
          boxShadow: '0 8px 30px rgba(56, 189, 248, 0.16)'
        }}
        data-testid="mason-step-8"
      >
        <div style={stepHeaderStyle} onClick={() => toggleStep(8)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #38bdf8, #10b981)',
                color: '#020617',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 900
              }}
            >
              ETAPA 8
            </span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
              Resultado Final e Simplificação Algébrica (<MathView math="T(s)" inline />)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[8] ? '▲' : '▼'}</span>
        </div>

        {openSteps[8] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Operações de Simplificação Realizadas */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                8.1. Simplificação Algébrica de Fatores Comuns
              </div>
              {hasCommonDenominatorCancel ? (
                <>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Cancelando o polinômio denominador comum{' '}
                    <MathView math={`\\left(${polyToLatex(numeratorSum.den)}\\right)`} inline /> presente tanto em{' '}
                    <MathView math="N_{\text{Mason}}(s)" inline /> quanto em <MathView math="\Delta(s)" inline />:
                  </div>
                  <MathView
                    math={`T(s) = \\frac{\\cancel{\\left(${polyToLatex(
                      analysis.delta.den
                    )}\\right)} \\cdot \\left(${polyToLatex(
                      numeratorSum.num
                    )}\\right)}{\\cancel{\\left(${polyToLatex(
                      numeratorSum.den
                    )}\\right)} \\cdot \\left(${polyToLatex(
                      analysis.delta.num
                    )}\\right)} = ${finalTotalTLatex}`}
                    block
                  />
                </>
              ) : (
                <MathView
                  math={`T(s) = ${
                    rawCrossLatex !== finalTotalTLatex ? `${rawCrossLatex} = ` : ''
                  }${finalTotalTLatex}`}
                  block
                />
              )}
            </div>

            {/* Caixa de Destaque Final */}
            <div
              style={{
                background: 'linear-gradient(180deg, #040917 0%, #071329 100%)',
                border: '1.5px solid rgba(56, 189, 248, 0.5)',
                borderRadius: '10px',
                padding: '18px 16px',
                textAlign: 'center',
                boxShadow: 'inset 0 0 24px rgba(56, 189, 248, 0.08)'
              }}
            >
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}
              >
                Função de Transferência Equivalente em Malha Fechada
              </div>

              <div style={{ overflowX: 'auto', padding: '6px 0' }}>
                <MathView
                  math={`T(s) = \\frac{C(s)}{R(s)}${
                    inputSymbolLatex !== 'R(s)' || outputSymbolLatex !== 'C(s)'
                      ? ` = \\frac{${outputSymbolLatex}}{${inputSymbolLatex}}`
                      : ''
                  } = \\mathbf{${finalTotalTLatex}}`}
                  block
                />
              </div>

              {/* Botões para Copiar o Resultado Final */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: '12px'
                }}
              >
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() =>
                    handleCopyText(`T(s) = \\frac{${outputSymbolLatex}}{${inputSymbolLatex}} = ${finalTotalTLatex}`, 'final-latex')
                  }
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    borderColor: copiedType === 'final-latex' ? '#10b981' : 'rgba(56,189,248,0.4)',
                    color: copiedType === 'final-latex' ? '#10b981' : '#e2e8f0'
                  }}
                >
                  {copiedType === 'final-latex' ? '✓ Equação LaTeX Copiada!' : '📋 Copiar Equação LaTeX'}
                </button>

                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => handleCopyText(`T(s) = ${compactFinalText}`, 'final-text')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    borderColor: copiedType === 'final-text' ? '#10b981' : 'rgba(56,189,248,0.4)',
                    color: copiedType === 'final-text' ? '#10b981' : '#e2e8f0'
                  }}
                >
                  {copiedType === 'final-text' ? '✓ Expressão Copiada!' : '📋 Copiar Expressão Algébrica'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadLatexFile}
                  style={{
                    background: 'rgba(16, 185, 129, 0.16)',
                    border: '1px solid #10b981',
                    color: '#6ee7b7',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📥 Baixar Memorial LaTeX (.tex)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
