import { DiagramGraph, DiagramElement, DiagramConnection } from '@/core/reduction/mason';
import { parseRatExpr } from '@/core/algebra/parser';

export type { DiagramGraph, DiagramElement, DiagramConnection };

export interface VisionRecognitionResult {
  graph: DiagramGraph;
  explanation?: string;
  source: 'gemini' | 'sample';
}

/**
 * Exemplos pré-carregados para teste imediato mesmo sem chave de API
 */
export interface DiagramSample {
  id: string;
  title: string;
  description: string;
  // Imagem em formato SVG Data URI ilustrando um diagrama real
  previewSvg: string;
  graph: DiagramGraph;
}

export const SAMPLE_DIAGRAMS: DiagramSample[] = [
  {
    id: 'sample_ogata_feedback',
    title: 'Sistema de Controle com Realimentação H(s) e Ganho K',
    description: 'Diagrama canônico de malha fechada com ganho proporcional K e sensor H(s).',
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="130" viewBox="0 0 360 130" style="background:%23050811;font-family:sans-serif;">
      <text x="15" y="55" fill="%2338bdf8" font-size="12" font-weight="bold">R(s)</text>
      <line x1="45" y1="50" x2="80" y2="50" stroke="%2338bdf8" stroke-width="2" marker-end="url(%23arr)"/>
      <circle cx="95" cy="50" r="14" fill="%230f172a" stroke="%2310b981" stroke-width="2"/>
      <text x="91" y="54" fill="%23fff" font-size="12">∑</text>
      <line x1="110" y1="50" x2="145" y2="50" stroke="%2338bdf8" stroke-width="2"/>
      <rect x="145" y="32" width="70" height="36" rx="4" fill="%230d1424" stroke="%2338bdf8" stroke-width="2"/>
      <text x="180" y="55" fill="%23e2e8f0" font-size="11" text-anchor="middle">5/(s+2)</text>
      <line x1="215" y1="50" x2="290" y2="50" stroke="%2338bdf8" stroke-width="2"/>
      <text x="300" y="55" fill="%2338bdf8" font-size="12" font-weight="bold">C(s)</text>
      <circle cx="250" cy="50" r="3" fill="%2338bdf8"/>
      <line x1="250" y1="50" x2="250" y2="100" stroke="%2338bdf8" stroke-width="2"/>
      <line x1="250" y1="100" x2="215" y2="100" stroke="%2338bdf8" stroke-width="2"/>
      <rect x="155" y="82" width="60" height="34" rx="4" fill="%230d1424" stroke="%23a855f7" stroke-width="2"/>
      <text x="185" y="103" fill="%23e2e8f0" font-size="11" text-anchor="middle">2</text>
      <line x1="155" y1="100" x2="95" y2="100" stroke="%2338bdf8" stroke-width="2"/>
      <line x1="95" y1="100" x2="95" y2="65" stroke="%2338bdf8" stroke-width="2"/>
      <text x="82" y="78" fill="%23ef4444" font-size="12" font-weight="bold">-</text>
      <text x="75" y="44" fill="%2310b981" font-size="12" font-weight="bold">+</text>
    </svg>`,
    graph: {
      elements: [
        { id: 'IN', type: 'input', name: 'R(s)', x: 60, y: 150 },
        { id: 's1', type: 'summer', name: 'S1', x: 180, y: 150 },
        { id: 'g1', type: 'block', name: 'G1', expr: '5/(s+2)', x: 360, y: 150, dir: 'right' },
        { id: 'h1', type: 'block', name: 'H1', expr: '2', x: 360, y: 250, dir: 'left' },
        { id: 'OUT', type: 'output', name: 'C(s)', x: 580, y: 150 }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 'g1', sign: '+' },
        { id: 'c3', from: 'g1', to: 'OUT', sign: '+' },
        { id: 'c4', from: 'g1', to: 'h1', sign: '+' },
        { id: 'c5', from: 'h1', to: 's1', sign: '-' }
      ]
    }
  },
  {
    id: 'sample_dupla_malha',
    title: 'Sistema de Dupla Malha com Realimentação Menor e Maior',
    description: 'Dois somadores em série com realimentação interna rápida e global.',
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="130" viewBox="0 0 360 130" style="background:%23050811;font-family:sans-serif;">
      <text x="10" y="45" fill="%2338bdf8" font-size="11" font-weight="bold">R(s)</text>
      <line x1="38" y1="40" x2="65" y2="40" stroke="%2338bdf8" stroke-width="2"/>
      <circle cx="75" cy="40" r="10" fill="%230f172a" stroke="%2310b981" stroke-width="1.5"/>
      <line x1="85" y1="40" x2="110" y2="40" stroke="%2338bdf8" stroke-width="2"/>
      <circle cx="120" cy="40" r="10" fill="%230f172a" stroke="%2310b981" stroke-width="1.5"/>
      <line x1="130" y1="40" x2="155" y2="40" stroke="%2338bdf8" stroke-width="2"/>
      <rect x="155" y="26" width="55" height="28" rx="3" fill="%230d1424" stroke="%2338bdf8" stroke-width="1.5"/>
      <text x="182" y="44" fill="%23e2e8f0" font-size="10" text-anchor="middle">2/(s+1)</text>
      <line x1="210" y1="40" x2="245" y2="40" stroke="%2338bdf8" stroke-width="2"/>
      <rect x="245" y="26" width="55" height="28" rx="3" fill="%230d1424" stroke="%2338bdf8" stroke-width="1.5"/>
      <text x="272" y="44" fill="%23e2e8f0" font-size="10" text-anchor="middle">4/s</text>
      <line x1="300" y1="40" x2="330" y2="40" stroke="%2338bdf8" stroke-width="2"/>
      <text x="335" y="45" fill="%2338bdf8" font-size="11" font-weight="bold">C(s)</text>
      <circle cx="315" cy="40" r="2.5" fill="%2338bdf8"/>
      <line x1="315" y1="40" x2="315" y2="105" stroke="%2338bdf8" stroke-width="1.5"/>
      <line x1="315" y1="105" x2="75" y2="105" stroke="%2338bdf8" stroke-width="1.5"/>
      <line x1="75" y1="105" x2="75" y2="52" stroke="%2338bdf8" stroke-width="1.5"/>
      <text x="65" y="65" fill="%23ef4444" font-size="10" font-weight="bold">-</text>
    </svg>`,
    graph: {
      elements: [
        { id: 'IN', type: 'input', name: 'R(s)', x: 50, y: 150 },
        { id: 's1', type: 'summer', name: 'S1', x: 150, y: 150 },
        { id: 's2', type: 'summer', name: 'S2', x: 260, y: 150 },
        { id: 'g1', type: 'block', name: 'G1', expr: '2/(s+1)', x: 370, y: 150, dir: 'right' },
        { id: 'g2', type: 'block', name: 'G2', expr: '4/s', x: 490, y: 150, dir: 'right' },
        { id: 'h1', type: 'block', name: 'H1', expr: '1', x: 430, y: 240, dir: 'left' },
        { id: 'OUT', type: 'output', name: 'C(s)', x: 620, y: 150 }
      ],
      connections: [
        { id: 'c1', from: 'IN', to: 's1', sign: '+' },
        { id: 'c2', from: 's1', to: 's2', sign: '+' },
        { id: 'c3', from: 's2', to: 'g1', sign: '+' },
        { id: 'c4', from: 'g1', to: 'g2', sign: '+' },
        { id: 'c5', from: 'g2', to: 'OUT', sign: '+' },
        { id: 'c6', from: 'g2', to: 'h1', sign: '+' },
        { id: 'c7', from: 'h1', to: 's1', sign: '-' }
      ]
    }
  }
];

/**
 * Normaliza e valida um DiagramGraph recebido de qualquer fonte (IA ou externa)
 * para garantir que todos os elementos, tipos, nomes e conexões estejam íntegros.
 */
export function normalizeDiagramGraph(raw: any): DiagramGraph {
  if (!raw || typeof raw !== 'object') {
    throw new Error('A resposta de visão não retornou um objeto válido.');
  }

  const rawElements = Array.isArray(raw.elements) ? raw.elements : [];
  const rawConnections = Array.isArray(raw.connections) ? raw.connections : [];

  if (rawElements.length === 0) {
    throw new Error('Nenhum elemento (bloco, somador ou nó) foi identificado na imagem.');
  }

  // Sanitiza elementos
  const elements: DiagramElement[] = [];
  const idMap = new Map<string, string>();

  // Garante que existe Entrada (IN) e Saída (OUT)
  let hasInput = false;
  let hasOutput = false;

  rawElements.forEach((item: any, idx: number) => {
    const rawId = String(item.id || `el_${idx}`);
    const validId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
    idMap.set(rawId, validId);

    let type: DiagramElement['type'] = 'block';
    if (['input', 'output', 'block', 'summer', 'pickoff'].includes(item.type)) {
      type = item.type;
    } else if (item.type === 'branch') {
      type = 'pickoff';
    } else {
      const lower = String(item.name || item.type || '').toLowerCase();
      if (lower.includes('input') || lower.includes('r(s)') || lower.startsWith('r')) type = 'input';
      else if (lower.includes('output') || lower.includes('c(s)') || lower.includes('y(s)')) type = 'output';
      else if (lower.includes('sum') || lower.includes('somador') || lower === 's') type = 'summer';
      else if (lower.includes('ramo') || lower.includes('branch') || lower.includes('pickoff')) type = 'pickoff';
    }

    if (type === 'input') hasInput = true;
    if (type === 'output') hasOutput = true;

    // Expressão algébrica limpa
    let expr = item.expr ? String(item.expr).trim() : undefined;
    if (type === 'block') {
      if (!expr) expr = '1';
      // Valida sintaxe algébrica com o parser existente
      try {
        parseRatExpr(expr);
      } catch {
        // Se falhou, tenta remover espaços e caracteres estranhos
        expr = expr.replace(/[^a-zA-Z0-9+\-*/()^.]/g, '') || '1';
      }
    }

    elements.push({
      id: validId,
      type,
      name: String(item.name || (type === 'block' ? `G${idx + 1}` : type === 'summer' ? `S${idx + 1}` : validId)),
      expr,
      x: typeof item.x === 'number' && !isNaN(item.x) ? Math.max(40, Math.min(800, item.x)) : 100 + (idx * 90),
      y: typeof item.y === 'number' && !isNaN(item.y) ? Math.max(60, Math.min(450, item.y)) : (item.dir === 'left' ? 240 : 150),
      dir: item.dir === 'left' ? 'left' : 'right'
    });
  });

  // Se faltar entrada, cria no início
  if (!hasInput) {
    elements.unshift({
      id: 'IN',
      type: 'input',
      name: 'R(s)',
      x: 50,
      y: 150
    });
  }

  // Se faltar saída, cria no final
  if (!hasOutput) {
    const maxX = Math.max(...elements.map(e => e.x || 150));
    elements.push({
      id: 'OUT',
      type: 'output',
      name: 'C(s)',
      x: maxX + 100,
      y: 150
    });
  }

  const validElementIds = new Set(elements.map(e => e.id));

  // Sanitiza conexões
  const connections: DiagramConnection[] = [];
  rawConnections.forEach((conn: any, idx: number) => {
    const rawFrom = String(conn.from || '');
    const rawTo = String(conn.to || '');
    const fromId = idMap.get(rawFrom) || rawFrom;
    const toId = idMap.get(rawTo) || rawTo;

    if (validElementIds.has(fromId) && validElementIds.has(toId) && fromId !== toId) {
      connections.push({
        id: String(conn.id || `c_${idx}_${Date.now()}`),
        from: fromId,
        to: toId,
        sign: conn.sign === '-' ? '-' : '+'
      });
    }
  });

  // Se a IA não inferiu conexões completas, liga em cascata sequencial básica
  if (connections.length === 0 && elements.length >= 2) {
    for (let i = 0; i < elements.length - 1; i++) {
      connections.push({
        id: `auto_c_${i}`,
        from: elements[i].id,
        to: elements[i + 1].id,
        sign: '+'
      });
    }
  }

  return { elements, connections };
}

/**
 * Chamada direta à API do Google Gemini Multimodal via REST (client-side ou server-side)
 */
export async function recognizeDiagramWithGemini(
  imageBase64: string,
  apiKey: string,
  mimeType: string = 'image/png'
): Promise<DiagramGraph> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Chave de API do Google Gemini não informada.');
  }

  // Remove prefixo data:image/...;base64, se existir
  let cleanBase64 = imageBase64;
  if (imageBase64.includes('base64,')) {
    const parts = imageBase64.split('base64,');
    cleanBase64 = parts[1];
    const mimeMatch = parts[0].match(/data:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  }

  const systemPrompt = `Você é um engenheiro especialista em Sistemas de Controle e Automação e análise topológica de Diagramas de Blocos no Domínio de Laplace.
Analise a imagem fornecida contendo um diagrama de blocos de controle de malha fechada.
Identifique com precisão todos os componentes:
1. Nós de entrada (type: "input", name: "R(s)" ou similar).
2. Nós de saída (type: "output", name: "C(s)" ou "Y(s)").
3. Blocos de função de transferência (type: "block", name: "G1", "G2", "H1", etc., expr: expressão em s como "10/(s+2)", "1/s", "K", "5").
   - Para blocos no caminho de ida (esquerda para direita), use dir: "right".
   - Para blocos de realimentação/feedback (direita para esquerda), use dir: "left".
4. Somadores / Pontos de junção (type: "summer", name: "S1", "S2", etc.).
5. Conexões direcionadas:
   - from: id do nó de origem
   - to: id do nó de destino
   - sign: '+' ou '-' (atenção crítica ao sinal do somador: realimentação negativa tem sign: "-").
6. Coordenadas sugeridas:
   - x: distribua da esquerda para a direita entre 60 e 640.
   - y: ramo direto em y: 150; ramo de realimentação em y: 240 a 280; ramo paralelo superior em y: 70 a 90.

Retorne EXCLUSIVAMENTE um JSON válido com o seguinte formato:
{
  "elements": [
    { "id": "IN", "type": "input", "name": "R(s)", "x": 60, "y": 150 },
    { "id": "s1", "type": "summer", "name": "S1", "x": 180, "y": 150 },
    { "id": "g1", "type": "block", "name": "G1", "expr": "10/(s+2)", "x": 360, "y": 150, "dir": "right" },
    { "id": "h1", "type": "block", "name": "H1", "expr": "1", "x": 360, "y": 250, "dir": "left" },
    { "id": "OUT", "type": "output", "name": "C(s)", "x": 580, "y": 150 }
  ],
  "connections": [
    { "id": "c1", "from": "IN", "to": "s1", sign: "+" },
    { "id": "c2", "from": "s1", "to": "g1", sign: "+" },
    { "id": "c3", "from": "g1", "to": "OUT", sign: "+" },
    { "id": "c4", "from": "g1", "to": "h1", sign: "+" },
    { "id": "c5", "from": "h1", "to": "s1", sign: "-" }
  ]
}`;

  // Lista de modelos ordenados por preferência (gemini-3.8-flash é a versão recomendada pela API)
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.8-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  let lastError: any = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64
                  }
                },
                {
                  text: systemPrompt
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `Erro HTTP ${response.status}`;
        lastError = new Error(`[${model}] ${errMsg}`);
        continue;
      }

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error('O modelo não retornou conteúdo textual.');
      }

      // Limpa possíveis marcações de markdown ```json ... ```
      const cleanedJson = textOutput
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      return normalizeDiagramGraph(parsed);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Não foi possível conectar à API de Visão do Gemini.');
}
