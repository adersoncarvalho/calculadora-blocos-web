/**
 * Módulo de Análise de Estabilidade, Polos, Zeros e Parâmetros Canônicos
 * Baseado nos livros de Norman Nise e Katsuhiko Ogata.
 */

import {
  Polynomial,
  isUnivariateInS,
  toUnivariateArr,
  trimUni,
  polyIsZero
} from "../algebra/polynomial";

import { RatFunc } from "../algebra/rational";

export interface ComplexNumber {
  re: number;
  im: number;
}

export type SecondOrderRegime = "Subamortecido" | "Criticamente Amortecido" | "Sobreamortecido" | "Não-Amortecido";

export interface StabilityReport {
  isStable: boolean;
  stabilityText: string;
  poles: ComplexNumber[];
  zeros: ComplexNumber[];
  order: number;
  systemType: number; // Tipo 0, 1, 2... (número de integradores puros / polos na origem)
  dcGain: number | null; // null se infinito
  secondOrderParams?: {
    wn: number;
    zeta: number;
    percentOvershoot: number;
    ts2Percent: number;
    ts5Percent: number;
    regime: SecondOrderRegime;
  };
}

export function computeRootsPoly(coeffsAsc: number[]): ComplexNumber[] {
  const c = trimUni(coeffsAsc);
  const deg = c.length - 1;
  if (deg <= 0) return [];

  if (deg === 1) {
    // a0 + a1*s = 0 => s = -a0/a1
    return [{ re: -c[0] / c[1], im: 0 }];
  }

  if (deg === 2) {
    // c[2]*s^2 + c[1]*s + c[0] = 0
    const a = c[2], b = c[1], c0 = c[0];
    const disc = b * b - 4 * a * c0;
    if (disc >= 0) {
      return [
        { re: (-b + Math.sqrt(disc)) / (2 * a), im: 0 },
        { re: (-b - Math.sqrt(disc)) / (2 * a), im: 0 }
      ];
    } else {
      const re = -b / (2 * a);
      const im = Math.sqrt(-disc) / (2 * a);
      return [
        { re, im },
        { re, im: -im }
      ];
    }
  }

  // Método Durand-Kerner para polinômios de grau >= 3
  const n = deg;
  const an = c[n];
  const aNorm = c.map(x => x / an);

  // Valores iniciais em círculo no plano complexo
  let roots: ComplexNumber[] = [];
  const radius = 1 + Math.max(...aNorm.slice(0, n).map(Math.abs));
  for (let k = 0; k < n; k++) {
    const theta = (2 * Math.PI * k + 0.5) / n;
    roots.push({
      re: Math.pow(radius, k / n) * Math.cos(theta),
      im: Math.pow(radius, k / n) * Math.sin(theta)
    });
  }

  const evalPolyC = (z: ComplexNumber): ComplexNumber => {
    let resRe = aNorm[n];
    let resIm = 0;
    for (let k = n - 1; k >= 0; k--) {
      // res = res * z + aNorm[k]
      const nextRe = resRe * z.re - resIm * z.im + aNorm[k];
      const nextIm = resRe * z.im + resIm * z.re;
      resRe = nextRe;
      resIm = nextIm;
    }
    return { re: resRe, im: resIm };
  };

  for (let iter = 0; iter < 100; iter++) {
    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      const fz = evalPolyC(roots[i]);
      let denomRe = 1;
      let denomIm = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const diffRe = roots[i].re - roots[j].re;
          const diffIm = roots[i].im - roots[j].im;
          const nextRe = denomRe * diffRe - denomIm * diffIm;
          const nextIm = denomRe * diffIm + denomIm * diffRe;
          denomRe = nextRe;
          denomIm = nextIm;
        }
      }
      const denomMagSq = denomRe * denomRe + denomIm * denomIm;
      if (denomMagSq > 1e-18) {
        const deltaRe = (fz.re * denomRe + fz.im * denomIm) / denomMagSq;
        const deltaIm = (fz.im * denomRe - fz.re * denomIm) / denomMagSq;
        roots[i].re -= deltaRe;
        roots[i].im -= deltaIm;
        maxDiff = Math.max(maxDiff, Math.hypot(deltaRe, deltaIm));
      }
    }
    if (maxDiff < 1e-9) break;
  }

  return roots.map(r => ({
    re: Math.abs(r.re) < 1e-6 ? 0 : Number(r.re.toFixed(4)),
    im: Math.abs(r.im) < 1e-6 ? 0 : Number(r.im.toFixed(4))
  }));
}

/**
 * Critério de Estabilidade de Routh-Hurwitz para coeficientes em ordem decrescente s^n, s^(n-1)...
 */
export function checkRouthHurwitz(coeffsDesc: number[]): { isStable: boolean; firstColumn: number[] } {
  const n = coeffsDesc.length - 1;
  if (n <= 0) return { isStable: true, firstColumn: [coeffsDesc[0] || 1] };

  // Se algum coeficiente for nulo ou tiver sinal trocado, não é estável
  const sign0 = Math.sign(coeffsDesc[0]);
  if (coeffsDesc.some(c => Math.sign(c) !== sign0)) {
    return { isStable: false, firstColumn: coeffsDesc };
  }

  const cols = Math.ceil((n + 1) / 2);
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array(cols).fill(0));

  // Preencher primeiras 2 linhas
  for (let j = 0; j < cols; j++) {
    table[0][j] = coeffsDesc[2 * j] || 0;
    table[1][j] = coeffsDesc[2 * j + 1] || 0;
  }

  // Preencher demais linhas da tabela
  for (let i = 2; i <= n; i++) {
    const pivot = table[i - 1][0];
    if (Math.abs(pivot) < 1e-9) {
      table[i - 1][0] = 1e-6; // epsilon regularizer
    }
    for (let j = 0; j < cols - 1; j++) {
      const a = table[i - 1][0];
      const b = table[i - 2][j + 1] || 0;
      const c = table[i - 2][0];
      const d = table[i - 1][j + 1] || 0;
      table[i][j] = (a * b - c * d) / a;
    }
  }

  const firstCol = table.map(r => r[0]);
  const isStable = firstCol.every(v => v * firstCol[0] > 0);
  return { isStable, firstColumn: firstCol };
}

export function analyzeTransferFunction(T: RatFunc): StabilityReport {
  if (!isUnivariateInS(T.num) || !isUnivariateInS(T.den)) {
    return {
      isStable: true,
      stabilityText: "Análise restrita a sistemas univariados em s",
      poles: [],
      zeros: [],
      order: 0,
      systemType: 0,
      dcGain: null
    };
  }

  const uN = trimUni(toUnivariateArr(T.num));
  const uD = trimUni(toUnivariateArr(T.den));

  const poles = computeRootsPoly(uD);
  const zeros = polyIsZero(T.num) ? [] : computeRootsPoly(uN);
  const order = uD.length - 1;

  // Contar polos na origem s = 0 (determina o Tipo do sistema)
  let originPoles = 0;
  for (let i = 0; i < uD.length; i++) {
    if (Math.abs(uD[i]) < 1e-9) originPoles++;
    else break;
  }

  // Ganho DC: s -> 0
  let dcGain: number | null = null;
  const n0 = uN[0] || 0;
  const d0 = uD[0] || 0;
  if (Math.abs(d0) > 1e-9) {
    dcGain = Number((n0 / d0).toFixed(4));
  }

  // Avaliação de estabilidade rigorosa pelo mapa de polos no plano complexo s
  const hasRhpPoles = poles.some(p => p.re > 1e-5);
  const hasJOmegaPoles = poles.some(p => Math.abs(p.re) <= 1e-5);

  let stabilityText = "Sistema Estável (Polos no Semiplano Esquerdo)";
  let isStable = true;

  if (hasRhpPoles) {
    stabilityText = "Sistema Instável (Possui polo(s) no Semiplano Direito)";
    isStable = false;
  } else if (hasJOmegaPoles || originPoles > 0) {
    stabilityText = "Marginalmente Estável (Possui polo(s) sobre o Eixo Imaginário / Origem)";
    isStable = false;
  }

  // Parâmetros de 2ª Ordem canônicos
  let secondOrderParams: StabilityReport["secondOrderParams"] = undefined;
  if (order === 2 && uD[2] > 0) {
    const a2 = uD[2];
    const a1 = uD[1];
    const a0 = uD[0];
    const wn = Math.sqrt(a0 / a2);
    const zeta = a1 / (2 * a2 * wn);

    let regime: SecondOrderRegime = "Subamortecido";
    let percentOvershoot = 0;
    if (zeta < 1e-6) {
      regime = "Não-Amortecido";
      percentOvershoot = 100;
    } else if (zeta < 1) {
      regime = "Subamortecido";
      percentOvershoot = Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)) * 100;
    } else if (Math.abs(zeta - 1) < 1e-4) {
      regime = "Criticamente Amortecido";
      percentOvershoot = 0;
    } else {
      regime = "Sobreamortecido";
      percentOvershoot = 0;
    }

    const ts2 = (zeta > 0 && wn > 0) ? 4 / (zeta * wn) : Infinity;
    const ts5 = (zeta > 0 && wn > 0) ? 3 / (zeta * wn) : Infinity;

    secondOrderParams = {
      wn: Number(wn.toFixed(4)),
      zeta: Number(zeta.toFixed(4)),
      percentOvershoot: Number(percentOvershoot.toFixed(2)),
      ts2Percent: Number(ts2.toFixed(4)),
      ts5Percent: Number(ts5.toFixed(4)),
      regime
    };
  }

  return {
    isStable,
    stabilityText,
    poles,
    zeros,
    order,
    systemType: originPoles,
    dcGain,
    secondOrderParams
  };
}
