'use client';

import React, { useState, useMemo } from 'react';
import { MathView } from '@/components/MathView';
import {
  StandardSignalType,
  CustomSignalDomain,
  SteadyStateInputConfig,
  analyzeSteadyStateAndError,
  SteadyStateComprehensiveReport
} from './steadyStateAnalysisEngine';
import { RatFunc } from '@/core/algebra/rational';

interface SteadyStateModuleViewProps {
  closedLoopTf: RatFunc;
  openLoopTfCandidate?: RatFunc | null;
  errorTfCandidate?: RatFunc | null;
  disturbancePair?: { tf: RatFunc; name: string } | null;
  noisePair?: { tf: RatFunc; name: string } | null;
  isInitialOpen?: boolean;
}

export const SteadyStateModuleView: React.FC<SteadyStateModuleViewProps> = ({
  closedLoopTf,
  openLoopTfCandidate,
  errorTfCandidate,
  disturbancePair,
  noisePair,
  isInitialOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(isInitialOpen);
  const [signalType, setSignalType] = useState<StandardSignalType>('step');
  const [amplitude, setAmplitude] = useState<number>(1);
  const [customExpr, setCustomExpr] = useState<string>('5*t^2');
  const [customDomain, setCustomDomain] = useState<CustomSignalDomain>('time');
  const [copiedType, setCopiedType] = useState<'latex' | 'scilab' | null>(null);

  // Computa o relatório de regime permanente reativamente sempre que as opções mudarem
  const report: SteadyStateComprehensiveReport = useMemo(() => {
    const config: SteadyStateInputConfig = {
      type: signalType,
      amplitude: amplitude || 1,
      customExpr,
      customDomain
    };
    return analyzeSteadyStateAndError(
      closedLoopTf,
      openLoopTfCandidate || null,
      errorTfCandidate || null,
      config,
      disturbancePair,
      noisePair
    );
  }, [
    closedLoopTf,
    openLoopTfCandidate,
    errorTfCandidate,
    signalType,
    amplitude,
    customExpr,
    customDomain,
    disturbancePair,
    noisePair
  ]);

  const copyToClipboard = (text: string, type: 'latex' | 'scilab') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 3000);
  };

  const downloadScilabScript = () => {
    const blob = new Blob([report.scilabSnippet], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analise_regime_permanente_scilab.sce';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLatexMemorial = () => {
    const lines: string[] = [];
    lines.push('% =========================================================================');
    lines.push('% ANÁLISE DE REGIME PERMANENTE E ERRO ESTACIONÁRIO (TVF)');
    lines.push('% =========================================================================');
    lines.push(`% Entrada: ${report.referenceTimeLatex} => ${report.referenceLaplaceLatex}`);
    lines.push(`% Tipo do Sistema: Tipo ${report.systemType ?? 'Indefinido'}`);
    lines.push(`% Constantes: Kp = ${report.kpLatex}, Kv = ${report.kvLatex}, Ka = ${report.kaLatex}`);
    lines.push('');
    report.didacticSteps.forEach(st => {
      lines.push(`% Etapa ${st.stepNumber}: ${st.title}`);
      lines.push(`$$${st.latex}$$`);
      if (st.notes) lines.push(`% Obs: ${st.notes}`);
      lines.push('');
    });
    lines.push('% Tabela Comparativa de Entradas:');
    report.comparisonTable.forEach(row => {
      lines.push(`% ${row.inputName} | ess = ${row.essLatex} | ${row.interpretation}`);
    });
    return lines.join('\n');
  };

  const getEssBadgeColor = (classification: string) => {
    switch (classification) {
      case 'zero':
        return 'var(--success)';
      case 'finite':
        return 'var(--primary)';
      case 'infinite':
      case 'unstable':
        return 'var(--danger)';
      default:
        return 'var(--text-muted)';
    }
  };

  return (
    <section
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px',
        flexShrink: 0,
        minHeight: 'fit-content',
        height: 'auto',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'visible',
        marginTop: '0.85rem'
      }}
    >
      {/* Cabeçalho do Módulo */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem',
          background: 'none',
          border: 'none',
          borderBottom: isOpen ? '1px solid var(--card-border)' : 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.22rem 0.55rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Módulo Especial
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>
              Análise de Regime Permanente e Erro Estacionário
            </div>
            <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Teorema do Valor Final (TVF), identificação do Tipo do Sistema, constantes Kp/Kv/Ka e entradas configuráveis
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '0.18rem 0.5rem',
              borderRadius: '4px',
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              color: getEssBadgeColor(report.essClassification)
            }}
          >
            {report.essLatex}
          </span>
          <span
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.18s ease'
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            boxSizing: 'border-box'
          }}
        >
          {/* Painel de Configuração da Entrada */}
          <div
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '0.95rem 1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div
              style={{
                fontSize: '0.79rem',
                fontWeight: 700,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px'
              }}
            >
              Configuração do Sinal de Entrada de Referência r(t) / R(s)
            </div>

            {/* Seleção do Tipo de Entrada */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSignalType('step')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: signalType === 'step' ? 700 : 500,
                  background: signalType === 'step' ? 'var(--primary)' : 'var(--card-bg)',
                  color: signalType === 'step' ? '#fff' : 'var(--text)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Degrau: r(t) = A · u(t)
              </button>
              <button
                type="button"
                onClick={() => setSignalType('ramp')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: signalType === 'ramp' ? 700 : 500,
                  background: signalType === 'ramp' ? 'var(--primary)' : 'var(--card-bg)',
                  color: signalType === 'ramp' ? '#fff' : 'var(--text)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Rampa: r(t) = A·t · u(t)
              </button>
              <button
                type="button"
                onClick={() => setSignalType('parabola')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: signalType === 'parabola' ? 700 : 500,
                  background: signalType === 'parabola' ? 'var(--primary)' : 'var(--card-bg)',
                  color: signalType === 'parabola' ? '#fff' : 'var(--text)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Parábola: r(t) = A·t² · u(t)
              </button>
              <button
                type="button"
                onClick={() => setSignalType('custom')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: signalType === 'custom' ? 700 : 500,
                  background: signalType === 'custom' ? 'var(--primary)' : 'var(--card-bg)',
                  color: signalType === 'custom' ? '#fff' : 'var(--text)',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Personalizada (Fase 2)
              </button>
            </div>

            {/* Linha de parâmetros: Amplitude e Personalizada */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                flexWrap: 'wrap',
                paddingTop: '0.2rem'
              }}
            >
              {/* Campo para Amplitude A */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label
                  htmlFor="amplitude-input"
                  style={{ fontSize: '0.79rem', fontWeight: 600, color: 'var(--text)' }}
                >
                  Amplitude (A):
                </label>
                <input
                  id="amplitude-input"
                  type="number"
                  step="any"
                  value={amplitude}
                  onChange={e => setAmplitude(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '80px',
                    padding: '0.35rem 0.55rem',
                    borderRadius: '4px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 5, 10].map(val => (
                    <button
                      key={`preset-a-${val}`}
                      type="button"
                      onClick={() => setAmplitude(val)}
                      style={{
                        padding: '0.2rem 0.45rem',
                        borderRadius: '3px',
                        fontSize: '0.71rem',
                        fontWeight: amplitude === val ? 700 : 500,
                        background: amplitude === val ? 'var(--primary)' : 'var(--card-bg)',
                        color: amplitude === val ? '#fff' : 'var(--text-muted)',
                        border: '1px solid var(--card-border)',
                        cursor: 'pointer'
                      }}
                    >
                      A={val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controles para Entrada Personalizada */}
              {signalType === 'custom' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    flexWrap: 'wrap',
                    background: 'var(--card-bg)',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '5px',
                    border: '1px solid var(--card-border)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      onClick={() => setCustomDomain('time')}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.73rem',
                        fontWeight: customDomain === 'time' ? 700 : 500,
                        background: customDomain === 'time' ? 'var(--primary)' : 'transparent',
                        color: customDomain === 'time' ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Domínio Temporal r(t)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDomain('laplace')}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.73rem',
                        fontWeight: customDomain === 'laplace' ? 700 : 500,
                        background: customDomain === 'laplace' ? 'var(--primary)' : 'transparent',
                        color: customDomain === 'laplace' ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Domínio Laplace R(s)
                    </button>
                  </div>

                  <input
                    type="text"
                    value={customExpr}
                    onChange={e => setCustomExpr(e.target.value)}
                    placeholder={customDomain === 'time' ? 'Ex: 5*t^2, 3*t + 2, 5*e^(-2t)' : 'Ex: 10/s^3, 2/(s+3)'}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '4px',
                      border: '1px solid var(--card-border)',
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      fontSize: '0.82rem',
                      fontFamily: '"JetBrains Mono", Consolas, monospace',
                      minWidth: '220px'
                    }}
                  />

                  {/* Chips de exemplos de aula */}
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {(customDomain === 'time'
                      ? ['5*t^2', '3*t + 2', '4*t^2 + 2*t', '5*e^(-2t)', '2*sin(3*t)']
                      : ['10/s^3', '2/s^2', '5/(s+2)', '6/(s^2+9)']
                    ).map(chip => (
                      <button
                        key={`chip-${chip}`}
                        type="button"
                        onClick={() => setCustomExpr(chip)}
                        style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.69rem',
                          background: 'var(--code-bg)',
                          border: '1px dashed var(--card-border)',
                          color: 'var(--primary)',
                          cursor: 'pointer'
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Exibição da Entrada Atual em LaTeX */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem',
                paddingTop: '0.35rem',
                borderTop: '1px dashed var(--card-border)',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Entrada Ativa no Tempo: <MathView math={report.referenceTimeLatex} inline />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Transformada de Laplace: <MathView math={report.referenceLaplaceLatex} inline />
              </div>
            </div>
          </div>

          {/* Cartões de Métricas Resumo */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {/* Tipo do Sistema */}
            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '0.75rem 0.95rem'
              }}
            >
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                TIPO DO SISTEMA
              </div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  marginTop: '0.2rem'
                }}
              >
                {report.systemType !== null ? `Tipo ${report.systemType}` : 'Indefinido'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {report.systemType === 0
                  ? 'Nenhum polo na origem'
                  : report.systemType === 1
                  ? '1 integrador puro na malha'
                  : `${report.systemType} integradores puros`}
              </div>
            </div>

            {/* Constantes de Erro Estático */}
            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '0.75rem 0.95rem'
              }}
            >
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                CONSTANTES DE ERRO
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginTop: '0.25rem',
                  color: 'var(--text)',
                  flexWrap: 'wrap'
                }}
              >
                <span>
                  <MathView math={`K_p = ${report.kpLatex}`} inline />
                </span>
                <span>•</span>
                <span>
                  <MathView math={`K_v = ${report.kvLatex}`} inline />
                </span>
                <span>•</span>
                <span>
                  <MathView math={`K_a = ${report.kaLatex}`} inline />
                </span>
              </div>
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Posição / Velocidade / Aceleração
              </div>
            </div>

            {/* Erro Estacionário Calculado */}
            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '0.75rem 0.95rem'
              }}
            >
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ERRO ESTACIONÁRIO (TVF)
              </div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: getEssBadgeColor(report.essClassification),
                  marginTop: '0.2rem'
                }}
              >
                <MathView math={report.essLatex} inline />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {report.essClassification === 'zero'
                  ? 'Rastreamento perfeito assintótico'
                  : report.essClassification === 'finite'
                  ? 'Acompanhamento com atraso finito'
                  : report.essClassification === 'infinite'
                  ? 'Divergência acumulativa no tempo'
                  : 'Condição não satisfeita'}
              </div>
            </div>

            {/* Validação de Estabilidade */}
            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '0.75rem 0.95rem'
              }}
            >
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                APLICABILIDADE DO TEOREMA
              </div>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: report.isTvfApplicable ? 'var(--success)' : 'var(--danger)',
                  marginTop: '0.35rem'
                }}
              >
                {report.isTvfApplicable ? '✓ TVF Válido (LHP)' : '✗ TVF Violado'}
              </div>
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {report.isTvfApplicable ? 'Polos estáveis em malha fechada' : 'Polos instáveis ou oscilatórios'}
              </div>
            </div>
          </div>

          {/* Etapas Matemáticas Didáticas Detalhadas (10 Etapas Conforme Enunciado) */}
          <div
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '1.05rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                borderBottom: '1px solid var(--card-border)',
                paddingBottom: '0.55rem'
              }}
            >
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Dedução Algébrica Passo a Passo (Metodologia Didática de Controle)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(getLatexMemorial(), 'latex')}
                style={{
                  padding: '0.28rem 0.65rem',
                  borderRadius: '4px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  color: copiedType === 'latex' ? 'var(--success)' : 'var(--primary)',
                  cursor: 'pointer'
                }}
              >
                {copiedType === 'latex' ? '✓ Memorial Copiado!' : 'Copiar Dedução em LaTeX'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {report.didacticSteps.map(step => (
                <div
                  key={`didactic-step-${step.stepNumber}`}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '5px',
                    padding: '0.75rem 0.95rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.35rem'
                    }}
                  >
                    <span
                      style={{
                        background: 'var(--code-bg)',
                        border: '1px solid var(--card-border)',
                        color: 'var(--primary)',
                        fontSize: '0.71rem',
                        fontWeight: 800,
                        padding: '0.12rem 0.45rem',
                        borderRadius: '3px'
                      }}
                    >
                      {step.stepNumber}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                      {step.title}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.77rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.45rem',
                      lineHeight: 1.45
                    }}
                  >
                    {step.description}
                  </div>

                  <div style={{ overflowX: 'auto', padding: '0.2rem 0' }}>
                    <MathView math={step.latex} />
                  </div>

                  {step.notes && (
                    <div
                      style={{
                        marginTop: '0.4rem',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        borderTop: '1px dashed var(--card-border)',
                        paddingTop: '0.35rem'
                      }}
                    >
                      {step.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tabela Comparativa de Entradas Padrão */}
          <div
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '1.05rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div
              style={{
                fontSize: '0.83rem',
                fontWeight: 700,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px'
              }}
            >
              Quadro Comparativo de Desempenho em Regime Permanente
            </div>
            <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>
              Comportamento do sistema perante os sinais de teste canônicos de controle (Degrau, Rampa e Parábola):
            </div>

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
                  <tr
                    style={{
                      background: 'var(--card-bg)',
                      borderBottom: '2px solid var(--card-border)'
                    }}
                  >
                    <th style={{ padding: '0.55rem 0.8rem', color: 'var(--text)' }}>Entrada</th>
                    <th style={{ padding: '0.55rem 0.8rem', color: 'var(--text)' }}>Transformada R(s)</th>
                    <th style={{ padding: '0.55rem 0.8rem', color: 'var(--text)' }}>Tipo do Sistema</th>
                    <th style={{ padding: '0.55rem 0.8rem', color: 'var(--text)' }}>Erro Estacionário (ess)</th>
                    <th style={{ padding: '0.55rem 0.8rem', color: 'var(--text)' }}>Interpretação Física</th>
                  </tr>
                </thead>
                <tbody>
                  {report.comparisonTable.map((row, idx) => (
                    <tr
                      key={`comp-row-${idx}`}
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        background: idx % 2 === 0 ? 'transparent' : 'var(--card-bg)'
                      }}
                    >
                      <td style={{ padding: '0.55rem 0.8rem', fontWeight: 600 }}>{row.inputName}</td>
                      <td style={{ padding: '0.55rem 0.8rem' }}>
                        <MathView math={row.inputLaplaceLatex} inline />
                      </td>
                      <td style={{ padding: '0.55rem 0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {row.systemTypeDesc}
                      </td>
                      <td
                        style={{
                          padding: '0.55rem 0.8rem',
                          fontWeight: 700,
                          color: getEssBadgeColor(row.status)
                        }}
                      >
                        <MathView math={row.essLatex} inline />
                      </td>
                      <td style={{ padding: '0.55rem 0.8rem', color: 'var(--text-muted)' }}>
                        {row.interpretation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análise de Perturbação D(s) e Ruído N(s) (Superposição) */}
          {(report.disturbanceAnalysis || report.noiseAnalysis) && (
            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '1.05rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.83rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px'
                }}
              >
                Análise Complementar de Perturbação e Ruído (Princípio da Superposição)
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '0.8rem'
                }}
              >
                {/* Perturbação D(s) */}
                {report.disturbanceAnalysis && (
                  <div
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '5px',
                      padding: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--danger)' }}>
                      Efeito da Perturbação D(s) na Saída
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>
                      Relação de Transferência: <MathView math={`\\frac{C(s)}{D(s)} = ${report.disturbanceAnalysis.transferFunctionLatex}`} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>
                      Erro devido à perturbação em degrau: <MathView math={report.disturbanceAnalysis.essLatex} inline />
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text)', fontStyle: 'italic', marginTop: '0.4rem' }}>
                      {report.disturbanceAnalysis.interpretation}
                    </div>
                  </div>
                )}

                {/* Ruído N(s) */}
                {report.noiseAnalysis && (
                  <div
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '5px',
                      padding: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>
                      Efeito do Ruído N(s) na Saída
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>
                      Relação de Transferência: <MathView math={`\\frac{C(s)}{N(s)} = ${report.noiseAnalysis.transferFunctionLatex}`} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>
                      Erro devido ao ruído em degrau: <MathView math={report.noiseAnalysis.essLatex} inline />
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text)', fontStyle: 'italic', marginTop: '0.4rem' }}>
                      {report.noiseAnalysis.interpretation}
                    </div>
                  </div>
                )}
              </div>

              {/* Erro Estacionário Total por Superposição */}
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '5px',
                  padding: '0.7rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                  Erro Estacionário Combinado (Superposição):
                </span>
                <MathView math={report.superpositionTotalEssLatex} inline />
              </div>
            </div>
          )}

          {/* Interpretação Didática de Engenharia */}
          <div
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '0.95rem 1.05rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)' }}>
              Interpretação de Engenharia e Princípios Didáticos
            </div>
            {report.pedagogicalInterpretation.map((text, idx) => (
              <div key={`ped-interp-${idx}`} style={{ fontSize: '0.77rem', color: 'var(--text)', lineHeight: 1.5 }}>
                • {text}
              </div>
            ))}
          </div>

          {/* Script Scilab Complementar */}
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
                padding: '0.6rem 0.95rem',
                borderBottom: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                  Script Complementar Scilab — Validação do Erro Estacionário
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  (simula r(t), c(t) e calcula numericamente e_ss)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(report.scilabSnippet, 'scilab')}
                  style={{
                    padding: '0.28rem 0.65rem',
                    borderRadius: '4px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: copiedType === 'scilab' ? 'var(--success)' : 'var(--primary)',
                    cursor: 'pointer'
                  }}
                >
                  {copiedType === 'scilab' ? '✓ Script Copiado!' : 'Copiar Scilab'}
                </button>
                <button
                  type="button"
                  onClick={downloadScilabScript}
                  style={{
                    padding: '0.28rem 0.65rem',
                    borderRadius: '4px',
                    fontSize: '0.73rem',
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
                padding: '0.85rem 1rem',
                fontSize: '0.77rem',
                lineHeight: 1.5,
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                color: 'var(--text)',
                overflowX: 'auto',
                maxHeight: '260px',
                overflowY: 'auto'
              }}
            >
              <code>{report.scilabSnippet}</code>
            </pre>
          </div>
        </div>
      )}
    </section>
  );
};
