'use client';

import React, { useState } from 'react';
import { MathView } from '@/components/MathView';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [topic, setTopic] = useState<'rules' | 'mmc' | 'second_order' | 'stability'>('rules');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 8, 17, 0.88)',
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
          maxWidth: '860px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--primary)' }}>
              📖 Guia Didático e Compêndio Teórico
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Fundamentação analítica clássica: Norman S. Nise e Katsuhiko Ogata
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 14px', cursor: 'pointer' }}
          >
            ✕ Fechar
          </button>
        </div>

        {/* Tópicos */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            type="button"
            className={`filter-btn ${topic === 'rules' ? 'active' : ''}`}
            onClick={() => setTopic('rules')}
          >
            1. Álgebra de Blocos Canônica
          </button>
          <button
            type="button"
            className={`filter-btn ${topic === 'mmc' ? 'active' : ''}`}
            onClick={() => setTopic('mmc')}
          >
            2. Álgebra & MMC Racional
          </button>
          <button
            type="button"
            className={`filter-btn ${topic === 'second_order' ? 'active' : ''}`}
            onClick={() => setTopic('second_order')}
          >
            3. Sistemas de 2ª Ordem (ωn, ζ)
          </button>
          <button
            type="button"
            className={`filter-btn ${topic === 'stability' ? 'active' : ''}`}
            onClick={() => setTopic('stability')}
          >
            4. Estabilidade & Routh-Hurwitz
          </button>
        </div>

        {/* Conteúdo */}
        {topic === 'rules' && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.6' }}>
            <h3 style={{ color: 'var(--primary)' }}>Regras Fundamentais de Álgebra de Diagramas de Blocos</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              A álgebra de blocos pressupõe <b>condições de isolamento unilateral</b> (o bloco posterior não drena corrente nem carrega o bloco anterior).
            </p>
            <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li style={{ marginBottom: '10px' }}>
                <b>Associação em Cascata / Série:</b>
                <MathView math="G_{\text{eq}}(s) = G_1(s) \cdot G_2(s)" block />
              </li>
              <li style={{ marginBottom: '10px' }}>
                <b>Associação em Paralelo / Soma:</b>
                <MathView math="G_{\text{eq}}(s) = G_1(s) \pm G_2(s) = \frac{N_1 D_2 \pm N_2 D_1}{D_1 D_2}" block />
              </li>
              <li style={{ marginBottom: '10px' }}>
                <b>Malha Fechada / Realimentação:</b>
                <MathView math="T(s) = \frac{C(s)}{R(s)} = \frac{G(s)}{1 \pm G(s)H(s)}" block />
                Sinal $(+)$ no denominador para realimentação negativa; sinal $(-)$ para positiva regenerativa.
              </li>
              <li>
                <b>Transposição de Somadores e Ramificações:</b>
                Ao deslocar um nó somador para depois de um bloco $G(s)$, insere-se $G(s)$ no ramo aditivo. Ao deslocar uma ramificação para depois de um bloco $G(s)$, divide-se o ramo por $G(s)$ (multiplica-se por $1/G(s)$).
              </li>
            </ol>
          </div>
        )}

        {topic === 'mmc' && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.6' }}>
            <h3 style={{ color: 'var(--primary)' }}>Desenvolvimento do Mínimo Múltiplo Comum (MMC) Polinomial</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Em malha fechada clássica, a fração composta possui denominadores em G(s) = N<sub>G</sub> / D<sub>G</sub> e H(s) = N<sub>H</sub> / D<sub>H</sub>:
            </p>
            <div style={{ background: 'var(--code-bg)', padding: '14px', borderRadius: '8px', margin: '14px 0' }}>
              <MathView math="1 + G(s)H(s) = 1 + \frac{N_G N_H}{D_G D_H} = \frac{D_G D_H + N_G N_H}{D_G D_H}" block />
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              Ao dividir G(s) por essa expressão:
            </p>
            <div style={{ background: 'var(--code-bg)', padding: '14px', borderRadius: '8px', margin: '14px 0' }}>
              <MathView math="T(s) = \frac{\frac{N_G}{D_G}}{\frac{D_G D_H + N_G N_H}{D_G D_H}} = \frac{N_G D_H}{D_G D_H + N_G N_H}" block />
            </div>
          </div>
        )}

        {topic === 'second_order' && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.6' }}>
            <h3 style={{ color: 'var(--primary)' }}>Parâmetros Canônicos de 2ª Ordem</h3>
            <div style={{ background: 'var(--code-bg)', padding: '14px', borderRadius: '8px', margin: '14px 0' }}>
              <MathView math="T(s) = \frac{\omega_n^2}{s^2 + 2\zeta\omega_n s + \omega_n^2}" block />
            </div>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li><b>Frequência natural não amortecida (&omega;<sub>n</sub>):</b> &omega;<sub>n</sub> = &radic;(a<sub>0</sub>)</li>
              <li><b>Coeficiente de amortecimento (&zeta;):</b> &zeta; = a<sub>1</sub> / (2&omega;<sub>n</sub>)</li>
              <li><b>Regimes de amortecimento:</b> Subamortecido (0 &lt; &zeta; &lt; 1), Criticamente amortecido (&zeta; = 1), Sobreamortecido (&zeta; &gt; 1).</li>
              <li><b>Sobressinal Percentual (%OS):</b> %OS canônico baseado em &zeta;</li>
              <li><b>Tempo de acomodação (2%):</b> T<sub>s</sub> &approx; 4 / (&zeta;&omega;<sub>n</sub>)</li>
            </ul>
          </div>
        )}

        {topic === 'stability' && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.6' }}>
            <h3 style={{ color: 'var(--primary)' }}>Estabilidade e Critério de Routh-Hurwitz</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Um sistema linear contínuo é assintoticamente estável se, e somente se, todos os polos da malha fechada estiverem situados estritamente no <b>Semiplano Esquerdo (SPE)</b> do plano complexo s (Re&#123;s&#125; &lt; 0).
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              O <b>Critério de Routh-Hurwitz</b> permite avaliar se existem raízes no Semiplano Direito (SPD) sem necessidade de fatorar explicitamente polinômios de alta ordem, bastando verificar a alternância de sinais na primeira coluna da tabela de Routh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
