'use client';

import React, { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

export type NavViewId = 'home' | 'builder' | 'guide' | 'practice' | 'simulations' | 'controllers';

interface GlobalNavbarProps {
  activeView: NavViewId;
  onNavigate: (view: NavViewId) => void;
  onOpenShortcuts: () => void;
}

interface NavItem {
  id: NavViewId;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Calculadora',
    href: '/',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="10" y2="10" />
        <line x1="14" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="10" y2="14" />
        <line x1="14" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="16" y2="18" />
      </svg>
    )
  },
  {
    id: 'builder',
    label: 'Construtor',
    href: '/?view=builder',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <path d="M10 6.5h4M6.5 10v7.5H14" />
      </svg>
    )
  },
  {
    id: 'controllers',
    label: 'Controladores & Listas',
    href: '/?view=controllers',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    )
  },
  {
    id: 'practice',
    label: 'Prática',
    href: '/?view=practice',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6" />
        <path d="M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" />
      </svg>
    )
  },
  {
    id: 'simulations',
    label: 'Simulações',
    href: '/?view=simulations',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
  {
    id: 'guide',
    label: 'Guia',
    href: '/?view=guide',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  }
];

export const GlobalNavbar: React.FC<GlobalNavbarProps> = ({
  activeView,
  onNavigate,
  onOpenShortcuts
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`global-navbar no-print ${isScrolled ? 'scrolled' : ''}`} aria-label="Navegação Principal">
      <div className="global-navbar-inner">
        <a
          href="/"
          className="global-navbar-brand"
          onClick={e => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
              e.preventDefault();
              onNavigate('home');
            }
          }}
        >
          <span className="global-navbar-logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </span>
          <span className="global-navbar-brand-text">
            <strong>ControleLab</strong>
            <small>EEL6005</small>
          </span>
        </a>

        <div className="global-navbar-links">
          {NAV_ITEMS.map(item => {
            const isActive = activeView === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`global-nav-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={e => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    onNavigate(item.id);
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>

        <div className="global-navbar-actions">
          <button
            type="button"
            className="btn-shortcuts-helper global-nav-shortcut-btn"
            onClick={onOpenShortcuts}
            title="Atalhos de teclado (?)"
            aria-label="Atalhos de teclado"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            <span>?</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
