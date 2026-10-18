'use client';

import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 8, 17, 0.85)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary)' }}>
            ⌨️ Atalhos de Teclado & Navegação Rápida
          </h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '4px 10px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem', color: 'var(--text)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--code-bg)', borderRadius: '6px' }}>
            <span>Abrir esta janela de ajuda</span>
            <kbd style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: 'var(--primary)' }}>?</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--code-bg)', borderRadius: '6px' }}>
            <span>Fechar modais abertos</span>
            <kbd style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: 'var(--primary)' }}>Esc</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--code-bg)', borderRadius: '6px' }}>
            <span>Desfazer ação no Construtor</span>
            <kbd style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: 'var(--primary)' }}>Ctrl + Z</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--code-bg)', borderRadius: '6px' }}>
            <span>Refazer ação no Construtor</span>
            <kbd style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: 'var(--primary)' }}>Ctrl + Y</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--code-bg)', borderRadius: '6px' }}>
            <span>Excluir elemento selecionado</span>
            <kbd style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: 'var(--primary)' }}>Delete / Backspace</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
