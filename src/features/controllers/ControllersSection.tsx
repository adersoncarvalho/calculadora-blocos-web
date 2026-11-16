'use client';

import React, { useState, useMemo } from 'react';
import { MathView } from '@/components/MathView';
import {
  ControllerCategoryId,
  CONTROLLERS_THEORY,
  CONTROLLER_EXERCISES,
  simulateControllerExercise,
  ControllerExercise
} from './controllersData';
import { ControllerBlockDiagram } from './ControllerBlockDiagram';

interface ControllersSectionProps {
  onBack: () => void;
  onNavigate?: (view: 'builder' | 'guide' | 'practice' | 'simulations') => void;
}

const CATEGORY_ORDER: ControllerCategoryId[] = ['P', 'PD', 'PI', 'Lead', 'Lag'];

export const ControllersSection: React.FC<ControllersSectionProps> = ({ onBack, onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<ControllerCategoryId>('P');
  const [showTheory, setShowTheory] = useState<boolean>(true);
  const [showMethod, setShowMethod] = useState<boolean>(true);
  const [copiedScilab, setCopiedScilab] = useState<boolean>(false);

  const exercisesForCategory = useMemo(
    () => CONTROLLER_EXERCISES.filter(e => e.controllerId === selectedCategory),
    [selectedCategory]
  );

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    CONTROLLER_EXERCISES[0].id
  );

  // Garante que o exercício selecionado pertença sempre à categoria atual
  const activeExercise: ControllerExercise = useMemo(() => {
    const found = exercisesForCategory.find(e => e.id === selectedExerciseId);
    return found || exercisesForCategory[0];
  }, [exercisesForCategory, selectedExerciseId]);

  const handleSelectCategory = (cat: ControllerCategoryId) => {
    setSelectedCategory(cat);
    const firstEx = CONTROLLER_EXERCISES.find(e => e.controllerId === cat);
    if (firstEx) {
      setSelectedExerciseId(firstEx.id);
    }
  };

  const theory = CONTROLLERS_THEORY[selectedCategory];

  // Simulação RK4 em tempo real do exercício ativo
  const simulation = useMemo(() => {
    return simulateControllerExercise(activeExercise);
  }, [activeExercise]);

  const copyScilab = () => {
    navigator.clipboard.writeText(activeExercise.scilabCode);
    setCopiedScilab(true);
    setTimeout(() => setCopiedScilab(false), 2500);
  };

  const downloadScilab = () => {
    const blob = new Blob([activeExercise.scilabCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeExercise.id}.sce`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Renderizador de Gráfico SVG para Saída c(t) e Erro e(t)
  const renderSimulationCharts = () => {
    if (!simulation) {
      return (
        <div
          style={{
            padding: '1rem',
            background: 'var(--code-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            color: 'var(--text-muted)',
            fontSize: '0.82rem'
          }}
        >
          Simulação numérica indisponível para esta topologia específica.
        </div>
      );
    }

    const { t, r, yUncomp, yComp, eUncomp, eComp, essUncomp, essComp, overshootUncomp, overshootComp } =
      simulation;

    const isUncompUnstable = yUncomp.some(v => Math.abs(v) >= 1e5);
    const isCompUnstable = yComp.some(v => Math.abs(v) >= 1e5);

    const buildPath = (
      xs: number[],
      ys: number[],
      xMin: number,
      xMax: number,
      yMin: number,
      yMax: number,
      w: number,
      h: number,
      pad: number
    ) => {
      const spanX = Math.max(1e-6, xMax - xMin);
      const spanY = Math.max(1e-6, yMax - yMin);
      return xs
        .map((xv, i) => {
          const px = pad + ((xv - xMin) / spanX) * (w - 2 * pad);
          const py = h - pad - ((ys[i] - yMin) / spanY) * (h - 2 * pad);
          return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
        })
        .join(' ');
    };

    const w = 520;
    const h = 220;
    const pad = 36;
    const xMin = t[0];
    const xMax = t[t.length - 1];

    // Escala Y da saída (ignora valores explodidos se um dos ramos for instável)
    const validOutputVals = [
      ...r,
      ...(isCompUnstable ? [] : yComp),
      ...(isUncompUnstable ? [] : yUncomp)
    ];
    let yMinOut = Math.min(...validOutputVals, 0);
    let yMaxOut = Math.max(...validOutputVals, 1);
    const marginOut = Math.max(0.1, (yMaxOut - yMinOut) * 0.12);
    yMinOut -= marginOut;
    yMaxOut += marginOut;

    // Escala Y do erro
    const validErrVals = [
      0,
      ...(isCompUnstable ? [] : eComp),
      ...(isUncompUnstable ? [] : eUncomp)
    ];
    let yMinErr = Math.min(...validErrVals, 0);
    let yMaxErr = Math.max(...validErrVals, 0.2);
    const marginErr = Math.max(0.05, (yMaxErr - yMinErr) * 0.12);
    yMinErr -= marginErr;
    yMaxErr += marginErr;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {/* Alertas de estabilidade caso existam */}
        {isUncompUnstable && (
          <div
            style={{
              padding: '0.6rem 0.9rem',
              borderRadius: '6px',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
          >
            ⚠️ Nota da Simulação: Sem compensação (Gc = 1), a malha fechada é instável e sua curva diverge no tempo (omitida da escala para preservar a visualização).
          </div>
        )}

        {/* Métricas comparativas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '0.65rem'
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              ERRO EM t = {xMax}s (SEM CONTROLADOR)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
              {isUncompUnstable ? '∞ (Instável)' : essUncomp.toFixed(4)}
            </div>
          </div>

          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              ERRO EM t = {xMax}s (COM CONTROLADOR)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
              {isCompUnstable ? 'Instável' : essComp.toFixed(4)}
            </div>
          </div>

          {overshootComp !== null && (
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                SOBRESSINAL (%OS) COM CONTROLADOR
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                {overshootComp}%{' '}
                {overshootUncomp !== null && !isUncompUnstable && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    (sem: {overshootUncomp}%)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Gráficos SVG Lado a Lado */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '0.9rem'
          }}
        >
          {/* Gráfico 1: Resposta Temporal c(t) vs r(t) */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '0.75rem'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
              Resposta Temporal: Saída c(t) vs. Referência r(t)
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Grade e Eixos */}
              <rect x={pad} y={pad} width={w - 2 * pad} height={h - 2 * pad} fill="var(--code-bg)" stroke="var(--card-border)" />
              <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--text-muted)" strokeWidth="1" />
              <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--text-muted)" strokeWidth="1" />

              {/* Referência r(t) */}
              <path
                d={buildPath(t, r, xMin, xMax, yMinOut, yMaxOut, w, h, pad)}
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.8"
                strokeDasharray="5,4"
              />
              {/* Sem Controlador */}
              {!isUncompUnstable && (
                <path
                  d={buildPath(t, yUncomp, xMin, xMax, yMinOut, yMaxOut, w, h, pad)}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeDasharray="6,3"
                />
              )}
              {/* Com Controlador */}
              {!isCompUnstable && (
                <path
                  d={buildPath(t, yComp, xMin, xMax, yMinOut, yMaxOut, w, h, pad)}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                />
              )}

              {/* Rótulos de eixo */}
              <text x={w / 2} y={h - 8} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
                Tempo t (0 a {xMax}s)
              </text>
              <text x={pad - 4} y={pad + 8} fontSize="9.5" fill="var(--text-muted)" textAnchor="end">
                {yMaxOut.toFixed(1)}
              </text>
              <text x={pad - 4} y={h - pad} fontSize="9.5" fill="var(--text-muted)" textAnchor="end">
                {yMinOut.toFixed(1)}
              </text>
            </svg>
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.72rem', marginTop: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>--- Referência r(t)</span>
              {!isUncompUnstable && <span style={{ color: '#dc2626', fontWeight: 600 }}>--- Sem Controlador</span>}
              <span style={{ color: '#0284c7', fontWeight: 700 }}>━━ Com Controlador</span>
            </div>
          </div>

          {/* Gráfico 2: Evolução do Erro e(t) = r(t) - c(t) */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '0.75rem'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.35rem' }}>
              Erro de Rastreamento: e(t) = r(t) − c(t)
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              <rect x={pad} y={pad} width={w - 2 * pad} height={h - 2 * pad} fill="var(--code-bg)" stroke="var(--card-border)" />
              {/* Linha de erro zero */}
              <path
                d={buildPath(t, t.map(() => 0), xMin, xMax, yMinErr, yMaxErr, w, h, pad)}
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {!isUncompUnstable && (
                <path
                  d={buildPath(t, eUncomp, xMin, xMax, yMinErr, yMaxErr, w, h, pad)}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeDasharray="6,3"
                />
              )}
              {!isCompUnstable && (
                <path
                  d={buildPath(t, eComp, xMin, xMax, yMinErr, yMaxErr, w, h, pad)}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                />
              )}
              <text x={w / 2} y={h - 8} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
                Tempo t (0 a {xMax}s)
              </text>
              <text x={pad - 4} y={pad + 8} fontSize="9.5" fill="var(--text-muted)" textAnchor="end">
                {yMaxErr.toFixed(2)}
              </text>
              <text x={pad - 4} y={h - pad} fontSize="9.5" fill="var(--text-muted)" textAnchor="end">
                {yMinErr.toFixed(2)}
              </text>
            </svg>
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.72rem', marginTop: '0.35rem' }}>
              {!isUncompUnstable && <span style={{ color: '#dc2626', fontWeight: 600 }}>--- Erro Sem Controlador</span>}
              <span style={{ color: '#059669', fontWeight: 700 }}>━━ Erro Com Controlador</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Barra Superior */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '14px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: '8px 14px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ⬅ Voltar à Página Principal
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--primary)', fontWeight: 800 }}>
              🎛️ Controladores de Sistemas de Controle (EEL6005)
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Teoria, Roteiro Passo a Passo do Professor, Todos os Exercícios dos Slides/Propostos, Diagramas e Simulações
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            className="btn-open-guide btn-highlight-builder"
            onClick={() => onNavigate('builder')}
            style={{ fontSize: '0.82rem', cursor: 'pointer' }}
          >
            🛠️ Abrir Construtor Livre
          </button>
        )}
      </div>

      {/* Seletor dos 5 Controladores Principais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '22px'
        }}
      >
        {CATEGORY_ORDER.map(catId => {
          const item = CONTROLLERS_THEORY[catId];
          const count = CONTROLLER_EXERCISES.filter(e => e.controllerId === catId).length;
          const isSelected = selectedCategory === catId;

          return (
            <button
              key={`ctrl-cat-${catId}`}
              type="button"
              onClick={() => handleSelectCategory(catId)}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '8px',
                background: isSelected ? 'var(--card-bg)' : 'var(--code-bg)',
                border: `2px solid ${isSelected ? item.badgeColor : 'var(--card-border)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? `0 4px 14px ${item.badgeColor}28` : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span
                  style={{
                    background: item.badgeColor,
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {item.shortName}
                </span>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {count} {count === 1 ? 'exercício' : 'exercícios'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                {item.fullName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Área do Controlador Selecionado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* 1. PARTE TEÓRICA */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <button
            type="button"
            onClick={() => setShowTheory(p => !p)}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: 'none',
              border: 'none',
              borderBottom: showTheory ? '1px solid var(--card-border)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: theory.badgeColor, textTransform: 'uppercase' }}>
                Fundamentação Teórica
              </span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                {theory.fullName}
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>{showTheory ? '▲ Recolher' : '▼ Expandir'}</span>
          </button>

          {showTheory && (
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    FUNÇÃO DE TRANSFERÊNCIA CANÔNICA
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '1.05rem' }}>
                    <MathView math={theory.transferFunctionLatex} inline />
                  </div>
                </div>
                <p style={{ margin: 0, maxWidth: '640px', fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.5 }}>
                  {theory.summary}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                    ⚡ Efeito no Regime Transitório
                  </div>
                  <div style={{ fontSize: '0.81rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    {theory.transientEffect}
                  </div>
                </div>

                <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>
                    🎯 Efeito no Regime Permanente (Erro)
                  </div>
                  <div style={{ fontSize: '0.81rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    {theory.steadyStateEffect}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--code-bg)', borderLeft: `4px solid ${theory.badgeColor}`, borderRadius: '6px', padding: '12px 16px' }}>
                <div style={{ fontSize: '0.79rem', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  💡 Quando e Por que Escolher este Controlador?
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.81rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  {theory.whenToChoose.map((reason, idx) => (
                    <li key={`reason-${idx}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* 2. PASSO A PASSO PADRÃO DO PROFESSOR */}
        <section
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <button
            type="button"
            onClick={() => setShowMethod(p => !p)}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: 'none',
              border: 'none',
              borderBottom: showMethod ? '1px solid var(--card-border)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                Metodologia de Aula (EEL6005)
              </span>
              <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text)' }}>
                {theory.professorMethodTitle}
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>{showMethod ? '▲ Recolher' : '▼ Expandir'}</span>
          </button>

          {showMethod && (
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {theory.professorMethodSteps.map((st, idx) => (
                <div
                  key={`method-step-${idx}`}
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        background: theory.badgeColor,
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px'
                      }}
                    >
                      {st.step}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{st.title}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.45 }}>
                    {st.description}
                  </div>
                  <div style={{ overflowX: 'auto', padding: '4px 0' }}>
                    <MathView math={st.formulaLatex} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. SELETOR DE EXERCÍCIOS + RESOLUÇÃO DETALHADA + DIAGRAMA + SIMULAÇÃO */}
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
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Banco de Exercícios dos Slides & Propostos ({exercisesForCategory.length} disponíveis)
            </div>
            <h2 style={{ margin: '4px 0 12px 0', fontSize: '1.1rem', color: 'var(--text)' }}>
              Escolha o Exercício de {theory.fullName}
            </h2>

            {/* Botões de seleção dos exercícios */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {exercisesForCategory.map(ex => {
                const isAct = ex.id === activeExercise.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setSelectedExerciseId(ex.id)}
                    style={{
                      padding: '8px 13px',
                      borderRadius: '6px',
                      fontSize: '0.79rem',
                      fontWeight: isAct ? 700 : 500,
                      background: isAct ? theory.badgeColor : 'var(--code-bg)',
                      color: isAct ? '#fff' : 'var(--text)',
                      border: `1px solid ${isAct ? theory.badgeColor : 'var(--card-border)'}`,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', opacity: isAct ? 0.9 : 0.7 }}>{ex.badge}</div>
                    <div>{ex.title.split('—')[0].trim()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalhes Completos do Exercício Selecionado */}
          <div
            style={{
              borderTop: '1px solid var(--card-border)',
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Cabeçalho e Enunciado */}
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {activeExercise.source} • Entrada: <MathView math={activeExercise.inputParams.labelLatex} inline />
              </div>
              <h3 style={{ margin: '4px 0 10px 0', fontSize: '1.15rem', color: 'var(--primary)' }}>
                {activeExercise.title}
              </h3>
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  overflowX: 'auto'
                }}
              >
                <MathView math={activeExercise.statementLatex} />
              </div>
            </div>

            {/* Por que este controlador foi escolhido? */}
            <div
              style={{
                background: 'var(--code-bg)',
                borderLeft: `4px solid ${theory.badgeColor}`,
                borderRadius: '6px',
                padding: '12px 16px'
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: theory.badgeColor, marginBottom: '4px' }}>
                🧠 Por que escolhemos este controlador para este problema?
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.55 }}>
                {activeExercise.whyThisController}
              </div>
            </div>

            {/* Cards de Diagnóstico Rápido */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>TIPO DO SISTEMA</div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginTop: '3px' }}>
                  {activeExercise.diagnostics.systemType}
                </div>
              </div>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ORDEM DA PLANTA</div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginTop: '3px' }}>
                  {activeExercise.diagnostics.systemOrder}
                </div>
              </div>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ERRO SEM CONTROLADOR</div>
                <div style={{ marginTop: '3px', color: 'var(--danger)' }}>
                  <MathView math={activeExercise.diagnostics.initialErrorLatex} inline />
                </div>
              </div>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ERRO COM CONTROLADOR</div>
                <div style={{ marginTop: '3px', color: 'var(--success)' }}>
                  <MathView math={activeExercise.diagnostics.finalErrorLatex} inline />
                </div>
              </div>
            </div>

            {/* Diagrama de Blocos do Exercício */}
            <ControllerBlockDiagram
              controllerLabel={activeExercise.controllerBlockLabel}
              controllerLatex={activeExercise.controllerLatex}
              plantLatex={activeExercise.plantLatex}
              feedbackLatex={activeExercise.feedbackLatex}
            />

            {/* Resolução Passo a Passo Detalhada */}
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
                Resolução Analítica Detalhada (Passo a Passo)
              </div>
              {activeExercise.detailedSteps.map((st, idx) => (
                <div
                  key={`ex-step-${idx}`}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '10px 14px'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '3px' }}>
                    {st.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.45 }}>
                    {st.description}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <MathView math={st.latex} />
                  </div>
                </div>
              ))}
            </div>

            {/* Simulação Temporal Interativa */}
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
                Simulação Temporal no Navegador (Sem Controlador vs. Com Controlador)
              </div>
              {renderSimulationCharts()}
            </div>

            {/* Script Scilab */}
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
                  💻 Script Scilab (.sce) — {activeExercise.id}.sce
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={copyScilab}
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
                    onClick={downloadScilab}
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
                <code>{activeExercise.scilabCode}</code>
              </pre>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};
