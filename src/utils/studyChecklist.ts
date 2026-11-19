'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'controle_study_checklist_v1';

export function useStudyChecklist() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setCompleted(parsed);
        }
      }
    } catch {
      // ignora erro de storage
    }
  }, []);

  const toggleItem = useCallback((id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignora
      }
      return next;
    });
  }, []);

  const isDone = useCallback((id: string) => Boolean(completed[id]), [completed]);

  const countDone = useCallback(
    (ids: string[]) => ids.reduce((acc, id) => acc + (completed[id] ? 1 : 0), 0),
    [completed]
  );

  return { completed, toggleItem, isDone, countDone };
}
