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

export const MathView: React.FC<MathViewProps> = ({ math, block = false, inline = false, className = '' }) => {
  const isDisplay = block && !inline;
  const contentRef = useRef<HTMLSpanElement>(null);
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

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const candidates = root.querySelectorAll<HTMLElement>('.katex .mord, .katex .mop');
    candidates.forEach(el => {
      if (el.closest('[data-glossary-key]')) return;
      const txt = (el.textContent || '').trim();
      if (!txt || txt.length > 14) return;
      if (Object.prototype.hasOwnProperty.call(CONTROL_GLOSSARY, txt)) {
        el.setAttribute('data-glossary-key', txt);
        el.style.cursor = 'help';
        el.style.borderBottom = '1px dotted rgba(56, 189, 248, 0.55)';
      }
    });
  }, [html]);

  const handleMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const hit = target?.closest?.('[data-glossary-key]') as HTMLElement | null;
    if (!hit) return;
    const key = hit.getAttribute('data-glossary-key');
    if (key && CONTROL_GLOSSARY[key]) {
      setHover({ key, rect: hit.getBoundingClientRect() });
    }
  };

  const handleMouseOut = (e: React.MouseEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.closest?.('[data-glossary-key]')) return;
    setHover(null);
  };

  if (isDisplay) {
    return (
      <div
        className={`math-block ${className}`}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onMouseLeave={() => setHover(null)}
      >
        <span ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
        {hover && CONTROL_GLOSSARY[hover.key] && (
          <GlossaryTooltipCard entry={CONTROL_GLOSSARY[hover.key]} rect={hover.rect} />
        )}
      </div>
    );
  }

  return (
    <span
      className={`math-inline ${className}`}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onMouseLeave={() => setHover(null)}
    >
      <span ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
      {hover && CONTROL_GLOSSARY[hover.key] && (
        <GlossaryTooltipCard entry={CONTROL_GLOSSARY[hover.key]} rect={hover.rect} />
      )}
    </span>
  );
};
