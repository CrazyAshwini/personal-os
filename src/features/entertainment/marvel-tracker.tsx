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
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { toggleMarvelItemAction } from './marvel-actions';
import type {
  MarvelItem,
  MarvelWatchStatus,
  MarvelProgressMap,
  MarvelUniverse,
} from '@/types/marvel';

const STORAGE_KEY = 'marvelWatchlist.progress.v1';

interface MarvelTrackerProps {
  initialCloudProgress?: MarvelProgressMap;
}

export function MarvelTracker({ initialCloudProgress = {} }: MarvelTrackerProps) {
  const [isPending, startTransition] = useTransition();

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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniverse, setSelectedUniverse] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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
      return progress[id]?.status || 'unwatched';
    },
    [progress]
  );

  const handleToggleStatus = (item: MarvelItem) => {
    if (!item.released && item.releaseDate && new Date(item.releaseDate) > today) {
      return; // Cannot mark unreleased titles as watched
    }

    const current = getStatus(item.id);
    let nextStatus: MarvelWatchStatus = 'unwatched';
    if (current === 'unwatched') nextStatus = 'watching';
    else if (current === 'watching') nextStatus = 'watched';
    else nextStatus = 'unwatched';

    const nextProgress = { ...progress };
    if (nextStatus === 'unwatched') {
      delete nextProgress[item.id];
    } else {
      nextProgress[item.id] = {
        ...nextProgress[item.id],
        status: nextStatus,
        watchedOn: nextStatus === 'watched' ? new Date().toISOString() : undefined,
      };
    }

    saveProgress(nextProgress);

    startTransition(async () => {
      await toggleMarvelItemAction(item, nextStatus);
    });
  };

  const handleMarkWatchedDirectly = (item: MarvelItem) => {
    const nextProgress = {
      ...progress,
      [item.id]: {
        status: 'watched' as MarvelWatchStatus,
        watchedOn: new Date().toISOString(),
      },
    };
    saveProgress(nextProgress);
    startTransition(async () => {
      await toggleMarvelItemAction(item, 'watched');
    });
  };

  // Statistics
  const releasedItems = useMemo(() => items.filter((i) => i.isReleased), [items]);
  const totalWatched = useMemo(
    () => releasedItems.filter((i) => getStatus(i.id) === 'watched').length,
    [releasedItems, getStatus]
  );
  const totalWatching = useMemo(
    () => releasedItems.filter((i) => getStatus(i.id) === 'watching').length,
    [releasedItems, getStatus]
  );
  const totalEssentials = useMemo(
    () => releasedItems.filter((i) => i.priority === 'Essential'),
    [releasedItems]
  );
  const essentialsRemaining = useMemo(
    () => totalEssentials.filter((i) => getStatus(i.id) !== 'watched').length,
    [totalEssentials, getStatus]
  );

  const percentComplete = releasedItems.length
    ? Math.round((totalWatched / releasedItems.length) * 100)
    : 0;

  // "Up Next" essential title
  const upNextItem = useMemo(() => {
    return releasedItems
      .filter((i) => i.priority === 'Essential' && getStatus(i.id) !== 'watched')
      .sort((a, b) => a.order - b.order)[0];
  }, [releasedItems, getStatus]);

  // Next Upcoming release
  const nextUpcoming = useMemo(() => {
    return items
      .filter((i) => !i.isReleased && i.daysUntil > 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)[0];
  }, [items]);

  // Milestone checks
  const isInfinitySagaComplete = useMemo(() => {
    const saga = releasedItems.filter((i) =>
      ['Phase 1', 'Phase 2', 'Phase 3'].includes(i.group)
    );
    return saga.length > 0 && saga.every((i) => getStatus(i.id) === 'watched');
  }, [releasedItems, getStatus]);

  const isDefendersComplete = useMemo(() => {
    const def = releasedItems.filter((i) => i.universe === 'Netflix/Marvel TV');
    return def.length > 0 && def.every((i) => getStatus(i.id) === 'watched');
  }, [releasedItems, getStatus]);

  const isSpiderVerseComplete = useMemo(() => {
    const sp = releasedItems.filter((i) => i.group.includes('Spider'));
    return sp.length > 0 && sp.every((i) => getStatus(i.id) === 'watched');
  }, [releasedItems, getStatus]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      // Universe filter
      if (selectedUniverse !== 'All' && i.universe !== selectedUniverse) return false;
      // Priority filter
      if (selectedPriority !== 'All' && i.priority !== selectedPriority) return false;
      // Status filter
      const st = getStatus(i.id);
      if (selectedStatus === 'watched' && st !== 'watched') return false;
      if (selectedStatus === 'watching' && st !== 'watching') return false;
      if (selectedStatus === 'unwatched' && st !== 'unwatched') return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = i.title.toLowerCase().includes(q);
        const matchGroup = i.group.toLowerCase().includes(q);
        const matchUniv = i.universe.toLowerCase().includes(q);
        if (!matchTitle && !matchGroup && !matchUniv) return false;
      }
      return true;
    });
  }, [items, selectedUniverse, selectedPriority, selectedStatus, searchQuery, getStatus]);

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
          {/* Left stats */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Film className="h-4 w-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                MARVEL UNIVERSE WATCHLIST
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              124-title curated viewing order spanning the Marvel Cinematic Universe, Multiverse branches, Defenders Saga, and Marvel Classics.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 font-mono text-xs sm:text-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-foreground">{totalWatched}</span>
                <span className="text-muted-foreground font-sans">of {releasedItems.length} watched</span>
              </div>
              <span className="text-border">•</span>
              <div className="text-primary font-bold">
                {percentComplete}% Complete
              </div>
              <span className="text-border">•</span>
              <div className="text-muted-foreground">
                <strong className="text-foreground">{essentialsRemaining}</strong> essentials remaining
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBackup}
              className="text-xs font-medium h-9 rounded-xl border-border gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Backup / Restore</span>
            </Button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-600 transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
              title={`Watched: ${totalWatched} (${percentComplete}%)`}
            />
            {totalWatching > 0 && (
              <div
                className="bg-amber-500 transition-all duration-300"
                style={{ width: `${(totalWatching / releasedItems.length) * 100}%` }}
                title={`Currently Watching: ${totalWatching}`}
              />
            )}
          </div>
        </div>

        {/* Milestone Badges Strip */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mr-1">
            Achievements:
          </span>
          <Badge
            variant={isInfinitySagaComplete ? 'default' : 'outline'}
            className={`text-xs gap-1 py-0.5 px-2.5 rounded-full ${
              isInfinitySagaComplete
                ? 'bg-amber-500 text-white border-amber-600'
                : 'border-border text-muted-foreground opacity-60'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Infinity Saga (Phases 1-3)</span>
          </Badge>

          <Badge
            variant={isDefendersComplete ? 'default' : 'outline'}
            className={`text-xs gap-1 py-0.5 px-2.5 rounded-full ${
              isDefendersComplete
                ? 'bg-purple-600 text-white border-purple-700'
                : 'border-border text-muted-foreground opacity-60'
            }`}
          >
            <Award className="h-3 w-3" />
            <span>Defenders Saga</span>
          </Badge>

          <Badge
            variant={isSpiderVerseComplete ? 'default' : 'outline'}
            className={`text-xs gap-1 py-0.5 px-2.5 rounded-full ${
              isSpiderVerseComplete
                ? 'bg-rose-600 text-white border-rose-700'
                : 'border-border text-muted-foreground opacity-60'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>Spider-Verse Complete</span>
          </Badge>
        </div>
      </div>

      {/* 2. "UP NEXT" CARD & UPCOMING BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Up Next Card */}
        {upNextItem ? (
          <Card className="border-border bg-card rounded-2xl shadow-xs border-l-4 border-l-primary overflow-hidden">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-primary font-bold uppercase tracking-wider block">
                  Up Next In Recommended Order
                </span>
                <h3 className="font-bold text-base sm:text-lg text-foreground truncate mt-0.5">
                  {upNextItem.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {upNextItem.group} &bull; {formatDateDisplay(upNextItem)} &bull; {upNextItem.type}
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => handleMarkWatchedDirectly(upNextItem)}
                disabled={isPending}
                className="shrink-0 rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark Watched</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card rounded-2xl shadow-xs p-5 flex items-center justify-center text-center">
            <div>
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
              <h4 className="font-bold text-sm text-foreground">All Essential Titles Watched!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Switch filters to Recommended or Optional to dive deeper.
              </p>
            </div>
          </Card>
        )}

        {/* Upcoming Movie Countdown */}
        {nextUpcoming && (
          <Card className="border-border bg-card rounded-2xl shadow-xs border-l-4 border-l-amber-500 overflow-hidden">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
                  Next Marvel Premiere
                </span>
                <h3 className="font-bold text-base sm:text-lg text-foreground truncate mt-0.5">
                  {nextUpcoming.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nextUpcoming.group} &bull; Releases {formatDateDisplay(nextUpcoming)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 block">
                  {nextUpcoming.daysUntil}
                </span>
                <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-tight">
                  Days Left
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. SEARCH & FILTER CONTROLS */}
      <div className="space-y-3.5 bg-card border border-border p-4 rounded-2xl shadow-xs">
        {/* Row 1: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <option value="watching">Currently Watching</option>
            <option value="watched">Watched</option>
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

        {/* Row 2: Universe Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-mono font-semibold text-muted-foreground mr-1">
            Universe:
          </span>
          <button
            type="button"
            onClick={() => setSelectedUniverse('All')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              selectedUniverse === 'All'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-muted/40 text-muted-foreground hover:text-foreground'
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
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Row 3: Priority Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-mono font-semibold text-muted-foreground mr-1">
            Priority:
          </span>
          {(['All', 'Essential', 'Recommended', 'Optional'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPriority(p)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedPriority === p
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}

          {(selectedUniverse !== 'All' ||
            selectedPriority !== 'All' ||
            selectedStatus !== 'all' ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedUniverse('All');
                setSelectedPriority('All');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-xs text-primary hover:underline font-semibold ml-2 cursor-pointer"
            >
              Reset Filters
            </button>
          )}

          <span className="text-xs font-mono text-muted-foreground ml-auto">
            Showing {sortedItems.length} of {items.length} titles
          </span>
        </div>
      </div>

      {/* 4. GROUPED LIST ACCORDIONS */}
      {groupedList.length === 0 ? (
        <Card className="border-border bg-card rounded-2xl shadow-xs p-10 text-center text-sm text-muted-foreground">
          <Film className="h-8 w-8 mx-auto text-primary/40 mb-2" />
          <p className="font-bold text-foreground">No Marvel titles match your filters.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search query, priority, or universe filters.
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

            return (
              <div
                key={groupKey}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs transition-all"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(groupKey)}
                  className="w-full py-3.5 px-4 bg-muted/30 border-b border-border/80 flex items-center justify-between gap-4 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight truncate">
                      {groupKey}
                    </h3>
                    <Badge variant="outline" className="text-xs font-mono border-border shrink-0">
                      {groupItems.length} {groupItems.length === 1 ? 'title' : 'titles'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
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

                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Items List */}
                {!isCollapsed && (
                  <div className="divide-y divide-border/60">
                    {groupItems.map((item) => {
                      const st = getStatus(item.id);
                      const isWatched = st === 'watched';
                      const isWatching = st === 'watching';
                      const isUnreleased = !item.isReleased;

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 sm:p-4 flex items-center justify-between gap-3.5 transition-colors ${
                            isWatched
                              ? 'bg-muted/15'
                              : isWatching
                              ? 'bg-amber-50/20 dark:bg-amber-950/10'
                              : 'hover:bg-muted/20'
                          }`}
                        >
                          {/* Left: Status Toggle Button & Details */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* 3-State Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              disabled={isUnreleased || isPending}
                              title={
                                isUnreleased
                                  ? 'Unreleased title'
                                  : `Status: ${st}. Tap to cycle status.`
                              }
                              className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isUnreleased
                                  ? 'border-border bg-muted/40 cursor-not-allowed opacity-50'
                                  : isWatched
                                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                  : isWatching
                                  ? 'border-amber-500 bg-amber-500/20 text-amber-600'
                                  : 'border-muted-foreground/40 hover:border-primary text-transparent'
                              }`}
                            >
                              {isWatched ? (
                                <CheckCircle2 className="h-5 w-5 fill-current text-emerald-600 stroke-white" />
                              ) : isWatching ? (
                                <Eye className="h-4 w-4" />
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

                          {/* Right: Badges */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold py-0.5 px-2 rounded-full hidden sm:inline-flex ${
                                item.priority === 'Essential'
                                  ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                                  : item.priority === 'Recommended'
                                  ? 'border-border text-foreground'
                                  : 'border-border text-muted-foreground'
                              }`}
                            >
                              {item.priority}
                            </Badge>

                            {isWatched ? (
                              <Badge className="text-xs bg-emerald-600 text-white font-mono py-0.5 px-2">
                                Watched
                              </Badge>
                            ) : isWatching ? (
                              <Badge className="text-xs bg-amber-500 text-white font-mono py-0.5 px-2">
                                Watching
                              </Badge>
                            ) : isUnreleased ? (
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground font-mono py-0.5 px-2">
                                Upcoming
                              </Badge>
                            ) : null}
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

      {/* 5. BACKUP & RESTORE DIALOG */}
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
              className="w-full h-44 rounded-xl border border-border bg-muted/30 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Paste backup JSON here..."
            />

            {backupMsg && (
              <p
                className={`text-xs font-medium ${
                  backupMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {backupMsg.text}
              </p>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 justify-end sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(backupJson);
                setBackupMsg({ type: 'success', text: 'Copied JSON to clipboard!' });
              }}
              className="rounded-xl text-xs"
            >
              Copy JSON
            </Button>
            <Button
              size="sm"
              onClick={handleRestoreJson}
              className="rounded-xl text-xs font-semibold"
            >
              Restore Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
