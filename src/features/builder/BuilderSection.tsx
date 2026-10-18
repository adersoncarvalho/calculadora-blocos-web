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
import { VisionImportModal } from './VisionImportModal';
import { autoLayoutDiagram, computeSmartConnectionPath } from './layoutEngine';
import { MasonDeductionView } from './MasonDeductionView';

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
  const [selectedIds, setSelectedIds] = useState<string[]>(['g1']);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : []);
  }, []);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);

  // Histórico de Desfazer / Refazer (Undo / Redo)
  const [history, setHistory] = useState<DiagramGraph[]>([initialGraph]);
  const [historyStep, setHistoryStep] = useState<number>(0);

  // Modo Lápis / Caneta para Puxar Linha
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  const [pencilSourceId, setPencilSourceId] = useState<string | null>(null);
  const [pencilSourcePort, setPencilSourcePort] = useState<'left' | 'right' | 'top' | 'bottom' | undefined>(undefined);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Arrastar Múltiplos Blocos (Multi-Drag & Drop no Canvas)
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Seleção por Retângulo de Área (Marquee / Box Selection)
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Arrastar Linhas / Conexões (Mover fios para organizar o circuito)
  const [draggingConnId, setDraggingConnId] = useState<string | null>(null);
  const [dragConnOffset, setDragConnOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom e Escala do Canvas
  const [zoom, setZoom] = useState<number>(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Modal de Visão por IA (Vision-to-Diagram / Print)
  const [showVisionModal, setShowVisionModal] = useState<boolean>(false);
  const [pastedImageForModal, setPastedImageForModal] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      setPencilSourcePort(undefined);
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
      setPencilSourcePort(undefined);
      setAnalysisResult(null);
    }
  }, [historyStep, history]);

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPencilSourceId(null);
        setPencilSourcePort(undefined);
        setPencilMode(false);
        setSelectedIds([]);
        setSelectedConnId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
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

  // Captura global de Print (Ctrl+V) com imagem para abrir modal de importação inteligente
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = ev => {
              setPastedImageForModal(ev.target?.result as string);
              setShowVisionModal(true);
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, []);

  // Importar Grafo Reconhecido pela IA ou Exemplo (Auto-organizado com espaçamento amplo)
  const handleImportGraph = (importedGraph: DiagramGraph, title?: string) => {
    const optimized = autoLayoutDiagram(importedGraph);
    setGraph(optimized);
    pushHistory(optimized);
    const firstBlock = optimized.elements.find(e => e.type === 'block');
    setSelectedId(firstBlock ? firstBlock.id : null);
    setSelectedConnId(null);
    setPencilSourceId(null);
    setAnalysisResult(null);
    setToastMessage(title ? `✨ "${title}" montado e auto-organizado com espaçamento profissional!` : '✨ Diagrama montado e auto-organizado!');
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Copiar Imagem do Diagrama para a Área de Transferência
  const handleCopyDiagramAsImage = async () => {
    if (!svgRef.current) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgRef.current?.clientWidth ? svgRef.current.clientWidth * 2 : 1600;
        canvas.height = svgRef.current?.clientHeight ? svgRef.current.clientHeight * 2 : 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050811';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async pngBlob => {
            if (pngBlob && navigator.clipboard && navigator.clipboard.write) {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob })
              ]);
              setToastMessage('📋 Diagrama copiado para a área de transferência como imagem!');
              setTimeout(() => setToastMessage(null), 4000);
            }
          }, 'image/png');
        }
      };
      image.src = blobURL;
    } catch (e) {
      console.error(e);
    }
  };

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

    if (selectedIds.length === 0) return;
    const idsToDelete = new Set(selectedIds.filter(id => id !== 'IN' && id !== 'OUT'));
    if (idsToDelete.size === 0) return;

    const updated = {
      elements: graph.elements.filter(e => !idsToDelete.has(e.id)),
      connections: graph.connections.filter(c => !idsToDelete.has(c.from) && !idsToDelete.has(c.to))
    };
    setGraph(updated);
    pushHistory(updated);
    setSelectedIds([]);
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

  // Auto-Organizar Coordenadas com Algoritmo Inteligente de Engenharia
  const handleAutoLayout = () => {
    const organized = autoLayoutDiagram(graph);
    setGraph(organized);
    pushHistory(organized);
    setToastMessage('📐 Diagrama auto-organizado com espaçamento amplo e canais de retorno livres!');
    setTimeout(() => setToastMessage(null), 3500);
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

  // Alterar Expressão de um Bloco Específico (usado no painel geral de blocos abaixo da tela)
  const handleSpecificBlockExprChange = (blockId: string, expr: string) => {
    setGraph(prev => ({
      ...prev,
      elements: prev.elements.map(e =>
        e.id === blockId ? { ...e, expr, rat: parseRatExpr(expr) } : e
      )
    }));
  };

  // Alterar Nome de um Bloco Específico
  const handleSpecificBlockNameChange = (blockId: string, name: string) => {
    setGraph(prev => ({
      ...prev,
      elements: prev.elements.map(e =>
        e.id === blockId ? { ...e, name } : e
      )
    }));
  };

  const handleExprBlur = () => {
    pushHistory(graph);
  };

  // Finalizar conexão no destino (ao clicar ou soltar em um pontinho ou bloco)
  const completeConnection = (targetId: string, side?: 'left' | 'right' | 'top' | 'bottom') => {
    if (!pencilSourceId || pencilSourceId === targetId) return;

    const targetEl = graph.elements.find(el => el.id === targetId);
    const sign = targetEl?.type === 'summer' && (side === 'bottom' || side === 'top') ? '-' : '+';
    const newConn: DiagramConnection = {
      id: `conn_${Date.now()}`,
      from: pencilSourceId,
      to: targetId,
      fromPort: pencilSourcePort,
      toPort: side,
      sign
    };
    const updated = {
      ...graph,
      connections: [...graph.connections, newConn]
    };
    setGraph(updated);
    pushHistory(updated);
    setToastMessage(`✅ Linha conectada com sucesso entre ${pencilSourceId} e ${targetId}!`);
    setTimeout(() => setToastMessage(null), 3000);
    setPencilSourceId(null);
    setPencilSourcePort(undefined);
    setPencilMode(false);
  };

  // Conexão direta por pinos/pontinhos (Estilo Altair Embed / VisSim / Simulink)
  const handlePortMouseDown = (e: React.MouseEvent, id: string, side: 'left' | 'right' | 'top' | 'bottom') => {
    e.stopPropagation();
    if (e.button !== 0) return; // Apenas botão esquerdo principal do mouse!

    if (!pencilSourceId) {
      // Inicia a puxar a conexão imediatamente com o botão esquerdo
      setPencilSourceId(id);
      setPencilSourcePort(side);
      setPencilMode(true);
      setToastMessage(`📍 Linha iniciada no pino (${side}) de "${id}". Dê um clique no pino do bloco de destino para fixar!`);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      completeConnection(id, side);
    }
  };

  // Início do clique em nó (Lápis ou Drag)
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Apenas botão esquerdo principal do mouse!

    // Se houver uma linha sendo puxada, conectar imediatamente neste bloco clicado com o botão esquerdo!
    if (pencilSourceId) {
      completeConnection(id);
      return;
    }

    if (pencilMode) {
      // Se a ferramenta lápis estiver ativa na barra, inicia conexão neste bloco
      setPencilSourceId(id);
      setToastMessage(`📍 Linha iniciada em "${id}". Clique no bloco de destino para fixar!`);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    // Modo Seleção / Arrastar
    const isShiftOrCtrl = e.shiftKey || e.ctrlKey || e.metaKey;
    let targetIds: string[];

    if (isShiftOrCtrl) {
      // Alterna seleção deste item
      if (selectedIds.includes(id)) {
        targetIds = selectedIds.filter(item => item !== id);
      } else {
        targetIds = [...selectedIds, id];
      }
    } else {
      // Se clicou em um item que já faz parte do grupo selecionado, mantém o grupo para arrastar todos juntos!
      if (selectedIds.includes(id)) {
        targetIds = selectedIds;
      } else {
        targetIds = [id];
      }
    }

    setSelectedIds(targetIds);
    setSelectedConnId(null);

    // Configura o início do arraste para TODOS os blocos do grupo selecionado
    if (svgRef.current) {
      const svgPt = getSvgCoordinates(e.clientX, e.clientY);
      setDraggingIds(targetIds);
      setDragStartPos(svgPt);

      const initialPosMap: Record<string, { x: number; y: number }> = {};
      graph.elements.forEach(item => {
        if (targetIds.includes(item.id)) {
          initialPosMap[item.id] = { x: item.x || 100, y: item.y || 100 };
        }
      });
      setDragInitialPositions(initialPosMap);
    }
  };

  // Conversão matematicamente precisa de coordenadas de tela para o sistema interno do SVG
  const getSvgCoordinates = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    try {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const transformed = pt.matrixTransform(ctm.inverse());
        return {
          x: Math.round(transformed.x),
          y: Math.round(transformed.y)
        };
      }
    } catch (err) {
      console.error(err);
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round((clientX - rect.left) / zoom),
      y: Math.round((clientY - rect.top) / zoom)
    };
  }, [zoom]);

  // Início de clique no fundo do Canvas SVG (inicia caixa de seleção retangular)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Se o clique foi em um elemento interativo, porta ou conexão, não inicia marquee
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    if (targetTag !== 'svg' && targetTag !== 'rect') return;
    // Se clicou num rect de elemento (não o rect da grade de fundo)
    if ((e.target as HTMLElement).getAttribute('fill') !== 'url(#grid-dots)' && targetTag === 'rect') {
      const rectEl = e.target as HTMLElement;
      if (rectEl.getAttribute('width') !== '100%') return;
    }

    if (pencilMode || pencilSourceId) return;

    const svgPt = getSvgCoordinates(e.clientX, e.clientY);
    setSelectionBox({
      startX: svgPt.x,
      startY: svgPt.y,
      currentX: svgPt.x,
      currentY: svgPt.y
    });

    if (!e.shiftKey && !e.ctrlKey) {
      setSelectedIds([]);
      setSelectedConnId(null);
    }
  };

  // Movimentação do Mouse no Canvas SVG (com projeção de coordenadas 100% exata)
  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const svgPt = getSvgCoordinates(e.clientX, e.clientY);
    setMousePos(svgPt);

    // 1. Arrastar Múltiplos Blocos em Grupo
    if (draggingIds.length > 0) {
      const deltaX = svgPt.x - dragStartPos.x;
      const deltaY = svgPt.y - dragStartPos.y;

      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(el => {
          if (draggingIds.includes(el.id) && dragInitialPositions[el.id]) {
            const init = dragInitialPositions[el.id];
            const rawX = init.x + deltaX;
            const rawY = init.y + deltaY;
            // Snap magnético suave a cada 10px
            const snappedX = Math.max(40, Math.round(rawX / 10) * 10);
            const snappedY = Math.max(40, Math.round(rawY / 10) * 10);
            return { ...el, x: snappedX, y: snappedY };
          }
          return el;
        })
      }));
    }
    // 2. Caixa de Seleção em Retângulo (Marquee Box)
    else if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, currentX: svgPt.x, currentY: svgPt.y } : null);

      const minX = Math.min(selectionBox.startX, svgPt.x);
      const maxX = Math.max(selectionBox.startX, svgPt.x);
      const minY = Math.min(selectionBox.startY, svgPt.y);
      const maxY = Math.max(selectionBox.startY, svgPt.y);

      // Encontra todos os elementos cujas coordenadas caem dentro do retângulo
      const enclosedIds = graph.elements
        .filter(el => {
          const ex = el.x || 100;
          const ey = el.y || 100;
          return ex >= minX - 45 && ex <= maxX + 45 && ey >= minY - 25 && ey <= maxY + 25;
        })
        .map(el => el.id);

      setSelectedIds(enclosedIds);
    }
    // 3. Arrastar Linha / Fio
    else if (draggingConnId) {
      const rawX = svgPt.x - dragConnOffset.x;
      const rawY = svgPt.y - dragConnOffset.y;
      const snappedX = Math.max(20, Math.round(rawX / 10) * 10);
      const snappedY = Math.max(20, Math.round(rawY / 10) * 10);
      setGraph(prev => ({
        ...prev,
        connections: prev.connections.map(c =>
          c.id === draggingConnId
            ? { ...c, waypoint: { x: snappedX, y: snappedY } }
            : c
        )
      }));
    }
  };

  const handleSvgMouseUp = () => {
    if (draggingIds.length > 0) {
      setDraggingIds([]);
      setDragInitialPositions({});
      pushHistory(graph);
    }
    if (selectionBox) {
      setSelectionBox(null);
    }
    if (draggingConnId) {
      setDraggingConnId(null);
      pushHistory(graph);
    }
  };

  // Iniciar arraste da linha pelo ponto de controle ou pelo corpo da conexão
  const handleConnMouseDown = (e: React.MouseEvent, connId: string, currentMidPoint: { x: number; y: number }) => {
    e.stopPropagation();

    // Se estiver usando o Lápis ou puxando uma linha, NÃO arrasta a linha existente!
    if (pencilMode || pencilSourceId) {
      return;
    }

    setSelectedConnId(connId);
    setSelectedIds([]);
    setDraggingConnId(connId);

    const svgPt = getSvgCoordinates(e.clientX, e.clientY);
    setDragConnOffset({
      x: svgPt.x - currentMidPoint.x,
      y: svgPt.y - currentMidPoint.y
    });
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (pencilSourceId) {
      setPencilSourceId(null);
      setPencilSourcePort(undefined);
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

        <span style={{ width: '1px', height: '24px', background: 'var(--card-border)', margin: '0 4px' }} />

        {/* Ferramentas de Imagem (IA Multimodal & Cópia) */}
        <button
          type="button"
          className="filter-btn"
          onClick={() => {
            setPastedImageForModal(null);
            setShowVisionModal(true);
          }}
          style={{
            padding: '7px 13px',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(168, 85, 247, 0.18))',
            borderColor: 'var(--primary)',
            color: 'var(--primary)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Importar diagrama de uma foto, print da tela ou arquivo (Ctrl+V)"
        >
          📷 Importar Print/Imagem (IA)
        </button>

        <button
          type="button"
          className="filter-btn"
          onClick={handleCopyDiagramAsImage}
          style={{
            padding: '7px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title="Copiar imagem do diagrama atual para a área de transferência (Ctrl+V em relatórios ou Word)"
        >
          📋 Copiar Diagrama
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

      {/* Notificação Toast Flutuante (Overlay - Não Empurra o Canvas) */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--primary)',
            borderRadius: '10px',
            padding: '12px 20px',
            color: '#f8fafc',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.3)',
            backdropFilter: 'blur(8px)',
            maxWidth: '460px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '0 4px',
              marginLeft: 'auto'
            }}
          >
            ✕
          </button>
        </div>
      )}



      {/* Canvas SVG Interativo com Suporte a Drag & Drop e Lápis */}
      {(() => {
        const maxDiagramX = Math.max(1450, ...graph.elements.map(e => (e.x || 100) + 240));
        const maxDiagramY = Math.max(540, ...graph.elements.map(e => (e.y || 100) + 140));

        return (
          <div
            style={{
              background: '#040711',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '440px',
              overflow: 'auto',
              position: 'relative',
              cursor: pencilMode ? 'crosshair' : 'default',
              boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.9)'
            }}
            onClick={handleSvgClick}
            onContextMenu={e => e.preventDefault()}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${maxDiagramX} ${maxDiagramY}`}
              width={maxDiagramX}
              height={maxDiagramY}
              onMouseDown={handleCanvasMouseDown}
              onContextMenu={e => e.preventDefault()}
              style={{
                display: 'block',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                transition: 'transform 0.15s ease',
                userSelect: 'none'
              }}
            >
              <defs>
                <marker id="builder-arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker id="builder-arr-sel" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
                </marker>
                <filter id="builder-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.4" />
                </filter>
                <filter id="builder-glow-sel" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.7" />
                </filter>
                <filter id="builder-glow-fb" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Grade de Engenharia em Alta Definição */}
              <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="rgba(56, 189, 248, 0.14)" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid-dots)" />

              {/* Conexões Inteligentes Ortogonais (Port-to-Port Routing) */}
              {graph.connections.map((conn, idx) => {
                const src = graph.elements.find(e => e.id === conn.from);
                const tgt = graph.elements.find(e => e.id === conn.to);
                if (!src || !tgt) return null;

                const isSelected = conn.id === selectedConnId;
                const isDraggingThis = conn.id === draggingConnId;
                const { pathD, signPos, midPoint } = computeSmartConnectionPath(src, tgt, conn, idx, graph.connections.length);

                return (
                  <g
                    key={conn.id}
                    onClick={e => {
                      if (pencilMode || pencilSourceId) return;
                      e.stopPropagation();
                      setSelectedConnId(conn.id);
                      setSelectedId(null);
                    }}
                    style={{
                      cursor: (pencilMode || pencilSourceId) ? 'crosshair' : 'grab',
                      pointerEvents: (pencilMode || pencilSourceId) ? 'none' : 'auto'
                    }}
                  >
                    {/* Canaleta de clique e arraste maior */}
                    <path
                      d={pathD}
                      stroke="transparent"
                      strokeWidth="20"
                      fill="none"
                      style={{ cursor: (pencilMode || pencilSourceId) ? 'crosshair' : 'grab' }}
                      onMouseDown={e => handleConnMouseDown(e, conn.id, midPoint)}
                    />
                    <path
                      d={pathD}
                      stroke={isSelected || isDraggingThis ? '#f59e0b' : '#38bdf8'}
                      strokeWidth={isSelected || isDraggingThis ? '3.5' : '2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      markerEnd={isSelected || isDraggingThis ? 'url(#builder-arr-sel)' : 'url(#builder-arr)'}
                      onMouseDown={e => handleConnMouseDown(e, conn.id, midPoint)}
                    />

                    {/* Alça / Manípulo Central para Arrastar e Dobrar a Linha (SEMPRE VISÍVEL) */}
                    <g
                      onMouseDown={e => handleConnMouseDown(e, conn.id, midPoint)}
                      style={{ cursor: pencilMode ? 'crosshair' : 'grab', pointerEvents: 'auto' }}
                    >
                      <title>Ponto de controle: clique para conectar ou arraste para organizar</title>
                      <circle
                        cx={midPoint.x}
                        cy={midPoint.y}
                        r={isSelected || isDraggingThis ? 9 : 6.5}
                        fill={isSelected || isDraggingThis ? '#f59e0b' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth={isSelected || isDraggingThis ? '2.5' : '1.5'}
                      />
                      {(isSelected || isDraggingThis) && (
                        <circle
                          cx={midPoint.x}
                          cy={midPoint.y}
                          r="14"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                      )}
                    </g>

                    {conn.sign === '-' && (
                      <text
                        x={signPos.x}
                        y={signPos.y}
                        fill="#ef4444"
                        fontSize="16"
                        fontWeight="900"
                        textAnchor="middle"
                        style={{ userSelect: 'none' }}
                      >
                        -
                      </text>
                    )}
                    {conn.sign === '+' && tgt.type === 'summer' && (
                      <text
                        x={signPos.x}
                        y={signPos.y}
                        fill="#10b981"
                        fontSize="15"
                        fontWeight="900"
                        textAnchor="middle"
                        style={{ userSelect: 'none' }}
                      >
                        +
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Linha elástica temporária durante o uso do Lápis / Pontinho */}
              {pencilSourceId && mousePos && (
                (() => {
                  const src = graph.elements.find(e => e.id === pencilSourceId);
                  if (!src) return null;
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <line
                        x1={src.x || 0}
                        y1={src.y || 0}
                        x2={mousePos.x}
                        y2={mousePos.y}
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray="6 4"
                        markerEnd="url(#builder-arr)"
                      />
                      <circle cx={mousePos.x} cy={mousePos.y} r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                })()
              )}

              {/* Elementos Gráficos de Engenharia */}
              {graph.elements.map(el => {
                const isSelected = selectedIds.includes(el.id);
                const isConnectingSource = el.id === pencilSourceId;
                const x = el.x || 100;
                const y = el.y || 100;

                // 1. Somador
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
                        r="20"
                        fill="#0b1322"
                        stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : '#10b981'}
                        strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                        filter={isSelected ? 'url(#builder-glow-sel)' : undefined}
                      />
                      <text x={x} y={y - 27} fill="#10b981" fontSize="10.5" textAnchor="middle" fontWeight="bold">
                        {el.name} (∑)
                      </text>
                      <text x={x} y={y + 5} fill="#10b981" fontSize="15" fontWeight="900" textAnchor="middle">
                        ∑
                      </text>

                      {/* Pinos / Pontinhos de Conexão Interativos (Estilo Altair) */}
                      {[
                        { side: 'left' as const, cx: x - 20, cy: y },
                        { side: 'right' as const, cx: x + 20, cy: y },
                        { side: 'top' as const, cx: x, cy: y - 20 },
                        { side: 'bottom' as const, cx: x, cy: y + 20 }
                      ].map(pt => (
                        <g
                          key={pt.side}
                          onMouseDown={e => handlePortMouseDown(e, el.id, pt.side)}
                          onClick={e => handlePortMouseDown(e, el.id, pt.side)}
                          style={{ cursor: 'crosshair' }}
                        >
                          <title>{`Pontinho de conexão de ${el.name}`}</title>
                          <circle cx={pt.cx} cy={pt.cy} r="18" fill="transparent" />
                          <circle
                            cx={pt.cx}
                            cy={pt.cy}
                            r={pencilSourceId === el.id ? 8.5 : 6}
                            fill={pencilSourceId === el.id ? '#f59e0b' : '#10b981'}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                        </g>
                      ))}
                    </g>
                  );
                }

                // 2. Entrada / Saída
                if (el.type === 'input' || el.type === 'output') {
                  const isInput = el.type === 'input';
                  return (
                    <g
                      key={el.id}
                      onMouseDown={e => handleNodeMouseDown(e, el.id)}
                      style={{ cursor: pencilMode ? 'crosshair' : 'move' }}
                    >
                      <rect
                        x={x - 30}
                        y={y - 18}
                        width="60"
                        height="36"
                        rx="18"
                        fill="#0c1729"
                        stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : '#38bdf8'}
                        strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                        filter={isSelected ? 'url(#builder-glow-sel)' : 'url(#builder-glow)'}
                      />
                      <text x={x} y={y + 4} fill="#f8fafc" fontSize="11.5" fontWeight="bold" textAnchor="middle">
                        {el.name}
                      </text>

                      {/* Pino / Pontinho de Conexão Interativo */}
                      <g
                        onMouseDown={e => handlePortMouseDown(e, el.id, isInput ? 'right' : 'left')}
                        onClick={e => handlePortMouseDown(e, el.id, isInput ? 'right' : 'left')}
                        style={{ cursor: 'crosshair' }}
                      >
                        <title>{`Pontinho de ${el.name}`}</title>
                        <circle cx={isInput ? x + 30 : x - 30} cy={y} r="18" fill="transparent" />
                        <circle
                          cx={isInput ? x + 30 : x - 30}
                          cy={y}
                          r={pencilSourceId === el.id ? 8.5 : 6}
                          fill={pencilSourceId === el.id ? '#f59e0b' : '#38bdf8'}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    </g>
                  );
                }

                // 3. Bloco Dinâmico G(s) ou H(s)
                const isFeedback = el.dir === 'left';
                return (
                  <g
                    key={el.id}
                    onMouseDown={e => handleNodeMouseDown(e, el.id)}
                    style={{ cursor: pencilMode ? 'crosshair' : 'move' }}
                  >
                    {/* Corpo do Bloco com Largura Confortável de 110px */}
                    <rect
                      x={x - 55}
                      y={y - 26}
                      width="110"
                      height="52"
                      rx="8"
                      fill={isFeedback ? '#150c26' : '#0c1626'}
                      stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : isFeedback ? '#a855f7' : '#38bdf8'}
                      strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                      filter={isSelected ? 'url(#builder-glow-sel)' : isFeedback ? 'url(#builder-glow-fb)' : 'url(#builder-glow)'}
                    />

                    {/* Tag / Badge de Identificação */}
                    <rect
                      x={x - 32}
                      y={y - 37}
                      width="64"
                      height="16"
                      rx="4"
                      fill={isFeedback ? '#2e1065' : '#082f49'}
                      stroke={isFeedback ? '#a855f7' : '#38bdf8'}
                      strokeWidth="1"
                    />
                    <text x={x} y={y - 25} fill="#f1f5f9" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                      {el.name} {isFeedback ? '⬅' : '➔'}
                    </text>

                    {/* Expressão Algébrica de Laplace no Centro */}
                    <text x={x} y={y + 5} fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">
                      {el.expr || '1'}
                    </text>

                    {/* Pinos / Pontinhos de Conexão Interativos (Estilo Altair) */}
                    {[
                      { side: 'left' as const, cx: x - 55, cy: y },
                      { side: 'right' as const, cx: x + 55, cy: y },
                      { side: 'top' as const, cx: x, cy: y - 26 },
                      { side: 'bottom' as const, cx: x, cy: y + 26 }
                    ].map(pt => (
                      <g
                        key={pt.side}
                        onMouseDown={e => handlePortMouseDown(e, el.id, pt.side)}
                        onClick={e => handlePortMouseDown(e, el.id, pt.side)}
                        style={{ cursor: 'crosshair' }}
                      >
                        <title>{`Pontinho de conexão (${pt.side}) de ${el.name}`}</title>
                        {/* Área de toque maior (r=20) para o mouse acertar instantaneamente */}
                        <circle cx={pt.cx} cy={pt.cy} r="20" fill="transparent" />
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r={pencilSourceId === el.id ? 8.5 : 6}
                          fill={pencilSourceId === el.id ? '#f59e0b' : isFeedback ? '#c084fc' : '#38bdf8'}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    ))}
                  </g>
                );
              })}

              {/* Retângulo de Seleção em Área (Marquee Box) */}
              {selectionBox && (
                <rect
                  x={Math.min(selectionBox.startX, selectionBox.currentX)}
                  y={Math.min(selectionBox.startY, selectionBox.currentY)}
                  width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                  height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                  fill="rgba(56, 189, 248, 0.12)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  pointerEvents="none"
                />
              )}
            </svg>
          </div>
        );
      })()}

      {/* Painel Inferior de Parâmetros de Todos os Blocos Criados */}
      {(() => {
        const blocksList = graph.elements.filter(e => e.type === 'block');
        if (blocksList.length === 0) return null;

        return (
          <div
            style={{
              marginTop: '18px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '18px 22px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '14px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 800
                  }}
                >
                  <span>📋</span>
                  <span>Parâmetros de Todos os Blocos do Diagrama ({blocksList.length})</span>
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Edite diretamente as funções de transferência <code style={{ color: '#38bdf8' }}>G(s)</code> e <code style={{ color: '#c084fc' }}>H(s)</code> de cada bloco. As alterações são sincronizadas instantaneamente com o diagrama e com a fórmula de Mason.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleAddBlock(false)}
                  style={{ fontSize: '0.78rem', padding: '6px 12px', fontWeight: 600 }}
                >
                  ➕ Adicionar G(s) Direto
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleAddBlock(true)}
                  style={{ fontSize: '0.78rem', padding: '6px 12px', fontWeight: 600, color: '#c084fc' }}
                >
                  ➕ Adicionar H(s) Feedback
                </button>
              </div>
            </div>

            {/* Grid com 1 Espaço de Edição para Cada Bloco */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '14px'
              }}
            >
              {blocksList.map((blk, idx) => {
                const isSelected = selectedIds.includes(blk.id);
                const isFeedback = blk.dir === 'left';
                const themeColor = isFeedback ? '#c084fc' : '#38bdf8';
                const themeBg = isFeedback ? 'rgba(192, 132, 252, 0.08)' : 'rgba(56, 189, 248, 0.08)';

                return (
                  <div
                    key={blk.id}
                    onClick={() => setSelectedId(blk.id)}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.12)' : themeBg,
                      border: `1px solid ${isSelected ? themeColor : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      boxShadow: isSelected ? `0 0 12px ${themeColor}33` : 'none'
                    }}
                  >
                    {/* Cabeçalho do Bloco */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: `${themeColor}22`,
                            color: themeColor,
                            fontWeight: 800,
                            fontSize: '0.75rem'
                          }}
                        >
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={blk.name}
                          onChange={e => handleSpecificBlockNameChange(blk.id, e.target.value)}
                          onBlur={handleExprBlur}
                          onClick={e => e.stopPropagation()}
                          style={{
                            background: 'transparent',
                            border: '1px solid transparent',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            width: '80px',
                            borderRadius: '4px',
                            padding: '2px 4px'
                          }}
                          onFocus={e => (e.target.style.border = '1px solid rgba(255,255,255,0.3)')}
                        />
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isFeedback ? 'rgba(168,85,247,0.2)' : 'rgba(56,189,248,0.2)',
                            color: themeColor,
                            fontWeight: 600
                          }}
                        >
                          {isFeedback ? '⬅ Retorno' : '➔ Ramo Direto'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedId(blk.id);
                          handleDeleteSelected();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                        title={`Excluir ${blk.name}`}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Campo de Entrada de Valor / Função de Transferência */}
                    <div style={{ marginBottom: '8px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginBottom: '4px',
                          fontWeight: 600
                        }}
                      >
                        Função de Transferência {blk.name}(s):
                      </label>
                      <input
                        type="text"
                        value={blk.expr || ''}
                        onChange={e => handleSpecificBlockExprChange(blk.id, e.target.value)}
                        onBlur={handleExprBlur}
                        onClick={e => e.stopPropagation()}
                        placeholder="Ex: 5/(s+2), 10, 1/(s^2+3s+2)"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'rgba(0,0,0,0.4)',
                          border: `1px solid ${isSelected ? themeColor : 'rgba(255,255,255,0.15)'}`,
                          color: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          fontSize: '0.88rem',
                          fontFamily: 'monospace',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Renderização KaTeX da Expressão do Bloco */}
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        minHeight: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflowX: 'auto'
                      }}
                    >
                      <MathView math={`${blk.name}(s) = ${blk.expr || '1'}`} inline />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Memorial Analítico Passo a Passo Completo da Regra de Mason */}
      {analysisResult && (
        <MasonDeductionView analysis={analysisResult} />
      )}

      {/* Modal de Importação de Diagrama por Imagem / Print (IA) */}
      <VisionImportModal
        isOpen={showVisionModal}
        onClose={() => setShowVisionModal(false)}
        onImportGraph={handleImportGraph}
        initialImageBase64={pastedImageForModal}
      />
    </div>
  );
};
