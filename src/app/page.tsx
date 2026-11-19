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
            <div className="hero-eyebrow" style={{ fontSize: '0.73rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Engenharia de Controle Clássico &amp; Domínio de Laplace
            </div>
            <h1 className="hero-title" style={{ fontSize: '1.45rem', fontWeight: 700, margin: '4px 0 0 0' }}>
              ControleLab — Análise, Redução de Blocos e Projeto de Controladores
            </h1>
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--primary)',
              padding: '5px 11px',
              borderRadius: '4px',
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              whiteSpace: 'nowrap'
            }}
          >
            {showPlatformOverview ? 'Recolher visão geral' : 'Sobre a plataforma'}
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

      {/* 3 Trilhas Principais Claras (Visual Editorial Acadêmico) */}
      <div className="learning-path-banner" id="learningPathBanner" style={{ marginTop: '18px' }}>
        <div className="learning-path-header" style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Módulos do Laboratório
          </span>
          <h3 className="learning-path-title" style={{ fontSize: '1.22rem', margin: '4px 0 4px 0' }}>
            Selecione o ambiente de estudo ou projeto
          </h3>
          <p className="learning-path-desc" style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Ferramentas integradas com memorial analítico em LaTeX, validação algébrica, simulação RK4 e geração de scripts Scilab.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '16px' }}>
          {/* Módulo 01 • Controladores & Projeto */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderTop: '3px solid var(--primary)',
              borderRadius: '6px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.71rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              01 · Controle Clássico &amp; LGR
            </div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 700, fontSize: '1.08rem', color: 'var(--text)' }}>
              Controladores &amp; Projeto de Plantas
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              P, PD Real, PI, Avanço, Atraso e Lead-Lag com Regra dos 7 Passos, LGR comparativo, saturação ±10 V e circuito com Amp-Op.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => handleSetView('controllers')}
                style={{ padding: '7px 13px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)', cursor: 'pointer' }}
              >
                Abrir Controladores
              </button>
              <a
                href="/?view=controllers&tab=designer"
                style={{ padding: '7px 13px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--code-bg)', color: 'var(--primary)', border: '1px solid var(--card-border)', textDecoration: 'none' }}
              >
                Projetar Planta Nova
              </a>
            </div>
          </div>

          {/* Módulo 02 • Diagramas de Blocos & Redução */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '6px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.71rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              02 · Álgebra de Blocos
            </div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 700, fontSize: '1.08rem', color: 'var(--text)' }}>
              Construtor &amp; Topologias Canônicas
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Monte diagramas de blocos arbitrários ou explore modelos canônicos com redução algébrica passo a passo e fórmula de Mason.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => handleSetView('builder')}
                style={{ padding: '7px 13px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
              >
                Construtor Livre
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
                style={{ padding: '7px 13px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: showCanonicalModels ? 'var(--primary)' : 'var(--code-bg)', color: showCanonicalModels ? '#fff' : 'var(--primary)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
              >
                {showCanonicalModels ? 'Recolher Modelos' : 'Modelos Canônicos'}
              </button>
            </div>
          </div>

          {/* Módulo 03 • Listas, Teoria & Prática */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderTop: '3px solid var(--text-muted)',
              borderRadius: '6px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              03 · Revisão &amp; Provas
            </div>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 700, fontSize: '1.08rem', color: 'var(--text)' }}>
              Listas Resolvidas &amp; Prática
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Lista P2 completa (23 questões), laboratório de prática com verificador algébrico e guia teórico de referência.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
              <a
                href="/?view=controllers&tab=listas"
                style={{ padding: '7px 13px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', textDecoration: 'none' }}
              >
                Lista P2 (23 Q)
              </a>
              <button
                type="button"
                onClick={() => handleSetView('practice')}
                style={{ padding: '7px 13px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
              >
                Prática
              </button>
              <button
                type="button"
                onClick={() => handleSetView('guide')}
                style={{ padding: '7px 13px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
              >
                Guia
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
