'use client';

import React, { useState, useRef, useMemo, useId } from 'react';

export interface ChartSeries {
  id: string;
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
  strokeWidth?: number;
  showLandmarks?: boolean;
  landmarkMode?: 'output' | 'error';
}

interface InteractiveTimeChartProps {
  title: string;
  xValues: number[];
  series: ChartSeries[];
  inputType?: 'step' | 'ramp' | 'parabola' | 'combined';
  height?: number;
}

interface LandmarkPoint {
  idx: number;
  x: number;
  y: number;
  label: string;
  color: string;
  anchor?: 'start' | 'middle' | 'end';
  dy?: number;
}

export const InteractiveTimeChart: React.FC<InteractiveTimeChartProps> = ({
  title,
  xValues,
  series,
  inputType = 'step',
  height = 240
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showSettlingBand, setShowSettlingBand] = useState<boolean>(true);
  const [toolMode, setToolMode] = useState<'none' | 'zoom' | 'pan'>('none');
  const [zoomBounds, setZoomBounds] = useState<{ xMin: number; xMax: number; yMin: number; yMax: number } | null>(null);
  const [panDrag, setPanDrag] = useState<{
    startX: number;
    startY: number;
    startBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipId = useId();

  const w = 540;
  const h = height;
  const padL = 48;
  const padR = 24;
  const padT = 22;
  const padB = 34;

  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const defaultBounds = useMemo(() => {
    const x0 = xValues.length > 0 ? xValues[0] : 0;
    const x1 = xValues.length > 0 ? xValues[xValues.length - 1] : 1;
    const allY: number[] = [];
    for (const s of series) {
      for (const v of s.values) {
        if (Number.isFinite(v)) allY.push(v);
      }
    }
    if (allY.length === 0) allY.push(0, 1);
    let minV = Math.min(...allY);
    let maxV = Math.max(...allY);
    if (Math.abs(maxV - minV) < 1e-6) {
      minV -= 0.5;
      maxV += 0.5;
    }
    const margin = (maxV - minV) * 0.14;
    return {
      xMin: x0,
      xMax: x1 > x0 ? x1 : x0 + 1,
      yMin: minV - margin,
      yMax: maxV + margin
    };
  }, [xValues, series]);

  React.useEffect(() => {
    setZoomBounds(null);
    setToolMode('none');
    setPanDrag(null);
  }, [xValues, series]);

  const { xMin, xMax, yMin, yMax } = zoomBounds || defaultBounds;
  const zoomFactor = (defaultBounds.xMax - defaultBounds.xMin) / (xMax - xMin);

  const settlingBand = useMemo(() => {
    if (!showSettlingBand || inputType !== 'step' || xValues.length < 5) return null;
    const outputSeries = series.find(s => s.landmarkMode === 'output' && s.values.length === xValues.length);
    if (!outputSeries) return null;
    const yFinal = outputSeries.values[outputSeries.values.length - 1];
    if (!Number.isFinite(yFinal) || Math.abs(yFinal) < 1e-4) return null;
    const tol = 0.02 * Math.abs(yFinal);
    return { yFinal, yLow: yFinal - tol, yHigh: yFinal + tol };
  }, [showSettlingBand, inputType, xValues, series]);

  const toPxX = (xv: number) => padL + ((xv - xMin) / (xMax - xMin)) * plotW;
  const toPxY = (yv: number) => padT + plotH - ((yv - yMin) / (yMax - yMin)) * plotH;

  // Cálculo automático apenas dos pontos principais de relevância
  const landmarks = useMemo<LandmarkPoint[]>(() => {
    if (!showLandmarks || xValues.length < 5) return [];
    const pts: LandmarkPoint[] = [];
    const lastIdx = xValues.length - 1;

    for (const s of series) {
      if (!s.showLandmarks || s.values.length !== xValues.length) continue;
      const ys = s.values;
      const yFinal = ys[lastIdx];

      if (s.landmarkMode === 'error') {
        // Ponto principal no erro: Erro Estacionário Final (ess)
        pts.push({
          idx: lastIdx,
          x: xValues[lastIdx],
          y: yFinal,
          label: `ess=${yFinal.toFixed(3)}`,
          color: s.color,
          anchor: 'end',
          dy: -10
        });
        continue;
      }

      // Modo 'output':
      // 1. Ponto de Pico (Tp, Mp) apenas para entrada em degrau com sobressinal real (> 0.5%)
      if (inputType === 'step') {
        let peakIdx = 0;
        let peakVal = ys[0];
        for (let i = 1; i < ys.length; i++) {
          if (ys[i] > peakVal) {
            peakVal = ys[i];
            peakIdx = i;
          }
        }
        const refAmp = Math.abs(yFinal) > 1e-4 ? Math.abs(yFinal) : 1;
        if (peakIdx > 2 && peakIdx < lastIdx - 3 && peakVal - yFinal > 0.005 * refAmp) {
          pts.push({
            idx: peakIdx,
            x: xValues[peakIdx],
            y: peakVal,
            label: `Pico (${xValues[peakIdx].toFixed(2)}s, ${peakVal.toFixed(2)})`,
            color: s.color,
            anchor: peakIdx < lastIdx * 0.6 ? 'start' : 'end',
            dy: -10
          });
        }

        // 2. Tempo de Acomodação (Ts 2%) se estabilizou antes do fim da janela
        if (Math.abs(yFinal) > 1e-4) {
          const tol = 0.02 * Math.abs(yFinal);
          let lastOutIdx = -1;
          for (let i = lastIdx; i >= 0; i--) {
            if (Math.abs(ys[i] - yFinal) > tol) {
              lastOutIdx = i;
              break;
            }
          }
          const tsIdx = lastOutIdx + 1;
          if (lastOutIdx >= 0 && tsIdx < lastIdx - 8 && tsIdx > 3) {
            pts.push({
              idx: tsIdx,
              x: xValues[tsIdx],
              y: ys[tsIdx],
              label: `Ts=${xValues[tsIdx].toFixed(2)}s`,
              color: '#f59e0b',
              anchor: tsIdx < lastIdx * 0.7 ? 'middle' : 'end',
              dy: 16
            });
          }
        }
      }

      // 3. Ponto Final em Regime Permanente
      pts.push({
        idx: lastIdx,
        x: xValues[lastIdx],
        y: yFinal,
        label: `Final=${yFinal.toFixed(2)}`,
        color: s.color,
        anchor: 'end',
        dy: -10
      });
    }

    return pts;
  }, [showLandmarks, xValues, series, inputType]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || xValues.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();

    if (toolMode === 'pan' && panDrag) {
      const scaleX = (panDrag.startBounds.xMax - panDrag.startBounds.xMin) / ((plotW / w) * rect.width);
      const scaleY = (panDrag.startBounds.yMax - panDrag.startBounds.yMin) / ((plotH / h) * rect.height);
      const dx = (e.clientX - panDrag.startX) * scaleX;
      const dy = (e.clientY - panDrag.startY) * scaleY;
      setZoomBounds({
        xMin: panDrag.startBounds.xMin - dx,
        xMax: panDrag.startBounds.xMax - dx,
        yMin: panDrag.startBounds.yMin + dy,
        yMax: panDrag.startBounds.yMax + dy
      });
      return;
    }

    const scaleX = w / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;

    if (svgX < padL - 6 || svgX > w - padR + 6) {
      setHoverIdx(null);
      return;
    }

    const frac = Math.max(0, Math.min(1, (svgX - padL) / plotW));
    const targetT = xMin + frac * (xMax - xMin);

    let bestIdx = 0;
    let bestDiff = Math.abs(xValues[0] - targetT);
    for (let i = 1; i < xValues.length; i++) {
      const diff = Math.abs(xValues[i] - targetT);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    setHoverIdx(bestIdx);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode !== 'zoom' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickSvgX = ((e.clientX - rect.left) / rect.width) * w;
    const clickSvgY = ((e.clientY - rect.top) / rect.height) * h;
    const targetX = xMin + ((clickSvgX - padL) / plotW) * (xMax - xMin);
    const targetY = yMax - ((clickSvgY - padT) / plotH) * (yMax - yMin);
    const newHalfW = Math.max(0.05, (xMax - xMin) / 4);
    const newHalfH = Math.max(0.02, (yMax - yMin) / 4);
    setZoomBounds({
      xMin: targetX - newHalfW,
      xMax: targetX + newHalfW,
      yMin: targetY - newHalfH,
      yMax: targetY + newHalfH
    });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode !== 'pan') return;
    e.preventDefault();
    setPanDrag({ startX: e.clientX, startY: e.clientY, startBounds: { xMin, xMax, yMin, yMax } });
  };

  const handleMouseUp = () => {
    if (panDrag) setPanDrag(null);
  };

  const handleZoomOut = () => {
    const curW = xMax - xMin;
    const curH = yMax - yMin;
    const defW = defaultBounds.xMax - defaultBounds.xMin;
    if (curW * 1.6 >= defW) {
      setZoomBounds(null);
      return;
    }
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    setZoomBounds({
      xMin: cx - (curW * 1.6) / 2,
      xMax: cx + (curW * 1.6) / 2,
      yMin: cy - (curH * 1.6) / 2,
      yMax: cy + (curH * 1.6) / 2
    });
  };

  const handleResetZoom = () => {
    setZoomBounds(null);
    setToolMode('none');
    setPanDrag(null);
  };

  // Ticks de grade (4 intervalos)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(f => xMin + f * (xMax - xMin));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => yMin + f * (yMax - yMin));

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '6px',
        padding: '0.75rem',
        position: 'relative'
      }}
    >
      {/* Cabeçalho com Título e Botão de Pontos Principais */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '0.35rem'
        }}
      >
        <div style={{ fontSize: '0.79rem', fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div className="no-print" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setToolMode(m => (m === 'zoom' ? 'none' : 'zoom'))}
            title="Lupa +: clique no gráfico onde deseja dar zoom"
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: toolMode === 'zoom' ? 'var(--primary)' : 'var(--code-bg)',
              color: toolMode === 'zoom' ? '#fff' : 'var(--text)',
              border: `1px solid ${toolMode === 'zoom' ? 'var(--primary)' : 'var(--card-border)'}`
            }}
          >
            🔍+
          </button>
          <button
            type="button"
            onClick={() => setToolMode(m => (m === 'pan' ? 'none' : 'pan'))}
            title="Mãozinha: clique e arraste para mover o gráfico"
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: toolMode === 'pan' ? 'var(--primary)' : 'var(--code-bg)',
              color: toolMode === 'pan' ? '#fff' : 'var(--text)',
              border: `1px solid ${toolMode === 'pan' ? 'var(--primary)' : 'var(--card-border)'}`
            }}
          >
            ✋
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={!zoomBounds}
            title="Diminuir zoom"
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: zoomBounds ? 'pointer' : 'not-allowed',
              opacity: zoomBounds ? 1 : 0.45,
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
            disabled={!zoomBounds && toolMode === 'none'}
            title="Ajustar ao original"
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: zoomBounds || toolMode !== 'none' ? 'pointer' : 'not-allowed',
              opacity: zoomBounds || toolMode !== 'none' ? 1 : 0.45,
              background: 'var(--code-bg)',
              color: 'var(--primary)',
              border: '1px solid var(--card-border)'
            }}
          >
            ↺{zoomBounds ? ` ${zoomFactor.toFixed(1)}×` : ''}
          </button>
          {series.some(s => s.landmarkMode === 'output') && inputType === 'step' && (
            <button
              type="button"
              onClick={() => setShowSettlingBand(p => !p)}
              title="Mostrar/ocultar faixa de acomodação ±2%"
              style={{
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: 700,
                background: showSettlingBand ? 'rgba(245, 158, 11, 0.14)' : 'var(--code-bg)',
                color: showSettlingBand ? '#f59e0b' : 'var(--text-muted)',
                border: `1px solid ${showSettlingBand ? '#f59e0b' : 'var(--card-border)'}`,
                cursor: 'pointer'
              }}
            >
              ±2%
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLandmarks(p => !p)}
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              background: showLandmarks ? 'rgba(2, 132, 199, 0.14)' : 'var(--code-bg)',
              color: showLandmarks ? 'var(--primary)' : 'var(--text-muted)',
              border: `1px solid ${showLandmarks ? 'var(--primary)' : 'var(--card-border)'}`,
              cursor: 'pointer'
            }}
          >
            {showLandmarks ? '● Pontos' : '○ Pontos'}
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        onClick={handleSvgClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoverIdx(null);
          handleMouseUp();
        }}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          cursor: toolMode === 'zoom' ? 'zoom-in' : toolMode === 'pan' ? (panDrag ? 'grabbing' : 'grab') : 'crosshair',
          userSelect: 'none'
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        {/* Fundo do gráfico */}
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="var(--code-bg)"
          stroke="var(--card-border)"
        />

        {/* Grade Horizontal e Ticks Y */}
        {yTicks.map((yv, i) => {
          const py = toPxY(yv);
          return (
            <g key={`ytick-${i}`}>
              <line
                x1={padL}
                y1={py}
                x2={w - padR}
                y2={py}
                stroke="var(--card-border)"
                strokeWidth="0.8"
                strokeDasharray="3,3"
              />
              <text x={padL - 5} y={py + 3} fontSize="9.5" fill="var(--text-muted)" textAnchor="end">
                {Math.abs(yv) >= 100 ? yv.toFixed(0) : yv.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Grade Vertical e Ticks X */}
        {xTicks.map((xv, i) => {
          const px = toPxX(xv);
          return (
            <g key={`xtick-${i}`}>
              <line
                x1={px}
                y1={padT}
                x2={px}
                y2={h - padB}
                stroke="var(--card-border)"
                strokeWidth="0.8"
                strokeDasharray="3,3"
              />
              <text x={px} y={h - padB + 13} fontSize="9.5" fill="var(--text-muted)" textAnchor="middle">
                {xv.toFixed(1)}s
              </text>
            </g>
          );
        })}

        {/* Conteúdo recortado à área do gráfico (faixa ±2%, curvas e pontos) */}
        <g clipPath={`url(#${clipId})`}>
        {settlingBand && (
          <g>
            <rect
              x={padL}
              y={toPxY(settlingBand.yHigh)}
              width={plotW}
              height={Math.max(1, toPxY(settlingBand.yLow) - toPxY(settlingBand.yHigh))}
              fill="rgba(245, 158, 11, 0.10)"
            />
            <line
              x1={padL}
              y1={toPxY(settlingBand.yHigh)}
              x2={w - padR}
              y2={toPxY(settlingBand.yHigh)}
              stroke="rgba(245, 158, 11, 0.45)"
              strokeWidth="0.9"
              strokeDasharray="3,3"
            />
            <line
              x1={padL}
              y1={toPxY(settlingBand.yLow)}
              x2={w - padR}
              y2={toPxY(settlingBand.yLow)}
              stroke="rgba(245, 158, 11, 0.45)"
              strokeWidth="0.9"
              strokeDasharray="3,3"
            />
          </g>
        )}

        {/* Curvas das Séries */}
        {series.map(s => {
          if (s.values.length !== xValues.length) return null;
          const d = xValues
            .map((xv, i) => {
              const px = toPxX(xv).toFixed(1);
              const py = toPxY(s.values[i]).toFixed(1);
              return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
            })
            .join(' ');
          return (
            <path
              key={s.id}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={s.strokeWidth ?? 2.2}
              strokeDasharray={s.dashed ? '6,4' : undefined}
            />
          );
        })}

        {/* Pontos Fixos Principais de Relevância */}
        {landmarks.map((pt, idx) => {
          const px = toPxX(pt.x);
          const py = toPxY(pt.y);
          const labelY = Math.max(padT + 10, Math.min(h - padB - 6, py + (pt.dy ?? -10)));
          const labelX =
            pt.anchor === 'end'
              ? Math.min(w - padR - 2, px)
              : pt.anchor === 'start'
              ? Math.max(padL + 2, px)
              : px;

          return (
            <g key={`lm-${idx}`}>
              <circle
                cx={px}
                cy={py}
                r="4"
                fill={pt.color}
                stroke="var(--card-bg)"
                strokeWidth="1.5"
              />
              <text
                x={labelX}
                y={labelY}
                fontSize="9.5"
                fontWeight="700"
                fill={pt.color}
                textAnchor={pt.anchor || 'middle'}
              >
                {pt.label}
              </text>
            </g>
          );
        })}
        </g>

        {/* Mira Vertical e Tooltip Interativo ao Passar o Mouse */}
        {hoverIdx !== null && xValues[hoverIdx] !== undefined && (
          <g>
            {(() => {
              const hx = toPxX(xValues[hoverIdx]);
              const showLeft = hx > padL + plotW * 0.58;
              const boxW = 165;
              const boxH = 22 + series.length * 15;
              const boxX = showLeft ? hx - boxW - 10 : hx + 10;
              const boxY = padT + 6;

              return (
                <>
                  <line
                    x1={hx}
                    y1={padT}
                    x2={hx}
                    y2={h - padB}
                    stroke="var(--primary)"
                    strokeWidth="1.2"
                    strokeDasharray="4,3"
                  />

                  {series.map(s => {
                    const yv = s.values[hoverIdx];
                    if (yv === undefined) return null;
                    return (
                      <circle
                        key={`hc-${s.id}`}
                        cx={hx}
                        cy={toPxY(yv)}
                        r="4.2"
                        fill={s.color}
                        stroke="var(--card-bg)"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  <g transform={`translate(${boxX}, ${boxY})`}>
                    <rect
                      x="0"
                      y="0"
                      width={boxW}
                      height={boxH}
                      rx="5"
                      fill="var(--card-bg)"
                      stroke="var(--primary)"
                      strokeWidth="1"
                      opacity="0.96"
                    />
                    <text x="8" y="14" fontSize="10" fontWeight="800" fill="var(--primary)">
                      t = {xValues[hoverIdx].toFixed(3)} s
                    </text>
                    {series.map((s, si) => {
                      const val = s.values[hoverIdx];
                      const shortLbl = s.label.length > 15 ? s.label.slice(0, 15) + '…' : s.label;
                      return (
                        <g key={`ht-${s.id}`} transform={`translate(8, ${28 + si * 15})`}>
                          <circle cx="3" cy="-3" r="3" fill={s.color} />
                          <text x="10" y="0" fontSize="9.5" fontWeight="600" fill="var(--text)">
                            {shortLbl}: {val !== undefined ? val.toFixed(4) : '-'}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </>
              );
            })()}
          </g>
        )}

        {/* Título do eixo X */}
        <text x={padL + plotW / 2} y={h - 4} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
          Tempo (s) — passe o mouse para inspecionar pontos
        </text>
      </svg>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.72rem', marginTop: '0.35rem' }}>
        {series.map(s => (
          <span key={`leg-${s.id}`} style={{ color: s.color, fontWeight: s.dashed ? 600 : 700 }}>
            {s.dashed ? '---' : '━━'} {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};
