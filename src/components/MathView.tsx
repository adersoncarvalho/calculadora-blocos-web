'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
  inline?: boolean;
}

export const MathView: React.FC<MathViewProps> = ({ math, block = false, inline = false, className = '' }) => {
  const isDisplay = block && !inline;

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

  if (isDisplay) {
    return (
      <div
        className={`math-block ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`math-inline ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
