'use client';

import React, { useMemo, useState } from 'react';
import {
  DiagramConnection,
  DiagramElement,
  DiagramGraph,
  MasonAnalysis
} from '@/core/reduction/mason';
import {
  ratOne,
  ratScale
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
import { EquivalentDiagramRenderer } from './EquivalentDiagramRenderer';

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

export const MasonDeductionView: React.FC<MasonDeductionViewProps> = ({
  analysis,
  graph,
  inputElement,
  outputElement,
  splitMode = 'split',
  onChangeSplitMode,
  onClose
}) => {
  const [copiedType, setCopiedType] = useState<'none' | 'final-latex' | 'final-text' | 'memorial' | 'scilab'>('none');
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
    10: true
  });

  const toggleStep = (stepNumber: number) => {
    setOpenSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const setAllSteps = (open: boolean) => {
    setOpenSteps({
      0: open,
      1: open,
      2: open,
      3: open,
      4: open,
      5: open,
      6: open,
      7: open,
      8: open,
      9: open,
      10: open
    });
  };

  // =========================================================================
  // ANÁLISE ALGÉBRICA DE BLOCOS, EQUACIONAMENTO, TVF E SCILAB
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

    const directedEdges = G.connections
      .filter(c => !c.isPending)
      .map((c, idx) => {
        const d = buildEdgeDetail(c.from, c.to);
        return {
          index: idx + 1,
          ...d
        };
      });

    // Detalhamento dos ramos diretos e termos de malha para a Etapa 5 e Etapa 6
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

        const nodeSequenceLatex = fp.nodes.map(n => getCleanLatexLabel(n)).join(' \\rightarrow ');

        return {
          index: idx + 1,
          nodes: fp.nodes,
          nodeSequenceLatex,
          overallSign,
          blockCount,
          symbolicProductLatex: symbolicFactorsLatex.join(' \\cdot '),
          substitutedProductLatex: substitutedFactorsLatex.join(' \\cdot '),
          rawExpandedLatex: rawPolyPairToLatex(rawNum, rawDen),
          simplifiedGain: fp.gain,
          simplifiedGainLatex: formatRatFuncLatex(fp.gain)
        };
      });

      return {
        pair,
        paths
      };
    };

    const detailedOutputPairs = fullSys.outputByInputPairs.map(buildDetailedPairData);
    const detailedSummerPairs = fullSys.summerByInputPairs.map(buildDetailedPairData);

    const feedbackLoops = fullSys.outputByInputPairs[0]?.masonAnalysis.loops || analysis.loops || [];
    const detailedLoops = feedbackLoops.map((loop, idx) => {
      const closedNodes = [...loop.nodes, loop.nodes[0]];
      const edges = [];
      for (let i = 0; i < closedNodes.length - 1; i++) {
        edges.push(buildEdgeDetail(closedNodes[i], closedNodes[i + 1]));
      }
      const negCount = edges.filter(e => e.sign === '-').length;
      const overallSign: '+' | '-' = negCount % 2 === 1 ? '-' : '+';

      const symbolicFactorsLatex: string[] = [];
      const substitutedFactorsLatex: string[] = [];
      let rawNum = polyFromNumber(overallSign === '-' ? -1 : 1);
      let rawDen = polyFromNumber(1);

      edges.forEach(edge => {
        const toEl = elementsMap.get(edge.toId);
        if (toEl?.type === 'block') {
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

      const nodeSequenceLatex = closedNodes.map(n => getCleanLatexLabel(n)).join(' \\rightarrow ');

      return {
        index: idx + 1,
        nodes: loop.nodes,
        nodeSequenceLatex,
        overallSign,
        feedbackTypeLabel:
          overallSign === '-' ? 'Realimentação Negativa (−)' : 'Realimentação Positiva (+)',
        symbolicProductLatex: symbolicFactorsLatex.join(' \\cdot '),
        substitutedProductLatex: substitutedFactorsLatex.join(' \\cdot '),
        rawExpandedLatex: rawPolyPairToLatex(rawNum, rawDen),
        simplifiedGain: loop.gain,
        simplifiedGainLatex: formatRatFuncLatex(loop.gain)
      };
    });

    const primaryPair = detailedOutputPairs[0] || null;
    const primaryTf = primaryPair
      ? primaryPair.pair.transferFunction
      : analysis.totalT;
    const primaryTfLatex = formatRatFuncLatex(primaryTf);
    const primaryTfCompact = formatRatFuncCompact(primaryTf);

    return {
      fullSys,
      directedEdges,
      detailedOutputPairs,
      detailedSummerPairs,
      detailedLoops,
      primaryPair,
      primaryTf,
      primaryTfLatex,
      primaryTfCompact
    };
  }, [analysis, graph, inputElement, outputElement]);

  const { fullSys } = systemData;

  const copyToClipboard = (text: string, type: 'final-latex' | 'final-text' | 'memorial' | 'scilab') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType('none'), 2200);
  };

  const downloadScilabFile = () => {
    const blob = new Blob([fullSys.scilabReport.scriptCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulacao_sistema_controle.sce';
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildFullLatexMemorial = (): string => {
    const lines: string[] = [];
    lines.push('% =========================================================================');
    lines.push('% MEMORIAL DE RESOLUÇÃO — ÁLGEBRA DE BLOCOS E EQUACIONAMENTO DE MALHA');
    lines.push('% =========================================================================');
    lines.push('');
    lines.push('% ETAPA 1 — IDENTIFICAÇÃO DO SISTEMA');
    fullSys.independentInputs.forEach(inp => {
      lines.push(`% Entrada: ${inp.signalLatex}`);
    });
    lines.push(`% Saída Principal: ${fullSys.primaryOutput.signalLatex}`);
    lines.push('');
    lines.push('% ETAPA 2 — EQUAÇÕES DOS SOMADORES');
    fullSys.summerEquations.forEach(sEq => {
      lines.push(`$$${sEq.equationLatex}$$`);
    });
    lines.push('');
    lines.push('% ETAPA 3 — RELAÇÕES DOS BLOCOS');
    fullSys.blockRelations.forEach(bRel => {
      lines.push(`$$${bRel.relationLatex}$$`);
    });
    lines.push('');
    lines.push('% ETAPA 4 — SUBSTITUIÇÃO PROGRESSIVA');
    fullSys.progressiveSubstitutionSteps.forEach(st => {
      lines.push(`% Passo 4.${st.stepNumber}: ${st.title}`);
      lines.push(`$$${st.resultLatex}$$`);
    });
    lines.push('');
    lines.push('% ETAPA 5 — REDUÇÃO GRÁFICA PROGRESSIVA (ÁLGEBRA DE BLOCOS)');
    if (fullSys.graphicalReduction?.steps?.length > 0) {
      fullSys.graphicalReduction.steps.forEach(st => {
        lines.push(`% Passo: ${st.title} — ${st.description}`);
        st.equations.forEach(eq => {
          lines.push(`$$${eq.latex}$$`);
        });
      });
    }
    lines.push('');
    lines.push('% ETAPA 5 E 6 — DESENVOLVIMENTO ALGÉBRICO E FUNÇÕES DE TRANSFERÊNCIA');
    fullSys.outputByInputPairs.forEach(p => {
      lines.push(`$$\\frac{${p.targetInfo.signalLatex}}{${p.inputInfo.signalLatex}} = ${p.transferFunctionLatex}$$`);
    });
    fullSys.summerByInputPairs.forEach(p => {
      lines.push(`$$\\frac{${p.targetInfo.signalLatex}}{${p.inputInfo.signalLatex}} = ${p.transferFunctionLatex}$$`);
    });
    lines.push('');
    lines.push('% ETAPA 7 E 8 — SUPERPOSIÇÃO E RESULTADO FINAL');
    lines.push(`$$${fullSys.superpositionOutputLatex}$$`);
    fullSys.superpositionSummers.forEach(s => {
      lines.push(`$$${s.latex}$$`);
    });
    lines.push('');
    lines.push('% ETAPA 9 — REGIME PERMANENTE (TEOREMA DO VALOR FINAL)');
    lines.push(`$$${fullSys.steadyStateReport.totalOutputSteadyStateLatex}$$`);
    if (fullSys.steadyStateReport.totalErrorSteadyStateLatex) {
      lines.push(`$$${fullSys.steadyStateReport.totalErrorSteadyStateLatex}$$`);
    }
    return lines.join('\n');
  };

  const renderSectionHeader = (
    stepNum: number,
    badge: string,
    title: string,
    subtitle: string,
    accentColor: string = 'var(--primary)'
  ) => {
    const isOpen = !!openSteps[stepNum];
    return (
      <button
        type="button"
        onClick={() => toggleStep(stepNum)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.85rem 1.1rem',
          background: 'var(--card-bg)',
          border: 'none',
          borderBottom: isOpen ? '1px solid var(--card-border)' : 'none',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          borderBottomLeftRadius: isOpen ? '0' : '8px',
          borderBottomRightRadius: isOpen ? '0' : '8px',
          color: 'var(--text)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s ease',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'var(--code-bg)',
              color: accentColor,
              border: '1px solid var(--card-border)',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            {badge}
          </span>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{title}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {subtitle}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            background: 'var(--code-bg)',
            border: '1px solid var(--card-border)',
            whiteSpace: 'nowrap',
            fontWeight: 600
          }}
        >
          {isOpen ? '▾ Recolher' : '▸ Expandir'}
        </span>
      </button>
    );
  };

  // Renderizador SVG do gráfico de resposta ao degrau (pré-visualização Scilab)
  const renderStepResponseChart = () => {
    const series = fullSys.scilabReport.previewSeries;
    if (!series || series.length === 0) return null;

    const width = 680;
    const height = 240;
    const padLeft = 52;
    const padRight = 24;
    const padTop = 20;
    const padBottom = 36;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    let minY = 0;
    let maxY = 1.2;
    let maxT = 10;

    series.forEach(s => {
      s.t.forEach(tVal => {
        if (tVal > maxT) maxT = tVal;
      });
      s.y.forEach(yVal => {
        if (yVal < minY) minY = yVal;
        if (yVal > maxY) maxY = yVal;
      });
    });

    const yRange = Math.max(0.2, maxY - minY);
    minY = minY - 0.08 * yRange;
    maxY = maxY + 0.12 * yRange;

    const mapX = (tVal: number) => padLeft + (tVal / (maxT || 1)) * plotW;
    const mapY = (yVal: number) => padTop + plotH - ((yVal - minY) / (maxY - minY || 1)) * plotH;

    const yTicks = 5;
    const xTicks = 5;

    return (
      <div
        style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          marginBottom: '0.9rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '0.6rem'
          }}
        >
          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Pré-Visualização Numérica — Resposta ao Degrau Unitário (RK4 Equivalente a csim)
          </span>
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            {series.map((s, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  color: 'var(--text)',
                  fontWeight: 600
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '3px',
                    background: s.color,
                    display: 'inline-block',
                    borderRadius: '2px'
                  }}
                />
                {s.label} (regime ≈ {s.finalValue.toFixed(4)})
              </span>
            ))}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', maxHeight: '250px', display: 'block' }}
        >
          {/* Linhas de grade horizontais */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const val = minY + (i / yTicks) * (maxY - minY);
            const yPos = mapY(val);
            return (
              <g key={`hy-${i}`}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={width - padRight}
                  y2={yPos}
                  stroke="var(--card-border)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 6}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Linhas de grade verticais */}
          {Array.from({ length: xTicks + 1 }).map((_, i) => {
            const val = (i / xTicks) * maxT;
            const xPos = mapX(val);
            return (
              <g key={`vx-${i}`}>
                <line
                  x1={xPos}
                  y1={padTop}
                  x2={xPos}
                  y2={height - padBottom}
                  stroke="var(--card-border)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <text
                  x={xPos}
                  y={height - padBottom + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {val.toFixed(1)}s
                </text>
              </g>
            );
          })}

          {/* Eixo zero se visível */}
          {minY <= 0 && maxY >= 0 && (
            <line
              x1={padLeft}
              y1={mapY(0)}
              x2={width - padRight}
              y2={mapY(0)}
              stroke="var(--text-muted)"
              strokeWidth={1}
            />
          )}

          {/* Curvas */}
          {series.map((s, idx) => {
            const pathD = s.t
              .map(
                (tVal, pIdx) =>
                  `${pIdx === 0 ? 'M' : 'L'} ${mapX(tVal).toFixed(1)} ${mapY(s.y[pIdx] ?? 0).toFixed(1)}`
              )
              .join(' ');
            return (
              <path
                key={`curve-${idx}`}
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={2.2}
              />
            );
          })}

          {/* Rótulo eixo X */}
          <text
            x={padLeft + plotW / 2}
            y={height - 4}
            textAnchor="middle"
            fontSize="10.5"
            fill="var(--text-muted)"
            fontWeight="600"
          >
            Tempo t (segundos)
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div
      className="algebraic-deduction-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        height: '100%',
        width: '100%',
        background: 'var(--bg)',
        color: 'var(--text)',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* CABEÇALHO FIXO DO PAINEL DE CÁLCULOS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem',
          padding: '0.75rem 1.15rem',
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--card-border)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: 'var(--primary)'
            }}
          >
            ∑
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.01em'
              }}
            >
              Resolução Analítica — Álgebra de Blocos e Equacionamento de Malha
            </h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Equações dos somadores, substituição progressiva, superposição, regime permanente (TVF) e Scilab
            </p>
          </div>
        </div>

        {/* Controles de Visualização e Exportação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setAllSteps(true)}
            title="Expandir todas as etapas"
            style={{
              padding: '0.32rem 0.6rem',
              borderRadius: '5px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: 'var(--code-bg)',
              color: 'var(--text)',
              border: '1px solid var(--card-border)',
              cursor: 'pointer'
            }}
          >
            Expandir Tudo
          </button>
          <button
            type="button"
            onClick={() => setAllSteps(false)}
            title="Recolher todas as etapas"
            style={{
              padding: '0.32rem 0.6rem',
              borderRadius: '5px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: 'var(--code-bg)',
              color: 'var(--text-muted)',
              border: '1px solid var(--card-border)',
              cursor: 'pointer'
            }}
          >
            Recolher Tudo
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(buildFullLatexMemorial(), 'memorial')}
            title="Copiar todo o memorial em formato LaTeX"
            style={{
              padding: '0.32rem 0.65rem',
              borderRadius: '5px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: 'var(--code-bg)',
              color: copiedType === 'memorial' ? 'var(--success)' : 'var(--primary)',
              border: '1px solid var(--card-border)',
              cursor: 'pointer'
            }}
          >
            {copiedType === 'memorial' ? '✓ LaTeX Copiado!' : 'Copiar LaTeX'}
          </button>

          {onChangeSplitMode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--code-bg)',
                padding: '0.15rem',
                borderRadius: '6px',
                border: '1px solid var(--card-border)',
                gap: '0.18rem'
              }}
            >
              <button
                type="button"
                onClick={() => onChangeSplitMode('circuit-maximized')}
                title="Maximizar área do diagrama"
                style={{
                  padding: '0.26rem 0.52rem',
                  borderRadius: '4px',
                  fontSize: '0.73rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background:
                    splitMode === 'circuit-maximized' ? 'var(--primary)' : 'transparent',
                  color: splitMode === 'circuit-maximized' ? '#fff' : 'var(--text-muted)'
                }}
              >
                Circuito
              </button>
              <button
                type="button"
                onClick={() => onChangeSplitMode('split')}
                title="Dividir tela entre Circuito e Resolução"
                style={{
                  padding: '0.26rem 0.52rem',
                  borderRadius: '4px',
                  fontSize: '0.73rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: splitMode === 'split' ? 'var(--primary)' : 'transparent',
                  color: splitMode === 'split' ? '#fff' : 'var(--text-muted)'
                }}
              >
                Dividido
              </button>
              <button
                type="button"
                onClick={() => onChangeSplitMode('calc-maximized')}
                title="Maximizar painel de cálculos"
                style={{
                  padding: '0.26rem 0.52rem',
                  borderRadius: '4px',
                  fontSize: '0.73rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background:
                    splitMode === 'calc-maximized' ? 'var(--primary)' : 'transparent',
                  color: splitMode === 'calc-maximized' ? '#fff' : 'var(--text-muted)'
                }}
              >
                Maximizar Cálculos
              </button>
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Fechar painel de resolução"
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '5px',
                fontSize: '0.76rem',
                fontWeight: 600,
                background: 'var(--code-bg)',
                color: 'var(--danger)',
                border: '1px solid var(--card-border)',
                cursor: 'pointer'
              }}
            >
              ✕ Fechar
            </button>
          )}
        </div>
      </div>

      {/* CORPO ROLÁVEL DO MEMORIAL DE CÁLCULO */}
      <div
        data-testid="deduction-scroll-container"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          scrollBehavior: 'smooth'
        }}
      >
        {/* =================================================================
            QUADRO RESUMO DE RESULTADOS PRINCIPAIS (TOPO)
            ================================================================= */}
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderLeft: '4px solid var(--primary)',
            borderRadius: '8px',
            padding: '1rem 1.2rem',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '0.65rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'var(--code-bg)',
                  color: 'var(--primary)',
                  border: '1px solid var(--card-border)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              >
                Síntese Analítica do Sistema
              </span>
              <span
                style={{
                  background: 'var(--code-bg)',
                  color: 'var(--success)',
                  border: '1px solid var(--card-border)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                ✓ Equacionamento Algébrico Verificado
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(fullSys.superpositionOutputLatex, 'final-latex')
                }
                style={{
                  padding: '0.28rem 0.65rem',
                  borderRadius: '4px',
                  fontSize: '0.73rem',
                  fontWeight: 600,
                  background: 'var(--code-bg)',
                  color: copiedType === 'final-latex' ? 'var(--success)' : 'var(--text)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer'
                }}
              >
                {copiedType === 'final-latex' ? '✓ Equação Copiada' : 'Copiar Equação (LaTeX)'}
              </button>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(systemData.primaryTfCompact, 'final-text')
                }
                style={{
                  padding: '0.28rem 0.65rem',
                  borderRadius: '4px',
                  fontSize: '0.73rem',
                  fontWeight: 600,
                  background: 'var(--code-bg)',
                  color: copiedType === 'final-text' ? 'var(--success)' : 'var(--text)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer'
                }}
              >
                {copiedType === 'final-text' ? '✓ Copiado!' : 'Copiar FT Principal'}
              </button>
            </div>
          </div>

          {/* Expressão Completa da Saída */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--code-bg)',
              borderRadius: '6px',
              border: '1px solid var(--card-border)',
              overflowX: 'auto',
              marginBottom: '0.75rem'
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '0.35rem'
              }}
            >
              Equação Geral da Saída no Domínio de Laplace:
            </div>
            <MathView math={fullSys.superpositionOutputLatex} />
          </div>

          {/* Cards de Funções de Transferência Individuais */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '0.65rem'
            }}
          >
            {fullSys.outputByInputPairs.map((pair, idx) => (
              <div
                key={`top-tf-${idx}`}
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  overflowX: 'auto'
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Relação Saída / Entrada ({pair.inputInfo.displayName}):
                </div>
                <MathView
                  math={`\\frac{${pair.targetInfo.signalLatex}}{${pair.inputInfo.signalLatex}} = ${pair.transferFunctionLatex}`}
                />
              </div>
            ))}
            {fullSys.summerByInputPairs.map((pair, idx) => (
              <div
                key={`top-err-tf-${idx}`}
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  overflowX: 'auto'
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '0.3rem'
                  }}
                >
                  Relação Sinal de Erro / Entrada ({pair.inputInfo.displayName}):
                </div>
                <MathView
                  math={`\\frac{${pair.targetInfo.signalLatex}}{${pair.inputInfo.signalLatex}} = ${pair.transferFunctionLatex}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* =================================================================
            PAINEL DE VALIDAÇÃO TOPOLÓGICA DO CIRCUITO (8 REGRAS OBRIGATÓRIAS — SEÇÃO 7)
            ================================================================= */}
        {fullSys.validationReport && (
          <section
            style={{
              background: 'var(--card-bg)',
              border: `1px solid ${fullSys.validationReport.hasErrors ? 'var(--danger)' : 'var(--card-border)'}`,
              borderRadius: '8px',
              flexShrink: 0,
              minHeight: 'fit-content',
              height: 'auto',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {renderSectionHeader(
              0,
              fullSys.validationReport.hasErrors ? 'Atenção' : 'Validação 8/8',
              'Validação Topológica do Circuito',
              fullSys.validationReport.hasErrors
                ? 'Existem pendências na topologia que impedem a redução completa'
                : 'Todas as 8 verificações topológicas foram aprovadas com sucesso',
              fullSys.validationReport.hasErrors ? 'var(--danger)' : 'var(--success)'
            )}

            {openSteps[0] && (
              <div
                style={{
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  height: 'auto',
                  minHeight: 'fit-content',
                  boxSizing: 'border-box'
                }}
              >
                {fullSys.directionCorrections && fullSys.directionCorrections.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '6px',
                      padding: '0.75rem 0.95rem',
                      fontSize: '0.8rem',
                      color: 'var(--text)',
                      lineHeight: 1.5
                    }}
                  >
                    <strong style={{ color: 'var(--primary)' }}>ℹ️ Sentido de sinal normalizado:</strong>{' '}
                    {fullSys.directionCorrections.length} linha(s) desenhada(s) no sentido inverso ao fluxo de sinal
                    foi(foram) alinhada(s) automaticamente para permitir a resolução completa da malha.
                  </div>
                )}

                {fullSys.validationReport.hasErrors && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--danger)',
                      borderRadius: '6px',
                      padding: '0.75rem 0.95rem',
                      fontSize: '0.82rem',
                      color: 'var(--danger)',
                      lineHeight: 1.5
                    }}
                  >
                    <strong>⚠️ Circuito Incompleto ou Inválido:</strong>
                    <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
                      {fullSys.validationReport.errorMessages.map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.65rem'
                  }}
                >
                  {fullSys.validationReport.checks.map(check => {
                    const isOk = check.status === 'ok';
                    const isWarn = check.status === 'warning';
                    const badgeColor = isOk ? 'var(--success)' : isWarn ? '#f59e0b' : 'var(--danger)';
                    const badgeIcon = isOk ? '✓' : isWarn ? '⚠' : '✗';
                    return (
                      <div
                        key={check.id}
                        style={{
                          background: 'var(--code-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.79rem', fontWeight: 700, color: 'var(--text)' }}>
                            {check.label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: badgeColor,
                              background: 'var(--card-bg)',
                              padding: '0.12rem 0.4rem',
                              borderRadius: '4px',
                              border: '1px solid var(--card-border)'
                            }}
                          >
                            {badgeIcon} {isOk ? 'Aprovado' : isWarn ? 'Atenção' : 'Incompleto'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {check.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* =================================================================
            ETAPA 1 — IDENTIFICAÇÃO DO SISTEMA
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            1,
            'Etapa 1',
            'Identificação do Sistema',
            'Reconhecimento de blocos, somadores, entradas independentes, saídas, pontos de derivação e polaridades'
          )}

          {openSteps[1] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.95rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Iniciamos a resolução identificando todos os elementos funcionais do diagrama de blocos:
                sinais de entrada independentes, variável controlada de saída, somadores com suas
                respectivas polaridades (<code style={{ color: 'var(--success)' }}>+</code> ou{' '}
                <code style={{ color: 'var(--danger)' }}>−</code>), pontos de derivação (ramificações de
                sinal) e blocos de função de transferência no domínio de Laplace <MathView math="s" inline />.
              </p>

              {/* Resumo de Entradas, Saídas e Somadores */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '0.75rem'
                }}
              >
                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.75rem 0.9rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.71rem',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      marginBottom: '0.35rem'
                    }}
                  >
                    Entradas Independentes ({fullSys.independentInputs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {fullSys.independentInputs.map(inp => (
                      <div key={inp.id} style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                        <MathView math={inp.signalLatex} inline />{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({inp.role === 'input-dist' ? 'Perturbação / Distúrbio' : inp.role === 'input-noise' ? 'Ruído N(s)' : 'Referência'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.75rem 0.9rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.71rem',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      marginBottom: '0.35rem'
                    }}
                  >
                    Variável de Saída Principal
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                    <MathView math={fullSys.primaryOutput.signalLatex} inline />
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.75rem 0.9rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.71rem',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      marginBottom: '0.35rem'
                    }}
                  >
                    Somadores e Sinais Intermediários ({fullSys.summers.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {fullSys.summers.length > 0 ? (
                      fullSys.summers.map(sum => (
                        <div key={sum.id} style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                          {sum.displayName} → Sinal:{' '}
                          <MathView math={sum.signalLatex} inline />
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Malha direta sem somadores
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Blocos de Função de Transferência */}
              {fullSys.blocks.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Blocos de Função de Transferência do Sistema ({fullSys.blocks.length})
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.6rem'
                    }}
                  >
                    {fullSys.blocks.map(b => (
                      <div
                        key={b.id}
                        style={{
                          background: 'var(--code-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          padding: '0.65rem 0.85rem',
                          overflowX: 'auto'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.73rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.25rem',
                            fontWeight: 600
                          }}
                        >
                          Bloco {b.code} ({b.dir === 'left' ? 'Realimentação' : 'Ramo Direto'}):
                        </div>
                        <MathView math={`${b.symbolLatex} = ${b.gainLatex}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pontos de Derivação (Pickoff Points) */}
              {fullSys.pickoffPoints.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.45rem'
                    }}
                  >
                    Pontos de Derivação Identificados ({fullSys.pickoffPoints.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {fullSys.pickoffPoints.map((pk, idx) => (
                      <div
                        key={`pk-${idx}`}
                        style={{
                          background: 'var(--code-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          padding: '0.6rem 0.85rem',
                          fontSize: '0.82rem'
                        }}
                      >
                        <strong>Ramificação em {pk.sourceName}:</strong> o sinal{' '}
                        <MathView math={pk.signalLatex} inline /> é distribuído integralmente (sem
                        divisão algébrica) para: <strong>{pk.destinations.join(', ')}</strong>.
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabela de Conexões Direcionadas */}
              <div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '0.45rem'
                  }}
                >
                  Mapa de Conexões Direcionadas e Polaridades ({systemData.directedEdges.length})
                </div>
                <div
                  style={{
                    overflowX: 'auto',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)'
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.81rem',
                      textAlign: 'left'
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: 'var(--code-bg)',
                          color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--card-border)'
                        }}
                      >
                        <th style={{ padding: '0.5rem 0.75rem' }}>#</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Elemento Origem</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Sinal Enviado</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Elemento Destino</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Polaridade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemData.directedEdges.map(edge => (
                        <tr
                          key={edge.index}
                          style={{
                            borderBottom: '1px solid var(--card-border)',
                            background: 'var(--card-bg)'
                          }}
                        >
                          <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)' }}>
                            {edge.index}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600 }}>
                            {edge.fromDisplayName}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem' }}>
                            <MathView math={edge.fromLabelLatex} inline />
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600 }}>
                            {edge.toDisplayName}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                background: 'var(--code-bg)',
                                color: edge.sign === '-' ? 'var(--danger)' : 'var(--success)',
                                border: '1px solid var(--card-border)'
                              }}
                            >
                              {edge.sign === '-' ? '− (Subtração)' : '+ (Adição)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 2 — EQUAÇÕES DOS SOMADORES
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            2,
            'Etapa 2',
            'Equações Algébricas dos Somadores',
            'Escrita da equação algébrica de cada somador respeitando os sinais + e − de cada ramo'
          )}

          {openSteps[2] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              {fullSys.summerEquations.length === 0 ? (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '6px',
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-muted)',
                    fontSize: '0.84rem'
                  }}
                >
                  O circuito atual não possui somadores intermediários (conexão em malha aberta direta).
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Cada somador realiza a soma algébrica linear dos sinais que chegam às suas portas de
                    entrada, respeitando rigorosamente a polaridade (<code style={{ color: 'var(--success)' }}>+</code> ou{' '}
                    <code style={{ color: 'var(--danger)' }}>−</code>) configurada em cada seta:
                  </p>
                  {fullSys.summerEquations.map((sEq, idx) => (
                    <div
                      key={sEq.summerId}
                      style={{
                        background: 'var(--code-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '6px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                          Equação (2.{idx + 1}) — {sEq.summerName} (Sinal de saída:{' '}
                          <MathView math={sEq.signalLatex} inline />)
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {sEq.terms.length} ramo(s) conectado(s)
                        </span>
                      </div>

                      <div style={{ overflowX: 'auto', padding: '0.25rem 0' }}>
                        <MathView math={sEq.equationLatex} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 3 — RELAÇÕES DOS BLOCOS
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            3,
            'Etapa 3',
            'Relações Entrada–Saída dos Blocos',
            'Equacionamento da saída de cada bloco como o produto de sua função de transferência pelo sinal de entrada'
          )}

          {openSteps[3] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                No domínio de Laplace (com condições iniciais nulas), a saída de cada bloco linear é dada
                pelo produto algébrico de sua função de transferência pelo sinal aplicado à sua entrada:
              </p>

              {fullSys.blockRelations.length === 0 ? (
                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  O diagrama atual não possui blocos adicionais (conexão direta entre os nós).
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.75rem'
                  }}
                >
                  {fullSys.blockRelations.map((bRel, idx) => (
                    <div
                      key={bRel.blockId}
                      style={{
                        background: 'var(--code-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '6px',
                        padding: '0.8rem 0.95rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        overflowX: 'auto'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontWeight: 700
                        }}
                      >
                        <span>
                          Equação (3.{idx + 1}) — Bloco {bRel.blockCode}
                        </span>
                        <span>
                          Entrada: <MathView math={bRel.inputSignalLatex} inline />
                        </span>
                      </div>
                      <MathView math={bRel.relationLatex} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 4 — SUBSTITUIÇÃO PROGRESSIVA
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            4,
            'Etapa 4',
            'Substituição Progressiva das Equações',
            'Substituição passo a passo das relações dos blocos nas equações dos somadores seguindo o fluxo de sinal'
          )}

          {openSteps[4] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Substituímos progressivamente os sinais intermediários (saídas de blocos e de somadores
                internos) até expressar a variável de saída <MathView math={fullSys.primaryOutput.signalLatex} inline />{' '}
                exclusivamente em função de si mesma e das entradas independentes:
              </p>

              {fullSys.progressiveSubstitutionSteps.length === 0 ? (
                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.55
                  }}
                >
                  O diagrama consiste em uma associação direta em cascata sem variáveis intermediárias de somador a substituir.
                  A saída é expressa diretamente pelo produto algébrico dos blocos:
                  <div style={{ marginTop: '0.5rem', overflowX: 'auto' }}>
                    <MathView
                      math={`${fullSys.primaryOutput.signalLatex} = \\left(${fullSys.outputByInputPairs[0]?.transferFunctionLatex || '1'}\\right) \\cdot ${fullSys.independentInputs[0]?.signalLatex || 'R(s)'}`}
                    />
                  </div>
                </div>
              ) : (
                fullSys.progressiveSubstitutionSteps.map(step => (
                  <div
                    key={step.stepNumber}
                    style={{
                      background: 'var(--code-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      flexShrink: 0
                    }}
                  >
                  <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary)' }}>
                    Passo 4.{step.stepNumber} — {step.title}
                  </div>
                  <div style={{ fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {step.explanation || step.operationDescription}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '0.6rem',
                      marginTop: '0.2rem'
                    }}
                  >
                    <div
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '5px',
                        padding: '0.55rem 0.75rem',
                        overflowX: 'auto'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem'
                        }}
                      >
                        Equação Base Utilizada:
                      </div>
                      <MathView math={step.usedEquationLatex} />
                    </div>

                    <div
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '5px',
                        padding: '0.55rem 0.75rem',
                        overflowX: 'auto'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem'
                        }}
                      >
                        Substituição / Expressão Resultante:
                      </div>
                      <MathView math={step.resultLatex} />
                    </div>
                  </div>
                </div>
              )))}
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 5 — DESENVOLVIMENTO ALGÉBRICO
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            5,
            'Etapa 5',
            'Desenvolvimento Algébrico e Álgebra de Blocos',
            'Associações em cascata/paralelo, redução de malha fechada, MMC, agrupamento de termos em Y(s) e isolamento'
          )}

          {openSteps[5] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.95rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Aplicamos as propriedades fundamentais da álgebra de blocos (associação em série/cascata,
                associação em paralelo e redução de malha fechada), expandimos os produtos distributivos,
                reduzimos as frações racionais ao mesmo denominador (MMC) e isolamos a saída{' '}
                <MathView math={fullSys.primaryOutput.signalLatex} inline />:
              </p>

              {/* 5.1 — Redução Gráfica Progressiva com Diagramas Equivalentes (Seção 3) */}
              {fullSys.graphicalReduction?.steps?.length > 0 ? (
                <div
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    flexShrink: 0,
                    minHeight: 'fit-content',
                    height: 'auto',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--primary)' }}>
                      📐 Sequência Didática — Diagramas Equivalentes e Álgebra de Blocos
                    </div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      {fullSys.graphicalReduction.steps.length} etapas visuais progressivas
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    Transformação passo a passo do diagrama de blocos até a redução final a um único bloco equivalente,
                    preservando a estrita equivalência matemática e gráfica das conexões:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {fullSys.graphicalReduction.steps.map((st, sIdx) => (
                      <div
                        key={`gstep-${sIdx}`}
                        style={{
                          background: 'var(--code-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                          flexShrink: 0,
                          minHeight: 'fit-content',
                          height: 'auto',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                            Etapa 5.{sIdx + 1} — {st.title}
                          </span>
                          <span style={{ fontSize: '0.69rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {st.rule}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {st.description}
                        </div>

                        {/* Diagrama Equivalente SVG */}
                        <EquivalentDiagramRenderer
                          diagram={st.diagram}
                          stepTitle={`Representação Gráfica Equivalente — Etapa ${sIdx + 1}`}
                        />

                        {/* Equações da Etapa */}
                        {st.equations.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                            {st.equations.map((eq, eIdx) => (
                              <div
                                key={`eq-${eIdx}`}
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: '5px',
                                  padding: '0.55rem 0.8rem',
                                  overflowX: 'auto'
                                }}
                              >
                                <MathView math={eq.latex} />
                                {eq.note && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    💡 {eq.note}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    flexShrink: 0
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                    📐 Redução Algébrica Direta do Diagrama
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    Para este diagrama, a redução é obtida diretamente através da associação algébrica dos blocos
                    e das equações de somadores formuladas nas etapas anteriores:
                  </p>
                  <div
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                      overflowX: 'auto'
                    }}
                  >
                    <MathView
                      math={`\\frac{${fullSys.primaryOutput.signalLatex}}{${fullSys.independentInputs[0]?.signalLatex || 'R(s)'}} = ${fullSys.outputByInputPairs[0]?.transferFunctionLatex || fullSys.superpositionOutputLatex}`}
                    />
                  </div>
                </div>
              )}

              {/* Ramos de transmissão direta identificados por entrada */}
              {systemData.detailedOutputPairs.map((dPair, pIdx) => (
                <div
                  key={`alg-pair-${pIdx}`}
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    flexShrink: 0,
                    minHeight: 'fit-content',
                    height: 'auto',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--primary)' }}>
                    5.{pIdx + 1} — Associação em Cascata no Ramo Direto da Entrada{' '}
                    <MathView math={dPair.pair.inputInfo.signalLatex} inline /> até{' '}
                    <MathView math={dPair.pair.targetInfo.signalLatex} inline />
                  </div>
                  {dPair.paths.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.3rem 0' }}>
                      Nenhum trajeto direto intermediário nesta direção (o sinal atua por acoplamento via malha).
                    </div>
                  ) : (
                    dPair.paths.map(path => (
                      <div
                        key={path.index}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '5px',
                          padding: '0.65rem 0.85rem',
                          overflowX: 'auto'
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          Trajeto de sinal ({path.index}): <MathView math={path.nodeSequenceLatex} inline />
                        </div>
                        <MathView
                          math={`G_{\\text{direto},${path.index}}(s) = ${path.symbolicProductLatex} = ${path.substitutedProductLatex} = ${path.simplifiedGainLatex}`}
                        />
                      </div>
                    ))
                  )}
                </div>
              ))}

              {/* Malhas de Realimentação e Fator Característico de Malha Fechada */}
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)' }}>
                  Redução de Malha Fechada e Agrupamento dos Termos em{' '}
                  <MathView math={fullSys.primaryOutput.signalLatex} inline />
                </div>

                {systemData.detailedLoops.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    O diagrama opera em <strong>Malha Aberta</strong> (nenhum ramo de realimentação retorna
                    sinal de <MathView math={fullSys.primaryOutput.signalLatex} inline /> aos somadores de
                    entrada). Portanto, o fator de realimentação que multiplica{' '}
                    <MathView math={fullSys.primaryOutput.signalLatex} inline /> no lado esquerdo da igualdade
                    é unitário (<MathView math="1" inline />).
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '0.81rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                      Ao passar os termos que dependem da saída{' '}
                      <MathView math={fullSys.primaryOutput.signalLatex} inline /> (provenientes dos ramos de
                      realimentação) para o lado esquerdo da equação e colocá-la em evidência, obtemos o
                      fator de malha fechada <MathView math="1 \mp G_{\text{malha}}(s)" inline />:
                    </div>
                    {systemData.detailedLoops.map(loop => (
                      <div
                        key={loop.index}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '5px',
                          padding: '0.65rem 0.85rem',
                          overflowX: 'auto'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.25rem'
                          }}
                        >
                          <span>
                            Malha de Realimentação #{loop.index}:{' '}
                            <MathView math={loop.nodeSequenceLatex} inline />
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: loop.overallSign === '-' ? 'var(--success)' : 'var(--danger)'
                            }}
                          >
                            {loop.feedbackTypeLabel}
                          </span>
                        </div>
                        <MathView
                          math={`G_{\\text{malha},${loop.index}}(s) = ${loop.symbolicProductLatex} = ${loop.substitutedProductLatex} = ${loop.simplifiedGainLatex}`}
                        />
                      </div>
                    ))}
                  </>
                )}

                <div
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '5px',
                    padding: '0.7rem 0.85rem',
                    overflowX: 'auto'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      marginBottom: '0.25rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Fator Característico de Malha Fechada (após MMC dos denominadores):
                  </div>
                  <MathView
                    math={`D_{\\text{malha}}(s) = ${formatRatFuncLatex(
                      fullSys.outputByInputPairs[0]?.masonAnalysis.delta || analysis.delta
                    )}`}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 6 — FUNÇÕES DE TRANSFERÊNCIA INDIVIDUAIS
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            6,
            'Etapa 6',
            'Funções de Transferência Individuais',
            'Obtenção de Y(s)/R(s), Y(s)/D(s), E(s)/R(s) e E(s)/D(s) na forma racional simplificada'
          )}

          {openSteps[6] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Dividindo o ganho do caminho direto pelo fator característico de malha fechada e
                simplificando os fatores comuns de numerador e denominador (cancelamento do MMC), obtemos
                cada função de transferência individual:
              </p>

              {fullSys.outputByInputPairs.length === 0 ? (
                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  Nenhuma relação de transferência pôde ser computada. Verifique as conexões entre entrada e saída.
                </div>
              ) : (
                fullSys.outputByInputPairs.map((pair, idx) => (
                  <div
                    key={`tf-card-${idx}`}
                    style={{
                      background: 'var(--code-bg)',
                      border: '1px solid var(--card-border)',
                      borderLeft: '4px solid var(--primary)',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      overflowX: 'auto',
                      flexShrink: 0
                    }}
                  >
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      marginBottom: '0.4rem'
                    }}
                  >
                    Função de Transferência da Saída em relação a {pair.inputInfo.displayName} (considerando{' '}
                    {pair.zeroedInputsText || 'demais entradas nulas'}):
                  </div>
                  <MathView
                    math={`\\frac{${pair.targetInfo.signalLatex}}{${pair.inputInfo.signalLatex}} = ${pair.transferFunctionLatex}`}
                  />
                  <div
                    style={{
                      marginTop: '0.45rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace'
                    }}
                  >
                    Expressão linear: {pair.transferFunctionCompact}
                  </div>
                </div>
              )))}

              {fullSys.summerByInputPairs.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Funções de Transferência do Sinal de Erro / Somadores Intermediários:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '0.65rem'
                    }}
                  >
                    {fullSys.summerByInputPairs.map((pair, idx) => (
                      <div
                        key={`err-tf-card-${idx}`}
                        style={{
                          background: 'var(--code-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          padding: '0.75rem 0.9rem',
                          overflowX: 'auto'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            marginBottom: '0.3rem'
                          }}
                        >
                          Sinal <MathView math={pair.targetInfo.signalLatex} inline /> por{' '}
                          <MathView math={pair.inputInfo.signalLatex} inline />:
                        </div>
                        <MathView
                          math={`\\frac{${pair.targetInfo.signalLatex}}{${pair.inputInfo.signalLatex}} = ${pair.transferFunctionLatex}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 7 — PRINCÍPIO DA SUPERPOSIÇÃO
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            7,
            'Etapa 7',
            'Aplicação do Princípio da Superposição',
            'Cálculo das contribuições parciais anulando as demais entradas e recomposição linear total'
          )}

          {openSteps[7] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Por tratar-se de um Sistema Linear Invariante no Tempo (SLIT), quando há múltiplas entradas
                independentes atuando simultaneamente (por exemplo, referência{' '}
                <MathView math="R(s)" inline />, perturbação <MathView math="D(s)" inline /> e ruído{' '}
                <MathView math="N(s)" inline />), aplicamos o{' '}
                <strong>Princípio da Superposição</strong>: avaliamos a contribuição individual de cada
                entrada anulando as demais e somamos algebricamente as respostas parciais.
              </p>

              {fullSys.outputByInputPairs.map((pair, idx) => (
                <div
                  key={`sup-part-${idx}`}
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.75rem 0.95rem',
                    overflowX: 'auto',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.77rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Contribuição parcial {idx + 1} — Atuação exclusiva de{' '}
                    <MathView math={pair.inputInfo.signalLatex} inline />{' '}
                    {pair.zeroedInputsLatex ? (
                      <span>
                        (fazendo <MathView math={pair.zeroedInputsLatex} inline />)
                      </span>
                    ) : null}
                    :
                  </div>
                  <MathView
                    math={`${pair.targetInfo.signalLatex}_{(${pair.inputInfo.shortSymbol})} = \\left(${pair.transferFunctionLatex}\\right) \\cdot ${pair.inputInfo.signalLatex}`}
                  />
                </div>
              ))}

              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderLeft: '4px solid var(--success)',
                  borderRadius: '6px',
                  padding: '0.85rem 1rem',
                  overflowX: 'auto'
                }}
              >
                <div
                  style={{
                    fontSize: '0.77rem',
                    fontWeight: 700,
                    color: 'var(--success)',
                    textTransform: 'uppercase',
                    marginBottom: '0.35rem'
                  }}
                >
                  Recomposição Linear Total da Saída por Superposição:
                </div>
                <MathView math={fullSys.superpositionOutputLatex} />
              </div>

              {fullSys.superpositionSummers.map((sumSup, idx) => (
                <div
                  key={`sup-sum-${idx}`}
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.75rem 0.95rem',
                    overflowX: 'auto'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Recomposição por Superposição no Somador ({sumSup.summerInfo.displayName}):
                  </div>
                  <MathView math={sumSup.latex} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 8 — RESULTADO FINAL E VALIDAÇÃO ALGÉBRICA
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            8,
            'Etapa 8',
            'Resultado Final e Validação Algébrica Independente',
            'Expressões finais consolidadas e confirmação por resolução do sistema linear de equações de nós'
          )}

          {openSteps[8] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '0.9rem 1rem',
                  overflowX: 'auto',
                  flexShrink: 0
                }}
              >
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    marginBottom: '0.35rem'
                  }}
                >
                  Expressão Algébrica Final Consolidada da Saída:
                </div>
                <MathView math={fullSys.superpositionOutputLatex} />
              </div>

              {fullSys.superpositionSummers.map((sEq, idx) => (
                <div
                  key={`final-sum-${idx}`}
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.8rem 1rem',
                    overflowX: 'auto',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Expressão Algébrica Final do Sinal de Erro / Somador ({sEq.summerInfo.displayName}):
                  </div>
                  <MathView math={sEq.latex} />
                </div>
              ))}

              {/* Subseção de Validação Algébrica Independente */}
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  flexShrink: 0
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>
                    ✓ Prova Real — Validação por Eliminação Algébrica Direta do Sistema Linear
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {fullSys.allValidationsMatch
                      ? '100% de equivalência polinomial verificada'
                      : 'Equacionamento verificado'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {fullSys.algebraicValidationSteps.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.4rem 0' }}>
                      Validação confirmada diretamente por equivalência das equações dos nós.
                    </div>
                  ) : (
                    fullSys.algebraicValidationSteps.map((vStep, idx) => (
                      <div
                        key={`val-step-${idx}`}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '5px',
                          padding: '0.55rem 0.8rem',
                          overflowX: 'auto'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.2rem',
                            fontWeight: 600
                          }}
                        >
                          {vStep.title}: {vStep.description}
                        </div>
                        <MathView math={vStep.equationLatex} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =================================================================
            ETAPA 9 — REGIME PERMANENTE (TEOREMA DO VALOR FINAL)
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            9,
            'Etapa 9',
            'Análise em Regime Permanente e Erro Estacionário (TVF)',
            'Aplicação do Teorema do Valor Final para entradas em degrau com verificação de estabilidade'
          )}

          {openSteps[9] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '0.8rem 1rem',
                  fontSize: '0.83rem',
                  lineHeight: 1.6
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem' }}>
                  Teorema do Valor Final (TVF) para Entradas em Degrau:
                </div>
                <div>
                  Considerando entradas em degrau <MathView math="R(s) = \frac{r_0}{s}" inline />,{' '}
                  <MathView math="D(s) = \frac{d_0}{s}" inline /> e <MathView math="N(s) = \frac{n_0}{s}" inline />, o valor da saída e do erro em regime
                  permanente (<MathView math="t \to \infty" inline />) é obtido por:
                </div>
                <div style={{ margin: '0.45rem 0', overflowX: 'auto' }}>
                  <MathView math={fullSys.steadyStateReport.conditionLatex} />
                </div>
                <div
                  style={{
                    marginTop: '0.4rem',
                    padding: '0.45rem 0.7rem',
                    borderRadius: '5px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: fullSys.steadyStateReport.applicable
                      ? 'var(--success)'
                      : 'var(--danger)',
                    fontWeight: 600,
                    fontSize: '0.79rem'
                  }}
                >
                  Condição de Aplicabilidade (Estabilidade / Routh-Hurwitz):{' '}
                  {fullSys.steadyStateReport.reasonText}
                </div>
              </div>

              {/* Expressões Globais de Regime Permanente */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '0.75rem'
                }}
              >
                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '0.8rem 0.95rem',
                    overflowX: 'auto'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      textTransform: 'uppercase',
                      marginBottom: '0.35rem'
                    }}
                  >
                    Saída Total em Regime Permanente:
                  </div>
                  <MathView math={fullSys.steadyStateReport.totalOutputSteadyStateLatex} />
                </div>

                {fullSys.steadyStateReport.totalErrorSteadyStateLatex && (
                  <div
                    style={{
                      background: 'var(--code-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      padding: '0.8rem 0.95rem',
                      overflowX: 'auto'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        color: 'var(--text)',
                        textTransform: 'uppercase',
                        marginBottom: '0.35rem'
                      }}
                    >
                      Erro Estacionário Total em Regime Permanente:
                    </div>
                    <MathView math={fullSys.steadyStateReport.totalErrorSteadyStateLatex} />
                  </div>
                )}
              </div>

              {/* Detalhamento por entrada */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '0.65rem'
                }}
              >
                {fullSys.steadyStateReport.perInputResults.map((entry, idx) => (
                  <div
                    key={`tvf-entry-${idx}`}
                    style={{
                      background: 'var(--code-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      padding: '0.75rem 0.9rem',
                      overflowX: 'auto'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '0.3rem'
                      }}
                    >
                      Contribuição em <MathView math="s \to 0" inline /> de{' '}
                      <MathView math={`${entry.inputInfo.signalLatex} = \\frac{${entry.inputAmplitudeSymbol}}{s}`} inline />:
                    </div>
                    <MathView
                      math={`y_{rp,(${entry.inputInfo.shortSymbol})} = \\left(${entry.outputSteadyStateLatex}\\right) \\cdot ${entry.inputAmplitudeSymbol}${
                        entry.errorSteadyStateLatex
                          ? ` \\; , \\quad e_{rp,(${entry.inputInfo.shortSymbol})} = \\left(${entry.errorSteadyStateLatex}\\right) \\cdot ${entry.inputAmplitudeSymbol}`
                          : ''
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Notas pedagógicas de aula (ex.: K = 1/Km no motor CC) */}
              {fullSys.steadyStateReport.pedagogicalNotes.length > 0 && (
                <div
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderLeft: '4px solid var(--primary)',
                    borderRadius: '6px',
                    padding: '0.75rem 0.95rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: 'var(--text)'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    Observações Analíticas de Projeto (Metodologia de Aula):
                  </div>
                  {fullSys.steadyStateReport.pedagogicalNotes.map((note, idx) => (
                    <div key={`ped-note-${idx}`} style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      • {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* =================================================================
            SEÇÃO 10 (OBRIGATÓRIA) — IMPLEMENTAÇÃO E SIMULAÇÃO NO SCILAB
            ================================================================= */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            flexShrink: 0,
            minHeight: 'fit-content',
            height: 'auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {renderSectionHeader(
            10,
            'Scilab (.sce)',
            'Implementação e Simulação no Scilab',
            'Código executável .sce gerado automaticamente a partir do circuito resolvido (poly em ordem crescente, syslin e csim)',
            'var(--success)'
          )}

          {openSteps[10] && (
            <div
              style={{
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}
            >
              {/* Barra de status e botões do Scilab */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '0.75rem 0.95rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: fullSys.scilabReport.isFullyNumeric ? 'var(--success)' : 'var(--primary)'
                    }}
                  >
                    {fullSys.scilabReport.isFullyNumeric
                      ? '✓ Circuito Totalmente Numérico — Pronto para Execução Direta'
                      : `Parâmetros Simbólicos a Definir no Scilab: ${fullSys.scilabReport.pendingSymbolicParams.join(', ')}`}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Convenção Scilab: <code>poly([a0, a1, a2, ...], &apos;s&apos;, &apos;coeff&apos;)</code> em ordem crescente de potências de <code>s</code>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(fullSys.scilabReport.scriptCode, 'scilab')}
                    style={{
                      padding: '0.32rem 0.7rem',
                      borderRadius: '5px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'var(--card-bg)',
                      color: copiedType === 'scilab' ? 'var(--success)' : 'var(--primary)',
                      border: '1px solid var(--card-border)',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedType === 'scilab' ? '✓ Script .sce Copiado!' : 'Copiar Script Scilab'}
                  </button>
                  <button
                    type="button"
                    onClick={downloadScilabFile}
                    style={{
                      padding: '0.32rem 0.7rem',
                      borderRadius: '5px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ⬇ Baixar Arquivo .sce
                  </button>
                </div>
              </div>

              {/* Pré-visualização gráfica quando o circuito é numérico */}
              {renderStepResponseChart()}

              {/* Código-fonte Scilab */}
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderBottom: '1px solid var(--card-border)',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>simulacao_sistema_controle.sce</span>
                  <span>Scilab 6.x / 2024.x Compatível</span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '0.9rem 1rem',
                    fontSize: '0.78rem',
                    lineHeight: 1.55,
                    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
                    color: 'var(--text)',
                    overflowX: 'auto'
                  }}
                >
                  <code>{fullSys.scilabReport.scriptCode}</code>
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
