'use client';

import React from 'react';
import { CompensatorResult } from './compensatorEngine';

interface CompensatorBlockDiagramSvgProps {
  result: CompensatorResult;
  showPreFilter: boolean;
  onTogglePreFilter?: () => void;
}

export const CompensatorBlockDiagramSvg: React.FC<CompensatorBlockDiagramSvgProps> = ({
  result,
  showPreFilter,
  onTogglePreFilter
}) => {
  const width = 820;
  const height = 220;

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Topologia do Sistema de Controle em Malha Fechada
          </span>
          <h4 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', color: 'var(--text)' }}>
            Diagrama de Blocos Interativo com Controlador e Planta
          </h4>
        </div>
        {onTogglePreFilter && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={showPreFilter}
              onChange={onTogglePreFilter}
              style={{ cursor: 'pointer' }}
            />
            <b>Exibir Pré-Filtro F(s) na Referência</b>
          </label>
        )}
      </div>

      <div style={{ overflowX: 'auto', textAlign: 'center' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', background: '#0F172A', borderRadius: '8px', border: '1px solid #1E293B' }}
        >
          <defs>
            <marker id="blkArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#38BDF8" />
            </marker>
          </defs>

          {/* 1. Entrada R(s) */}
          <line x1="30" y1="100" x2={showPreFilter ? "110" : "190"} y2="100" stroke="#38BDF8" strokeWidth="2.5" markerEnd="url(#blkArrow)" />
          <text x="50" y="88" fill="#F8FAFC" fontSize="13" fontWeight="bold">R(s)</text>

          {/* 2. Bloco Pré-Filtro F(s) (Se ativo) */}
          {showPreFilter && (
            <g>
              <rect x="110" y="70" width="100" height="60" rx="6" fill="#1E293B" stroke="#A855F7" strokeWidth="2" />
              <text x="160" y="94" fill="#C084FC" fontSize="12" fontWeight="bold" textAnchor="middle">F(s)</text>
              <text x="160" y="114" fill="#F1F5F9" fontSize="10" textAnchor="middle">
                {result.zc.toFixed(2)} / (s + {result.zc.toFixed(2)})
              </text>
              <line x1="210" y1="100" x2="250" y2="100" stroke="#38BDF8" strokeWidth="2.5" markerEnd="url(#blkArrow)" />
            </g>
          )}

          {/* 3. Somador */}
          <circle cx={showPreFilter ? "265" : "205"} cy="100" r="16" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
          <line x1={showPreFilter ? "253" : "193"} y1="88" x2={showPreFilter ? "277" : "217"} y2="112" stroke="#64748B" strokeWidth="1.5" />
          <line x1={showPreFilter ? "253" : "193"} y1="112" x2={showPreFilter ? "277" : "217"} y2="88" stroke="#64748B" strokeWidth="1.5" />
          <text x={showPreFilter ? "245" : "185"} y="92" fill="#38BDF8" fontSize="12" fontWeight="bold">+</text>
          <text x={showPreFilter ? "255" : "195"} y="128" fill="#EF4444" fontSize="13" fontWeight="bold">−</text>

          {/* Linha de Erro E(s) */}
          <line
            x1={showPreFilter ? "281" : "221"}
            y1="100"
            x2={showPreFilter ? "330" : "270"}
            y2="100"
            stroke="#38BDF8"
            strokeWidth="2.5"
            markerEnd="url(#blkArrow)"
          />
          <text x={showPreFilter ? "295" : "235"} y="90" fill="#94A3B8" fontSize="12" fontWeight="bold">E(s)</text>

          {/* 4. Bloco do Controlador Gc(s) */}
          <rect
            x={showPreFilter ? "330" : "270"}
            y="65"
            width="170"
            height="70"
            rx="6"
            fill="#1E293B"
            stroke="#38BDF8"
            strokeWidth="2"
          />
          <text x={showPreFilter ? "415" : "355"} y="88" fill="#38BDF8" fontSize="12" fontWeight="bold" textAnchor="middle">
            {result.type === 'pi' ? 'Controlador PI Gc(s)' : `Controlador Gc(s) (${result.type.toUpperCase()})`}
          </text>
          <text x={showPreFilter ? "415" : "355"} y="110" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle">
            {result.type === 'pi' && result.piDetails
              ? `${result.Kc.toFixed(2)} · (s + ${result.piDetails.zi_lim.toFixed(3)}) / s`
              : `${result.Kc.toFixed(1)} · (s + ${result.zc.toFixed(2)}) / (s + ${result.pc.toFixed(1)})`}
          </text>
          <text x={showPreFilter ? "415" : "355"} y="125" fill="#94A3B8" fontSize="9.5" textAnchor="middle">
            {result.type === 'pi'
              ? `zi = ${result.zc.toFixed(3)} rad/s (Polo em s = 0)`
              : `Kp=${result.Kp.toFixed(2)}, Td=${result.Td.toFixed(3)}s`}
          </text>

          {/* Linha de Controle U(s) */}
          <line
            x1={showPreFilter ? "500" : "440"}
            y1="100"
            x2={showPreFilter ? "550" : "490"}
            y2="100"
            stroke="#38BDF8"
            strokeWidth="2.5"
            markerEnd="url(#blkArrow)"
          />
          <text x={showPreFilter ? "515" : "455"} y="90" fill="#FBBF24" fontSize="12" fontWeight="bold">U(s)</text>

          {/* 5. Bloco da Planta G(s) */}
          <rect
            x={showPreFilter ? "550" : "490"}
            y="65"
            width="150"
            height="70"
            rx="6"
            fill="#1E293B"
            stroke="#10B981"
            strokeWidth="2"
          />
          <text x={showPreFilter ? "625" : "565"} y="88" fill="#34D399" fontSize="12" fontWeight="bold" textAnchor="middle">
            Planta G(s)
          </text>
          <text x={showPreFilter ? "625" : "565"} y="112" fill="#F8FAFC" fontSize="12" fontWeight="bold" textAnchor="middle">
            {result.inputs.plant.label}
          </text>

          {/* 6. Linha de Saída Y(s) e Ramificação */}
          <line
            x1={showPreFilter ? "700" : "640"}
            y1="100"
            x2="780"
            y2="100"
            stroke="#38BDF8"
            strokeWidth="2.5"
            markerEnd="url(#blkArrow)"
          />
          <circle cx={showPreFilter ? "740" : "710"} cy="100" r="4.5" fill="#38BDF8" />
          <text x="750" y="88" fill="#F8FAFC" fontSize="13" fontWeight="bold">Y(s)</text>

          {/* 7. Malha de Realimentação Unitária H(s) = 1 */}
          <path
            d={`M ${showPreFilter ? "740" : "710"} 100 L ${showPreFilter ? "740" : "710"} 180 L ${showPreFilter ? "265" : "205"} 180 L ${showPreFilter ? "265" : "205"} 118`}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.2"
            markerEnd="url(#blkArrow)"
          />
          <text x={showPreFilter ? "500" : "460"} y="196" fill="#94A3B8" fontSize="11" fontWeight="bold" textAnchor="middle">
            Realimentação Unitária Negativa H(s) = 1
          </text>
        </svg>
      </div>
    </div>
  );
};
