'use client';

import React, { useState, useMemo, useCallback, useTransition } from 'react';
import {
  Film,
  CheckCircle2,
  Sparkles,
  Search,
  Download,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import rawData from '@/data/marvel-watchlist.json';
import { toggleMarvelItemAction, batchSetMarvelItemsAction } from './marvel-actions';
import type {
  MarvelItem,
  MarvelWatchStatus,
  MarvelProgressMap,
  MarvelUniverse,
} from '@/types/marvel';

const STORAGE_KEY = 'marvelWatchlist.progress.v1';

export type ViewingTrack = 'all' | 'essential' | 'golden' | 'spider' | 'defenders';
export type MediaTypeFilter = 'all' | 'movie' | 'series' | 'special';

interface MarvelTrackerProps {
  initialCloudProgress?: MarvelProgressMap;
}

export function MarvelTracker({ initialCloudProgress = {} }: MarvelTrackerProps) {
  const [, startTransition] = useTransition();

  // Initialize and merge localStorage with cloud progress safely on initial load
  const [progress, setProgress] = useState<MarvelProgressMap>(() => {
    let local: MarvelProgressMap = {};
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            local = parsed;
          }
        }
      } catch (e) {
        console.warn('Could not read Marvel progress from localStorage', e);
      }
    }
    return { ...local, ...initialCloudProgress };
  });

  // Filters & State
  const [activeTrack, setActiveTrack] = useState<ViewingTrack>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniverse, setSelectedUniverse] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaTypeFilter>('all');
  const [sortBy, setSortBy] = useState<'order' | 'date' | 'title'>('order');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const saveProgress = (newMap: MarvelProgressMap) => {
    setProgress(newMap);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
    } catch (e) {
      console.warn('Could not save Marvel progress to localStorage', e);
    }
  };

  // Compute runtime release state and countdown
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const items = useMemo(() => {
    return (rawData.items as MarvelItem[]).map((i) => {
      let isReleased = i.released;
      let daysUntil = 0;
      if (i.releaseDate) {
        const [y, m, d] = i.releaseDate.split('-').map(Number);
        const relDate = new Date(y, m - 1, d);
        isReleased = relDate <= today;
        daysUntil = Math.round((relDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        ...i,
        isReleased,
        daysUntil,
      };
    });
  }, [today]);

  const getStatus = useCallback(
    (id: string): MarvelWatchStatus => {
      return progress[id]?.status === 'watched' ? 'watched' : 'unwatched';
    },
    [progress]
  );

  // 1-Click Status Setting (Watched vs Not Watched)
  const handleSetStatus = (item: MarvelItem, targetStatus: MarvelWatchStatus) => {
    const current = getStatus(item.id);
    const nextStatus: MarvelWatchStatus =
      current === targetStatus ? (targetStatus === 'watched' ? 'unwatched' : 'watched') : targetStatus;

    const nextProgress = { ...progress };
    if (nextStatus === 'unwatched') {
      delete nextProgress[item.id];
    } else {
      nextProgress[item.id] = {
        ...nextProgress[item.id],
        status: 'watched',
        watchedOn: new Date().toISOString(),
      };
    }

    saveProgress(nextProgress);

    // Sync in background without blocking UI
    startTransition(async () => {
      await toggleMarvelItemAction(item, nextStatus);
    });
  };

  // Batch Mark Phase/Group as Watched
  const handleBatchMarkGroup = (groupItems: MarvelItem[]) => {
    if (groupItems.length === 0) return;

    const allWatched = groupItems.every((i) => getStatus(i.id) === 'watched');
    const targetStatus: MarvelWatchStatus = allWatched ? 'unwatched' : 'watched';

    const nextProgress = { ...progress };
    const updates: { item: MarvelItem; status: MarvelWatchStatus }[] = [];

    groupItems.forEach((item) => {
      if (targetStatus === 'unwatched') {
        delete nextProgress[item.id];
      } else {
        nextProgress[item.id] = {
          ...nextProgress[item.id],
          status: 'watched',
          watchedOn: new Date().toISOString(),
        };
      }
      updates.push({ item, status: targetStatus });
    });

    saveProgress(nextProgress);

    startTransition(async () => {
      await batchSetMarvelItemsAction(updates);
    });
  };

  // Catch-Up: Mark All Prior Items as Watched
  const handleCatchUpPrior = (targetItem: MarvelItem) => {
    const priorItems = items.filter(
      (i) => i.order <= targetItem.order && getStatus(i.id) !== 'watched'
    );
    if (priorItems.length === 0) return;

    const nextProgress = { ...progress };
    const updates: { item: MarvelItem; status: MarvelWatchStatus }[] = [];

    priorItems.forEach((item) => {
      nextProgress[item.id] = {
        ...nextProgress[item.id],
        status: 'watched',
        watchedOn: new Date().toISOString(),
      };
      updates.push({ item, status: 'watched' });
    });

    saveProgress(nextProgress);

    startTransition(async () => {
      await batchSetMarvelItemsAction(updates);
    });
  };

  // Statistics
  const totalWatched = useMemo(
    () => items.filter((i) => getStatus(i.id) === 'watched').length,
    [items, getStatus]
  );
  const totalNotWatched = items.length - totalWatched;

  const totalEssentials = useMemo(
    () => items.filter((i) => i.priority === 'Essential'),
    [items]
  );
  const watchedEssentials = useMemo(
    () => totalEssentials.filter((i) => getStatus(i.id) === 'watched').length,
    [totalEssentials, getStatus]
  );
  const essentialsRemaining = totalEssentials.length - watchedEssentials;

  const percentComplete = items.length
    ? Math.round((totalWatched / items.length) * 100)
    : 0;

  const percentEssentials = totalEssentials.length
    ? Math.round((watchedEssentials / totalEssentials.length) * 100)
    : 0;

  // "Up Next" essential title
  const upNextItem = useMemo(() => {
    return items
      .filter((i) => i.priority === 'Essential' && getStatus(i.id) !== 'watched')
      .sort((a, b) => a.order - b.order)[0];
  }, [items, getStatus]);

  // Next Upcoming release
  const nextUpcoming = useMemo(() => {
    return items
      .filter((i) => !i.isReleased && (i.daysUntil || 0) > 0)
      .sort((a, b) => (a.daysUntil || 0) - (b.daysUntil || 0))[0];
  }, [items]);

  // Milestone checks
  const isInfinitySagaComplete = useMemo(() => {
    const saga = items.filter((i) =>
      ['Phase 1', 'Phase 2', 'Phase 3'].includes(i.group)
    );
    return saga.length > 0 && saga.every((i) => getStatus(i.id) === 'watched');
  }, [items, getStatus]);

  const isDefendersComplete = useMemo(() => {
    const def = items.filter((i) => i.universe === 'Netflix/Marvel TV');
    return def.length > 0 && def.every((i) => getStatus(i.id) === 'watched');
  }, [items, getStatus]);

  const isSpiderVerseComplete = useMemo(() => {
    const spidey = items.filter(
      (i) => i.universe === 'Sony' || i.title.toLowerCase().includes('spider-man')
    );
    return spidey.length > 0 && spidey.every((i) => getStatus(i.id) === 'watched');
  }, [items, getStatus]);

  // Filter application with Curated Tracks
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      // 1. Viewing Track Presets
      if (activeTrack === 'essential') {
        if (i.priority !== 'Essential') return false;
      } else if (activeTrack === 'golden') {
        if (i.priority !== 'Essential' && i.priority !== 'Recommended') return false;
      } else if (activeTrack === 'spider') {
        const isSpidey =
          i.universe === 'Sony' ||
          i.title.toLowerCase().includes('spider') ||
          i.title.toLowerCase().includes('venom') ||
          i.title.toLowerCase().includes('morbius') ||
          i.title.toLowerCase().includes('madame');
        if (!isSpidey) return false;
      } else if (activeTrack === 'defenders') {
        const isDef =
          i.universe === 'Netflix/Marvel TV' ||
          i.title.toLowerCase().includes('daredevil') ||
          i.title.toLowerCase().includes('punisher') ||
          i.title.toLowerCase().includes('echo') ||
          i.title.toLowerCase().includes('jessica jones') ||
          i.title.toLowerCase().includes('luke cage') ||
          i.title.toLowerCase().includes('iron fist');
        if (!isDef) return false;
      }

      // 2. Media Type Filter
      if (selectedMediaType === 'movie') {
        if (!i.type.toLowerCase().includes('movie')) return false;
      } else if (selectedMediaType === 'series') {
        if (!i.type.toLowerCase().includes('series')) return false;
      } else if (selectedMediaType === 'special') {
        if (!i.type.toLowerCase().includes('special') && !i.type.toLowerCase().includes('one-shot')) return false;
      }

      // 3. Universe Filter
      if (selectedUniverse !== 'All' && i.universe !== selectedUniverse) {
        return false;
      }

      // 4. Priority Filter
      if (selectedPriority !== 'All') {
        if (selectedPriority === 'Essential+Recommended') {
          if (i.priority !== 'Essential' && i.priority !== 'Recommended') return false;
        } else if (i.priority !== selectedPriority) {
          return false;
        }
      }

      // 5. Watch Status Filter (Watched vs Not Watched)
      const st = getStatus(i.id);
      if (selectedStatus === 'unwatched' && st === 'watched') return false;
      if (selectedStatus === 'watched' && st !== 'watched') return false;
      if (selectedStatus === 'unwatched_essentials') {
        if (i.priority !== 'Essential' || st === 'watched') return false;
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = i.title.toLowerCase().includes(q);
        const matchGroup = i.group.toLowerCase().includes(q);
        const matchUniv = i.universe.toLowerCase().includes(q);
        if (!matchTitle && !matchGroup && !matchUniv) return false;
      }
      return true;
    });
  }, [
    items,
    activeTrack,
    selectedMediaType,
    selectedUniverse,
    selectedPriority,
    selectedStatus,
    searchQuery,
    getStatus,
  ]);

  // Sorted items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'date') {
      list.sort((a, b) => {
        if (!a.releaseDate && !b.releaseDate) return a.releaseYear - b.releaseYear;
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate);
      });
    } else {
      list.sort((a, b) => a.order - b.order);
    }
    return list;
  }, [filteredItems, sortBy]);

  // Group by Universe + Group
  const groupedList = useMemo(() => {
    const map = new Map<string, typeof sortedItems>();
    sortedItems.forEach((item) => {
      const key = `${item.universe} • ${item.group}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [sortedItems]);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleOpenBackup = () => {
    setBackupJson(JSON.stringify({ schemaVersion: 1, progress }, null, 2));
    setBackupMsg(null);
    setBackupOpen(true);
  };

  const handleRestoreJson = () => {
    try {
      const parsed = JSON.parse(backupJson);
      const incoming = parsed.progress || parsed;
      if (!incoming || typeof incoming !== 'object') {
        throw new Error('Invalid JSON format');
      }
      saveProgress(incoming);
      setBackupMsg({
        type: 'success',
        text: `Successfully restored progress for ${Object.keys(incoming).length} titles.`,
      });
    } catch {
      setBackupMsg({
        type: 'error',
        text: 'Invalid progress JSON. Please paste valid backup data.',
      });
    }
  };

  const formatDateDisplay = (item: MarvelItem) => {
    if (item.releaseDate) {
      const [y, m, d] = item.releaseDate.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    if (item.releaseYearEnd) {
      return `${item.releaseYear}–${item.releaseYearEnd}`;
    }
    return String(item.releaseYear);
  };

  const UNIVERSES: MarvelUniverse[] = [
    'MCU',
    'Fox',
    'Sony',
    'Netflix/Marvel TV',
    'Marvel TV',
    'Legacy',
  ];

  return (
    <div className="space-y-6">
      {/* 1. HERO COCKPIT */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left stats & Dual Progress Bars */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Film className="h-4 w-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                MARVEL UNIVERSE WATCHLIST
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Curated chronological and recommended viewing guide across the MCU, Spider-Verse, Defenders, and Multiverse.
            </p>

            {/* Dual Progress Gauges */}
            <div className="space-y-2 pt-1 font-mono text-xs">
              {/* Gauge 1: Essential Core Storyline */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-sans font-semibold text-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                    Essential Saga Progress
                  </span>
                  <span className="font-bold text-foreground">
                    {watchedEssentials} / {totalEssentials.length} ({percentEssentials}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentEssentials}%` }}
                  />
                </div>
              </div>

              {/* Gauge 2: Full Universe Completion */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-sans font-semibold text-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Overall Universe Completion
                  </span>
                  <span className="font-bold text-foreground">
                    {totalWatched} / {items.length} ({percentComplete}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground pt-1">
              <span>{essentialsRemaining} essentials left</span>
              <span>&bull;</span>
              <span>{totalNotWatched} not watched</span>
            </div>
          </div>

          {/* Right Action Buttons & Milestones */}
          <div className="flex flex-col sm:items-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenBackup}
                className="rounded-xl text-xs h-8 border-border"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Backup / Sync
              </Button>
            </div>

            {/* Milestone Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-xs font-mono py-0.5 px-2 transition-all ${
                  isInfinitySagaComplete
                    ? 'border-amber-400 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-border text-muted-foreground opacity-60'
                }`}
              >
                <Award className="h-3 w-3 mr-1" />
                Infinity Saga
              </Badge>

              <Badge
                variant="outline"
                className={`text-xs font-mono py-0.5 px-2 transition-all ${
                  isDefendersComplete
                    ? 'border-purple-400 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold'
                    : 'border-border text-muted-foreground opacity-60'
                }`}
              >
                <Award className="h-3 w-3 mr-1" />
                Defenders
              </Badge>

              <Badge
                variant="outline"
                className={`text-xs font-mono py-0.5 px-2 transition-all ${
                  isSpiderVerseComplete
                    ? 'border-sky-400 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold'
                    : 'border-border text-muted-foreground opacity-60'
                }`}
              >
                <Award className="h-3 w-3 mr-1" />
                Spider-Verse
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 2. "UP NEXT" CARD & NEXT UPCOMING COUNTDOWN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {upNextItem && (
          <Card className="border-border bg-card rounded-2xl shadow-xs p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-600 dark:text-red-400 mb-0.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>UP NEXT IN THE SAGA</span>
              </div>
              <h2 className="font-bold text-base text-foreground truncate">
                {upNextItem.title}
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                #{upNextItem.order} &bull; {upNextItem.group} &bull; {formatDateDisplay(upNextItem)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={() => handleSetStatus(upNextItem, 'watched')}
                className="rounded-xl text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark Watched
              </Button>
              <button
                type="button"
                onClick={() => handleCatchUpPrior(upNextItem)}
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-medium"
                title="Mark all preceding movies as watched in 1 click"
              >
                <Zap className="h-3 w-3 text-amber-500" />
                Catch up prior
              </button>
            </div>
          </Card>
        )}

        {nextUpcoming && (
          <Card className="border-border bg-card rounded-2xl shadow-xs p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary mb-0.5">
                <Layers className="h-3.5 w-3.5" />
                <span>NEXT PREMIERE</span>
              </div>
              <h2 className="font-bold text-base text-foreground truncate">
                {nextUpcoming.title}
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {nextUpcoming.group} &bull; {formatDateDisplay(nextUpcoming)}
              </p>
            </div>

            <Badge
              variant="outline"
              className="text-xs font-mono font-bold border-primary/30 text-primary bg-primary/10 px-2.5 py-1 shrink-0"
            >
              In {nextUpcoming.daysUntil} days
            </Badge>
          </Card>
        )}
      </div>

      {/* 3. CURATED VIEWING TRACK PRESETS */}
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block">
          Curated Viewing Tracks
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTrack('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTrack === 'all'
                ? 'bg-foreground text-background shadow-xs'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            🏆 Full Universe ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTrack('essential')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTrack === 'essential'
                ? 'bg-red-600 text-white shadow-xs'
                : 'border border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 hover:bg-red-100'
            }`}
          >
            🎯 Essential Saga (~32)
          </button>

          <button
            type="button"
            onClick={() => setActiveTrack('golden')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTrack === 'golden'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            💎 Golden Path (Essential + Recommended)
          </button>

          <button
            type="button"
            onClick={() => setActiveTrack('spider')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTrack === 'spider'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'border border-sky-300 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300 hover:bg-sky-100'
            }`}
          >
            🕸️ Spider-Verse & Multiverse
          </button>

          <button
            type="button"
            onClick={() => setActiveTrack('defenders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTrack === 'defenders'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'border border-purple-300 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300 hover:bg-purple-100'
            }`}
          >
            🛡️ Street-Level & Defenders
          </button>
        </div>
      </div>

      {/* 4. SEARCH & FILTER CONTROLS */}
      <div className="space-y-3.5 bg-card border border-border p-4 rounded-2xl shadow-xs">
        {/* Row 1: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, phase, or hero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs sm:text-sm font-medium"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm font-medium text-foreground cursor-pointer"
          >
            <option value="all">All Watch Statuses</option>
            <option value="unwatched">Not Watched</option>
            <option value="watched">Watched</option>
            <option value="unwatched_essentials">⭐ Not Watched Essentials Only</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm font-medium text-foreground cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="Essential">Essential Only</option>
            <option value="Essential+Recommended">Essential + Recommended</option>
            <option value="Recommended">Recommended Only</option>
            <option value="Optional">Optional / Deep Cuts</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'order' | 'date' | 'title')}
            className="h-9 rounded-xl border border-border bg-background px-3 text-xs sm:text-sm font-medium text-foreground cursor-pointer"
          >
            <option value="order">Recommended Viewing Order</option>
            <option value="date">Release Date</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>

        {/* Row 2: Media Type & Quick Smart Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono font-semibold text-muted-foreground mr-1">
              Media:
            </span>
            {(
              [
                ['all', 'All Media'],
                ['movie', '🎬 Movies'],
                ['series', '📺 Series'],
                ['special', '✨ Specials'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedMediaType(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedMediaType === t
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {(activeTrack !== 'all' ||
              selectedUniverse !== 'All' ||
              selectedPriority !== 'All' ||
              selectedStatus !== 'all' ||
              selectedMediaType !== 'all' ||
              searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setActiveTrack('all');
                  setSelectedUniverse('All');
                  setSelectedPriority('All');
                  setSelectedStatus('all');
                  setSelectedMediaType('all');
                  setSearchQuery('');
                }}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Filters
              </button>
            )}

            <span className="text-xs font-mono text-muted-foreground">
              Showing {sortedItems.length} of {items.length} titles
            </span>
          </div>
        </div>

        {/* Row 3: Universe Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
          <span className="text-xs font-mono font-semibold text-muted-foreground mr-1">
            Universe:
          </span>
          <button
            type="button"
            onClick={() => setSelectedUniverse('All')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              selectedUniverse === 'All'
                ? 'bg-foreground text-background'
                : 'border border-border bg-muted/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {UNIVERSES.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setSelectedUniverse(u)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedUniverse === u
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* 5. GROUPED LIST ACCORDIONS */}
      {groupedList.length === 0 ? (
        <Card className="border-border bg-card rounded-2xl shadow-xs p-10 text-center text-sm text-muted-foreground">
          <Film className="h-8 w-8 mx-auto text-primary/40 mb-2" />
          <p className="font-bold text-foreground">No Marvel titles match your filters.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search query, track preset, or priority filters.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedList.map(([groupKey, groupItems]) => {
            const isCollapsed = collapsedGroups[groupKey];
            const groupWatched = groupItems.filter(
              (i) => getStatus(i.id) === 'watched'
            ).length;
            const groupPercent = groupItems.length
              ? Math.round((groupWatched / groupItems.length) * 100)
              : 0;
            const isGroupFullyWatched =
              groupItems.length > 0 && groupWatched === groupItems.length;

            return (
              <div
                key={groupKey}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs transition-all"
              >
                {/* Accordion Header */}
                <div className="py-3 px-4 bg-muted/30 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(groupKey)}
                    className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer flex-1"
                  >
                    <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight truncate">
                      {groupKey}
                    </h3>
                    <Badge variant="outline" className="text-xs font-mono border-border shrink-0">
                      {groupItems.length} {groupItems.length === 1 ? 'title' : 'titles'}
                    </Badge>
                  </button>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    {/* Batch Mark Phase Action */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBatchMarkGroup(groupItems)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        isGroupFullyWatched
                          ? 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                      title="Mark entire phase watched or unwatched"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {isGroupFullyWatched ? 'All Watched' : 'Mark Phase'}
                    </Button>

                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {groupWatched}/{groupItems.length}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-1">
                        ({groupPercent}%)
                      </span>
                    </div>

                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${groupPercent}%` }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(groupKey)}
                      className="p-1 hover:bg-muted rounded-lg text-muted-foreground cursor-pointer"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {!isCollapsed && (
                  <div className="divide-y divide-border/60">
                    {groupItems.map((item) => {
                      const st = getStatus(item.id);
                      const isWatched = st === 'watched';
                      const isUnreleased = !item.isReleased;

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isWatched ? 'bg-muted/15' : 'hover:bg-muted/20'
                          }`}
                        >
                          {/* Left: Quick Cycle Circle & Title Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Fast Circle Button */}
                            <button
                              type="button"
                              onClick={() => handleSetStatus(item, isWatched ? 'unwatched' : 'watched')}
                              title={
                                isWatched
                                  ? 'Watched (Click to mark Not Watched)'
                                  : 'Click to mark Watched'
                              }
                              className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isWatched
                                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                  : 'border-muted-foreground/40 hover:border-emerald-600 text-transparent'
                              }`}
                            >
                              {isWatched ? (
                                <CheckCircle2 className="h-4 w-4 fill-current text-emerald-600 stroke-white" />
                              ) : null}
                            </button>

                            {/* Title & metadata */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-bold text-sm sm:text-base leading-snug ${
                                    isWatched ? 'line-through text-muted-foreground' : 'text-foreground'
                                  }`}
                                >
                                  {item.title}
                                </span>
                                {item.seasons && (
                                  <Badge
                                    variant="outline"
                                    className="text-[11px] font-mono py-0 px-1.5 border-border text-muted-foreground"
                                  >
                                    {item.seasons} {item.seasons === 1 ? 'Season' : 'Seasons'}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5 flex-wrap">
                                <span>{formatDateDisplay(item)}</span>
                                <span>&bull;</span>
                                <span>{item.type}</span>
                                {isUnreleased && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      In {item.daysUntil} days
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Dedicated 1-Click Action Segmented Pills & Priority Badge */}
                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                            {/* Priority Badge */}
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold py-0.5 px-2 rounded-full hidden md:inline-flex ${
                                item.priority === 'Essential'
                                  ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                                  : item.priority === 'Recommended'
                                  ? 'border-amber-300/80 dark:border-amber-800/60 bg-amber-50/40 text-amber-800 dark:text-amber-300'
                                  : 'border-border text-muted-foreground'
                              }`}
                            >
                              {item.priority}
                            </Badge>

                            {/* Direct Action Segmented Group (Not Watched vs Watched) */}
                            <div className="inline-flex rounded-xl border border-border p-0.5 bg-background shadow-xs text-xs">
                              {/* Not Watched Action Button */}
                              <button
                                type="button"
                                onClick={() => handleSetStatus(item, 'unwatched')}
                                title="Mark as Not Watched"
                                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                  !isWatched
                                    ? 'bg-muted text-foreground font-bold shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Not Watched</span>
                              </button>

                              {/* Watched Action Button */}
                              <button
                                type="button"
                                onClick={() => handleSetStatus(item, 'watched')}
                                title="Mark as Watched"
                                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                  isWatched
                                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                    : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Watched</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 6. BACKUP & RESTORE DIALOG */}
      <Dialog open={backupOpen} onOpenChange={setBackupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold">
              Backup or Restore Progress
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Export your watch status as JSON to save a local backup or paste saved data to restore across browsers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <textarea
              value={backupJson}
              onChange={(e) => setBackupJson(e.target.value)}
              rows={8}
              placeholder="Paste backup JSON here..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-input bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />

            {backupMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-medium ${
                  backupMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {backupMsg.text}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(backupJson);
                setBackupMsg({ type: 'success', text: 'Copied JSON to clipboard!' });
              }}
              className="rounded-xl text-xs"
            >
              Copy to Clipboard
            </Button>
            <Button
              size="sm"
              onClick={handleRestoreJson}
              className="rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              Restore JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
