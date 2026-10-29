'use client';

import React from 'react';
import { RDiagram, RNode, REdge } from './graphicalReduction';

interface EquivalentDiagramRendererProps {
  diagram: RDiagram;
  stepTitle?: string;
  className?: string;
}

/**
 * Renderizador SVG de Diagrama Equivalente para as etapas de redução gráfica progressiva.
 * Suporta modo claro e escuro usando variáveis CSS do tema (--bg, --card-bg, --card-border, --text, --primary).
 */
export const EquivalentDiagramRenderer: React.FC<EquivalentDiagramRendererProps> = ({
  diagram,
  stepTitle,
  className = ''
}) => {
  const reactId = React.useId();
  const uid = reactId.replace(/[^a-zA-Z0-9]/g, '');
  const arrFwdId = `arr-fwd-${uid}`;
  const arrBwdId = `arr-bwd-${uid}`;

  const { nodes, edges, inputId, outputId } = diagram;

  // Separação dos nós entre caminho direto (linha superior Y=70) e ramo de retorno (Y=140)
  const isInput = (id: string) => id === inputId;
  const isOutput = (id: string) => id === outputId;

  // Encontra ordem topológica dos nós no caminho direto
  const fwdOrder: string[] = [inputId];
  const visitedFwd = new Set<string>([inputId]);

  let current = inputId;
  while (current && current !== outputId) {
    const nextEdge = edges.find(
      e => e.from === current && e.to !== current && !visitedFwd.has(e.to)
    );
    if (!nextEdge) break;
    fwdOrder.push(nextEdge.to);
    visitedFwd.add(nextEdge.to);
    current = nextEdge.to;
  }
  if (!fwdOrder.includes(outputId)) {
    fwdOrder.push(outputId);
  }

  // Nós que não estão no caminho direto ficam no nível inferior (retorno/compensação)
  const otherNodes = nodes.filter(n => !fwdOrder.includes(n.id));

  const totalCols = Math.max(3, fwdOrder.length);
  const svgWidth = Math.max(520, totalCols * 110 + 60);
  const svgHeight = otherNodes.length > 0 || edges.some(e => {
    const fIdx = fwdOrder.indexOf(e.from);
    const tIdx = fwdOrder.indexOf(e.to);
    return fIdx > -1 && tIdx > -1 && fIdx > tIdx;
  }) ? 170 : 120;

  const yFwd = 55;
  const yBwd = 130;

  const nodePositions = new Map<string, { x: number; y: number }>();

  // Posiciona nós da linha direta
  const colSpacing = (svgWidth - 90) / (totalCols - 1);
  fwdOrder.forEach((id, idx) => {
    nodePositions.set(id, {
      x: 45 + idx * colSpacing,
      y: yFwd
    });
  });

  // Posiciona nós do nível inferior
  otherNodes.forEach((n, idx) => {
    // Alinha horizontalmente entre o somador e a saída
    const step = (svgWidth - 180) / (otherNodes.length + 1);
    nodePositions.set(n.id, {
      x: svgWidth - 120 - (idx + 1) * step,
      y: yBwd
    });
  });

  // Limpa rótulos LaTeX para exibição visual limpa no SVG
  const cleanLabel = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/\\mathrm\{([^}]+)\}/g, '$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
      .replace(/\\left\(/g, '(')
      .replace(/\\right\)/g, ')')
      .replace(/\\,/g, '·')
      .replace(/\\cdot/g, '·')
      .replace(/_\{([^}]+)\}/g, '$1')
      .replace(/_/g, '')
      .replace(/\\boxed\{([^}]+)\}/g, '$1');
  };

  return (
    <div
      className={`equivalent-diagram-card ${className}`}
      style={{
        background: 'var(--code-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px',
        padding: '0.75rem',
        marginTop: '0.6rem',
        marginBottom: '0.6rem',
        overflowX: 'auto',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {stepTitle && (
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '0.4rem'
          }}
        >
          {stepTitle}
        </div>
      )}

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{
          width: '100%',
          minWidth: `${Math.min(svgWidth, 420)}px`,
          height: 'auto',
          display: 'block'
        }}
      >
        <defs>
          {/* Marcador de seta para frente */}
          <marker
            id={arrFwdId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--primary)" />
          </marker>
          {/* Marcador de seta para retorno */}
          <marker
            id={arrBwdId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
          </marker>
        </defs>

        {/* Linhas de conexão (Edges) */}
        {edges.map(e => {
          const fromPos = nodePositions.get(e.from) || { x: 30, y: yFwd };
          const toPos = nodePositions.get(e.to) || { x: svgWidth - 30, y: yFwd };
          const isFeedback = fromPos.x > toPos.x;
          const color = isFeedback ? '#d97706' : 'var(--primary)';
          const markerId = isFeedback ? `url(#${arrBwdId})` : `url(#${arrFwdId})`;

          let pathD = '';
          let midX = (fromPos.x + toPos.x) / 2;
          let midY = (fromPos.y + toPos.y) / 2;

          if (!isFeedback && Math.abs(fromPos.y - toPos.y) < 5) {
            // Ramo direto horizontal
            pathD = `M ${fromPos.x} ${fromPos.y} L ${toPos.x - 14} ${toPos.y}`;
            midY = fromPos.y;
          } else if (isFeedback) {
            // Ramo de retorno: desce para a linha inferior e volta para a esquerda
            const dropY = Math.max(fromPos.y, toPos.y) < yBwd ? yBwd : yBwd + 15;
            pathD = `M ${fromPos.x} ${fromPos.y + 12} L ${fromPos.x} ${dropY} L ${toPos.x} ${dropY} L ${toPos.x} ${toPos.y + 14}`;
            midX = (fromPos.x + toPos.x) / 2;
            midY = dropY;
          } else {
            // Ramo ortogonal intermediário
            pathD = `M ${fromPos.x} ${fromPos.y} L ${midX} ${fromPos.y} L ${midX} ${toPos.y} L ${toPos.x - 12} ${toPos.y}`;
          }

          const hasBlock = e.label && e.label !== '1' && e.label !== '-1';
          const txtLabel = cleanLabel(e.label);

          return (
            <g key={e.id}>
              {/* Linha com seta */}
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2}
                markerEnd={markerId}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Bloco sobre a linha */}
              {hasBlock && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x={-Math.max(28, (txtLabel.length * 7) / 2 + 8)}
                    y={-14}
                    width={Math.max(56, txtLabel.length * 7 + 16)}
                    height={28}
                    rx={5}
                    fill="var(--card-bg)"
                    stroke={color}
                    strokeWidth={1.8}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fill="var(--text)"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {txtLabel}
                  </text>
                </g>
              )}

              {/* Sinal + ou - próximo ao somador de destino */}
              {e.sign === '-' && (
                <text
                  x={toPos.x - (isFeedback ? -8 : 16)}
                  y={toPos.y + (isFeedback ? 18 : -8)}
                  fontSize="12"
                  fontWeight="900"
                  fill="var(--danger)"
                  textAnchor="middle"
                >
                  −
                </text>
              )}
            </g>
          );
        })}

        {/* Nós do circuito */}
        {Array.from(nodePositions.entries()).map(([id, pos]) => {
          const node = nodes.find(n => n.id === id);
          const isIn = isInput(id);
          const isOut = isOutput(id);
          const isSum = node?.kind === 'summer';

          if (isIn) {
            return (
              <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r={14} fill="var(--card-bg)" stroke="var(--success)" strokeWidth={2.2} />
                <text x={0} y={4} textAnchor="middle" fill="var(--success)" fontSize="11" fontWeight="800">
                  R
                </text>
                <text x={0} y={-20} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="700">
                  Entrada
                </text>
              </g>
            );
          }

          if (isOut) {
            return (
              <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r={14} fill="var(--card-bg)" stroke="var(--primary)" strokeWidth={2.2} />
                <text x={0} y={4} textAnchor="middle" fill="var(--primary)" fontSize="11" fontWeight="800">
                  C
                </text>
                <text x={0} y={-20} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="700">
                  Saída
                </text>
              </g>
            );
          }

          if (isSum) {
            return (
              <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r={13} fill="var(--card-bg)" stroke="var(--text)" strokeWidth={2} />
                <text x={0} y={4} textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="800">
                  ∑
                </text>
              </g>
            );
          }

          // Ponto de derivação intermediário
          return (
            <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
              <circle r={4.5} fill="var(--primary)" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
