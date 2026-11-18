'use client';

import React, { useState, useMemo } from 'react';
import { MathView } from '@/components/MathView';
import {
  CompensatorType,
  LeadCriterion,
  CompensatorInputs,
  calculateCompensator,
  PlantConfig,
  ComplexNumber
} from './compensatorEngine';
import { PhaseDeficiencySvg } from './PhaseDeficiencySvg';
import { StepSimulationSvg } from './StepSimulationSvg';
import { CompensatorBlockDiagramSvg } from './CompensatorBlockDiagramSvg';

interface CompensatorSectionProps {
  onBack: () => void;
}

interface PresetItem {
  id: string;
  name: string;
  type: CompensatorType;
  leadCriterion?: LeadCriterion;
  Tp: number;
  PO: number;
  N: number;
  forcedPhiDeg?: number;
  sdManual?: ComplexNumber;
  plant: PlantConfig;
  betaLag?: number;
  zLag?: number;
}

const PRESETS: PresetItem[] = [
  // --- AULA 20: COMPENSADOR POR AVANÇO DE FASE PELO LGR (BISSETRIZ & CANCELAMENTO) ---
  {
    id: 'aula20_bissetriz',
    name: '🌟 Aula 20 - Avanço Bissetriz: 1/[s(s+3)], sd = -3+j3 (q=√2, r=2, zc=3, pc=6, Kc=18, Kp=9)',
    type: 'lead',
    leadCriterion: 'bissetriz',
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },
  {
    id: 'aula20_cancelamento',
    name: '🌟 Aula 20 - Cancelamento de Polo Real: zc = 3, pc = 6, Kc = 18 (Malha 2ª Ordem Pura)',
    type: 'lead',
    leadCriterion: 'cancelamento',
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },
  {
    id: 'aula20_prop_sd2',
    name: '⚡ Aula 20 - Proposto Bissetriz sd = -2+j2: θdef=18.4°, r=1.31, zc=2.472, pc=3.24, Kc=7.2',
    type: 'lead',
    leadCriterion: 'bissetriz',
    Tp: 1.571,
    PO: 4.32,
    N: 10,
    sdManual: { re: -2.0, im: 2.0 },
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },

  // --- AULA 19: CONTROLADOR PI PARA ERRO NULO AO DEGRAU (Controle Clássico) ---
  {
    id: 'aula19_ex1',
    name: '📌 Aula 19 - Exemplo 1: G(s) = 1/[(s+1)(s+5)], sd = -3+j3, φ=10° (Ângulo limita: zi=0.899)',
    type: 'pi',
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    forcedPhiDeg: 10,
    plant: { num: [1], den: [1, 6, 5], label: '1 / [(s+1)(s+5)]', poles: [-1, -5] }
  },
  {
    id: 'aula19_ex2',
    name: '📌 Aula 19 - Exemplo 2: G(s) = (s+3)/[(s+0.5)(s+4)(s+6)], sd = -3.97+j3.98 (Dipolo limita: zi=0.4545)',
    type: 'pi',
    Tp: 0.789,
    PO: 4.32,
    N: 10,
    forcedPhiDeg: 10,
    sdManual: { re: -3.97, im: 3.98 },
    plant: { num: [1, 3], den: [1, 10.5, 29, 12], label: '(s+3) / [(s+0.5)(s+4)(s+6)]', poles: [-0.5, -4, -6], zeros: [-3] }
  },
  {
    id: 'aula19_prop_a',
    name: '⚡ Aula 19 - Exercício Proposto A: G(s) = 1/[(s+0.1)(s+10)], sd = -5.05+j5.05, φ=5° (zi=0.0909)',
    type: 'pi',
    Tp: 0.622,
    PO: 4.32,
    N: 10,
    forcedPhiDeg: 5,
    plant: { num: [1], den: [1, 10.1, 1], label: '1 / [(s+0.1)(s+10)]', poles: [-0.1, -10] }
  },
  {
    id: 'aula19_prop_b_10',
    name: '⚡ Aula 19 - Exercício Proposto B (φ=10°): G(s) = (s+6)/[(s+2)(s+4)(s+12)], sd = -5.57+j7.42',
    type: 'pi',
    Tp: 0.423,
    PO: 9.35,
    N: 10,
    forcedPhiDeg: 10,
    sdManual: { re: -5.57, im: 7.42 },
    plant: { num: [1, 6], den: [1, 18, 80, 96], label: '(s+6) / [(s+2)(s+4)(s+12)]', poles: [-2, -4, -12], zeros: [-6] }
  },
  {
    id: 'aula19_prop_b_5',
    name: '⚡ Aula 19 - Exercício Proposto B (φ=5°): G(s) = (s+6)/[(s+2)(s+4)(s+12)], sd = -5.57+j7.42 (zi=0.952)',
    type: 'pi',
    Tp: 0.423,
    PO: 9.35,
    N: 10,
    forcedPhiDeg: 5,
    sdManual: { re: -5.57, im: 7.42 },
    plant: { num: [1, 6], den: [1, 18, 80, 96], label: '(s+6) / [(s+2)(s+4)(s+12)]', poles: [-2, -4, -12], zeros: [-6] }
  },

  // --- AULA 18: COMPENSADOR POR AVANÇO DE FASE (PD REAL) ---
  {
    id: 'aula18',
    name: '📌 Aula 18 - PD Real Engenharia de Controle (PO=4.32%, Tp=1.047s, N=10, r=11, 1/[s(s+3)])',
    type: 'lead',
    leadCriterion: 'r_fixo',
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },
  {
    id: 'exercicio_n8',
    name: '⚡ Exercício Proposto N=8 (PO=4.32%, Tp=1.047s, N=8, r=9, 1/[s(s+3)])',
    type: 'lead',
    leadCriterion: 'r_fixo',
    Tp: 1.047,
    PO: 4.32,
    N: 8,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },
  {
    id: 'exercicio_n12',
    name: '⚡ Exercício Proposto N=12 (PO=4.32%, Tp=1.047s, N=12, r=13, 1/[s(s+3)])',
    type: 'lead',
    leadCriterion: 'r_fixo',
    Tp: 1.047,
    PO: 4.32,
    N: 12,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },
  {
    id: 'planta_sd2',
    name: '🎯 Polo sd = -2 + j2 (PO=4.32%, Tp=1.57s, N=10, 1/[s(s+3)])',
    type: 'lead',
    leadCriterion: 'r_fixo',
    Tp: 1.571,
    PO: 4.32,
    N: 10,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },
  {
    id: 'atraso_fase',
    name: '⏳ Compensador por Atraso de Fase (Melhoria de Kv em 10×)',
    type: 'lag',
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    betaLag: 10,
    zLag: 0.05,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  },
  {
    id: 'avanco_atraso',
    name: '🚀 Compensador Avanço-Atraso (Lead-Lag / PID Real Completo)',
    type: 'lead-lag',
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    betaLag: 10,
    zLag: 0.05,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]', poles: [0, -3] }
  }
];

export const CompensatorSection: React.FC<CompensatorSectionProps> = ({ onBack }) => {
  // Estado das entradas
  const [compType, setCompType] = useState<CompensatorType>('lead');
  const [leadCriterionVal, setLeadCriterionVal] = useState<LeadCriterion>('bissetriz');
  const [tpVal, setTpVal] = useState<number>(1.047);
  const [poVal, setPoVal] = useState<number>(4.32);
  const [nVal, setNVal] = useState<number>(10);
  const [currentPlant, setCurrentPlant] = useState<PlantConfig>({
    num: [1],
    den: [1, 3, 0],
    label: '1 / [s(s+3)]',
    poles: [0, -3]
  });
  const [betaLagVal, setBetaLagVal] = useState<number>(10);
  const [zLagVal, setZLagVal] = useState<number>(0.05);
  const [forcedPhiVal, setForcedPhiVal] = useState<number>(0); // 0 = auto
  const [sdManualVal, setSdManualVal] = useState<ComplexNumber | undefined>(undefined);
  const [r1Val, setR1Val] = useState<number>(47000); // 47 kΩ padrão

  const [showPreFilter, setShowPreFilter] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Selecionar preset
  const handleSelectPreset = (presetId: string) => {
    const p = PRESETS.find(item => item.id === presetId);
    if (!p) return;
    setCompType(p.type);
    if (p.leadCriterion) setLeadCriterionVal(p.leadCriterion);
    setTpVal(p.Tp);
    setPoVal(p.PO);
    setNVal(p.N);
    setCurrentPlant(p.plant);
    setForcedPhiVal(p.forcedPhiDeg || 0);
    setSdManualVal(p.sdManual);
    if (p.betaLag) setBetaLagVal(p.betaLag);
    if (p.zLag) setZLagVal(p.zLag);
  };

  // Monta objeto de entradas e calcula
  const currentInputs: CompensatorInputs = useMemo(() => {
    return {
      type: compType,
      leadCriterion: compType === 'lead' ? leadCriterionVal : undefined,
      Tp: tpVal > 0 ? tpVal : 1.047,
      PO: poVal > 0 ? poVal : 4.32,
      N: nVal >= 1 ? nVal : 10,
      plant: currentPlant,
      betaLag: betaLagVal,
      zLag: zLagVal,
      forcedPhiDeg: forcedPhiVal > 0 ? forcedPhiVal : undefined,
      sdManual: sdManualVal,
      R1: r1Val
    };
  }, [compType, leadCriterionVal, tpVal, poVal, nVal, currentPlant, betaLagVal, zLagVal, forcedPhiVal, sdManualVal, r1Val]);

  const result = useMemo(() => {
    return calculateCompensator(currentInputs);
  }, [currentInputs]);

  const handleCopyScilab = () => {
    navigator.clipboard.writeText(result.scilabScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <section style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Barra de Navegação Superior */}
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
          boxShadow: '0 4px 18px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ⬅ Voltar à Página Principal
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--primary)', fontWeight: 800 }}>
              🎛️ Projetista de Compensadores pelo Lugar das Raízes (LGR)
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Método Analítico Completo (Controle Clássico) • Avanço (PD Real - Aula 18), Controlador PI para Erro Nulo (Aula 19) e Avanço-Atraso
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCopyScilab}
            style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {copiedCode ? '✓ Script Scilab Copiado!' : `📋 Copiar Script Scilab (${compType === 'pi' ? 'Aula 19 PI' : 'Aula 18'})`}
          </button>
        </div>
      </div>

      {/* Painel de Configurações e Presets */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text)', fontWeight: 700 }}>
            ⚙️ Especificações e Seleção do Tipo de Controlador
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Carregar Estudo de Caso:</span>
            <select
              style={{
                background: 'var(--input-bg, #1E293B)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '0.84rem',
                cursor: 'pointer',
                maxWidth: '440px'
              }}
              onChange={e => handleSelectPreset(e.target.value)}
              defaultValue="aula20_bissetriz"
            >
              <optgroup label="🌟 AULA 20: AVANÇO DE FASE PELO LGR (BISSETRIZ & CANCELAMENTO)">
                <option value="aula20_bissetriz">Aula 20 - Avanço Bissetriz: 1/[s(s+3)], sd = -3+j3 (q=√2, r=2, Kc=18)</option>
                <option value="aula20_cancelamento">Aula 20 - Cancelamento de Polo: zc=3, pc=6, Kc=18 (2ª Ordem Pura)</option>
                <option value="aula20_prop_sd2">Aula 20 - Proposto Bissetriz sd = -2+j2: θdef=18.4°, r=1.31, Kc=7.2</option>
              </optgroup>
              <optgroup label="📌 AULA 19: CONTROLADOR PI PARA ERRO NULO AO DEGRAU">
                <option value="aula19_ex1">Aula 19 - Exemplo 1: G(s) = 1/[(s+1)(s+5)], sd = -3+j3, φ=10°</option>
                <option value="aula19_ex2">Aula 19 - Exemplo 2: G(s) = (s+3)/[(s+0.5)(s+4)(s+6)], sd = -3.97+j3.98 (Dipolo)</option>
                <option value="aula19_prop_a">Aula 19 - Proposto A: G(s) = 1/[(s+0.1)(s+10)], sd = -5.05+j5.05, φ=5°</option>
                <option value="aula19_prop_b_10">Aula 19 - Proposto B (φ=10°): G(s) = (s+6)/[(s+2)(s+4)(s+12)]</option>
                <option value="aula19_prop_b_5">Aula 19 - Proposto B (φ=5°): G(s) = (s+6)/[(s+2)(s+4)(s+12)]</option>
              </optgroup>
              <optgroup label="📌 AULA 18: COMPENSADOR AVANÇO DE FASE (PD REAL CLÁSSICO r=N+1)">
                <option value="aula18">Aula 18 - PD Real Padrão: 1/[s(s+3)], PO=4.32%, Tp=1.047s, N=10, r=11</option>
                <option value="exercicio_n8">Exercício Proposto N=8: 1/[s(s+3)], r=9</option>
                <option value="exercicio_n12">Exercício Proposto N=12: 1/[s(s+3)], r=13</option>
                <option value="planta_sd2">Polo sd = -2 + j2: 1/[s(s+3)], Tp=1.57s</option>
              </optgroup>
              <optgroup label="📌 OUTRAS TOPOLOGIAS LGR">
                <option value="atraso_fase">Compensador por Atraso de Fase (Melhoria Kv 10×)</option>
                <option value="avanco_atraso">Compensador Avanço-Atraso (Lead-Lag Completo)</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {/* 1. Tipo de Controlador (Select) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '5px' }}>
              Tipo de Controlador:
            </label>
            <select
              value={compType}
              onChange={e => setCompType(e.target.value as CompensatorType)}
              style={{
                width: '100%',
                background: 'var(--input-bg, #1E293B)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '0.88rem',
                fontWeight: 600
              }}
            >
              <option value="pi">📌 Controlador PI para Erro Nulo ao Degrau (Aula 19)</option>
              <option value="lead">1. Avanço de Fase (Lead / PD Real - Aula 18)</option>
              <option value="lag">2. Atraso de Fase (Lag / PI Real)</option>
              <option value="lead-lag">3. Avanço-Atraso (Lead-Lag / PID)</option>
            </select>
          </div>

          {/* 2. Tempo de Pico Tp */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
              Tempo de Pico (Tp em segundos):
            </label>
            <input
              type="number"
              step="0.001"
              value={tpVal}
              onChange={e => setTpVal(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                background: 'var(--input-bg, #1E293B)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* 3. Sobressinal Percentual PO% */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
              Sobressinal Percentual (PO%):
            </label>
            <input
              type="number"
              step="0.01"
              value={poVal}
              onChange={e => setPoVal(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                background: 'var(--input-bg, #1E293B)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* 4. Planta no Diagrama G(s) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
              Planta no Diagrama G(s):
            </label>
            <input
              type="text"
              value={currentPlant.label}
              onChange={e => setCurrentPlant(prev => ({ ...prev, label: e.target.value }))}
              style={{
                width: '100%',
                background: 'var(--input-bg, #1E293B)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* 5. Parâmetro Específico conforme Tipo */}
          {compType === 'lead' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '5px' }}>
                Critério de Avanço de Fase (Aulas 18 e 20):
              </label>
              <select
                value={leadCriterionVal}
                onChange={e => setLeadCriterionVal(e.target.value as LeadCriterion)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg, #1E293B)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <option value="bissetriz">🌟 Bissetriz do Ângulo (Menor r e Kc = 18 - Aula 20)</option>
                <option value="cancelamento">🌟 Cancelamento de Polo Real (zc = |p_planta| - Aula 20)</option>
                <option value="r_fixo">📌 Razão r = N + 1 Fixa (PD Real Clássico - Aula 18)</option>
              </select>
            </div>
          ) : compType === 'pi' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#10B981', marginBottom: '5px' }}>
                Orçamento de Ângulo φ:
              </label>
              <select
                value={forcedPhiVal}
                onChange={e => setForcedPhiVal(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  background: 'var(--input-bg, #1E293B)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <option value={0}>Automático (Critério Aula 19: 5° ou 10° via eP)</option>
                <option value={5}>Forçar φ = 5° (conservador)</option>
                <option value={10}>Forçar φ = 10° (máximo recomendado)</option>
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
                Fator de Filtro N (faixa 8 a 12):
              </label>
              <input
                type="number"
                value={nVal}
                onChange={e => setNVal(parseInt(e.target.value, 10) || 10)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg, #1E293B)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          )}
        </div>

        {/* Parâmetros Extras se Lead, PI ou Atraso */}
        {compType === 'lead' && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--card-border)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {leadCriterionVal === 'r_fixo' ? (
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700 }}>
                  Fator de Filtro N (Razão r = N + 1 = {nVal + 1}):
                </label>
                <input
                  type="number"
                  value={nVal}
                  onChange={e => setNVal(parseInt(e.target.value, 10) || 10)}
                  style={{
                    width: '100%',
                    background: 'var(--input-bg, #1E293B)',
                    color: 'var(--text)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.84rem'
                  }}
                />
              </div>
            ) : leadCriterionVal === 'bissetriz' ? (
              <div style={{ flex: 1, minWidth: '260px' }}>
                <span style={{ fontSize: '0.82rem', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '8px 14px', borderRadius: '8px', display: 'block', border: '1px solid rgba(16,185,129,0.3)', lineHeight: '1.5' }}>
                  📐 <b>Critério da Bissetriz (Aula 20):</b> A razão <code>r = q² = {result.r.toFixed(3)}</code> minimiza o ganho de alta frequência <code>Kc = {result.Kc.toFixed(2)}</code> (10,5× menor que PD Real) com <code>zc·pc = |sd|² = {(result.sd.re*result.sd.re + result.sd.im*result.sd.im).toFixed(2)}</code>.
                </span>
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: '260px' }}>
                <span style={{ fontSize: '0.82rem', color: '#38BDF8', background: 'rgba(56,189,248,0.1)', padding: '8px 14px', borderRadius: '8px', display: 'block', border: '1px solid rgba(56,189,248,0.3)', lineHeight: '1.5' }}>
                  🎯 <b>Cancelamento de Polo Real (Aula 20):</b> <code>zc = {result.zc.toFixed(3)}</code> cancela o polo da planta em malha aberta, gerando uma função de malha fechada de <b>2ª Ordem Pura</b> sem necessidade de pré-filtro!
                </span>
              </div>
            )}
            {sdManualVal && (
              <div style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#38BDF8', background: 'rgba(56,189,248,0.1)', padding: '6px 12px', borderRadius: '6px' }}>
                  🎯 Polo Desejado Definido no Exemplo: <b>sd = {sdManualVal.re} + j{sdManualVal.im}</b>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Parâmetros Extras se PI ou Atraso */}
        {compType === 'pi' && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--card-border)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#10B981', fontWeight: 700 }}>
                Resistor de Entrada R1 (para circuito analógico com Amp-Op):
              </label>
              <select
                value={r1Val}
                onChange={e => setR1Val(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  background: 'var(--input-bg, #1E293B)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.84rem'
                }}
              >
                <option value={47000}>47 kΩ (padrão comercial)</option>
                <option value={22000}>22 kΩ</option>
                <option value={10000}>10 kΩ</option>
                <option value={100000}>100 kΩ</option>
              </select>
            </div>
            {sdManualVal && (
              <div style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#38BDF8', background: 'rgba(56,189,248,0.1)', padding: '6px 12px', borderRadius: '6px' }}>
                  🎯 Polo Desejado Definido no Exemplo: <b>sd = {sdManualVal.re} + j{sdManualVal.im}</b>
                </span>
              </div>
            )}
          </div>
        )}

        {(compType === 'lag' || compType === 'lead-lag') && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--card-border)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#F97316', fontWeight: 700 }}>
                Fator de Melhoria de Erro β (Razão z_lag / p_lag):
              </label>
              <input
                type="number"
                value={betaLagVal}
                onChange={e => setBetaLagVal(parseFloat(e.target.value) || 10)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg, #1E293B)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.84rem'
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#F97316', fontWeight: 700 }}>
                Zero de Atraso z_lag (rad/s, próximo da origem):
              </label>
              <input
                type="number"
                step="0.01"
                value={zLagVal}
                onChange={e => setZLagVal(parseFloat(e.target.value) || 0.05)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg, #1E293B)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.84rem'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Diagrama de Blocos Interativo da Malha Fechada */}
      <CompensatorBlockDiagramSvg
        result={result}
        showPreFilter={showPreFilter}
        onTogglePreFilter={() => setShowPreFilter(prev => !prev)}
      />

      {/* ========================================================================= */}
      {/* MEMORIAL ANALÍTICO DIDÁTICO: AULA 19 (PI), AULA 20 (AVANÇO BISSETRIZ/CANCELAMENTO) OU AULA 18 (PD REAL) */}
      {/* ========================================================================= */}
      {result.type === 'pi' && result.piDetails ? (
        /* MEMORIAL ESPECÍFICO DA AULA 19 (CONTROLADOR PI PARA ERRO NULO) */
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
              Memorial Didático Oficial • Aula 19 (Controle Clássico)
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', color: 'var(--text)' }}>
              Projeto Completo de Controlador PI para Erro Nulo ao Degrau pelo LGR
            </h2>
          </div>

          {/* PASSO 0 • Triagem da Planta */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              0. PASSO 0 – Triagem da Planta no Domínio de Laplace
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              Verificação dos polos e zeros da planta e do tipo do sistema para atendimento ao requisito de erro nulo:
            </p>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`G(s) = ${result.inputs.plant.label}`} block />
              <div style={{ fontSize: '0.84rem', color: 'var(--text)', marginTop: '8px', lineHeight: '1.6' }}>
                • <b>Tipo do Sistema:</b> Planta Tipo 0 (sem polos puros na origem em malha aberta).
                <br />
                • <b>Necessidade do PI:</b> Com controle apenas proporcional (Ganho P puro), o erro em regime a uma entrada degrau é <code>e_P = 1 / (1 + K_a) &gt; 0</code> (erro finito não nulo).
                <br />
                • <b>Solução:</b> Introduzir um polo na origem <code>s = 0</code> no controlador (ação integral), convertendo a malha aberta em Tipo 1, garantindo <b>erro estacionário rigorosamente nulo ao degrau</b> (<code>e(∞) = 0</code>).
              </div>
            </div>
          </div>

          {/* PASSO 1 • Ganho K0 e Erro em Regime com "Só P" */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              1. PASSO 1 – Ganho do P Puro (K0) e Avaliação do Erro Estacionário (eP)
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              Pela condição de magnitude do LGR no polo desejado <code>sd = -{result.sigmaD.toFixed(2)} + j{result.sd.im.toFixed(2)}</code>:
            </p>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`K_0 = \\frac{1}{|G(s_d)|} = ${result.piDetails.K0.toFixed(2)}`} block />
              <MathView math={`K_a = K_0 \\cdot G(0) = ${result.piDetails.K0.toFixed(2)} \\cdot ${(result.piDetails.Ka / (result.piDetails.K0 || 1)).toFixed(3)} = ${result.piDetails.Ka.toFixed(2)}`} block />
              <MathView math={`e_P = \\frac{1}{1 + K_a} = \\frac{1}{1 + ${result.piDetails.Ka.toFixed(2)}} = ${(result.piDetails.eP * 100).toFixed(2)}\\%`} block />
              <div style={{ textAlign: 'center', marginTop: '6px', fontWeight: 700, color: '#38BDF8' }}>
                Erro com Só Ganho P: eP = {(result.piDetails.eP * 100).toFixed(2)}% ⟹ Necessidade imperativa de Ação Integral (PI)!
              </div>
            </div>
          </div>

          {/* PASSO 2 • Orçamento de Ângulo, Lei dos Senos e Dipolo */}
          <div style={{ marginBottom: '26px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#10B981', margin: '0 0 6px 0' }}>
              2. PASSO 2 – Orçamento Angular (φ), Geometria pela Lei dos Senos e Regra do Dipolo
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              O ângulo do polo integrador e do zero do PI devem ser posicionados de modo a introduzir defasagem máxima de <b>φ = {result.piDetails.phiBudgetDeg}°</b>:
            </p>

            {/* Gráfico SVG da Lei dos Senos e Dipolo */}
            <PhaseDeficiencySvg result={result} />

            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B', marginTop: '12px' }}>
              <MathView math={`\\beta = \\text{arctg}\\left(\\frac{\\omega_d}{\\sigma_d}\\right) = ${result.piDetails.betaDeg.toFixed(2)}^\\circ, \\quad \\phi = ${result.piDetails.phiBudgetDeg}^\\circ`} block />
              <MathView math={`z_{i,\\max} = \\frac{|s_d| \\sin \\phi}{\\sin(\\beta + \\phi)} = \\frac{${(Math.sqrt(result.sd.re*result.sd.re + result.sd.im*result.sd.im)).toFixed(3)} \\cdot \\sin(${result.piDetails.phiBudgetDeg}^\\circ)}{\\sin(${result.piDetails.betaDeg.toFixed(2)}^\\circ + ${result.piDetails.phiBudgetDeg}^\\circ)} = ${result.piDetails.zi_max.toFixed(4)} \\text{ rad/s}`} block />
              <MathView math={`z_{i,\\text{dipolo}} = \\frac{|s_{\\text{lenta}}|}{1,1} = \\frac{${result.piDetails.s_lenta.toFixed(3)}}{1,1} = ${result.piDetails.zi_dipolo.toFixed(4)} \\text{ rad/s}`} block />
              <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: 700, color: result.piDetails.limitingFactor === 'angulo' ? '#38BDF8' : '#F97316' }}>
                Zero Adotado: zi = min({result.piDetails.zi_max.toFixed(3)}, {result.piDetails.zi_dipolo.toFixed(3)}) = {result.piDetails.zi_lim.toFixed(4)} rad/s ({result.piDetails.limitingFactor === 'angulo' ? 'Limitado pelo Ângulo' : 'Limitado pelo Dipolo'})
              </div>
            </div>
          </div>

          {/* PASSO 3 • Recálculo do Ganho Kc e Função de Transferência do Controlador */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              3. PASSO 3 – Recálculo do Ganho Kc pela Condição de Módulo
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              Com a inclusão do polo em <code>s = 0</code> e do zero em <code>-zi = -{result.piDetails.zi_lim.toFixed(3)}</code>:
            </p>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`K_c = K_0 \\cdot \\frac{|s_d|}{|s_d + z_i|} = ${result.piDetails.K0.toFixed(2)} \\cdot \\frac{${(Math.sqrt(result.sd.re*result.sd.re + result.sd.im*result.sd.im)).toFixed(3)}}{${(Math.sqrt((result.sd.re + result.piDetails.zi_lim)*(result.sd.re + result.piDetails.zi_lim) + result.sd.im*result.sd.im)).toFixed(3)}} = ${result.Kc.toFixed(2)}`} block />
              <MathView math={`G_c(s) = K_c \\frac{s + z_i}{s} = ${result.Kc.toFixed(2)} \\frac{s + ${result.piDetails.zi_lim.toFixed(4)}}{s}`} block />
            </div>
          </div>

          {/* PASSO 4 • Malha Fechada e Tabela Comparativa */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              4. PASSO 4 – Polos de Malha Fechada e Tabela Comparativa de Desempenho
            </h3>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'center', marginTop: '4px' }}>
                <thead>
                  <tr style={{ background: '#1E293B', color: '#F8FAFC' }}>
                    <th style={{ padding: '8px', border: '1px solid #334155' }}>Parâmetro de Desempenho</th>
                    <th style={{ padding: '8px', border: '1px solid #334155', color: '#EF4444' }}>Só Ganho P (K0)</th>
                    <th style={{ padding: '8px', border: '1px solid #334155', color: '#10B981' }}>Com PI (Gc)</th>
                    <th style={{ padding: '8px', border: '1px solid #334155', color: '#A855F7' }}>Com PI + Pré-filtro F(s)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #334155', fontWeight: 600 }}>Erro Estacionário ao Degrau e(∞)</td>
                    <td style={{ padding: '8px', border: '1px solid #334155', color: '#EF4444' }}>{(result.piDetails.eP * 100).toFixed(1)}% (não nulo)</td>
                    <td style={{ padding: '8px', border: '1px solid #334155', color: '#10B981', fontWeight: 700 }}>0% (RIGOROSAMENTE NULO)</td>
                    <td style={{ padding: '8px', border: '1px solid #334155', color: '#A855F7', fontWeight: 700 }}>0% (RIGOROSAMENTE NULO)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #334155', fontWeight: 600 }}>Sobressinal Mp (%)</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPureP ? `${result.piDetails.simPureP.Mp.toFixed(1)}%` : `${result.inputs.PO}%`}</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPI ? `${result.piDetails.simPI.Mp.toFixed(1)}%` : 'Sobressinal aumentado pelo zero zi'}</td>
                    <td style={{ padding: '8px', border: '1px solid #334155', color: '#A855F7', fontWeight: 700 }}>{result.piDetails.simPI_F ? `${result.piDetails.simPI_F.Mp.toFixed(1)}%` : 'Reduzido a ~0%'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #334155', fontWeight: 600 }}>Tempo de Pico tp (s)</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPureP ? `${result.piDetails.simPureP.tp.toFixed(2)} s` : `${result.inputs.Tp} s`}</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPI ? `${result.piDetails.simPI.tp.toFixed(2)} s` : '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPI_F ? `${result.piDetails.simPI_F.tp.toFixed(2)} s` : '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #334155', fontWeight: 600 }}>Tempo de Acomodação ts (2%)</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPureP ? `${result.piDetails.simPureP.ts2pct.toFixed(2)} s` : '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPI ? `${result.piDetails.simPI.ts2pct.toFixed(2)} s` : '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #334155' }}>{result.piDetails.simPI_F ? `${result.piDetails.simPI_F.ts2pct.toFixed(2)} s` : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PASSO 5 • Dimensionamento Analógico com Amp-Op */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              5. PASSO 5 – Dimensionamento Analógico (Amp-Op, Regra dos 10 V e Zeners Anti-Windup)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#10B981', fontSize: '0.84rem' }}>Componentes Passivos</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.6' }}>
                  Arbitrado: <code>R1 = {(result.piDetails.R1 / 1e3).toFixed(1)} kΩ</code>
                  <br />
                  <code>R2 = Kc · R1 = {(result.piDetails.R2 / 1e3).toFixed(1)} kΩ</code>
                  <br />
                  <code>C = 1 / (zi · R2) = {(result.piDetails.C * 1e6).toFixed(2)} µF</code>
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.84rem' }}>Regra dos 10 V (Saturação)</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.6' }}>
                  Degrau máximo antes de saturar o Amp-Op em ±10 V:
                  <br />
                  <code>Δe ≤ 10 / Kc = 10 / {result.Kc.toFixed(2)} = {result.piDetails.deltaE_max.toFixed(3)} V</code>
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#FBBF24', fontSize: '0.84rem' }}>Proteção Anti-Windup</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.6' }}>
                  Dois diodos Zener em antiparalelo no laço de realimentação do capacitor C para impedir saturação profunda e atraso no restabelecimento do sinal de controle.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : result.type === 'lead' && (result.leadCriterion === 'bissetriz' || result.leadCriterion === 'cancelamento') ? (
        /* MEMORIAL ESPECÍFICO DA AULA 20 (AVANÇO DE FASE: BISSETRIZ & CANCELAMENTO) */
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>
                Memorial Didático Oficial • Aula 20 (Controle Clássico)
              </span>
              <span style={{ fontSize: '0.74rem', background: 'rgba(56,189,248,0.15)', color: '#38BDF8', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                {result.leadCriterion === 'bissetriz' ? '📐 Critério da Bissetriz (Menor r e Menor Kc)' : '🎯 Cancelamento de Polo Real (2ª Ordem Pura)'}
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', color: 'var(--text)' }}>
              Compensador por Avanço de Fase pelo LGR (Grau de Liberdade da Razão r)
            </h2>
          </div>

          {/* PASSO 0 • Grau de Liberdade de r */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              0. PASSO 0 – Desacoplamento da Razão r = pc / zc (Diferença Crucial da Aula 20)
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              Na <b>Aula 18 (PD Real)</b>, a razão era fixada compulsoriamente em <code>r = N + 1 = 11</code>, o que impunha um ganho de alta frequência muito elevado (<code>Kc = 188,5</code>), extrema amplificação de ruído e rápida saturação do atuador (<code>Δe ≤ 0,053 V</code>).
              <br />
              Na <b>Aula 20 (Avanço de Fase Genérico)</b>, a razão <code>r = pc / zc</code> torna-se um <b>grau de liberdade de projeto</b>:
            </p>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B', fontSize: '0.84rem', lineHeight: '1.6' }}>
              • <b>Critério da Bissetriz:</b> Posiciona a bissetriz do ângulo de avanço <code>ϕ</code> alinhada com a reta que une a origem ao polo desejado <code>sd</code>. Isso <b>minimiza rigorosamente a razão r</b> para a deficiência necessária (<code>r = q² = {result.r.toFixed(3)}</code>), reduzindo o ganho <code>Kc</code> para apenas <b>{result.Kc.toFixed(2)}</b> (redução de mais de 10 vezes!).
              <br />
              • <b>Cancelamento de Polo Real:</b> Escolhe <code>zc = |p_planta| = {result.zc.toFixed(3)}</code>, cancelando exatamente o polo em malha aberta e transformando a malha fechada em um sistema de <b>2ª Ordem Pura</b>!
            </div>
          </div>

          {/* PASSO 1 • Polo Desejado */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              1. PASSO 1 – Determinação do Polo Dominante Desejado (sd)
            </h3>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`\\zeta = \\frac{-\\ln(PO / 100)}{\\sqrt{\\pi^2 + \\ln^2(PO / 100)}} = ${result.zeta.toFixed(4)} \\approx ${result.zeta.toFixed(3)}`} block />
              <MathView math={`\\omega_n = \\frac{\\pi}{T_p \\sqrt{1 - \\zeta^2}} = ${result.wn.toFixed(3)} \\text{ rad/s}, \\quad \\sigma_d = \\zeta \\omega_n = ${result.sigmaD.toFixed(3)}, \\quad \\omega_d = ${result.wd.toFixed(3)} \\text{ rad/s}`} block />
              <div style={{ textAlign: 'center', marginTop: '6px', fontWeight: 700, color: '#38BDF8' }}>
                Polo Desejado: sd = -{result.sigmaD.toFixed(3)} ± j{result.wd.toFixed(3)} (|sd| = {(Math.sqrt(result.sigmaD*result.sigmaD + result.wd*result.wd)).toFixed(3)} rad/s)
              </div>
            </div>
          </div>

          {/* PASSO 2 • Deficiência Angular */}
          <div style={{ marginBottom: '26px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#EF4444', margin: '0 0 6px 0' }}>
              2. PASSO 2 – Deficiência Angular (θdef = {result.phiDef.toFixed(2)}°)
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              Condição de fase do LGR com a planta no ponto de teste <code>sd</code>:
            </p>
            <PhaseDeficiencySvg result={result} />
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B', marginTop: '12px' }}>
              <MathView math={`\\theta_{\\text{def}} = -180^\\circ - \\angle L(s_d) = ${result.phiDef.toFixed(2)}^\\circ`} block />
            </div>
          </div>

          {/* PASSO 3 • Dimensionamento Analítico */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#10B981', margin: '0 0 6px 0' }}>
              3. PASSO 3 – Dimensionamento Analítico Fechado ({result.leadCriterion === 'bissetriz' ? 'Critério da Bissetriz' : 'Cancelamento de Polo'})
            </h3>
            {result.leadCriterion === 'bissetriz' ? (
              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--text)', margin: '0 0 8px 0' }}>
                  Fórmula analítica exata fechada para o parâmetro geométrico <code>q</code> da bissetriz:
                </p>
                <MathView math={`q = \\frac{1 + \\frac{\\sqrt{1 - \\zeta^2}}{\\sin \\phi}}{\\zeta + \\frac{\\sqrt{1 - \\zeta^2}}{\\tan \\phi}} = \\frac{1 + \\frac{${(Math.sqrt(1 - result.zeta*result.zeta)).toFixed(4)}}{\\sin(${result.phiDef.toFixed(1)}^\\circ)}}{${result.zeta.toFixed(4)} + \\frac{${(Math.sqrt(1 - result.zeta*result.zeta)).toFixed(4)}}{\\tan(${result.phiDef.toFixed(1)}^\\circ)}} = ${result.qBissetriz?.toFixed(4)}`} block />
                <MathView math={`r = q^2 = (${result.qBissetriz?.toFixed(4)})^2 = ${result.r.toFixed(3)}`} block />
                <MathView math={`z_c = \\frac{|s_d|}{q} = \\frac{${(Math.sqrt(result.sigmaD*result.sigmaD + result.wd*result.wd)).toFixed(3)}}{${result.qBissetriz?.toFixed(4)}} = ${result.zc.toFixed(4)} \\text{ rad/s}`} block />
                <MathView math={`p_c = |s_d| \\cdot q = ${(Math.sqrt(result.sigmaD*result.sigmaD + result.wd*result.wd)).toFixed(3)} \\cdot ${result.qBissetriz?.toFixed(4)} = ${result.pc.toFixed(4)} \\text{ rad/s}`} block />
                <div style={{ textAlign: 'center', marginTop: '6px', fontWeight: 700, color: '#10B981' }}>
                  Propriedade da Bissetriz: zc · pc = |sd|² = {(result.zc * result.pc).toFixed(2)} = {(result.sigmaD*result.sigmaD + result.wd*result.wd).toFixed(2)}
                </div>
              </div>
            ) : (
              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--text)', margin: '0 0 8px 0' }}>
                  Cancelamento exato do polo real da planta em <code>s = -{result.zc.toFixed(3)}</code>:
                </p>
                <MathView math={`z_c = |p_{\\text{planta}}| = ${result.zc.toFixed(3)} \\text{ rad/s}`} block />
                <MathView math={`\\theta_p = \\angle(s_d + z_c) - \\theta_{\\text{def}} = ${result.theta1.toFixed(1)}^\\circ - ${result.phiDef.toFixed(1)}^\\circ = ${(result.theta1 - result.phiDef).toFixed(1)}^\\circ`} block />
                <MathView math={`p_c = \\sigma_d + \\frac{\\omega_d}{\\tan(\\theta_p)} = ${result.pc.toFixed(4)} \\text{ rad/s}, \\quad r = \\frac{p_c}{z_c} = ${result.r.toFixed(3)}`} block />
              </div>
            )}
          </div>

          {/* PASSO 4 • Ganho Kc */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              4. PASSO 4 – Ganho Kc pela Condição de Magnitude do LGR
            </h3>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`K_c = \\frac{1}{|L(s_d)|} \\cdot \\frac{|s_d + p_c|}{|s_d + z_c|} = \\frac{|s_d + ${result.pc.toFixed(3)}|}{|s_d + ${result.zc.toFixed(3)}|} \\cdot |s_d| \\cdot |s_d + 3| = ${result.Kc.toFixed(2)}`} block />
              <MathView math={`G_c(s) = ${result.Kc.toFixed(2)} \\frac{s + ${result.zc.toFixed(3)}}{s + ${result.pc.toFixed(3)}}, \\quad K_p = \\frac{K_c}{r} = \\frac{${result.Kc.toFixed(2)}}{${result.r.toFixed(3)}} = ${result.Kp.toFixed(2)}`} block />
              <div style={{ textAlign: 'center', marginTop: '6px', color: '#38BDF8', fontWeight: 700 }}>
                Ganho Kc = {result.Kc.toFixed(2)} (vs 188,5 da Aula 18 — redução de {(188.55 / result.Kc).toFixed(1)}× na amplificação de ruído!)
              </div>
            </div>
          </div>

          {/* PASSO 5 • Malha Fechada e 2ª Ordem Pura */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              5. PASSO 5 – Cancelamento Exato de Polo/Zero e Sistema de 2ª Ordem Pura
            </h3>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text)', margin: '0 0 8px 0', lineHeight: '1.6' }}>
                Com a planta <code>L(s) = 1/[s(s+3)]</code> e o compensador <code>Gc(s) = {result.Kc.toFixed(1)}(s+{result.zc.toFixed(1)})/(s+{result.pc.toFixed(1)})</code>:
              </p>
              <MathView math={`T(s) = \\frac{G_c(s) L(s)}{1 + G_c(s) L(s)} = \\frac{${result.Kc.toFixed(1)} (s + ${result.zc.toFixed(1)})}{(s + ${result.zc.toFixed(1)})(s^2 + ${(2*result.sigmaD).toFixed(1)}s + ${(result.sigmaD*result.sigmaD + result.wd*result.wd).toFixed(1)})} = \\frac{${result.Kc.toFixed(1)}}{s^2 + ${(2*result.sigmaD).toFixed(1)}s + ${(result.sigmaD*result.sigmaD + result.wd*result.wd).toFixed(1)}}`} block />
              <div style={{ textAlign: 'center', margin: '8px 0', color: '#10B981', fontWeight: 700, fontSize: '0.9rem' }}>
                ✨ O zero zc = {result.zc.toFixed(1)} cancela exatamente o polo rápido em -{result.zc.toFixed(1)}!
                <br />
                A malha fechada torna-se de 2ª Ordem Pura, tornando o pré-filtro F(s) totalmente dispensável!
              </div>
            </div>
          </div>

          {/* PASSO 6 • Tabela Comparativa dos 12 Parâmetros (Slide 10 e 14) */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              6. PASSO 6 – Tabela Comparativa de Desempenho (Aula 18 vs Aula 20)
            </h3>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#1E293B', color: '#F8FAFC' }}>
                    <th style={{ padding: '8px', border: '1px solid #334155' }}>Parâmetro de Projeto</th>
                    <th style={{ padding: '8px', border: '1px solid #334155', color: '#EF4444' }}>PD Real Clássico (N=10 - Aula 18)</th>
                    <th style={{ padding: '8px', border: '1px solid #334155', color: '#10B981' }}>Avanço Bissetriz (Aula 20)</th>
                    <th style={{ padding: '8px', border: '1px solid #334155', color: '#38BDF8' }}>Avanço Cancelamento (Aula 20)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>Razão r = pc / zc</td>
                    <td style={{ padding: '7px', border: '1px solid #334155' }}>11,00 (fixa)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#10B981', fontWeight: 700 }}>2,00 (mínima)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#38BDF8' }}>2,00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>Zero zc e Polo pc (rad/s)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155' }}>5,71 e 62,85</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#10B981' }}>3,00 e 6,00</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#38BDF8' }}>3,00 e 6,00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>Ganho Kc (alta frequência)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#EF4444' }}>188,55</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#10B981', fontWeight: 700 }}>18,00 (10,5× menor!)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#38BDF8', fontWeight: 700 }}>18,00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>Ganho DC Kp</td>
                    <td style={{ padding: '7px', border: '1px solid #334155' }}>17,14</td>
                    <td style={{ padding: '7px', border: '1px solid #334155' }}>9,00</td>
                    <td style={{ padding: '7px', border: '1px solid #334155' }}>9,00</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>3º Polo de Malha Fechada</td>
                    <td style={{ padding: '7px', border: '1px solid #334155' }}>-59,85</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#10B981', fontWeight: 700 }}>Cancelado em -3</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#38BDF8', fontWeight: 700 }}>Cancelado em -3</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>Sobressinal Mp (sem F)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#EF4444' }}>31,2% (zero distorce)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#10B981', fontWeight: 700 }}>4,32% (2ª ordem pura)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#38BDF8', fontWeight: 700 }}>4,32%</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>Necessidade de Pré-Filtro F(s)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#EF4444' }}>Obrigatório (F = 5.71/(s+5.71))</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#10B981', fontWeight: 700 }}>Dispensável!</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#38BDF8', fontWeight: 700 }}>Dispensável!</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '7px', border: '1px solid #334155', fontWeight: 600 }}>Degrau Máx. Sem Saturar (±10V)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#EF4444' }}>Δe ≤ 0,053 V (muito frágil)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#10B981', fontWeight: 700 }}>Δe ≤ 0,556 V (10,5× maior!)</td>
                    <td style={{ padding: '7px', border: '1px solid #334155', color: '#38BDF8' }}>Δe ≤ 0,556 V</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PASSO 7 • Implementação com Amp-Op */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              7. PASSO 7 – Dimensionamento de Componentes Analógicos com Amp-Op
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#10B981', fontSize: '0.84rem' }}>Componentes com C1 = 10 µF</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.6' }}>
                  <code>R1 = 1 / (zc · C1) = {(result.R1 / 1e3).toFixed(1)} kΩ</code>
                  <br />
                  <code>R2 = Kp · R1 = {(result.R2 / 1e3).toFixed(1)} kΩ</code>
                  <br />
                  <code>C2 = 1 / (pc · R2) = {(result.C2_circuit * 1e9).toFixed(1)} nF</code>
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#38BDF8', fontSize: '0.84rem' }}>Resposta Transitória Exata</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.6' }}>
                  Tempo de Pico: <code>tp = {result.inputs.Tp.toFixed(3)} s</code>
                  <br />
                  Sobressinal: <code>Mp = {result.inputs.PO.toFixed(2)}%</code>
                  <br />
                  Tempo de Acomodação (2%): <code>ts = 4 / σd = {(4 / result.sigmaD).toFixed(2)} s</code>
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.84rem' }}>Regra dos 10 V (Saturação)</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.6' }}>
                  Saturação em 10 V:
                  <br />
                  <code>Δe ≤ 10 / {result.Kc.toFixed(1)} = {(10 / result.Kc).toFixed(3)} V</code>
                  <br />
                  Faixa de operação linear <b>{(188.55 / result.Kc).toFixed(1)}× superior</b> ao PD Real clássico.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MEMORIAL DA AULA 18 (AVANÇO / ATRASO) */
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '18px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Memorial de Cálculo Didático Completo • Aula 18
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', color: 'var(--text)' }}>
              Passo a Passo da Metodologia do Lugar das Raízes (LGR)
            </h2>
          </div>

          {/* PASSO 1 */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              1. PASSO 1 – Determinação dos Polos Desejados (sd)
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              A partir das especificações de sobressinal percentual <b>PO = {result.inputs.PO}%</b> e tempo de pico <b>Tp = {result.inputs.Tp}s</b>:
            </p>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`\\zeta = \\frac{-\\ln(PO / 100)}{\\sqrt{\\pi^2 + \\ln^2(PO / 100)}} = ${result.zeta.toFixed(4)} \\approx ${result.zeta.toFixed(3)}`} block />
              <MathView math={`\\omega_n = \\frac{\\pi}{T_p \\sqrt{1 - \\zeta^2}} = \\frac{3.1416}{${result.inputs.Tp} \\cdot ${(Math.sqrt(1 - result.zeta * result.zeta)).toFixed(4)}} = ${result.wn.toFixed(3)} \\text{ rad/s}`} block />
              <MathView math={`\\omega_d = \\omega_n \\sqrt{1 - \\zeta^2} = ${result.wd.toFixed(2)} \\text{ rad/s}, \\quad \\sigma_d = \\zeta \\omega_n = ${result.sigmaD.toFixed(2)}`} block />
              <div style={{ textAlign: 'center', marginTop: '6px', fontWeight: 700, color: '#38BDF8' }}>
                Polo Dominante Desejado: sd = -{result.sigmaD.toFixed(1)} ± j{result.wd.toFixed(1)}
              </div>
            </div>
          </div>

          {/* PASSO 2 • DESTAQUE ESPECIAL DO QUADRO DO PROFESSOR */}
          <div style={{ marginBottom: '26px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#EF4444', margin: '0 0 6px 0' }}>
              2. PASSO 2 – Deficiência de Fase do Sistema (Gráfico Idêntico ao do Professor)
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              O professor analisa os vetores que partem dos polos da planta (origem <code>p1 = 0</code> e <code>p2 = -3</code>) até o polo de teste desejado <code>sd = -3 + j3</code> no plano complexo:
            </p>

            <PhaseDeficiencySvg result={result} />
          </div>

          {/* PASSO 3 */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              3. PASSO 3 – Determinação de zc e pc (Polinômio em zc)
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              Com o parâmetro de filtro <code>N = {result.inputs.N}</code>, define-se a razão <code>r = N + 1 = {result.r}</code>. O ângulo por estágio é <code>ϕ = {result.phiPerStage.toFixed(1)}°</code> (m = {result.mStages} estágio, com limite de avanço máximo ϕmax = {result.phiMax.toFixed(1)}°):
            </p>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`C_2 = r = ${result.C2}, \\quad C_1 = -[\\sigma_d(r + 1) + \\omega_d(r - 1)\\cot \\phi] = ${result.C1_poly.toFixed(1)}, \\quad C_0 = \\sigma_d^2 + \\omega_d^2 = ${result.C0.toFixed(1)}`} block />
              <MathView math={`${result.C2} z_c^2 ${result.C1_poly.toFixed(1)} z_c + ${result.C0.toFixed(1)} = 0 \\implies z_c = \\frac{-C_1 \\pm \\sqrt{C_1^2 - 4 C_2 C_0}}{2 C_2}`} block />
              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                Raízes: <b>zc1 = {result.rootsZc[0]?.toFixed(4)}</b> (maior raiz) e <b>zc2 = {result.rootsZc[1]?.toFixed(4)}</b> (menor raiz).
              </div>
              <div style={{ textAlign: 'center', marginTop: '4px', fontWeight: 700, color: '#38BDF8' }}>
                Adota-se a maior raiz: zc = {result.zc.toFixed(4)} ⟹ pc = {result.r} · {result.zc.toFixed(4)} = {result.pc.toFixed(4)}
              </div>
            </div>
          </div>

          {/* PASSO 4 */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              4. PASSO 4 – Cálculo do Ganho Kc pela Condição de Módulo
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
              Aplicando a condição de magnitude do LGR |Gc(sd) · G(sd)| = 1:
            </p>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`K_c = \\frac{|s_d + p_c|}{|s_d + z_c|} \\cdot |s_d| \\cdot |s_d + 3| = \\left(\\frac{${result.magPole.toFixed(2)}}{${result.magZero.toFixed(2)}}\\right) \\cdot (${result.sd.im.toFixed(2)} \\cdot ${(Math.sqrt(18)).toFixed(2)}) \\approx ${result.Kc.toFixed(2)}`} block />
              <MathView math={`G_c(s) = ${result.Kc.toFixed(2)} \\frac{s + ${result.zc.toFixed(4)}}{s + ${result.pc.toFixed(4)}}`} block />
            </div>
          </div>

          {/* PASSO 5 & 6 */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              5. PASSO 5 & 6 – Polos de Malha Fechada e Equivalência Industrial (Kp, Td)
            </h3>
            <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
              <MathView math={`D_{MF}(s) = s^3 + ${(3 + result.pc).toFixed(2)} s^2 + ${(3*result.pc + result.Kc).toFixed(2)} s + ${(result.Kc * result.zc).toFixed(2)} = (s^2 + 6s + 18)(s + ${(result.pc - 3).toFixed(2)})`} block />
              <div style={{ textAlign: 'center', margin: '6px 0', color: '#10B981', fontWeight: 700 }}>
                Polos de Malha Fechada: -3 ± j3 (dominantes) e polo rápido em -{(result.pc - 3).toFixed(1)} (afastamento de {result.dominantRatio.toFixed(1)}×)
              </div>
              <MathView math={`K_p = \\frac{K_c}{N + 1} = \\frac{${result.Kc.toFixed(2)}}{${result.r}} \\approx ${result.Kp.toFixed(2)}, \\quad T_d = \\frac{N}{p_c} = \\frac{${result.inputs.N}}{${result.pc.toFixed(2)}} \\approx ${result.Td.toFixed(4)} \\text{ s}`} block />
              <MathView math={`G_{pd}(s) = ${result.Kp.toFixed(2)} \\left[ 1 + \\frac{${result.Td.toFixed(4)} s}{1 + ${(result.Td / result.inputs.N).toFixed(5)} s} \\right]`} block />
            </div>
          </div>

          {/* PASSO 7, 8 & 9 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--primary)', margin: '0 0 6px 0' }}>
              6. PASSOS 7, 8 & 9 – Pré-Filtro F(s), Regra dos 10 V e Componentes com Amp-Op
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#A855F7', fontSize: '0.84rem' }}>Pré-Filtro F(s)</div>
                <MathView math={`F(s) = \\frac{${result.zc.toFixed(3)}}{s + ${result.zc.toFixed(3)}}`} block />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Elimina o sobressinal adicional gerado pelo zero do compensador.
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.84rem' }}>Regra dos 10 V (Saturação)</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px' }}>
                  Sem pré-filtro: <code>Δe ≤ 10 / {result.Kc.toFixed(1)} = {result.deltaE_max_noFilter.toFixed(3)} V</code>
                  <br />
                  Com pré-filtro: <code>Δe ≤ 10 / 15.3 = {result.deltaE_max_withFilter.toFixed(2)} V</code> (faixa 12× maior)
                </div>
              </div>

              <div style={{ background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <div style={{ fontWeight: 700, color: '#10B981', fontSize: '0.84rem' }}>Componentes com Amp-Op (C1 = 10 µF)</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: '4px' }}>
                  <code>R1 = {(result.R1 / 1e3).toFixed(1)} kΩ</code> | <code>R2 = {(result.R2 / 1e3).toFixed(1)} kΩ</code>
                  <br />
                  <code>C2 = {(result.C2_circuit * 1e9).toFixed(1)} nF</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULAÇÃO E GRÁFICOS NO FINAL */}
      <StepSimulationSvg simulation={result.simulation} Kc={result.Kc} />

      {/* BLOCO DE SCRIPT SCILAB EXECUTÁVEL */}
      <div style={{ marginTop: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '0.96rem', color: 'var(--text)' }}>
            💻 Script Scilab Executável (Compatível com {compType === 'pi' ? 'Aula 19 - PI' : 'Aula 18 - PD Real'})
          </h4>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyScilab}
            style={{ fontSize: '0.78rem', padding: '4px 10px', cursor: 'pointer' }}
          >
            {copiedCode ? '✓ Copiado!' : 'Copiar Script'}
          </button>
        </div>
        <pre
          style={{
            background: '#0F172A',
            color: '#E2E8F0',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            overflowX: 'auto',
            maxHeight: '260px',
            border: '1px solid #1E293B'
          }}
        >
          {result.scilabScript}
        </pre>
      </div>
    </section>
  );
};
