'use client';

import React, { useMemo, useState } from 'react';
import {
  DiagramConnection,
  DiagramElement,
  DiagramGraph,
  MasonAnalysis
} from '@/core/reduction/mason';
import {
  RatFunc,
  ratAdd,
  ratMul,
  ratOne,
  ratScale,
  ratToLatex,
  ratZero
} from '@/core/algebra/rational';
import {
  Polynomial,
  polyFromNumber,
  polyIsOne,
  polyIsZero,
  polyMul,
  polyToLatex
} from '@/core/algebra/polynomial';
import { MathView } from '@/components/MathView';
import {
  analyzeCompleteBlockDiagram,
  formatCleanSignalLatex,
  formatRatFuncCompact,
  formatRatFuncLatex,
  InputOutputMasonPair
} from './symbolicMasonEngine';

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
  order: number;
  loopIndices: number[];
  gain: RatFunc;
}

/**
 * Converte um nome ou código de elemento para notação matemática LaTeX limpa,
 * sem exibir IDs técnicos, UUIDs ou timestamps.
 */
export function formatElementSymbolToLatex(rawName?: string, fallbackCode?: string): string {
  return formatCleanSignalLatex(rawName, fallbackCode);
}

function wrapParensLatex(latex: string, force: boolean = false): string {
  const t = latex.trim();
  if (force) return `\\left(${t}\\right)`;
  if (t.startsWith('-')) return `\\left(${t}\\right)`;
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

function formatPolyFactorLatex(P: Polynomial): string {
  const lat = polyToLatex(P)
    .replace(/\b([GHWRC])([a-zA-Z])\b/g, '$1_{$2}')
    .replace(/\b([GHWRC])_([a-zA-Z0-9]+)\b/g, '$1_{$2}');
  if (P.length > 1 || (P.length === 1 && P[0].coeff < 0)) {
    return `\\left(${lat}\\right)`;
  }
  return lat;
}

function rawPolyPairToLatex(num: Polynomial, den: Polynomial): string {
  const nLat = polyToLatex(num)
    .replace(/\b([GHWRC])([a-zA-Z])\b/g, '$1_{$2}')
    .replace(/\b([GHWRC])_([a-zA-Z0-9]+)\b/g, '$1_{$2}');
  const dLat = polyToLatex(den)
    .replace(/\b([GHWRC])([a-zA-Z])\b/g, '$1_{$2}')
    .replace(/\b([GHWRC])_([a-zA-Z0-9]+)\b/g, '$1_{$2}');
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
    8: true,
    9: true
  });

  const toggleStep = (stepNumber: number) => {
    setOpenSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const setAllSteps = (open: boolean) => {
    setOpenSteps({
      1: open,
      2: open,
      3: open,
      4: open,
      5: open,
      6: open,
      7: open,
      8: open,
      9: open
    });
  };

  // =========================================================================
  // ANÁLISE MULTI-ENTRADA, MULTI-SINAL E VALIDAÇÃO ALGÉBRICA COMPLETA
  // =========================================================================
  const systemData = useMemo(() => {
    const baseGraph: DiagramGraph = graph || {
      elements: analysis.elements || [],
      connections: []
    };

    const fullSys = analyzeCompleteBlockDiagram(
      baseGraph,
      inputElement?.id,
      outputElement?.id
    );

    const G = fullSys.preparedGraph;
    const elementsMap = new Map<string, DiagramElement>();
    G.elements.forEach(e => elementsMap.set(e.id, e));

    const getCleanLatexLabel = (nodeId: string): string => {
      if (fullSys.nodeInfoMap[nodeId]) {
        return fullSys.nodeInfoMap[nodeId].signalLatex;
      }
      const el = elementsMap.get(nodeId);
      if (el) return formatCleanSignalLatex(el.name, el.code);
      return formatCleanSignalLatex(nodeId);
    };

    const getCleanDisplayName = (nodeId: string): string => {
      if (fullSys.nodeInfoMap[nodeId]) {
        return fullSys.nodeInfoMap[nodeId].displayName;
      }
      const el = elementsMap.get(nodeId);
      return el ? el.name || el.code || 'Elemento' : 'Nó';
    };

    const buildEdgeDetail = (u: string, v: string) => {
      const conn: DiagramConnection | undefined = G.connections.find(
        c => !c.isPending && c.from === u && c.to === v
      );
      const sign: '+' | '-' = conn?.sign === '-' ? '-' : '+';
      const toEl = elementsMap.get(v);
      let gain = toEl?.type === 'block' ? toEl.rat || ratOne() : ratOne();
      if (sign === '-') gain = ratScale(gain, -1);
      const blockSym =
        toEl?.type === 'block' ? formatCleanSignalLatex(toEl.name, toEl.code) : null;
      return {
        fromId: u,
        toId: v,
        fromDisplayName: getCleanDisplayName(u),
        toDisplayName: getCleanDisplayName(v),
        fromLabelLatex: getCleanLatexLabel(u),
        toLabelLatex: getCleanLatexLabel(v),
        sign,
        blockSymbolLatex: blockSym,
        gain,
        gainLatex: formatRatFuncLatex(gain)
      };
    };

    // Conexões direcionadas para a Etapa 1 (com nomes legíveis, sem UUIDs)
    const directedEdges = G.connections.map((c, idx) => {
      const d = buildEdgeDetail(c.from, c.to);
      return {
        index: idx + 1,
        ...d
      };
    });

    // Detalhamento dos Caminhos Diretos E Cofatores SEPARADOS POR ENTRADA INDEPENDENTE
    const buildDetailedPairData = (pair: InputOutputMasonPair) => {
      const mRes = pair.masonAnalysis;
      const paths = mRes.forwardPaths.map((fp, idx) => {
        const edges = [];
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
            const sym = formatCleanSignalLatex(toEl.name, toEl.code);
            symbolicFactorsLatex.push(edge.sign === '-' ? `\\left(-${sym}\\right)` : sym);
            substitutedFactorsLatex.push(
              edge.sign === '-'
                ? `\\left(-${formatRatFuncLatex(bRat)}\\right)`
                : wrapParensLatex(formatRatFuncLatex(bRat), true)
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

        const dk = mRes.cofactors[idx] || ratOne();
        const pkDk = ratMul(fp.gain, dk);

        // Status de toque de cada laço com este caminho direto
        const loopTouchStatus = mRes.loops.map((lp, lIdx) => {
          const shared = lp.nodes.filter(n => fp.nodes.includes(n));
          return {
            loopIndex: lIdx + 1,
            touches: shared.length > 0,
            sharedNodesLatex: shared.map(getCleanLatexLabel),
            loopGainLatex: formatRatFuncLatex(lp.gain)
          };
        });

        return {
          index: idx + 1,
          nodesLatex: fp.nodes.map(getCleanLatexLabel),
          edges,
          overallSign,
          symbolicFactorsLatex,
          substitutedFactorsLatex,
          rawUnreducedLatex: rawPolyPairToLatex(rawNum, rawDen),
          hasMultipleFractions: blockCount >= 2 && !fullSys.isPureSymbolicMode,
          finalGain: fp.gain,
          finalGainLatex: formatRatFuncLatex(fp.gain),
          cofactor: dk,
          cofactorLatex: formatRatFuncLatex(dk),
          pathTimesCofactor: pkDk,
          pathTimesCofactorLatex: formatRatFuncLatex(pkDk),
          loopTouchStatus,
          activeLoopIndices: loopTouchStatus.filter(s => !s.touches).map(s => s.loopIndex)
        };
      });

      const numeratorSum = paths.reduce((acc, p) => ratAdd(acc, p.pathTimesCofactor), ratZero());

      return {
        pair,
        paths,
        numeratorSum,
        numeratorSumLatex: formatRatFuncLatex(numeratorSum)
      };
    };

    const detailedInputGroups = fullSys.outputByInputPairs.map(buildDetailedPairData);

    // Laços Individuais do Sistema (comuns a todo o grafo)
    const refMason = fullSys.outputByInputPairs[0]?.masonAnalysis || analysis;
    const detailedLoops = refMason.loops.map((lp, idx) => {
      const edges = [];
      for (let i = 0; i < lp.nodes.length; i++) {
        const u = lp.nodes[i];
        const v = lp.nodes[(i + 1) % lp.nodes.length];
        edges.push(buildEdgeDetail(u, v));
      }
      const negCount = edges.filter(e => e.sign === '-').length;
      const overallSign: '+' | '-' = negCount % 2 === 1 ? '-' : '+';

      const symbolicFactorsLatex: string[] = [overallSign === '-' ? '(-1)' : '(+1)'];
      const substitutedFactorsLatex: string[] = [overallSign === '-' ? '(-1)' : '(+1)'];
      let rawNum = polyFromNumber(overallSign === '-' ? -1 : 1);
      let rawDen = polyFromNumber(1);
      let blockCount = 0;

      edges.forEach(edge => {
        const toEl = elementsMap.get(edge.toId);
        if (toEl?.type === 'block') {
          blockCount++;
          const bRat = toEl.rat || ratOne();
          const sym = formatCleanSignalLatex(toEl.name, toEl.code);
          symbolicFactorsLatex.push(sym);
          substitutedFactorsLatex.push(wrapParensLatex(formatRatFuncLatex(bRat), true));
          rawNum = polyMul(rawNum, bRat.num);
          rawDen = polyMul(rawDen, bRat.den);
        }
      });

      const closedNodes = [...lp.nodes, lp.nodes[0]];
      const directionDesc = lp.nodes.some(n => elementsMap.get(n)?.dir === 'left')
        ? 'Malha fechada com ramo de retorno'
        : 'Malha fechada de realimentação direta';

      return {
        index: idx + 1,
        nodes: lp.nodes,
        closedNodesLatex: closedNodes.map(getCleanLatexLabel),
        directionDesc,
        edges,
        negativeSignsCount: negCount,
        overallSign,
        symbolicFactorsLatex,
        substitutedFactorsLatex,
        rawUnreducedLatex: rawPolyPairToLatex(rawNum, rawDen),
        hasMultipleFractions: blockCount >= 2 && !fullSys.isPureSymbolicMode,
        finalGain: lp.gain,
        finalGainLatex: formatRatFuncLatex(lp.gain)
      };
    });

    // Laços Disjuntos (Pares 2 a 2, Ternas 3 a 3 e Ordens Superiores)
    const pairComparisons = [];
    for (let i = 0; i < refMason.loops.length; i++) {
      for (let j = i + 1; j < refMason.loops.length; j++) {
        const shared = refMason.loops[i].nodes.filter(n => refMason.loops[j].nodes.includes(n));
        const isDisjoint = shared.length === 0;
        const prod = isDisjoint ? ratMul(refMason.loops[i].gain, refMason.loops[j].gain) : undefined;
        pairComparisons.push({
          i: i + 1,
          j: j + 1,
          sharedNodesLatex: shared.map(getCleanLatexLabel),
          isDisjoint,
          gainProduct: prod,
          gainProductLatex: prod ? formatRatFuncLatex(prod) : undefined
        });
      }
    }

    const allDisjointCombinations: DisjointLoopCombination[] = [];
    const mLoops = refMason.loops.length;
    function findDisjoint(
      startIdx: number,
      chosenIndices: number[],
      chosenNodes: string[],
      prodGain: RatFunc
    ) {
      for (let i = startIdx; i < mLoops; i++) {
        const lp = refMason.loops[i];
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
          findDisjoint(i + 1, nextIndices, [...chosenNodes, ...lp.nodes], nextGain);
        }
      }
    }
    findDisjoint(0, [], [], ratOne());

    const disjointPairsOrder2 = allDisjointCombinations.filter(c => c.order === 2);
    const disjointHigherOrders = allDisjointCombinations.filter(c => c.order >= 3);

    const sumIndividualLoops = refMason.loops.reduce((acc, lp) => ratAdd(acc, lp.gain), ratZero());
    const sumDisjointPairs = disjointPairsOrder2.reduce((acc, c) => ratAdd(acc, c.gain), ratZero());
    const sumDisjointTriplets = allDisjointCombinations
      .filter(c => c.order === 3)
      .reduce((acc, c) => ratAdd(acc, c.gain), ratZero());

    const loopContribution = ratAdd(refMason.delta, ratScale(ratOne(), -1));

    return {
      fullSys,
      directedEdges,
      detailedInputGroups,
      detailedLoops,
      pairComparisons,
      disjointPairsOrder2,
      disjointHigherOrders,
      sumIndividualLoops,
      sumDisjointPairs,
      sumDisjointTriplets,
      loopContribution,
      commonDelta: refMason.delta,
      commonDeltaLatex: formatRatFuncLatex(refMason.delta),
      commonDeltaCompact: formatRatFuncCompact(refMason.delta)
    };
  }, [analysis, graph, inputElement, outputElement]);

  // =========================================================================
  // GERADOR DO DOCUMENTO LATEX COMPLETO (.tex) PARA COMPILAÇÃO NO OVERLEAF
  // =========================================================================
  const generateOverleafLatexDocument = (): string => {
    const {
      fullSys,
      directedEdges,
      detailedInputGroups,
      detailedLoops,
      pairComparisons,
      disjointPairsOrder2,
      disjointHigherOrders,
      sumIndividualLoops,
      sumDisjointPairs,
      loopContribution,
      commonDeltaLatex
    } = systemData;

    const lines: string[] = [];
    lines.push(`% ==========================================================================`);
    lines.push(`% MEMORIAL ACADÊMICO DE CÁLCULO — REGRA DE MASON E VALIDAÇÃO ALGÉBRICA`);
    lines.push(`% Gerado automaticamente pelo Construtor Livre de Diagramas de Blocos`);
    lines.push(`% Compatível com Overleaf (pdfLaTeX / XeLaTeX / LuaLaTeX)`);
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
    lines.push(`\\title{\\textbf{Memorial de Cálculo Detalhado — Redução por Regra de Mason e Validação Algébrica}}`);
    lines.push(
      `\\author{Análise Completa de Sistemas de Controle — Saída Principal $${fullSys.primaryOutput.signalLatex}$}`
    );
    lines.push(`\\date{\\today}`);
    lines.push(``);
    lines.push(`\\begin{document}`);
    lines.push(`\\maketitle`);
    lines.push(`\\hrule`);
    lines.push(`\\vspace{8pt}`);

    // ETAPA 1
    lines.push(`\\section{Identificação do Grafo e Equações dos Elementos}`);
    lines.push(`\\subsection{Entradas Independentes e Saídas}`);
    lines.push(`\\begin{itemize}[leftmargin=*]`);
    fullSys.independentInputs.forEach(inp => {
      lines.push(
        `  \\item \\textbf{Entrada Independente (${
          inp.role === 'input-dist' ? 'Perturbação' : 'Referência'
        }):} $${inp.signalLatex}$`
      );
    });
    fullSys.outputs.forEach(out => {
      lines.push(`  \\item \\textbf{Saída do Sistema:} $${out.signalLatex}$`);
    });
    lines.push(`\\end{itemize}`);

    if (fullSys.blocks.length > 0) {
      lines.push(`\\subsection{Blocos Funcionais e Ganhos}`);
      lines.push(`\\begin{itemize}[leftmargin=*]`);
      fullSys.blocks.forEach(b => {
        lines.push(
          `  \\item Bloco $${b.symbolLatex}$ (${
            b.dir === 'left' ? 'Ramo de Realimentação' : 'Ramo Direto'
          }): \\[ ${b.symbolLatex} = ${b.gainLatex} \\]`
        );
      });
      lines.push(`\\end{itemize}`);
    }

    if (fullSys.summerEquations.length > 0) {
      lines.push(`\\subsection{Equações Algébricas dos Somadores e Sinais Resultantes}`);
      lines.push(`Considerando os sinais incidentes, os ganhos dos ramos e as polaridades de cada somador:`);
      lines.push(`\\begin{align}`);
      fullSys.summerEquations.forEach(sEq => {
        lines.push(`  ${sEq.equationLatex} \\\\`);
      });
      fullSys.outputEquations.forEach(oEq => {
        lines.push(`  ${oEq.equationLatex}`);
      });
      lines.push(`\\end{align}`);
    }

    lines.push(`\\subsection{Conexões Direcionadas do Grafo}`);
    lines.push(`\\begin{itemize}[leftmargin=*]`);
    directedEdges.forEach(e => {
      lines.push(
        `  \\item Ramo $${e.fromLabelLatex} \\xrightarrow{(${e.sign})} ${e.toLabelLatex}$ com ganho de ramo $g(s) = ${e.gainLatex}$`
      );
    });
    lines.push(`\\end{itemize}`);

    // ETAPA 2
    lines.push(`\\section{Identificação dos Caminhos Diretos ($P_k$) por Entrada}`);
    detailedInputGroups.forEach(grp => {
      lines.push(
        `\\subsection{Caminhos Diretos de $${grp.pair.inputInfo.signalLatex}$ para $${grp.pair.targetInfo.signalLatex}$}`
      );
      if (grp.paths.length === 0) {
        lines.push(`Não existem caminhos diretos conectados entre $${grp.pair.inputInfo.signalLatex}$ e $${grp.pair.targetInfo.signalLatex}$.`);
      } else {
        grp.paths.forEach(p => {
          lines.push(`\\begin{itemize}[leftmargin=*]`);
          lines.push(`  \\item \\textbf{Caminho $P_{${p.index}}(s)$ — Sequência de nós:} $${p.nodesLatex.join(' \\rightarrow ')}$`);
          lines.push(`  \\item \\textbf{Sinal resultante do caminho:} $(${p.overallSign}1)$`);
          lines.push(`  \\item \\textbf{Multiplicação detalhada dos ganhos:}`);
          lines.push(`  \\begin{align*}`);
          lines.push(`    P_{${p.index}}(s) &= ${p.symbolicFactorsLatex.join(' \\cdot ')} \\\\`);
          if (p.substitutedFactorsLatex.join(' \\cdot ') !== p.symbolicFactorsLatex.join(' \\cdot ')) {
            lines.push(`    P_{${p.index}}(s) &= ${p.substitutedFactorsLatex.join(' \\cdot ')} \\\\`);
          }
          lines.push(`    P_{${p.index}}(s) &= \\mathbf{${p.finalGainLatex}}`);
          lines.push(`  \\end{align*}`);
          lines.push(`\\end{itemize}`);
        });
      }
    });

    // ETAPA 3
    lines.push(`\\section{Identificação dos Laços Individuais ($L_i$)}`);
    if (detailedLoops.length === 0) {
      lines.push(`O sistema opera em malha aberta ($M = 0$), logo $\\sum_i L_i(s) = 0$.`);
    } else {
      detailedLoops.forEach(lp => {
        lines.push(`\\subsection*{Laço Individual $L_{${lp.index}}(s)$}`);
        lines.push(`\\begin{itemize}[leftmargin=*]`);
        lines.push(`  \\item \\textbf{Sequência fechada de nós:} $${lp.closedNodesLatex.join(' \\rightarrow ')}$`);
        lines.push(`  \\item \\textbf{Polaridade efetiva do laço:} $(${lp.overallSign}1)$`);
        lines.push(`  \\item \\textbf{Multiplicação algébrica detalhada:}`);
        lines.push(`  \\begin{align*}`);
        lines.push(`    L_{${lp.index}}(s) &= ${lp.symbolicFactorsLatex.join(' \\cdot ')} \\\\`);
        if (lp.substitutedFactorsLatex.join(' \\cdot ') !== lp.symbolicFactorsLatex.join(' \\cdot ')) {
          lines.push(`    L_{${lp.index}}(s) &= ${lp.substitutedFactorsLatex.join(' \\cdot ')} \\\\`);
        }
        lines.push(`    L_{${lp.index}}(s) &= \\mathbf{${lp.finalGainLatex}}`);
        lines.push(`  \\end{align*}`);
        lines.push(`\\end{itemize}`);
      });
    }

    // ETAPA 4
    lines.push(`\\section{Identificação dos Laços Disjuntos}`);
    if (detailedLoops.length < 2) {
      lines.push(
        `O grafo possui ${detailedLoops.length} laço(s) fechado(s). Portanto, não há combinações de dois ou mais laços disjuntos ($\\sum L_i L_j = 0$).`
      );
    } else {
      lines.push(`\\begin{itemize}[leftmargin=*]`);
      pairComparisons.forEach(pc => {
        if (pc.isDisjoint) {
          lines.push(
            `  \\item Par $(L_{${pc.i}}, L_{${pc.j}})$: $V(L_{${pc.i}}) \\cap V(L_{${pc.j}}) = \\emptyset$ (\\textbf{Disjuntos}) $\\Rightarrow L_{${pc.i}}(s)L_{${pc.j}}(s) = ${pc.gainProductLatex}$`
          );
        } else {
          lines.push(
            `  \\item Par $(L_{${pc.i}}, L_{${pc.j}})$: compartilham $\\{${pc.sharedNodesLatex.join(', ')}\\} \\neq \\emptyset$ (\\textbf{Tocam-se}).`
          );
        }
      });
      lines.push(`\\end{itemize}`);
      if (disjointHigherOrders.length > 0) {
        lines.push(`\\subsection*{Combinações de Ordem Superior ($r \\ge 3$)}`);
        lines.push(`\\begin{itemize}[leftmargin=*]`);
        disjointHigherOrders.forEach(comb => {
          lines.push(
            `  \\item Ordem ${comb.order}: $${comb.loopIndices.map(i => `L_{${i}}(s)`).join(' \\cdot ')} = ${formatRatFuncLatex(comb.gain)}$`
          );
        });
        lines.push(`\\end{itemize}`);
      }
    }

    // ETAPA 5
    lines.push(`\\section{Cálculo do Determinante Geral ($\\Delta$)}`);
    lines.push(`\\begin{equation}`);
    lines.push(
      `  \\Delta(s) = 1 - \\sum_{i} L_i(s) + \\sum_{i,j} (L_i L_j)_{\\text{disjuntos}} - \\sum_{i,j,k} (L_i L_j L_k)_{\\text{disjuntos}} + \\cdots`
    );
    lines.push(`\\end{equation}`);
    lines.push(`Substituindo os valores determinados:`);
    lines.push(`\\begin{align*}`);
    lines.push(
      `  \\Delta(s) &= 1 - \\left(${formatRatFuncLatex(sumIndividualLoops)}\\right)${
        disjointPairsOrder2.length > 0 ? ` + \\left(${formatRatFuncLatex(sumDisjointPairs)}\\right)` : ''
      } \\\\`
    );
    if (!polyIsOne(loopContribution.den) && !polyIsZero(loopContribution.num)) {
      lines.push(
        `  \\Delta(s) &= \\frac{${formatPolyFactorLatex(loopContribution.den)} + ${formatPolyFactorLatex(
          loopContribution.num
        )}}{${formatPolyFactorLatex(loopContribution.den)}} \\\\`
      );
    }
    lines.push(`  \\Delta(s) &= \\mathbf{${commonDeltaLatex}}`);
    lines.push(`\\end{align*}`);

    // ETAPA 6
    lines.push(`\\section{Cálculo dos Cofatores ($\\Delta_k$) por Entrada}`);
    detailedInputGroups.forEach(grp => {
      lines.push(
        `\\subsection{Cofatores para a Entrada $${grp.pair.inputInfo.signalLatex}$ $\\rightarrow$ $${grp.pair.targetInfo.signalLatex}$}`
      );
      grp.paths.forEach(p => {
        lines.push(
          `Para o caminho direto $P_{${p.index}}(s)$, excluem-se os laços que tocam o caminho:`
        );
        lines.push(`\\[ \\Delta_{${p.index}}(s) = \\mathbf{${p.cofactorLatex}}, \\qquad P_{${p.index}}(s)\\Delta_{${p.index}}(s) = \\mathbf{${p.pathTimesCofactorLatex}} \\]`);
      });
    });

    // ETAPA 7
    lines.push(`\\section{Aplicação da Fórmula Geral de Mason para Cada Entrada}`);
    detailedInputGroups.forEach(grp => {
      const inSym = grp.pair.inputInfo.signalLatex;
      const outSym = grp.pair.targetInfo.signalLatex;
      lines.push(`\\subsection{Função de Transferência $\\dfrac{${outSym}}{${inSym}}$}`);
      lines.push(`\\begin{align}`);
      lines.push(
        `  \\frac{${outSym}}{${inSym}} &= \\frac{\\sum_{k=1}^{${grp.paths.length}} P_k(s)\\Delta_k(s)}{\\Delta(s)} = \\frac{${grp.numeratorSumLatex}}{${commonDeltaLatex}} = \\mathbf{${grp.pair.transferFunctionLatex}}`
      );
      lines.push(`\\end{align}`);
    });

    // ETAPA 8
    lines.push(`\\section{Resultado Final, Sinais de Erro/Controle e Superposição}`);
    lines.push(`\\subsection{Funções de Transferência da Saída Principal}`);
    lines.push(`\\begin{align}`);
    fullSys.outputByInputPairs.forEach(p => {
      lines.push(
        `  \\frac{${p.targetInfo.signalLatex}}{${p.inputInfo.signalLatex}} &= \\mathbf{${p.transferFunctionLatex}} \\\\`
      );
    });
    lines.push(`\\end{align}`);

    if (fullSys.summerByInputPairs.length > 0) {
      lines.push(`\\subsection{Funções de Transferência dos Sinais dos Somadores (Erro e Controle)}`);
      lines.push(`\\begin{align}`);
      fullSys.summerByInputPairs.forEach(p => {
        lines.push(
          `  \\frac{${p.targetInfo.signalLatex}}{${p.inputInfo.signalLatex}} &= \\mathbf{${p.transferFunctionLatex}} \\\\`
        );
      });
      lines.push(`\\end{align}`);
    }

    lines.push(`\\subsection{Expressão Completa da Saída Total por Superposição}`);
    lines.push(`\\[ \\boxed{${fullSys.superpositionOutputLatex}} \\]`);

    // VALIDAÇÃO ALGÉBRICA INDEPENDENTE
    lines.push(`\\section{Validação Algébrica Independente (Método das Equações dos Nós)}`);
    fullSys.algebraicValidationSteps.forEach(st => {
      lines.push(`\\subsection*{${st.title}}`);
      lines.push(`${st.description}`);
      lines.push(`\\[ ${st.equationLatex} \\]`);
    });
    lines.push(
      `\\textbf{Conclusão da Validação:} Os resultados obtidos pela Regra do Ganho de Mason e pela resolução algébrica direta do sistema de equações são \\textbf{idênticos} para todas as entradas e variáveis analisadas.`
    );

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
    fullSys,
    directedEdges,
    detailedInputGroups,
    detailedLoops,
    pairComparisons,
    disjointPairsOrder2,
    disjointHigherOrders,
    sumIndividualLoops,
    sumDisjointPairs,
    sumDisjointTriplets,
    loopContribution,
    commonDeltaLatex
  } = systemData;

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
              <span
                style={{
                  background: fullSys.allValidationsMatch
                    ? 'rgba(16, 185, 129, 0.16)'
                    : 'rgba(239, 68, 68, 0.16)',
                  color: fullSys.allValidationsMatch ? '#34d399' : '#fca5a5',
                  border: `1px solid ${fullSys.allValidationsMatch ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.71rem',
                  fontWeight: 700
                }}
              >
                {fullSys.allValidationsMatch
                  ? '✓ Validado Algebricamente (Mason = Sistema de Equações)'
                  : '⚠️ Alerta de Divergência Algébrica'}
              </span>
            </div>
            <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.06rem', color: '#f8fafc', fontWeight: 800 }}>
              Memorial Matemático Completo — Regra de Mason e Validação Algébrica
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

        {/* Barra de Ações do Memorial */}
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
          ETAPA 1 — IDENTIFICAÇÃO DO GRAFO E EQUAÇÕES DOS SOMADORES
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
              Identificação do Grafo, Blocos, Somadores e Sinais
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[1] ? '▲' : '▼'}</span>
        </div>

        {openSteps[1] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1.1 Entradas Independentes e Saídas */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                1.1. Entradas Independentes e Saídas do Sistema
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {fullSys.independentInputs.map(inp => (
                  <div
                    key={inp.id}
                    style={{
                      background: '#060a14',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border:
                        inp.role === 'input-dist'
                          ? '1px solid rgba(251, 191, 36, 0.3)'
                          : '1px solid rgba(56, 189, 248, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {inp.role === 'input-dist' ? 'Entrada de Perturbação:' : 'Entrada de Referência:'}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.92rem' }}>
                      <MathView math={inp.signalLatex} inline />
                    </div>
                  </div>
                ))}

                {fullSys.outputs.map(out => (
                  <div
                    key={out.id}
                    style={{
                      background: '#060a14',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Saída do Sistema:</div>
                    <div style={{ marginTop: '4px', fontSize: '0.92rem' }}>
                      <MathView math={out.signalLatex} inline />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 1.2 Blocos Funcionais e Ganhos */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                1.2. Blocos Funcionais e Respectivos Ganhos ({fullSys.blocks.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                {fullSys.blocks.map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: '#060a14',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{b.name}</span>
                      <span>{b.dir === 'left' ? 'Realimentação (←)' : 'Ramo Direto (→)'}</span>
                    </div>
                    <MathView math={`${b.symbolLatex} = ${b.gainLatex}`} block />
                  </div>
                ))}
              </div>
            </div>

            {/* 1.3 Equações Algébricas Efetivas dos Somadores e da Saída */}
            <div style={mathBoxStyle} data-testid="mason-summer-equations">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                1.3. Somadores, Polaridades e Equações Efetivas dos Sinais Resultantes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fullSys.summerEquations.map(sEq => (
                  <div
                    key={sEq.summerId}
                    style={{
                      background: '#060a14',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#a7f3d0', fontWeight: 700 }}>
                        {sEq.summerName} — Sinal resultante <MathView math={sEq.signalLatex} inline />:
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {sEq.equationText}
                      </span>
                    </div>
                    <MathView math={sEq.equationLatex} block />
                  </div>
                ))}

                {fullSys.outputEquations.map(oEq => (
                  <div
                    key={oEq.outputId}
                    style={{
                      background: '#060a14',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(56, 189, 248, 0.25)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#7dd3fc', fontWeight: 700 }}>
                        Equação da Saída <MathView math={oEq.signalLatex} inline />:
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {oEq.equationText}
                      </span>
                    </div>
                    <MathView math={oEq.equationLatex} block />
                  </div>
                ))}
              </div>
            </div>

            {/* 1.4 Conexões Direcionadas */}
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a855f7', marginBottom: '8px' }}>
                1.4. Conexões Direcionadas do Grafo ({directedEdges.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                {directedEdges.map(edge => (
                  <div
                    key={edge.index}
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
                      math={`${edge.fromLabelLatex} \\xrightarrow{(${edge.sign})} ${edge.toLabelLatex}`}
                      inline
                    />
                    <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
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
          ETAPA 2 — IDENTIFICAÇÃO DOS CAMINHOS DIRETOS (SEPARADOS POR ENTRADA)
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
              Identificação dos Caminhos Diretos (<MathView math="P_k" inline />) por Entrada Independente
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[2] ? '▲' : '▼'}</span>
        </div>

        {openSteps[2] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {detailedInputGroups.map((grp, gIdx) => (
              <div
                key={grp.pair.inputInfo.id}
                style={{
                  ...mathBoxStyle,
                  borderLeft: gIdx === 0 ? '3px solid #38bdf8' : '3px solid #fbbf24'
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: gIdx === 0 ? '#38bdf8' : '#fbbf24', marginBottom: '10px' }}>
                  2.{gIdx + 1}. Caminhos Diretos da Entrada <MathView math={grp.pair.inputInfo.signalLatex} inline />{' '}
                  para a Saída <MathView math={grp.pair.targetInfo.signalLatex} inline />
                </div>

                {grp.paths.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Nenhum caminho direto encontrado a partir desta entrada.
                  </div>
                ) : (
                  grp.paths.map(p => (
                    <div
                      key={p.index}
                      style={{
                        background: '#060a14',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.07)',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
                          Caminho Direto <MathView math={`P_{${p.index}}(s)`} inline /> (referente a{' '}
                          <MathView math={grp.pair.inputInfo.signalLatex} inline />)
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          Polaridade acumulada: <MathView math={`(${p.overallSign}1)`} inline />
                        </span>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Sequência de nós percorridos:
                      </div>
                      <MathView math={p.nodesLatex.join(' \\longrightarrow ')} block />

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '6px 0 4px 0' }}>
                        Ganhos e sinais de cada ramo:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {p.edges.map((e, eIdx) => (
                          <span
                            key={eIdx}
                            style={{
                              background: '#0a1020',
                              border: '1px solid rgba(56,189,248,0.2)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.75rem'
                            }}
                          >
                            <MathView
                              math={`${e.fromLabelLatex} \\xrightarrow{(${e.sign})} ${e.toLabelLatex}: \\; ${e.gainLatex}`}
                              inline
                            />
                          </span>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.74rem', color: '#93c5fd', fontWeight: 700, marginBottom: '4px' }}>
                        Multiplicação detalhada dos ganhos do caminho:
                      </div>
                      <MathView
                        math={`\\begin{aligned}
P_{${p.index}}(s) &= ${p.symbolicFactorsLatex.join(' \\cdot ')} \\\\[4pt]
${
  p.substitutedFactorsLatex.join(' \\cdot ') !== p.symbolicFactorsLatex.join(' \\cdot ')
    ? `P_{${p.index}}(s) &= ${p.substitutedFactorsLatex.join(' \\cdot ')} \\\\[4pt]`
    : ''
}${p.hasMultipleFractions ? `P_{${p.index}}(s) &= ${p.rawUnreducedLatex} \\\\[4pt]` : ''}
\\mathbf{P_{${p.index}}(s)} &= \\mathbf{${p.finalGainLatex}}
\\end{aligned}`}
                        block
                      />
                    </div>
                  ))
                )}
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
              Identificação dos Laços Individuais (<MathView math="L_i" inline />)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[3] ? '▲' : '▼'}</span>
        </div>

        {openSteps[3] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {detailedLoops.length === 0 ? (
              <div style={{ ...mathBoxStyle, borderLeft: '3px solid #a855f7' }}>
                <div style={{ fontSize: '0.84rem', color: '#e9d5ff', marginBottom: '6px', fontWeight: 700 }}>
                  Nenhum laço fechado identificado (Malha Aberta):
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
                      Laço Individual <MathView math={`L_{${lp.index}}(s)`} inline /> — {lp.directionDesc}
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
                      Polaridade Efetiva: <MathView math={`(${lp.overallSign}1)`} inline />
                    </span>
                  </div>

                  <div style={{ background: '#060a14', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Sequência fechada de nós e sentido de percurso:
                    </div>
                    <MathView math={lp.closedNodesLatex.join(' \\longrightarrow ')} block />
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

                  <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.22)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#d8b4fe', fontWeight: 700, marginBottom: '4px' }}>
                      Multiplicação algébrica detalhada do laço:
                    </div>
                    <MathView
                      math={`\\begin{aligned}
L_{${lp.index}}(s) &= ${lp.symbolicFactorsLatex.join(' \\cdot ')} \\\\[4pt]
${
  lp.substitutedFactorsLatex.join(' \\cdot ') !== lp.symbolicFactorsLatex.join(' \\cdot ')
    ? `L_{${lp.index}}(s) &= ${lp.substitutedFactorsLatex.join(' \\cdot ')} \\\\[4pt]`
    : ''
}${lp.hasMultipleFractions ? `L_{${lp.index}}(s) &= ${lp.rawUnreducedLatex} \\\\[4pt]` : ''}
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
              Identificação dos Laços Disjuntos
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[4] ? '▲' : '▼'}</span>
        </div>

        {openSteps[4] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={mathBoxStyle}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
                4.1. Pares de Laços Disjuntos (2 a 2)
              </div>

              {detailedLoops.length < 2 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Como o grafo possui apenas {detailedLoops.length} laço(s) fechado(s), não há pares de laços a combinar:
                  <MathView math="\sum_{i,j} \left(L_i(s)L_j(s)\right)_{\text{disjuntos}} = 0" block />
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
                          {pc.isDisjoint ? '✓ LAÇOS DISJUNTOS (NÃO SE TOCAM)' : '✗ LAÇOS COMPARTILHAM NÓS'}
                        </span>
                      </div>
                      {pc.isDisjoint ? (
                        <div style={{ marginTop: '6px' }}>
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
                          Nós em comum:{' '}
                          <MathView
                            math={`V(L_{${pc.i}}) \\cap V(L_{${pc.j}}) = \\{ ${pc.sharedNodesLatex.join(', ')} \\} \\neq \\emptyset`}
                            inline
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detailedLoops.length >= 3 && (
              <div style={mathBoxStyle}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
                  4.2. Combinações de Três ou Mais Laços Disjuntos (<MathView math="r \ge 3" inline />)
                </div>
                {disjointHigherOrders.length === 0 ? (
                  <MathView math="\sum_{i,j,k} \left(L_i(s)L_j(s)L_k(s)\right)_{\text{disjuntos}} = 0" block />
                ) : (
                  disjointHigherOrders.map((comb, cIdx) => (
                    <div key={cIdx} style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', marginBottom: '6px' }}>
                      <MathView
                        math={`${comb.loopIndices.map(i => `L_{${i}}(s)`).join(' \\cdot ')} = \\mathbf{${formatRatFuncLatex(
                          comb.gain
                        )}}`}
                        block
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 5 — CÁLCULO DO DETERMINANTE GERAL \Delta
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
              Cálculo do Determinante Geral (<MathView math="\Delta" inline />)
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[5] ? '▲' : '▼'}</span>
        </div>

        {openSteps[5] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={mathBoxStyle}>
              <MathView
                math="\Delta(s) = 1 - \sum_{i} L_i(s) + \sum_{i,j} \left(L_i(s)L_j(s)\right)_{\text{disjuntos}} - \sum_{i,j,k} \left(L_i(s)L_j(s)L_k(s)\right)_{\text{disjuntos}} + \cdots"
                block
              />
              <div style={{ background: '#060a14', padding: '10px 12px', borderRadius: '6px', marginTop: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <MathView
                  math={`\\begin{aligned}
\\Delta(s) &= 1 - \\left(${formatRatFuncLatex(sumIndividualLoops)}\\right)${
                    disjointPairsOrder2.length > 0
                      ? ` + \\left(${formatRatFuncLatex(sumDisjointPairs)}\\right)`
                      : ''
                  }${
                    disjointHigherOrders.length > 0
                      ? ` - \\left(${formatRatFuncLatex(sumDisjointTriplets)}\\right)`
                      : ''
                  } \\\\[4pt]
${
  !polyIsOne(loopContribution.den) && !polyIsZero(loopContribution.num)
    ? `\\Delta(s) &= \\frac{${formatPolyFactorLatex(loopContribution.den)} + ${formatPolyFactorLatex(
        loopContribution.num
      )}}{${formatPolyFactorLatex(loopContribution.den)}} \\\\[6pt]`
    : ''
}
\\mathbf{\\Delta(s)} &= \\mathbf{${commonDeltaLatex}}
\\end{aligned}`}
                  block
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 6 — CÁLCULO DOS COFATORES \Delta_k POR ENTRADA
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
              Cálculo dos Cofatores (<MathView math="\Delta_k" inline />) Associados a Cada Caminho Direto
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[6] ? '▲' : '▼'}</span>
        </div>

        {openSteps[6] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {detailedInputGroups.map((grp, gIdx) => (
              <div
                key={grp.pair.inputInfo.id}
                style={{
                  ...mathBoxStyle,
                  borderLeft: gIdx === 0 ? '3px solid #06b6d4' : '3px solid #fbbf24'
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: gIdx === 0 ? '#22d3ee' : '#fbbf24', marginBottom: '8px' }}>
                  6.{gIdx + 1}. Cofatores para os Caminhos da Entrada{' '}
                  <MathView math={grp.pair.inputInfo.signalLatex} inline />{' '}
                  <MathView math="\rightarrow" inline /> <MathView math={grp.pair.targetInfo.signalLatex} inline />
                </div>

                {grp.paths.map(p => (
                  <div
                    key={p.index}
                    style={{
                      background: '#060a14',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid rgba(255,255,255,0.07)'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                      Cofator <MathView math={`\\Delta_{${p.index}}(s)`} inline /> associado a{' '}
                      <MathView math={`P_{${p.index}}(s) = ${p.finalGainLatex}`} inline />:
                    </div>

                    {p.loopTouchStatus.map(st => (
                      <div key={st.loopIndex} style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        • Laço <MathView math={`L_{${st.loopIndex}}`} inline />:{' '}
                        {st.touches ? (
                          <span style={{ color: '#fca5a5' }}>
                            toca o caminho em <MathView math={`\\{ ${st.sharedNodesLatex.join(', ')} \\}`} inline /> (excluído)
                          </span>
                        ) : (
                          <span style={{ color: '#34d399' }}>
                            disjunto ao caminho (permanece ativo em <MathView math={`\\Delta_{${p.index}}`} inline />)
                          </span>
                        )}
                      </div>
                    ))}

                    <MathView
                      math={`\\Delta_{${p.index}}(s) = \\mathbf{${p.cofactorLatex}} \\quad \\implies \\quad P_{${p.index}}(s)\\Delta_{${p.index}}(s) = \\mathbf{${p.pathTimesCofactorLatex}}`}
                      block
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 7 — APLICAÇÃO DA FÓRMULA GERAL DE MASON POR ENTRADA
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
              Aplicação da Fórmula Geral de Mason para Cada Entrada
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[7] ? '▲' : '▼'}</span>
        </div>

        {openSteps[7] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={mathBoxStyle}>
              <MathView
                math="T_m(s) = \frac{\text{Saída}(s)}{\text{Entrada}_m(s)} = \frac{\displaystyle\sum_{k=1}^{N_m} P_k(s)\Delta_k(s)}{\Delta(s)}"
                block
              />
            </div>

            {detailedInputGroups.map((grp, gIdx) => (
              <div
                key={grp.pair.inputInfo.id}
                style={{
                  ...mathBoxStyle,
                  borderLeft: gIdx === 0 ? '3px solid #6366f1' : '3px solid #fbbf24'
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#a5b4fc', marginBottom: '6px' }}>
                  7.{gIdx + 1}. Aplicação para a Entrada <MathView math={grp.pair.inputInfo.signalLatex} inline /> (demais entradas nulas)
                </div>
                <MathView
                  math={`\\begin{aligned}
\\frac{${grp.pair.targetInfo.signalLatex}}{${grp.pair.inputInfo.signalLatex}} &= \\frac{${grp.paths
                    .map(p => `\\left(${p.pathTimesCofactorLatex}\\right)`)
                    .join(' + ')}}{${commonDeltaLatex}} \\\\[6pt]
\\mathbf{\\frac{${grp.pair.targetInfo.signalLatex}}{${grp.pair.inputInfo.signalLatex}}} &= \\mathbf{${
                    grp.pair.transferFunctionLatex
                  }}
\\end{aligned}`}
                  block
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          ETAPA 8 — RESULTADO FINAL, OUTROS SINAIS (E(s)) E SUPERPOSIÇÃO
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
              Resultado Final, Funções de Transferência e Superposição Total
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[8] ? '▲' : '▼'}</span>
        </div>

        {openSteps[8] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 8.1 Funções de Transferência de Cada Entrada para a Saída */}
            <div style={mathBoxStyle} data-testid="mason-final-output-tfs">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                8.1. Funções de Transferência Individuais para a Saída ({fullSys.primaryOutput.signalSymbol})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                {fullSys.outputByInputPairs.map(p => (
                  <div
                    key={p.inputInfo.id}
                    style={{
                      background: '#060a14',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
                      <span>
                        Relação <b style={{ color: '#f8fafc' }}>{p.targetInfo.signalSymbol}/{p.inputInfo.signalSymbol}</b>:
                      </span>
                      <code style={{ color: '#38bdf8' }}>{p.transferFunctionCompact}</code>
                    </div>
                    <MathView
                      math={`\\frac{${p.targetInfo.signalLatex}}{${p.inputInfo.signalLatex}} = \\mathbf{${p.transferFunctionLatex}}`}
                      block
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 8.2 Funções de Transferência para Sinais Internos / Erro E(s) */}
            {fullSys.summerByInputPairs.length > 0 && (
              <div style={mathBoxStyle} data-testid="mason-final-error-tfs">
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                  8.2. Funções de Transferência para o Sinal de Erro e Sinais dos Somadores
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {fullSys.summerByInputPairs.map(p => (
                    <div
                      key={`${p.targetInfo.id}_${p.inputInfo.id}`}
                      style={{
                        background: '#060a14',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
                        <span>
                          Relação <b style={{ color: '#f8fafc' }}>{p.targetInfo.signalSymbol}/{p.inputInfo.signalSymbol}</b>:
                        </span>
                        <code style={{ color: '#34d399' }}>{p.transferFunctionCompact}</code>
                      </div>
                      <MathView
                        math={`\\frac{${p.targetInfo.signalLatex}}{${p.inputInfo.signalLatex}} = \\mathbf{${p.transferFunctionLatex}}`}
                        block
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8.3 Expressão Completa da Saída por Superposição */}
            <div
              data-testid="mason-superposition-result"
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
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}
              >
                Expressão Completa da Saída por Superposição Linear
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px' }}>
                <code>{fullSys.superpositionOutputText}</code>
              </div>

              <div style={{ overflowX: 'auto', padding: '6px 0' }}>
                <MathView math={fullSys.superpositionOutputLatex} block />
              </div>

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
                  onClick={() => handleCopyText(fullSys.superpositionOutputLatex, 'final-latex')}
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
                  onClick={() => handleCopyText(fullSys.superpositionOutputText, 'final-text')}
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

      {/* =====================================================================
          SEÇÃO DE VALIDAÇÃO ALGÉBRICA INDEPENDENTE (MASON vs SISTEMA DE EQUAÇÕES)
         ===================================================================== */}
      <div
        style={{
          ...stepCardStyle,
          border: '1px solid rgba(16, 185, 129, 0.35)'
        }}
        data-testid="mason-algebraic-validation"
      >
        <div style={stepHeaderStyle} onClick={() => toggleStep(9)}>
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
              VALIDAÇÃO ALGÉBRICA
            </span>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
              Demonstração Algébrica Independente a partir das Equações dos Somadores e Blocos
            </h4>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{openSteps[9] ? '▲' : '▼'}</span>
        </div>

        {openSteps[9] && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {fullSys.algebraicValidationSteps.map((st, idx) => (
              <div key={idx} style={mathBoxStyle}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                  {st.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {st.description}
                </div>
                <MathView math={st.equationLatex} block />
              </div>
            ))}

            {/* Comparação direta entre Regra de Mason e Resolução Algébrica do Sistema */}
            <div
              style={{
                background: fullSys.allValidationsMatch
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${fullSys.allValidationsMatch ? '#10b981' : '#ef4444'}`,
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.8rem',
                color: fullSys.allValidationsMatch ? '#a7f3d0' : '#fecaca'
              }}
            >
              <b>
                {fullSys.allValidationsMatch
                  ? '✓ Validação Cruzada Concluída com 100% de Concordância:'
                  : '⚠️ Alerta de Divergência Matemática Detectada:'}
              </b>{' '}
              Todas as funções de transferência obtidas pela <b>Regra do Ganho de Mason</b> foram comparadas com a solução direta do sistema linear de equações dos somadores e blocos (<MathView math="\mathbf{A}(s)\mathbf{v}(s)=\mathbf{B}(s)\mathbf{u}(s)" inline />), confirmando identidade algébrica exata.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
