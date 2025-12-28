'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { LocalWatchlistItem } from '@cardtrail/shared-types';
import { getWatchlistStore } from '@/lib/storage/local-watchlist-store';
import { evaluateAlerts, type TriggeredAlert } from '@/lib/watchlist/alert-engine';
import { WatchlistDrawer } from './WatchlistDrawer';
import { AlertToastStack } from './AlertToastStack';

export interface WatchlistTargetCard {
  cardId: number;
  cardName: string;
  imageUrl?: string | null;
}

interface WatchlistDrawerContextValue {
  openDrawer: (card: WatchlistTargetCard) => void;
  closeDrawer: () => void;
  triggerAlertCheck: (force?: boolean) => Promise<TriggeredAlert[]>;
}

const WatchlistDrawerContext = createContext<WatchlistDrawerContextValue | null>(null);

interface DrawerState {
  isOpen: boolean;
  isLoading: boolean;
  card?: WatchlistTargetCard;
  existingItem?: LocalWatchlistItem | null;
}

interface ToastEntry {
  id: string;
  alert: TriggeredAlert;
}

export function WatchlistDrawerProvider({ children }: PropsWithChildren) {
  const [drawerState, setDrawerState] = useState<DrawerState>({ isOpen: false, isLoading: false });
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const openDrawer = useCallback(async (card: WatchlistTargetCard) => {
    setDrawerState({ isOpen: true, isLoading: true, card, existingItem: null });
    const store = getWatchlistStore();
    const existing = await store.getByCardId(card.cardId);
    setDrawerState({ isOpen: true, isLoading: false, card, existingItem: existing });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const enqueueToasts = useCallback((alerts: TriggeredAlert[]) => {
    if (!alerts.length) {
      return;
    }

    setToasts((prev) => {
      const entries = alerts.map((alert) => ({
        id: `${alert.cardId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        alert,
      }));
      return [...entries, ...prev].slice(0, 4);
    });
  }, []);

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timers = toasts.map((toast) =>
      setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== toast.id));
      }, 6000)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts]);

  const triggerAlertCheck = useCallback(
    async (force = false) => {
      const alerts = await evaluateAlerts({ force });
      enqueueToasts(alerts);
      return alerts;
    },
    [enqueueToasts]
  );

  useEffect(() => {
    triggerAlertCheck().catch((error) => {
      console.warn('[watchlist] initial alert evaluation failed', error);
    });
  }, [triggerAlertCheck]);

  const contextValue = useMemo<WatchlistDrawerContextValue>(
    () => ({
      openDrawer,
      closeDrawer,
      triggerAlertCheck,
    }),
    [openDrawer, closeDrawer, triggerAlertCheck]
  );

  return (
    <WatchlistDrawerContext.Provider value={contextValue}>
      {children}
      <WatchlistDrawer
        isOpen={drawerState.isOpen}
        isLoading={drawerState.isLoading}
        card={drawerState.card}
        existingItem={drawerState.existingItem ?? null}
        onClose={closeDrawer}
        onSaved={() => triggerAlertCheck(true)}
      />
      <AlertToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((entry) => entry.id !== id))} />
    </WatchlistDrawerContext.Provider>
  );
}

export function useWatchlistDrawer(): WatchlistDrawerContextValue {
  const context = useContext(WatchlistDrawerContext);
  if (!context) {
    throw new Error('useWatchlistDrawer must be used within WatchlistDrawerProvider');
  }
  return context;
}
