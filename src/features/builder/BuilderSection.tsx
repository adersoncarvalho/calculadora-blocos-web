'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  DiagramGraph,
  DiagramElement,
  DiagramConnection,
  computeMasonAnalysis,
  MasonAnalysis
} from '@/core/reduction/mason';
import { parseRatExpr, parseRatNumDen } from '@/core/algebra/parser';
import { MathView } from '@/components/MathView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { VisionImportModal } from './VisionImportModal';
import {
  autoLayoutDiagram,
  computeSmartConnectionPath,
  computePencilPreviewPath,
  getElementEightPorts,
  splitTransferFunction,
  combineTransferFunction,
  validateTransferFunction,
  moveConnectionSegment,
  moveConnectionCorner,
  alignElementsOnGrid,
  snapToGrid,
  snapPointToGrid,
  CompassDirection,
  Point,
  GRID_SIZE
} from './layoutEngine';
import { MasonDeductionView, SplitPanelMode } from './MasonDeductionView';
import { CLASSROOM_CASE_STUDIES, runMasonForInputTargetPair } from './symbolicMasonEngine';
import { normalizeSignalDirections } from './circuitTopology';

interface BuilderSectionProps {
  onBack: () => void;
  onOpenGuide?: () => void;
}

export type ActiveTool = 'select' | 'pan' | 'connect' | 'cut' | 'adjust' | 'delete' | 'polarity';

interface ActiveDraftConnection {
  pendingConnId?: string;
  from: string;
  fromPort: CompassDirection;
  waypoints: Point[];
}

interface ContextMenuState {
  x: number;
  y: number;
  targetType: 'element' | 'connection';
  targetId: string;
}

interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  pos: number;
}

export const BuilderSection: React.FC<BuilderSectionProps> = ({ onBack }) => {
  // Estado inicial limpo com entrada R(s) e saída C(s) independentes na grade de 20px
  const initialGraph: DiagramGraph = {
    elements: [
      { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 120, y: 240 },
      { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 760, y: 240 }
    ],
    connections: []
  };

  const [graph, setGraph] = useState<DiagramGraph>(initialGraph);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : []);
  }, []);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);

  // Detecção dinâmica de Tema Claro / Escuro para o SVG e painéis
  const [isLightTheme, setIsLightTheme] = useState<boolean>(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncTheme = () => {
      setIsLightTheme(document.body.classList.contains('light-theme'));
    };
    syncTheme();
    const obs = new MutationObserver(syncTheme);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  // Contadores Sequenciais Exclusivos (NUNCA reutilizam identificadores após exclusão)
  const seqCountersRef = useRef<{ G: number; H: number; R: number; C: number; D: number; W: number; N: number; S: number }>({
    G: 0,
    H: 0,
    R: 1,
    C: 1,
    D: 0,
    W: 0,
    N: 0,
    S: 0
  });

  const allocateExclusiveCode = useCallback(
    (prefix: 'G' | 'H' | 'R' | 'C' | 'D' | 'W' | 'N' | 'S'): string => {
      // Garante que o contador seja sempre estritamente maior que qualquer código já existente no grafo
      let maxExisting = seqCountersRef.current[prefix];
      const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
      graph.elements.forEach(el => {
        const codeStr = String(el.code || '');
        const match = codeStr.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxExisting) maxExisting = num;
        }
      });
      const nextNum = maxExisting + 1;
      seqCountersRef.current[prefix] = nextNum;
      return `${prefix}${nextNum}`;
    },
    [graph.elements]
  );

  // Painel Lateral Esquerdo Recolhível
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Ferramenta Ativa (Padrão ao abrir: 'select' — Selecionar / Mover)
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');

  // Histórico de Desfazer / Refazer (Undo / Redo)
  const [history, setHistory] = useState<DiagramGraph[]>([initialGraph]);
  const [historyStep, setHistoryStep] = useState<number>(0);

  // Clipboard interno para Copiar (Ctrl+C) e Colar (Ctrl+V) elementos
  const [clipboardElements, setClipboardElements] = useState<DiagramElement[]>([]);

  // Estado de Criação de Conexão (8 Pontos da Rosa dos Ventos + Conexões Interrompidas)
  const [activeDraft, setActiveDraft] = useState<ActiveDraftConnection | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{ elementId: string; side: CompassDirection } | null>(null);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // Arrastar Elementos no Canvas e Guias de Alinhamento Inteligente
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragStartPos, setDragStartPos] = useState<Point>({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Record<string, Point>>({});
  const [dragInitialManualConns, setDragInitialManualConns] = useState<Record<string, Point[]>>({});
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  // Arrastar Segmento Manual de Conexão (Horizontal -> Vertical / Vertical -> Horizontal)
  const [draggingSegment, setDraggingSegment] = useState<{
    connId: string;
    segmentIndex: number;
    orientation: 'horizontal' | 'vertical';
    initialPoints: Point[];
  } | null>(null);

  // Arrastar Vértice de Curva/Passagem de Conexão na Grade 20px
  const [draggingCorner, setDraggingCorner] = useState<{
    connId: string;
    cornerIndex: number;
    initialPoints: Point[];
  } | null>(null);

  // Caixa de Seleção Múltipla (Marquee Box)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Menu de Contexto (Botão Direito sobre blocos e conexões)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Zoom e Movimentação (Pan) da Área de Desenho
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
  const [propError, setPropError] = useState<string | null>(null);

  // Modal de Visão por IA e Toast
  const [showVisionModal, setShowVisionModal] = useState<boolean>(false);
  const [pastedImageForModal, setPastedImageForModal] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Redução de Mason e Visualização Dividida (Painel 1: Circuito | Painel 2: Cálculos)
  const [analysisResult, setAnalysisResult] = useState<MasonAnalysis | null>(null);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<{
    graph: DiagramGraph;
    inputEl: DiagramElement;
    outputEl: DiagramElement;
  } | null>(null);
  const [splitMode, setSplitMode] = useState<SplitPanelMode>('split');
  const [splitRatio, setSplitRatio] = useState<number>(48); // % destinada ao Painel 1 (Circuito)
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const [isVerticalSplit, setIsVerticalSplit] = useState<boolean>(false);
  const workspaceSplitRef = useRef<HTMLDivElement | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('em_branco');
  const [activeInputId, setActiveInputId] = useState<string>('IN');
  const [activeOutputId, setActiveOutputId] = useState<string>('OUT');

  // Adapta automaticamente a orientação da divisão (horizontal em desktop >= 960px, vertical em telas menores)
  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window !== 'undefined') {
        setIsVerticalSplit(window.innerWidth < 960);
      }
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  // Arraste interativo da divisória entre Painel 1 (Circuito) e Painel 2 (Cálculos)
  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMove = (clientX: number, clientY: number) => {
      const container = workspaceSplitRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (isVerticalSplit) {
        if (rect.height <= 0) return;
        const pct = ((clientY - rect.top) / rect.height) * 100;
        setSplitRatio(Math.min(82, Math.max(18, Math.round(pct * 10) / 10)));
      } else {
        if (rect.width <= 0) return;
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setSplitRatio(Math.min(82, Math.max(18, Math.round(pct * 10) / 10)));
      }
      setSplitMode('split');
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onEnd = () => setIsDraggingSplitter(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDraggingSplitter, isVerticalSplit]);

  const showToast = useCallback((msg: string, duration = 3500) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, duration);
  }, []);

  const selectedElement = useMemo(
    () => graph.elements.find(e => e.id === selectedId) || null,
    [graph.elements, selectedId]
  );

  const selectedConnection = useMemo(
    () => graph.connections.find(c => c.id === selectedConnId) || null,
    [graph.connections, selectedConnId]
  );

  // Sincroniza os campos do Painel de Propriedades sempre que o elemento selecionado mudar
  useEffect(() => {
    if (selectedElement) {
      setPropName(selectedElement.name || '');
      const expr = selectedElement.expr ?? '';
      setPropExpr(expr);
      if (selectedElement.num !== undefined || selectedElement.den !== undefined) {
        setPropNum(selectedElement.num ?? '');
        setPropDen(selectedElement.den ?? '');
      } else {
        const { num, den } = splitTransferFunction(expr);
        setPropNum(num);
        setPropDen(den);
      }
      setPropDir(selectedElement.dir === 'left' ? 'left' : 'right');
      setPropError(null);
    }
  }, [
    selectedElement?.id,
    selectedElement?.name,
    selectedElement?.expr,
    selectedElement?.num,
    selectedElement?.den,
    selectedElement?.dir
  ]);

  // Mantém activeInputId e activeOutputId sincronizados
  useEffect(() => {
    const inputs = graph.elements.filter(e => e.type === 'input');
    const outputs = graph.elements.filter(e => e.type === 'output');
    if (inputs.length > 0 && !inputs.some(i => i.id === activeInputId)) {
      const refInput = inputs.find(i => i.subType !== 'disturbance' && i.subType !== 'noise') || inputs[0];
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

  // Desfazer (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setGraph(history[prevStep]);
      setActiveDraft(null);
      setContextMenu(null);
      setAnalysisResult(null);
    }
  }, [historyStep, history]);

  // Refazer (Ctrl+Y)
  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setGraph(history[nextStep]);
      setActiveDraft(null);
      setContextMenu(null);
      setAnalysisResult(null);
    }
  }, [historyStep, history]);

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

  // Zoom com a roda do mouse na área central
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom(prevZoom => Math.min(2.4, Math.max(0.4, Number((prevZoom + delta).toFixed(2)))));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // =========================================================================
  // COMANDOS DE ADIÇÃO DE ELEMENTOS (BLOCOS G E H INICIALMENTE GENÉRICOS!)
  // =========================================================================

  // 1. Adicionar Entrada R(s) Independente
  const handleAddInput = () => {
    const code = allocateExclusiveCode('R');
    const idxNum = code.replace('R', '');
    const count = graph.elements.filter(e => e.type === 'input' && e.subType !== 'disturbance' && e.subType !== 'noise').length;
    const newId = count === 0 && !graph.elements.some(e => e.id === 'IN') ? 'IN' : `in_${Date.now()}_${idxNum}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'input',
      subType: 'reference',
      name: idxNum === '1' ? 'R(s)' : `${code}(s)`,
      x: snapToGrid(120, GRID_SIZE),
      y: snapToGrid(240 + count * 100, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 2. Adicionar Saída C(s) Independente
  const handleAddOutput = () => {
    const code = allocateExclusiveCode('C');
    const idxNum = code.replace('C', '');
    const count = graph.elements.filter(e => e.type === 'output').length;
    const newId = count === 0 && !graph.elements.some(e => e.id === 'OUT') ? 'OUT' : `out_${Date.now()}_${idxNum}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'output',
      name: idxNum === '1' ? 'C(s)' : `${code}(s)`,
      x: snapToGrid(760, GRID_SIZE),
      y: snapToGrid(240 + count * 100, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 3. Adicionar Entrada de Perturbação / Distúrbio D(s)
  const handleAddDisturbance = () => {
    const code = allocateExclusiveCode('D');
    const idxNum = code.replace('D', '');
    const count = graph.elements.filter(e => e.subType === 'disturbance').length;
    const newId = `dist_${Date.now()}_${idxNum}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'input',
      subType: 'disturbance',
      name: idxNum === '1' ? 'D(s)' : `${code}(s)`,
      x: snapToGrid(480 + count * 120, GRID_SIZE),
      y: snapToGrid(100, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 3.5. Adicionar Entrada de Ruído N(s)
  const handleAddNoise = () => {
    const code = allocateExclusiveCode('N');
    const idxNum = code.replace('N', '');
    const count = graph.elements.filter(e => e.subType === 'noise').length;
    const newId = `noise_${Date.now()}_${idxNum}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'input',
      subType: 'noise',
      name: idxNum === '1' ? 'N(s)' : `${code}(s)`,
      x: snapToGrid(600 + count * 120, GRID_SIZE),
      y: snapToGrid(100, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 4. Adicionar Bloco G(s) ou H(s) GENÉRICO (Sem função predefinida — campos vazios / simbólicos)
  const handleAddBlock = (isFeedback = false) => {
    const prefix = isFeedback ? 'H' : 'G';
    const code = allocateExclusiveCode(prefix); // Ex: G1, G2, G3... / H1, H2, H3...
    const count = graph.elements.filter(
      e => e.type === 'block' && (isFeedback ? e.dir === 'left' : e.dir !== 'left')
    ).length;
    const newId = `${prefix.toLowerCase()}_${Date.now()}_${code}`;
    const newEl: DiagramElement = {
      id: newId,
      code, // Identificação interna exclusiva: G1, G2... / H1, H2...
      type: 'block',
      name: `${code}(s)`, // Nome exibido inicial: G1(s), G2(s)... / H1(s), H2(s)...
      expr: '', // Sem função predefinida (permite definição manual ou resolução simbólica G1(s))
      num: '',
      den: '',
      rat: undefined,
      x: snapToGrid(300 + (count % 4) * 160, GRID_SIZE),
      y: snapToGrid(isFeedback ? 360 + (count % 2) * 80 : 240, GRID_SIZE),
      dir: isFeedback ? 'left' : 'right'
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // 5. Adicionar Somador
  const handleAddSummer = () => {
    const code = allocateExclusiveCode('S');
    const count = graph.elements.filter(e => e.type === 'summer').length;
    const newId = `sum_${Date.now()}_${code}`;
    const newEl: DiagramElement = {
      id: newId,
      code,
      type: 'summer',
      name: code,
      x: snapToGrid(240 + (count % 4) * 160, GRID_SIZE),
      y: snapToGrid(240, GRID_SIZE)
    };
    const updated = { ...graph, elements: [...graph.elements, newEl] };
    setGraph(updated);
    pushHistory(updated);
    setSelectedId(newId);
    setSelectedConnId(null);
  };

  // =========================================================================
  // DUPLICAÇÃO, CÓPIA, COLAGEM, BLOQUEIO E EXCLUSÃO DE ELEMENTOS
  // =========================================================================

  const duplicateElementsByIds = useCallback(
    (idsToDuplicate: string[], offset: Point = { x: 40, y: 40 }) => {
      const sourceElements = graph.elements.filter(e => idsToDuplicate.includes(e.id));
      if (sourceElements.length === 0) return;

      const newElements: DiagramElement[] = [];
      const newSelectedIds: string[] = [];

      sourceElements.forEach((srcEl, i) => {
        let prefix: 'G' | 'H' | 'R' | 'C' | 'D' | 'W' | 'N' | 'S' = 'G';
        if (srcEl.type === 'block') {
          prefix = srcEl.dir === 'left' || String(srcEl.code || '').startsWith('H') ? 'H' : 'G';
        } else if (srcEl.type === 'summer') {
          prefix = 'S';
        } else if (srcEl.type === 'output') {
          prefix = 'C';
        } else if (srcEl.subType === 'disturbance') {
          prefix = 'D';
        } else if (srcEl.subType === 'noise') {
          prefix = 'N';
        } else {
          prefix = 'R';
        }

        const newCode = allocateExclusiveCode(prefix);
        const newId = `dup_${prefix.toLowerCase()}_${Date.now()}_${i}_${newCode}`;
        const defaultOldName = `${srcEl.code}(s)`;
        const newDisplayName =
          srcEl.type === 'block'
            ? srcEl.name === defaultOldName || srcEl.name === srcEl.code
              ? `${newCode}(s)`
              : `${newCode}(s)`
            : srcEl.type === 'summer'
            ? newCode
            : `${newCode}(s)`;

        const duplicated: DiagramElement = {
          ...srcEl,
          id: newId,
          code: newCode,
          name: newDisplayName,
          x: snapToGrid((srcEl.x ?? 200) + offset.x, GRID_SIZE),
          y: snapToGrid((srcEl.y ?? 200) + offset.y, GRID_SIZE),
          locked: false
        };

        newElements.push(duplicated);
        newSelectedIds.push(newId);
      });

      const updated: DiagramGraph = {
        ...graph,
        elements: [...graph.elements, ...newElements]
        // Não cria conexões indevidas com os elementos originais
      };

      setGraph(updated);
      pushHistory(updated);
      setSelectedIds(newSelectedIds);
      setSelectedConnId(null);
      showToast(
        newElements.length === 1
          ? `📑 Elemento duplicado como ${newElements[0].name} (ID: ${newElements[0].code}).`
          : `📑 ${newElements.length} elementos duplicados com novas identificações exclusivas.`
      );
    },
    [graph, allocateExclusiveCode, pushHistory, showToast]
  );

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) {
      showToast('⚠️ Selecione pelo menos um bloco ou elemento para duplicar.');
      return;
    }
    duplicateElementsByIds(selectedIds, { x: 40, y: 40 });
  }, [selectedIds, duplicateElementsByIds, showToast]);

  const handleToggleLockElement = useCallback(
    (targetId: string) => {
      const target = graph.elements.find(e => e.id === targetId);
      if (!target) return;
      const nextLocked = !target.locked;
      const updated: DiagramGraph = {
        ...graph,
        elements: graph.elements.map(e => (e.id === targetId ? { ...e, locked: nextLocked } : e))
      };
      setGraph(updated);
      pushHistory(updated);
      showToast(
        nextLocked
          ? `🔒 Movimentação de "${target.name}" bloqueada.`
          : `🔓 Movimentação de "${target.name}" desbloqueada.`
      );
    },
    [graph, pushHistory, showToast]
  );

  // Excluir Elemento(s) ou Conexão Específica/Selecionada
  const handleDeleteById = useCallback(
    (elementIds: string[], connId?: string | null) => {
      if (connId) {
        const updated: DiagramGraph = {
          ...graph,
          connections: graph.connections.filter(c => c.id !== connId)
        };
        setGraph(updated);
        pushHistory(updated);
        if (selectedConnId === connId) setSelectedConnId(null);
        showToast('✂️ Conexão removida.');
        return;
      }

      if (elementIds.length === 0) return;
      const idsToDelete = new Set(elementIds);
      const updated: DiagramGraph = {
        elements: graph.elements.filter(e => !idsToDelete.has(e.id)),
        connections: graph.connections.filter(c => !idsToDelete.has(c.from) && !idsToDelete.has(c.to))
      };
      setGraph(updated);
      pushHistory(updated);
      setSelectedIds(prev => prev.filter(id => !idsToDelete.has(id)));
      setActiveDraft(null);
      showToast('🗑️ Elemento(s) excluído(s).');
    },
    [graph, pushHistory, selectedConnId, showToast]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedConnId) {
      handleDeleteById([], selectedConnId);
      return;
    }
    if (selectedIds.length > 0) {
      handleDeleteById(selectedIds, null);
    }
  }, [selectedConnId, selectedIds, handleDeleteById]);

  // Restaurar roteamento automático de uma conexão
  const handleRestoreAutoRoute = useCallback(
    (connId: string) => {
      const updated: DiagramGraph = {
        ...graph,
        connections: graph.connections.map(c =>
          c.id === connId ? { ...c, manualPoints: undefined, waypoints: undefined, waypoint: undefined } : c
        )
      };
      setGraph(updated);
      pushHistory(updated);
      showToast('🔄 Roteamento ortogonal automático restaurado para a conexão.');
    },
    [graph, pushHistory, showToast]
  );

  // Alinhamento e Distribuição de Elementos Selecionados
  const handleAlignSelected = (mode: 'align-y' | 'align-x' | 'distribute-x' | 'distribute-y') => {
    if (selectedIds.length < 2) return;
    const aligned = alignElementsOnGrid(graph.elements, selectedIds, mode);
    const updated = { ...graph, elements: aligned };
    setGraph(updated);
    pushHistory(updated);
    showToast('📐 Elementos selecionados alinhados na grade!');
  };

  // Interromper temporariamente uma conexão ativa na grade (criando bolinha de retomada)
  const interruptActiveConnectionAt = useCallback(
    (pt: Point) => {
      if (!activeDraft) return;
      const snapped = snapPointToGrid(pt, GRID_SIZE);
      const nextWaypoints = [...activeDraft.waypoints, snapped];

      if (activeDraft.pendingConnId) {
        const updated: DiagramGraph = {
          ...graph,
          connections: graph.connections.map(c =>
            c.id === activeDraft.pendingConnId ? { ...c, waypoints: nextWaypoints, isPending: true } : c
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
      showToast('⏸️ Conexão pausada na grade. Clique na bolinha amarela para retomar quando quiser!');
    },
    [activeDraft, graph, pushHistory, showToast]
  );

  // =========================================================================
  // ATALHOS DE TECLADO PROFISSIONAIS (RESPEITANDO CAMPOS DE EDIÇÃO DE TEXTO)
  // =========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditingField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (e.key === 'Escape') {
        setContextMenu(null);
        if (activeDraft) {
          setActiveDraft(null);
          showToast('Operação de conexão atual cancelada.');
        } else if (activeTool !== 'select') {
          setActiveTool('select');
        } else {
          setSelectedIds([]);
          setSelectedConnId(null);
        }
        return;
      }

      // Não intercepta atalhos quando o usuário está digitando em campos de texto ou funções de transferência
      if (isEditingField) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(graph.elements.map(el => el.id));
        setSelectedConnId(null);
        showToast(`✅ Todos os ${graph.elements.length} elementos selecionados.`);
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const toCopy = graph.elements.filter(el => selectedIds.includes(el.id));
          setClipboardElements(toCopy);
          showToast(`📋 ${toCopy.length} elemento(s) copiado(s). Use Ctrl+V para colar.`);
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboardElements.length > 0) {
          e.preventDefault();
          duplicateElementsByIds(
            clipboardElements.map(el => el.id),
            { x: 40, y: 40 }
          );
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeDraft,
    activeTool,
    selectedIds,
    clipboardElements,
    graph.elements,
    handleUndo,
    handleRedo,
    handleDuplicateSelected,
    duplicateElementsByIds,
    handleDeleteSelected,
    showToast
  ]);

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

  // Copiar Imagem PNG
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
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050811';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async pngBlob => {
            if (pngBlob && navigator.clipboard && navigator.clipboard.write) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
              showToast('📋 Imagem PNG do diagrama copiada para a área de transferência!');
            }
          }, 'image/png');
        }
      };
      image.src = blobURL;
    } catch (e) {
      console.error(e);
    }
  };

  // Carregar Cenários / Modelos e Estudos de Caso da Disciplina (EEL6005)
  const handleLoadTemplate = (tpl: string) => {
    setSelectedTemplate(tpl);
    setAnalysisResult(null);
    setSelectedId(null);
    setSelectedConnId(null);
    setActiveDraft(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);

    let newGraph: DiagramGraph;

    const classroomPreset = CLASSROOM_CASE_STUDIES.find(cs => cs.id === tpl);
    if (classroomPreset) {
      newGraph = {
        elements: classroomPreset.graph.elements.map(el => ({
          ...el,
          rat:
            el.type === 'block' && ((el.num || '').trim() || (el.expr || '').trim())
              ? parseRatNumDen(el.num, el.den, el.expr)
              : undefined
        })),
        connections: classroomPreset.graph.connections.map(c => ({ ...c }))
      };
      const firstInput = newGraph.elements.find(e => e.type === 'input' && e.subType !== 'disturbance' && e.subType !== 'noise') ||
        newGraph.elements.find(e => e.type === 'input');
      const firstOutput = newGraph.elements.find(e => e.type === 'output');
      if (firstInput) setActiveInputId(firstInput.id);
      if (firstOutput) setActiveOutputId(firstOutput.id);
      setGraph(newGraph);
      pushHistory(newGraph);
      showToast(`📘 Estudo de caso carregado: "${classroomPreset.title}"`);
      return;
    }

    if (tpl === 'vazio_total') {
      newGraph = { elements: [], connections: [] };
    } else if (tpl === 'em_branco') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 120, y: 240 },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 760, y: 240 }
        ],
        connections: []
      };
    } else if (tpl === 'malha_simples') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 120, y: 240 },
          { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 260, y: 240 },
          { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)', expr: '10/(s+2)', num: '10', den: 's+2', x: 440, y: 240, dir: 'right' },
          { id: 'h1', code: 'H1', type: 'block', name: 'H1(s)', expr: '1', num: '1', den: '1', x: 440, y: 360, dir: 'left' },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 640, y: 240 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 's1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c2', from: 's1', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c3', from: 'g1', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c4', from: 'g1', to: 'h1', fromPort: 'S', toPort: 'E', sign: '+' },
          { id: 'c5', from: 'h1', to: 's1', fromPort: 'W', toPort: 'S', sign: '-' }
        ]
      };
      seqCountersRef.current.G = Math.max(seqCountersRef.current.G, 1);
      seqCountersRef.current.H = Math.max(seqCountersRef.current.H, 1);
      seqCountersRef.current.S = Math.max(seqCountersRef.current.S, 1);
    } else if (tpl === 'cascata') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 120, y: 240 },
          { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)', expr: '4/(s+1)', num: '4', den: 's+1', x: 300, y: 240, dir: 'right' },
          { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)', expr: '5/(s+2)', num: '5', den: 's+2', x: 500, y: 240, dir: 'right' },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 680, y: 240 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c2', from: 'g1', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c3', from: 'g2', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' }
        ]
      };
      seqCountersRef.current.G = Math.max(seqCountersRef.current.G, 2);
    } else if (tpl === 'paralelo') {
      newGraph = {
        elements: [
          { id: 'IN', code: 'R1', type: 'input', subType: 'reference', name: 'R(s)', x: 120, y: 240 },
          { id: 'g1', code: 'G1', type: 'block', name: 'G1(s)', expr: '6/(s+2)', num: '6', den: 's+2', x: 340, y: 160, dir: 'right' },
          { id: 'g2', code: 'G2', type: 'block', name: 'G2(s)', expr: '3/(s+4)', num: '3', den: 's+4', x: 340, y: 320, dir: 'right' },
          { id: 's1', code: 'S1', type: 'summer', name: 'S1', x: 540, y: 240 },
          { id: 'OUT', code: 'C1', type: 'output', name: 'C(s)', x: 700, y: 240 }
        ],
        connections: [
          { id: 'c1', from: 'IN', to: 'g1', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c2', from: 'IN', to: 'g2', fromPort: 'E', toPort: 'W', sign: '+' },
          { id: 'c3', from: 'g1', to: 's1', fromPort: 'E', toPort: 'N', sign: '+' },
          { id: 'c4', from: 'g2', to: 's1', fromPort: 'E', toPort: 'S', sign: '+' },
          { id: 'c5', from: 's1', to: 'OUT', fromPort: 'E', toPort: 'W', sign: '+' }
        ]
      };
      seqCountersRef.current.G = Math.max(seqCountersRef.current.G, 2);
      seqCountersRef.current.S = Math.max(seqCountersRef.current.S, 1);
    } else {
      newGraph = { ...initialGraph };
    }

    setGraph(newGraph);
    pushHistory(newGraph);
  };

  // Salvar Circuito Localmente, Exportar (.json) e Importar (.json) (Seção 4.9)
  const handleSaveCircuitToStorage = () => {
    try {
      const payload = {
        version: '2.0',
        savedAt: new Date().toISOString(),
        elements: graph.elements.map(({ rat, ...rest }) => rest),
        connections: graph.connections
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('controle_free_builder_saved_circuit_v1', JSON.stringify(payload));
      }
      showToast('💾 Circuito salvo com sucesso no navegador!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ Não foi possível salvar o circuito no armazenamento local.');
    }
  };

  const handleExportJsonFile = () => {
    try {
      const payload = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        elements: graph.elements.map(({ rat, ...rest }) => rest),
        connections: graph.connections
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagrama_blocos_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('⬇ Arquivo .json do circuito exportado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ Erro ao exportar o arquivo .json.');
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = String(ev.target?.result || '');
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.elements) || !Array.isArray(parsed.connections)) {
          showToast('⚠️ Arquivo .json inválido: estrutura de elementos/conexões não encontrada.');
          return;
        }
        const validTypes = new Set(['input', 'output', 'block', 'summer']);
        const sanitizedElements: DiagramElement[] = parsed.elements
          .filter((el: DiagramElement) => el && typeof el.id === 'string' && validTypes.has(el.type))
          .map((el: DiagramElement) => {
            const num = typeof el.num === 'string' ? el.num : '';
            const den = typeof el.den === 'string' ? el.den : '';
            const expr = typeof el.expr === 'string' ? el.expr : combineTransferFunction(num, den);
            return {
              ...el,
              x: snapToGrid(Number(el.x) || 200, GRID_SIZE),
              y: snapToGrid(Number(el.y) || 200, GRID_SIZE),
              num,
              den,
              expr,
              rat:
                el.type === 'block' && (num.trim() || expr.trim())
                  ? parseRatNumDen(num, den, expr)
                  : undefined
            };
          });
        const elementIds = new Set(sanitizedElements.map(el => el.id));
        const sanitizedConnections: DiagramConnection[] = parsed.connections
          .filter(
            (c: DiagramConnection) =>
              c && typeof c.id === 'string' && elementIds.has(c.from) && (c.isPending || elementIds.has(c.to))
          )
          .map((c: DiagramConnection) => ({
            ...c,
            sign: c.sign === '-' ? '-' : '+'
          }));

        const importedGraph: DiagramGraph = {
          elements: sanitizedElements,
          connections: sanitizedConnections
        };
        setGraph(importedGraph);
        pushHistory(importedGraph);
        setSelectedIds([]);
        setSelectedConnId(null);
        setAnalysisResult(null);
        showToast(`⬆ Circuito importado com sucesso (${sanitizedElements.length} elementos)!`);
      } catch (err) {
        console.error(err);
        showToast('⚠️ Falha ao ler o arquivo .json. Verifique se o formato é válido.');
      } finally {
        if (jsonFileInputRef.current) {
          jsonFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
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

  const handleSetConnectionSign = (connId: string, sign: '+' | '-') => {
    const updated: DiagramGraph = {
      ...graph,
      connections: graph.connections.map(c => (c.id === connId ? { ...c, sign } : c))
    };
    setGraph(updated);
    pushHistory(updated);
  };

  const handleAutoLayout = () => {
    const organized = autoLayoutDiagram(graph);
    setGraph(organized);
    pushHistory(organized);
    showToast('📐 Diagrama auto-organizado na grade de 20px!');
  };

  const handleClearAll = () => {
    if (graph.elements.length > 0 || graph.connections.length > 0) {
      if (typeof window !== 'undefined' && !window.confirm('Deseja realmente limpar todos os elementos e conexões do diagrama?')) {
        return;
      }
    }
    const emptyGraph: DiagramGraph = { elements: [], connections: [] };
    setGraph(emptyGraph);
    pushHistory(emptyGraph);
    setSelectedIds([]);
    setSelectedConnId(null);
    setActiveDraft(null);
    setAnalysisResult(null);
    showToast('🗑️ Diagrama limpo.');
  };

  // =========================================================================
  // EDIÇÃO E VALIDAÇÃO DE PROPRIEDADES NA LATERAL ESQUERDA (SEÇÃO B)
  // =========================================================================

  const handlePropNumDenChange = (newNum: string, newDen: string) => {
    setPropNum(newNum);
    setPropDen(newDen);
    setPropError(null);
    const combined = combineTransferFunction(newNum, newDen);
    setPropExpr(combined);
    if (selectedId) {
      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(e =>
          e.id === selectedId
            ? {
                ...e,
                num: newNum,
                den: newDen,
                expr: combined,
                rat:
                  newNum.trim() || combined.trim()
                    ? parseRatNumDen(newNum, newDen, combined)
                    : undefined
              }
            : e
        )
      }));
    }
  };

  const handlePropExprDirectChange = (newExpr: string) => {
    setPropExpr(newExpr);
    setPropError(null);
    const { num, den } = splitTransferFunction(newExpr);
    setPropNum(num);
    setPropDen(den);
    if (selectedId) {
      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(e =>
          e.id === selectedId
            ? {
                ...e,
                num,
                den,
                expr: newExpr,
                rat: newExpr.trim() ? parseRatNumDen(num, den, newExpr) : undefined
              }
            : e
        )
      }));
    }
  };

  const handlePropNameDirectChange = (newName: string) => {
    setPropName(newName);
    if (selectedId) {
      // Altera apenas o nome visual exibido, preservando a identificação interna (code e id) intacta!
      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(e => (e.id === selectedId ? { ...e, name: newName } : e))
      }));
    }
  };

  const handleApplyElementProperties = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedId || !selectedElement) return;

    const finalName = propName.trim() || `${selectedElement.code || selectedElement.id}(s)`;

    if (selectedElement.type === 'block') {
      const isGenericEmpty = !propExpr.trim() && !propNum.trim() && !propDen.trim();
      if (!isGenericEmpty) {
        const validation = validateTransferFunction(propExpr, propNum, propDen);
        if (!validation.valid) {
          setPropError(validation.error || 'Função de transferência inválida.');
          showToast(`⚠️ ${validation.error}`);
          return;
        }
      }
      setPropError(null);
      const finalExpr = isGenericEmpty ? '' : propExpr.trim();
      const updated: DiagramGraph = {
        ...graph,
        elements: graph.elements.map(el =>
          el.id === selectedId
            ? {
                ...el,
                name: finalName,
                num: isGenericEmpty ? '' : propNum.trim(),
                den: isGenericEmpty ? '' : propDen.trim() || '1',
                expr: finalExpr,
                rat: isGenericEmpty ? undefined : parseRatNumDen(propNum, propDen, finalExpr),
                dir: propDir
              }
            : el
        )
      };
      setGraph(updated);
      pushHistory(updated);
      showToast(
        isGenericEmpty
          ? `✓ Bloco "${finalName}" mantido como simbólico genérico!`
          : `✓ Função de transferência de "${finalName}" aplicada!`
      );
      return;
    }

    const updated: DiagramGraph = {
      ...graph,
      elements: graph.elements.map(el => (el.id === selectedId ? { ...el, name: finalName } : el))
    };
    setGraph(updated);
    pushHistory(updated);
    showToast(`✓ Propriedades de "${finalName}" aplicadas!`);
  };

  // =========================================================================
  // CRIAR CONEXÃO (8 PONTOS DA ROSA DOS VENTOS + BOLINHA DE RETOMADA)
  // =========================================================================

  const finalizeConnectionToPort = (targetId: string, targetSide: CompassDirection) => {
    if (!activeDraft) return;
    if (activeDraft.from === targetId) {
      showToast('⚠️ Selecione um ponto em outro bloco para concluir a conexão.');
      return;
    }

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
      waypoints: activeDraft.waypoints.map(wp => snapPointToGrid(wp, GRID_SIZE)),
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
    showToast(
      `✅ Conexão criada: ${srcEl?.name || activeDraft.from} (${activeDraft.fromPort}) ➔ ${
        targetEl?.name || targetId
      } (${targetSide})`
    );
  };

  // Clique em um dos 8 pontos de conexão de um bloco (visíveis no modo Criar Conexão)
  const handlePortClick = (e: React.MouseEvent, elementId: string, side: CompassDirection) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (!activeDraft) {
      setActiveTool('connect');
      setActiveDraft({
        from: elementId,
        fromPort: side,
        waypoints: []
      });
      const el = graph.elements.find(item => item.id === elementId);
      showToast(`🔗 Conexão iniciada em ${el?.name || elementId} [${side}]. Clique na grade para pausar ou em outro bloco para concluir.`);
    } else {
      finalizeConnectionToPort(elementId, side);
    }
  };

  // Clique na bolinha amarela de uma conexão interrompida para retomá-la
  const handleResumePendingConnection = (e: React.MouseEvent, conn: DiagramConnection) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    setActiveTool('connect');
    const existingWps: Point[] = Array.isArray(conn.waypoints) ? conn.waypoints : [];
    setActiveDraft({
      pendingConnId: conn.id,
      from: conn.from,
      fromPort: (conn.fromPort as CompassDirection) || 'E',
      waypoints: existingWps
    });
    setSelectedConnId(conn.id);
    showToast('🔗 Conexão retomada! Continue pela grade ou clique em um dos 8 pontos de um bloco para concluir.');
  };

  // =========================================================================
  // INTERAÇÃO COM ELEMENTOS, SEGMENTOS DE CONEXÃO E CANVAS
  // =========================================================================

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setContextMenu(null);
    if (e.button !== 0) return;

    // 1. Modo Excluir Elemento
    if (activeTool === 'delete') {
      handleDeleteById([id], null);
      return;
    }

    // 2. Modo Mover Tela: permite arrastar a tela mesmo iniciando sobre um bloco sem deslocar o bloco
    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStartClient({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ x: pan.x, y: pan.y });
      return;
    }

    // 3. Modo Criar Conexão: se já iniciou uma conexão em outro bloco, conclui na porta mais próxima
    if (activeTool === 'connect') {
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
      setSelectedId(id);
      setSelectedConnId(null);
      return;
    }

    // 4. Modo Ajustar Conexão, Cortar Conexão ou Configurar Polaridade: não movimenta blocos!
    if (activeTool === 'adjust' || activeTool === 'cut' || activeTool === 'polarity') {
      setSelectedId(id);
      setSelectedConnId(null);
      const clickedEl = graph.elements.find(el => el.id === id);
      if (activeTool === 'polarity' && clickedEl?.type === 'summer') {
        const inc = graph.connections.filter(c => !c.isPending && c.to === id);
        if (inc.length === 1) {
          const nextSign = inc[0].sign === '-' ? '+' : '-';
          handleSetConnectionSign(inc[0].id, nextSign);
        } else if (isSidebarCollapsed) {
          setIsSidebarCollapsed(false);
        }
      }
      return;
    }

    // 5. Modo Selecionar / Mover (Padrão)
    const isCtrlOrShift = e.ctrlKey || e.metaKey || e.shiftKey;
    let targetIds: string[];

    if (isCtrlOrShift) {
      targetIds = selectedIds.includes(id)
        ? selectedIds.filter(item => item !== id)
        : [...selectedIds, id];
    } else {
      targetIds = selectedIds.includes(id) ? selectedIds : [id];
    }

    setSelectedIds(targetIds);
    setSelectedConnId(null);

    // Inicia arraste apenas dos elementos selecionados que NÃO estejam bloqueados
    const movableIds = targetIds.filter(tid => {
      const item = graph.elements.find(el => el.id === tid);
      return item && !item.locked;
    });

    if (movableIds.length === 0) return;

    const logicalPt = getLogicalCoordinates(e.clientX, e.clientY);
    setDraggingIds(movableIds);
    setDragStartPos(logicalPt);

    const initialPosMap: Record<string, Point> = {};
    graph.elements.forEach(item => {
      if (movableIds.includes(item.id)) {
        initialPosMap[item.id] = { x: item.x ?? 100, y: item.y ?? 100 };
      }
    });
    setDragInitialPositions(initialPosMap);

    // Preserva pontos manuais das conexões internas entre elementos selecionados
    const initialManualMap: Record<string, Point[]> = {};
    graph.connections.forEach(c => {
      if (Array.isArray(c.manualPoints) && c.manualPoints.length > 0) {
        initialManualMap[c.id] = c.manualPoints.map(p => ({ ...p }));
      }
    });
    setDragInitialManualConns(initialManualMap);
  };

  // Duplo clique em um elemento: seleciona e foca na edição na lateral esquerda
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

  // Iniciar arraste manual de um segmento horizontal ou vertical de uma conexão
  const handleSegmentMouseDown = (
    e: React.MouseEvent,
    conn: DiagramConnection,
    segmentIndex: number,
    orientation: 'horizontal' | 'vertical',
    currentPoints: Point[]
  ) => {
    e.stopPropagation();
    setContextMenu(null);
    if (e.button !== 0) return;

    if (activeTool === 'cut' || activeTool === 'delete') {
      handleDeleteById([], conn.id);
      return;
    }

    if (activeTool === 'polarity') {
      setSelectedConnId(conn.id);
      setSelectedIds([]);
      handleSetConnectionSign(conn.id, conn.sign === '-' ? '+' : '-');
      return;
    }

    if (activeTool === 'connect' && !activeDraft) {
      const clickPt = getLogicalCoordinates(e.clientX, e.clientY);
      setActiveDraft({
        from: conn.from,
        fromPort: (conn.fromPort as CompassDirection) || 'E',
        waypoints: [snapPointToGrid(clickPt, GRID_SIZE)]
      });
      showToast('🔗 Derivação iniciada na linha! Clique em um dos 8 pontos de outro bloco para conectar.');
      return;
    }

    if (activeTool !== 'adjust' && activeTool !== 'select') return;

    setSelectedConnId(conn.id);
    setSelectedIds([]);
    setDraggingSegment({
      connId: conn.id,
      segmentIndex,
      orientation,
      initialPoints: currentPoints.map(p => ({ ...p }))
    });
  };

  // Iniciar arraste manual de uma dobra/vértice intermediário de uma conexão
  const handleCornerMouseDown = (
    e: React.MouseEvent,
    conn: DiagramConnection,
    pointIndex: number,
    currentPoints: Point[]
  ) => {
    e.stopPropagation();
    setContextMenu(null);
    if (e.button !== 0) return;

    if (activeTool === 'cut' || activeTool === 'delete') {
      handleDeleteById([], conn.id);
      return;
    }

    if (activeTool !== 'adjust' && activeTool !== 'select') return;

    setSelectedConnId(conn.id);
    setSelectedIds([]);
    setDraggingCorner({
      connId: conn.id,
      cornerIndex: pointIndex,
      initialPoints: currentPoints.map(p => ({ ...p }))
    });
  };

  // Clique ou arraste no fundo vazio da Área Central
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setContextMenu(null);
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const isBackground =
      target.tagName.toLowerCase() === 'svg' || target.getAttribute('data-canvas-bg') === 'true';

    if (!isBackground) return;

    const logicalPt = getLogicalCoordinates(e.clientX, e.clientY);

    // Se houver uma conexão sendo traçada em Criar Conexão, clicar no fundo pausa a conexão com bolinha
    if (activeTool === 'connect' && activeDraft) {
      interruptActiveConnectionAt(logicalPt);
      return;
    }

    // No modo Mover Tela: arrasta a visualização sem mover blocos
    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStartClient({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ x: pan.x, y: pan.y });
      return;
    }

    // No modo Selecionar / Mover: clicar e arrastar no fundo abre a Caixa de Seleção Múltipla (Marquee)
    if (activeTool === 'select') {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        setSelectedIds([]);
        setSelectedConnId(null);
      }
      setSelectionBox({
        startX: logicalPt.x,
        startY: logicalPt.y,
        currentX: logicalPt.x,
        currentY: logicalPt.y
      });
      return;
    }

    setSelectedIds([]);
    setSelectedConnId(null);
  };

  // Movimento do Mouse na Área Central
  const handleSvgMouseMove = (e: React.MouseEvent) => {
    const logicalPt = getLogicalCoordinates(e.clientX, e.clientY);
    setMousePos(logicalPt);

    // 1. Movimentação da Tela (Pan)
    if (isPanning) {
      const dx = e.clientX - panStartClient.x;
      const dy = e.clientY - panStartClient.y;
      setPan({
        x: Math.round(panStartOffset.x + dx),
        y: Math.round(panStartOffset.y + dy)
      });
      return;
    }

    // 2. Movimentação Manual de Dobra/Vértice de Conexão (Alinhado à Grade de 20px)
    if (draggingCorner) {
      setGraph(prev => ({
        ...prev,
        connections: prev.connections.map(c => {
          if (c.id !== draggingCorner.connId) return c;
          const updatedPts = moveConnectionCorner(
            draggingCorner.initialPoints,
            draggingCorner.cornerIndex,
            logicalPt
          );
          const interior = updatedPts.slice(1, updatedPts.length - 1);
          return {
            ...c,
            manualPoints: interior
          };
        })
      }));
      return;
    }

    // 2b. Movimentação Manual de Segmento Horizontal ou Vertical de Conexão (Alinhado à Grade de 20px)
    if (draggingSegment) {
      const targetCoord =
        draggingSegment.orientation === 'horizontal' ? logicalPt.y : logicalPt.x;

      setGraph(prev => ({
        ...prev,
        connections: prev.connections.map(c => {
          if (c.id !== draggingSegment.connId) return c;
          const updatedPts = moveConnectionSegment(
            draggingSegment.initialPoints,
            draggingSegment.segmentIndex,
            targetCoord,
            prev.elements,
            c.from,
            c.to
          );
          const interior = updatedPts.slice(1, updatedPts.length - 1);
          return {
            ...c,
            manualPoints: interior
          };
        })
      }));
      return;
    }

    // 3. Arrastar Elementos Selecionados em Conjunto + Guias Visuais de Alinhamento Inteligente
    if (draggingIds.length > 0) {
      const deltaX = snapToGrid(logicalPt.x - dragStartPos.x, GRID_SIZE);
      const deltaY = snapToGrid(logicalPt.y - dragStartPos.y, GRID_SIZE);

      const activeGuides: AlignmentGuide[] = [];
      const nonDragged = graph.elements.filter(el => !draggingIds.includes(el.id));

      draggingIds.forEach(dId => {
        const init = dragInitialPositions[dId];
        if (!init) return;
        const candX = snapToGrid(init.x + deltaX, GRID_SIZE);
        const candY = snapToGrid(init.y + deltaY, GRID_SIZE);

        nonDragged.forEach(other => {
          if (Math.abs((other.x ?? 0) - candX) < 2) {
            if (!activeGuides.some(g => g.type === 'vertical' && g.pos === candX)) {
              activeGuides.push({ type: 'vertical', pos: candX });
            }
          }
          if (Math.abs((other.y ?? 0) - candY) < 2) {
            if (!activeGuides.some(g => g.type === 'horizontal' && g.pos === candY)) {
              activeGuides.push({ type: 'horizontal', pos: candY });
            }
          }
        });
      });
      setAlignmentGuides(activeGuides);

      setGraph(prev => ({
        ...prev,
        elements: prev.elements.map(el => {
          if (draggingIds.includes(el.id) && dragInitialPositions[el.id] && !el.locked) {
            const init = dragInitialPositions[el.id];
            return {
              ...el,
              x: snapToGrid(init.x + deltaX, GRID_SIZE),
              y: snapToGrid(init.y + deltaY, GRID_SIZE)
            };
          }
          return el;
        }),
        // Se ambos os blocos de uma conexão estão sendo movidos juntos, desloca solidariamente os pontos manuais
        connections: prev.connections.map(c => {
          if (
            draggingIds.includes(c.from) &&
            draggingIds.includes(c.to) &&
            dragInitialManualConns[c.id]
          ) {
            return {
              ...c,
              manualPoints: dragInitialManualConns[c.id].map(p => ({
                x: snapToGrid(p.x + deltaX, GRID_SIZE),
                y: snapToGrid(p.y + deltaY, GRID_SIZE)
              }))
            };
          }
          return c;
        })
      }));
      return;
    }

    // 4. Caixa de Seleção Múltipla (Marquee)
    if (selectionBox) {
      setSelectionBox(prev => (prev ? { ...prev, currentX: logicalPt.x, currentY: logicalPt.y } : null));
      const minX = Math.min(selectionBox.startX, logicalPt.x);
      const maxX = Math.max(selectionBox.startX, logicalPt.x);
      const minY = Math.min(selectionBox.startY, logicalPt.y);
      const maxY = Math.max(selectionBox.startY, logicalPt.y);

      const enclosedIds = graph.elements
        .filter(el => {
          const ex = el.x ?? 100;
          const ey = el.y ?? 100;
          return ex >= minX - 40 && ex <= maxX + 40 && ey >= minY - 25 && ey <= maxY + 25;
        })
        .map(el => el.id);

      setSelectedIds(enclosedIds);
    }
  };

  const handleSvgMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingCorner) {
      setDraggingCorner(null);
      pushHistory(graph);
    }
    if (draggingSegment) {
      setDraggingSegment(null);
      pushHistory(graph);
    }
    if (draggingIds.length > 0) {
      const moved = draggingIds.some(id => {
        const el = graph.elements.find(item => item.id === id);
        const init = dragInitialPositions[id];
        return el && init && (el.x !== init.x || el.y !== init.y);
      });
      setDraggingIds([]);
      setDragInitialPositions({});
      setDragInitialManualConns({});
      setAlignmentGuides([]);
      if (moved) {
        pushHistory(graph);
      }
    }
    if (selectionBox) {
      setSelectionBox(null);
    }
  };

  // =========================================================================
  // VALIDAÇÃO E EXECUÇÃO DA RESOLUÇÃO ALGÉBRICA DO DIAGRAMA
  // =========================================================================

  const handleRunMason = () => {
    const inputs = graph.elements.filter(e => e.type === 'input');
    const outputs = graph.elements.filter(e => e.type === 'output');

    if (inputs.length === 0 || outputs.length === 0) {
      showToast('⚠️ Adicione pelo menos uma Entrada R(s) e uma Saída Y(s)/C(s) para resolver o diagrama.');
      return;
    }

    // Valida se há algum bloco com erro sintático explícito (ex.: divisão por 0 ou parênteses não fechados).
    // Blocos totalmente vazios são resolvidos simbolicamente pelo seu identificador (ex.: G1(s), H1(s)).
    const invalidSyntaxBlocks = graph.elements.filter(el => {
      if (el.type !== 'block') return false;
      const hasAnyValue = Boolean((el.expr || '').trim() || (el.num || '').trim() || (el.den || '').trim());
      if (!hasAnyValue) return false;
      return !validateTransferFunction(el.expr, el.num, el.den).valid;
    });

    if (invalidSyntaxBlocks.length > 0) {
      const firstInc = invalidSyntaxBlocks[0];
      setSelectedId(firstInc.id);
      setSelectedConnId(null);
      if (isSidebarCollapsed) setIsSidebarCollapsed(false);
      const names = invalidSyntaxBlocks.map(b => b.name || b.code || b.id).join(', ');
      showToast(
        `⚠️ Corrija a expressão da função de transferência do(s) bloco(s): ${names}`,
        5000
      );
      return;
    }

    // Verifica se existem conexões pendentes/incompletas no diagrama
    const pendingConns = graph.connections.filter(c => c.isPending || !c.to);
    if (pendingConns.length > 0) {
      setSelectedConnId(pendingConns[0].id);
      showToast(
        '⚠️ Existem conexões interrompidas (incompletas) no circuito. Conclua ou exclua a conexão pendente antes de resolver.',
        5000
      );
      return;
    }

    const chosenInput = inputs.find(i => i.id === activeInputId) || inputs[0];
    const chosenOutput = outputs.find(o => o.id === activeOutputId) || outputs[0];

    const { graph: normalizedGraph, corrections } = normalizeSignalDirections(graph);
    let activeGraph = graph;
    if (corrections.length > 0) {
      activeGraph = normalizedGraph;
      setGraph(normalizedGraph);
      pushHistory(normalizedGraph);
    }

    try {
      const result = runMasonForInputTargetPair(activeGraph, chosenInput.id, chosenOutput.id);
      if (result.forwardPaths.length === 0) {
        showToast(`⚠️ Não há caminho contínuo conectado entre ${chosenInput.name} e ${chosenOutput.name}.`);
        return;
      }

      setAnalysisResult(result);
      setAnalysisSnapshot({
        graph: activeGraph,
        inputEl: chosenInput,
        outputEl: chosenOutput
      });
      setSplitMode('split');
      showToast(`⚡ Resolução analítica concluída para ${chosenOutput.name} / ${chosenInput.name}!`);
    } catch (err) {
      console.error(err);
      showToast('⚠️ Erro ao resolver o diagrama. Verifique as expressões e conexões.');
    }
  };

  // Mantém o memorial matemático sincronizado em tempo real caso o usuário altere polaridades ou ganhos com o painel aberto
  useEffect(() => {
    if (!analysisResult || !analysisSnapshot) return;
    const inputs = graph.elements.filter(e => e.type === 'input');
    const outputs = graph.elements.filter(e => e.type === 'output');
    if (inputs.length === 0 || outputs.length === 0) return;
    const chosenInput = inputs.find(i => i.id === activeInputId) || inputs[0];
    const chosenOutput = outputs.find(o => o.id === activeOutputId) || outputs[0];
    try {
      const updatedResult = runMasonForInputTargetPair(graph, chosenInput.id, chosenOutput.id);
      if (updatedResult.forwardPaths.length > 0) {
        setAnalysisResult(updatedResult);
        setAnalysisSnapshot({
          graph,
          inputEl: chosenInput,
          outputEl: chosenOutput
        });
      }
    } catch {
      // ignora durante edições transitórias
    }
  }, [graph, activeInputId, activeOutputId]);

  // Cursor contextual da Área Central conforme a ferramenta ativa
  const getCanvasCursor = (): string => {
    if (isPanning) return 'grabbing';
    switch (activeTool) {
      case 'select':
        return 'default';
      case 'pan':
        return 'grab';
      case 'connect':
        return 'crosshair';
      case 'cut':
        return 'pointer';
      case 'delete':
        return 'not-allowed';
      case 'adjust':
        return 'default';
      case 'polarity':
        return 'pointer';
      default:
        return 'default';
    }
  };

  const allInputs = useMemo(() => graph.elements.filter(e => e.type === 'input'), [graph.elements]);
  const allOutputs = useMemo(() => graph.elements.filter(e => e.type === 'output'), [graph.elements]);
  const incomingToSelectedSummer = useMemo(
    () =>
      selectedElement?.type === 'summer'
        ? graph.connections.filter(c => !c.isPending && c.to === selectedElement.id)
        : [],
    [graph.connections, selectedElement]
  );

  // Lista estruturada das Ferramentas Independentes com ícones, nomes e tooltips
  const toolDefinitions: {
    id: ActiveTool;
    icon: string;
    label: string;
    tooltip: string;
    accentColor?: string;
  }[] = [
    {
      id: 'select',
      icon: '↖',
      label: 'Selecionar / Mover',
      tooltip: 'Selecionar / Mover: selecione elementos, arraste blocos ou abra caixa de seleção múltipla'
    },
    {
      id: 'pan',
      icon: '✋',
      label: 'Mover Tela',
      tooltip: 'Mover Tela: arraste o fundo da área de trabalho para movimentar a visualização sem deslocar os blocos'
    },
    {
      id: 'connect',
      icon: '🔗',
      label: 'Criar Conexão',
      tooltip: 'Criar Conexão: passe o mouse sobre um bloco para exibir os 8 pontos de conexão e interligar elementos'
    },
    {
      id: 'adjust',
      icon: '✥',
      label: 'Ajustar Conexão',
      tooltip: 'Ajustar Conexão: arraste manualmente os segmentos horizontais e verticais ou dobras das linhas na grade de 20px'
    },
    {
      id: 'polarity',
      icon: '±',
      label: 'Configurar Polaridade',
      tooltip: 'Configurar Polaridade: clique em uma linha conectada a um somador ou no sinal +/- para alternar entre entrada positiva (+) e negativa (−)',
      accentColor: '#10b981'
    },
    {
      id: 'cut',
      icon: '✂️',
      label: 'Cortar Conexão',
      tooltip: 'Cortar Conexão: clique diretamente sobre uma linha de conexão para removê-la sem afetar os blocos',
      accentColor: '#f59e0b'
    },
    {
      id: 'delete',
      icon: '🗑️',
      label: 'Excluir Elemento',
      tooltip: 'Excluir Elemento: clique sobre qualquer bloco, somador ou conexão para excluí-lo do diagrama',
      accentColor: '#ef4444'
    }
  ];

  const activeCaseStudy = useMemo(
    () => CLASSROOM_CASE_STUDIES.find(cs => cs.id === selectedTemplate) || null,
    [selectedTemplate]
  );

  return (
    <div
      data-testid="builder-fullscreen-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        zIndex: 60
      }}
      onClick={() => setContextMenu(null)}
    >
      {/* Input oculto para importação de arquivo .json */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportJsonFile}
      />

      {/* ===================================================================
          LATERAL ESQUERDA: OCUPA 100% DA ALTURA COM ROLAGEM VERTICAL INDEPENDENTE
         =================================================================== */}
      <aside
        aria-label="Painel Lateral do Construtor"
        style={{
          width: isSidebarCollapsed ? '0px' : '360px',
          minWidth: isSidebarCollapsed ? '0px' : '360px',
          height: '100%',
          opacity: isSidebarCollapsed ? 0 : 1,
          overflowY: isSidebarCollapsed ? 'hidden' : 'auto',
          overflowX: 'hidden',
          transition: 'width 0.2s ease, min-width 0.2s ease, opacity 0.15s ease',
          background: 'var(--card-bg)',
          borderRight: isSidebarCollapsed ? 'none' : '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isSidebarCollapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.2)',
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
            background: 'var(--code-bg)',
            flexShrink: 0
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
              title="Voltar à Página Principal"
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
                style={{ padding: '5px 9px', fontSize: '0.75rem', fontWeight: 700 }}
              >
                ◀ Recolher
              </button>
            </div>
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--primary)', fontWeight: 800 }}>
              🛠️ Laboratório Livre de Diagramas
            </h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.73rem' }}>
              Álgebra de blocos, equacionamento, superposição, TVF e Scilab
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label
              htmlFor="builder-template-select"
              style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}
            >
              Cenário:
            </label>
            <select
              id="builder-template-select"
              value={selectedTemplate}
              onChange={e => handleLoadTemplate(e.target.value)}
              style={{
                flex: 1,
                margin: 0,
                padding: '5px 8px',
                borderRadius: '5px',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                border: '1px solid var(--card-border)',
                fontSize: '0.76rem'
              }}
            >
              <optgroup label="Montagem Livre e Topologias Básicas">
                <option value="em_branco">Padrão (Entrada R e Saída C)</option>
                <option value="vazio_total">Tela 100% Vazia (Montagem Livre)</option>
                <option value="malha_simples">Malha Fechada G/(1+GH)</option>
                <option value="cascata">Associação em Cascata G1 · G2</option>
                <option value="paralelo">Associação em Paralelo G1 + G2</option>
              </optgroup>
              <optgroup label="Estudos de Caso e Exercícios (Aulas EEL6005)">
                {CLASSROOM_CASE_STUDIES.map(cs => (
                  <option key={cs.id} value={cs.id}>
                    {cs.title}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Botões rápidos para Estudos de Caso da Disciplina */}
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}
            >
              Estudos de Caso da Disciplina (1-Clique):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {CLASSROOM_CASE_STUDIES.map(cs => {
                const isCurrent = selectedTemplate === cs.id;
                const shortLabel =
                  cs.id === 'motor_dc_ma'
                    ? 'Motor CC (Malha Aberta)'
                    : cs.id === 'motor_dc_mf'
                    ? 'Motor CC (Malha Fechada)'
                    : cs.id === 'navio_rolamento'
                    ? 'Rolamento de Navio'
                    : 'Exemplo Numérico (Scilab)';
                return (
                  <button
                    key={cs.id}
                    type="button"
                    data-testid={`case-study-${cs.id}`}
                    className={`filter-btn ${isCurrent ? 'active' : ''}`}
                    onClick={() => handleLoadTemplate(cs.id)}
                    style={{
                      padding: '4px 6px',
                      fontSize: '0.7rem',
                      fontWeight: isCurrent ? 700 : 600,
                      textAlign: 'left',
                      borderColor: isCurrent ? 'var(--primary)' : undefined,
                      color: isCurrent ? 'var(--primary)' : undefined
                    }}
                    title={cs.pedagogicalSummary}
                  >
                    📘 {shortLabel}
                  </button>
                );
              })}
            </div>
            {activeCaseStudy && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  fontSize: '0.71rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.45
                }}
              >
                <strong style={{ color: 'var(--text)' }}>{activeCaseStudy.subtitle}:</strong>{' '}
                {activeCaseStudy.pedagogicalSummary}
              </div>
            )}
          </div>
        </div>

        {/* ===============================================================
            SEÇÃO A — FERRAMENTAS E INSERÇÃO DE ELEMENTOS
           =============================================================== */}
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '0.73rem',
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

          {/* Modos de Ferramenta Independentes */}
          <div
            role="toolbar"
            aria-label="Modos de Edição"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px'
            }}
          >
            {toolDefinitions.map(tool => {
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  data-testid={`tool-${tool.id}`}
                  className={`filter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTool(tool.id);
                    if (tool.id !== 'connect') {
                      setActiveDraft(null);
                    }
                    if (tool.id === 'delete' && (selectedIds.length > 0 || selectedConnId)) {
                      handleDeleteSelected();
                    }
                  }}
                  title={tool.tooltip}
                  style={{
                    padding: '7px 8px',
                    fontSize: '0.76rem',
                    fontWeight: isActive ? 800 : 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textAlign: 'left',
                    background: isActive ? 'rgba(56, 189, 248, 0.16)' : undefined,
                    borderColor: isActive ? 'var(--primary)' : undefined,
                    color: isActive ? 'var(--primary)' : tool.accentColor
                  }}
                >
                  <span style={{ fontSize: '0.88rem' }}>{tool.icon}</span>
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Botão Dedicado Duplicar + Alternar Sinal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              data-testid="tool-duplicate"
              className="filter-btn"
              onClick={handleDuplicateSelected}
              disabled={selectedIds.length === 0}
              style={{
                opacity: selectedIds.length === 0 ? 0.45 : 1,
                padding: '6px 8px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
              title="Duplicar (Ctrl+D): duplica o elemento selecionado gerando nova identificação exclusiva"
            >
              📑 Duplicar (Ctrl+D)
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={handleToggleSign}
              style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}
              title="Alternar Sinal (+ / -): inverte o sinal da entrada do somador ou conexão selecionada"
            >
              ± Sinal (+ / −)
            </button>
          </div>

          {/* Adicionar Elementos de Sistemas de Controle */}
          <div style={{ marginTop: '2px' }}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}
            >
              Inserir Elementos no Circuito:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                data-testid="add-input-r"
                className="filter-btn"
                onClick={handleAddInput}
                style={{ padding: '7px 8px', fontSize: '0.76rem', fontWeight: 700, textAlign: 'left' }}
                title="Adicionar Entrada R(s): insere um terminal de entrada de referência independente"
              >
                ＋ Entrada R(s)
              </button>
              <button
                type="button"
                data-testid="add-output-c"
                className="filter-btn"
                onClick={handleAddOutput}
                style={{ padding: '7px 8px', fontSize: '0.76rem', fontWeight: 700, textAlign: 'left' }}
                title="Adicionar Saída C(s)/Y(s): insere um terminal de saída independente"
              >
                ＋ Saída C(s)
              </button>
              <button
                type="button"
                data-testid="add-block-g"
                className="filter-btn"
                onClick={() => handleAddBlock(false)}
                style={{ padding: '7px 8px', fontSize: '0.76rem', fontWeight: 700, textAlign: 'left', color: 'var(--primary)' }}
                title="Adicionar Bloco G(s): insere bloco direto genérico G1(s), G2(s)... sem função predefinida"
              >
                ＋ Bloco G(s)
              </button>
              <button
                type="button"
                data-testid="add-block-h"
                className="filter-btn"
                onClick={() => handleAddBlock(true)}
                style={{ padding: '7px 8px', fontSize: '0.76rem', fontWeight: 700, textAlign: 'left', color: 'var(--accent)' }}
                title="Adicionar Bloco H(s): insere bloco de realimentação genérico H1(s), H2(s)... sem função predefinida"
              >
                ＋ Bloco H(s)
              </button>
              <button
                type="button"
                data-testid="add-disturbance-w"
                className="filter-btn"
                onClick={handleAddDisturbance}
                style={{ padding: '7px 8px', fontSize: '0.76rem', fontWeight: 700, textAlign: 'left', color: '#d97706' }}
                title="Adicionar Perturbação D(s): insere uma entrada independente de distúrbio externo"
              >
                ＋ Perturbação D(s)
              </button>
              <button
                type="button"
                data-testid="add-noise-n"
                className="filter-btn"
                onClick={handleAddNoise}
                style={{ padding: '7px 8px', fontSize: '0.76rem', fontWeight: 700, textAlign: 'left', color: '#8b5cf6' }}
                title="Adicionar Ruído N(s): insere uma entrada independente de ruído de medição/processo"
              >
                ＋ Ruído N(s)
              </button>
              <button
                type="button"
                data-testid="add-summer"
                className="filter-btn"
                onClick={handleAddSummer}
                style={{ padding: '7px 8px', fontSize: '0.76rem', fontWeight: 700, textAlign: 'left', color: 'var(--success)', gridColumn: 'span 2' }}
                title="Adicionar Somador: insere um ponto de soma de sinais com múltiplas entradas (+/-)"
              >
                ⊕ Somador ∑
              </button>
            </div>
          </div>

          {/* Operações de Histórico, Organização, Salvar e Exportar/Importar JSON */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className="filter-btn"
              onClick={handleUndo}
              disabled={historyStep <= 0}
              style={{ opacity: historyStep <= 0 ? 0.4 : 1, padding: '6px 8px', fontSize: '0.74rem' }}
              title="Desfazer (Ctrl+Z): desfaz a última operação realizada"
            >
              ↶ Desfazer
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={handleRedo}
              disabled={historyStep >= history.length - 1}
              style={{ opacity: historyStep >= history.length - 1 ? 0.4 : 1, padding: '6px 8px', fontSize: '0.74rem' }}
              title="Refazer (Ctrl+Y): refaz a operação desfeita"
            >
              ↷ Refazer
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={handleAutoLayout}
              style={{ padding: '6px 8px', fontSize: '0.74rem' }}
              title="Auto-Organizar: distribui e alinha os elementos automaticamente na grade"
            >
              📐 Auto-Organizar
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={handleClearAll}
              style={{ padding: '6px 8px', fontSize: '0.74rem', color: 'var(--danger)' }}
              title="Limpar Diagrama: remove todos os elementos após confirmação"
            >
              🗑️ Limpar Tudo
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setPastedImageForModal(null);
                setShowVisionModal(true);
              }}
              style={{ padding: '6px 8px', fontSize: '0.74rem', color: 'var(--primary)' }}
              title="Importar IA: reconhece diagrama a partir de imagem ou print (Ctrl+V)"
            >
              📷 Importar IA
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={handleCopyDiagramAsImage}
              style={{ padding: '6px 8px', fontSize: '0.74rem' }}
              title="Copiar PNG: copia a imagem do circuito atual para a área de transferência"
            >
              📋 Copiar PNG
            </button>
          </div>

          {/* Persistência do Circuito: Salvar, Exportar .json e Importar .json (Seção 4.9) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
            <button
              type="button"
              data-testid="save-circuit-btn"
              className="filter-btn"
              onClick={handleSaveCircuitToStorage}
              style={{ padding: '5px 6px', fontSize: '0.72rem', fontWeight: 700 }}
              title="Salvar circuito atual no navegador (localStorage)"
            >
              💾 Salvar
            </button>
            <button
              type="button"
              data-testid="export-json-btn"
              className="filter-btn"
              onClick={handleExportJsonFile}
              style={{ padding: '5px 6px', fontSize: '0.72rem', fontWeight: 700 }}
              title="Exportar circuito completo como arquivo .json"
            >
              ⬇ Exportar .json
            </button>
            <button
              type="button"
              data-testid="import-json-btn"
              className="filter-btn"
              onClick={() => jsonFileInputRef.current?.click()}
              style={{ padding: '5px 6px', fontSize: '0.72rem', fontWeight: 700 }}
              title="Importar circuito salvo a partir de um arquivo .json"
            >
              ⬆ Importar .json
            </button>
          </div>

          {/* Alinhamento Inteligente para Múltiplos Elementos Selecionados */}
          {selectedIds.length >= 2 && (
            <div
              style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                📏 Alinhamento Inteligente ({selectedIds.length} selecionados):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => handleAlignSelected('align-y')}
                  style={{ padding: '4px 6px', fontSize: '0.7rem' }}
                  title="Alinhar elementos na mesma linha horizontal (Y)"
                >
                  ⬌ Alinhar Horiz.
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => handleAlignSelected('align-x')}
                  style={{ padding: '4px 6px', fontSize: '0.7rem' }}
                  title="Alinhar elementos na mesma coluna vertical (X)"
                >
                  ⬍ Alinhar Vert.
                </button>
                {selectedIds.length >= 3 && (
                  <>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => handleAlignSelected('distribute-x')}
                      style={{ padding: '4px 6px', fontSize: '0.7rem' }}
                      title="Distribuir elementos uniformemente na horizontal"
                    >
                      ↔ Distribuir H
                    </button>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => handleAlignSelected('distribute-y')}
                      style={{ padding: '4px 6px', fontSize: '0.7rem' }}
                      title="Distribuir elementos uniformemente na vertical"
                    >
                      ↕ Distribuir V
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Execução da Resolução Algébrica do Diagrama */}
          <div
            style={{
              background: 'var(--code-bg)',
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
                    Entrada Principal:
                  </label>
                  <select
                    value={activeInputId}
                    onChange={e => setActiveInputId(e.target.value)}
                    style={{
                      width: '100%',
                      margin: 0,
                      padding: '3px 6px',
                      borderRadius: '4px',
                      background: 'var(--card-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--card-border)',
                      fontSize: '0.73rem'
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
                    Saída Analisada:
                  </label>
                  <select
                    value={activeOutputId}
                    onChange={e => setActiveOutputId(e.target.value)}
                    style={{
                      width: '100%',
                      margin: 0,
                      padding: '3px 6px',
                      borderRadius: '4px',
                      background: 'var(--card-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--card-border)',
                      fontSize: '0.73rem'
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
              data-testid="run-mason-btn"
              className="btn-primary"
              onClick={handleRunMason}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 800 }}
              title="Resolver algebricamente o diagrama (equações dos somadores, substituição, superposição, TVF e Scilab)"
            >
              ⚡ Resolver Diagrama (Álgebra de Blocos)
            </button>
          </div>
        </div>

        {/* ===============================================================
            SEÇÃO B — PROPRIEDADES DO ELEMENTO SELECIONADO
           =============================================================== */}
        <div
          style={{
            padding: '12px 14px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '0.73rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#f59e0b'
              }}
            >
              Seção B — Propriedades
            </span>
            {selectedElement && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => handleToggleLockElement(selectedElement.id)}
                  style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                  title={
                    selectedElement.locked
                      ? 'Desbloquear movimentação deste elemento'
                      : 'Bloquear elemento para evitar movimentação acidental'
                  }
                >
                  {selectedElement.locked ? '🔒 Bloqueado' : '🔓 Livre'}
                </button>
                <span
                  data-testid="prop-internal-id"
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    fontWeight: 800
                  }}
                >
                  ID: {selectedElement.code || selectedElement.id}
                </span>
              </div>
            )}
          </div>

          {/* 1. Nenhum Elemento Selecionado */}
          {!selectedElement && !selectedConnection && (
            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px dashed var(--card-border)',
                borderRadius: '8px',
                padding: '14px 12px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
                lineHeight: 1.5
              }}
            >
              <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>👆</div>
              <div>
                <b>Selecione um elemento do circuito.</b>
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.73rem' }}>
                Clique em qualquer bloco, entrada, saída, perturbação, somador ou conexão na área central para editar suas propriedades aqui.
              </div>
            </div>
          )}

          {/* 2. Propriedades de Bloco G(s) ou H(s) */}
          {selectedElement && selectedElement.type === 'block' && (
            <form
              onSubmit={handleApplyElementProperties}
              style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}
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
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Identificação Interna:
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedElement.code || selectedElement.id.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700 }}>
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
                      margin: 0,
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      fontSize: '0.74rem',
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
                  style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 700 }}
                >
                  Nome Exibido:
                </label>
                <input
                  id="prop-block-name"
                  ref={nameInputRef}
                  type="text"
                  value={propName}
                  onChange={e => handlePropNameDirectChange(e.target.value)}
                  placeholder="Ex: G1(s), Hf(s), Hc(s)"
                  style={{
                    width: '100%',
                    margin: 0,
                    padding: '6px 9px',
                    borderRadius: '6px',
                    background: 'var(--code-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--card-border)',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                />
              </div>

              {/* Numerador e Denominador (inicialmente vazios para blocos genéricos) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label
                    htmlFor="prop-block-num"
                    style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 700 }}
                  >
                    Numerador:
                  </label>
                  <input
                    id="prop-block-num"
                    type="text"
                    value={propNum}
                    onChange={e => handlePropNumDenChange(e.target.value, propDen)}
                    placeholder="Defina N(s)"
                    style={{
                      width: '100%',
                      margin: 0,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--card-border)',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="prop-block-den"
                    style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 700 }}
                  >
                    Denominador:
                  </label>
                  <input
                    id="prop-block-den"
                    type="text"
                    value={propDen}
                    onChange={e => handlePropNumDenChange(propNum, e.target.value)}
                    placeholder="Defina D(s)"
                    style={{
                      width: '100%',
                      margin: 0,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'var(--code-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--card-border)',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* Função de Transferência Completa */}
              <div>
                <label
                  htmlFor="prop-block-expr"
                  style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 700 }}
                >
                  Função de Transferência Completa:
                </label>
                <input
                  id="prop-block-expr"
                  type="text"
                  value={propExpr}
                  onChange={e => handlePropExprDirectChange(e.target.value)}
                  placeholder="Não definida (ex: 5/(s+3))"
                  style={{
                    width: '100%',
                    margin: 0,
                    padding: '6px 9px',
                    borderRadius: '6px',
                    background: 'var(--code-bg)',
                    color: 'var(--text)',
                    border: `1px solid ${propError ? '#ef4444' : 'var(--primary)'}`,
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
                {propError && (
                  <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '4px', fontWeight: 600 }}>
                    ⚠️ {propError}
                  </div>
                )}
              </div>

              {/* Visualização Matemática em LaTeX */}
              <div
                style={{
                  background: 'var(--code-bg)',
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
                {propExpr.trim() ? (
                  <MathView math={`${propName || selectedElement.name} = ${propExpr}`} inline />
                ) : (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {propName || selectedElement.name} — Bloco simbólico genérico
                  </span>
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

          {/* 3. Propriedades de R(s), C(s) e Perturbação D(s) */}
          {selectedElement && (selectedElement.type === 'input' || selectedElement.type === 'output') && (
            <form
              onSubmit={handleApplyElementProperties}
              style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}
            >
              <div
                style={{
                  background: 'var(--code-bg)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Identificação Interna:
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedElement.code || selectedElement.id}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Tipo:
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {selectedElement.subType === 'disturbance'
                      ? 'Perturbação D(s)'
                      : selectedElement.subType === 'noise'
                      ? 'Ruído N(s)'
                      : selectedElement.type === 'input'
                      ? 'Entrada R(s)'
                      : 'Saída C(s)/Y(s)'}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="prop-terminal-name"
                  style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 700 }}
                >
                  Nome Exibido:
                </label>
                <input
                  id="prop-terminal-name"
                  ref={nameInputRef}
                  type="text"
                  value={propName}
                  onChange={e => handlePropNameDirectChange(e.target.value)}
                  style={{
                    width: '100%',
                    margin: 0,
                    padding: '6px 9px',
                    borderRadius: '6px',
                    background: 'var(--code-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--primary)',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
                  {(selectedElement.subType === 'disturbance'
                    ? ['D(s)', 'Td(s)', 'W(s)']
                    : selectedElement.subType === 'noise'
                    ? ['N(s)', 'n(s)', 'Ruído(s)', 'N1(s)']
                    : selectedElement.type === 'input'
                    ? ['R(s)', 'theta_d(s)', 'ref(s)', 'V(s)']
                    : ['Y(s)', 'C(s)', 'theta(s)', 'E(s)']
                  ).map(preset => (
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

              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 800, width: '100%' }}
              >
                ✓ Aplicar Alterações
              </button>
            </form>
          )}

          {/* 4. Propriedades do Somador */}
          {selectedElement && selectedElement.type === 'summer' && (
            <form
              onSubmit={handleApplyElementProperties}
              style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}
            >
              <div
                style={{
                  background: 'var(--code-bg)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Identificação Interna:
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--success)' }}>
                    {selectedElement.code || selectedElement.id.toUpperCase()}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Entradas: <b>{incomingToSelectedSummer.length}</b>
                </div>
              </div>

              <div>
                <label
                  htmlFor="prop-summer-name"
                  style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 700 }}
                >
                  Nome Exibido:
                </label>
                <input
                  id="prop-summer-name"
                  ref={nameInputRef}
                  type="text"
                  value={propName}
                  onChange={e => handlePropNameDirectChange(e.target.value)}
                  style={{
                    width: '100%',
                    margin: 0,
                    padding: '6px 9px',
                    borderRadius: '6px',
                    background: 'var(--code-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--card-border)',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '5px' }}>
                  Sinais das Entradas Conectadas (+ / −):
                </div>
                {incomingToSelectedSummer.length === 0 ? (
                  <div
                    style={{
                      fontSize: '0.73rem',
                      color: 'var(--text-muted)',
                      background: 'var(--code-bg)',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px dashed var(--card-border)'
                    }}
                  >
                    Nenhuma entrada conectada ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                            background: 'var(--code-bg)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '6px',
                            padding: '5px 8px'
                          }}
                        >
                          <div style={{ fontSize: '0.74rem' }}>
                            <div style={{ fontWeight: 700 }}>{fromEl?.name || conn.from}</div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                              Porta: {conn.toPort || 'W'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleSetConnectionSign(conn.id, '+')}
                              style={{
                                padding: '3px 9px',
                                borderRadius: '4px',
                                border: '1px solid #10b981',
                                background: currentSign === '+' ? '#10b981' : 'transparent',
                                color: currentSign === '+' ? '#000' : '#10b981',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetConnectionSign(conn.id, '-')}
                              style={{
                                padding: '3px 9px',
                                borderRadius: '4px',
                                border: '1px solid #ef4444',
                                background: currentSign === '-' ? '#ef4444' : 'transparent',
                                color: currentSign === '-' ? '#fff' : '#ef4444',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  background: 'var(--code-bg)',
                  padding: '9px',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  fontSize: '0.76rem',
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
                    <span style={{ color: '#d97706', fontWeight: 700 }}>⏸️ Conexão Pendente</span>
                  ) : (
                    `${graph.elements.find(e => e.id === selectedConnection.to)?.name || selectedConnection.to} [${
                      selectedConnection.toPort || 'W'
                    }]`
                  )}
                </div>
              </div>

              {selectedConnection.isPending ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={e => handleResumePendingConnection(e, selectedConnection)}
                  style={{ padding: '8px 12px', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  🔗 Retomar Conexão Pendente
                </button>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => handleSetConnectionSign(selectedConnection.id, '+')}
                      style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.75rem' }}
                    >
                      Sinal (+)
                    </button>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => handleSetConnectionSign(selectedConnection.id, '-')}
                      style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '0.75rem' }}
                    >
                      Sinal (−)
                    </button>
                  </div>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => handleRestoreAutoRoute(selectedConnection.id)}
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  >
                    🔄 Restaurar Roteamento Automático
                  </button>
                </>
              )}

              <button
                type="button"
                className="filter-btn"
                onClick={handleDeleteSelected}
                style={{ color: 'var(--danger)', padding: '6px 10px', fontWeight: 700, fontSize: '0.75rem' }}
              >
                ✂️ Cortar / Excluir Conexão
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ===================================================================
          ÁREA DE TRABALHO DIVIDIDA: PAINEL 1 (CIRCUITO) + DIVISÓRIA + PAINEL 2 (CÁLCULOS)
         =================================================================== */}
      <div
        ref={workspaceSplitRef}
        data-testid="builder-split-workspace"
        style={{
          flex: 1,
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: isVerticalSplit ? 'column' : 'row',
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--bg)'
        }}
      >
        {/* ===============================================================
            PAINEL 1 — CIRCUITO (DIAGRAMA DE BLOCOS INTERATIVO)
           =============================================================== */}
        <section
          ref={canvasContainerRef}
          data-testid="builder-circuit-panel"
          aria-label="Painel 1 — Circuito"
          style={{
            width: !analysisResult
              ? '100%'
              : splitMode === 'calc-maximized'
              ? '0px'
              : splitMode === 'circuit-maximized' || isVerticalSplit
              ? '100%'
              : `${splitRatio}%`,
            height: !analysisResult
              ? '100%'
              : splitMode === 'calc-maximized'
              ? '0px'
              : splitMode === 'circuit-maximized' || !isVerticalSplit
              ? '100%'
              : `${splitRatio}%`,
            flexShrink: 0,
            display: analysisResult && splitMode === 'calc-maximized' ? 'none' : 'block',
            background: 'var(--bg)',
            position: 'relative',
            overflow: 'hidden',
            cursor: getCanvasCursor()
          }}
          onContextMenu={e => e.preventDefault()}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
        >
          {/* Barra Discreta do Painel 1 — Circuito quando a Visualização Dividida está ativa */}
          {analysisResult && (
            <div
              data-testid="circuit-panel-header"
              style={{
                position: 'absolute',
                top: '14px',
                left: isSidebarCollapsed ? '230px' : '14px',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '5px 10px'
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  letterSpacing: '0.4px'
                }}
              >
                PAINEL 1 — CIRCUITO
              </span>
              <button
                type="button"
                className="filter-btn"
                onClick={() => setSplitMode('calc-maximized')}
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                title="Minimizar temporariamente o painel do circuito"
              >
                🗕 Minimizar Circuito
              </button>
              {splitMode !== 'split' && (
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => setSplitMode('split')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)'
                  }}
                  title="Restaurar visualização dividida (Circuito + Cálculos)"
                >
                  ⚖️ Restaurar Ambos
                </button>
              )}
              {splitMode !== 'circuit-maximized' && (
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => setSplitMode('circuit-maximized')}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  title="Maximizar temporariamente o painel do circuito (minimiza os cálculos)"
                >
                  🗖 Maximizar Circuito
                </button>
              )}
            </div>
          )}

          {/* Barra Discreta para Restaurar o Painel 2 (Cálculos) quando Minimizado */}
          {analysisResult && splitMode === 'circuit-maximized' && (
            <div
              data-testid="restore-calculations-bar"
              style={{
                position: 'absolute',
                top: '58px',
                right: '14px',
                zIndex: 35,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--card-bg)',
                border: '1px solid var(--primary)',
                borderRadius: '8px',
                padding: '6px 12px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>
                🧮 Painel 2 (Cálculos) Minimizado
              </span>
              <button
                type="button"
                className="filter-btn"
                onClick={() => setSplitMode('split')}
                style={{
                  padding: '4px 9px',
                  fontSize: '0.73rem',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  fontWeight: 700
                }}
              >
                ⚖️ Restaurar Divisão
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => setSplitMode('calc-maximized')}
                style={{ padding: '4px 9px', fontSize: '0.73rem' }}
              >
                🗖 Maximizar Cálculos
              </button>
            </div>
          )}
        {/* Botão Flutuante para Expandir o Painel Esquerdo quando Recolhido */}
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
              boxShadow: '0 4px 15px rgba(0,0,0,0.25)'
            }}
            title="Expandir painel lateral de ferramentas e propriedades"
          >
            ▶ Ferramentas & Propriedades
          </button>
        )}

        {/* Controles Flutuantes de Zoom e Visualização */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            padding: '5px 8px'
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
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text)', minWidth: '42px', textAlign: 'center' }}>
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

        {/* Barra de Status Inferior Direita */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '14px',
            zIndex: 25,
            pointerEvents: 'none',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '12px'
          }}
        >
          <span>
            Ferramenta: <b style={{ color: 'var(--primary)' }}>{toolDefinitions.find(t => t.id === activeTool)?.label}</b>
          </span>
          <span>Grade: {GRID_SIZE}px</span>
          {mousePos && (
            <span>
              ({snapToGrid(mousePos.x, GRID_SIZE)}, {snapToGrid(mousePos.y, GRID_SIZE)})
            </span>
          )}
        </div>

        {/* SVG DE TELA CHEIA */}
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
              <path d="M 0 1 L 9 5 L 0 9 z" fill={isLightTheme ? '#0284c7' : '#38bdf8'} />
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
              id="builder-arr-cut"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
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

            <pattern
              id="grid-dots"
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            >
              <circle
                cx="0"
                cy="0"
                r="1.25"
                fill={isLightTheme ? 'rgba(15, 23, 42, 0.16)' : 'rgba(56, 189, 248, 0.18)'}
              />
            </pattern>
          </defs>

          {/* Grade de Fundo */}
          <rect data-canvas-bg="true" width="100%" height="100%" fill="url(#grid-dots)" />

          {/* VIEWPORT LÓGICO */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* GUIAS VISUAIS DE ALINHAMENTO INTELIGENTE */}
            {alignmentGuides.map((g, i) =>
              g.type === 'vertical' ? (
                <line
                  key={`guide_v_${i}`}
                  x1={g.pos}
                  y1={-2000}
                  x2={g.pos}
                  y2={4000}
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                  pointerEvents="none"
                />
              ) : (
                <line
                  key={`guide_h_${i}`}
                  x1={-2000}
                  y1={g.pos}
                  x2={4000}
                  y2={g.pos}
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                  pointerEvents="none"
                />
              )
            )}

            {/* 1. CONEXÕES ORTOGONAIS E SEGMENTOS AJUSTÁVEIS */}
            {graph.connections.map((conn, idx) => {
              if (activeDraft?.pendingConnId === conn.id) return null;

              const src = graph.elements.find(e => e.id === conn.from);
              if (!src) return null;
              const tgt = conn.isPending ? null : graph.elements.find(e => e.id === conn.to);
              if (!conn.isPending && !tgt) return null;

              const isSelected = conn.id === selectedConnId;
              const isDraggingThis =
                draggingSegment?.connId === conn.id || draggingCorner?.connId === conn.id;
              const isCutHovered =
                (activeTool === 'cut' || activeTool === 'delete') && hoveredConnId === conn.id;

              const { pathD, signPos, points, segments, endPoint } = computeSmartConnectionPath(
                src,
                tgt,
                conn,
                idx,
                graph.connections.length,
                graph.elements
              );

              const showSegmentHandles =
                !conn.isPending &&
                (activeTool === 'adjust' || isSelected || isDraggingThis || hoveredConnId === conn.id);

              return (
                <g
                  key={conn.id}
                  data-testid={`connection-${conn.id}`}
                  onMouseEnter={() => setHoveredConnId(conn.id)}
                  onMouseLeave={() => setHoveredConnId(prev => (prev === conn.id ? null : prev))}
                  onClick={e => {
                    e.stopPropagation();
                    if (activeTool === 'cut' || activeTool === 'delete') {
                      handleDeleteById([], conn.id);
                      return;
                    }
                    if (activeTool === 'polarity') {
                      setSelectedConnId(conn.id);
                      setSelectedId(null);
                      handleSetConnectionSign(conn.id, conn.sign === '-' ? '+' : '-');
                      return;
                    }
                    if (activeDraft) return;
                    setSelectedConnId(conn.id);
                    setSelectedId(null);
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedConnId(conn.id);
                    setSelectedIds([]);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      targetType: 'connection',
                      targetId: conn.id
                    });
                  }}
                >
                  {/* Linha Visual Principal */}
                  <path
                    d={pathD}
                    stroke={
                      isCutHovered
                        ? '#ef4444'
                        : conn.isPending
                        ? '#d97706'
                        : isSelected || isDraggingThis
                        ? '#f59e0b'
                        : isLightTheme
                        ? '#0284c7'
                        : '#38bdf8'
                    }
                    strokeWidth={isSelected || isDraggingThis || isCutHovered ? '3' : '2.1'}
                    strokeDasharray={conn.isPending ? '6 4' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    markerEnd={
                      conn.isPending
                        ? undefined
                        : isCutHovered
                        ? 'url(#builder-arr-cut)'
                        : isSelected || isDraggingThis
                        ? 'url(#builder-arr-sel)'
                        : 'url(#builder-arr)'
                    }
                  />

                  {/* Segmentos Horizontais e Verticais Individualmente Arrastáveis */}
                  {segments.map(seg => {
                    const segCursor =
                      activeTool === 'cut'
                        ? 'pointer'
                        : activeTool === 'delete'
                        ? 'not-allowed'
                        : activeTool === 'polarity'
                        ? 'pointer'
                        : activeTool === 'adjust' || isSelected || hoveredConnId === conn.id
                        ? seg.orientation === 'horizontal'
                          ? 'ns-resize'
                          : 'ew-resize'
                        : 'pointer';

                    return (
                      <g key={`${conn.id}_seg_${seg.index}`}>
                        {/* Área de captura sobre cada segmento para arraste manual */}
                        <line
                          data-testid={`conn-seg-${conn.id}-${seg.index}`}
                          x1={seg.p1.x}
                          y1={seg.p1.y}
                          x2={seg.p2.x}
                          y2={seg.p2.y}
                          stroke="transparent"
                          strokeWidth="16"
                          style={{ cursor: segCursor }}
                          onMouseDown={e =>
                            handleSegmentMouseDown(e, conn, seg.index, seg.orientation, points)
                          }
                        />

                        {/* Indicador Visual de Segmento Arrastável (Alça no meio do segmento) */}
                        {showSegmentHandles && seg.length >= 24 && (
                          <g
                            onMouseDown={e =>
                              handleSegmentMouseDown(e, conn, seg.index, seg.orientation, points)
                            }
                            style={{ cursor: segCursor }}
                          >
                            <title>
                              {seg.orientation === 'horizontal'
                                ? 'Segmento horizontal: arraste verticalmente (↕) na grade de 20px'
                                : 'Segmento vertical: arraste horizontalmente (↔) na grade de 20px'}
                            </title>
                            <rect
                              x={seg.midX - (seg.orientation === 'horizontal' ? 10 : 4)}
                              y={seg.midY - (seg.orientation === 'horizontal' ? 4 : 10)}
                              width={seg.orientation === 'horizontal' ? 20 : 8}
                              height={seg.orientation === 'horizontal' ? 8 : 20}
                              rx="4"
                              fill={isSelected || isDraggingThis ? '#f59e0b' : '#0284c7'}
                              stroke="#ffffff"
                              strokeWidth="1.2"
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Vértices / Dobras Intermediárias Individualmente Arrastáveis */}
                  {showSegmentHandles &&
                    points.slice(1, points.length - 1).map((cornerPt, cIdx) => {
                      const pointIndex = cIdx + 1;
                      return (
                        <g
                          key={`${conn.id}_corner_${pointIndex}`}
                          data-testid={`conn-corner-${conn.id}-${pointIndex}`}
                          onMouseDown={e => handleCornerMouseDown(e, conn, pointIndex, points)}
                          style={{ cursor: 'move' }}
                        >
                          <title>Dobra da linha: arraste para reposicionar este vértice na grade de 20px</title>
                          <circle
                            cx={cornerPt.x}
                            cy={cornerPt.y}
                            r="5.5"
                            fill={isSelected || isDraggingThis ? '#f59e0b' : '#0284c7'}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })}

                  {/* Bolinha de Conexão Interrompida / Pendente */}
                  {conn.isPending && (
                    <g
                      data-testid={`pending-ball-${conn.id}`}
                      onMouseDown={e => handleResumePendingConnection(e, conn)}
                      onClick={e => handleResumePendingConnection(e, conn)}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>Conexão pausada: clique nesta bolinha para continuar a conexão!</title>
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
                      fill={conn.sign === '-' ? 'var(--danger)' : 'var(--success)'}
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

            {/* 2. LINHA ORTOGONAL EM DESENHO ATIVO (MODO CRIAR CONEXÃO) */}
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

            {/* 3. ELEMENTOS DO DIAGRAMA */}
            {graph.elements.map(el => {
              const isSelected = selectedIds.includes(el.id);
              const isConnectingSource = activeDraft?.from === el.id;
              // Os 8 pontos aparecem SOMENTE quando a ferramenta Criar Conexão ('connect') está ativa e o mouse está sobre o bloco!
              const showEightPorts = activeTool === 'connect' && hoveredElementId === el.id;
              const x = el.x ?? 100;
              const y = el.y ?? 100;
              const eightPorts = getElementEightPorts(el);

              const elementCursor =
                activeTool === 'select'
                  ? draggingIds.includes(el.id)
                    ? 'grabbing'
                    : isSelected && !el.locked
                    ? 'grab'
                    : 'pointer'
                  : activeTool === 'pan'
                  ? 'grab'
                  : activeTool === 'connect'
                  ? 'crosshair'
                  : activeTool === 'polarity'
                  ? 'pointer'
                  : activeTool === 'delete'
                  ? 'not-allowed'
                  : 'default';

              return (
                <g
                  key={el.id}
                  data-testid={`element-${el.id}`}
                  data-element-id={el.id}
                  onMouseEnter={() => setHoveredElementId(el.id)}
                  onMouseLeave={() => {
                    setHoveredElementId(prev => (prev === el.id ? null : prev));
                    setHoveredPort(prev => (prev?.elementId === el.id ? null : prev));
                  }}
                  onMouseDown={e => handleNodeMouseDown(e, el.id)}
                  onDoubleClick={e => handleNodeDoubleClick(e, el.id)}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!selectedIds.includes(el.id)) {
                      setSelectedId(el.id);
                    }
                    setSelectedConnId(null);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      targetType: 'element',
                      targetId: el.id
                    });
                  }}
                  style={{ cursor: elementCursor }}
                >
                  {/* Zona de proximidade para manter os 8 pontos acessíveis no perímetro do bloco */}
                  <rect
                    x={x - 76}
                    y={y - 46}
                    width="152"
                    height="92"
                    fill="transparent"
                    pointerEvents="all"
                  />

                  {/* A. SOMADOR */}
                  {el.type === 'summer' && (
                    <>
                      <circle
                        cx={x}
                        cy={y}
                        r="20"
                        fill={isLightTheme ? '#ffffff' : '#0f172a'}
                        stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : isLightTheme ? '#059669' : '#10b981'}
                        strokeWidth={isSelected || isConnectingSource ? 3 : 2.2}
                      />
                      <line
                        x1={x - 14}
                        y1={y - 14}
                        x2={x + 14}
                        y2={y + 14}
                        stroke="rgba(16, 185, 129, 0.35)"
                        strokeWidth="1.2"
                      />
                      <line
                        x1={x - 14}
                        y1={y + 14}
                        x2={x + 14}
                        y2={y - 14}
                        stroke="rgba(16, 185, 129, 0.35)"
                        strokeWidth="1.2"
                      />
                      <text
                        x={x}
                        y={y - 27}
                        fill={isLightTheme ? '#047857' : '#10b981'}
                        fontSize="10.5"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {el.name} {el.locked ? '🔒' : ''}
                      </text>
                      <text
                        x={x}
                        y={y + 5}
                        fill={isLightTheme ? '#047857' : '#10b981'}
                        fontSize="15"
                        fontWeight="900"
                        textAnchor="middle"
                      >
                        ∑
                      </text>
                    </>
                  )}

                  {/* B. ENTRADA R(s), SAÍDA C(s)/Y(s), PERTURBAÇÃO D(s) E RUÍDO N(s) */}
                  {(el.type === 'input' || el.type === 'output') && (() => {
                    const isDisturbance = el.subType === 'disturbance';
                    const isNoise = el.subType === 'noise';
                    const isOutput = el.type === 'output';
                    const strokeColor = isSelected
                      ? '#f59e0b'
                      : isConnectingSource
                      ? '#10b981'
                      : isDisturbance
                      ? '#d97706'
                      : isNoise
                      ? '#8b5cf6'
                      : isOutput
                      ? isLightTheme
                        ? '#059669'
                        : '#10b981'
                      : isLightTheme
                      ? '#0284c7'
                      : '#38bdf8';

                    return (
                      <>
                        <rect
                          x={x - 40}
                          y={y - 20}
                          width="80"
                          height="40"
                          rx="20"
                          fill={
                            isLightTheme
                              ? '#ffffff'
                              : isDisturbance
                              ? '#1c1608'
                              : isNoise
                              ? '#1a102a'
                              : '#0f172a'
                          }
                          stroke={strokeColor}
                          strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                        />
                        <text
                          x={x}
                          y={y - 25}
                          fill={strokeColor}
                          fontSize="9.5"
                          textAnchor="middle"
                          fontWeight="700"
                        >
                          {el.code || (isDisturbance ? 'D' : isNoise ? 'N' : isOutput ? 'C' : 'R')} {el.locked ? '🔒' : ''}
                        </text>
                        <text
                          x={x}
                          y={y + 4}
                          fill={isLightTheme ? '#0f172a' : '#f8fafc'}
                          fontSize="12"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {el.name}
                        </text>
                      </>
                    );
                  })()}

                  {/* C. BLOCO G(s) E H(s) (COM SUPORTE A BLOCOS GENÉRICOS / SIMBÓLICOS E TEMA CLARO/ESCURO) */}
                  {el.type === 'block' && (() => {
                    const isFeedback = el.dir === 'left';
                    const hasDefinedExpr = Boolean((el.expr ?? '').trim());
                    const mainColor = isFeedback
                      ? isLightTheme
                        ? '#7c3aed'
                        : '#a855f7'
                      : isLightTheme
                      ? '#0284c7'
                      : '#38bdf8';

                    return (
                      <>
                        <rect
                          x={x - 60}
                          y={y - 30}
                          width="120"
                          height="60"
                          rx="8"
                          fill={
                            isLightTheme
                              ? '#ffffff'
                              : isFeedback
                              ? '#150c26'
                              : '#0f172a'
                          }
                          stroke={isSelected ? '#f59e0b' : isConnectingSource ? '#10b981' : mainColor}
                          strokeWidth={isSelected || isConnectingSource ? 3 : 2}
                        />
                        {/* Badge Superior com Identificação Interna e Sentido */}
                        <rect
                          x={x - 42}
                          y={y - 40}
                          width="84"
                          height="16"
                          rx="4"
                          fill={
                            isLightTheme
                              ? isFeedback
                                ? '#f3e8ff'
                                : '#e0f2fe'
                              : isFeedback
                              ? '#2e1065'
                              : '#082f49'
                          }
                          stroke={mainColor}
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y - 29}
                          fill={isLightTheme ? '#0f172a' : '#f1f5f9'}
                          fontSize="9.5"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {el.code || el.name} {isFeedback ? '⬅' : '➔'} {el.locked ? '🔒' : ''}
                        </text>

                        {hasDefinedExpr ? (
                          <>
                            <text
                              x={x}
                              y={y - 4}
                              fill={mainColor}
                              fontSize="10"
                              fontWeight="700"
                              textAnchor="middle"
                            >
                              {el.name}
                            </text>
                            <text
                              x={x}
                              y={y + 14}
                              fill={isLightTheme ? '#0f172a' : '#f8fafc'}
                              fontSize="12"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {el.expr}
                            </text>
                          </>
                        ) : (
                          <>
                            <text
                              x={x}
                              y={y + 1}
                              fill={isLightTheme ? '#0f172a' : '#f8fafc'}
                              fontSize="13.5"
                              fontWeight="800"
                              textAnchor="middle"
                            >
                              {el.name}
                            </text>
                            <text
                              x={x}
                              y={y + 18}
                              fill={isLightTheme ? '#475569' : '#94a3b8'}
                              fontSize="8.5"
                              fontWeight="600"
                              textAnchor="middle"
                            >
                              Bloco Simbólico
                            </text>
                          </>
                        )}
                      </>
                    );
                  })()}

                  {/* OS 8 PONTOS DE CONEXÃO DA ROSA DOS VENTOS (SOMENTE QUANDO CRIAR CONEXÃO ATIVO E CURSOR SOBRE O BLOCO) */}
                  {showEightPorts &&
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
                          <circle cx={pt.x} cy={pt.y} r="11" fill="transparent" />
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

            {/* Caixa de Seleção Múltipla (Marquee) */}
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

        {/* ===============================================================
            MENU DE CONTEXTO (BOTÃO DIREITO SOBRE BLOCOS E CONEXÕES)
           =============================================================== */}
        {contextMenu && (
          <div
            data-testid="builder-context-menu"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 200 : contextMenu.y),
              left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 220 : contextMenu.x),
              zIndex: 9999,
              background: 'var(--card-bg)',
              border: '1px solid var(--primary)',
              borderRadius: '8px',
              padding: '6px',
              minWidth: '200px',
              boxShadow: '0 10px 28px rgba(0,0,0,0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {contextMenu.targetType === 'element' ? (
              <>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    setSelectedId(contextMenu.targetId);
                    if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                    setContextMenu(null);
                    setTimeout(() => nameInputRef.current?.focus(), 50);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                >
                  ✏️ Editar propriedades
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    duplicateElementsByIds([contextMenu.targetId], { x: 40, y: 40 });
                    setContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                >
                  📑 Duplicar
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    handleToggleLockElement(contextMenu.targetId);
                    setContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                >
                  {graph.elements.find(e => e.id === contextMenu.targetId)?.locked
                    ? '🔓 Desbloquear movimentação'
                    : '🔒 Bloquear movimentação'}
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    handleDeleteById([contextMenu.targetId], null);
                    setContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                >
                  🗑️ Excluir
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    setActiveTool('adjust');
                    setSelectedConnId(contextMenu.targetId);
                    setContextMenu(null);
                    showToast('✥ Arraste qualquer segmento horizontal ou vertical da conexão.');
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                >
                  ✥ Ajustar trajeto
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    handleRestoreAutoRoute(contextMenu.targetId);
                    setContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem' }}
                >
                  🔄 Restaurar roteamento automático
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    handleDeleteById([], contextMenu.targetId);
                    setContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem', color: '#f59e0b' }}
                >
                  ✂️ Cortar conexão
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    handleDeleteById([], contextMenu.targetId);
                    setContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                >
                  🗑️ Excluir conexão
                </button>
              </>
            )}
          </div>
        )}

        </section>

        {/* ===============================================================
            DIVISÓRIA INTERATIVA REDIMENSIONÁVEL ENTRE PAINEL 1 E PAINEL 2
           =============================================================== */}
        {analysisResult && splitMode === 'split' && (
          <div
            data-testid="builder-split-divider"
            onMouseDown={e => {
              e.preventDefault();
              setIsDraggingSplitter(true);
            }}
            onTouchStart={() => setIsDraggingSplitter(true)}
            title="Arraste para redimensionar livremente a proporção entre o Circuito e os Cálculos"
            style={{
              width: isVerticalSplit ? '100%' : '12px',
              height: isVerticalSplit ? '12px' : '100%',
              flexShrink: 0,
              background: isDraggingSplitter
                ? 'rgba(56, 189, 248, 0.35)'
                : 'var(--card-bg)',
              borderLeft: isVerticalSplit ? 'none' : '1px solid var(--card-border)',
              borderRight: isVerticalSplit ? 'none' : '1px solid var(--card-border)',
              borderTop: isVerticalSplit ? '1px solid var(--card-border)' : 'none',
              borderBottom: isVerticalSplit ? '1px solid var(--card-border)' : 'none',
              cursor: isVerticalSplit ? 'row-resize' : 'col-resize',
              display: 'flex',
              flexDirection: isVerticalSplit ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              zIndex: 40,
              userSelect: 'none'
            }}
          >
            {/* Botão Discreto: Minimizar Circuito (Maximizar Cálculos) */}
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                setSplitMode('calc-maximized');
              }}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--primary)',
                borderRadius: '4px',
                width: isVerticalSplit ? '22px' : '10px',
                height: isVerticalSplit ? '10px' : '24px',
                fontSize: '0.62rem',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Minimizar Painel do Circuito (Maximizar Cálculos)"
            >
              {isVerticalSplit ? '▲' : '◀'}
            </button>

            {/* Indicador Central de Arraste */}
            <div
              style={{
                width: isVerticalSplit ? '32px' : '4px',
                height: isVerticalSplit ? '4px' : '32px',
                borderRadius: '2px',
                background: isDraggingSplitter ? 'var(--primary)' : 'rgba(148, 163, 184, 0.5)'
              }}
            />

            {/* Botão Discreto: Minimizar Cálculos (Maximizar Circuito) */}
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                setSplitMode('circuit-maximized');
              }}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--primary)',
                borderRadius: '4px',
                width: isVerticalSplit ? '22px' : '10px',
                height: isVerticalSplit ? '10px' : '24px',
                fontSize: '0.62rem',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Minimizar Painel dos Cálculos (Maximizar Circuito)"
            >
              {isVerticalSplit ? '▼' : '▶'}
            </button>
          </div>
        )}

        {/* ===============================================================
            PAINEL 2 — DESENVOLVIMENTO DOS CÁLCULOS (METODOLOGIA DO PROFESSOR)
           =============================================================== */}
        {analysisResult && splitMode !== 'circuit-maximized' && (
          <section
            data-testid="builder-calculations-panel"
            aria-label="Painel 2 — Desenvolvimento dos Cálculos"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              height: '100%',
              background: 'var(--bg)',
              overflow: 'hidden',
              padding: 0,
              boxSizing: 'border-box',
              position: 'relative',
              zIndex: 35,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Barra superior rápida quando o Painel 1 (Circuito) está temporariamente minimizado */}
            {splitMode === 'calc-maximized' && (
              <div
                data-testid="restore-circuit-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  margin: '10px 14px 0 14px',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text)' }}>
                  📐 Painel 1 (Circuito) está minimizado temporariamente
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => setSplitMode('split')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)',
                      fontWeight: 700
                    }}
                  >
                    ⚖️ Restaurar Circuito + Cálculos
                  </button>
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => setSplitMode('circuit-maximized')}
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    🗖 Maximizar Circuito
                  </button>
                </div>
              </div>
            )}

            <MasonDeductionView
              analysis={analysisResult}
              graph={analysisSnapshot?.graph || graph}
              inputElement={analysisSnapshot?.inputEl}
              outputElement={analysisSnapshot?.outputEl}
              splitMode={splitMode}
              onChangeSplitMode={setSplitMode}
              onClose={() => {
                setAnalysisResult(null);
                setSplitMode('split');
              }}
            />
          </section>
        )}
      </div>

      {/* Toast Flutuante */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'var(--card-bg)',
            border: '1px solid var(--primary)',
            borderRadius: '10px',
            padding: '10px 16px',
            color: 'var(--text)',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
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

      {/* Modal de Importação por IA */}
      <VisionImportModal
        isOpen={showVisionModal}
        onClose={() => setShowVisionModal(false)}
        onImportGraph={handleImportGraph}
        initialImageBase64={pastedImageForModal}
      />
    </div>
  );
};
