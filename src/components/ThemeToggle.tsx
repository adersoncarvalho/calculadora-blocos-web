'use client';

import React, { useEffect, useState } from 'react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme') as 'dark' | 'light' | null;
    const saved = themeParam || (localStorage.getItem('app_theme') as 'dark' | 'light' | null) || 'light';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const applyTheme = (t: 'dark' | 'light') => {
    const isLight = t === 'light';
    if (isLight) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('app_theme', t);
  };

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  const sunIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );

  const moonIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );

  if (!mounted) {
    return (
      <button type="button" className="btn-theme-toggle" aria-label="Alternar tema" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {moonIcon} Escuro
      </button>
    );
  }

  return (
    <button
      type="button"
      id="themeToggleBtn"
      className="btn-theme-toggle"
      onClick={toggle}
      aria-label={`Alternar para ${theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}`}
      title={`Alternar para ${theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
    >
      {theme === 'dark' ? sunIcon : moonIcon}
      {theme === 'dark' ? 'Claro' : 'Escuro'}
    </button>
  );
};
