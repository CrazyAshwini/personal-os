'use client';

import React, { useState, useTransition } from 'react';
import { Sun, Calendar } from 'lucide-react';
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
import { logHolidayAction } from '@/features/academics/actions';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];

interface LogHolidayDialogProps {
  subjects: SubjectRow[];
  defaultSubjectId?: string;
  onSuccess?: () => void;
}

export function LogHolidayDialog({
  subjects,
  defaultSubjectId,
  onSuccess,
}: LogHolidayDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(defaultSubjectId || 'all');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-foreground h-8 px-2.5 text-xs gap-1.5 font-medium cursor-pointer hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span>Add Holiday</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
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
              <Label htmlFor="holiday-start-date" className="text-xs font-medium">
                From Date *
              </Label>
              <div className="relative">
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
                  className="text-xs h-9 rounded-xl pr-9"
                />
                <Calendar className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="holiday-end-date" className="text-xs font-medium">
                To Date *
              </Label>
              <div className="relative">
                <Input
                  id="holiday-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="text-xs h-9 rounded-xl pr-9"
                />
                <Calendar className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
              </div>
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
              {isPending ? 'Logging Holiday...' : 'Confirm Holiday'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
