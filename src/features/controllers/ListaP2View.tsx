'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MathView } from '@/components/MathView';
import { InteractiveTimeChart, ChartSeries } from '@/components/InteractiveTimeChart';
import { ControllerBlockDiagram } from './ControllerBlockDiagram';
import { parseRatExpr } from '@/core/algebra/parser';
import { buildClosedLoopTf, simulateInputResponseRK4 } from './controllersData';
import { LISTA_P2_QUESTIONS, ListaCategory, ListaQuestion } from './listaP2Data';

function renderRichMathText(text: string): React.ReactNode {
  // Suporta também **negrito** simples além de $...$
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
    return <MathView math={latex} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
      {lines.map((line, i) => (
        <div key={`lm-${i}`} style={{ width: '100%', overflowX: 'auto' }}>
          <MathView math={line} />
        </div>
      ))}
    </div>
  );
}

export const ListaP2View: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<ListaCategory>('all');
  const [selectedId, setSelectedId] = useState<string>('q1');
  const [copiedScilab, setCopiedScilab] = useState<boolean>(false);

  // Restaura questão selecionada da URL (?q=q20) ao dar Ctrl+F5
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    if (qParam && LISTA_P2_QUESTIONS.some(q => q.id === qParam)) {
      setSelectedId(qParam);
    }
  }, []);

  const filteredQuestions = useMemo(() => {
    if (categoryFilter === 'all') return LISTA_P2_QUESTIONS;
    return LISTA_P2_QUESTIONS.filter(q => q.category === categoryFilter);
  }, [categoryFilter]);

  const activeQuestion: ListaQuestion = useMemo(() => {
    return filteredQuestions.find(q => q.id === selectedId) || filteredQuestions[0];
  }, [filteredQuestions, selectedId]);

  const handleSelectQuestion = (id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('view', 'controllers');
      params.set('tab', 'listas');
      params.set('q', id);
      window.history.replaceState(null, '', `/?${params.toString()}`);
    }
  };

  // Simulação RK4 para questões práticas (Q20 a Q23)
  const practicalSim = useMemo(() => {
    const p = activeQuestion.practicalData;
    if (!p) return null;

    try {
      const G = parseRatExpr(p.plantExpr);
      const Gc = parseRatExpr(p.controllerExpr);
      const Guncomp = p.uncompGainExpr
        ? parseRatExpr(p.uncompGainExpr)
        : { num: [{ coeff: 1, vars: {} }], den: [{ coeff: 1, vars: {} }] };

      const T_uncomp = buildClosedLoopTf(G, Guncomp);
      const T_comp = buildClosedLoopTf(G, Gc);

      const stepFn = () => 1;
      const simU = simulateInputResponseRK4(T_uncomp, stepFn, p.tMax, 300);
      const simC = simulateInputResponseRK4(T_comp, stepFn, p.tMax, 300);
      if (!simU || !simC) return null;

      const t = simC.t;
      const r = t.map(() => 1);
      const eU = simU.y.map(v => Number((1 - v).toFixed(5)));
      const eC = simC.y.map(v => Number((1 - v).toFixed(5)));

      return { t, r, yU: simU.y, yC: simC.y, eU, eC };
    } catch {
      return null;
    }
  }, [activeQuestion]);

  const copyScilab = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedScilab(true);
    setTimeout(() => setCopiedScilab(false), 2500);
  };

  const downloadScilab = (id: string, code: string) => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista_p2_${id}.sce`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Cabeçalho da Lista e Filtros */}
      <section
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '18px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Lista Oficial EEL6005 • 23 Questões Verificadas
            </span>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', color: 'var(--text)' }}>
              📝 Lista P2 Controle 1 — Resolução Passo a Passo &amp; Simulações
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(
              [
                { key: 'all', label: 'Todas (23)' },
                { key: 'transitorio', label: 'Transitório & Polos (Q1–Q3)' },
                { key: 'teorica', label: 'Teóricas & LGR (Q4–Q19)' },
                { key: 'pratica', label: 'Projeto & Scilab (Q20–Q23)' }
              ] as { key: ListaCategory; label: string }[]
            ).map(f => {
              const isAct = categoryFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(f.key);
                    const first = f.key === 'all' ? LISTA_P2_QUESTIONS[0] : LISTA_P2_QUESTIONS.find(q => q.category === f.key);
                    if (first) handleSelectQuestion(first.id);
                  }}
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
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade Compacta de Seleção das Questões */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filteredQuestions.map(q => {
            const isAct = q.id === activeQuestion.id;
            const isPractical = q.category === 'pratica';
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelectQuestion(q.id)}
                style={{
                  padding: '6px 11px',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: isAct ? 800 : 600,
                  background: isAct
                    ? 'var(--primary)'
                    : isPractical
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'var(--code-bg)',
                  color: isAct ? '#fff' : isPractical ? 'var(--success)' : 'var(--text)',
                  border: `1px solid ${isAct ? 'var(--primary)' : isPractical ? 'var(--success)' : 'var(--card-border)'}`,
                  cursor: 'pointer'
                }}
              >
                Q{q.number}{isPractical ? ' ⚡' : ''}
              </button>
            );
          })}
        </div>
      </section>

      {/* Detalhe da Questão Selecionada */}
      <section
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#fff',
              background: activeQuestion.category === 'pratica' ? '#059669' : 'var(--primary)',
              padding: '2px 8px',
              borderRadius: '4px',
              marginBottom: '6px'
            }}
          >
            {activeQuestion.badge}
          </span>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', color: 'var(--primary)' }}>
            {renderRichMathText(activeQuestion.title)}
          </h3>
          <div
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '12px 16px',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              color: 'var(--text)'
            }}
          >
            {renderRichMathText(activeQuestion.statement)}
          </div>
        </div>

        {/* Se for questão prática (Q20-Q23), mostra Diagrama do Enunciado + Diagrama Final */}
        {activeQuestion.practicalData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ControllerBlockDiagram
              title="Diagrama de Blocos do Enunciado (Planta Original em Malha Fechada)"
              showControllerBlock={false}
              plantLatex={activeQuestion.practicalData.plantLatex}
            />
            <ControllerBlockDiagram
              title="Diagrama de Blocos Final (Com o Controlador Projetado)"
              showControllerBlock={true}
              controllerLabel={activeQuestion.practicalData.controllerBlockLabel}
              controllerLatex={activeQuestion.practicalData.controllerLatex}
              plantLatex={activeQuestion.practicalData.plantLatex}
            />
          </div>
        )}

        {/* Resolução Passo a Passo */}
        <div
          style={{
            background: 'var(--code-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Resolução Passo a Passo (Conferida Analiticamente)
          </div>
          {activeQuestion.steps.map((st, idx) => (
            <div
              key={`lista-step-${idx}`}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '10px 14px',
                height: 'auto',
                minHeight: 'fit-content'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text)', marginBottom: '4px' }}>
                {renderRichMathText(st.title)}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: st.latex ? '6px' : 0 }}>
                {renderRichMathText(st.description)}
              </div>
              {st.latex && (
                <div style={{ padding: '4px 0', height: 'auto' }}>
                  {renderStackedMath(st.latex)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Simulação Interativa + Scilab para Q20 a Q23 */}
        {activeQuestion.practicalData && practicalSim && (
          <>
            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                Simulação Temporal Interativa (Degrau Unitário)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.9rem' }}>
                <InteractiveTimeChart
                  title="Resposta Temporal: Saída c(t) vs. Referência r(t)"
                  xValues={practicalSim.t}
                  series={[
                    { id: 'ref', label: 'Referência r(t)=1', values: practicalSim.r, color: '#94a3b8', dashed: true, strokeWidth: 1.8 },
                    {
                      id: 'uncomp',
                      label: activeQuestion.practicalData.uncompLabel || 'Planta Original (K=1)',
                      values: practicalSim.yU,
                      color: '#dc2626',
                      dashed: true,
                      strokeWidth: 2
                    },
                    {
                      id: 'comp',
                      label: 'Com Controlador Projetado',
                      values: practicalSim.yC,
                      color: '#0284c7',
                      strokeWidth: 2.5,
                      showLandmarks: true,
                      landmarkMode: 'output'
                    }
                  ] as ChartSeries[]}
                  inputType="step"
                />
                <InteractiveTimeChart
                  title="Erro de Rastreamento: e(t) = 1 − c(t)"
                  xValues={practicalSim.t}
                  series={[
                    {
                      id: 'eu',
                      label: `Erro ${activeQuestion.practicalData.uncompLabel || 'Original'}`,
                      values: practicalSim.eU,
                      color: '#dc2626',
                      dashed: true,
                      strokeWidth: 2
                    },
                    {
                      id: 'ec',
                      label: 'Erro Com Controlador',
                      values: practicalSim.eC,
                      color: '#059669',
                      strokeWidth: 2.5,
                      showLandmarks: true,
                      landmarkMode: 'error'
                    }
                  ] as ChartSeries[]}
                  inputType="step"
                />
              </div>
            </div>

            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                  💻 Script Scilab (.sce) — lista_p2_{activeQuestion.id}.sce
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => copyScilab(activeQuestion.practicalData!.scilabCode)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      color: copiedScilab ? 'var(--success)' : 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedScilab ? '✓ Copiado!' : 'Copiar Scilab'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadScilab(activeQuestion.id, activeQuestion.practicalData!.scilabCode)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ↓ Baixar .sce
                  </button>
                </div>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  fontSize: '0.77rem',
                  lineHeight: 1.5,
                  fontFamily: '"JetBrains Mono", Consolas, monospace',
                  color: 'var(--text)',
                  overflowX: 'auto'
                }}
              >
                <code>{activeQuestion.practicalData.scilabCode}</code>
              </pre>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
