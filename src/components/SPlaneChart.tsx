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
  const [toolMode, setToolMode] = useState<'none' | 'zoom' | 'pan'>('none');
  const [gainMult, setGainMult] = useState<number>(1);
  const [viewBoxBounds, setViewBoxBounds] = useState<{ minRe: number; maxRe: number; minIm: number; maxIm: number } | null>(null);
  const [panDrag, setPanDrag] = useState<{
    startX: number;
    startY: number;
    startBounds: { minRe: number; maxRe: number; minIm: number; maxIm: number };
  } | null>(null);

  const computed = useMemo(() => {
    try {
      const G = parseRatExpr(plantExpr);
      const Gc = parseRatExpr(controllerExpr);
      const L = ratMul(Gc, G);
      const T = buildClosedLoopTf(G, Gc);

      const numG = trimUni(toUnivariateArr(G.num));
      const denG = trimUni(toUnivariateArr(G.den));
      const numL = trimUni(toUnivariateArr(L.num));
      const denL = trimUni(toUnivariateArr(L.den));
      const denT = trimUni(toUnivariateArr(T.den));

      const isZeroGain = numL.length === 0 || (numL.length === 1 && Math.abs(numL[0]) < 1e-12);
      const locusNum = isZeroGain ? numG : numL;
      const locusDen = isZeroGain ? denG : denL;

      const olPoles = computeRootsPoly(locusDen);
      const olZeros = locusNum.length > 1 ? computeRootsPoly(locusNum) : [];
      const clPoles = computeRootsPoly(denT);

      // Amostra o LGR para L(s) = locusNum / locusDen
      const kValues: number[] = [];
      for (let i = -2; i <= 2.2; i += 0.08) {
        kValues.push(Math.pow(10, i));
      }
      const locusPoints: ComplexNumber[] = [];
      const maxDeg = Math.max(locusDen.length, locusNum.length);
      for (const k of kValues) {
        const rawChar: number[] = new Array(maxDeg).fill(0);
        for (let i = 0; i < locusDen.length; i++) rawChar[i] += locusDen[i];
        for (let i = 0; i < locusNum.length; i++) rawChar[i] += k * locusNum[i];
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

      return { olPoles, olZeros, denL, numL, locusPoints, defaultBounds: { minRe, maxRe, minIm: -maxIm, maxIm } };
    } catch {
      return null;
    }
  }, [plantExpr, controllerExpr]);

  const activeClPoles = useMemo(() => {
    if (!computed) return [];
    const { denL, numL } = computed;
    const maxDeg = Math.max(denL.length, numL.length);
    const rawChar: number[] = new Array(maxDeg).fill(0);
    for (let i = 0; i < denL.length; i++) rawChar[i] += denL[i];
    for (let i = 0; i < numL.length; i++) rawChar[i] += gainMult * numL[i];
    const charPoly = trimUni(rawChar);
    return charPoly.length > 1 ? computeRootsPoly(charPoly) : [];
  }, [computed, gainMult]);

  const activePoints: PlottedPoint[] = useMemo(() => {
    if (!computed) return [];
    return [
      ...computed.olPoles.map((p, i) => ({ kind: 'ol-pole' as const, re: p.re, im: p.im, label: `Polo MA #${i + 1}` })),
      ...computed.olZeros.map((z, i) => ({ kind: 'ol-zero' as const, re: z.re, im: z.im, label: `Zero MA #${i + 1}` })),
      ...activeClPoles.map((p, i) => ({ kind: 'cl-pole' as const, re: p.re, im: p.im, label: `Polo MF #${i + 1}` }))
    ];
  }, [computed, activeClPoles]);

  // Reseta zoom e pan apenas ao trocar de planta
  React.useEffect(() => {
    setViewBoxBounds(null);
    setToolMode('none');
    setPanDrag(null);
    setGainMult(1);
  }, [plantExpr]);

  if (!computed) return null;

  const activeBounds = viewBoxBounds || computed.defaultBounds;
  const reTicks = buildTicks(activeBounds.minRe, activeBounds.maxRe, niceStep(activeBounds.maxRe - activeBounds.minRe, 6));
  const imTicks = buildTicks(activeBounds.minIm, activeBounds.maxIm, niceStep(activeBounds.maxIm - activeBounds.minIm, 4)).filter(v => v !== 0);

  const W = 560;
  const H = 290;
  const padL = 46;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (re: number) => padL + ((re - activeBounds.minRe) / (activeBounds.maxRe - activeBounds.minRe)) * plotW;
  const toY = (im: number) => padT + ((activeBounds.maxIm - im) / (activeBounds.maxIm - activeBounds.minIm)) * plotH;

  const zoomFactor = (computed.defaultBounds.maxRe - computed.defaultBounds.minRe) / (activeBounds.maxRe - activeBounds.minRe);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode !== 'zoom') return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickSvgX = ((e.clientX - rect.left) / rect.width) * W;
    const clickSvgY = ((e.clientY - rect.top) / rect.height) * H;
    const targetRe = activeBounds.minRe + ((clickSvgX - padL) / plotW) * (activeBounds.maxRe - activeBounds.minRe);
    const targetIm = activeBounds.maxIm - ((clickSvgY - padT) / plotH) * (activeBounds.maxIm - activeBounds.minIm);

    const newHalfW = Math.max(0.08, (activeBounds.maxRe - activeBounds.minRe) / 4);
    const newHalfH = Math.max(0.08, (activeBounds.maxIm - activeBounds.minIm) / 4);
    setViewBoxBounds({
      minRe: targetRe - newHalfW,
      maxRe: targetRe + newHalfW,
      minIm: targetIm - newHalfH,
      maxIm: targetIm + newHalfH
    });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode !== 'pan') return;
    e.preventDefault();
    setPanDrag({
      startX: e.clientX,
      startY: e.clientY,
      startBounds: activeBounds
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode !== 'pan' || !panDrag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = (panDrag.startBounds.maxRe - panDrag.startBounds.minRe) / ((plotW / W) * rect.width);
    const scaleY = (panDrag.startBounds.maxIm - panDrag.startBounds.minIm) / ((plotH / H) * rect.height);
    const dRe = (e.clientX - panDrag.startX) * scaleX;
    const dIm = (e.clientY - panDrag.startY) * scaleY;
    setViewBoxBounds({
      minRe: panDrag.startBounds.minRe - dRe,
      maxRe: panDrag.startBounds.maxRe - dRe,
      minIm: panDrag.startBounds.minIm + dIm,
      maxIm: panDrag.startBounds.maxIm + dIm
    });
  };

  const handleMouseUp = () => {
    if (panDrag) setPanDrag(null);
  };

  const handleZoomOut = () => {
    const curW = activeBounds.maxRe - activeBounds.minRe;
    const curH = activeBounds.maxIm - activeBounds.minIm;
    const defW = computed.defaultBounds.maxRe - computed.defaultBounds.minRe;
    if (curW >= defW * 20) return;
    const cxRe = (activeBounds.minRe + activeBounds.maxRe) / 2;
    const cyIm = (activeBounds.minIm + activeBounds.maxIm) / 2;
    const nextHalfW = (curW * 1.6) / 2;
    const nextHalfH = (curH * 1.6) / 2;
    setViewBoxBounds({
      minRe: cxRe - nextHalfW,
      maxRe: cxRe + nextHalfW,
      minIm: cyIm - nextHalfH,
      maxIm: cyIm + nextHalfH
    });
  };

  const handleResetZoom = () => {
    setViewBoxBounds(null);
    setToolMode('none');
    setPanDrag(null);
  };

  const zeroX = toX(0);
  const zeroY = toY(0);

  const hovered = hoveredIdx !== null ? activePoints[hoveredIdx] : null;
  const isUnstable = activeClPoles.some(p => p.re > 1e-4);
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="no-print" style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setToolMode(m => (m === 'zoom' ? 'none' : 'zoom'))}
              title="Ativar lupa: clique no gráfico onde deseja dar zoom"
              style={{
                padding: '3px 9px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: toolMode === 'zoom' ? 'var(--primary)' : 'var(--code-bg)',
                color: toolMode === 'zoom' ? '#fff' : 'var(--text)',
                border: `1px solid ${toolMode === 'zoom' ? 'var(--primary)' : 'var(--card-border)'}`
              }}
            >
              🔍+ {toolMode === 'zoom' ? 'Clique no gráfico' : 'Lupa +'}
            </button>
            <button
              type="button"
              onClick={() => setToolMode(m => (m === 'pan' ? 'none' : 'pan'))}
              title="Ativar mãozinha: clique e arraste para mover o gráfico"
              style={{
                padding: '3px 9px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: toolMode === 'pan' ? 'var(--primary)' : 'var(--code-bg)',
                color: toolMode === 'pan' ? '#fff' : 'var(--text)',
                border: `1px solid ${toolMode === 'pan' ? 'var(--primary)' : 'var(--card-border)'}`
              }}
            >
              ✋ {toolMode === 'pan' ? 'Arraste o gráfico' : 'Mover'}
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Diminuir zoom (afastar)"
              style={{
                padding: '3px 9px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'var(--code-bg)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)'
              }}
            >
              🔍−
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              disabled={!viewBoxBounds && toolMode === 'none'}
              title="Ajustar ao zoom original"
              style={{
                padding: '3px 9px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: viewBoxBounds || toolMode !== 'none' ? 'pointer' : 'not-allowed',
                opacity: viewBoxBounds || toolMode !== 'none' ? 1 : 0.45,
                background: 'var(--code-bg)',
                color: 'var(--primary)',
                border: '1px solid var(--card-border)'
              }}
            >
              ↺ Ajustar ao Original{viewBoxBounds ? ` (${zoomFactor.toFixed(1)}×)` : ''}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>× Polo MA</span>
            <span style={{ color: '#3b82f6', fontWeight: 700 }}>○ Zero MA</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>● Polo MF</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          onClick={handleSvgClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            background: 'rgba(15, 23, 42, 0.35)',
            borderRadius: '6px',
            userSelect: 'none',
            cursor: toolMode === 'zoom' ? 'zoom-in' : toolMode === 'pan' ? (panDrag ? 'grabbing' : 'grab') : 'default'
          }}
        >
          <defs>
            <clipPath id="s-plane-plot-clip">
              <rect x={padL} y={padT} width={plotW} height={plotH} />
            </clipPath>
          </defs>
          <g clipPath="url(#s-plane-plot-clip)">
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
          {reTicks.map(v => {
            const tx = toX(v);
            const nearRealMarker = activePoints.some(
              p => Math.abs(p.im) <= 0.05 && Math.abs(toX(p.re) - tx) < 16
            );
            return (
              <g key={`rx-${v}`}>
                <line x1={tx} y1={padT} x2={tx} y2={padT + plotH} stroke="rgba(148, 163, 184, 0.12)" strokeWidth="1" />
                {zeroY >= padT && zeroY <= padT + plotH && (
                  <>
                    <line x1={tx} y1={zeroY - 3} x2={tx} y2={zeroY + 3} stroke="rgba(148, 163, 184, 0.5)" strokeWidth="1" />
                    {!nearRealMarker && (
                      <text x={tx} y={zeroY + 13} textAnchor="middle" fontSize="9.5" fill="#94a3b8">
                        {v}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
          {imTicks.map(v => {
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
          {zeroY >= padT && zeroY <= padT + plotH && (
            <line x1={padL} y1={zeroY} x2={padL + plotW} y2={zeroY} stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1" />
          )}
          {zeroX >= padL && zeroX <= padL + plotW && (
            <line x1={zeroX} y1={padT} x2={zeroX} y2={padT + plotH} stroke="rgba(248, 113, 113, 0.55)" strokeDasharray="4 3" strokeWidth="1.2" />
          )}

          {/* Reta de zeta constante opcional */}
          {zetaTarget && zetaTarget > 0 && zetaTarget < 1 && (
            (() => {
              const tanBeta = Math.sqrt(1 - zetaTarget * zetaTarget) / zetaTarget;
              const reEdge = Math.min(activeBounds.minRe, -100);
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
            if (pt.re < activeBounds.minRe || pt.re > activeBounds.maxRe || pt.im < activeBounds.minIm || pt.im > activeBounds.maxIm) return null;
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

          {/* Polos e Zeros interativos com valores visíveis e sem sobreposição */}
          {(() => {
            const placedBoxes: { x1: number; x2: number; y: number }[] = [];
            const placeLabel = (
              idealX: number,
              idealY: number,
              anchor: 'start' | 'middle' | 'end',
              text: string,
              dir: -1 | 1
            ) => {
              const w = text.length * 5.6 + 6;
              const x1 = anchor === 'middle' ? idealX - w / 2 : anchor === 'end' ? idealX - w : idealX;
              const x2 = x1 + w;
              let y = idealY;
              for (let attempt = 0; attempt < 4; attempt++) {
                const collides = placedBoxes.some(b => x1 < b.x2 && x2 > b.x1 && Math.abs(y - b.y) < 12);
                if (!collides) break;
                y += dir * 13;
              }
              placedBoxes.push({ x1, x2, y });
              return { x: idealX, y, shifted: Math.abs(y - idealY) > 1 };
            };

            return activePoints.map((pt, idx) => {
              if (pt.re < activeBounds.minRe || pt.re > activeBounds.maxRe || pt.im < activeBounds.minIm || pt.im > activeBounds.maxIm) return null;
              const cx = toX(pt.re);
              const cy = toY(pt.im);
              const isHovered = hoveredIdx === idx;
              const coordText = fmtComplex(pt.re, pt.im);
              const isUpper = pt.im > 0.05;
              const isLower = pt.im < -0.05;

              if (pt.kind === 'ol-pole') {
                const idealY = isUpper ? cy - 9 : cy + 16;
                const dir: -1 | 1 = isUpper ? -1 : 1;
                const pos = placeLabel(cx, idealY, 'middle', coordText, dir);
                return (
                  <g
                    key={`pt-${idx}`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <circle cx={cx} cy={cy} r={10} fill="transparent" />
                    {pos.shifted && <line x1={cx} y1={cy} x2={pos.x} y2={pos.y - dir * 4} stroke="rgba(252,165,165,0.45)" strokeWidth="1" />}
                    <line x1={cx - 4.5} y1={cy - 4.5} x2={cx + 4.5} y2={cy + 4.5} stroke="#ef4444" strokeWidth={isHovered ? 3 : 2.2} />
                    <line x1={cx - 4.5} y1={cy + 4.5} x2={cx + 4.5} y2={cy - 4.5} stroke="#ef4444" strokeWidth={isHovered ? 3 : 2.2} />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill="#fca5a5"
                      stroke="#0f172a"
                      strokeWidth="3"
                      style={{ paintOrder: 'stroke' }}
                    >
                      {coordText}
                    </text>
                  </g>
                );
              }

              if (pt.kind === 'ol-zero') {
                const idealY = isLower ? cy + 16 : cy - 10;
                const dir: -1 | 1 = isLower ? 1 : -1;
                const pos = placeLabel(cx, idealY, 'middle', coordText, dir);
                return (
                  <g
                    key={`pt-${idx}`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <circle cx={cx} cy={cy} r={10} fill="transparent" />
                    {pos.shifted && <line x1={cx} y1={cy} x2={pos.x} y2={pos.y - dir * 4} stroke="rgba(147,197,253,0.45)" strokeWidth="1" />}
                    <circle cx={cx} cy={cy} r={isHovered ? 6 : 4.8} fill="none" stroke="#3b82f6" strokeWidth="2.2" />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill="#93c5fd"
                      stroke="#0f172a"
                      strokeWidth="3"
                      style={{ paintOrder: 'stroke' }}
                    >
                      {coordText}
                    </text>
                  </g>
                );
              }

              const clIsComplex = Math.abs(pt.im) > 0.05;
              const clX = clIsComplex ? (pt.re <= 0 ? cx - 8 : cx + 8) : cx;
              const clY = clIsComplex ? cy + 3 : cy - 10;
              const clAnchor: 'start' | 'middle' | 'end' = clIsComplex ? (pt.re <= 0 ? 'end' : 'start') : 'middle';
              const dir: -1 | 1 = clIsComplex ? (pt.im >= 0 ? -1 : 1) : -1;
              const pos = placeLabel(clX, clY, clAnchor, coordText, dir);

              return (
                <g
                  key={`pt-${idx}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <circle cx={cx} cy={cy} r={10} fill="transparent" />
                  {pos.shifted && <line x1={cx} y1={cy} x2={pos.x} y2={pos.y + 4} stroke="rgba(110,231,183,0.45)" strokeWidth="1" />}
                  <circle cx={cx} cy={cy} r={isHovered ? 6 : 4.5} fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                  <text
                    x={pos.x}
                    y={pos.y}
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
            });
          })()}
          </g>

          {/* Rótulos dos eixos */}
          {zeroY >= padT && zeroY <= padT + plotH && (
            <text x={padL + plotW - 4} y={zeroY - 6} textAnchor="end" fontSize="10" fill="#94a3b8">
              Re(s)
            </text>
          )}
          {zeroX >= padL && zeroX <= padL + plotW && (
            <text x={zeroX + 6} y={padT + 11} fontSize="10" fill="#94a3b8">
              jω
            </text>
          )}
        </svg>

        {/* Slider Interativo de Ganho K no LGR */}
        <div
          className="no-print"
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--code-bg)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
            Ganho no LGR: {gainMult.toFixed(2)}× {Math.abs(gainMult - 1) < 0.01 ? '(Projeto)' : ''}
          </span>
          <input
            type="range"
            min={0.05}
            max={4}
            step={0.05}
            value={gainMult}
            onChange={e => setGainMult(Number(e.target.value))}
            aria-label="Variar multiplicador de ganho no Lugar das Raízes"
            style={{ flex: '1 1 180px', cursor: 'pointer' }}
          />
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: isUnstable ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.14)',
              color: isUnstable ? 'var(--danger)' : 'var(--success)',
              border: `1px solid ${isUnstable ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`
            }}
          >
            {isUnstable ? '⚠️ Instável (Semiplano Direito)' : '✓ Estável'}
          </span>
          {Math.abs(gainMult - 1) >= 0.01 && (
            <button
              type="button"
              onClick={() => setGainMult(1)}
              style={{
                padding: '3px 9px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'var(--card-bg)',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                cursor: 'pointer'
              }}
            >
              ↺ Voltar ao Projeto (1.00×)
            </button>
          )}
        </div>

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
          {activeClPoles.map((p, i) => (
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
