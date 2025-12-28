'use client';

import { useSyncExternalStore } from 'react';

export type GradeOption = 'raw' | 'psa9' | 'psa10';

const gradeState = new Map<number, GradeOption>();
const listeners = new Map<number, Set<() => void>>();

function getGrade(cardId: number, fallback: GradeOption) {
  return gradeState.get(cardId) ?? fallback;
}

function setGrade(cardId: number, grade: GradeOption) {
  gradeState.set(cardId, grade);
  const cardListeners = listeners.get(cardId);
  cardListeners?.forEach((listener) => listener());
}

function subscribe(cardId: number, listener: () => void) {
  const existing = listeners.get(cardId) ?? new Set<() => void>();
  existing.add(listener);
  listeners.set(cardId, existing);

  return () => {
    const current = listeners.get(cardId);
    current?.delete(listener);
    if (current && current.size === 0) {
      listeners.delete(cardId);
      gradeState.delete(cardId);
    }
  };
}

export function useCardGradeStore(cardId: number, defaultGrade: GradeOption = 'psa10') {
  const selectedGrade = useSyncExternalStore(
    (listener) => subscribe(cardId, listener),
    () => getGrade(cardId, defaultGrade),
    () => defaultGrade
  );

  const setSelectedGrade = (nextGrade: GradeOption) => {
    setGrade(cardId, nextGrade);
  };

  return { selectedGrade, setSelectedGrade };
}
