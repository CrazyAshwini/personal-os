'use client';

import React, { useState, useTransition } from 'react';
import { FileText } from 'lucide-react';
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
import { createAssignmentAction } from '@/features/academics/actions';
import type { Database } from '@/types/database';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];

interface CreateAssignmentDialogProps {
  subjects: SubjectRow[];
  onSuccess?: () => void;
}

export function CreateAssignmentDialog({
  subjects,
  onSuccess,
}: CreateAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [maxMarks, setMaxMarks] = useState('100');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await createAssignmentAction({
        subjectId: subjectId || null,
        title,
        description: description || null,
        dueDate: new Date(dueDate).toISOString(),
        status: 'pending',
        maxMarks: maxMarks ? Number(maxMarks) : null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setTitle('');
        setDescription('');
        onSuccess?.();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer">
        <FileText className="h-3.5 w-3.5" />
        New Assignment
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Create Academic Assignment</DialogTitle>
          <DialogDescription className="text-xs">
            Track coursework, problem sets, and lab reports.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="asg-title" className="text-xs">Assignment Title *</Label>
            <Input
              id="asg-title"
              placeholder="e.g. Homework 3: Virtual Memory & Page Tables"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asg-subject" className="text-xs">Subject</Label>
            <select
              id="asg-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs outline-none"
            >
              <option value="">General / No specific subject</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asg-due" className="text-xs">Due Date & Time *</Label>
              <Input
                id="asg-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asg-marks" className="text-xs">Max Marks</Label>
              <Input
                id="asg-marks"
                type="number"
                min={0}
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asg-desc" className="text-xs">Description / Instructions</Label>
            <Input
              id="asg-desc"
              placeholder="Optional notes or submission link"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              disabled={isPending || !title.trim()}
              className="h-8 text-xs"
            >
              {isPending ? 'Saving...' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
