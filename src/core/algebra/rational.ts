/**
 * Motor Algébrico de Funções Racionais N(s)/D(s)
 * Manipulação exata de frações, cancelamento de raízes e MMC.
 */

import {
  Polynomial,
  polyNormalize,
  polyFromNumber,
  polyAdd,
  polySub,
  polyMul,
  polyScale,
  polyEqual,
  polyIsZero,
  polyIsOne,
  polyToLatex,
  polyToCompact,
  isUnivariateInS,
  toUnivariateArr,
  fromUnivariateArr,
  gcdUni,
  divUni,
  gcdNum,
  cleanVars
} from "./polynomial";

export interface RatFunc {
  num: Polynomial;
  den: Polynomial;
}

export function ratSimplify(num: Polynomial, den: Polynomial): RatFunc {
  let N = polyNormalize(num);
  let D = polyNormalize(den);
  if (polyIsZero(D)) D = polyFromNumber(1);
  if (polyIsZero(N)) return { num: [], den: polyFromNumber(1) };

  if (polyEqual(N, D)) {
    return { num: polyFromNumber(1), den: polyFromNumber(1) };
  }
  if (polyEqual(N, polyScale(D, -1))) {
    return { num: polyFromNumber(-1), den: polyFromNumber(1) };
  }

  // Cancelar monômios comuns a todos os termos de N e D
  const allTerms = [...N, ...D];
  if (allTerms.length > 0) {
    const candidateVars = Object.keys(allTerms[0].vars);
    for (const v of candidateVars) {
      let minExp = Infinity;
      for (const t of allTerms) {
        const e = t.vars[v] || 0;
        if (e < minExp) minExp = e;
      }
      if (minExp > 0 && minExp < Infinity) {
        N = N.map(t => {
          const nv = { ...t.vars };
          nv[v] -= minExp;
          return { coeff: t.coeff, vars: cleanVars(nv) };
        });
        D = D.map(t => {
          const nv = { ...t.vars };
          nv[v] -= minExp;
          return { coeff: t.coeff, vars: cleanVars(nv) };
        });
      }
    }
  }

  // Se for univariado em 's', simplificar por GCD polinomial
  if (isUnivariateInS(N) && isUnivariateInS(D) && (N.length > 1 || D.length > 1)) {
    const uN = toUnivariateArr(N);
    const uD = toUnivariateArr(D);
    if (uN.length > 1 && uD.length > 1) {
      const g = gcdUni(uN, uD);
      if (g.length > 1) {
        const qN = divUni(uN, g);
        const qD = divUni(uD, g);
        if (
          qN &&
          qD &&
          qN.rem.length === 1 &&
          Math.abs(qN.rem[0]) < 1e-6 &&
          qD.rem.length === 1 &&
          Math.abs(qD.rem[0]) < 1e-6
        ) {
          N = fromUnivariateArr(qN.quot);
          D = fromUnivariateArr(qD.quot);
        }
      }
    }
  }

  // Normalizar sinal pelo termo líder do denominador (priorizando termo constante 1 se puramente simbólico)
  let leadSign = 1;
  const constTermD = D.find(t => Object.keys(t.vars).length === 0);
  if (constTermD && !isUnivariateInS(D)) {
    leadSign = constTermD.coeff < 0 ? -1 : 1;
  } else if (D.length > 0 && D[0].coeff < 0) {
    leadSign = -1;
  }
  if (leadSign < 0) {
    N = polyScale(N, -1);
    D = polyScale(D, -1);
  }

  // Se todos os coeficientes forem inteiros, simplificar pelo MDC numérico
  const allCoeffs = [...N, ...D].map(t => t.coeff);
  const allInts = allCoeffs.every(c => Math.abs(c - Math.round(c)) < 1e-7);
  if (allInts && allCoeffs.length > 0) {
    let g = Math.abs(Math.round(allCoeffs[0]));
    for (let i = 1; i < allCoeffs.length; i++) {
      g = gcdNum(g, allCoeffs[i]);
    }
    if (g > 1) {
      N = polyScale(N, 1 / g);
      D = polyScale(D, 1 / g);
    }
  }

  return { num: polyNormalize(N), den: polyNormalize(D) };
}

export function ratFromPoly(P: Polynomial): RatFunc {
  return ratSimplify(P, polyFromNumber(1));
}

export function ratOne(): RatFunc {
  return { num: polyFromNumber(1), den: polyFromNumber(1) };
}

export function ratZero(): RatFunc {
  return { num: [], den: polyFromNumber(1) };
}

export function ratIsZero(R: RatFunc): boolean {
  return polyIsZero(R.num);
}

export function ratIsOne(R: RatFunc): boolean {
  return polyEqual(R.num, R.den);
}

export function ratScale(A: RatFunc, s: number): RatFunc {
  return ratSimplify(polyScale(A.num, s), A.den);
}

export function ratAdd(A: RatFunc, B: RatFunc): RatFunc {
  if (polyEqual(A.den, B.den)) {
    return ratSimplify(polyAdd(A.num, B.num), A.den);
  }
  const num = polyAdd(polyMul(A.num, B.den), polyMul(B.num, A.den));
  const den = polyMul(A.den, B.den);
  return ratSimplify(num, den);
}

export function ratSub(A: RatFunc, B: RatFunc): RatFunc {
  return ratAdd(A, ratScale(B, -1));
}

export function ratMul(A: RatFunc, B: RatFunc): RatFunc {
  let n1 = A.num,
    d1 = A.den,
    n2 = B.num,
    d2 = B.den;
  if (polyEqual(n1, d2)) {
    n1 = polyFromNumber(1);
    d2 = polyFromNumber(1);
  }
  if (polyEqual(n2, d1)) {
    n2 = polyFromNumber(1);
    d1 = polyFromNumber(1);
  }
  return ratSimplify(polyMul(n1, n2), polyMul(d1, d2));
}

export function ratDiv(A: RatFunc, B: RatFunc): RatFunc {
  return ratMul(A, { num: B.den, den: B.num });
}

export function ratFeedback(G: RatFunc, H: RatFunc, loopSign: "+" | "-"): RatFunc {
  // loopSign === "-" (realimentação negativa clássica) => G / (1 + G*H)
  // loopSign === "+" (realimentação positiva) => G / (1 - G*H)
  const num = polyMul(G.num, H.den);
  const ghNum = polyMul(G.num, H.num);
  const ghDen = polyMul(G.den, H.den);
  const den = loopSign === "-" ? polyAdd(ghDen, ghNum) : polySub(ghDen, ghNum);
  return ratSimplify(num, den);
}

export function ratToLatex(R: RatFunc): string {
  const norm = ratSimplify(R.num, R.den);
  const nLat = polyToLatex(norm.num);
  const dLat = polyToLatex(norm.den);

  if (polyIsOne(norm.den)) return nLat;
  if (polyIsZero(norm.num)) return "0";
  return `\\frac{${nLat}}{${dLat}}`;
}

export function ratToCompactParts(R: RatFunc): { num: string; den: string; isFraction: boolean } {
  const norm = ratSimplify(R.num, R.den);
  const numStr = polyToCompact(norm.num);
  const denStr = polyToCompact(norm.den);
  const isFraction = !polyIsOne(norm.den) && !polyIsZero(norm.num);
  return { num: numStr, den: denStr, isFraction };
}

export function ratEval(R: RatFunc, sVal: number): number {
  const evalPoly = (P: Polynomial): number => {
    let sum = 0;
    for (const t of P) {
      let termVal = t.coeff;
      for (const k of Object.keys(t.vars)) {
        if (k === "s") {
          termVal *= Math.pow(sVal, t.vars[k]);
        }
      }
      sum += termVal;
    }
    return sum;
  };
  const d = evalPoly(R.den);
  if (Math.abs(d) < 1e-12) return Infinity;
  return evalPoly(R.num) / d;
}
