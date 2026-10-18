'use client';

import React, { useState, useMemo } from 'react';
import { PRESETS_DATA, PresetDef } from './presetsData';
import { PresetSvgView } from './PresetSvgView';
import { MathView } from '@/components/MathView';
import { parseRatExpr } from '@/core/algebra/parser';
import {
  ratMul,
  ratAdd,
  ratFeedback,
  ratToLatex,
  ratToCompactParts,
  RatFunc
} from '@/core/algebra/rational';
import { polyToLatex } from '@/core/algebra/polynomial';
import { analyzeTransferFunction, StabilityReport } from '@/core/analysis/stability';

export const CalculatorSection: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('mf_padrao');
  const preset: PresetDef = PRESETS_DATA[selectedKey] || PRESETS_DATA['mf_padrao'];

  const [formValues, setFormValues] = useState<Record<string, string>>({
    ...preset.defaultValues
  });

  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedScilab, setCopiedScilab] = useState(false);

  // Troca de preset
  const handleSelectPreset = (key: string) => {
    setSelectedKey(key);
    const newPreset = PRESETS_DATA[key];
    if (newPreset) {
      setFormValues({ ...newPreset.defaultValues });
    }
  };

  const handleInputChange = (fieldId: string, val: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: val }));
  };

  // Cálculo analítico e memorial passo a passo
  const calculation = useMemo(() => {
    try {
      let finalT: RatFunc;
      const steps: { title: string; desc: string; math: string }[] = [];

      if (selectedKey === 'mf_padrao') {
        const G = parseRatExpr(formValues.G || 'G');
        const H = parseRatExpr(formValues.H || '1');
        const isNeg = (formValues.sinal || '').includes('Negativa');
        const signChar = isNeg ? '-' : '+';
        const denOp = isNeg ? '+' : '-';

        finalT = ratFeedback(G, H, signChar as '+' | '-');

        steps.push({
          title: 'Etapa 1: Equacionamento Nodal da Malha Fechada',
          desc: `O sinal de erro no ponto de soma é E(s) = R(s) ${denOp === '+' ? '-' : '+'} H(s)·C(s), e a saída da planta é C(s) = G(s)·E(s):`,
          math: `C(s) = G(s) \\cdot \\left[ R(s) ${denOp === '+' ? '-' : '+'} H(s)C(s) \\right]`
        });

        steps.push({
          title: 'Etapa 2: Isolamento da Saída C(s) e Fator Comum',
          desc: 'Agrupam-se os termos em C(s) no membro esquerdo da equação:',
          math: `C(s) \\cdot \\left[ 1 ${denOp} G(s)H(s) \\right] = G(s) R(s) \\implies T(s) = \\frac{C(s)}{R(s)} = \\frac{G(s)}{1 ${denOp} G(s)H(s)}`
        });

        steps.push({
          title: 'Etapa 3: Substituição Racional com Mínimo Múltiplo Comum (MMC)',
          desc: 'Substituindo G(s) e H(s), desenvolvendo o MMC no denominador e simplificando fatores comuns:',
          math: `T(s) = \\frac{${ratToLatex(G)}}{1 ${denOp} \\left(${ratToLatex(G)}\\right)\\left(${ratToLatex(H)}\\right)} = ${ratToLatex(finalT)}`
        });
      } else if (selectedKey === 'cascata_dupla') {
        const G1 = parseRatExpr(formValues.G1 || 'G1');
        const G2 = parseRatExpr(formValues.G2 || 'G2');
        finalT = ratMul(G1, G2);

        steps.push({
          title: 'Etapa 1: Associação em Série / Cascata',
          desc: 'A saída do primeiro bloco é a entrada do segundo bloco. Multiplicam-se numeradores e denominadores:',
          math: `G_{\\text{eq}}(s) = G_1(s) \\cdot G_2(s) = \\left(${ratToLatex(G1)}\\right) \\cdot \\left(${ratToLatex(G2)}\\right) = ${ratToLatex(finalT)}`
        });
      } else if (selectedKey === 'paralelo') {
        const G1 = parseRatExpr(formValues.G1 || 'G1');
        const G2 = parseRatExpr(formValues.G2 || 'G2');
        const isSub = (formValues.op || '').includes('Subtração');
        finalT = isSub ? ratAdd(G1, parseRatExpr(`-(${formValues.G2 || 'G2'})`)) : ratAdd(G1, G2);

        steps.push({
          title: 'Etapa 1: Associação em Paralelo com Denominador Comum (MMC)',
          desc: `Os dois ramos convergem no somador com operação ${isSub ? 'subtrativa (-)' : 'aditiva (+)'}:`,
          math: `G_{\\text{eq}}(s) = G_1(s) ${isSub ? '-' : '+'} G_2(s) = \\left(${ratToLatex(G1)}\\right) ${isSub ? '-' : '+'} \\left(${ratToLatex(G2)}\\right) = ${ratToLatex(finalT)}`
        });
      } else if (selectedKey === 'exemplo1') {
        const G1 = parseRatExpr(formValues.G1 || '10');
        const G2 = parseRatExpr(formValues.G2 || '1/s');
        const G3 = parseRatExpr(formValues.G3 || '2/(s+5)');
        finalT = ratMul(ratMul(G1, G2), G3);

        steps.push({
          title: 'Etapa 1: Multiplicação Contínua dos 3 Estágios',
          desc: 'Ganho proporcional K, integrador e filtro de 1ª ordem associados em série:',
          math: `T(s) = G_1(s) \\cdot G_2(s) \\cdot G_3(s) = ${ratToLatex(G1)} \\cdot \\left(${ratToLatex(G2)}\\right) \\cdot \\left(${ratToLatex(G3)}\\right) = ${ratToLatex(finalT)}`
        });
      } else {
        const G1 = parseRatExpr(formValues.G1 || '1');
        const G2 = parseRatExpr(formValues.G2 || '1');
        finalT = ratMul(G1, G2);
        steps.push({
          title: 'Etapa 1: Redução Canônica',
          desc: 'Cálculo simbólico da função de transferência equivalente:',
          math: `T(s) = ${ratToLatex(finalT)}`
        });
      }

      const stability = analyzeTransferFunction(finalT);

      // Gerador de script para Scilab
      const parts = ratToCompactParts(finalT);
      const scilabScript = `// Script de Verificação no Scilab (EEL6005)
s = %s;
num = ${parts.num};
den = ${parts.den};
T = syslin('c', num, den);
disp("Função de Transferência Equivalente T(s):");
disp(T);
disp("Polos do Sistema:");
disp(roots(den));
disp("Zeros do Sistema:");
disp(roots(num));
// Resposta ao Degrau
clf();
t = 0:0.01:10;
plot(t, csim('step', t, T));
xtitle("Resposta ao Degrau Unitário T(s)", "Tempo (s)", "Amplitude");
xgrid();`;

      return {
        success: true,
        finalT,
        steps,
        stability,
        scilabScript
      };
    } catch {
      return {
        success: false,
        error: 'Erro ao processar as expressões matemáticas. Verifique a sintaxe.'
      };
    }
  }, [selectedKey, formValues]);

  const copyLatex = () => {
    if (calculation.success && calculation.finalT) {
      navigator.clipboard.writeText(`T(s) = ${ratToLatex(calculation.finalT)}`);
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    }
  };

  const copyScilab = () => {
    if (calculation.success && calculation.scilabScript) {
      navigator.clipboard.writeText(calculation.scilabScript);
      setCopiedScilab(true);
      setTimeout(() => setCopiedScilab(false), 2000);
    }
  };

  return (
    <section className="calculator-section" style={{ marginTop: '24px' }}>
      {/* Seletor de Topologias Canônicas */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '8px' }}>
          Selecione a Configuração do Circuito:
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.values(PRESETS_DATA).map(p => (
            <button
              key={p.key}
              type="button"
              className={`filter-btn ${p.key === selectedKey ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p.key)}
              style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              {p.badge}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: Diagrama + Entradas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Lado Esquerdo: Diagrama Esquemático SVG */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text)', margin: '0 0 12px 0' }}>
            📐 Diagrama de Blocos da Topologia
          </h3>
          <PresetSvgView presetKey={selectedKey} values={formValues} />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: '1.45' }}>
            {preset.desc}
          </p>
        </div>

        {/* Lado Direito: Parâmetros e Funções de Transferência */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '18px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text)', margin: '0 0 14px 0' }}>
            ✏️ Parâmetros das Funções de Transferência
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {preset.fields.map(field => (
              <div key={field.id}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                  {field.label}:
                </label>
                {field.type === 'select' ? (
                  <select
                    className="input-select"
                    value={formValues[field.id] || field.default}
                    onChange={e => handleInputChange(field.id, e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                  >
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-text"
                    value={formValues[field.id] || ''}
                    onChange={e => handleInputChange(field.id, e.target.value)}
                    placeholder={field.default}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', fontFamily: 'monospace' }}
                  />
                )}
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  {field.helpText}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resultados, Memorial Analítico e Análise Dinâmica */}
      {calculation.success && calculation.finalT && (
        <div style={{ marginTop: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>
              🎯 Função de Transferência Equivalente T(s) = C(s)/R(s)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={copyLatex}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                {copiedLatex ? '✓ LaTeX Copiado!' : '📋 Copiar LaTeX'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={copyScilab}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                {copiedScilab ? '✓ Scilab Copiado!' : '📋 Copiar Script Scilab'}
              </button>
            </div>
          </div>

          <div style={{ margin: '20px 0', textAlign: 'center', padding: '16px', background: 'var(--code-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <MathView math={`T(s) = \\mathbf{${ratToLatex(calculation.finalT)}}`} block />
          </div>

          {/* Cards de Métricas e Estabilidade */}
          {calculation.stability && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status de Estabilidade</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: calculation.stability.isStable ? 'var(--success)' : 'var(--danger)', marginTop: '4px' }}>
                  {calculation.stability.stabilityText}
                </div>
              </div>

              <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ordem / Tipo do Sistema</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                  Ordem {calculation.stability.order} • Tipo {calculation.stability.systemType}
                </div>
              </div>

              <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ganho DC Estático (s → 0)</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                  {calculation.stability.dcGain !== null ? calculation.stability.dcGain : '∞ (Integrador presente)'}
                </div>
              </div>

              {calculation.stability.secondOrderParams && (
                <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Regime de 2ª Ordem</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                    {calculation.stability.secondOrderParams.regime} (ζ = {calculation.stability.secondOrderParams.zeta}, ωn = {calculation.stability.secondOrderParams.wn} rad/s)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Memorial Analítico Passo a Passo */}
          <div>
            <h4 style={{ fontSize: '0.96rem', color: 'var(--text)', marginBottom: '12px' }}>
              📝 Memorial Analítico Passo a Passo (Resolução Algébrica Formal):
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {calculation.steps?.map((st, idx) => (
                <div
                  key={idx}
                  style={{
                    borderLeft: '3px solid var(--primary)',
                    background: 'rgba(2, 6, 23, 0.5)',
                    padding: '12px 16px',
                    borderRadius: '0 8px 8px 0'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)' }}>
                    {st.title}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
                    {st.desc}
                  </div>
                  <div style={{ background: 'var(--code-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                    <MathView math={st.math} block />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Script de exportação para Scilab */}
          <details style={{ marginTop: '20px', background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px 14px' }}>
            <summary style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
              💻 Ver Script Executável para Scilab / Xcos
            </summary>
            <pre style={{ margin: '10px 0 0 0', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {calculation.scilabScript}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
};
