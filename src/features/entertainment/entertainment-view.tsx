'use client';

import React, { useState, useTransition } from 'react';
import {
  Film,
  Plus,
  Trash2,
  Star,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createMediaItemAction,
  updateMediaProgressAction,
  deleteMediaItemAction,
} from '@/features/personal-life/actions';
import { MarvelTracker } from './marvel-tracker';
import type { Database } from '@/types/database';
import type { MarvelProgressMap } from '@/types/marvel';

type MediaRow = Database['public']['Tables']['media_items']['Row'];

interface EntertainmentViewProps {
  mediaItems: MediaRow[];
  initialMarvelProgress?: MarvelProgressMap;
}

export function EntertainmentView({
  mediaItems,
  initialMarvelProgress = {},
}: EntertainmentViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'movie' | 'series' | 'anime' | 'documentary'>('series');
  const [status, setStatus] = useState<'plan_to_watch' | 'watching' | 'completed' | 'dropped'>('watching');
  const [totalEpisodes, setTotalEpisodes] = useState('12');
  const [watchedEpisodes, setWatchedEpisodes] = useState('0');
  const [rating, setRating] = useState('8');
  const [releaseYear, setReleaseYear] = useState('2024');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await createMediaItemAction({
        title,
        type,
        status,
        totalEpisodes: Number(totalEpisodes) || 1,
        watchedEpisodes: Number(watchedEpisodes) || 0,
        rating: rating ? Number(rating) : null,
        releaseYear: releaseYear ? Number(releaseYear) : null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setTitle('');
      }
    });
  };

  const handleIncrementEpisode = (item: MediaRow, delta: number) => {
    const nextVal = Math.min(item.total_episodes, Math.max(0, item.watched_episodes + delta));
    const nextStatus = nextVal >= item.total_episodes && item.total_episodes > 0 ? 'completed' : item.status;

    startTransition(async () => {
      await updateMediaProgressAction(item.id, nextVal, nextStatus);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteMediaItemAction(id);
    });
  };

  const personalMediaItems = mediaItems.filter((m) => !m.review?.startsWith('marvel:'));

  const filteredItems =
    filterType === 'all'
      ? personalMediaItems
      : personalMediaItems.filter((m) => m.type === filterType);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="watchlist" className="space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-2xl border border-border h-auto flex flex-wrap">
          <TabsTrigger
            value="watchlist"
            className="text-xs sm:text-sm font-semibold rounded-xl py-2 px-3.5 gap-2 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <Film className="h-4 w-4" />
            <span>My Watchlist ({personalMediaItems.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="marvel"
            className="text-xs sm:text-sm font-semibold rounded-xl py-2 px-3.5 gap-2 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span>Marvel Universe Watchlist (124)</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist" className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                Movies & Series Tracker
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Log movies, web series, and anime with episode progress and personal scores.
              </p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Add Media
              </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Add Show or Movie</DialogTitle>
              <DialogDescription className="text-xs">
                Track your watchlist and episode progress.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateMedia} className="space-y-4 pt-2">
              {error && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="m-title" className="text-xs">Title *</Label>
                <Input
                  id="m-title"
                  required
                  placeholder="e.g. Severance, Oppenheimer, Attack on Titan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-type" className="text-xs">Media Type</Label>
                  <select
                    id="m-type"
                    value={type}
                    onChange={(e) =>
                      setType(
                        e.target.value as 'movie' | 'series' | 'anime' | 'documentary'
                      )
                    }
                    className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs outline-none cursor-pointer"
                  >
                    <option value="series">TV / Web Series</option>
                    <option value="movie">Movie</option>
                    <option value="anime">Anime</option>
                    <option value="documentary">Documentary</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-status" className="text-xs">Watch Status</Label>
                  <select
                    id="m-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as
                          | 'plan_to_watch'
                          | 'watching'
                          | 'completed'
                          | 'dropped'
                      )
                    }
                    className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs outline-none cursor-pointer"
                  >
                    <option value="watching">Currently Watching</option>
                    <option value="plan_to_watch">Plan to Watch</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-ep" className="text-xs">Total Eps</Label>
                  <Input
                    id="m-ep"
                    type="number"
                    min={1}
                    value={totalEpisodes}
                    onChange={(e) => setTotalEpisodes(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-wep" className="text-xs">Watched</Label>
                  <Input
                    id="m-wep"
                    type="number"
                    min={0}
                    value={watchedEpisodes}
                    onChange={(e) => setWatchedEpisodes(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-score" className="text-xs">Rating</Label>
                  <Input
                    id="m-score"
                    type="number"
                    min={1}
                    max={10}
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-year" className="text-xs">Year</Label>
                  <Input
                    id="m-year"
                    type="number"
                    min={1900}
                    max={2100}
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 text-xs rounded-lg border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !title.trim()}
                  className="h-8 text-xs rounded-lg shadow-xs"
                >
                  {isPending ? 'Saving...' : 'Add to Watchlist'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(['all', 'series', 'movie', 'anime'] as const).map((tab) => (
          <Button
            key={tab}
            variant={filterType === tab ? 'default' : 'outline'}
            size="sm"
            className={`h-8 text-xs rounded-lg capitalize border-border cursor-pointer ${
              filterType === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setFilterType(tab)}
          >
            {tab === 'all' ? 'All Media' : tab} (
            {tab === 'all'
              ? mediaItems.length
              : mediaItems.filter((m) => m.type === tab).length}
            )
          </Button>
        ))}
      </div>

      {/* Media Grid */}
      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground border-border bg-card rounded-xl shadow-xs">
          <Film className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p>No media logged in this category yet.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="mt-4 text-xs h-8 rounded-lg border-border"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Show
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isCompleted = item.watched_episodes >= item.total_episodes;
            const pct =
              item.total_episodes > 0
                ? Math.round((item.watched_episodes / item.total_episodes) * 100)
                : 0;

            return (
              <Card
                key={item.id}
                className="border-border bg-card rounded-xl shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold line-clamp-1 text-foreground">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {item.type} {item.release_year ? `• ${item.release_year}` : ''}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={isCompleted ? 'secondary' : 'outline'}
                      className="text-[10px] capitalize font-mono shrink-0 border-border"
                    >
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Episode Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>
                        Episode {item.watched_episodes} of {item.total_episodes}
                      </span>
                      <span className="font-semibold text-foreground font-mono">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  {item.rating && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      <span className="font-bold text-foreground font-mono">
                        {item.rating}/10
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 px-2 text-[11px] rounded-lg border-border"
                        disabled={isPending || item.watched_episodes <= 0}
                        onClick={() => handleIncrementEpisode(item, -1)}
                      >
                        -1 Ep
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 px-2 text-[11px] rounded-lg border-border"
                        disabled={isPending || item.watched_episodes >= item.total_episodes}
                        onClick={() => handleIncrementEpisode(item, 1)}
                      >
                        +1 Ep
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      aria-label="Delete media item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        <TabsContent value="marvel" className="space-y-6">
          <MarvelTracker initialCloudProgress={initialMarvelProgress} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
