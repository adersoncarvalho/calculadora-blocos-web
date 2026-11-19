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
  const [showPlatformOverview, setShowPlatformOverview] = useState(false);
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

      {/* Banner Recolhível: fechado por padrão para o usuário escolher direto o que deseja abrir */}
      <section className="hero-banner" id="heroBanner" style={{ marginTop: '12px', padding: showPlatformOverview ? undefined : '14px 18px' }}>
        <div
          onClick={() => setShowPlatformOverview(prev => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowPlatformOverview(prev => !prev);
            }
          }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            cursor: 'pointer'
          }}
        >
          <div>
            <div className="hero-eyebrow">⚡ Engenharia de Controle &amp; Automação • Domínio de Laplace</div>
            <h1 className="hero-title" style={{ fontSize: '1.35rem', fontWeight: 800, margin: '4px 0 0 0' }}>
              Calculadora e Laboratório de Redução em Diagrama de Blocos
            </h1>
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--primary)',
              padding: '5px 11px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              whiteSpace: 'nowrap'
            }}
          >
            {showPlatformOverview ? '▲ Recolher descrição' : '▼ Ver recursos da plataforma'}
          </span>
        </div>

        {showPlatformOverview && (
          <div style={{ marginTop: '12px' }}>
            <p className="hero-desc" style={{ fontSize: '0.94rem', lineHeight: '1.55', color: 'var(--text-muted)', margin: 0 }}>
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
          </div>
        )}
      </section>

      {/* 3 Trilhas Principais Claras */}
      <div className="learning-path-banner" id="learningPathBanner" style={{ marginTop: '18px' }}>
        <div className="learning-path-header" style={{ marginBottom: '14px' }}>
          <span className="learning-path-badge" style={{ fontSize: '0.74rem', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
            🎯 Acesso Rápido
          </span>
          <h3 className="learning-path-title" style={{ fontSize: '1.15rem', margin: '6px 0 4px 0' }}>
            O que você deseja fazer agora?
          </h3>
          <p className="learning-path-desc" style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Escolha uma das 3 trilhas principais para ir direto ao conteúdo sem se perder entre abas:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '14px' }}>
          {/* Trilha 1 • Controladores & Projeto */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '2px solid var(--primary)',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>
              Trilha 1 • Controle Clássico &amp; LGR
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
              🎛️ Controladores &amp; Projeto de Plantas
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              P, PD Real, PI, Avanço, Atraso, LGR comparativo, Saturação ±10 V, Amp-Op e Gerador Automático de Memorial.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => handleSetView('controllers')}
                style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Abrir Controladores
              </button>
              <a
                href="/?view=controllers&tab=designer"
                style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(5,150,105,0.14)', color: 'var(--success)', border: '1px solid var(--success)', textDecoration: 'none' }}
              >
                🧮 Projetar Planta Nova
              </a>
            </div>
          </div>

          {/* Trilha 2 • Diagramas de Blocos & Redução */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase' }}>
              Trilha 2 • Álgebra de Blocos
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
              🛠️ Construtor &amp; Topologias Canônicas
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Monte qualquer diagrama de blocos arbitrário ou explore modelos canônicos com redução passo a passo e Mason.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => handleSetView('builder')}
                style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
              >
                🛠️ Construtor Livre
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCanonicalModels(prev => !prev);
                  setTimeout(() => {
                    const el = document.getElementById('calcSectionArea');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 60);
                }}
                style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: showCanonicalModels ? 'rgba(56,189,248,0.16)' : 'var(--code-bg)', color: 'var(--primary)', border: '1px solid var(--primary)', cursor: 'pointer' }}
              >
                {showCanonicalModels ? '▲ Recolher Modelos' : '📐 Modelos Canônicos'}
              </button>
            </div>
          </div>

          {/* Trilha 3 • Listas, Teoria & Treino de Prova */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase' }}>
              Trilha 3 • Revisão &amp; Provas
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
              📝 Listas Resolvidas &amp; Prática
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Lista P2 completa (23 questões), laboratório interativo com 3 níveis e guia didático de regras de blocos.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px' }}>
              <a
                href="/?view=controllers&tab=listas"
                style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', textDecoration: 'none' }}
              >
                📝 Lista P2 (23 Q)
              </a>
              <button
                type="button"
                onClick={() => handleSetView('practice')}
                style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
              >
                🧪 Prática
              </button>
              <button
                type="button"
                onClick={() => handleSetView('guide')}
                style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
              >
                📚 Guia
              </button>
            </div>
          </div>
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
