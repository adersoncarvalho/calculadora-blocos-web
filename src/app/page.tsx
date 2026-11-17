'use client';

import React, { useState, useEffect } from 'react';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { GuideSection } from '@/features/guide/GuideSection';
import { PracticeSection } from '@/features/practice/PracticeSection';
import { SimulationsGallerySection } from '@/features/simulations/SimulationsGallerySection';
import { BuilderSection } from '@/features/builder/BuilderSection';
import { CalculatorSection } from '@/features/calculator/CalculatorSection';
import { ControllersSection } from '@/features/controllers/ControllersSection';

type ActiveView = 'home' | 'builder' | 'guide' | 'practice' | 'simulations' | 'controllers';

export default function HomePage() {
  const [view, setView] = useState<ActiveView>('home');
  const [showCanonicalModels, setShowCanonicalModels] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Sincroniza visualização inicial com ?view=... da URL (mantém aba ao dar Ctrl+F5 e permite abrir em nova guia)
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const qView = params.get('view') as ActiveView | null;
      const valid: ActiveView[] = ['home', 'builder', 'guide', 'practice', 'simulations', 'controllers'];
      if (qView && valid.includes(qView)) {
        setView(qView);
      } else {
        setView('home');
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // Escuta tecla '?' para atalhos e 'Esc' para fechar modais ou voltar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowShortcuts(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Transições com scroll para o topo e atualização da URL
  const handleSetView = (newView: ActiveView) => {
    setView(newView);
    if (typeof window !== 'undefined') {
      const targetUrl = newView === 'home' ? '/' : `/?view=${newView}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Se o usuário está em uma das ferramentas dedicadas, abre direto no topo em tela cheia limpa com Navbar global
  if (view === 'builder') {
    return (
      <>
        <GlobalNavbar activeView={view} onNavigate={handleSetView} onOpenShortcuts={() => setShowShortcuts(true)} />
        <main style={{ padding: '16px 20px', minHeight: '100vh' }}>
          <BuilderSection
            onBack={() => handleSetView('home')}
          />
          <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </main>
      </>
    );
  }

  if (view === 'guide') {
    return (
      <>
        <GlobalNavbar activeView={view} onNavigate={handleSetView} onOpenShortcuts={() => setShowShortcuts(true)} />
        <main style={{ padding: '16px 20px', minHeight: '100vh' }}>
          <GuideSection
            onBack={() => handleSetView('home')}
            onNavigate={v => handleSetView(v)}
          />
          <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </main>
      </>
    );
  }

  if (view === 'practice') {
    return (
      <>
        <GlobalNavbar activeView={view} onNavigate={handleSetView} onOpenShortcuts={() => setShowShortcuts(true)} />
        <main style={{ padding: '16px 20px', minHeight: '100vh' }}>
          <PracticeSection
            onBack={() => handleSetView('home')}
            onNavigate={v => handleSetView(v)}
          />
          <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </main>
      </>
    );
  }

  if (view === 'simulations') {
    return (
      <>
        <GlobalNavbar activeView={view} onNavigate={handleSetView} onOpenShortcuts={() => setShowShortcuts(true)} />
        <main style={{ padding: '16px 20px', minHeight: '100vh' }}>
          <SimulationsGallerySection
            onBack={() => handleSetView('home')}
            onNavigate={v => handleSetView(v)}
          />
          <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </main>
      </>
    );
  }

  if (view === 'controllers') {
    return (
      <>
        <GlobalNavbar activeView={view} onNavigate={handleSetView} onOpenShortcuts={() => setShowShortcuts(true)} />
        <main style={{ padding: '16px 20px', minHeight: '100vh' }}>
          <ControllersSection
            onBack={() => handleSetView('home')}
            onNavigate={v => handleSetView(v)}
          />
          <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </main>
      </>
    );
  }

  // Visualização Inicial Padrão (HOME)
  return (
    <>
      <GlobalNavbar activeView={view} onNavigate={handleSetView} onOpenShortcuts={() => setShowShortcuts(true)} />
      <main style={{ padding: '16px 20px', minHeight: '100vh' }}>

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
          <a
            href="/?view=controllers"
            className="hero-feature-pill"
            style={{ background: 'linear-gradient(135deg, rgba(2,132,199,0.3) 0%, rgba(3,105,161,0.3) 100%)', border: '1px solid #0284c7', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                handleSetView('controllers');
              }
            }}
          >
            🎛️ <b>Controladores</b> (P, PD, PI, Avanço e Atraso)
          </a>
          <span className="hero-feature-pill">🧪 <b>Modo de Prática</b> com 3 Níveis &amp; Dicas</span>
          <span className="hero-feature-pill">📐 <b>Topologias</b> Canônicas e Desafios</span>
          <span className="hero-feature-pill">📝 <b>Memorial Analítico</b> em LaTeX</span>
          <span className="hero-feature-pill">🔢 <b>Cálculo de MMC</b> Passo a Passo</span>
          <span className="hero-feature-pill">💻 <b>Exportação de Scripts</b> para Scilab</span>
          <span className="hero-feature-pill">📚 <b>Guia Didático</b> com Teoria e Regras</span>
        </div>
      </section>

      {/* Trilha Progressiva de Aplicação e Estudo (Percurso Acadêmico) */}
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
          {/* Etapa 1 • Teoria */}
          <a
            href="/?view=guide"
            className="learning-step-card"
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                handleSetView('guide');
              }
            }}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px', textDecoration: 'none', display: 'block' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 1 • Teoria</div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem', margin: '4px 0', color: 'var(--text)' }}>📚 Fundamentos & Regras</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>Estude premissas de isolamento, equações nodais e regras de blocos.</div>
          </a>

          {/* Etapa 2 • Modelos (Abre a calculadora de topologias canônicas abaixo) */}
          <div
            className="learning-step-card"
            onClick={() => {
              setShowCanonicalModels(prev => !prev);
              setTimeout(() => {
                const el = document.getElementById('calcSectionArea');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 60);
            }}
            role="button"
            tabIndex={0}
            style={{
              cursor: 'pointer',
              background: showCanonicalModels ? 'rgba(56,189,248,0.1)' : 'var(--card-bg)',
              border: `1px solid ${showCanonicalModels ? 'var(--primary)' : 'var(--card-border)'}`,
              borderRadius: '8px',
              padding: '16px'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 2 • Modelos</div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem', margin: '4px 0', color: 'var(--text)' }}>📐 Topologias Canônicas</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
              {showCanonicalModels ? '▲ Recolher modelos canônicos' : '▼ Abrir modelos e memorial analítico'}
            </div>
          </div>

          {/* Etapa 3 • Prática */}
          <a
            href="/?view=practice"
            className="learning-step-card"
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                handleSetView('practice');
              }
            }}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px', textDecoration: 'none', display: 'block' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 3 • Prática</div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem', margin: '4px 0', color: 'var(--text)' }}>🧪 Laboratório Interativo</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>Exercícios em 3 níveis com verificador de equivalência algébrica real.</div>
          </a>

          {/* Etapa 4 • Criação */}
          <a
            href="/?view=builder"
            className="learning-step-card"
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                handleSetView('builder');
              }
            }}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px', textDecoration: 'none', display: 'block' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 4 • Criação</div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem', margin: '4px 0', color: 'var(--text)' }}>🛠️ Construtor Livre</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>Monte qualquer diagrama arbitrário e calcule a redução algébrica completa.</div>
          </a>

          {/* Etapa 5 • Controladores */}
          <a
            href="/?view=controllers"
            className="learning-step-card"
            onClick={e => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                handleSetView('controllers');
              }
            }}
            style={{ cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '16px', textDecoration: 'none', display: 'block' }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>Etapa 5 • Projeto</div>
            <div style={{ fontWeight: 700, fontSize: '0.96rem', margin: '4px 0', color: 'var(--text)' }}>🎛️ Controladores</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>P, PD, PI, Avanço de Fase e Atraso de Fase separados com teoria, método do professor, exercícios e simulações.</div>
          </a>
        </div>
      </div>

      {/* Conteúdo Abaixo do Percurso Acadêmico: Apenas renderiza quando o usuário clica na Etapa 2 */}
      {showCanonicalModels && (
        <div id="calcSectionArea" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCanonicalModels(false)}
              style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'pointer' }}
            >
              ✕ Fechar / Recolher Modelos
            </button>
          </div>
          <CalculatorSection
            onOpenPractice={() => handleSetView('practice')}
            onOpenBuilder={() => handleSetView('builder')}
            onOpenGuide={() => handleSetView('guide')}
          />
        </div>
      )}

      {/* Modal de Atalhos de Teclado */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

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
    </>
  );
}
