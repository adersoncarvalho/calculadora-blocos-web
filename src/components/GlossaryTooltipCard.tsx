'use client';

import React, { useState } from 'react';
import { CONTROL_GLOSSARY, GlossaryEntry } from '@/utils/controlGlossary';

interface GlossaryTooltipCardProps {
  entry: GlossaryEntry;
  rect: DOMRect;
}

export const GlossaryTooltipCard: React.FC<GlossaryTooltipCardProps> = ({ entry, rect }) => {
  const showBelow = rect.top < 150;
  const maxWidth = 320;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - maxWidth / 2), vw - maxWidth - 12);

  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: showBelow ? `${rect.bottom + 8}px` : undefined,
        bottom: showBelow ? undefined : `${(typeof window !== 'undefined' ? window.innerHeight : 768) - rect.top + 8}px`,
        width: `${maxWidth}px`,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'rgba(15, 23, 42, 0.96)',
        border: '1px solid rgba(56, 189, 248, 0.45)',
        borderRadius: '8px',
        padding: '10px 12px',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
        color: '#e2e8f0',
        fontSize: '0.76rem',
        lineHeight: 1.45,
        textAlign: 'left'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
        <span
          style={{
            background: 'rgba(56, 189, 248, 0.16)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '4px',
            padding: '1px 6px',
            fontWeight: 800,
            fontSize: '0.73rem'
          }}
        >
          {entry.symbol}
        </span>
        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.78rem' }}>{entry.name}</span>
      </div>
      <div style={{ marginBottom: '4px' }}>
        <strong style={{ color: '#93c5fd' }}>O que significa:</strong> {entry.meaning}
      </div>
      <div>
        <strong style={{ color: '#6ee7b7' }}>Para que serve:</strong> {entry.purpose}
      </div>
    </div>
  );
};

interface GlossaryTermProps {
  termKey: string;
  children: React.ReactNode;
}

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({ termKey, children }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const entry = CONTROL_GLOSSARY[termKey];
  if (!entry) return <>{children}</>;

  return (
    <span
      onMouseEnter={e => setRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
      style={{
        borderBottom: '1px dotted rgba(56, 189, 248, 0.65)',
        cursor: 'help',
        color: 'inherit'
      }}
    >
      {children}
      {rect && <GlossaryTooltipCard entry={entry} rect={rect} />}
    </span>
  );
};
