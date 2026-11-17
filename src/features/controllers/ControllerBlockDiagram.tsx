'use client';

import React from 'react';
import { MathView } from '@/components/MathView';

interface ControllerBlockDiagramProps {
  title?: string;
  showControllerBlock?: boolean;
  controllerLabel?: string;
  controllerLatex?: string;
  plantLatex: string;
  feedbackLatex?: string;
  inputLabel?: string;
  outputLabel?: string;
}

export const ControllerBlockDiagram: React.FC<ControllerBlockDiagramProps> = ({
  title = 'Diagrama de Blocos em Malha Fechada (Referência do Exercício)',
  showControllerBlock = true,
  controllerLabel = '',
  controllerLatex = '',
  plantLatex,
  feedbackLatex = 'H(s) = 1',
  inputLabel = 'R(s)',
  outputLabel = 'C(s)'
}) => {
  return (
    <div
      style={{
        background: 'var(--code-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px',
        padding: '1.1rem 1.25rem',
        overflowX: 'auto'
      }}
    >
      <div
        style={{
          fontSize: '0.73rem',
          fontWeight: 700,
          color: 'var(--primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '0.85rem'
        }}
      >
        {title}
      </div>

      <div
        style={{
          minWidth: showControllerBlock ? '580px' : '380px',
          display: 'flex',
          justifyContent: 'center',
          padding: '0.75rem 0 0.35rem 0'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'flex-start' }}>
          {/* Entrada R(s) + Seta para o Somador (alinhada ao centro vertical da malha direta) */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: '66px' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                color: 'var(--text)',
                marginRight: '6px'
              }}
            >
              {inputLabel}
            </span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--success)'
                }}
              >
                +
              </span>
              <svg width="42" height="16" viewBox="0 0 42 16" style={{ width: '42px', height: '16px', display: 'block' }}>
                <line x1="0" y1="8" x2="34" y2="8" stroke="var(--text)" strokeWidth="2" />
                <polygon points="33,4 41,8 33,12" fill="var(--text)" />
              </svg>
            </div>
          </div>

          {/* Container Central da Malha (do centro do Σ até o ponto de derivação) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            {/* Ramo Direto: Σ -> E(s) -> [Gc(s) -> U(s)] -> G(s) -> Ponto de Derivação */}
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '66px' }}>
              {/* Junção Somadora (34x34, centro horizontal em 17px da borda esquerda) */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    border: '2px solid var(--text)',
                    background: 'var(--card-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    color: 'var(--text)',
                    zIndex: 2
                  }}
                >
                  Σ
                </div>
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-18px',
                    left: '23px',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    color: 'var(--danger)'
                  }}
                >
                  −
                </span>
              </div>

              {/* Seta E(s) */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <span
                  style={{
                    position: 'absolute',
                    top: '-17px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)'
                  }}
                >
                  E(s)
                </span>
                <svg width="44" height="16" viewBox="0 0 44 16" style={{ width: '44px', height: '16px', display: 'block' }}>
                  <line x1="0" y1="8" x2="36" y2="8" stroke="var(--text)" strokeWidth="2" />
                  <polygon points="35,4 43,8 35,12" fill="var(--text)" />
                </svg>
              </div>

              {/* Bloco do Controlador Gc(s) + Seta U(s) */}
              {showControllerBlock && (
                <>
                  <div
                    style={{
                      background: 'var(--card-bg)',
                      border: '2px solid var(--primary)',
                      borderRadius: '7px',
                      padding: '0.45rem 0.9rem',
                      minWidth: '140px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.12)'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.69rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        marginBottom: '0.2rem',
                        textAlign: 'center'
                      }}
                    >
                      {controllerLabel}
                    </span>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                      <MathView math={controllerLatex} inline />
                    </div>
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <span
                      style={{
                        position: 'absolute',
                        top: '-17px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)'
                      }}
                    >
                      U(s)
                    </span>
                    <svg width="44" height="16" viewBox="0 0 44 16" style={{ width: '44px', height: '16px', display: 'block' }}>
                      <line x1="0" y1="8" x2="36" y2="8" stroke="var(--text)" strokeWidth="2" />
                      <polygon points="35,4 43,8 35,12" fill="var(--text)" />
                    </svg>
                  </div>
                </>
              )}

              {/* Bloco da Planta G(s) */}
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '2px solid var(--text-muted)',
                  borderRadius: '7px',
                  padding: '0.45rem 0.95rem',
                  minWidth: '130px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <span
                  style={{
                    fontSize: '0.69rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '0.2rem'
                  }}
                >
                  Planta G(s)
                </span>
                <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                  <MathView math={plantLatex} inline />
                </div>
              </div>

              {/* Segmento da saída até o ponto de derivação (centro do nó fica exatamente a 4px da borda direita) */}
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <svg width="24" height="16" viewBox="0 0 24 16" style={{ width: '24px', height: '16px', display: 'block' }}>
                  <line x1="0" y1="8" x2="20" y2="8" stroke="var(--text)" strokeWidth="2" />
                  <circle cx="20" cy="8" r="3.5" fill="var(--text)" />
                </svg>
              </div>
            </div>

            {/* Linha de Realimentação Ancorada Dinamicamente:
                - Borda esquerda em 17px (centro exato do círculo Σ de 34px)
                - Borda direita em 4px (centro exato do círculo de derivação) */}
            <div
              style={{
                position: 'relative',
                marginLeft: '16px',
                marginRight: '3px',
                height: '30px',
                borderLeft: '2px solid var(--text)',
                borderBottom: '2px solid var(--text)',
                borderRight: '2px solid var(--text)',
                borderBottomLeftRadius: '4px',
                borderBottomRightRadius: '4px',
                marginTop: '-16px'
              }}
            >
              {/* Prolongamento vertical à direita até tocar o ponto de derivação */}
              <div
                style={{
                  position: 'absolute',
                  right: '-2px',
                  top: '-17px',
                  width: '2px',
                  height: '18px',
                  background: 'var(--text)'
                }}
              />
              {/* Ponta de seta apontando para cima na base do Somador Σ */}
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                style={{ position: 'absolute', left: '-7px', top: '-2px', width: '12px', height: '10px', display: 'block' }}
              >
                <polygon points="6,0 11,9 1,9" fill="var(--text)" />
              </svg>
            </div>

            <div
              style={{
                textAlign: 'center',
                marginTop: '6px',
                fontSize: '0.73rem',
                fontWeight: 600,
                color: 'var(--text-muted)'
              }}
            >
              Realimentação Unitária Negativa: {feedbackLatex}
            </div>
          </div>

          {/* Seta final de saída até C(s) */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: '66px' }}>
            <svg width="32" height="16" viewBox="0 0 32 16" style={{ width: '32px', height: '16px', display: 'block' }}>
              <line x1="0" y1="8" x2="24" y2="8" stroke="var(--text)" strokeWidth="2" />
              <polygon points="23,4 31,8 23,12" fill="var(--text)" />
            </svg>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                color: 'var(--text)',
                marginLeft: '6px'
              }}
            >
              {outputLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
