// ============================================================================
// 1. MOTOR ALGÉBRICO SIMBÓLICO E RACIONAL (POLINÔMIOS MULTIVARIADOS E EM 's')
// ============================================================================

function gcdNum(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b > 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function normalizeVarName(raw) {
  const s = raw.trim();
  if (s === "s") return "s";
  const m = s.match(/^([A-Za-z]+)_?(\d+)$/);
  if (m) return `${m[1]}_${m[2]}`;
  return s;
}

function varToLatex(v) {
  const m = v.match(/^([A-Za-z]+)_(\d+)$/);
  if (m) return `${m[1]}_{${m[2]}}`;
  return v;
}

function varToCompact(v) {
  return v.replace(/_/g, "");
}

function termSignature(vars) {
  const keys = Object.keys(vars).filter(k => vars[k] !== 0).sort();
  return keys.map(k => `${k}^${vars[k]}`).join("*");
}

function cleanVars(vars) {
  const out = {};
  for (const k of Object.keys(vars)) {
    if (vars[k] && vars[k] !== 0) out[k] = vars[k];
  }
  return out;
}

function polyNormalize(terms) {
  const map = new Map();
  for (const t of terms) {
    if (Math.abs(t.coeff) < 1e-10) continue;
    const cv = cleanVars(t.vars);
    const sig = termSignature(cv);
    if (map.has(sig)) {
      map.get(sig).coeff += t.coeff;
    } else {
      map.set(sig, { coeff: t.coeff, vars: cv });
    }
  }
  const result = [];
  for (const val of map.values()) {
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

function polyFromNumber(n) {
  return polyNormalize([{ coeff: n, vars: {} }]);
}

function polyFromVar(v, exp = 1) {
  const nv = normalizeVarName(v);
  return polyNormalize([{ coeff: 1, vars: { [nv]: exp } }]);
}

function polyAdd(A, B) {
  return polyNormalize([...A, ...B]);
}

function polySub(A, B) {
  return polyNormalize([...A, ...B.map(t => ({ coeff: -t.coeff, vars: { ...t.vars } }))]);
}

function polyScale(A, c) {
  return polyNormalize(A.map(t => ({ coeff: t.coeff * c, vars: { ...t.vars } })));
}

function polyMul(A, B) {
  const raw = [];
  for (const ta of A) {
    for (const tb of B) {
      const vars = { ...ta.vars };
      for (const [k, exp] of Object.entries(tb.vars)) {
        vars[k] = (vars[k] || 0) + exp;
      }
      raw.push({ coeff: ta.coeff * tb.coeff, vars });
    }
  }
  return polyNormalize(raw);
}

function polyPow(A, n) {
  let res = polyFromNumber(1);
  for (let i = 0; i < n; i++) res = polyMul(res, A);
  return res;
}

function polyIsZero(P) {
  return P.length === 0;
}

function polyIsOne(P) {
  return P.length === 1 && P[0].coeff === 1 && Object.keys(P[0].vars).length === 0;
}

function polyEqual(A, B) {
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) {
    if (Math.abs(A[i].coeff - B[i].coeff) > 1e-8) return false;
    if (termSignature(A[i].vars) !== termSignature(B[i].vars)) return false;
  }
  return true;
}

function isUnivariateInS(P) {
  for (const t of P) {
    for (const k of Object.keys(t.vars)) {
      if (k !== "s") return false;
    }
  }
  return true;
}

function toUnivariateArr(P) {
  if (P.length === 0) return [0];
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

function fromUnivariateArr(arr) {
  const terms = [];
  for (let d = 0; d < arr.length; d++) {
    if (Math.abs(arr[d]) > 1e-9) {
      terms.push({ coeff: arr[d], vars: d === 0 ? {} : { s: d } });
    }
  }
  return polyNormalize(terms);
}

function trimUni(arr) {
  let i = arr.length - 1;
  while (i > 0 && Math.abs(arr[i]) < 1e-9) i--;
  return arr.slice(0, i + 1);
}

function divUni(A, B) {
  let rem = [...A];
  B = trimUni(B);
  const degB = B.length - 1;
  if (degB === 0 && Math.abs(B[0]) < 1e-9) return null;
  const quot = new Array(Math.max(1, rem.length - degB)).fill(0);
  while (rem.length - 1 >= degB && !(rem.length === 1 && Math.abs(rem[0]) < 1e-8)) {
    const degR = rem.length - 1;
    const factor = rem[degR] / B[degB];
    quot[degR - degB] = factor;
    for (let i = 0; i <= degB; i++) {
      rem[degR - degB + i] -= factor * B[i];
    }
    rem = trimUni(rem);
    if (rem.length === 1 && Math.abs(rem[0]) < 1e-8) break;
  }
  return { quot: trimUni(quot), rem: trimUni(rem) };
}

function gcdUni(A, B) {
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

function ratSimplify(num, den) {
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
        if (qN && qD && qN.rem.length === 1 && Math.abs(qN.rem[0]) < 1e-6 && qD.rem.length === 1 && Math.abs(qD.rem[0]) < 1e-6) {
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

function ratFromPoly(P) {
  return ratSimplify(P, polyFromNumber(1));
}

function ratOne() {
  return { num: polyFromNumber(1), den: polyFromNumber(1) };
}

function ratZero() {
  return { num: [], den: polyFromNumber(1) };
}

function ratAdd(A, B) {
  if (polyEqual(A.den, B.den)) {
    return ratSimplify(polyAdd(A.num, B.num), A.den);
  }
  const num = polyAdd(polyMul(A.num, B.den), polyMul(B.num, A.den));
  const den = polyMul(A.den, B.den);
  return ratSimplify(num, den);
}

function ratSub(A, B) {
  return ratAdd(A, ratScale(B, -1));
}

function ratScale(A, s) {
  return ratSimplify(polyScale(A.num, s), A.den);
}

function ratMul(A, B) {
  let n1 = A.num, d1 = A.den, n2 = B.num, d2 = B.den;
  if (polyEqual(n1, d2)) { n1 = polyFromNumber(1); d2 = polyFromNumber(1); }
  if (polyEqual(n2, d1)) { n2 = polyFromNumber(1); d1 = polyFromNumber(1); }
  return ratSimplify(polyMul(n1, n2), polyMul(d1, d2));
}

function ratDiv(A, B) {
  return ratMul(A, { num: B.den, den: B.num });
}

function ratFeedback(G, H, loopSign) {
  // loopSign === "-" (realimentação negativa) => G / (1 + G*H)
  // loopSign === "+" (realimentação positiva) => G / (1 - G*H)
  const num = polyMul(G.num, H.den);
  const ghNum = polyMul(G.num, H.num);
  const ghDen = polyMul(G.den, H.den);
  const den = loopSign === "-" ? polyAdd(ghDen, ghNum) : polySub(ghDen, ghNum);
  return ratSimplify(num, den);
}

// Parser de expressões algébricas para RatFunc
function parseRatExpr(str) {
  if (!str || !str.trim()) return ratOne();
  let s = str.trim()
    .replace(/\\cdot/g, "*")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4");
  if (s.includes("=")) {
    s = s.split("=").pop().trim();
  }

  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if ("+-*/^()[]".includes(ch)) {
      tokens.push({ type: "op", val: ch === "[" ? "(" : ch === "]" ? ")" : ch });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = "";
      while (i < s.length && /[0-9.]/.test(s[i])) { numStr += s[i++]; }
      tokens.push({ type: "num", val: parseFloat(numStr) || 0 });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let id = "";
      while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) { id += s[i++]; }
      // Ignorar "(s)" funcional como em G_1(s) ou H(s)
      while (i < s.length && /\s/.test(s[i])) i++;
      if (id !== "s" && s.slice(i, i + 3) === "(s)") {
        i += 3;
      }
      tokens.push({ type: "id", val: normalizeVarName(id) });
      continue;
    }
    i++;
  }

  // Inserir multiplicação implícita: ex: 2s, (s+1)(s+2), G1 G2
  const fullTokens = [];
  for (let k = 0; k < tokens.length; k++) {
    fullTokens.push(tokens[k]);
    if (k + 1 < tokens.length) {
      const cur = tokens[k];
      const nxt = tokens[k + 1];
      const curIsVal = cur.type === "num" || cur.type === "id" || (cur.type === "op" && cur.val === ")");
      const nxtIsVal = nxt.type === "num" || nxt.type === "id" || (nxt.type === "op" && nxt.val === "(");
      if (curIsVal && nxtIsVal) {
        fullTokens.push({ type: "op", val: "*" });
      }
    }
  }

  let pos = 0;
  function peek() { return fullTokens[pos] || null; }
  function consume() { return fullTokens[pos++]; }

  function parseExpr() {
    let left = parseTerm();
    while (peek() && peek().type === "op" && (peek().val === "+" || peek().val === "-")) {
      const op = consume().val;
      const right = parseTerm();
      left = op === "+" ? ratAdd(left, right) : ratSub(left, right);
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (peek() && peek().type === "op" && (peek().val === "*" || peek().val === "/")) {
      const op = consume().val;
      const right = parseFactor();
      left = op === "*" ? ratMul(left, right) : ratDiv(left, right);
    }
    return left;
  }

  function parseFactor() {
    if (peek() && peek().type === "op" && peek().val === "-") {
      consume();
      return ratScale(parseFactor(), -1);
    }
    if (peek() && peek().type === "op" && peek().val === "+") {
      consume();
      return parseFactor();
    }
    let base = parsePrimary();
    if (peek() && peek().type === "op" && peek().val === "^") {
      consume();
      const expTok = consume();
      const exp = expTok && expTok.type === "num" ? Math.max(0, Math.round(expTok.val)) : 1;
      base = ratSimplify(polyPow(base.num, exp), polyPow(base.den, exp));
    }
    return base;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) return ratOne();
    if (tok.type === "op" && tok.val === "(") {
      consume();
      const inside = parseExpr();
      if (peek() && peek().type === "op" && peek().val === ")") consume();
      return inside;
    }
    if (tok.type === "num") {
      consume();
      return ratFromPoly(polyFromNumber(tok.val));
    }
    if (tok.type === "id") {
      consume();
      return ratFromPoly(polyFromVar(tok.val));
    }
    consume();
    return ratOne();
  }

  try {
    return parseExpr();
  } catch (e) {
    return ratFromPoly(polyFromVar(str.trim()));
  }
}

function polyToLatex(P) {
  if (!P || P.length === 0) return "0";
  // Ordenar: se puramente simbólico (sem 's'), colocar termo constante (ex: 1) primeiro
  const sorted = [...P];
  if (!isUnivariateInS(sorted)) {
    sorted.sort((a, b) => {
      const degA = Object.values(a.vars).reduce((s, v) => s + v, 0);
      const degB = Object.values(b.vars).reduce((s, v) => s + v, 0);
      if (degA !== degB) return degA - degB;
      return termSignature(a.vars).localeCompare(termSignature(b.vars));
    });
  }
  let out = "";
  sorted.forEach((t, idx) => {
    const c = t.coeff;
    const absC = Math.abs(c);
    const varKeys = Object.keys(t.vars).sort((a, b) => (a === "s" ? 1 : b === "s" ? -1 : a.localeCompare(b)));
    const varStr = varKeys.map(k => {
      const exp = t.vars[k];
      const vLat = varToLatex(k);
      return exp === 1 ? vLat : `${vLat}^{${exp}}`;
    }).join(" ");

    const coeffStr = (absC === 1 && varStr !== "") ? "" : Number(absC.toFixed(4)).toString();
    const termBody = `${coeffStr}${coeffStr && varStr ? " " : ""}${varStr}` || "1";

    if (idx === 0) {
      out += (c < 0 ? "-" : "") + termBody;
    } else {
      out += (c < 0 ? " - " : " + ") + termBody;
    }
  });
  return out;
}

function polyToCompact(P) {
  if (!P || P.length === 0) return "0";
  const sorted = [...P];
  if (!isUnivariateInS(sorted)) {
    sorted.sort((a, b) => {
      const degA = Object.values(a.vars).reduce((s, v) => s + v, 0);
      const degB = Object.values(b.vars).reduce((s, v) => s + v, 0);
      if (degA !== degB) return degA - degB;
      return termSignature(a.vars).localeCompare(termSignature(b.vars));
    });
  }
  let out = "";
  sorted.forEach((t, idx) => {
    const c = t.coeff;
    const absC = Math.abs(c);
    const varKeys = Object.keys(t.vars).sort((a, b) => (a === "s" ? 1 : b === "s" ? -1 : a.localeCompare(b)));
    const varStr = varKeys.map(k => {
      const exp = t.vars[k];
      const vComp = varToCompact(k);
      if (exp === 1) return vComp;
      if (exp === 2) return `${vComp}²`;
      if (exp === 3) return `${vComp}³`;
      if (exp === 4) return `${vComp}⁴`;
      return `${vComp}^${exp}`;
    }).join("");

    const coeffStr = (absC === 1 && varStr !== "") ? "" : Number(absC.toFixed(3)).toString();
    const termBody = `${coeffStr}${varStr}` || "1";

    if (idx === 0) {
      out += (c < 0 ? "-" : "") + termBody;
    } else {
      out += (c < 0 ? " - " : " + ") + termBody;
    }
  });
  return out;
}

function polyToScilab(P) {
  if (!P || P.length === 0) return "0";
  return P.map((t, idx) => {
    const c = t.coeff;
    const absC = Math.abs(c);
    const varKeys = Object.keys(t.vars);
    const factors = [];
    if (absC !== 1 || varKeys.length === 0) {
      factors.push(Number(absC.toFixed(4)).toString());
    }
    varKeys.forEach(k => {
      const exp = t.vars[k];
      const vSci = varToCompact(k);
      factors.push(exp === 1 ? vSci : `${vSci}^${exp}`);
    });
    const body = factors.join("*");
    if (idx === 0) return (c < 0 ? "-" : "") + body;
    return (c < 0 ? " - " : " + ") + body;
  }).join("");
}

function ratToLatex(R) {
  if (!R) return "1";
  if (polyIsZero(R.num)) return "0";
  const numLat = polyToLatex(R.num);
  if (polyIsOne(R.den)) return numLat;
  const denLat = polyToLatex(R.den);
  return `\\frac{${numLat}}{${denLat}}`;
}

function ratToCompactParts(R) {
  if (!R) return { num: "1", den: "1", isFraction: false };
  if (polyIsZero(R.num)) return { num: "0", den: "1", isFraction: false };
  const numStr = polyToCompact(R.num);
  if (polyIsOne(R.den)) return { num: numStr, den: "1", isFraction: false };
  const denStr = polyToCompact(R.den);
  return { num: numStr, den: denStr, isFraction: true };
}

function ratToScilab(R) {
  if (!R || polyIsZero(R.num)) return "0";
  const n = polyToScilab(R.num);
  if (polyIsOne(R.den)) return n;
  const d = polyToScilab(R.den);
  return `(${n}) / (${d})`;
}

function pWrap(lat) {
  if (!lat) return "1";
  if (lat.includes(" + ") || lat.includes(" - ")) return `(${lat})`;
  return lat;
}

function rawFracLatex(numPoly, denPoly) {
  const nLat = polyToLatex(numPoly);
  if (polyIsOne(denPoly)) return nLat;
  const dLat = polyToLatex(denPoly);
  return `\\frac{${nLat}}{${dLat}}`;
}

// Registro de explicações passo a passo detalhadas para cada linha matemática clicada pelo usuário
const mathLineExplanations = new Map();

function normalizeMathLineKey(s) {
  return (s || "")
    .replace(/&=/g, "=")
    .replace(/&/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function registerMathLineExplanation(lineLatex, title, bodyHtml) {
  const key = normalizeMathLineKey(lineLatex);
  if (!key) return;
  mathLineExplanations.set(key, { title, bodyHtml });
}

function describeTermPowerLabel(vars) {
  const keys = Object.keys(vars).filter(k => vars[k] !== 0);
  if (keys.length === 0) return "Termos independentes (constantes sem $s$)";
  if (keys.length === 1 && keys[0] === "s") {
    const exp = vars.s;
    return exp === 1 ? "Termos de 1º grau em $s$ ($s^1$)" : `Termos de grau $s^{${exp}}$`;
  }
  const lat = keys.map(k => (vars[k] === 1 ? varToLatex(k) : `${varToLatex(k)}^{${vars[k]}}`)).join(" \\cdot ");
  return `Termos em $${lat}$`;
}

// Explica passo a passo como dois polinômios P e Q são multiplicados (Propriedade Distributiva / "Chuveirinho")
function explainPolyMulDetailedHtml(P, Q) {
  const pLat = polyToLatex(P);
  const qLat = polyToLatex(Q);
  const resPoly = polyMul(P, Q);
  const resLat = polyToLatex(resPoly);

  if (polyIsOne(P)) {
    return `Multiplicando por $1$: $1 \\cdot (${qLat}) = ${qLat}$ (qualquer expressão multiplicada por $1$ permanece ela mesma).`;
  }
  if (polyIsOne(Q)) {
    return `Multiplicando por $1$: $(${pLat}) \\cdot 1 = ${pLat}$ (qualquer expressão multiplicada por $1$ permanece ela mesma).`;
  }
  if (P.length === 1 && Q.length === 1) {
    const cA = P[0].coeff, cB = Q[0].coeff;
    return `Multiplicação direta de monômios: $(${pLat}) \\cdot (${qLat}) = ${resLat}$ (multiplica-se o coeficiente $${cA} \\cdot (${cB}) = ${Number((cA * cB).toFixed(4))}$ e somam-se os expoentes de mesma base).`;
  }

  const pairSteps = [];
  const rawTerms = [];
  for (const tA of P) {
    for (const tB of Q) {
      const prod = polyMul([tA], [tB]);
      const aStr = polyToLatex([tA]);
      const bStr = polyToLatex([tB]);
      const prStr = polyToLatex(prod);
      pairSteps.push(`$(${aStr}) \\cdot (${bStr}) = ${prStr}$`);
      if (prod.length > 0) rawTerms.push(prod[0]);
    }
  }

  const uncollectedStr = rawTerms.map((t, idx) => {
    const s = polyToLatex([t]);
    if (idx === 0) return s;
    return t.coeff < 0 ? ` - ${polyToLatex([{ coeff: Math.abs(t.coeff), vars: t.vars }])}` : ` + ${s}`;
  }).join("");

  return `
    Aplicando a <b>propriedade distributiva ("chuveirinho")</b> em $(${pLat}) \\cdot (${qLat})$:<br>
    • Multiplicações termo a termo: ${pairSteps.join(" ; ")}<br>
    • Somando os produtos parciais: $${uncollectedStr}$<br>
    • Agrupando os termos de mesma potência: $\\mathbf{${resLat}}$
  `;
}

// Explica passo a passo como dois polinômios P e Q são somados ou subtraídos agrupando termos semelhantes
function explainPolyAddSubDetailedHtml(P, Q, op = "+") {
  const pLat = polyToLatex(P);
  const qLat = polyToLatex(Q);
  const isSub = op === "-";
  const signedQ = isSub ? polyScale(Q, -1) : Q;
  const resPoly = isSub ? polySub(P, Q) : polyAdd(P, Q);
  const resLat = polyToLatex(resPoly);

  const allRaw = [...P, ...signedQ];
  const groups = new Map();
  for (const t of allRaw) {
    const cv = cleanVars(t.vars);
    const sig = termSignature(cv);
    if (!groups.has(sig)) groups.set(sig, { vars: cv, terms: [] });
    groups.get(sig).terms.push(t);
  }

  const groupBullets = [];
  for (const g of groups.values()) {
    const label = describeTermPowerLabel(g.vars);
    const coeffsStr = g.terms.map((t, i) => {
      const c = Number(t.coeff.toFixed(4));
      if (i === 0) return `${c}`;
      return c < 0 ? ` - ${Math.abs(c)}` : ` + ${c}`;
    }).join("");
    const sumCoeff = Number(g.terms.reduce((acc, t) => acc + t.coeff, 0).toFixed(4));
    const combinedTermLat = sumCoeff === 0 ? "0" : polyToLatex([{ coeff: sumCoeff, vars: g.vars }]);
    groupBullets.push(`• <b>${label}:</b> coeficientes $(${coeffsStr}) = ${sumCoeff} \\implies ${combinedTermLat}$`);
  }

  return `
    Somando/agrupando os termos semelhantes em $(${pLat}) ${op} (${qLat})$:<br>
    ${isSub ? `• O sinal negativo antes de $(${qLat})$ inverte o sinal de seus termos: $${pLat} + (${polyToLatex(signedQ)})$<br>` : ""}
    ${groupBullets.join("<br>")}<br>
    • Polinômio resultante após somar termos de mesmo grau: $\\mathbf{${resLat}}$
  `;
}

// Gera o passo a passo algébrico detalhado da multiplicação em cascata A(s) * B(s)
function explainRatMulLatex(lhsStr, A, B) {
  const nA = polyToLatex(A.num), dA = polyToLatex(A.den);
  const nB = polyToLatex(B.num), dB = polyToLatex(B.den);
  const rawNum = polyMul(A.num, B.num);
  const rawDen = polyMul(A.den, B.den);
  const finalRat = ratMul(A, B);

  const lines = [];
  const line1 = `${lhsStr} &= \\left(${ratToLatex(A)}\\right) \\cdot \\left(${ratToLatex(B)}\\right)`;
  lines.push(line1);
  registerMathLineExplanation(
    line1,
    "Associação de Blocos em Cascata / Série",
    `<ol>
      <li><b>Regra da Cascata / Série:</b> Quando dois blocos estão conectados em série sem ramificações entre eles, a função de transferência equivalente é o produto direto das funções individuais: $G_{\\text{eq}}(s) = G_1(s) \\cdot G_2(s)$.</li>
      <li><b>1º Bloco:</b> $${ratToLatex(A)}$</li>
      <li><b>2º Bloco:</b> $${ratToLatex(B)}$</li>
    </ol>`
  );

  if (!polyIsOne(A.den) || !polyIsOne(B.den)) {
    const line2 = `&= \\frac{${pWrap(nA)} \\cdot ${pWrap(nB)}}{${pWrap(dA)} \\cdot ${pWrap(dB)}}`;
    lines.push(line2);
    registerMathLineExplanation(
      line2,
      "Multiplicação de Frações (Numerador × Numerador e Denominador × Denominador)",
      `<ol>
        <li><b>Regra da Multiplicação de Frações:</b> Na multiplicação de duas frações $\\frac{A}{B} \\cdot \\frac{C}{D}$, <b>não se tira MMC</b> — multiplica-se diretamente o de cima pelo de cima e o de baixo pelo de baixo:
          <div class="micro-formula-box">$$\\frac{A}{B} \\cdot \\frac{C}{D} = \\frac{A \\cdot C}{B \\cdot D}$$</div>
        </li>
        <li><b>No Numerador (parte de cima):</b> indica-se o produto $${pWrap(nA)} \\cdot ${pWrap(nB)}$.</li>
        <li><b>No Denominador (parte de baixo):</b> indica-se o produto $${pWrap(dA)} \\cdot ${pWrap(dB)}$.</li>
      </ol>`
    );
  }

  const rawLat = rawFracLatex(rawNum, rawDen);
  const finalLat = ratToLatex(finalRat);
  const line3 = `&= ${rawLat}`;
  lines.push(line3);
  registerMathLineExplanation(
    line3,
    "Desenvolvimento dos Produtos Polinomiais (Distributiva)",
    `<ol>
      <li><b>Cálculo do Numerador:</b><br>${explainPolyMulDetailedHtml(A.num, B.num)}</li>
      <li><b>Cálculo do Denominador:</b><br>${explainPolyMulDetailedHtml(A.den, B.den)}</li>
      <li><b>Fração Expandida:</b> $${rawLat}$</li>
    </ol>`
  );

  if (rawLat !== finalLat) {
    const line4 = `&= ${finalLat} \\qquad \\text{(Simplificando fatores comuns entre numerador e denominador)}`;
    lines.push(line4);
    registerMathLineExplanation(
      line4,
      "Cancelamento e Simplificação de Fatores Comuns",
      `<ol>
        <li><b>Fração antes da simplificação:</b> $${rawLat}$</li>
        <li><b>Divisão pelo MDC / Fator Comum:</b> Dividem-se todos os coeficientes e fatores polinomiais comuns ao numerador e ao denominador para obter a forma irredutível:
          <div class="micro-formula-box">$$${rawLat} = ${finalLat}$$</div>
        </li>
      </ol>`
    );
  }
  return lines.join(" \\\\\n");
}

// Gera o passo a passo algébrico detalhado da soma/subtração em paralelo A(s) ± B(s) com MMC
function explainRatAddSubLatex(lhsStr, A, B, op = "+") {
  const nA = polyToLatex(A.num), dA = polyToLatex(A.den);
  const nB = polyToLatex(B.num), dB = polyToLatex(B.den);
  const isSub = op === "-";
  const finalRat = isSub ? ratSub(A, B) : ratAdd(A, B);

  const lines = [];
  const line1 = `${lhsStr} &= \\left(${ratToLatex(A)}\\right) ${op} \\left(${ratToLatex(B)}\\right)`;
  lines.push(line1);
  registerMathLineExplanation(
    line1,
    "Associação de Blocos em Paralelo",
    `<ol>
      <li><b>Regra do Paralelo:</b> Ramos que partem do mesmo ponto de ramificação e chegam ao mesmo somador têm suas funções de transferência somadas ou subtraídas conforme o sinal ($+$ ou $-$) de cada entrada no somador.</li>
      <li><b>1º Ramo:</b> $${ratToLatex(A)}$</li>
      <li><b>2º Ramo (com sinal ${op}):</b> $${op}\\left(${ratToLatex(B)}\\right)$</li>
    </ol>`
  );

  if (!polyEqual(A.den, B.den)) {
    const term1 = polyIsOne(B.den) ? pWrap(nA) : `${pWrap(nA)} \\cdot ${pWrap(dB)}`;
    const term2 = polyIsOne(A.den) ? pWrap(nB) : `${pWrap(nB)} \\cdot ${pWrap(dA)}`;
    const denMmc = polyIsOne(A.den) ? dB : polyIsOne(B.den) ? dA : `${pWrap(dA)} \\cdot ${pWrap(dB)}`;
    const expDenPoly = polyMul(A.den, B.den);
    const expDen = polyToLatex(expDenPoly);

    const line2 = `&= \\frac{${term1} ${op} ${term2}}{${denMmc}} \\qquad \\text{(Tirando o MMC dos denominadores)}`;
    lines.push(line2);
    registerMathLineExplanation(
      line2,
      "Passo a Passo Completo de Como Foi Feito o MMC dos Denominadores",
      `<ol>
        <li><b>Por que tirar o MMC?</b> Para somar ou subtrair duas frações $\\frac{${nA}}{${dA}} ${op} \\frac{${nB}}{${dB}}$ com denominadores diferentes ($${dA} \\neq ${dB}$), precisamos reduzi-las a um mesmo denominador comum (MMC).</li>
        <li><b>Cálculo do MMC dos denominadores:</b> Multiplicamos os denominadores entre si:
          <div class="micro-formula-box">$$\\text{MMC}\\left(${dA},\\; ${dB}\\right) = ${denMmc} = ${expDen}$$</div>
        </li>
        <li><b>Regra Prática do MMC (<i>"Divide pelo de baixo e multiplica pelo de cima"</i>):</b>
          <ul>
            <li><b>1ª Fração ($\\frac{${nA}}{${dA}}$):</b> dividindo o MMC $${denMmc}$ pelo denominador de baixo ($${dA}$), sobra $${dB}$. Multiplicando pelo numerador de cima ($${nA}$), obtemos: $${term1}$.</li>
            <li><b>2ª Fração ($\\frac{${nB}}{${dB}}$):</b> dividindo o MMC $${denMmc}$ pelo denominador de baixo ($${dB}$), sobra $${dA}$. Multiplicando pelo numerador de cima ($${nB}$), obtemos: $${term2}$.</li>
          </ul>
        </li>
        <li><b>Unindo os novos numeradores sobre o MMC:</b>
          <div class="micro-formula-box">$$\\frac{${term1} ${op} ${term2}}{${denMmc}}$$</div>
        </li>
      </ol>`
    );

    const p1Poly = polyMul(A.num, B.den);
    const p2Poly = polyMul(B.num, A.den);
    const expTerm1 = polyToLatex(p1Poly);
    const expTerm2 = polyToLatex(p2Poly);
    const combNum = isSub ? polySub(p1Poly, p2Poly) : polyAdd(p1Poly, p2Poly);
    const line3 = `&= \\frac{${pWrap(expTerm1)} ${op} ${pWrap(expTerm2)}}{${expDen}} = \\frac{${polyToLatex(combNum)}}{${expDen}}`;
    lines.push(line3);
    registerMathLineExplanation(
      line3,
      "Expansão da Distributiva e Soma dos Termos Semelhantes no Numerador do MMC",
      `<ol>
        <li><b>Desenvolvendo a 1ª parcela do numerador ($${term1}$):</b><br>${explainPolyMulDetailedHtml(A.num, B.den)}</li>
        <li><b>Desenvolvendo a 2ª parcela do numerador ($${term2}$):</b><br>${explainPolyMulDetailedHtml(B.num, A.den)}</li>
        <li><b>Somando/Subtraindo os polinômios resultantes no numerador:</b><br>${explainPolyAddSubDetailedHtml(p1Poly, p2Poly, op)}</li>
        <li><b>Expansão do denominador (MMC):</b><br>${explainPolyMulDetailedHtml(A.den, B.den)}</li>
      </ol>`
    );
  } else if (!polyIsOne(A.den)) {
    const combNum = isSub ? polySub(A.num, B.num) : polyAdd(A.num, B.num);
    const lineSameDen = `&= \\frac{${pWrap(nA)} ${op} ${pWrap(nB)}}{${dA}} = \\frac{${polyToLatex(combNum)}}{${dA}}`;
    lines.push(lineSameDen);
    registerMathLineExplanation(
      lineSameDen,
      "Soma de Frações com Mesmo Denominador (MMC já é igual)",
      `<ol>
        <li><b>Denominadores iguais:</b> Como ambas as frações já possuem o mesmo denominador ($${dA}$), o MMC é o próprio $${dA}$.</li>
        <li><b>Conserva-se o denominador e operam-se os numeradores:</b><br>${explainPolyAddSubDetailedHtml(A.num, B.num, op)}</li>
      </ol>`
    );
  }

  const finalLat = ratToLatex(finalRat);
  if (!lines[lines.length - 1].endsWith(`= ${finalLat}`)) {
    const lineFinal = `&= ${finalLat}`;
    lines.push(lineFinal);
    registerMathLineExplanation(
      lineFinal,
      "Simplificação Final da Fração",
      `<ol>
        <li><b>Resultado simplificado:</b> Após agrupar os termos semelhantes e simplificar eventuais fatores comuns entre numerador e denominador, obtemos $${finalLat}$.</li>
      </ol>`
    );
  }
  return lines.join(" \\\\\n");
}

// Gera o passo a passo algébrico detalhado da divisão de frações A(s) / B(s) (usado ao mover ramificações/somadores)
function explainRatDivLatex(lhsStr, A, B) {
  const nA = polyToLatex(A.num), dA = polyToLatex(A.den);
  const nB = polyToLatex(B.num), dB = polyToLatex(B.den);
  const rawNum = polyMul(A.num, B.den);
  const rawDen = polyMul(A.den, B.num);
  const finalRat = ratDiv(A, B);

  const lines = [];
  const line1 = `${lhsStr} &= \\frac{${ratToLatex(A)}}{${ratToLatex(B)}}`;
  lines.push(line1);
  registerMathLineExplanation(
    line1,
    "Divisão de Funções de Transferência (Deslocamento de Ramificação ou Somador)",
    `<ol>
      <li><b>Origem da divisão:</b> Ao deslocar um ponto de ramificação para depois de um bloco ou mover um bloco para a frente de um somador, divide-se o ganho do ramo por $${ratToLatex(B)}$.</li>
      <li><b>Numerador principal:</b> $${ratToLatex(A)}$</li>
      <li><b>Denominador principal:</b> $${ratToLatex(B)}$</li>
    </ol>`
  );

  if (!polyIsOne(A.den) || !polyIsOne(B.den)) {
    const line2 = `&= \\frac{${nA}}{${dA}} \\cdot \\frac{${dB}}{${nB}} = \\frac{${pWrap(nA)} \\cdot ${pWrap(dB)}}{${pWrap(dA)} \\cdot ${pWrap(nB)}} \\qquad \\text{(Multiplicando pelo inverso do denominador)}`;
    lines.push(line2);
    registerMathLineExplanation(
      line2,
      "Divisão de Frações: Conserva a de Cima e Multiplica pelo Inverso da de Baixo",
      `<ol>
        <li><b>Regra da Divisão de Frações:</b> Para dividir uma fração $\\frac{A}{B}$ por outra fração $\\frac{C}{D}$, conserva-se a fração do numerador e multiplica-se pela fração do denominador invertida:
          <div class="micro-formula-box">$$\\frac{\\;\\frac{A}{B}\\;}{\\;\\frac{C}{D}\\;} = \\frac{A}{B} \\cdot \\frac{D}{C}$$</div>
        </li>
        <li><b>1ª Fração (conservada):</b> $\\frac{${nA}}{${dA}}$</li>
        <li><b>2ª Fração (invertida):</b> o inverso de $\\frac{${nB}}{${dB}}$ é $\\frac{${dB}}{${nB}}$.</li>
        <li><b>Multiplicação resultante:</b> $\\frac{${pWrap(nA)} \\cdot ${pWrap(dB)}}{${pWrap(dA)} \\cdot ${pWrap(nB)}}$</li>
      </ol>`
    );
  }
  const rawLat = rawFracLatex(rawNum, rawDen);
  const finalLat = ratToLatex(finalRat);
  const line3 = rawLat !== finalLat ? `&= ${rawLat} = ${finalLat}` : `&= ${finalLat}`;
  lines.push(line3);
  registerMathLineExplanation(
    line3,
    "Multiplicação Polinomial e Simplificação Final",
    `<ol>
      <li><b>Numerador:</b><br>${explainPolyMulDetailedHtml(A.num, B.den)}</li>
      <li><b>Denominador:</b><br>${explainPolyMulDetailedHtml(A.den, B.num)}</li>
      <li><b>Resultado Simplificado:</b> $${finalLat}$</li>
    </ol>`
  );
  return lines.join(" \\\\\n");
}

// Gera o passo a passo algébrico completo da Fórmula de Malha Fechada G(s) / (1 ± G(s)H(s))
function explainRatFeedbackLatex(lhsStr, G, H, loopSign = "-") {
  const denSign = loopSign === "-" ? "+" : "-";
  const nG = polyToLatex(G.num), dG = polyToLatex(G.den);
  const nH = polyToLatex(H.num), dH = polyToLatex(H.den);

  const ghNumPoly = polyMul(G.num, H.num);
  const ghDenPoly = polyMul(G.den, H.den);
  const ghNumLat = polyToLatex(ghNumPoly);
  const ghDenLat = polyToLatex(ghDenPoly);

  const charPoly = loopSign === "-" ? polyAdd(ghDenPoly, ghNumPoly) : polySub(ghDenPoly, ghNumPoly);
  const charLat = polyToLatex(charPoly);

  const unsimplifiedNumPoly = polyMul(G.num, H.den);
  const unsimplifiedNumLat = polyToLatex(unsimplifiedNumPoly);
  const finalRat = ratFeedback(G, H, loopSign);
  const finalLat = ratToLatex(finalRat);

  const lines = [];
  // 1. Substituição direta na Fórmula de Malha Fechada
  const line1 = `${lhsStr} &= \\frac{${ratToLatex(G)}}{1 ${denSign} \\left(${ratToLatex(G)}\\right) \\cdot \\left(${ratToLatex(H)}\\right)} \\qquad \\text{(Substituindo } G(s) \\text{ e } H(s) \\text{ na Fórmula Canônica de Malha Fechada)}`;
  lines.push(line1);
  registerMathLineExplanation(
    line1,
    "Substituição na Fórmula Canônica de Malha Fechada",
    `<ol>
      <li><b>Fórmula Canônica de Malha Fechada:</b>
        <div class="micro-formula-box">$$\\frac{C(s)}{R(s)} = \\frac{G(s)}{1 \\mp G(s)H(s)}$$</div>
      </li>
      <li><b>Por que o sinal no denominador é "${denSign}"?</b> No somador, a realimentação entra com sinal <b>"${loopSign}"</b> ($E(s) = R(s) ${loopSign} H(s)C(s)$). Ao substituir em $C(s) = G(s)E(s)$ e passar o termo $G(s)H(s)C(s)$ para o lado esquerdo da igualdade, o sinal inverte para <b>"${denSign}"</b>: $C(s)[1 ${denSign} G(s)H(s)] = G(s)R(s)$.</li>
      <li><b>Substituição dos blocos:</b> Substituímos $G(s) = ${ratToLatex(G)}$ no numerador e no denominador, e $H(s) = ${ratToLatex(H)}$ multiplicando $G(s)$ no denominador.</li>
    </ol>`
  );

  // 2. Produto G(s)*H(s) no denominador
  const ghFracLat = polyIsOne(ghDenPoly) ? ghNumLat : `\\frac{${ghNumLat}}{${ghDenLat}}`;
  const line2 = `&= \\frac{${ratToLatex(G)}}{1 ${denSign} ${ghFracLat}} \\qquad \\text{(Efetuando o produto de laço } G(s) \\cdot H(s)\\text{)}`;
  lines.push(line2);
  registerMathLineExplanation(
    line2,
    "Cálculo do Produto de Laço Aberto G(s) · H(s) no Denominador",
    `<ol>
      <li><b>Multiplicação das duas frações no denominador:</b> Calculamos separadamente o produto $G(s) \\cdot H(s) = \\left(${ratToLatex(G)}\\right) \\cdot \\left(${ratToLatex(H)}\\right)$:
        <div class="micro-formula-box">$$G(s) \\cdot H(s) = \\frac{${pWrap(nG)} \\cdot ${pWrap(nH)}}{${pWrap(dG)} \\cdot ${pWrap(dH)}} = ${ghFracLat}$$</div>
      </li>
      <li><b>Multiplicação dos numeradores ($N_G \\cdot N_H$):</b><br>${explainPolyMulDetailedHtml(G.num, H.num)}</li>
      <li><b>Multiplicação dos denominadores ($D_G \\cdot D_H$):</b><br>${explainPolyMulDetailedHtml(G.den, H.den)}</li>
      <li><b>Substituição no denominador principal:</b> O denominador principal passa a ser $1 ${denSign} ${ghFracLat}$.</li>
    </ol>`
  );

  // 3. Se houver denominador em G*H, mostrar o MMC no denominador principal e o corte de D_G
  if (!polyIsOne(ghDenPoly)) {
    const line3 = `&= \\frac{\\frac{${nG}}{${dG}}}{\\frac{${pWrap(ghDenLat)} ${denSign} ${pWrap(ghNumLat)}}{${ghDenLat}}} = \\frac{\\frac{${nG}}{${dG}}}{\\frac{${charLat}}{${ghDenLat}}} \\qquad \\text{(Tirando o MMC } ${ghDenLat} \\text{ no denominador)}`;
    lines.push(line3);
    registerMathLineExplanation(
      line3,
      `Passo a Passo Completo de Como Foi Feito o MMC (${ghDenLat}) no Denominador`,
      `<ol>
        <li><b>Operação que estamos resolvendo no denominador principal:</b> Queremos somar/subtrair o número inteiro $1$ com a fração $\\frac{${ghNumLat}}{${ghDenLat}}$. Escrevendo o inteiro $1$ como fração ($1 = \\frac{1}{1}$), temos:
          <div class="micro-formula-box">$$1 ${denSign} \\frac{${ghNumLat}}{${ghDenLat}} = \\frac{1}{1} ${denSign} \\frac{${ghNumLat}}{${ghDenLat}}$$</div>
        </li>
        <li><b>1º Passo do MMC — Encontrar o denominador comum:</b>
          Os denominadores das duas parcelas são $1$ e $(${ghDenLat})$. O Mínimo Múltiplo Comum (MMC) entre $1$ e qualquer polinômio é o próprio polinômio:
          <div class="micro-formula-box">$$\\text{MMC}\\left(1,\\; ${ghDenLat}\\right) = 1 \\cdot (${ghDenLat}) = ${ghDenLat}$$</div>
        </li>
        <li><b>2º Passo do MMC — Regra <i>"Divide pelo de baixo e multiplica pelo de cima"</i> em cada parcela:</b>
          <ul>
            <li><b>Na 1ª fração ($\\frac{1}{1}$):</b>
              Divide-se o MMC $(${ghDenLat})$ pelo denominador de baixo ($1$): $\\frac{${ghDenLat}}{1} = ${ghDenLat}$.<br>
              Multiplica-se esse resultado pelo numerador de cima ($1$): $1 \\cdot (${ghDenLat}) = \\mathbf{${ghDenLat}}$.
            </li>
            <li><b>Na 2ª fração ($\\frac{${ghNumLat}}{${ghDenLat}}$):</b>
              Divide-se o MMC $(${ghDenLat})$ pelo denominador de baixo ($${ghDenLat}$): $\\frac{${ghDenLat}}{${ghDenLat}} = 1$.<br>
              Multiplica-se esse resultado pelo numerador de cima ($${ghNumLat}$): $1 \\cdot (${ghNumLat}) = \\mathbf{${ghNumLat}}$.
            </li>
          </ul>
        </li>
        <li><b>3º Passo do MMC — Juntar os dois numeradores sobre o MMC único $(${ghDenLat})$:</b>
          <div class="micro-formula-box">$$\\frac{1}{1} ${denSign} \\frac{${ghNumLat}}{${ghDenLat}} = \\frac{${pWrap(ghDenLat)} ${denSign} ${pWrap(ghNumLat)}}{${ghDenLat}}$$</div>
        </li>
        <li><b>4º Passo do MMC — Somar/Agrupar os termos semelhantes no numerador do MMC:</b><br>
          ${explainPolyAddSubDetailedHtml(ghDenPoly, ghNumPoly, denSign)}
        </li>
        <li><b>Resultado do denominador após o MMC:</b> O denominador principal fica $\\frac{${charLat}}{${ghDenLat}}$, formando a fração composta $\\frac{\\frac{${nG}}{${dG}}}{\\frac{${charLat}}{${ghDenLat}}}$.</li>
      </ol>`
    );

    if (polyIsOne(H.den)) {
      const line4a = `&= \\frac{${nG}}{${dG}} \\cdot \\frac{${dG}}{${charLat}} \\qquad \\text{(Multiplicando pelo inverso da fração e cancelando } ${pWrap(dG)}\\text{)}`;
      lines.push(line4a);
      registerMathLineExplanation(
        line4a,
        `Divisão de Frações (Multiplicação pelo Inverso) e Corte de (${dG})`,
        `<ol>
          <li><b>Fração composta atual:</b> Temos a fração de cima $\\frac{A}{B} = \\frac{${nG}}{${dG}}$ dividida pela fração de baixo $\\frac{C}{D} = \\frac{${charLat}}{${dG}}$.</li>
          <li><b>Regra da Divisão de Frações (<i>"Conserva a de cima e multiplica pelo inverso da de baixo"</i>):</b>
            <div class="micro-formula-box">$$\\frac{\\;\\frac{${nG}}{${dG}}\\;}{\\;\\frac{${charLat}}{${dG}}\\;} = \\frac{${nG}}{${dG}} \\cdot \\underbrace{\\frac{${dG}}{${charLat}}}_{\\text{fração de baixo invertida}}$$</div>
          </li>
          <li><b>Cancelamento (Corte) dos termos iguais $(${dG})$:</b>
            Como o fator $(${dG})$ aparece dividindo na 1ª fração e multiplicando na 2ª fração, a divisão dele por ele mesmo vale $1$ ($\\frac{${dG}}{${dG}} = 1$):
            <div class="micro-formula-box">$$\\frac{${nG}}{\\cancel{${dG}}} \\cdot \\frac{\\cancel{${dG}}}{${charLat}} = \\frac{${nG}}{${charLat}}$$</div>
          </li>
        </ol>`
      );
    } else {
      const line4b = `&= \\frac{${nG}}{${dG}} \\cdot \\frac{${pWrap(dG)} \\cdot ${pWrap(dH)}}{${charLat}} = \\frac{${pWrap(nG)} \\cdot ${pWrap(dH)}}{${charLat}} \\qquad \\text{(Multiplicando pelo inverso e cancelando } ${pWrap(dG)}\\text{)}`;
      lines.push(line4b);
      registerMathLineExplanation(
        line4b,
        `Divisão de Frações (Multiplicação pelo Inverso) e Corte de (${dG})`,
        `<ol>
          <li><b>Regra da Divisão de Frações (<i>"Conserva a de cima e multiplica pelo inverso da de baixo"</i>):</b>
            Conservamos o numerador $\\frac{${nG}}{${dG}}$ e multiplicamos pelo inverso do denominador $\\frac{${charLat}}{${ghDenLat}}$, que invertido é $\\frac{${ghDenLat}}{${charLat}} = \\frac{${pWrap(dG)} \\cdot ${pWrap(dH)}}{${charLat}}$.
          </li>
          <li><b>Cancelamento (Corte) do fator comum $(${dG})$:</b>
            Cortando $(${dG})$ do denominador da 1ª fração com $(${dG})$ do numerador da 2ª fração ($\\frac{${dG}}{${dG}} = 1$):
            <div class="micro-formula-box">$$\\frac{${nG}}{\\cancel{${dG}}} \\cdot \\frac{\\cancel{${pWrap(dG)}} \\cdot ${pWrap(dH)}}{${charLat}} = \\frac{${pWrap(nG)} \\cdot ${pWrap(dH)}}{${charLat}}$$</div>
          </li>
        </ol>`
      );
    }
  }

  // 4. Resultado expandido e simplificado
  const rawFinalLat = rawFracLatex(unsimplifiedNumPoly, charPoly);
  const line5 = rawFinalLat !== finalLat
    ? `&= ${rawFinalLat} = ${finalLat} \\qquad \\text{(Simplificando termos semelhantes)}`
    : `&= ${finalLat}`;
  lines.push(line5);
  registerMathLineExplanation(
    line5,
    "Resultado Final Simplificado da Malha Fechada",
    `<ol>
      <li><b>Numerador Final:</b><br>${explainPolyMulDetailedHtml(G.num, H.den)}</li>
      <li><b>Denominador Final (Polinômio Característico da Malha):</b><br>${explainPolyAddSubDetailedHtml(ghDenPoly, ghNumPoly, denSign)}</li>
      <li><b>Função de Transferência Equivalente Final:</b>
        <div class="micro-formula-box">$$${lhsStr} = ${finalLat}$$</div>
      </li>
    </ol>`
  );

  return lines.join(" \\\\\n");
}

// Extrai informações didáticas completas (Numerador, Denominador, Grau, Polos, Zeros, Ganho DC, Equação Diferencial/Algébrica)
function buildAnalyticalSummaryHtml(ratT, inVar = "R", outVar = "C") {
  const numLat = polyToLatex(ratT.num);
  const denLat = polyToLatex(ratT.den);
  const isUni = isUnivariateInS(ratT.num) && isUnivariateInS(ratT.den);

  let extraItems = "";
  if (isUni) {
    const uN = trimUni(toUnivariateArr(ratT.num));
    const uD = trimUni(toUnivariateArr(ratT.den));
    const degN = polyIsZero(ratT.num) ? 0 : uN.length - 1;
    const degD = uD.length - 1;

    // Ganho Estático (s -> 0)
    const n0 = uN[0] || 0;
    const d0 = uD[0] || 0;
    const dcGainStr = Math.abs(d0) > 1e-9
      ? `$T(0) = \\frac{N(0)}{D(0)} = \\frac{${Number(n0.toFixed(4))}}{${Number(d0.toFixed(4))}} = ${Number((n0 / d0).toFixed(4))}$`
      : `$T(0) \\to \\infty$ (Sistema possui integrador puro / polo na origem $s = 0$)`;

    // Cálculo de raízes de 1ª ou 2ª ordem para o denominador (polos)
    let polesStr = `Raízes de $${denLat} = 0$`;
    if (degD === 1) {
      const p1 = -uD[0] / uD[1];
      polesStr = `$${denLat} = 0 \\implies s = ${Number(p1.toFixed(4))}$`;
    } else if (degD === 2) {
      const a = uD[2], b = uD[1], c = uD[0];
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const r1 = (-b + Math.sqrt(disc)) / (2 * a);
        const r2 = (-b - Math.sqrt(disc)) / (2 * a);
        polesStr = `$s_1 = ${Number(r1.toFixed(4))},\\; s_2 = ${Number(r2.toFixed(4))}$`;
      } else {
        const re = -b / (2 * a);
        const im = Math.sqrt(-disc) / (2 * a);
        polesStr = `$s_{1,2} = ${Number(re.toFixed(4))} \\pm j\\,${Number(im.toFixed(4))}$`;
      }
    }

    extraItems = `
      <li><b>Grau do Numerador / Ordem do Sistema:</b> Grau de $N(s) = ${degN}$ | Ordem do sistema (grau de $D(s)$) $= ${degD}$</li>
      <li><b>Equação Característica e Polos ($D(s) = 0$):</b> ${polesStr}</li>
      <li><b>Ganho Estático / Regime Permanente ($s \\to 0$):</b> ${dcGainStr}</li>
    `;
  }

  return `
    <div style="font-size:0.85rem; color:var(--text); margin-top:12px; background:rgba(15,23,42,0.65); border:1px solid var(--border); border-radius:8px; padding:12px 14px;">
      <div style="font-weight:700; color:var(--primary); margin-bottom:6px;">📋 Detalhamento Analítico da Função de Transferência Reduzida:</div>
      <ul style="margin-left:18px; color:var(--text-muted); line-height:1.65;">
        <li><b>Polinômio do Numerador $N(s)$:</b> $N(s) = ${numLat}$</li>
        <li><b>Polinômio Característico (Denominador) $\\Delta(s) = D(s)$:</b> $D(s) = ${denLat}$</li>
        <li><b>Relação Entrada–Saída no Domínio da Frequência ($s$):</b> $[${denLat}] \\cdot ${outVar}(s) = [${numLat}] \\cdot ${inVar}(s)$</li>
        <li><b>Equação de Saída Isolada:</b> $${outVar}(s) = \\left(${ratToLatex(ratT)}\\right) \\cdot ${inVar}(s)$</li>
        ${extraItems}
      </ul>
    </div>
  `;
}

// ============================================================================
// 2. AUXILIARES DE DESENHO SVG PARA DIAGRAMAS DE BLOCOS E FRAÇÕES
// ============================================================================

function svgDefs() {
  return `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
      </marker>
      <marker id="arrow-purple" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#a855f7" />
      </marker>
      <marker id="arrow-green" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
      </marker>
      <marker id="arrow-selected" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
      </marker>
      <marker id="arrow-pen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#fbbf24" />
      </marker>
    </defs>
  `;
}

function drawSvgBlockBox(cx, cy, numStr, denStr, opts = {}) {
  const isFrac = denStr && denStr !== "1";
  const stroke = opts.stroke || "#38bdf8";
  const fill = opts.fill || "#050811";
  const maxLen = Math.max((numStr || "").length, isFrac ? (denStr || "").length : 0);
  const minW = opts.minW || 68;
  const w = opts.width || Math.max(minW, Math.min(270, maxLen * 6.8 + 26));
  const h = opts.height || (isFrac ? 48 : 40);
  const x = cx - w / 2;
  const y = cy - h / 2;
  const fontSize = maxLen > 24 ? 9.5 : maxLen > 16 ? 10.5 : 11.5;

  let badge = "";
  if (opts.caption) {
    badge = `<text x="${cx}" y="${y - 6}" text-anchor="middle" fill="#94a3b8" font-size="9.5">${opts.caption}</text>`;
  }

  if (!isFrac) {
    return `
      ${badge}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="2" />
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#f8fafc" font-size="${fontSize + 1}" font-weight="bold">${numStr}</text>
    `;
  } else {
    return `
      ${badge}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="2" />
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#f8fafc" font-size="${fontSize}" font-weight="bold">${numStr}</text>
      <line x1="${x + 8}" y1="${cy}" x2="${x + w - 8}" y2="${cy}" stroke="#64748b" stroke-width="1.3" />
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#f8fafc" font-size="${fontSize}" font-weight="bold">${denStr}</text>
    `;
  }
}

function drawSingleBlockEquivalentSvg(numStr, denStr, inLabel = "R(s)", outLabel = "C(s)", subtitle = "Diagrama de Bloco Único Reduzido") {
  const maxLen = Math.max((numStr || "").length, (denStr || "").length);
  const w = Math.max(130, Math.min(340, maxLen * 7.2 + 34));
  const cx = 300;
  const cy = 105;
  const leftX = cx - w / 2;
  const rightX = cx + w / 2;
  return `
    ${svgDefs()}
    <text x="300" y="26" text-anchor="middle" fill="#10b981" font-size="11" font-weight="bold">${subtitle}</text>
    <line x1="55" y1="${cy}" x2="${leftX}" y2="${cy}" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="80" y="${cy - 10}" fill="#94a3b8" font-size="11.5" font-weight="bold">${inLabel}</text>
    ${drawSvgBlockBox(cx, cy, numStr, denStr, { width: w, height: denStr && denStr !== "1" ? 54 : 44, stroke: "#10b981" })}
    <line x1="${rightX}" y1="${cy}" x2="545" y2="${cy}" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="515" y="${cy - 10}" fill="#94a3b8" font-size="11.5" font-weight="bold">${outLabel}</text>
  `;
}

// ============================================================================
// 3. PRESETS EXISTENTES (MANTIDOS INTEGRALMENTE + DIAGRAMAS PASSO A PASSO)
// ============================================================================

const presets = {
  mf_padrao: {
    title: "Formato em Malha Fechada [G(s) e H(s)]",
    desc: "Sistema canônico com caminho direto G(s) e malha de realimentação H(s).",
    fields: [
      { id: "G", label: "Caminho Direto G(s)", default: "G(s)", helpText: "Função de transferência direta G(s). Mantenha 'G(s)' ou 'G' para cálculo literal, ou insira frações como 10/(s+2) ou 2/(s+1)." },
      { id: "H", label: "Caminho de Realimentação H(s)", default: "H(s)", helpText: "Função de realimentação H(s). Mantenha 'H(s)' ou 'H' para dedução literal, '1' para malha unitária, ou frações como 1/(s+4)." },
      { id: "sinal", label: "Tipo de Realimentação", type: "select", options: ["Negativa (-)", "Positiva (+)"], default: "Negativa (-)", helpText: "Realimentação Negativa gera sinal de erro E(s) = R(s) - C(s)H(s) e denominador 1 + G(s)H(s). Realimentação Positiva gera 1 - G(s)H(s)." }
    ],
    svg: `
      <line x1="40" y1="110" x2="100" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="50" y="100" fill="#94a3b8" font-size="11">R(s)</text>
      <circle cx="120" cy="110" r="16" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="108" y="106" fill="#38bdf8" font-size="11">+</text>
      <text x="117" y="123" fill="#ef4444" font-size="11">-</text>
      <line x1="136" y1="110" x2="200" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="155" y="100" fill="#94a3b8" font-size="11">E(s)</text>
      <rect x="200" y="85" width="90" height="50" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="235" y="115" fill="#f8fafc" font-size="13" font-weight="bold">G(s)</text>
      <line x1="290" y1="110" x2="480" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="460" y="100" fill="#94a3b8" font-size="11">C(s)</text>
      <circle cx="380" cy="110" r="4" fill="#38bdf8" />
      <line x1="380" y1="110" x2="380" y2="175" stroke="#38bdf8" stroke-width="2" />
      <line x1="380" y1="175" x2="290" y2="175" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="200" y="152" width="90" height="46" rx="5" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="235" y="180" fill="#f8fafc" font-size="13" font-weight="bold">H(s)</text>
      <line x1="200" y1="175" x2="120" y2="175" stroke="#38bdf8" stroke-width="2" />
      <line x1="120" y1="175" x2="120" y2="126" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    `
  },
  cascata_dupla: {
    title: "Formato em Cascata / Série [G1(s) e G2(s)]",
    desc: "Dois subsistemas lineares G1(s) e G2(s) ligados em série sem efeito de carga.",
    fields: [
      { id: "G1", label: "Bloco G1(s)", default: "G_1", helpText: "Ganho do bloco G1(s). Mantenha 'G_1' para dedução literal simbólica ou insira expressões como 5/(s+1)." },
      { id: "G2", label: "Bloco G2(s)", default: "G_2", helpText: "Ganho do bloco G2(s). Mantenha 'G_2' para dedução literal simbólica ou insira expressões como 2/(s+4)." }
    ],
    svg: `
      <line x1="50" y1="110" x2="140" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="80" y="100" fill="#94a3b8" font-size="11">R(s)</text>
      <rect x="140" y="85" width="90" height="50" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="170" y="115" fill="#f8fafc" font-size="13" font-weight="bold">G1(s)</text>
      <line x1="230" y1="110" x2="330" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="270" y="100" fill="#94a3b8" font-size="11">X1(s)</text>
      <rect x="330" y="85" width="90" height="50" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="360" y="115" fill="#f8fafc" font-size="13" font-weight="bold">G2(s)</text>
      <line x1="420" y1="110" x2="520" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="480" y="100" fill="#94a3b8" font-size="11">C(s)</text>
    `
  },
  paralelo: {
    title: "Formato em Paralelo [G1(s) e G2(s)]",
    desc: "A mesma referência R(s) alimenta simultaneamente G1(s) e G2(s).",
    fields: [
      { id: "G1", label: "Ramo Superior G1(s)", default: "G_1", helpText: "Função do ramo superior G1(s). Deixe 'G_1' para dedução simbólica ou digite frações como 1/s." },
      { id: "G2", label: "Ramo Inferior G2(s)", default: "G_2", helpText: "Função do ramo inferior G2(s). Deixe 'G_2' para dedução simbólica ou digite frações como 2/(s+3)." },
      { id: "operacao", label: "Operação no Somador", type: "select", options: ["Soma (+)", "Subtração (-)"], default: "Soma (+)", helpText: "Operação algébrica no ponto de soma: Soma (+) resulta em G1 + G2; Subtração (-) resulta em G1 - G2." }
    ],
    svg: `
      <line x1="40" y1="110" x2="110" y2="110" stroke="#38bdf8" stroke-width="2" />
      <text x="55" y="100" fill="#94a3b8" font-size="11">R(s)</text>
      <circle cx="110" cy="110" r="4" fill="#38bdf8" />
      <line x1="110" y1="110" x2="110" y2="65" stroke="#38bdf8" stroke-width="2" />
      <line x1="110" y1="65" x2="170" y2="65" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <line x1="110" y1="110" x2="110" y2="155" stroke="#38bdf8" stroke-width="2" />
      <line x1="110" y1="155" x2="170" y2="155" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="170" y="42" width="90" height="46" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="200" y="70" fill="#f8fafc" font-size="13" font-weight="bold">G1(s)</text>
      <rect x="170" y="132" width="90" height="46" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="200" y="160" fill="#f8fafc" font-size="13" font-weight="bold">G2(s)</text>
      <line x1="260" y1="65" x2="330" y2="65" stroke="#38bdf8" stroke-width="2" />
      <line x1="330" y1="65" x2="330" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <line x1="260" y1="155" x2="330" y2="155" stroke="#38bdf8" stroke-width="2" />
      <line x1="330" y1="155" x2="330" y2="125" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="330" cy="110" r="15" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="326" y="104" fill="#38bdf8" font-size="10">+</text>
      <text x="326" y="122" fill="#38bdf8" font-size="10">±</text>
      <line x1="345" y1="110" x2="480" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="440" y="100" fill="#94a3b8" font-size="11">C(s)</text>
    `
  },
  exemplo1: {
    title: "Exemplo 1 — Movendo Bloco G1",
    desc: "Transposição de G1(s) através do somador (dividindo a realimentação por G1) seguida de associação em cascata e redução da malha fechada.",
    fields: [
      { id: "G1", label: "Transdutor de Entrada G1(s)", default: "G_1", helpText: "Deixe G_1 para simbólico ou digite uma função em s (ex: 2/(s+1))." },
      { id: "G2", label: "Controlador G2(s)", default: "G_2", helpText: "Deixe G_2 para simbólico ou digite uma função em s." },
      { id: "G3", label: "Planta G3(s)", default: "G_3", helpText: "Deixe G_3 para simbólico ou digite uma função em s." },
      { id: "H1", label: "Transdutor de Saída H1(s)", default: "H_1", helpText: "Deixe H_1 para simbólico ou digite uma função/valor." },
      { id: "H2", label: "Realimentação H2(s)", default: "H_2", helpText: "Deixe H_2 para simbólico ou digite uma função/valor." },
      { id: "sinal", label: "Sinal da Realimentação no Somador", type: "select", options: ["Negativa (-)", "Positiva (+)"], default: "Negativa (-)", helpText: "Sinal da realimentação H no somador." }
    ],
    svg: `
      <text x="15" y="95" fill="#94a3b8" font-size="11">R(s)</text>
      <line x1="42" y1="90" x2="72" y2="90" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="72" y="70" width="60" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="102" y="94" text-anchor="middle" fill="#fff" font-size="11">G1(s)</text>
      <line x1="132" y1="90" x2="176" y2="90" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="190" cy="90" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="179" y="93" fill="#38bdf8" font-size="10">+</text>
      <text x="187" y="102" fill="#ef4444" font-size="10">∓</text>
      <line x1="204" y1="90" x2="255" y2="90" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="229" y="80" text-anchor="middle" fill="#fbbf24" font-size="10">E(s)</text>
      <rect x="255" y="70" width="65" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="287" y="94" text-anchor="middle" fill="#fff" font-size="11">G2(s)</text>
      <line x1="320" y1="90" x2="365" y2="90" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="365" y="70" width="65" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="397" y="94" text-anchor="middle" fill="#fff" font-size="11">G3(s)</text>
      <line x1="430" y1="90" x2="565" y2="90" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="535" y="80" fill="#94a3b8" font-size="11">C(s)</text>
      <circle cx="495" cy="90" r="3.5" fill="#38bdf8" />
      <line x1="495" y1="90" x2="495" y2="175" stroke="#38bdf8" stroke-width="2" />
      <line x1="495" y1="175" x2="430" y2="175" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="365" y="155" width="65" height="40" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="397" y="179" text-anchor="middle" fill="#fff" font-size="11">H1(s)</text>
      <line x1="365" y1="175" x2="320" y2="175" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="255" y="155" width="65" height="40" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="287" y="179" text-anchor="middle" fill="#fff" font-size="11">H2(s)</text>
      <line x1="255" y1="175" x2="190" y2="175" stroke="#38bdf8" stroke-width="2" />
      <line x1="190" y1="175" x2="190" y2="104" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    `
  },
  exemplo2: {
    title: "Exemplo 2 — Múltiplos Somadores e Realimentações em Paralelo",
    desc: "Unificação de 3 somadores consecutivos (a), associação em cascata G3·G2 e paralelo H1 - H2 + H3 (b), e fechamento da malha (c).",
    fields: [
      { id: "G1", label: "Bloco G1(s)", default: "G_1", helpText: "Deixe G_1 para simbólico ou digite uma função em s." },
      { id: "G2", label: "Bloco G2(s)", default: "G_2", helpText: "Deixe G_2 para simbólico ou digite uma função em s." },
      { id: "G3", label: "Bloco G3(s)", default: "G_3", helpText: "Deixe G_3 para simbólico ou digite uma função em s." },
      { id: "H1", label: "Realimentação H1(s) [Sinal -]", default: "H_1", helpText: "Deixe H_1 para simbólico ou digite uma função/valor." },
      { id: "H2", label: "Realimentação H2(s) [Sinal +]", default: "H_2", helpText: "Deixe H_2 para simbólico ou digite uma função/valor." },
      { id: "H3", label: "Realimentação H3(s) [Sinal -]", default: "H_3", helpText: "Deixe H_3 para simbólico ou digite uma função/valor." }
    ],
    svg: `
      <text x="10" y="65" fill="#94a3b8" font-size="10.5">R(s)</text>
      <line x1="35" y1="60" x2="58" y2="60" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="58" y="42" width="52" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="84" y="64" text-anchor="middle" fill="#fff" font-size="10.5">G1(s)</text>
      <line x1="110" y1="60" x2="136" y2="60" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="148" cy="60" r="12" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="139" y="63" fill="#38bdf8" font-size="9">+</text>
      <text x="145" y="70" fill="#ef4444" font-size="9">-</text>
      <line x1="160" y1="60" x2="192" y2="60" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="204" cy="60" r="12" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="195" y="63" fill="#38bdf8" font-size="9">+</text>
      <text x="201" y="70" fill="#10b981" font-size="9">+</text>
      <line x1="216" y1="60" x2="248" y2="60" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="260" cy="60" r="12" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="251" y="63" fill="#38bdf8" font-size="9">+</text>
      <text x="257" y="70" fill="#ef4444" font-size="9">-</text>
      <line x1="272" y1="60" x2="310" y2="60" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="310" y="42" width="56" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="338" y="64" text-anchor="middle" fill="#fff" font-size="10.5">G2(s)</text>
      <line x1="366" y1="60" x2="405" y2="60" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="405" y="42" width="56" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="433" y="64" text-anchor="middle" fill="#fff" font-size="10.5">G3(s)</text>
      <line x1="461" y1="60" x2="575" y2="60" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="548" y="50" fill="#94a3b8" font-size="10.5">C(s)</text>
      <circle cx="510" cy="60" r="3.5" fill="#38bdf8" />
      <line x1="510" y1="60" x2="510" y2="112" stroke="#38bdf8" stroke-width="2" />
      <line x1="510" y1="112" x2="366" y2="112" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="310" y="95" width="56" height="34" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="338" y="116" text-anchor="middle" fill="#fff" font-size="10.5">H1(s)</text>
      <line x1="310" y1="112" x2="260" y2="112" stroke="#38bdf8" stroke-width="2" />
      <line x1="260" y1="112" x2="260" y2="72" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <line x1="510" y1="112" x2="510" y2="162" stroke="#38bdf8" stroke-width="2" />
      <line x1="510" y1="162" x2="366" y2="162" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="310" y="145" width="56" height="34" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="338" y="166" text-anchor="middle" fill="#fff" font-size="10.5">H2(s)</text>
      <line x1="310" y1="162" x2="204" y2="162" stroke="#38bdf8" stroke-width="2" />
      <line x1="204" y1="162" x2="204" y2="72" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <line x1="510" y1="162" x2="510" y2="212" stroke="#38bdf8" stroke-width="2" />
      <line x1="510" y1="212" x2="366" y2="212" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="310" y="195" width="56" height="34" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="338" y="216" text-anchor="middle" fill="#fff" font-size="10.5">H3(s)</text>
      <line x1="310" y1="212" x2="148" y2="212" stroke="#38bdf8" stroke-width="2" />
      <line x1="148" y1="212" x2="148" y2="72" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    `
  },
  exemplo3: {
    title: "Exemplo 3 — Ramos s·s e 1/s em Paralelo",
    desc: "Redução composta: ramo paralelo (s² + 1/s), realimentação interna unitária e realimentação externa H(s)=s.",
    fields: [
      { id: "expr1", label: "Caminho Série", default: "s * s = s²", helpText: "Dois blocos s em série (s * s = s²)." },
      { id: "expr2", label: "Caminho Paralelo", default: "1/s", helpText: "Ramo em paralelo com função 1/s." },
      { id: "H_ext", label: "Realimentação Externa", default: "s", helpText: "Ganho da malha externa de retorno H(s) = s." }
    ],
    svg: `
      <text x="16" y="105" fill="#94a3b8" font-size="11">R(s)</text>
      <line x1="42" y1="100" x2="78" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="92" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="82" y="103" fill="#38bdf8" font-size="10">+</text>
      <text x="89" y="92" fill="#ef4444" font-size="10">-</text>
      <text x="89" y="112" fill="#ef4444" font-size="10">-</text>
      <line x1="106" y1="100" x2="180" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="140" cy="100" r="3.5" fill="#38bdf8" />
      <rect x="180" y="82" width="52" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="206" y="104" text-anchor="middle" fill="#fff" font-size="12">s</text>
      <line x1="232" y1="100" x2="265" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="265" y="82" width="52" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="291" y="104" text-anchor="middle" fill="#fff" font-size="12">s</text>
      <line x1="317" y1="100" x2="356" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="370" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="360" y="103" fill="#38bdf8" font-size="10">+</text>
      <text x="367" y="112" fill="#38bdf8" font-size="10">+</text>
      <!-- Ramo paralelo inferior 1/s -->
      <line x1="140" y1="100" x2="140" y2="155" stroke="#38bdf8" stroke-width="2" />
      <line x1="140" y1="155" x2="215" y2="155" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="215" y="137" width="60" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="245" y="159" text-anchor="middle" fill="#fff" font-size="12">1/s</text>
      <line x1="275" y1="155" x2="370" y2="155" stroke="#38bdf8" stroke-width="2" />
      <line x1="370" y1="155" x2="370" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Saída somador 2 e malha unitária superior -->
      <line x1="384" y1="100" x2="445" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="415" cy="100" r="3.5" fill="#38bdf8" />
      <line x1="415" y1="100" x2="415" y2="42" stroke="#38bdf8" stroke-width="2" />
      <line x1="415" y1="42" x2="92" y2="42" stroke="#38bdf8" stroke-width="2" />
      <line x1="92" y1="42" x2="92" y2="86" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Integrador final 1/s e realimentação externa s -->
      <rect x="445" y="82" width="60" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="475" y="104" text-anchor="middle" fill="#fff" font-size="12">1/s</text>
      <line x1="505" y1="100" x2="575" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="560" y="90" fill="#94a3b8" font-size="11">C(s)</text>
      <circle cx="535" cy="100" r="3.5" fill="#38bdf8" />
      <line x1="535" y1="100" x2="535" y2="205" stroke="#38bdf8" stroke-width="2" />
      <line x1="535" y1="205" x2="320" y2="205" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="260" y="187" width="60" height="36" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="290" y="209" text-anchor="middle" fill="#fff" font-size="12">s</text>
      <line x1="260" y1="205" x2="92" y2="205" stroke="#38bdf8" stroke-width="2" />
      <line x1="92" y1="205" x2="92" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    `
  },
  proposto1: {
    title: "Exercício Proposto 1 — Malha Interna e Feedback Combinado",
    desc: "Diagrama com malha interna H2, ramo bifurcado 1/G2 e sub-bloco final G3/(1+G3*H3).",
    fields: [
      { id: "G1", label: "Bloco G1(s)", default: "G_1", helpText: "Deixe G_1 para simbólico ou digite uma função em s." },
      { id: "G2", label: "Bloco G2(s)", default: "G_2", helpText: "Deixe G_2 para simbólico ou digite uma função em s." },
      { id: "G3", label: "Bloco G3(s)", default: "G_3", helpText: "Deixe G_3 para simbólico ou digite uma função em s." },
      { id: "H1", label: "Realimentação H1(s)", default: "H_1", helpText: "Deixe H_1 para simbólico ou digite uma função/valor." },
      { id: "H2", label: "Realimentação H2(s)", default: "H_2", helpText: "Deixe H_2 para simbólico ou digite uma função/valor." },
      { id: "H3", label: "Realimentação H3(s)", default: "H_3", helpText: "Deixe H_3 para simbólico ou digite uma função/valor." }
    ],
    svg: `
      <text x="15" y="105" fill="#94a3b8" font-size="11">R</text>
      <line x1="30" y1="100" x2="62" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="75" cy="100" r="13" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="65" y="103" fill="#38bdf8" font-size="9">+</text>
      <text x="72" y="111" fill="#ef4444" font-size="9">-</text>
      <line x1="88" y1="100" x2="122" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="103" y="92" fill="#94a3b8" font-size="9.5">V1</text>
      <rect x="122" y="82" width="52" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="148" y="104" text-anchor="middle" fill="#fff" font-size="11">G1</text>
      <line x1="174" y1="100" x2="212" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="191" y="92" fill="#94a3b8" font-size="9.5">V2</text>
      <circle cx="225" cy="100" r="13" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="215" y="103" fill="#38bdf8" font-size="9">+</text>
      <text x="222" y="111" fill="#ef4444" font-size="9">-</text>
      <line x1="238" y1="100" x2="272" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="253" y="92" fill="#94a3b8" font-size="9.5">V3</text>
      <rect x="272" y="82" width="52" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="298" y="104" text-anchor="middle" fill="#fff" font-size="11">G2</text>
      <line x1="324" y1="100" x2="422" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="342" y="92" fill="#94a3b8" font-size="9.5">V4</text>
      <!-- Ramo superior 1/G2 -->
      <circle cx="362" cy="100" r="3.5" fill="#38bdf8" />
      <line x1="362" y1="100" x2="362" y2="42" stroke="#38bdf8" stroke-width="2" />
      <line x1="362" y1="42" x2="375" y2="42" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="375" y="24" width="52" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="401" y="46" text-anchor="middle" fill="#fff" font-size="10">1/G2</text>
      <line x1="427" y1="42" x2="435" y2="42" stroke="#38bdf8" stroke-width="2" />
      <line x1="435" y1="42" x2="435" y2="87" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Somador 3 e Bloco Final -->
      <circle cx="435" cy="100" r="13" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="425" y="103" fill="#38bdf8" font-size="9">+</text>
      <text x="432" y="92" fill="#38bdf8" font-size="9">+</text>
      <line x1="448" y1="100" x2="472" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="472" y="78" width="95" height="44" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="519" y="95" text-anchor="middle" fill="#fff" font-size="10">G3</text>
      <line x1="480" y1="100" x2="559" y2="100" stroke="#64748b" stroke-width="1.2" />
      <text x="519" y="114" text-anchor="middle" fill="#fff" font-size="10">1 + G3·H3</text>
      <line x1="567" y1="100" x2="594" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Realimentação H2 -->
      <circle cx="385" cy="100" r="3.5" fill="#38bdf8" />
      <line x1="385" y1="100" x2="385" y2="155" stroke="#38bdf8" stroke-width="2" />
      <line x1="385" y1="155" x2="324" y2="155" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="272" y="138" width="52" height="34" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="298" y="159" text-anchor="middle" fill="#fff" font-size="11">H2</text>
      <line x1="272" y1="155" x2="225" y2="155" stroke="#38bdf8" stroke-width="2" />
      <line x1="225" y1="155" x2="225" y2="113" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Realimentação H1 -->
      <line x1="385" y1="155" x2="385" y2="205" stroke="#38bdf8" stroke-width="2" />
      <line x1="385" y1="205" x2="174" y2="205" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="122" y="188" width="52" height="34" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="148" y="209" text-anchor="middle" fill="#fff" font-size="11">H1</text>
      <line x1="122" y1="205" x2="75" y2="205" stroke="#38bdf8" stroke-width="2" />
      <line x1="75" y1="205" x2="75" y2="113" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    `
  },
  proposto2: {
    title: "Exercício Proposto 2 — Malhas Cruzadas",
    desc: "Redução por Álgebra de Blocos (Movendo Ponto de Ramificação, Cascata e Malha Fechada).",
    fields: [
      { id: "G1", label: "Bloco G1(s)", default: "G_1", helpText: "Deixe G_1 para simbólico ou digite uma função em s." },
      { id: "G2", label: "Bloco G2(s)", default: "G_2", helpText: "Deixe G_2 para simbólico ou digite uma função em s." },
      { id: "G3", label: "Bloco G3(s)", default: "G_3", helpText: "Deixe G_3 para simbólico ou digite uma função em s." },
      { id: "H1", label: "Realimentação H1(s)", default: "H_1", helpText: "Deixe H_1 para simbólico ou digite uma função/valor." },
      { id: "H2", label: "Realimentação H2(s)", default: "H_2", helpText: "Deixe H_2 para simbólico ou digite uma função/valor." },
      { id: "sinalH1", label: "Sinal de H1 no 2º Somador", type: "select", options: ["Positiva (+)", "Negativa (-)"], default: "Positiva (+)", helpText: "Sinal da realimentação H1 no somador." }
    ],
    svg: `
      <text x="15" y="115" fill="#94a3b8" font-size="11">R</text>
      <line x1="30" y1="110" x2="60" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="75" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="65" y="113" fill="#38bdf8" font-size="10">+</text>
      <text x="72" y="122" fill="#ef4444" font-size="10">-</text>
      <line x1="89" y1="110" x2="115" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="130" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="120" y="113" fill="#38bdf8" font-size="10">+</text>
      <text x="127" y="122" fill="#10b981" font-size="10">+</text>
      <line x1="144" y1="110" x2="175" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="175" y="90" width="55" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="190" y="115" fill="#fff" font-size="11">G1</text>
      <line x1="230" y1="110" x2="260" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <circle cx="275" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="265" y="113" fill="#38bdf8" font-size="10">+</text>
      <text x="272" y="102" fill="#ef4444" font-size="10">-</text>
      <line x1="289" y1="110" x2="315" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="315" y="90" width="55" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="330" y="115" fill="#fff" font-size="11">G2</text>
      <line x1="370" y1="110" x2="415" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <rect x="415" y="90" width="55" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
      <text x="430" y="115" fill="#fff" font-size="11">G3</text>
      <line x1="470" y1="110" x2="560" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="545" y="100" fill="#94a3b8" font-size="11">C</text>
      
      <circle cx="395" cy="110" r="4" fill="#38bdf8" />
      <line x1="395" y1="110" x2="395" y2="170" stroke="#38bdf8" stroke-width="2" />
      <line x1="395" y1="170" x2="275" y2="170" stroke="#38bdf8" stroke-width="2" />
      <rect x="220" y="150" width="55" height="35" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="235" y="172" fill="#fff" font-size="11">H1</text>
      <line x1="220" y1="170" x2="130" y2="170" stroke="#38bdf8" stroke-width="2" />
      <line x1="130" y1="170" x2="130" y2="124" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />

      <circle cx="510" cy="110" r="4" fill="#38bdf8" />
      <line x1="510" y1="110" x2="510" y2="50" stroke="#38bdf8" stroke-width="2" />
      <line x1="510" y1="50" x2="370" y2="50" stroke="#38bdf8" stroke-width="2" />
      <rect x="315" y="32" width="55" height="35" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
      <text x="330" y="54" fill="#fff" font-size="11">H2</text>
      <line x1="315" y1="50" x2="275" y2="50" stroke="#38bdf8" stroke-width="2" />
      <line x1="275" y1="50" x2="275" y2="96" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />

      <line x1="510" y1="110" x2="510" y2="210" stroke="#38bdf8" stroke-width="2" />
      <line x1="510" y1="210" x2="75" y2="210" stroke="#38bdf8" stroke-width="2" />
      <line x1="75" y1="210" x2="75" y2="124" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    `
  },
  custom: {
    title: "Equações Algébricas dos Nós (Substituição [1], [2]...)",
    desc: "Insira as equações lineares dos nós e somadores do diagrama para resolução e isolamento analítico exato por substituição sucessiva.",
    fields: [
      { id: "eqs", label: "Equações dos Nós (uma por linha: LHS = RHS)", type: "textarea", default: "E_1 = R - C\nE_2 = E_1 + H_1 \\cdot X\nE_3 = G_1 \\cdot E_2 - H_2 \\cdot C\nX = G_2 \\cdot E_3\nC = G_3 \\cdot X", helpText: "Uma equação linear por linha definindo a saída de cada somador ou bloco." },
      { id: "inOut", label: "Variáveis de Entrada e Saída (Entrada, Saída)", default: "R, C", helpText: "Defina qual nó é a referência de entrada e qual é a saída controlada (ex: R, C)." }
    ],
    svg: `
      <text x="300" y="20" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold">Diagrama Esquemático Correspondente às Equações dos Nós [1] a [5]</text>
      <!-- Entrada R -->
      <line x1="20" y1="105" x2="65" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="35" y="95" fill="#94a3b8" font-size="11">R(s)</text>
      <!-- Somador 1: E1 = R - C -->
      <circle cx="80" cy="105" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="70" y="102" fill="#38bdf8" font-size="10">+</text>
      <text x="76" y="117" fill="#ef4444" font-size="10">-</text>
      <line x1="94" y1="105" x2="145" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="118" y="95" fill="#38bdf8" font-size="10">E₁</text>
      <!-- Somador 2: E2 = E1 + H1*X -->
      <circle cx="160" cy="105" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="150" y="102" fill="#38bdf8" font-size="10">+</text>
      <text x="156" y="92" fill="#10b981" font-size="10">+</text>
      <line x1="174" y1="105" x2="215" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="194" y="95" fill="#38bdf8" font-size="10">E₂</text>
      <!-- Bloco G1 -->
      \${drawSvgBlockBox(245, 105, "G1", "1", { width: 55, height: 34, stroke: "#38bdf8" })}
      <line x1="275" y1="105" x2="315" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Somador 3: E3 = G1*E2 - H2*C -->
      <circle cx="330" cy="105" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
      <text x="320" y="102" fill="#38bdf8" font-size="10">+</text>
      <text x="326" y="117" fill="#ef4444" font-size="10">-</text>
      <line x1="344" y1="105" x2="385" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="364" y="95" fill="#38bdf8" font-size="10">E₃</text>
      <!-- Bloco G2: X = G2*E3 -->
      \${drawSvgBlockBox(415, 105, "G2", "1", { width: 55, height: 34, stroke: "#38bdf8" })}
      <line x1="445" y1="105" x2="485" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Nó X -->
      <circle cx="485" cy="105" r="4" fill="#38bdf8" />
      <text x="480" y="95" fill="#38bdf8" font-size="10.5" font-weight="bold">X</text>
      <!-- Bloco G3: C = G3*X -->
      \${drawSvgBlockBox(520, 105, "G3", "1", { width: 55, height: 34, stroke: "#10b981" })}
      <line x1="550" y1="105" x2="590" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <text x="580" y="95" fill="#10b981" font-size="11">C(s)</text>
      <!-- Nó C -->
      <circle cx="570" cy="105" r="3.5" fill="#10b981" />
      <!-- Malha interna H1 vindo de X para Somador 2 -->
      <line x1="485" y1="105" x2="485" y2="45" stroke="#38bdf8" stroke-width="2" />
      <line x1="485" y1="45" x2="350" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      \${drawSvgBlockBox(320, 45, "H1", "1", { width: 55, height: 30, stroke: "#a855f7" })}
      <line x1="290" y1="45" x2="160" y2="45" stroke="#38bdf8" stroke-width="2" />
      <line x1="160" y1="45" x2="160" y2="91" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Malha H2 vindo de C para Somador 3 -->
      <line x1="570" y1="105" x2="570" y2="170" stroke="#38bdf8" stroke-width="2" />
      <line x1="570" y1="170" x2="445" y2="170" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      \${drawSvgBlockBox(415, 170, "H2", "1", { width: 55, height: 30, stroke: "#a855f7" })}
      <line x1="385" y1="170" x2="330" y2="170" stroke="#38bdf8" stroke-width="2" />
      <line x1="330" y1="170" x2="330" y2="119" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
      <!-- Malha externa unitária vindo de C para Somador 1 -->
      <line x1="570" y1="170" x2="570" y2="215" stroke="#38bdf8" stroke-width="2" />
      <line x1="570" y1="215" x2="80" y2="215" stroke="#38bdf8" stroke-width="2" />
      <text x="325" y="210" text-anchor="middle" fill="#94a3b8" font-size="9.5">Feedback Unitário Global (1)</text>
      <line x1="80" y1="215" x2="80" y2="119" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    `
  }
};

// Histórico de SVGs das etapas do preset atual para navegação no Painel 2
let currentPresetStages = [];
let currentPresetStageIdx = 0;

function renderPresetStageNav() {
  const nav = document.getElementById("presetStepNav");
  if (!nav) return;
  if (currentPresetStages.length <= 1) {
    nav.style.display = "none";
    return;
  }
  nav.style.display = "flex";
  nav.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); margin-right:4px; font-weight:700;">Ver evolução do diagrama:</span>`;

  currentPresetStages.forEach((st, idx) => {
    const btn = document.createElement("button");
    btn.className = "step-nav-btn" + (idx === currentPresetStageIdx ? " active" : "");
    btn.innerText = st.shortLabel;
    btn.onclick = () => selectPresetStage(idx);
    nav.appendChild(btn);
  });
}

function selectPresetStage(idx) {
  if (idx < 0 || idx >= currentPresetStages.length) return;
  currentPresetStageIdx = idx;
  const svg = document.getElementById("schematicSvg");
  svg.innerHTML = `${svgDefs()}${currentPresetStages[idx].svg}`;
  renderPresetStageNav();
}

function buildFallbackLineExplanation(rawLine, idx, allLines, stepTitle) {
  const cleanLine = (rawLine || "")
    .replace(/&=/g, "=")
    .replace(/&/g, "")
    .trim();
  const prevClean = idx > 0
    ? (allLines[idx - 1] || "").replace(/&=/g, "=").replace(/&/g, "").trim()
    : "";

  // 1. Detecção de linhas com MMC (Mínimo Múltiplo Comum)
  if (
    cleanLine.includes("Tirando o MMC") ||
    cleanLine.includes("\\frac{s^2}{1} + \\frac{1}{s}") ||
    cleanLine.includes("1 + \\frac{1}{G_2(s)}") ||
    /\\frac\{\\frac\{[^}]+\}\{[^}]+\}\}\{\\frac\{[^}]+\}\{[^}]+\}\}/.test(cleanLine)
  ) {
    return {
      title: "Passo a Passo Detalhado do Cálculo do MMC (Mínimo Múltiplo Comum)",
      bodyHtml: `<ol>
        <li><b>Expressão calculada nesta linha:</b>
          <div class="micro-formula-box">$$${cleanLine}$$</div>
        </li>
        <li><b>1º Passo — Transformar termos inteiros em fração com denominador $1$:</b>
          Todo número ou polinômio inteiro $A$ pode ser escrito como $\\frac{A}{1}$ (por exemplo, $1 = \\frac{1}{1}$ ou $s^2 = \\frac{s^2}{1}$). Assim, ficamos com uma soma/subtração entre duas frações: $\\frac{A}{1} \\pm \\frac{N}{D}$.
        </li>
        <li><b>2º Passo — Encontrar o MMC dos denominadores:</b>
          O Mínimo Múltiplo Comum entre o denominador $1$ e o denominador $D$ é o próprio $D$, pois $\\text{MMC}(1, D) = 1 \\cdot D = D$.
        </li>
        <li><b>3º Passo — Regra <i>"Divide pelo de baixo e multiplica pelo de cima"</i>:</b>
          <ul>
            <li><b>Na 1ª parcela ($\\frac{A}{1}$):</b> dividimos o MMC $D$ pelo denominador de baixo ($1$), obtendo $D \\div 1 = D$, e multiplicamos pelo numerador de cima ($A$), resultando em $\\mathbf{A \\cdot D}$.</li>
            <li><b>Na 2ª parcela ($\\frac{N}{D}$):</b> dividimos o MMC $D$ pelo denominador de baixo ($D$), obtendo $D \\div D = 1$, e multiplicamos pelo numerador de cima ($N$), resultando em $\\mathbf{1 \\cdot N = N}$.</li>
          </ul>
        </li>
        <li><b>4º Passo — Juntar os numeradores sobre o mesmo denominador comum $D$:</b>
          Unificamos tudo em uma única fração $\\frac{A \\cdot D \\pm N}{D}$ e agrupamos os termos semelhantes no numerador.
        </li>
      </ol>`
    };
  }

  // 2. Detecção de divisão de frações e cancelamento (\cancel)
  if (cleanLine.includes("\\cancel{") || cleanLine.includes("Multiplicando pelo inverso")) {
    return {
      title: "Passo a Passo da Divisão de Frações e Cancelamento (Corte) de Fatores Iguais",
      bodyHtml: `<ol>
        <li><b>Expressão nesta linha:</b>
          <div class="micro-formula-box">$$${cleanLine}$$</div>
        </li>
        <li><b>1º Passo — Regra da Divisão de Frações (<i>"Conserva a de cima e multiplica pelo inverso da de baixo"</i>):</b>
          Quando temos uma fração dividida por outra fração ($\\frac{A/B}{C/D}$), mantemos a fração do numerador ($\\frac{A}{B}$) intacta e multiplicamos pela fração do denominador invertida ($\\frac{D}{C}$):
          <div class="micro-formula-box">$$\\frac{\\;\\frac{A}{B}\\;}{\\;\\frac{C}{D}\\;} = \\frac{A}{B} \\cdot \\frac{D}{C}$$</div>
        </li>
        <li><b>2º Passo — Identificação e Corte ($\\cancel{\\text{termo}}$) do Fator Comum:</b>
          O termo marcado com traço de corte ($\\cancel{\\dots}$) aparece simultaneamente multiplicando no numerador e dividindo no denominador.
        </li>
        <li><b>3º Passo — Simplificação:</b>
          Como qualquer polinômio dividido por ele mesmo é igual a $1$ ($\\frac{K}{K} = 1$), esses dois termos se anulam, simplificando diretamente a função de transferência.
        </li>
      </ol>`
    };
  }

  // 3. Detecção de isolamento de variável em evidência (Ex: C(s) * [1 + G(s)H(s)] = ...)
  if (cleanLine.includes("\\cdot [1") || cleanLine.includes("\\cdot \\{1") || cleanLine.includes("[1 +") || cleanLine.includes("[1 -")) {
    return {
      title: "Isolamento da Variável de Saída e Fatoração em Evidência",
      bodyHtml: `<ol>
        <li><b>Equação nesta linha:</b>
          <div class="micro-formula-box">$$${cleanLine}$$</div>
        </li>
        ${prevClean ? `<li><b>Linha anterior de onde partimos:</b><div class="micro-formula-box">$$${prevClean}$$</div></li>` : ""}
        <li><b>1º Passo — Agrupar os termos da saída no mesmo lado da igualdade:</b>
          Passamos todos os termos que multiplicam a variável de saída ($C(s)$ ou $V_4(s)$) para o lado esquerdo da equação (trocando o sinal de $-$ para $+$, ou de $+$ para $-$, ao passar pelo sinal de $=$).
        </li>
        <li><b>2º Passo — Colocar a saída em evidência:</b>
          Pela propriedade distributiva inversa ($A \\cdot X \\pm B \\cdot X = X \\cdot [A \\pm B]$), colocamos a variável de saída em evidência fora dos colchetes. O primeiro termo (que era $1 \\cdot C(s)$) vira o número $1$ dentro do colchete: $[1 \\pm G(s)H(s)]$.
        </li>
        <li><b>3º Passo — Obter a Função de Transferência:</b>
          Passamos o fator entre colchetes $[1 \\pm \\dots]$ dividindo para o lado direito da igualdade.
        </li>
      </ol>`
    };
  }

  // 4. Detecção de equações numeradas dos nós [1], [2], [3], [4], [5]
  if (/\[\d+\]/.test(cleanLine)) {
    const isFractionEq3 = cleanLine.includes("\\frac{") && cleanLine.includes("[3]");
    if (isFractionEq3) {
      return {
        title: "Dedução da Equação Canônica de Malha Fechada",
        bodyHtml: `<ol>
          <li><b>Equação obtida:</b>
            <div class="micro-formula-box">$$${cleanLine}$$</div>
          </li>
          <li><b>Como foi feito o isolamento:</b>
            Na linha anterior tínhamos $C(s)$ multiplicado pelo fator entre colchetes $[1 \\pm G(s)H(s)]$ no lado esquerdo. Dividimos ambos os lados da equação por $[1 \\pm G(s)H(s)]$, isolando $C(s)$ (e a razão $\\frac{C(s)}{R(s)}$).
          </li>
        </ol>`
      };
    }
    return {
      title: "Como Esta Equação de Nó Foi Montada a Partir do Diagrama",
      bodyHtml: `<ol>
        <li><b>Equação identificada no diagrama:</b>
          <div class="micro-formula-box">$$${cleanLine}$$</div>
        </li>
        <li><b>Regra de leitura dos sinais no diagrama de blocos:</b>
          <ul>
            <li><b>Saída de um Bloco:</b> O sinal que sai da seta de um bloco é sempre igual à função de transferência do bloco multiplicada pelo sinal que entra nele ($\\text{Saída} = \\text{Bloco} \\times \\text{Entrada}$).</li>
            <li><b>Saída de um Somador (Ponto de Soma):</b> O sinal que sai do somador é a soma algébrica de todas as setas que entram nele, respeitando o sinal ($+$ ou $-$) indicado na porta de cada seta.</li>
          </ul>
        </li>
      </ol>`
    };
  }

  // 5. Detecção de regras de movimento de ponto de ramificação ou ponto de soma
  if (cleanLine.includes("H_{1,\\text{deslocado}}") || cleanLine.includes("\\frac{H_1(s) H_2(s)}{G_1(s)}") || cleanLine.includes("\\frac{H_1}{G_3}")) {
    return {
      title: "Regra de Deslocamento de Ponto de Ramificação / Ponto de Soma",
      bodyHtml: `<ol>
        <li><b>Transformação aplicada nesta linha:</b>
          <div class="micro-formula-box">$$${cleanLine}$$</div>
        </li>
        <li><b>Por que aparece a divisão pelo bloco ($G_1$ ou $G_3$)?</b>
          <ul>
            <li><b>Mover ramificação de antes para depois de um bloco $G$:</b> Antes do bloco o sinal valia $X$. Depois do bloco o sinal passou a valer $C = G \\cdot X$, ou seja, foi multiplicado por $G$. Para que o ramo deslocado continue recebendo exatamente o mesmo sinal original $X = \\frac{C}{G}$, precisamos dividir esse ramo por $G$ (multiplicar por $\\frac{1}{G}$).</li>
            <li><b>Mover bloco $G_1$ de antes para depois de um somador:</b> Ao colocar $G_1$ em evidência na saída do somador ($G_1 R \\pm H C = G_1[R \\pm \\frac{H}{G_1} C]$), o ramo que não tinha $G_1$ precisa ser dividido por $G_1$.</li>
          </ul>
        </li>
      </ol>`
    };
  }

  // 6. Explicação detalhada comparando com a linha anterior (Substituição / Chuveirinho / Cascata)
  if (prevClean) {
    return {
      title: "Passo a Passo da Passagem Algébrica desta Linha",
      bodyHtml: `<ol>
        <li><b>Linha anterior (ponto de partida):</b>
          <div class="micro-formula-box">$$${prevClean}$$</div>
        </li>
        <li><b>Linha atual (resultado desta passagem):</b>
          <div class="micro-formula-box">$$${cleanLine}$$</div>
        </li>
        <li><b>O que foi feito nesta passagem:</b>
          <ul>
            <li>Substituímos a expressão da etapa anterior e aplicamos a <b>propriedade distributiva ("chuveirinho")</b> multiplicando cada termo de fora pelos termos de dentro dos parênteses/colchetes.</li>
            <li>Em seguida, agrupamos os termos semelhantes e simplificamos os fatores comuns entre numerador e denominador para obter a forma reduzida acima.</li>
          </ul>
        </li>
      </ol>`
    };
  }

  // 7. Primeira linha de uma etapa (fórmula base ou substituição inicial)
  return {
    title: stepTitle ? `Detalhamento Inicial — ${stepTitle}` : "Explicação Passo a Passo desta Equação",
    bodyHtml: `<ol>
      <li><b>Equação montada nesta linha:</b>
        <div class="micro-formula-box">$$${cleanLine}$$</div>
      </li>
      <li><b>Como esta expressão foi construída:</b>
        <ul>
          <li>Identificamos a topologia canônica dos blocos conectados nesta etapa:
            <b>Cascata / Série:</b> multiplica-se $G_1(s) \\cdot G_2(s)$;
            <b>Paralelo:</b> soma-se $\\pm G_1(s) \\pm G_2(s)$ tirando o MMC;
            <b>Malha Fechada:</b> aplica-se $\\frac{G(s)}{1 \\mp G(s)H(s)}$ (sinal invertido no denominador).
          </li>
          <li>Substituímos cada bloco pela sua respectiva função de transferência para iniciar a simplificação algébrica nas linhas seguintes.</li>
        </ul>
      </li>
    </ol>`
  };
}

function enhanceInteractiveMathDisplays(rootEl) {
  if (!rootEl) return;
  const displays = [];
  if (rootEl.classList && rootEl.classList.contains("math-display")) {
    displays.push(rootEl);
  }
  if (rootEl.querySelectorAll) {
    rootEl.querySelectorAll(".math-display").forEach(d => displays.push(d));
  }

  displays.forEach(mathDiv => {
    if (mathDiv.dataset.interactiveEnhanced === "true") return;
    const rawContent = (mathDiv.textContent || "").trim();
    if (!rawContent) return;

    mathDiv.dataset.interactiveEnhanced = "true";

    // Extrair o interior de $$ ... $$ e de \begin{aligned} ... \end{aligned}
    let inner = rawContent
      .replace(/^\$\$\s*/, "")
      .replace(/\s*\$\$$/, "")
      .trim();
    inner = inner
      .replace(/^\\begin\{aligned\}\s*/, "")
      .replace(/\s*\\end\{aligned\}$/, "")
      .trim();

    // Separar por quebras de linha LaTeX: \\ ou \\[4pt], \\[6pt], etc.
    const rawLines = inner
      .split(/\\\\(?:\s*\[[^\]]*\])?/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (rawLines.length === 0) return;

    // Descobrir o título da etapa caso esteja dentro de um .step-box ou .highlight-result
    const parentBox = mathDiv.closest(".step-box, .highlight-result");
    const stepTitleEl = parentBox ? parentBox.querySelector(".step-title, h3") : null;
    const stepTitle = stepTitleEl ? stepTitleEl.textContent.trim() : "";

    mathDiv.innerHTML = "";

    // Barra superior informando que cada linha é clicável + botão de expandir todas
    const toolbar = document.createElement("div");
    toolbar.className = "math-interactive-toolbar";
    toolbar.innerHTML = `
      <span class="math-interactive-hint">💡 <b>Dica interativa:</b> Clique em qualquer linha abaixo para abrir a explicação detalhada de como aquela passagem (MMC, distributiva, cortes) foi feita.</span>
      <button type="button" class="btn-expand-all-math">📖 Explicar Todas as Linhas</button>
    `;
    const expandAllBtn = toolbar.querySelector(".btn-expand-all-math");
    expandAllBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wrappers = mathDiv.querySelectorAll(".math-clickable-row-wrapper");
      const anyClosed = Array.from(wrappers).some(w => {
        const exp = w.querySelector(".math-line-explanation");
        return exp && !exp.classList.contains("open");
      });
      wrappers.forEach(w => {
        const lineEl = w.querySelector(".math-clickable-line");
        const expEl = w.querySelector(".math-line-explanation");
        const badgeEl = w.querySelector(".math-explain-badge");
        if (!lineEl || !expEl) return;
        if (anyClosed) {
          lineEl.classList.add("open");
          expEl.classList.add("open");
          if (badgeEl) {
            badgeEl.innerHTML = "🔼";
            badgeEl.title = "Clique para ocultar a explicação";
            badgeEl.setAttribute("data-tooltip", "Clique para ocultar a explicação");
          }
        } else {
          lineEl.classList.remove("open");
          expEl.classList.remove("open");
          if (badgeEl) {
            badgeEl.innerHTML = "🔍";
            badgeEl.title = "Clique para ver como foi feito";
            badgeEl.setAttribute("data-tooltip", "Clique para ver como foi feito");
          }
        }
      });
      expandAllBtn.innerHTML = anyClosed ? "📕 Recolher Explicações" : "📖 Explicar Todas as Linhas";
    });
    mathDiv.appendChild(toolbar);

    rawLines.forEach((rawLine, idx) => {
      const key = normalizeMathLineKey(rawLine);
      const registered = mathLineExplanations.get(key);
      const explainData = registered || buildFallbackLineExplanation(rawLine, idx, rawLines, stepTitle);

      // Formatar o LaTeX da linha individual removendo marcadores de alinhamento '&'
      const displayLatex = rawLine
        .replace(/&=/g, "=")
        .replace(/&\\implies/g, "\\implies")
        .replace(/&/g, "")
        .trim();

      const wrapper = document.createElement("div");
      wrapper.className = "math-clickable-row-wrapper";

      const lineRow = document.createElement("div");
      lineRow.className = "math-clickable-line";
      lineRow.title = "Clique para ver o passo a passo detalhado de como esta linha foi calculada";
      lineRow.innerHTML = `
        <div class="math-clickable-formula">$$${displayLatex}$$</div>
        <span class="math-explain-badge" title="Clique para ver como foi feito" data-tooltip="Clique para ver como foi feito">🔍</span>
      `;

      const explainPanel = document.createElement("div");
      explainPanel.className = "math-line-explanation";
      explainPanel.innerHTML = `
        <div class="explain-header">
          <span>📘 Passo ${idx + 1}: ${explainData.title}</span>
        </div>
        <div class="explain-body">${explainData.bodyHtml}</div>
      `;

      lineRow.addEventListener("click", () => {
        const isOpen = explainPanel.classList.toggle("open");
        lineRow.classList.toggle("open", isOpen);
        const badge = lineRow.querySelector(".math-explain-badge");
        if (badge) {
          badge.innerHTML = isOpen ? "🔼" : "🔍";
          const msg = isOpen ? "Clique para ocultar a explicação" : "Clique para ver como foi feito";
          badge.title = msg;
          badge.setAttribute("data-tooltip", msg);
        }
      });

      wrapper.appendChild(lineRow);
      wrapper.appendChild(explainPanel);
      mathDiv.appendChild(wrapper);
    });
  });
}

function renderMath(targetElement) {
  const el = targetElement || document.getElementById("memorialContainer");
  enhanceInteractiveMathDisplays(el);
  if (typeof renderMathInElement === "function") {
    renderMathInElement(el, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false
    });
  }
}

function activateDedicatedBuilderPage(isBuilderOnly) {
  const sec = document.getElementById("customBuilderSection");
  document.body.classList.toggle("dedicated-builder-page", !!isBuilderOnly);
  if (sec) {
    sec.style.display = isBuilderOnly ? "block" : "none";
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  if (isBuilderOnly) {
    renderBuilderCanvas();
  }
}

function abrirConstrutorLivre() {
  document.body.classList.remove("guide-page-active", "practice-page-active");
  document.body.classList.add("dedicated-builder-page");
  const guia = document.getElementById("guiaDidaticoSection");
  if (guia) guia.style.display = "none";
  const practice = document.getElementById("practiceSection");
  if (practice) practice.style.display = "none";
  const builder = document.getElementById("customBuilderSection");
  if (builder) builder.style.display = "block";
  window.location.hash = "criar-diagrama";
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderBuilderCanvas();
  setTimeout(() => {
    builderZoomFit();
  }, 80);
}

window.abrirConstrutorLivre = abrirConstrutorLivre;
window.abrirPaginaCriacaoDiagrama = abrirConstrutorLivre;
window.toggleDedicatedBuilder = function(show) {
  if (show) abrirConstrutorLivre();
  else voltarPaginaExemplos();
};

function voltarPaginaExemplos() {
  try {
    sessionStorage.removeItem("modo_diagrama_exclusivo");
  } catch (_) {}
  document.body.classList.remove("guide-page-active", "practice-page-active", "dedicated-builder-page");
  const guia = document.getElementById("guiaDidaticoSection");
  if (guia) guia.style.display = "none";
  const builder = document.getElementById("customBuilderSection");
  if (builder) builder.style.display = "none";
  const practice = document.getElementById("practiceSection");
  if (practice) practice.style.display = "none";
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  const sel = document.getElementById("presetSelect");
  if (sel && sel.value === "construtor_livre") {
    sel.value = "";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function voltarDaPratica() {
  voltarPaginaExemplos();
}

function abrirModoPratica() {
  document.body.classList.remove("guide-page-active", "dedicated-builder-page");
  document.body.classList.add("practice-page-active");
  const guia = document.getElementById("guiaDidaticoSection");
  if (guia) guia.style.display = "none";
  const builder = document.getElementById("customBuilderSection");
  if (builder) builder.style.display = "none";
  const practice = document.getElementById("practiceSection");
  if (practice) practice.style.display = "block";
  window.location.hash = "pratica";
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderPracticeLevel1();
  renderPracticeLevel2();
  renderPracticeLevel3();
}

function abrirPaginaGuiaDidatico() {
  document.body.classList.remove("dedicated-builder-page", "practice-page-active");
  document.body.classList.add("guide-page-active");
  const guia = document.getElementById("guiaDidaticoSection");
  if (guia) guia.style.display = "block";
  const builder = document.getElementById("customBuilderSection");
  if (builder) builder.style.display = "none";
  const practice = document.getElementById("practiceSection");
  if (practice) practice.style.display = "none";
  window.location.hash = "guia-didatico";
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderGuideContent();
}

function filterGuideTopic(topic, btn) {
  const tabs = document.querySelectorAll(".guide-tab-btn");
  tabs.forEach(t => t.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    tabs.forEach(t => {
      const oc = t.getAttribute("onclick") || "";
      if (oc.includes(`'${topic}'`)) t.classList.add("active");
    });
  }

  const cards = document.querySelectorAll(".guide-topic-card");
  cards.forEach(c => {
    if (topic === "todos" || c.getAttribute("data-topic") === topic) {
      c.style.display = "block";
    } else {
      c.style.display = "none";
    }
  });

  if (topic !== "todos") {
    const targetCard = document.querySelector(`.guide-topic-card[data-topic="${topic}"]`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

function guideArrowDefs() {
  return `
    <defs>
      <marker id="g-arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
      </marker>
      <marker id="g-arr-purp" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#a855f7" />
      </marker>
      <marker id="g-arr-green" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
      </marker>
      <marker id="g-arr-red" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
      </marker>
      <marker id="g-arr-amber" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#fbbf24" />
      </marker>
    </defs>
  `;
}

function handleQuizSelect(qId, selectedOption, isCorrect, explanationHtml) {
  const card = document.getElementById(`quizCard_${qId}`);
  if (!card) return;
  const buttons = card.querySelectorAll(".quiz-option-btn");
  buttons.forEach(b => {
    b.disabled = true;
  });

  const chosenBtn = card.querySelector(`[data-opt="${selectedOption}"]`);
  if (chosenBtn) {
    chosenBtn.classList.add(isCorrect ? "selected-correct" : "selected-wrong");
  }

  const feedback = card.querySelector(".quiz-feedback-box");
  if (feedback) {
    feedback.className = `quiz-feedback-box ${isCorrect ? 'correct' : 'wrong'}`;
    feedback.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px; font-size:0.86rem;">
        ${isCorrect ? '✅ Resposta Correta!' : '❌ Resposta Incorreta — Análise da Pegadinha:'}
      </div>
      <div>${explanationHtml}</div>
    `;
    renderMath(feedback);
  }
}

function renderGuideContent() {
  const container = document.getElementById("guideContentContainer");
  if (!container) return;

  const defs = guideArrowDefs();

  container.innerHTML = `
    <!-- Trilha / Roteiro Visual de Aprendizagem Progressiva -->
    <div class="guide-stepper-trail">
      <div class="guide-step-pill" onclick="filterGuideTopic('componentes')"><span class="step-num">1</span> Componentes & Sinais</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('ft_laplace')"><span class="step-num">2</span> Função de Transferência</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('cascata')"><span class="step-num">3</span> Cascata & Contra-exemplos</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('paralelo')"><span class="step-num">4</span> Paralelo & Contra-exemplos</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('malha_fechada')"><span class="step-num">5</span> Malha Fechada & Dedução</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('movendo_blocos')"><span class="step-num">6</span> Movendo Blocos & Nós</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('estrategia')"><span class="step-num">7</span> Estratégia de Redução</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('matematica_base')"><span class="step-num">8</span> Álgebra & MMC</div>
      <div class="guide-step-pill" onclick="filterGuideTopic('quiz_fixacao')"><span class="step-num">9</span> Quiz de Fixação</div>
    </div>

    <!-- Tópico 1: Componentes Básicos -->
    <div class="guide-topic-card" data-topic="componentes">
      <div class="guide-topic-title">
        <span>1. Componentes Básicos em Diagramas de Blocos</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Identificar formalmente os 4 componentes elementares da modelagem por diagramas de blocos, suas equações nodais e o sentido estrito e unívoco de causalidade na propagação de sinais.
        </div>
        <p>Um diagrama de blocos de um sistema linear invariante no tempo (SLIT) expressa graficamente as relações de causa e efeito entre variáveis no domínio complexo de Laplace ($s$). Os quatro elementos fundamentais são representados abaixo:</p>

        <div class="components-grid">
          <!-- Componente A: Sinais -->
          <div class="component-card">
            <div class="component-card-title">
              <span>(a) Sinais / Variáveis</span>
            </div>
            <div class="component-svg-box">
              <svg viewBox="0 0 240 60">
                ${defs}
                <line x1="20" y1="35" x2="105" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="60" y="24" fill="#94a3b8" font-size="11" text-anchor="middle">R(s) [Entrada]</text>
                <line x1="140" y1="35" x2="225" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="180" y="24" fill="#94a3b8" font-size="11" text-anchor="middle">C(s) [Saída]</text>
              </svg>
            </div>
            <div class="component-card-desc">
              Linha orientada com seta representando uma variável física no domínio de Laplace. A seta indica o sentido unívoco do fluxo de informação.
            </div>
            <div class="component-card-eq">
              $$R(s) = \\mathcal{L}\\{r(t)\\}, \\quad C(s) = \\mathcal{L}\\{c(t)\\}$$
            </div>
          </div>

          <!-- Componente B: Bloco Funcional -->
          <div class="component-card">
            <div class="component-card-title">
              <span>(b) Bloco Funcional (Sistema)</span>
            </div>
            <div class="component-svg-box">
              <svg viewBox="0 0 240 70">
                ${defs}
                <line x1="15" y1="38" x2="72" y2="38" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="42" y="27" fill="#94a3b8" font-size="10.5" text-anchor="middle">R(s) [Input]</text>
                <rect x="72" y="16" width="96" height="44" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                <text x="120" y="43" fill="#f8fafc" font-size="13" font-weight="bold" text-anchor="middle">G(s)</text>
                <line x1="168" y1="38" x2="228" y2="38" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="200" y="27" fill="#94a3b8" font-size="10.5" text-anchor="middle">C(s) [Output]</text>
              </svg>
            </div>
            <div class="component-card-desc">
              Elemento operacional que relaciona a transformada de Laplace da saída à entrada sob condições iniciais nulas: $C(s) = G(s) \\cdot R(s)$.
            </div>
            <div class="component-card-eq">
              $$G(s) = \\frac{C(s)}{R(s)} \\implies C(s) = G(s) \\cdot R(s)$$
            </div>
          </div>

          <!-- Componente C: Ponto de Soma -->
          <div class="component-card">
            <div class="component-card-title">
              <span>(c) Ponto de Soma (Summing Junction)</span>
            </div>
            <div class="component-svg-box">
              <svg viewBox="0 0 240 90">
                ${defs}
                <line x1="15" y1="45" x2="75" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="36" y="35" fill="#94a3b8" font-size="10">R₁(s)</text>
                <text x="75" y="38" fill="#38bdf8" font-size="11">+</text>

                <line x1="38" y1="80" x2="78" y2="57" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="28" y="84" fill="#94a3b8" font-size="10">R₂(s)</text>
                <text x="74" y="69" fill="#38bdf8" font-size="11">+</text>

                <line x1="94" y1="85" x2="94" y2="61" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="104" y="83" fill="#94a3b8" font-size="10">R₃(s)</text>
                <text x="100" y="67" fill="#ef4444" font-size="11">-</text>

                <circle cx="94" cy="45" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
                <line x1="84" y1="35" x2="104" y2="55" stroke="#38bdf8" stroke-width="1.5" />
                <line x1="84" y1="55" x2="104" y2="35" stroke="#38bdf8" stroke-width="1.5" />

                <line x1="108" y1="45" x2="228" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="168" y="35" fill="#38bdf8" font-size="9.5" font-weight="bold">C(s)</text>
              </svg>
            </div>
            <div class="component-card-desc">
              Círculo com indicação algébrica de sinais (+ ou -). A saída é a soma linear algébrica de todas as grandezas de entrada.
            </div>
            <div class="component-card-eq">
              $$C(s) = R_1(s) + R_2(s) - R_3(s)$$
            </div>
          </div>

          <!-- Componente D: Ponto de Ramificação -->
          <div class="component-card">
            <div class="component-card-title">
              <span>(d) Ponto de Ramificação (Pickoff)</span>
            </div>
            <div class="component-svg-box">
              <svg viewBox="0 0 240 85">
                ${defs}
                <line x1="15" y1="42" x2="80" y2="42" stroke="#38bdf8" stroke-width="2" />
                <text x="42" y="32" fill="#94a3b8" font-size="10.5" text-anchor="middle">R(s)</text>
                <circle cx="80" cy="42" r="4" fill="#38bdf8" />

                <line x1="80" y1="42" x2="80" y2="15" stroke="#38bdf8" stroke-width="2" />
                <line x1="80" y1="15" x2="220" y2="15" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="150" y="10" fill="#94a3b8" font-size="10">R(s) [Ramo 1]</text>

                <line x1="80" y1="42" x2="220" y2="42" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="150" y="36" fill="#94a3b8" font-size="10">R(s) [Ramo 2]</text>

                <line x1="80" y1="42" x2="80" y2="70" stroke="#38bdf8" stroke-width="2" />
                <line x1="80" y1="70" x2="220" y2="70" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                <text x="150" y="64" fill="#94a3b8" font-size="10">R(s) [Ramo 3]</text>
              </svg>
            </div>
            <div class="component-card-desc">
              Ponto onde o mesmo sinal é distribuído concomitantemente para múltiplos caminhos paralelos ou malhas de retorno sem atenuação.
            </div>
            <div class="component-card-eq">
              $$\\text{Todos os ramos derivados} = R(s)$$
            </div>
          </div>
        </div>

        <div class="guide-conditions-box">
          <strong>⚠️ Condição Fundamental de Desacoplamento (Hipótese de Não-Carga):</strong> O diagrama de blocos representa equações matemáticas unívocas. Na engenharia real, dois subsistemas físicos (ex.: circuitos passivos RC) só podem ser ligados diretamente como blocos se houver um circuito amplificador de isolamento (buffer com impedância de entrada infinita) entre eles, impedindo que o bloco seguinte carregue ou altere a dinâmica do bloco anterior.
        </div>
      </div>
    </div>

    <!-- Tópico 2: Função de Transferência e Interpretação Física -->
    <div class="guide-topic-card" data-topic="ft_laplace">
      <div class="guide-topic-title">
        <span>2. Função de Transferência & Interpretação Física</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Compreender a definição formal de Função de Transferência como razão entre saída e entrada no domínio de Laplace com condições iniciais nulas, sua extração a partir de EDOs e o significado físico de pólos e zeros.
        </div>
        <p>A <b>Função de Transferência</b> $G(s)$ é o modelo matemático canônico da Engenharia de Controle para sistemas lineares e invariantes no tempo (SLIT). Ela mapeia a relação direta entre uma causa (sinal de entrada $R(s)$) e seu efeito (sinal de saída $C(s)$):</p>

        <div class="model-diagram-card">
          <div class="model-diagram-header">Mapeamento EDO no Tempo $\longleftrightarrow$ Álgebra de Laplace $\longleftrightarrow$ Bloco Funcional</div>
          <div class="guide-svg-box">
            <svg viewBox="0 0 620 110">
              ${defs}
              <!-- Bloco EDO -->
              <rect x="15" y="15" width="180" height="80" rx="6" fill="#0d1525" stroke="#1e293b" stroke-width="1.5" />
              <text x="105" y="38" fill="#38bdf8" font-size="11" font-weight="bold" text-anchor="middle">Equação Diferencial (Tempo)</text>
              <text x="105" y="60" fill="#cbd5e1" font-size="9.5" text-anchor="middle">a₂ c''(t) + a₁ c'(t) + a₀ c(t) =</text>
              <text x="105" y="78" fill="#cbd5e1" font-size="9.5" text-anchor="middle">= b₁ r'(t) + b₀ r(t)</text>

              <line x1="195" y1="55" x2="255" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="225" y="45" fill="#a855f7" font-size="9" text-anchor="middle">ℒ { C.I. = 0 }</text>

              <!-- Bloco Laplace -->
              <rect x="255" y="15" width="350" height="80" rx="6" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="430" y="38" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle">Função de Transferência Racional G(s)</text>
              <text x="430" y="62" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G(s) = C(s) / R(s) = (b₁s + b₀) / (a₂s² + a₁s + a₀)</text>
              <text x="430" y="82" fill="#94a3b8" font-size="9.5" text-anchor="middle">Pólos: Raízes do Denominador | Zeros: Raízes do Numerador</text>
            </svg>
          </div>
        </div>

        <div class="guide-formula-box">
          <b>Definição Formal e Propriedades Relevantes:</b>
          $$G(s) = \\frac{\\mathcal{L}\\{c(t)\\}}{\\mathcal{L}\\{r(t)\\}}\\Bigg|_{\\text{todas as condições iniciais } = 0} = \\frac{N(s)}{D(s)} = K \\frac{(s - z_1)(s - z_2)\\dots(s - z_m)}{(s - p_1)(s - p_2)\\dots(s - p_n)}$$
          <ul>
            <li><b>Pólos ($p_i$):</b> Raízes de $D(s)=0$. Determinam a <i>estabilidade</i> (todos devem ter parte real negativa $\\text{Re}(p_i) < 0$) e a velocidade dos modos transitórios naturais do sistema.</li>
            <li><b>Zeros ($z_i$):</b> Raízes de $N(s)=0$. Afetam as amplitudes relativas dos modos e o sobressinal (overshoot) da resposta temporal.</li>
            <li><b>Ganho Estático (DC Gain):</b> Avaliado em $s = 0$ ($G(0)$), representa a amplificação do sistema em regime permanente para uma entrada constante em degrau.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tópico 3: Cascata (Série) -->
    <div class="guide-topic-card" data-topic="cascata">
      <div class="guide-topic-title">
        <span>3. Formato em Cascata (Série)</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Dominar a regra do produto em série $G_{\\text{eq}}(s) = \\prod G_i(s)$, identificar suas condições exatas de aplicação e reconhecer por que derivações intermediárias proíbem a fusão direta de blocos.
        </div>
        <p>A associação em cascata (ou série) ocorre quando a saída de um subsistema linear alimenta diretamente e com exclusividade a entrada do subsistema seguinte, sem pontos de bifurcação intermediários.</p>

        <div class="guide-conditions-box">
          <strong>Condições Necessárias para Aplicação da Regra de Cascata:</strong>
          <ol style="margin: 4px 0 0 18px;">
            <li>A saída do primeiro bloco $G_1(s)$ deve ser a entrada exclusiva e integral do segundo bloco $G_2(s)$.</li>
            <li>Não pode haver <b>nenhum ponto de ramificação</b> retirando sinal entre $G_1(s)$ e $G_2(s)$.</li>
            <li>Não pode haver <b>nenhum ponto de soma</b> injetando outros sinais entre $G_1(s)$ e $G_2(s)$.</li>
          </ol>
        </div>

        <!-- Modelo Visual (a): Três blocos em série -->
        <div class="model-diagram-card">
          <div class="model-diagram-header">Modelo (a): Três Subsistemas Lineares em Série (Configuração Original)</div>
          <div class="model-diagram-subtext">Propagação unívoca de sinais intermediários:</div>
          <div class="guide-svg-box">
            <svg viewBox="0 0 650 95">
              ${defs}
              <line x1="15" y1="50" x2="65" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="35" y="38" fill="#94a3b8" font-size="11">R(s)</text>

              <rect x="65" y="28" width="80" height="44" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="105" y="55" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₁(s)</text>

              <line x1="145" y1="50" x2="245" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="195" y="36" fill="#38bdf8" font-size="9.5" text-anchor="middle">X₂(s) = G₁(s)R(s)</text>

              <rect x="245" y="28" width="80" height="44" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="285" y="55" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₂(s)</text>

              <line x1="325" y1="50" x2="445" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="385" y="36" fill="#38bdf8" font-size="9.5" text-anchor="middle">X₁(s) = G₂G₁R(s)</text>

              <rect x="445" y="28" width="80" height="44" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="485" y="55" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₃(s)</text>

              <line x1="525" y1="50" x2="635" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="580" y="36" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">C(s) = G₃G₂G₁R(s)</text>
            </svg>
          </div>
        </div>

        <!-- Modelo Visual (b): Bloco Equivalente -->
        <div class="model-diagram-card">
          <div class="model-diagram-header">Modelo (b): Bloco Único Equivalente Reduzido (Configuração Equivalente)</div>
          <div class="guide-svg-box">
            <svg viewBox="0 0 450 75">
              ${defs}
              <line x1="20" y1="40" x2="95" y2="40" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="50" y="28" fill="#94a3b8" font-size="11">R(s)</text>
              <rect x="95" y="18" width="230" height="44" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="210" y="45" fill="#38bdf8" font-size="13" font-weight="bold" text-anchor="middle">G₃(s) · G₂(s) · G₁(s)</text>
              <line x1="325" y1="40" x2="425" y2="40" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="375" y="28" fill="#10b981" font-size="11" font-weight="bold">C(s)</text>
            </svg>
          </div>
        </div>

        <div class="guide-formula-box">
          <b>Dedução Matemática Completa:</b>
          $$X_2(s) = G_1(s) \\cdot R(s)$$
          $$X_1(s) = G_2(s) \\cdot X_2(s) = G_2(s) \\cdot [G_1(s) \\cdot R(s)] = [G_2(s) G_1(s)] \\cdot R(s)$$
          $$C(s) = G_3(s) \\cdot X_1(s) = G_3(s) \\cdot [G_2(s) G_1(s) \\cdot R(s)] = [G_3(s) G_2(s) G_1(s)] \\cdot R(s)$$
          $$\\mathbf{G_{\\text{eq}}(s) = \\frac{C(s)}{R(s)} = \\prod_{i=1}^{n} G_i(s) = G_3(s) \\cdot G_2(s) \\cdot G_1(s)}$$
        </div>

        <!-- Contra-Exemplo: Cascata Incorreta com Ramificação Intermediária -->
        <div class="guide-counterexample-box">
          <strong>❌ CONTRA-EXEMPLO E ARMADILHA CLÁSSICA (Quando NÃO aplicar Cascata):</strong>
          <p style="margin: 6px 0;">Observe o diagrama abaixo onde existe um ponto de ramificação retirando o sinal $X(s)$ entre $G_1(s)$ e $G_2(s)$:</p>
          <div class="guide-svg-box" style="background:#0a0812; border-color:rgba(239, 68, 68, 0.4);">
            <svg viewBox="0 0 520 100">
              ${defs}
              <line x1="15" y1="50" x2="65" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="35" y="38" fill="#94a3b8" font-size="10.5">R(s)</text>

              <rect x="65" y="28" width="75" height="44" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="102" y="55" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₁(s)</text>

              <line x1="140" y1="50" x2="220" y2="50" stroke="#38bdf8" stroke-width="2" />
              <circle cx="220" cy="50" r="5" fill="#ef4444" stroke="#fff" stroke-width="1.5" />

              <!-- Ramo intermediário que quebra a cascata -->
              <line x1="220" y1="50" x2="220" y2="15" stroke="#ef4444" stroke-width="2.5" />
              <line x1="220" y1="15" x2="330" y2="15" stroke="#ef4444" stroke-width="2.5" marker-end="url(#g-arr-red)" />
              <text x="345" y="19" fill="#f87171" font-size="10" font-weight="bold">X(s) [Ramificação Intermediária!]</text>

              <line x1="220" y1="50" x2="300" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />

              <rect x="300" y="28" width="75" height="44" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="337" y="55" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₂(s)</text>

              <line x1="375" y1="50" x2="470" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="430" y="40" fill="#10b981" font-size="11" font-weight="bold">C(s)</text>
            </svg>
          </div>
          <div style="font-size:0.8rem; margin-top:6px;">
            <b>Por que é proibido multiplicar $G_1 \\cdot G_2$ diretamente?</b><br>
            Se você fundir $G_1$ e $G_2$ em um único bloco, o nó intermediário onde $X(s)$ é derivado deixa de existir! O sinal no ramo superior vale $X(s) = G_1(s) \\cdot R(s)$. Se substituíssemos por $G_1 G_2$, de onde sairia o sinal $X(s)$?
            <br><b>Ação Correta:</b> Antes de aplicar a regra da cascata, é estritamente obrigatório transpor o ponto de ramificação (movendo-o para antes de $G_1$ ou para depois de $G_2$, aplicando o respectivo ganho compensador).
          </div>
        </div>
      </div>
    </div>

    <!-- Tópico 4: Paralelo -->
    <div class="guide-topic-card" data-topic="paralelo">
      <div class="guide-topic-title">
        <span>4. Formato em Paralelo</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Identificar subsistemas excitados concorrentemente pela mesma entrada e somados no mesmo ponto, aplicando a propriedade distributiva linear e distinguindo linhas visualmente paralelas de paralelos verdadeiros.
        </div>
        <p>A associação em paralelo ocorre quando a mesma referência de entrada $R(s)$ excita simultaneamente múltiplos caminhos independentes e suas saídas convergem para um mesmo ponto de soma.</p>

        <div class="guide-conditions-box">
          <strong>Condições Necessárias para Aplicação da Regra de Paralelo:</strong>
          <ol style="margin: 4px 0 0 18px;">
            <li>Todos os ramos devem originar-se <b>do mesmo nó de ramificação</b> (mesmo sinal exato de entrada $R(s)$).</li>
            <li>Todos os ramos devem convergir e terminar nas entradas <b>do mesmo ponto de soma</b>.</li>
            <li>Nenhum dos ramos pode conter nós intermediários que acoplem a outros laços do diagrama.</li>
          </ol>
        </div>

        <!-- Modelo Visual (a): 3 Ramos Paralelos -->
        <div class="model-diagram-card">
          <div class="model-diagram-header">Modelo (a): Três Ramos em Paralelo com Somador Algébrico (Configuração Original)</div>
          <div class="guide-svg-box">
            <svg viewBox="0 0 550 170">
              ${defs}
              <line x1="20" y1="85" x2="90" y2="85" stroke="#38bdf8" stroke-width="2" />
              <text x="45" y="75" fill="#94a3b8" font-size="11">R(s)</text>
              <circle cx="90" cy="85" r="4" fill="#38bdf8" />

              <!-- Ramo 1 -->
              <line x1="90" y1="85" x2="90" y2="35" stroke="#38bdf8" stroke-width="2" />
              <line x1="90" y1="35" x2="160" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <rect x="160" y="15" width="85" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="202" y="40" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₁(s)</text>
              <line x1="245" y1="35" x2="350" y2="35" stroke="#38bdf8" stroke-width="2" />
              <line x1="350" y1="35" x2="350" y2="68" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="295" y="25" fill="#94a3b8" font-size="9.5">X₁ = R·G₁</text>
              <text x="358" y="62" fill="#38bdf8" font-size="11">±</text>

              <!-- Ramo 2 -->
              <line x1="90" y1="85" x2="160" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <rect x="160" y="65" width="85" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="202" y="90" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₂(s)</text>
              <line x1="245" y1="85" x2="334" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="290" y="78" fill="#94a3b8" font-size="9.5">X₂ = R·G₂</text>
              <text x="325" y="80" fill="#38bdf8" font-size="11">±</text>

              <!-- Ramo 3 -->
              <line x1="90" y1="85" x2="90" y2="135" stroke="#38bdf8" stroke-width="2" />
              <line x1="90" y1="135" x2="160" y2="135" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <rect x="160" y="115" width="85" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="202" y="140" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">G₃(s)</text>
              <line x1="245" y1="135" x2="350" y2="135" stroke="#38bdf8" stroke-width="2" />
              <line x1="350" y1="135" x2="350" y2="102" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="295" y="150" fill="#94a3b8" font-size="9.5">X₃ = R·G₃</text>
              <text x="358" y="118" fill="#38bdf8" font-size="11">±</text>

              <!-- Somador central -->
              <circle cx="350" cy="85" r="16" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
              <line x1="339" y1="74" x2="361" y2="96" stroke="#38bdf8" stroke-width="1.5" />
              <line x1="339" y1="96" x2="361" y2="74" stroke="#38bdf8" stroke-width="1.5" />

              <line x1="366" y1="85" x2="520" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="440" y="75" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">C(s) = [±G₁ ±G₂ ±G₃]R(s)</text>
            </svg>
          </div>
        </div>

        <!-- Modelo Visual (b): Bloco Equivalente -->
        <div class="model-diagram-card">
          <div class="model-diagram-header">Modelo (b): Bloco Único Equivalente Reduzido (Configuração Equivalente)</div>
          <div class="guide-svg-box">
            <svg viewBox="0 0 450 75">
              ${defs}
              <line x1="20" y1="40" x2="95" y2="40" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="50" y="28" fill="#94a3b8" font-size="11">R(s)</text>
              <rect x="95" y="18" width="230" height="44" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="210" y="45" fill="#38bdf8" font-size="13" font-weight="bold" text-anchor="middle">± G₁(s) ± G₂(s) ± G₃(s)</text>
              <line x1="325" y1="40" x2="425" y2="40" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="375" y="28" fill="#10b981" font-size="11" font-weight="bold">C(s)</text>
            </svg>
          </div>
        </div>

        <div class="guide-formula-box">
          <b>Dedução Matemática Completa:</b>
          $$C(s) = \\pm X_1(s) \\pm X_2(s) \\pm X_3(s) = \\pm [G_1(s) \\cdot R(s)] \\pm [G_2(s) \\cdot R(s)] \\pm [G_3(s) \\cdot R(s)]$$
          Pela propriedade distributiva da multiplicação sobre a adição no corpo complexo:
          $$C(s) = [\\pm G_1(s) \\pm G_2(s) \\pm G_3(s)] \\cdot R(s)$$
          $$\\mathbf{G_{\\text{eq}}(s) = \\frac{C(s)}{R(s)} = \\pm G_1(s) \\pm G_2(s) \\pm G_3(s)}$$
        </div>

        <!-- Contra-Exemplo: Paralelo Inválido com Entradas Distintas -->
        <div class="guide-counterexample-box">
          <strong>❌ CONTRA-EXEMPLO E ARMADILHA CLÁSSICA (Quando NÃO aplicar Paralelo):</strong>
          <p style="margin: 6px 0;">Dois blocos desenhados um sobre o outro NÃO formam uma associação paralela se não receberem rigorosamente o mesmo sinal de entrada:</p>
          <div class="guide-svg-box" style="background:#0a0812; border-color:rgba(239, 68, 68, 0.4);">
            <svg viewBox="0 0 520 120">
              ${defs}
              <!-- Ramo 1 de R(s) -->
              <line x1="20" y1="40" x2="120" y2="40" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="60" y="30" fill="#38bdf8" font-size="10.5">R(s)</text>
              <rect x="120" y="22" width="70" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="155" y="44" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G₁(s)</text>

              <!-- Ramo 2 de W(s) (entrada diferente) -->
              <line x1="20" y1="90" x2="120" y2="90" stroke="#ef4444" stroke-width="2" marker-end="url(#g-arr-red)" />
              <text x="60" y="82" fill="#ef4444" font-size="10.5" font-weight="bold">W(s) [Sinal Diferente!]</text>
              <rect x="120" y="72" width="70" height="36" rx="4" fill="#050811" stroke="#ef4444" stroke-width="2" />
              <text x="155" y="94" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G₂(s)</text>

              <line x1="190" y1="40" x2="270" y2="40" stroke="#38bdf8" stroke-width="2" />
              <line x1="270" y1="40" x2="270" y2="54" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />

              <line x1="190" y1="90" x2="270" y2="90" stroke="#ef4444" stroke-width="2" />
              <line x1="270" y1="90" x2="270" y2="76" stroke="#ef4444" stroke-width="2" marker-end="url(#g-arr-red)" />

              <circle cx="270" cy="65" r="12" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
              <line x1="282" y1="65" x2="400" y2="65" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="340" y="55" fill="#10b981" font-size="10.5" font-weight="bold">C = G₁R + G₂W</text>
            </svg>
          </div>
          <div style="font-size:0.8rem; margin-top:6px;">
            <b>Conclusão:</b> $C(s) = G_1(s)R(s) + G_2(s)W(s)$. Como $R(s) \\neq W(s)$, é matematicamente impossível colocar $R(s)$ em evidência para obter $(G_1 + G_2)R(s)$. <b>Nunca associe blocos em paralelo se a entrada não for exatamente o mesmo nó!</b>
          </div>
        </div>
      </div>
    </div>

    <!-- Tópico 5: Malha Fechada (MF) -->
    <div class="guide-topic-card" data-topic="malha_fechada">
      <div class="guide-topic-title">
        <span>5. Formato Canônico em Malha Fechada (Feedback)</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Dominar a estrutura canônica de malha fechada com realimentação, deduzir algebricamente a fórmula $T(s) = \\frac{G(s)}{1 \\pm G(s)H(s)}$ em 6 etapas e justificar a inversão de sinal no denominador.
        </div>
        <p>O formato canônico de malha fechada representa o paradigma fundamental do controle com realimentação: a saída $C(s)$ é monitorada pelo sensor $H(s)$, comparada à referência $R(s)$ no ponto de soma e o erro resultante $E(s)$ aciona a planta $G(s)$.</p>

        <div class="guide-conditions-box">
          <strong>Condições Necessárias para Aplicação da Fórmula Canônica:</strong>
          <ol style="margin: 4px 0 0 18px;">
            <li>Deve existir um ponto de soma com sinal de entrada $R(s)$ e retorno $B(s)$.</li>
            <li>O caminho direto $G(s)$ deve estender-se sem derivações internas do somador até o nó de saída $C(s)$.</li>
            <li>O ramo de retorno $H(s)$ deve partir da saída $C(s)$ e fechar diretamente no somador de erro.</li>
            <li>Nenhum outro sinal externo pode ser injetado no interior do laço sem prévia superposição ou transposição.</li>
          </ol>
        </div>

        <!-- Modelo Visual (a): Malha Fechada Canônica -->
        <div class="model-diagram-card">
          <div class="model-diagram-header">Modelo (a): Sistema Canônico de Controle com Realimentação (Configuração Original)</div>
          <div class="guide-svg-box">
            <svg viewBox="0 0 540 180">
              ${defs}
              <line x1="20" y1="65" x2="85" y2="65" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="45" y="55" fill="#94a3b8" font-size="11">R(s) [Input]</text>

              <circle cx="100" cy="65" r="15" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
              <text x="88" y="62" fill="#38bdf8" font-size="11">+</text>
              <text x="96" y="80" fill="#ef4444" font-size="12" font-weight="bold">∓</text>

              <line x1="115" y1="65" x2="195" y2="65" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="155" y="55" fill="#fbbf24" font-size="10.5" font-weight="bold">E(s) [Erro]</text>

              <rect x="195" y="43" width="95" height="44" rx="5" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="242" y="70" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">G(s)</text>
              <text x="242" y="34" fill="#94a3b8" font-size="9.5" text-anchor="middle">Planta / Controlador</text>

              <line x1="290" y1="65" x2="490" y2="65" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="450" y="55" fill="#10b981" font-size="11" font-weight="bold">C(s) [Output]</text>

              <circle cx="380" cy="65" r="4" fill="#38bdf8" />
              <line x1="380" y1="65" x2="380" y2="135" stroke="#38bdf8" stroke-width="2" />
              <line x1="380" y1="135" x2="290" y2="135" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />

              <rect x="195" y="113" width="95" height="44" rx="5" fill="#050811" stroke="#a855f7" stroke-width="2" />
              <text x="242" y="140" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">H(s)</text>
              <text x="242" y="172" fill="#94a3b8" font-size="9.5" text-anchor="middle">Sensor / Feedback</text>

              <line x1="195" y1="135" x2="100" y2="135" stroke="#38bdf8" stroke-width="2" />
              <line x1="100" y1="135" x2="100" y2="82" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
            </svg>
          </div>
        </div>

        <!-- Modelo Visual (b): Bloco Equivalente Canônico -->
        <div class="model-diagram-card">
          <div class="model-diagram-header">Modelo (b): Bloco Equivalente Canônico em Malha Fechada (Configuração Equivalente)</div>
          <div class="guide-svg-box">
            <svg viewBox="0 0 450 85">
              ${defs}
              <line x1="20" y1="45" x2="95" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="50" y="32" fill="#94a3b8" font-size="11">R(s) [Input]</text>
              <rect x="95" y="15" width="225" height="58" rx="6" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="207" y="38" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">G(s)</text>
              <line x1="120" y1="45" x2="295" y2="45" stroke="#64748b" stroke-width="1.5" />
              <text x="207" y="62" fill="#38bdf8" font-size="13" font-weight="bold" text-anchor="middle">1 ± G(s)H(s)</text>
              <line x1="320" y1="45" x2="420" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="370" y="32" fill="#10b981" font-size="11" font-weight="bold">C(s) [Output]</text>
            </svg>
          </div>
        </div>

        <div class="guide-formula-box">
          <b>Dedução Analítica Rigorosa em 6 Passos Fundamentais:</b>
          <ol style="margin: 6px 0 6px 20px;">
            <li><b>Equação do sinal atuante de erro no somador:</b>
              $$E(s) = R(s) \\mp B(s)$$
            </li>
            <li><b>Relação de realimentação captada pelo sensor:</b>
              $$B(s) = H(s) \\cdot C(s)$$
            </li>
            <li><b>Relação de propagação direta através da planta:</b>
              $$C(s) = G(s) \\cdot E(s)$$
            </li>
            <li><b>Substituição de [1] e [2] na relação da planta [3]:</b>
              $$C(s) = G(s) \\cdot [R(s) \\mp H(s) \\cdot C(s)] = G(s) R(s) \\mp G(s) H(s) C(s)$$
            </li>
            <li><b>Agrupamento dos termos dependentes da saída $C(s)$ no membro esquerdo:</b>
              $$C(s) \\pm G(s) H(s) C(s) = G(s) R(s)$$
            </li>
            <li><b>Fatoração de $C(s)$ em evidência e isolamento da razão $\\frac{C(s)}{R(s)}$:</b>
              $$C(s) \\cdot [1 \\pm G(s) H(s)] = G(s) R(s) \\implies \\mathbf{T(s) = \\frac{C(s)}{R(s)} = \\frac{G(s)}{1 \\pm G(s) H(s)}}$$
            </li>
          </ol>
        </div>

        <div class="rule-explanation-box" style="margin-top:12px;">
          <b>🎯 Por que o sinal de realimentação negativa (–) gera sinal POSITIVO (+) no denominador?</b><br>
          Na realimentação negativa, o somador opera como $E(s) = R(s) - B(s) = R(s) - H(s)C(s)$. Ao distribuir a planta $G(s)$, obtemos o termo $-G(s)H(s)C(s)$. Para isolar $C(s)$, esse termo é transposto para o primeiro membro da equação, onde a operação inversa da subtração é a <b>adição</b> ($+G(s)H(s)C(s)$), gerando o fator $[1 + G(s)H(s)]$.
          <br>• <b>Realimentação Negativa (– no somador):</b> Denominador <b>$1 + G(s)H(s)$</b> (estabiliza o sistema e reduz o erro de regime).
          <br>• <b>Realimentação Positiva (+ no somador):</b> Denominador <b>$1 - G(s)H(s)$</b> (tende a desestabilizar ou criar oscilador autônomo).
        </div>

        <!-- Contra-Exemplo: Malha Fechada Não-Canônica -->
        <div class="guide-counterexample-box">
          <strong>❌ CONTRA-EXEMPLO E ARMADILHA CLÁSSICA (Quando NÃO aplicar a Fórmula Canônica Diretamente):</strong>
          <p style="margin: 6px 0;">Se existir um ponto de ramificação derivando sinal ou um ponto de soma secundário <i>dentro</i> do laço direto ou de retorno, a fórmula direta $\\frac{G}{1 \\pm GH}$ é <b>inválida</b> sem prévia transposição:</p>
          <div class="guide-svg-box" style="background:#0a0812; border-color:rgba(239, 68, 68, 0.4);">
            <svg viewBox="0 0 520 120">
              ${defs}
              <line x1="20" y1="50" x2="70" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <circle cx="85" cy="50" r="12" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
              <line x1="97" y1="50" x2="160" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <rect x="160" y="32" width="60" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="190" y="54" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G₁(s)</text>

              <!-- Ponto de derivação intermediário no meio do laço direto! -->
              <line x1="220" y1="50" x2="270" y2="50" stroke="#38bdf8" stroke-width="2" />
              <circle cx="270" cy="50" r="5" fill="#ef4444" stroke="#fff" stroke-width="1.5" />
              <line x1="270" y1="50" x2="270" y2="15" stroke="#ef4444" stroke-width="2" />
              <line x1="270" y1="15" x2="380" y2="15" stroke="#ef4444" stroke-width="2" marker-end="url(#g-arr-red)" />
              <text x="395" y="19" fill="#f87171" font-size="9.5" font-weight="bold">Y(s) [Ramificação Externa no Meio do Laço!]</text>

              <line x1="270" y1="50" x2="330" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <rect x="330" y="32" width="60" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
              <text x="360" y="54" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G₂(s)</text>

              <line x1="390" y1="50" x2="480" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
              <text x="440" y="40" fill="#10b981" font-size="11" font-weight="bold">C(s)</text>

              <circle cx="420" cy="50" r="4" fill="#38bdf8" />
              <line x1="420" y1="50" x2="420" y2="100" stroke="#38bdf8" stroke-width="2" />
              <line x1="420" y1="100" x2="85" y2="100" stroke="#38bdf8" stroke-width="2" />
              <line x1="85" y1="100" x2="85" y2="64" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
            </svg>
          </div>
          <div style="font-size:0.8rem; margin-top:6px;">
            <b>Motivo:</b> Como o nó entre $G_1$ e $G_2$ alimenta uma terceira variável $Y(s)$, você <b>não pode</b> considerar o caminho direto como $G_1 G_2$ e fechar a malha diretamente. É necessário transpor a ramificação para depois de $G_2$ (com bloco compensador $1/G_2$) para liberar a malha canônica.
          </div>
        </div>
      </div>
    </div>

    <!-- Tópico 6: Movendo Blocos e Ramificações -->
    <div class="guide-topic-card" data-topic="movendo_blocos">
      <div class="guide-topic-title">
        <span>6. Movendo Blocos e Ramificações (Regras de Transposição Equivalente)</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Dominar as 4 regras fundamentais de transposição de nós de ramificação e pontos de soma através de blocos, preservando com exatidão os sinais nodais em todas as ramificações.
        </div>
        <p>A simplificação de diagramas com malhas entrelaçadas exige a movimentação estratégica de blocos e nós de derivação. Toda transposição deve preservar estritamente os sinais matemáticos de saída:</p>

        <!-- Regra 1: Mover Ramificação para DEPOIS do Bloco -->
        <div class="rule-comparison-card">
          <div class="rule-comparison-header">
            <span>Regra 1: Mover Ponto de Ramificação para DEPOIS de um Bloco G(s)</span>
          </div>
          <div class="rule-comparison-grid">
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Original (Antes)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 110">
                  ${defs}
                  <line x1="15" y1="55" x2="70" y2="55" stroke="#38bdf8" stroke-width="2" />
                  <text x="40" y="45" fill="#94a3b8" font-size="11">R(s)</text>
                  <circle cx="70" cy="55" r="4" fill="#38bdf8" />
                  
                  <line x1="70" y1="55" x2="70" y2="25" stroke="#38bdf8" stroke-width="2" />
                  <line x1="70" y1="25" x2="110" y2="25" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <rect x="110" y="8" width="65" height="34" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="142" y="30" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G(s)</text>
                  <line x1="175" y1="25" x2="265" y2="25" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="220" y="18" fill="#10b981" font-size="10">R(s)G(s)</text>
                  
                  <line x1="70" y1="55" x2="265" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="220" y="48" fill="#94a3b8" font-size="10">R(s)</text>
                  
                  <line x1="70" y1="55" x2="70" y2="85" stroke="#38bdf8" stroke-width="2" />
                  <line x1="70" y1="85" x2="265" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="220" y="78" fill="#94a3b8" font-size="10">R(s)</text>
                </svg>
              </div>
            </div>
            <div class="rule-equiv-sign">≡</div>
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Equivalente (Depois)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 110">
                  ${defs}
                  <line x1="15" y1="55" x2="65" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="40" y="45" fill="#94a3b8" font-size="11">R(s)</text>
                  <rect x="65" y="38" width="60" height="34" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="95" y="60" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G(s)</text>
                  
                  <line x1="125" y1="55" x2="165" y2="55" stroke="#38bdf8" stroke-width="2" />
                  <circle cx="165" cy="55" r="4" fill="#38bdf8" />
                  
                  <line x1="165" y1="55" x2="265" y2="25" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="215" y="18" fill="#10b981" font-size="10">R(s)G(s)</text>
                  
                  <line x1="165" y1="55" x2="185" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <rect x="185" y="40" width="55" height="30" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
                  <text x="212" y="60" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">1/G(s)</text>
                  <line x1="240" y1="55" x2="270" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="255" y="47" fill="#94a3b8" font-size="9.5">R(s)</text>
                  
                  <line x1="165" y1="55" x2="165" y2="88" stroke="#38bdf8" stroke-width="2" />
                  <line x1="165" y1="88" x2="185" y2="88" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <rect x="185" y="73" width="55" height="30" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
                  <text x="212" y="93" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">1/G(s)</text>
                  <line x1="240" y1="88" x2="270" y2="88" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="255" y="80" fill="#94a3b8" font-size="9.5">R(s)</text>
                </svg>
              </div>
            </div>
          </div>
          <div class="rule-explanation-box">
            <b>Justificativa Matemática:</b> Ao mover o ponto de derivação para depois de $G(s)$, o sinal disponível no nó passa a ser $R(s) \\cdot G(s)$. Para restaurar a grandeza original $R(s)$, cada ramo derivado secundário deve receber um bloco com ganho inverso $\\frac{1}{G(s)}$, pois $[R(s)G(s)] \\cdot \\frac{1}{G(s)} = R(s)$.
          </div>
        </div>

        <!-- Regra 2: Mover Ramificação para ANTES do Bloco -->
        <div class="rule-comparison-card">
          <div class="rule-comparison-header">
            <span>Regra 2: Mover Ponto de Ramificação para ANTES de um Bloco G(s)</span>
          </div>
          <div class="rule-comparison-grid">
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Original (Antes)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 110">
                  ${defs}
                  <line x1="15" y1="55" x2="65" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="40" y="45" fill="#94a3b8" font-size="11">R(s)</text>
                  <rect x="65" y="38" width="60" height="34" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="95" y="60" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G(s)</text>
                  
                  <line x1="125" y1="55" x2="165" y2="55" stroke="#38bdf8" stroke-width="2" />
                  <circle cx="165" cy="55" r="4" fill="#38bdf8" />
                  
                  <line x1="165" y1="55" x2="265" y2="25" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="215" y="18" fill="#10b981" font-size="10">R(s)G(s)</text>
                  
                  <line x1="165" y1="55" x2="265" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="215" y="48" fill="#10b981" font-size="10">R(s)G(s)</text>
                  
                  <line x1="165" y1="55" x2="165" y2="85" stroke="#38bdf8" stroke-width="2" />
                  <line x1="165" y1="85" x2="265" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="215" y="78" fill="#10b981" font-size="10">R(s)G(s)</text>
                </svg>
              </div>
            </div>
            <div class="rule-equiv-sign">≡</div>
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Equivalente (Depois)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 110">
                  ${defs}
                  <line x1="15" y1="55" x2="60" y2="55" stroke="#38bdf8" stroke-width="2" />
                  <text x="35" y="45" fill="#94a3b8" font-size="11">R(s)</text>
                  <circle cx="60" cy="55" r="4" fill="#38bdf8" />
                  
                  <!-- Ramo 1 -->
                  <line x1="60" y1="55" x2="60" y2="25" stroke="#38bdf8" stroke-width="2" />
                  <line x1="60" y1="25" x2="105" y2="25" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <rect x="105" y="10" width="55" height="30" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="132" y="30" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">G(s)</text>
                  <line x1="160" y1="25" x2="265" y2="25" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="215" y="18" fill="#10b981" font-size="10">R(s)G(s)</text>
                  
                  <!-- Ramo 2 -->
                  <line x1="60" y1="55" x2="105" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <rect x="105" y="40" width="55" height="30" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="132" y="60" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">G(s)</text>
                  <line x1="160" y1="55" x2="265" y2="55" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="215" y="48" fill="#10b981" font-size="10">R(s)G(s)</text>
                  
                  <!-- Ramo 3 -->
                  <line x1="60" y1="55" x2="60" y2="85" stroke="#38bdf8" stroke-width="2" />
                  <line x1="60" y1="85" x2="105" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <rect x="105" y="70" width="55" height="30" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="132" y="90" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">G(s)</text>
                  <line x1="160" y1="85" x2="265" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="215" y="78" fill="#10b981" font-size="10">R(s)G(s)</text>
                </svg>
              </div>
            </div>
          </div>
          <div class="rule-explanation-box">
            <b>Justificativa Matemática:</b> Se o sinal for derivado antes do bloco $G(s)$, sua amplitude é $R(s)$. Para que os ramos secundários continuem fornecendo $R(s) \\cdot G(s)$, cada um deles deve receber um bloco próprio com ganho direto $G(s)$.
          </div>
        </div>

        <!-- Regra 3: Mover Somador para DEPOIS do Bloco -->
        <div class="rule-comparison-card">
          <div class="rule-comparison-header">
            <span>Regra 3: Mover Ponto de Soma para DEPOIS de um Bloco G(s)</span>
          </div>
          <div class="rule-comparison-grid">
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Original (Antes)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 90">
                  ${defs}
                  <line x1="15" y1="45" x2="65" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="35" y="35" fill="#94a3b8" font-size="10.5">R(s)</text>
                  <text x="65" y="38" fill="#38bdf8" font-size="11">+</text>

                  <line x1="80" y1="80" x2="80" y2="59" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="88" y="78" fill="#94a3b8" font-size="10.5">X(s)</text>
                  <text x="86" y="65" fill="#38bdf8" font-size="11">±</text>

                  <circle cx="80" cy="45" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
                  <line x1="94" y1="45" x2="145" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <rect x="145" y="27" width="55" height="36" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="172" y="50" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G(s)</text>
                  
                  <line x1="200" y1="45" x2="265" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="232" y="35" fill="#10b981" font-size="9.5" text-anchor="middle">C = (R ± X)G</text>
                </svg>
              </div>
            </div>
            <div class="rule-equiv-sign">≡</div>
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Equivalente (Depois)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 90">
                  ${defs}
                  <line x1="15" y1="28" x2="65" y2="28" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="35" y="20" fill="#94a3b8" font-size="10.5">R(s)</text>
                  <rect x="65" y="12" width="55" height="32" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="92" y="32" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">G(s)</text>

                  <line x1="15" y1="68" x2="65" y2="68" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="35" y="60" fill="#94a3b8" font-size="10.5">X(s)</text>
                  <rect x="65" y="52" width="55" height="32" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="92" y="72" fill="#fff" font-size="10.5" font-weight="bold" text-anchor="middle">G(s)</text>

                  <line x1="120" y1="28" x2="165" y2="28" stroke="#38bdf8" stroke-width="2" />
                  <line x1="165" y1="28" x2="165" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />

                  <line x1="120" y1="68" x2="165" y2="68" stroke="#38bdf8" stroke-width="2" />
                  <line x1="165" y1="68" x2="165" y2="61" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />

                  <circle cx="165" cy="48" r="13" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
                  <line x1="178" y1="48" x2="265" y2="48" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="220" y="38" fill="#10b981" font-size="9.5" text-anchor="middle">C = R·G ± X·G</text>
                </svg>
              </div>
            </div>
          </div>
          <div class="rule-explanation-box">
            <b>Justificativa Matemática:</b> Como a saída original é $C(s) = [R(s) \\pm X(s)] \\cdot G(s) = R(s)G(s) \\pm X(s)G(s)$, ao deslocar o somador para depois de $G(s)$, cada sinal que entra no somador deve ter passado previamente por um bloco $G(s)$.
          </div>
        </div>

        <!-- Regra 4: Mover Somador para ANTES do Bloco -->
        <div class="rule-comparison-card">
          <div class="rule-comparison-header">
            <span>Regra 4: Mover Ponto de Soma para ANTES de um Bloco G(s)</span>
          </div>
          <div class="rule-comparison-grid">
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Original (Antes)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 90">
                  ${defs}
                  <line x1="15" y1="35" x2="65" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="35" y="25" fill="#94a3b8" font-size="10.5">R(s)</text>
                  <rect x="65" y="18" width="55" height="34" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="92" y="40" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G(s)</text>

                  <line x1="120" y1="35" x2="165" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="165" y="28" fill="#38bdf8" font-size="11">+</text>

                  <line x1="180" y1="80" x2="180" y2="49" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="190" y="76" fill="#94a3b8" font-size="10.5">X(s)</text>
                  <text x="186" y="55" fill="#38bdf8" font-size="11">±</text>

                  <circle cx="180" cy="35" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
                  <line x1="194" y1="35" x2="265" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="230" y="25" fill="#10b981" font-size="9.5" text-anchor="middle">C = R·G ± X</text>
                </svg>
              </div>
            </div>
            <div class="rule-equiv-sign">≡</div>
            <div class="rule-side-box">
              <div class="rule-side-label"><span>Configuração Equivalente (Depois)</span></div>
              <div class="rule-side-svg">
                <svg viewBox="0 0 280 90">
                  ${defs}
                  <line x1="15" y1="35" x2="65" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="35" y="25" fill="#94a3b8" font-size="10.5">R(s)</text>
                  <text x="65" y="28" fill="#38bdf8" font-size="11">+</text>

                  <line x1="15" y1="75" x2="45" y2="75" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="25" y="68" fill="#94a3b8" font-size="10.5">X(s)</text>
                  <rect x="45" y="60" width="45" height="26" rx="3" fill="#050811" stroke="#a855f7" stroke-width="2" />
                  <text x="67" y="77" fill="#f8fafc" font-size="9.5" font-weight="bold" text-anchor="middle">1/G</text>

                  <line x1="90" y1="75" x2="80" y2="75" stroke="#38bdf8" stroke-width="2" />
                  <line x1="80" y1="75" x2="80" y2="49" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="86" y="55" fill="#38bdf8" font-size="11">±</text>

                  <circle cx="80" cy="35" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
                  <line x1="94" y1="35" x2="140" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  
                  <rect x="140" y="18" width="55" height="34" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
                  <text x="167" y="40" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle">G(s)</text>
                  
                  <line x1="195" y1="35" x2="265" y2="35" stroke="#38bdf8" stroke-width="2" marker-end="url(#g-arr)" />
                  <text x="230" y="25" fill="#10b981" font-size="9.5" text-anchor="middle">C = R·G ± X</text>
                </svg>
              </div>
            </div>
          </div>
          <div class="rule-explanation-box">
            <b>Justificativa Matemática:</b> Ao mover o somador para antes de $G(s)$, todo o sinal resultante da soma passará a ser multiplicado por $G(s)$. Para que a contribuição de $X(s)$ permaneça pura ($+X(s)$), ela precisa ser pré-dividida por $G(s)$: $\\left[R(s) \\pm \\frac{X(s)}{G(s)}\\right] \\cdot G(s) = R(s)G(s) \\pm X(s)$.
          </div>
        </div>
      </div>
    </div>

    <!-- Tópico 7: Estratégia Sistemática de Redução -->
    <div class="guide-topic-card" data-topic="estrategia">
      <div class="guide-topic-title">
        <span>7. Estratégia Sistemática de Redução de Diagramas Complexos</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Executar uma sequência metodológica em 4 fases para resolver qualquer diagrama de blocos complexo, evitando redundâncias e impasses algébricos.
        </div>
        <p>A maior dificuldade para quem está aprendendo não é aplicar as fórmulas, mas <i>saber qual regra aplicar primeiro</i>. Siga este roteiro padrão comprovado em Engenharia de Controle:</p>

        <div class="heuristic-phase-grid">
          <div class="heuristic-phase-card">
            <div class="phase-header">
              <span class="phase-num">1</span>
              <span>Reduções Diretas Tíbias</span>
            </div>
            <p style="font-size:0.79rem; margin:0;">
              Procure blocos em série direta (sem derivações intermediárias) e aplique cascata ($G_1 G_2$). Procure blocos em paralelo puro com o mesmo nó e unifique ($G_1 \\pm G_2$). Combine somadores adjacentes consecutivos.
            </p>
          </div>

          <div class="heuristic-phase-card">
            <div class="phase-header">
              <span class="phase-num">2</span>
              <span>Malhas Internas Fechadas</span>
            </div>
            <p style="font-size:0.79rem; margin:0;">
              Localize laços de realimentação fechados menores (aninhados) que estejam livres de ramificações secundárias. Reduza-os imediatamente pela fórmula canônica $\\frac{G}{1 \\pm GH}$.
            </p>
          </div>

          <div class="heuristic-phase-card">
            <div class="phase-header">
              <span class="phase-num">3</span>
              <span>Desembaraçar Malhas Cruzadas</span>
            </div>
            <p style="font-size:0.79rem; margin:0;">
              Se duas malhas estiverem entrelaçadas, mova um ponto de ramificação para <b>depois</b> do bloco da frente (inserindo $1/G$) ou um somador para trás. Isso separa os laços e revela uma nova malha interna isolada!
            </p>
          </div>

          <div class="heuristic-phase-card">
            <div class="phase-header">
              <span class="phase-num">4</span>
              <span>Malha Principal e MMC Racional</span>
            </div>
            <p style="font-size:0.79rem; margin:0;">
              Feche a última malha externa canônica. Realize o produto e a soma com MMC entre os polinômios do numerador e denominador, cancelando fatores comuns para obter a Função de Transferência final em bloco único.
            </p>
          </div>
        </div>

        <div class="guide-conditions-box">
          <strong>💡 Regra de Ouro do Desembaraço:</strong> Quando estiver em dúvida se deve mover um ponto de soma ou um ponto de ramificação, <b>prefira mover a ramificação para a direita (para depois de um bloco)</b>. Mover ramificações costuma alterar apenas o ramo derivado secundário (inserindo $1/G$), mantendo os somadores da linha direta intactos e facilitando a visualização em cascata.
        </div>
      </div>
    </div>

    <!-- Tópico 8: Matemática Base -->
    <div class="guide-topic-card" data-topic="matematica_base">
      <div class="guide-topic-title">
        <span>8. Matemática Base: MMC de Polinômios, Frações Racionais e Cortes</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Manipular algebricamente razões de polinômios em $s$, calcular o Mínimo Múltiplo Comum (MMC), inverter frações e cancelar fatores comuns sem cometer erros algébricos elementares.
        </div>
        <p>A simplificação analítica da fórmula canônica de malha fechada $T(s) = \\frac{G(s)}{1 \\pm G(s)H(s)}$ quando $G(s) = \\frac{N_G(s)}{D_G(s)}$ e $H(s) = \\frac{N_H(s)}{D_H(s)}$ exige álgebra racional detalhada:</p>

        <div class="guide-formula-box">
          <b>Algoritmo Analítico com Mínimo Múltiplo Comum (MMC):</b>
          <ol style="margin: 6px 0 6px 20px;">
            <li><b>Produto no denominador de malha:</b>
              $$G(s) H(s) = \\frac{N_G(s)}{D_G(s)} \\cdot \\frac{N_H(s)}{D_H(s)} = \\frac{N_G(s) N_H(s)}{D_G(s) D_H(s)}$$
            </li>
            <li><b>Cálculo do MMC dos Denominadores:</b>
              O número inteiro $1$ é reescrito na forma de fração unitária com o denominador comum $D_{GH}(s) = D_G(s) D_H(s)$:
              $$1 = \\frac{D_G(s) D_H(s)}{D_G(s) D_H(s)}$$
              $$1 \\pm G(s)H(s) = \\frac{D_G(s) D_H(s) \\pm N_G(s) N_H(s)}{D_G(s) D_H(s)}$$
            </li>
            <li><b>Divisão de Frações Racionais (Inversão da Fração Inferior):</b>
              $$\\frac{\\frac{N_G(s)}{D_G(s)}}{\\frac{D_G(s) D_H(s) \\pm N_G(s) N_H(s)}{D_G(s) D_H(s)}} = \\frac{N_G(s)}{D_G(s)} \\cdot \\frac{D_G(s) D_H(s)}{D_G(s) D_H(s) \\pm N_G(s) N_H(s)}$$
            </li>
            <li><b>Cancelamento / Corte Formal de Fatores Comuns:</b>
              O termo $D_G(s)$ no denominador da fração superior cancela perfeitamente com o termo $D_G(s)$ no numerador da fração invertida:
              $$\\mathbf{T(s) = \\frac{N_G(s) \\cdot D_H(s)}{D_G(s) D_H(s) \\pm N_G(s) N_H(s)}}$$
            </li>
          </ol>
        </div>

        <div class="rule-comparison-card" style="margin-top: 14px;">
          <div class="rule-comparison-header">
            <span>Exemplo Numérico Passo a Passo: Planta de 1ª Ordem com Feedback Unitário</span>
          </div>
          <div style="font-size: 0.84rem; color: #cbd5e1; line-height: 1.65;">
            Seja $G(s) = \\frac{10}{s + 2}$ e $H(s) = 1 = \\frac{1}{1}$ com realimentação negativa:
            $$\\text{Denominador: } 1 + G(s)H(s) = 1 + \\frac{10}{s+2} = \\frac{s+2}{s+2} + \\frac{10}{s+2} = \\frac{(s+2) + 10}{s+2} = \\frac{s + 12}{s + 2}$$
            $$\\text{Função de Transferência: } T(s) = \\frac{\\frac{10}{s+2}}{\\frac{s+12}{s+2}} = \\frac{10}{s+2} \\cdot \\frac{s+2}{s+12} = \\mathbf{\\frac{10}{s + 12}}$$
            O pólo de malha aberta estava em $s = -2$; devido à realimentação negativa, o pólo de malha fechada foi deslocado para $s = -12$, tornando a resposta no tempo 6 vezes mais rápida.
          </div>
        </div>
      </div>
    </div>

    <!-- Tópico 9: Laboratório de Fixação Conceitual (Quiz Interativo) -->
    <div class="guide-topic-card" data-topic="quiz_fixacao">
      <div class="guide-topic-title">
        <span>9. Laboratório de Fixação Conceitual & Diagnóstico de Erros</span>
      </div>
      <div class="guide-topic-body">
        <div class="guide-objective-badge">
          <b>🎯 Objetivo de Aprendizagem:</b> Avaliar seu próprio entendimento das condições de contorno e regras de transposição, identificando contra-exemplos típicos e consolidando o raciocínio analítico.
        </div>
        <p>Clique na alternativa que você julgar correta em cada desafio abaixo para receber a avaliação detalhada e a justificativa conceitual imediata:</p>

        <div class="guide-quiz-container">
          <!-- Desafio 1: Cascata com Derivação -->
          <div class="guide-quiz-card" id="quizCard_q1">
            <div class="question-title">
              <span style="color:#38bdf8;">Desafio 1:</span> Dois blocos $G_1(s)$ e $G_2(s)$ estão dispostos em sequência na linha direta, mas entre eles existe um ponto de ramificação que alimenta uma malha externa. Podemos substituí-los imediatamente pelo bloco $G_{\\text{eq}}(s) = G_1(s) \\cdot G_2(s)$?
            </div>
            <div class="quiz-options-list">
              <button type="button" class="quiz-option-btn" data-opt="A" onclick="handleQuizSelect('q1', 'A', true, 'A ramificação intermediária retira um sinal nodal $X(s) = G_1(s)R(s)$ indispensável para o restante do diagrama. Se fundíssemos $G_1$ e $G_2$ diretamente em cascata, esse nó intermediário desapareceria. É obrigatório transpor o ponto de ramificação para antes de $G_1$ ou depois de $G_2$ antes de aplicar a regra da cascata.')">
                <span>(A) Não. É obrigatório transpor o ponto de ramificação antes de associar os blocos em cascata, sob pena de eliminar um sinal nodal intermediário.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="B" onclick="handleQuizSelect('q1', 'B', false, 'Incorreto! A regra de cascata só pode ser aplicada se a saída de $G_1$ for a entrada exclusiva de $G_2$. A derivação intermediária quebra a condição estrita de não-carregamento e de exclusividade de sinal.')">
                <span>(B) Sim. Quaisquer dois blocos dispostos em sequência direta podem ser multiplicados livremente.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="C" onclick="handleQuizSelect('q1', 'C', false, 'Incorreto! Mesmo com realimentação unitária externa, a eliminação do nó intermediário alteraria a relação causa-efeito da malha externa.')">
                <span>(C) Sim, desde que a malha externa possua realimentação unitária ($H=1$).</span>
              </button>
            </div>
            <div class="quiz-feedback-box"></div>
          </div>

          <!-- Desafio 2: Sinal no Denominador de MF -->
          <div class="guide-quiz-card" id="quizCard_q2">
            <div class="question-title">
              <span style="color:#38bdf8;">Desafio 2:</span> Em uma malha fechada canônica com caminho direto $G(s)$ e retorno $H(s)$, o ponto de soma possui sinal negativo (–) no ramo de realimentação. Qual é o sinal no denominador da Função de Transferência equivalente $T(s) = \\frac{C(s)}{R(s)}$?
            </div>
            <div class="quiz-options-list">
              <button type="button" class="quiz-option-btn" data-opt="A" onclick="handleQuizSelect('q2', 'A', true, 'A realimentação negativa atua como $E = R - B$. Ao isolar a saída $C$, o termo $-GH \\cdot C$ passa para o membro esquerdo da equação somando ($+GH \\cdot C$), gerando o fator canônico $[1 + G(s)H(s)]$.')">
                <span>(A) Sinal positivo ($1 + G(s)H(s)$), pois a transposição do termo $-G(s)H(s)C(s)$ para o membro esquerdo da equação inverte o sinal para adição.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="B" onclick="handleQuizSelect('q2', 'B', false, 'Incorreto! Esta é a armadilha mais clássica de provas de controle. O sinal no denominador é o inverso do sinal que entra no somador devido à transposição de membros na equação.')">
                <span>(B) Sinal negativo ($1 - G(s)H(s)$), pois o sinal do denominador deve ser sempre idêntico ao sinal físico do somador.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="C" onclick="handleQuizSelect('q2', 'C', false, 'Incorreto! O denominador de malha fechada é sempre $1 \\pm G(s)H(s)$, onde o termo unitário representa o caminho direto normalizado.')">
                <span>(C) O sinal depende do grau do polinômio do numerador $N_G(s)$.</span>
              </button>
            </div>
            <div class="quiz-feedback-box"></div>
          </div>

          <!-- Desafio 3: Transposição de Ramificação -->
          <div class="guide-quiz-card" id="quizCard_q3">
            <div class="question-title">
              <span style="color:#38bdf8;">Desafio 3:</span> Ao mover um ponto de ramificação de ANTES de um bloco $G(s)$ para DEPOIS desse mesmo bloco $G(s)$, o que devemos inserir no ramo derivado para garantir equivalência nodal estrita?
            </div>
            <div class="quiz-options-list">
              <button type="button" class="quiz-option-btn" data-opt="A" onclick="handleQuizSelect('q3', 'A', true, 'Antes da mudança, o ramo derivava $R(s)$. Depois da mudança, o nó passa a ter $R(s) \\cdot G(s)$. Para restaurar o valor original $R(s)$, multiplicamos pelo ganho inverso: $[R(s)G(s)] \\cdot \\frac{1}{G(s)} = R(s)$.')">
                <span>(A) Um bloco com ganho inverso $\\frac{1}{G(s)}$.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="B" onclick="handleQuizSelect('q3', 'B', false, 'Incorreto! Inserir $G(s)$ é a regra para mover a ramificação de DEPOIS para ANTES. Ao mover para DEPOIS, o sinal já está amplificado por $G(s)$, necessitando da divisão $\\frac{1}{G(s)}$.')">
                <span>(B) Um bloco com o mesmo ganho direto $G(s)$.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="C" onclick="handleQuizSelect('q3', 'C', false, 'Incorreto! Se nada for inserido, o sinal derivado passará a ser $R(s) \\cdot G(s)$ em vez de $R(s)$, alterando a resposta de todo o sistema.')">
                <span>(C) Nenhum bloco adicional, pois pontos de ramificação não alteram a magnitude dos sinais.</span>
              </button>
            </div>
            <div class="quiz-feedback-box"></div>
          </div>

          <!-- Desafio 4: Associação em Paralelo -->
          <div class="guide-quiz-card" id="quizCard_q4">
            <div class="question-title">
              <span style="color:#38bdf8;">Desafio 4:</span> Qual é a condição indispensável para somar diretamente as funções de transferência de dois blocos pela regra de paralelo ($G_1 + G_2$)?
            </div>
            <div class="quiz-options-list">
              <button type="button" class="quiz-option-btn" data-opt="A" onclick="handleQuizSelect('q4', 'A', true, 'A regra de paralelo baseia-se na propriedade distributiva: $C(s) = G_1(s)R(s) + G_2(s)R(s) = [G_1(s) + G_2(s)]R(s)$. Isso só é possível se ambos os blocos partirem da mesma variável $R(s)$ e convergirem ao mesmo somador.')">
                <span>(A) Ambos os blocos devem receber exatamente a mesma variável de entrada (mesmo nó de origem) e convergir para o mesmo ponto de soma.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="B" onclick="handleQuizSelect('q4', 'B', false, 'Incorreto! As ordens polinomiais podem ser completamente distintas (ex: um bloco pode ser ganho estático e outro integrador). A restrição é puramente topológica na conectividade dos sinais.')">
                <span>(B) Os polinômios dos denominadores de $G_1(s)$ e $G_2(s)$ devem possuir o mesmo grau.</span>
              </button>
              <button type="button" class="quiz-option-btn" data-opt="C" onclick="handleQuizSelect('q4', 'C', false, 'Incorreto! Os blocos não precisam estar paralelos no layout gráfico; a propriedade depende unicamente das conexões matemáticas nodais.')">
                <span>(C) Os blocos devem estar alinhados visualmente um sobre o outro no diagrama.</span>
              </button>
            </div>
            <div class="quiz-feedback-box"></div>
          </div>
        </div>
      </div>
    </div>

  `;

  renderMath(container);
}

// ============================================================================
// MODO DE PRÁTICA E EXERCÍCIOS INTERATIVOS COM VERIFICADOR INDEPENDENTE (P3)
// ============================================================================

function practiceArrowDefs() {
  return `
    <defs>
      <marker id="p-arr" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
      </marker>
      <marker id="p-arr-green" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
      </marker>
      <marker id="p-arr-red" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
      </marker>
    </defs>
  `;
}

function switchPracticeTab(tabKey, btn) {
  const tabs = document.querySelectorAll(".practice-tab-btn");
  tabs.forEach(t => t.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    const targetBtn = Array.from(tabs).find(t => t.getAttribute("onclick") && t.getAttribute("onclick").includes(tabKey));
    if (targetBtn) targetBtn.classList.add("active");
  }

  const p1 = document.getElementById("practiceLevel1Pane");
  const p2 = document.getElementById("practiceLevel2Pane");
  const p3 = document.getElementById("practiceLevel3Pane");

  if (p1) p1.style.display = tabKey === "level1" ? "block" : "none";
  if (p2) p2.style.display = tabKey === "level2" ? "block" : "none";
  if (p3) p3.style.display = tabKey === "level3" ? "block" : "none";

  const container = document.getElementById("practiceContentContainer");
  if (container) {
    renderMath(container);
  }
}

function handlePracticeQuiz(qId, selectedOption, isCorrect, explanationHtml) {
  const card = document.getElementById(`quizCard_${qId}`);
  if (!card) return;
  const buttons = card.querySelectorAll(".quiz-option-btn");
  buttons.forEach(b => {
    b.disabled = true;
  });

  const chosenBtn = card.querySelector(`[data-opt="${selectedOption}"]`);
  if (chosenBtn) {
    chosenBtn.classList.add(isCorrect ? "selected-correct" : "selected-wrong");
  }

  const feedback = card.querySelector(".quiz-feedback-box");
  if (feedback) {
    feedback.className = `quiz-feedback-box ${isCorrect ? 'correct' : 'wrong'}`;
    feedback.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px; font-size:0.86rem;">
        ${isCorrect ? '✅ Resposta Correta!' : '❌ Resposta Incorreta — Análise da Pegadinha:'}
      </div>
      <div>${explanationHtml}</div>
    `;
    renderMath(feedback);
  }
}

const practiceHintsState = { p1: 0, p2: 0, p3: 0 };

const practiceLevel3Data = {
  p1: {
    id: "p1",
    title: "Problema 1: Malha Fechada Clássica com Realimentação Negativa Unitária",
    badge: "1ª Ordem",
    desc: "Uma planta com dinâmica de primeira ordem \\(G(s) = \\frac{10}{s + 2}\\) opera em malha fechada com realimentação unitária \\(H(s) = 1\\) e sinal subtrativo no somador (\\(-\\)). Calcule analiticamente a função de transferência equivalente \\(T(s) = \\frac{C(s)}{R(s)}\\).",
    refRat: {
      num: polyNormalize([{ coeff: 10, vars: {} }]),
      den: polyNormalize([{ coeff: 1, vars: { s: 1 } }, { coeff: 12, vars: {} }])
    },
    flippedRat: {
      num: polyNormalize([{ coeff: 10, vars: {} }]),
      den: polyNormalize([{ coeff: 1, vars: { s: 1 } }, { coeff: -8, vars: {} }])
    },
    hints: [
      "Identifique os termos da forma canônica de malha fechada: o caminho direto é \\(G(s) = \\frac{10}{s + 2}\\) e o ramo de retorno é \\(H(s) = 1\\).",
      "Como o somador possui sinal negativo (\\(-\\)), a equação de malha fechada é \\(T(s) = \\frac{G(s)}{1 + G(s)H(s)}\\).",
      "Substitua os blocos: \\(T(s) = \\frac{\\frac{10}{s+2}}{1 + \\frac{10}{s+2} \\cdot 1}\\). Multiplique numerador e denominador por \\((s+2)\\) para obter \\(\\frac{10}{(s+2) + 10} = \\frac{10}{s + 12}\\)."
    ],
    solutionHtml: `
      <div style="margin-bottom:8px;">
        1. <strong>Equações Nodais no Domínio de Laplace:</strong><br/>
        No somador: \\(E(s) = R(s) - C(s)\\)<br/>
        Na planta: \\(C(s) = G(s) \\cdot E(s) = \\frac{10}{s+2} \\cdot E(s)\\)
      </div>
      <div style="margin-bottom:8px;">
        2. <strong>Substituição e Isolamento da Saída:</strong><br/>
        \\(C(s) = \\frac{10}{s+2}[R(s) - C(s)] \\implies (s+2)C(s) = 10R(s) - 10C(s)\\)<br/>
        \\((s + 2 + 10)C(s) = 10R(s) \\implies (s + 12)C(s) = 10R(s)\\)
      </div>
      <div>
        3. <strong>Função de Transferência Canônica:</strong><br/>
        $$T(s) = \\frac{C(s)}{R(s)} = \\frac{10}{s + 12}$$
        <em>Observação de Engenharia:</em> A malha aberta possuía polo em \\(s = -2\\) (constante de tempo \\(\\tau = 0.5\\text{ s}\\)). A realimentação negativa unitária deslocou o polo para \\(s = -12\\) (constante de tempo \\(\\tau = 0.083\\text{ s}\\)), tornando a resposta transitória 6 vezes mais rápida.
      </div>
    `
  },
  p2: {
    id: "p2",
    title: "Problema 2: Malha Fechada com Sensor / Filtro Dinâmico de Realimentação",
    badge: "2ª Ordem",
    desc: "Um processo linear \\(G(s) = \\frac{4}{s + 1}\\) é monitorado por um sensor de medição dinâmico \\(H(s) = \\frac{2}{s + 3}\\) em malha de realimentação negativa (\\(-\\)). Obtenha a função de transferência de malha fechada \\(T(s) = \\frac{C(s)}{R(s)}\\).",
    refRat: {
      num: polyNormalize([{ coeff: 4, vars: { s: 1 } }, { coeff: 12, vars: {} }]),
      den: polyNormalize([{ coeff: 1, vars: { s: 2 } }, { coeff: 4, vars: { s: 1 } }, { coeff: 11, vars: {} }])
    },
    flippedRat: {
      num: polyNormalize([{ coeff: 4, vars: { s: 1 } }, { coeff: 12, vars: {} }]),
      den: polyNormalize([{ coeff: 1, vars: { s: 2 } }, { coeff: 4, vars: { s: 1 } }, { coeff: -5, vars: {} }])
    },
    hints: [
      "Aplique a relação fundamental de Black: \\(T(s) = \\frac{G(s)}{1 + G(s)H(s)}\\).",
      "Substitua as funções: \\(T(s) = \\frac{\\frac{4}{s+1}}{1 + \\frac{4}{s+1} \\cdot \\frac{2}{s+3}} = \\frac{\\frac{4}{s+1}}{1 + \\frac{8}{(s+1)(s+3)}}\\). Multiplique tudo por \\((s+1)(s+3)\\).",
      "No numerador: \\(4(s+3) = 4s + 12\\). No denominador: \\((s+1)(s+3) + 8 = s^2 + 4s + 3 + 8 = s^2 + 4s + 11\\)."
    ],
    solutionHtml: `
      <div style="margin-bottom:8px;">
        1. <strong>Equação Canônica da Malha:</strong><br/>
        $$T(s) = \\frac{G(s)}{1 + G(s)H(s)} = \\frac{\\frac{4}{s+1}}{1 + \\frac{4}{s+1} \\cdot \\frac{2}{s+3}}$$
      </div>
      <div style="margin-bottom:8px;">
        2. <strong>Eliminação dos Denominadores Compostos (MMC = \\((s+1)(s+3)\\)):</strong><br/>
        $$T(s) = \\frac{4(s + 3)}{(s + 1)(s + 3) + 4 \\cdot 2} = \\frac{4s + 12}{s^2 + 4s + 3 + 8}$$
      </div>
      <div>
        3. <strong>Resultado Canônico Final:</strong><br/>
        $$T(s) = \\frac{4s + 12}{s^2 + 4s + 11}$$
        <em>Observação de Engenharia:</em> O sistema em malha fechada tornou-se de 2ª ordem com discriminante \\(\\Delta = 4^2 - 4(1)(11) = -28 < 0\\), apresentando frequência natural \\(\\omega_n = \\sqrt{11} \\approx 3.32\\text{ rad/s}\\) e fator de amortecimento \\(\\zeta = \\frac{4}{2\\sqrt{11}} \\approx 0.603\\).
      </div>
    `
  },
  p3: {
    id: "p3",
    title: "Problema 3: Sistema com Cascata no Caminho Direto e Compensador de Malha",
    badge: "3ª Ordem",
    desc: "O caminho direto é formado pela ligação em cascata dos subsistemas \\(G_1(s) = \\frac{3}{s + 2}\\) e \\(G_2(s) = \\frac{4}{s + 5}\\). A malha é fechada com realimentação negativa através do bloco \\(H(s) = \\frac{1}{s + 1}\\). Calcule a função de transferência global \\(T(s) = \\frac{C(s)}{R(s)}\\).",
    refRat: {
      num: polyNormalize([{ coeff: 12, vars: { s: 1 } }, { coeff: 12, vars: {} }]),
      den: polyNormalize([{ coeff: 1, vars: { s: 3 } }, { coeff: 8, vars: { s: 2 } }, { coeff: 17, vars: { s: 1 } }, { coeff: 22, vars: {} }])
    },
    flippedRat: {
      num: polyNormalize([{ coeff: 12, vars: { s: 1 } }, { coeff: 12, vars: {} }]),
      den: polyNormalize([{ coeff: 1, vars: { s: 3 } }, { coeff: 8, vars: { s: 2 } }, { coeff: 17, vars: { s: 1 } }, { coeff: -2, vars: {} }])
    },
    hints: [
      "Primeira etapa: condense os dois blocos em cascata direta em uma única função equivalente: \\(G_{eq}(s) = G_1(s) \\cdot G_2(s) = \\frac{3 \\cdot 4}{(s+2)(s+5)} = \\frac{12}{s^2 + 7s + 10}\\).",
      "Segunda etapa: aplique o fechamento de malha \\(T(s) = \\frac{G_{eq}(s)}{1 + G_{eq}(s)H(s)}\\). Multiplique ambos os membros pelo produto dos denominadores: \\((s^2 + 7s + 10)(s + 1)\\).",
      "Terceira etapa: expanda o produto \\((s^2 + 7s + 10)(s + 1) = s^3 + 8s^2 + 17s + 10\\). Some o termo proveniente do numerador \\(+ 12\\), resultando no denominador \\(s^3 + 8s^2 + 17s + 22\\). O numerador é \\(12(s + 1) = 12s + 12\\)."
    ],
    solutionHtml: `
      <div style="margin-bottom:8px;">
        1. <strong>Redução da Cascata do Caminho Direto:</strong><br/>
        $$G_{dir}(s) = G_1(s) \\cdot G_2(s) = \\frac{3}{s+2} \\cdot \\frac{4}{s+5} = \\frac{12}{(s+2)(s+5)} = \\frac{12}{s^2 + 7s + 10}$$
      </div>
      <div style="margin-bottom:8px;">
        2. <strong>Aplicação da Malha Fechada:</strong><br/>
        $$T(s) = \\frac{G_{dir}(s)}{1 + G_{dir}(s)H(s)} = \\frac{\\frac{12}{s^2 + 7s + 10}}{1 + \\frac{12}{s^2 + 7s + 10} \\cdot \\frac{1}{s+1}}$$
      </div>
      <div style="margin-bottom:8px;">
        3. <strong>Expansão Polinomial com MMC:</strong><br/>
        $$T(s) = \\frac{12(s + 1)}{(s^2 + 7s + 10)(s + 1) + 12} = \\frac{12s + 12}{(s^3 + s^2 + 7s^2 + 7s + 10s + 10) + 12}$$
      </div>
      <div>
        4. <strong>Função de Transferência Canônica Final:</strong><br/>
        $$T(s) = \\frac{12s + 12}{s^3 + 8s^2 + 17s + 22}$$
        <em>Observação de Engenharia:</em> Sistema de 3ª ordem estritamente estável (todos os coeficientes do polinômio característico são positivos e satisfazem o critério de estabilidade de Routh-Hurwitz).
      </div>
    `
  }
};

function solicitarDicaGradual(probId) {
  const prob = practiceLevel3Data[probId];
  if (!prob) return;
  const curr = practiceHintsState[probId] || 0;
  if (curr < prob.hints.length) {
    practiceHintsState[probId] = curr + 1;
  }
  const count = practiceHintsState[probId];
  const hintBox = document.getElementById(`practiceHintBox_${probId}`);
  const hintBtn = document.getElementById(`practiceHintBtn_${probId}`);
  if (!hintBox) return;

  hintBox.style.display = "block";
  let html = `<div style="font-weight:700; color:#38bdf8; margin-bottom:8px;">💡 Dicas Graduais (${count} de ${prob.hints.length}):</div>`;
  for (let i = 0; i < count; i++) {
    html += `
      <div style="margin-bottom:8px; padding-left:10px; border-left:2px solid #38bdf8; font-size:0.83rem; line-height:1.55;">
        <span style="font-weight:600; color:#93c5fd;">Dica ${i + 1}:</span> ${prob.hints[i]}
      </div>
    `;
  }
  hintBox.innerHTML = html;
  renderMath(hintBox);

  if (hintBtn) {
    if (count >= prob.hints.length) {
      hintBtn.innerText = "💡 Todas as Dicas Reveladas";
      hintBtn.disabled = true;
      hintBtn.style.opacity = "0.7";
    } else {
      hintBtn.innerText = `💡 Próxima Dica (${count + 1}/${prob.hints.length})`;
    }
  }
}

function revelarSolucaoNivel3(probId) {
  const prob = practiceLevel3Data[probId];
  const solBox = document.getElementById(`practiceSolBox_${probId}`);
  const solBtn = document.getElementById(`practiceSolBtn_${probId}`);
  if (!prob || !solBox) return;

  const isHidden = solBox.style.display === "none" || !solBox.style.display;
  if (isHidden) {
    solBox.style.display = "block";
    solBox.innerHTML = `
      <div style="font-weight:700; color:#10b981; margin-bottom:8px; font-size:0.88rem;">
        📘 Memorial Analítico Completo da Solução:
      </div>
      <div style="font-size:0.84rem; line-height:1.65; color:#cbd5e1;">
        ${prob.solutionHtml}
      </div>
    `;
    renderMath(solBox);
    if (solBtn) solBtn.innerText = "👁️ Ocultar Solução Completa";
  } else {
    solBox.style.display = "none";
    if (solBtn) solBtn.innerText = "👁️ Revelar Solução Completa";
  }
}

function verificarRespostaNivel3(probId) {
  const prob = practiceLevel3Data[probId];
  const verdictBox = document.getElementById(`practiceVerdict_${probId}`);
  if (!prob || !verdictBox) return;

  const numInput = document.getElementById(`practice_num_${probId}`);
  const denInput = document.getElementById(`practice_den_${probId}`);
  let numVal = numInput ? numInput.value.trim() : "";
  let denVal = denInput ? denInput.value.trim() : "";

  if (!numVal && !denVal) {
    verdictBox.className = "practice-verdict-box error";
    verdictBox.style.display = "block";
    verdictBox.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">⚠️ Entrada Vazia</div>
      <div>Por favor, insira o numerador N(s) e o denominador D(s) da sua função de transferência calculada.</div>
    `;
    return;
  }

  // Se o aluno digitou toda a fração no numerador (ex: "10 / (s + 12)") e deixou denominador vazio
  if (numVal.includes("/") && !denVal) {
    const parts = numVal.split("/");
    numVal = parts[0].trim();
    denVal = parts.slice(1).join("/").trim();
  }
  if (!denVal) denVal = "1";

  try {
    const parsedNumRat = parseRatExpr(numVal);
    const parsedDenRat = parseRatExpr(denVal);
    
    // userRat = parsedNumRat / parsedDenRat
    const userNum = polyMul(parsedNumRat.num, parsedDenRat.den);
    const userDen = polyMul(parsedNumRat.den, parsedDenRat.num);

    if (polyIsZero(userDen)) {
      verdictBox.className = "practice-verdict-box error";
      verdictBox.style.display = "block";
      verdictBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:4px;">⚠️ Indeterminação / Denominador Nulo</div>
        <div>O denominador da função de transferência informada simplificou para zero ($D(s) = 0$). Verifique a expressão inserida.</div>
      `;
      renderMath(verdictBox);
      return;
    }

    const simplifiedUser = ratSimplify(userNum, userDen);
    const refRat = prob.refRat;
    const flippedRat = prob.flippedRat;

    // Teste de equivalência exata por produto cruzado: N_u * D_ref - N_ref * D_u === 0
    const cross = polySub(polyMul(simplifiedUser.num, refRat.den), polyMul(refRat.num, simplifiedUser.den));
    const isEquivalent = polyIsZero(cross);

    if (isEquivalent) {
      verdictBox.className = "practice-verdict-box correct";
      verdictBox.style.display = "block";
      verdictBox.innerHTML = `
        <div style="font-weight:700; font-size:0.92rem; margin-bottom:6px; color:#34d399;">
          ✅ Resposta Exata e Algebricamente Equivalente!
        </div>
        <div style="margin-bottom:8px;">
          Sua expressão informada: <strong>$$T_{aluno}(s) = ${ratToLatex(simplifiedUser)}$$</strong>
        </div>
        <div style="margin-bottom:8px; color:#cbd5e1;">
          Forma canônica de referência: <strong>$$T(s) = ${ratToLatex(refRat)}$$</strong>
        </div>
        <div style="font-size:0.82rem; color:#a7f3d0;">
          A verificação analítica formal confirmou: $$N_{aluno}(s) \\cdot D_{ref}(s) - N_{ref}(s) \\cdot D_{aluno}(s) \\equiv 0$$. Sua dedução está 100% correta!
        </div>
      `;
      renderMath(verdictBox);
      return;
    }

    // Caso NÃO seja equivalente, acionar motor de diagnóstico inteligente
    let diagnosticMsg = "";
    
    // 1. Diagnóstico de inversão de sinal (1 - GH em vez de 1 + GH)
    if (flippedRat) {
      const crossFlipped = polySub(polyMul(simplifiedUser.num, flippedRat.den), polyMul(flippedRat.num, simplifiedUser.den));
      if (polyIsZero(crossFlipped)) {
        diagnosticMsg = `
          <div style="padding:8px 10px; background:rgba(245, 158, 11, 0.15); border-left:3px solid #f59e0b; border-radius:4px; margin-top:8px;">
            <div style="font-weight:700; color:#fbbf24; margin-bottom:4px;">🔍 Diagnóstico de Erro: Inversão de Sinal no Somador!</div>
            <div>Você aplicou realimentação positiva no denominador ($1 - GH$). No entanto, o nó somador possui sinal de subtração ($-$), o que gera o termo somado ($1 + GH$) no denominador ao transpor a equação nodal.</div>
          </div>
        `;
      }
    }

    // 2. Diagnóstico de grau do polinômio do denominador
    if (!diagnosticMsg) {
      const userDeg = toUnivariateArr(simplifiedUser.den).length - 1;
      const refDeg = toUnivariateArr(refRat.den).length - 1;
      if (userDeg !== refDeg) {
        diagnosticMsg = `
          <div style="padding:8px 10px; background:rgba(239, 68, 68, 0.15); border-left:3px solid #ef4444; border-radius:4px; margin-top:8px;">
            <div style="font-weight:700; color:#f87171; margin-bottom:4px;">🔍 Diagnóstico de Grau Polinomial:</div>
            <div>O denominador inserido possui grau $s^{${userDeg}}$, mas a ordem correta do sistema em malha fechada é grau $s^{${refDeg}}$. Verifique se todas as multiplicações de polos e MMC foram desenvolvidas.</div>
          </div>
        `;
      }
    }

    // 3. Diagnóstico de ganho DC (s = 0)
    if (!diagnosticMsg) {
      const uNum0 = toUnivariateArr(simplifiedUser.num)[0] || 0;
      const uDen0 = toUnivariateArr(simplifiedUser.den)[0] || 0;
      const rNum0 = toUnivariateArr(refRat.num)[0] || 0;
      const rDen0 = toUnivariateArr(refRat.den)[0] || 0;
      if (uDen0 !== 0 && rDen0 !== 0) {
        const userDC = uNum0 / uDen0;
        const refDC = rNum0 / rDen0;
        if (Math.abs(userDC - refDC) > 1e-4) {
          diagnosticMsg = `
            <div style="padding:8px 10px; background:rgba(245, 158, 11, 0.15); border-left:3px solid #f59e0b; border-radius:4px; margin-top:8px;">
              <div style="font-weight:700; color:#fbbf24; margin-bottom:4px;">🔍 Diagnóstico de Ganho em Regime Permanente ($s = 0$):</div>
              <div>O ganho estático da sua expressão ($T(0) = ${userDC.toFixed(3)}$) não confere com o ganho de malha fechada esperado ($T(0) = ${refDC.toFixed(3)}$). Revise as operações com os termos constantes.</div>
            </div>
          `;
        }
      }
    }

    verdictBox.className = "practice-verdict-box error";
    verdictBox.style.display = "block";
    verdictBox.innerHTML = `
      <div style="font-weight:700; font-size:0.92rem; margin-bottom:6px; color:#f87171;">
        ❌ Resposta Divergente da Solução Canônica
      </div>
      <div style="margin-bottom:6px;">
        Sua expressão inserida foi simplificada como: <strong>$$T_{aluno}(s) = ${ratToLatex(simplifiedUser)}$$</strong>
      </div>
      <div>${diagnosticMsg || '<div style="color:#cbd5e1; font-size:0.82rem;">A expressão fornecida não satisfaz o balanço de equações nodais da malha fechada.</div>'}</div>
      <div style="margin-top:10px; font-size:0.82rem; color:#94a3b8;">
        💡 <em>Dica: Não desanime! Clique no botão <strong>"Obter Dica Gradual"</strong> acima para guiar seu raciocínio passo a passo.</em>
      </div>
    `;
    renderMath(verdictBox);
  } catch (err) {
    verdictBox.className = "practice-verdict-box error";
    verdictBox.style.display = "block";
    verdictBox.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">⚠️ Erro de Formatação da Expressão</div>
      <div style="font-size:0.82rem;">Não foi possível interpretar os polinômios inseridos. Formato aceito: <code>s^2 + 4s + 11</code> ou <code>4*s + 12</code>.</div>
    `;
    renderMath(verdictBox);
  }
}

function renderPracticeLevel1() {
  const container = document.getElementById("practiceLevel1Pane");
  if (!container) return;

  const defs = practiceArrowDefs();

  container.innerHTML = `
    <div style="margin-bottom:18px;">
      <h3 style="color:#38bdf8; margin-bottom:6px; font-size:1.1rem;">🔍 Nível 1: Reconhecimento Topológico e Validação de Condições</h3>
      <p style="color:#94a3b8; font-size:0.86rem; margin:0;">
        Antes de aplicar qualquer fórmula, o engenheiro precisa diagnosticar a topologia correta e verificar se as premissas de isolamento e direção de fluxo são válidas.
      </p>
    </div>

    <!-- Exercício 1.1: Cascata com Derivação Intermediária -->
    <div class="practice-card" id="quizCard_p1_q1">
      <div class="practice-card-header">
        <div class="practice-card-title">1.1. Diagnóstico de Condição de Cascata (Série)</div>
        <span class="practice-badge">Validação de Premissa</span>
      </div>
      <div class="practice-desc">
        Avalie o esquema abaixo. É algebricamente válido fundir diretamente os blocos \\(G_1(s)\\) e \\(G_2(s)\\) na relação \\(G_{eq}(s) = G_1(s) \\cdot G_2(s)\\)?
      </div>
      <div style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:12px; margin-bottom:14px; text-align:center;">
        <svg viewBox="0 0 460 110" style="width:100%; max-width:460px; height:auto; display:inline-block;">
          ${defs}
          <line x1="20" y1="45" x2="70" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="35" y="36" fill="#cbd5e1" font-size="12" font-weight="600">R(s)</text>

          <rect x="70" y="25" width="70" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="105" y="50" fill="#f8fafc" font-size="13" font-weight="700" text-anchor="middle">G₁(s)</text>

          <line x1="140" y1="45" x2="240" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <circle cx="185" cy="45" r="4.5" fill="#38bdf8" />

          <line x1="185" y1="45" x2="185" y2="95" stroke="#f59e0b" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="195" y="88" fill="#f59e0b" font-size="11" font-weight="600">X(s) [desvio]</text>

          <rect x="240" y="25" width="70" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="275" y="50" fill="#f8fafc" font-size="13" font-weight="700" text-anchor="middle">G₂(s)</text>

          <line x1="310" y1="45" x2="380" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="360" y="36" fill="#cbd5e1" font-size="12" font-weight="600">C(s)</text>
        </svg>
      </div>
      <div class="quiz-options-list">
        <button type="button" class="quiz-option-btn" data-opt="A" onclick="handlePracticeQuiz('p1_q1', 'A', false, 'Incorreto! A regra de cascata exige estritamente que toda a saída de \\(G_1\\) alimente única e exclusivamente \\(G_2\\). A derivação do sinal \\(X(s)\\) altera o balanço de variáveis do sistema.')">
          <span>(A) Sim, porque os blocos estão dispostos em sequência física direta ao longo do fluxo de sinal.</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="B" onclick="handlePracticeQuiz('p1_q1', 'B', true, 'Correto! O ponto de ramificação intermediário desvia a variável nodal \\(X(s) = G_1(s)R(s)\\) para outra parte do circuito. Se multiplicássemos \\(G_1 \\cdot G_2\\) diretamente, esse nó seria absorvido e a variável \\(X(s)\\) seria perdida. É obrigatório transpor o ponto de tomada antes de associar os blocos.')">
          <span>(B) Não, pois o nó de ramificação intermediário extrai o sinal \\(X(s)\\), violando a premissa de exclusividade nodal da cascata pura.</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="C" onclick="handlePracticeQuiz('p1_q1', 'C', false, 'Incorreto! O valor numérico de ganho de \\(G_2\\) é irrelevante; o impedimento decorre da conservação das variáveis nodais.')">
          <span>(C) Sim, desde que o bloco \\(G_2(s)\\) tenha ganho puramente unitário.</span>
        </button>
      </div>
      <div class="quiz-feedback-box"></div>
    </div>

    <!-- Exercício 1.2: Paralelo Subtrativo -->
    <div class="practice-card" id="quizCard_p1_q2">
      <div class="practice-card-header">
        <div class="practice-card-title">1.2. Associação em Paralelo com Entrada Compartilhada</div>
        <span class="practice-badge">Identificação de Topologia</span>
      </div>
      <div class="practice-desc">
        Analise o diagrama a seguir, onde a entrada \\(R(s)\\) alimenta simultaneamente dois ramos que convergem para um somador. Qual é a função de transferência equivalente \\(T(s) = C(s)/R(s)\\)?
      </div>
      <div style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:12px; margin-bottom:14px; text-align:center;">
        <svg viewBox="0 0 460 130" style="width:100%; max-width:460px; height:auto; display:inline-block;">
          ${defs}
          <line x1="20" y1="65" x2="70" y2="65" stroke="#38bdf8" stroke-width="2" />
          <text x="35" y="56" fill="#cbd5e1" font-size="12" font-weight="600">R(s)</text>
          <circle cx="70" cy="65" r="4.5" fill="#38bdf8" />

          <!-- Ramo Superior G1 -->
          <line x1="70" y1="65" x2="70" y2="30" stroke="#38bdf8" stroke-width="2" />
          <line x1="70" y1="30" x2="130" y2="30" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="130" y="10" width="80" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="170" y="35" fill="#f8fafc" font-size="13" font-weight="700" text-anchor="middle">G₁(s)</text>
          <line x1="210" y1="30" x2="270" y2="30" stroke="#38bdf8" stroke-width="2" />
          <line x1="270" y1="30" x2="270" y2="51" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />

          <!-- Ramo Inferior G2 -->
          <line x1="70" y1="65" x2="70" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="70" y1="100" x2="130" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="130" y="80" width="80" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="170" y="105" fill="#f8fafc" font-size="13" font-weight="700" text-anchor="middle">G₂(s)</text>
          <line x1="210" y1="100" x2="270" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="270" y1="100" x2="270" y2="79" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />

          <!-- Somador -->
          <circle cx="270" cy="65" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="261" y="55" fill="#38bdf8" font-size="11" font-weight="700">+</text>
          <text x="262" y="82" fill="#ef4444" font-size="13" font-weight="700">−</text>

          <!-- Saída C(s) -->
          <line x1="284" y1="65" x2="360" y2="65" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="340" y="56" fill="#cbd5e1" font-size="12" font-weight="600">C(s)</text>
        </svg>
      </div>
      <div class="quiz-options-list">
        <button type="button" class="quiz-option-btn" data-opt="A" onclick="handlePracticeQuiz('p1_q2', 'A', true, 'Correto! Trata-se de uma associação puramente feedforward em paralelo: \\(C(s) = G_1(s)R(s) - G_2(s)R(s) = [G_1(s) - G_2(s)]R(s)\\). Como não há retorno da saída para a entrada, não existe realimentação.')">
          <span>(A) \\(T(s) = G_1(s) - G_2(s)\\) (Paralelo Direto Subtrativo)</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="B" onclick="handlePracticeQuiz('p1_q2', 'B', false, 'Incorreto! Não há laço de malha fechada; o sinal de saída \\(C(s)\\) não retorna para nenhuma entrada.')">
          <span>(B) \\(T(s) = \\frac{G_1(s)}{1 + G_2(s)}\\) (Malha Fechada)</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="C" onclick="handlePracticeQuiz('p1_q2', 'C', false, 'Incorreto! A multiplicação só se aplica a blocos em cascata, nunca a ramificações paralelas.')">
          <span>(C) \\(T(s) = G_1(s) \\cdot G_2(s)\\) (Cascata)</span>
        </button>
      </div>
      <div class="quiz-feedback-box"></div>
    </div>

    <!-- Exercício 1.3: Realimentação Positiva -->
    <div class="practice-card" id="quizCard_p1_q3">
      <div class="practice-card-header">
        <div class="practice-card-title">1.3. Sinal do Somador e Realimentação Positiva (Regenerativa)</div>
        <span class="practice-badge">Sinais e Equacionamento</span>
      </div>
      <div class="practice-desc">
        Observe o laço de realimentação abaixo. O sinal de retorno através de \\(H(s)\\) entra no somador com sinal <strong>positivo (+)</strong>. Qual é a função de transferência de malha fechada correta?
      </div>
      <div style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:12px; margin-bottom:14px; text-align:center;">
        <svg viewBox="0 0 460 130" style="width:100%; max-width:460px; height:auto; display:inline-block;">
          ${defs}
          <line x1="20" y1="45" x2="80" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="35" y="36" fill="#cbd5e1" font-size="12" font-weight="600">R(s)</text>

          <circle cx="95" cy="45" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="75" y="40" fill="#38bdf8" font-size="12" font-weight="700">+</text>
          <text x="91" y="68" fill="#10b981" font-size="12" font-weight="700">+</text>

          <line x1="109" y1="45" x2="160" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="160" y="25" width="80" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="200" y="50" fill="#f8fafc" font-size="13" font-weight="700" text-anchor="middle">G(s)</text>

          <line x1="240" y1="45" x2="360" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="340" y="36" fill="#cbd5e1" font-size="12" font-weight="600">C(s)</text>
          <circle cx="300" cy="45" r="4.5" fill="#38bdf8" />

          <line x1="300" y1="45" x2="300" y2="105" stroke="#38bdf8" stroke-width="2" />
          <line x1="300" y1="105" x2="240" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="160" y="85" width="80" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="200" y="110" fill="#f8fafc" font-size="13" font-weight="700" text-anchor="middle">H(s)</text>
          <line x1="160" y1="105" x2="95" y2="105" stroke="#38bdf8" stroke-width="2" />
          <line x1="95" y1="105" x2="95" y2="59" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
        </svg>
      </div>
      <div class="quiz-options-list">
        <button type="button" class="quiz-option-btn" data-opt="A" onclick="handlePracticeQuiz('p1_q3', 'A', false, 'Incorreto! O denominador \\(1 + GH\\) ocorre exclusivamente quando o somador subtrai a realimentação. Com sinal positivo (+), a transposição de membros resulta em \\(1 - GH\\).')">
          <span>(A) \\(T(s) = \\frac{G(s)}{1 + G(s)H(s)}\\)</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="B" onclick="handlePracticeQuiz('p1_q3', 'B', true, 'Correto! Da equação de nó: \\(C = G(R + HC) \\implies C - GHC = GR \\implies C(1 - GH) = GR \\implies \\frac{C}{R} = \\frac{G}{1 - GH}\\). Essa é a forma clássica de realimentação regenerativa (positiva).')">
          <span>(B) \\(T(s) = \\frac{G(s)}{1 - G(s)H(s)}\\)</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="C" onclick="handlePracticeQuiz('p1_q3', 'C', false, 'Incorreto! A expressão \\(GH - 1\\) inverte o sinal do ganho contínuo da planta de forma espúria.')">
          <span>(C) \\(T(s) = \\frac{G(s)}{G(s)H(s) - 1}\\)</span>
        </button>
      </div>
      <div class="quiz-feedback-box"></div>
    </div>
  `;

  renderMath(container);
}

function renderPracticeLevel2() {
  const container = document.getElementById("practiceLevel2Pane");
  if (!container) return;

  const defs = practiceArrowDefs();

  container.innerHTML = `
    <div style="margin-bottom:18px;">
      <h3 style="color:#38bdf8; margin-bottom:6px; font-size:1.1rem;">⚡ Nível 2: Escolha Estratégica da Próxima Transformação</h3>
      <p style="color:#94a3b8; font-size:0.86rem; margin:0;">
        Em diagramas reais de engenharia com múltiplos laços, a ordem das operações determina se a simplificação será limpa e direta ou se gerará álgebra excessiva e singularidades.
      </p>
    </div>

    <!-- Exercício 2.1: Malhas Aninhadas Concêntricas -->
    <div class="practice-card" id="quizCard_p2_q1">
      <div class="practice-card-header">
        <div class="practice-card-title">2.1. Malha Interna Pura e Laço Externo Global</div>
        <span class="practice-badge">Hierarquia de Resolução</span>
      </div>
      <div class="practice-desc">
        Considere o sistema com dois somadores em sequência, onde o bloco interno \\(G_2(s)\\) possui seu próprio laço de retorno \\(H_1(s)\\), enquanto \\(H_2(s)\\) engloba todo o circuito. Qual deve ser o 1º passo de redução?
      </div>
      <div style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:12px; margin-bottom:14px; text-align:center;">
        <svg viewBox="0 0 500 140" style="width:100%; max-width:500px; height:auto; display:inline-block;">
          ${defs}
          <line x1="10" y1="45" x2="55" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="20" y="36" fill="#cbd5e1" font-size="11" font-weight="600">R(s)</text>

          <circle cx="70" cy="45" r="13" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="52" y="40" fill="#38bdf8" font-size="11" font-weight="700">+</text>
          <text x="66" y="68" fill="#ef4444" font-size="12" font-weight="700">−</text>

          <line x1="83" y1="45" x2="120" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="120" y="27" width="55" height="36" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="147" y="50" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">G₁(s)</text>

          <line x1="175" y1="45" x2="205" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <circle cx="218" cy="45" r="13" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="200" y="40" fill="#38bdf8" font-size="11" font-weight="700">+</text>
          <text x="214" y="68" fill="#ef4444" font-size="12" font-weight="700">−</text>

          <line x1="231" y1="45" x2="265" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="265" y="27" width="60" height="36" rx="4" fill="#0f172a" stroke="#10b981" stroke-width="2" />
          <text x="295" y="50" fill="#34d399" font-size="12" font-weight="700" text-anchor="middle">G₂(s)</text>

          <circle cx="350" cy="45" r="4" fill="#38bdf8" />
          <line x1="325" y1="45" x2="410" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="400" y="36" fill="#cbd5e1" font-size="11" font-weight="600">C(s)</text>

          <line x1="350" y1="45" x2="350" y2="90" stroke="#10b981" stroke-width="1.8" />
          <line x1="350" y1="90" x2="320" y2="90" stroke="#10b981" stroke-width="1.8" marker-end="url(#p-arr)" />
          <rect x="265" y="75" width="55" height="30" rx="4" fill="#0f172a" stroke="#10b981" stroke-width="1.8" />
          <text x="292" y="94" fill="#34d399" font-size="11" font-weight="700" text-anchor="middle">H₁(s)</text>
          <line x1="265" y1="90" x2="218" y2="90" stroke="#10b981" stroke-width="1.8" />
          <line x1="218" y1="90" x2="218" y2="58" stroke="#10b981" stroke-width="1.8" marker-end="url(#p-arr)" />

          <circle cx="380" cy="45" r="4" fill="#38bdf8" />
          <line x1="380" y1="45" x2="380" y2="125" stroke="#38bdf8" stroke-width="1.8" />
          <line x1="380" y1="125" x2="240" y2="125" stroke="#38bdf8" stroke-width="1.8" marker-end="url(#p-arr)" />
          <rect x="180" y="112" width="60" height="26" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="210" y="129" fill="#f8fafc" font-size="11" font-weight="700" text-anchor="middle">H₂(s)</text>
          <line x1="180" y1="125" x2="70" y2="125" stroke="#38bdf8" stroke-width="1.8" />
          <line x1="70" y1="125" x2="70" y2="58" stroke="#38bdf8" stroke-width="1.8" marker-end="url(#p-arr)" />
        </svg>
      </div>
      <div class="quiz-options-list">
        <button type="button" class="quiz-option-btn" data-opt="A" onclick="handlePracticeQuiz('p2_q1', 'A', true, 'Excelente! Como a malha interna \\(G_2\\)-\\(H_1\\) não tem conexões intermediárias cruzadas, ela constitui uma malha fechada canônica pura. Substituí-la por \\(G_{eq2} = \\frac{G_2}{1 + G_2 H_1}\\) transforma imediatamente o sistema em uma cascata \\(G_1 \\cdot G_{eq2}\\) sob um único laço de realimentação com \\(H_2\\).')">
          <span>(A) Reduzir primeiro a malha fechada interna canônica: \\(G_{int}(s) = \\frac{G_2(s)}{1 + G_2(s)H_1(s)}\\).</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="B" onclick="handlePracticeQuiz('p2_q1', 'B', false, 'Incorreto! Mover o somador externo criaria ramificações artificiais desnecessárias, pois a malha interna já é diretamente redutível sem movimentação de nós.')">
          <span>(B) Mover o somador da malha externa para depois de \\(G_1(s)\\).</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="C" onclick="handlePracticeQuiz('p2_q1', 'C', false, 'Incorreto! \\(H_1(s)\\) e \\(H_2(s)\\) atuam em pontos nodais distintos e não podem ser somados em paralelo.')">
          <span>(C) Associar os ramos de retorno \\(H_1(s)\\) e \\(H_2(s)\\) em paralelo.</span>
        </button>
      </div>
      <div class="quiz-feedback-box"></div>
    </div>

    <!-- Exercício 2.2: Laços Cruzados / Entrelaçados -->
    <div class="practice-card" id="quizCard_p2_q2">
      <div class="practice-card-header">
        <div class="practice-card-title">2.2. Desembaraço de Laços Cruzados</div>
        <span class="practice-badge">Transposição de Blocos</span>
      </div>
      <div class="practice-desc">
        Em um sistema onde um ponto de ramificação está situado exatamente entre dois somadores em série, por que não é possível resolver nenhuma das duas malhas diretamente?
      </div>
      <div class="quiz-options-list">
        <button type="button" class="quiz-option-btn" data-opt="A" onclick="handlePracticeQuiz('p2_q2', 'A', true, 'Exato! A presença do ponto de derivação entre os somadores entrelaça os dois laços. É mandatório deslocar o ponto de ramificação (para antes do primeiro somador ou para depois de um bloco) para isolar as malhas antes de aplicar a fórmula de Black.')">
          <span>(A) Porque os laços estão entrelaçados: a derivação retira o sinal antes do segundo somador, violando a integridade canônica de ambas as malhas fechadas.</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="B" onclick="handlePracticeQuiz('p2_q2', 'B', false, 'Incorreto! Somadores em sequência não geram instabilidade no semiplano direito; trata-se de um problema puramente topológico de ordenamento nodal.')">
          <span>(B) Porque somadores adjacentes criam instabilidade no semiplano direito.</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="C" onclick="handlePracticeQuiz('p2_q2', 'C', false, 'Incorreto! As equações do diagrama continuam lineares; a restrição decorre da impossibilidade de aplicar a fórmula pronta de Black sem desembaraçar os nós.')">
          <span>(C) Porque o diagrama torna-se não-linear e a álgebra de blocos deixa de ser válida.</span>
        </button>
      </div>
      <div class="quiz-feedback-box"></div>
    </div>

    <!-- Exercício 2.3: Cascata Interna no Caminho Direto -->
    <div class="practice-card" id="quizCard_p2_q3">
      <div class="practice-card-header">
        <div class="practice-card-title">2.3. Ordem de Redução: Cascata vs. Realimentação</div>
        <span class="practice-badge">Estratégia Sequencial</span>
      </div>
      <div class="practice-desc">
        Um caminho direto contém dois blocos \\(G_1(s)\\) e \\(G_2(s)\\) em série perfeita (sem nós intermediários) dentro de um laço de realimentação negativa com \\(H(s)\\). Qual é a sequência mais direta para obter \\(T(s)\\)?
      </div>
      <div class="quiz-options-list">
        <button type="button" class="quiz-option-btn" data-opt="A" onclick="handlePracticeQuiz('p2_q3', 'A', true, 'Perfeito! Associar a cascata \\(G_{eq} = G_1 \\cdot G_2\\) condensa o caminho direto em um único bloco. Em seguida, a fórmula de Black \\(\\frac{G_{eq}}{1 + G_{eq}H}\\) resolve o sistema em uma única etapa.')">
          <span>(A) 1º: Reduzir a cascata \\(G_{dir}(s) = G_1(s) \\cdot G_2(s)\\); 2º: Aplicar o fechamento de malha \\(\\frac{G_{dir}}{1 + G_{dir}H}\\).</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="B" onclick="handlePracticeQuiz('p2_q3', 'B', false, 'Incorreto! O nó de retorno é tomado após \\(G_2\\). Se fechássemos a malha apenas com \\(G_1\\), o sinal realimentado omitiria a dinâmica de \\(G_2\\), gerando uma função errada.')">
          <span>(B) 1º: Fechar a malha apenas com \\(G_1(s)\\) e \\(H(s)\\); 2º: Multiplicar o resultado por \\(G_2(s)\\).</span>
        </button>
        <button type="button" class="quiz-option-btn" data-opt="C" onclick="handlePracticeQuiz('p2_q3', 'C', false, 'Incorreto! Deslocar o bloco \\(H(s)\\) adicionaria novos nós e operações fracionárias sem nenhuma necessidade.')">
          <span>(C) 1º: Mover o bloco \\(H(s)\\) para antes da entrada \\(R(s)\\).</span>
        </button>
      </div>
      <div class="quiz-feedback-box"></div>
    </div>
  `;

  renderMath(container);
}

function renderPracticeLevel3() {
  const container = document.getElementById("practiceLevel3Pane");
  if (!container) return;

  const defs = practiceArrowDefs();

  container.innerHTML = `
    <div style="margin-bottom:18px;">
      <h3 style="color:#38bdf8; margin-bottom:6px; font-size:1.1rem;">📐 Nível 3: Resolução Completa & Verificador Algébrico Independente</h3>
      <p style="color:#94a3b8; font-size:0.86rem; margin:0;">
        Calcule a função de transferência analítica \\(T(s) = \\frac{N(s)}{D(s)}\\) no papel ou bloco de notas e digite seus polinômios. Nosso motor simbólico testará a equivalência exata \\(N_u(s) D_{ref}(s) - N_{ref}(s) D_u(s) \\equiv 0\\) e diagnosticará automaticamente se você cometeu erros de sinal, grau ou ganhos.
      </p>
    </div>

    <!-- Problema 1 -->
    <div class="practice-card" id="practiceCard_p1">
      <div class="practice-card-header">
        <div class="practice-card-title">${practiceLevel3Data.p1.title}</div>
        <span class="practice-badge">${practiceLevel3Data.p1.badge}</span>
      </div>
      <div class="practice-desc">
        ${practiceLevel3Data.p1.desc}
      </div>
      <div style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:12px; margin-bottom:14px; text-align:center;">
        <svg viewBox="0 0 460 120" style="width:100%; max-width:460px; height:auto; display:inline-block;">
          ${defs}
          <line x1="20" y1="45" x2="80" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="35" y="36" fill="#cbd5e1" font-size="12" font-weight="600">R(s)</text>

          <circle cx="95" cy="45" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="75" y="40" fill="#38bdf8" font-size="12" font-weight="700">+</text>
          <text x="91" y="68" fill="#ef4444" font-size="14" font-weight="700">−</text>

          <line x1="109" y1="45" x2="160" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="160" y="23" width="95" height="44" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="207" y="44" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">10 / (s + 2)</text>
          <text x="207" y="58" fill="#94a3b8" font-size="10" text-anchor="middle">G(s)</text>

          <line x1="255" y1="45" x2="370" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="350" y="36" fill="#cbd5e1" font-size="12" font-weight="600">C(s)</text>
          <circle cx="310" cy="45" r="4.5" fill="#38bdf8" />

          <line x1="310" y1="45" x2="310" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="310" y1="100" x2="255" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="180" y="82" width="75" height="34" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="217" y="103" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">H(s) = 1</text>
          <line x1="180" y1="100" x2="95" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="95" y1="100" x2="95" y2="59" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
        </svg>
      </div>

      <div class="practice-inputs-row">
        <div class="practice-input-group">
          <label for="practice_num_p1">Numerador N(s):</label>
          <input type="text" id="practice_num_p1" placeholder="Ex: 10" />
        </div>
        <div class="practice-input-group">
          <label for="practice_den_p1">Denominador D(s):</label>
          <input type="text" id="practice_den_p1" placeholder="Ex: s + 12" />
        </div>
      </div>

      <div class="practice-actions-row">
        <button type="button" class="practice-verify-btn" onclick="verificarRespostaNivel3('p1')">
          ✅ Verificar Resposta
        </button>
        <button type="button" class="practice-hint-btn" id="practiceHintBtn_p1" onclick="solicitarDicaGradual('p1')">
          💡 Obter Dica Gradual (1/3)
        </button>
        <button type="button" class="practice-reveal-btn" id="practiceSolBtn_p1" onclick="revelarSolucaoNivel3('p1')">
          👁️ Revelar Solução Completa
        </button>
      </div>

      <div class="practice-verdict-box" id="practiceVerdict_p1"></div>
      <div class="practice-hint-box" id="practiceHintBox_p1"></div>
      <div class="practice-solution-box" id="practiceSolBox_p1"></div>
    </div>

    <!-- Problema 2 -->
    <div class="practice-card" id="practiceCard_p2">
      <div class="practice-card-header">
        <div class="practice-card-title">${practiceLevel3Data.p2.title}</div>
        <span class="practice-badge">${practiceLevel3Data.p2.badge}</span>
      </div>
      <div class="practice-desc">
        ${practiceLevel3Data.p2.desc}
      </div>
      <div style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:12px; margin-bottom:14px; text-align:center;">
        <svg viewBox="0 0 460 120" style="width:100%; max-width:460px; height:auto; display:inline-block;">
          ${defs}
          <line x1="20" y1="45" x2="80" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="35" y="36" fill="#cbd5e1" font-size="12" font-weight="600">R(s)</text>

          <circle cx="95" cy="45" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="75" y="40" fill="#38bdf8" font-size="12" font-weight="700">+</text>
          <text x="91" y="68" fill="#ef4444" font-size="14" font-weight="700">−</text>

          <line x1="109" y1="45" x2="160" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="160" y="23" width="95" height="44" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="207" y="44" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">4 / (s + 1)</text>
          <text x="207" y="58" fill="#94a3b8" font-size="10" text-anchor="middle">G(s)</text>

          <line x1="255" y1="45" x2="370" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="350" y="36" fill="#cbd5e1" font-size="12" font-weight="600">C(s)</text>
          <circle cx="310" cy="45" r="4.5" fill="#38bdf8" />

          <line x1="310" y1="45" x2="310" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="310" y1="100" x2="260" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="165" y="80" width="95" height="38" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="212" y="99" fill="#f8fafc" font-size="11" font-weight="700" text-anchor="middle">2 / (s + 3)</text>
          <text x="212" y="112" fill="#94a3b8" font-size="9" text-anchor="middle">H(s)</text>
          <line x1="165" y1="100" x2="95" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="95" y1="100" x2="95" y2="59" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
        </svg>
      </div>

      <div class="practice-inputs-row">
        <div class="practice-input-group">
          <label for="practice_num_p2">Numerador N(s):</label>
          <input type="text" id="practice_num_p2" placeholder="Ex: 4s + 12" />
        </div>
        <div class="practice-input-group">
          <label for="practice_den_p2">Denominador D(s):</label>
          <input type="text" id="practice_den_p2" placeholder="Ex: s^2 + 4s + 11" />
        </div>
      </div>

      <div class="practice-actions-row">
        <button type="button" class="practice-verify-btn" onclick="verificarRespostaNivel3('p2')">
          ✅ Verificar Resposta
        </button>
        <button type="button" class="practice-hint-btn" id="practiceHintBtn_p2" onclick="solicitarDicaGradual('p2')">
          💡 Obter Dica Gradual (1/3)
        </button>
        <button type="button" class="practice-reveal-btn" id="practiceSolBtn_p2" onclick="revelarSolucaoNivel3('p2')">
          👁️ Revelar Solução Completa
        </button>
      </div>

      <div class="practice-verdict-box" id="practiceVerdict_p2"></div>
      <div class="practice-hint-box" id="practiceHintBox_p2"></div>
      <div class="practice-solution-box" id="practiceSolBox_p2"></div>
    </div>

    <!-- Problema 3 -->
    <div class="practice-card" id="practiceCard_p3">
      <div class="practice-card-header">
        <div class="practice-card-title">${practiceLevel3Data.p3.title}</div>
        <span class="practice-badge">${practiceLevel3Data.p3.badge}</span>
      </div>
      <div class="practice-desc">
        ${practiceLevel3Data.p3.desc}
      </div>
      <div style="background:#050811; border:1px solid #1e293b; border-radius:8px; padding:12px; margin-bottom:14px; text-align:center;">
        <svg viewBox="0 0 500 120" style="width:100%; max-width:500px; height:auto; display:inline-block;">
          ${defs}
          <line x1="15" y1="45" x2="65" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="25" y="36" fill="#cbd5e1" font-size="12" font-weight="600">R(s)</text>

          <circle cx="80" cy="45" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="60" y="40" fill="#38bdf8" font-size="12" font-weight="700">+</text>
          <text x="76" y="68" fill="#ef4444" font-size="14" font-weight="700">−</text>

          <line x1="94" y1="45" x2="135" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="135" y="23" width="85" height="44" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="177" y="44" fill="#f8fafc" font-size="11" font-weight="700" text-anchor="middle">3 / (s + 2)</text>
          <text x="177" y="58" fill="#94a3b8" font-size="9" text-anchor="middle">G₁(s)</text>

          <line x1="220" y1="45" x2="260" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="260" y="23" width="85" height="44" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="302" y="44" fill="#f8fafc" font-size="11" font-weight="700" text-anchor="middle">4 / (s + 5)</text>
          <text x="302" y="58" fill="#94a3b8" font-size="9" text-anchor="middle">G₂(s)</text>

          <line x1="345" y1="45" x2="440" y2="45" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <text x="420" y="36" fill="#cbd5e1" font-size="12" font-weight="600">C(s)</text>
          <circle cx="385" cy="45" r="4.5" fill="#38bdf8" />

          <line x1="385" y1="45" x2="385" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="385" y1="100" x2="285" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
          <rect x="195" y="80" width="90" height="38" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
          <text x="240" y="99" fill="#f8fafc" font-size="11" font-weight="700" text-anchor="middle">1 / (s + 1)</text>
          <text x="240" y="112" fill="#94a3b8" font-size="9" text-anchor="middle">H(s)</text>
          <line x1="195" y1="100" x2="80" y2="100" stroke="#38bdf8" stroke-width="2" />
          <line x1="80" y1="100" x2="80" y2="59" stroke="#38bdf8" stroke-width="2" marker-end="url(#p-arr)" />
        </svg>
      </div>

      <div class="practice-inputs-row">
        <div class="practice-input-group">
          <label for="practice_num_p3">Numerador N(s):</label>
          <input type="text" id="practice_num_p3" placeholder="Ex: 12s + 12" />
        </div>
        <div class="practice-input-group">
          <label for="practice_den_p3">Denominador D(s):</label>
          <input type="text" id="practice_den_p3" placeholder="Ex: s^3 + 8s^2 + 17s + 22" />
        </div>
      </div>

      <div class="practice-actions-row">
        <button type="button" class="practice-verify-btn" onclick="verificarRespostaNivel3('p3')">
          ✅ Verificar Resposta
        </button>
        <button type="button" class="practice-hint-btn" id="practiceHintBtn_p3" onclick="solicitarDicaGradual('p3')">
          💡 Obter Dica Gradual (1/3)
        </button>
        <button type="button" class="practice-reveal-btn" id="practiceSolBtn_p3" onclick="revelarSolucaoNivel3('p3')">
          👁️ Revelar Solução Completa
        </button>
      </div>

      <div class="practice-verdict-box" id="practiceVerdict_p3"></div>
      <div class="practice-hint-box" id="practiceHintBox_p3"></div>
      <div class="practice-solution-box" id="practiceSolBox_p3"></div>
    </div>
  `;

  renderMath(container);
}

// Definição dos Grupos e Opções do Hub Inicial
const hubCategoriesData = {
  basic: {
    title: "Topologias Básicas",
    icon: "📐",
    desc: "Formas canônicas e associações fundamentais de sistemas lineares.",
    options: [
      {
        key: "mf_padrao",
        title: "Malha Fechada Canônica [G(s) e H(s)]",
        badge: "Canônico",
        desc: "Sistema clássico com caminho direto G(s) e realimentação H(s) positiva ou negativa."
      },
      {
        key: "cascata_dupla",
        title: "Cascata / Série [G1(s) e G2(s)]",
        badge: "Série",
        desc: "Dois subsistemas lineares ligados em série sem efeito de carga: G_eq = G1 · G2."
      },
      {
        key: "paralelo",
        title: "Paralelo [G1(s) e G2(s)]",
        badge: "Paralelo",
        desc: "A mesma referência R(s) alimentando dois caminhos somados: G_eq = G1 ± G2."
      }
    ]
  },
  examples: {
    title: "Exemplos Clássicos Resolvidos",
    icon: "📖",
    desc: "Casos práticos resolvidos com passos detalhados de redução gráfica.",
    options: [
      {
        key: "exemplo1",
        title: "Exemplo 1 — Movendo Bloco G1 através do Somador",
        badge: "Transposição",
        desc: "Transposição do bloco G1 para a direita do somador, cascata G1·G2 e fechamento da malha."
      },
      {
        key: "exemplo2",
        title: "Exemplo 2 — Três Somadores Consecutivos",
        badge: "Multi-Somador",
        desc: "Unificação de 3 somadores consecutivos e associação de laços de retorno múltiplos em paralelo."
      },
      {
        key: "exemplo3",
        title: "Exemplo 3 — Ramos s·s e 1/s em Paralelo",
        badge: "Composto",
        desc: "Redução composta: ramo paralelo (s² + 1/s), realimentação interna unitária e retorno externo s."
      }
    ]
  },
  exercises: {
    title: "Exercícios Propostos",
    icon: "✏️",
    desc: "Problemas desafiadores para exames e fixação analítica de controle.",
    options: [
      {
        key: "proposto1",
        title: "Exercício Proposto 1 — Malha Interna e Feedback Combinado",
        badge: "Fixação 1",
        desc: "Diagrama com malha interna H2, ramo bifurcado 1/G2 e sub-bloco final G3/(1+G3*H3)."
      },
      {
        key: "proposto2",
        title: "Exercício Proposto 2 — Malhas Cruzadas",
        badge: "Fixação 2",
        desc: "Redução por álgebra de blocos: movendo ponto de ramificação para desembaraçar laços entrelaçados."
      }
    ]
  },
  algebraic: {
    title: "Método Algébrico de Equações de Nós",
    icon: "🔢",
    desc: "Resolução por equações de somadores e substituição analítica sucessiva [1], [2]...",
    options: [
      {
        key: "custom",
        title: "Equações Algébricas dos Nós do Diagrama",
        badge: "Equações [1], [2]...",
        desc: "Insira as equações lineares dos somadores e blocos para resolução analítica por substituição."
      }
    ]
  },
  practice: {
    title: "Modo de Prática Interativa (3 Níveis)",
    icon: "🧪",
    desc: "Exercícios com 3 níveis de autonomia, dicas graduais e verificador algébrico independente.",
    options: [
      {
        key: "pratica_nivel1",
        title: "Nível 1: Reconhecimento Topológico",
        badge: "Conceitual",
        desc: "Avalie se as condições de aplicação de cascata, paralelo e realimentação são válidas."
      },
      {
        key: "pratica_nivel2",
        title: "Nível 2: Escolha da Próxima Transformação",
        badge: "Estratégia",
        desc: "Identifique qual transformação deve ser executada primeiro em sistemas acoplados."
      },
      {
        key: "pratica_nivel3",
        title: "Nível 3: Resolução Completa & Verificador Independente",
        badge: "Cálculo Real",
        desc: "Resolva o sistema analiticamente e receba validação matemática com dicas graduais."
      }
    ]
  }
};

let activeCategoryKey = null;
let lastFocusedBeforeModal = null;

function toggleShortcutsModal(show) {
  const modal = document.getElementById("shortcutsModal");
  if (!modal) return;
  const isCurrentlyOpen = modal.style.display === "flex";
  const shouldOpen = typeof show === "boolean" ? show : !isCurrentlyOpen;

  if (shouldOpen) {
    lastFocusedBeforeModal = document.activeElement;
    modal.style.display = "flex";
    const closeBtn = modal.querySelector(".btn-close-modal");
    if (closeBtn) closeBtn.focus();
  } else {
    modal.style.display = "none";
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
  }
}

function handleCardKeydown(evt, catKey) {
  if (evt.key === "Enter" || evt.key === " ") {
    evt.preventDefault();
    if (catKey === "practice") {
      abrirModoPratica();
    } else if (catKey === "builder") {
      abrirConstrutorLivre();
    } else {
      toggleCategoryTray(catKey);
    }
  }
}

function toggleCategoryTray(catKey) {
  const tray = document.getElementById("categoryOptionsTray");
  const cards = document.querySelectorAll(".hub-category-card");

  if (activeCategoryKey === catKey && tray && tray.style.display !== "none") {
    tray.style.display = "none";
    cards.forEach(c => {
      c.classList.remove("active");
      c.setAttribute("aria-expanded", "false");
    });
    activeCategoryKey = null;
    return;
  }

  activeCategoryKey = catKey;
  cards.forEach(c => {
    const isAct = c.id === `cardCat_${catKey}`;
    c.classList.toggle("active", isAct);
    c.setAttribute("aria-expanded", isAct ? "true" : "false");
  });

  const cat = hubCategoriesData[catKey];
  if (!cat || !tray) return;

  const currentPreset = document.getElementById("presetSelect") ? document.getElementById("presetSelect").value : "";

  tray.innerHTML = `
    <div class="tray-header-row">
      <div class="tray-title">${cat.icon} Opções em: ${cat.title}</div>
      <div class="tray-subtitle">${cat.desc}</div>
    </div>
    <div class="options-tiles-grid" role="list">
      ${cat.options.map(opt => `
        <div class="option-tile-card ${opt.key === currentPreset ? 'active' : ''}" role="button" tabindex="0" aria-label="${opt.title}. Clique ou pressione Enter para selecionar." onclick="selectPresetFromHub('${opt.key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); selectPresetFromHub('${opt.key}');}">
          <div class="tile-top">
            <div class="tile-title">${opt.title}</div>
            <span class="tile-badge">${opt.badge}</span>
          </div>
          <div class="tile-desc">${opt.desc}</div>
          <div class="tile-action-btn">▶ Selecionar & Configurar</div>
        </div>
      `).join("")}
    </div>
  `;
  tray.style.display = "block";
}

function selectPresetFromHub(key) {
  if (key && key.startsWith("pratica_")) {
    abrirModoPratica();
    if (key === "pratica_nivel1") switchPracticeTab('level1');
    else if (key === "pratica_nivel2") switchPracticeTab('level2');
    else if (key === "pratica_nivel3") switchPracticeTab('level3');
    return;
  }

  const sel = document.getElementById("presetSelect");
  if (sel) sel.value = key;
  loadPreset();
  calcular();
  
  // Atualiza classe active nos cards de opção
  const tiles = document.querySelectorAll(".option-tile-card");
  tiles.forEach(t => {
    const isSelected = t.getAttribute("onclick") && t.getAttribute("onclick").includes(key);
    t.classList.toggle("active", !!isSelected);
  });

  // Rola suavemente até os parâmetros
  const grid = document.getElementById("presetMainGrid");
  if (grid) {
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function toggleBuilderExtraPanels() {
  const wrap = document.getElementById("builderExtraPanelsWrapper");
  const btn = document.getElementById("btnToggleLists");
  if (!wrap) return;
  const isHidden = wrap.style.display === "none" || !wrap.style.display;
  wrap.style.display = isHidden ? "block" : "none";
  if (btn) {
    btn.classList.toggle("active-mode", isHidden);
    btn.innerText = isHidden ? "📋 Ocultar Lista" : "📋 Lista de Blocos";
  }
}

function selectPresetFromButton(key) {
  const sel = document.getElementById("presetSelect");
  if (sel) sel.value = key;
  loadPreset();
  calcular();
}

function toggleFieldHelp(id) {
  const box = document.getElementById(`help_${id}`);
  if (box) {
    box.style.display = box.style.display === "none" ? "block" : "none";
  }
}

function syncPresetButtons(activeKey) {
  const btns = document.querySelectorAll(".btn-preset-choice");
  btns.forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-preset") === activeKey);
  });
  const tiles = document.querySelectorAll(".option-tile-card");
  tiles.forEach(t => {
    const isSelected = t.getAttribute("onclick") && t.getAttribute("onclick").includes(activeKey);
    t.classList.toggle("active", !!isSelected);
  });
}

function loadPreset() {
  const sel = document.getElementById("presetSelect");
  const key = sel ? sel.value : "";
  if (key === "construtor_livre") {
    abrirPaginaCriacaoDiagrama();
    return;
  }

  syncPresetButtons(key);

  const mainGrid = document.getElementById("presetMainGrid");
  const container = document.getElementById("dynamicInputs");
  const descEl = document.getElementById("topologiaDesc");
  const svg = document.getElementById("schematicSvg");
  const actionBtns = document.getElementById("presetActionButtons");
  const stepsDiv = document.getElementById("stepsList");
  const schematicCard = document.getElementById("schematicCard");
  const memorialContainer = document.getElementById("memorialContainer");
  const cardTitle = document.getElementById("parametersCardTitle");

  if (container) container.innerHTML = "";
  if (stepsDiv) stepsDiv.innerHTML = "";

  if (!key || !presets[key]) {
    if (mainGrid) mainGrid.style.display = "none";
    if (descEl) descEl.innerText = "";
    if (svg) svg.innerHTML = "";
    if (actionBtns) actionBtns.style.display = "none";
    if (schematicCard) schematicCard.style.display = "none";
    if (memorialContainer) memorialContainer.style.display = "none";
    if (cardTitle) cardTitle.innerText = "1. Parâmetros da Topologia";
    currentPresetStages = [];
    currentPresetStageIdx = 0;
    renderPresetStageNav();
    return;
  }

  // Exibe o painel de parâmetros e o esquemático
  if (mainGrid) mainGrid.style.display = "grid";
  if (schematicCard) schematicCard.style.display = "block";
  if (actionBtns) actionBtns.style.display = "flex";

  const data = presets[key];
  if (cardTitle) {
    cardTitle.innerHTML = `1. Parâmetros: <span style="color: var(--primary);">${data.title}</span>`;
  }
  if (descEl) descEl.innerText = data.desc;

  // Banner explicativo com dicas de formatação e valores literais vs numéricos
  const banner = document.createElement("div");
  banner.className = "fields-guide-banner";
  banner.innerHTML = `
    💡 <b>Parâmetros Simbólicos e Numéricos:</b> Mantenha os campos como <code>G(s)</code> e <code>H(s)</code> para dedução literal, ou insira funções em $s$ (ex: <code>2/(s+1)</code>, <code>10/(s+2)</code>, <code>1</code>). Clique em <b>?</b> ao lado de cada parâmetro para ver instruções e exemplos.
  `;
  container.appendChild(banner);

  data.fields.forEach(f => {
    const wrapper = document.createElement("div");
    wrapper.className = "field-wrapper";

    const labelRow = document.createElement("div");
    labelRow.className = "field-label-row";

    const label = document.createElement("label");
    label.innerText = f.label;
    labelRow.appendChild(label);

    const helpBtn = document.createElement("button");
    helpBtn.type = "button";
    helpBtn.className = "info-help-btn";
    helpBtn.innerText = "?";
    helpBtn.title = "Clique para ver instruções de formato e exemplos em LaTeX";
    helpBtn.onclick = () => toggleFieldHelp(f.id);
    labelRow.appendChild(helpBtn);
    wrapper.appendChild(labelRow);

    // Caixa de ajuda colapsável
    const helpBox = document.createElement("div");
    helpBox.className = "field-help-box";
    helpBox.id = `help_${f.id}`;
    helpBox.style.display = "none";
    helpBox.innerHTML = `
      <div class="field-help-header">ℹ️ Instruções do Parâmetro: ${f.label}</div>
      <p style="margin:0 0 5px 0;">${f.helpText || "Insira a função de transferência do bloco ou mantenha simbólico."}</p>
      <ul style="margin:4px 0 0 16px; padding:0; font-size:0.77rem; color:#94a3b8;">
        <li><b>Modo Simbólico:</b> <code>${f.default}</code> (gera a dedução literal pura em LaTeX).</li>
        <li><b>Modo Numérico em s:</b> Exemplos aceitos: <code>2/(s+1)</code>, <code>10/(s+2)</code>, <code>5/(s*(s+3))</code>, <code>s^2 + 2s + 1</code>, <code>1</code>.</li>
        <li><b>Operações:</b> Use <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>^</code> e parênteses <code>( )</code>.</li>
      </ul>
    `;
    wrapper.appendChild(helpBox);

    if (f.type === "textarea") {
      const area = document.createElement("textarea");
      area.id = f.id;
      area.rows = 5;
      area.value = f.default;
      wrapper.appendChild(area);
    } else if (f.type === "select") {
      const selField = document.createElement("select");
      selField.id = f.id;
      f.options.forEach(opt => {
        const o = document.createElement("option");
        o.value = opt;
        o.innerText = opt;
        if (opt === f.default) o.selected = true;
        selField.appendChild(o);
      });
      wrapper.appendChild(selField);
    } else {
      const inp = document.createElement("input");
      inp.id = f.id;
      inp.type = "text";
      inp.value = f.default;
      inp.placeholder = `Ex: ${f.default} ou 2/(s+1)`;
      wrapper.appendChild(inp);
    }
    container.appendChild(wrapper);
  });

  currentPresetStages = [{ shortLabel: "Original", svg: data.svg }];
  currentPresetStageIdx = 0;
  renderPresetStageNav();

  if (svg) svg.innerHTML = `${svgDefs()}${data.svg}`;
}

function resetForm() {
  const sel = document.getElementById("presetSelect");
  const currentKey = sel ? sel.value : "";
  if (currentKey && presets[currentKey]) {
    loadPreset();
    calcular();
  } else {
    if (sel) sel.value = "";
    loadPreset();
  }
}

function addStep(container, num, title, contentHtml, mathLaTeX, stepSvg, stepCaption) {
  const box = document.createElement("div");
  box.className = "step-box";
  
  let mathBlock = "";
  if (mathLaTeX) {
    if (mathLaTeX.includes("&=") || mathLaTeX.includes("\\\\")) {
      mathBlock = `<div class="math-display">$$\\begin{aligned}${mathLaTeX}\\end{aligned}$$</div>`;
    } else {
      mathBlock = `<div class="math-display">$$${mathLaTeX}$$</div>`;
    }
  }

  let diagramBlock = "";
  if (stepSvg) {
    const cap = stepCaption || `Estado do Diagrama na Etapa ${num}`;
    diagramBlock = `
      <div class="step-diagram-wrapper">
        <div class="step-diagram-caption">
          <span>📐 ${cap}</span>
          <span style="color:var(--text-muted); font-weight:normal; font-size:0.72rem;">Etapa ${num}</span>
        </div>
        <div class="step-diagram-svg-box">
          <svg viewBox="0 0 600 230">${svgDefs()}${stepSvg}</svg>
        </div>
      </div>
    `;
    currentPresetStages.push({
      shortLabel: `Etapa ${num}`,
      svg: stepSvg
    });
  }

  box.innerHTML = `
    <div class="step-title">Etapa ${num}: ${title}</div>
    <div class="step-content">${contentHtml}</div>
    ${mathBlock}
    ${diagramBlock}
  `;
  container.appendChild(box);
}

function calcular() {
  const key = document.getElementById("presetSelect").value;
  const memorialContainer = document.getElementById("memorialContainer");
  if (!key || !presets[key]) {
    if (memorialContainer) memorialContainer.style.display = "none";
    return;
  }
  if (key === "construtor_livre") {
    abrirPaginaCriacaoDiagrama();
    return;
  }

  if (memorialContainer) memorialContainer.style.display = "block";

  const stepsDiv = document.getElementById("stepsList");
  stepsDiv.innerHTML = "";
  currentPresetStages = [{ shortLabel: "0. Original", svg: presets[key].svg }];
  currentPresetStageIdx = 0;

  if (key === "mf_padrao") {
    executarMFPadrao(stepsDiv);
  } else if (key === "cascata_dupla") {
    executarCascata(stepsDiv);
  } else if (key === "paralelo") {
    executarParalelo(stepsDiv);
  } else if (key === "exemplo1") {
    executarExemplo1(stepsDiv);
  } else if (key === "exemplo2") {
    executarExemplo2(stepsDiv);
  } else if (key === "exemplo3") {
    executarExemplo3(stepsDiv);
  } else if (key === "proposto1") {
    executarProposto1(stepsDiv);
  } else if (key === "proposto2") {
    executarProposto2(stepsDiv);
  } else if (key === "custom") {
    executarCustom(stepsDiv);
  }

  renderPresetStageNav();
  renderMath(stepsDiv);
}

function executarMFPadrao(container) {
  const G = document.getElementById("G").value.trim();
  const H = document.getElementById("H").value.trim();
  const isNeg = document.getElementById("sinal").value.includes("Negativa");
  const sinalDen = isNeg ? "+" : "-";
  const sinalErro = isNeg ? "-" : "+";
  const corSinal = isNeg ? "#ef4444" : "#10b981";

  const svgEtapa1 = `
    <text x="300" y="22" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold">Equações [1] e [2]: Sinais R(s), E(s), C(s)H(s) e C(s)</text>
    <line x1="40" y1="105" x2="104" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="50" y="95" fill="#94a3b8" font-size="11" font-weight="bold">R(s)</text>
    <circle cx="120" cy="105" r="16" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="108" y="102" fill="#38bdf8" font-size="11">+</text>
    <text x="117" y="118" fill="${corSinal}" font-size="12" font-weight="bold">${sinalErro}</text>
    <line x1="136" y1="105" x2="210" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="152" y="95" fill="#fbbf24" font-size="11" font-weight="bold">E(s)</text>
    ${drawSvgBlockBox(265, 105, G, "1", { width: 110, caption: "G(s)" })}
    <line x1="320" y1="105" x2="500" y2="105" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="465" y="95" fill="#10b981" font-size="11" font-weight="bold">C(s)</text>
    <circle cx="400" cy="105" r="4" fill="#38bdf8" />
    <line x1="400" y1="105" x2="400" y2="175" stroke="#38bdf8" stroke-width="2" />
    <line x1="400" y1="175" x2="320" y2="175" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(265, 175, H, "1", { width: 110, stroke: "#a855f7", caption: "H(s)" })}
    <line x1="210" y1="175" x2="120" y2="175" stroke="#38bdf8" stroke-width="2" />
    <text x="145" y="167" fill="#c084fc" font-size="11" font-weight="bold">C(s)H(s)</text>
    <line x1="120" y1="175" x2="120" y2="121" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  const svgEtapa2 = `
    <text x="300" y="22" text-anchor="middle" fill="#a855f7" font-size="10.5" font-weight="bold">Substituindo [2] em [1]: E(s) = R(s) ${sinalErro} C(s)H(s) multiplicado por G(s)</text>
    <rect x="95" y="65" width="330" height="140" rx="8" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,5" />
    <line x1="35" y1="110" x2="104" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="45" y="100" fill="#94a3b8" font-size="11">R(s)</text>
    <circle cx="120" cy="110" r="16" fill="#131c2e" stroke="#f59e0b" stroke-width="2" />
    <text x="108" y="107" fill="#38bdf8" font-size="11">+</text>
    <text x="117" y="123" fill="${corSinal}" font-size="12" font-weight="bold">${sinalErro}</text>
    <line x1="136" y1="110" x2="230" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="145" y="98" fill="#fbbf24" font-size="10">R(s) ${sinalErro} C(s)H(s)</text>
    ${drawSvgBlockBox(285, 110, "G(s)", "1", { width: 105, stroke: "#f59e0b" })}
    <line x1="338" y1="110" x2="510" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="480" y="100" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="400" cy="110" r="4" fill="#a855f7" />
    <line x1="400" y1="110" x2="400" y2="175" stroke="#a855f7" stroke-width="2" />
    <line x1="400" y1="175" x2="120" y2="175" stroke="#a855f7" stroke-width="2" />
    <text x="245" y="192" fill="#c084fc" font-size="10.5">Sinal Realimentado: C(s)H(s)</text>
    <line x1="120" y1="175" x2="120" y2="126" stroke="#a855f7" stroke-width="2" marker-end="url(#arrow-purple)" />
  `;

  const ratG = parseRatExpr(G);
  const ratH = parseRatExpr(H);
  const ratT = ratFeedback(ratG, ratH, isNeg ? "-" : "+");
  const partsT = ratToCompactParts(ratT);

  const svgEtapa3 = drawSingleBlockEquivalentSvg(
    "G(s)",
    `1 ${sinalDen} G(s)H(s)`,
    "R(s)",
    "C(s)",
    "Equação [3]: Bloco Equivalente da Malha Fechada (MF)"
  );

  const svgEtapa4 = drawSingleBlockEquivalentSvg(
    partsT.num,
    partsT.den,
    "R(s)",
    "C(s)",
    `Diagrama Final Reduzido [C(s)/R(s)]`
  );

  addStep(container, 1, "Equacionamento dos Sinais do Diagrama",
    "Escrevendo a equação da saída $C(s)$ $[1]$ e a equação do sinal de erro $E(s)$ na saída do somador $[2]$:",
    String.raw`C(s) &= E(s) G(s) \qquad [1] \\
E(s) &= R(s) ${sinalErro} C(s) H(s) \qquad [2]`,
    svgEtapa1, "Diagrama com Sinais R(s), E(s), C(s)H(s) e C(s)");

  addStep(container, 2, "Substituindo a Equação [2] em [1]",
    "Substituindo a expressão de $E(s)$ $[2]$ diretamente na equação da saída $[1]$:",
    String.raw`C(s) &= [R(s) ${sinalErro} C(s) H(s)] \cdot G(s) \\
C(s) &= R(s) G(s) ${sinalErro} C(s) G(s) H(s)`,
    svgEtapa2, "Substituição de E(s) no Bloco G(s)");

  addStep(container, 3, "Isolamento de $C(s)$ — Equação [3]",
    "Passando o termo em $C(s)$ para o primeiro membro e colocando $C(s)$ em evidência:",
    String.raw`C(s) \cdot [1 ${sinalDen} G(s) H(s)] &= R(s) G(s) \\
C(s) &= \frac{G(s)}{1 ${sinalDen} G(s) H(s)} \cdot R(s) \qquad [3]`,
    svgEtapa3, "Bloco Equivalente de Malha Fechada");

  const fullFeedbackStepsLatex = explainRatFeedbackLatex("\\frac{C(s)}{R(s)}", ratG, ratH, isNeg ? "-" : "+");

  addStep(container, 4, "Substituição Algébrica Passo a Passo de $G(s)$ e $H(s)$ (MMC e Simplificação)",
    "Substituindo $G(s)$ e $H(s)$ na Equação $[3]$, calculando o produto $G(s)H(s)$, tirando o MMC no denominador e simplificando a divisão de frações:",
    fullFeedbackStepsLatex,
    svgEtapa4, "Diagrama Final Simplificado");

  const isNumericG = G.includes("s") || /[0-9]/.test(G);
  const isNumericH = H.includes("s") || /[0-9]/.test(H);
  const scilabG = isNumericG && !/^[A-Za-z_]+$/.test(G) ? G : "10 / (s + 2)";
  const scilabH = isNumericH && !/^[A-Za-z_]+$/.test(H) ? H : "1";

  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Resultado Analítico Final — Passo a Passo Completo</h3>
    <div class="math-display">
      $$\\begin{aligned}
      C(s) &= \\frac{G(s)}{1 ${sinalDen} G(s)H(s)} \\cdot R(s) \\qquad [3] \\\\[6pt]
      ${fullFeedbackStepsLatex}
      \\end{aligned}$$
    </div>
    ${buildAnalyticalSummaryHtml(ratT, "R", "C")}
    <div style="font-size:0.85rem; font-weight:700; color:var(--text); margin-top:10px;">Script Pronto para Simulação no Scilab:</div>
    <div class="scilab-box">s = %s;
G = ${scilabG};
H = ${scilabH};
T = syslin('c', minss(G / (1 ${sinalDen} G * H)));
disp(T, "Função de Transferência de Malha Fechada C(s)/R(s):");</div>
  `;
  container.appendChild(resBox);
}

function executarCascata(container) {
  const G1 = document.getElementById("G1").value.trim();
  const G2 = document.getElementById("G2").value.trim();
  const G3El = document.getElementById("G3");
  const G3 = G3El ? G3El.value.trim() : "1";
  const hasG3 = G3 && G3 !== "1";

  const rG1 = parseRatExpr(G1);
  const rG2 = parseRatExpr(G2);
  const rG3 = parseRatExpr(G3);
  const rat12 = ratMul(rG1, rG2);
  const ratT = hasG3 ? ratMul(rat12, rG3) : rat12;
  const partsT = ratToCompactParts(ratT);

  const svgEtapa1 = hasG3 ? `
    <text x="300" y="24" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="bold">Formato em Cascata (em Série): Sinais Intermediários X2(s) e X1(s)</text>
    <rect x="85" y="65" width="420" height="90" rx="8" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,5" />
    <line x1="25" y1="110" x2="95" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="45" y="100" fill="#94a3b8" font-size="11">R(s)</text>
    ${drawSvgBlockBox(135, 110, G1, "1", { width: 80, caption: "G1(s)" })}
    <line x1="175" y1="110" x2="250" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="212" y="98" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">X2(s) = G1·R</text>
    ${drawSvgBlockBox(290, 110, G2, "1", { width: 80, caption: "G2(s)" })}
    <line x1="330" y1="110" x2="405" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="368" y="98" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">X1(s) = G2·X2</text>
    ${drawSvgBlockBox(445, 110, G3, "1", { width: 80, caption: "G3(s)" })}
    <line x1="485" y1="110" x2="565" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="535" y="100" fill="#94a3b8" font-size="11">C(s)</text>
  ` : `
    <text x="300" y="24" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="bold">Formato em Cascata (em Série): G1(s) e G2(s)</text>
    <rect x="125" y="65" width="315" height="90" rx="8" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,5" />
    <line x1="45" y1="110" x2="140" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="70" y="100" fill="#94a3b8" font-size="11">R(s)</text>
    ${drawSvgBlockBox(185, 110, G1, "1", { width: 95, caption: "G1(s)" })}
    <line x1="233" y1="110" x2="330" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="280" y="98" text-anchor="middle" fill="#fbbf24" font-size="10.5" font-weight="bold">X1(s) = G1(s)R(s)</text>
    ${drawSvgBlockBox(378, 110, G2, "1", { width: 95, caption: "G2(s)" })}
    <line x1="426" y1="110" x2="540" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="500" y="100" fill="#94a3b8" font-size="11">C(s)</text>
  `;

  const svgEtapa2 = drawSingleBlockEquivalentSvg(
    partsT.num,
    partsT.den,
    "R(s)",
    "C(s)",
    hasG3
      ? "Bloco Único Equivalente G3(s)·G2(s)·G1(s)"
      : "Bloco Único Equivalente G2(s)·G1(s)"
  );

  const mulStepsLatex = hasG3
    ? `${explainRatMulLatex("G_{12}(s) = G_2(s)G_1(s)", rG2, rG1)} \\\\[4pt]\n${explainRatMulLatex("\\frac{C(s)}{R(s)} = G_3(s)G_{12}(s)", rG3, rat12)}`
    : explainRatMulLatex("\\frac{C(s)}{R(s)} = G_2(s)G_1(s)", rG2, rG1);

  if (hasG3) {
    addStep(container, 1, "Equacionamento dos Sinais Intermediários",
      "Equacionando passo a passo da entrada $R(s)$ até a saída $C(s)$:",
      String.raw`X_2(s) &= G_1(s) R(s) \qquad [1] \\
X_1(s) &= G_2(s) X_2(s) = G_2(s) G_1(s) R(s) \qquad [2] \\
C(s) &= G_3(s) X_1(s) = G_3(s) G_2(s) G_1(s) R(s) \qquad [3]`,
      svgEtapa1, "Subsistemas Conectados em Cascata (Série)");

    addStep(container, 2, "Multiplicação Algébrica Passo a Passo dos Blocos em Série",
      "Multiplicando numeradores entre si e denominadores entre si, expandindo os polinômios:",
      mulStepsLatex,
      svgEtapa2, "Diagrama Reduzido Final (Bloco Único)");
  } else {
    addStep(container, 1, "Equacionamento dos Sinais Intermediários",
      "Equacionando passo a passo da entrada $R(s)$ até a saída $C(s)$:",
      String.raw`X_1(s) &= G_1(s) R(s) \qquad [1] \\
C(s) &= G_2(s) X_1(s) = G_2(s) G_1(s) R(s) \qquad [2]`,
      svgEtapa1, "Subsistemas Conectados em Cascata (Série)");

    addStep(container, 2, "Multiplicação Algébrica Passo a Passo na Saída $C(s)$",
      "Multiplicando numeradores e denominadores e expandindo o polinômio resultante:",
      mulStepsLatex,
      svgEtapa2, "Diagrama Reduzido Final (Bloco Único)");
  }

  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Resultado Analítico Final — Passo a Passo em Cascata</h3>
    <div class="math-display">
      $$\\begin{aligned}
      ${mulStepsLatex}
      \\end{aligned}$$
    </div>
    ${buildAnalyticalSummaryHtml(ratT, "R", "C")}
    <div style="font-size:0.85rem; font-weight:700; color:var(--text); margin-top:10px;">Script Pronto para Simulação no Scilab:</div>
    <div class="scilab-box">s = %s;
G1 = ${G1};
G2 = ${G2};${hasG3 ? `\nG3 = ${G3};\nT = syslin('c', G3 * G2 * G1);` : `\nT = syslin('c', G2 * G1);`}
disp(T, "T(s) em cascata:");</div>
  `;
  container.appendChild(resBox);
}

function executarParalelo(container) {
  const G1 = document.getElementById("G1").value.trim();
  const G2 = document.getElementById("G2").value.trim();
  const isSoma = document.getElementById("operacao").value.includes("Soma");
  const op = isSoma ? "+" : "-";
  const rG1 = parseRatExpr(G1);
  const rG2 = parseRatExpr(G2);
  const ratT = isSoma ? ratAdd(rG1, rG2) : ratSub(rG1, rG2);
  const partsT = ratToCompactParts(ratT);

  const svgEtapa1 = `
    <text x="300" y="20" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="bold">Formato em Paralelo: Sinais X1(s) = R(s)G1(s) e X2(s) = R(s)G2(s)</text>
    <rect x="98" y="30" width="265" height="165" rx="8" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,5" />
    <line x1="40" y1="110" x2="110" y2="110" stroke="#38bdf8" stroke-width="2" />
    <text x="55" y="100" fill="#94a3b8" font-size="11">R(s)</text>
    <circle cx="110" cy="110" r="4" fill="#38bdf8" />
    <line x1="110" y1="110" x2="110" y2="65" stroke="#38bdf8" stroke-width="2" />
    <line x1="110" y1="65" x2="165" y2="65" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="110" y1="110" x2="110" y2="155" stroke="#38bdf8" stroke-width="2" />
    <line x1="110" y1="155" x2="165" y2="155" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(215, 65, G1, "1", { width: 100 })}
    ${drawSvgBlockBox(215, 155, G2, "1", { width: 100 })}
    <line x1="265" y1="65" x2="335" y2="65" stroke="#38bdf8" stroke-width="2" />
    <text x="295" y="57" fill="#fbbf24" font-size="10" font-weight="bold">X1(s)</text>
    <line x1="335" y1="65" x2="335" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="265" y1="155" x2="335" y2="155" stroke="#38bdf8" stroke-width="2" />
    <text x="295" y="147" fill="#fbbf24" font-size="10" font-weight="bold">X2(s)</text>
    <line x1="335" y1="155" x2="335" y2="125" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="335" cy="110" r="15" fill="#131c2e" stroke="#f59e0b" stroke-width="2" />
    <text x="331" y="104" fill="#38bdf8" font-size="11">+</text>
    <text x="331" y="122" fill="${isSoma ? '#10b981' : '#ef4444'}" font-size="12" font-weight="bold">${op}</text>
    <line x1="350" y1="110" x2="500" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="455" y="100" fill="#94a3b8" font-size="11">C(s)</text>
  `;

  const svgEtapa2 = drawSingleBlockEquivalentSvg(
    partsT.num,
    partsT.den,
    "R(s)",
    "C(s)",
    `Bloco Único Equivalente [G1(s) ${op} G2(s)]`
  );

  const parStepsLatex = explainRatAddSubLatex("\\frac{C(s)}{R(s)} = G_1(s) " + op + " G_2(s)", rG1, rG2, op);

  addStep(container, 1, "Equacionamento dos Ramos Paralelos",
    "O mesmo sinal $R(s)$ alimenta ambos os blocos a partir do ponto de ramificação:",
    String.raw`X_1(s) &= R(s) G_1(s) \qquad [1] \\
X_2(s) &= R(s) G_2(s) \qquad [2] \\
C(s) &= X_1(s) ${op} X_2(s) = [G_1(s) ${op} G_2(s)] R(s) \qquad [3]`,
    svgEtapa1, "Ramos Paralelos X1(s) e X2(s) Identificados");

  addStep(container, 2, "Redução ao Mesmo Denominador (MMC) e Soma Algébrica",
    "Calculando o MMC entre os denominadores de $G_1(s)$ e $G_2(s)$, expandindo o numerador e agrupando os termos de mesma potência em $s$:",
    parStepsLatex,
    svgEtapa2, "Diagrama Reduzido Final (Bloco Único)");

  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Resultado Analítico Final — Passo a Passo em Paralelo</h3>
    <div class="math-display">
      $$\\begin{aligned}
      ${parStepsLatex}
      \\end{aligned}$$
    </div>
    ${buildAnalyticalSummaryHtml(ratT, "R", "C")}
    <div style="font-size:0.85rem; font-weight:700; color:var(--text); margin-top:10px;">Script Pronto para Simulação no Scilab:</div>
    <div class="scilab-box">s = %s;
G1 = ${G1};
G2 = ${G2};
T = syslin('c', G1 ${op} G2);
disp(T, "T(s) paralelo:");</div>
  `;
  container.appendChild(resBox);
}

function executarExemplo1(container) {
  const isNeg = document.getElementById("sinalEx1").value.includes("Negativa");
  const sinalSoma = isNeg ? "-" : "+";
  const sinalDen = isNeg ? "+" : "-";
  const corSinal = isNeg ? "#ef4444" : "#10b981";

  const svgEtapa1 = `
    <text x="300" y="20" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="bold">Passo 1: Move G1(s) para após o somador e multiplica em cascata</text>
    <text x="20" y="105" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="50" y1="100" x2="106" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="120" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="109" y="103" fill="#38bdf8" font-size="10">+</text>
    <text x="117" y="112" fill="${corSinal}" font-size="11" font-weight="bold">${sinalSoma}</text>
    <line x1="134" y1="100" x2="210" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(290, 100, "G1·G2·G3(s)", "1", { width: 160, stroke: "#10b981" })}
    <line x1="370" y1="100" x2="545" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="520" y="90" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="465" cy="100" r="4" fill="#38bdf8" />
    <line x1="465" y1="100" x2="465" y2="175" stroke="#38bdf8" stroke-width="2" />
    <line x1="465" y1="175" x2="360" y2="175" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(290, 175, "H1·H2(s)", "G1(s)", { width: 140, height: 44, stroke: "#f59e0b" })}
    <line x1="220" y1="175" x2="120" y2="175" stroke="#38bdf8" stroke-width="2" />
    <line x1="120" y1="175" x2="120" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  const svgEtapa2 = drawSingleBlockEquivalentSvg(
    "G1·G2·G3(s)",
    `1 ${sinalDen} G2·G3·H1·H2(s)`,
    "R(s)",
    "C(s)",
    "Passo 2: Eliminação da Malha Fechada (Cancelamento de G1 no denominador)"
  );

  addStep(container, 1, "Movendo $G_1(s)$ para Depois do Ponto de Soma e Associando em Cascata",
    `<ul>
      <li>Pela regra de <b>mover bloco de antes para depois do ponto de soma</b>, ao deslocar $G_1(s)$ para a direita do somador, divide-se o ramo de realimentação por $G_1(s)$.</li>
      <li>Em seguida, pela regra do <b>formato em cascata</b>, multiplicam-se os blocos em série no ramo direto ($G_1 G_2 G_3$) e no ramo de realimentação ($\\frac{H_1 H_2}{G_1}$).</li>
    </ul>`,
    String.raw`E(s) &= G_1(s) R(s) ${sinalSoma} H_1(s) H_2(s) C(s) = G_1(s) \cdot \left[R(s) ${sinalSoma} \frac{H_1(s) H_2(s)}{G_1(s)} C(s)\right] \\
G_{\text{direto}}(s) &= G_1(s) G_2(s) G_3(s), \qquad H_{\text{eq}}(s) = \frac{H_1(s) H_2(s)}{G_1(s)}`,
    svgEtapa1, "Diagrama Intermediário do Exemplo 1");

  addStep(container, 2, "Formato em Malha Fechada — Cancelamento de $G_1(s)$ no Ganho de Laço",
    "Aplicando a equação da malha fechada e simplificando $G_1(s)$ no produto $G_{\\text{direto}}(s) H_{\\text{eq}}(s)$:",
    String.raw`\frac{C(s)}{R(s)} &= \frac{G_{\text{direto}}(s)}{1 ${sinalDen} G_{\text{direto}}(s) H_{\text{eq}}(s)} \\
&= \frac{G_1(s) G_2(s) G_3(s)}{1 ${sinalDen} \cancel{G_1(s)} G_2(s) G_3(s) \cdot \frac{H_1(s) H_2(s)}{\cancel{G_1(s)}}} \\
&= \frac{G_1 G_2 G_3(s)}{1 ${sinalDen} G_2 G_3 H_1 H_2(s)}`,
    svgEtapa2, "Diagrama Final Reduzido");

  const ratEx1 = parseRatExpr(`(G_1*G_2*G_3)/(1 ${sinalDen} G_2*G_3*H_1*H_2)`);
  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Resultado Analítico Final — Passo a Passo do Exemplo 1</h3>
    <div class="math-display">
      $$\\begin{aligned}
      C(s) &= G_2(s) G_3(s) \\cdot [G_1(s) R(s) ${sinalSoma} H_1(s) H_2(s) C(s)] \\qquad [1] \\\\
      C(s) &= G_1(s) G_2(s) G_3(s) R(s) ${sinalSoma} G_2(s) G_3(s) H_1(s) H_2(s) C(s) \\qquad [2] \\\\
      C(s) \\cdot [1 ${sinalDen} G_2(s) G_3(s) H_1(s) H_2(s)] &= G_1(s) G_2(s) G_3(s) R(s) \\qquad [3] \\\\
      \\frac{C(s)}{R(s)} &= \\frac{G_1 G_2 G_3(s)}{1 ${sinalDen} G_2 G_3 H_1 H_2(s)}
      \\end{aligned}$$
    </div>
    ${buildAnalyticalSummaryHtml(ratEx1, "R", "C")}
  `;
  container.appendChild(resBox);
}

function executarExemplo2(container) {
  const svgEtapaA = `
    <text x="300" y="18" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold">Etapa (a): Unificação dos 3 pontos de soma em um único somador</text>
    <text x="15" y="100" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="45" y1="95" x2="78" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(112, 95, "G1(s)", "1", { width: 68 })}
    <line x1="146" y1="95" x2="188" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="204" cy="95" r="16" fill="#131c2e" stroke="#f59e0b" stroke-width="2" />
    <text x="192" y="98" fill="#38bdf8" font-size="10">+</text>
    <text x="200" y="85" fill="#ef4444" font-size="10" font-weight="bold">-</text>
    <text x="200" y="108" fill="#10b981" font-size="10" font-weight="bold">+</text>
    <text x="210" y="108" fill="#ef4444" font-size="10" font-weight="bold">-</text>
    <line x1="220" y1="95" x2="275" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(312, 95, "G2(s)", "1", { width: 74 })}
    <line x1="349" y1="95" x2="395" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(432, 95, "G3(s)", "1", { width: 74 })}
    <line x1="469" y1="95" x2="565" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="540" y="85" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="505" cy="95" r="4" fill="#38bdf8" />
    <!-- H1 superior (-) -->
    <line x1="505" y1="95" x2="505" y2="38" stroke="#38bdf8" stroke-width="2" />
    <line x1="505" y1="38" x2="385" y2="38" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(345, 38, "H1(s)", "1", { width: 80, height: 32, stroke: "#a855f7" })}
    <line x1="305" y1="38" x2="204" y2="38" stroke="#38bdf8" stroke-width="2" />
    <line x1="204" y1="38" x2="204" y2="79" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- H2 intermediário (+) -->
    <line x1="505" y1="95" x2="505" y2="152" stroke="#38bdf8" stroke-width="2" />
    <line x1="505" y1="152" x2="385" y2="152" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(345, 152, "H2(s)", "1", { width: 80, height: 32, stroke: "#a855f7" })}
    <line x1="305" y1="152" x2="200" y2="152" stroke="#38bdf8" stroke-width="2" />
    <line x1="200" y1="152" x2="200" y2="111" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- H3 inferior (-) -->
    <line x1="505" y1="152" x2="505" y2="202" stroke="#38bdf8" stroke-width="2" />
    <line x1="505" y1="202" x2="385" y2="202" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(345, 202, "H3(s)", "1", { width: 80, height: 32, stroke: "#a855f7" })}
    <line x1="305" y1="202" x2="210" y2="202" stroke="#38bdf8" stroke-width="2" />
    <line x1="210" y1="202" x2="210" y2="111" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  const svgEtapaB = `
    <text x="300" y="20" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Etapa (b): Cascata G3(s)G2(s) e Paralelo H1(s) - H2(s) + H3(s) com sinal (-)</text>
    <text x="15" y="100" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="45" y1="95" x2="85" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(125, 95, "G1(s)", "1", { width: 80 })}
    <line x1="165" y1="95" x2="210" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="225" cy="95" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="215" y="98" fill="#38bdf8" font-size="10">+</text>
    <text x="222" y="107" fill="#ef4444" font-size="11" font-weight="bold">-</text>
    <line x1="239" y1="95" x2="295" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(365, 95, "G3(s)G2(s)", "1", { width: 140, stroke: "#10b981" })}
    <line x1="435" y1="95" x2="555" y2="95" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="530" y="85" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="490" cy="95" r="4" fill="#38bdf8" />
    <line x1="490" y1="95" x2="490" y2="175" stroke="#38bdf8" stroke-width="2" />
    <line x1="490" y1="175" x2="455" y2="175" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(360, 175, "H1(s) - H2(s) + H3(s)", "1", { width: 190, height: 38, stroke: "#f59e0b" })}
    <line x1="265" y1="175" x2="225" y2="175" stroke="#38bdf8" stroke-width="2" />
    <line x1="225" y1="175" x2="225" y2="109" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  const svgEtapaC = drawSingleBlockEquivalentSvg(
    "G3(s)G2(s)G1(s)",
    "1 + G3(s)G2(s)[H1(s) - H2(s) + H3(s)]",
    "R(s)",
    "C(s)",
    "Etapa (c): Fechamento da Malha e Multiplicação em Série por G1(s)"
  );

  addStep(container, 1, "Etapa (a) — Unificação dos Pontos de Soma Adjacentes",
    "Como os três somadores estão em série sem blocos intermediários, podem ser unificados em um único ponto de soma mantendo os sinais de cada ramo ($-H_1$, $+H_2$, $-H_3$):",
    String.raw`E_1(s) &= G_1(s)R(s) - H_1(s)C(s) \qquad [1] \\
E_2(s) &= E_1(s) + H_2(s)C(s) \qquad [2] \\
E(s) &= E_2(s) - H_3(s)C(s) = G_1(s)R(s) - H_1(s)C(s) + H_2(s)C(s) - H_3(s)C(s) \qquad [3]`,
    svgEtapaA, "Etapa (a): Somadores Unificados");

  addStep(container, 2, "Etapa (b) — Associação em Série de $G_2, G_3$ e em Paralelo de $H_1, H_2, H_3$",
    `<ul>
      <li><b>Formato em Cascata:</b> os blocos $G_2(s)$ e $G_3(s)$ são multiplicados em série $\\implies G_3(s)G_2(s)$.</li>
      <li><b>Formato em Paralelo:</b> colocando o sinal negativo ($-$) em evidência na entrada do somador, os três ramos de realimentação paralelos unificam-se em $[H_1(s) - H_2(s) + H_3(s)]$:</li>
    </ul>`,
    String.raw`-H_1(s)C(s) + H_2(s)C(s) - H_3(s)C(s) &= -\,[H_1(s) - H_2(s) + H_3(s)]\,C(s) \\
G_{\text{série}}(s) &= G_3(s)G_2(s), \qquad H_{\text{par}}(s) = H_1(s) - H_2(s) + H_3(s)`,
    svgEtapaB, "Etapa (b): Malha Fechada Equivalente");

  addStep(container, 3, "Etapa (c) — Eliminação da Malha Fechada e Cascata com $G_1(s)$",
    "Aplicando o formato em malha fechada e multiplicando em cascata pelo bloco de entrada $G_1(s)$:",
    String.raw`\frac{C(s)}{E_{\text{ent}}(s)} &= \frac{G_{\text{série}}(s)}{1 + G_{\text{série}}(s) H_{\text{par}}(s)} = \frac{G_3(s)G_2(s)}{1 + G_3(s)G_2(s)[H_1(s) - H_2(s) + H_3(s)]} \\
\frac{C(s)}{R(s)} &= G_1(s) \cdot \frac{C(s)}{E_{\text{ent}}(s)} = \frac{G_3(s)G_2(s)G_1(s)}{1 + G_3(s)G_2(s)[H_1(s) - H_2(s) + H_3(s)]}`,
    svgEtapaC, "Etapa (c): Bloco Único Final");

  const ratEx2 = parseRatExpr("(G_1*G_2*G_3)/(1 + G_2*G_3*(H_1 - H_2 + H_3))");
  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Resultado Analítico Final — Passo a Passo do Exemplo 2</h3>
    <div class="math-display">
      $$\\begin{aligned}
      C(s) &= G_3(s)G_2(s) \\cdot E(s) \\qquad [1] \\\\
      E(s) &= G_1(s)R(s) - [H_1(s) - H_2(s) + H_3(s)] C(s) \\qquad [2] \\\\
      C(s) &= G_3(s)G_2(s)G_1(s) R(s) - G_3(s)G_2(s)[H_1(s) - H_2(s) + H_3(s)] C(s) \\qquad [3] \\\\
      C(s) \\cdot \\{1 + G_3(s)G_2(s)[H_1(s) - H_2(s) + H_3(s)]\\} &= G_3(s)G_2(s)G_1(s) R(s) \\qquad [4] \\\\
      \\frac{C(s)}{R(s)} &= \\frac{G_3(s)G_2(s)G_1(s)}{1 + G_3(s)G_2(s)[H_1(s) - H_2(s) + H_3(s)]}
      \\end{aligned}$$
    </div>
    ${buildAnalyticalSummaryHtml(ratEx2, "R", "C")}
  `;
  container.appendChild(resBox);
}

function executarExemplo3(container) {
  // Etapa 1: Cascata s·s = s² e paralelo s² + 1/s = (s³+1)/s (com somador de 3 entradas)
  const svgEtapa1 = `
    <text x="300" y="18" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Passo 1: Cascata s·s = s² e Paralelo s² + 1/s = (s³ + 1)/s</text>
    <text x="20" y="105" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="50" y1="100" x2="106" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="120" cy="100" r="15" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="109" y="103" fill="#38bdf8" font-size="10">+</text>
    <text x="117" y="90" fill="#ef4444" font-size="10" font-weight="bold">-</text>
    <text x="117" y="113" fill="#ef4444" font-size="10" font-weight="bold">-</text>
    <line x1="135" y1="100" x2="215" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(265, 100, "s³ + 1", "s", { width: 100, stroke: "#10b981" })}
    <line x1="315" y1="100" x2="425" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="370" cy="100" r="3.5" fill="#38bdf8" />
    <!-- Realimentação unitária superior -->
    <line x1="370" y1="100" x2="370" y2="42" stroke="#38bdf8" stroke-width="2" />
    <line x1="370" y1="42" x2="120" y2="42" stroke="#38bdf8" stroke-width="2" />
    <line x1="120" y1="42" x2="120" y2="85" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- Bloco 1/s e malha externa s -->
    ${drawSvgBlockBox(460, 100, "1", "s", { width: 70 })}
    <line x1="495" y1="100" x2="575" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="555" y="90" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="535" cy="100" r="3.5" fill="#38bdf8" />
    <line x1="535" y1="100" x2="535" y2="188" stroke="#38bdf8" stroke-width="2" />
    <line x1="535" y1="188" x2="320" y2="188" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(285, 188, "s", "1", { width: 70, height: 34, stroke: "#a855f7" })}
    <line x1="250" y1="188" x2="120" y2="188" stroke="#38bdf8" stroke-width="2" />
    <line x1="120" y1="188" x2="120" y2="115" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 2: Desmembramento do somador de 3 entradas em 2 somadores em série, isolando malha interna [1]
  const svgEtapa2 = `
    <text x="300" y="18" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="bold">Passo 2: Desmembramento do somador em 2 somadores em série (Malha interna H = 1)</text>
    <text x="15" y="105" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="42" y1="100" x2="80" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="94" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="84" y="103" fill="#38bdf8" font-size="10">+</text>
    <text x="91" y="112" fill="#ef4444" font-size="10">-</text>
    <line x1="108" y1="100" x2="152" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="166" cy="100" r="14" fill="#131c2e" stroke="#f59e0b" stroke-width="2" />
    <text x="156" y="103" fill="#38bdf8" font-size="10">+</text>
    <text x="163" y="92" fill="#ef4444" font-size="10">-</text>
    <line x1="180" y1="100" x2="230" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(280, 100, "s³ + 1", "s", { width: 100, stroke: "#10b981" })}
    <line x1="330" y1="100" x2="430" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="380" cy="100" r="3.5" fill="#38bdf8" />
    <!-- Malha unitária superior com bloco [1] -->
    <line x1="380" y1="100" x2="380" y2="42" stroke="#38bdf8" stroke-width="2" />
    <line x1="380" y1="42" x2="305" y2="42" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(275, 42, "1", "1", { width: 55, height: 28, stroke: "#f59e0b" })}
    <line x1="247" y1="42" x2="166" y2="42" stroke="#38bdf8" stroke-width="2" />
    <line x1="166" y1="42" x2="166" y2="86" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- Bloco 1/s e malha externa s -->
    ${drawSvgBlockBox(465, 100, "1", "s", { width: 70 })}
    <line x1="500" y1="100" x2="575" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="558" y="90" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="535" cy="100" r="3.5" fill="#38bdf8" />
    <line x1="535" y1="100" x2="535" y2="190" stroke="#38bdf8" stroke-width="2" />
    <line x1="535" y1="190" x2="325" y2="190" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(290, 190, "s", "1", { width: 70, height: 34, stroke: "#a855f7" })}
    <line x1="255" y1="190" x2="94" y2="190" stroke="#38bdf8" stroke-width="2" />
    <line x1="94" y1="190" x2="94" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 3: Malha interna eliminada -> (s³+1)/(s³+s+1) em série com 1/s
  const svgEtapa3 = `
    <text x="300" y="22" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Passo 3: Malha interna fechada em (s³ + 1)/(s³ + s + 1) em série com 1/s</text>
    <text x="20" y="105" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="48" y1="100" x2="96" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="110" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="100" y="103" fill="#38bdf8" font-size="10">+</text>
    <text x="107" y="112" fill="#ef4444" font-size="10">-</text>
    <line x1="124" y1="100" x2="185" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(250, 100, "s³ + 1", "s³ + s + 1", { width: 130, stroke: "#10b981" })}
    <line x1="315" y1="100" x2="395" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(430, 100, "1", "s", { width: 70 })}
    <line x1="465" y1="100" x2="570" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="550" y="90" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="520" cy="100" r="3.5" fill="#38bdf8" />
    <line x1="520" y1="100" x2="520" y2="185" stroke="#38bdf8" stroke-width="2" />
    <line x1="520" y1="185" x2="335" y2="185" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(300, 185, "s", "1", { width: 70, height: 34, stroke: "#a855f7" })}
    <line x1="265" y1="185" x2="110" y2="185" stroke="#38bdf8" stroke-width="2" />
    <line x1="110" y1="185" x2="110" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 4: Bloco único final
  const svgEtapa4 = drawSingleBlockEquivalentSvg(
    "s³ + 1",
    "2s⁴ + s² + 2s",
    "R(s)",
    "C(s)",
    "Passo 4: Cascata com 1/s e Fechamento da Malha Externa s"
  );

  addStep(container, 1, "Cascata $s \\cdot s$ e Associação em Paralelo com $1/s$",
    "Multiplicando os dois blocos $s$ em cascata ($s \\cdot s = s^2$) e somando em paralelo com o bloco $1/s$ pelo MMC:",
    String.raw`G_{\text{série}}(s) &= s \cdot s = s^2 \\
G_{\text{paralelo}}(s) &= G_{\text{série}}(s) + \frac{1}{s} = \frac{s^2}{1} + \frac{1}{s} = \frac{s^2 \cdot s + 1 \cdot 1}{s} = \frac{s^3 + 1}{s}`,
    svgEtapa1, "Passo 1: Ramo (s³ + 1)/s");

  addStep(container, 2, "Desmembramento do Ponto de Soma em Dois Somadores em Série",
    "Separando o somador de 3 entradas em dois somadores consecutivos para isolar a malha fechada interna com realimentação unitária $H_{\\text{int}}(s) = 1$:",
    String.raw`E_{1}(s) &= R(s) - s \cdot C(s) \\
E_{\text{int}}(s) &= E_{1}(s) - 1 \cdot X_{\text{int}}(s) = [R(s) - s C(s)] - X_{\text{int}}(s)`,
    svgEtapa2, "Passo 2: Somador Desmembrado e Malha Unitária Isolada");

  addStep(container, 3, "Eliminação da Malha Fechada Interna Unitária",
    "Aplicando o formato em malha fechada para o bloco $\\frac{s^3+1}{s}$ com $H(s) = 1$, tirando o MMC no denominador e cancelando o fator $s$:",
    String.raw`G_{\text{mf1}}(s) &= \frac{\frac{s^3 + 1}{s}}{1 + \left(\frac{s^3 + 1}{s}\right) \cdot 1} = \frac{\frac{s^3 + 1}{s}}{\frac{s + (s^3 + 1)}{s}} \\
G_{\text{mf1}}(s) &= \frac{s^3 + 1}{\cancel{s}} \cdot \frac{\cancel{s}}{s^3 + s + 1} = \frac{s^3 + 1}{s^3 + s + 1}`,
    svgEtapa3, "Passo 3: Malha Interna Reduzida");

  addStep(container, 4, "Cascata com $1/s$ e Eliminação da Malha Fechada Externa $H(s) = s$",
    "Multiplicando em série por $\\frac{1}{s}$ e fechando a malha externa com realimentação negativa $H(s) = s$ passo a passo:",
    String.raw`G_{\text{direto}}(s) &= \left(\frac{s^3 + 1}{s^3 + s + 1}\right) \cdot \left(\frac{1}{s}\right) = \frac{s^3 + 1}{s(s^3 + s + 1)} = \frac{s^3 + 1}{s^4 + s^2 + s} \\
\frac{C(s)}{R(s)} &= \frac{G_{\text{direto}}(s)}{1 + G_{\text{direto}}(s) \cdot s} = \frac{\frac{s^3 + 1}{s^4 + s^2 + s}}{1 + \left(\frac{s^3 + 1}{s^4 + s^2 + s}\right) \cdot s} = \frac{\frac{s^3 + 1}{s^4 + s^2 + s}}{\frac{(s^4 + s^2 + s) + s(s^3 + 1)}{s^4 + s^2 + s}} \\
\frac{C(s)}{R(s)} &= \frac{s^3 + 1}{\cancel{s^4 + s^2 + s}} \cdot \frac{\cancel{s^4 + s^2 + s}}{(s^4 + s^2 + s) + (s^4 + s)} = \frac{s^3 + 1}{2s^4 + s^2 + 2s}`,
    svgEtapa4, "Passo 4: Bloco Único Final");

  const ratEx3 = parseRatExpr("(s^3 + 1)/(2*s^4 + s^2 + 2*s)");
  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Função de Transferência Final — Passo a Passo Completo (Exemplo 3)</h3>
    <div class="math-display">
      $$\\begin{aligned}
      G_{\\text{paralelo}}(s) &= s \\cdot s + \\frac{1}{s} = \\frac{s^3 + 1}{s} \\\\[4pt]
      G_{\\text{mf1}}(s) &= \\frac{\\frac{s^3 + 1}{s}}{1 + \\frac{s^3 + 1}{s} \\cdot 1} = \\frac{s^3 + 1}{s^3 + s + 1} \\\\[4pt]
      G_{\\text{direto}}(s) &= \\frac{s^3 + 1}{s^3 + s + 1} \\cdot \\frac{1}{s} = \\frac{s^3 + 1}{s^4 + s^2 + s} \\\\[4pt]
      \\frac{C(s)}{R(s)} &= \\frac{\\frac{s^3 + 1}{s^4 + s^2 + s}}{1 + \\left(\\frac{s^3 + 1}{s^4 + s^2 + s}\\right) \\cdot s} = \\frac{s^3 + 1}{(s^4 + s^2 + s) + (s^4 + s)} = \\mathbf{\\frac{s^3 + 1}{2s^4 + s^2 + 2s}}
      \\end{aligned}$$
    </div>
    ${buildAnalyticalSummaryHtml(ratEx3, "R", "C")}
    <div class="scilab-box">s = %s;
G_dir = (s^3 + 1) / (s^4 + s^2 + s);
H = s;
T = syslin('c', minss(G_dir / (1 + G_dir * H)));
disp(T, "Função de Transferência Final:");</div>
  `;
  container.appendChild(resBox);
}

function executarProposto1(container) {
  const g1In = (document.getElementById("G1") ? document.getElementById("G1").value.trim() : "G1") || "G1";
  const g2In = (document.getElementById("G2") ? document.getElementById("G2").value.trim() : "G2") || "G2";
  const g3In = (document.getElementById("G3") ? document.getElementById("G3").value.trim() : "G3") || "G3";
  const h1In = (document.getElementById("H1") ? document.getElementById("H1").value.trim() : "H1") || "H1";
  const h2In = (document.getElementById("H2") ? document.getElementById("H2").value.trim() : "H2") || "H2";
  const h3In = (document.getElementById("H3") ? document.getElementById("H3").value.trim() : "H3") || "H3";
  const isDefaultSymbolic =
    g1In === "G1" && g2In === "G2" && g3In === "G3" &&
    h1In === "H1" && h2In === "H2" && h3In === "H3";

  // Etapa 1: Malha interna (G2 com H2) entre V2 e V4 reduzida e ramo paralelo (1 + 1/G2) entre V4 e V6/V7 unificado
  const svgEtapa1 = `
    <text x="300" y="20" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Passo 1: Malha H2(s) reduzida e paralelo 1 + 1/G2(s) unificado</text>
    <text x="12" y="105" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="36" y1="100" x2="62" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="75" cy="100" r="13" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="65" y="103" fill="#38bdf8" font-size="9">+</text>
    <text x="72" y="111" fill="#ef4444" font-size="9">-</text>
    <line x1="88" y1="100" x2="120" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="104" y="90" text-anchor="middle" fill="#fbbf24" font-size="9.5">V1(s)</text>
    ${drawSvgBlockBox(152, 100, "G1(s)", "1", { width: 64 })}
    <line x1="184" y1="100" x2="215" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="200" y="90" text-anchor="middle" fill="#fbbf24" font-size="9.5">V2(s)</text>
    ${drawSvgBlockBox(265, 100, "G2(s)", "1 + G2(s)H2(s)", { width: 100, stroke: "#10b981" })}
    <line x1="315" y1="100" x2="365" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="340" y="90" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-weight="bold">V4(s)</text>
    <circle cx="340" cy="100" r="3.5" fill="#38bdf8" />
    ${drawSvgBlockBox(405, 100, "G2(s) + 1", "G2(s)", { width: 82, stroke: "#10b981" })}
    <line x1="446" y1="100" x2="472" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="459" y="90" text-anchor="middle" fill="#fbbf24" font-size="9.5">V7(s)</text>
    ${drawSvgBlockBox(520, 100, "G3(s)", "1 + G3(s)H3(s)", { width: 96 })}
    <line x1="568" y1="100" x2="594" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- Realimentação H1 saindo de V4 -->
    <line x1="340" y1="100" x2="340" y2="180" stroke="#38bdf8" stroke-width="2" />
    <line x1="340" y1="180" x2="235" y2="180" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(200, 180, "H1(s)", "1", { width: 70, height: 34, stroke: "#a855f7" })}
    <line x1="165" y1="180" x2="75" y2="180" stroke="#38bdf8" stroke-width="2" />
    <line x1="75" y1="180" x2="75" y2="113" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 2: Malha de V4 com H1 fechada -> 3 blocos em cascata pura
  const svgEtapa2 = `
    <text x="300" y="24" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Passo 2: Cascata com G1(s) e Fechamento da Malha H1(s) até V4(s)</text>
    <text x="15" y="115" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="42" y1="110" x2="75" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(175, 110, "G1(s)G2(s)", "1 + G2(s)H2(s) + G1(s)G2(s)H1(s)", { width: 200, stroke: "#10b981" })}
    <line x1="275" y1="110" x2="315" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="295" y="98" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">V4(s)</text>
    ${drawSvgBlockBox(360, 110, "G2(s) + 1", "G2(s)", { width: 90 })}
    <line x1="405" y1="110" x2="438" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="421" y="98" text-anchor="middle" fill="#fbbf24" font-size="10">V7(s)</text>
    ${drawSvgBlockBox(490, 110, "G3(s)", "1 + G3(s)H3(s)", { width: 104 })}
    <line x1="542" y1="110" x2="585" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="568" y="100" fill="#94a3b8" font-size="11">C(s)</text>
  `;

  // Etapa 3: Destaque da multiplicação dos 3 blocos em cascata e corte de G2(s)
  const svgEtapa3 = `
    <text x="300" y="24" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="bold">Passo 3: Associação em Cascata dos 3 Blocos e Cancelamento de G2(s)</text>
    <rect x="68" y="65" width="480" height="90" rx="8" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,5" />
    <line x1="30" y1="110" x2="75" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(175, 110, "G1(s)G2(s)", "1 + G2(s)H2(s) + G1(s)G2(s)H1(s)", { width: 200, stroke: "#f59e0b" })}
    <line x1="275" y1="110" x2="315" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(360, 110, "G2(s) + 1", "G2(s)", { width: 90, stroke: "#f59e0b" })}
    <line x1="405" y1="110" x2="438" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(490, 110, "G3(s)", "1 + G3(s)H3(s)", { width: 104, stroke: "#f59e0b" })}
    <line x1="542" y1="110" x2="585" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 4: Bloco único final
  const svgEtapa4 = drawSingleBlockEquivalentSvg(
    "G1(s) · [G2(s) + 1] · G3(s)",
    "[1 + G2(s)H2(s) + G1(s)G2(s)H1(s)] · [1 + G3(s)H3(s)]",
    "R(s)",
    "C(s)",
    "Passo 4: Diagrama Final Reduzido em Bloco Único"
  );

  addStep(container, 1, "Redução da Malha Interna $H_2(s)$ e do Paralelo em $V_4(s)$",
    `<ul>
      <li><b>Malha Fechada Interna:</b> entre os sinais $V_2(s)$, $V_3(s)$ e $V_4(s)$, temos $V_4(s) = G_2(s) V_3(s)$ e $V_3(s) = V_2(s) - V_5(s) = V_2(s) - H_2(s) V_4(s)$.</li>
      <li><b>Formato em Paralelo:</b> após $V_4(s)$, o ramo unitário $1$ soma-se em paralelo com o ramo superior $V_6(s) = \\frac{1}{G_2(s)} V_4(s)$ tirando o MMC $G_2(s)$.</li>
    </ul>`,
    String.raw`V_4(s) &= G_2(s)[V_2(s) - H_2(s)V_4(s)] \implies V_4(s)[1 + G_2(s)H_2(s)] = G_2(s)V_2(s) \implies \frac{V_4(s)}{V_2(s)} = \frac{G_2(s)}{1 + G_2(s)H_2(s)} \\
V_7(s) &= V_4(s) + V_6(s) = \left[1 + \frac{1}{G_2(s)}\right] V_4(s) = \left[\frac{G_2(s) + 1}{G_2(s)}\right] V_4(s)`,
    svgEtapa1, "Diagrama após Simplificar a Malha H2(s) e o Paralelo 1 + 1/G2(s)");

  addStep(container, 2, "Cascata com $G_1(s)$ e Fechamento da Malha $H_1(s)$ em $V_4(s)$",
    "Multiplicando $G_1(s)$ em cascata ($V_2(s) = G_1(s)V_1(s)$) e aplicando o formato em malha fechada com a realimentação $H_1(s)$ tomada de $V_4(s)$, tirando o MMC no denominador:",
    String.raw`\frac{V_4(s)}{R(s)} &= \frac{G_1(s) \cdot \frac{G_2(s)}{1 + G_2(s)H_2(s)}}{1 + \left(\frac{G_1(s)G_2(s)}{1 + G_2(s)H_2(s)}\right) \cdot H_1(s)} = \frac{\frac{G_1(s)G_2(s)}{1 + G_2(s)H_2(s)}}{\frac{[1 + G_2(s)H_2(s)] + G_1(s)G_2(s)H_1(s)}{1 + G_2(s)H_2(s)}} \\
\frac{V_4(s)}{R(s)} &= \frac{G_1(s) G_2(s)}{\cancel{1 + G_2(s)H_2(s)}} \cdot \frac{\cancel{1 + G_2(s)H_2(s)}}{1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)} = \frac{G_1(s) G_2(s)}{1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)}`,
    svgEtapa2, "Diagrama Reduzido a 3 Blocos em Cascata");

  addStep(container, 3, "Formato em Cascata até a Saída $C(s)$",
    "Multiplicando os 3 blocos em série da entrada $R(s)$ até a saída $C(s)$:",
    String.raw`C(s) &= \left[\frac{G_3(s)}{1 + G_3(s)H_3(s)}\right] V_7(s) = \left[\frac{G_3(s)}{1 + G_3(s)H_3(s)}\right] \left[\frac{G_2(s) + 1}{G_2(s)}\right] V_4(s) \\
\frac{C(s)}{R(s)} &= \left[\frac{G_1(s)G_2(s)}{1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)}\right] \cdot \left[\frac{G_2(s) + 1}{G_2(s)}\right] \cdot \left[\frac{G_3(s)}{1 + G_3(s)H_3(s)}\right]`,
    svgEtapa3, "Associação em Série dos 3 Blocos");

  let extraNumericLatex = "";
  let rTotalNumeric = null;
  if (!isDefaultSymbolic) {
    const rG1 = parseRatExpr(g1In);
    const rG2 = parseRatExpr(g2In);
    const rG3 = parseRatExpr(g3In);
    const rH1 = parseRatExpr(h1In);
    const rH2 = parseRatExpr(h2In);
    const rH3 = parseRatExpr(h3In);
    const rInner = ratFeedback(rG2, rH2, "-");
    const rLoop1 = ratFeedback(ratMul(rG1, rInner), rH1, "-");
    const rPar = ratAdd(parseRatExpr("1"), ratDiv(parseRatExpr("1"), rG2));
    const rFinalBlk = ratFeedback(rG3, rH3, "-");
    rTotalNumeric = ratMul(ratMul(rLoop1, rPar), rFinalBlk);
    extraNumericLatex = String.raw` \\ \frac{C(s)}{R(s)} &= ${ratToLatex(rTotalNumeric)}`;
  }

  addStep(container, 4, "Simplificação do Fator $G_2(s)$ e Função de Transferência Final",
    "Cancelando o fator $\\cancel{G_2(s)}$ do numerador do 1º bloco com o denominador do 2º bloco:",
    String.raw`\frac{C(s)}{R(s)} &= \frac{G_1(s)\,\cancel{G_2(s)} \cdot [G_2(s) + 1] \cdot G_3(s)}{[1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)] \cdot \cancel{G_2(s)} \cdot [1 + G_3(s)H_3(s)]} \\
\frac{C(s)}{R(s)} &= \frac{G_1(s) \cdot [G_2(s) + 1] \cdot G_3(s)}{[1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)] \cdot [1 + G_3(s)H_3(s)]}${extraNumericLatex}`,
    svgEtapa4, "Diagrama Reduzido em Bloco Único");

  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Função de Transferência Final — Passo a Passo Completo (Exercício Proposto 1)</h3>
    <div class="math-display">
      $$\\begin{aligned}
      \\frac{V_4(s)}{V_2(s)} &= \\frac{G_2(s)}{1 + G_2(s)H_2(s)}, \\qquad \\frac{V_7(s)}{V_4(s)} = 1 + \\frac{1}{G_2(s)} = \\frac{G_2(s) + 1}{G_2(s)} \\\\[4pt]
      \\frac{V_4(s)}{R(s)} &= \\frac{\\frac{G_1(s)G_2(s)}{1 + G_2(s)H_2(s)}}{1 + \\frac{G_1(s)G_2(s)H_1(s)}{1 + G_2(s)H_2(s)}} = \\frac{G_1(s)G_2(s)}{1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)} \\\\[4pt]
      \\frac{C(s)}{R(s)} &= \\left[\\frac{G_1(s)\\,\\cancel{G_2(s)}}{1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)}\\right] \\cdot \\left[\\frac{G_2(s) + 1}{\\cancel{G_2(s)}}\\right] \\cdot \\left[\\frac{G_3(s)}{1 + G_3(s)H_3(s)}\\right] \\\\[4pt]
      \\frac{C(s)}{R(s)} &= \\mathbf{\\frac{G_1(s) \\cdot [G_2(s) + 1] \\cdot G_3(s)}{[1 + G_2(s)H_2(s) + G_1(s)G_2(s)H_1(s)] \\cdot [1 + G_3(s)H_3(s)]}}${extraNumericLatex}
      \\end{aligned}$$
    </div>
    ${rTotalNumeric ? buildAnalyticalSummaryHtml(rTotalNumeric, "R", "C") : ""}
  `;
  container.appendChild(resBox);
}

function executarProposto2(container) {
  const sinalH1El = document.getElementById("sinalH1");
  const isPosH1 = !sinalH1El || sinalH1El.value.includes("Positiva");
  const opH1 = isPosH1 ? "+" : "-";
  const denH1 = isPosH1 ? "-" : "+";
  const corH1 = isPosH1 ? "#10b981" : "#ef4444";

  // Etapa 1 SVG: Diagrama original com sinais intermediários e destaque para mover a ramificação de H1 para após G3
  const svgEtapa1 = `
    <text x="300" y="18" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold">Passo 1: Equações de Sinais [1] a [5] e Ramificação antes de G3</text>
    <text x="15" y="115" fill="#94a3b8" font-size="11">R</text>
    <line x1="30" y1="110" x2="60" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="75" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="64" y="113" fill="#38bdf8" font-size="10">+</text>
    <text x="72" y="122" fill="#ef4444" font-size="10">-</text>
    <line x1="89" y1="110" x2="115" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="102" y="98" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">E1</text>
    <circle cx="130" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="119" y="113" fill="#38bdf8" font-size="10">+</text>
    <text x="127" y="122" fill="${corH1}" font-size="10" font-weight="bold">${opH1}</text>
    <line x1="144" y1="110" x2="175" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="160" y="98" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">E2</text>
    <rect x="175" y="90" width="55" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
    <text x="202" y="115" text-anchor="middle" fill="#fff" font-size="11">G1</text>
    <line x1="230" y1="110" x2="260" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="275" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="264" y="113" fill="#38bdf8" font-size="10">+</text>
    <text x="272" y="102" fill="#ef4444" font-size="10">-</text>
    <line x1="289" y1="110" x2="315" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="302" y="98" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">E3</text>
    <rect x="315" y="90" width="55" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
    <text x="342" y="115" text-anchor="middle" fill="#fff" font-size="11">G2</text>
    <line x1="370" y1="110" x2="415" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="392" y="98" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">X</text>
    <rect x="415" y="90" width="55" height="40" rx="4" fill="#050811" stroke="#38bdf8" stroke-width="2" />
    <text x="442" y="115" text-anchor="middle" fill="#fff" font-size="11">G3</text>
    <line x1="470" y1="110" x2="560" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="545" y="100" fill="#10b981" font-size="11" font-weight="bold">C</text>
    <circle cx="395" cy="110" r="4" fill="#f59e0b" />
    <line x1="395" y1="110" x2="395" y2="170" stroke="#f59e0b" stroke-width="2" />
    <line x1="395" y1="170" x2="275" y2="170" stroke="#f59e0b" stroke-width="2" />
    <rect x="220" y="152" width="55" height="35" rx="4" fill="#050811" stroke="#f59e0b" stroke-width="2" />
    <text x="247" y="174" text-anchor="middle" fill="#fff" font-size="11">H1</text>
    <line x1="220" y1="170" x2="130" y2="170" stroke="#f59e0b" stroke-width="2" />
    <line x1="130" y1="170" x2="130" y2="124" stroke="#f59e0b" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="510" cy="110" r="4" fill="#38bdf8" />
    <line x1="510" y1="110" x2="510" y2="50" stroke="#38bdf8" stroke-width="2" />
    <line x1="510" y1="50" x2="370" y2="50" stroke="#38bdf8" stroke-width="2" />
    <rect x="315" y="32" width="55" height="35" rx="4" fill="#050811" stroke="#a855f7" stroke-width="2" />
    <text x="342" y="54" text-anchor="middle" fill="#fff" font-size="11">H2</text>
    <line x1="315" y1="50" x2="275" y2="50" stroke="#38bdf8" stroke-width="2" />
    <line x1="275" y1="50" x2="275" y2="96" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <line x1="510" y1="110" x2="510" y2="210" stroke="#38bdf8" stroke-width="2" />
    <line x1="510" y1="210" x2="75" y2="210" stroke="#38bdf8" stroke-width="2" />
    <line x1="75" y1="210" x2="75" y2="124" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 2 SVG: Ramificação movida de antes para depois de G3 (H1 -> H1/G3) e cascata G2·G3
  const svgEtapa2 = `
    <text x="300" y="18" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="bold">Passo 2: Move ramificação para depois de G3 (H1/G3) e associa G2·G3 em série</text>
    <text x="15" y="115" fill="#94a3b8" font-size="11">R</text>
    <line x1="30" y1="110" x2="60" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="75" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <line x1="89" y1="110" x2="115" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="130" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="119" y="113" fill="#38bdf8" font-size="10">+</text>
    <text x="127" y="122" fill="${corH1}" font-size="10" font-weight="bold">${opH1}</text>
    <line x1="144" y1="110" x2="175" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(202, 110, "G1", "1", { width: 55 })}
    <line x1="230" y1="110" x2="260" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="275" cy="110" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <line x1="289" y1="110" x2="325" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(385, 110, "G2 · G3", "1", { width: 120, stroke: "#10b981" })}
    <line x1="445" y1="110" x2="560" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="545" y="100" fill="#94a3b8" font-size="11">C</text>
    <!-- Malha superior H2 -->
    <circle cx="495" cy="110" r="4" fill="#38bdf8" />
    <line x1="495" y1="110" x2="495" y2="50" stroke="#38bdf8" stroke-width="2" />
    <line x1="495" y1="50" x2="375" y2="50" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(345, 50, "H2", "1", { width: 60, height: 34, stroke: "#a855f7" })}
    <line x1="315" y1="50" x2="275" y2="50" stroke="#38bdf8" stroke-width="2" />
    <line x1="275" y1="50" x2="275" y2="96" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- Malha intermediária deslocada H1/G3 -->
    <line x1="495" y1="110" x2="495" y2="170" stroke="#38bdf8" stroke-width="2" />
    <line x1="495" y1="170" x2="290" y2="170" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(245, 170, "H1", "G3", { width: 90, height: 42, stroke: "#f59e0b" })}
    <line x1="200" y1="170" x2="130" y2="170" stroke="#38bdf8" stroke-width="2" />
    <line x1="130" y1="170" x2="130" y2="124" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- Malha global 1 -->
    <line x1="495" y1="170" x2="495" y2="215" stroke="#38bdf8" stroke-width="2" />
    <line x1="495" y1="215" x2="75" y2="215" stroke="#38bdf8" stroke-width="2" />
    <line x1="75" y1="215" x2="75" y2="124" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 3 SVG: Malha interna H2 fechada e combinada em cascata com G1
  const svgEtapa3 = `
    <text x="300" y="18" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Passo 3: Malha interna H2 fechada e multiplicada em cascata por G1</text>
    <text x="15" y="105" fill="#94a3b8" font-size="11">R</text>
    <line x1="30" y1="100" x2="65" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="80" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <line x1="94" y1="100" x2="135" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="150" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="139" y="103" fill="#38bdf8" font-size="10">+</text>
    <text x="147" y="112" fill="${corH1}" font-size="10" font-weight="bold">${opH1}</text>
    <line x1="164" y1="100" x2="215" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(310, 100, "G1 · G2 · G3", "1 + G2·G3·H2", { width: 190, stroke: "#10b981" })}
    <line x1="405" y1="100" x2="555" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="535" y="90" fill="#94a3b8" font-size="11">C</text>
    <circle cx="480" cy="100" r="4" fill="#38bdf8" />
    <!-- Malha H1/G3 -->
    <line x1="480" y1="100" x2="480" y2="165" stroke="#38bdf8" stroke-width="2" />
    <line x1="480" y1="165" x2="355" y2="165" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(310, 165, "H1", "G3", { width: 90, height: 42, stroke: "#a855f7" })}
    <line x1="265" y1="165" x2="150" y2="165" stroke="#38bdf8" stroke-width="2" />
    <line x1="150" y1="165" x2="150" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <!-- Malha global 1 -->
    <line x1="480" y1="165" x2="480" y2="210" stroke="#38bdf8" stroke-width="2" />
    <line x1="480" y1="210" x2="80" y2="210" stroke="#38bdf8" stroke-width="2" />
    <line x1="80" y1="210" x2="80" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 4 SVG: Malha H1/G3 fechada (G3 cancela!) restando só a malha unitária externa
  const svgEtapa4 = `
    <text x="300" y="22" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Passo 4: Malha H1/G3 fechada (fator G3 cancelado) — Resta a malha unitária externa</text>
    <text x="25" y="105" fill="#94a3b8" font-size="11">R(s)</text>
    <line x1="55" y1="100" x2="106" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <circle cx="120" cy="100" r="14" fill="#131c2e" stroke="#38bdf8" stroke-width="2" />
    <text x="110" y="103" fill="#38bdf8" font-size="10">+</text>
    <text x="117" y="112" fill="#ef4444" font-size="10">-</text>
    <line x1="134" y1="100" x2="195" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    ${drawSvgBlockBox(315, 100, "G1 · G2 · G3", `1 ${denH1} G1·G2·H1 + G2·G3·H2`, { width: 240, stroke: "#10b981" })}
    <line x1="435" y1="100" x2="555" y2="100" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
    <text x="530" y="90" fill="#94a3b8" font-size="11">C(s)</text>
    <circle cx="490" cy="100" r="4" fill="#38bdf8" />
    <line x1="490" y1="100" x2="490" y2="185" stroke="#38bdf8" stroke-width="2" />
    <line x1="490" y1="185" x2="120" y2="185" stroke="#38bdf8" stroke-width="2" />
    <text x="305" y="178" text-anchor="middle" fill="#94a3b8" font-size="10">Realimentação Unitária Global (H = 1)</text>
    <line x1="120" y1="185" x2="120" y2="114" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" />
  `;

  // Etapa 5 SVG: Bloco único final
  const svgEtapa5 = drawSingleBlockEquivalentSvg(
    "G1 · G2 · G3",
    `1 ${denH1} G1·G2·H1 + G2·G3·H2 + G1·G2·G3`,
    "R(s)",
    "C(s)",
    "Passo 5: Fechamento da Malha Externa Unitária — Diagrama Final"
  );

  addStep(container, 1, "Equacionamento dos Sinais nos Nós [1] a [5]",
    `Escrevendo as equações algébricas de cada ponto de soma e bloco do diagrama (com sinal <b>${opH1}</b> na entrada de $H_1$):`,
    String.raw`C &= G_3 X \implies X = \frac{C}{G_3} \qquad [1] \\
X &= G_2 E_3 \qquad [2] \\
E_3 &= G_1 E_2 - H_2 C \qquad [3] \\
E_2 &= E_1 ${opH1} H_1 X \qquad [4] \\
E_1 &= R - C \qquad [5]`,
    svgEtapa1, "Diagrama Original com Sinais E1, E2, E3, X e C");

  addStep(container, 2, "Movendo o Ponto de Ramificação de Antes para Depois de $G_3$",
    "Pela regra de <b>mover ponto de ramificação de antes para depois de um bloco</b>, deslocamos a tomada de $H_1$ de antes de $G_3$ ($X$) para depois de $G_3$ ($C$), multiplicando o ramo por $\\frac{1}{G_3}$ ($\\implies \\frac{H_1}{G_3}$). Assim, $G_2$ e $G_3$ ficam em <b>formato em cascata</b> ($G_2 G_3$). Equivalentemente, substituindo $[1]$ e $[3]$ em $[2]$:",
    String.raw`H_{1,\text{deslocado}} &= H_1 \cdot \frac{1}{G_3} = \frac{H_1}{G_3}, \qquad G_{\text{série}} = G_2 \cdot G_3 \\
\frac{C}{G_3} &= G_2 (G_1 E_2 - H_2 C) \implies C = G_1 G_2 G_3 E_2 - G_2 G_3 H_2 C`,
    svgEtapa2, "Diagrama após Mover a Ramificação para Depois de G3");

  addStep(container, 3, "Eliminação da Malha Fechada Interna $H_2$ e Cascata com $G_1$",
    "Fechando a malha de $G_2 G_3$ com a realimentação negativa $H_2$ e multiplicando em cascata pelo bloco $G_1$:",
    String.raw`\frac{C}{E_2'} &= \frac{G_2 G_3}{1 + G_2 G_3 H_2} \\
G_{\text{mf,int}} &= G_1 \cdot \frac{G_2 G_3}{1 + G_2 G_3 H_2} = \frac{G_1 G_2 G_3}{1 + G_2 G_3 H_2}`,
    svgEtapa3, "Diagrama com a Malha Interna H2 Reduzida e Multiplicada por G1");

  addStep(container, 4, "Eliminação da Malha Intermediária $\\frac{H_1}{G_3}$",
    `Fechando a malha de $G_{\\text{mf,int}}$ com a realimentação $\\frac{H_1}{G_3}$ (sinal <b>${opH1}</b> no somador $\\implies$ sinal <b>${denH1}</b> na fórmula $\\frac{G}{1 \\mp GH}$), cancelando $\\cancel{G_3}$ e tirando o MMC no denominador:`,
    String.raw`G_{\text{mf,med}} &= \frac{\frac{G_1 G_2 G_3}{1 + G_2 G_3 H_2}}{1 ${denH1} \left(\frac{G_1 G_2 \cancel{G_3}}{1 + G_2 G_3 H_2}\right) \cdot \left(\frac{H_1}{\cancel{G_3}}\right)} = \frac{\frac{G_1 G_2 G_3}{1 + G_2 G_3 H_2}}{\frac{(1 + G_2 G_3 H_2) ${denH1} G_1 G_2 H_1}{1 + G_2 G_3 H_2}} \\
G_{\text{mf,med}} &= \frac{G_1 G_2 G_3}{\cancel{1 + G_2 G_3 H_2}} \cdot \frac{\cancel{1 + G_2 G_3 H_2}}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2} = \frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2}`,
    svgEtapa4, "Diagrama após Fechar a Malha Intermediária H1/G3");

  addStep(container, 5, "Eliminação da Malha Fechada Externa Unitária",
    "Fechando a última malha de realimentação negativa unitária ($H_{\\text{ext}} = 1$) pela fórmula canônica de malha fechada, tirando o MMC no denominador e simplificando:",
    String.raw`\frac{C}{R} &= \frac{\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2}}{1 + \left(\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2}\right) \cdot 1} = \frac{\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2}}{\frac{(1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2) + G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2}} \\
\frac{C}{R} &= \frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2 + G_1 G_2 G_3}`,
    svgEtapa5, "Diagrama Final Reduzido em Bloco Único");

  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Função de Transferência Final — Passo a Passo Completo (Exercício Proposto 2)</h3>
    <div class="math-display">
      $$\\begin{aligned}
      H_{1,\\text{deslocado}} &= \\frac{H_1}{G_3}, \\qquad G_{\\text{mf,int}} = G_1 \\cdot \\frac{G_2 G_3}{1 + G_2 G_3 H_2} = \\frac{G_1 G_2 G_3}{1 + G_2 G_3 H_2} \\\\[4pt]
      G_{\\text{mf,med}} &= \\frac{\\frac{G_1 G_2 G_3}{1 + G_2 G_3 H_2}}{1 ${denH1} \\left(\\frac{G_1 G_2 \\cancel{G_3}}{1 + G_2 G_3 H_2}\\right)\\left(\\frac{H_1}{\\cancel{G_3}}\\right)} = \\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2} \\\\[4pt]
      \\frac{C(s)}{R(s)} &= \\frac{\\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2}}{1 + \\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2} \\cdot 1} = \\mathbf{\\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2 + G_1 G_2 G_3}}
      \\end{aligned}$$
    </div>
    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">
      <b>Confirmação por Substituição Algébrica Direta das Equações [1] a [5]:</b><br>
      • Da Eq. $[2]$ com $[1]$ e $[3]$: $\\frac{C}{G_3} = G_2(G_1 E_2 - H_2 C) \\implies C = G_1 G_2 G_3 E_2 - G_2 G_3 H_2 C$<br>
      • Substituindo $E_2 = E_1 ${opH1} H_1 X = (R - C) ${opH1} H_1 \\frac{C}{G_3}$ (Eqs. $[1]$, $[4]$ e $[5]$):<br>
      &nbsp;&nbsp;$C = G_1 G_2 G_3 \\left(R - C ${opH1} \\frac{H_1}{G_3} C\\right) - G_2 G_3 H_2 C = G_1 G_2 G_3 R - G_1 G_2 G_3 C ${opH1} G_1 G_2 H_1 C - G_2 G_3 H_2 C$<br>
      • Isolando $C$: $C \\cdot [1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2 + G_1 G_2 G_3] = G_1 G_2 G_3 R \\implies \\frac{C}{R} = \\frac{G_1 G_2 G_3}{1 ${denH1} G_1 G_2 H_1 + G_2 G_3 H_2 + G_1 G_2 G_3}$
    </div>
  `;
  container.appendChild(resBox);
}

function splitLinearTerms(rhsStr) {
  let s = rhsStr
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .trim();

  const terms = [];
  let current = "";
  let currentSign = 1;
  let depth = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(" || ch === "[") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]") {
      depth--;
      current += ch;
    } else if (depth === 0 && (ch === "+" || ch === "-")) {
      const trimmed = current.trim();
      if (trimmed) {
        terms.push({ sign: currentSign, expr: trimmed });
      }
      currentSign = ch === "-" ? -1 : 1;
      current = "";
    } else {
      current += ch;
    }
  }
  const trimmedLast = current.trim();
  if (trimmedLast) {
    terms.push({ sign: currentSign, expr: trimmedLast });
  }
  return terms;
}

function findNodeVarInExpr(expr, allVars) {
  for (const v of allVars) {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`);
    if (re.test(expr)) {
      return v;
    }
  }
  return null;
}

function formatLinearEquationLatex(lhs, coeffs, rhsR, inVar) {
  const parts = [];

  // Primeiro termos em inVar se existir
  if (rhsR && !polyIsZero(rhsR.num)) {
    const rLatex = varToLatex(inVar) + "(s)";
    const isNeg = rhsR.num[0] && rhsR.num[0].coeff < 0;
    const absR = isNeg ? ratScale(rhsR, -1) : rhsR;
    const isOne = polyIsOne(absR.num) && polyIsOne(absR.den);
    parts.push({
      sign: isNeg ? "-" : "+",
      str: isOne ? rLatex : `${ratToLatex(absR)} \\cdot ${rLatex}`
    });
  }

  // Termos das outras variáveis
  const sortedVars = Object.keys(coeffs).sort();
  for (const v of sortedVars) {
    const gain = coeffs[v];
    if (!gain || polyIsZero(gain.num)) continue;
    const vLatex = varToLatex(v) + "(s)";
    const isNeg = gain.num[0] && gain.num[0].coeff < 0;
    const absGain = isNeg ? ratScale(gain, -1) : gain;
    const isOne = polyIsOne(absGain.num) && polyIsOne(absGain.den);
    parts.push({
      sign: isNeg ? "-" : "+",
      str: isOne ? vLatex : `${ratToLatex(absGain)} \\cdot ${vLatex}`
    });
  }

  if (parts.length === 0) {
    return `${varToLatex(lhs)}(s) &= 0`;
  }

  let res = `${varToLatex(lhs)}(s) &= `;
  parts.forEach((p, idx) => {
    if (idx === 0) {
      res += (p.sign === "-" ? "- " : "") + p.str;
    } else {
      res += (p.sign === "-" ? " - " : " + ") + p.str;
    }
  });
  return res;
}

function generateAlgebraicScilabScript(inVar, outVar, T, rawLines) {
  const isUni = isUnivariateInS(T.num) && isUnivariateInS(T.den);
  let scilab = `// ========================================================\n`;
  scilab += `// Script Scilab - Simulação do Método Algébrico dos Nós\n`;
  scilab += `// Entrada: ${inVar}(s) | Saída: ${outVar}(s)\n`;
  scilab += `// ========================================================\n\n`;
  scilab += `clear; clc;\ns = %s;\n\n`;
  scilab += `// 1. Equações dos Nós do Diagrama:\n`;
  rawLines.forEach((l, idx) => {
    scilab += `// [${idx + 1}] ${l}\n`;
  });
  scilab += `\n`;

  if (isUni) {
    const numSci = polyToScilab(T.num);
    const denSci = polyToScilab(T.den);
    scilab += `// 2. Função de Transferência Equivalente T(s):\n`;
    scilab += `num_T = ${numSci};\n`;
    scilab += `den_T = ${denSci};\n`;
    scilab += `T_s = syslin('c', num_T, den_T);\n\n`;
    scilab += `disp("--- Função de Transferência Equivalente T(s) ---");\n`;
    scilab += `disp(T_s);\n\n`;
    scilab += `// 3. Resposta no Domínio do Tempo (Degrau Unitário):\n`;
    scilab += `t = 0:0.01:6;\n`;
    scilab += `y = csim('step', t, T_s);\n`;
    scilab += `clf();\n`;
    scilab += `plot(t, y, 'b-', 'LineWidth', 2);\n`;
    scilab += `xtitle("Resposta ao Degrau Unitário - Método Algébrico", "Tempo (s)", "${outVar}(t)");\n`;
    scilab += `xgrid();\n`;
  } else {
    scilab += `// 2. Parâmetros Simbólicos da Função de Transferência:\n`;
    scilab += `// Numerador:   ${polyToCompact(T.num)}\n`;
    scilab += `// Denominador: ${polyToCompact(T.den)}\n\n`;
    scilab += `// Exemplo de Avaliação Numérica (ganhos e pólos unitários):\n`;
    scilab += `G1 = 1/(s + 1);\n`;
    scilab += `G2 = 2/(s + 2);\n`;
    scilab += `G3 = 5;\n`;
    scilab += `H1 = 1;\n`;
    scilab += `H2 = 1;\n\n`;
    scilab += `num_T = ${polyToScilab(T.num)};\n`;
    scilab += `den_T = ${polyToScilab(T.den)};\n`;
    scilab += `T_s = syslin('c', num_T, den_T);\n\n`;
    scilab += `disp("--- Função de Transferência Avaliada Numericamente ---");\n`;
    scilab += `disp(T_s);\n`;
  }
  return scilab;
}

function executarCustom(container) {
  const eqsText = document.getElementById("eqs") ? document.getElementById("eqs").value : "";
  const inOutEl = document.getElementById("inOut");
  const inOut = inOutEl ? inOutEl.value.split(",").map(s => s.trim()) : ["R", "C"];
  const inVar = normalizeVarName(inOut[0] || "R");
  const outVar = normalizeVarName(inOut[1] || "C");

  const rawLines = eqsText
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) {
    addStep(container, 1, "Atenção: Nenhuma Equação Fornecida",
      `<div style="color:var(--danger);">Por favor, insira ao menos uma equação de nó no campo acima (ex: <code>E_1 = R - C</code>) para calcular a redução analítica.</div>`,
      "");
    return;
  }

  // 1. Identificação inicial e formatação em LaTeX
  const numberedLatex = rawLines
    .map((line, idx) => `${line.replace(/=/g, "&=")} \\qquad [${idx + 1}]`)
    .join(" \\\\ \n");

  // Coleta todas as variáveis LHS
  const lhsVars = [];
  rawLines.forEach(line => {
    const parts = line.split("=");
    if (parts.length === 2) {
      lhsVars.push(normalizeVarName(parts[0]));
    }
  });

  const allNodeVars = Array.from(new Set([inVar, outVar, ...lhsVars])).sort((a, b) => b.length - a.length);

  addStep(container, 1, "Identificação das Equações dos Nós [1], [2], ... (Método Algébrico)",
    `Equacionando cada ponto de soma e cada bloco do diagrama para a entrada <b>${inVar}(s)</b> e saída <b>${outVar}(s)</b>:<br>` +
    `<span style="font-size:0.8rem; color:var(--text-muted);">Variáveis de nós identificadas: <code>${allNodeVars.join(", ")}</code></span>`,
    numberedLatex);

  // 2. Parseia cada equação em coeficientes racionais exatos
  const eqMap = {};
  let parseError = null;

  rawLines.forEach((line, idx) => {
    if (parseError) return;
    const parts = line.split("=");
    if (parts.length !== 2) {
      parseError = `Erro na linha [${idx + 1}]: cada linha deve conter exatamente um sinal de igualdade <code>=</code> (formato: <code>Variável = Expressão</code>).`;
      return;
    }
    const lhs = normalizeVarName(parts[0]);
    const rhsRaw = parts[1].trim();

    // Normaliza '(s)' nas expressões dos nós
    const cleanRhs = rhsRaw.replace(/([A-Za-z0-9_]+)\s*\(\s*s\s*\)/g, "$1");
    const terms = splitLinearTerms(cleanRhs);

    const coeffs = {};
    let rhsR = ratZero();

    terms.forEach(t => {
      if (parseError) return;
      const v = findNodeVarInExpr(t.expr, allNodeVars);
      if (!v) {
        // Termo independente / ganho direto do sinal de entrada
        try {
          let g = parseRatExpr(t.expr);
          if (t.sign < 0) g = ratScale(g, -1);
          rhsR = ratAdd(rhsR, g);
        } catch (e) {
          parseError = `Erro na análise do termo '<code>${t.expr}</code>' na linha [${idx + 1}].`;
        }
        return;
      }

      // Substitui a variável do nó por 1 para extrair o ganho
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const gainExpr = t.expr.replace(new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`), "$1(1)$2");
      try {
        let g = parseRatExpr(gainExpr);
        if (t.sign < 0) g = ratScale(g, -1);

        if (v === inVar) {
          rhsR = ratAdd(rhsR, g);
        } else {
          coeffs[v] = ratAdd(coeffs[v] || ratZero(), g);
        }
      } catch (e) {
        parseError = `Erro ao interpretar ganho da variável '${v}' na linha [${idx + 1}].`;
      }
    });

    eqMap[lhs] = { coeffs, rhsR, eqNum: idx + 1 };
  });

  if (parseError) {
    addStep(container, 2, "Diagnóstico Algébrico das Equações",
      `<div style="color:var(--danger);">${parseError}</div>`, "");
    return;
  }

  // Verifica se a saída existe no sistema
  if (!eqMap[outVar]) {
    addStep(container, 2, "Diagnóstico Algébrico: Saída Não Equacionada",
      `<div style="color:var(--danger);">A variável de saída declarada <b>${outVar}(s)</b> não foi definida como saída de nenhum nó no membro esquerdo (LHS) das equações.</div>`, "");
    return;
  }

  // 3. Substituição Sucessiva das Variáveis Intermediárias
  const intermediateVars = lhsVars.filter(v => v !== inVar && v !== outVar);
  const distinctInterVars = Array.from(new Set(intermediateVars));

  let stepCounter = 2;
  let resolutionFailed = false;

  distinctInterVars.forEach(v => {
    if (resolutionFailed) return;
    const eq_v = eqMap[v];
    if (!eq_v) return;

    // Se a variável possui dependência de si mesma (laço de retorno direto em v)
    if (eq_v.coeffs[v] && !polyIsZero(eq_v.coeffs[v].num)) {
      const L = eq_v.coeffs[v];
      const den = ratSub(ratOne(), L);
      if (polyIsZero(den.num)) {
        addStep(container, stepCounter++, `Laço Algébrico Singular em ${varToLatex(v)}(s)`,
          `<div style="color:var(--danger);">Detectado laço de realimentação unitária com ganho $1 - L(s) = 0$ no nó <b>${v}(s)</b>, impossibilitando inversão determinística.</div>`, "");
        resolutionFailed = true;
        return;
      }
      for (const u of Object.keys(eq_v.coeffs)) {
        if (u !== v) {
          eq_v.coeffs[u] = ratDiv(eq_v.coeffs[u], den);
        }
      }
      eq_v.rhsR = ratDiv(eq_v.rhsR, den);
      eq_v.coeffs[v] = ratZero();

      addStep(container, stepCounter++, `Isolamento do Laço Interno em ${varToLatex(v)}(s)`,
        `O nó <b>${v}(s)</b> possui realimentação sobre si mesmo com ganho de laço $L(s) = ${ratToLatex(L)}$. Isolando <b>${v}(s)</b> pelo fator $[1 - L(s)]$:<br>` +
        `$$${formatLinearEquationLatex(v, eq_v.coeffs, eq_v.rhsR, inVar)}$$`,
        "");
    }

    // Substitui eq_v em todas as outras equações ativas que dependem de v
    const affectedLhs = Object.keys(eqMap).filter(k => k !== v && eqMap[k].coeffs[v] && !polyIsZero(eqMap[k].coeffs[v].num));

    if (affectedLhs.length > 0) {
      const subStepsLatex = [];

      affectedLhs.forEach(targetKey => {
        const targetEq = eqMap[targetKey];
        const beta = targetEq.coeffs[v];

        for (const u of Object.keys(eq_v.coeffs)) {
          if (u !== v && eq_v.coeffs[u] && !polyIsZero(eq_v.coeffs[u].num)) {
            const added = ratMul(beta, eq_v.coeffs[u]);
            targetEq.coeffs[u] = ratAdd(targetEq.coeffs[u] || ratZero(), added);
          }
        }

        if (eq_v.rhsR && !polyIsZero(eq_v.rhsR.num)) {
          const addedR = ratMul(beta, eq_v.rhsR);
          targetEq.rhsR = ratAdd(targetEq.rhsR || ratZero(), addedR);
        }

        targetEq.coeffs[v] = ratZero();
        subStepsLatex.push(formatLinearEquationLatex(targetKey, targetEq.coeffs, targetEq.rhsR, inVar));
      });

      addStep(container, stepCounter++, `Substituição da Variável Intermediária ${varToLatex(v)}(s)`,
        `Substituindo a expressão de <b>${v}(s)</b> nas equações dependentes para eliminar este nó intermediário:`,
        subStepsLatex.join(" \\\\ \n"));
    }

    // Remove v das equações ativas
    delete eqMap[v];
  });

  if (resolutionFailed) return;

  // 4. Isolamento Final da Saída outVar em Função de inVar
  const finalEq = eqMap[outVar];
  if (!finalEq) {
    addStep(container, stepCounter++, "Diagnóstico Algébrico",
      `<div style="color:var(--danger);">Não foi possível estabelecer relação analítica fechada para <b>${outVar}(s)</b>.</div>`, "");
    return;
  }

  const c_out = finalEq.coeffs[outVar] || ratZero();
  const c_R = finalEq.rhsR || ratZero();

  const D_char = ratSub(ratOne(), c_out);

  if (polyIsZero(D_char.num)) {
    addStep(container, stepCounter++, "Diagnóstico de Singularidade",
      `<div style="color:var(--danger);">O sistema de equações fornecido é singular para a saída <b>${outVar}(s)</b> (denominador de malha fechada $1 - c_{out} = 0$).</div>`, "");
    return;
  }

  if (polyIsZero(c_R.num)) {
    addStep(container, stepCounter++, `Isolamento da Saída ${varToLatex(outVar)}(s)`,
      `A saída <b>${outVar}(s)</b> não possui caminho direcionado partindo da entrada <b>${inVar}(s)</b>. A função de transferência resultante é nula: $T(s) = 0$.`,
      `${varToLatex(outVar)}(s) &= 0 \\cdot ${varToLatex(inVar)}(s) \\implies T(s) = 0`);
    return;
  }

  // Calcula T(s) = c_R / D_char com simplificação polinomial exata
  const T = ratDiv(c_R, D_char);

  const stepIsolationLatex = `
    ${formatLinearEquationLatex(outVar, { [outVar]: c_out }, c_R, inVar)} \\\\
    ${varToLatex(outVar)}(s) \\cdot \\left[ 1 ${polyIsZero(c_out.num) ? "" : "- (" + ratToLatex(c_out) + ")"} \\right] &= \\left[ ${ratToLatex(c_R)} \\right] \\cdot ${varToLatex(inVar)}(s) \\\\
    ${varToLatex(outVar)}(s) \\cdot \\left[ ${ratToLatex(D_char)} \\right] &= \\left[ ${ratToLatex(c_R)} \\right] \\cdot ${varToLatex(inVar)}(s) \\\\
    T(s) = \\frac{${varToLatex(outVar)}(s)}{${varToLatex(inVar)}(s)} &= ${ratToLatex(T)}
  `.trim();

  addStep(container, stepCounter++, `Isolamento Exato da Saída ${varToLatex(outVar)}(s) e Agrupamento dos Termos`,
    `Agrupando todos os termos que contêm <b>${outVar}(s)</b> no membro esquerdo, colocando <b>${outVar}(s)</b> em evidência e isolando a razão $\\frac{${outVar}(s)}{${inVar}(s)}$:`,
    stepIsolationLatex);

  // 5. Caixa de Destaque com o Resultado Final Matemático e Script Scilab
  const scilabScript = generateAlgebraicScilabScript(inVar, outVar, T, rawLines);
  const latexResult = `T(s) = \\frac{${varToLatex(outVar)}(s)}{${varToLatex(inVar)}(s)} = ${ratToLatex(T)}`;

  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Função de Transferência Equivalente Obtida pelo Método Algébrico</h3>
    <div class="math-display" style="font-size: 1.15rem; margin: 12px 0;">
      $$\\mathbf{${latexResult}}$$
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin: 14px 0;">
      <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 0.78rem; font-weight: 700; color: #38bdf8; text-transform: uppercase;">Numerador N(s)</div>
        <div class="math-display" style="margin: 4px 0 0 0; font-size: 0.95rem;">$$N(s) = ${polyToLatex(T.num)}$$</div>
      </div>
      <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 0.78rem; font-weight: 700; color: #10b981; text-transform: uppercase;">Denominador D(s) (Polinômio Característico)</div>
        <div class="math-display" style="margin: 4px 0 0 0; font-size: 0.95rem;">$$D(s) = ${polyToLatex(T.den)}$$</div>
      </div>
    </div>

    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
      <button type="button" class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="navigator.clipboard.writeText(String.raw\`${latexResult}\`).then(() => { this.innerText = '✓ LaTeX Copiado!'; setTimeout(() => this.innerText = '📋 Copiar LaTeX', 2000); })">📋 Copiar LaTeX</button>
      <button type="button" class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="const t = document.getElementById('scilabScriptBox'); if (t) { navigator.clipboard.writeText(t.innerText).then(() => { this.innerText = '✓ Scilab Copiado!'; setTimeout(() => this.innerText = '📋 Copiar Script Scilab', 2000); }); }">📋 Copiar Script Scilab</button>
    </div>

    <details style="background: rgba(2, 6, 23, 0.6); border: 1px solid #1e293b; border-radius: 7px; padding: 8px 12px;">
      <summary style="font-size: 0.8rem; font-weight: 700; color: #38bdf8; cursor: pointer;">💻 Ver Script de Exportação e Simulação para Scilab</summary>
      <pre id="scilabScriptBox" style="margin: 8px 0 0 0; font-family: monospace; font-size: 0.78rem; color: #94a3b8; background: #050811; padding: 10px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap;">${scilabScript}</pre>
    </details>
  `;
  container.appendChild(resBox);
}

// ============================================================================
// 4. CONSTRUTOR LIVRE DE DIAGRAMA DE BLOCOS (ILIMITADO + REDUÇÃO VISUAL)
// ============================================================================

let builderState = {
  elements: [],
  connections: [],
  nextBlockG: 1,
  nextBlockH: 1,
  nextSummer: 1,
  nextPickoff: 1,
  nextConnId: 1,
  connectMode: false,
  connectSourceId: null,
  selectedType: null,
  selectedId: null,
  draggingId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  focusMode: false,
  isPanning: false,
  panStartClient: null,
  panStartOrigin: null,
  hasPanMoved: false
};

function toggleBuilderFocusMode(forceState) {
  const sec = document.getElementById("customBuilderSection");
  const btnToolbar = document.getElementById("btnFocusMode");
  const btnCanvas = document.getElementById("btnCanvasFocus");
  if (!sec) return;

  builderState.focusMode = typeof forceState === "boolean" ? forceState : !builderState.focusMode;
  sec.classList.toggle("builder-focus-active", builderState.focusMode);
  document.body.classList.toggle("builder-focus-body", builderState.focusMode);

  if (btnToolbar) {
    btnToolbar.classList.toggle("active-focus", builderState.focusMode);
    btnToolbar.innerText = builderState.focusMode
      ? "⛶ Voltar à Tela Normal (Esc)"
      : "⛶ Só Blocos e Comandos";
  }
  if (btnCanvas) {
    btnCanvas.innerText = builderState.focusMode
      ? "⛶ Sair Tela Cheia (Esc)"
      : "⛶ Expandir Tela";
  }
}

function applySvgZoomAndPan() {
  const svg = document.getElementById("builderSvg");
  if (!svg) return;
  const baseW = 900;
  const baseH = 360;
  const z = Math.max(0.35, Math.min(3.0, builderState.zoom || 1.0));
  builderState.zoom = z;
  const vbW = baseW / z;
  const vbH = baseH / z;
  const vbX = (builderState.panX || 0) + (baseW - vbW) / 2;
  const vbY = (builderState.panY || 0) + (baseH - vbH) / 2;
  svg.setAttribute("viewBox", `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);

  const lbl = document.getElementById("zoomLevelLabel");
  if (lbl) lbl.innerText = `${Math.round(z * 100)}%`;
}

function builderZoom(dir, step = 0.18) {
  const factor = dir > 0 ? (1 + step) : 1 / (1 + step);
  builderState.zoom = Math.max(0.35, Math.min(3.0, (builderState.zoom || 1.0) * factor));
  applySvgZoomAndPan();
}

function builderZoomReset() {
  builderState.zoom = 1.0;
  builderState.panX = 0;
  builderState.panY = 0;
  applySvgZoomAndPan();
}

function builderZoomFit() {
  if (!builderState.elements || builderState.elements.length === 0) {
    builderZoomReset();
    return;
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  builderState.elements.forEach(el => {
    const g = getElementGeometry(el);
    const hw = (g.w || 44) / 2 + 30;
    const hh = (g.h || 32) / 2 + 35;
    if (el.x - hw < minX) minX = el.x - hw;
    if (el.x + hw > maxX) maxX = el.x + hw;
    if (el.y - hh < minY) minY = el.y - hh;
    if (el.y + hh > maxY) maxY = el.y + hh;
  });

  const contentW = Math.max(200, maxX - minX + 60);
  const contentH = Math.max(120, maxY - minY + 60);
  const zoomX = 900 / contentW;
  const zoomY = 360 / contentH;
  builderState.zoom = Math.max(0.35, Math.min(2.2, Math.min(zoomX, zoomY)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  builderState.panX = centerX - 450;
  builderState.panY = centerY - 180;
  applySvgZoomAndPan();
}

let builderHistory = {
  undoStack: [],
  redoStack: [],
  dragStartSnapshot: null,
  dragStartPos: null
};

function getBuilderSnapshot() {
  return JSON.stringify({
    elements: builderState.elements.map(e => ({ ...e })),
    connections: builderState.connections.map(c => ({ ...c })),
    nextBlockG: builderState.nextBlockG,
    nextBlockH: builderState.nextBlockH,
    nextSummer: builderState.nextSummer,
    nextPickoff: builderState.nextPickoff,
    nextConnId: builderState.nextConnId
  });
}

function applyBuilderSnapshot(jsonStr) {
  const data = JSON.parse(jsonStr);
  builderState.elements = data.elements;
  builderState.connections = data.connections;
  builderState.nextBlockG = data.nextBlockG;
  builderState.nextBlockH = data.nextBlockH;
  builderState.nextSummer = data.nextSummer;
  builderState.nextPickoff = data.nextPickoff;
  builderState.nextConnId = data.nextConnId;
  builderState.connectSourceId = null;
  builderState.selectedType = null;
  builderState.selectedId = null;
  refreshBuilderUI();
}

function pushBuilderUndoState(customSnapshotStr) {
  const snap = customSnapshotStr || getBuilderSnapshot();
  const last = builderHistory.undoStack[builderHistory.undoStack.length - 1];
  if (last === snap) return;
  builderHistory.undoStack.push(snap);
  if (builderHistory.undoStack.length > 60) builderHistory.undoStack.shift();
  builderHistory.redoStack = [];
  updateUndoRedoButtons();
}

function builderUndo() {
  if (builderHistory.undoStack.length === 0) return;
  builderHistory.redoStack.push(getBuilderSnapshot());
  const prev = builderHistory.undoStack.pop();
  applyBuilderSnapshot(prev);
  updateUndoRedoButtons();
}

function builderRedo() {
  if (builderHistory.redoStack.length === 0) return;
  builderHistory.undoStack.push(getBuilderSnapshot());
  const next = builderHistory.redoStack.pop();
  applyBuilderSnapshot(next);
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const btnUndo = document.getElementById("btnUndo");
  const btnRedo = document.getElementById("btnRedo");
  if (btnUndo) btnUndo.disabled = builderHistory.undoStack.length === 0;
  if (btnRedo) btnRedo.disabled = builderHistory.redoStack.length === 0;
  updateDeleteSelectedButton();
}

function selectBuilderItem(type, id) {
  builderState.selectedType = type;
  builderState.selectedId = id;
  updateDeleteSelectedButton();
  renderBuilderCanvas();
}

function updateDeleteSelectedButton() {
  const btnDel = document.getElementById("btnDeleteSelected");
  if (!btnDel) return;
  const { selectedType, selectedId } = builderState;
  if (selectedType === "element" && selectedId && selectedId !== "IN" && selectedId !== "OUT") {
    const el = builderState.elements.find(e => e.id === selectedId);
    if (el) {
      btnDel.disabled = false;
      btnDel.innerText = `✕ Excluir Bloco (${el.name})`;
      return;
    }
  } else if (selectedType === "connection" && selectedId) {
    const conn = builderState.connections.find(c => c.id === selectedId);
    if (conn) {
      const fromEl = builderState.elements.find(e => e.id === conn.from);
      const toEl = builderState.elements.find(e => e.id === conn.to);
      const label = (fromEl && toEl) ? `${fromEl.name}→${toEl.name}` : conn.id;
      btnDel.disabled = false;
      btnDel.innerText = `✕ Excluir Linha (${label})`;
      return;
    }
  }
  btnDel.disabled = true;
  btnDel.innerText = "✕ Excluir Selecionado";
}

function builderDeleteSelected() {
  const { selectedType, selectedId } = builderState;
  if (!selectedType || !selectedId) return;
  builderState.connectSourceId = null;
  resetHintBar();
  if (selectedType === "element" && selectedId !== "IN" && selectedId !== "OUT") {
    builderState.selectedType = null;
    builderState.selectedId = null;
    removeElement(selectedId);
  } else if (selectedType === "connection") {
    builderState.selectedType = null;
    builderState.selectedId = null;
    removeConnection(selectedId);
  }
}

let builderReductionStages = [];
let builderCurrentStageIdx = 0;

function loadBuilderTemplate(templateName, skipHistory = false) {
  if (!skipHistory && builderState.elements.length > 0) {
    pushBuilderUndoState();
  }
  const tpl = templateName || document.getElementById("builderTemplateSelect").value;
  builderState.elements = [];
  builderState.connections = [];
  builderState.nextBlockG = 1;
  builderState.nextBlockH = 1;
  builderState.nextSummer = 1;
  builderState.nextPickoff = 1;
  builderState.nextConnId = 1;
  builderState.connectSourceId = null;
  builderState.selectedType = null;
  builderState.selectedId = null;

  // Sempre criar Entrada R(s) e Saída C(s)
  builderState.elements.push({ id: "IN", type: "input", name: "R(s)", expr: "1", x: 55, y: 165, dir: "right" });
  builderState.elements.push({ id: "OUT", type: "output", name: "C(s)", expr: "1", x: 835, y: 165, dir: "right" });

  if (tpl === "em_branco") {
    // Apenas R(s) e C(s) para o usuário montar do zero
  } else if (tpl === "malha_simples") {
    builderState.elements.push(
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 185, y: 165, dir: "right" },
      { id: "B1", type: "block", name: "G1", expr: "G_1", x: 420, y: 165, dir: "right", isFeedback: false },
      { id: "B2", type: "block", name: "H1", expr: "H_1", x: 420, y: 275, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 2;
    builderState.nextBlockH = 2;
    builderState.nextSummer = 2;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "S1", sign: "+", route: "auto" },
      { id: "C2", from: "S1", to: "B1", sign: "+", route: "auto" },
      { id: "C3", from: "B1", to: "OUT", sign: "+", route: "auto" },
      { id: "C4", from: "B1", to: "B2", sign: "+", route: "bottom" },
      { id: "C5", from: "B2", to: "S1", sign: "-", route: "bottom" }
    );
    builderState.nextConnId = 6;
  } else if (tpl === "cascata_paralelo") {
    builderState.elements.push(
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 155, y: 165, dir: "right" },
      { id: "B1", type: "block", name: "G1", expr: "G_1", x: 295, y: 165, dir: "right", isFeedback: false },
      { id: "B2", type: "block", name: "G2", expr: "G_2", x: 475, y: 100, dir: "right", isFeedback: false },
      { id: "B3", type: "block", name: "G3", expr: "G_3", x: 475, y: 225, dir: "right", isFeedback: false },
      { id: "S2", type: "summer", name: "S2", expr: "1", x: 640, y: 165, dir: "right" },
      { id: "B4", type: "block", name: "H1", expr: "H_1", x: 410, y: 310, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 4;
    builderState.nextBlockH = 2;
    builderState.nextSummer = 3;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "S1", sign: "+", route: "auto" },
      { id: "C2", from: "S1", to: "B1", sign: "+", route: "auto" },
      { id: "C3", from: "B1", to: "B2", sign: "+", route: "auto" },
      { id: "C4", from: "B1", to: "B3", sign: "+", route: "auto" },
      { id: "C5", from: "B2", to: "S2", sign: "+", route: "top" },
      { id: "C6", from: "B3", to: "S2", sign: "+", route: "bottom" },
      { id: "C7", from: "S2", to: "OUT", sign: "+", route: "auto" },
      { id: "C8", from: "S2", to: "B4", sign: "+", route: "bottom" },
      { id: "C9", from: "B4", to: "S1", sign: "-", route: "bottom" }
    );
    builderState.nextConnId = 10;
  } else if (tpl === "malhas_duplas") {
    builderState.elements.push(
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 150, y: 165, dir: "right" },
      { id: "B1", type: "block", name: "G1", expr: "G_1", x: 275, y: 165, dir: "right", isFeedback: false },
      { id: "S2", type: "summer", name: "S2", expr: "1", x: 400, y: 165, dir: "right" },
      { id: "B2", type: "block", name: "G2", expr: "G_2", x: 545, y: 165, dir: "right", isFeedback: false },
      { id: "B3", type: "block", name: "H2", expr: "H_2", x: 500, y: 255, dir: "left", isFeedback: true },
      { id: "B4", type: "block", name: "H1", expr: "H_1", x: 360, y: 315, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 3;
    builderState.nextBlockH = 3;
    builderState.nextSummer = 3;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "S1", sign: "+", route: "auto" },
      { id: "C2", from: "S1", to: "B1", sign: "+", route: "auto" },
      { id: "C3", from: "B1", to: "S2", sign: "+", route: "auto" },
      { id: "C4", from: "S2", to: "B2", sign: "+", route: "auto" },
      { id: "C5", from: "B2", to: "OUT", sign: "+", route: "auto" },
      { id: "C6", from: "B2", to: "B3", sign: "+", route: "bottom" },
      { id: "C7", from: "B3", to: "S2", sign: "-", route: "bottom" },
      { id: "C8", from: "B2", to: "B4", sign: "+", route: "bottom" },
      { id: "C9", from: "B4", to: "S1", sign: "-", route: "bottom" }
    );
    builderState.nextConnId = 10;
  } else if (tpl === "exemplo1") {
    builderState.elements.push(
      { id: "B1", type: "block", name: "G1", expr: "G_1", x: 165, y: 165, dir: "right", isFeedback: false },
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 295, y: 165, dir: "right" },
      { id: "B2", type: "block", name: "G2", expr: "G_2", x: 435, y: 165, dir: "right", isFeedback: false },
      { id: "B3", type: "block", name: "G3", expr: "G_3", x: 595, y: 165, dir: "right", isFeedback: false },
      { id: "B4", type: "block", name: "H1", expr: "H_1", x: 560, y: 275, dir: "left", isFeedback: true },
      { id: "B5", type: "block", name: "H2", expr: "H_2", x: 400, y: 275, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 4;
    builderState.nextBlockH = 3;
    builderState.nextSummer = 2;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "B1", sign: "+", route: "auto" },
      { id: "C2", from: "B1", to: "S1", sign: "+", route: "auto" },
      { id: "C3", from: "S1", to: "B2", sign: "+", route: "auto" },
      { id: "C4", from: "B2", to: "B3", sign: "+", route: "auto" },
      { id: "C5", from: "B3", to: "OUT", sign: "+", route: "auto" },
      { id: "C6", from: "B3", to: "B4", sign: "+", route: "bottom" },
      { id: "C7", from: "B4", to: "B5", sign: "+", route: "auto" },
      { id: "C8", from: "B5", to: "S1", sign: "-", route: "bottom" }
    );
    builderState.nextConnId = 9;
  } else if (tpl === "exemplo2") {
    builderState.elements.push(
      { id: "B1", type: "block", name: "G1", expr: "G_1", x: 145, y: 165, dir: "right", isFeedback: false },
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 255, y: 165, dir: "right" },
      { id: "S2", type: "summer", name: "S2", expr: "1", x: 345, y: 165, dir: "right" },
      { id: "S3", type: "summer", name: "S3", expr: "1", x: 435, y: 165, dir: "right" },
      { id: "B2", type: "block", name: "G2", expr: "G_2", x: 555, y: 165, dir: "right", isFeedback: false },
      { id: "B3", type: "block", name: "G3", expr: "G_3", x: 695, y: 165, dir: "right", isFeedback: false },
      { id: "B4", type: "block", name: "H1", expr: "H_1", x: 560, y: 65, dir: "left", isFeedback: true },
      { id: "B5", type: "block", name: "H2", expr: "H_2", x: 560, y: 255, dir: "left", isFeedback: true },
      { id: "B6", type: "block", name: "H3", expr: "H_3", x: 560, y: 320, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 4;
    builderState.nextBlockH = 4;
    builderState.nextSummer = 4;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "B1", sign: "+", route: "auto" },
      { id: "C2", from: "B1", to: "S1", sign: "+", route: "auto" },
      { id: "C3", from: "S1", to: "S2", sign: "+", route: "auto" },
      { id: "C4", from: "S2", to: "S3", sign: "+", route: "auto" },
      { id: "C5", from: "S3", to: "B2", sign: "+", route: "auto" },
      { id: "C6", from: "B2", to: "B3", sign: "+", route: "auto" },
      { id: "C7", from: "B3", to: "OUT", sign: "+", route: "auto" },
      { id: "C8", from: "B3", to: "B4", sign: "+", route: "top" },
      { id: "C9", from: "B4", to: "S1", sign: "-", route: "top" },
      { id: "C10", from: "B3", to: "B5", sign: "+", route: "bottom" },
      { id: "C11", from: "B5", to: "S2", sign: "+", route: "bottom" },
      { id: "C12", from: "B3", to: "B6", sign: "+", route: "bottom" },
      { id: "C13", from: "B6", to: "S3", sign: "-", route: "bottom" }
    );
    builderState.nextConnId = 14;
  } else if (tpl === "proposto1") {
    builderState.elements.push(
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 115, y: 165, dir: "right" },
      { id: "B1", type: "block", name: "G1", expr: "G_1", x: 205, y: 165, dir: "right", isFeedback: false },
      { id: "S2", type: "summer", name: "S2", expr: "1", x: 295, y: 165, dir: "right" },
      { id: "B2", type: "block", name: "G2", expr: "G_2", x: 390, y: 165, dir: "right", isFeedback: false },
      { id: "B3", type: "block", name: "H2", expr: "H_2", x: 390, y: 255, dir: "left", isFeedback: true },
      { id: "B4", type: "block", name: "H1", expr: "H_1", x: 265, y: 315, dir: "left", isFeedback: true },
      { id: "B5", type: "block", name: "G_p", expr: "1/G_2", x: 505, y: 90, dir: "right", isFeedback: false },
      { id: "S3", type: "summer", name: "S3", expr: "1", x: 585, y: 165, dir: "right" },
      { id: "S4", type: "summer", name: "S4", expr: "1", x: 665, y: 165, dir: "right" },
      { id: "B6", type: "block", name: "G3", expr: "G_3", x: 755, y: 165, dir: "right", isFeedback: false },
      { id: "B7", type: "block", name: "H3", expr: "H_3", x: 755, y: 255, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 4;
    builderState.nextBlockH = 4;
    builderState.nextSummer = 5;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "S1", sign: "+", route: "auto" },
      { id: "C2", from: "S1", to: "B1", sign: "+", route: "auto" },
      { id: "C3", from: "B1", to: "S2", sign: "+", route: "auto" },
      { id: "C4", from: "S2", to: "B2", sign: "+", route: "auto" },
      { id: "C5", from: "B2", to: "B3", sign: "+", route: "bottom" },
      { id: "C6", from: "B3", to: "S2", sign: "-", route: "bottom" },
      { id: "C7", from: "B2", to: "B4", sign: "+", route: "bottom" },
      { id: "C8", from: "B4", to: "S1", sign: "-", route: "bottom" },
      { id: "C9", from: "B2", to: "B5", sign: "+", route: "top" },
      { id: "C10", from: "B5", to: "S3", sign: "+", route: "top" },
      { id: "C11", from: "B2", to: "S3", sign: "+", route: "auto" },
      { id: "C12", from: "S3", to: "S4", sign: "+", route: "auto" },
      { id: "C13", from: "S4", to: "B6", sign: "+", route: "auto" },
      { id: "C14", from: "B6", to: "B7", sign: "+", route: "bottom" },
      { id: "C15", from: "B7", to: "S4", sign: "-", route: "bottom" },
      { id: "C16", from: "B6", to: "OUT", sign: "+", route: "auto" }
    );
    builderState.nextConnId = 17;
  } else if (tpl === "malhas_cruzadas") {
    builderState.elements.push(
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 130, y: 165, dir: "right" },
      { id: "S2", type: "summer", name: "S2", expr: "1", x: 225, y: 165, dir: "right" },
      { id: "B1", type: "block", name: "G1", expr: "G_1", x: 335, y: 165, dir: "right", isFeedback: false },
      { id: "S3", type: "summer", name: "S3", expr: "1", x: 445, y: 165, dir: "right" },
      { id: "B2", type: "block", name: "G2", expr: "G_2", x: 555, y: 165, dir: "right", isFeedback: false },
      { id: "B3", type: "block", name: "G3", expr: "G_3", x: 695, y: 165, dir: "right", isFeedback: false },
      { id: "B4", type: "block", name: "H1", expr: "H_1", x: 400, y: 265, dir: "left", isFeedback: true },
      { id: "B5", type: "block", name: "H2", expr: "H_2", x: 575, y: 70, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 4;
    builderState.nextBlockH = 3;
    builderState.nextSummer = 4;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "S1", sign: "+", route: "auto" },
      { id: "C2", from: "S1", to: "S2", sign: "+", route: "auto" },
      { id: "C3", from: "S2", to: "B1", sign: "+", route: "auto" },
      { id: "C4", from: "B1", to: "S3", sign: "+", route: "auto" },
      { id: "C5", from: "S3", to: "B2", sign: "+", route: "auto" },
      { id: "C6", from: "B2", to: "B3", sign: "+", route: "auto" },
      { id: "C7", from: "B3", to: "OUT", sign: "+", route: "auto" },
      { id: "C8", from: "B2", to: "B4", sign: "+", route: "bottom" },
      { id: "C9", from: "B4", to: "S2", sign: "+", route: "bottom" },
      { id: "C10", from: "B3", to: "B5", sign: "+", route: "top" },
      { id: "C11", from: "B5", to: "S3", sign: "-", route: "top" },
      { id: "C12", from: "B3", to: "S1", sign: "-", route: "bottom" }
    );
    builderState.nextConnId = 13;
  } else if (tpl === "exemplo3") {
    builderState.elements.push(
      { id: "S1", type: "summer", name: "S1", expr: "1", x: 145, y: 155, dir: "right" },
      { id: "B1", type: "block", name: "G1", expr: "s", x: 295, y: 155, dir: "right", isFeedback: false },
      { id: "B2", type: "block", name: "G2", expr: "s", x: 420, y: 155, dir: "right", isFeedback: false },
      { id: "B3", type: "block", name: "G3", expr: "1/s", x: 355, y: 245, dir: "right", isFeedback: false },
      { id: "S2", type: "summer", name: "S2", expr: "1", x: 545, y: 155, dir: "right" },
      { id: "B4", type: "block", name: "G4", expr: "1/s", x: 685, y: 155, dir: "right", isFeedback: false },
      { id: "B5", type: "block", name: "H1", expr: "s", x: 430, y: 318, dir: "left", isFeedback: true }
    );
    builderState.nextBlockG = 5;
    builderState.nextBlockH = 2;
    builderState.nextSummer = 3;
    builderState.connections.push(
      { id: "C1", from: "IN", to: "S1", sign: "+", route: "auto" },
      { id: "C2", from: "S1", to: "B1", sign: "+", route: "auto" },
      { id: "C3", from: "B1", to: "B2", sign: "+", route: "auto" },
      { id: "C4", from: "B2", to: "S2", sign: "+", route: "auto" },
      { id: "C5", from: "S1", to: "B3", sign: "+", route: "auto" },
      { id: "C6", from: "B3", to: "S2", sign: "+", route: "bottom" },
      { id: "C7", from: "S2", to: "B4", sign: "+", route: "auto" },
      { id: "C8", from: "S2", to: "S1", sign: "-", route: "top" },
      { id: "C9", from: "B4", to: "OUT", sign: "+", route: "auto" },
      { id: "C10", from: "B4", to: "B5", sign: "+", route: "bottom" },
      { id: "C11", from: "B5", to: "S1", sign: "-", route: "bottom" }
    );
    builderState.nextConnId = 12;
  }

  refreshBuilderUI();
  updateUndoRedoButtons();
}

function builderAddBlock(isFeedback = false) {
  pushBuilderUndoState();
  const idx = isFeedback ? builderState.nextBlockH++ : builderState.nextBlockG++;
  const prefix = isFeedback ? "H" : "G";
  const id = `B_${prefix}${idx}_${Date.now().toString().slice(-3)}`;
  const name = `${prefix}${idx}`;
  const expr = `${prefix}_${idx}`;
  const count = builderState.elements.filter(e => e.type === "block").length;
  const x = isFeedback ? Math.min(720, 280 + (count * 85) % 420) : Math.min(740, 240 + (count * 105) % 480);
  const y = isFeedback ? 275 + ((idx - 1) % 2) * 45 : 165 + ((count % 3 === 0 ? 0 : count % 3 === 1 ? -55 : 55));

  builderState.elements.push({
    id,
    type: "block",
    name,
    expr,
    rat: parseRatExpr(expr),
    x,
    y: isFeedback ? Math.min(325, y) : y,
    dir: isFeedback ? "left" : "right",
    isFeedback
  });
  builderState.selectedId = id;
  builderState.selectedType = "element";
  refreshBuilderUI();
}

function builderAddSummer() {
  pushBuilderUndoState();
  const idx = builderState.nextSummer++;
  const id = `S${idx}_${Date.now().toString().slice(-3)}`;
  const name = `S${idx}`;
  const summersCount = builderState.elements.filter(e => e.type === "summer").length;
  const x = Math.min(740, 165 + summersCount * 135);
  const y = 165;

  builderState.elements.push({
    id,
    type: "summer",
    name,
    expr: "1",
    x,
    y,
    dir: "right"
  });
  refreshBuilderUI();
}

function builderAddPickoff() {
  pushBuilderUndoState();
  const idx = builderState.nextPickoff++;
  const id = `P${idx}_${Date.now().toString().slice(-3)}`;
  const name = `P${idx}`;

  // Se uma linha de conexão estiver selecionada, insere o ponto de ramificação diretamente nessa linha
  if (builderState.selectedType === "connection" && builderState.selectedId) {
    const conn = builderState.connections.find(c => c.id === builderState.selectedId);
    if (conn) {
      const fromEl = builderState.elements.find(e => e.id === conn.from);
      const toEl = builderState.elements.find(e => e.id === conn.to);
      const gTo = toEl ? getElementGeometry(toEl) : null;
      const gFrom = fromEl ? getElementGeometry(fromEl) : null;
      const px = (gTo && gTo.inPort && gFrom && gFrom.outPort)
        ? Math.max(gFrom.outPort.x + 18, gTo.inPort.x - 28)
        : Math.round(((fromEl ? fromEl.x : 200) + (toEl ? toEl.x : 350)) / 2);
      const py = fromEl ? fromEl.y : 165;

      builderState.elements.push({
        id,
        type: "pickoff",
        name,
        expr: "1",
        x: px,
        y: py,
        dir: "right"
      });
      const oldTo = conn.to;
      const oldSign = conn.sign;
      const oldRoute = conn.route;
      conn.to = id;
      conn.sign = "+";
      conn.route = "direct";
      builderState.connections.push({
        id: `C${builderState.nextConnId++}`,
        from: id,
        to: oldTo,
        sign: oldSign,
        route: oldRoute
      });
      builderState.selectedType = "element";
      builderState.selectedId = id;
      builderState.connectSourceId = id;
      const hint = document.getElementById("builderHintBar");
      if (hint) {
        hint.innerHTML = `<span style="color:#fcd34d; font-weight:700;">🔗 Ponto de ramificação <b>${name}</b> inserido na linha! Clique agora no bloco de destino (ex: 1/s) para puxar a derivação!</span>`;
      }
      refreshBuilderUI();
      return;
    }
  }

  builderState.elements.push({
    id,
    type: "pickoff",
    name,
    expr: "1",
    x: Math.min(760, 260 + idx * 75),
    y: 165,
    dir: "right"
  });
  refreshBuilderUI();
}

function builderClearAll() {
  loadBuilderTemplate("em_branco", false);
  document.getElementById("builderReductionOutput").innerHTML = "";
}

function builderAutoLayout() {
  pushBuilderUndoState();
  const forwardItems = builderState.elements.filter(e => e.id !== "IN" && e.id !== "OUT" && !e.isFeedback && e.dir !== "left");
  const fbItems = builderState.elements.filter(e => e.isFeedback || e.dir === "left");

  const inEl = builderState.elements.find(e => e.id === "IN");
  const outEl = builderState.elements.find(e => e.id === "OUT");
  if (inEl) { inEl.x = 55; inEl.y = 165; }
  if (outEl) { outEl.x = 835; outEl.y = 165; }

  const nF = forwardItems.length;
  forwardItems.forEach((el, idx) => {
    el.x = Math.round(150 + (idx * 600) / Math.max(1, nF));
    el.y = 165;
  });

  const nB = fbItems.length;
  fbItems.forEach((el, idx) => {
    el.x = Math.round(280 + (idx * 380) / Math.max(1, nB));
    el.y = idx % 2 === 0 ? 275 : 70;
  });

  refreshBuilderUI();
}

function toggleConnectMode(forceState) {
  builderState.connectMode = typeof forceState === "boolean" ? forceState : !builderState.connectMode;
  builderState.connectSourceId = null;
  builderState.penDrag = null;
  const btn = document.getElementById("btnConnectMode");
  if (btn) {
    btn.innerText = builderState.connectMode
      ? "✏️ Lápis / Puxar Linha: ATIVO (Clique na linha/bloco e arraste)"
      : "✏️ Lápis / Puxar Linha: OFF";
    btn.classList.toggle("active-mode", builderState.connectMode);
  }
  const btnCanvas = document.getElementById("btnCanvasPen");
  if (btnCanvas) {
    btnCanvas.innerText = builderState.connectMode ? "✏️ Lápis: ATIVO" : "✏️ Lápis: OFF";
    btnCanvas.classList.toggle("active-mode", builderState.connectMode);
  }
  const svg = document.getElementById("builderSvg");
  if (svg) {
    svg.classList.toggle("pen-mode-active", builderState.connectMode);
  }
  resetHintBar();
  renderBuilderCanvas();
}

function updateConnSignVisibility() {
  const toId = document.getElementById("connToSelect")?.value;
  const toEl = builderState.elements.find(e => e.id === toId);
  const wrapper = document.getElementById("connSignWrapper");
  if (wrapper) {
    wrapper.style.opacity = (toEl && toEl.type === "summer") ? "1" : "0.55";
  }
}

function builderAddConnection(fromId, toId, sign = "+", route = "auto", tapPt = null) {
  if (!fromId || !toId || fromId === toId) return;
  if (fromId === "OUT" || toId === "IN") return;

  const fromEl = builderState.elements.find(e => e.id === fromId);
  const toEl = builderState.elements.find(e => e.id === toId);
  if (!fromEl || !toEl) return;

  pushBuilderUndoState();

  // Se o destino for um bloco, entrada ou saída que já tem uma conexão de entrada, substituí-la (apenas somadores aceitam múltiplas entradas)
  if (toEl.type !== "summer") {
    builderState.connections = builderState.connections.filter(c => c.to !== toId);
  }

  const id = `C${builderState.nextConnId++}`;
  const newConn = {
    id,
    from: fromId,
    to: toId,
    sign: toEl.type === "summer" ? sign : "+",
    route
  };
  if (tapPt && typeof tapPt.x === "number" && typeof tapPt.y === "number") {
    newConn.tapPt = { x: Math.round(tapPt.x), y: Math.round(tapPt.y) };
  }
  builderState.connections.push(newConn);
  refreshBuilderUI();
}

function builderAddConnectionFromBar() {
  const fromId = document.getElementById("connFromSelect").value;
  const toId = document.getElementById("connToSelect").value;
  const sign = document.getElementById("connSignSelect").value;
  const route = document.getElementById("connRouteSelect").value;
  builderAddConnection(fromId, toId, sign, route);
}

function removeElement(id) {
  if (id === "IN" || id === "OUT") return;
  pushBuilderUndoState();
  if (builderState.selectedId === id) {
    builderState.selectedType = null;
    builderState.selectedId = null;
  }
  builderState.elements = builderState.elements.filter(e => e.id !== id);
  builderState.connections = builderState.connections.filter(c => c.from !== id && c.to !== id);
  refreshBuilderUI();
}

function removeConnection(id) {
  pushBuilderUndoState();
  if (builderState.selectedId === id) {
    builderState.selectedType = null;
    builderState.selectedId = null;
  }
  builderState.connections = builderState.connections.filter(c => c.id !== id);
  refreshBuilderUI();
}

function toggleConnectionSign(connId) {
  const c = builderState.connections.find(x => x.id === connId);
  if (c) {
    pushBuilderUndoState();
    c.sign = c.sign === "+" ? "-" : "+";
    refreshBuilderUI();
  }
}

function setConnectionSign(connId, signVal) {
  const c = builderState.connections.find(x => x.id === connId);
  if (c && c.sign !== signVal) {
    pushBuilderUndoState();
    c.sign = signVal;
    refreshBuilderUI();
  }
}

function builderToggleSelectedSign() {
  // 1. Se uma conexão estiver selecionada, alterna o sinal dela
  if (builderState.selectedType === "connection" && builderState.selectedId) {
    const conn = builderState.connections.find(c => c.id === builderState.selectedId);
    if (conn) {
      toggleConnectionSign(conn.id);
      return;
    }
  }
  // 2. Se um somador estiver selecionado, alterna o sinal das entradas dele (ou abre a barra de sinais)
  if (builderState.selectedType === "element" && builderState.selectedId) {
    const el = builderState.elements.find(e => e.id === builderState.selectedId);
    if (el && el.type === "summer") {
      const incoming = builderState.connections.filter(c => c.to === el.id);
      if (incoming.length > 0) {
        const targetConn = incoming[incoming.length - 1];
        toggleConnectionSign(targetConn.id);
        return;
      }
    }
  }
  // 3. Caso contrário, alterna o sinal da última ligação que entra em um somador
  const summerConns = builderState.connections.filter(c => {
    const t = builderState.elements.find(e => e.id === c.to);
    return t && t.type === "summer";
  });
  if (summerConns.length > 0) {
    const lastC = summerConns[summerConns.length - 1];
    builderState.selectedType = "connection";
    builderState.selectedId = lastC.id;
    toggleConnectionSign(lastC.id);
  }
}

function flipBlockDirection(elId) {
  const el = builderState.elements.find(e => e.id === elId);
  if (el && el.type === "block") {
    pushBuilderUndoState();
    el.dir = el.dir === "left" ? "right" : "left";
    el.isFeedback = el.dir === "left";
    refreshBuilderUI();
  }
}

function refreshBuilderUI() {
  // Atualizar selects da barra de conexão
  const fromSel = document.getElementById("connFromSelect");
  const toSel = document.getElementById("connToSelect");
  if (fromSel && toSel) {
    const prevFrom = fromSel.value;
    const prevTo = toSel.value;
    fromSel.innerHTML = "";
    toSel.innerHTML = "";

    builderState.elements.forEach(el => {
      const label = el.type === "block" ? `${el.name} [${el.expr}]`
        : el.type === "summer" ? `⊕ Somador ${el.name}`
        : el.type === "pickoff" ? `● Nó ${el.name}`
        : el.name;

      if (el.id !== "OUT") {
        const o1 = document.createElement("option");
        o1.value = el.id;
        o1.innerText = label;
        fromSel.appendChild(o1);
      }
      if (el.id !== "IN") {
        const o2 = document.createElement("option");
        o2.value = el.id;
        o2.innerText = label;
        toSel.appendChild(o2);
      }
    });
    if (prevFrom && [...fromSel.options].some(o => o.value === prevFrom)) fromSel.value = prevFrom;
    if (prevTo && [...toSel.options].some(o => o.value === prevTo)) toSel.value = prevTo;
    updateConnSignVisibility();
  }

  // Atualizar lista de Elementos
  const elList = document.getElementById("builderElementsList");
  const elCount = document.getElementById("elementsCount");
  const editableElements = builderState.elements.filter(e => e.id !== "IN" && e.id !== "OUT");
  if (elCount) elCount.innerText = editableElements.length;

  if (elList) {
    elList.innerHTML = "";
    if (editableElements.length === 0) {
      elList.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px;">Nenhum bloco ou somador adicionado. Use os botões acima para adicionar quantos quiser.</div>`;
    }
    editableElements.forEach(el => {
      const row = document.createElement("div");
      const isSelected = builderState.selectedType === "element" && builderState.selectedId === el.id;
      row.className = "builder-item-row";
      if (isSelected) row.style.borderColor = "#f59e0b";

      if (el.type === "block") {
        const badgeClass = el.isFeedback ? "badge-fb" : "badge-block";
        const badgeText = el.dir === "left" ? "← Bloco H" : "→ Bloco G";
        row.innerHTML = `
          <span class="badge-type ${badgeClass}" style="cursor:pointer;" onclick="selectBuilderItem('element', '${el.id}')">${badgeText}</span>
          <input type="text" value="${el.name}" style="width:58px; flex:0 0 58px;" title="Nome do Bloco" onchange="updateElementField('${el.id}', 'name', this.value)" />
          <span style="color:var(--text-muted);">=</span>
          <input type="text" value="${el.expr}" style="flex:1;" title="Função de Transferência (ex: G_1, 10/(s+2), s, 1/s)" onchange="updateElementField('${el.id}', 'expr', this.value)" />
          <button class="btn-mini" title="Inverter direção visual do bloco (Direita ⇄ Esquerda)" onclick="flipBlockDirection('${el.id}')">⇄</button>
          <button class="btn-mini btn-mini-danger" title="Remover bloco" onclick="removeElement('${el.id}')">✕</button>
        `;
      } else if (el.type === "summer") {
        const inputs = builderState.connections.filter(c => c.to === el.id);
        const summary = inputs.map(c => {
          const src = builderState.elements.find(e => e.id === c.from);
          return `${c.sign}${src ? src.name : "?"}`;
        }).join(" ") || "sem entradas";
        row.innerHTML = `
          <span class="badge-type badge-summer" style="cursor:pointer;" onclick="selectBuilderItem('element', '${el.id}')">⊕ Somador</span>
          <input type="text" value="${el.name}" style="width:65px; flex:0 0 65px;" onchange="updateElementField('${el.id}', 'name', this.value)" />
          <span style="flex:1; color:var(--text-muted); font-size:0.76rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Entradas: ${summary}</span>
          <button class="btn-mini btn-mini-danger" title="Remover somador" onclick="removeElement('${el.id}')">✕</button>
        `;
      } else if (el.type === "pickoff") {
        row.innerHTML = `
          <span class="badge-type badge-pickoff" style="cursor:pointer;" onclick="selectBuilderItem('element', '${el.id}')">● Nó</span>
          <input type="text" value="${el.name}" style="width:65px; flex:0 0 65px;" onchange="updateElementField('${el.id}', 'name', this.value)" />
          <span style="flex:1; color:var(--text-muted); font-size:0.76rem;">Ponto de Ramificação</span>
          <button class="btn-mini btn-mini-danger" title="Remover nó" onclick="removeElement('${el.id}')">✕</button>
        `;
      }
      elList.appendChild(row);
    });
  }

  // Atualizar lista de Conexões
  const connList = document.getElementById("builderConnectionsList");
  const connCount = document.getElementById("connectionsCount");
  if (connCount) connCount.innerText = builderState.connections.length;

  if (connList) {
    connList.innerHTML = "";
    if (builderState.connections.length === 0) {
      connList.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px;">Nenhuma ligação criada. Selecione Origem → Destino ou clique nos conectores do diagrama.</div>`;
    }
    builderState.connections.forEach(c => {
      const fromEl = builderState.elements.find(e => e.id === c.from);
      const toEl = builderState.elements.find(e => e.id === c.to);
      if (!fromEl || !toEl) return;

      const row = document.createElement("div");
      const isSelected = builderState.selectedType === "connection" && builderState.selectedId === c.id;
      row.className = "builder-item-row";
      if (isSelected) row.style.borderColor = "#f59e0b";
      const isSummerTarget = toEl.type === "summer";
      const signBtn = isSummerTarget
        ? `<button class="btn-mini ${c.sign === '+' ? 'btn-sign-plus' : 'btn-sign-minus'}" title="Clique para alternar entre Soma (+) e Subtração (-)" onclick="toggleConnectionSign('${c.id}')">${c.sign}</button>`
        : `<span style="color:var(--text-muted); font-size:0.75rem; padding:0 6px;">→</span>`;

      row.innerHTML = `
        <span style="font-weight:700; color:var(--primary); min-width:42px; cursor:pointer;" onclick="selectBuilderItem('connection', '${c.id}')">${fromEl.name}</span>
        <span style="color:var(--text-muted); cursor:pointer;" onclick="selectBuilderItem('connection', '${c.id}')">➔</span>
        <span style="font-weight:700; color:var(--text); min-width:42px; cursor:pointer;" onclick="selectBuilderItem('connection', '${c.id}')">${toEl.name}</span>
        ${signBtn}
        <select style="width:110px; flex:0 0 110px;" title="Trajeto visual da linha" onchange="updateConnectionRoute('${c.id}', this.value)">
          <option value="auto" ${c.route === 'auto' ? 'selected' : ''}>Rota: Auto</option>
          <option value="direct" ${c.route === 'direct' ? 'selected' : ''}>Direta</option>
          <option value="bottom" ${c.route === 'bottom' ? 'selected' : ''}>Por Baixo</option>
          <option value="top" ${c.route === 'top' ? 'selected' : ''}>Por Cima</option>
        </select>
        <button class="btn-mini btn-mini-danger" style="margin-left:auto;" title="Excluir ligação" onclick="removeConnection('${c.id}')">✕</button>
      `;
      connList.appendChild(row);
    });
  }

  // Atualizar barra compacta de edição rápida quando um bloco, somador ou linha está selecionado no canvas
  const quickBar = document.getElementById("quickBlockEditorBar");
  if (quickBar) {
    const selEl = builderState.selectedType === "element"
      ? builderState.elements.find(e => e.id === builderState.selectedId)
      : null;
    const selConn = builderState.selectedType === "connection"
      ? builderState.connections.find(c => c.id === builderState.selectedId)
      : null;

    if (selEl && selEl.type === "block") {
      quickBar.style.display = "flex";
      quickBar.innerHTML = `
        <span style="color:#fbbf24; font-weight:700;">✏️ Bloco Selecionado:</span>
        <label style="margin:0; font-size:0.76rem; color:var(--text-muted);">Nome:</label>
        <input type="text" value="${selEl.name}" style="width:60px;" title="Nome do bloco" onchange="updateElementField('${selEl.id}', 'name', this.value)" />
        <label style="margin:0; font-size:0.76rem; color:var(--text-muted);">Função / Ganho:</label>
        <input id="quickBlockExprInput" type="text" value="${selEl.expr}" style="min-width:160px; flex:1; max-width:280px;" placeholder="Ex: 10/(s+2), 5, s+1, 1/s, G_1" onchange="updateElementField('${selEl.id}', 'expr', this.value)" onkeydown="if(event.key==='Enter'){updateElementField('${selEl.id}', 'expr', this.value); this.blur();}" />
        <button type="button" class="btn-mini btn-mini-primary" style="background:#2563eb; color:#fff;" onclick="const inp=document.getElementById('quickBlockExprInput'); if(inp){updateElementField('${selEl.id}', 'expr', inp.value);}" title="Aplicar valor ao bloco">Salvar</button>
        <button type="button" class="btn-mini" onclick="flipBlockDirection('${selEl.id}')" title="Inverter direção do bloco">⇄ Direção (${selEl.dir === 'left' ? '←' : '→'})</button>
        <button type="button" class="btn-mini btn-mini-danger" onclick="removeElement('${selEl.id}')" title="Excluir este bloco">✕ Excluir</button>
      `;
    } else if (selEl && selEl.type === "summer") {
      const inConns = builderState.connections.filter(c => c.to === selEl.id);
      const signsHtml = inConns.length > 0
        ? inConns.map(c => {
            const fromNode = builderState.elements.find(e => e.id === c.from);
            const fromName = fromNode ? fromNode.name : "?";
            const isPlus = c.sign === "+";
            return `
              <span style="display:inline-flex; align-items:center; gap:4px; background:#090d16; border:1px solid #334155; padding:3px 8px; border-radius:5px;">
                <span style="color:var(--text-muted); font-size:0.78rem;">Entrada de <b>${fromName}</b>:</span>
                <button type="button" class="btn-mini ${isPlus ? 'btn-sign-plus' : ''}" onclick="setConnectionSign('${c.id}', '+')" title="Definir como Soma (+)">＋</button>
                <button type="button" class="btn-mini ${!isPlus ? 'btn-sign-minus' : ''}" onclick="setConnectionSign('${c.id}', '-')" title="Definir como Subtração (-)">－</button>
              </span>
            `;
          }).join("")
        : `<span style="color:var(--text-muted); font-size:0.78rem;">Puxe linhas até este somador para escolher os sinais (＋ ou －) de cada entrada.</span>`;

      quickBar.style.display = "flex";
      quickBar.innerHTML = `
        <span style="color:#34d399; font-weight:700;">⊕ Somador ${selEl.name} — Sinais (+ / -):</span>
        ${signsHtml}
        <button type="button" class="btn-mini btn-mini-danger" style="margin-left:auto;" onclick="removeElement('${selEl.id}')">✕ Excluir Somador</button>
      `;
    } else if (selConn) {
      const fromNode = builderState.elements.find(e => e.id === selConn.from);
      const toNode = builderState.elements.find(e => e.id === selConn.to);
      const isSummer = toNode && toNode.type === "summer";
      const isPlus = selConn.sign === "+";
      quickBar.style.display = "flex";
      quickBar.innerHTML = `
        <span style="color:#38bdf8; font-weight:700;">🔗 Linha (${fromNode ? fromNode.name : '?'} ➔ ${toNode ? toNode.name : '?'}):</span>
        ${isSummer ? `
          <span style="color:var(--text-muted); font-size:0.78rem;">Sinal no Somador:</span>
          <button type="button" class="btn-mini ${isPlus ? 'btn-sign-plus' : ''}" onclick="setConnectionSign('${selConn.id}', '+')">＋ Positivo (+)</button>
          <button type="button" class="btn-mini ${!isPlus ? 'btn-sign-minus' : ''}" onclick="setConnectionSign('${selConn.id}', '-')">－ Negativo (-)</button>
        ` : ""}
        <label style="margin:0; font-size:0.76rem; color:var(--text-muted);">Entrada/Rota:</label>
        <select style="width:125px; margin:0; padding:4px 6px;" onchange="updateConnectionRoute('${selConn.id}', this.value)">
          <option value="auto" ${selConn.route === 'auto' ? 'selected' : ''}>Automático</option>
          <option value="direct" ${selConn.route === 'direct' ? 'selected' : ''}>Esquerda (Meio)</option>
          <option value="top" ${selConn.route === 'top' ? 'selected' : ''}>Por Cima</option>
          <option value="bottom" ${selConn.route === 'bottom' ? 'selected' : ''}>Por Baixo</option>
        </select>
        <button type="button" class="btn-mini btn-mini-danger" style="margin-left:auto;" onclick="removeConnection('${selConn.id}')">✕ Excluir Linha</button>
      `;
    } else {
      quickBar.style.display = "none";
      quickBar.innerHTML = "";
    }
  }

  renderBuilderCanvas();
  updateUndoRedoButtons();
}

function updateElementField(id, field, val) {
  const el = builderState.elements.find(e => e.id === id);
  if (el && val.trim() && el[field] !== val.trim()) {
    pushBuilderUndoState();
    el[field] = val.trim();
    if (field === "expr") {
      try {
        el.rat = parseRatExpr(el.expr);
      } catch (err) {
        console.warn("Erro ao processar expressão:", err);
      }
    }
    refreshBuilderUI();
  }
}

function updateConnectionRoute(connId, routeVal) {
  const c = builderState.connections.find(x => x.id === connId);
  if (c && c.route !== routeVal) {
    pushBuilderUndoState();
    c.route = routeVal;
    renderBuilderCanvas();
  }
}

// ============================================================================
// 5. RENDERIZADOR SVG DE GRAFO DE DIAGRAMA DE BLOCOS (EDITOR E ETAPAS)
// ============================================================================

function getElementGeometry(el) {
  if (el.type === "block") {
    const rat = el.rat || parseRatExpr(el.expr);
    const parts = ratToCompactParts(rat);
    const maxLen = Math.max(parts.num.length, parts.isFraction ? parts.den.length : 0, (el.name || "").length);
    const w = Math.max(66, Math.min(220, maxLen * 6.5 + 24));
    const h = parts.isFraction ? 46 : 38;
    const isLeft = el.dir === "left";
    return {
      w, h,
      inPort: { x: isLeft ? el.x + w / 2 : el.x - w / 2, y: el.y, side: isLeft ? "right" : "left" },
      outPort: { x: isLeft ? el.x - w / 2 : el.x + w / 2, y: el.y, side: isLeft ? "left" : "right" }
    };
  }
  if (el.type === "summer") {
    const r = 16;
    return {
      w: r * 2, h: r * 2, r,
      outPort: { x: el.x + r, y: el.y, side: "right" }
    };
  }
  if (el.type === "pickoff") {
    return {
      w: 12, h: 12, r: 5,
      inPort: { x: el.x, y: el.y, side: "center" },
      outPort: { x: el.x, y: el.y, side: "center" }
    };
  }
  if (el.type === "input") {
    return {
      w: 44, h: 28,
      outPort: { x: el.x + 22, y: el.y, side: "right" }
    };
  }
  // output
  return {
    w: 44, h: 28,
    inPort: { x: el.x - 22, y: el.y, side: "left" }
  };
}

function computeSummerInputPort(summer, fromEl, conn, idxAmongSameSide, totalSameSide) {
  const r = 16;
  let side = "left";
  if (conn.route === "bottom") side = "bottom";
  else if (conn.route === "top") side = "top";
  else if (conn.route === "direct") side = "left";
  else {
    // Auto-detecção
    if (fromEl.y > summer.y + 32) side = "bottom";
    else if (fromEl.y < summer.y - 32) side = "top";
    else if (fromEl.x > summer.x + 20) side = "bottom";
    else side = "left";
  }

  const offsetAngle = totalSameSide > 1 ? (idxAmongSameSide - (totalSameSide - 1) / 2) * 0.42 : 0;
  let baseAngle = Math.PI; // left
  if (side === "bottom") baseAngle = Math.PI / 2;
  if (side === "top") baseAngle = -Math.PI / 2;

  const angle = baseAngle + offsetAngle;
  const px = summer.x + r * Math.cos(angle);
  const py = summer.y + r * Math.sin(angle);
  const sx = summer.x + (r - 7) * Math.cos(angle);
  const sy = summer.y + (r - 7) * Math.sin(angle);
  const extSignX = summer.x + (r + 11) * Math.cos(angle);
  const extSignY = summer.y + (r + 11) * Math.sin(angle);

  return { x: px, y: py, side, sx, sy, extSignX, extSignY };
}

// Mapa das polilinhas renderizadas no canvas interativo para encaixe (snap) exato do Lápis na linha
let renderedWirePolylines = new Map();

function parseSvgPathToPoints(pathStr) {
  const pts = [];
  const re = /[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/gi;
  let m;
  while ((m = re.exec(pathStr)) !== null) {
    pts.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
  }
  return pts;
}

function closestPointOnPolyline(pt, poly) {
  if (!poly || poly.length === 0) return { x: pt.x, y: pt.y, dist: Infinity };
  if (poly.length === 1) {
    return { x: poly[0].x, y: poly[0].y, dist: Math.hypot(pt.x - poly[0].x, pt.y - poly[0].y) };
  }
  let best = { x: poly[0].x, y: poly[0].y, dist: Infinity };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 1e-6) {
      t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
    }
    const cx = a.x + t * dx;
    const cy = a.y + t * dy;
    const d = Math.hypot(pt.x - cx, pt.y - cy);
    if (d < best.dist) {
      best = { x: cx, y: cy, dist: d };
    }
  }
  return best;
}

function buildWirePath(fromEl, toEl, startPt, endPt, conn, loopOffsetIdx = 0, minForwardTargetInX = null, outCount = 1, maxHorizForwardX = null) {
  const x1 = startPt.x, y1 = startPt.y;
  const x2 = endPt.x, y2 = endPt.y;
  const endSide = endPt.side || "left";
  const hasMultipleOut = outCount > 1;

  // Caso 0: Linha puxada especificamente de um ponto (tapPt) sobre outra linha com a ferramenta Lápis/Caneta
  if (conn.tapPt && typeof conn.tapPt.x === "number" && typeof conn.tapPt.y === "number") {
    const tapX = (fromEl.type === "block" && fromEl.dir === "left")
      ? Math.min(x1 - 8, conn.tapPt.x)
      : Math.max(x1 + 8, conn.tapPt.x);
    const tapY = Math.abs(conn.tapPt.y - y1) <= 28 ? y1 : conn.tapPt.y;

    const coveredByHorizMain = hasMultipleOut && Math.abs(tapY - y1) <= 4 && maxHorizForwardX !== null && maxHorizForwardX >= tapX - 2;
    const prefix = coveredByHorizMain ? `M ${tapX} ${tapY}` : `M ${x1} ${y1} L ${tapX} ${tapY}`;
    const dot = hasMultipleOut ? { x: tapX, y: tapY } : null;

    if (toEl.type === "summer") {
      if (endSide === "top" || endSide === "bottom") {
        if (tapX > x2 + 15) {
          const isTop = endSide === "top";
          const loopY = isTop
            ? Math.min(tapY, y2, 55) - loopOffsetIdx * 22
            : Math.max(tapY, y2, 305) + loopOffsetIdx * 22;
          return {
            path: `${prefix} L ${tapX} ${loopY} L ${x2} ${loopY} L ${x2} ${y2}`,
            pickoffDot: dot
          };
        }
        if (Math.abs(tapY - y1) <= 6 && Math.abs(tapX - x2) >= 8) {
          return {
            path: `${prefix} L ${x2} ${tapY} L ${x2} ${y2}`,
            pickoffDot: dot
          };
        }
        return {
          path: `${prefix} L ${x2} ${tapY} L ${x2} ${y2}`,
          pickoffDot: dot
        };
      }
      return {
        path: `${prefix} L ${tapX} ${y2} L ${x2} ${y2}`,
        pickoffDot: dot
      };
    }

    if (toEl.type === "block" && toEl.dir === "left") {
      if (tapX >= x2 + 8) {
        return {
          path: `${prefix} L ${tapX} ${y2} L ${x2} ${y2}`,
          pickoffDot: dot
        };
      }
      const rx = x2 + 22;
      return {
        path: `${prefix} L ${rx} ${tapY} L ${rx} ${y2} L ${x2} ${y2}`,
        pickoffDot: dot
      };
    }

    // Bloco normal (entrada na esquerda) ou Saída C(s)
    if (tapX <= x2 - 8) {
      if (Math.abs(tapY - y2) < 5) {
        return {
          path: `${prefix} L ${x2} ${y2}`,
          pickoffDot: dot
        };
      }
      return {
        path: `${prefix} L ${tapX} ${y2} L ${x2} ${y2}`,
        pickoffDot: dot
      };
    }
    const lx = x2 - 22;
    const detourY = y2 + (y2 >= tapY ? 28 : -28);
    return {
      path: `${prefix} L ${tapX} ${detourY} L ${lx} ${detourY} L ${lx} ${y2} L ${x2} ${y2}`,
      pickoffDot: dot
    };
  }

  // Caso 1: Ramo alimentando um Bloco de Realimentação (que aponta para a esquerda, entrada na direita)
  if (toEl.type === "block" && toEl.dir === "left") {
    const pickX = Math.max(x1 + 18, x2 + 22);
    const coveredByMain = hasMultipleOut && maxHorizForwardX !== null && maxHorizForwardX >= pickX - 2;
    return {
      path: coveredByMain
        ? `M ${pickX} ${y1} L ${pickX} ${y2} L ${x2} ${y2}`
        : `M ${x1} ${y1} L ${pickX} ${y1} L ${pickX} ${y2} L ${x2} ${y2}`,
      pickoffDot: hasMultipleOut ? { x: pickX, y: y1 } : null
    };
  }

  // Caso 2: Saída de Bloco de Realimentação (esquerda) indo para Somador (por baixo ou por cima)
  if (fromEl.type === "block" && fromEl.dir === "left" && toEl.type === "summer") {
    return {
      path: `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`,
      pickoffDot: null
    };
  }

  // Caso 3: Realimentação direta indo da direita para a esquerda (sem bloco H)
  const isRightToLeft = x1 > x2 + 15;
  const isSummerLoopRoute = toEl.type === "summer" && (conn.route === "bottom" || conn.route === "top") && x1 > x2 - 20;
  if ((isRightToLeft || isSummerLoopRoute) && !(fromEl.type === "block" && fromEl.dir === "left")) {
    const isTop = conn.route === "top" || (conn.route === "auto" && y2 < y1 - 40);
    const loopY = isTop
      ? Math.min(y1, y2, 55) - loopOffsetIdx * 22
      : Math.max(y1, y2, 305) + loopOffsetIdx * 22;
    const pickX = x1 + 16;
    const coveredByMain = hasMultipleOut && maxHorizForwardX !== null && maxHorizForwardX >= pickX - 2;
    return {
      path: coveredByMain
        ? `M ${pickX} ${y1} L ${pickX} ${loopY} L ${x2} ${loopY} L ${x2} ${y2}`
        : `M ${x1} ${y1} L ${pickX} ${y1} L ${pickX} ${loopY} L ${x2} ${loopY} L ${x2} ${y2}`,
      pickoffDot: hasMultipleOut ? { x: pickX, y: y1 } : null
    };
  }

  // Caso 4: Saída de um Ponto de Ramificação (pickoff) indo para a direita
  if (fromEl.type === "pickoff" && x1 <= x2) {
    if (Math.abs(y1 - y2) < 4) {
      return {
        path: `M ${x1} ${y1} L ${x2} ${y2}`,
        pickoffDot: null
      };
    }
    return {
      path: `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`,
      pickoffDot: null
    };
  }

  // Caso 5: Chegada pelo topo ou base de um somador vindo da esquerda (ex: soma de ramos em paralelo)
  if (toEl.type === "summer" && (endSide === "top" || endSide === "bottom") && x1 <= x2) {
    return {
      path: `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`,
      pickoffDot: null
    };
  }

  // Caso 6: Ligação horizontal direta para a direita
  if (Math.abs(y1 - y2) < 6 && x1 <= x2) {
    return {
      path: `M ${x1} ${y1} L ${x2} ${y2}`,
      pickoffDot: null
    };
  }

  // Caso 7: Derivação / alimentação em paralelo para outro nível vertical (ex: linha antes do bloco 's' descendo para '1/s')
  let branchX = Math.round((x1 + x2) / 2);
  if (minForwardTargetInX !== null && x1 <= x2) {
    branchX = Math.max(x1 + 14, Math.min(x2 - 16, minForwardTargetInX - 26));
  }
  const coveredByMain = hasMultipleOut && maxHorizForwardX !== null && maxHorizForwardX >= branchX - 2 && x1 <= x2;
  return {
    path: coveredByMain
      ? `M ${branchX} ${y1} L ${branchX} ${y2} L ${x2} ${y2}`
      : `M ${x1} ${y1} L ${branchX} ${y1} L ${branchX} ${y2} L ${x2} ${y2}`,
    pickoffDot: (hasMultipleOut && x1 <= x2) ? { x: branchX, y: y1 } : null
  };
}

function renderGraphToSvgString(graph, options = {}) {
  const isInteractive = !!options.interactive;
  const highlightIds = new Set(options.highlightIds || []);
  let svgContent = svgDefs();

  if (isInteractive) {
    renderedWirePolylines = new Map();
    svgContent += `
      <pattern id="builderGrid" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(148, 163, 184, 0.06)" stroke-width="1" />
      </pattern>
      <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#builderGrid)" />
    `;
  }

  const geomMap = new Map();
  graph.elements.forEach(el => {
    geomMap.set(el.id, getElementGeometry(el));
  });

  // Agrupar entradas de cada somador por lado para distribuir os ângulos
  const summerPortMap = new Map();
  graph.elements.filter(e => e.type === "summer").forEach(sumEl => {
    const incoming = graph.connections.filter(c => c.to === sumEl.id);
    const bySide = { left: [], bottom: [], top: [] };
    incoming.forEach(c => {
      const fromEl = graph.elements.find(e => e.id === c.from);
      if (!fromEl) return;
      let side = "left";
      if (c.route === "bottom") side = "bottom";
      else if (c.route === "top") side = "top";
      else if (c.route === "direct") side = "left";
      else {
        const refY = c.tapPt ? c.tapPt.y : fromEl.y;
        const refX = c.tapPt ? c.tapPt.x : fromEl.x;
        if (refY > sumEl.y + 32) side = "bottom";
        else if (refY < sumEl.y - 32) side = "top";
        else if (refX > sumEl.x + 20) side = "bottom";
      }
      bySide[side].push(c);
    });
    for (const side of ["left", "bottom", "top"]) {
      const list = bySide[side];
      list.forEach((c, idx) => {
        const fromEl = graph.elements.find(e => e.id === c.from);
        summerPortMap.set(c.id, computeSummerInputPort(sumEl, fromEl, c, idx, list.length));
      });
    }
  });

  // Para cada elemento de origem, calcular a menor e maior coordenada X de entrada entre seus destinos diretos à direita
  const minForwardInXMap = new Map();
  const maxHorizForwardXMap = new Map();
  const outCountMap = new Map();
  graph.elements.forEach(fromEl => {
    const gFrom = geomMap.get(fromEl.id);
    const outConns = graph.connections.filter(c => c.from === fromEl.id);
    outCountMap.set(fromEl.id, outConns.length);
    if (!gFrom || !gFrom.outPort) return;
    let minInX = null;
    let maxHorizX = null;
    outConns.forEach(c => {
      const tEl = graph.elements.find(e => e.id === c.to);
      if (!tEl || (tEl.type === "block" && tEl.dir === "left")) return;
      const gTo = geomMap.get(tEl.id);
      const tPt = tEl.type === "summer" ? (summerPortMap.get(c.id) || { x: tEl.x - 16, y: tEl.y }) : gTo?.inPort;
      if (tPt && tPt.x > gFrom.outPort.x + 15) {
        if (minInX === null || tPt.x < minInX) minInX = tPt.x;
        if (!c.tapPt && Math.abs(tPt.y - gFrom.outPort.y) < 6) {
          if (maxHorizX === null || tPt.x > maxHorizX) maxHorizX = tPt.x;
        }
      }
    });
    if (minInX !== null) minForwardInXMap.set(fromEl.id, minInX);
    if (maxHorizX !== null) maxHorizForwardXMap.set(fromEl.id, maxHorizX);
  });

  // Desenhar conexões (todas sempre terminam com seta marker-end)
  let directLoopCounter = 0;
  graph.connections.forEach(conn => {
    const fromEl = graph.elements.find(e => e.id === conn.from);
    const toEl = graph.elements.find(e => e.id === conn.to);
    if (!fromEl || !toEl) return;

    const gFrom = geomMap.get(fromEl.id);
    const gTo = geomMap.get(toEl.id);
    const startPt = gFrom.outPort;
    const endPt = toEl.type === "summer" ? (summerPortMap.get(conn.id) || { x: toEl.x - 16, y: toEl.y, side: "left" }) : gTo.inPort;

    const isDirectBackLoop = (startPt.x > endPt.x + 15) && !(fromEl.type === "block" && fromEl.dir === "left");
    const minForwardInX = minForwardInXMap.get(fromEl.id) ?? null;
    const outCount = outCountMap.get(fromEl.id) || 1;
    const maxHorizForwardX = maxHorizForwardXMap.get(fromEl.id) ?? null;
    const wire = buildWirePath(
      fromEl,
      toEl,
      startPt,
      endPt,
      conn,
      isDirectBackLoop ? directLoopCounter++ : 0,
      minForwardInX,
      outCount,
      maxHorizForwardX
    );

    if (isInteractive) {
      renderedWirePolylines.set(conn.id, parseSvgPathToPoints(wire.path));
    }

    const isSelectedWire = isInteractive && builderState.selectedType === "connection" && builderState.selectedId === conn.id;
    const isFeedbackWire = (fromEl.isFeedback || toEl.isFeedback || isDirectBackLoop);
    const strokeColor = isSelectedWire ? "#f59e0b" : isFeedbackWire ? "#a855f7" : "#38bdf8";
    const markerUrl = isSelectedWire ? "url(#arrow-selected)" : isFeedbackWire ? "url(#arrow-purple)" : "url(#arrow)";
    const strokeWidth = isSelectedWire ? "3.2" : "2.2";

    if (isInteractive) {
      svgContent += `<path class="svg-wire-hit" d="${wire.path}" fill="none" stroke="transparent" stroke-width="16" style="cursor:pointer;" onmousedown="startPenFromWire(event, '${conn.id}')" onclick="handleWireClick(event, '${conn.id}')" />`;
    }
    svgContent += `<path d="${wire.path}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" marker-end="${markerUrl}" style="${isInteractive ? 'pointer-events:none;' : ''}" />`;

    if (wire.pickoffDot) {
      svgContent += `<circle cx="${wire.pickoffDot.x}" cy="${wire.pickoffDot.y}" r="4" fill="${strokeColor}" style="pointer-events:none;" />`;
    }
  });

  // Desenhar elementos
  graph.elements.forEach(el => {
    const g = geomMap.get(el.id);
    const isHighlighted = highlightIds.has(el.id);
    const isConnectSrc = isInteractive && (builderState.connectSourceId === el.id || (builderState.penDrag && builderState.penDrag.fromId === el.id && builderState.penDrag.sourceType === "element"));
    const isSelectedEl = isInteractive && builderState.selectedType === "element" && builderState.selectedId === el.id;
    const dragAttr = isInteractive ? `class="svg-draggable" data-el-id="${el.id}" onmousedown="startDragElement(event, '${el.id}')" onclick="handleElementClick(event, '${el.id}')" ondblclick="handleElementDblClick(event, '${el.id}')"` : "";

    if (el.type === "input" || el.type === "output") {
      const stroke = isConnectSrc ? "#f59e0b" : (el.type === "input" ? "#38bdf8" : "#10b981");
      svgContent += `
        <g ${dragAttr}>
          <rect x="${el.x - 22}" y="${el.y - 14}" width="44" height="28" rx="14" fill="#131c2e" stroke="${stroke}" stroke-width="2" />
          <text x="${el.x}" y="${el.y + 4}" text-anchor="middle" fill="#f8fafc" font-size="11.5" font-weight="bold">${el.name}</text>
        </g>
      `;
    } else if (el.type === "summer") {
      const stroke = (isConnectSrc || isSelectedEl) ? "#f59e0b" : isHighlighted ? "#10b981" : "#38bdf8";
      const sw = isSelectedEl ? "3.2" : "2.2";
      const inConns = graph.connections.filter(c => c.to === el.id);
      let innerSignsSvg = "";
      if (inConns.length === 0) {
        // Quando o somador ainda não tem linhas conectadas, exibe + e ± nos quadrantes internos
        innerSignsSvg = `
          <text x="${el.x - 9}" y="${el.y + 3.5}" text-anchor="middle" fill="#10b981" font-size="10" font-weight="bold" style="pointer-events:none;">+</text>
          <text x="${el.x}" y="${el.y + 12}" text-anchor="middle" fill="#ef4444" font-size="9.5" font-weight="bold" style="pointer-events:none;">±</text>
        `;
      } else {
        inConns.forEach(c => {
          const p = summerPortMap.get(c.id);
          if (p && p.sx !== undefined) {
            const sCol = c.sign === "-" ? "#ef4444" : "#10b981";
            innerSignsSvg += `<text x="${p.sx}" y="${p.sy + 3.5}" text-anchor="middle" fill="${sCol}" font-size="10.5" font-weight="bold" style="pointer-events:none;">${c.sign}</text>`;
          }
        });
      }
      svgContent += `
        <g ${dragAttr}>
          <circle cx="${el.x}" cy="${el.y}" r="16" fill="#131c2e" stroke="${stroke}" stroke-width="${sw}" />
          <line x1="${el.x - 11}" y1="${el.y - 11}" x2="${el.x + 11}" y2="${el.y + 11}" stroke="rgba(148,163,184,0.22)" stroke-width="1.1" />
          <line x1="${el.x - 11}" y1="${el.y + 11}" x2="${el.x + 11}" y2="${el.y - 11}" stroke="rgba(148,163,184,0.22)" stroke-width="1.1" />
          ${innerSignsSvg}
          <text x="${el.x + 19}" y="${el.y - 14}" text-anchor="start" fill="${isSelectedEl ? '#fbbf24' : '#94a3b8'}" font-size="9.5" font-weight="bold" style="pointer-events:none;">${el.name}</text>
        </g>
      `;
    } else if (el.type === "pickoff") {
      const rPick = (isSelectedEl || isConnectSrc) ? 7 : 5;
      const strokePick = isConnectSrc ? "#38bdf8" : isSelectedEl ? "#ef4444" : "#090d16";
      svgContent += `
        <g ${dragAttr}>
          <circle cx="${el.x}" cy="${el.y}" r="${rPick}" fill="#38bdf8" stroke="${strokePick}" stroke-width="1.5" />
        </g>
      `;
    } else if (el.type === "block") {
      const rat = el.rat || parseRatExpr(el.expr);
      const parts = ratToCompactParts(rat);
      const stroke = (isConnectSrc || isSelectedEl) ? "#f59e0b" : isHighlighted ? "#10b981" : (el.isFeedback || el.dir === "left" ? "#a855f7" : "#38bdf8");
      const caption = el.name && el.name !== parts.num ? `${el.name} ${el.dir === "left" ? "←" : ""}` : (el.dir === "left" ? "←" : "");
      svgContent += `
        <g ${dragAttr}>
          ${drawSvgBlockBox(el.x, el.y, parts.num, parts.den, { width: g.w, height: g.h, stroke, caption })}
        </g>
      `;
    }
  });

  // Desenhar botões clicáveis de sinal (+ / -) nas entradas dos somadores na camada superior (acima do rótulo S1)
  graph.connections.forEach(conn => {
    const toEl = graph.elements.find(e => e.id === conn.to);
    if (!toEl || toEl.type !== "summer") return;
    const endPt = summerPortMap.get(conn.id);
    if (!endPt || endPt.extSignX === undefined) return;
    const signColor = conn.sign === "-" ? "#ef4444" : "#10b981";
    const clickAttr = isInteractive
      ? `class="svg-sign-toggle" onmousedown="event.stopPropagation()" onclick="event.stopPropagation(); toggleConnectionSign('${conn.id}')"`
      : "";
    svgContent += `
      <g ${clickAttr}>
        <title>Clique para alternar o sinal entre + e -</title>
        <circle cx="${endPt.extSignX}" cy="${endPt.extSignY}" r="8.5" fill="#090d16" stroke="${signColor}" stroke-width="1.5" />
        <text x="${endPt.extSignX}" y="${endPt.extSignY + 4}" text-anchor="middle" fill="${signColor}" font-size="12" font-weight="bold" style="pointer-events:none;">${conn.sign}</text>
      </g>
    `;
  });

  if (isInteractive) {
    svgContent += `<g id="svgPenPreviewLayer" style="pointer-events:none;">${renderPenPreviewSvg()}</g>`;
  }

  return svgContent;
}

function findTargetElementAtPoint(pt, excludeId) {
  let bestEl = null;
  let bestDist = Infinity;
  for (const el of builderState.elements) {
    if (el.id === excludeId || el.id === "IN" || el.type === "pickoff") continue;
    const g = getElementGeometry(el);
    if (el.type === "summer") {
      const d = Math.hypot(pt.x - el.x, pt.y - el.y);
      if (d <= 28 && d < bestDist) {
        bestDist = d;
        bestEl = el;
      }
    } else {
      const hw = (g.w || 60) / 2 + 16;
      const hh = (g.h || 40) / 2 + 16;
      if (Math.abs(pt.x - el.x) <= hw && Math.abs(pt.y - el.y) <= hh) {
        const d = Math.hypot(pt.x - el.x, pt.y - el.y);
        if (d < bestDist) {
          bestDist = d;
          bestEl = el;
        }
      }
    }
  }
  return bestEl;
}

function renderPenPreviewSvg() {
  const pd = builderState.penDrag;
  if (!pd || !pd.active) return "";
  if (!pd.hasMoved && !pd.waitingSecondClick) return "";

  const sx = pd.startX;
  const sy = pd.startY;
  let ex = pd.currX;
  let ey = pd.currY;
  let targetHighlightSvg = "";

  const targetEl = pd.targetId ? builderState.elements.find(e => e.id === pd.targetId) : null;
  if (targetEl) {
    const gTo = getElementGeometry(targetEl);
    if (targetEl.type === "summer") {
      const r = 16;
      let angle = Math.PI; // left
      if (sy > targetEl.y + 28 || pd.currY > targetEl.y + 14 || sx > targetEl.x + 20) angle = Math.PI / 2;
      else if (sy < targetEl.y - 28 || pd.currY < targetEl.y - 14) angle = -Math.PI / 2;
      ex = Math.round(targetEl.x + r * Math.cos(angle));
      ey = Math.round(targetEl.y + r * Math.sin(angle));
      targetHighlightSvg = `
        <circle cx="${targetEl.x}" cy="${targetEl.y}" r="21" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4,3" />
        <text x="${targetEl.x}" y="${targetEl.y - 26}" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Soltar em ${targetEl.name}</text>
      `;
    } else if (gTo.inPort) {
      ex = gTo.inPort.x;
      ey = gTo.inPort.y;
      const hw = gTo.w / 2 + 5;
      const hh = gTo.h / 2 + 5;
      targetHighlightSvg = `
        <rect x="${targetEl.x - hw}" y="${targetEl.y - hh}" width="${hw * 2}" height="${hh * 2}" rx="7" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4,3" />
        <text x="${targetEl.x}" y="${targetEl.y - hh - 6}" text-anchor="middle" fill="#10b981" font-size="10.5" font-weight="bold">Soltar em ${targetEl.name}</text>
      `;
    }
  }

  let pathStr = "";
  if (Math.hypot(ex - sx, ey - sy) < 6) {
    ex = sx + 12;
    pathStr = `M ${sx} ${sy} L ${ex} ${ey}`;
  } else if (Math.abs(ey - sy) < 6) {
    pathStr = `M ${sx} ${sy} L ${ex} ${ey}`;
  } else if (pd.sourceType === "wire") {
    if (targetEl && targetEl.type === "summer" && sx > targetEl.x + 15) {
      const loopY = ey >= sy ? Math.max(sy, ey, 295) : Math.min(sy, ey, 60);
      pathStr = `M ${sx} ${sy} L ${sx} ${loopY} L ${ex} ${loopY} L ${ex} ${ey}`;
    } else {
      pathStr = `M ${sx} ${sy} L ${sx} ${ey} L ${ex} ${ey}`;
    }
  } else {
    if (ex >= sx + 14) {
      const midX = Math.round((sx + ex) / 2);
      pathStr = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ey} L ${ex} ${ey}`;
    } else {
      const extX = sx + 18;
      pathStr = `M ${sx} ${sy} L ${extX} ${sy} L ${extX} ${ey} L ${ex} ${ey}`;
    }
  }

  return `
    ${targetHighlightSvg}
    <circle cx="${sx}" cy="${sy}" r="5" fill="#fbbf24" stroke="#090d16" stroke-width="1.5" />
    <path d="${pathStr}" fill="none" stroke="#fbbf24" stroke-width="2.6" stroke-dasharray="6,3" marker-end="url(#arrow-pen)" />
  `;
}

function updatePenPreviewDom() {
  const layer = document.getElementById("svgPenPreviewLayer");
  if (layer) {
    layer.innerHTML = renderPenPreviewSvg();
  }
}

function completePenConnection(pd, targetId) {
  if (!pd || !targetId || pd.fromId === targetId || targetId === "IN") return;
  const fromEl = builderState.elements.find(e => e.id === pd.fromId);
  const toEl = builderState.elements.find(e => e.id === targetId);
  if (!fromEl || !toEl) return;

  const refX = pd.sourceType === "wire" ? pd.startX : fromEl.x;
  const refY = pd.sourceType === "wire" ? pd.startY : fromEl.y;
  const isBack =
    fromEl.isFeedback ||
    fromEl.dir === "left" ||
    toEl.isFeedback ||
    toEl.dir === "left" ||
    (toEl.type === "summer" && refX > toEl.x + 20);

  const defaultSign = (toEl.type === "summer" && isBack) ? "-" : "+";
  let defaultRoute = "auto";
  if (toEl.type === "summer") {
    if (pd.currY < toEl.y - 14 || refY < toEl.y - 32) defaultRoute = "top";
    else if (pd.currY > toEl.y + 14 || refY > toEl.y + 32 || isBack) defaultRoute = "bottom";
  } else if (isBack) {
    defaultRoute = "bottom";
  }

  const tapPt = pd.sourceType === "wire" ? { x: pd.startX, y: pd.startY } : null;
  builderState.selectedType = null;
  builderState.selectedId = null;
  builderState.connectSourceId = null;
  builderState.penDrag = null;
  resetHintBar();
  builderAddConnection(pd.fromId, targetId, defaultSign, defaultRoute, tapPt);
}

function renderBuilderCanvas() {
  const svg = document.getElementById("builderSvg");
  if (!svg) return;
  applySvgZoomAndPan();
  svg.classList.toggle("pen-mode-active", !!builderState.connectMode);
  svg.innerHTML = renderGraphToSvgString(builderState, { interactive: true });
}

// Interação de Mouse no Canvas SVG (Arrastar, Selecionar e Lápis/Caneta de Ligação)
function getSvgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  return pt.matrixTransform(ctm.inverse());
}

function startPenFromWire(evt, connId) {
  if (evt.button !== 0) return;
  evt.stopPropagation();
  const svg = document.getElementById("builderSvg");
  if (!svg) return;
  const pt = getSvgPoint(svg, evt);
  const conn = builderState.connections.find(c => c.id === connId);
  if (!conn) return;

  // Se já estava puxando uma linha esperando o 2º clique e clicou em uma linha que entra num somador/bloco
  if (builderState.penDrag && builderState.penDrag.waitingSecondClick) {
    if (conn.to && conn.to !== builderState.penDrag.fromId) {
      completePenConnection(builderState.penDrag, conn.to);
      return;
    }
  }

  const poly = renderedWirePolylines.get(connId);
  const snap = poly ? closestPointOnPolyline(pt, poly) : { x: pt.x, y: pt.y };

  builderState.penDrag = {
    active: true,
    sourceType: "wire",
    connId: conn.id,
    fromId: conn.from,
    startX: Math.round(snap.x),
    startY: Math.round(snap.y),
    currX: Math.round(snap.x),
    currY: Math.round(snap.y),
    clientStartX: evt.clientX,
    clientStartY: evt.clientY,
    hasMoved: false,
    waitingSecondClick: false,
    targetId: null
  };

  const fromEl = builderState.elements.find(e => e.id === conn.from);
  const toEl = builderState.elements.find(e => e.id === conn.to);
  const hint = document.getElementById("builderHintBar");
  if (hint && fromEl && toEl) {
    hint.innerHTML = `<span style="color:#fcd34d; font-weight:700;">✏️ Puxando linha a partir de (${fromEl.name} → ${toEl.name}): Arraste até o bloco ou somador de destino e solte (sempre termina com seta)!</span>`;
  }
}

function startDragElement(evt, elId) {
  if (evt.button !== 0) return;
  evt.stopPropagation();
  const svg = document.getElementById("builderSvg");
  const pt = getSvgPoint(svg, evt);
  const el = builderState.elements.find(e => e.id === elId);
  if (!el) return;

  // Se já havia uma linha sendo puxada no modo 2 cliques, clicar no elemento de destino conclui a ligação
  if (builderState.penDrag && builderState.penDrag.waitingSecondClick) {
    if (elId !== builderState.penDrag.fromId && elId !== "IN") {
      completePenConnection(builderState.penDrag, elId);
    } else {
      builderState.penDrag = null;
      resetHintBar();
      renderBuilderCanvas();
    }
    return;
  }

  // Se a ferramenta Lápis/Caneta estiver ativa, clicar e arrastar de um bloco/somador/entrada puxa uma linha com seta!
  if (builderState.connectMode) {
    if (elId === "OUT") return;
    const g = getElementGeometry(el);
    const outPt = g.outPort || { x: el.x, y: el.y };
    builderState.penDrag = {
      active: true,
      sourceType: "element",
      connId: null,
      fromId: el.id,
      startX: Math.round(outPt.x),
      startY: Math.round(outPt.y),
      currX: Math.round(pt.x),
      currY: Math.round(pt.y),
      clientStartX: evt.clientX,
      clientStartY: evt.clientY,
      hasMoved: false,
      waitingSecondClick: false,
      targetId: null
    };
    const hint = document.getElementById("builderHintBar");
    if (hint) {
      hint.innerHTML = `<span style="color:#fcd34d; font-weight:700;">✏️ Puxando linha de <b>${el.name}</b>: Arraste até o bloco, somador ou saída C(s) e solte!</span>`;
    }
    return;
  }

  builderHistory.dragStartSnapshot = getBuilderSnapshot();
  builderHistory.dragStartPos = { x: el.x, y: el.y };
  builderHistory.dragStartClient = { x: evt.clientX, y: evt.clientY };
  builderHistory.hasMoved = false;
  builderState.draggingId = elId;
  builderState.dragOffsetX = pt.x - el.x;
  builderState.dragOffsetY = pt.y - el.y;
}

function handleWireClick(evt, connId) {
  evt.stopPropagation();
}

function handleElementClick(evt, elId) {
  evt.stopPropagation();
  if (builderState.connectMode) return;
  if (elId !== "IN" && elId !== "OUT") {
    selectBuilderItem("element", elId);
    refreshBuilderUI();
  }
}

function handleElementDblClick(evt, elId) {
  evt.stopPropagation();
  const el = builderState.elements.find(e => e.id === elId);
  if (!el || el.type !== "block") return;
  const newExpr = prompt(`Digite o valor ou a Função de Transferência do bloco ${el.name}:\nExemplos: 10/(s+2), 5, s+1, 1/s, G_1`, el.expr);
  if (newExpr !== null && newExpr.trim() !== "" && newExpr.trim() !== el.expr) {
    pushBuilderUndoState();
    el.expr = newExpr.trim();
    try {
      el.rat = parseRatExpr(el.expr);
    } catch (e) {
      console.warn("Erro ao processar expressão:", e);
    }
    selectBuilderItem("element", elId);
    refreshBuilderUI();
  }
}

function resetHintBar() {
  const hint = document.getElementById("builderHintBar");
  if (!hint) return;
  if (builderState.connectMode) {
    hint.innerHTML = `<span style="color:#fde68a;">✏️ <b>Ferramenta Lápis / Caneta ATIVA:</b> Clique em <b>qualquer ponto de uma linha</b> ou em um <b>bloco/somador</b> e <b>arraste até o bloco de destino</b> (puxa a linha e sempre termina com seta).</span>`;
  } else {
    hint.innerHTML = `<span>💡 <b>Inserir Valores no Circuito:</b> Dê <b>duplo clique no bloco</b> (ou selecione-o para editar na barra amarela acima) • Suporta ganhos (ex: <code>5</code>), frações polinomiais <code>10/(s+2)</code>, <code>1/s</code> ou variáveis • <b>📋 Lista de Blocos</b> exibe tabela completa.</span>`;
  }
}

// ============================================================================
// 6. MOTOR DE REDUÇÃO TOPOLÓGICA PASSO A PASSO + REGRA DE MASON PARA O CONSTRUTOR
// ============================================================================

function cloneGraphForReduction(state) {
  const elements = state.elements.map(e => ({
    ...e,
    rat: e.type === "block" ? parseRatExpr(e.expr) : ratOne()
  }));
  const connections = state.connections.map(c => ({ ...c }));

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
  const cleanConnections = connections.filter(c => c.from !== c.to && cleanElements.some(e => e.id === c.from) && cleanElements.some(e => e.id === c.to));

  return { elements: cleanElements, connections: cleanConnections };
}

// Absorver somadores redundantes de 1 única entrada
function cleanPassThroughSummers(G) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of [...G.elements]) {
      if (s.type !== "summer") continue;
      const inEdges = G.connections.filter(c => c.to === s.id);
      const outEdges = G.connections.filter(c => c.from === s.id);
      if (inEdges.length === 1 && inEdges[0].from !== s.id) {
        const inE = inEdges[0];
        if (inE.sign === "+") {
          outEdges.forEach(oe => { oe.from = inE.from; });
          G.connections = G.connections.filter(c => c.id !== inE.id);
          G.elements = G.elements.filter(e => e.id !== s.id);
          changed = true;
          break;
        } else if (inE.sign === "-") {
          const canPropagate = outEdges.every(oe => {
            const tgt = G.elements.find(e => e.id === oe.to);
            return tgt && (tgt.type === "summer" || (tgt.type === "block" && G.connections.filter(x => x.to === tgt.id).length === 1));
          });
          if (canPropagate && outEdges.length > 0) {
            outEdges.forEach(oe => {
              const tgt = G.elements.find(e => e.id === oe.to);
              oe.from = inE.from;
              if (tgt.type === "summer") {
                oe.sign = oe.sign === "+" ? "-" : "+";
              } else if (tgt.type === "block") {
                tgt.rat = ratScale(tgt.rat, -1);
              }
            });
            G.connections = G.connections.filter(c => c.id !== inE.id);
            G.elements = G.elements.filter(e => e.id !== s.id);
            changed = true;
            break;
          }
        }
      }
    }
  }
}

function tryReduceStep(G, stepNum) {
  cleanPassThroughSummers(G);

  // REGRA 0: Unificação de Somadores em Série quando suas realimentações vêm da mesma origem
  for (const s1 of G.elements) {
    if (s1.type !== "summer") continue;
    const out1 = G.connections.filter(c => c.from === s1.id);
    if (out1.length !== 1) continue;
    const s2 = G.elements.find(e => e.id === out1[0].to);
    if (!s2 || s2.type !== "summer" || s2.id === s1.id) continue;

    // Verificar se vale unificar imediatamente (ex: múltiplos ramos paralelos de realimentação que chegam em somadores consecutivos)
    const getFeedbackOrigins = (sumId) => {
      return G.connections
        .filter(c => c.to === sumId)
        .map(c => {
          const pred = G.elements.find(e => e.id === c.from);
          if (pred && pred.type === "block") {
            const pIn = G.connections.filter(x => x.to === pred.id);
            if (pIn.length === 1) return pIn[0].from;
          }
          return c.from;
        });
    };
    const orig1 = getFeedbackOrigins(s1.id);
    const orig2 = getFeedbackOrigins(s2.id);
    const shareOrigin = orig1.some(o => orig2.includes(o));

    if (shareOrigin) {
      // Unificar toda a cadeia de somadores consecutivos que compartilham a origem
      const mergedNames = [s1.name];
      let currS = s1;
      while (currS) {
        const outC = G.connections.filter(c => c.from === currS.id);
        if (outC.length !== 1) break;
        const nextS = G.elements.find(e => e.id === outC[0].to);
        if (!nextS || nextS.type !== "summer" || nextS.id === currS.id) break;

        const linkSign = outC[0].sign === "-" ? -1 : 1;
        G.connections.forEach(c => {
          if (c.to === currS.id) {
            c.to = nextS.id;
            if (linkSign === -1) c.sign = c.sign === "+" ? "-" : "+";
          }
        });
        G.connections = G.connections.filter(c => c.id !== outC[0].id);
        G.elements = G.elements.filter(e => e.id !== currS.id);
        mergedNames.push(nextS.name);
        currS = nextS;
      }

      return {
        title: `Unificação de Pontos de Soma Adjacentes: ${mergedNames.join(", ")}`,
        desc: `Os pontos de soma consecutivos (<b>${mergedNames.join(" → ")}</b>) não possuem blocos nem ramificações entre si e recebem derivações da mesma origem, sendo unificados em um único somador <b>${currS.name}</b>:`,
        latex: `\\text{Somadores } (${mergedNames.join(", ")}) &\\implies \\text{Unificados no somador } ${currS.name}`,
        summaryLatex: `\\text{Etapa ${stepNum} (Unificação de Somadores): } (${mergedNames.join(", ")}) &\\implies ${currS.name}`,
        highlightIds: [currS.id]
      };
    }
  }

  // REGRA 1: Formato em Cascata (em Série) entre dois blocos B1 -> B2
  for (const b1 of G.elements) {
    if (b1.type !== "block") continue;
    const out1 = G.connections.filter(c => c.from === b1.id);
    if (out1.length !== 1) continue;
    const b2 = G.elements.find(e => e.id === out1[0].to);
    if (!b2 || b2.type !== "block" || b2.id === b1.id) continue;
    const in2 = G.connections.filter(c => c.to === b2.id);
    if (in2.length !== 1) continue;

    const newRat = ratMul(b1.rat, b2.rat);
    const newId = `B_eq${stepNum}`;
    const newName = `G_{\\text{eq}${stepNum}}`;
    const newBlock = {
      id: newId,
      type: "block",
      name: `Geq${stepNum}`,
      expr: polyToCompact(newRat.num),
      rat: newRat,
      x: Math.round((b1.x + b2.x) / 2),
      y: Math.round((b1.y + b2.y) / 2),
      dir: b1.dir,
      isFeedback: b1.isFeedback && b2.isFeedback
    };

    G.connections.forEach(c => {
      if (c.to === b1.id) c.to = newId;
      if (c.from === b2.id) c.from = newId;
    });
    G.connections = G.connections.filter(c => c.id !== out1[0].id);
    G.elements = G.elements.filter(e => e.id !== b1.id && e.id !== b2.id);
    G.elements.push(newBlock);

    return {
      title: `Formato em Cascata / Série: ${b1.name} e ${b2.name}`,
      desc: `Pelo formato em cascata, os blocos <b>${b1.name}</b> ($${ratToLatex(b1.rat)}$) e <b>${b2.name}</b> ($${ratToLatex(b2.rat)}$) estão em série sem ramificações entre eles. Multiplicam-se suas funções de transferência passo a passo:`,
      latex: explainRatMulLatex(`${newName}(s)`, b1.rat, b2.rat),
      summaryLatex: `\\text{Etapa ${stepNum} (Cascata } ${b1.name} \\cdot ${b2.name} \\text{): } ${newName}(s) &= \\left(${ratToLatex(b1.rat)}\\right) \\cdot \\left(${ratToLatex(b2.rat)}\\right) = ${ratToLatex(newRat)}`,
      highlightIds: [newId]
    };
  }

  // REGRA 2: Formato em Paralelo (dois ou mais ramos da mesma origem chegando no mesmo somador S)
  for (const s of G.elements) {
    if (s.type !== "summer") continue;
    const inEdges = G.connections.filter(c => c.to === s.id);
    if (inEdges.length < 2) continue;

    const branchesBySource = new Map();
    for (const edge of inEdges) {
      const pred = G.elements.find(e => e.id === edge.from);
      if (!pred) continue;
      let sourceId = pred.id;
      let blockEl = null;
      let baseRat = ratOne();

      if (pred.type === "block") {
        const predIn = G.connections.filter(c => c.to === pred.id);
        const predOut = G.connections.filter(c => c.from === pred.id);
        if (predIn.length === 1 && predOut.length === 1) {
          sourceId = predIn[0].from;
          blockEl = pred;
          baseRat = pred.rat;
        }
      }

      if (sourceId === s.id) continue;
      const signedRat = edge.sign === "-" ? ratScale(baseRat, -1) : baseRat;
      if (!branchesBySource.has(sourceId)) branchesBySource.set(sourceId, []);
      branchesBySource.get(sourceId).push({ sourceId, blockEl, edge, baseRat, signedRat, sign: edge.sign });
    }

    for (const [srcId, list] of branchesBySource.entries()) {
      if (list.length >= 2) {
        const srcEl = G.elements.find(e => e.id === srcId);
        // Verificar se é uma associação em paralelo de malhas de realimentação (-H1 + H2 - H3 = -(H1 - H2 + H3))
        const isFeedbackGroup = list.some(b => b.blockEl && (b.blockEl.isFeedback || b.blockEl.dir === "left")) || (srcEl && srcEl.x > s.x + 20);
        const factorMinus = isFeedbackGroup && list.some(b => b.sign === "-");

        let sumRat = ratZero();
        const termsLatex = [];
        const branchNames = [];

        list.forEach((b, idx) => {
          const bName = b.blockEl ? b.blockEl.name : "1";
          branchNames.push(bName);
          const effectiveSign = factorMinus ? (b.sign === "-" ? "+" : "-") : b.sign;
          const termRat = effectiveSign === "-" ? ratScale(b.baseRat, -1) : b.baseRat;
          sumRat = ratAdd(sumRat, termRat);
          const signPrefix = idx === 0
            ? (effectiveSign === "-" ? "-" : "")
            : ` ${effectiveSign} `;
          termsLatex.push(`${signPrefix}\\left(${ratToLatex(b.baseRat)}\\right)`);
        });

        const newId = `B_par${stepNum}`;
        const newName = `G_{\\text{par}${stepNum}}`;
        const avgX = Math.round(list.reduce((acc, b) => acc + (b.blockEl ? b.blockEl.x : (srcEl.x + s.x) / 2), 0) / list.length);
        const avgY = Math.round(list.reduce((acc, b) => acc + (b.blockEl ? b.blockEl.y : s.y), 0) / list.length);

        const newBlock = {
          id: newId,
          type: "block",
          name: `Gpar${stepNum}`,
          expr: polyToCompact(sumRat.num),
          rat: sumRat,
          x: avgX,
          y: avgY,
          dir: isFeedbackGroup ? "left" : "right",
          isFeedback: isFeedbackGroup
        };

        const removeEdgeIds = new Set();
        const removeElIds = new Set();
        list.forEach(b => {
          removeEdgeIds.add(b.edge.id);
          if (b.blockEl) {
            removeElIds.add(b.blockEl.id);
            G.connections.filter(c => c.to === b.blockEl.id).forEach(c => removeEdgeIds.add(c.id));
          }
        });

        G.connections = G.connections.filter(c => !removeEdgeIds.has(c.id));
        G.elements = G.elements.filter(e => !removeElIds.has(e.id));
        G.elements.push(newBlock);
        G.connections.push(
          { id: `C_parA_${stepNum}`, from: srcId, to: newId, sign: "+", route: isFeedbackGroup ? "bottom" : "auto" },
          { id: `C_parB_${stepNum}`, from: newId, to: s.id, sign: factorMinus ? "-" : "+", route: isFeedbackGroup ? "bottom" : "auto" }
        );

        cleanPassThroughSummers(G);

        let detailedParLatex = `${newName}(s) &= ${termsLatex.join("")} = ${ratToLatex(sumRat)}`;
        if (list.length === 2 && !factorMinus && list[0].sign === "+") {
          detailedParLatex = explainRatAddSubLatex(`${newName}(s)`, list[0].baseRat, list[1].baseRat, list[1].sign);
        }

        return {
          title: `Formato em Paralelo: ${branchNames.join(", ")}`,
          desc: `Os ramos paralelos (<b>${branchNames.join(", ")}</b>) partem do mesmo ponto (<b>${srcEl ? srcEl.name : srcId}</b>) e convergem no somador <b>${s.name}</b>${factorMinus ? " (colocando o sinal negativo $-$ em evidência no somador)" : ""}, somando-se algebricamente pelo MMC:`,
          latex: detailedParLatex,
          summaryLatex: `\\text{Etapa ${stepNum} (Paralelo ${branchNames.join(", ")}): } ${newName}(s) &= ${termsLatex.join("")} = ${ratToLatex(sumRat)}`,
          highlightIds: [newId]
        };
      }
    }
  }

  // REGRA 3: Formato em Malha Fechada (com Desmembramento Prévio de Somador de >= 3 Entradas)
  for (const s of G.elements) {
    if (s.type !== "summer") continue;
    const outS = G.connections.filter(c => c.from === s.id);
    if (outS.length !== 1) continue;
    const fwdEl = G.elements.find(e => e.id === outS[0].to);
    if (!fwdEl || fwdEl.type !== "block") continue;
    const inFwd = G.connections.filter(c => c.to === fwdEl.id);
    if (inFwd.length !== 1) continue;

    // Verificar se da saída de fwdEl existe realimentação para s (direta ou via 1 bloco H)
    const inS = G.connections.filter(c => c.to === s.id);
    let fbConn = null;
    let fbBlock = null;

    for (const c of inS) {
      if (c.from === fwdEl.id) {
        fbConn = c;
        break;
      }
      const candH = G.elements.find(e => e.id === c.from);
      if (candH && candH.type === "block" && candH.id !== fwdEl.id) {
        const inH = G.connections.filter(x => x.to === candH.id);
        const outH = G.connections.filter(x => x.from === candH.id);
        if (inH.length === 1 && outH.length === 1 && inH[0].from === fwdEl.id) {
          fbConn = c;
          fbBlock = candH;
          break;
        }
      }
    }

    if (fbConn) {
      // Se o somador possui 3 ou mais entradas, primeiro desmembramos o somador em 2 somadores em série!
      if (inS.length > 2) {
        const preId = `S_pre${stepNum}`;
        const preName = `${s.name}a`;
        const preSummer = {
          id: preId,
          type: "summer",
          name: preName,
          expr: "1",
          x: Math.max(85, s.x - 65),
          y: s.y,
          dir: "right"
        };
        G.elements.push(preSummer);

        // Transferir todas as entradas que NÃO são a realimentação interna fbConn para preSummer
        inS.forEach(c => {
          if (c.id !== fbConn.id) {
            c.to = preId;
          }
        });
        G.connections.push({
          id: `C_split_${stepNum}`,
          from: preId,
          to: s.id,
          sign: "+",
          route: "auto"
        });

        const fbLabel = fbBlock ? fbBlock.name : "1";
        return {
          title: `Desmembramento do Ponto de Soma ${s.name} em Série`,
          desc: `O somador <b>${s.name}</b> possui ${inS.length} entradas. Desmembramos <b>${s.name}</b> em dois somadores consecutivos (<b>${preName} → ${s.name}</b>) para isolar a malha fechada interna com realimentação <b>${fbLabel}</b>:`,
          latex: `E_{${s.name}}(s) &= E_{${preName}}(s) ${fbConn.sign} (${fbLabel}) \\cdot X_{${fwdEl.name}}(s)`,
          summaryLatex: `\\text{Etapa ${stepNum} (Desmembramento de ${s.name}): } E_{${s.name}}(s) &= E_{${preName}}(s) ${fbConn.sign} (${fbLabel}) \\cdot X_{${fwdEl.name}}(s)`,
          highlightIds: [preId, s.id]
        };
      }

      const G_rat = fwdEl.rat;
      const H_rat = fbBlock ? fbBlock.rat : ratOne();
      const loopSign = fbConn.sign; // "-" => realimentação negativa, "+" => positiva
      const closedRat = ratFeedback(G_rat, H_rat, loopSign);
      const denSignStr = loopSign === "-" ? "+" : "-";

      if (fbBlock) {
        G.connections = G.connections.filter(c => c.to !== fbBlock.id && c.from !== fbBlock.id);
        G.elements = G.elements.filter(e => e.id !== fbBlock.id);
      } else {
        G.connections = G.connections.filter(c => c.id !== fbConn.id);
      }

      const oldFwdName = fwdEl.name;
      const fbName = fbBlock ? fbBlock.name : "1";
      fwdEl.rat = closedRat;
      fwdEl.name = `Gmf${stepNum}`;
      fwdEl.expr = polyToCompact(closedRat.num);

      cleanPassThroughSummers(G);

      const mfStepLatex = explainRatFeedbackLatex(`G_{\\text{mf}${stepNum}}(s)`, G_rat, H_rat, loopSign);

      return {
        title: `Formato em Malha Fechada (MF): ${oldFwdName} com Realimentação ${fbName}`,
        desc: `Pela fórmula canônica de malha fechada, elimina-se a realimentação (${loopSign === "-" ? "negativa $\\implies +$ no denominador" : "positiva $\\implies -$ no denominador"}) em torno de <b>${oldFwdName}</b> ($${ratToLatex(G_rat)}$) com ganho de retorno <b>${fbName}</b> ($${ratToLatex(H_rat)}$) no somador <b>${s.name}</b>, desenvolvendo o MMC e simplificando passo a passo:`,
        latex: mfStepLatex,
        summaryLatex: `\\text{Etapa ${stepNum} (Malha Fechada ${oldFwdName} / ${fbName}): } G_{\\text{mf}${stepNum}}(s) &= \\frac{${ratToLatex(G_rat)}}{1 ${denSignStr} \\left(${ratToLatex(G_rat)}\\right)\\left(${ratToLatex(H_rat)}\\right)} = ${ratToLatex(closedRat)}`,
        fullFinalDerivationLatex: mfStepLatex,
        highlightIds: [fwdEl.id]
      };
    }
  }

  // REGRA 4: Fusão Geral de Somadores Consecutivos (S1 -> S2)
  for (const s1 of G.elements) {
    if (s1.type !== "summer") continue;
    const out1 = G.connections.filter(c => c.from === s1.id);
    if (out1.length !== 1) continue;
    const s2 = G.elements.find(e => e.id === out1[0].to);
    if (!s2 || s2.type !== "summer" || s2.id === s1.id) continue;

    const linkSign = out1[0].sign === "-" ? -1 : 1;
    G.connections.forEach(c => {
      if (c.to === s1.id) {
        c.to = s2.id;
        if (linkSign === -1) c.sign = c.sign === "+" ? "-" : "+";
      }
    });
    G.connections = G.connections.filter(c => c.id !== out1[0].id);
    G.elements = G.elements.filter(e => e.id !== s1.id);

    return {
      title: `Unificação de Somadores em Série: ${s1.name} e ${s2.name}`,
      desc: `O somador <b>${s1.name}</b> alimenta diretamente o somador <b>${s2.name}</b> sem blocos entre eles, sendo unificados em <b>${s2.name}</b>:`,
      latex: `\\text{Entradas de } ${s1.name} &\\implies \\text{somadas diretamente em } ${s2.name}`,
      summaryLatex: `\\text{Etapa ${stepNum} (Fusão } ${s1.name} \\to ${s2.name} \\text{): } \\text{Unificados em } ${s2.name}`,
      highlightIds: [s2.id]
    };
  }

  // REGRA 5a: Movendo Ponto de Ramificação de Antes para Depois de um Bloco G(s)
  for (const b1 of G.elements) {
    if (b1.type !== "block" && b1.type !== "summer") continue;
    const out1 = G.connections.filter(c => c.from === b1.id);
    if (out1.length < 2) continue;

    // Procurar um bloco seguinte b2 no caminho principal que receba apenas de b1
    const mainEdge = out1.find(c => {
      const target = G.elements.find(e => e.id === c.to);
      return target && target.type === "block" && !target.isFeedback && G.connections.filter(x => x.to === target.id).length === 1;
    });
    if (!mainEdge) continue;

    const b2 = G.elements.find(e => e.id === mainEdge.to);
    const branchEdge = out1.find(c => c.id !== mainEdge.id);
    if (!b2 || !branchEdge) continue;

    const branchTarget = G.elements.find(e => e.id === branchEdge.to);
    if (!branchTarget) continue;

    // Mover branchEdge de antes de b2 (saída de b1) para depois de b2 (saída de b2), multiplicando o ramo por 1 / b2.rat
    branchEdge.from = b2.id;

    if (branchTarget.type === "block" && G.connections.filter(c => c.to === branchTarget.id).length === 1) {
      const oldRat = branchTarget.rat;
      const oldBranchName = branchTarget.name;
      branchTarget.rat = ratDiv(oldRat, b2.rat);
      branchTarget.name = `${oldBranchName}/${b2.name}`;
      return {
        title: `Movendo Ponto de Ramificação de Antes para Depois de ${b2.name}`,
        desc: `Pela regra de mover ponto de ramificação de antes para depois de um bloco, desloca-se a ramificação de <b>${oldBranchName}</b> para depois de <b>${b2.name}</b>, dividindo o ganho do ramo por $${b2.name}(s)$ (multiplicando pelo inverso):`,
        latex: explainRatDivLatex(`H_{\\text{deslocado}}(s)`, oldRat, b2.rat),
        summaryLatex: `\\text{Etapa ${stepNum} (Ramificação após ${b2.name}): } H_{\\text{deslocado}}(s) &= \\frac{${ratToLatex(oldRat)}}{${ratToLatex(b2.rat)}} = ${ratToLatex(branchTarget.rat)}`,
        highlightIds: [branchTarget.id, b2.id]
      };
    } else {
      const compRat = ratDiv(ratOne(), b2.rat);
      const compId = `B_comp${stepNum}`;
      const compBlock = {
        id: compId,
        type: "block",
        name: `1/${b2.name}`,
        expr: polyToCompact(compRat.num),
        rat: compRat,
        x: Math.round((b2.x + branchTarget.x) / 2),
        y: Math.min(325, Math.max(b2.y, branchTarget.y) + 55),
        dir: branchTarget.x < b2.x ? "left" : "right",
        isFeedback: branchTarget.x < b2.x
      };
      G.elements.push(compBlock);
      branchEdge.to = compId;
      G.connections.push({
        id: `C_comp_${stepNum}`,
        from: compId,
        to: branchTarget.id,
        sign: branchEdge.sign,
        route: branchEdge.route
      });
      branchEdge.sign = "+";
      return {
        title: `Movendo Ponto de Ramificação de Antes para Depois de ${b2.name}`,
        desc: `Move-se o ponto de ramificação de antes para depois do bloco <b>${b2.name}</b> inserindo o ganho inverso $\\frac{1}{${b2.name}(s)}$ no ramo deslocado:`,
        latex: explainRatDivLatex(`G_{\\text{comp}}(s)`, ratOne(), b2.rat),
        summaryLatex: `\\text{Etapa ${stepNum} (Ramificação após ${b2.name}): } G_{\\text{comp}}(s) &= \\frac{1}{${ratToLatex(b2.rat)}} = ${ratToLatex(compRat)}`,
        highlightIds: [compId]
      };
    }
  }

  // REGRA 6a: Movendo Bloco de Antes para Depois de um Ponto de Soma
  for (const s of G.elements) {
    if (s.type !== "summer") continue;
    const outS = G.connections.filter(c => c.from === s.id);
    if (outS.length !== 1) continue;
    const nextEl = G.elements.find(e => e.id === outS[0].to);
    if (!nextEl || nextEl.type !== "block") continue;

    const inS = G.connections.filter(c => c.to === s.id);
    const blkEdge = inS.find(c => {
      const src = G.elements.find(e => e.id === c.from);
      return src && src.type === "block" && G.connections.filter(x => x.from === src.id).length === 1;
    });
    if (!blkEdge) continue;
    const prevBlk = G.elements.find(e => e.id === blkEdge.from);
    const prevIn = G.connections.filter(c => c.to === prevBlk.id);
    if (prevIn.length !== 1) continue;

    const prevBlkOldName = prevBlk.name;
    const nextElOldName = nextEl.name;
    const otherEdges = inS.filter(c => c.id !== blkEdge.id);
    otherEdges.forEach((oe, idx) => {
      const src = G.elements.find(e => e.id === oe.from);
      if (src && src.type === "block" && G.connections.filter(x => x.from === src.id).length === 1) {
        src.rat = ratDiv(src.rat, prevBlk.rat);
        src.name = `${src.name}/${prevBlkOldName}`;
      } else {
        const compId = `B_scomp_${stepNum}_${idx}`;
        const compRat = ratDiv(ratOne(), prevBlk.rat);
        G.elements.push({
          id: compId,
          type: "block",
          name: `1/${prevBlkOldName}`,
          expr: "1",
          rat: compRat,
          x: s.x,
          y: Math.min(330, s.y + 70),
          dir: "left",
          isFeedback: true
        });
        const oldTo = oe.to;
        const oldSign = oe.sign;
        oe.to = compId;
        oe.sign = "+";
        G.connections.push({ id: `C_sc_${stepNum}_${idx}`, from: compId, to: oldTo, sign: oldSign, route: "bottom" });
      }
    });

    prevIn[0].to = s.id;
    prevIn[0].sign = blkEdge.sign;
    G.connections = G.connections.filter(c => c.id !== blkEdge.id);
    nextEl.rat = ratMul(prevBlk.rat, nextEl.rat);
    nextEl.name = `${prevBlkOldName}·${nextElOldName}`;
    G.elements = G.elements.filter(e => e.id !== prevBlk.id);
    cleanPassThroughSummers(G);

    return {
      title: `Movendo Bloco ${prevBlkOldName} de Antes para Depois do Somador ${s.name}`,
      desc: `Pela regra de mover bloco de antes para depois do ponto de soma, desloca-se <b>${prevBlkOldName}</b> para a direita do somador <b>${s.name}</b> (multiplicando em cascata com <b>${nextElOldName}</b>) e divide-se o outro ramo do somador por <b>${prevBlkOldName}</b>:`,
      latex: `C(s) &= \\left[R(s) \\mp \\frac{X(s)}{${prevBlkOldName}(s)}\\right] ${prevBlkOldName}(s) \\implies G_{\\text{série}}(s) = ${ratToLatex(nextEl.rat)}`,
      highlightIds: [nextEl.id]
    };
  }

  // REGRA 6b: Movendo Bloco de Depois para Antes de um Ponto de Soma
  for (const s of G.elements) {
    if (s.type !== "summer") continue;
    const outS = G.connections.filter(c => c.from === s.id);
    if (outS.length !== 1) continue;
    const nextEl = G.elements.find(e => e.id === outS[0].to);
    if (!nextEl || nextEl.type !== "block") continue;
    const inNext = G.connections.filter(c => c.to === nextEl.id);
    const outNext = G.connections.filter(c => c.from === nextEl.id);
    if (inNext.length !== 1 || outNext.length === 0) continue;

    const inS = G.connections.filter(c => c.to === s.id);
    if (inS.length < 2) continue;

    const nextName = nextEl.name;
    const nextRat = nextEl.rat;
    inS.forEach((ie, idx) => {
      const src = G.elements.find(e => e.id === ie.from);
      if (src && src.type === "block" && G.connections.filter(x => x.from === src.id).length === 1) {
        src.rat = ratMul(src.rat, nextRat);
        src.name = `${src.name}·${nextName}`;
      } else {
        const compId = `B_spre_${stepNum}_${idx}`;
        G.elements.push({
          id: compId,
          type: "block",
          name: nextName,
          expr: polyToCompact(nextRat.num),
          rat: nextRat,
          x: Math.max(85, s.x - 60),
          y: s.y + (idx === 0 ? 0 : 60),
          dir: ie.sign === "-" ? "left" : "right",
          isFeedback: ie.sign === "-"
        });
        const oldTo = ie.to;
        const oldSign = ie.sign;
        ie.to = compId;
        ie.sign = "+";
        G.connections.push({ id: `C_sp_${stepNum}_${idx}`, from: compId, to: oldTo, sign: oldSign, route: "auto" });
      }
    });

    outNext.forEach(oe => { oe.from = s.id; });
    G.connections = G.connections.filter(c => c.id !== outS[0].id);
    G.elements = G.elements.filter(e => e.id !== nextEl.id);
    cleanPassThroughSummers(G);

    return {
      title: `Movendo Bloco ${nextName} de Depois para Antes do Somador ${s.name}`,
      desc: `Pela propriedade distributiva, desloca-se <b>${nextName}</b> de depois para antes do ponto de soma <b>${s.name}</b>, multiplicando cada entrada de <b>${s.name}</b> por <b>${nextName}</b>:`,
      latex: `C(s) &= [R(s) \\mp X(s)] \\cdot ${nextName}(s) = R(s)${nextName}(s) \\mp X(s)${nextName}(s)`,
      highlightIds: [s.id]
    };
  }

  return null;
}

// Cálculo geral por Regra de Mason (Caminhos Diretos, Laços e Determinante Δ)
function computeMasonAnalysis(state) {
  const G = cloneGraphForReduction(state);
  const nodes = G.elements.map(e => e.id);

  // Construir grafo de fluxo de sinal onde cada aresta u -> v tem ganho racional
  // Se um nó u é um bloco com ganho B, o ganho da aresta que entra em u (ou sai de u) incorpora B.
  // Convenção: sinal de cada nó = saída daquele elemento.
  // Então uma conexão (u -> v, sign) multiplica por (sign) * (v.type === 'block' ? v.rat : 1).
  const adj = new Map();
  nodes.forEach(id => adj.set(id, []));
  G.connections.forEach(c => {
    const toEl = G.elements.find(e => e.id === c.to);
    if (!toEl) return;
    let gain = toEl.type === "block" ? toEl.rat : ratOne();
    if (c.sign === "-") gain = ratScale(gain, -1);
    adj.get(c.from).push({ to: c.to, gain, connId: c.id });
  });

  // 1. Encontrar todos os caminhos simples de IN até OUT
  const forwardPaths = [];
  function dfsPaths(curr, visited, pathNodes, accGain) {
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
  const loops = [];
  const seenLoopSigs = new Set();

  nodes.forEach(startNode => {
    function dfsCycle(curr, visited, pathNodes, accGain) {
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

  function setsDisjoint(arrA, arrB) {
    return !arrA.some(x => arrB.includes(x));
  }

  // Calcular Δ = 1 - Σ L_i + Σ (L_i L_j disjuntos) - Σ (L_i L_j L_k disjuntos) ...
  function calcDeterminant(activeLoops) {
    let delta = ratOne();
    const m = activeLoops.length;
    // Subconjuntos de laços mutuamente disjuntos
    function backtrack(startIdx, chosenNodes, prodGain, depth) {
      for (let i = startIdx; i < m; i++) {
        const lp = activeLoops[i];
        if (setsDisjoint(chosenNodes, lp.nodes)) {
          const newGain = ratMul(prodGain, lp.gain);
          const signedTerm = (depth % 2 === 1) ? ratScale(newGain, -1) : newGain;
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
  const cofactors = [];

  forwardPaths.forEach(p => {
    const nonTouchingLoops = loops.filter(lp => setsDisjoint(p.nodes, lp.nodes));
    const dk = calcDeterminant(nonTouchingLoops);
    cofactors.push(dk);
    numSum = ratAdd(numSum, ratMul(p.gain, dk));
  });

  const totalT = ratDiv(numSum, delta);
  return { forwardPaths, loops, delta, cofactors, totalT, elements: G.elements };
}

function buildDiagramNodeEquations(state) {
  const G = cloneGraphForReduction(state);
  const sigName = (el) => {
    if (!el) return "0";
    if (el.id === "IN") return "R(s)";
    if (el.id === "OUT") return "C(s)";
    if (el.type === "summer") return `E_{${el.name}}(s)`;
    return `X_{${el.name}}(s)`;
  };

  // Se um bloco alimenta diretamente OUT, seu sinal de saída já é C(s)
  const outEdge = G.connections.find(c => c.to === "OUT");
  const outSourceId = outEdge ? outEdge.from : null;
  const nodeSig = (id) => {
    if (id === outSourceId) return "C(s)";
    const el = G.elements.find(e => e.id === id);
    return sigName(el);
  };

  const eqsLatex = [];
  const eqsHtml = [];
  let eqIdx = 1;

  // Equações dos pontos de soma e blocos ([1], [2], ...)
  G.elements.forEach(el => {
    if (el.id === "IN" || el.id === "OUT") return;
    const lhs = nodeSig(el.id);
    if (el.type === "summer") {
      const inConns = G.connections.filter(c => c.to === el.id);
      if (inConns.length === 0) return;
      const rhsTerms = inConns.map((c, idx) => {
        const s = c.sign === "-" ? "-" : (idx === 0 ? "" : "+");
        return `${s} ${nodeSig(c.from)}`.trim();
      }).join(" ");
      eqsLatex.push(`${lhs} &= ${rhsTerms} \\qquad [${eqIdx}]`);
      eqsHtml.push(`<li><b>Equação $[${eqIdx}]$ (Ponto de Soma ${el.name}):</b> $${lhs} = ${rhsTerms}$</li>`);
      eqIdx++;
    } else if (el.type === "block") {
      const inConn = G.connections.find(c => c.to === el.id);
      if (!inConn) return;
      const inSig = nodeSig(inConn.from);
      const gainLatex = ratToLatex(el.rat);
      eqsLatex.push(`${lhs} &= \\left(${gainLatex}\\right) \\cdot ${inSig} \\qquad [${eqIdx}]`);
      eqsHtml.push(`<li><b>Equação $[${eqIdx}]$ (Bloco ${el.name}):</b> $${lhs} = \\left(${gainLatex}\\right) \\cdot ${inSig}$</li>`);
      eqIdx++;
    }
  });

  return { eqsLatex, eqsHtml };
}

function executarReducaoConstrutor() {
  const outDiv = document.getElementById("builderReductionOutput");
  if (!outDiv) return;
  outDiv.innerHTML = "";

  const analysis = computeMasonAnalysis(builderState);
  if (analysis.forwardPaths.length === 0) {
    outDiv.innerHTML = `
      <div class="step-box" style="border-left-color: var(--danger);">
        <div class="step-title" style="color: var(--danger);">Atenção: Nenhum Caminho Conectado entre R(s) e C(s)</div>
        <div class="step-content">Verifique se há ligações contínuas partindo da entrada <b>R(s)</b> até a saída <b>C(s)</b> no seu diagrama.</div>
      </div>
    `;
    return;
  }

  const nodeEqs = buildDiagramNodeEquations(builderState);
  const G = cloneGraphForReduction(builderState);
  builderReductionStages = [];

  // Etapa 0: Diagrama Original do Usuário
  builderReductionStages.push({
    shortLabel: "0. Original",
    caption: "Diagrama Original Construído pelo Usuário",
    svg: renderGraphToSvgString(G, { interactive: false })
  });

  const stepsData = [];
  let stepNum = 1;
  let safety = 0;

  while (safety < 25) {
    safety++;
    // Verificar se já chegamos a um único bloco entre IN e OUT
    const nonTerm = G.elements.filter(e => e.id !== "IN" && e.id !== "OUT");
    if (nonTerm.length === 1 && nonTerm[0].type === "block" && G.connections.length === 2) {
      break;
    }

    const stepResult = tryReduceStep(G, stepNum);
    if (!stepResult) {
      // Fallback algébrico pelas equações de nós [1], [2], ... (Método Algébrico)
      const currentEqs = buildDiagramNodeEquations(G);
      const finalBlock = {
        id: "B_final_eq",
        type: "block",
        name: "T(s)",
        expr: polyToCompact(analysis.totalT.num),
        rat: analysis.totalT,
        x: 445,
        y: 165,
        dir: "right",
        isFeedback: false
      };
      G.elements = G.elements.filter(e => e.id === "IN" || e.id === "OUT");
      G.elements.push(finalBlock);
      G.connections = [
        { id: "C_f1", from: "IN", to: "B_final_eq", sign: "+", route: "auto" },
        { id: "C_f2", from: "B_final_eq", to: "OUT", sign: "+", route: "auto" }
      ];
      const svgSnap = renderGraphToSvgString(G, { interactive: false, highlightIds: ["B_final_eq"] });
      const eqLines = currentEqs.eqsLatex.length > 0 ? `${currentEqs.eqsLatex.join(" \\\\ ")}\\\\ ` : "";
      stepsData.push({
        num: stepNum,
        title: "Substituição Algébrica das Equações dos Sinais nos Nós (Método Algébrico)",
        desc: "Equacionando os sinais nos nós restantes e substituindo as equações intermediárias para isolar $C(s)$ em função de $R(s)$ (conforme o método algébrico):",
        latex: `${eqLines}\\frac{C(s)}{R(s)} &= ${ratToLatex(analysis.totalT)}`,
        summaryLatex: `\\text{Etapa ${stepNum} (Isolamento Algébrico): } \\frac{C(s)}{R(s)} &= ${ratToLatex(analysis.totalT)}`,
        svg: svgSnap,
        caption: `Estado do Diagrama após a Etapa ${stepNum}`
      });
      builderReductionStages.push({
        shortLabel: `Etapa ${stepNum} (Final)`,
        caption: `Etapa ${stepNum}: Redução Concluída`,
        svg: svgSnap
      });
      break;
    } else {
      const nonTermAfter = G.elements.filter(e => e.id !== "IN" && e.id !== "OUT");
      const isLast = nonTermAfter.length === 1 && nonTermAfter[0].type === "block" && G.connections.length === 2;
      if (isLast) {
        nonTermAfter[0].x = 445;
        nonTermAfter[0].y = 165;
        nonTermAfter[0].name = "T(s)";
      }
      const svgSnap = renderGraphToSvgString(G, { interactive: false, highlightIds: stepResult.highlightIds });
      stepsData.push({
        num: stepNum,
        title: stepResult.title,
        desc: stepResult.desc,
        latex: stepResult.latex,
        summaryLatex: stepResult.summaryLatex || stepResult.latex,
        svg: svgSnap,
        caption: isLast ? `Diagrama Final Reduzido a um Único Bloco (Etapa ${stepNum})` : `Como o Diagrama Fica após a Etapa ${stepNum}`
      });
      builderReductionStages.push({
        shortLabel: isLast ? `Etapa ${stepNum} (Final)` : `Etapa ${stepNum}`,
        caption: `Etapa ${stepNum}: ${stepResult.title}`,
        svg: svgSnap
      });
      stepNum++;
      if (isLast) break;
    }
  }

  builderCurrentStageIdx = builderReductionStages.length - 1;

  // Renderizar Player Interativo de Evolução do Diagrama + Memorial Passo a Passo
  const playerBox = document.createElement("div");
  playerBox.className = "card";
  playerBox.style.marginBottom = "16px";
  playerBox.innerHTML = `
    <h2>🎬 Evolução Visual do Seu Diagrama durante a Redução</h2>
    <div id="builderStageNavBar" class="step-nav-bar"></div>
    <div id="builderStageCaption" style="font-size:0.84rem; color:var(--primary); font-weight:700; margin-bottom:6px;"></div>
    <div class="diagram-view" style="height:290px;">
      <svg id="builderStagePreviewSvg" viewBox="0 0 900 360"></svg>
    </div>
  `;
  outDiv.appendChild(playerBox);

  // Renderizar cada etapa com seu respectivo diagrama SVG embutido
  stepsData.forEach(st => {
    const box = document.createElement("div");
    box.className = "step-box";
    box.innerHTML = `
      <div class="step-title">Etapa ${st.num}: ${st.title}</div>
      <div class="step-content">${st.desc}</div>
      <div class="math-display">$$\\begin{aligned}${st.latex}\\end{aligned}$$</div>
      <div class="step-diagram-wrapper">
        <div class="step-diagram-caption">
          <span>📐 ${st.caption}</span>
          <span style="color:var(--text-muted); font-weight:normal; font-size:0.72rem;">Etapa ${st.num}</span>
        </div>
        <div class="step-diagram-svg-box" style="height:245px;">
          <svg viewBox="0 0 900 360">${st.svg}</svg>
        </div>
      </div>
    `;
    outDiv.appendChild(box);
  });

  const scilabVars = builderState.elements
    .filter(e => e.type === "block")
    .map(b => `${varToCompact(b.name)} = ${b.expr.replace(/_/g, "")};`)
    .join("\n");

  // Construir o passo a passo consolidado para exibir dentro do quadro de Resultado Final
  const finalStepByStepLines = [];
  stepsData.forEach((st, idx) => {
    if (idx < stepsData.length - 1) {
      finalStepByStepLines.push(st.summaryLatex || st.latex);
    } else {
      finalStepByStepLines.push(st.latex);
    }
  });
  finalStepByStepLines.push(`\\implies T(s) = \\frac{C(s)}{R(s)} &= \\mathbf{${ratToLatex(analysis.totalT)}}`);

  const resBox = document.createElement("div");
  resBox.className = "highlight-result";
  resBox.innerHTML = `
    <h3>Função de Transferência Final do Diagrama Criado — Passo a Passo Completo</h3>
    <div class="math-display">
      $$\\begin{aligned}
      ${finalStepByStepLines.join(" \\\\[6pt]\n")}
      \\end{aligned}$$
    </div>
    ${buildAnalyticalSummaryHtml(analysis.totalT, "R", "C")}
    <div style="font-size:0.85rem; color:var(--text); margin-top:10px; background:rgba(15, 23, 42, 0.55); border:1px solid var(--border); border-radius:8px; padding:10px 14px;">
      <b>Equacionamento Algébrico dos Sinais nos Nós [1], [2], ... (Método Algébrico):</b>
      <ul style="margin-left:18px; margin-top:4px; color:var(--text-muted); line-height:1.65;">
        ${nodeEqs.eqsHtml.join("")}
        <li><b>Isolando $C(s)/R(s)$ por substituição algébrica:</b> $\\frac{C(s)}{R(s)} = ${ratToLatex(analysis.totalT)}$</li>
      </ul>
    </div>
    <div style="font-size:0.85rem; font-weight:700; color:var(--text); margin-top:10px;">Script Scilab Gerado para o Seu Diagrama:</div>
    <div class="scilab-box">s = %s;
// Blocos definidos no diagrama:
${scilabVars}

// Função de Transferência Equivalente T(s) = C(s) / R(s):
T = syslin('c', ${ratToScilab(analysis.totalT)});
disp(T, "Função de Transferência Reduzida C(s)/R(s):");</div>
  `;
  outDiv.appendChild(resBox);

  renderBuilderStagePlayer();
  renderMath(outDiv);
}

function renderBuilderStagePlayer() {
  const nav = document.getElementById("builderStageNavBar");
  const cap = document.getElementById("builderStageCaption");
  const svg = document.getElementById("builderStagePreviewSvg");
  if (!nav || !svg || builderReductionStages.length === 0) return;

  nav.innerHTML = "";
  const prevBtn = document.createElement("button");
  prevBtn.className = "step-nav-btn";
  prevBtn.innerText = "◀ Anterior";
  prevBtn.onclick = () => {
    if (builderCurrentStageIdx > 0) {
      builderCurrentStageIdx--;
      renderBuilderStagePlayer();
    }
  };
  nav.appendChild(prevBtn);

  builderReductionStages.forEach((st, idx) => {
    const b = document.createElement("button");
    b.className = "step-nav-btn" + (idx === builderCurrentStageIdx ? " active" : "");
    b.innerText = st.shortLabel;
    b.onclick = () => {
      builderCurrentStageIdx = idx;
      renderBuilderStagePlayer();
    };
    nav.appendChild(b);
  });

  const nextBtn = document.createElement("button");
  nextBtn.className = "step-nav-btn";
  nextBtn.innerText = "Próxima ▶";
  nextBtn.onclick = () => {
    if (builderCurrentStageIdx < builderReductionStages.length - 1) {
      builderCurrentStageIdx++;
      renderBuilderStagePlayer();
    }
  };
  nav.appendChild(nextBtn);

  const cur = builderReductionStages[builderCurrentStageIdx];
  if (cap) cap.innerText = cur.caption;
  svg.innerHTML = cur.svg;
}

// Eventos globais do canvas para arrastar elementos, zoom, pan, seleção e atalhos
document.addEventListener("DOMContentLoaded", function() {
  let isBuilderOnlyMode = false;
  try {
    isBuilderOnlyMode =
      window.location.hash === "#criar-diagrama" ||
      window.location.search.includes("modo=construtor") ||
      sessionStorage.getItem("modo_diagrama_exclusivo") === "1";
  } catch (_) {
    isBuilderOnlyMode = window.location.hash === "#criar-diagrama";
  }

  const presetSel = document.getElementById("presetSelect");
  if (!isBuilderOnlyMode && presetSel) {
    presetSel.value = "";
  }

  loadBuilderTemplate("em_branco", true);

  if (isBuilderOnlyMode || window.location.hash === "#criar-diagrama") {
    abrirConstrutorLivre();
  } else if (window.location.hash === "#guia-didatico") {
    abrirPaginaGuiaDidatico();
  } else if (window.location.hash === "#pratica") {
    abrirModoPratica();
  } else {
    voltarPaginaExemplos();
    loadPreset();
  }

  const hero = document.getElementById("heroBanner");
  if (hero) renderMath(hero);

  const svg = document.getElementById("builderSvg");
  if (svg) {
    svg.addEventListener("wheel", function(evt) {
      evt.preventDefault();
      const dir = evt.deltaY < 0 ? 1 : -1;
      builderZoom(dir, 0.12);
    }, { passive: false });

    svg.addEventListener("mousedown", function(evt) {
      if (evt.button !== 0 || builderState.draggingId || (builderState.penDrag && builderState.penDrag.active)) return;
      builderState.isPanning = true;
      builderState.hasPanMoved = false;
      builderState.panStartClient = { x: evt.clientX, y: evt.clientY };
      builderState.panStartOrigin = { x: builderState.panX || 0, y: builderState.panY || 0 };
    });

    svg.addEventListener("mousemove", function(evt) {
      if (builderState.penDrag && builderState.penDrag.active) {
        const pd = builderState.penDrag;
        if (!pd.hasMoved && !pd.waitingSecondClick) {
          const dist = Math.hypot(evt.clientX - pd.clientStartX, evt.clientY - pd.clientStartY);
          if (dist >= 4) {
            pd.hasMoved = true;
          }
        }
        if (pd.hasMoved || pd.waitingSecondClick) {
          const pt = getSvgPoint(svg, evt);
          pd.currX = Math.round(pt.x);
          pd.currY = Math.round(pt.y);
          const tgt = findTargetElementAtPoint(pt, pd.fromId);
          pd.targetId = tgt ? tgt.id : null;
          updatePenPreviewDom();
        }
        return;
      }

      if (builderState.draggingId) {
        if (!builderHistory.hasMoved && builderHistory.dragStartClient) {
          const dist = Math.hypot(
            evt.clientX - builderHistory.dragStartClient.x,
            evt.clientY - builderHistory.dragStartClient.y
          );
          if (dist < 4) return;
          builderHistory.hasMoved = true;
        }
        const pt = getSvgPoint(svg, evt);
        const el = builderState.elements.find(e => e.id === builderState.draggingId);
        if (el) {
          el.x = Math.max(-1500, Math.min(2500, Math.round(pt.x - builderState.dragOffsetX)));
          el.y = Math.max(-1000, Math.min(1800, Math.round(pt.y - builderState.dragOffsetY)));
          renderBuilderCanvas();
        }
        return;
      }

      if (builderState.isPanning && builderState.panStartClient) {
        const dx = evt.clientX - builderState.panStartClient.x;
        const dy = evt.clientY - builderState.panStartClient.y;
        if (Math.hypot(dx, dy) >= 4) {
          builderState.hasPanMoved = true;
          const rect = svg.getBoundingClientRect();
          const scaleX = (900 / (builderState.zoom || 1)) / Math.max(1, rect.width);
          const scaleY = (360 / (builderState.zoom || 1)) / Math.max(1, rect.height);
          builderState.panX = builderState.panStartOrigin.x - dx * scaleX;
          builderState.panY = builderState.panStartOrigin.y - dy * scaleY;
          applySvgZoomAndPan();
        }
      }
    });

    svg.addEventListener("click", function() {
      if (builderState.suppressNextClick) {
        builderState.suppressNextClick = false;
        return;
      }
      if (builderState.hasPanMoved) {
        builderState.hasPanMoved = false;
        return;
      }
      let changed = false;
      if (builderState.penDrag) {
        builderState.penDrag = null;
        updatePenPreviewDom();
        resetHintBar();
        changed = true;
      }
      if (builderState.connectSourceId) {
        builderState.connectSourceId = null;
        resetHintBar();
        changed = true;
      }
      if (builderState.selectedType || builderState.selectedId) {
        builderState.selectedType = null;
        builderState.selectedId = null;
        changed = true;
      }
      if (changed) {
        refreshBuilderUI();
      }
    });
  }

  window.addEventListener("mouseup", function(evt) {
    if (builderState.penDrag && builderState.penDrag.active && !builderState.penDrag.waitingSecondClick) {
      const pd = builderState.penDrag;
      if (pd.targetId) {
        builderState.suppressNextClick = true;
        completePenConnection(pd, pd.targetId);
      } else if (pd.hasMoved) {
        // Verificar mais uma vez na posição final do mouse se soltou sobre um bloco
        if (svg && evt) {
          const pt = getSvgPoint(svg, evt);
          const tgt = findTargetElementAtPoint(pt, pd.fromId);
          if (tgt) {
            builderState.suppressNextClick = true;
            completePenConnection(pd, tgt.id);
            return;
          }
        }
        builderState.penDrag = null;
        builderState.suppressNextClick = true;
        updatePenPreviewDom();
        const hint = document.getElementById("builderHintBar");
        if (hint) {
          hint.innerHTML = `<span style="color:#fcd34d; font-weight:700;">✏️ Arraste a ponta da seta e solte em cima de um <b>Bloco</b>, <b>Somador</b> ou da <b>Saída C(s)</b> para concluir a ligação!</span>`;
        }
      } else {
        // Clique simples sem arrastar
        if (builderState.connectMode) {
          pd.waitingSecondClick = true;
          builderState.suppressNextClick = true;
          updatePenPreviewDom();
        } else if (pd.sourceType === "wire" && pd.connId) {
          const connId = pd.connId;
          builderState.penDrag = null;
          builderState.suppressNextClick = true;
          updatePenPreviewDom();
          selectBuilderItem("connection", connId);
          refreshBuilderUI();
        } else {
          builderState.penDrag = null;
          updatePenPreviewDom();
        }
      }
    }

    if (builderState.draggingId) {
      const el = builderState.elements.find(e => e.id === builderState.draggingId);
      if (
        el &&
        builderHistory.dragStartPos &&
        builderHistory.dragStartSnapshot &&
        (el.x !== builderHistory.dragStartPos.x || el.y !== builderHistory.dragStartPos.y)
      ) {
        pushBuilderUndoState(builderHistory.dragStartSnapshot);
      }
      builderState.draggingId = null;
      builderHistory.dragStartSnapshot = null;
      builderHistory.dragStartPos = null;
    }
    if (builderState.isPanning) {
      builderState.isPanning = false;
      builderState.panStartClient = null;
    }
  });

  window.addEventListener("keydown", function(evt) {
    const tag = (evt.target && evt.target.tagName) ? evt.target.tagName.toUpperCase() : "";

    // Escape fecha modal de atalhos prioritariamente
    if (evt.key === "Escape") {
      const modal = document.getElementById("shortcutsModal");
      if (modal && modal.style.display === "flex") {
        evt.preventDefault();
        toggleShortcutsModal(false);
        return;
      }
    }

    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      if (evt.key === "Enter" && tag === "INPUT") {
        const paramsGrid = document.getElementById("presetMainGrid");
        if (paramsGrid && paramsGrid.style.display !== "none") {
          evt.preventDefault();
          calcular();
        }
      }
      return;
    }

    // Atalho para abrir janela de atalhos com ?
    if (evt.key === "?" || (evt.shiftKey && evt.key === "/")) {
      evt.preventDefault();
      toggleShortcutsModal();
      return;
    }

    // Navegação rápida global por teclado
    if (evt.key === "1" || evt.key.toLowerCase() === "h") {
      evt.preventDefault();
      voltarPaginaExemplos();
      return;
    }
    if (evt.key === "2" || evt.key.toLowerCase() === "g") {
      evt.preventDefault();
      abrirPaginaGuiaDidatico();
      return;
    }
    if (evt.key === "3" || evt.key.toLowerCase() === "p") {
      evt.preventDefault();
      abrirModoPratica();
      return;
    }
    if (evt.key === "4" || evt.key.toLowerCase() === "b") {
      evt.preventDefault();
      toggleDedicatedBuilder(true);
      return;
    }
    if (evt.key.toLowerCase() === "c") {
      evt.preventDefault();
      const bSec = document.getElementById("customBuilderSection");
      if (bSec && bSec.style.display !== "none") {
        executarReducaoConstrutor();
      } else {
        calcular();
      }
      return;
    }

    if (evt.key === "Escape") {
      const tray = document.getElementById("categoryOptionsTray");
      if (tray && tray.style.display !== "none") {
        toggleCategoryTray(activeCategoryKey);
        return;
      }
      if (document.body.classList.contains("guide-page-active") || document.body.classList.contains("practice-page-active") || document.body.classList.contains("dedicated-builder-page")) {
        voltarPaginaExemplos();
        return;
      }
      if (builderState.penDrag) {
        builderState.penDrag = null;
        updatePenPreviewDom();
        resetHintBar();
      } else if (builderState.connectMode) {
        toggleConnectMode(false);
      } else if (builderState.connectSourceId) {
        builderState.connectSourceId = null;
        resetHintBar();
        renderBuilderCanvas();
      } else if (builderState.focusMode) {
        toggleBuilderFocusMode(false);
      }
      return;
    }

    if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "z") {
      evt.preventDefault();
      if (evt.shiftKey) {
        builderRedo();
      } else {
        builderUndo();
      }
    } else if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "y") {
      evt.preventDefault();
      builderRedo();
    } else if ((evt.key === "Delete" || evt.key === "Backspace") && builderState.selectedId) {
      evt.preventDefault();
      builderDeleteSelected();
    }
  });
});

// ==========================================
// GERENCIAMENTO DE TEMA (CLARO / ESCURO)
// ==========================================
function initAppTheme() {
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get("theme");
  const savedTheme = themeParam || localStorage.getItem("app_theme") || "dark";
  applyAppTheme(savedTheme);

  const presetParam = params.get("preset");
  if (presetParam && typeof selectPresetFromButton === "function") {
    setTimeout(() => {
      selectPresetFromButton(presetParam);
    }, 120);
  }
}

function applyAppTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.innerHTML = isLight ? "🌙 Modo Escuro" : "☀️ Modo Claro";
    btn.setAttribute("title", isLight ? "Alternar para Modo Escuro" : "Alternar para Modo Claro");
  }
  localStorage.setItem("app_theme", theme);
}

function toggleAppTheme() {
  const current = document.body.classList.contains("light-theme") ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  applyAppTheme(next);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAppTheme);
} else {
  initAppTheme();
}
