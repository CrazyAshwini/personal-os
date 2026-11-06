'use client';

import React, { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
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
import { createSubjectAction } from '@/features/academics/actions';

interface CreateSubjectDialogProps {
  semesterId?: string | null;
  onSuccess?: () => void;
}

export function CreateSubjectDialog({ semesterId, onSuccess }: CreateSubjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [instructor, setInstructor] = useState('');
  const [credits, setCredits] = useState('3');
  const [color, setColor] = useState('#3b82f6');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createSubjectAction({
        semesterId: semesterId || null,
        name,
        code: code || null,
        instructor: instructor || null,
        credits: parseInt(credits, 10) || 3,
        color,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setName('');
        setCode('');
        setInstructor('');
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer">
        <Plus className="h-3.5 w-3.5" />
        Add Subject
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add Academic Subject</DialogTitle>
          <DialogDescription className="text-xs">
            Create a course subject for your attendance, timetable, and assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sub-name" className="text-xs">Course Name *</Label>
            <Input
              id="sub-name"
              required
              placeholder="e.g. Operating Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-code" className="text-xs">Course Code</Label>
              <Input
                id="sub-code"
                placeholder="e.g. CS301"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-credits" className="text-xs">Credits</Label>
              <Input
                id="sub-credits"
                type="number"
                min={0}
                max={30}
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-instructor" className="text-xs">Instructor / Professor</Label>
            <Input
              id="sub-instructor"
              placeholder="e.g. Dr. Jane Doe"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-color" className="text-xs">Badge Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="sub-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 rounded border border-border cursor-pointer p-0.5 bg-background"
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
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !name.trim()}
              className="h-8 text-xs"
            >
              {isPending ? 'Saving...' : 'Save Subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
