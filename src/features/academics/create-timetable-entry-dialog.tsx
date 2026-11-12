'use client';

import React, { useState, useTransition } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTimetableEntryAction } from '@/features/academics/actions';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];

interface CreateTimetableEntryDialogProps {
  subjects: SubjectRow[];
  onSuccess?: () => void;
}

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export function CreateTimetableEntryDialog({
  subjects,
  onSuccess,
}: CreateTimetableEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [classroom, setClassroom] = useState('');
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
      const res = await createTimetableEntryAction({
        subjectId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        classroom: classroom || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setClassroom('');
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer">
        <CalendarPlus className="h-3.5 w-3.5" />
        Add Timetable Slot
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add Timetable Slot</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tt-subject" className="text-xs">Subject *</Label>
            <select
              id="tt-subject"
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

          <div className="space-y-1.5">
            <Label htmlFor="tt-day" className="text-xs">Day of the Week *</Label>
            <select
              id="tt-day"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tt-start" className="text-xs">Start Time *</Label>
              <Input
                id="tt-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tt-end" className="text-xs">End Time *</Label>
              <Input
                id="tt-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tt-room" className="text-xs">Classroom / Room No.</Label>
            <Input
              id="tt-room"
              placeholder="e.g. Hall 4B, Lab 2"
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
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
              {isPending ? 'Adding...' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
