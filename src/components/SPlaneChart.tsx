'use client';

import React, { useMemo, useState } from 'react';
import { parseRatExpr } from '@/core/algebra/parser';
import { toUnivariateArr, trimUni } from '@/core/algebra/polynomial';
import { ratMul } from '@/core/algebra/rational';
import { computeRootsPoly, ComplexNumber } from '@/core/analysis/stability';
import { buildClosedLoopTf } from '@/features/controllers/controllersData';

interface SPlaneChartProps {
  title?: string;
  plantExpr: string;
  controllerExpr: string;
  zetaTarget?: number;
}

interface PlottedPoint {
  kind: 'ol-pole' | 'ol-zero' | 'cl-pole';
  re: number;
  im: number;
  label: string;
}

function fmtComplex(re: number, im: number): string {
  const r = Math.abs(re) < 1e-4 ? 0 : re;
  const i = Math.abs(im) < 1e-4 ? 0 : im;
  if (i === 0) return r.toFixed(2).replace(/\.00$/, '');
  const sign = i >= 0 ? '+' : '−';
  return `${r.toFixed(2)} ${sign} j${Math.abs(i).toFixed(2)}`;
}

function niceStep(range: number, targetTicks = 5): number {
  const rough = range / targetTicks;
  const pow10 = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-6))));
  const frac = rough / pow10;
  let nice = 1;
  if (frac >= 5) nice = 5;
  else if (frac >= 2) nice = 2;
  return nice * pow10;
}

function buildTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + 1e-9; v += step) {
    const clean = Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(4));
    ticks.push(clean);
  }
  return ticks;
}

export const SPlaneChart: React.FC<SPlaneChartProps> = ({
  title = 'Plano s — Polos, Zeros e Lugar das Raízes (LGR)',
  plantExpr,
  controllerExpr,
  zetaTarget
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const computed = useMemo(() => {
    try {
      const G = parseRatExpr(plantExpr);
      const Gc = parseRatExpr(controllerExpr);
      const L = ratMul(Gc, G);
      const T = buildClosedLoopTf(G, Gc);

      const numL = trimUni(toUnivariateArr(L.num));
      const denL = trimUni(toUnivariateArr(L.den));
      const denT = trimUni(toUnivariateArr(T.den));

      const olPoles = computeRootsPoly(denL);
      const olZeros = numL.length > 1 ? computeRootsPoly(numL) : [];
      const clPoles = computeRootsPoly(denT);

      // Amostra o LGR para L(s) = numL / denL (1 + k * L(s) = 0, com k relativo ao sistema compensado)
      const kValues: number[] = [];
      for (let i = -2; i <= 2.2; i += 0.08) {
        kValues.push(Math.pow(10, i));
      }
      const locusPoints: ComplexNumber[] = [];
      const maxDeg = Math.max(denL.length, numL.length);
      for (const k of kValues) {
        const rawChar: number[] = new Array(maxDeg).fill(0);
        for (let i = 0; i < denL.length; i++) rawChar[i] += denL[i];
        for (let i = 0; i < numL.length; i++) rawChar[i] += k * numL[i];
        const charPoly = trimUni(rawChar);
        if (charPoly.length > 1) {
          const roots = computeRootsPoly(charPoly);
          for (const r of roots) {
            if (Number.isFinite(r.re) && Number.isFinite(r.im)) {
              locusPoints.push(r);
            }
          }
        }
      }

      const points: PlottedPoint[] = [
        ...olPoles.map((p, i) => ({ kind: 'ol-pole' as const, re: p.re, im: p.im, label: `Polo MA #${i + 1}` })),
        ...olZeros.map((z, i) => ({ kind: 'ol-zero' as const, re: z.re, im: z.im, label: `Zero MA #${i + 1}` })),
        ...clPoles.map((p, i) => ({ kind: 'cl-pole' as const, re: p.re, im: p.im, label: `Polo MF #${i + 1}` }))
      ];

      // Define limites de visualização focando nos polos/zeros principais (evita que polo muito distante esmague os dominantes)
      const corePts = [...olPoles, ...olZeros, ...clPoles].filter(p => Math.abs(p.re) < 35 && Math.abs(p.im) < 35);
      const refPts = corePts.length > 0 ? corePts : [...olPoles, ...clPoles];

      let minRe = Math.min(-2, ...refPts.map(p => p.re));
      let maxRe = Math.max(1.5, ...refPts.map(p => p.re));
      let maxIm = Math.max(2, ...refPts.map(p => Math.abs(p.im)));

      const padRe = Math.max(1.2, (maxRe - minRe) * 0.18);
      const padIm = Math.max(1.0, maxIm * 0.25);
      minRe -= padRe;
      maxRe += padRe;
      maxIm += padIm;

      const reTicks = buildTicks(minRe, maxRe, niceStep(maxRe - minRe, 6));
      const imTicks = buildTicks(-maxIm, maxIm, niceStep(2 * maxIm, 4)).filter(v => v !== 0);

      return { points, clPoles, locusPoints, minRe, maxRe, minIm: -maxIm, maxIm, reTicks, imTicks };
    } catch {
      return null;
    }
  }, [plantExpr, controllerExpr]);

  if (!computed) return null;

  const W = 560;
  const H = 290;
  const padL = 46;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (re: number) => padL + ((re - computed.minRe) / (computed.maxRe - computed.minRe)) * plotW;
  const toY = (im: number) => padT + ((computed.maxIm - im) / (computed.maxIm - computed.minIm)) * plotH;

  const zeroX = toX(0);
  const zeroY = toY(0);

  const hovered = hoveredIdx !== null ? computed.points[hoveredIdx] : null;
  const hoveredMag = hovered ? Math.hypot(hovered.re, hovered.im) : 0;
  const hoveredZeta = hovered && hoveredMag > 1e-6 && hovered.re < 0 ? -hovered.re / hoveredMag : null;

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
          {title}
        </span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ color: '#ef4444', fontWeight: 700 }}>× Polo Malha Aberta</span>
          <span style={{ color: '#3b82f6', fontWeight: 700 }}>○ Zero Malha Aberta</span>
          <span style={{ color: '#10b981', fontWeight: 700 }}>● Polo Malha Fechada</span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', background: 'rgba(15, 23, 42, 0.35)', borderRadius: '6px' }}>
          {/* Semiplano direito (região instável) */}
          {zeroX < padL + plotW && (
            <rect
              x={Math.max(padL, zeroX)}
              y={padT}
              width={Math.max(0, padL + plotW - Math.max(padL, zeroX))}
              height={plotH}
              fill="rgba(239, 68, 68, 0.06)"
            />
          )}

          {/* Grade e Valores dos Eixos Re(s) e jω */}
          {computed.reTicks.map(v => {
            const tx = toX(v);
            return (
              <g key={`rx-${v}`}>
                <line x1={tx} y1={padT} x2={tx} y2={padT + plotH} stroke="rgba(148, 163, 184, 0.12)" strokeWidth="1" />
                <line x1={tx} y1={zeroY - 3} x2={tx} y2={zeroY + 3} stroke="rgba(148, 163, 184, 0.5)" strokeWidth="1" />
                <text x={tx} y={zeroY + 13} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
                  {v}
                </text>
              </g>
            );
          })}
          {computed.imTicks.map(v => {
            const ty = toY(v);
            return (
              <g key={`iy-${v}`}>
                <line x1={padL} y1={ty} x2={padL + plotW} y2={ty} stroke="rgba(148, 163, 184, 0.12)" strokeWidth="1" />
                {zeroX >= padL && zeroX <= padL + plotW && (
                  <>
                    <line x1={zeroX - 3} y1={ty} x2={zeroX + 3} y2={ty} stroke="rgba(148, 163, 184, 0.5)" strokeWidth="1" />
                    <text x={zeroX - 6} y={ty + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8">
                      {v > 0 ? `+j${v}` : `−j${Math.abs(v)}`}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Eixos Re(s) e Im(s) */}
          <line x1={padL} y1={zeroY} x2={padL + plotW} y2={zeroY} stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" />
          {zeroX >= padL && zeroX <= padL + plotW && (
            <line x1={zeroX} y1={padT} x2={zeroX} y2={padT + plotH} stroke="rgba(248, 113, 113, 0.55)" strokeDasharray="4 3" strokeWidth="1.2" />
          )}

          {/* Reta de zeta constante opcional */}
          {zetaTarget && zetaTarget > 0 && zetaTarget < 1 && zeroX >= padL && zeroX <= padL + plotW && (
            (() => {
              const tanBeta = Math.sqrt(1 - zetaTarget * zetaTarget) / zetaTarget;
              const reEdge = computed.minRe;
              const imEdge = Math.abs(reEdge) * tanBeta;
              return (
                <>
                  <line x1={zeroX} y1={zeroY} x2={toX(reEdge)} y2={toY(imEdge)} stroke="rgba(250, 204, 21, 0.45)" strokeDasharray="3 3" strokeWidth="1.2" />
                  <line x1={zeroX} y1={zeroY} x2={toX(reEdge)} y2={toY(-imEdge)} stroke="rgba(250, 204, 21, 0.45)" strokeDasharray="3 3" strokeWidth="1.2" />
                </>
              );
            })()
          )}

          {/* Pontos do LGR */}
          {computed.locusPoints.map((pt, idx) => {
            if (pt.re < computed.minRe || pt.re > computed.maxRe || pt.im < computed.minIm || pt.im > computed.maxIm) return null;
            return (
              <circle
                key={`lgr-${idx}`}
                cx={toX(pt.re)}
                cy={toY(pt.im)}
                r={1.3}
                fill="rgba(56, 189, 248, 0.45)"
              />
            );
          })}

          {/* Polos e Zeros interativos com valores visíveis */}
          {computed.points.map((pt, idx) => {
            if (pt.re < computed.minRe || pt.re > computed.maxRe || pt.im < computed.minIm || pt.im > computed.maxIm) return null;
            const cx = toX(pt.re);
            const cy = toY(pt.im);
            const isHovered = hoveredIdx === idx;
            const coordText = fmtComplex(pt.re, pt.im);
            const isUpper = pt.im > 0.05;
            const isLower = pt.im < -0.05;
            const labelY = isUpper ? cy - 8 : isLower ? cy + 15 : pt.kind === 'cl-pole' ? cy - 9 : cy + 16;

            if (pt.kind === 'ol-pole') {
              return (
                <g
                  key={`pt-${idx}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <circle cx={cx} cy={cy} r={10} fill="transparent" />
                  <line x1={cx - 4.5} y1={cy - 4.5} x2={cx + 4.5} y2={cy + 4.5} stroke="#ef4444" strokeWidth={isHovered ? 3 : 2.2} />
                  <line x1={cx - 4.5} y1={cy + 4.5} x2={cx + 4.5} y2={cy - 4.5} stroke="#ef4444" strokeWidth={isHovered ? 3 : 2.2} />
                  <text x={cx} y={labelY} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fca5a5">
                    {coordText}
                  </text>
                </g>
              );
            }

            if (pt.kind === 'ol-zero') {
              return (
                <g
                  key={`pt-${idx}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <circle cx={cx} cy={cy} r={10} fill="transparent" />
                  <circle cx={cx} cy={cy} r={isHovered ? 6 : 4.8} fill="none" stroke="#3b82f6" strokeWidth="2.2" />
                  <text x={cx} y={cy - 9} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#93c5fd">
                    {coordText}
                  </text>
                </g>
              );
            }

            const clIsComplex = Math.abs(pt.im) > 0.05;
            const clX = clIsComplex ? (pt.re <= 0 ? cx - 8 : cx + 8) : cx;
            const clY = clIsComplex ? cy + 3 : cy - 10;
            const clAnchor = clIsComplex ? (pt.re <= 0 ? 'end' : 'start') : 'middle';

            return (
              <g
                key={`pt-${idx}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <circle cx={cx} cy={cy} r={10} fill="transparent" />
                <circle cx={cx} cy={cy} r={isHovered ? 6 : 4.5} fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                <text
                  x={clX}
                  y={clY}
                  textAnchor={clAnchor}
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#6ee7b7"
                  stroke="#0f172a"
                  strokeWidth="3"
                  style={{ paintOrder: 'stroke' }}
                >
                  {coordText}
                </text>
              </g>
            );
          })}

          {/* Rótulos dos eixos */}
          <text x={padL + plotW - 4} y={zeroY - 6} textAnchor="end" fontSize="10" fill="#94a3b8">
            Re(s)
          </text>
          {zeroX >= padL && zeroX <= padL + plotW && (
            <text x={zeroX + 6} y={padT + 11} fontSize="10" fill="#94a3b8">
              jω
            </text>
          )}
        </svg>

        {/* Resumo fixo dos Polos de Malha Fechada */}
        <div
          style={{
            marginTop: '6px',
            padding: '6px 10px',
            borderRadius: '6px',
            background: 'var(--code-bg)',
            border: '1px solid var(--card-border)',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <strong style={{ color: '#10b981' }}>Polos de Malha Fechada:</strong>
          {computed.clPoles.map((p, i) => (
            <span
              key={`clp-${i}`}
              style={{
                padding: '1px 7px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--text)',
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: '0.72rem'
              }}
            >
              p{i + 1} = {fmtComplex(p.re, p.im)}
            </span>
          ))}
        </div>

        {hovered && (
          <div
            style={{
              marginTop: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              fontSize: '0.75rem',
              color: 'var(--text)',
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap'
            }}
          >
            <strong>{hovered.label}:</strong>
            <span>s = {fmtComplex(hovered.re, hovered.im)}</span>
            {hoveredMag > 1e-4 && <span>ωn = {hoveredMag.toFixed(3)} rad/s</span>}
            {hoveredZeta !== null && <span>ζ = {hoveredZeta.toFixed(4)}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
