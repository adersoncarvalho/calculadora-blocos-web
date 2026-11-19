'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MathView } from '@/components/MathView';
import { GlossaryTerm } from '@/components/GlossaryTooltipCard';
import { InteractiveTimeChart, ChartSeries } from '@/components/InteractiveTimeChart';
import { SPlaneChart } from '@/components/SPlaneChart';
import {
  ControllerCategoryId,
  CONTROLLERS_THEORY,
  CONTROLLER_EXERCISES,
  simulateControllerExercise,
  simulateClosedLoopWithSaturationRK4,
  ControllerExercise
} from './controllersData';
import { parseRatExpr } from '@/core/algebra/parser';
import { ControllerBlockDiagram } from './ControllerBlockDiagram';
import { OpAmpCircuitDiagram } from './OpAmpCircuitDiagram';
import { ListaP2View } from './ListaP2View';
import { FundamentosView } from './FundamentosView';
import { LugarRaizesView } from './LugarRaizesView';
import { PlantDesignerView } from './PlantDesignerView';
import { printElementAsPdf } from '@/utils/printMemorial';
import { useStudyChecklist } from '@/utils/studyChecklist';

interface ControllersSectionProps {
  onBack: () => void;
  onNavigate?: (view: 'builder' | 'guide' | 'practice' | 'simulations') => void;
}

const CATEGORY_ORDER: ControllerCategoryId[] = ['P', 'PD', 'PI', 'Lead', 'Lag'];

const PROSE_GLOSSARY_REGEX = /\b(Routh-Hurwitz|pré-filtro|amp-op|Kvel|Kpos|GBW|LGR|Lead|Lag|ess|PD|PI|Mp|tp|ts|sd|zc|pc|zi|Kc|Kp|Kd|Ki|Td|K0)\b/g;

function renderProseWithGlossary(text: string, prefix: string): React.ReactNode {
  const tokens = text.split(PROSE_GLOSSARY_REGEX);
  return tokens.map((tok, i) => {
    if (i % 2 === 1) {
      return (
        <GlossaryTerm key={`${prefix}-g-${i}`} termKey={tok}>
          {tok}
        </GlossaryTerm>
      );
    }
    return <React.Fragment key={`${prefix}-p-${i}`}>{tok}</React.Fragment>;
  });
}

/**
 * Renderiza texto em português contendo trechos inline delimitados por $...$ usando KaTeX (<MathView inline />)
 * e destaca siglas/símbolos com tooltip explicativo ao passar o mouse.
 */
function renderRichMathText(text: string): React.ReactNode {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <MathView key={`m-${idx}`} math={part.slice(1, -1)} inline />;
    }
    return <React.Fragment key={`t-${idx}`}>{renderProseWithGlossary(part, `t-${idx}`)}</React.Fragment>;
  });
}

/**
 * Quebra múltiplas equações separadas por ";" (\;;\;, \quad;\quad, \qquad;\qquad ou " ; ")
 * em linhas verticais distintas para leitura limpa, sem rolagem apertada.
 */
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
        <div key={`math-line-${i}`} className="stacked-math-line">
          <MathView math={line} block />
        </div>
      ))}
    </div>
  );
}

export const ControllersSection: React.FC<ControllersSectionProps> = ({ onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'controladores' | 'listas' | 'fundamentos' | 'lgr' | 'designer'>('controladores');
  const [selectedCategory, setSelectedCategory] = useState<ControllerCategoryId>('P');
  const [showDecisionGuide, setShowDecisionGuide] = useState<boolean>(false);
  const [showTheory, setShowTheory] = useState<boolean>(false);
  const [showMethod, setShowMethod] = useState<boolean>(false);
  const [exerciseSubTab, setExerciseSubTab] = useState<'memorial' | 'graficos' | 'scilab'>('memorial');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [examMode, setExamMode] = useState<boolean>(false);
  const [revealedSteps, setRevealedSteps] = useState<number>(0);
  const [usePrefilter, setUsePrefilter] = useState<boolean>(false);
  const [useSaturation, setUseSaturation] = useState<boolean>(false);
  const [copiedScilab, setCopiedScilab] = useState<boolean>(false);
  const memorialRef = useRef<HTMLDivElement | null>(null);
  const { isDone, toggleItem, countDone } = useStudyChecklist();

  const exercisesForCategory = useMemo(
    () => CONTROLLER_EXERCISES.filter(e => e.controllerId === selectedCategory),
    [selectedCategory]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return CONTROLLER_EXERCISES.filter(ex => {
      const hay = [
        ex.title,
        ex.badge,
        ex.source,
        ex.controllerId,
        ex.statementLatex,
        ex.whyThisController,
        ex.diagnostics.systemType,
        ex.diagnostics.systemOrder,
        ...ex.detailedSteps.map(s => `${s.title} ${s.description}`)
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    CONTROLLER_EXERCISES[0].id
  );

  // Restaura aba, controlador e exercício da URL ao recarregar (Ctrl+F5)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'listas') {
      setActiveTab('listas');
    } else if (tabParam === 'fundamentos') {
      setActiveTab('fundamentos');
    } else if (tabParam === 'lgr') {
      setActiveTab('lgr');
    } else if (tabParam === 'designer') {
      setActiveTab('designer');
    }
    const ctrlParam = params.get('ctrl') as ControllerCategoryId | null;
    const exParam = params.get('ex');
    if (ctrlParam && CATEGORY_ORDER.includes(ctrlParam)) {
      setSelectedCategory(ctrlParam);
      if (exParam && CONTROLLER_EXERCISES.some(e => e.id === exParam && e.controllerId === ctrlParam)) {
        setSelectedExerciseId(exParam);
      } else {
        const firstEx = CONTROLLER_EXERCISES.find(e => e.controllerId === ctrlParam);
        if (firstEx) setSelectedExerciseId(firstEx.id);
      }
    } else if (exParam && CONTROLLER_EXERCISES.some(e => e.id === exParam)) {
      const found = CONTROLLER_EXERCISES.find(e => e.id === exParam)!;
      setSelectedCategory(found.controllerId);
      setSelectedExerciseId(found.id);
    }
  }, []);

  // Garante que o exercício selecionado pertença sempre à categoria atual
  const activeExercise: ControllerExercise = useMemo(() => {
    const found = exercisesForCategory.find(e => e.id === selectedExerciseId);
    return found || exercisesForCategory[0];
  }, [exercisesForCategory, selectedExerciseId]);

  const updateUrlParams = (cat: ControllerCategoryId, exId: string) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('view', 'controllers');
      params.set('ctrl', cat);
      params.set('ex', exId);
      window.history.replaceState(null, '', `/?${params.toString()}`);
    }
  };

  const handleSelectCategory = (cat: ControllerCategoryId) => {
    setSelectedCategory(cat);
    setUsePrefilter(false);
    setRevealedSteps(0);
    const firstEx = CONTROLLER_EXERCISES.find(e => e.controllerId === cat);
    if (firstEx) {
      setSelectedExerciseId(firstEx.id);
      updateUrlParams(cat, firstEx.id);
    }
  };

  const handleSelectExercise = (exId: string, catOverride?: ControllerCategoryId) => {
    const targetCat = catOverride ?? selectedCategory;
    if (catOverride) setSelectedCategory(catOverride);
    setSelectedExerciseId(exId);
    setUsePrefilter(false);
    setRevealedSteps(0);
    updateUrlParams(targetCat, exId);
  };

  const theory = CONTROLLERS_THEORY[selectedCategory];

  // Simulação RK4 em tempo real do exercício ativo
  const simulation = useMemo(() => {
    return simulateControllerExercise(activeExercise);
  }, [activeExercise]);

  // Simulação com Saturação Real (±10 V) + Anti-Windup quando ativada
  const saturatedSimulation = useMemo(() => {
    if (!useSaturation || !simulation || activeExercise.feedbackExpr) return null;
    try {
      const G = parseRatExpr(activeExercise.plantExpr);
      const Gc = parseRatExpr(activeExercise.controllerExpr);
      const a0 = activeExercise.inputParams.a0 || 0;
      const a1 = activeExercise.inputParams.a1 || 0;
      const a2 = activeExercise.inputParams.a2 || 0;
      const inputFn = (t: number) => a0 + a1 * t + a2 * t * t;
      return simulateClosedLoopWithSaturationRK4(
        G,
        Gc,
        inputFn,
        activeExercise.tMax,
        300,
        10,
        usePrefilter ? simulation.prefilterZc : null
      );
    } catch {
      return null;
    }
  }, [useSaturation, simulation, activeExercise, usePrefilter]);

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

    const {
      t,
      r,
      yUncomp,
      yComp,
      eUncomp,
      eComp,
      uComp,
      uPeak,
      prefilterZc,
      yCompPrefilter,
      eCompPrefilter,
      uCompPrefilter,
      overshootPrefilter,
      uPeakPrefilter,
      essUncomp,
      essComp,
      overshootUncomp,
      overshootComp
    } = simulation;

    const activeYComp = saturatedSimulation
      ? saturatedSimulation.y
      : usePrefilter && yCompPrefilter
      ? yCompPrefilter
      : yComp;
    const activeEComp = saturatedSimulation
      ? saturatedSimulation.e
      : usePrefilter && eCompPrefilter
      ? eCompPrefilter
      : eComp;
    const activeUComp = saturatedSimulation
      ? saturatedSimulation.u
      : usePrefilter && uCompPrefilter
      ? uCompPrefilter
      : uComp;
    const activeOvershoot = saturatedSimulation
      ? saturatedSimulation.overshoot
      : usePrefilter && overshootPrefilter !== null
      ? overshootPrefilter
      : overshootComp;
    const activeUPeak = saturatedSimulation
      ? Number(Math.max(...saturatedSimulation.u.map(v => Math.abs(v))).toFixed(2))
      : usePrefilter && uPeakPrefilter !== null
      ? uPeakPrefilter
      : uPeak;

    const isUncompUnstable = yUncomp.some(v => Math.abs(v) >= 1e5);
    const isCompUnstable = activeYComp.some(v => Math.abs(v) >= 1e5);

    const xMax = t[t.length - 1];

    const outputSeries: ChartSeries[] = [
      { id: 'ref', label: 'Referência r(t)', values: r, color: '#94a3b8', dashed: true, strokeWidth: 1.8 }
    ];
    if (!isUncompUnstable) {
      outputSeries.push({
        id: 'uncomp',
        label: 'Sem Controlador',
        values: yUncomp,
        color: '#dc2626',
        dashed: true,
        strokeWidth: 2
      });
    }
    if (!isCompUnstable) {
      outputSeries.push({
        id: 'comp',
        label: usePrefilter && yCompPrefilter ? 'Com Controlador + Pré-Filtro' : 'Com Controlador',
        values: activeYComp,
        color: '#0284c7',
        strokeWidth: 2.5,
        showLandmarks: true,
        landmarkMode: 'output'
      });
    }

    const errorSeries: ChartSeries[] = [];
    if (!isUncompUnstable) {
      errorSeries.push({
        id: 'e-uncomp',
        label: 'Erro Sem Controlador',
        values: eUncomp,
        color: '#dc2626',
        dashed: true,
        strokeWidth: 2
      });
    }
    if (!isCompUnstable) {
      errorSeries.push({
        id: 'e-comp',
        label: usePrefilter && eCompPrefilter ? 'Erro Com Pré-Filtro' : 'Erro Com Controlador',
        values: activeEComp,
        color: '#059669',
        strokeWidth: 2.5,
        showLandmarks: true,
        landmarkMode: 'error'
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {/* Barra de Controles de Simulação: Saturação Real (±10 V) + Pré-Filtro */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
            {prefilterZc !== null ? (
              <>
                <strong>🔧 Pré-Filtro:</strong>{' '}
                <MathView math={`F(s) = \\frac{${prefilterZc}}{s + ${prefilterZc}}`} inline />{' '}
                <span style={{ color: 'var(--text-muted)' }}>
                  {renderRichMathText('(cancela o zero do controlador em $Y(s)/R(s)$, reduzindo sobressinal e pico $u(0^+)$)')}
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>
                Ative a saturação real do amp-op (±10 V) com anti-windup automático para ver o efeito físico na saída.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!activeExercise.feedbackExpr && (
              <button
                type="button"
                onClick={() => setUseSaturation(p => !p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: useSaturation ? '#dc2626' : 'var(--code-bg)',
                  color: useSaturation ? '#fff' : 'var(--text)',
                  border: `1px solid ${useSaturation ? '#dc2626' : 'var(--card-border)'}`
                }}
              >
                {useSaturation ? '⚡ Saturação ±10 V Ativa' : '○ Simular Saturação (±10 V)'}
              </button>
            )}
            {prefilterZc !== null && (
              <button
                type="button"
                onClick={() => setUsePrefilter(p => !p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: usePrefilter ? 'var(--primary)' : 'var(--code-bg)',
                  color: usePrefilter ? '#fff' : 'var(--text)',
                  border: `1px solid ${usePrefilter ? 'var(--primary)' : 'var(--card-border)'}`
                }}
              >
                {usePrefilter ? '✓ Pré-Filtro Ativo' : '○ Ativar Pré-Filtro'}
              </button>
            )}
          </div>
        </div>

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

          {activeOvershoot !== null && (
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                SOBRESSINAL (%OS) {usePrefilter && yCompPrefilter ? 'C/ PRÉ-FILTRO' : 'COM CONTROLADOR'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                {activeOvershoot}%{' '}
                {overshootUncomp !== null && !isUncompUnstable && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    (sem: {overshootUncomp}%)
                  </span>
                )}
              </div>
            </div>
          )}

          {activeUPeak !== null && !isCompUnstable && (
            <div
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${activeUPeak <= 10 ? 'var(--success)' : 'var(--danger)'}`,
                borderRadius: '6px',
                padding: '0.65rem 0.85rem'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                PICO |u(t)| (REGRA DOS 10 V)
              </div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: activeUPeak <= 10 ? 'var(--success)' : 'var(--danger)',
                  marginTop: '2px'
                }}
              >
                {activeUPeak} V{' '}
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  {activeUPeak <= 10 ? '✓ OK' : '⚠️ Saturação!'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Gráficos SVG Interativos Lado a Lado */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '0.9rem'
          }}
        >
          <InteractiveTimeChart
            title="Resposta Temporal: Saída c(t) vs. Referência r(t)"
            xValues={t}
            series={outputSeries}
            inputType={activeExercise.inputType}
          />
          <InteractiveTimeChart
            title="Erro de Rastreamento: e(t) = r(t) − c(t)"
            xValues={t}
            series={errorSeries}
            inputType={activeExercise.inputType}
          />
        </div>

        {/* Esforço de Controle u(t) com Regra dos ±10 V */}
        {activeUComp && !isCompUnstable && (
          <InteractiveTimeChart
            title="Esforço de Controle u(t) — Verificação da Regra dos ±10 V"
            xValues={t}
            series={[
              {
                id: 'u-comp',
                label: usePrefilter && uCompPrefilter ? 'u(t) Com Pré-Filtro' : 'u(t) Com Controlador',
                values: activeUComp,
                color: '#a855f7',
                strokeWidth: 2.3
              }
            ]}
            inputType={activeExercise.inputType}
            height={210}
            referenceLines={[
              { y: 10, label: '+10 V (Limite)', color: '#ef4444' },
              { y: -10, label: '−10 V', color: '#ef4444' }
            ]}
          />
        )}

        {!activeExercise.feedbackExpr && (
          <SPlaneChart
            title="Plano s — Polos, Zeros e Lugar das Raízes (Original vs. Compensado)"
            plantExpr={activeExercise.plantExpr}
            controllerExpr={activeExercise.controllerExpr}
          />
        )}
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
              🎛️ Controladores de Sistemas de Controle (Controle Clássico)
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

      {/* Seletor de Abas: Fundamentos vs 5 Controladores vs Listas de Exercícios */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('fundamentos');
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              params.set('view', 'controllers');
              params.set('tab', 'fundamentos');
              window.history.replaceState(null, '', `/?${params.toString()}`);
            }
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'fundamentos' ? 'var(--primary)' : 'var(--card-bg)',
            color: activeTab === 'fundamentos' ? '#fff' : 'var(--text)',
            border: `1.5px solid ${activeTab === 'fundamentos' ? 'var(--primary)' : 'var(--card-border)'}`
          }}
        >
          📘 Fundamentos P, I, PI &amp; PD Prático (Aula 13)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('lgr');
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              params.set('view', 'controllers');
              params.set('tab', 'lgr');
              window.history.replaceState(null, '', `/?${params.toString()}`);
            }
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'lgr' ? 'var(--primary)' : 'var(--card-bg)',
            color: activeTab === 'lgr' ? '#fff' : 'var(--text)',
            border: `1.5px solid ${activeTab === 'lgr' ? 'var(--primary)' : 'var(--card-border)'}`
          }}
        >
          📈 Lugar das Raízes — LGR
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('controladores');
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              params.set('view', 'controllers');
              params.set('tab', 'controladores');
              window.history.replaceState(null, '', `/?${params.toString()}`);
            }
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'controladores' ? 'var(--primary)' : 'var(--card-bg)',
            color: activeTab === 'controladores' ? '#fff' : 'var(--text)',
            border: `1.5px solid ${activeTab === 'controladores' ? 'var(--primary)' : 'var(--card-border)'}`
          }}
        >
          🎛️ 5 Controladores &amp; Slides (P, PD, PI, Avanço, Atraso)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('listas');
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              params.set('view', 'controllers');
              params.set('tab', 'listas');
              window.history.replaceState(null, '', `/?${params.toString()}`);
            }
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'listas' ? 'var(--primary)' : 'var(--card-bg)',
            color: activeTab === 'listas' ? '#fff' : 'var(--text)',
            border: `1.5px solid ${activeTab === 'listas' ? 'var(--primary)' : 'var(--card-border)'}`
          }}
        >
          📝 Listas de Exercícios (Lista P2 Controle 1 — 23 Questões)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('designer');
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              params.set('view', 'controllers');
              params.set('tab', 'designer');
              window.history.replaceState(null, '', `/?${params.toString()}`);
            }
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'designer' ? '#059669' : 'var(--card-bg)',
            color: activeTab === 'designer' ? '#fff' : 'var(--text)',
            border: `1.5px solid ${activeTab === 'designer' ? '#059669' : 'var(--card-border)'}`
          }}
        >
          🧮 Projetar Planta Nova
        </button>
      </div>

      {activeTab === 'listas' ? (
        <ListaP2View />
      ) : activeTab === 'fundamentos' ? (
        <FundamentosView />
      ) : activeTab === 'lgr' ? (
        <LugarRaizesView />
      ) : activeTab === 'designer' ? (
        <PlantDesignerView />
      ) : (
        <>
      {/* BARRA COMPACTA DE BUSCA RÁPIDA + ATALHOS DE CONSULTA */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 Buscar em todos os controladores (ex.: cauda, bissetriz, Tipo 1, rampa, 3ª ordem, Slide 21)..."
              style={{
                width: '100%',
                padding: '8px 34px 8px 12px',
                borderRadius: '6px',
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text)',
                fontSize: '0.83rem'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowDecisionGuide(p => !p)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: showDecisionGuide ? 'var(--primary)' : 'var(--code-bg)',
                color: showDecisionGuide ? '#fff' : 'var(--text)',
                border: `1px solid ${showDecisionGuide ? 'var(--primary)' : 'var(--card-border)'}`
              }}
            >
              🧭 Guia de Decisão {showDecisionGuide ? '▲' : '▼'}
            </button>
            <button
              type="button"
              onClick={() => setShowTheory(p => !p)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: showTheory ? theory.badgeColor : 'var(--code-bg)',
                color: showTheory ? '#fff' : 'var(--text)',
                border: `1px solid ${showTheory ? theory.badgeColor : 'var(--card-border)'}`
              }}
            >
              📖 Teoria ({theory.shortName}) {showTheory ? '▲' : '▼'}
            </button>
            <button
              type="button"
              onClick={() => setShowMethod(p => !p)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: showMethod ? 'var(--primary)' : 'var(--code-bg)',
                color: showMethod ? '#fff' : 'var(--text)',
                border: `1px solid ${showMethod ? 'var(--primary)' : 'var(--card-border)'}`
              }}
            >
              📋 Procedimento ({theory.professorMethodSteps.length} passos) {showMethod ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Resultados da Busca Rápida */}
        {searchQuery.trim() !== '' && (
          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              {searchResults.length > 0
                ? `${searchResults.length} exercício(s) encontrado(s) — clique para abrir:`
                : 'Nenhum exercício encontrado para esta busca.'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {searchResults.map(ex => {
                const badgeColor = CONTROLLERS_THEORY[ex.controllerId].badgeColor;
                return (
                  <button
                    key={`sr-${ex.id}`}
                    type="button"
                    onClick={() => {
                      handleSelectExercise(ex.id, ex.controllerId);
                      setSearchQuery('');
                      setExerciseSubTab('memorial');
                    }}
                    style={{
                      padding: '6px 11px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: `1px solid ${badgeColor}`,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ color: badgeColor, fontWeight: 800, marginRight: '6px' }}>[{ex.controllerId}]</span>
                    {ex.title.split('—')[0].trim()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* GUIA TEÓRICO GERAL: COMO ESCOLHER O CONTROLADOR IDEAL */}
      <section
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          marginBottom: '20px',
          overflow: 'hidden'
        }}
      >
        <button
          type="button"
          onClick={() => setShowDecisionGuide(p => !p)}
          style={{
            width: '100%',
            padding: '14px 18px',
            background: 'none',
            border: 'none',
            borderBottom: showDecisionGuide ? '1px solid var(--card-border)' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Teoria Geral de Projeto (Controle Clássico)
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
              🧭 Como Escolher o Controlador Ideal? — Guia de Decisão Rápida
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            {showDecisionGuide ? '▲ Recolher Guia' : '▼ Expandir Guia'}
          </span>
        </button>

        {showDecisionGuide && (
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.55 }}>
              Todo projeto pelo <GlossaryTerm termKey="LGR">LGR</GlossaryTerm> começa calculando o polo desejado{' '}
              <MathView math="s_d = -\sigma_d + j\omega_d" inline /> e a deficiência angular{' '}
              <MathView math="\theta_{\text{def}} = -180^\circ - \angle L(s_d)" inline />:
            </p>

            {/* Fluxograma Rápido por θdef */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid rgba(5, 150, 105, 0.4)',
                  borderLeft: '4px solid #059669',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  lineHeight: 1.5
                }}
              >
                <div style={{ fontWeight: 800, color: '#34d399', marginBottom: '4px' }}>
                  Caso 1: <MathView math="\theta_{\text{def}} = 0^\circ" inline /> (<MathView math="s_d" inline /> já pertence ao LGR original)
                </div>
                <div>
                  • Erro já atende <MathView math="\implies" inline /> <strong>Controlador P</strong> (<MathView math="G_c = K" inline />)<br />
                  • Reduzir erro finito sem mudar Tipo <MathView math="\implies" inline /> <strong>Atraso (Lag)</strong><br />
                  • <strong>Zerar</strong> erro ao degrau (Tipo 0 <MathView math="\to" inline /> 1) <MathView math="\implies" inline /> <strong>PI</strong>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
                  borderLeft: '4px solid #7c3aed',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  lineHeight: 1.5
                }}
              >
                <div style={{ fontWeight: 800, color: '#a78bfa', marginBottom: '4px' }}>
                  Caso 2: <MathView math="\theta_{\text{def}} > 0^\circ" inline /> (<MathView math="s_d" inline /> fora do LGR — falta avanço de fase)
                </div>
                <div>
                  • Razão fixa <MathView math="r = N+1" inline /> (3º polo bem rápido) <MathView math="\implies" inline /> <strong>PD Real</strong><br />
                  • Minimizar <MathView math="K_c" inline /> (bissetriz) ou cancelar polo lento <MathView math="\implies" inline /> <strong>Avanço (Lead)</strong>
                </div>
              </div>
            </div>

            {/* Tabela Comparativa Completa de Decisão */}
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.78rem',
                  textAlign: 'left'
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--code-bg)', borderBottom: '2px solid var(--card-border)' }}>
                    <th style={{ padding: '8px 10px', color: 'var(--text)' }}>Controlador</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text)' }}>Condição em <MathView math="\theta_{\text{def}}" inline /></th>
                    <th style={{ padding: '8px 10px', color: 'var(--text)' }}>Altera Tipo?</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text)' }}>Efeito no LGR / Transitório</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text)' }}>Efeito no Erro em Regime</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text)' }}>Quando Escolher (Critério Prático)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#38bdf8' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectCategory('P')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Proporcional (P)
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <MathView math="G_c(s) = K" inline />
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}><MathView math="\theta_{\text{def}} = 0^\circ" inline /></td>
                    <td style={{ padding: '8px 10px' }}>Não</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Move os polos ao longo do LGR original da planta.</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Reduz erro finito ao aumentar <MathView math="K" inline />.</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      Quando <MathView math="s_d" inline /> já está no LGR e o erro com <MathView math="K_0" inline /> já atende às especificações.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--code-bg)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#34d399' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectCategory('PI')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        PI
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <MathView math="K_c\frac{s+z_i}{s}" inline />
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}><MathView math="\theta_{\text{def}} \approx 0^\circ" inline /> (perda <MathView math="\le 10^\circ" inline />)</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--success)' }}>Sim (+1)</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Mantém <MathView math="s_d" inline /> intacto usando dipolo (<MathView math="z_i \le |s_{\text{lenta}}|/1{,}1" inline />).</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}><strong>Zera</strong> o erro ao degrau (Tipo 0 <MathView math="\to" inline /> 1).</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      Planta Tipo 0 com transitório já bom em <MathView math="s_d" inline />, mas precisa <strong>zerar</strong> <MathView math="e_{ss}" inline /> ao degrau.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f87171' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectCategory('Lag')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Atraso (Lag)
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <MathView math="K_c\frac{s+z}{s+p}\;(p < z)" inline />
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}><MathView math="\theta_{\text{def}} \approx 0^\circ" inline /> (perda <MathView math="\le 10^\circ" inline />)</td>
                    <td style={{ padding: '8px 10px' }}>Não</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Mantém <MathView math="s_d" inline /> (dipolo e regra da cauda no Tipo 1).</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Multiplica <MathView math="K_{\text{pos}}" inline /> ou <MathView math="K_{\text{vel}}" inline /> por <MathView math="\beta = z/p" inline />.</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      Transitório já bom em <MathView math="s_d" inline /> com <MathView math="K_0" inline />, mas precisa <strong>reduzir</strong> erro finito sem mudar o Tipo.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--code-bg)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#fbbf24' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectCategory('PD')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        PD Real
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <MathView math="K_c\frac{s+z_c}{s+p_c}\;(r=N+1)" inline />
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}><MathView math="\theta_{\text{def}} > 0^\circ" inline /></td>
                    <td style={{ padding: '8px 10px' }}>Não</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Puxa o LGR p/ esquerda com 3º polo bem rápido (reduz <MathView math="t_s" inline /> e <MathView math="M_p" inline />).</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Melhora via <MathView math="K_p = K_c/r" inline /> (não muda o Tipo).</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      Falta avanço de fase e quer razão fixa (<MathView math="N=10 \implies r=11" inline />); usar pré-filtro <MathView math="F(s)" inline /> se precisar segurar <MathView math="M_p" inline /> e <MathView math="u(0^+)" inline />.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#a78bfa' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectCategory('Lead')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Avanço (Lead)
                      </button>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <MathView math="K_c\frac{s+z_c}{s+p_c}\;(z_c < p_c)" inline />
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}><MathView math="\theta_{\text{def}} > 0^\circ" inline /></td>
                    <td style={{ padding: '8px 10px' }}>Não</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Puxa o LGR p/ esquerda com ganho <MathView math="K_c" inline /> moderado.</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Melhora moderada via <MathView math="K_p = K_c/r" inline />.</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                      Falta avanço e quer escolher <MathView math="r" inline />: <strong>bissetriz</strong> (minimiza <MathView math="K_c" inline />) ou <strong>cancelamento</strong> (2ª ordem pura sem zeros).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dúvidas Clássicas de Prova */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '12px' }}>
              <div
                style={{
                  background: 'var(--code-bg)',
                  borderLeft: '4px solid #059669',
                  borderRadius: '6px',
                  padding: '10px 14px'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>
                  🤔 Dúvida Clássica: Escolho PI ou Atraso de Fase (Lag)?
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5 }}>
                  • Use <strong>PI</strong> se o objetivo for <strong>zerar completamente</strong> o erro ao degrau (ou tornar finito um erro que era infinito). O PI adiciona um polo na origem (s = 0), elevando o Tipo do sistema.<br />
                  • Use <strong>Atraso (Lag)</strong> se o erro já for finito (ex.: 33%) e você só precisar reduzi-lo (ex.: para ≤ 5%) <strong>sem mudar o Tipo</strong> e mantendo os polos dominantes sd intactos.
                </div>
              </div>

              <div
                style={{
                  background: 'var(--code-bg)',
                  borderLeft: '4px solid #7c3aed',
                  borderRadius: '6px',
                  padding: '10px 14px'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7c3aed', marginBottom: '4px' }}>
                  🤔 Dúvida Clássica: Escolho PD ou Avanço de Fase (Lead)?
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5 }}>
                  • Ambos melhoram o transitório fornecendo avanço de fase positivo.<br />
                  • Use <strong>PD</strong> quando o projeto aceita um zero puro ideal (ou PD Real com N fixo).<br />
                  • Use <strong>Avanço (Lead)</strong> quando precisar de flexibilidade na razão r = p/z (método da Bissetriz ou Cancelamento) para obter polos rápidos com <strong>menor ganho Kc</strong> e menor amplificação de ruído.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

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
                  {countDone(CONTROLLER_EXERCISES.filter(e => e.controllerId === catId).map(e => e.id))}/{count} feitos
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                {item.fullName}
              </div>
              <div style={{ marginTop: '6px', height: '4px', borderRadius: '999px', background: 'var(--card-border)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${count > 0 ? (countDone(CONTROLLER_EXERCISES.filter(e => e.controllerId === catId).map(e => e.id)) / count) * 100 : 0}%`,
                    background: item.badgeColor,
                    transition: 'width 0.2s ease'
                  }}
                />
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
                Metodologia de Aula (Controle Clássico)
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
                    padding: '12px 14px',
                    height: 'auto',
                    minHeight: 'fit-content'
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
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{renderRichMathText(st.title)}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.45 }}>
                    {renderRichMathText(st.description)}
                  </div>
                  <div style={{ padding: '4px 0', height: 'auto' }}>
                    {renderStackedMath(st.formulaLatex)}
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

            {/* Botões de seleção dos exercícios agrupados (Slides vs. Lista Adicional) */}
            {(() => {
              const slideExs = exercisesForCategory.filter(e => !e.badge.toLowerCase().includes('adicional'));
              const extraExs = exercisesForCategory.filter(e => e.badge.toLowerCase().includes('adicional'));
              const renderGroup = (label: string, list: ControllerExercise[]) =>
                list.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>
                      {label} ({list.length})
                    </div>
                    <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                      {list.map(ex => {
                        const isAct = ex.id === activeExercise.id;
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => handleSelectExercise(ex.id)}
                            style={{
                              padding: '6px 11px',
                              borderRadius: '6px',
                              fontSize: '0.77rem',
                              fontWeight: isAct ? 700 : 500,
                              background: isAct ? theory.badgeColor : 'var(--code-bg)',
                              color: isAct ? '#fff' : 'var(--text)',
                              border: `1px solid ${isAct ? theory.badgeColor : 'var(--card-border)'}`,
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontSize: '0.66rem', opacity: isAct ? 0.9 : 0.7 }}>
                              {isDone(ex.id) ? '✓ ' : ''}{ex.badge}
                            </div>
                            <div>{ex.title.split('—')[0].trim()}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              return (
                <>
                  {renderGroup('Slides do Professor & Propostos', slideExs)}
                  {renderGroup('Lista Adicional', extraExs)}
                </>
              );
            })()}
          </div>

          {/* Barra de Sub-abas do Exercício (Memorial | Gráficos & LGR | Scilab) + Ações */}
          <div
            style={{
              borderTop: '1px solid var(--card-border)',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  ['memorial', '📝 Memorial de Cálculo'],
                  ['graficos', '📈 Gráficos & LGR'],
                  ['scilab', '💻 Código Scilab']
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setExerciseSubTab(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: exerciseSubTab === key ? theory.badgeColor : 'var(--code-bg)',
                    color: exerciseSubTab === key ? '#fff' : 'var(--text)',
                    border: `1px solid ${exerciseSubTab === key ? theory.badgeColor : 'var(--card-border)'}`
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {exerciseSubTab === 'memorial' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setExamMode(prev => {
                      const next = !prev;
                      setRevealedSteps(0);
                      return next;
                    });
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: examMode ? '#d97706' : 'var(--code-bg)',
                    color: examMode ? '#fff' : 'var(--text)',
                    border: `1px solid ${examMode ? '#d97706' : 'var(--card-border)'}`
                  }}
                >
                  {examMode ? '🎯 Modo Treino Ativo (Oculto)' : '🎯 Modo Treino de Prova'}
                </button>
                <button
                  type="button"
                  onClick={() => printElementAsPdf(memorialRef.current, activeExercise.title)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: 'var(--code-bg)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)'
                  }}
                >
                  🖨️ Salvar PDF
                </button>
              </div>
            )}
          </div>

          {/* Detalhes Completos do Exercício Selecionado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cabeçalho sempre visível + Checklist de Revisão */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {activeExercise.source} • Entrada: <MathView math={activeExercise.inputParams.labelLatex} inline />
                </div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', color: 'var(--primary)' }}>
                  {activeExercise.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => toggleItem(activeExercise.id)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isDone(activeExercise.id) ? 'rgba(5, 150, 105, 0.16)' : 'var(--code-bg)',
                  color: isDone(activeExercise.id) ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${isDone(activeExercise.id) ? 'var(--success)' : 'var(--card-border)'}`
                }}
              >
                {isDone(activeExercise.id) ? '✓ Refiz no papel' : '○ Marcar como estudado'}
              </button>
            </div>

            {exerciseSubTab === 'memorial' && (
              <div ref={memorialRef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Enunciado */}
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

                {/* Diagrama de Blocos Referente ao Enunciado */}
                <ControllerBlockDiagram
                  title={
                    activeExercise.controllerId === 'P'
                      ? 'Diagrama de Blocos do Enunciado (Planta com Controlador K a Projetar)'
                      : 'Diagrama de Blocos do Enunciado (Planta com Controlador Gc(s) a Projetar)'
                  }
                  showControllerBlock={true}
                  controllerLabel={activeExercise.initialControllerLabel ?? 'Controlador'}
                  controllerLatex={
                    activeExercise.initialControllerLatex ?? (activeExercise.controllerId === 'P' ? 'K' : 'G_c(s)')
                  }
                  plantLatex={activeExercise.plantLatex}
                  plantExpr={activeExercise.plantExpr}
                  feedbackLatex={activeExercise.feedbackLatex}
                />

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
                    {renderRichMathText(activeExercise.whyThisController)}
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

                {/* Diagrama de Blocos Final com Controlador Projetado */}
                {(!examMode || revealedSteps >= activeExercise.detailedSteps.length) && (
                  <ControllerBlockDiagram
                    title="Diagrama de Blocos Final (Com o Controlador Projetado)"
                    showControllerBlock={true}
                    controllerLabel={activeExercise.controllerBlockLabel}
                    controllerLatex={activeExercise.controllerLatex}
                    plantLatex={activeExercise.plantLatex}
                    plantExpr={activeExercise.plantExpr}
                    controllerExpr={activeExercise.controllerExpr}
                    feedbackLatex={activeExercise.feedbackLatex}
                  />
                )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      Resolução Analítica Detalhada (Passo a Passo)
                    </div>
                    {examMode && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setRevealedSteps(p => Math.min(activeExercise.detailedSteps.length, p + 1))}
                          disabled={revealedSteps >= activeExercise.detailedSteps.length}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            cursor: revealedSteps >= activeExercise.detailedSteps.length ? 'not-allowed' : 'pointer',
                            opacity: revealedSteps >= activeExercise.detailedSteps.length ? 0.5 : 1
                          }}
                        >
                          👁️ Revelar Próximo Passo ({revealedSteps}/{activeExercise.detailedSteps.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevealedSteps(activeExercise.detailedSteps.length)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'var(--card-bg)',
                            color: 'var(--text)',
                            border: '1px solid var(--card-border)',
                            cursor: 'pointer'
                          }}
                        >
                          Revelar Tudo
                        </button>
                      </div>
                    )}
                  </div>

                  {activeExercise.detailedSteps.map((st, idx) => {
                    const isHidden = examMode && idx >= revealedSteps;
                    return (
                      <div
                        key={`ex-step-${idx}`}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          height: 'auto',
                          minHeight: 'fit-content'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', marginBottom: isHidden ? '0' : '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span>{renderRichMathText(st.title)}</span>
                          {isHidden && (
                            <button
                              type="button"
                              onClick={() => setRevealedSteps(idx + 1)}
                              style={{
                                padding: '3px 9px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'var(--code-bg)',
                                color: 'var(--primary)',
                                border: '1px solid var(--card-border)',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              Revelar
                            </button>
                          )}
                        </div>
                        {!isHidden && (
                          <>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.45 }}>
                              {renderRichMathText(st.description)}
                            </div>
                            <div style={{ padding: '4px 0', height: 'auto' }}>
                              {renderStackedMath(st.latex)}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Circuito Analógico com Amp-Op (SVG) */}
                {(!examMode || revealedSteps >= activeExercise.detailedSteps.length) && (
                  <OpAmpCircuitDiagram
                    controllerType={activeExercise.controllerId}
                    controllerExpr={activeExercise.controllerExpr}
                  />
                )}
              </div>
            )}

            {exerciseSubTab === 'graficos' && (
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
                  Simulação Temporal, Esforço u(t) (10 V) e Lugar das Raízes (LGR)
                </div>
                {renderSimulationCharts()}
              </div>
            )}

            {exerciseSubTab === 'scilab' && (
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
            )}
          </div>
        </section>
      </div>
        </>
      )}
    </section>
  );
};
