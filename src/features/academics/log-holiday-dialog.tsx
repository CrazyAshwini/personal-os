'use client';

import React, { useState, useTransition } from 'react';
import { Sun, Trash2, CalendarDays } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { logHolidayAction, deleteHolidayRangeAction } from '@/features/academics/actions';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];
type ClassSessionRow = Database['public']['Tables']['class_sessions']['Row'];

interface LogHolidayDialogProps {
  subjects: SubjectRow[];
  defaultSubjectId?: string;
  sessions?: ClassSessionRow[];
  onSuccess?: () => void;
}

export function LogHolidayDialog({
  subjects,
  defaultSubjectId,
  sessions,
  onSuccess,
}: LogHolidayDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(defaultSubjectId || 'all');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Extract unique holiday periods from sessions
  const holidayGroups = React.useMemo(() => {
    if (!sessions) return [];
    const holidaySessions = sessions.filter((s) => s.status === 'no_class');
    const groupMap: Record<string, { title: string; dates: string[] }> = {};

    for (const s of holidaySessions) {
      const key = s.notes || 'Academic Holiday';
      if (!groupMap[key]) {
        groupMap[key] = { title: key, dates: [] };
      }
      if (!groupMap[key].dates.includes(s.session_date)) {
        groupMap[key].dates.push(s.session_date);
      }
    }

    return Object.values(groupMap).map((g) => {
      g.dates.sort();
      return {
        title: g.title.startsWith('Holiday: ') ? g.title.replace('Holiday: ', '') : g.title,
        startDate: g.dates[0],
        endDate: g.dates[g.dates.length - 1],
        count: g.dates.length,
      };
    });
  }, [sessions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await logHolidayAction({
        startDate,
        endDate: endDate || startDate,
        title: title || undefined,
        subjectId: subjectId === 'all' ? undefined : subjectId,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setTitle('');
        onSuccess?.();
      }
    });
  };

  const handleDeleteHoliday = (delStart: string, delEnd: string) => {
    startTransition(async () => {
      const res = await deleteHolidayRangeAction({
        startDate: delStart,
        endDate: delEnd,
      });
      if (res.error) {
        setError(res.error);
      } else {
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-foreground h-8 px-2.5 text-xs gap-1.5 font-medium cursor-pointer hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span>Add Holiday</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Sun className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold">
                Log Academic Holiday / No Class
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Holidays are excluded from conducted lecture counts, preserving your attendance percentage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* 2 Date Range Options: From - To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-start-date" className="text-xs font-semibold">
                From Date *
              </Label>
              <Input
                id="holiday-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartDate(newStart);
                  if (!endDate || endDate < newStart) {
                    setEndDate(newStart);
                  }
                }}
                required
                className="text-xs sm:text-sm h-9 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="holiday-end-date" className="text-xs font-semibold">
                To Date *
              </Label>
              <Input
                id="holiday-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="text-xs sm:text-sm h-9 rounded-xl font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1 font-mono">
            {startDate === endDate
              ? 'Single-day holiday'
              : `Multi-day holiday from ${startDate} to ${endDate}`}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="holiday-title" className="text-xs font-medium">
              Occasion / Reason (Optional)
            </Label>
            <Input
              id="holiday-title"
              type="text"
              placeholder="e.g. Diwali Break, National Holiday, College Fest"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="holiday-scope" className="text-xs font-medium">
              Applies To
            </Label>
            <select
              id="holiday-scope"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full text-xs h-9 rounded-xl border border-input bg-background px-3 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">🌟 All Subjects (College-wide Holiday)</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="h-8 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-8 rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isPending ? 'Saving Holiday...' : 'Confirm Holiday'}
            </Button>
          </DialogFooter>
        </form>

        {/* Active Holidays List */}
        {holidayGroups.length > 0 && (
          <div className="pt-4 border-t border-border space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              <span>Logged Holidays ({holidayGroups.length})</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {holidayGroups.map((grp) => (
                <div
                  key={`${grp.startDate}-${grp.endDate}-${grp.title}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-foreground truncate block">
                      {grp.title}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {grp.startDate === grp.endDate
                        ? grp.startDate
                        : `${grp.startDate} → ${grp.endDate}`}{' '}
                      ({grp.count} {grp.count === 1 ? 'day' : 'days'})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDeleteHoliday(grp.startDate, grp.endDate)}
                    className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer shrink-0 font-medium"
                    title="Delete Holiday"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
