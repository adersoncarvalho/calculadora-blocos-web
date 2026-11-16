'use client';

import React from 'react';
import { MathView } from '@/components/MathView';

interface ControllerBlockDiagramProps {
  controllerLabel: string;
  controllerLatex: string;
  plantLatex: string;
  feedbackLatex?: string;
  inputLabel?: string;
  outputLabel?: string;
}

export const ControllerBlockDiagram: React.FC<ControllerBlockDiagramProps> = ({
  controllerLabel,
  controllerLatex,
  plantLatex,
  feedbackLatex = 'H(s) = 1',
  inputLabel = 'R(s)',
  outputLabel = 'C(s)'
}) => {
  // Limpa prefixo "G_c(s) = " para exibição compacta dentro do bloco se muito longo, ou mantém integral
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
        Diagrama de Blocos em Malha Fechada (Referência do Exercício)
      </div>

      <div
        style={{
          minWidth: '640px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0.5rem 0'
        }}
      >
        {/* Linha Principal Direta (R(s) -> Somador -> Controlador -> Planta -> C(s)) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          {/* Entrada R(s) + Seta */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
              <svg width="44" height="16" viewBox="0 0 44 16">
                <line x1="0" y1="8" x2="36" y2="8" stroke="var(--text)" strokeWidth="2" />
                <polygon points="35,4 43,8 35,12" fill="var(--text)" />
              </svg>
            </div>
          </div>

          {/* Junção Somadora */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                color: 'var(--text)'
              }}
            >
              Σ
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: '-18px',
                left: '21px',
                fontSize: '0.85rem',
                fontWeight: 900,
                color: 'var(--danger)'
              }}
            >
              −
            </span>
          </div>

          {/* Seta E(s) */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
            <svg width="46" height="16" viewBox="0 0 46 16">
              <line x1="0" y1="8" x2="38" y2="8" stroke="var(--text)" strokeWidth="2" />
              <polygon points="37,4 45,8 37,12" fill="var(--text)" />
            </svg>
          </div>

          {/* Bloco do Controlador Gc(s) */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '2px solid var(--primary)',
              borderRadius: '7px',
              padding: '0.5rem 0.9rem',
              minWidth: '150px',
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
                marginBottom: '0.25rem',
                textAlign: 'center'
              }}
            >
              {controllerLabel}
            </span>
            <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
              <MathView math={controllerLatex} inline />
            </div>
          </div>

          {/* Seta U(s) */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
            <svg width="46" height="16" viewBox="0 0 46 16">
              <line x1="0" y1="8" x2="38" y2="8" stroke="var(--text)" strokeWidth="2" />
              <polygon points="37,4 45,8 37,12" fill="var(--text)" />
            </svg>
          </div>

          {/* Bloco da Planta G(s) */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '2px solid var(--text-muted)',
              borderRadius: '7px',
              padding: '0.5rem 0.95rem',
              minWidth: '140px',
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
                marginBottom: '0.25rem'
              }}
            >
              Planta G(s)
            </span>
            <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
              <MathView math={plantLatex} inline />
            </div>
          </div>

          {/* Seta de Saída C(s) com ponto de derivação */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg width="54" height="16" viewBox="0 0 54 16">
              <line x1="0" y1="8" x2="46" y2="8" stroke="var(--text)" strokeWidth="2" />
              <circle cx="22" cy="8" r="3.5" fill="var(--text)" />
              <polygon points="45,4 53,8 45,12" fill="var(--text)" />
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

        {/* Ramo de Realimentação Negativa */}
        <div
          style={{
            width: '502px',
            marginLeft: '-2px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <svg width="502" height="36" viewBox="0 0 502 36" style={{ overflow: 'visible' }}>
            {/* Sobe até o somador (esquerda) e desce do ponto de derivação (direita) */}
            <polyline
              points="482,-22 482,24 22,24 22,2"
              fill="none"
              stroke="var(--text)"
              strokeWidth="2"
            />
            <polygon points="18,4 22,-4 26,4" fill="var(--text)" />
          </svg>
          <span
            style={{
              marginTop: '-6px',
              fontSize: '0.73rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--code-bg)',
              padding: '0 8px'
            }}
          >
            Realimentação Unitária Negativa: {feedbackLatex}
          </span>
        </div>
      </div>
    </div>
  );
};
