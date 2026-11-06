'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createEventAction } from '@/features/calendar/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';

const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(200),
    description: z.string().optional(),
    eventType: z.enum(['academic', 'exam', 'personal', 'travel', 'holiday', 'other']),
    startTime: z.string().min(1, 'Start date/time is required.'),
    endTime: z.string().min(1, 'End date/time is required.'),
    isAllDay: z.boolean().default(false),
    location: z.string().optional(),
    color: z.string().default('#3b82f6'),
  })
  .refine(
    (data) => new Date(data.endTime).getTime() >= new Date(data.startTime).getTime(),
    {
      message: 'End time cannot be earlier than start time.',
      path: ['endTime'],
    }
  );

interface EventFormValues {
  title: string;
  description?: string;
  eventType: 'academic' | 'exam' | 'personal' | 'travel' | 'holiday' | 'other';
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  location?: string;
  color: string;
}

export function CreateEventDialog({
  defaultDate,
}: {
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [initialStart] = useState(() =>
    defaultDate ? `${defaultDate}T09:00` : new Date().toISOString().slice(0, 16)
  );
  const [initialEnd] = useState(() =>
    defaultDate
      ? `${defaultDate}T10:00`
      : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema) as never,
    defaultValues: {
      title: '',
      description: '',
      eventType: 'personal',
      startTime: initialStart,
      endTime: initialEnd,
      isAllDay: false,
      location: '',
      color: '#3b82f6',
    },
  });

  const onSubmit = async (data: EventFormValues) => {
    setServerError(null);
    setIsPending(true);

    try {
      const result = await createEventAction({
        title: data.title,
        description: data.description || null,
        eventType: data.eventType,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        isAllDay: Boolean(data.isAllDay),
        location: data.location || null,
        color: data.color,
      });

      if (result.error) {
        setServerError(result.error);
      } else {
        reset();
        setOpen(false);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-xs">
        <Plus className="h-4 w-4" />
        <span>New Event</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
          <DialogDescription>
            Schedule academic deadlines, exams, personal activities, or travel
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {serverError && (
            <p className="text-xs text-red-600 dark:text-red-400">{serverError}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="e.g., Computer Networks Midterm Exam"
              disabled={isPending}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-type">Category</Label>
              <select
                id="event-type"
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isPending}
                {...register('eventType')}
              >
                <option value="academic">Academic Class</option>
                <option value="exam">Examination</option>
                <option value="personal">Personal</option>
                <option value="travel">Travel</option>
                <option value="holiday">Holiday</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-color">Color</Label>
              <select
                id="event-color"
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isPending}
                {...register('color')}
              >
                <option value="#3b82f6">Blue (Default)</option>
                <option value="#ef4444">Red (High Priority)</option>
                <option value="#10b981">Emerald (Academic)</option>
                <option value="#f59e0b">Amber (Exams)</option>
                <option value="#8b5cf6">Purple (Personal)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Start Time</Label>
              <Input
                id="event-start"
                type="datetime-local"
                disabled={isPending}
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-xs text-red-600">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-end">End Time</Label>
              <Input
                id="event-end"
                type="datetime-local"
                disabled={isPending}
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className="text-xs text-red-600">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-location">Location / Room</Label>
            <Input
              id="event-location"
              placeholder="e.g., Lecture Hall B / Online"
              disabled={isPending}
              {...register('location')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-desc">Description / Notes</Label>
            <Input
              id="event-desc"
              placeholder="Optional event details..."
              disabled={isPending}
              {...register('description')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
