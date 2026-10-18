'use client';

import React, { useState } from 'react';
import {
  DiagramGraph,
  DiagramElement,
  DiagramConnection,
  computeMasonAnalysis,
  MasonAnalysis
} from '@/core/reduction/mason';
import { parseRatExpr } from '@/core/algebra/parser';
import { ratToLatex } from '@/core/algebra/rational';
import { MathView } from '@/components/MathView';
import { ThemeToggle } from '@/components/ThemeToggle';

interface BuilderSectionProps {
  onBack: () => void;
  onOpenGuide: () => void;
}

export const BuilderSection: React.FC<BuilderSectionProps> = ({ onBack, onOpenGuide }) => {
  // Estado inicial: Malha Fechada Padrão
  const [graph, setGraph] = useState<DiagramGraph>({
    elements: [
      { id: 'IN', type: 'input', name: 'R(s)', x: 40, y: 100 },
      { id: 's1', type: 'summer', name: 'S1', x: 140, y: 100 },
      { id: 'g1', type: 'block', name: 'G1', expr: '10/(s+2)', x: 280, y: 100 },
      { id: 'h1', type: 'block', name: 'H1', expr: '1', x: 280, y: 180, dir: 'left' },
      { id: 'OUT', type: 'output', name: 'C(s)', x: 440, y: 100 }
    ],
    connections: [
      { id: 'c1', from: 'IN', to: 's1', sign: '+' },
      { id: 'c2', from: 's1', to: 'g1', sign: '+' },
      { id: 'c3', from: 'g1', to: 'OUT', sign: '+' },
      { id: 'c4', from: 'g1', to: 'h1', sign: '+' },
      { id: 'c5', from: 'h1', to: 's1', sign: '-' }
    ]
  });

  const [selectedId, setSelectedId] = useState<string | null>('g1');
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MasonAnalysis | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('malha_simples');

  // Carregar Modelos Rápidos
  const handleLoadTemplate = (tpl: string) => {
    setSelectedTemplate(tpl);
    setAnalysisResult(null);
    if (tpl === 'em_branco') {
      setGraph({
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 60, y: 120 },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 500, y: 120 }
        ],
        connections: []
      });
      setSelectedId(null);
    } else if (tpl === 'cascata') {
      setGraph({
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 50, y: 120 },
          { id: 'g1', type: 'block', name: 'G1', expr: '4/(s+1)', x: 200, y: 120 },
          { id: 'g2', type: 'block', name: 'G2', expr: '5/(s+2)', x: 380, y: 120 },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 540, y: 120 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', sign: '+' },
          { id: 'c2', from: 'g1', to: 'g2', sign: '+' },
          { id: 'c3', from: 'g2', to: 'OUT', sign: '+' }
        ]
      });
      setSelectedId('g1');
    } else if (tpl === 'paralelo') {
      setGraph({
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 50, y: 120 },
          { id: 'g1', type: 'block', name: 'G1', expr: '6/(s+2)', x: 220, y: 60 },
          { id: 'g2', type: 'block', name: 'G2', expr: '3/(s+4)', x: 220, y: 180 },
          { id: 's1', type: 'summer', name: 'S1', x: 380, y: 120 },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 520, y: 120 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', sign: '+' },
          { id: 'c2', from: 'IN', to: 'g2', sign: '+' },
          { id: 'c3', from: 'g1', to: 's1', sign: '+' },
          { id: 'c4', from: 'g2', to: 's1', sign: '+' },
          { id: 'c5', from: 's1', to: 'OUT', sign: '+' }
        ]
      });
      setSelectedId('g1');
    } else {
      // malha_simples
      setGraph({
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 40, y: 100 },
          { id: 's1', type: 'summer', name: 'S1', x: 140, y: 100 },
          { id: 'g1', type: 'block', name: 'G1', expr: '10/(s+2)', x: 280, y: 100 },
          { id: 'h1', type: 'block', name: 'H1', expr: '1', x: 280, y: 180, dir: 'left' },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 440, y: 100 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 's1', sign: '+' },
          { id: 'c2', from: 's1', to: 'g1', sign: '+' },
          { id: 'c3', from: 'g1', to: 'OUT', sign: '+' },
          { id: 'c4', from: 'g1', to: 'h1', sign: '+' },
          { id: 'c5', from: 'h1', to: 's1', sign: '-' }
        ]
      });
      setSelectedId('g1');
    }
  };

  const handleAddBlock = (isFeedback = false) => {
    const nextIdx = graph.elements.filter(e => e.type === 'block').length + 1;
    const newId = `g_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      type: 'block',
      name: isFeedback ? `H${nextIdx}` : `G${nextIdx}`,
      expr: isFeedback ? '1' : '2/(s+1)',
      x: 200 + (nextIdx % 4) * 45,
      y: isFeedback ? 180 : 80 + (nextIdx % 3) * 35,
      dir: isFeedback ? 'left' : 'right'
    };
    setGraph(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedId(newId);
  };

  const handleAddSummer = () => {
    const nextIdx = graph.elements.filter(e => e.type === 'summer').length + 1;
    const newId = `s_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      type: 'summer',
      name: `S${nextIdx}`,
      x: 160 + (nextIdx % 3) * 60,
      y: 110 + (nextIdx % 2) * 40
    };
    setGraph(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedId(newId);
  };

  const handleDeleteSelected = () => {
    if (!selectedId || selectedId === 'IN' || selectedId === 'OUT') return;
    setGraph(prev => ({
      elements: prev.elements.filter(e => e.id !== selectedId),
      connections: prev.connections.filter(c => c.from !== selectedId && c.to !== selectedId)
    }));
    setSelectedId(null);
  };

  const handleClearAll = () => {
    handleLoadTemplate('em_branco');
  };

  const handleExprChange = (expr: string) => {
    if (!selectedId) return;
    setGraph(prev => ({
      ...prev,
      elements: prev.elements.map(e =>
        e.id === selectedId ? { ...e, expr, rat: parseRatExpr(expr) } : e
      )
    }));
  };

  const handleNodeClick = (id: string) => {
    if (!connectSource) {
      setConnectSource(id);
      setSelectedId(id);
    } else {
      if (connectSource !== id) {
        const targetEl = graph.elements.find(e => e.id === id);
        const sign = targetEl?.type === 'summer' ? '-' : '+';
        const newConn: DiagramConnection = {
          id: `conn_${Date.now()}`,
          from: connectSource,
          to: id,
          sign
        };
        setGraph(prev => ({
          ...prev,
          connections: [...prev.connections, newConn]
        }));
      }
      setConnectSource(null);
    }
  };

  const handleRunMason = () => {
    try {
      const result = computeMasonAnalysis(graph);
      setAnalysisResult(result);
    } catch {
      alert('Erro ao calcular regra de Mason. Certifique-se de que há conexões contínuas entre R(s) e C(s).');
    }
  };

  const selectedElement = graph.elements.find(e => e.id === selectedId);

  return (
    <div style={{ paddingTop: '8px' }}>
      {/* Barra de Topo do Construtor com Botão de Voltar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '14px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-back-presets"
            onClick={onBack}
            style={{
              background: 'var(--primary)',
              color: '#050811',
              fontWeight: 700,
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⬅ Voltar à Calculadora
          </button>
          <button
            type="button"
            className="btn-open-guide"
            onClick={onOpenGuide}
            style={{ padding: '7px 13px', fontSize: '0.85rem' }}
          >
            📖 Guia Didático
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>
              Criador de Diagrama de Blocos & Redução de Mason
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Modelo:</span>
            <select
              value={selectedTemplate}
              onChange={e => handleLoadTemplate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'var(--code-bg)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                fontSize: '0.84rem'
              }}
            >
              <option value="malha_simples">Malha Fechada Padrão G/(1+GH)</option>
              <option value="cascata">Associação em Cascata G1 · G2</option>
              <option value="paralelo">Associação em Paralelo G1 + G2</option>
              <option value="em_branco">Em Branco (Apenas R e C)</option>
            </select>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Barra de Ferramentas de Criação */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
        <button
          type="button"
          className="filter-btn"
          onClick={() => handleAddBlock(false)}
          style={{ padding: '7px 12px', fontSize: '0.84rem' }}
        >
          ＋ Bloco G(s)
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={() => handleAddBlock(true)}
          style={{ padding: '7px 12px', fontSize: '0.84rem' }}
        >
          ＋ Realimentação H(s)
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleAddSummer}
          style={{ padding: '7px 12px', fontSize: '0.84rem' }}
        >
          ⊕ Somador
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleDeleteSelected}
          disabled={!selectedId || selectedId === 'IN' || selectedId === 'OUT'}
          style={{ opacity: (!selectedId || selectedId === 'IN' || selectedId === 'OUT') ? 0.4 : 1, padding: '7px 12px', fontSize: '0.84rem' }}
        >
          ✕ Excluir
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleClearAll}
          style={{ padding: '7px 12px', fontSize: '0.84rem' }}
        >
          🗑️ Limpar
        </button>
        <button
          type="button"
          className="filter-btn active"
          onClick={handleRunMason}
          style={{ padding: '7px 18px', fontSize: '0.88rem', fontWeight: 700, marginLeft: 'auto' }}
        >
          ⚡ Reduzir Diagrama (Mason)
        </button>
      </div>

      {/* Barra Inline de Edição Rápida do Bloco Selecionado */}
      {selectedElement && selectedElement.type === 'block' && (
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--primary)' }}>
            Bloco {selectedElement.name}:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Expressão / Função:</span>
            <input
              type="text"
              value={selectedElement.expr || ''}
              onChange={e => handleExprChange(e.target.value)}
              placeholder="Ex: 10/(s+2), 1/s, 5"
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '4px',
                background: '#0d1424',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                fontFamily: 'monospace'
              }}
            />
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Dica: Clique no nó de origem e depois no de destino para criar conexões.
          </span>
        </div>
      )}

      {/* Canvas SVG Interativo */}
      <div style={{ background: '#050811', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '16px', minHeight: '340px' }}>
        <svg viewBox="0 0 760 260" width="100%" height="260" style={{ display: 'block' }}>
          <defs>
            <marker id="builder-arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Conexões */}
          {graph.connections.map(conn => {
            const src = graph.elements.find(e => e.id === conn.from);
            const tgt = graph.elements.find(e => e.id === conn.to);
            if (!src || !tgt) return null;
            const x1 = src.x || 50;
            const y1 = src.y || 50;
            const x2 = tgt.x || 200;
            const y2 = tgt.y || 200;

            const isBack = x2 < x1;
            let pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
            if (isBack) {
              pathD = `M ${x1} ${y1} L ${x1} ${y1 + 40} L ${x2} ${y1 + 40} L ${x2} ${y2}`;
            }

            return (
              <g key={conn.id}>
                <path d={pathD} stroke="#38bdf8" strokeWidth="2" fill="none" markerEnd="url(#builder-arr)" />
                {conn.sign === '-' && (
                  <text x={x2 - 12} y={y2 + 14} fill="#ef4444" fontSize="12" fontWeight="bold">-</text>
                )}
              </g>
            );
          })}

          {/* Elementos */}
          {graph.elements.map(el => {
            const isSelected = el.id === selectedId;
            const isConnecting = el.id === connectSource;
            const x = el.x || 100;
            const y = el.y || 100;

            if (el.type === 'summer') {
              return (
                <g key={el.id} onClick={() => handleNodeClick(el.id)} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={x}
                    cy={y}
                    r="16"
                    fill="#0d1424"
                    stroke={isSelected ? '#f59e0b' : isConnecting ? '#10b981' : '#38bdf8'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text x={x} y={y - 20} fill="#94a3b8" fontSize="10" textAnchor="middle">{el.name}</text>
                  <text x={x} y={y + 5} fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle">+</text>
                </g>
              );
            }

            if (el.type === 'input' || el.type === 'output') {
              return (
                <g key={el.id} onClick={() => handleNodeClick(el.id)} style={{ cursor: 'pointer' }}>
                  <circle cx={x} cy={y} r="18" fill="#131c2e" stroke={isSelected ? '#f59e0b' : '#38bdf8'} strokeWidth="2" />
                  <text x={x} y={y + 4} fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">{el.name}</text>
                </g>
              );
            }

            return (
              <g key={el.id} onClick={() => handleNodeClick(el.id)} style={{ cursor: 'pointer' }}>
                <rect
                  x={x - 55}
                  y={y - 24}
                  width="110"
                  height="48"
                  rx="6"
                  fill="#131c2e"
                  stroke={isSelected ? '#f59e0b' : isConnecting ? '#10b981' : '#38bdf8'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                <text x={x} y={y - 28} fill="#94a3b8" fontSize="10" textAnchor="middle">{el.name}</text>
                <text x={x} y={y + 5} fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {el.expr || '1'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Resultado da Regra de Mason */}
      {analysisResult && (
        <div style={{ marginTop: '24px', background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem', color: 'var(--primary)' }}>
            📊 Função de Transferência Global Calculada por Regra de Mason:
          </h3>

          <div style={{ margin: '16px 0', textAlign: 'center', padding: '16px', background: '#020617', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <MathView math={`T(s) = \\frac{C(s)}{R(s)} = \\mathbf{${ratToLatex(analysisResult.totalT)}}`} block />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', fontSize: '0.85rem' }}>
            <div style={{ background: '#0a0f1d', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                Caminhos Diretos ({analysisResult.forwardPaths.length}):
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-muted)' }}>
                {analysisResult.forwardPaths.map((p, idx) => (
                  <li key={idx}>
                    P_{idx + 1}: {p.nodes.join(' → ')} (Ganho: ${ratToLatex(p.gain)}$)
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#0a0f1d', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                Laços de Realimentação ({analysisResult.loops.length}):
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-muted)' }}>
                {analysisResult.loops.map((lp, idx) => (
                  <li key={idx}>
                    L_{idx + 1}: {lp.nodes.join(' → ')} (Ganho: ${ratToLatex(lp.gain)}$)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
