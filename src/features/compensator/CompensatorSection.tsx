'use client';

import React, { useState, useMemo } from 'react';
import { MathView } from '@/components/MathView';
import {
  CompensatorType,
  CompensatorInputs,
  calculateCompensator,
  PlantConfig
} from './compensatorEngine';
import { PhaseDeficiencySvg } from './PhaseDeficiencySvg';
import { StepSimulationSvg } from './StepSimulationSvg';
import { CompensatorBlockDiagramSvg } from './CompensatorBlockDiagramSvg';

interface CompensatorSectionProps {
  onBack: () => void;
}

const PRESETS = [
  {
    id: 'aula18',
    name: '📌 Aula 18 - PD Real EEL6005 (PO=4.32%, Tp=1.047s, N=10, 1/[s(s+3)])',
    type: 'lead' as CompensatorType,
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]' }
  },
  {
    id: 'exercicio_n8',
    name: '⚡ Exercício Proposto N=8 (PO=4.32%, Tp=1.047s, N=8, 1/[s(s+3)])',
    type: 'lead' as CompensatorType,
    Tp: 1.047,
    PO: 4.32,
    N: 8,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]' }
  },
  {
    id: 'exercicio_n12',
    name: '⚡ Exercício Proposto N=12 (PO=4.32%, Tp=1.047s, N=12, 1/[s(s+3)])',
    type: 'lead' as CompensatorType,
    Tp: 1.047,
    PO: 4.32,
    N: 12,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]' }
  },
  {
    id: 'planta_sd2',
    name: '🎯 Polo sd = -2 + j2 (PO=4.32%, Tp=1.57s, N=10, 1/[s(s+3)])',
    type: 'lead' as CompensatorType,
    Tp: 1.571,
    PO: 4.32,
    N: 10,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]' }
  },
  {
    id: 'atraso_fase',
    name: '⏳ Compensador por Atraso de Fase (Melhoria de Kv em 10×)',
    type: 'lag' as CompensatorType,
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    betaLag: 10,
    zLag: 0.05,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]' }
  },
  {
    id: 'avanco_atraso',
    name: '🚀 Compensador Avanço-Atraso (Lead-Lag / PID Real Completo)',
    type: 'lead-lag' as CompensatorType,
    Tp: 1.047,
    PO: 4.32,
    N: 10,
    betaLag: 10,
    zLag: 0.05,
    plant: { num: [1], den: [1, 3, 0], label: '1 / [s(s+3)]' }
  }
];

export const CompensatorSection: React.FC<CompensatorSectionProps> = ({ onBack }) => {
  // Estado das entradas
  const [compType, setCompType] = useState<CompensatorType>('lead');
  const [tpVal, setTpVal] = useState<number>(1.047);
  const [poVal, setPoVal] = useState<number>(4.32);
  const [nVal, setNVal] = useState<number>(10);
  const [plantLabel, setPlantLabel] = useState<string>('1 / [s(s+3)]');
  const [betaLagVal, setBetaLagVal] = useState<number>(10);
  const [zLagVal, setZLagVal] = useState<number>(0.05);

  const [showPreFilter, setShowPreFilter] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Selecionar preset
  const handleSelectPreset = (presetId: string) => {
    const p = PRESETS.find(item => item.id === presetId);
    if (!p) return;
    setCompType(p.type);
    setTpVal(p.Tp);
    setPoVal(p.PO);
    setNVal(p.N);
    setPlantLabel(p.plant.label);
    if (p.betaLag) setBetaLagVal(p.betaLag);
    if (p.zLag) setZLagVal(p.zLag);
  };

  // Monta objeto de entradas e calcula
  const currentInputs: CompensatorInputs = useMemo(() => {
    const plantConfig: PlantConfig = {
      num: [1],
      den: [1, 3, 0],
      label: plantLabel
    };

    return {
      type: compType,
      Tp: tpVal > 0 ? tpVal : 1.047,
      PO: poVal > 0 ? poVal : 4.32,
      N: nVal >= 1 ? nVal : 10,
      plant: plantConfig,
      betaLag: betaLagVal,
      zLag: zLagVal
    };
  }, [compType, tpVal, poVal, nVal, plantLabel, betaLagVal, zLagVal]);

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
              Método Analítico do Professor (EEL6005) • Avanço (PD Real), Atraso (Lag) e Avanço-Atraso (Lead-Lag)
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
            {copiedCode ? '✓ Script Scilab Copiado!' : '📋 Copiar Script Scilab (Aula 18)'}
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
                cursor: 'pointer'
              }}
              onChange={e => handleSelectPreset(e.target.value)}
              defaultValue="aula18"
            >
              {PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
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
              <option value="lead">1. Avanço de Fase (Lead / PD Real)</option>
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

          {/* 4. Fator N de Filtro */}
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

          {/* 5. Planta no Diagrama G(s) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
              Planta no Diagrama G(s):
            </label>
            <input
              type="text"
              value={plantLabel}
              onChange={e => setPlantLabel(e.target.value)}
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
        </div>

        {/* Campos extras se Atraso ou Lead-Lag */}
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

      {/* MEMORIAL ANALÍTICO DIDÁTICO PASSO A PASSO */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '18px' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Memorial de Cálculo Didático Completo
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

          {/* Gráfico SVG Fiel ao Quadro do Professor */}
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
                <br />
                Banda: <code>GBW/(1+Kc) = 5.28 kHz &gt;&gt; 10 Hz</code> (Margem 528×)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SIMULAÇÃO E GRÁFICOS NO FINAL */}
      <StepSimulationSvg simulation={result.simulation} Kc={result.Kc} />

      {/* BLOCO DE SCRIPT SCILAB EXECUTÁVEL */}
      <div style={{ marginTop: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '0.96rem', color: 'var(--text)' }}>
            💻 Script Scilab Executável (Compatível com Aula 18)
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
