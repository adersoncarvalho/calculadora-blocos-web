'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  DiagramGraph,
  DiagramElement,
  DiagramConnection,
  computeMasonAnalysis,
  MasonAnalysis
} from '@/core/reduction/mason';
import { parseRatExpr } from '@/core/algebra/parser';
import { MathView } from '@/components/MathView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { VisionImportModal } from './VisionImportModal';
import {
  autoLayoutDiagram,
  computeSmartConnectionPath,
  computePencilPreviewPath,
  getElementEightPorts,
  getElementPort,
  splitTransferFunction,
  combineTransferFunction,
  snapToGrid,
  snapPointToGrid,
  CompassDirection,
  PortSide,
  Point,
  GRID_SIZE,
  SNAP_STEP
} from './layoutEngine';
import { MasonDeductionView } from './MasonDeductionView';

interface BuilderSectionProps {
  onBack: () => void;
  onOpenGuide?: () => void;
}

interface ActiveDraftConnection {
  pendingConnId?: string;
  from: string;
  fromPort: CompassDirection;
  waypoints: Point[];
}

export const BuilderSection: React.FC<BuilderSectionProps> = ({ onBack }) => {
  // Estado inicial padrão: Malha Fechada Canônica com identificações automáticas preservadas
  const initialGraph: DiagramGraph = {
    elements: [
      { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 220 },
      { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 240, y: 220 },
      { id: 'g1', code: 'G1', type: 'block', name: 'G1', expr: '10/(s+2)', x: 420, y: 220, dir: 'right' },
      { id: 'h1', code: 'H1', type: 'block', name: 'H1', expr: '1', x: 420, y: 340, dir: 'left' },
      { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 620, y: 220 }
    ],
    connections: [
      { id: 'c1', from: 'IN', to: 's1', fromPort: 'E', toPort: 'W', sign: '+' },
      { id: 'c2', from: 's1', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
      { id: 'c3', from: 'g1', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' },
      { id: 'c4', from: 'g1', to: 'h1', fromPort: 'S', toPort: 'E', sign: '+' },
      { id: 'c5', from: 'h1', to: 's1', fromPort: 'W', toPort: 'S', sign: '-' }
    ]
  };

  const [graph, setGraph] = useState<DiagramGraph>(initialGraph);
  const [selectedIds, setSelectedIds] = useState<string[]>(['g1']);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : []);
  }, []);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);

  // Painel Lateral Esquerdo Recolhível
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Histórico de Desfazer / Refazer (Undo / Redo)
  const [history, setHistory] = useState<DiagramGraph[]>([initialGraph]);
  const [historyStep, setHistoryStep] = useState<number>(0);

  // Ferramenta Lápis — Sistema Inteligente de 8 Pontos e Conexões Interrompidas
  const [pencilMode, setPencilMode] = useState<boolean>(false);
  const [activeDraft, setActiveDraft] = useState<ActiveDraftConnection | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{ elementId: string; side: CompassDirection } | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // Arrastar Elementos no Canvas (preservando alinhamento à grade)
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragStartPos, setDragStartPos] = useState<Point>({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Record<string, Point>>({});

  // Arrastar Ponto de Ancoragem de Conexão
  const [draggingConnId, setDraggingConnId] = useState<string | null>(null);
  const [draggingAnchorIndex, setDraggingAnchorIndex] = useState<number>(-1);

  // Caixa de Seleção (Shift + Arrastar)
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Zoom e Movimentação (Pan) da Área de Desenho (independentes das coordenadas lógicas)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStartClient, setPanStartClient] = useState<Point>({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState<Point>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Estados Locais do Painel de Propriedades (Seção B da Lateral Esquerda)
  const [propName, setPropName] = useState<string>('');
  const [propExpr, setPropExpr] = useState<string>('');
  const [propNum, setPropNum] = useState<string>('');
  const [propDen, setPropDen] = useState<string>('');
  const [propDir, setPropDir] = useState<'right' | 'left'>('right');

  // Modal de Visão por IA e Toast
  const [showVisionModal, setShowVisionModal] = useState<boolean>(false);
  const [pastedImageForModal, setPastedImageForModal] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Redução de Mason (com suporte a múltiplas entradas como R(s) e W(s) e saídas C(s)/y(s))
  const [analysisResult, setAnalysisResult] = useState<MasonAnalysis | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('malha_simples');
  const [activeInputId, setActiveInputId] = useState<string>('IN');
  const [activeOutputId, setActiveOutputId] = useState<string>('OUT');
  const masonSectionRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((msg: string, duration = 3500) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, duration);
  }, []);

  // Sincroniza os campos do Painel de Propriedades sempre que a seleção mudar
  const selectedElement = useMemo(
    () => graph.elements.find(e => e.id === selectedId) || null,
    [graph.elements, selectedId]
  );

  const selectedConnection = useMemo(
    () => graph.connections.find(c => c.id === selectedConnId) || null,
    [graph.connections, selectedConnId]
  );

  useEffect(() => {
    if (selectedElement) {
      setPropName(selectedElement.name || '');
      const expr = selectedElement.expr || '1';
      setPropExpr(expr);
      const { num, den } = splitTransferFunction(expr);
      setPropNum(num);
      setPropDen(den);
      setPropDir(selectedElement.dir === 'left' ? 'left' : 'right');
    }
  }, [selectedElement?.id, selectedElement?.name, selectedElement?.expr, selectedElement?.dir]);

  // Mantém activeInputId e activeOutputId sincronizados com os elementos existentes
  useEffect(() => {
    const inputs = graph.elements.filter(e => e.type === 'input');
    const outputs = graph.elements.filter(e => e.type === 'output');
    if (inputs.length > 0 && !inputs.some(i => i.id === activeInputId)) {
      const refInput = inputs.find(i => i.subType !== 'disturbance') || inputs[0];
      setActiveInputId(refInput.id);
    }
    if (outputs.length > 0 && !outputs.some(o => o.id === activeOutputId)) {
      setActiveOutputId(outputs[0].id);
    }
  }, [graph.elements, activeInputId, activeOutputId]);

  // Adiciona estado ao histórico
  const pushHistory = useCallback(
    (newGraph: DiagramGraph) => {
      setHistory(prev => {
        const upToCurrent = prev.slice(0, historyStep + 1);
        return [...upToCurrent, newGraph];
      });
      setHistoryStep(prev => prev + 1);
    },
    [historyStep]
  );

  // Função Desfazer (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setGraph(history[prevStep]);
      setActiveDraft(null);
      setAnalysisResult(null);
    }
  }, [historyStep, history]);

  // Função Refazer (Ctrl+Y)
  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setGraph(history[nextStep]);
      setActiveDraft(null);
      setAnalysisResult(null);
    }
  }, [historyStep, history]);

  // Gerador de Identificações Automáticas (G1, G2..., H1, H2..., R1..., C1..., W1..., S1...)
  const getNextElementCode = useCallback(
    (prefix: 'G' | 'H' | 'R' | 'C' | 'W' | 'S'): string => {
      const existingCodes = new Set(
        graph.elements.map(e => (e.code || e.name || '').toUpperCase())
      );
      let idx = 1;
      while (existingCodes.has(`${prefix}${idx}`)) {
        idx++;
      }
      return `${prefix}${idx}`;
    },
    [graph.elements]
  );

  // Conversão precisa de coordenadas de tela para coordenadas lógicas (independente de zoom e pan)
  const getLogicalCoordinates = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!svgRef.current) return { x: 200, y: 200 };
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = (clientX - rect.left - pan.x) / zoom;
      const rawY = (clientY - rect.top - pan.y) / zoom;
      return {
        x: Math.round(rawX),
        y: Math.round(rawY)
      };
    },
    [zoom, pan]
  );

  // Zoom com a roda do mouse na área de desenho
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom(prevZoom => {
        const nextZoom = Math.min(2.4, Math.max(0.4, Number((prevZoom + delta).toFixed(2))));
        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Interromper temporariamente uma conexão ativa em um ponto da grade (criando bolinha de retomada)
  const interruptActiveConnectionAt = useCallback(
    (pt: Point) => {
      if (!activeDraft) return;
      const snapped = snapPointToGrid(pt, SNAP_STEP);
      const nextWaypoints = [...activeDraft.waypoints, snapped];

      if (activeDraft.pendingConnId) {
        const updated: DiagramGraph = {
          ...graph,
          connections: graph.connections.map(c =>
            c.id === activeDraft.pendingConnId
              ? { ...c, waypoints: nextWaypoints, isPending: true }
              : c
          )
        };
        setGraph(updated);
        pushHistory(updated);
      } else {
        const pendingConn: DiagramConnection = {
          id: `pending_${Date.now()}`,
          from: activeDraft.from,
          to: '',
          fromPort: activeDraft.fromPort,
          waypoints: nextWaypoints,
          isPending: true,
          sign: '+'
        };
        const updated: DiagramGraph = {
          ...graph,
          connections: [...graph.connections, pendingConn]
        };
        setGraph(updated);
        pushHistory(updated);
      }

      setActiveDraft(null);
      showToast('⏸️ Conexão pausada na grade. Clique na bolinha na extremidade com o Lápis para retomar quando quiser!');
    },
    [activeDraft, graph, pushHistory, showToast]
  );

  // Excluir Elemento(s) ou Conexão Selecionada (incluindo R(s), C(s), W(s), G(s), H(s), Somadores e Conexões)
  const handleDeleteSelected = useCallback(() => {
    if (selectedConnId) {
      const updated: DiagramGraph = {
        ...graph,
        connections: graph.connections.filter(c => c.id !== selectedConnId)
      };
      setGraph(updated);
      pushHistory(updated);
      setSelectedConnId(null);
      showToast('🗑️ Conexão excluída.');
      return;
    }

    if (selectedIds.length === 0) return;
    const idsToDelete = new Set(selectedIds);

    const updated: DiagramGraph = {
      elements: graph.elements.filter(e => !idsToDelete.has(e.id)),
      connections: graph.connections.filter(c => !idsToDelete.has(c.from) && !idsToDelete.has(c.to))
    };
    setGraph(updated);
    pushHistory(updated);
    setSelectedIds([]);
    setActiveDraft(null);
    showToast('🗑️ Elemento(s) excluído(s) do diagrama.');
  }, [selectedConnId, selectedIds, graph, pushHistory, showToast]);

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === 'Escape') {
        if (activeDraft) {
          setActiveDraft(null);
          showToast('Desenho de linha atual cancelado.');
        } else {
          setPencilMode(false);
        }
      } else if (!isInputFocused && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (!isInputFocused && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (!isInputFocused && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDraft, handleUndo, handleRedo, handleDeleteSelected, showToast]);

  // Captura global de Print (Ctrl+V) com imagem
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

  // Importar Grafo Reconhecido pela IA
  const handleImportGraph = (importedGraph: DiagramGraph, title?: string) => {
    const optimized = autoLayoutDiagram(importedGraph);
    setGraph(optimized);
    pushHistory(optimized);
    const firstBlock = optimized.elements.find(e => e.type === 'block');
    setSelectedId(firstBlock ? firstBlock.id : null);
    setSelectedConnId(null);
    setActiveDraft(null);
    setAnalysisResult(null);
    showToast(title ? `✨ "${title}" importado e alinhado à grade!` : '✨ Diagrama importado com sucesso!');
  };

  // Copiar Imagem do Diagrama
  const handleCopyDiagramAsImage = async () => {
    if (!svgRef.current) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1800;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050811';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async pngBlob => {
            if (pngBlob && navigator.clipboard && navigator.clipboard.write) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
              showToast('📋 Imagem do diagrama copiada para a área de transferência!');
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
    setActiveDraft(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);

    let newGraph: DiagramGraph;

    if (tpl === 'vazio_total') {
      newGraph = {
        elements: [],
        connections: []
      };
    } else if (tpl === 'em_branco') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 220 },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 660, y: 220 }
        ],
        connections: []
      };
    } else if (tpl === 'cascata') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 220 },
          { id: 'g1', code: 'G1', type: 'block', name: 'G1', expr: '4/(s+1)', x: 280, y: 220, dir: 'right' },
          { id: 'g2', code: 'G2', type: 'block', name: 'G2', expr: '5/(s+2)', x: 480, y: 220, dir: 'right' },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 660, y: 220 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c2', from: 'g1', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c3', from: 'g2', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' }
        ]
      };
    } else if (tpl === 'paralelo') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 100, y: 220 },
          { id: 'g1', code: 'G1', type: 'block', name: 'G1', expr: '6/(s+2)', x: 320, y: 140, dir: 'right' },
          { id: 'g2', code: 'G2', type: 'block', name: 'G2', expr: '3/(s+4)', x: 320, y: 300, dir: 'right' },
          { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 520, y: 220 },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 680, y: 220 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c2', from: 'IN', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c3', from: 'g1', to: 's1', fromPort: 'E', toPort: 'N', sign: '+' },
          { id: 'c4', from: 'g2', to: 's1', fromPort: 'E', toPort: 'S', sign: '+' },
          { id: 'c5', from: 's1', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' }
        ]
      };
    } else if (tpl === 'exemplo1') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 80, y: 220 },
          { id: 'g1', code: 'G1', type: 'block', name: 'K', expr: '10', x: 240, y: 220, dir: 'right' },
          { id: 'g2', code: 'G2', type: 'block', name: 'G1', expr: '1/s', x: 420, y: 220, dir: 'right' },
          { id: 'g3', code: 'G3', type: 'block', name: 'G2', expr: '2/(s+5)', x: 600, y: 220, dir: 'right' },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 760, y: 220 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c2', from: 'g1', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c3', from: 'g2', to: 'g3', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c4', from: 'g3', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' }
        ]
      };
    } else if (tpl === 'malhas_duplas') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 80, y: 220 },
          { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 200, y: 220 },
          { id: 'g1', code: 'G1', type: 'block', name: 'G1', expr: '2/(s+1)', x: 340, y: 220, dir: 'right' },
          { id: 's2', code: 'S2', type: 'summer', name: 'S2', x: 480, y: 220 },
          { id: 'g2', code: 'G2', type: 'block', name: 'G2', expr: '3/(s+2)', x: 620, y: 220, dir: 'right' },
          { id: 'h1', code: 'H1', type: 'block', name: 'H1', expr: '1', x: 560, y: 320, dir: 'left' },
          { id: 'h2', code: 'H2', type: 'block', name: 'H2', expr: '2', x: 420, y: 400, dir: 'left' },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 780, y: 220 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 's1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c2', from: 's1', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c3', from: 'g1', to: 's2', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c4', from: 's2', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c5', from: 'g2', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c6', from: 'g2', to: 'h1', fromPort: 'S', toPort: 'E', sign: '+' },
          { id: 'c7', from: 'h1', to: 's2', fromPort: 'W', toPort: 'S', sign: '-' },
          { id: 'c8', from: 'g2', to: 'h2', fromPort: 'S', toPort: 'E', sign: '+' },
          { id: 'c9', from: 'h2', to: 's1', fromPort: 'W', toPort: 'S', sign: '-' }
        ]
      };
    } else {
      newGraph = { ...initialGraph };
    }

    setGraph(newGraph);
    pushHistory(newGraph);
  };

  // =========================================================================
  // COMANDOS DE ADIÇÃO DE ELEMENTOS (SEÇÃO A — FERRAMENTAS)
  // =========================================================================

  // 1. Adicionar Entrada R(s) Independente
  const handleAddInput = () => {
    const code = getNextElementCode('R');
    const count = graph.elements.filter(e => e.type === 'input' && e.subType !== 'disturbance').length;
    const newId = count === 0 && !graph.elements.some(e => e.id === 'IN') ? 'IN' : `in_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'input',
      subType: 'reference',
      name: count === 0 ? 'R(s)' : `R${count + 1}(s)`,
      x: snapToGrid(100, GRID_SIZE),
      y: snapToGrid(220 + count * 100, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 2. Adicionar Saída C(s) Independente
  const handleAddOutput = () => {
    const code = getNextElementCode('C');
    const count = graph.elements.filter(e => e.type === 'output').length;
    const newId = count === 0 && !graph.elements.some(e => e.id === 'OUT') ? 'OUT' : `out_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'output',
      name: count === 0 ? 'C(s)' : `C${count + 1}(s)`,
      x: snapToGrid(720, GRID_SIZE),
      y: snapToGrid(220 + count * 100, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 3. Adicionar Entrada de Perturbação W(s)
  const handleAddDisturbance = () => {
    const code = getNextElementCode('W');
    const count = graph.elements.filter(e => e.subType === 'disturbance').length;
    const newId = `dist_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'input',
      subType: 'disturbance',
      name: count === 0 ? 'W(s)' : `W${count + 1}(s)`,
      x: snapToGrid(460 + count * 120, GRID_SIZE),
      y: snapToGrid(100, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 4. Adicionar Bloco G(s) ou H(s) com Identificação Automática (G1, G2... / H1, H2...)
  const handleAddBlock = (isFeedback = false) => {
    const code = getNextElementCode(isFeedback ? 'H' : 'G');
    const count = graph.elements.filter(e => e.type === 'block' && (isFeedback ? e.dir === 'left' : e.dir !== 'left')).length;
    const newId = `${isFeedback ? 'h' : 'g'}_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'block',
      name: code,
      expr: isFeedback ? '1' : '5/(s+3)',
      x: snapToGrid(300 + (count % 4) * 140, GRID_SIZE),
      y: snapToGrid(isFeedback ? 340 + (count % 2) * 80 : 220, GRID_SIZE),
      dir: isFeedback ? 'left' : 'right'
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 5. Adicionar Somador com Identificação Automática (S1, S2...)
  const handleAddSummer = () => {
    const code = getNextElementCode('S');
    const count = graph.elements.filter(e => e.type === 'summer').length;
    const newId = `sum_${Date.now()}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'summer',
      name: code,
      x: snapToGrid(240 + (count % 4) * 160, GRID_SIZE),
      y: snapToGrid(220, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // Alternar Sinal (+ / -) da Conexão ou Somador
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

  // Alterar Sinal de uma Conexão Específica (usado na Seção B do Somador)
  const handleSetConnectionSign = (connId: string, sign: '+' | '-') => {
    const updated: DiagramGraph = {
      ...graph,
      connections: graph.connections.map(c => (c.id === connId ? { ...c, sign } : c))
    };
    setGraph(updated);
    pushHistory(updated);
  };

  // Auto-Organizar Coordenadas
  const handleAutoLayout = () => {
    const organized = autoLayoutDiagram(graph);
    setGraph(organized);
    pushHistory(organized);
    showToast('📐 Diagrama auto-organizado e alinhado à grade!');
  };

  // Limpar Tudo
  const handleClearAll = () => {
    const emptyGraph: DiagramGraph = { elements: [], connections: [] };
    setGraph(emptyGraph);
    pushHistory(emptyGraph);
    setSelectedIds([]);
    setSelectedConnId(null);
    setActiveDraft(null);
    setAnalysisResult(null);
    showToast('🗑️ Área de desenho limpa. Adicione elementos pelo painel esquerdo!');
  };

  // =========================================================================
  // EDIÇÃO DE PROPRIEDADES NA LATERAL ESQUERDA (SEÇÃO B)
  // =========================================================================

  const handlePropNumDenChange = (newNum: string, newDen: string) => {
    setPropNum(newNum);
    setPropDen(newDen);
    const combined = combineTransferFunction(newNum, newDen);
    setPropExpr(combined);
    if (selectedId) {
      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(e =>
          e.id === selectedId ? { ...e, expr: combined, rat: parseRatExpr(combined) } : e
        )
      }));
    }
  };

  const handlePropExprDirectChange = (newExpr: string) => {
    setPropExpr(newExpr);
    const { num, den } = splitTransferFunction(newExpr);
    setPropNum(num);
    setPropDen(den);
    if (selectedId) {
      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(e =>
          e.id === selectedId ? { ...e, expr: newExpr, rat: parseRatExpr(newExpr) } : e
        )
      }));
    }
  };

  const handlePropNameDirectChange = (newName: string) => {
    setPropName(newName);
    if (selectedId) {
      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(e => (e.id === selectedId ? { ...e, name: newName } : e))
      }));
    }
  };

  const handleApplyElementProperties = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedId || !selectedElement) return;

    const finalName = propName.trim() || selectedElement.code || selectedElement.name;
    const finalExpr = propExpr.trim() || '1';

    const updated: DiagramGraph = {
      ...graph,
      elements: graph.elements.map(el => {
        if (el.id !== selectedId) return el;
        if (el.type === 'block') {
          return {
            ...el,
            name: finalName,
            expr: finalExpr,
            rat: parseRatExpr(finalExpr),
            dir: propDir
          };
        }
        return {
          ...el,
          name: finalName
        };
      })
    };

    setGraph(updated);
    pushHistory(updated);
    showToast(`✓ Propriedades de "${finalName}" aplicadas!`);
  };

  // =========================================================================
  // SISTEMA INTELIGENTE DE CONEXÕES — 8 PONTOS DA ROSA DOS VENTOS + BOLINHA
  // =========================================================================

  const finalizeConnectionToPort = (targetId: string, targetSide: CompassDirection) => {
    if (!activeDraft) return;
    if (activeDraft.from === targetId) {
      showToast('⚠️ Selecione um ponto em outro bloco para fechar a conexão.');
      return;
    }

    // Evita conexões idênticas duplicadas
    const isDuplicate = graph.connections.some(
      c =>
        !c.isPending &&
        c.id !== activeDraft.pendingConnId &&
        c.from === activeDraft.from &&
        c.to === targetId &&
        c.fromPort === activeDraft.fromPort &&
        c.toPort === targetSide
    );
    if (isDuplicate) {
      showToast('⚠️ Esta conexão já existe entre os dois pontos selecionados.');
      setActiveDraft(null);
      return;
    }

    const srcEl = graph.elements.find(el => el.id === activeDraft.from);
    const targetEl = graph.elements.find(el => el.id === targetId);
    const defaultSign: '+' | '-' =
      targetEl?.type === 'summer' &&
      (targetSide === 'S' || targetSide === 'SW' || targetSide === 'SE' || srcEl?.dir === 'left')
        ? '-'
        : '+';

    const finalizedConn: DiagramConnection = {
      id: activeDraft.pendingConnId || `conn_${Date.now()}`,
      from: activeDraft.from,
      to: targetId,
      fromPort: activeDraft.fromPort,
      toPort: targetSide,
      waypoints: activeDraft.waypoints.map(wp => snapPointToGrid(wp, SNAP_STEP)),
      isPending: false,
      sign: defaultSign
    };

    const nextConnections = activeDraft.pendingConnId
      ? graph.connections.map(c => (c.id === activeDraft.pendingConnId ? finalizedConn : c))
      : [...graph.connections, finalizedConn];

    const updated: DiagramGraph = {
      ...graph,
      connections: nextConnections
    };

    setGraph(updated);
    pushHistory(updated);
    setActiveDraft(null);
    setSelectedConnId(finalizedConn.id);
    showToast(`✅ Conexão finalizada: ${srcEl?.name || activeDraft.from} (${activeDraft.fromPort}) ➔ ${targetEl?.name || targetId} (${targetSide})`);
  };

  // Clique em um dos 8 pontos da Rosa dos Ventos de um bloco
  const handlePortClick = (e: React.MouseEvent, elementId: string, side: CompassDirection) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (!activeDraft) {
      // Inicia o desenho da conexão a partir deste ponto da rosa dos ventos
      setPencilMode(true);
      setActiveDraft({
        from: elementId,
        fromPort: side,
        waypoints: []
      });
      const el = graph.elements.find(item => item.id === elementId);
      showToast(`✏️ Conexão iniciada em ${el?.name || elementId} [${side}]. Clique na grade para pausar ou em outro ponto para finalizar.`);
    } else {
      // Finaliza a conexão no ponto selecionado do segundo bloco
      finalizeConnectionToPort(elementId, side);
    }
  };

  // Clique na bolinha de uma conexão temporariamente interrompida para retomá-la
  const handleResumePendingConnection = (e: React.MouseEvent, conn: DiagramConnection) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    setPencilMode(true);
    const existingWps: Point[] = Array.isArray(conn.waypoints) ? conn.waypoints : [];
    setActiveDraft({
      pendingConnId: conn.id,
      from: conn.from,
      fromPort: (conn.fromPort as CompassDirection) || 'E',
      waypoints: existingWps
    });
    setSelectedConnId(conn.id);
    showToast('✏️ Conexão retomada! Continue pela grade ou clique em um dos 8 pontos de um bloco para finalizar.');
  };

  // Clique ou início de arraste em um elemento do circuito
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    // Se estiver com uma linha sendo desenhada no Lápis e clicar no corpo do bloco, escolhe a porta mais próxima
    if (activeDraft && activeDraft.from !== id) {
      const targetEl = graph.elements.find(el => el.id === id);
      if (targetEl) {
        const clickPt = getLogicalCoordinates(e.clientX, e.clientY);
        const ports = getElementEightPorts(targetEl);
        let bestPort = ports[0];
        let bestDist = Infinity;
        for (const p of ports) {
          const d = Math.hypot(p.x - clickPt.x, p.y - clickPt.y);
          if (d < bestDist) {
            bestDist = d;
            bestPort = p;
          }
        }
        finalizeConnectionToPort(id, bestPort.side);
        return;
      }
    }

    if (pencilMode) {
      // No modo Lápis, clicar no elemento também o seleciona sem deslocar a tela
      setSelectedId(id);
      setSelectedConnId(null);
      return;
    }

    // Seleção de elemento (carrega propriedades na Seção B sem alterar zoom ou coordenadas)
    const isShiftOrCtrl = e.shiftKey || e.ctrlKey || e.metaKey;
    let targetIds: string[];

    if (isShiftOrCtrl) {
      targetIds = selectedIds.includes(id)
        ? selectedIds.filter(item => item !== id)
        : [...selectedIds, id];
    } else {
      targetIds = selectedIds.includes(id) ? selectedIds : [id];
    }

    setSelectedIds(targetIds);
    setSelectedConnId(null);

    // Inicia arraste na grade lógica
    const logicalPt = getLogicalCoordinates(e.clientX, e.clientY);
    setDraggingIds(targetIds);
    setDragStartPos(logicalPt);

    const initialPosMap: Record<string, Point> = {};
    graph.elements.forEach(item => {
      if (targetIds.includes(item.id)) {
        initialPosMap[item.id] = { x: item.x || 100, y: item.y || 100 };
      }
    });
    setDragInitialPositions(initialPosMap);
  };

  // Duplo clique em qualquer elemento: seleciona, garante painel esquerdo aberto e foca na edição
  const handleNodeDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    setSelectedConnId(null);
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 60);
  };

  // Clique ou arraste em região vazia do Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const isBackground =
      target.tagName.toLowerCase() === 'svg' ||
      target.getAttribute('data-canvas-bg') === 'true';

    if (!isBackground) return;

    const logicalPt = getLogicalCoordinates(e.clientX, e.clientY);

    // Se houver uma conexão ativa no Lápis, clicar no fundo interrompe temporariamente a conexão naquele ponto da grade!
    if (activeDraft) {
      interruptActiveConnectionAt(logicalPt);
      return;
    }

    if (e.shiftKey) {
      // Shift + Arrastar: Caixa de seleção múltipla
      setSelectionBox({
        startX: logicalPt.x,
        startY: logicalPt.y,
        currentX: logicalPt.x,
        currentY: logicalPt.y
      });
      return;
    }

    // Desmarca seleção atual e inicia Movimentação (Pan) da Área de Desenho
    setSelectedIds([]);
    setSelectedConnId(null);
    setIsPanning(true);
    setPanStartClient({ x: e.clientX, y: e.clientY });
    setPanStartOffset({ x: pan.x, y: pan.y });
  };

  // Movimento do Mouse na Área Central
  const handleSvgMouseMove = (e: React.MouseEvent) => {
    const logicalPt = getLogicalCoordinates(e.clientX, e.clientY);
    setMousePos(logicalPt);

    // 1. Movimentação da Área de Desenho (Pan)
    if (isPanning) {
      const dx = e.clientX - panStartClient.x;
      const dy = e.clientY - panStartClient.y;
      setPan({
        x: Math.round(panStartOffset.x + dx),
        y: Math.round(panStartOffset.y + dy)
      });
      return;
    }

    // 2. Arrastar Blocos mantendo alinhamento na grade
    if (draggingIds.length > 0) {
      const deltaX = logicalPt.x - dragStartPos.x;
      const deltaY = logicalPt.y - dragStartPos.y;

      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(el => {
          if (draggingIds.includes(el.id) && dragInitialPositions[el.id]) {
            const init = dragInitialPositions[el.id];
            const snappedX = snapToGrid(init.x + deltaX, SNAP_STEP);
            const snappedY = snapToGrid(init.y + deltaY, SNAP_STEP);
            return { ...el, x: snappedX, y: snappedY };
          }
          return el;
        })
      }));
      return;
    }

    // 3. Caixa de seleção por área
    if (selectionBox) {
      setSelectionBox(prev => (prev ? { ...prev, currentX: logicalPt.x, currentY: logicalPt.y } : null));
      const minX = Math.min(selectionBox.startX, logicalPt.x);
      const maxX = Math.max(selectionBox.startX, logicalPt.x);
      const minY = Math.min(selectionBox.startY, logicalPt.y);
      const maxY = Math.max(selectionBox.startY, logicalPt.y);

      const enclosedIds = graph.elements
        .filter(el => {
          const ex = el.x || 100;
          const ey = el.y || 100;
          return ex >= minX - 40 && ex <= maxX + 40 && ey >= minY - 25 && ey <= maxY + 25;
        })
        .map(el => el.id);

      setSelectedIds(enclosedIds);
      return;
    }

    // 4. Arrastar Ponto de Ancoragem de uma Conexão na Grade
    if (draggingConnId) {
      const snappedPt = snapPointToGrid(logicalPt, SNAP_STEP);
      setGraph(prev => ({
        ...prev,
        connections: prev.connections.map(c => {
          if (c.id !== draggingConnId) return c;
          const currentWps: Point[] = Array.isArray(c.waypoints) && c.waypoints.length > 0
            ? [...c.waypoints]
            : [snappedPt];
          const idx = draggingAnchorIndex >= 0 && draggingAnchorIndex < currentWps.length ? draggingAnchorIndex : 0;
          currentWps[idx] = snappedPt;
          return {
            ...c,
            waypoints: currentWps,
            waypoint: snappedPt
          };
        })
      }));
    }
  };

  const handleSvgMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingIds.length > 0) {
      const moved = draggingIds.some(id => {
        const el = graph.elements.find(item => item.id === id);
        const init = dragInitialPositions[id];
        return el && init && (el.x !== init.x || el.y !== init.y);
      });
      setDraggingIds([]);
      setDragInitialPositions({});
      if (moved) {
        pushHistory(graph);
      }
    }
    if (selectionBox) {
      setSelectionBox(null);
    }
    if (draggingConnId) {
      setDraggingConnId(null);
      setDraggingAnchorIndex(-1);
      pushHistory(graph);
    }
  };

  // Clique em Ponto de Ancoragem de uma Conexão (No Modo Lápis: inicia derivação/ramificação; Normal: arrasta âncora)
  const handleAnchorMouseDown = (
    e: React.MouseEvent,
    conn: DiagramConnection,
    anchorPt: Point,
    anchorIdx: number
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (pencilMode && !activeDraft) {
      // Permite puxar uma derivação (pickoff) diretamente do ponto de ancoragem da linha (ex: saída y(s) de G(s) retornando ao Somador 1)
      setActiveDraft({
        from: conn.from,
        fromPort: (conn.fromPort as CompassDirection) || 'E',
        waypoints: [snapPointToGrid(anchorPt, SNAP_STEP)]
      });
      showToast('✏️ Derivação iniciada no ponto de ancoragem da linha! Leve até outro bloco para conectar.');
      return;
    }

    if (pencilMode && activeDraft) return;

    setSelectedConnId(conn.id);
    setSelectedIds([]);
    setDraggingConnId(conn.id);
    setDraggingAnchorIndex(anchorIdx);
  };

  // =========================================================================
  // INTEGRAÇÃO COM A REDUÇÃO DE MASON (COMPATIBILIDADE TOTAL)
  // =========================================================================

  const handleRunMason = () => {
    const inputs = graph.elements.filter(e => e.type === 'input');
    const outputs = graph.elements.filter(e => e.type === 'output');

    if (inputs.length === 0 || outputs.length === 0) {
      showToast('⚠️ Adicione pelo menos uma Entrada (ex: R(s) ou W(s)) e uma Saída (ex: C(s)) para calcular Mason.');
      return;
    }

    const chosenInput = inputs.find(i => i.id === activeInputId) || inputs[0];
    const chosenOutput = outputs.find(o => o.id === activeOutputId) || outputs[0];

    try {
      // Mapeia o par Entrada -> Saída selecionado para 'IN' e 'OUT' preservando 100% do algoritmo original de Mason
      const idMap = new Map<string, string>();
      graph.elements.forEach(el => {
        if (el.id === chosenInput.id) idMap.set(el.id, 'IN');
        else if (el.id === chosenOutput.id) idMap.set(el.id, 'OUT');
        else idMap.set(el.id, el.id);
      });

      const mappedGraph: DiagramGraph = {
        elements: graph.elements
          .filter(el => el.type !== 'input' || el.id === chosenInput.id)
          .map(el => ({
            ...el,
            id: idMap.get(el.id) || el.id
          })),
        connections: graph.connections
          .filter(c => !c.isPending && c.to && idMap.has(c.from) && idMap.has(c.to))
          .map(c => ({
            ...c,
            from: idMap.get(c.from) || c.from,
            to: idMap.get(c.to) || c.to
          }))
      };

      const result = computeMasonAnalysis(mappedGraph);
      if (result.forwardPaths.length === 0) {
        showToast(`⚠️ Não há caminho contínuo conectado entre ${chosenInput.name} e ${chosenOutput.name}.`);
        return;
      }

      setAnalysisResult(result);
      showToast(`⚡ Redução de Mason calculada para ${chosenOutput.name} / ${chosenInput.name}!`);
      setTimeout(() => {
        masonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error(err);
      showToast('⚠️ Erro ao calcular a redução de Mason. Verifique as expressões e conexões.');
    }
  };

  const allInputs = useMemo(() => graph.elements.filter(e => e.type === 'input'), [graph.elements]);
  const allOutputs = useMemo(() => graph.elements.filter(e => e.type === 'output'), [graph.elements]);
  const incomingToSelectedSummer = useMemo(
    () => (selectedElement?.type === 'summer' ? graph.connections.filter(c => !c.isPending && c.to === selectedElement.id) : []),
    [graph.connections, selectedElement]
  );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* WORKSPACE PRINCIPAL EM TELA AMPLIADA: LATERAL ESQUERDA + ÁREA CENTRAL */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 'calc(100vh - 32px)',
          minHeight: '680px',
          gap: isSidebarCollapsed ? '0px' : '14px',
          position: 'relative',
          alignItems: 'stretch'
        }}
      >
        {/* ===================================================================
            LATERAL ESQUERDA FIXA, ORGANIZADA E RECOLHÍVEL
            Dividida em:
            - Seção A: Ferramentas
            - Seção B: Propriedades do Elemento Selecionado
           =================================================================== */}
        <aside
          aria-label="Painel Lateral do Construtor"
          style={{
            width: isSidebarCollapsed ? '0px' : '350px',
            minWidth: isSidebarCollapsed ? '0px' : '350px',
            opacity: isSidebarCollapsed ? 0 : 1,
            overflowY: isSidebarCollapsed ? 'hidden' : 'auto',
            overflowX: 'hidden',
            transition: 'width 0.22s ease, min-width 0.22s ease, opacity 0.18s ease',
            background: 'var(--card-bg)',
            border: isSidebarCollapsed ? 'none' : '1px solid var(--card-border)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isSidebarCollapsed ? 'none' : '0 8px 28px rgba(0,0,0,0.35)',
            zIndex: 20
          }}
        >
          {/* Cabeçalho Compacto do Painel Esquerdo */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onBack}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ⬅ Voltar
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ThemeToggle />
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => setIsSidebarCollapsed(true)}
                  title="Recolher painel esquerdo para ampliar a área de desenho"
                  style={{ padding: '5px 9px', fontSize: '0.76rem', fontWeight: 700 }}
                >
                  ◀ Recolher
                </button>
              </div>
            </div>

            <div>
              <h1 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--primary)', fontWeight: 800 }}>
                🛠️ Construtor Livre de Blocos
              </h1>
              <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                Desenho em grade ortogonal e redução de Mason
              </p>
            </div>

            {/* Seletor Rápido de Topologia / Tela Limpa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label
                htmlFor="builder-template-select"
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Cenário:
              </label>
              <select
                id="builder-template-select"
                value={selectedTemplate}
                onChange={e => handleLoadTemplate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: 'var(--code-bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  fontSize: '0.78rem'
                }}
              >
                <option value="malha_simples">Malha Fechada Padrão G/(1+GH)</option>
                <option value="cascata">Associação em Cascata G1 · G2</option>
                <option value="paralelo">Associação em Paralelo G1 + G2</option>
                <option value="exemplo1">Três Blocos em Série</option>
                <option value="malhas_duplas">Malhas Duplas (G1, G2, H1, H2)</option>
                <option value="em_branco">Apenas R(s) e C(s)</option>
                <option value="vazio_total">Tela 100% Vazia (Montagem Manual)</option>
              </select>
            </div>
          </div>

          {/* ===============================================================
              SEÇÃO A — FERRAMENTAS
             =============================================================== */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--primary)'
                }}
              >
                Seção A — Ferramentas
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {graph.elements.length} elem • {graph.connections.length} conex
              </span>
            </div>

            {/* Ferramenta Lápis de 8 Pontos */}
            <button
              type="button"
              className={`filter-btn ${pencilMode ? 'active' : ''}`}
              onClick={() => {
                setPencilMode(prev => !prev);
                setActiveDraft(null);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: pencilMode ? 'rgba(56,189,248,0.22)' : undefined,
                borderColor: pencilMode ? 'var(--primary)' : undefined,
                fontWeight: 800,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              title="Ative o Lápis e passe o cursor sobre qualquer elemento para exibir os 8 pontos da rosa dos ventos"
            >
              <span>✏️</span>
              <span>{pencilMode ? 'Lápis: ATIVO (8 Pontos na Grade)' : 'Ativar Lápis (Conectar Blocos)'}</span>
            </button>

            {pencilMode && (
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  lineHeight: 1.35
                }}
              >
                💡 Passe o mouse sobre um bloco para ver os <b>8 pontos (N, NE, L, SE, S, SO, O, NO)</b>. Clique no fundo para <b>pausar com bolinha</b> ou em outro bloco para finalizar.
              </div>
            )}

            {/* Grade de Botões para Adicionar Elementos */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px'
              }}
            >
              <button
                type="button"
                className="filter-btn"
                onClick={handleAddInput}
                style={{ padding: '7px 8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'left' }}
                title="Adicionar bloco independente de Entrada R(s)"
              >
                ＋ Entrada R(s)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleAddOutput}
                style={{ padding: '7px 8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'left' }}
                title="Adicionar bloco independente de Saída C(s)"
              >
                ＋ Saída C(s)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleAddBlock(false)}
                style={{ padding: '7px 8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'left', color: '#38bdf8' }}
                title="Adicionar Bloco de Função de Transferência G(s)"
              >
                ＋ Bloco G(s)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleAddBlock(true)}
                style={{ padding: '7px 8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'left', color: '#c084fc' }}
                title="Adicionar Bloco de Realimentação H(s)"
              >
                ＋ Bloco H(s)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleAddDisturbance}
                style={{ padding: '7px 8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'left', color: '#fbbf24' }}
                title="Adicionar Entrada de Perturbação Externa W(s)"
              >
                ＋ Perturbação W(s)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleAddSummer}
                style={{ padding: '7px 8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'left', color: '#10b981' }}
                title="Adicionar Ponto Somador ∑"
              >
                ⊕ Somador ∑
              </button>
            </div>

            {/* Controles de Edição, Histórico e Organização */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className="filter-btn"
                onClick={handleUndo}
                disabled={historyStep <= 0}
                style={{ opacity: historyStep <= 0 ? 0.4 : 1, padding: '6px 8px', fontSize: '0.76rem' }}
                title="Desfazer última operação (Ctrl+Z)"
              >
                ↶ Desfazer
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleRedo}
                disabled={historyStep >= history.length - 1}
                style={{ opacity: historyStep >= history.length - 1 ? 0.4 : 1, padding: '6px 8px', fontSize: '0.76rem' }}
                title="Refazer operação (Ctrl+Y)"
              >
                ↷ Refazer
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleToggleSign}
                style={{ padding: '6px 8px', fontSize: '0.76rem', color: '#10b981' }}
                title="Alternar Sinal (+ / -) da entrada ou conexão selecionada"
              >
                ± Sinal (+ / -)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleAutoLayout}
                style={{ padding: '6px 8px', fontSize: '0.76rem' }}
                title="Alinhar e organizar elementos automaticamente na grade"
              >
                📐 Auto-Organizar
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0 && !selectedConnId}
                style={{
                  opacity: selectedIds.length === 0 && !selectedConnId ? 0.4 : 1,
                  padding: '6px 8px',
                  fontSize: '0.76rem',
                  color: '#ef4444'
                }}
                title="Excluir elemento ou conexão selecionada (Delete)"
              >
                ✕ Excluir
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleClearAll}
                style={{ padding: '6px 8px', fontSize: '0.76rem' }}
                title="Limpar todo o diagrama"
              >
                🗑️ Limpar
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => {
                  setPastedImageForModal(null);
                  setShowVisionModal(true);
                }}
                style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--primary)' }}
                title="Importar diagrama a partir de imagem ou print (Ctrl+V)"
              >
                📷 Importar IA
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={handleCopyDiagramAsImage}
                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                title="Copiar diagrama como imagem PNG"
              >
                📋 Copiar PNG
              </button>
            </div>

            {/* Controle de Redução de Mason (com escolha de Entrada/Saída quando houver múltiplas) */}
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              {(allInputs.length > 1 || allOutputs.length > 1) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem' }}>
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Entrada Mason:
                    </label>
                    <select
                      value={activeInputId}
                      onChange={e => setActiveInputId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: 'var(--code-bg)',
                        color: 'var(--text)',
                        border: '1px solid var(--card-border)',
                        fontSize: '0.74rem'
                      }}
                    >
                      {allInputs.map(inp => (
                        <option key={inp.id} value={inp.id}>
                          {inp.name} ({inp.code || inp.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Saída Mason:
                    </label>
                    <select
                      value={activeOutputId}
                      onChange={e => setActiveOutputId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: 'var(--code-bg)',
                        color: 'var(--text)',
                        border: '1px solid var(--card-border)',
                        fontSize: '0.74rem'
                      }}
                    >
                      {allOutputs.map(out => (
                        <option key={out.id} value={out.id}>
                          {out.name} ({out.code || out.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn-primary"
                onClick={handleRunMason}
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 800 }}
              >
                ⚡ Reduzir Diagrama (Mason)
              </button>
            </div>
          </div>

          {/* ===============================================================
              SEÇÃO B — PROPRIEDADES DO ELEMENTO SELECIONADO
             =============================================================== */}
          <div
            style={{
              padding: '14px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#f59e0b'
                }}
              >
                Seção B — Propriedades
              </span>
              {selectedElement && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    fontWeight: 700
                  }}
                >
                  ID: {selectedElement.code || selectedElement.id}
                </span>
              )}
            </div>

            {/* 1. Nenhum Elemento ou Conexão Selecionado */}
            {!selectedElement && !selectedConnection && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px dashed var(--card-border)',
                  borderRadius: '8px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  lineHeight: 1.5
                }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>👆</div>
                <div>
                  <b>Nenhum elemento selecionado.</b>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                  Clique (ou dê duplo clique) em qualquer bloco, entrada, saída, perturbação ou somador do circuito para editar suas propriedades aqui.
                </div>
              </div>
            )}

            {/* 2. Propriedades de Bloco G(s) ou H(s) */}
            {selectedElement && selectedElement.type === 'block' && (
              <form
                onSubmit={handleApplyElementProperties}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Identificação:
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {selectedElement.code || selectedElement.id.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Sentido do Bloco:
                    </div>
                    <select
                      value={propDir}
                      onChange={e => {
                        const d = e.target.value as 'right' | 'left';
                        setPropDir(d);
                        setGraph(prev => ({
                          ...prev,
                          elements: prev.elements.map(el =>
                            el.id === selectedElement.id ? { ...el, dir: d } : el
                          )
                        }));
                      }}
                      style={{
                        width: '100%',
                        background: 'var(--code-bg)',
                        color: 'var(--text)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      <option value="right">➔ Direto</option>
                      <option value="left">⬅ Retorno</option>
                    </select>
                  </div>
                </div>

                {/* Nome Exibido */}
                <div>
                  <label
                    htmlFor="prop-block-name"
                    style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}
                  >
                    Nome exibido (ex: G(s), Hf(s), Hc(s), H(s)):
                  </label>
                  <input
                    id="prop-block-name"
                    ref={nameInputRef}
                    type="text"
                    value={propName}
                    onChange={e => handlePropNameDirectChange(e.target.value)}
                    placeholder="Ex: G(s), Hf(s), Hc(s)"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--card-border)',
                      fontSize: '0.84rem',
                      fontWeight: 700
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {['G(s)', 'Hf(s)', 'Hc(s)', 'H(s)', 'Gc(s)', 'Gp(s)'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className="filter-btn"
                        onClick={() => handlePropNameDirectChange(preset)}
                        style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campos de Numerador e Denominador */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label
                      htmlFor="prop-block-num"
                      style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}
                    >
                      Numerador N(s):
                    </label>
                    <input
                      id="prop-block-num"
                      type="text"
                      value={propNum}
                      onChange={e => handlePropNumDenChange(e.target.value, propDen)}
                      placeholder="Ex: 5 ou s+1"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 8px',
                        borderRadius: '6px',
                        background: 'var(--code-bg)',
                        color: 'var(--text)',
                        border: '1px solid var(--card-border)',
                        fontSize: '0.82rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="prop-block-den"
                      style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}
                    >
                      Denominador D(s):
                    </label>
                    <input
                      id="prop-block-den"
                      type="text"
                      value={propDen}
                      onChange={e => handlePropNumDenChange(propNum, e.target.value)}
                      placeholder="Ex: s+3 ou 1"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 8px',
                        borderRadius: '6px',
                        background: 'var(--code-bg)',
                        color: 'var(--text)',
                        border: '1px solid var(--card-border)',
                        fontSize: '0.82rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                {/* Função de Transferência Completa */}
                <div>
                  <label
                    htmlFor="prop-block-expr"
                    style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}
                  >
                    Função de Transferência Completa:
                  </label>
                  <input
                    id="prop-block-expr"
                    type="text"
                    value={propExpr}
                    onChange={e => handlePropExprDirectChange(e.target.value)}
                    placeholder="Ex: 5/(s+3) ou Hf"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--primary)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                {/* Renderização Matemática */}
                <div
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '8px',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflowX: 'auto'
                  }}
                >
                  <MathView math={`${propName || selectedElement.name} = ${propExpr || '1'}`} inline />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 800, width: '100%' }}
                >
                  ✓ Aplicar Alterações
                </button>
              </form>
            )}

            {/* 3. Propriedades de R(s), C(s) ou Perturbação W(s) */}
            {selectedElement && (selectedElement.type === 'input' || selectedElement.type === 'output') && (
              <form
                onSubmit={handleApplyElementProperties}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Identificação:
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {selectedElement.code || selectedElement.id}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Tipo de Terminal:
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color:
                          selectedElement.subType === 'disturbance'
                            ? '#fbbf24'
                            : selectedElement.type === 'input'
                            ? '#38bdf8'
                            : '#10b981'
                      }}
                    >
                      {selectedElement.subType === 'disturbance'
                        ? 'Perturbação Externa W(s)'
                        : selectedElement.type === 'input'
                        ? 'Entrada de Referência'
                        : 'Saída do Sistema'}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="prop-terminal-name"
                    style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}
                  >
                    Nome exibido:
                  </label>
                  <input
                    id="prop-terminal-name"
                    ref={nameInputRef}
                    type="text"
                    value={propName}
                    onChange={e => handlePropNameDirectChange(e.target.value)}
                    placeholder="Ex: R(s), ref(s), W(s), C(s), y(s)"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--primary)',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {(selectedElement.subType === 'disturbance'
                      ? ['W(s)', 'w(s)', 'D(s)', 'N(s)', 'Pert(s)']
                      : selectedElement.type === 'input'
                      ? ['R(s)', 'ref(s)', 'V(s)', 'X(s)', 'U(s)']
                      : ['C(s)', 'y(s)', 'Y(s)', 'E(s)', ' Vo(s)']
                    ).map(preset => (
                      <button
                        key={preset}
                        type="button"
                        className="filter-btn"
                        onClick={() => handlePropNameDirectChange(preset.trim())}
                        style={{ padding: '2px 7px', fontSize: '0.7rem' }}
                      >
                        {preset.trim()}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 800, width: '100%' }}
                >
                  ✓ Aplicar Alterações
                </button>
              </form>
            )}

            {/* 4. Propriedades do Somador (Configuração Individual de Sinais Positivos e Negativos) */}
            {selectedElement && selectedElement.type === 'summer' && (
              <form
                onSubmit={handleApplyElementProperties}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Identificação:
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981' }}>
                      {selectedElement.code || selectedElement.id.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Entradas conectadas: <b>{incomingToSelectedSummer.length}</b>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="prop-summer-name"
                    style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}
                  >
                    Nome exibido do Somador:
                  </label>
                  <input
                    id="prop-summer-name"
                    ref={nameInputRef}
                    type="text"
                    value={propName}
                    onChange={e => handlePropNameDirectChange(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--card-border)',
                      fontSize: '0.84rem',
                      fontWeight: 700
                    }}
                  />
                </div>

                {/* Configuração Individual dos Sinais das Entradas do Somador */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                    Sinais das Entradas Conectadas (+ / -):
                  </div>
                  {incomingToSelectedSummer.length === 0 ? (
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px dashed var(--card-border)'
                      }}
                    >
                      Nenhuma entrada conectada a este somador ainda. Use o Lápis para conectar blocos a este somador.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {incomingToSelectedSummer.map(conn => {
                        const fromEl = graph.elements.find(e => e.id === conn.from);
                        const currentSign = conn.sign || '+';
                        return (
                          <div
                            key={conn.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid var(--card-border)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              gap: '6px'
                            }}
                          >
                            <div style={{ fontSize: '0.76rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                                De: {fromEl?.name || conn.from}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                Porta: {conn.toPort || 'W'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleSetConnectionSign(conn.id, '+')}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid #10b981',
                                  background: currentSign === '+' ? '#10b981' : 'transparent',
                                  color: currentSign === '+' ? '#000' : '#10b981',
                                  fontWeight: 900,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer'
                                }}
                                title="Definir entrada como Positiva (+)"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetConnectionSign(conn.id, '-')}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid #ef4444',
                                  background: currentSign === '-' ? '#ef4444' : 'transparent',
                                  color: currentSign === '-' ? '#fff' : '#ef4444',
                                  fontWeight: 900,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer'
                                }}
                                title="Definir entrada como Negativa (-)"
                              >
                                −
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 800, width: '100%' }}
                >
                  ✓ Aplicar Alterações
                </button>
              </form>
            )}

            {/* 5. Propriedades de uma Conexão Selecionada */}
            {selectedConnection && !selectedElement && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div>
                    <b>Origem:</b>{' '}
                    {graph.elements.find(e => e.id === selectedConnection.from)?.name || selectedConnection.from} [
                    {selectedConnection.fromPort || 'E'}]
                  </div>
                  <div>
                    <b>Destino:</b>{' '}
                    {selectedConnection.isPending ? (
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>⏸️ Conexão Pendente (Interrompida)</span>
                    ) : (
                      `${graph.elements.find(e => e.id === selectedConnection.to)?.name || selectedConnection.to} [${
                        selectedConnection.toPort || 'W'
                      }]`
                    )}
                  </div>
                  {!selectedConnection.isPending && (
                    <div>
                      <b>Sinal de Entrada:</b>{' '}
                      <span
                        style={{
                          fontWeight: 900,
                          color: selectedConnection.sign === '-' ? '#ef4444' : '#10b981'
                        }}
                      >
                        {selectedConnection.sign === '-' ? 'Negativo (−)' : 'Positivo (+)'}
                      </span>
                    </div>
                  )}
                </div>

                {selectedConnection.isPending ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={e => handleResumePendingConnection(e, selectedConnection)}
                    style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 800 }}
                  >
                    ✏️ Retomar Conexão a partir da Bolinha
                  </button>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => handleSetConnectionSign(selectedConnection.id, '+')}
                      style={{ color: '#10b981', fontWeight: 800 }}
                    >
                      Sinal Positivo (+)
                    </button>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => handleSetConnectionSign(selectedConnection.id, '-')}
                      style={{ color: '#ef4444', fontWeight: 800 }}
                    >
                      Sinal Negativo (−)
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="filter-btn"
                  onClick={handleDeleteSelected}
                  style={{ color: '#ef4444', padding: '7px 10px', fontWeight: 700 }}
                >
                  ✕ Excluir Esta Conexão
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ===================================================================
            ÁREA CENTRAL DE DESENHO EM TELA AMPLIADA
           =================================================================== */}
        <section
          ref={canvasContainerRef}
          aria-label="Área Central de Desenho do Circuito"
          style={{
            flex: 1,
            height: '100%',
            background: '#040711',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
            cursor: pencilMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab',
            boxShadow: 'inset 0 2px 24px rgba(0,0,0,0.92)'
          }}
          onContextMenu={e => e.preventDefault()}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
        >
          {/* Botão Flutuante para Expandir o Painel Esquerdo quando estiver Recolhido */}
          {isSidebarCollapsed && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsSidebarCollapsed(false)}
              style={{
                position: 'absolute',
                top: '14px',
                left: '14px',
                zIndex: 30,
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
              }}
              title="Expandir painel lateral de ferramentas e propriedades"
            >
              ▶ Ferramentas & Propriedades
            </button>
          )}

          {/* Controles Flutuantes de Zoom e Visualização no Canto Superior Direito */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              padding: '5px 8px',
              backdropFilter: 'blur(6px)'
            }}
          >
            <button
              type="button"
              className="filter-btn"
              onClick={() => setZoom(z => Math.min(2.4, Number((z + 0.15).toFixed(2))))}
              style={{ padding: '4px 9px', fontSize: '0.78rem' }}
              title="Aumentar Zoom (Roda do Mouse)"
            >
              🔍+
            </button>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#e2e8f0', minWidth: '42px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="filter-btn"
              onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
              style={{ padding: '4px 9px', fontSize: '0.78rem' }}
              title="Diminuir Zoom (Roda do Mouse)"
            >
              🔍-
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              style={{ padding: '4px 9px', fontSize: '0.76rem' }}
              title="Restaurar Zoom 100% e Centralizar Área de Desenho"
            >
              ↺ 100%
            </button>
          </div>

          {/* Barra de Status Discreta no Canto Inferior Direito da Área Central */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '14px',
              zIndex: 25,
              pointerEvents: 'none',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              color: '#94a3b8',
              display: 'flex',
              gap: '12px'
            }}
          >
            <span>Grade: {GRID_SIZE}px</span>
            {mousePos && (
              <span>
                Cursor: ({snapToGrid(mousePos.x, SNAP_STEP)}, {snapToGrid(mousePos.y, SNAP_STEP)})
              </span>
            )}
            <span>Arraste o fundo para mover • Roda do mouse para Zoom</span>
          </div>

          {/* SVG DE TELA AMPLIADA COM TRANSFORMAÇÃO DE VIEWPORT INDEPENDENTE DAS COORDENADAS LÓGICAS */}
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onMouseDown={handleCanvasMouseDown}
            onContextMenu={e => e.preventDefault()}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              userSelect: 'none'
            }}
          >
            <defs>
              <marker
                id="builder-arr"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker
                id="builder-arr-sel"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
              </marker>
              <marker
                id="builder-arr-draft"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
              </marker>
              <filter id="builder-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.35" />
              </filter>
              <filter id="builder-glow-sel" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.7" />
              </filter>
              <filter id="builder-glow-fb" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.35" />
              </filter>

              {/* Padrão de Grade Infinita Sincronizado com Pan e Zoom */}
              <pattern
                id="grid-dots"
                width={GRID_SIZE}
                height={GRID_SIZE}
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              >
                <circle cx="0" cy="0" r="1.3" fill="rgba(56, 189, 248, 0.18)" />
              </pattern>
            </defs>

            {/* Fundo Interativo com Grade */}
            <rect
              data-canvas-bg="true"
              width="100%"
              height="100%"
              fill="url(#grid-dots)"
            />

            {/* GRUPO DE COORDENADAS LÓGICAS DO CIRCUITO */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* 1. CONEXÕES COMPLETAS E CONEXÕES INTERROMPIDAS (PENDENTES) */}
              {graph.connections.map((conn, idx) => {
                // Se esta conexão pendente está sendo ativamente redesenhada no momento, oculta a versão estática
                if (activeDraft?.pendingConnId === conn.id) return null;

                const src = graph.elements.find(e => e.id === conn.from);
                if (!src) return null;
                const tgt = conn.isPending ? null : graph.elements.find(e => e.id === conn.to);
                if (!conn.isPending && !tgt) return null;

                const isSelected = conn.id === selectedConnId;
                const isDraggingThis = conn.id === draggingConnId;
                const { pathD, signPos, anchors, endPoint } = computeSmartConnectionPath(
                  src,
                  tgt,
                  conn,
                  idx,
                  graph.connections.length,
                  graph.elements
                );

                return (
                  <g
                    key={conn.id}
                    onClick={e => {
                      e.stopPropagation();
                      if (activeDraft) return;
                      setSelectedConnId(conn.id);
                      setSelectedId(null);
                    }}
                  >
                    {/* Canaleta invisível larga para facilitar clique na linha */}
                    <path
                      d={pathD}
                      stroke="transparent"
                      strokeWidth="16"
                      fill="none"
                      style={{ cursor: pencilMode ? 'crosshair' : 'pointer' }}
                      onMouseDown={e => {
                        if (pencilMode && !activeDraft) {
                          const pt = getLogicalCoordinates(e.clientX, e.clientY);
                          handleAnchorMouseDown(e, conn, pt, 0);
                        }
                      }}
                    />

                    {/* Linha Ortogonal Principal */}
                    <path
                      d={pathD}
                      stroke={
                        conn.isPending
                          ? '#fbbf24'
                          : isSelected || isDraggingThis
                          ? '#f59e0b'
                          : '#38bdf8'
                      }
                      strokeWidth={isSelected || isDraggingThis ? '3.2' : '2.2'}
                      strokeDasharray={conn.isPending ? '6 4' : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      markerEnd={
                        conn.isPending
                          ? undefined
                          : isSelected || isDraggingThis
                          ? 'url(#builder-arr-sel)'
                          : 'url(#builder-arr)'
                      }
                    />

                    {/* Pontos de Ancoragem Claramente Identificáveis nos Vértices / Segmentos */}
                    {anchors.map((anchorPt, aIdx) => (
                      <g
                        key={`${conn.id}_anchor_${aIdx}`}
                        onMouseDown={e => handleAnchorMouseDown(e, conn, anchorPt, aIdx)}
                        style={{ cursor: pencilMode ? 'crosshair' : 'grab' }}
                      >
                        <title>
                          Ponto de ancoragem ({anchorPt.x}, {anchorPt.y}) — Arraste para ajustar ou clique com Lápis para derivar
                        </title>
                        <circle cx={anchorPt.x} cy={anchorPt.y} r="10" fill="transparent" />
                        <circle
                          cx={anchorPt.x}
                          cy={anchorPt.y}
                          r={isSelected || isDraggingThis ? 5.5 : 4}
                          fill={isSelected || isDraggingThis ? '#f59e0b' : '#0284c7'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </g>
                    ))}

                    {/* BOLINHA DE CONEXÃO INTERROMPIDA / PENDENTE (5.3) */}
                    {conn.isPending && (
                      <g
                        data-testid={`pending-ball-${conn.id}`}
                        onMouseDown={e => handleResumePendingConnection(e, conn)}
                        onClick={e => handleResumePendingConnection(e, conn)}
                        style={{ cursor: 'pointer' }}
                      >
                        <title>
                          Conexão iniciada e pausada. Clique nesta bolinha para continuar a conexão a partir deste ponto!
                        </title>
                        <circle
                          cx={endPoint.x}
                          cy={endPoint.y}
                          r="13"
                          fill="rgba(251, 191, 36, 0.2)"
                          stroke="#fbbf24"
                          strokeWidth="1.5"
                          strokeDasharray="3 2"
                        />
                        <circle
                          cx={endPoint.x}
                          cy={endPoint.y}
                          r="7"
                          fill="#fbbf24"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    )}

                    {/* Sinal (+ ou -) Próximo ao Ponto de Entrada no Somador */}
                    {!conn.isPending && tgt?.type === 'summer' && (
                      <text
                        x={signPos.x}
                        y={signPos.y}
                        fill={conn.sign === '-' ? '#ef4444' : '#10b981'}
                        fontSize="15"
                        fontWeight="900"
                        textAnchor="middle"
                        style={{ userSelect: 'none', cursor: 'pointer' }}
                        onClick={e => {
                          e.stopPropagation();
                          handleSetConnectionSign(conn.id, conn.sign === '-' ? '+' : '-');
                        }}
                      >
                        {conn.sign === '-' ? '−' : '+'}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 2. LINHA ORTOGONAL EM DESENHO ATIVO PELO LÁPIS (SEGUINDO A GRADE) */}
              {activeDraft && mousePos && (() => {
                const src = graph.elements.find(e => e.id === activeDraft.from);
                if (!src) return null;
                const targetHoverEl =
                  hoveredPort && hoveredPort.elementId !== activeDraft.from
                    ? graph.elements.find(e => e.id === hoveredPort.elementId)
                    : undefined;

                const preview = computePencilPreviewPath(
                  src,
                  activeDraft.fromPort,
                  activeDraft.waypoints,
                  mousePos,
                  graph.elements,
                  targetHoverEl,
                  hoveredPort?.side
                );

                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <path
                      d={preview.pathD}
                      stroke="#10b981"
                      strokeWidth="2.8"
                      strokeDasharray="6 4"
                      fill="none"
                      markerEnd="url(#builder-arr-draft)"
                    />
                    {preview.anchors.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}
                    <circle
                      cx={preview.snappedCursor.x}
                      cy={preview.snappedCursor.y}
                      r="6"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                );
              })()}

              {/* 3. ELEMENTOS DO DIAGRAMA (R(s), C(s), W(s), G(s), H(s), SOMADORES) */}
              {graph.elements.map(el => {
                const isSelected = selectedIds.includes(el.id);
                const isConnectingSource = activeDraft?.from === el.id;
                const isHoveredInPencil = pencilMode && hoveredElementId === el.id;
                const x = el.x ?? 100;
                const y = el.y ?? 100;
                const eightPorts = getElementEightPorts(el);

                return (
                  <g
                    key={el.id}
                    data-element-id={el.id}
                    onMouseEnter={() => setHoveredElementId(el.id)}
                    onMouseLeave={() => {
                      setHoveredElementId(prev => (prev === el.id ? null : prev));
                      setHoveredPort(prev => (prev?.elementId === el.id ? null : prev));
                    }}
                    onMouseDown={e => handleNodeMouseDown(e, el.id)}
                    onDoubleClick={e => handleNodeDoubleClick(e, el.id)}
                    style={{ cursor: pencilMode ? 'crosshair' : 'move' }}
                  >
                    {/* Zona de Proximidade para manter os 8 pontos visíveis ao redor do bloco */}
                    <rect
                      x={x - 74}
                      y={y - 46}
                      width="148"
                      height="92"
                      fill="transparent"
                      pointerEvents="all"
                    />

                    {/* A. RENDERIZAÇÃO DE SOMADOR */}
                    {el.type === 'summer' && (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r="22"
                          fill="#0b1322"
                          stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : '#10b981'}
                          strokeWidth={isSelected || isConnectingSource ? 3 : 2.2}
                          filter={isSelected ? 'url(#builder-glow-sel)' : undefined}
                        />
                        {/* Cruz interna clássica de somador de engenharia */}
                        <line
                          x1={x - 15}
                          y1={y - 15}
                          x2={x + 15}
                          y2={y + 15}
                          stroke="rgba(16, 185, 129, 0.28)"
                          strokeWidth="1.2"
                        />
                        <line
                          x1={x - 15}
                          y1={y + 15}
                          x2={x + 15}
                          y2={y - 15}
                          stroke="rgba(16, 185, 129, 0.28)"
                          strokeWidth="1.2"
                        />
                        <text
                          x={x}
                          y={y - 29}
                          fill="#10b981"
                          fontSize="10.5"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {el.name}
                        </text>
                        <text
                          x={x}
                          y={y + 5}
                          fill="#10b981"
                          fontSize="15"
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          ∑
                        </text>
                      </>
                    )}

                    {/* B. RENDERIZAÇÃO DE ENTRADA R(s), SAÍDA C(s) E PERTURBAÇÃO W(s) */}
                    {(el.type === 'input' || el.type === 'output') && (() => {
                      const isDisturbance = el.subType === 'disturbance';
                      const isOutput = el.type === 'output';
                      const strokeColor = isSelected
                        ? '#f59e0b'
                        : isConnectingSource
                        ? '#10b981'
                        : isDisturbance
                        ? '#fbbf24'
                        : isOutput
                        ? '#10b981'
                        : '#38bdf8';

                      return (
                        <>
                          <rect
                            x={x - 36}
                            y={y - 20}
                            width="72"
                            height="40"
                            rx="20"
                            fill={isDisturbance ? '#1c1608' : '#0c1729'}
                            stroke={strokeColor}
                            strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                            filter={isSelected ? 'url(#builder-glow-sel)' : 'url(#builder-glow)'}
                          />
                          <text
                            x={x}
                            y={y - 25}
                            fill={strokeColor}
                            fontSize="9.5"
                            textAnchor="middle"
                            fontWeight="700"
                          >
                            {el.code || (isDisturbance ? 'W' : isOutput ? 'OUT' : 'IN')}
                          </text>
                          <text
                            x={x}
                            y={y + 4}
                            fill="#f8fafc"
                            fontSize="12"
                            fontWeight="800"
                            textAnchor="middle"
                          >
                            {el.name}
                          </text>
                        </>
                      );
                    })()}

                    {/* C. RENDERIZAÇÃO DE BLOCO G(s) E H(s) */}
                    {el.type === 'block' && (() => {
                      const isFeedback = el.dir === 'left';
                      const mainColor = isFeedback ? '#a855f7' : '#38bdf8';
                      return (
                        <>
                          <rect
                            x={x - 56}
                            y={y - 28}
                            width="112"
                            height="56"
                            rx="8"
                            fill={isFeedback ? '#150c26' : '#0c1626'}
                            stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : mainColor}
                            strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                            filter={
                              isSelected
                                ? 'url(#builder-glow-sel)'
                                : isFeedback
                                ? 'url(#builder-glow-fb)'
                                : 'url(#builder-glow)'
                            }
                          />
                          {/* Tag Superior com Identificação e Nome Exibido */}
                          <rect
                            x={x - 38}
                            y={y - 39}
                            width="76"
                            height="16"
                            rx="4"
                            fill={isFeedback ? '#2e1065' : '#082f49'}
                            stroke={mainColor}
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={y - 28}
                            fill="#f1f5f9"
                            fontSize="9.5"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {el.name} {isFeedback ? '⬅' : '➔'}
                          </text>
                          {/* Função de Transferência no Interior do Bloco */}
                          <text
                            x={x}
                            y={y + 5}
                            fill="#f8fafc"
                            fontSize="12.5"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {el.expr || '1'}
                          </text>
                        </>
                      );
                    })()}

                    {/* =========================================================
                        OS 8 PONTOS DE CONEXÃO DA ROSA DOS VENTOS (5.1)
                        Aparecem SOMENTE quando o Lápis está ativo e o cursor está sobre o bloco!
                       ========================================================= */}
                    {isHoveredInPencil &&
                      eightPorts.map(pt => {
                        const isPortHovered =
                          hoveredPort?.elementId === el.id && hoveredPort?.side === pt.side;
                        const isOriginPort =
                          activeDraft?.from === el.id && activeDraft?.fromPort === pt.side;

                        return (
                          <g
                            key={pt.side}
                            data-testid={`port-${el.id}-${pt.side}`}
                            onMouseEnter={e => {
                              e.stopPropagation();
                              setHoveredElementId(el.id);
                              setHoveredPort({ elementId: el.id, side: pt.side });
                            }}
                            onMouseLeave={e => {
                              e.stopPropagation();
                              setHoveredPort(prev =>
                                prev?.elementId === el.id && prev?.side === pt.side ? null : prev
                              );
                            }}
                            onMouseDown={e => handlePortClick(e, el.id, pt.side)}
                            style={{ cursor: 'pointer' }}
                          >
                            <title>{`${pt.label} de ${el.name}`}</title>
                            {/* Área de clique generosa */}
                            <circle cx={pt.x} cy={pt.y} r="11" fill="transparent" />
                            {/* Anel de destaque quando o mouse passa sobre o ponto */}
                            {(isPortHovered || isOriginPort) && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="9.5"
                                fill="rgba(16, 185, 129, 0.25)"
                                stroke="#10b981"
                                strokeWidth="1.5"
                              />
                            )}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isPortHovered || isOriginPort ? 6.5 : 4.8}
                              fill={isPortHovered || isOriginPort ? '#10b981' : '#38bdf8'}
                              stroke="#ffffff"
                              strokeWidth="1.8"
                            />
                          </g>
                        );
                      })}
                  </g>
                );
              })}

              {/* Retângulo de Seleção Múltipla (Shift + Arrastar) */}
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
            </g>
          </svg>
        </section>
      </div>

      {/* Notificação Toast Flutuante (Sem deslocar o circuito) */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--primary)',
            borderRadius: '10px',
            padding: '10px 16px',
            color: '#f8fafc',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
            maxWidth: '460px'
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
              fontSize: '1rem',
              padding: '0 4px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Memorial Analítico Passo a Passo Completo da Regra de Mason */}
      {analysisResult && (
        <div ref={masonSectionRef}>
          <MasonDeductionView analysis={analysisResult} />
        </div>
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
