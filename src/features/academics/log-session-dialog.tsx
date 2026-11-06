'use client';

import React, { useState, useTransition } from 'react';
import { CalendarCheck2 } from 'lucide-react';
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
import { logClassSessionAction } from '@/features/academics/actions';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];

interface LogSessionDialogProps {
  subjects: SubjectRow[];
  defaultSubjectId?: string;
  onSuccess?: () => void;
}

export function LogSessionDialog({
  subjects,
  defaultSubjectId,
  onSuccess,
}: LogSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(
    defaultSubjectId || subjects[0]?.id || ''
  );
  const [sessionDate, setSessionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<'present' | 'absent' | 'cancelled' | 'no_class'>(
    'present'
  );
  const [topicCovered, setTopicCovered] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await logClassSessionAction({
        subjectId,
        sessionDate,
        status,
        topicCovered: topicCovered || null,
        notes: notes || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setTopicCovered('');
        setNotes('');
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs">
        <CalendarCheck2 className="h-3.5 w-3.5" />
        Log Class Attendance
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Record Class Session</DialogTitle>
          <DialogDescription className="text-xs">
            Individual sessions form the immutable ground truth for attendance
            derivation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="session-subject" className="text-xs">Subject *</Label>
            <select
              id="session-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none"
              required
            >
              <option value="" disabled>Select a subject</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-date" className="text-xs">Date *</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="session-status" className="text-xs">Status *</Label>
              <select
                id="session-status"
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as 'present' | 'absent' | 'cancelled' | 'no_class'
                  )
                }
                className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none"
              >
                <option value="present">Present (Attended)</option>
                <option value="absent">Absent (Missed)</option>
                <option value="cancelled">Cancelled (Excluded)</option>
                <option value="no_class">No Class / Holiday (Excluded)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-topic" className="text-xs">Topic Covered</Label>
            <Input
              id="session-topic"
              placeholder="e.g. Chapter 4: Memory Management"
              value={topicCovered}
              onChange={(e) => setTopicCovered(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-notes" className="text-xs">Notes</Label>
            <Input
              id="session-notes"
              placeholder="Optional notes, homework assigned, or announcements"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !subjectId}
              className="h-8 text-xs"
            >
              {isPending ? 'Logging...' : 'Save Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
