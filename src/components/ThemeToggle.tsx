'use client';

import React, { useEffect, useState } from 'react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme') as 'dark' | 'light' | null;
    const saved = themeParam || (localStorage.getItem('app_theme') as 'dark' | 'light' | null) || 'dark';
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

  if (!mounted) {
    return (
      <button type="button" className="btn-theme-toggle" aria-label="Carregando tema">
        ☀️ Modo Claro
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
    >
      {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
    </button>
  );
};
