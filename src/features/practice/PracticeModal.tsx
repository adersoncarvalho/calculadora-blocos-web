'use client';

import React, { useState } from 'react';
import { MathView } from '@/components/MathView';
import { parseRatExpr } from '@/core/algebra/parser';
import { ratSub, ratIsZero, ratToLatex } from '@/core/algebra/rational';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null;

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 8, 17, 0.85)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.7)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--primary)' }}>
              🧪 Laboratório & Modo de Prática Interativa
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Exercícios em 3 níveis de autonomia com verificador algébrico independente
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 12px', cursor: 'pointer' }}
          >
            ✕ Fechar
          </button>
        </div>

        {/* Níveis Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            className={`filter-btn ${level === 1 ? 'active' : ''}`}
            onClick={() => setLevel(1)}
          >
            Nível 1 • Reconhecimento Topológico
          </button>
          <button
            type="button"
            className={`filter-btn ${level === 2 ? 'active' : ''}`}
            onClick={() => setLevel(2)}
          >
            Nível 2 • Escolha Estratégica
          </button>
          <button
            type="button"
            className={`filter-btn ${level === 3 ? 'active' : ''}`}
            onClick={() => setLevel(3)}
          >
            Nível 3 • Resolução Analítica
          </button>
        </div>

        {/* Nível 1 */}
        {level === 1 && (
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)' }}>
              Identificação da Configuração
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Dado um sistema onde o sinal de saída $C(s)$ é medido através de um sensor $H(s)$ e realimentado no ponto de soma de entrada com sinal negativo ($-$):
            </p>
            <div style={{ margin: '14px 0', padding: '12px', background: 'var(--code-bg)', borderRadius: '6px', textAlign: 'center' }}>
              <MathView math="T(s) = \frac{G(s)}{1 + G(s)H(s)}" block />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className={`filter-btn ${l1Answer === 'cascade' ? 'active' : ''}`}
                onClick={() => handleL1Check('cascade')}
                style={{ textAlign: 'left', padding: '10px 14px' }}
              >
                A) Associação em Cascata / Série
              </button>
              <button
                type="button"
                className={`filter-btn ${l1Answer === 'parallel' ? 'active' : ''}`}
                onClick={() => handleL1Check('parallel')}
                style={{ textAlign: 'left', padding: '10px 14px' }}
              >
                B) Associação em Paralelo / Ponto de Soma
              </button>
              <button
                type="button"
                className={`filter-btn ${l1Answer === 'feedback' ? 'active' : ''}`}
                onClick={() => handleL1Check('feedback')}
                style={{ textAlign: 'left', padding: '10px 14px' }}
              >
                C) Realimentação em Malha Fechada Negativa
              </button>
            </div>
            {l1Feedback && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', background: l1Answer === 'feedback' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${l1Answer === 'feedback' ? 'var(--success)' : 'var(--danger)'}`, color: 'var(--text)', fontSize: '0.86rem' }}>
                {l1Feedback}
              </div>
            )}
          </div>
        )}

        {/* Nível 2 */}
        {level === 2 && (
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)' }}>
              Ordem de Redução em Sistemas Acoplados
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Considere um circuito que possui uma malha interna fechada em torno do atuador e uma malha externa fechada com o sensor final. Qual deve ser o primeiro passo?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className={`filter-btn ${l2Answer === 'ext_loop' ? 'active' : ''}`}
                onClick={() => handleL2Check('ext_loop')}
                style={{ textAlign: 'left', padding: '10px 14px' }}
              >
                A) Fechar a malha externa primeiro ignorando o laço intermediário
              </button>
              <button
                type="button"
                className={`filter-btn ${l2Answer === 'int_loop' ? 'active' : ''}`}
                onClick={() => handleL2Check('int_loop')}
                style={{ textAlign: 'left', padding: '10px 14px' }}
              >
                B) Reduzir primeiro a malha fechada interna canônica
              </button>
              <button
                type="button"
                className={`filter-btn ${l2Answer === 'parallel' ? 'active' : ''}`}
                onClick={() => handleL2Check('parallel')}
                style={{ textAlign: 'left', padding: '10px 14px' }}
              >
                C) Mover o somador de entrada para depois do atuador
              </button>
            </div>
            {l2Feedback && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', background: l2Answer === 'int_loop' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${l2Answer === 'int_loop' ? 'var(--success)' : 'var(--danger)'}`, color: 'var(--text)', fontSize: '0.86rem' }}>
                {l2Feedback}
              </div>
            )}
          </div>
        )}

        {/* Nível 3 */}
        {level === 3 && (
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text)' }}>
              Resolução Analítica com Verificador Algébrico Independente
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Resolva a função de transferência equivalente para:
              <br />
              <b>Planta direta:</b> <MathView math="G(s) = \frac{8}{s + 2}" inline />
              <br />
              <b>Sensor de retorno:</b> Realimentação Negativa Unitária (<MathView math="H(s) = 1" inline />)
            </p>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--primary)', marginBottom: '6px' }}>
                Sua resposta simplificada T(s):
              </label>
              <input
                type="text"
                value={l3Input}
                onChange={e => setL3Input(e.target.value)}
                placeholder="Exemplo: 8/(s+10)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--code-bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="filter-btn active"
                  onClick={handleL3Verify}
                  style={{ padding: '8px 18px' }}
                >
                  ✓ Verificar Resposta
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowHint(!showHint)}
                  style={{ padding: '8px 14px' }}
                >
                  💡 {showHint ? 'Ocultar Dica' : 'Exibir Dica'}
                </button>
              </div>

              {showHint && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--code-bg)', borderLeft: '3px solid var(--primary)', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Aplique a fórmula canônica <MathView math="T(s) = \frac{G}{1 + GH}" inline />. O MMC no denominador é (s+2), resultando em (s+2) + 8 = s+10.
                </div>
              )}

              {l3Result && (
                <div style={{ marginTop: '16px', padding: '14px', borderRadius: '6px', background: l3Result.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${l3Result.isCorrect ? 'var(--success)' : 'var(--danger)'}`, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 700, color: l3Result.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                    {l3Result.isCorrect ? '✓ Equivalência Algébrica Confirmada!' : '✗ Incorreto'}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    {l3Result.message}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
