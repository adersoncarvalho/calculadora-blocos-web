'use client';

import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onOpenShortcuts: () => void;
  onOpenBuilder: () => void;
  onOpenGuide: () => void;
  onOpenPractice: () => void;
  onOpenSimulations: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenShortcuts,
  onOpenBuilder,
  onOpenGuide,
  onOpenPractice,
  onOpenSimulations
}) => {
  return (
    <header id="mainPageHeader">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)' }}>
            Calculadora de Redução em Diagrama de Blocos
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Modelagem, Álgebra de Blocos e Domínio de Laplace
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-shortcuts-helper"
            onClick={onOpenShortcuts}
            title="Visualizar atalhos de teclado (Pressione '?')"
            aria-label="Atalhos de Teclado"
          >
            ⌨️ Atalhos (?)
          </button>
          <button
            type="button"
            className="btn-open-guide btn-highlight-builder"
            onClick={onOpenBuilder}
            aria-label="Criar Meu Próprio Diagrama no Construtor Livre"
          >
            🛠️ Construtor Livre
          </button>
          <button
            type="button"
            className="btn-open-guide"
            onClick={onOpenGuide}
            aria-label="Abrir Guia Didático Completo"
          >
            📖 Guia Didático
          </button>
          <button
            type="button"
            className="btn-open-guide btn-practice-trigger"
            onClick={onOpenPractice}
            aria-label="Abrir Modo de Prática com 3 Níveis"
          >
            🧪 Modo de Prática
          </button>
          <button
            type="button"
            className="btn-open-guide"
            onClick={onOpenSimulations}
            aria-label="Abrir Painel com 20 Simulações Reais"
          >
            📊 20 Simulações
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
