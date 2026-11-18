'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import { CONTROL_GLOSSARY } from '@/utils/controlGlossary';
import { GlossaryTooltipCard } from './GlossaryTooltipCard';

interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
  inline?: boolean;
}

const KatexHtml = React.memo(({ html }: { html: string }) => {
  const contentRef = useRef<HTMLSpanElement>(null);
  const markup = useMemo(() => ({ __html: html }), [html]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const candidates = root.querySelectorAll<HTMLElement>('.katex-html .mord, .katex-html .mop');
    candidates.forEach(el => {
      if (el.closest('[data-glossary-key]')) return;
      const txt = (el.textContent || '').replace(/[\u200b-\u200d\ufeff\s]+/g, '');
      if (!txt || txt.length > 14) return;
      if (Object.prototype.hasOwnProperty.call(CONTROL_GLOSSARY, txt)) {
        const entry = CONTROL_GLOSSARY[txt];
        el.setAttribute('data-glossary-key', txt);
        el.setAttribute('title', `${entry.symbol} — ${entry.name}: ${entry.meaning}`);
        el.style.cursor = 'help';
        el.style.borderBottom = '1px dotted rgba(56, 189, 248, 0.55)';
      }
    });
  }, [html]);

  return <span ref={contentRef} dangerouslySetInnerHTML={markup} />;
});

KatexHtml.displayName = 'KatexHtml';

export const MathView: React.FC<MathViewProps> = ({ math, block = false, inline = false, className = '' }) => {
  const isDisplay = block && !inline;
  const [hover, setHover] = useState<{ key: string; rect: DOMRect } | null>(null);

  const html = useMemo(() => {
    try {
      // Remover delimitadores como $$ ou \( \) se presentes
      let cleanMath = math.trim();
      if (cleanMath.startsWith('$$') && cleanMath.endsWith('$$')) {
        cleanMath = cleanMath.slice(2, -2).trim();
      } else if (cleanMath.startsWith('\\[') && cleanMath.endsWith('\\]')) {
        cleanMath = cleanMath.slice(2, -2).trim();
      } else if (cleanMath.startsWith('\\(') && cleanMath.endsWith('\\)')) {
        cleanMath = cleanMath.slice(2, -2).trim();
      } else if (cleanMath.startsWith('$') && cleanMath.endsWith('$')) {
        cleanMath = cleanMath.slice(1, -1).trim();
      }

      return katex.renderToString(cleanMath, {
        displayMode: isDisplay,
        throwOnError: false
      });
    } catch {
      return `<span class="katex-error">${math}</span>`;
    }
  }, [math, isDisplay]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    let hit = target?.closest?.('[data-glossary-key]') as HTMLElement | null;
    if (!hit && typeof document !== 'undefined' && document.elementsFromPoint) {
      const stack = document.elementsFromPoint(e.clientX, e.clientY);
      for (const node of stack) {
        const found = (node as HTMLElement)?.closest?.('[data-glossary-key]') as HTMLElement | null;
        if (found) {
          hit = found;
          break;
        }
      }
    }
    if (!hit) {
      if (hover) setHover(null);
      return;
    }
    const key = hit.getAttribute('data-glossary-key');
    if (key && CONTROL_GLOSSARY[key]) {
      const rect = hit.getBoundingClientRect();
      setHover(prev => (prev && prev.key === key && Math.abs(prev.rect.left - rect.left) < 1 && Math.abs(prev.rect.top - rect.top) < 1 ? prev : { key, rect }));
    }
  };

  if (isDisplay) {
    return (
      <div
        className={`math-block ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <KatexHtml html={html} />
        {hover && CONTROL_GLOSSARY[hover.key] && (
          <GlossaryTooltipCard entry={CONTROL_GLOSSARY[hover.key]} rect={hover.rect} />
        )}
      </div>
    );
  }

  return (
    <span
      className={`math-inline ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <KatexHtml html={html} />
      {hover && CONTROL_GLOSSARY[hover.key] && (
        <GlossaryTooltipCard entry={CONTROL_GLOSSARY[hover.key]} rect={hover.rect} />
      )}
    </span>
  );
};
