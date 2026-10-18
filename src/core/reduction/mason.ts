/**
 * Algoritmo da Regra de Mason para Grafos de Fluxo de Sinal de Diagramas de Blocos
 * Pure TypeScript, desacoplado do DOM.
 */

import {
  RatFunc,
  ratOne,
  ratZero,
  ratAdd,
  ratMul,
  ratDiv,
  ratScale
} from "../algebra/rational";

import { parseRatExpr } from "../algebra/parser";

export interface DiagramElement {
  id: string;
  type: "block" | "summer" | "pickoff" | "input" | "output";
  name: string;
  expr?: string;
  rat?: RatFunc;
  x?: number;
  y?: number;
  dir?: "right" | "left";
  [key: string]: any;
}

export interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  sign?: "+" | "-";
  fromPort?: string;
  toPort?: string;
  [key: string]: any;
}

export interface DiagramGraph {
  elements: DiagramElement[];
  connections: DiagramConnection[];
}

export interface ForwardPath {
  nodes: string[];
  gain: RatFunc;
}

export interface FeedbackLoop {
  nodes: string[];
  gain: RatFunc;
}

export interface DisjointLoopPair {
  loops: [number, number];
  gain: RatFunc;
}

export interface MasonAnalysis {
  forwardPaths: ForwardPath[];
  loops: FeedbackLoop[];
  disjointPairs: DisjointLoopPair[];
  delta: RatFunc;
  cofactors: RatFunc[];
  totalT: RatFunc;
  elements: DiagramElement[];
}

export function cloneGraphForReduction(graph: DiagramGraph): DiagramGraph {
  const elements = graph.elements.map(e => ({
    ...e,
    rat: e.type === "block" ? (e.rat || parseRatExpr(e.expr || "1")) : ratOne()
  }));
  const connections = graph.connections.map(c => ({ ...c }));

  // Contrair nós "pickoff" explícitos para que suas saídas venham diretamente do nó pai
  const pickoffs = elements.filter(e => e.type === "pickoff");
  pickoffs.forEach(p => {
    const inEdge = connections.find(c => c.to === p.id);
    if (inEdge) {
      connections.forEach(c => {
        if (c.from === p.id) c.from = inEdge.from;
      });
    }
  });

  const cleanElements = elements.filter(e => e.type !== "pickoff");
  const cleanConnections = connections.filter(
    c =>
      c.from !== c.to &&
      cleanElements.some(e => e.id === c.from) &&
      cleanElements.some(e => e.id === c.to)
  );

  return { elements: cleanElements, connections: cleanConnections };
}

export function computeMasonAnalysis(graph: DiagramGraph): MasonAnalysis {
  const G = cloneGraphForReduction(graph);
  const nodes = G.elements.map(e => e.id);

  const adj = new Map<string, { to: string; gain: RatFunc; connId: string }[]>();
  nodes.forEach(id => adj.set(id, []));

  G.connections.forEach(c => {
    const toEl = G.elements.find(e => e.id === c.to);
    if (!toEl) return;
    let gain = toEl.type === "block" ? (toEl.rat || ratOne()) : ratOne();
    if (c.sign === "-") gain = ratScale(gain, -1);
    if (!adj.has(c.from)) adj.set(c.from, []);
    adj.get(c.from)!.push({ to: c.to, gain, connId: c.id });
  });

  // 1. Encontrar todos os caminhos simples de IN até OUT
  const forwardPaths: ForwardPath[] = [];
  function dfsPaths(curr: string, visited: Set<string>, pathNodes: string[], accGain: RatFunc) {
    if (curr === "OUT") {
      forwardPaths.push({ nodes: [...pathNodes], gain: accGain });
      return;
    }
    for (const edge of adj.get(curr) || []) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        pathNodes.push(edge.to);
        dfsPaths(edge.to, visited, pathNodes, ratMul(accGain, edge.gain));
        pathNodes.pop();
        visited.delete(edge.to);
      }
    }
  }
  dfsPaths("IN", new Set(["IN"]), ["IN"], ratOne());

  // 2. Encontrar todos os ciclos simples (laços de realimentação)
  const loops: FeedbackLoop[] = [];
  const seenLoopSigs = new Set<string>();

  nodes.forEach(startNode => {
    function dfsCycle(curr: string, visited: Set<string>, pathNodes: string[], accGain: RatFunc) {
      for (const edge of adj.get(curr) || []) {
        if (edge.to === startNode) {
          const sig = [...pathNodes].sort().join("|");
          if (!seenLoopSigs.has(sig)) {
            seenLoopSigs.add(sig);
            loops.push({ nodes: [...pathNodes], gain: ratMul(accGain, edge.gain) });
          }
        } else if (!visited.has(edge.to) && edge.to !== "IN" && edge.to !== "OUT") {
          visited.add(edge.to);
          pathNodes.push(edge.to);
          dfsCycle(edge.to, visited, pathNodes, ratMul(accGain, edge.gain));
          pathNodes.pop();
          visited.delete(edge.to);
        }
      }
    }
    if (startNode !== "IN" && startNode !== "OUT") {
      dfsCycle(startNode, new Set([startNode]), [startNode], ratOne());
    }
  });

  function setsDisjoint(arrA: string[], arrB: string[]): boolean {
    return !arrA.some(x => arrB.includes(x));
  }

  // Calcular Δ = 1 - Σ L_i + Σ (L_i L_j disjuntos) - Σ (L_i L_j L_k disjuntos) ...
  function calcDeterminant(activeLoops: FeedbackLoop[]): RatFunc {
    let delta = ratOne();
    const m = activeLoops.length;

    function backtrack(startIdx: number, chosenNodes: string[], prodGain: RatFunc, depth: number) {
      for (let i = startIdx; i < m; i++) {
        const lp = activeLoops[i];
        if (setsDisjoint(chosenNodes, lp.nodes)) {
          const newGain = ratMul(prodGain, lp.gain);
          const signedTerm = depth % 2 === 1 ? ratScale(newGain, -1) : newGain;
          delta = ratAdd(delta, signedTerm);
          backtrack(i + 1, [...chosenNodes, ...lp.nodes], newGain, depth + 1);
        }
      }
    }
    backtrack(0, [], ratOne(), 1);
    return delta;
  }

  const delta = calcDeterminant(loops);
  let numSum = ratZero();
  const cofactors: RatFunc[] = [];

  // Identificação de pares de laços que não se tocam (laços disjuntos)
  const disjointPairs: DisjointLoopPair[] = [];
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      if (setsDisjoint(loops[i].nodes, loops[j].nodes)) {
        disjointPairs.push({
          loops: [i + 1, j + 1],
          gain: ratMul(loops[i].gain, loops[j].gain)
        });
      }
    }
  }

  forwardPaths.forEach(p => {
    const nonTouchingLoops = loops.filter(lp => setsDisjoint(p.nodes, lp.nodes));
    const dk = calcDeterminant(nonTouchingLoops);
    cofactors.push(dk);
    numSum = ratAdd(numSum, ratMul(p.gain, dk));
  });

  const totalT = ratDiv(numSum, delta);
  return { forwardPaths, loops, disjointPairs, delta, cofactors, totalT, elements: G.elements };
}
