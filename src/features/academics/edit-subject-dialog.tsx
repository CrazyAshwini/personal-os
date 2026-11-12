'use client';

import React, { useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { updateSubjectAction } from '@/features/academics/actions';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];

interface EditSubjectDialogProps {
  subject: SubjectRow;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditSubjectDialog({ subject, trigger, onSuccess }: EditSubjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code || '');
  const [instructor, setInstructor] = useState(subject.instructor || '');
  const [credits, setCredits] = useState(subject.credits?.toString() || '3');
  const [color, setColor] = useState(subject.color || '#3b82f6');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName(subject.name);
      setCode(subject.code || '');
      setInstructor(subject.instructor || '');
      setCredits(subject.credits?.toString() || '3');
      setColor(subject.color || '#3b82f6');
      setError(null);
    }
    setOpen(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject name is required.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await updateSubjectAction({
        id: subject.id,
        name: name.trim(),
        code: code.trim() || null,
        instructor: instructor.trim() || null,
        credits: parseInt(credits, 10) || 0,
        color,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ? (
            React.isValidElement(trigger) ? trigger : <span>{trigger}</span>
          ) : (
            <button
              type="button"
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Edit Subject & Faculty"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <DialogTitle className="text-base font-bold">Edit Subject & Faculty</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {error && (
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`edit-subj-name-${subject.id}`} className="text-xs font-semibold">
              Subject Name *
            </Label>
            <Input
              id={`edit-subj-name-${subject.id}`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs h-9 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-subj-code-${subject.id}`} className="text-xs font-semibold">
                Course Code
              </Label>
              <Input
                id={`edit-subj-code-${subject.id}`}
                type="text"
                placeholder="e.g. PYSQ1107"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-xs h-9 rounded-xl font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-subj-credits-${subject.id}`} className="text-xs font-semibold">
                Credits
              </Label>
              <Input
                id={`edit-subj-credits-${subject.id}`}
                type="number"
                min="0"
                max="30"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="text-xs h-9 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-subj-instructor-${subject.id}`} className="text-xs font-semibold">
              Faculty / Instructor
            </Label>
            <Input
              id={`edit-subj-instructor-${subject.id}`}
              type="text"
              placeholder="e.g. mmm, SN, AR, AJ"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              className="text-xs h-9 rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter the teacher initials or full name (classroom belongs in Timetable Slot).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-subj-color-${subject.id}`} className="text-xs font-semibold">
              Accent Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                id={`edit-subj-color-${subject.id}`}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 rounded-lg cursor-pointer border border-input p-0.5 bg-background"
              />
              <span className="text-xs font-mono text-muted-foreground">{color}</span>
            </div>
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
              className="h-8 rounded-xl text-xs font-medium"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
