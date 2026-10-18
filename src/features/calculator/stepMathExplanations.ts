import { RatFunc, ratMul, ratAdd, ratFeedback, ratToLatex, ratToCompactParts } from '@/core/algebra/rational';
import { polyToLatex, polyMul, polyAdd, polySub, polyIsOne, polyIsZero, Polynomial } from '@/core/algebra/polynomial';
import { InteractiveMathLine } from '@/components/InteractiveMathView';

// Auxiliar para envolver polinômios compostos em parênteses no LaTeX
function pWrap(lat: string): string {
  if (lat.includes('+') || lat.includes('-')) {
    return `(${lat})`;
  }
  return lat;
}

// Explica a multiplicação detalhada entre dois polinômios ("chuveirinho")
export function explainPolyMulDetailedHtml(P: Polynomial, Q: Polynomial): string {
  const pLat = polyToLatex(P);
  const qLat = polyToLatex(Q);
  const resPoly = polyMul(P, Q);
  const resLat = polyToLatex(resPoly);

  if (polyIsOne(P)) {
    return `Multiplicando por $1$: $1 \\cdot (${qLat}) = ${qLat}$ (o fator $1$ é elemento neutro da multiplicação).`;
  }
  if (polyIsOne(Q)) {
    return `Multiplicando por $1$: $(${pLat}) \\cdot 1 = ${pLat}$ (o fator $1$ é elemento neutro da multiplicação).`;
  }
  if (P.length === 1 && Q.length === 1) {
    const cA = P[0].coeff, cB = Q[0].coeff;
    return `Multiplicação direta de monômios: $(${pLat}) \\cdot (${qLat}) = ${resLat}$ (multiplica-se o coeficiente $${cA} \\cdot (${cB}) = ${Number((cA * cB).toFixed(4))}$ e somam-se os expoentes de mesma base).`;
  }

  const pairSteps: string[] = [];
  const rawTerms: Polynomial = [];
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
  }).join('');

  return `
    Aplicando a <b>propriedade distributiva ("chuveirinho")</b> em $(${pLat}) \\cdot (${qLat})$:<br>
    • Multiplicações termo a termo: ${pairSteps.join(' ; ')}<br>
    • Somando os produtos parciais: $${uncollectedStr}$<br>
    • Agrupando os termos de mesma potência: $\\mathbf{${resLat}}$
  `;
}

// Explica a soma ou subtração de dois polinômios
export function explainPolyAddSubDetailedHtml(P: Polynomial, Q: Polynomial, op: '+' | '-' = '+'): string {
  const pLat = polyToLatex(P);
  const qLat = polyToLatex(Q);
  const isSub = op === '-';
  const resPoly = isSub ? polySub(P, Q) : polyAdd(P, Q);
  const resLat = polyToLatex(resPoly);

  return `
    Somando/agrupando os termos semelhantes em $(${pLat}) ${op} (${qLat})$:<br>
    ${isSub ? `• O sinal negativo antes de $(${qLat})$ inverte o sinal de todos os seus termos.<br>` : ''}
    • Polinômio resultante após somar termos de mesmo grau: $\\mathbf{${resLat}}$
  `;
}

// Gera linhas matemáticas interativas para a Associação em Série / Cascata
export function buildCascataInteractiveLines(
  lhsStr: string,
  A: RatFunc,
  B: RatFunc,
  finalRat: RatFunc
): InteractiveMathLine[] {
  const nA = polyToLatex(A.num), dA = polyToLatex(A.den);
  const nB = polyToLatex(B.num), dB = polyToLatex(B.den);
  const finalLat = ratToLatex(finalRat);

  return [
    {
      math: `${lhsStr} = \\left(${ratToLatex(A)}\\right) \\cdot \\left(${ratToLatex(B)}\\right)`,
      explanationTitle: 'Regra da Cascata (Série)',
      explanationHtml: `<ol>
        <li><b>Definição:</b> Em conexão série direta sem ramificações intermediárias, a função equivalente é o produto direto das funções de transferência: $G_{\\text{eq}}(s) = G_1(s) \\cdot G_2(s)$.</li>
        <li><b>1º Bloco:</b> $${ratToLatex(A)}$</li>
        <li><b>2º Bloco:</b> $${ratToLatex(B)}$</li>
      </ol>`
    },
    {
      math: `&= \\frac{${pWrap(nA)} \\cdot ${pWrap(nB)}}{${pWrap(dA)} \\cdot ${pWrap(dB)}}`,
      explanationTitle: 'Multiplicação de Numeradores e Denominadores',
      explanationHtml: `<ol>
        <li><b>Regra de Multiplicação de Frações:</b> Multiplicam-se os numeradores entre si e os denominadores entre si:
          <div style="background: rgba(15,23,42,0.85); padding: 4px 8px; border-left: 3px solid #38bdf8; margin: 4px 0;">$$\\frac{A}{B} \\cdot \\frac{C}{D} = \\frac{A \\cdot C}{B \\cdot D}$$</div>
        </li>
        <li><b>Numerador:</b> ${explainPolyMulDetailedHtml(A.num, B.num)}</li>
        <li><b>Denominador:</b> ${explainPolyMulDetailedHtml(A.den, B.den)}</li>
      </ol>`
    },
    {
      math: `&= ${finalLat}`,
      explanationTitle: 'Forma Polinomial Canônica Final',
      explanationHtml: `<ol>
        <li><b>Simplificação:</b> Agrupam-se as potências de $s$ em ordem decrescente tanto no numerador quanto no denominador.</li>
        <li><b>Resultado Final:</b> $${finalLat}$</li>
      </ol>`
    }
  ];
}

// Gera linhas matemáticas interativas para a Associação em Paralelo com MMC
export function buildParaleloInteractiveLines(
  lhsStr: string,
  A: RatFunc,
  B: RatFunc,
  op: '+' | '-',
  finalRat: RatFunc
): InteractiveMathLine[] {
  const nA = polyToLatex(A.num), dA = polyToLatex(A.den);
  const nB = polyToLatex(B.num), dB = polyToLatex(B.den);
  const finalLat = ratToLatex(finalRat);
  const isSub = op === '-';

  const denMulPoly = polyMul(A.den, B.den);
  const denMulLat = polyToLatex(denMulPoly);

  const term1Poly = polyMul(A.num, B.den);
  const term2Poly = polyMul(B.num, A.den);
  const term1Lat = polyToLatex(term1Poly);
  const term2Lat = polyToLatex(term2Poly);

  return [
    {
      math: `${lhsStr} = \\left(${ratToLatex(A)}\\right) ${op} \\left(${ratToLatex(B)}\\right)`,
      explanationTitle: 'Equacionamento dos Ramos Paralelos',
      explanationHtml: `<ol>
        <li><b>Topologia em Paralelo:</b> Os ramos partem do mesmo ponto de bifurcação e convergem no somador: $G_{\\text{eq}}(s) = G_1(s) ${op} G_2(s)$.</li>
        <li><b>Operação no Somador:</b> ${isSub ? 'Subtrativa (-)' : 'Aditiva (+)'}.</li>
      </ol>`
    },
    {
      math: `&= \\frac{${pWrap(nA)} \\cdot ${pWrap(dB)} ${op} ${pWrap(nB)} \\cdot ${pWrap(dA)}}{${pWrap(dA)} \\cdot ${pWrap(dB)}}`,
      explanationTitle: 'Mínimo Múltiplo Comum (MMC) entre os Denominadores',
      explanationHtml: `<ol>
        <li><b>Denominador Comum:</b> O MMC entre os denominadores $(${dA})$ e $(${dB})$ é o produto $(${dA}) \\cdot (${dB}) = ${denMulLat}$.</li>
        <li><b>Regra "Divide pelo de baixo e multiplica pelo de cima":</b>
          <ul>
            <li>1ª Parcela: $[${denMulLat} \\div (${dA})] \\cdot (${nA}) = (${dB}) \\cdot (${nA}) = ${term1Lat}$</li>
            <li>2ª Parcela: $[${denMulLat} \\div (${dB})] \\cdot (${nB}) = (${dA}) \\cdot (${nB}) = ${term2Lat}$</li>
          </ul>
        </li>
      </ol>`
    },
    {
      math: `&= \\frac{${term1Lat} ${op} (${term2Lat})}{${denMulLat}} = ${finalLat}`,
      explanationTitle: 'Agrupamento e Simplificação Final',
      explanationHtml: `<ol>
        <li><b>Numerador:</b> ${explainPolyAddSubDetailedHtml(term1Poly, term2Poly, op)}</li>
        <li><b>Denominador:</b> $${denMulLat}$</li>
        <li><b>Forma Final:</b> $${finalLat}$</li>
      </ol>`
    }
  ];
}

// Gera linhas matemáticas interativas para a Malha Fechada G/(1 ± GH) com MMC, inversão e cancelamentos
export function buildFeedbackInteractiveLines(
  lhsStr: string,
  G: RatFunc,
  H: RatFunc,
  loopSign: '+' | '-',
  finalRat: RatFunc
): InteractiveMathLine[] {
  const denSign = loopSign === '-' ? '+' : '-';
  const nG = polyToLatex(G.num), dG = polyToLatex(G.den);
  const nH = polyToLatex(H.num), dH = polyToLatex(H.den);
  const finalLat = ratToLatex(finalRat);

  const ghNumPoly = polyMul(G.num, H.num);
  const ghDenPoly = polyMul(G.den, H.den);
  const ghNumLat = polyToLatex(ghNumPoly);
  const ghDenLat = polyToLatex(ghDenPoly);

  const charPoly = loopSign === '-' ? polyAdd(ghDenPoly, ghNumPoly) : polySub(ghDenPoly, ghNumPoly);
  const charLat = polyToLatex(charPoly);

  return [
    {
      math: `${lhsStr} = \\frac{${ratToLatex(G)}}{1 ${denSign} \\left(${ratToLatex(G)}\\right) \\cdot \\left(${ratToLatex(H)}\\right)}`,
      explanationTitle: 'Substituição na Fórmula Canônica de Malha Fechada',
      explanationHtml: `<ol>
        <li><b>Fórmula Canônica:</b> $T(s) = \\frac{G(s)}{1 \\mp G(s)H(s)}$.</li>
        <li><b>Por que o sinal é "${denSign}"?</b> O erro no somador é $E(s) = R(s) ${loopSign} H(s)C(s)$. Substituindo em $C(s) = G(s)E(s)$ e transpondo $C(s)G(s)H(s)$ para o membro esquerdo, o sinal inverte para "${denSign}": $C(s)[1 ${denSign} G(s)H(s)] = G(s)R(s)$.</li>
        <li><b>Caminho direto $G(s)$:</b> $${ratToLatex(G)}$</li>
        <li><b>Caminho de realimentação $H(s)$:</b> $${ratToLatex(H)}$</li>
      </ol>`
    },
    {
      math: `&= \\frac{${ratToLatex(G)}}{1 ${denSign} \\frac{${ghNumLat}}{${ghDenLat}}}`,
      explanationTitle: 'Cálculo do Produto de Laço Aberto G(s) · H(s)',
      explanationHtml: `<ol>
        <li><b>Multiplicação no denominador:</b> $G(s) \\cdot H(s) = \\frac{${pWrap(nG)} \\cdot ${pWrap(nH)}}{${pWrap(dG)} \\cdot ${pWrap(dH)}} = \\frac{${ghNumLat}}{${ghDenLat}}$.</li>
        <li><b>Numerador do laço:</b> ${explainPolyMulDetailedHtml(G.num, H.num)}</li>
        <li><b>Denominador do laço:</b> ${explainPolyMulDetailedHtml(G.den, H.den)}</li>
      </ol>`
    },
    {
      math: `&= \\frac{\\frac{${nG}}{${dG}}}{\\frac{${pWrap(ghDenLat)} ${denSign} ${pWrap(ghNumLat)}}{${ghDenLat}}} = \\frac{\\frac{${nG}}{${dG}}}{\\frac{${charLat}}{${ghDenLat}}}`,
      explanationTitle: `Mínimo Múltiplo Comum (MMC) no Denominador Principal (${ghDenLat})`,
      explanationHtml: `<ol>
        <li><b>Transformação do número 1 em fração:</b> $1 = \\frac{1}{1}$.</li>
        <li><b>MMC entre 1 e $(${ghDenLat})$:</b> É o próprio $(${ghDenLat})$.</li>
        <li><b>Regra "Divide pelo de baixo e multiplica pelo de cima":</b>
          <ul>
            <li>Na parcela $1/1$: $[${ghDenLat} \\div 1] \\cdot 1 = \\mathbf{${ghDenLat}}$</li>
            <li>Na parcela $\\frac{${ghNumLat}}{${ghDenLat}}$: $[${ghDenLat} \\div (${ghDenLat})] \\cdot (${ghNumLat}) = \\mathbf{${ghNumLat}}$</li>
          </ul>
        </li>
        <li><b>Polinômio Característico resultante:</b> $(${ghDenLat}) ${denSign} (${ghNumLat}) = \\mathbf{${charLat}}$.</li>
      </ol>`
    },
    {
      math: `&= \\frac{${nG}}{\\cancel{${dG}}} \\cdot \\frac{\\cancel{${dG}}}{${charLat}} = \\frac{${nG}}{${charLat}}`,
      explanationTitle: `Divisão de Frações: "Conserva a de Cima, Multiplica pelo Inverso da de Baixo" e Corte de (${dG})`,
      explanationHtml: `<ol>
        <li><b>Regra da Divisão de Frações:</b> Mantém-se o numerador $\\frac{${nG}}{${dG}}$ e multiplica-se pelo inverso do denominador $\\frac{${ghDenLat}}{${charLat}}$:
          <div style="background: rgba(15,23,42,0.85); padding: 4px 8px; border-left: 3px solid #38bdf8; margin: 4px 0;">$$\\frac{\\;\\frac{A}{B}\\;}{\\;\\frac{C}{D}\\;} = \\frac{A}{B} \\cdot \\frac{D}{C}$$</div>
        </li>
        <li><b>Cancelamento (Corte) do termo comum $\\cancel{${dG}}$:</b> Como ele divide na primeira fração e multiplica na segunda, $\\frac{${dG}}{${dG}} = 1$.</li>
      </ol>`
    },
    {
      math: `&= ${finalLat}`,
      explanationTitle: 'Função de Transferência de Malha Fechada Final',
      explanationHtml: `<ol>
        <li><b>Equação Reduzida:</b> $T(s) = \\frac{C(s)}{R(s)} = ${finalLat}$.</li>
        <li><b>Polos de Malha Fechada:</b> Raízes do polinômio característico do denominador $D(s) = ${charLat}$.</li>
      </ol>`
    }
  ];
}
