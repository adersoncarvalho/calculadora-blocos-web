/**
 * Parser de Expressões Algébricas e Funções de Transferência
 * Converte strings (ex: '4/(s+1)', '10/(s^2+2s+5)', 'G1*G2') em RatFunc.
 */

import {
  Polynomial,
  polyFromNumber,
  polyFromVar,
  polyMul,
  normalizeVarName
} from "./polynomial";

import {
  RatFunc,
  ratFromPoly,
  ratOne,
  ratAdd,
  ratSub,
  ratMul,
  ratDiv,
  ratScale,
  ratSimplify
} from "./rational";

function polyPow(P: Polynomial, exp: number): Polynomial {
  let res = polyFromNumber(1);
  for (let i = 0; i < exp; i++) {
    res = polyMul(res, P);
  }
  return res;
}

interface Token {
  type: "op" | "num" | "id";
  val: string | number;
}

export function parseRatExpr(str: string): RatFunc {
  if (!str || !str.trim()) return ratOne();

  let s = str
    .trim()
    .replace(/\\cdot/g, "*")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4");

  if (s.includes("=")) {
    s = s.split("=").pop()!.trim();
  }

  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ("+-*/^()[]".includes(ch)) {
      tokens.push({ type: "op", val: ch === "[" ? "(" : ch === "]" ? ")" : ch });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = "";
      while (i < s.length && /[0-9.]/.test(s[i])) {
        numStr += s[i++];
      }
      tokens.push({ type: "num", val: parseFloat(numStr) || 0 });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let id = "";
      while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) {
        id += s[i++];
      }
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
  const fullTokens: Token[] = [];
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
  function peek(): Token | null {
    return fullTokens[pos] || null;
  }
  function consume(): Token {
    return fullTokens[pos++];
  }

  function parseExpr(): RatFunc {
    let left = parseTerm();
    while (peek() && peek()!.type === "op" && (peek()!.val === "+" || peek()!.val === "-")) {
      const op = consume().val as string;
      const right = parseTerm();
      left = op === "+" ? ratAdd(left, right) : ratSub(left, right);
    }
    return left;
  }

  function parseTerm(): RatFunc {
    let left = parseFactor();
    while (peek() && peek()!.type === "op" && (peek()!.val === "*" || peek()!.val === "/")) {
      const op = consume().val as string;
      const right = parseFactor();
      left = op === "*" ? ratMul(left, right) : ratDiv(left, right);
    }
    return left;
  }

  function parseFactor(): RatFunc {
    if (peek() && peek()!.type === "op" && peek()!.val === "-") {
      consume();
      return ratScale(parseFactor(), -1);
    }
    if (peek() && peek()!.type === "op" && peek()!.val === "+") {
      consume();
      return parseFactor();
    }
    let base = parsePrimary();
    if (peek() && peek()!.type === "op" && peek()!.val === "^") {
      consume();
      const expTok = consume();
      const exp = expTok && expTok.type === "num" ? Math.max(0, Math.round(expTok.val as number)) : 1;
      base = ratSimplify(polyPow(base.num, exp), polyPow(base.den, exp));
    }
    return base;
  }

  function parsePrimary(): RatFunc {
    const tok = peek();
    if (!tok) return ratOne();
    if (tok.type === "op" && tok.val === "(") {
      consume();
      const inside = parseExpr();
      if (peek() && peek()!.type === "op" && peek()!.val === ")") consume();
      return inside;
    }
    if (tok.type === "num") {
      consume();
      return ratFromPoly(polyFromNumber(tok.val as number));
    }
    if (tok.type === "id") {
      consume();
      return ratFromPoly(polyFromVar(tok.val as string));
    }
    consume();
    return ratOne();
  }

  try {
    return parseExpr();
  } catch {
    return ratFromPoly(polyFromVar(str.trim()));
  }
}
