'use client';

import React, { useMemo, useState } from 'react';
import { MathView } from '@/components/MathView';
import { SPlaneChart } from '@/components/SPlaneChart';
import { ControllerBlockDiagram } from './ControllerBlockDiagram';

interface LgrCase {
  id: string;
  label: string;
  title: string;
  slideSource: string;
  description: string;
  plantLatex: string;
  plantExpr: string;
  defaultK: string;
  defaultKLatex: string;
  scilabCode: string;
}

const LGR_TABLE_ROWS = [
  { k: '0', s1: '-20', s2: '0' },
  { k: '1', s1: '-19,75', s2: '-0,25' },
  { k: '5', s1: '-18,66', s2: '-1,34' },
  { k: '10', s1: '-17,07', s2: '-2,93' },
  { k: '20', s1: '-10', s2: '-10' },
  { k: '30', s1: '-10 + j7,07', s2: '-10 - j7,07' },
  { k: '40', s1: '-10 + j14,14', s2: '-10 - j14,14' },
  { k: '→ ∞', s1: '-10 + j∞', s2: '-10 - j∞' }
];

const LGR_CASES: LgrCase[] = [
  {
    id: 'caso1',
    label: 'Caso 1 — Sistema Original',
    title: 'Caso 1 — Sistema Original $G(s) = \\frac{5}{s(s+20)}$',
    slideSource: 'Slide 5 • Controle 01 - LT36B',
    description:
      'Os dois ramos partem de $0$ e $-20$, encontram-se no ponto de partida $-10$ (em $K = 20$) e seguem verticalmente ao longo da reta $\\text{Re}(s) = -10$ para $\\pm j\\infty$.',
    plantLatex: '\\frac{5}{s(s+20)}',
    plantExpr: '5/(s*(s+20))',
    defaultK: '20',
    defaultKLatex: 'K = 20',
    scilabCode: `// Caso 1 - Sistema Original (Aula 01.1 - Lugar das Raízes)
s = %s;
G = syslin('c', 5, s*(s+20));
clf();
evans(G, 100);
xgrid();`
  },
  {
    id: 'caso2',
    label: 'Caso 2 — Zero em -10',
    title: 'Caso 2 — Adição de um Zero em $-10$: $G(s) = \\frac{5(s+10)}{s(s+20)}$',
    slideSource: 'Slide 5 • Controle 01 - LT36B',
    description:
      'A adição do zero finito em $-10$ atrai o Lugar das Raízes totalmente para o eixo real negativo ($[-20,-10]$ e $[-10,0]$ não formam círculo fora do eixo real — todos os polos permanecem reais para qualquer $K > 0$).',
    plantLatex: '\\frac{5(s+10)}{s(s+20)}',
    plantExpr: '5*(s+10)/(s*(s+20))',
    defaultK: '2',
    defaultKLatex: 'K = 2',
    scilabCode: `// Caso 2 - Adição de um Zero em -10
s = %s;
G = syslin('c', 5*(s+10), s*(s+20));
clf();
evans(G, 100);
xgrid();`
  },
  {
    id: 'caso3',
    label: 'Caso 3 — Zero em -30',
    title: 'Caso 3 — Adição de um Zero em $-30$: $G(s) = \\frac{5(s+30)}{s(s+20)}$',
    slideSource: 'Slide 5 • Controle 01 - LT36B',
    description:
      'Com o zero em $-30$ (à esquerda de ambos os polos), os ramos saem de $0$ e $-20$, formam um arco circular contornando $-30$ e retornam ao eixo real: um ramo vai para o zero em $-30$ e o outro tende a $-\\infty$.',
    plantLatex: '\\frac{5(s+30)}{s(s+20)}',
    plantExpr: '5*(s+30)/(s*(s+20))',
    defaultK: '4',
    defaultKLatex: 'K = 4',
    scilabCode: `// Caso 3 - Adição de um Zero em -30
s = %s;
G = syslin('c', 5*(s+30), s*(s+20));
clf();
evans(G, 100);
xgrid();`
  },
  {
    id: 'caso4',
    label: 'Caso 4 — Sistema 2 Instável',
    title: 'Caso 4 — Sistema Original 2 (Instável): $G(s) = \\frac{5}{(s+10)(s+20)(s-5)}$',
    slideSource: 'Slide 6 • Controle 01 - LT36B',
    description:
      'A planta possui um polo no semiplano direito ($s = +5$). Use o slider de ganho no Plano $s$ abaixo para observar a faixa de $K$ em que o ramo vindo de $+5$ cruza para o semiplano esquerdo e depois os outros ramos cruzam para o semiplano direito.',
    plantLatex: '\\frac{5}{(s+10)(s+20)(s-5)}',
    plantExpr: '5/((s+10)*(s+20)*(s-5))',
    defaultK: '250',
    defaultKLatex: 'K = 250',
    scilabCode: `// Caso 4 - Sistema Original 2 (Instável em malha aberta: polo em +5)
s = %s;
G = syslin('c', 5, (s+10)*(s+20)*(s-5));
clf();
evans(G, 1000);
xgrid();`
  },
  {
    id: 'caso5',
    label: 'Caso 5 — Zero em -30 (Sist. 2)',
    title: 'Caso 5 — Adição de um Zero em $-30$ no Sistema 2: $G(s) = \\frac{5(s+30)}{(s+10)(s+20)(s-5)}$',
    slideSource: 'Slide 6 • Controle 01 - LT36B',
    description:
      'Ao adicionar um zero em $-30$, há $3 - 1 = 2$ assíntotas em $\\pm 90^\\circ$, puxando os ramos do Lugar das Raízes para o semiplano esquerdo e ampliando a região de estabilidade do sistema.',
    plantLatex: '\\frac{5(s+30)}{(s+10)(s+20)(s-5)}',
    plantExpr: '5*(s+30)/((s+10)*(s+20)*(s-5))',
    defaultK: '20',
    defaultKLatex: 'K = 20',
    scilabCode: `// Caso 5 - Adição de um Zero em -30 no Sistema 2
s = %s;
G = syslin('c', 5*(s+30), (s+10)*(s+20)*(s-5));
clf();
evans(G, 500);
xgrid();`
  }
];

function renderRichMathText(text: string): React.ReactNode {
  const parts = text.split(/(\$[^$]+\$|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <MathView key={`m-${idx}`} math={part.slice(1, -1)} inline />;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`b-${idx}`}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`t-${idx}`}>{part}</React.Fragment>;
  });
}

export const LugarRaizesView: React.FC = () => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(LGR_CASES[0].id);
  const [copiedScilab, setCopiedScilab] = useState<boolean>(false);

  const activeCase = useMemo(
    () => LGR_CASES.find(c => c.id === selectedCaseId) || LGR_CASES[0],
    [selectedCaseId]
  );

  const copyScilab = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedScilab(true);
    setTimeout(() => setCopiedScilab(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Introdução e Conceito (Slides 2 a 4) */}
      <section
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div>
          <span style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Aula 01.1 — Controle 01 (LT36B)
          </span>
          <h2 style={{ margin: '2px 0 6px 0', fontSize: '1.15rem', color: 'var(--text)' }}>
            Lugar das Raízes (Root Locus — Walter R. Evans, 1953)
          </h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {renderRichMathText(
              'Representação gráfica dos polos de malha fechada (MF) no plano complexo $s$ quando um parâmetro do sistema (em geral o ganho $K$) varia continuamente de $0$ a $\\infty$, a partir do conhecimento da função de transferência de malha aberta ($FT_{MA}$). No Scilab utiliza-se o comando `evans(FT_MA)`.'
            )}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px', alignItems: 'start' }}>
          <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              Exemplo Conceitual dos Slides 3–4
            </div>
            <MathView math="\frac{C(s)}{R(s)} = \frac{KG(s)}{1 + KG(s)H(s)} = \frac{5K}{s^2 + 20s + 5K}" />
            <MathView math="s_{1,2} = \frac{-20 \pm \sqrt{20^2 - 4\cdot 5K}}{2} = -10 \pm \sqrt{100 - 5K}" />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--code-bg)', textAlign: 'center' }}>
                  <th style={{ padding: '6px 10px', border: '1px solid var(--card-border)' }}>K</th>
                  <th style={{ padding: '6px 10px', border: '1px solid var(--card-border)' }}><MathView math="s_1" inline /></th>
                  <th style={{ padding: '6px 10px', border: '1px solid var(--card-border)' }}><MathView math="s_2" inline /></th>
                </tr>
              </thead>
              <tbody>
                {LGR_TABLE_ROWS.map(row => (
                  <tr key={row.k} style={{ textAlign: 'center' }}>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--card-border)', fontWeight: 700, color: 'var(--primary)' }}>{row.k}</td>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--card-border)', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>{row.s1}</td>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--card-border)', fontFamily: '"JetBrains Mono", Consolas, monospace' }}>{row.s2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Os 5 Casos no Scilab (Slides 5 e 6) */}
      <section
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div>
          <span style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
            Slides 5–6 • Comparação Interativa
          </span>
          <h3 style={{ margin: '2px 0 10px 0', fontSize: '1.05rem', color: 'var(--text)' }}>
            Plotando o Root Locus no Scilab (Casos 1 a 5)
          </h3>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LGR_CASES.map(c => {
              const isAct = c.id === activeCase.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCaseId(c.id)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '0.79rem',
                    fontWeight: isAct ? 700 : 500,
                    background: isAct ? 'var(--primary)' : 'var(--code-bg)',
                    color: isAct ? '#fff' : 'var(--text)',
                    border: `1px solid ${isAct ? 'var(--primary)' : 'var(--card-border)'}`,
                    cursor: 'pointer'
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600 }}>{activeCase.slideSource}</div>
        <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--primary)' }}>
          {renderRichMathText(activeCase.title)}
        </div>
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '10px 14px', fontSize: '0.84rem', lineHeight: 1.55 }}>
          {renderRichMathText(activeCase.description)}
        </div>

        <ControllerBlockDiagram
          title="Diagrama de Blocos do Caso"
          showControllerBlock={true}
          controllerLabel="Ganho K"
          controllerLatex={activeCase.defaultKLatex}
          plantLatex={activeCase.plantLatex}
          plantExpr={activeCase.plantExpr}
          controllerExpr={activeCase.defaultK}
        />

        <SPlaneChart
          title="Plano s — Lugar das Raízes (Use o slider para variar o ganho K)"
          plantExpr={activeCase.plantExpr}
          controllerExpr={activeCase.defaultK}
        />

        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
              💻 Script Scilab (.sce) — {activeCase.label}
            </span>
            <button
              type="button"
              onClick={() => copyScilab(activeCase.scilabCode)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.74rem',
                fontWeight: 700,
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: copiedScilab ? 'var(--success)' : 'var(--primary)',
                cursor: 'pointer'
              }}
            >
              {copiedScilab ? '✓ Copiado!' : 'Copiar Scilab'}
            </button>
          </div>
          <pre style={{ margin: 0, padding: '12px 14px', fontSize: '0.77rem', lineHeight: 1.5, fontFamily: '"JetBrains Mono", Consolas, monospace', overflowX: 'auto' }}>
            <code>{activeCase.scilabCode}</code>
          </pre>
        </div>
      </section>
    </div>
  );
};
