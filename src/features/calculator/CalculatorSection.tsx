'use client';

import React, { useState, useMemo } from 'react';
import { PRESETS_DATA, PresetDef } from './presetsData';
import { PresetSvgView } from './PresetSvgView';
import { MathView } from '@/components/MathView';
import { InteractiveMathView, InteractiveMathLine } from '@/components/InteractiveMathView';
import { parseRatExpr } from '@/core/algebra/parser';
import {
  ratMul,
  ratAdd,
  ratFeedback,
  ratToLatex,
  ratToCompactParts,
  RatFunc
} from '@/core/algebra/rational';
import { polyToLatex, toUnivariateArr, trimUni } from '@/core/algebra/polynomial';
import { analyzeTransferFunction, StabilityReport } from '@/core/analysis/stability';
import {
  buildCascataInteractiveLines,
  buildParaleloInteractiveLines,
  buildFeedbackInteractiveLines
} from './stepMathExplanations';

interface CalculatorSectionProps {
  onOpenPractice?: () => void;
  onOpenBuilder?: () => void;
  onOpenGuide?: () => void;
}

export const CalculatorSection: React.FC<CalculatorSectionProps> = ({
  onOpenPractice,
  onOpenBuilder,
  onOpenGuide
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const preset: PresetDef | null = selectedKey ? PRESETS_DATA[selectedKey] || null : null;

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);

  const [copiedLatex, setCopiedLatex] = useState(false);
  const [copiedScilab, setCopiedScilab] = useState(false);

  // Troca de preset
  const handleSelectPreset = (key: string) => {
    setSelectedKey(key);
    setActiveStageIdx(0);
    const newPreset = PRESETS_DATA[key];
    if (newPreset) {
      setFormValues({ ...newPreset.defaultValues });
    }
  };

  const handleInputChange = (fieldId: string, val: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: val }));
  };

  const handleResetDefaults = () => {
    if (preset) {
      setFormValues({ ...preset.defaultValues });
      setActiveStageIdx(0);
    }
  };

  // Cálculo analítico e memorial passo a passo enriquecido com lupinha interativa
  const calculation = useMemo(() => {
    if (!selectedKey || !preset) {
      return { success: false, error: null, steps: [], finalT: null, stability: null, scilabScript: '', stagesCount: 1 };
    }

    try {
      let finalT: RatFunc;
      const steps: {
        title: string;
        desc: string;
        interactiveLines: InteractiveMathLine[];
        stageSvgIdx?: number;
      }[] = [];
      let stagesCount = 2;

      if (selectedKey === 'mf_padrao') {
        const G = parseRatExpr(formValues.G || '10/(s+2)');
        const H = parseRatExpr(formValues.H || '1');
        const isNeg = (formValues.sinal || '').includes('Negativa');
        const signChar = isNeg ? '-' : '+';
        const denOp = isNeg ? '+' : '-';

        finalT = ratFeedback(G, H, signChar as '+' | '-');
        stagesCount = 4;

        // Etapa 1
        steps.push({
          title: 'Etapa 1: Equacionamento Nodal da Malha Fechada',
          desc: `O sinal de erro no ponto de soma é E(s) = R(s) ${denOp === '+' ? '-' : '+'} H(s)·C(s), e a saída da planta é C(s) = G(s)·E(s):`,
          stageSvgIdx: 0,
          interactiveLines: [
            {
              math: `E(s) = R(s) ${denOp === '+' ? '-' : '+'} H(s) \\cdot C(s)`,
              explanationTitle: 'Equação Nodal do Ponto de Soma',
              explanationHtml: `<ol>
                <li><b>Ponto de Soma:</b> O sinal resultante $E(s)$ é a soma algébrica das entradas do somador. A referência entra com sinal positivo e o ramo de realimentação entra com sinal <b>${denOp === '+' ? '-' : '+'}</b>.</li>
                <li><b>Sinal Realimentado:</b> Tomado da saída $C(s)$ e ponderado pelo sensor $H(s)$, valendo $H(s) \\cdot C(s)$.</li>
              </ol>`
            },
            {
              math: `C(s) = G(s) \\cdot E(s) = G(s) \\cdot \\left[ R(s) ${denOp === '+' ? '-' : '+'} H(s)C(s) \\right]`,
              explanationTitle: 'Substituição do Sinal de Erro no Caminho Direto',
              explanationHtml: `<ol>
                <li><b>Ação da Planta:</b> A saída $C(s)$ é obtida multiplicando o bloco direto $G(s)$ pelo sinal de erro $E(s)$.</li>
                <li>Substituindo $E(s)$ diretamente na equação da saída, eliminamos a variável interna intermediária.</li>
              </ol>`
            }
          ]
        });

        // Etapa 2
        steps.push({
          title: 'Etapa 2: Isolamento da Saída C(s) e Dedução da Equação Canônica',
          desc: 'Agrupam-se os termos em C(s) no membro esquerdo da equação e coloca-se a saída em evidência:',
          stageSvgIdx: 1,
          interactiveLines: [
            {
              math: `C(s) ${denOp === '+' ? '+' : '-'} G(s)H(s)C(s) = G(s)R(s)`,
              explanationTitle: 'Transposição de Termos para o Membro Esquerdo',
              explanationHtml: `<ol>
                <li>Ao transpor o termo $G(s)H(s)C(s)$ do membro direito para o esquerdo da igualdade, seu sinal inverte de ${denOp === '+' ? '-' : '+'} para <b>${denOp}</b>.</li>
              </ol>`
            },
            {
              math: `C(s) \\cdot \\left[ 1 ${denOp} G(s)H(s) \\right] = G(s) R(s)`,
              explanationTitle: 'Fatoração por Evidência da Saída C(s)',
              explanationHtml: `<ol>
                <li>Colocando $C(s)$ em evidência: $C(s) \\cdot 1 + C(s) \\cdot [${denOp} G(s)H(s)] = C(s) \\cdot [1 ${denOp} G(s)H(s)]$.</li>
              </ol>`
            },
            {
              math: `T(s) = \\frac{C(s)}{R(s)} = \\frac{G(s)}{1 ${denOp} G(s)H(s)}`,
              explanationTitle: 'Fórmula Canônica de Malha Fechada',
              explanationHtml: `<ol>
                <li>Passando o fator entre colchetes $[1 ${denOp} G(s)H(s)]$ dividindo, obtém-se a razão de transferência equivalente $\\frac{C(s)}{R(s)}$.</li>
              </ol>`
            }
          ]
        });

        // Etapa 3
        const feedbackLines = buildFeedbackInteractiveLines(
          'T(s) = \\frac{C(s)}{R(s)}',
          G,
          H,
          signChar as '+' | '-',
          finalT
        );
        steps.push({
          title: 'Etapa 3: Resolução Racional Passo a Passo com Mínimo Múltiplo Comum (MMC)',
          desc: 'Substituição das frações de G(s) e H(s), desenvolvimento do MMC no denominador e cancelamento de fatores comuns:',
          stageSvgIdx: 2,
          interactiveLines: feedbackLines
        });

      } else if (selectedKey === 'cascata_dupla') {
        const G1 = parseRatExpr(formValues.G1 || '4/(s+1)');
        const G2 = parseRatExpr(formValues.G2 || '5/(s+2)');
        finalT = ratMul(G1, G2);
        stagesCount = 2;

        const cascataLines = buildCascataInteractiveLines(
          'G_{\\text{eq}}(s)',
          G1,
          G2,
          finalT
        );

        steps.push({
          title: 'Etapa 1: Equacionamento Nodal do Sinal Intermediário X1(s)',
          desc: 'A saída do primeiro estágio G1(s) alimenta diretamente a entrada do segundo estágio G2(s):',
          stageSvgIdx: 0,
          interactiveLines: [
            {
              math: `X_1(s) = G_1(s) \\cdot R(s)`,
              explanationTitle: 'Sinal Intermediário X1(s)',
              explanationHtml: `<ol>
                <li>O sinal $X_1(s)$ na saída do primeiro bloco é o produto de $G_1(s)$ pelo sinal de referência $R(s)$.</li>
              </ol>`
            },
            {
              math: `C(s) = G_2(s) \\cdot X_1(s) = G_2(s) \\cdot G_1(s) \\cdot R(s)`,
              explanationTitle: 'Saída Final C(s) por Substituição Direta',
              explanationHtml: `<ol>
                <li>Substituindo $X_1(s)$ na entrada de $G_2(s)$, obtemos a saída $C(s)$ em função direta de $R(s)$.</li>
              </ol>`
            }
          ]
        });

        steps.push({
          title: 'Etapa 2: Multiplicação Algébrica Polinomial Passo a Passo',
          desc: 'Multiplicação de numeradores e denominadores e expansão da forma polinomial final:',
          stageSvgIdx: 1,
          interactiveLines: cascataLines
        });

      } else if (selectedKey === 'paralelo') {
        const G1 = parseRatExpr(formValues.G1 || '6/(s+2)');
        const G2 = parseRatExpr(formValues.G2 || '3/(s+4)');
        const isSub = (formValues.op || '').includes('Subtração');
        const opChar = isSub ? '-' : '+';
        finalT = isSub ? ratAdd(G1, parseRatExpr(`-(${formValues.G2 || '3/(s+4)'})`)) : ratAdd(G1, G2);
        stagesCount = 2;

        const parLines = buildParaleloInteractiveLines(
          'G_{\\text{eq}}(s)',
          G1,
          G2,
          opChar,
          finalT
        );

        steps.push({
          title: 'Etapa 1: Equacionamento dos Ramos Paralelos X1(s) e X2(s)',
          desc: 'O mesmo sinal R(s) alimenta simultaneamente ambos os canais que convergem no somador:',
          stageSvgIdx: 0,
          interactiveLines: [
            {
              math: `X_1(s) = G_1(s) \\cdot R(s), \\qquad X_2(s) = G_2(s) \\cdot R(s)`,
              explanationTitle: 'Sinais nos Dois Ramos Paralelos',
              explanationHtml: `<ol>
                <li>O ponto de ramificação duplica o sinal $R(s)$ sem perdas ou divisões de energia para os dois blocos.</li>
              </ol>`
            },
            {
              math: `C(s) = X_1(s) ${opChar} X_2(s) = \\left[ G_1(s) ${opChar} G_2(s) \\right] \\cdot R(s)`,
              explanationTitle: 'Combinação no Ponto de Soma',
              explanationHtml: `<ol>
                <li>Colocando $R(s)$ em evidência, a função de transferência equivalente é a soma/subtração algébrica direta dos dois blocos.</li>
              </ol>`
            }
          ]
        });

        steps.push({
          title: 'Etapa 2: Mínimo Múltiplo Comum (MMC) e Simplificação Algébrica',
          desc: 'Resolução das frações algébricas com denominador comum e soma dos polinômios numeradores:',
          stageSvgIdx: 1,
          interactiveLines: parLines
        });

      } else if (selectedKey === 'exemplo1') {
        const G1 = parseRatExpr(formValues.G1 || '10');
        const G2 = parseRatExpr(formValues.G2 || '1/s');
        const G3 = parseRatExpr(formValues.G3 || '2/(s+5)');
        finalT = ratMul(ratMul(G1, G2), G3);
        stagesCount = 2;

        steps.push({
          title: 'Etapa 1: Equacionamento dos Três Estágios em Série',
          desc: 'Ganho proporcional K=10, integrador 1/s e dinâmica de 1ª ordem 2/(s+5):',
          stageSvgIdx: 0,
          interactiveLines: [
            {
              math: `X_1(s) = 10 \\cdot R(s), \\qquad X_2(s) = \\frac{1}{s} \\cdot X_1(s) = \\frac{10}{s} R(s)`,
              explanationTitle: 'Equacionamento dos Estágios 1 e 2',
              explanationHtml: `<ol>
                <li>O primeiro estágio amplifica a referência por $K=10$. O segundo estágio integra no tempo (multiplica por $1/s$).</li>
              </ol>`
            },
            {
              math: `C(s) = \\left(\\frac{2}{s+5}\\right) X_2(s) = \\left(\\frac{2}{s+5}\\right) \\cdot \\left(\\frac{10}{s}\\right) R(s)`,
              explanationTitle: 'Ação do Filtro de 1ª Ordem na Saída',
              explanationHtml: `<ol>
                <li>O terceiro estágio adiciona um polo estável em $s = -5$ e ganho $2$.</li>
              </ol>`
            }
          ]
        });

        steps.push({
          title: 'Etapa 2: Produto Polinomial Consolidado',
          desc: 'Multiplicação dos 3 termos em cascata:',
          stageSvgIdx: 1,
          interactiveLines: [
            {
              math: `T(s) = 10 \\cdot \\left(\\frac{1}{s}\\right) \\cdot \\left(\\frac{2}{s+5}\\right) = \\frac{20}{s(s+5)} = ${ratToLatex(finalT)}`,
              explanationTitle: 'Função de Transferência de Malha Aberta',
              explanationHtml: `<ol>
                <li>Numerador: $10 \\cdot 1 \\cdot 2 = 20$.</li>
                <li>Denominador: $s \\cdot (s+5) = s^2 + 5s$.</li>
                <li>Sistema do Tipo 1 (um polo na origem) e de 2ª ordem estável.</li>
              </ol>`
            }
          ]
        });

      } else if (selectedKey === 'exemplo2') {
        const G1 = parseRatExpr(formValues.G1 || '(s+3)/(s+1)');
        const G2 = parseRatExpr(formValues.G2 || '2/(s+4)');
        finalT = ratMul(G1, G2);
        stagesCount = 2;

        const cascataLines = buildCascataInteractiveLines('T(s)', G1, G2, finalT);

        steps.push({
          title: 'Etapa 1: Compensador por Avanço de Fase (Lead) em Cascata com a Planta',
          desc: 'O compensador introduz zero em s=-3 e polo em s=-1:',
          stageSvgIdx: 0,
          interactiveLines: [
            {
              math: `T(s) = G_{\\text{lead}}(s) \\cdot G_{\\text{planta}}(s) = \\left(\\frac{s+3}{s+1}\\right) \\cdot \\left(\\frac{2}{s+4}\\right)`,
              explanationTitle: 'Associação Lead-Planta',
              explanationHtml: `<ol>
                <li>Compensador: $\\frac{s+3}{s+1}$ (avanço de fase para aumentar margem de fase e estabilidade relativa).</li>
                <li>Planta: $\\frac{2}{s+4}$ (polo em $s=-4$).</li>
              </ol>`
            }
          ]
        });

        steps.push({
          title: 'Etapa 2: Multiplicação Algébrica e Polinômio Final',
          desc: 'Desenvolvimento das multiplicações distributivas nos polinômios:',
          stageSvgIdx: 1,
          interactiveLines: cascataLines
        });

      } else {
        // proposto1: duas malhas de realimentação combinadas
        const G1 = parseRatExpr(formValues.G1 || '2/(s+1)');
        const G2 = parseRatExpr(formValues.G2 || '3/(s+2)');
        const H1 = parseRatExpr(formValues.H1 || '1');
        const H2 = parseRatExpr(formValues.H2 || '2');

        const innerLoop = ratFeedback(G2, H1, '-');
        const cascInner = ratMul(G1, innerLoop);
        finalT = ratFeedback(cascInner, H2, '-');
        stagesCount = 3;

        steps.push({
          title: 'Etapa 1: Redução da Malha Fechada Interna G2 / (1 + G2·H1)',
          desc: 'Elimina-se o primeiro laço local de realimentação negativa em torno de G2(s):',
          stageSvgIdx: 1,
          interactiveLines: buildFeedbackInteractiveLines('T_{\\text{interna}}(s)', G2, H1, '-', innerLoop)
        });

        steps.push({
          title: 'Etapa 2: Associação em Cascata do Bloco Direto G1(s) com a Malha Interna',
          desc: 'Multiplicam-se os estágios em série ao longo do ramo direto:',
          stageSvgIdx: 1,
          interactiveLines: buildCascataInteractiveLines('G_{\\text{direto}}(s)', G1, innerLoop, cascInner)
        });

        steps.push({
          title: 'Etapa 3: Redução da Malha Global Externa com Sensor H2(s)',
          desc: 'Fecha-se o laço de realimentação completo com o sensor H2(s):',
          stageSvgIdx: 2,
          interactiveLines: buildFeedbackInteractiveLines('T(s) = \\frac{C(s)}{R(s)}', cascInner, H2, '-', finalT)
        });
      }

      // Análise de Estabilidade e Dinâmica
      let stability: StabilityReport | null = null;
      try {
        stability = analyzeTransferFunction(finalT);
      } catch {
        stability = null;
      }

      // Script para Scilab / Xcos
      const uN = trimUni(toUnivariateArr(finalT.num));
      const uD = trimUni(toUnivariateArr(finalT.den));
      const numStr = uN.join(' ');
      const denStr = uD.join(' ');

      const scilabScript = `// Script de Verificação no Scilab
// Gerado automaticamente pela Calculadora de Redução em Diagrama de Blocos
s = %s;
num = poly([${numStr}], 's', 'coeff');
den = poly([${denStr}], 's', 'coeff');
T = syslin('c', num, den);

disp("=== FUNÇÃO DE TRANSFERÊNCIA T(s) ===");
disp(T);

// Polos e Zeros
p = poles(T);
z = roots(num);
disp("Polos do sistema:");
disp(p);
disp("Zeros do sistema:");
disp(z);

// Resposta ao Degrau Unitário
clf();
t = 0:0.01:10;
plot(t, csim('step', t, T));
xtitle("Resposta ao Degrau Unitário T(s)", "Tempo (s)", "Amplitude C(t)");
xgrid();
`;

      return {
        success: true,
        error: null,
        steps,
        finalT,
        stability,
        scilabScript,
        stagesCount
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: msg,
        steps: [],
        finalT: null,
        stability: null,
        scilabScript: '',
        stagesCount: 1
      };
    }
  }, [selectedKey, preset, formValues]);

  const copyLatex = () => {
    if (calculation.finalT) {
      navigator.clipboard.writeText(`T(s) = ${ratToLatex(calculation.finalT)}`);
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    }
  };

  const copyScilab = () => {
    if (calculation.scilabScript) {
      navigator.clipboard.writeText(calculation.scilabScript);
      setCopiedScilab(true);
      setTimeout(() => setCopiedScilab(false), 2000);
    }
  };

  // Se nenhuma topologia foi selecionada ainda, mostra o Catálogo de Categorias / Hubs
  if (!selectedKey || !preset) {
    return (
      <section className="calculator-section" style={{ marginTop: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', margin: '0 0 8px 0', fontWeight: 800 }}>
            Selecione uma Topologia ou Categoria de Estudo
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
            Escolha uma configuração canônica abaixo para abrir o diagrama interativo, editar os polinômios e acompanhar o memorial analítico passo a passo:
          </p>
        </div>

        {/* Grade de Categorias & Exemplos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Card 1: Topologias Canônicas */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>📐</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(56,189,248,0.15)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  3 Modelos
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px 0', fontWeight: 700 }}>
                Topologias Canônicas Fundamentais
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Os três blocos elementares da teoria de controle clássico: malha fechada clássica G/(1±GH), associação em série e ramos em paralelo.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleSelectPreset('mf_padrao')}
                style={{ textAlign: 'left', padding: '9px 12px', fontSize: '0.84rem' }}
              >
                ▶ Canônica G/(1±GH)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleSelectPreset('cascata_dupla')}
                style={{ textAlign: 'left', padding: '9px 12px', fontSize: '0.84rem' }}
              >
                ▶ Série / Cascata G1 · G2
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleSelectPreset('paralelo')}
                style={{ textAlign: 'left', padding: '9px 12px', fontSize: '0.84rem' }}
              >
                ▶ Paralelo G1 ± G2
              </button>
            </div>
          </div>

          {/* Card 2: Exemplos das Aulas */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>🎓</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(56,189,248,0.15)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Aulas Práticas
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px 0', fontWeight: 700 }}>
                Exemplos Didáticos das Aulas
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Circuitos com cascatas triplas de polos, integradores, compensadores lead e plantas de segunda ordem com resolução formal.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleSelectPreset('exemplo1')}
                style={{ textAlign: 'left', padding: '9px 12px', fontSize: '0.84rem' }}
              >
                ▶ Aula 05 • Exemplo 1 (Três Blocos em Série)
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleSelectPreset('exemplo2')}
                style={{ textAlign: 'left', padding: '9px 12px', fontSize: '0.84rem' }}
              >
                ▶ Aula 05 • Exemplo 2 (Compensador Lead & Planta)
              </button>
            </div>
          </div>

          {/* Card 3: Exercícios Propostos */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚡</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Desafios
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px 0', fontWeight: 700 }}>
                Exercícios Propostos & Malhas Múltiplas
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Diagramas avançados contendo laços internos de realimentação sobrepostos, múltiplos somadores e sensores externos.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="filter-btn"
                onClick={() => handleSelectPreset('proposto1')}
                style={{ textAlign: 'left', padding: '9px 12px', fontSize: '0.84rem' }}
              >
                ▶ Proposto 1 (Malhas Duplas Sobrepostas)
              </button>
            </div>
          </div>

          {/* Card 4: Laboratório de Prática */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>🧪</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  3 Níveis
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px 0', fontWeight: 700 }}>
                Modo de Prática Interativo
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Treine suas habilidades resolvendo exercícios com verificador de equivalência algébrica real, pontuação e dicas passo a passo.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={onOpenPractice}
              style={{ padding: '10px 14px', fontSize: '0.88rem', width: '100%' }}
            >
              🧪 Entrar no Laboratório ▶
            </button>
          </div>

          {/* Card 5: Construtor Livre */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>🛠️</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(234,179,8,0.15)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Lápis & Blocos
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px 0', fontWeight: 700 }}>
                Criar Meu Próprio Diagrama
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                Monte qualquer circuito arbitrário com blocos G(s), somadores e ramos de realimentação, calculando a redução formal via Regra de Mason.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={onOpenBuilder}
              style={{ padding: '10px 14px', fontSize: '0.88rem', width: '100%' }}
            >
              🛠️ Abrir Construtor Interativo ▶
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Se uma topologia foi selecionada, exibe a Calculadora com Diagrama, Barra de Evolução, Inputs, T(s) e Memorial
  return (
    <section className="calculator-section" style={{ marginTop: '20px' }}>
      {/* Barra Superior de Navegação do Modelo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '12px 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedKey(null)}
            style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: 700 }}
          >
            ⬅ Voltar às Categorias
          </button>
          <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--primary)' }}>
            Configuração: {preset.title}
          </span>
        </div>

        {/* Seletor rápido de outras topologias */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.values(PRESETS_DATA).map(p => (
            <button
              key={p.key}
              type="button"
              className={`filter-btn ${p.key === selectedKey ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p.key)}
              style={{ padding: '5px 10px', borderRadius: '5px', fontSize: '0.78rem' }}
            >
              {p.badge}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: Diagrama + Entradas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Lado Esquerdo: Diagrama Esquemático SVG com Barra de Evolução por Etapas */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
              📐 Diagrama Esquemático da Topologia
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 600 }}>
              {preset.badge}
            </span>
          </div>

          {/* Barra de Navegação das Etapas de Redução do Diagrama */}
          {calculation.stagesCount > 1 && (
            <div className="step-nav-bar" style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px', fontWeight: 700 }}>
                Ver evolução do diagrama:
              </span>
              {Array.from({ length: calculation.stagesCount }).map((_, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  className={`step-nav-btn ${sIdx === activeStageIdx ? 'active' : ''}`}
                  onClick={() => setActiveStageIdx(sIdx)}
                >
                  {sIdx === 0 ? '0. Original' : `Etapa ${sIdx}`}
                </button>
              ))}
            </div>
          )}

          <PresetSvgView
            presetKey={selectedKey}
            values={formValues}
            stageIndex={activeStageIdx}
          />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: '1.45' }}>
            {preset.desc}
          </p>
        </div>

        {/* Lado Direito: Parâmetros e Funções de Transferência */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
              ✏️ Parâmetros das Funções de Transferência
            </h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetDefaults}
              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
              title="Restaurar valores padrão do exercício"
            >
              ↺ Restaurar Padrões
            </button>
          </div>

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
                    value={formValues[field.id] !== undefined ? formValues[field.id] : field.default}
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

          {/* Memorial Analítico Passo a Passo com Linhas Clicáveis e Lupinhas Interativas */}
          <div>
            <h4 style={{ fontSize: '0.96rem', color: 'var(--text)', marginBottom: '12px' }}>
              📝 Memorial Analítico Passo a Passo (Resolução Algébrica Formal com Detalhamento):
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {calculation.steps?.map((st, idx) => (
                <div
                  key={idx}
                  className="step-box"
                  style={{
                    borderLeft: '3px solid var(--primary)',
                    background: 'rgba(5, 8, 17, 0.6)',
                    padding: '14px 18px',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)' }}>
                      {st.title}
                    </div>
                    {st.stageSvgIdx !== undefined && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setActiveStageIdx(st.stageSvgIdx ?? 0);
                          const el = document.querySelector('.calculator-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                        title="Ver diagrama esquemático correspondente a esta etapa no painel acima"
                      >
                        🔍 Ver Diagrama desta Etapa
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '0.84rem', color: 'var(--text)', margin: '4px 0 10px 0', lineHeight: '1.5' }}>
                    {st.desc}
                  </div>

                  {/* Renderizador de linhas interativas com lupinha e explicações */}
                  <InteractiveMathView lines={st.interactiveLines} stepTitle={st.title} />
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
