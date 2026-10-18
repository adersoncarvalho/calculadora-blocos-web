'use client';

import React, { useState } from 'react';
import { MasonAnalysis } from '@/core/reduction/mason';
import { ratToLatex } from '@/core/algebra/rational';
import { MathView } from '@/components/MathView';

interface MasonDeductionViewProps {
  analysis: MasonAnalysis;
}

export const MasonDeductionView: React.FC<MasonDeductionViewProps> = ({ analysis }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(true);

  const { forwardPaths, loops, disjointPairs, delta, cofactors, totalT } = analysis;

  // Geração do texto formatado em Markdown/LaTeX para copiar
  const generateFullMemorialText = () => {
    let text = `# MEMORIAL DE CÁLCULO ANALÍTICO — REGRA DO GANHO DE MASON\n\n`;
    text += `Equação Geral do Ganho de Mason:\n`;
    text += `$$T(s) = \\frac{C(s)}{R(s)} = \\frac{\\sum_{k=1}^N P_k \\Delta_k}{\\Delta}$$\n\n`;

    text += `### 1. Caminhos Diretos ($P_k$)\n`;
    forwardPaths.forEach((p, idx) => {
      text += `* **Caminho $P_${idx + 1}$**: ${p.nodes.join(' → ')}\n`;
      text += `  Ganho: $P_${idx + 1} = ${ratToLatex(p.gain)}$\n`;
    });

    text += `\n### 2. Laços de Realimentação Individuais ($L_i$)\n`;
    loops.forEach((lp, idx) => {
      text += `* **Laço $L_${idx + 1}$**: ${lp.nodes.join(' → ')}\n`;
      text += `  Ganho: $L_${idx + 1} = ${ratToLatex(lp.gain)}$\n`;
    });

    text += `\n### 3. Análise de Laços Disjuntos (Que Não se Tocam)\n`;
    if (disjointPairs.length === 0) {
      text += `* Todos os pares de laços compartilham pelo menos um nó entre si ($L_i \\cap L_j \\neq \\emptyset$).\n`;
      text += `* Logo, o somatório de produtos de laços disjuntos é nulo: $\\sum L_i L_j = 0$.\n`;
    } else {
      disjointPairs.forEach((dp, idx) => {
        text += `* **Par Disjunto ${idx + 1}**: $L_${dp.loops[0]} \\cdot L_${dp.loops[1]} = ${ratToLatex(dp.gain)}$\n`;
      });
    }

    text += `\n### 4. Cálculo do Determinante do Grafo ($\\Delta$)\n`;
    text += `$$\\Delta = 1 - \\sum L_i + \\sum (L_i L_j)_{disj} - \\dots$$\n`;
    const loopSumLatex = loops.map(lp => `(${ratToLatex(lp.gain)})`).join(' + ');
    text += `$$\\Delta = 1 - [${loopSumLatex}] = ${ratToLatex(delta)}$$\n\n`;

    text += `### 5. Cálculo dos Cofatores ($\\Delta_k$)\n`;
    forwardPaths.forEach((p, idx) => {
      text += `* **Cofator $\\Delta_${idx + 1}$** (laços que não tocam $P_${idx + 1}$): $\\Delta_${idx + 1} = ${ratToLatex(cofactors[idx] || { num: [1], den: [1] })}$\n`;
    });

    text += `\n### 6. Função de Transferência Equivalente Final $T(s)$\n`;
    text += `$$T(s) = \\frac{C(s)}{R(s)} = ${ratToLatex(totalT)}$$\n`;

    return text;
  };

  const handleCopyMemorial = async () => {
    try {
      await navigator.clipboard.writeText(generateFullMemorialText());
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        marginTop: '24px',
        background: '#090d1a',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '16px'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 800 }}>
            🎯 Dedução Passo a Passo Completa — Regra do Ganho de Mason
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Memorial analítico rigoroso demonstrando cada etapa matemática até a função de transferência final
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="filter-btn"
            onClick={() => setExpanded(prev => !prev)}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            {expanded ? '▲ Recolher Memorial' : '▼ Expandir Memorial Completo'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyMemorial}
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'rgba(16, 185, 129, 0.2)' : undefined,
              borderColor: copied ? '#10b981' : undefined
            }}
          >
            {copied ? '✓ Memorial Copiado!' : '📋 Copiar Memorial Completo'}
          </button>
        </div>
      </div>

      {/* Caixa de Destaque da Função de Transferência Global */}
      <div
        style={{
          margin: '20px 0',
          textAlign: 'center',
          padding: '20px',
          background: '#040712',
          borderRadius: '10px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 4px 20px rgba(56, 189, 248, 0.08)'
        }}
      >
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
          FUNÇÃO DE TRANSFERÊNCIA GLOBAL REDUZIDA T(s) = C(s) / R(s):
        </div>
        <MathView math={`T(s) = \\frac{C(s)}{R(s)} = \\mathbf{${ratToLatex(totalT)}}`} block />
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* PASSO 1 */}
          <div style={{ background: '#070b16', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900 }}>
                1
              </span>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)', fontWeight: 700 }}>
                Identificação dos Caminhos Diretos ($P_k$)
              </h4>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Um caminho direto é qualquer trajetória contínua que parte do nó de entrada $R(s)$ e chega ao nó de saída $C(s)$ sem cruzar nenhum nó mais de uma vez.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {forwardPaths.map((p, idx) => (
                <div key={idx} style={{ background: '#0a0f1f', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                  <div style={{ fontSize: '0.86rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '4px' }}>
                    Caminho Direto $P_{idx + 1}$:
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Trajetória dos Nós: <code style={{ color: '#e2e8f0' }}>{p.nodes.join(' ➔ ')}</code>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                    Ganho: <MathView math={`P_{${idx + 1}} = ${ratToLatex(p.gain)}`} inline />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PASSO 2 */}
          <div style={{ background: '#070b16', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ background: '#a855f7', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900 }}>
                2
              </span>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)', fontWeight: 700 }}>
                Identificação de Todos os Laços Individuais ($L_i$)
              </h4>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Um laço de realimentação é um ciclo fechado que começa e termina no mesmo nó sem repetir nós intermediários. O sinal $(-)$ ou $(+)$ da realimentação é incorporado ao ganho do laço.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {loops.map((lp, idx) => (
                <div key={idx} style={{ background: '#0a0f1f', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <div style={{ fontSize: '0.86rem', color: '#a855f7', fontWeight: 700, marginBottom: '4px' }}>
                    Laço $L_{idx + 1}$:
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Ciclo: <code style={{ color: '#e2e8f0' }}>{lp.nodes.join(' ➔ ')}</code>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                    Ganho: <MathView math={`L_{${idx + 1}} = ${ratToLatex(lp.gain)}`} inline />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PASSO 3 */}
          <div style={{ background: '#070b16', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ background: '#f59e0b', color: '#000', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900 }}>
                3
              </span>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)', fontWeight: 700 }}>
                Análise de Laços Disjuntos (Que Não se Tocam)
              </h4>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Dois ou mais laços são ditos <b>disjuntos (non-touching)</b> se não compartilham nenhum nó ou somador em comum.
            </p>
            {disjointPairs.length === 0 ? (
              <div style={{ background: '#0a0f1f', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.84rem', color: '#fcd34d' }}>
                ℹ️ <b>Nenhum laço é disjunto:</b> Todos os pares de laços compartilham nós de passagem comuns entre si ($L_i \cap L_j \neq \emptyset$). Portanto:
                <div style={{ marginTop: '6px', textAlign: 'center' }}>
                  <MathView math="\sum_{i \neq j} (L_i L_j) = 0 \quad \text{e} \quad \sum (L_i L_j L_k) = 0" inline />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {disjointPairs.map((dp, idx) => (
                  <div key={idx} style={{ background: '#0a0f1f', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ fontSize: '0.86rem', color: '#f59e0b', fontWeight: 700 }}>
                      Par Disjunto: $L_{dp.loops[0]}$ e $L_{dp.loops[1]}$
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text)', marginTop: '4px' }}>
                      Produto dos Ganhos: <MathView math={`L_{${dp.loops[0]}} \\cdot L_{${dp.loops[1]}} = ${ratToLatex(dp.gain)}`} inline />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PASSO 4 */}
          <div style={{ background: '#070b16', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ background: '#10b981', color: '#000', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900 }}>
                4
              </span>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)', fontWeight: 700 }}>
                Cálculo do Determinante do Grafo ($\Delta$)
              </h4>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              O determinante da regra de Mason representa o denominador do sistema em malha fechada e é calculado por:
            </p>
            <div style={{ background: '#0a0f1f', padding: '14px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <MathView math="\Delta = 1 - \sum L_i + \sum (L_i L_j)_{\text{disjuntos}} - \sum (L_i L_j L_k)_{\text{disjuntos}} + \dots" block />
              <div style={{ margin: '10px 0 6px 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Substituindo os laços com seus respectivos sinais:
              </div>
              <MathView math={`\\Delta = \\mathbf{${ratToLatex(delta)}}`} block />
            </div>
          </div>

          {/* PASSO 5 */}
          <div style={{ background: '#070b16', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ background: '#38bdf8', color: '#000', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900 }}>
                5
              </span>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)', fontWeight: 700 }}>
                Cálculo dos Cofatores ($\Delta_k$)
              </h4>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              O cofator $\Delta_k$ é o determinante $\Delta$ calculado excluindo todos os laços que tocam o caminho direto $P_k$.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {forwardPaths.map((p, idx) => (
                <div key={idx} style={{ background: '#0a0f1f', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 600 }}>
                    Cofator $\Delta_{idx + 1}$ correspondente a $P_{idx + 1}$:
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Como $P_{idx + 1}$ toca todos os laços de realimentação, nenhum laço permanece ativo:
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 700 }}>
                    <MathView math={`\\Delta_{${idx + 1}} = ${ratToLatex(cofactors[idx] || { num: [1], den: [1] })}`} inline />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PASSO 6 */}
          <div style={{ background: '#070b16', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900 }}>
                6
              </span>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)', fontWeight: 700 }}>
                Aplicação da Fórmula Geral do Ganho de Mason
              </h4>
            </div>
            <div style={{ background: '#0a0f1f', padding: '16px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <MathView math="T(s) = \frac{C(s)}{R(s)} = \frac{\sum_{k=1}^N P_k \Delta_k}{\Delta} = \frac{P_1 \Delta_1 + P_2 \Delta_2 + \dots}{\Delta}" block />
              <div style={{ margin: '12px 0 6px 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Substituindo o numerador e o denominador deduzidos:
              </div>
              <MathView math={`T(s) = \\frac{C(s)}{R(s)} = \\mathbf{${ratToLatex(totalT)}}`} block />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
