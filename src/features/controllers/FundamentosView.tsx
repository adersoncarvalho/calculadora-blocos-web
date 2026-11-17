'use client';

import React, { useMemo, useState } from 'react';
import { MathView } from '@/components/MathView';
import { InteractiveTimeChart, ChartSeries } from '@/components/InteractiveTimeChart';
import { SPlaneChart } from '@/components/SPlaneChart';
import { ControllerBlockDiagram } from './ControllerBlockDiagram';
import { parseRatExpr } from '@/core/algebra/parser';
import { ratAdd, ratDiv, ratMul } from '@/core/algebra/rational';
import { buildClosedLoopTf, simulateInputResponseRK4 } from './controllersData';
import {
  BASIC_ACTIONS,
  PID_SUMMARY_TABLE,
  FUNDAMENTO_GROUPS,
  FUNDAMENTO_EXERCISES,
  PD_PRACTICAL_POINTS
} from './fundamentosData';

function renderRichMathText(text: string): React.ReactNode {
  const parts = text.split(/(\$[^$]+\$|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <MathView key={`m-${idx}`} math={part.slice(1, -1)} inline />;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`b-${idx}`}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`t-${idx}`}>{part}</React.Fragment>;
  });
}

function renderStackedMath(latex: string): React.ReactNode {
  const lines = latex
    .split(/\\qquad;\s*\\qquad|\\quad;\s*\\quad|\\;;\\;|\\;\s*;\s*\\;|\s+;\s+/g)
    .map(s => s.trim())
    .filter(Boolean);
  if (lines.length <= 1) {
    return (
      <div className="stacked-math-line">
        <MathView math={latex} block />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
      {lines.map((line, i) => (
        <div key={`fm-${i}`} className="stacked-math-line">
          <MathView math={line} block />
        </div>
      ))}
    </div>
  );
}

export const FundamentosView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'acoes' | 'casos' | 'pd-pratico'>('acoes');
  const [selectedExId, setSelectedExId] = useState<string>(FUNDAMENTO_EXERCISES[0].id);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const activeEx = useMemo(
    () => FUNDAMENTO_EXERCISES.find(c => c.id === selectedExId) || FUNDAMENTO_EXERCISES[0],
    [selectedExId]
  );

  const caseSim = useMemo(() => {
    const s = activeEx.simConfig;
    if (!s) return null;
    try {
      const G = parseRatExpr(s.plantExpr);
      const Gc = parseRatExpr(s.ctrlExpr);
      const one = { num: [{ coeff: 1, vars: {} }], den: [{ coeff: 1, vars: {} }] };

      const buildTf = (ctrl: ReturnType<typeof parseRatExpr>) => {
        if (s.mode === 'disturbance') {
          const den = ratAdd(one, ratMul(ctrl, G));
          return ratDiv(G, den);
        }
        return buildClosedLoopTf(G, ctrl);
      };

      const Tc = buildTf(Gc);
      const stepFn = () => 1;
      const simC = simulateInputResponseRK4(Tc, stepFn, s.tMax, 300);
      if (!simC) return null;

      let simCompare: { t: number[]; y: number[] } | null = null;
      if (s.compareExpr) {
        const Gcomp = parseRatExpr(s.compareExpr);
        const Tu = buildTf(Gcomp);
        simCompare = simulateInputResponseRK4(Tu, stepFn, s.tMax, 300);
      }

      return {
        t: simC.t,
        r: simC.t.map(() => (s.mode === 'disturbance' ? 0 : 1)),
        yC: simC.y,
        yCompare: simCompare ? simCompare.y : null
      };
    } catch {
      return null;
    }
  }, [activeEx]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Subnavegação das 3 aulas */}
      <section
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '16px 18px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Aula 13 • EEL6005
            </span>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', color: 'var(--text)' }}>
              Fundamentos de Controladores, Casos Práticos &amp; PD Realizável
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {!isCollapsed &&
              [
                { id: 'acoes' as const, label: '1. Ações P, I, PI, PD, PID (0000.1)' },
                { id: 'casos' as const, label: '2. Estudos de Caso — 7 Exercícios (0000.2)' },
                { id: 'pd-pratico' as const, label: '3. Derivativo & PD Prático (0000.3)' }
              ].map(tab => {
                const isAct = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.77rem',
                      fontWeight: isAct ? 700 : 500,
                      background: isAct ? 'var(--primary)' : 'var(--code-bg)',
                      color: isAct ? '#fff' : 'var(--text)',
                      border: `1px solid ${isAct ? 'var(--primary)' : 'var(--card-border)'}`,
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            <button
              type="button"
              onClick={() => setIsCollapsed(p => !p)}
              style={{
                padding: '6px 11px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: 'var(--code-bg)',
                color: 'var(--text-muted)',
                border: '1px solid var(--card-border)',
                cursor: 'pointer'
              }}
            >
              {isCollapsed ? '👁️ Mostrar Aula 13' : '🙈 Ocultar'}
            </button>
          </div>
        </div>
      </section>

      {/* ABA 1: Ações de Controle + Tabela PID (0000.1) */}
      {!isCollapsed && activeSubTab === 'acoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {BASIC_ACTIONS.map(act => (
              <div
                key={act.id}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary)' }}>{act.name}</div>
                <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '8px 10px', overflowX: 'auto' }}>
                  <MathView math={act.formulaLatex} />
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  {renderRichMathText(act.summary)}
                </div>
              </div>
            ))}
          </div>

          <section style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px 18px', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', color: 'var(--primary)' }}>
              Resumo das Ações do Controlador PID (Efeito de Aumentar cada Ganho)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'var(--code-bg)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Parâmetro</th>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Tempo de Subida</th>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Sobressinal (Overshoot)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Tempo de Estabelecimento</th>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Erro Estacionário</th>
                </tr>
              </thead>
              <tbody>
                {PID_SUMMARY_TABLE.map(row => (
                  <tr key={row.param}>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', fontWeight: 800, color: 'var(--primary)' }}>{row.param}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>{row.riseTime}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>{row.overshoot}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>{row.settlingTime}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', fontWeight: 700 }}>{row.steadyError}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ABA 2: 3 Estudos de Caso separados em 7 Exercícios (0000.2) */}
      {!isCollapsed && activeSubTab === 'casos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Grade dos 3 Estudos de Caso com seus 7 exercícios separados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '12px' }}>
            {FUNDAMENTO_GROUPS.map(grp => {
              const items = FUNDAMENTO_EXERCISES.filter(e => e.groupId === grp.id);
              const isGrpActive = activeEx.groupId === grp.id;
              return (
                <div
                  key={grp.id}
                  style={{
                    background: 'var(--card-bg)',
                    border: `1.5px solid ${isGrpActive ? 'var(--primary)' : 'var(--card-border)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.71rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {grp.slidesRange}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
                      <MathView math={grp.plantLatex} inline />
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>
                    {grp.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {items.map(item => {
                      const isAct = item.id === activeEx.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedExId(item.id)}
                          style={{
                            textAlign: 'left',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: isAct ? 700 : 500,
                            background: isAct ? 'var(--primary)' : 'var(--code-bg)',
                            color: isAct ? '#fff' : 'var(--text)',
                            border: `1px solid ${isAct ? 'var(--primary)' : 'var(--card-border)'}`,
                            cursor: 'pointer'
                          }}
                        >
                          {renderRichMathText(item.shortLabel)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <section style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {activeEx.badge} • {activeEx.source}
              </span>
              <h3 style={{ margin: '3px 0 8px 0', fontSize: '1.1rem', color: 'var(--primary)' }}>
                {renderRichMathText(activeEx.title)}
              </h3>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '12px 14px', fontSize: '0.86rem', lineHeight: 1.55 }}>
                {renderRichMathText(activeEx.statement)}
              </div>
            </div>

            {activeEx.diagram && (
              <ControllerBlockDiagram
                title="Diagrama de Blocos do Exercício"
                showControllerBlock={true}
                controllerLabel={activeEx.diagram.controllerLabel}
                controllerLatex={activeEx.diagram.controllerLatex}
                plantLatex={activeEx.diagram.plantLatex}
                plantExpr={activeEx.diagram.plantExpr}
                controllerExpr={activeEx.diagram.controllerExpr}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeEx.steps.map((st, i) => (
                <div key={`cs-${i}`} style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: '4px' }}>{renderRichMathText(st.title)}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: st.latex ? '6px' : 0 }}>
                    {renderRichMathText(st.description)}
                  </div>
                  {st.latex && renderStackedMath(st.latex)}
                </div>
              ))}
            </div>

            {activeEx.simConfig && caseSim && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.28)',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--text)',
                    lineHeight: 1.5
                  }}
                >
                  <strong style={{ color: 'var(--primary)' }}>Nota da Simulação Ilustrativa:</strong>{' '}
                  {renderRichMathText(activeEx.simConfig.exampleNote)}
                </div>
                <InteractiveTimeChart
                  title={
                    activeEx.simConfig.mode === 'disturbance' ? (
                      <>
                        Resposta ao Distúrbio em Degrau <MathView math="D(s) = \frac{1}{s}" inline /> (RK4)
                      </>
                    ) : (
                      <>
                        Resposta ao Degrau Unitário <MathView math="R(s) = \frac{1}{s}" inline /> (RK4)
                      </>
                    )
                  }
                  xValues={caseSim.t}
                  series={[
                    {
                      id: 'ref',
                      label: activeEx.simConfig.mode === 'disturbance' ? 'Meta de rejeição (0)' : 'Referência r(t)=1',
                      values: caseSim.r,
                      color: '#94a3b8',
                      dashed: true,
                      strokeWidth: 1.8
                    },
                    ...(caseSim.yCompare && activeEx.simConfig.compareLabel
                      ? [
                          {
                            id: 'cmp',
                            label: activeEx.simConfig.compareLabel,
                            values: caseSim.yCompare,
                            color: '#dc2626',
                            dashed: true,
                            strokeWidth: 2
                          }
                        ]
                      : []),
                    {
                      id: 'c',
                      label: activeEx.simConfig.ctrlLabel,
                      values: caseSim.yC,
                      color: '#0284c7',
                      strokeWidth: 2.5,
                      showLandmarks: true,
                      landmarkMode: 'output'
                    }
                  ] as ChartSeries[]}
                  inputType="step"
                />
                {activeEx.diagram && (
                  <SPlaneChart
                    title="Plano s — Polos, Zeros e LGR"
                    plantExpr={activeEx.diagram.plantExpr}
                    controllerExpr={activeEx.diagram.controllerExpr}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ABA 3: Derivativo Puro & PD Prático (0000.3) */}
      {!isCollapsed && activeSubTab === 'pd-pratico' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {PD_PRACTICAL_POINTS.map((sec, idx) => (
            <section
              key={`pd-${idx}`}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '16px 18px'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', color: 'var(--primary)' }}>
                {renderRichMathText(sec.title)}
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text)' }}>
                {sec.items.map((item, j) => (
                  <li key={`pdi-${j}`}>{renderRichMathText(item)}</li>
                ))}
              </ul>
            </section>
          ))}

          <section style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px 18px', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', color: 'var(--primary)' }}>
              Comparativo Direto: PD Ideal vs. PD Real (Filtro) vs. Compensador Lead
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'var(--code-bg)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Modelo</th>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Função de Transferência</th>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Grau (Num/Den)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>Realizável?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', fontWeight: 700 }}>PD Ideal</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}><MathView math="K_p(1 + T_d s)" inline /></td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>1 / 0 (Impróprio)</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', color: 'var(--danger)', fontWeight: 700 }}>Não</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', fontWeight: 700 }}>PD Real (Filtro)</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}><MathView math="K_p\left[1 + \frac{T_d s}{(T_d/N)s + 1}\right]" inline /></td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>1 / 1 (Próprio)</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', color: 'var(--success)', fontWeight: 700 }}>Sim</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', fontWeight: 700 }}>Compensador Lead</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}><MathView math="K\frac{s+z}{s+p},\; |z| < |p|" inline /></td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)' }}>1 / 1 (Próprio)</td>
                  <td style={{ padding: '8px 10px', border: '1px solid var(--card-border)', color: 'var(--success)', fontWeight: 700 }}>Sim</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
};
