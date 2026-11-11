'use client';

import React, { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isOnline) {
    return null;
  }

  return (
    <aside
      aria-label="Network status banner"
      className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-400 px-4 py-2 text-xs flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-top-1"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="font-medium">
        Offline Mode &mdash; Network disconnected. Cached data is accessible; updates will sync when back online.
      </span>
    </aside>
  );
}

