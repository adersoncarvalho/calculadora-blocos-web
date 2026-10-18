'use client';

import React, { useState } from 'react';
import { MathView } from '@/components/MathView';
import { parseRatExpr } from '@/core/algebra/parser';
import { ratSub, ratIsZero } from '@/core/algebra/rational';

interface PracticeSectionProps {
  onBack: () => void;
  onNavigate?: (view: 'builder' | 'guide' | 'simulations') => void;
}

export const PracticeSection: React.FC<PracticeSectionProps> = ({ onBack, onNavigate }) => {
  const [level, setLevel] = useState<1 | 2 | 3>(1);

  // Nível 1 State
  const [l1Answer, setL1Answer] = useState<string | null>(null);
  const [l1Feedback, setL1Feedback] = useState<string | null>(null);

  // Nível 2 State
  const [l2Answer, setL2Answer] = useState<string | null>(null);
  const [l2Feedback, setL2Feedback] = useState<string | null>(null);

  // Nível 3 State
  const [l3Input, setL3Input] = useState<string>('');
  const [l3Result, setL3Result] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  const handleL1Check = (option: string) => {
    setL1Answer(option);
    if (option === 'feedback') {
      setL1Feedback('Correto! O ramo inferior forma um laço de realimentação fechado em torno da planta direta.');
    } else {
      setL1Feedback('Incorreto. Observe os sentidos das setas de fluxo de sinal e onde o laço se fecha.');
    }
  };

  const handleL2Check = (option: string) => {
    setL2Answer(option);
    if (option === 'int_loop') {
      setL2Feedback('Exato! Em laços aninhados, deve-se sempre fechar a malha interna mais isolada primeiro antes de resolver a malha externa.');
    } else {
      setL2Feedback('Atenção: A malha externa intercepta o sinal intermediário, violando a premissa de isolamento para redução direta.');
    }
  };

  const handleL3Verify = () => {
    if (!l3Input.trim()) return;
    try {
      // Exercício Nível 3: G(s) = 8 / (s + 2), realimentação unitária negativa H(s) = 1
      // T_ref(s) = 8 / (s + 10)
      const userRat = parseRatExpr(l3Input);
      const refRat = parseRatExpr('8/(s+10)');
      const diff = ratSub(userRat, refRat);

      if (ratIsZero(diff)) {
        setL3Result({
          isCorrect: true,
          message: 'Parabéns! Sua função de transferência é matematicamente equivalente à solução analítica exata.'
        });
      } else {
        setL3Result({
          isCorrect: false,
          message: 'Expressão divergente. Revise o desenvolvimento do MMC no denominador 1 + G(s)H(s).'
        });
      }
    } catch {
      setL3Result({
        isCorrect: false,
        message: 'Erro de sintaxe. Insira a expressão no formato fração, como: 8/(s+10).'
      });
    }
  };

  return (
    <section style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Barra Superior Dedicada */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '14px 20px',
          marginBottom: '24px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ⬅ Voltar à Página Principal
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--primary)', fontWeight: 800 }}>
              🧪 Laboratório & Modo de Prática Interativa
            </h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Exercícios em 3 níveis de autonomia com verificador algébrico independente de T(s)
            </p>
          </div>
        </div>

        {/* Links rápidos */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onNavigate && (
            <>
              <button
                type="button"
                className="filter-btn"
                onClick={() => onNavigate('guide')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                📖 Ver Guia Teórico
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => onNavigate('builder')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                🛠️ Ir para Construtor
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => onNavigate('simulations')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                📊 Ver 20 Simulações
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs de Seleção de Nível */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button
          type="button"
          className={`filter-btn ${level === 1 ? 'active' : ''}`}
          onClick={() => setLevel(1)}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          Nível 1 • Reconhecimento Topológico
        </button>
        <button
          type="button"
          className={`filter-btn ${level === 2 ? 'active' : ''}`}
          onClick={() => setLevel(2)}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          Nível 2 • Escolha Estratégica de Redução
        </button>
        <button
          type="button"
          className={`filter-btn ${level === 3 ? 'active' : ''}`}
          onClick={() => setLevel(3)}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          Nível 3 • Resolução Analítica com Verificador
        </button>
      </div>

      {/* Conteúdo do Exercício */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        }}
      >
        {/* Nível 1 */}
        {level === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', background: 'rgba(56,189,248,0.15)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Etapa Inicial
              </span>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text)', margin: 0 }}>
                Exercício 1: Identificação da Configuração
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Dado um sistema onde o sinal de saída <MathView math="C(s)" inline /> é medido através de um sensor <MathView math="H(s)" inline /> e realimentado no ponto de soma de entrada com sinal negativo (<MathView math="-" inline />), qual das fórmulas canônicas representa a redução direta?
            </p>

            <div style={{ margin: '18px 0', padding: '16px', background: 'var(--code-bg)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--card-border)' }}>
              <MathView math="T(s) = \\frac{G(s)}{1 + G(s)H(s)}" block />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className={`filter-btn ${l1Answer === 'cascade' ? 'active' : ''}`}
                onClick={() => handleL1Check('cascade')}
                style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.9rem' }}
              >
                A) Associação em Cascata / Série direta
              </button>
              <button
                type="button"
                className={`filter-btn ${l1Answer === 'parallel' ? 'active' : ''}`}
                onClick={() => handleL1Check('parallel')}
                style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.9rem' }}
              >
                B) Associação em Paralelo com ponto de soma aditivo
              </button>
              <button
                type="button"
                className={`filter-btn ${l1Answer === 'feedback' ? 'active' : ''}`}
                onClick={() => handleL1Check('feedback')}
                style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.9rem' }}
              >
                C) Realimentação Canônica em Malha Fechada Negativa
              </button>
            </div>

            {l1Feedback && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  background: l1Answer === 'feedback' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${l1Answer === 'feedback' ? 'var(--success)' : 'var(--danger)'}`,
                  color: 'var(--text)',
                  fontSize: '0.9rem'
                }}
              >
                {l1Feedback}
              </div>
            )}
          </div>
        )}

        {/* Nível 2 */}
        {level === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', background: 'rgba(234,179,8,0.15)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Intermediário
              </span>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text)', margin: 0 }}>
                Exercício 2: Ordem Estratégica de Redução em Sistemas Acoplados
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Considere um circuito que possui uma malha interna de realimentação local <MathView math="H_1(s)" inline /> em torno do bloco <MathView math="G_2(s)" inline />, e uma malha externa global <MathView math="H_2(s)" inline /> envolvendo todo o sistema. Qual deve ser o primeiro passo analítico?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className={`filter-btn ${l2Answer === 'ext_loop' ? 'active' : ''}`}
                onClick={() => handleL2Check('ext_loop')}
                style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.9rem' }}
              >
                A) Tentar fechar a malha externa primeiro, ignorando a conexão interna
              </button>
              <button
                type="button"
                className={`filter-btn ${l2Answer === 'int_loop' ? 'active' : ''}`}
                onClick={() => handleL2Check('int_loop')}
                style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.9rem' }}
              >
                B) Resolver a malha interna local <MathView math="\\frac{G_2}{1+G_2 H_1}" inline /> para transformá-la em um único bloco equivalente
              </button>
              <button
                type="button"
                className={`filter-btn ${l2Answer === 'multiply' ? 'active' : ''}`}
                onClick={() => handleL2Check('multiply')}
                style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.9rem' }}
              >
                C) Somar diretamente os blocos <MathView math="G_1 + G_2" inline /> sem considerar o nó somador
              </button>
            </div>

            {l2Feedback && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  background: l2Answer === 'int_loop' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${l2Answer === 'int_loop' ? 'var(--success)' : 'var(--danger)'}`,
                  color: 'var(--text)',
                  fontSize: '0.9rem'
                }}
              >
                {l2Feedback}
              </div>
            )}
          </div>
        )}

        {/* Nível 3 */}
        {level === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', background: 'rgba(34,197,94,0.15)', color: 'var(--success)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Desafio Avançado
              </span>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text)', margin: 0 }}>
                Exercício 3: Resolução Analítica com Verificador Algébrico Independente
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Dada a planta <MathView math="G(s) = \\frac{8}{s + 2}" inline /> em malha fechada com realimentação unitária negativa (<MathView math="H(s) = 1" inline />), calcule e insira a função de transferência equivalente <MathView math="T(s) = \\frac{C(s)}{R(s)}" inline />:
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input-text"
                value={l3Input}
                onChange={e => setL3Input(e.target.value)}
                placeholder="Ex: 8/(s+10)"
                style={{
                  flex: 1,
                  minWidth: '260px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'var(--code-bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem'
                }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleL3Verify}
                style={{ padding: '10px 22px', fontSize: '0.9rem' }}
              >
                ✓ Verificar Equivalência Algébrica
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowHint(prev => !prev)}
                style={{ padding: '10px 14px', fontSize: '0.86rem' }}
              >
                💡 {showHint ? 'Ocultar Dica' : 'Ver Dica Gradual'}
              </button>
            </div>

            {showHint && (
              <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '6px', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                <b>Dica:</b> Desenvolva o denominador: <MathView math="1 + G(s)H(s) = 1 + \\frac{8}{s+2} = \\frac{(s+2) + 8}{s+2} = \\frac{s+10}{s+2}" inline />. Ao dividir <MathView math="G(s)" inline />, os denominadores <MathView math="s+2" inline /> cancelam-se.
              </div>
            )}

            {l3Result && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  background: l3Result.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${l3Result.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
                  color: 'var(--text)',
                  fontSize: '0.9rem'
                }}
              >
                {l3Result.message}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
