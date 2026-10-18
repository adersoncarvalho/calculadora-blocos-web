'use client';

import React, { useState } from 'react';
import katex from 'katex';

export interface InteractiveMathLine {
  math: string;
  explanationTitle?: string;
  explanationHtml?: string;
}

interface InteractiveMathViewProps {
  lines: InteractiveMathLine[];
  stepTitle?: string;
}

export const InteractiveMathView: React.FC<InteractiveMathViewProps> = ({ lines, stepTitle }) => {
  const [openIndices, setOpenIndices] = useState<number[]>([]);

  const toggleIndex = (idx: number) => {
    setOpenIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const allOpen = lines.length > 0 && openIndices.length === lines.length;

  const toggleAll = () => {
    if (allOpen) {
      setOpenIndices([]);
    } else {
      setOpenIndices(lines.map((_, i) => i));
    }
  };

  const renderFormula = (math: string) => {
    try {
      const cleanMath = math
        .replace(/&=/g, '=')
        .replace(/&\\implies/g, '\\implies')
        .replace(/&/g, '')
        .trim();

      return katex.renderToString(cleanMath, {
        displayMode: true,
        throwOnError: false
      });
    } catch {
      return `<span>${math}</span>`;
    }
  };

  const renderExplHtml = (htmlContent?: string, math?: string, title?: string, idx?: number) => {
    if (htmlContent) {
      // Substituir qualquer $$...$$ ou $...$ dentro do htmlContent por katex renderizado
      const replaced = htmlContent.replace(/\$\$([^$]+)\$\$/g, (_, eq) => {
        try {
          return katex.renderToString(eq.trim(), { displayMode: true, throwOnError: false });
        } catch {
          return eq;
        }
      }).replace(/\$([^$]+)\$/g, (_, eq) => {
        try {
          return katex.renderToString(eq.trim(), { displayMode: false, throwOnError: false });
        } catch {
          return eq;
        }
      });
      return replaced;
    }

    // Explicação automática padrão caso não fornecida
    const cleanMath = (math || '')
      .replace(/&=/g, '=')
      .replace(/&/g, '')
      .trim();

    return `
      <ol style="margin-left: 20px; margin-top: 4px;">
        <li style="margin-bottom: 6px;"><b>Equação desta passagem:</b>
          <div style="background: rgba(15, 23, 42, 0.85); border-left: 3px solid #38bdf8; padding: 6px 10px; margin: 5px 0; border-radius: 4px;">
            ${renderFormula(cleanMath)}
          </div>
        </li>
        <li style="margin-bottom: 6px;"><b>Como foi calculada:</b>
          Operação algébrica de redução no domínio de Laplace: desenvolvimento de MMC, multiplicação termo a termo por distributiva ("chuveirinho") e cancelamento dos fatores comuns entre numerador e denominador.
        </li>
      </ol>
    `;
  };

  return (
    <div style={{ margin: '8px 0' }}>
      {/* Barra de Ferramentas com Dica e Botão Explicar Todas */}
      <div className="math-interactive-toolbar">
        <span className="math-interactive-hint">
          💡 <b>Dica interativa:</b> Clique em qualquer linha abaixo ou na <b>🔍 lupinha</b> para abrir o passo a passo detalhado (MMC, distributiva, cortes).
        </span>
        <button
          type="button"
          className="btn-expand-all-math"
          onClick={toggleAll}
        >
          {allOpen ? '📕 Recolher Explicações' : '📖 Explicar Todas as Linhas'}
        </button>
      </div>

      {/* Linhas Matemáticas Interativas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {lines.map((lineObj, idx) => {
          const isOpen = openIndices.includes(idx);
          const title = lineObj.explanationTitle || `Passo ${idx + 1}: Detalhamento Algébrico`;

          return (
            <div key={idx} className="math-clickable-row-wrapper">
              <div
                className={`math-clickable-line ${isOpen ? 'open' : ''}`}
                onClick={() => toggleIndex(idx)}
                title="Clique para ver o passo a passo detalhado de como esta linha foi calculada"
              >
                <div
                  className="math-clickable-formula"
                  dangerouslySetInnerHTML={{ __html: renderFormula(lineObj.math) }}
                />
                <span
                  className="math-explain-badge"
                  data-tooltip={isOpen ? 'Clique para ocultar a explicação' : 'Clique para ver como foi feito'}
                  title={isOpen ? 'Clique para ocultar a explicação' : 'Clique para ver como foi feito'}
                >
                  {isOpen ? '🔼' : '🔍'}
                </span>
              </div>

              {isOpen && (
                <div className="math-line-explanation open">
                  <div className="explain-header">
                    <span>📘 Passo {idx + 1}: {title}</span>
                  </div>
                  <div
                    className="explain-body"
                    dangerouslySetInnerHTML={{
                      __html: renderExplHtml(lineObj.explanationHtml, lineObj.math, title, idx)
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
