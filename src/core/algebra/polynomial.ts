/**
 * Motor Algébrico de Polinômios Simbólicos e Univariados em 's'
 * Agnóstico de DOM, React ou navegador.
 */

export interface TermVars {
  [varName: string]: number;
}

export interface Term {
  coeff: number;
  vars: TermVars;
}

export type Polynomial = Term[];

export function gcdNum(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y > 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function normalizeVarName(raw: string): string {
  const s = raw.trim();
  if (s === "s") return "s";
  const m = s.match(/^([A-Za-z]+)_?(\d+)$/);
  if (m) return `${m[1]}_${m[2]}`;
  return s;
}

export function varToLatex(v: string): string {
  const m = v.match(/^([A-Za-z]+)_(\d+)$/);
  if (m) return `${m[1]}_{${m[2]}}`;
  return v;
}

export function varToCompact(v: string): string {
  return v.replace(/_/g, "");
}

export function cleanVars(vars: TermVars): TermVars {
  const out: TermVars = {};
  for (const k of Object.keys(vars)) {
    if (vars[k] && vars[k] !== 0) {
      out[k] = vars[k];
    }
  }
  return out;
}

export function termSignature(vars: TermVars): string {
  const keys = Object.keys(vars).filter(k => vars[k] !== 0).sort();
  return keys.map(k => `${k}^${vars[k]}`).join("*");
}

export function polyNormalize(terms: Polynomial): Polynomial {
  const map = new Map<string, Term>();
  for (const t of terms) {
    if (Math.abs(t.coeff) < 1e-10) continue;
    const cv = cleanVars(t.vars);
    const sig = termSignature(cv);
    if (map.has(sig)) {
      map.get(sig)!.coeff += t.coeff;
    } else {
      map.set(sig, { coeff: t.coeff, vars: cv });
    }
  }

  const result: Term[] = [];
  for (const val of Array.from(map.values())) {
    if (Math.abs(val.coeff) >= 1e-10) {
      if (Math.abs(val.coeff - Math.round(val.coeff)) < 1e-9) {
        val.coeff = Math.round(val.coeff);
      }
      result.push(val);
    }
  }

  result.sort((a, b) => {
    const degS_a = a.vars.s || 0;
    const degS_b = b.vars.s || 0;
    if (degS_a !== degS_b) return degS_b - degS_a;
    const totA = Object.values(a.vars).reduce((acc, v) => acc + v, 0);
    const totB = Object.values(b.vars).reduce((acc, v) => acc + v, 0);
    if (totA !== totB) return totA - totB;
    return termSignature(a.vars).localeCompare(termSignature(b.vars));
  });

  return result;
}

export function polyFromNumber(n: number): Polynomial {
  return polyNormalize([{ coeff: n, vars: {} }]);
}

export function polyFromVar(v: string, exp = 1): Polynomial {
  const nv = normalizeVarName(v);
  return polyNormalize([{ coeff: 1, vars: { [nv]: exp } }]);
}

export function polyAdd(A: Polynomial, B: Polynomial): Polynomial {
  return polyNormalize([...A, ...B]);
}

export function polySub(A: Polynomial, B: Polynomial): Polynomial {
  return polyNormalize([...A, ...B.map(t => ({ coeff: -t.coeff, vars: { ...t.vars } }))]);
}

export function polyScale(A: Polynomial, c: number): Polynomial {
  return polyNormalize(A.map(t => ({ coeff: t.coeff * c, vars: { ...t.vars } })));
}

export function polyMul(A: Polynomial, B: Polynomial): Polynomial {
  const terms: Term[] = [];
  for (const t1 of A) {
    for (const t2 of B) {
      const c = t1.coeff * t2.coeff;
      const vars: TermVars = { ...t1.vars };
      for (const k of Object.keys(t2.vars)) {
        vars[k] = (vars[k] || 0) + t2.vars[k];
      }
      terms.push({ coeff: c, vars });
    }
  }
  return polyNormalize(terms);
}

export function polyEqual(A: Polynomial, B: Polynomial): boolean {
  const normA = polyNormalize(A);
  const normB = polyNormalize(B);
  if (normA.length !== normB.length) return false;
  for (let i = 0; i < normA.length; i++) {
    if (Math.abs(normA[i].coeff - normB[i].coeff) > 1e-9) return false;
    if (termSignature(normA[i].vars) !== termSignature(normB[i].vars)) return false;
  }
  return true;
}

export function polyIsZero(P: Polynomial): boolean {
  return polyNormalize(P).length === 0;
}

export function polyIsOne(P: Polynomial): boolean {
  const norm = polyNormalize(P);
  return norm.length === 1 && Math.abs(norm[0].coeff - 1) < 1e-9 && Object.keys(norm[0].vars).length === 0;
}

export function isUnivariateInS(P: Polynomial): boolean {
  for (const t of P) {
    for (const k of Object.keys(t.vars)) {
      if (k !== "s") return false;
    }
  }
  return true;
}

export function toUnivariateArr(P: Polynomial): number[] {
  let maxDeg = 0;
  for (const t of P) {
    const d = t.vars.s || 0;
    if (d > maxDeg) maxDeg = d;
  }
  const arr = new Array(maxDeg + 1).fill(0);
  for (const t of P) {
    arr[t.vars.s || 0] += t.coeff;
  }
  return arr;
}

export function fromUnivariateArr(arr: number[]): Polynomial {
  const terms: Term[] = [];
  for (let d = 0; d < arr.length; d++) {
    if (Math.abs(arr[d]) > 1e-9) {
      terms.push({ coeff: arr[d], vars: d === 0 ? {} : { s: d } });
    }
  }
  return polyNormalize(terms);
}

export function trimUni(arr: number[]): number[] {
  let i = arr.length - 1;
  while (i > 0 && Math.abs(arr[i]) < 1e-9) i--;
  return arr.slice(0, i + 1);
}

export function divUni(A: number[], B: number[]): { quot: number[]; rem: number[] } | null {
  let rem = [...A];
  const trimmedB = trimUni(B);
  const degB = trimmedB.length - 1;
  if (degB === 0 && Math.abs(trimmedB[0]) < 1e-9) return null;

  const quot = new Array(Math.max(1, rem.length - degB)).fill(0);
  while (rem.length - 1 >= degB && !(rem.length === 1 && Math.abs(rem[0]) < 1e-8)) {
    const degR = rem.length - 1;
    const factor = rem[degR] / trimmedB[degB];
    quot[degR - degB] = factor;
    for (let i = 0; i <= degB; i++) {
      rem[degR - degB + i] -= factor * trimmedB[i];
    }
    rem = trimUni(rem);
    if (rem.length === 1 && Math.abs(rem[0]) < 1e-8) break;
  }
  return { quot: trimUni(quot), rem: trimUni(rem) };
}

export function gcdUni(A: number[], B: number[]): number[] {
  let a = trimUni(A);
  let b = trimUni(B);
  let iter = 0;
  while (!(b.length === 1 && Math.abs(b[0]) < 1e-7) && iter < 30) {
    const d = divUni(a, b);
    if (!d) break;
    a = b;
    b = d.rem;
    const maxC = Math.max(...b.map(Math.abs));
    if (maxC > 1e-7) b = b.map(x => x / maxC);
    iter++;
  }
  const lead = a[a.length - 1] || 1;
  return a.map(x => x / lead);
}

export function polyToLatex(P: Polynomial): string {
  const norm = polyNormalize(P);
  if (norm.length === 0) return "0";
  let s = "";
  for (let i = 0; i < norm.length; i++) {
    const t = norm[i];
    const c = t.coeff;
    const absC = Math.abs(c);
    const sign = c < 0 ? " - " : (i === 0 ? "" : " + ");
    const varsKeys = Object.keys(t.vars).sort();
    const hasVars = varsKeys.length > 0;

    let coeffStr = "";
    if (!hasVars) {
      coeffStr = absC.toString();
    } else if (Math.abs(absC - 1) > 1e-9) {
      coeffStr = absC.toString();
    }

    let varStr = "";
    for (const vk of varsKeys) {
      const exp = t.vars[vk];
      const latVar = varToLatex(vk);
      if (exp === 1) {
        varStr += latVar;
      } else {
        varStr += `${latVar}^{${exp}}`;
      }
    }

    s += `${sign}${coeffStr}${varStr}`;
  }
  return s.trim();
}

export function polyToCompact(P: Polynomial): string {
  const norm = polyNormalize(P);
  if (norm.length === 0) return "0";
  let s = "";
  for (let i = 0; i < norm.length; i++) {
    const t = norm[i];
    const c = t.coeff;
    const absC = Math.abs(c);
    const sign = c < 0 ? " - " : (i === 0 ? "" : " + ");
    const varsKeys = Object.keys(t.vars).sort();
    const hasVars = varsKeys.length > 0;

    let coeffStr = "";
    if (!hasVars) {
      coeffStr = absC.toString();
    } else if (Math.abs(absC - 1) > 1e-9) {
      coeffStr = absC.toString();
    }

    let varStr = "";
    for (const vk of varsKeys) {
      const exp = t.vars[vk];
      const compVar = varToCompact(vk);
      if (exp === 1) {
        varStr += compVar;
      } else {
        varStr += `${compVar}^${exp}`;
      }
    }

    s += `${sign}${coeffStr}${varStr}`;
  }
  return s.trim();
}
