'use client';

import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onOpenShortcuts: () => void;
  onOpenBuilder: () => void;
  onOpenGuide: () => void;
  onOpenPractice: () => void;
  onOpenSimulations: () => void;
  onOpenControllers: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenShortcuts,
  onOpenBuilder,
  onOpenGuide,
  onOpenPractice,
  onOpenSimulations,
  onOpenControllers
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
          <a
            href="/?view=builder"
            className="btn-open-guide"
            style={{ textDecoration: 'none' }}
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onOpenBuilder();
              }
            }}
            aria-label="Criar Meu Próprio Diagrama no Construtor Livre"
          >
            🛠️ Construtor Livre
          </a>
          <a
            href="/?view=guide"
            className="btn-open-guide"
            style={{ textDecoration: 'none' }}
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onOpenGuide();
              }
            }}
            aria-label="Abrir Guia Didático Completo"
          >
            📖 Guia Didático
          </a>
          <a
            href="/?view=practice"
            className="btn-open-guide btn-practice-trigger"
            style={{ textDecoration: 'none' }}
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onOpenPractice();
              }
            }}
            aria-label="Abrir Modo de Prática com 3 Níveis"
          >
            🧪 Modo de Prática
          </a>
          <a
            href="/?view=simulations"
            className="btn-open-guide"
            style={{ textDecoration: 'none' }}
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onOpenSimulations();
              }
            }}
            aria-label="Abrir Painel com 20 Simulações Reais"
          >
            📊 20 Simulações
          </a>
          <a
            href="/?view=controllers"
            className="btn-open-guide btn-highlight-builder"
            style={{ textDecoration: 'none' }}
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                onOpenControllers();
              }
            }}
            aria-label="Abrir Laboratório dos 5 Controladores Principais"
          >
            🎛️ Controladores
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
