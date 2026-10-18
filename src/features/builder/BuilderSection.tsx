'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  onOpenGuide?: () => void;
}

export const BuilderSection: React.FC<BuilderSectionProps> = ({ onBack }) => {
  // Estado inicial padrão: Malha Fechada Canônica
  const initialGraph: DiagramGraph = {
    elements: [
      { id: 'IN', type: 'input', name: 'R(s)', x: 60, y: 150 },
      { id: 's1', type: 'summer', name: 'S1', x: 180, y: 150 },
      { id: 'g1', type: 'block', name: 'G1', expr: '10/(s+2)', x: 360, y: 150, dir: 'right' },
      { id: 'h1', type: 'block', name: 'H1', expr: '1', x: 360, y: 250, dir: 'left' },
      { id: 'OUT', type: 'output', name: 'C(s)', x: 580, y: 150 }
    ],
    connections: [
      { id: 'c1', from: 'IN', to: 's1', sign: '+' },
      { id: 'c2', from: 's1', to: 'g1', sign: '+' },
      { id: 'c3', from: 'g1', to: 'OUT', sign: '+' },
      { id: 'c4', from: 'g1', to: 'h1', sign: '+' },
      { id: 'c5', from: 'h1', to: 's1', sign: '-' }
    ]
  };

  const [graph, setGraph] = useState<DiagramGraph>(initialGraph);
  const [selectedId, setSelectedId] = useState<string | null>('g1');
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);

  // Histórico de Desfazer / Refazer (Undo / Redo)
  const [history, setHistory] = useState<DiagramGraph[]>([initialGraph]);
  const [historyStep, setHistoryStep] = useState<number>(0);

  // Modo Lápis / Caneta para Puxar Linha
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  const [pencilSourceId, setPencilSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Arrastar Blocos (Drag & Drop no Canvas)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom e Escala do Canvas
  const [zoom, setZoom] = useState<number>(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Resultado de Redução por Mason
  const [analysisResult, setAnalysisResult] = useState<MasonAnalysis | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('malha_simples');

  // Adiciona estado ao histórico
  const pushHistory = useCallback((newGraph: DiagramGraph) => {
    setHistory(prev => {
      const upToCurrent = prev.slice(0, historyStep + 1);
      return [...upToCurrent, newGraph];
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep]);

  // Função Desfazer (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setGraph(history[prevStep]);
      setSelectedId(null);
      setSelectedConnId(null);
      setPencilSourceId(null);
      setAnalysisResult(null);
    }
  }, [historyStep, history]);

  // Função Refazer (Ctrl+Y)
  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setGraph(history[nextStep]);
      setSelectedId(null);
      setSelectedConnId(null);
      setPencilSourceId(null);
      setAnalysisResult(null);
    }
  }, [historyStep, history]);

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Carregar Modelos Rápidos
  const handleLoadTemplate = (tpl: string) => {
    setSelectedTemplate(tpl);
    setAnalysisResult(null);
    setSelectedId(null);
    setSelectedConnId(null);
    setPencilSourceId(null);

    let newGraph: DiagramGraph;

    if (tpl === 'em_branco') {
      newGraph = {
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 60, y: 150 },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 620, y: 150 }
        ],
        connections: []
      };
    } else if (tpl === 'cascata') {
      newGraph = {
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 60, y: 150 },
          { id: 'g1', type: 'block', name: 'G1', expr: '4/(s+1)', x: 220, y: 150, dir: 'right' },
          { id: 'g2', type: 'block', name: 'G2', expr: '5/(s+2)', x: 420, y: 150, dir: 'right' },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 600, y: 150 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', sign: '+' },
          { id: 'c2', from: 'g1', to: 'g2', sign: '+' },
          { id: 'c3', from: 'g2', to: 'OUT', sign: '+' }
        ]
      };
    } else if (tpl === 'paralelo') {
      newGraph = {
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 60, y: 150 },
          { id: 'g1', type: 'block', name: 'G1', expr: '6/(s+2)', x: 260, y: 80, dir: 'right' },
          { id: 'g2', type: 'block', name: 'G2', expr: '3/(s+4)', x: 260, y: 220, dir: 'right' },
          { id: 's1', type: 'summer', name: 'S1', x: 440, y: 150 },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 600, y: 150 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', sign: '+' },
          { id: 'c2', from: 'IN', to: 'g2', sign: '+' },
          { id: 'c3', from: 'g1', to: 's1', sign: '+' },
          { id: 'c4', from: 'g2', to: 's1', sign: '+' },
          { id: 'c5', from: 's1', to: 'OUT', sign: '+' }
        ]
      };
    } else if (tpl === 'exemplo1') {
      // 3 blocos em cascata
      newGraph = {
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 50, y: 150 },
          { id: 'g1', type: 'block', name: 'K', expr: '10', x: 180, y: 150, dir: 'right' },
          { id: 'g2', type: 'block', name: 'G1', expr: '1/s', x: 330, y: 150, dir: 'right' },
          { id: 'g3', type: 'block', name: 'G2', expr: '2/(s+5)', x: 490, y: 150, dir: 'right' },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 640, y: 150 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', sign: '+' },
          { id: 'c2', from: 'g1', to: 'g2', sign: '+' },
          { id: 'c3', from: 'g2', to: 'g3', sign: '+' },
          { id: 'c4', from: 'g3', to: 'OUT', sign: '+' }
        ]
      };
    } else if (tpl === 'malhas_duplas') {
      // Duas malhas aninhadas
      newGraph = {
        elements: [
          { id: 'IN', type: 'input', name: 'R(s)', x: 50, y: 150 },
          { id: 's1', type: 'summer', name: 'S1', x: 150, y: 150 },
          { id: 'g1', type: 'block', name: 'G1', expr: '2/(s+1)', x: 260, y: 150, dir: 'right' },
          { id: 's2', type: 'summer', name: 'S2', x: 370, y: 150 },
          { id: 'g2', type: 'block', name: 'G2', expr: '3/(s+2)', x: 480, y: 150, dir: 'right' },
          { id: 'h1', type: 'block', name: 'H1', expr: '1', x: 480, y: 230, dir: 'left' },
          { id: 'h2', type: 'block', name: 'H2', expr: '2', x: 370, y: 300, dir: 'left' },
          { id: 'OUT', type: 'output', name: 'C(s)', x: 640, y: 150 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 's1', sign: '+' },
          { id: 'c2', from: 's1', to: 'g1', sign: '+' },
          { id: 'c3', from: 'g1', to: 's2', sign: '+' },
          { id: 'c4', from: 's2', to: 'g2', sign: '+' },
          { id: 'c5', from: 'g2', to: 'OUT', sign: '+' },
          { id: 'c6', from: 'g2', to: 'h1', sign: '+' },
          { id: 'c7', from: 'h1', to: 's2', sign: '-' },
          { id: 'c8', from: 'g2', to: 'h2', sign: '+' },
          { id: 'c9', from: 'h2', to: 's1', sign: '-' }
        ]
      };
    } else {
      // malha_simples
      newGraph = { ...initialGraph };
    }

    setGraph(newGraph);
    pushHistory(newGraph);
  };

  // Adicionar Bloco
  const handleAddBlock = (isFeedback = false) => {
    const nextIdx = graph.elements.filter(e => e.type === 'block').length + 1;
    const newId = `blk_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      type: 'block',
      name: isFeedback ? `H${nextIdx}` : `G${nextIdx}`,
      expr: isFeedback ? '1' : '5/(s+3)',
      x: 300 + (nextIdx % 3) * 60,
      y: isFeedback ? 240 : 120 + (nextIdx % 2) * 40,
      dir: isFeedback ? 'left' : 'right'
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
  };

  // Adicionar Somador
  const handleAddSummer = () => {
    const nextIdx = graph.elements.filter(e => e.type === 'summer').length + 1;
    const newId = `sum_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      type: 'summer',
      name: `S${nextIdx}`,
      x: 200 + (nextIdx % 4) * 50,
      y: 150
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
  };

  // Excluir Elemento ou Conexão Selecionada
  const handleDeleteSelected = () => {
    if (selectedConnId) {
      const updated = {
        ...graph,
        connections: graph.connections.filter(c => c.id !== selectedConnId)
      };
      setGraph(updated);
      pushHistory(updated);
      setSelectedConnId(null);
      return;
    }

    if (!selectedId || selectedId === 'IN' || selectedId === 'OUT') return;
    const updated = {
      elements: graph.elements.filter(e => e.id !== selectedId),
      connections: graph.connections.filter(c => c.from !== selectedId && c.to !== selectedId)
    };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(null);
    setPencilSourceId(null);
  };

  // Alternar Sinal (+ / -) da Ligação Selecionada
  const handleToggleSign = () => {
    if (selectedConnId) {
      const updated: DiagramGraph = {
        ...graph,
        connections: graph.connections.map(c =>
          c.id === selectedConnId ? { ...c, sign: (c.sign === '+' ? '-' : '+') as '+' | '-' } : c
        )
      };
      setGraph(updated);
      pushHistory(updated);
    } else if (selectedId) {
      // Alterna o sinal da última conexão que chega no somador
      const updated: DiagramGraph = {
        ...graph,
        connections: graph.connections.map(c =>
          c.to === selectedId ? { ...c, sign: (c.sign === '+' ? '-' : '+') as '+' | '-' } : c
        )
      };
      setGraph(updated);
      pushHistory(updated);
    }
  };

  // Auto-Organizar Coordenadas
  const handleAutoLayout = () => {
    const sorted = [...graph.elements];
    const inputs = sorted.filter(e => e.type === 'input');
    const outputs = sorted.filter(e => e.type === 'output');
    const forwardBlocks = sorted.filter(e => e.type === 'block' && e.dir !== 'left');
    const feedbackBlocks = sorted.filter(e => e.type === 'block' && e.dir === 'left');
    const summers = sorted.filter(e => e.type === 'summer');

    let curX = 60;
    inputs.forEach(el => { el.x = curX; el.y = 150; });
    curX += 110;

    summers.forEach(el => { el.x = curX; el.y = 150; curX += 110; });
    forwardBlocks.forEach(el => { el.x = curX; el.y = 150; curX += 150; });
    outputs.forEach(el => { el.x = curX; el.y = 150; });

    let fbX = 350;
    feedbackBlocks.forEach(el => {
      el.x = fbX;
      el.y = 250;
      fbX += 140;
    });

    const updated = { ...graph, elements: sorted };
    setGraph(updated);
    pushHistory(updated);
  };

  // Limpar Tudo
  const handleClearAll = () => {
    handleLoadTemplate('em_branco');
  };

  // Alterar Expressão do Bloco
  const handleExprChange = (expr: string) => {
    if (!selectedId) return;
    setGraph(prev => ({
      ...prev,
      elements: prev.elements.map(e =>
        e.id === selectedId ? { ...e, expr, rat: parseRatExpr(expr) } : e
      )
    }));
  };

  const handleExprBlur = () => {
    pushHistory(graph);
  };

  // Início do clique em nó (Lápis ou Drag)
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (pencilMode) {
      // Modo Lápis Ativo: Conectar Origem ao Destino
      if (!pencilSourceId) {
        setPencilSourceId(id);
        setSelectedId(id);
      } else {
        if (pencilSourceId !== id) {
          const targetEl = graph.elements.find(el => el.id === id);
          const sign = targetEl?.type === 'summer' ? '-' : '+';
          const newConn: DiagramConnection = {
            id: `conn_${Date.now()}`,
            from: pencilSourceId,
            to: id,
            sign
          };
          const updated = {
            ...graph,
            connections: [...graph.connections, newConn]
          };
          setGraph(updated);
          pushHistory(updated);
        }
        setPencilSourceId(null);
      }
      return;
    }

    // Modo Seleção / Arrastar
    setSelectedId(id);
    setSelectedConnId(null);
    setDraggingId(id);

    const el = graph.elements.find(item => item.id === id);
    if (el && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const clickSvgX = (e.clientX - rect.left) / zoom;
      const clickSvgY = (e.clientY - rect.top) / zoom;
      setDragOffset({
        x: clickSvgX - (el.x || 0),
        y: clickSvgY - (el.y || 0)
      });
    }
  };

  // Movimentação do Mouse no Canvas SVG
  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / zoom;
    const curY = (e.clientY - rect.top) / zoom;
    setMousePos({ x: curX, y: curY });

    if (draggingId) {
      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(el =>
          el.id === draggingId
            ? { ...el, x: Math.max(30, Math.round(curX - dragOffset.x)), y: Math.max(30, Math.round(curY - dragOffset.y)) }
            : el
        )
      }));
    }
  };

  const handleSvgMouseUp = () => {
    if (draggingId) {
      setDraggingId(null);
      pushHistory(graph);
    }
  };

  const handleSvgClick = () => {
    if (pencilSourceId) {
      setPencilSourceId(null);
    } else {
      setSelectedId(null);
      setSelectedConnId(null);
    }
  };

  // Calcular Regra de Mason
  const handleRunMason = () => {
    try {
      const result = computeMasonAnalysis(graph);
      setAnalysisResult(result);
    } catch {
      alert('Erro ao calcular regra de Mason. Certifique-se de que há conexões contínuas entre a entrada R(s) e a saída C(s).');
    }
  };

  const selectedElement = graph.elements.find(e => e.id === selectedId);

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Barra de Topo do Construtor */}
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
          marginBottom: '16px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.35)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{
              padding: '8px 16px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⬅ Voltar à Página Principal
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--primary)', fontWeight: 800 }}>
              🛠️ Criador de Diagrama de Blocos & Redução de Mason
            </h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Ambiente gráfico avançado para desenhar, interligar blocos livres e calcular T(s) analítica
            </p>
          </div>
        </div>

        {/* Seleção de Modelos Rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Modelo:</span>
            <select
              value={selectedTemplate}
              onChange={e => handleLoadTemplate(e.target.value)}
              style={{
                padding: '6px 12px',
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
              <option value="exemplo1">Exemplo 1 (Três Blocos em Série)</option>
              <option value="malhas_duplas">Malhas Duplas Sobrepostas (G1, G2, H1, H2)</option>
              <option value="em_branco">Em Branco (Apenas Entrada R e Saída C)</option>
            </select>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Barra de Ferramentas Avançada */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}
      >
        {/* Desfazer e Refazer */}
        <button
          type="button"
          className="filter-btn"
          onClick={handleUndo}
          disabled={historyStep <= 0}
          style={{ opacity: historyStep <= 0 ? 0.35 : 1, padding: '7px 12px' }}
          title="Desfazer última ação (Ctrl+Z)"
        >
          ↶ Desfazer
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleRedo}
          disabled={historyStep >= history.length - 1}
          style={{ opacity: historyStep >= history.length - 1 ? 0.35 : 1, padding: '7px 12px' }}
          title="Refazer ação (Ctrl+Y)"
        >
          ↷ Refazer
        </button>

        <span style={{ width: '1px', height: '24px', background: 'var(--card-border)', margin: '0 4px' }} />

        {/* Ferramenta Lápis / Caneta */}
        <button
          type="button"
          className={`filter-btn ${pencilMode ? 'active' : ''}`}
          onClick={() => {
            setPencilMode(prev => !prev);
            setPencilSourceId(null);
          }}
          style={{
            padding: '7px 14px',
            background: pencilMode ? 'rgba(56,189,248,0.25)' : undefined,
            borderColor: pencilMode ? 'var(--primary)' : undefined,
            fontWeight: pencilMode ? 700 : 600
          }}
          title="Ferramenta Lápis: ative para puxar conexões clicando nos blocos"
        >
          {pencilMode ? '✏️ Lápis: ATIVO (Clique na Origem e Destino)' : '✏️ Lápis / Puxar Linha: OFF'}
        </button>

        {/* Adicionar Componentes */}
        <button
          type="button"
          className="filter-btn"
          onClick={() => handleAddBlock(false)}
          style={{ padding: '7px 12px' }}
        >
          ＋ Bloco G(s)
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={() => handleAddBlock(true)}
          style={{ padding: '7px 12px' }}
        >
          ＋ Realimentação H(s)
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleAddSummer}
          style={{ padding: '7px 12px' }}
        >
          ⊕ Somador
        </button>

        <span style={{ width: '1px', height: '24px', background: 'var(--card-border)', margin: '0 4px' }} />

        {/* Ações Rápidas */}
        <button
          type="button"
          className="filter-btn"
          onClick={handleToggleSign}
          title="Alternar sinal (+ / -) do somador ou conexão selecionada"
          style={{ padding: '7px 12px', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)' }}
        >
          ± Sinal (+ / -)
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleAutoLayout}
          title="Organizar automaticamente a disposição e fluxo dos blocos"
          style={{ padding: '7px 12px' }}
        >
          📐 Auto-Organizar
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleDeleteSelected}
          disabled={!selectedId && !selectedConnId}
          style={{ opacity: (!selectedId && !selectedConnId) ? 0.35 : 1, padding: '7px 12px', color: '#ef4444' }}
          title="Excluir elemento selecionado (Tecla Delete)"
        >
          ✕ Excluir
        </button>
        <button
          type="button"
          className="filter-btn"
          onClick={handleClearAll}
          style={{ padding: '7px 12px' }}
          title="Limpar diagrama"
        >
          🗑️ Limpar
        </button>

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
          <button
            type="button"
            className="filter-btn"
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Aproximar Zoom"
          >
            🔍+
          </button>
          <button
            type="button"
            className="filter-btn"
            onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Afastar Zoom"
          >
            🔍-
          </button>
          <button
            type="button"
            className="filter-btn"
            onClick={() => setZoom(1)}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Restaurar Zoom 100%"
          >
            ↺ 100%
          </button>

          {/* Botão de Redução por Mason */}
          <button
            type="button"
            className="btn-primary"
            onClick={handleRunMason}
            style={{ padding: '8px 18px', fontSize: '0.88rem', fontWeight: 800, marginLeft: '8px' }}
          >
            ⚡ Reduzir Diagrama (Mason)
          </button>
        </div>
      </div>

      {/* Barra de Edição Rápida do Bloco Selecionado */}
      {selectedElement && selectedElement.type === 'block' && (
        <div
          style={{
            background: 'var(--code-bg)',
            border: '1px solid var(--primary)',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 14px rgba(56,189,248,0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>
              Editando {selectedElement.name}:
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Função no Domínio s:</span>
            <input
              type="text"
              value={selectedElement.expr || ''}
              onChange={e => handleExprChange(e.target.value)}
              onBlur={handleExprBlur}
              placeholder="Ex: 10/(s+2), 1/s, 5, 2/(s+1)"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#0d1424',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                fontFamily: 'monospace',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visualização KaTeX:</span>
            <div style={{ background: '#050811', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--card-border)' }}>
              <MathView math={selectedElement.expr || '1'} inline />
            </div>
          </div>
        </div>
      )}

      {/* Canvas SVG Interativo com Suporte a Drag & Drop e Lápis */}
      <div
        style={{
          background: '#050811',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '16px',
          minHeight: '380px',
          overflow: 'auto',
          position: 'relative',
          cursor: pencilMode ? 'crosshair' : 'default',
          boxShadow: 'inset 0 2px 14px rgba(0,0,0,0.8)'
        }}
        onClick={handleSvgClick}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 920 380"
          width="100%"
          height="380"
          style={{
            display: 'block',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.15s ease'
          }}
        >
          <defs>
            <marker id="builder-arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="builder-arr-sel" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Grade de Pontos de Fundo (Grid Técnico) */}
          <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(56, 189, 248, 0.12)" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-dots)" />

          {/* Conexões Existentes */}
          {graph.connections.map(conn => {
            const src = graph.elements.find(e => e.id === conn.from);
            const tgt = graph.elements.find(e => e.id === conn.to);
            if (!src || !tgt) return null;
            const x1 = src.x || 50;
            const y1 = src.y || 50;
            const x2 = tgt.x || 200;
            const y2 = tgt.y || 200;

            const isSelected = conn.id === selectedConnId;
            const isBack = x2 < x1;
            let pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
            if (isBack) {
              const midY = Math.max(y1, y2) + 50;
              pathD = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
            } else if (Math.abs(y1 - y2) > 30) {
              const midX = (x1 + x2) / 2;
              pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
            }

            return (
              <g
                key={conn.id}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedConnId(conn.id);
                  setSelectedId(null);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Linha de toque maior invisível para facilitar o clique */}
                <path d={pathD} stroke="transparent" strokeWidth="12" fill="none" />
                <path
                  d={pathD}
                  stroke={isSelected ? '#f59e0b' : '#38bdf8'}
                  strokeWidth={isSelected ? '3' : '2'}
                  fill="none"
                  markerEnd={isSelected ? 'url(#builder-arr-sel)' : 'url(#builder-arr)'}
                />
                {conn.sign === '-' && (
                  <text
                    x={x2 - 14}
                    y={y2 + (y2 < y1 ? 16 : -10)}
                    fill="#ef4444"
                    fontSize="14"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    -
                  </text>
                )}
                {conn.sign === '+' && tgt.type === 'summer' && (
                  <text
                    x={x2 - 14}
                    y={y2 + (y2 < y1 ? 16 : -10)}
                    fill="#10b981"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    +
                  </text>
                )}
              </g>
            );
          })}

          {/* Linha elástica temporária durante o uso do Lápis */}
          {pencilMode && pencilSourceId && mousePos && (
            (() => {
              const src = graph.elements.find(e => e.id === pencilSourceId);
              if (!src) return null;
              return (
                <line
                  x1={src.x || 0}
                  y1={src.y || 0}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  markerEnd="url(#builder-arr)"
                />
              );
            })()
          )}

          {/* Elementos do Diagrama */}
          {graph.elements.map(el => {
            const isSelected = el.id === selectedId;
            const isConnectingSource = el.id === pencilSourceId;
            const x = el.x || 100;
            const y = el.y || 100;

            if (el.type === 'summer') {
              return (
                <g
                  key={el.id}
                  onMouseDown={e => handleNodeMouseDown(e, el.id)}
                  style={{ cursor: pencilMode ? 'crosshair' : 'move' }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="18"
                    fill="#0d1424"
                    stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : '#38bdf8'}
                    strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                  />
                  <text x={x} y={y - 24} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                    {el.name}
                  </text>
                  <text x={x} y={y + 5} fill="#38bdf8" fontSize="14" fontWeight="bold" textAnchor="middle">
                    +
                  </text>
                </g>
              );
            }

            if (el.type === 'input' || el.type === 'output') {
              return (
                <g
                  key={el.id}
                  onMouseDown={e => handleNodeMouseDown(e, el.id)}
                  style={{ cursor: pencilMode ? 'crosshair' : 'move' }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="20"
                    fill="#131c2e"
                    stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : '#38bdf8'}
                    strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                  />
                  <text x={x} y={y + 5} fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">
                    {el.name}
                  </text>
                </g>
              );
            }

            // Bloco Dinâmico G(s) ou H(s)
            return (
              <g
                key={el.id}
                onMouseDown={e => handleNodeMouseDown(e, el.id)}
                style={{ cursor: pencilMode ? 'crosshair' : 'move' }}
              >
                <rect
                  x={x - 60}
                  y={y - 28}
                  width="120"
                  height="56"
                  rx="8"
                  fill="#131c2e"
                  stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : el.dir === 'left' ? '#a855f7' : '#38bdf8'}
                  strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                />
                <text x={x} y={y - 34} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {el.name} {el.dir === 'left' ? '⬅' : '➔'}
                </text>
                <text x={x} y={y + 5} fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">
                  {el.expr || '1'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Painel com o Resultado Analítico de Redução por Mason */}
      {analysisResult && (
        <div
          style={{
            marginTop: '24px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 800 }}>
              🎯 Função de Transferência Global Calculada por Regra de Mason:
            </h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(`T(s) = ${ratToLatex(analysisResult.totalT)}`);
                alert('Fórmula em LaTeX copiada para a área de transferência!');
              }}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              📋 Copiar LaTeX
            </button>
          </div>

          <div style={{ margin: '18px 0', textAlign: 'center', padding: '16px', background: '#020617', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <MathView math={`T(s) = \\frac{C(s)}{R(s)} = \\mathbf{${ratToLatex(analysisResult.totalT)}}`} block />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', fontSize: '0.86rem' }}>
            <div style={{ background: '#0a0f1d', padding: '14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
                Caminhos Diretos M_k ({analysisResult.forwardPaths.length}):
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-muted)' }}>
                {analysisResult.forwardPaths.map((p, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    <b>P_{idx + 1}:</b> {p.nodes.join(' → ')} <br />
                    <span style={{ fontSize: '0.8rem' }}>Ganho: <MathView math={ratToLatex(p.gain)} inline /></span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#0a0f1d', padding: '14px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '8px' }}>
                Laços Individuais L_i ({analysisResult.loops.length}):
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-muted)' }}>
                {analysisResult.loops.map((lp, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    <b>L_{idx + 1}:</b> {lp.nodes.join(' → ')} <br />
                    <span style={{ fontSize: '0.8rem' }}>Ganho: <MathView math={ratToLatex(lp.gain)} inline /></span>
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
