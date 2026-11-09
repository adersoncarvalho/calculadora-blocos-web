'use client';

import React, { useState } from 'react';
import { CompensatorResult } from './compensatorEngine';

interface PhaseDeficiencySvgProps {
  result: CompensatorResult;
}

export const PhaseDeficiencySvg: React.FC<PhaseDeficiencySvgProps> = ({ result }) => {
  const [showCompensatorVectors, setShowCompensatorVectors] = useState(true);

  // Escala e coordenadas SVG
  // O plano s vai de Re: [-10, 4] e Im: [-1, 5]
  // Largura SVG: 760, Altura: 420
  const width = 760;
  const height = 400;

  // Origem matemática (0,0) no SVG
  const xOrigin = 520;
  const yOrigin = 320;
  const scale = 50; // 50 pixels por unidade no plano s

  const toSvgX = (re: number) => xOrigin + re * scale;
  const toSvgY = (im: number) => yOrigin - im * scale;

  const sdX = toSvgX(result.sd.re); // sd = -3 + j3 -> 520 - 150 = 370
  const sdY = toSvgY(result.sd.im); // 320 - 150 = 170

  const p1X = toSvgX(0); // 520
  const p1Y = toSvgY(0); // 320

  const p2X = toSvgX(-3); // 370
  const p2Y = toSvgY(0); // 320

  const zcX = toSvgX(-result.zc);
  const zcY = toSvgY(0);

  // pc pode estar longe (ex: -62), então para visualização no gráfico limitamos a escala ou colocamos indicador visual
  const pcDisplayRe = Math.max(-9.2, -result.pc / 6.5);
  const pcX = toSvgX(pcDisplayRe);
  const pcY = toSvgY(0);

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
      {/* Cabeçalho do Gráfico */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quadro do Professor • Passo 2 em Detalhes
          </span>
          <h4 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', color: 'var(--text)' }}>
            Diagrama Vetorial no Plano Complexo s (Trigonometria Exata de Fase)
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setShowCompensatorVectors(prev => !prev)}
          className="btn-secondary"
          style={{ fontSize: '0.78rem', padding: '5px 10px', cursor: 'pointer' }}
        >
          {showCompensatorVectors ? 'Ocultar Vetores do Compensador (zc, pc)' : 'Exibir Vetores do Compensador (zc, pc)'}
        </button>
      </div>

      {/* SVG Canvas */}
      <div style={{ overflowX: 'auto', textAlign: 'center' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', background: '#0B132B', borderRadius: '8px', border: '1px solid #1E293B' }}
        >
          <defs>
            {/* Marcadores de seta */}
            <marker id="arrowRed" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#EF4444" />
            </marker>
            <marker id="arrowGreen" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
            </marker>
            <marker id="arrowBlue" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#38BDF8" />
            </marker>
            <marker id="arrowPurple" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#A855F7" />
            </marker>
            <marker id="arrowAxis" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#64748B" />
            </marker>
          </defs>

          {/* Grade quadriculada sutil */}
          <g stroke="#1E293B" strokeWidth="0.8" strokeDasharray="3 3">
            {[-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4].map(x => (
              <line key={`gx-${x}`} x1={toSvgX(x)} y1={20} x2={toSvgX(x)} y2={height - 20} />
            ))}
            {[-1, 0, 1, 2, 3, 4, 5].map(y => (
              <line key={`gy-${y}`} x1={20} y1={toSvgY(y)} x2={width - 20} y2={toSvgY(y)} />
            ))}
          </g>

          {/* Eixo Real Re(s) */}
          <line x1={30} y1={yOrigin} x2={width - 30} y2={yOrigin} stroke="#94A3B8" strokeWidth="1.8" markerEnd="url(#arrowAxis)" />
          <text x={width - 25} y={yOrigin + 18} fill="#94A3B8" fontSize="13" fontWeight="bold">Re(s)</text>

          {/* Eixo Imaginário Im(s) */}
          <line x1={xOrigin} y1={height - 30} x2={xOrigin} y2={30} stroke="#94A3B8" strokeWidth="1.8" markerEnd="url(#arrowAxis)" />
          <text x={xOrigin + 12} y={35} fill="#94A3B8" fontSize="13" fontWeight="bold">Im(s)</text>

          {/* Linhas de Projeção Ortogonal de sd (-3, +3) */}
          <line x1={sdX} y1={p2Y} x2={sdX} y2={sdY} stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1={sdX} y1={sdY} x2={p1X} y2={sdY} stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={p1X + 8} y={sdY + 4} fill="#C4B5FD" fontSize="12" fontWeight="600">j3 (wd)</text>
          <text x={sdX - 6} y={p2Y + 20} fill="#C4B5FD" fontSize="12" fontWeight="600">-3 (-σd)</text>

          {/* Polo 1: Origem p1 = 0 */}
          <g>
            <line x1={p1X - 6} y1={p1Y - 6} x2={p1X + 6} y2={p1Y + 6} stroke="#38BDF8" strokeWidth="3" />
            <line x1={p1X - 6} y1={p1Y + 6} x2={p1X + 6} y2={p1Y - 6} stroke="#38BDF8" strokeWidth="3" />
            <text x={p1X + 8} y={p1Y + 20} fill="#38BDF8" fontSize="12" fontWeight="700">p1 = 0</text>
          </g>

          {/* Polo 2: p2 = -3 */}
          <g>
            <line x1={p2X - 6} y1={p2Y - 6} x2={p2X + 6} y2={p2Y + 6} stroke="#F97316" strokeWidth="3" />
            <line x1={p2X - 6} y1={p2Y + 6} x2={p2X + 6} y2={p2Y - 6} stroke="#F97316" strokeWidth="3" />
            <text x={p2X - 30} y={p2Y + 20} fill="#F97316" fontSize="12" fontWeight="700">p2 = -3</text>
          </g>

          {/* Triângulo Didático do Quadro (Catetos 3 e 3) */}
          <polygon
            points={`${p1X},${p1Y} ${p2X},${p2Y} ${sdX},${sdY}`}
            fill="rgba(239, 68, 68, 0.08)"
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth="1"
          />

          {/* Vetor 1: Origem (0,0) -> sd (-3,3) em Vermelho (como no quadro do professor) */}
          <line
            x1={p1X}
            y1={p1Y}
            x2={sdX + 6}
            y2={sdY + 6}
            stroke="#EF4444"
            strokeWidth="2.5"
            markerEnd="url(#arrowRed)"
          />

          {/* Vetor 2: Polo p2 (-3,0) -> sd (-3,3) em Verde/Vermelho */}
          <line
            x1={p2X}
            y1={p2Y}
            x2={sdX}
            y2={sdY + 8}
            stroke="#10B981"
            strokeWidth="2.5"
            markerEnd="url(#arrowGreen)"
          />

          {/* Arco do ângulo interno theta1_prime = 45° */}
          <path
            d={`M ${p1X - 35} ${p1Y} A 35 35 0 0 0 ${p1X - 25} ${p1Y - 25}`}
            fill="none"
            stroke="#FBBF24"
            strokeWidth="2"
          />
          <text x={p1X - 58} y={p1Y - 14} fill="#FBBF24" fontSize="11" fontWeight="bold">θ1'=45°</text>

          {/* Arco do ângulo suplementar total theta1 = 135° */}
          <path
            d={`M ${p1X + 45} ${p1Y} A 45 45 0 0 0 ${p1X - 32} ${p1Y - 32}`}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.2"
          />
          <text x={p1X + 16} y={p1Y - 28} fill="#EF4444" fontSize="13" fontWeight="bold">θ1 = 135°</text>

          {/* Arco do ângulo theta2 = 90° (perpendicular vertical) */}
          <path
            d={`M ${p2X + 28} ${p2Y} A 28 28 0 0 0 ${p2X} ${p2Y - 28}`}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
          />
          <text x={p2X + 32} y={p2Y - 18} fill="#10B981" fontSize="13" fontWeight="bold">θ2 = 90°</text>

          {/* Vetores do Compensador (zc e pc) */}
          {showCompensatorVectors && (
            <g>
              {/* Zero do Compensador zc */}
              <circle cx={zcX} cy={zcY} r="5" fill="#38BDF8" stroke="#0284C7" strokeWidth="2" />
              <text x={zcX - 18} y={zcY + 20} fill="#38BDF8" fontSize="12" fontWeight="bold">
                -zc = -{result.zc.toFixed(2)}
              </text>
              <line
                x1={zcX}
                y1={zcY}
                x2={sdX + 4}
                y2={sdY + 5}
                stroke="#38BDF8"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                markerEnd="url(#arrowBlue)"
              />
              <text x={(zcX + sdX) / 2 - 24} y={(zcY + sdY) / 2 + 10} fill="#38BDF8" fontSize="11" fontWeight="bold">
                θzc ≈ 47.9°
              </text>

              {/* Polo do Compensador pc (ilustrativo no limite do gráfico) */}
              <line x1={pcX - 5} y1={pcY - 5} x2={pcX + 5} y2={pcY + 5} stroke="#EC4899" strokeWidth="2.5" />
              <line x1={pcX - 5} y1={pcY + 5} x2={pcX + 5} y2={pcY - 5} stroke="#EC4899" strokeWidth="2.5" />
              <text x={pcX - 24} y={pcY + 20} fill="#EC4899" fontSize="12" fontWeight="bold">
                -pc = -{result.pc.toFixed(1)}
              </text>
              <line
                x1={pcX}
                y1={pcY}
                x2={sdX - 6}
                y2={sdY + 5}
                stroke="#EC4899"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                markerEnd="url(#arrowPurple)"
              />
              <text x={(pcX + sdX) / 2 - 20} y={(pcY + sdY) / 2 - 8} fill="#EC4899" fontSize="11" fontWeight="bold">
                θpc ≈ 2.9°
              </text>
            </g>
          )}

          {/* Ponto sd = -3 + j3 (Polo Desejado) */}
          <g>
            <circle cx={sdX} cy={sdY} r="7" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
            <text x={sdX - 90} y={sdY - 12} fill="#34D399" fontSize="14" fontWeight="800">
              sd = -3 + j3
            </text>
          </g>
        </svg>
      </div>

      {/* Caixa Didática com os Cálculos Exatos do Quadro */}
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.86rem', marginBottom: '6px' }}>
            1. Ângulo do Polo na Origem (p1 = 0)
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: '1.6' }}>
            O vetor sai de 0 e vai até (-3 + j3). Pelo triângulo retângulo de catetos 3 e 3:
            <br />
            <code>θ1' = Tg⁻¹( 3 / (3 - 0) ) = 45°</code> (ângulo interno agudo)
            <br />
            Por estar no 2º quadrante, medido do eixo real positivo:
            <br />
            <b><code>θ1 = 180° - 45° = 135°</code></b>
          </div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontWeight: 700, color: '#10B981', fontSize: '0.86rem', marginBottom: '6px' }}>
            2. Ângulo do Polo em -3 (p2 = -3)
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: '1.6' }}>
            O vetor sai de -3 e vai até (-3 + j3). A componente real é nula:
            <br />
            <code>sd - (-3) = (-3 + j3) + 3 = 0 + j3</code>
            <br />
            Trata-se de uma reta vertical ascendente:
            <br />
            <b><code>θ2 = 90°</code></b>
          </div>
        </div>

        <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.86rem', marginBottom: '6px' }}>
            3. Soma da Planta & Deficiência de Fase
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: '1.6' }}>
            Fase total da planta sem compensador:
            <br />
            <code>∠G(sd) = - (θ1 + θ2) = - (135° + 90°) = -225°</code>
            <br />
            Condição do LGR de -180°:
            <br />
            <b><code>ϕdef = -180° - (-225°) = +45°</code></b>
            <br />
            <span style={{ color: '#38BDF8', fontWeight: 600 }}>
              {showCompensatorVectors ? 'Conferência: θzc - θpc = 47.9° - 2.9° = 45.0°' : 'O compensador deve suprir exatamente +45°.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
