'use client';

import React, { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Pin,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from '@/features/personal-life/actions';
import type { Database } from '@/types/database';

type NoteRow = Database['public']['Tables']['notes']['Row'];

interface NotesViewProps {
  notes: NoteRow[];
}

export function NotesView({ notes }: NotesViewProps) {
  const [open, setOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenCreate = () => {
    setEditNote(null);
    setTitle('');
    setContent('');
    setCategory('general');
    setIsPinned(false);
    setOpen(true);
  };

  const handleOpenEdit = (n: NoteRow) => {
    setEditNote(n);
    setTitle(n.title);
    setContent(n.content);
    setCategory(n.category);
    setIsPinned(n.is_pinned);
    setOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setError(null);

    startTransition(async () => {
      if (editNote) {
        await updateNoteAction(editNote.id, title, content, category);
      } else {
        await createNoteAction({
          title,
          content,
          category,
          isPinned,
        });
      }

      setOpen(false);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteNoteAction(id);
    });
  };

  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const unpinnedNotes = notes.filter((n) => !n.is_pinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Notes & Knowledge Vault
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Private markdown notes, study thoughts, and quick personal memos.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New Note
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editNote ? 'Edit Note' : 'Create New Note'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Your private thoughts are encrypted and isolated with Row Level Security.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveNote} className="space-y-4 pt-2">
              {error && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="n-title" className="text-xs">Title *</Label>
                <Input
                  id="n-title"
                  required
                  placeholder="e.g. Distributed Consensus Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="n-cat" className="text-xs">Category</Label>
                  <Input
                    id="n-cat"
                    placeholder="e.g. academic, personal, ideas"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                {!editNote && (
                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span>Pin note to top</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="n-content" className="text-xs">Content</Label>
                <textarea
                  id="n-content"
                  rows={8}
                  placeholder="Write your note markdown here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-xs font-mono outline-none resize-y"
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
                  {isPending ? 'Saving...' : 'Save Note'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p>No notes written yet. Click &ldquo;New Note&rdquo; to capture thoughts.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                Pinned Notes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((n) => (
                  <Card
                    key={n.id}
                    className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60 transition-colors flex flex-col justify-between"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold truncate">
                          {n.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {n.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-mono">
                        {n.content || '(Empty note)'}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span>{format(new Date(n.created_at), 'MMM d, yyyy')}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(n)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit note"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(n.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {unpinnedNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  All Notes
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedNotes.map((n) => (
                  <Card
                    key={n.id}
                    className="hover:border-primary/40 transition-colors flex flex-col justify-between"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold truncate">
                          {n.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {n.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-mono">
                        {n.content || '(Empty note)'}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span>{format(new Date(n.created_at), 'MMM d, yyyy')}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(n)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit note"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(n.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
