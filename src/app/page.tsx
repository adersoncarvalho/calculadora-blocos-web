'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { GuideModal } from '@/features/guide/GuideModal';
import { PracticeModal } from '@/features/practice/PracticeModal';
import { SimulationsGalleryModal } from '@/features/simulations/SimulationsGalleryModal';
import { CalculatorSection } from '@/features/calculator/CalculatorSection';
import { BuilderSection } from '@/features/builder/BuilderSection';

export default function HomePage() {
  const [view, setView] = useState<'home' | 'builder'>('home');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [showSimulations, setShowSimulations] = useState(false);

  // Escuta tecla '?' para atalhos e 'Esc' para fechar modais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowShortcuts(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowGuide(false);
        setShowPractice(false);
        setShowSimulations(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Transição para o Construtor Livre em tela dedicada no topo
  const handleOpenBuilder = () => {
    setView('builder');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleBackToHome = () => {
    setView('home');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Se o usuário está no modo Construtor Livre, abre direto no topo sem banners acumulados
  if (view === 'builder') {
    return (
      <main style={{ padding: '16px 20px', minHeight: '100vh' }}>
        <BuilderSection
          onBack={handleBackToHome}
          onOpenGuide={() => setShowGuide(true)}
        />

        {/* Modais Globais acessíveis do Construtor */}
        <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
        <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </main>
    );
  }

  return (
    <main style={{ padding: '16px 20px', minHeight: '100vh' }}>
      {/* Top Header Principal */}
      <Header
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenBuilder={handleOpenBuilder}
        onOpenGuide={() => setShowGuide(true)}
        onOpenPractice={() => setShowPractice(true)}
        onOpenSimulations={() => setShowSimulations(true)}
      />

      {/* Hero Banner Profissional */}
      <section className="hero-banner" id="heroBanner" style={{ marginTop: '16px' }}>
        <div className="hero-eyebrow">⚡ Engenharia de Controle & Automação • Domínio de Laplace</div>
        <h1 className="hero-title" style={{ fontSize: '1.9rem', fontWeight: 800, margin: '8px 0 12px 0' }}>
          Calculadora e Laboratório de Redução em Diagrama de Blocos
        </h1>
        <p className="hero-desc" style={{ fontSize: '0.94rem', lineHeight: '1.55', color: 'var(--text-muted)' }}>
          Ambiente analítico interativo para modelagem e redução passo a passo de diagramas de blocos no domínio de Laplace.
          Obtenha a função de transferência equivalente T(s) = C(s)/R(s), acompanhe o memorial de cálculo em LaTeX,
          explore diferentes topologias e visualize as transformações gráficas de cada etapa.
        </p>
        <div className="hero-features-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
          <span className="hero-feature-pill">🧪 <b>Modo de Prática</b> com 3 Níveis & Dicas</span>
          <span className="hero-feature-pill">📐 <b>Topologias</b> Canônicas e Desafios</span>
          <span className="hero-feature-pill">📝 <b>Memorial Analítico</b> em LaTeX</span>
          <span className="hero-feature-pill">🔢 <b>Cálculo de MMC</b> Passo a Passo</span>
          <span className="hero-feature-pill">💻 <b>Exportação de Scripts</b> para Scilab</span>
          <span className="hero-feature-pill">📚 <b>Guia Didático</b> com Teoria e Regras</span>
        </div>
      </section>

      {/* Trilha Progressiva de Aplicação e Estudo */}
      <div className="learning-path-banner" id="learningPathBanner" style={{ marginTop: '20px' }}>
        <div className="learning-path-header" style={{ marginBottom: '14px' }}>
          <span className="learning-path-badge" style={{ fontSize: '0.74rem', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
            🎯 Percurso Acadêmico
          </span>
          <h3 className="learning-path-title" style={{ fontSize: '1.15rem', margin: '6px 0 4px 0' }}>
            Trilha Progressiva de Aplicação e Estudo
          </h3>
          <p className="learning-path-desc" style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Roteiro estruturado para resolver exercícios, explorar transformações canônicas e projetar diagramas com autonomia:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
          <div
            className="learning-step-card"
            onClick={() => setShowGuide(true)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 1 • Teoria</div>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', margin: '4px 0', color: 'var(--text)' }}>📚 Fundamentos & Regras</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Estude premissas de isolamento, equações nodais e regras de blocos.</div>
          </div>

          <div
            className="learning-step-card"
            onClick={() => {
              const el = document.getElementById('calcSectionArea');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 2 • Modelos</div>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', margin: '4px 0', color: 'var(--text)' }}>📐 Topologias Canônicas</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Calcule a malha fechada clássica G/(1+GH) com memorial analítico em LaTeX.</div>
          </div>

          <div
            className="learning-step-card"
            onClick={() => setShowPractice(true)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 3 • Prática</div>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', margin: '4px 0', color: 'var(--text)' }}>🧪 Laboratório Interativo</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Exercícios em 3 níveis com verificador de equivalência algébrica real.</div>
          </div>

          <div
            className="learning-step-card"
            onClick={handleOpenBuilder}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '14px' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 4 • Criação</div>
            <div style={{ fontWeight: 700, fontSize: '0.94rem', margin: '4px 0', color: 'var(--text)' }}>🛠️ Construtor Livre</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Monte qualquer diagrama arbitrário e calcule a redução via Mason.</div>
          </div>
        </div>
      </div>

      {/* Seção da Calculadora e Topologias */}
      <div id="calcSectionArea">
        <CalculatorSection
          onOpenPractice={() => setShowPractice(true)}
          onOpenBuilder={handleOpenBuilder}
          onOpenGuide={() => setShowGuide(true)}
        />
      </div>

      {/* Modais Globais */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <PracticeModal isOpen={showPractice} onClose={() => setShowPractice(false)} />
      <SimulationsGalleryModal isOpen={showSimulations} onClose={() => setShowSimulations(false)} />

      {/* Rodapé Acadêmico Institucional */}
      <footer style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid var(--card-border)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <p style={{ margin: '0 0 6px 0' }}>
          Plataforma Computacional e Educacional para Análise e Redução de Sistemas de Controle
        </p>
        <p style={{ margin: 0, fontWeight: 600 }}>
          Desenvolvido por Aderson Carvalho - Outubro/2026 • contato:{' '}
          <a href="mailto:aderson@alunos.utfpr.edu.br" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            aderson@alunos.utfpr.edu.br
          </a>
        </p>
      </footer>
    </main>
  );
}
