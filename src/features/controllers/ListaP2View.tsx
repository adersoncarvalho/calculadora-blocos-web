'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MathView } from '@/components/MathView';
import { InteractiveTimeChart, ChartSeries } from '@/components/InteractiveTimeChart';
import { SPlaneChart } from '@/components/SPlaneChart';
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
    return (
      <div className="stacked-math-line">
        <MathView math={latex} block />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
      {lines.map((line, i) => (
        <div key={`lm-${i}`} className="stacked-math-line">
          <MathView math={line} block />
        </div>
      ))}
    </div>
  );
}

export const ListaP2View: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<ListaCategory>('all');
  const [selectedId, setSelectedId] = useState<string>('q1');
  const [copiedScilab, setCopiedScilab] = useState<boolean>(false);
  const [studyMode, setStudyMode] = useState<boolean>(false);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Restaura questão selecionada da URL (?q=q20) e progresso salvo no localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    if (qParam && LISTA_P2_QUESTIONS.some(q => q.id === qParam)) {
      setSelectedId(qParam);
    }
    try {
      const saved = window.localStorage.getItem('lista_p2_completed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCompletedIds(parsed);
      }
    } catch {
      // ignora erro de localStorage
    }
  }, []);

  const toggleCompleted = (id: string) => {
    setCompletedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        window.localStorage.setItem('lista_p2_completed', JSON.stringify(next));
      } catch {
        // ignora erro de localStorage
      }
      return next;
    });
  };

  const filteredQuestions = useMemo(() => {
    if (categoryFilter === 'all') return LISTA_P2_QUESTIONS;
    return LISTA_P2_QUESTIONS.filter(q => q.category === categoryFilter);
  }, [categoryFilter]);

  const activeQuestion: ListaQuestion = useMemo(() => {
    return filteredQuestions.find(q => q.id === selectedId) || filteredQuestions[0];
  }, [filteredQuestions, selectedId]);

  const handleSelectQuestion = (id: string) => {
    setSelectedId(id);
    setRevealedCount(0);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('view', 'controllers');
      params.set('tab', 'listas');
      params.set('q', id);
      window.history.replaceState(null, '', `/?${params.toString()}`);
    }
  };

  const activeIdx = filteredQuestions.findIndex(q => q.id === activeQuestion.id);
  const prevQuestion = activeIdx > 0 ? filteredQuestions[activeIdx - 1] : null;
  const nextQuestion = activeIdx >= 0 && activeIdx < filteredQuestions.length - 1 ? filteredQuestions[activeIdx + 1] : null;
  const isCompleted = completedIds.includes(activeQuestion.id);

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
        className="no-print"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '18px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                Lista Oficial • 23 Questões Verificadas
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                ✓ {completedIds.length}/{LISTA_P2_QUESTIONS.length} concluídas
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', color: 'var(--text)' }}>
              Lista P2 Controle 1 — Resolução Passo a Passo &amp; Simulações
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
            const isDone = completedIds.includes(q.id);
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
                    : isDone
                    ? 'rgba(16, 185, 129, 0.16)'
                    : isPractical
                    ? 'rgba(14, 165, 233, 0.1)'
                    : 'var(--code-bg)',
                  color: isAct ? '#fff' : isDone ? 'var(--success)' : isPractical ? 'var(--primary)' : 'var(--text)',
                  border: `1px solid ${isAct ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--card-border)'}`,
                  cursor: 'pointer'
                }}
              >
                {isDone ? '✓ ' : ''}Q{q.number}{isPractical ? ' ⚡' : ''}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#fff',
                background: activeQuestion.category === 'pratica' ? '#059669' : 'var(--primary)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              {activeQuestion.badge}
            </span>

            <div className="no-print" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setStudyMode(prev => !prev);
                  setRevealedCount(0);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: studyMode ? 'rgba(245, 158, 11, 0.16)' : 'var(--code-bg)',
                  color: studyMode ? '#f59e0b' : 'var(--text)',
                  border: `1px solid ${studyMode ? '#f59e0b' : 'var(--card-border)'}`,
                  cursor: 'pointer'
                }}
              >
                {studyMode ? '👁️ Modo Estudo (Ativo)' : '🙈 Ocultar Resolução'}
              </button>

              <button
                type="button"
                onClick={() => toggleCompleted(activeQuestion.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: isCompleted ? 'rgba(16, 185, 129, 0.16)' : 'var(--code-bg)',
                  color: isCompleted ? 'var(--success)' : 'var(--text)',
                  border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--card-border)'}`,
                  cursor: 'pointer'
                }}
              >
                {isCompleted ? '✓ Concluída' : 'Marcar como Concluída'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: 'var(--code-bg)',
                  color: 'var(--primary)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer'
                }}
              >
                🖨️ Imprimir / PDF
              </button>
            </div>
          </div>
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
              plantExpr={activeQuestion.practicalData.plantExpr}
            />
            <ControllerBlockDiagram
              title="Diagrama de Blocos Final (Com o Controlador Projetado)"
              showControllerBlock={true}
              controllerLabel={activeQuestion.practicalData.controllerBlockLabel}
              controllerLatex={activeQuestion.practicalData.controllerLatex}
              plantLatex={activeQuestion.practicalData.plantLatex}
              plantExpr={activeQuestion.practicalData.plantExpr}
              controllerExpr={activeQuestion.practicalData.controllerExpr}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Resolução Passo a Passo (Conferida Analiticamente)
            </div>
            {studyMode && (
              <div className="no-print" style={{ display: 'flex', gap: '6px' }}>
                {revealedCount < activeQuestion.steps.length && (
                  <button
                    type="button"
                    onClick={() => setRevealedCount(c => Math.min(activeQuestion.steps.length, c + 1))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Revelar Passo ({revealedCount}/{activeQuestion.steps.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRevealedCount(activeQuestion.steps.length)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--card-border)',
                    cursor: 'pointer'
                  }}
                >
                  Mostrar Tudo
                </button>
              </div>
            )}
          </div>
          {studyMode && revealedCount === 0 ? (
            <div style={{ padding: '14px', borderRadius: '6px', background: 'var(--card-bg)', border: '1px dashed var(--card-border)', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Resolução ocultada no Modo Estudo. Tente resolver no papel e clique em <strong>Revelar Passo</strong> para conferir.
            </div>
          ) : (
            (studyMode ? activeQuestion.steps.slice(0, revealedCount) : activeQuestion.steps).map((st, idx) => (
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
            ))
          )}
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
              <SPlaneChart
                title="Plano s — Polos, Zeros e Lugar das Raízes (Malha Compensada)"
                plantExpr={activeQuestion.practicalData.plantExpr}
                controllerExpr={activeQuestion.practicalData.controllerExpr}
                zetaTarget={activeQuestion.number === 20 || activeQuestion.number === 21 ? 0.174 : 0.707}
              />
            </div>

            <div
              className="no-print"
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

        {/* Navegação Anterior / Próxima Questão */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--card-border)',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            disabled={!prevQuestion}
            onClick={() => prevQuestion && handleSelectQuestion(prevQuestion.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: 'var(--code-bg)',
              color: prevQuestion ? 'var(--text)' : 'var(--text-muted)',
              border: '1px solid var(--card-border)',
              cursor: prevQuestion ? 'pointer' : 'not-allowed',
              opacity: prevQuestion ? 1 : 0.5
            }}
          >
            ← {prevQuestion ? `Questão ${prevQuestion.number}` : 'Início da Lista'}
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Questão {activeIdx + 1} de {filteredQuestions.length}
          </span>
          <button
            type="button"
            disabled={!nextQuestion}
            onClick={() => nextQuestion && handleSelectQuestion(nextQuestion.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: nextQuestion ? 'var(--primary)' : 'var(--code-bg)',
              color: nextQuestion ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${nextQuestion ? 'var(--primary)' : 'var(--card-border)'}`,
              cursor: nextQuestion ? 'pointer' : 'not-allowed',
              opacity: nextQuestion ? 1 : 0.5
            }}
          >
            {nextQuestion ? `Questão ${nextQuestion.number}` : 'Fim da Lista'} →
          </button>
        </div>
      </section>
    </div>
  );
};
