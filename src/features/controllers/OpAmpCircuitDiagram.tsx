'use client';

import React, { useMemo } from 'react';
import { parseRatExpr } from '@/core/algebra/parser';
import { toUnivariateArr, trimUni } from '@/core/algebra/polynomial';
import { computeRootsPoly } from '@/core/analysis/stability';

export interface OpAmpCircuitProps {
  controllerType: 'P' | 'PD' | 'PI' | 'Lead' | 'Lag' | 'LeadLag' | 'PD_PI';
  controllerExpr: string;
}

function fmtOhm(ohms: number): string {
  if (!Number.isFinite(ohms) || ohms <= 0) return '—';
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(2).replace('.', ',')} MΩ`;
  if (ohms >= 1e3) return `${(ohms / 1e3).toFixed(1).replace('.', ',')} kΩ`;
  return `${ohms.toFixed(0)} Ω`;
}

function fmtFarad(f: number): string {
  if (!Number.isFinite(f) || f <= 0) return '—';
  if (f >= 1e-6) return `${(f * 1e6).toFixed(2).replace('.', ',')} µF`;
  if (f >= 1e-9) return `${(f * 1e9).toFixed(1).replace('.', ',')} nF`;
  return `${(f * 1e12).toFixed(0)} pF`;
}

export const OpAmpCircuitDiagram: React.FC<OpAmpCircuitProps> = ({
  controllerType,
  controllerExpr
}) => {
  const params = useMemo(() => {
    try {
      const Gc = parseRatExpr(controllerExpr);
      const num = trimUni(toUnivariateArr(Gc.num));
      const den = trimUni(toUnivariateArr(Gc.den));
      if (num.length === 0 || den.length === 0) return null;

      const Kc = Math.abs(num[num.length - 1] / den[den.length - 1]);
      const zeros = num.length > 1 ? computeRootsPoly(num).map(r => -r.re).filter(v => v > 1e-5) : [];
      const poles = den.length > 1 ? computeRootsPoly(den).map(r => -r.re) : [];

      if (controllerType === 'P') {
        const R1 = 10e3;
        const R2 = Kc * R1;
        return { kind: 'P' as const, Kc, R1, R2, highR: R2 > 1e6 };
      }

      if (controllerType === 'PI') {
        const zi = zeros[0] || 0.5;
        const R1 = 10e3;
        const R2 = Kc * R1;
        const C = 1 / (zi * R2);
        return { kind: 'PI' as const, Kc, zi, R1, R2, C, highR: R2 > 1e6 };
      }

      if (controllerType === 'Lag') {
        const z = zeros[0] || 0.5;
        const p = poles.find(v => v > 1e-6) || z / 5;
        const beta = z / p;
        const C = 10e-6;
        const R1 = 1 / (z * C);
        const R2 = beta * R1;
        const R3 = 10e3;
        const R4 = Kc * R3;
        return { kind: 'Lag' as const, Kc, z, p, beta, C, R1, R2, R3, R4, highR: R1 > 1e6 || R2 > 1e6 };
      }

      if (controllerType === 'PD' || controllerType === 'Lead') {
        const zc = zeros[0] || 1;
        const pc = poles.find(v => v > zc) || zc * 10;
        const C1 = 10e-6;
        const C2 = C1 / Kc;
        const R1 = 1 / (zc * C1);
        const R2 = 1 / (pc * C2);
        return { kind: 'Lead' as const, Kc, zc, pc, C1, C2, R1, R2, highR: R1 > 1e6 || R2 > 1e6 };
      }

      return null;
    } catch {
      return null;
    }
  }, [controllerType, controllerExpr]);

  if (!params) return null;

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px',
        padding: '12px 16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
          🔌 Implementação Analógica com Amp-Op (Valores Calculados)
        </div>
        {params.highR && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(245, 158, 11, 0.16)',
              color: '#f59e0b',
              border: '1px solid #f59e0b'
            }}
          >
            ⚠️ Resistor &gt; 1 MΩ — Avalie capacitor maior (47 µF) ou implementação digital (CLP/MCU)
          </span>
        )}
      </div>

      <svg viewBox="0 0 640 175" style={{ width: '100%', maxWidth: '640px', height: 'auto', display: 'block', margin: '0 auto' }}>
        {/* Referência GND e fios base */}
        <text x="16" y="106" fontSize="12" fontWeight="700" fill="var(--text)">E(s)</text>
        <circle cx="48" cy="102" r="3.5" fill="var(--primary)" />

        {/* Bloco de Impedância de Entrada Z1 */}
        <line x1="51" y1="102" x2="90" y2="102" stroke="var(--text)" strokeWidth="2" />
        <rect x="90" y="84" width="115" height="36" rx="5" fill="var(--code-bg)" stroke="#0284c7" strokeWidth="1.8" />
        {params.kind === 'Lead' ? (
          <>
            <text x="147" y="99" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#38bdf8">
              R₁ = {fmtOhm(params.R1)}
            </text>
            <text x="147" y="113" textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              ∥ C₁ = {fmtFarad(params.C1)}
            </text>
          </>
        ) : (
          <text x="147" y="106" textAnchor="middle" fontSize="11" fontWeight="700" fill="#38bdf8">
            R₁ = {fmtOhm(params.R1)}
          </text>
        )}
        <line x1="205" y1="102" x2="265" y2="102" stroke="var(--text)" strokeWidth="2" />
        <circle cx="240" cy="102" r="3" fill="var(--text)" />

        {/* Malha de Realimentação Z2 */}
        <line x1="240" y1="102" x2="240" y2="34" stroke="var(--text)" strokeWidth="2" />
        <line x1="240" y1="34" x2="275" y2="34" stroke="var(--text)" strokeWidth="2" />
        <rect x="275" y="16" width="145" height="36" rx="5" fill="var(--code-bg)" stroke="#10b981" strokeWidth="1.8" />
        {params.kind === 'P' && (
          <text x="347" y="38" textAnchor="middle" fontSize="11" fontWeight="700" fill="#34d399">
            R₂ = {fmtOhm(params.R2)}
          </text>
        )}
        {params.kind === 'PI' && (
          <>
            <text x="347" y="31" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#34d399">
              R₂ = {fmtOhm(params.R2)}
            </text>
            <text x="347" y="45" textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              + C = {fmtFarad(params.C)} (série)
            </text>
          </>
        )}
        {params.kind === 'Lead' && (
          <>
            <text x="347" y="31" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#34d399">
              R₂ = {fmtOhm(params.R2)}
            </text>
            <text x="347" y="45" textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              ∥ C₂ = {fmtFarad(params.C2)}
            </text>
          </>
        )}
        {params.kind === 'Lag' && (
          <>
            <text x="347" y="31" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#34d399">
              R₂ = {fmtOhm(params.R2)}
            </text>
            <text x="347" y="45" textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              ∥ (R₁ + C={fmtFarad(params.C)})
            </text>
          </>
        )}
        <line x1="420" y1="34" x2="445" y2="34" stroke="var(--text)" strokeWidth="2" />
        <line x1="445" y1="34" x2="445" y2="115" stroke="var(--text)" strokeWidth="2" />
        <circle cx="445" cy="115" r="3" fill="var(--text)" />

        {/* Triângulo Amp-Op */}
        <polygon points="265,78 265,152 340,115" fill="var(--code-bg)" stroke="var(--primary)" strokeWidth="2.2" />
        <text x="275" y="106" fontSize="14" fontWeight="800" fill="#ef4444">−</text>
        <text x="275" y="136" fontSize="13" fontWeight="800" fill="#10b981">+</text>
        {/* Entrada + ao GND */}
        <line x1="265" y1="132" x2="240" y2="132" stroke="var(--text)" strokeWidth="1.8" />
        <line x1="240" y1="132" x2="240" y2="152" stroke="var(--text)" strokeWidth="1.8" />
        <line x1="230" y1="152" x2="250" y2="152" stroke="var(--text)" strokeWidth="2" />
        <line x1="234" y1="157" x2="246" y2="157" stroke="var(--text)" strokeWidth="1.6" />
        <line x1="238" y1="162" x2="242" y2="162" stroke="var(--text)" strokeWidth="1.3" />

        {/* Saída do 1º estágio -> Estágio inversor (ou ganho R4/R3 no Lag) */}
        <line x1="340" y1="115" x2="475" y2="115" stroke="var(--text)" strokeWidth="2" />
        <rect x="475" y="92" width="115" height="46" rx="5" fill="var(--code-bg)" stroke="#a855f7" strokeWidth="1.8" />
        {params.kind === 'Lag' ? (
          <>
            <text x="532" y="110" textAnchor="middle" fontSize="10" fontWeight="700" fill="#c084fc">
              Estágio 2 (−R₄/R₃)
            </text>
            <text x="532" y="125" textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">
              R₃={fmtOhm(params.R3)} • R₄={fmtOhm(params.R4)}
            </text>
          </>
        ) : (
          <>
            <text x="532" y="111" textAnchor="middle" fontSize="10" fontWeight="700" fill="#c084fc">
              Inversor (−1)
            </text>
            <text x="532" y="126" textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">
              ±10 V (Saturação)
            </text>
          </>
        )}
        <line x1="590" y1="115" x2="612" y2="115" stroke="var(--text)" strokeWidth="2" />
        <circle cx="615" cy="115" r="3.5" fill="var(--primary)" />
        <text x="615" y="102" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">U(s)</text>
      </svg>
    </div>
  );
};
