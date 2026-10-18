'use client';

import React, { useState } from 'react';
import { MathView } from '@/components/MathView';

interface GuideSectionProps {
  onBack: () => void;
  onNavigate?: (view: 'builder' | 'practice' | 'simulations') => void;
}

export const GuideSection: React.FC<GuideSectionProps> = ({ onBack, onNavigate }) => {
  const [topic, setTopic] = useState<'rules' | 'mmc' | 'second_order' | 'stability'>('rules');

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
              📖 Guia Didático e Compêndio Teórico
            </h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Fundamentação analítica clássica: Norman S. Nise e Katsuhiko Ogata
            </p>
          </div>
        </div>

        {/* Links rápidos para outras ferramentas */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onNavigate && (
            <>
              <button
                type="button"
                className="filter-btn"
                onClick={() => onNavigate('practice')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                🧪 Ir para Laboratório
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

      {/* Seletor de Tópicos */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button
          type="button"
          className={`filter-btn ${topic === 'rules' ? 'active' : ''}`}
          onClick={() => setTopic('rules')}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          1. Álgebra de Blocos Canônica
        </button>
        <button
          type="button"
          className={`filter-btn ${topic === 'mmc' ? 'active' : ''}`}
          onClick={() => setTopic('mmc')}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          2. Álgebra & MMC Racional
        </button>
        <button
          type="button"
          className={`filter-btn ${topic === 'second_order' ? 'active' : ''}`}
          onClick={() => setTopic('second_order')}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          3. Sistemas de 2ª Ordem (\omega_n, \zeta)
        </button>
        <button
          type="button"
          className={`filter-btn ${topic === 'stability' ? 'active' : ''}`}
          onClick={() => setTopic('stability')}
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          4. Estabilidade & Routh-Hurwitz
        </button>
      </div>

      {/* Conteúdo Principal do Guia */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        }}
      >
        {topic === 'rules' && (
          <div style={{ fontSize: '0.94rem', color: 'var(--text)', lineHeight: '1.65' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '1.3rem', margin: '0 0 12px 0' }}>
              Regras Fundamentais de Álgebra de Diagramas de Blocos
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              A álgebra de blocos pressupõe <b>condições de isolamento unilateral</b> (o bloco posterior não drena corrente nem carrega o bloco anterior, preservando as funções de transferência individuais).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 8px 0' }}>1. Associação em Cascata / Série</h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  A saída do primeiro bloco alimenta diretamente o segundo:
                </p>
                <div style={{ margin: '12px 0', padding: '10px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '6px' }}>
                  <MathView math="G_{\\text{eq}}(s) = G_1(s) \\cdot G_2(s)" block />
                </div>
              </div>

              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 8px 0' }}>2. Associação em Paralelo / Ponto de Soma</h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Dois ramos compartilham a mesma entrada e convergem em um somador:
                </p>
                <div style={{ margin: '12px 0', padding: '10px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '6px' }}>
                  <MathView math="G_{\\text{eq}}(s) = G_1(s) \\pm G_2(s) = \\frac{N_1 D_2 \\pm N_2 D_1}{D_1 D_2}" block />
                </div>
              </div>

              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 8px 0' }}>3. Malha Fechada / Realimentação Canônica</h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  A saída realimentada com sensor H(s) entra no comparador com sinal (-):
                </p>
                <div style={{ margin: '12px 0', padding: '10px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '6px' }}>
                  <MathView math="T(s) = \\frac{C(s)}{R(s)} = \\frac{G(s)}{1 \\pm G(s)H(s)}" block />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Sinal (+) no denominador para feedback negativo; sinal (-) para feedback positivo regenerativo.
                </span>
              </div>

              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '18px' }}>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 8px 0' }}>4. Transposição de Somadores e Ramificações</h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  • <b>Mover somador para depois de G(s):</b> multiplica-se a entrada aditiva por G(s).<br />
                  • <b>Mover ramificação para depois de G(s):</b> divide-se o ramo por G(s) (multiplica por 1/G(s)).<br />
                  • <b>Mover ramificação para antes de G(s):</b> multiplica-se o ramo por G(s).
                </p>
              </div>
            </div>
          </div>
        )}

        {topic === 'mmc' && (
          <div style={{ fontSize: '0.94rem', color: 'var(--text)', lineHeight: '1.65' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '1.3rem', margin: '0 0 12px 0' }}>
              Desenvolvimento do Mínimo Múltiplo Comum (MMC) Polinomial
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Em malha fechada clássica, as funções de transferência direta e de retorno são dadas por frações polinomiais:
            </p>
            <div style={{ background: 'var(--code-bg)', padding: '16px', borderRadius: '8px', margin: '16px 0', textAlign: 'center' }}>
              <MathView math="G(s) = \\frac{N_G(s)}{D_G(s)}, \\quad H(s) = \\frac{N_H(s)}{D_H(s)}" block />
            </div>

            <h4 style={{ color: 'var(--primary)', marginTop: '20px' }}>Passo a Passo Algébrico:</h4>
            <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li style={{ marginBottom: '12px' }}>
                <b>Formação do denominador comum:</b>
                <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '6px', margin: '8px 0' }}>
                  <MathView math="1 + G(s)H(s) = 1 + \\frac{N_G N_H}{D_G D_H} = \\frac{D_G(s)D_H(s) + N_G(s)N_H(s)}{D_G(s)D_H(s)}" block />
                </div>
              </li>
              <li style={{ marginBottom: '12px' }}>
                <b>Divisão das frações racionais:</b>
                <div style={{ background: 'var(--code-bg)', padding: '12px', borderRadius: '6px', margin: '8px 0' }}>
                  <MathView math="T(s) = \\frac{\\frac{N_G}{D_G}}{\\frac{D_G D_H + N_G N_H}{D_G D_H}} = \\frac{N_G(s) \\cdot D_H(s)}{D_G(s)D_H(s) + N_G(s)N_H(s)}" block />
                </div>
              </li>
              <li>
                <b>Simplificação por MDC:</b> Se o numerador e o denominador resultantes possuírem raízes ou fatores comuns, realiza-se o cancelamento exato via algoritmo de Euclides para evitar inflação artificial de ordem.
              </li>
            </ol>
          </div>
        )}

        {topic === 'second_order' && (
          <div style={{ fontSize: '0.94rem', color: 'var(--text)', lineHeight: '1.65' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '1.3rem', margin: '0 0 12px 0' }}>
              Parâmetros Canônicos de 2ª Ordem
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              A forma padrão canônica de um sistema de 2ª ordem no domínio de Laplace é expressa por:
            </p>
            <div style={{ background: 'var(--code-bg)', padding: '16px', borderRadius: '8px', margin: '16px 0', textAlign: 'center' }}>
              <MathView math="T(s) = \\frac{\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2}" block />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}>
                <b style={{ color: 'var(--primary)' }}>Frequência Natural (\omega_n):</b>
                <div style={{ margin: '6px 0' }}>
                  <MathView math="\\omega_n = \\sqrt{a_0}" inline />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Velocidade de oscilação intrínseca do sistema sem atrito.</span>
              </div>

              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}>
                <b style={{ color: 'var(--primary)' }}>Coeficiente de Amortecimento (\zeta):</b>
                <div style={{ margin: '6px 0' }}>
                  <MathView math="\\zeta = \\frac{a_1}{2 \\sqrt{a_0 \\cdot a_2}}" inline />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Governa o amortecimento das oscilações transitórias.</span>
              </div>

              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}>
                <b style={{ color: 'var(--primary)' }}>Sobressinal Máximo (%OS):</b>
                <div style={{ margin: '6px 0' }}>
                  <MathView math="\\%OS = 100 \\cdot e^{-\\frac{\\pi\\zeta}{\\sqrt{1-\\zeta^2}}}" inline />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Válido para regime subamortecido (0 &lt; \zeta &lt; 1).</span>
              </div>

              <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}>
                <b style={{ color: 'var(--primary)' }}>Tempo de Acomodação (2%):</b>
                <div style={{ margin: '6px 0' }}>
                  <MathView math="T_s \\approx \\frac{4}{\\zeta \\omega_n}" inline />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tempo necessário para a resposta permanecer dentro de ±2% do valor final.</span>
              </div>
            </div>
          </div>
        )}

        {topic === 'stability' && (
          <div style={{ fontSize: '0.94rem', color: 'var(--text)', lineHeight: '1.65' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '1.3rem', margin: '0 0 12px 0' }}>
              Estabilidade e Critério de Routh-Hurwitz
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Um sistema linear contínuo e invariante no tempo (LTI) é assintoticamente estável se, e somente se, todos os polos da sua função de transferência em malha fechada estiverem localizados estritamente no <b>Semiplano Esquerdo (SPE)</b> do plano complexo s:
            </p>
            <div style={{ background: 'var(--code-bg)', padding: '14px', borderRadius: '8px', margin: '14px 0', textAlign: 'center' }}>
              <MathView math="\\text{Re}\\{p_i\\} < 0, \\quad \\forall i" block />
            </div>

            <h4 style={{ color: 'var(--primary)', marginTop: '18px' }}>Tabela de Routh:</h4>
            <p style={{ color: 'var(--text-muted)' }}>
              O <b>Critério de Routh-Hurwitz</b> permite identificar a presença de polos instáveis no Semiplano Direito (SPD) sem a necessidade de calcular raízes numéricas.
              O número de mudanças de sinal na primeira coluna da matriz de Routh corresponde exatamente à quantidade de raízes com parte real positiva.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
