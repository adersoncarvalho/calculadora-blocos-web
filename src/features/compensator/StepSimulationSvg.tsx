'use client';

import React, { useState } from 'react';
import { SimulationResult } from './compensatorEngine';

interface StepSimulationSvgProps {
  simulation: SimulationResult;
  Kc: number;
}

export const StepSimulationSvg: React.FC<StepSimulationSvgProps> = ({ simulation, Kc }) => {
  const [activeTab, setActiveTab] = useState<'step' | 'control'>('step');

  const width = 760;
  const height = 340;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Escala para Resposta ao Degrau y(t)
  const tMaxStep = simulation.t[simulation.t.length - 1] || 3.0;
  const yMaxStep = 1.35; // y vai de 0 até ~1.2

  const toXStep = (t: number) => padding.left + (t / tMaxStep) * plotW;
  const toYStep = (y: number) => padding.top + plotH - (y / yMaxStep) * plotH;

  // Path SVG para y_noFilter
  const pathNoFilter = simulation.t
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toXStep(t).toFixed(1)} ${toYStep(simulation.y_noFilter[i]).toFixed(1)}`)
    .join(' ');

  // Path SVG para y_withFilter
  const pathWithFilter = simulation.t
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toXStep(t).toFixed(1)} ${toYStep(simulation.y_withFilter[i]).toFixed(1)}`)
    .join(' ');

  // Escala para Esforço de Controle u(t)
  const tMaxU = 1.5;
  const uMaxDisplay = 30; // exibe até 30V para focar no pico com pré-filtro (15.3V) e linha de 10V
  const toXU = (t: number) => padding.left + (Math.min(t, tMaxU) / tMaxU) * plotW;
  const toYU = (u: number) => padding.top + plotH - (Math.min(Math.max(u, 0), uMaxDisplay) / uMaxDisplay) * plotH;

  const pathUWithFilter = simulation.t
    .filter(t => t <= tMaxU)
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${toXU(t).toFixed(1)} ${toYU(simulation.u_withFilter[i]).toFixed(1)}`)
    .join(' ');

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
      {/* Botões de Seleção do Gráfico */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Simulação Numérica LTI (RK4) • Tempo Contínuo
          </span>
          <h4 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', color: 'var(--text)' }}>
            {activeTab === 'step' ? 'Resposta Temporal ao Degrau Unitário y(t)' : 'Esforço de Controle do Atuador u(t) e Regra dos 10 V'}
          </h4>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={activeTab === 'step' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('step')}
            style={{ fontSize: '0.82rem', padding: '6px 14px', cursor: 'pointer' }}
          >
            📈 Resposta ao Degrau y(t)
          </button>
          <button
            type="button"
            className={activeTab === 'control' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('control')}
            style={{ fontSize: '0.82rem', padding: '6px 14px', cursor: 'pointer' }}
          >
            ⚡ Esforço de Controle u(t)
          </button>
        </div>
      </div>

      {/* SVG Canvas do Gráfico Ativo */}
      <div style={{ overflowX: 'auto', textAlign: 'center' }}>
        {activeTab === 'step' ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', background: '#0B132B', borderRadius: '8px', border: '1px solid #1E293B' }}
          >
            {/* Grade */}
            <g stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3">
              {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(t => (
                <line key={`gt-${t}`} x1={toXStep(t)} y1={padding.top} x2={toXStep(t)} y2={height - padding.bottom} />
              ))}
              {[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map(y => (
                <line key={`gy-${y}`} x1={padding.left} y1={toYStep(y)} x2={width - padding.right} y2={toYStep(y)} />
              ))}
            </g>

            {/* Linha de Referência Unitária y = 1 */}
            <line
              x1={padding.left}
              y1={toYStep(1.0)}
              x2={width - padding.right}
              y2={toYStep(1.0)}
              stroke="#64748B"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text x={width - padding.right - 80} y={toYStep(1.0) - 6} fill="#94A3B8" fontSize="11" fontWeight="600">
              Referência y = 1.0
            </text>

            {/* Eixos */}
            <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#94A3B8" strokeWidth="1.5" />
            <line x1={padding.left} y1={height - padding.bottom} x2={padding.left} y2={padding.top} stroke="#94A3B8" strokeWidth="1.5" />

            {/* Labels Eixos */}
            {[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(t => (
              <text key={`lx-${t}`} x={toXStep(t)} y={height - padding.bottom + 18} fill="#94A3B8" fontSize="11" textAnchor="middle">
                {t}s
              </text>
            ))}
            {[0, 0.5, 1.0].map(y => (
              <text key={`ly-${y}`} x={padding.left - 10} y={toYStep(y) + 4} fill="#94A3B8" fontSize="11" textAnchor="end">
                {y.toFixed(1)}
              </text>
            ))}
            <text x={width / 2} y={height - 10} fill="#94A3B8" fontSize="12" fontWeight="bold" textAnchor="middle">
              Tempo t (segundos)
            </text>
            <text x={18} y={height / 2} fill="#94A3B8" fontSize="12" fontWeight="bold" transform={`rotate(-90 18 ${height / 2})`} textAnchor="middle">
              Saída y(t)
            </text>

            {/* Curva 1: Sem Pré-Filtro (Laranja/Vermelha) */}
            <path d={pathNoFilter} fill="none" stroke="#F97316" strokeWidth="2.5" />

            {/* Curva 2: Com Pré-Filtro F(s) (Azul) */}
            <path d={pathWithFilter} fill="none" stroke="#38BDF8" strokeWidth="2.8" />

            {/* Marcadores dos Picos */}
            <circle cx={toXStep(simulation.tp_noFilter)} cy={toYStep(1 + simulation.Mp_noFilter / 100)} r="5" fill="#F97316" />
            <circle cx={toXStep(simulation.tp_withFilter)} cy={toYStep(1 + simulation.Mp_withFilter / 100)} r="5" fill="#38BDF8" />

            {/* Legenda em SVG */}
            <g transform={`translate(${padding.left + 20}, ${padding.top + 10})`}>
              <rect width="320" height="52" fill="rgba(15,23,42,0.85)" rx="6" stroke="#334155" />
              <line x1="12" y1="18" x2="35" y2="18" stroke="#F97316" strokeWidth="2.5" />
              <text x="45" y="22" fill="#F97316" fontSize="12" fontWeight="bold">
                Sem Pré-Filtro: Mp = {simulation.Mp_noFilter.toFixed(1)}%, tp = {simulation.tp_noFilter.toFixed(2)}s
              </text>

              <line x1="12" y1="36" x2="35" y2="36" stroke="#38BDF8" strokeWidth="2.8" />
              <text x="45" y="40" fill="#38BDF8" fontSize="12" fontWeight="bold">
                Com Pré-Filtro F(s): Mp = {simulation.Mp_withFilter.toFixed(1)}%, tp = {simulation.tp_withFilter.toFixed(2)}s
              </text>
            </g>
          </svg>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', background: '#0B132B', borderRadius: '8px', border: '1px solid #1E293B' }}
          >
            {/* Grade */}
            <g stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3">
              {[0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5].map(t => (
                <line key={`gtu-${t}`} x1={toXU(t)} y1={padding.top} x2={toXU(t)} y2={height - padding.bottom} />
              ))}
              {[0, 5, 10, 15, 20, 25, 30].map(u => (
                <line key={`gyu-${u}`} x1={padding.left} y1={toYU(u)} x2={width - padding.right} y2={toYU(u)} />
              ))}
            </g>

            {/* Linha Limite da Regra dos 10 V (Saturação Linear do Amp-Op) */}
            <line
              x1={padding.left}
              y1={toYU(10.0)}
              x2={width - padding.right}
              y2={toYU(10.0)}
              stroke="#EF4444"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <text x={width - padding.right - 140} y={toYU(10.0) - 6} fill="#EF4444" fontSize="11" fontWeight="bold">
              ⚠️ Limite ±10 V (Regra dos 10 V)
            </text>

            {/* Eixos */}
            <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#94A3B8" strokeWidth="1.5" />
            <line x1={padding.left} y1={height - padding.bottom} x2={padding.left} y2={padding.top} stroke="#94A3B8" strokeWidth="1.5" />

            {/* Labels */}
            {[0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5].map(t => (
              <text key={`lxu-${t}`} x={toXU(t)} y={height - padding.bottom + 18} fill="#94A3B8" fontSize="11" textAnchor="middle">
                {t}s
              </text>
            ))}
            {[0, 5, 10, 15, 20, 25, 30].map(u => (
              <text key={`lyu-${u}`} x={padding.left - 10} y={toYU(u) + 4} fill="#94A3B8" fontSize="11" textAnchor="end">
                {u}V
              </text>
            ))}
            <text x={width / 2} y={height - 10} fill="#94A3B8" fontSize="12" fontWeight="bold" textAnchor="middle">
              Tempo t (segundos)
            </text>
            <text x={18} y={height / 2} fill="#94A3B8" fontSize="12" fontWeight="bold" transform={`rotate(-90 18 ${height / 2})`} textAnchor="middle">
              Esforço de Controle u(t) (V)
            </text>

            {/* Curva Com Pré-Filtro F(s) (Azul) */}
            <path d={pathUWithFilter} fill="none" stroke="#38BDF8" strokeWidth="2.8" />

            {/* Anotação do Chute Inicial Sem Pré-Filtro */}
            <line x1={toXU(0)} y1={toYU(0)} x2={toXU(0)} y2={padding.top} stroke="#F97316" strokeWidth="3" />
            <text x={toXU(0) + 10} y={padding.top + 20} fill="#F97316" fontSize="11" fontWeight="bold">
              Sem F: Salto inicial u(0⁺) = {Kc.toFixed(1)} V (fora de escala)
            </text>

            {/* Legenda */}
            <g transform={`translate(${padding.left + 180}, ${padding.top + 60})`}>
              <rect width="320" height="60" fill="rgba(15,23,42,0.85)" rx="6" stroke="#334155" />
              <circle cx="15" cy="18" r="4" fill="#38BDF8" />
              <text x="28" y="22" fill="#38BDF8" fontSize="11" fontWeight="bold">
                Com F(s): Pico suavizado em {simulation.uMax_withFilter.toFixed(1)} V (t ≈ 0.05s)
              </text>
              <circle cx="15" cy="40" r="4" fill="#EF4444" />
              <text x="28" y="44" fill="#EF4444" fontSize="11">
                Degrau máx. admissível: Δe ≤ {(10 / simulation.uMax_withFilter).toFixed(2)} V
              </text>
            </g>
          </svg>
        )}
      </div>

      {/* Cards Explicativos com as Comparações e Métricas */}
      <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700 }}>Sobressinal com Pré-filtro</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
            {simulation.Mp_withFilter.toFixed(1)}% <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>(vs {simulation.Mp_noFilter.toFixed(1)}% sem F)</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            O pré-filtro cancela o zero em malha fechada e restabelece a especificação exata de 2ª ordem.
          </div>
        </div>

        <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.74rem', color: '#F97316', fontWeight: 700 }}>Tempo de Pico (tp)</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
            {simulation.tp_withFilter.toFixed(2)} s <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>(vs {simulation.tp_noFilter.toFixed(2)} s sem F)</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sem pré-filtro, o zero antecipava a subida forçando a derivada.
          </div>
        </div>

        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.74rem', color: '#EF4444', fontWeight: 700 }}>Pico de Controle u(t)</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
            {simulation.uMax_withFilter.toFixed(1)} V / V <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>(vs {Kc.toFixed(1)} V inicial)</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Atenuação de { (Kc / simulation.uMax_withFilter).toFixed(1) }× no esforço inicial do atuador.
          </div>
        </div>
      </div>
    </div>
  );
};
