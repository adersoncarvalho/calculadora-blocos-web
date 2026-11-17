'use client';

import React, { useMemo, useState } from 'react';
import { MathView } from '@/components/MathView';
import { InteractiveTimeChart, ChartSeries } from '@/components/InteractiveTimeChart';
import { SPlaneChart } from '@/components/SPlaneChart';
import { ControllerBlockDiagram } from './ControllerBlockDiagram';
import { parseRatExpr } from '@/core/algebra/parser';
import { buildClosedLoopTf, simulateInputResponseRK4 } from './controllersData';
import {
  BASIC_ACTIONS,
  PID_SUMMARY_TABLE,
  FUNDAMENTO_CASE_STUDIES,
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
  if (lines.length <= 1) return <MathView math={latex} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
      {lines.map((line, i) => (
        <div key={`fm-${i}`} style={{ width: '100%', overflowX: 'auto' }}>
          <MathView math={line} />
        </div>
      ))}
    </div>
  );
}

export const FundamentosView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'acoes' | 'casos' | 'pd-pratico'>('acoes');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(FUNDAMENTO_CASE_STUDIES[0].id);

  const activeCase = useMemo(
    () => FUNDAMENTO_CASE_STUDIES.find(c => c.id === selectedCaseId) || FUNDAMENTO_CASE_STUDIES[0],
    [selectedCaseId]
  );

  const caseSim = useMemo(() => {
    const s = activeCase.simConfig;
    if (!s) return null;
    try {
      const G = parseRatExpr(s.plantExpr);
      const Gu = parseRatExpr(s.uncompExpr);
      const Gc = parseRatExpr(s.compExpr);
      const Tu = buildClosedLoopTf(G, Gu);
      const Tc = buildClosedLoopTf(G, Gc);
      const stepFn = () => 1;
      const simU = simulateInputResponseRK4(Tu, stepFn, s.tMax, 300);
      const simC = simulateInputResponseRK4(Tc, stepFn, s.tMax, 300);
      if (!simU || !simC) return null;
      return {
        t: simC.t,
        r: simC.t.map(() => 1),
        yU: simU.y,
        yC: simC.y
      };
    } catch {
      return null;
    }
  }, [activeCase]);

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
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'acoes' as const, label: '1. Ações P, I, PI, PD, PID (0000.1)' },
              { id: 'casos' as const, label: '2. Estudos de Caso & Simulações (0000.2)' },
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
          </div>
        </div>
      </section>

      {/* ABA 1: Ações de Controle + Tabela PID (0000.1) */}
      {activeSubTab === 'acoes' && (
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

      {/* ABA 2: Estudos de Caso & Exercícios (0000.2) */}
      {activeSubTab === 'casos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FUNDAMENTO_CASE_STUDIES.map(c => {
              const isAct = c.id === activeCase.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCaseId(c.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: isAct ? 700 : 500,
                    background: isAct ? 'var(--primary)' : 'var(--card-bg)',
                    color: isAct ? '#fff' : 'var(--text)',
                    border: `1px solid ${isAct ? 'var(--primary)' : 'var(--card-border)'}`,
                    cursor: 'pointer'
                  }}
                >
                  {c.badge}
                </button>
              );
            })}
          </div>

          <section style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)' }}>{activeCase.source}</span>
              <h3 style={{ margin: '3px 0 8px 0', fontSize: '1.1rem', color: 'var(--primary)' }}>
                {renderRichMathText(activeCase.title)}
              </h3>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '12px 14px', fontSize: '0.86rem', lineHeight: 1.55 }}>
                {renderRichMathText(activeCase.statement)}
              </div>
            </div>

            {activeCase.simConfig && (
              <ControllerBlockDiagram
                title="Diagrama de Blocos do Caso de Estudo"
                showControllerBlock={true}
                controllerLabel="Controlador"
                controllerLatex={activeCase.simConfig.controllerLatex}
                plantLatex={activeCase.simConfig.plantLatex}
                plantExpr={activeCase.simConfig.plantExpr}
                controllerExpr={activeCase.simConfig.compExpr}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeCase.steps.map((st, i) => (
                <div key={`cs-${i}`} style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: '4px' }}>{renderRichMathText(st.title)}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: st.latex ? '6px' : 0 }}>
                    {renderRichMathText(st.description)}
                  </div>
                  {st.latex && renderStackedMath(st.latex)}
                </div>
              ))}
            </div>

            {activeCase.simConfig && caseSim && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InteractiveTimeChart
                  title="Comparação Temporal ao Degrau Unitário (RK4)"
                  xValues={caseSim.t}
                  series={[
                    { id: 'ref', label: 'Referência r(t)=1', values: caseSim.r, color: '#94a3b8', dashed: true, strokeWidth: 1.8 },
                    { id: 'u', label: activeCase.simConfig.uncompLabel, values: caseSim.yU, color: '#dc2626', dashed: true, strokeWidth: 2 },
                    { id: 'c', label: activeCase.simConfig.compLabel, values: caseSim.yC, color: '#0284c7', strokeWidth: 2.5, showLandmarks: true, landmarkMode: 'output' }
                  ] as ChartSeries[]}
                  inputType="step"
                />
                <SPlaneChart
                  title="Plano s — Polos, Zeros e LGR do Sistema Compensado"
                  plantExpr={activeCase.simConfig.plantExpr}
                  controllerExpr={activeCase.simConfig.compExpr}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {/* ABA 3: Derivativo Puro & PD Prático (0000.3) */}
      {activeSubTab === 'pd-pratico' && (
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
