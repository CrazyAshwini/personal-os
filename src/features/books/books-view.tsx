'use client';

import React, { useState, useTransition } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Star,
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
import {
  createBookAction,
  updateBookProgressAction,
  deleteBookAction,
} from '@/features/personal-life/actions';
import type { Database } from '@/types/database';

type BookRow = Database['public']['Tables']['books']['Row'];

interface BooksViewProps {
  books: BookRow[];
}

export function BooksView({ books }: BooksViewProps) {
  const [filter, setFilter] = useState<'all' | 'reading' | 'want_to_read' | 'completed'>('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [status, setStatus] = useState<'want_to_read' | 'reading' | 'completed' | 'abandoned'>('reading');
  const [totalPages, setTotalPages] = useState('300');
  const [currentPage, setCurrentPage] = useState('0');
  const [rating, setRating] = useState('5');
  const [review, setReview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError('Title and author are required.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await createBookAction({
        title,
        author,
        isbn: isbn || null,
        status,
        totalPages: Number(totalPages) || 0,
        currentPage: Number(currentPage) || 0,
        rating: rating ? Number(rating) : null,
        review: review || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setTitle('');
        setAuthor('');
        setIsbn('');
        setReview('');
      }
    });
  };

  const handleUpdatePage = (book: BookRow, delta: number) => {
    const nextVal = Math.min(book.total_pages, Math.max(0, book.current_page + delta));
    const nextStatus = nextVal >= book.total_pages && book.total_pages > 0 ? 'completed' : book.status;

    startTransition(async () => {
      await updateBookProgressAction(book.id, nextVal, nextStatus);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteBookAction(id);
    });
  };

  const filteredBooks =
    filter === 'all' ? books : books.filter((b) => b.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Book Library & Reading Vault
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reading progress tracking, shelf categorization, and personal reviews.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shadow-xs transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Book
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Add Book to Library</DialogTitle>
              <DialogDescription className="text-xs">
                Log a new book to your reading queue or active shelf.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateBook} className="space-y-4 pt-2">
              {error && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="b-title" className="text-xs">Book Title *</Label>
                <Input
                  id="b-title"
                  required
                  placeholder="e.g. Designing Data-Intensive Applications"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="b-author" className="text-xs">Author *</Label>
                  <Input
                    id="b-author"
                    required
                    placeholder="e.g. Martin Kleppmann"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-isbn" className="text-xs">ISBN / Identifier</Label>
                  <Input
                    id="b-isbn"
                    placeholder="e.g. 9781449373320"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    className="h-8 text-xs font-mono rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="b-status" className="text-xs">Shelf Status</Label>
                  <select
                    id="b-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as
                          | 'want_to_read'
                          | 'reading'
                          | 'completed'
                          | 'abandoned'
                      )
                    }
                    className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs outline-none cursor-pointer"
                  >
                    <option value="reading">Currently Reading</option>
                    <option value="want_to_read">Want to Read</option>
                    <option value="completed">Completed</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-pages" className="text-xs">Total Pages</Label>
                  <Input
                    id="b-pages"
                    type="number"
                    min={0}
                    value={totalPages}
                    onChange={(e) => setTotalPages(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-cur" className="text-xs">Current Page</Label>
                  <Input
                    id="b-cur"
                    type="number"
                    min={0}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="b-rating" className="text-xs">Rating (1 to 5 Stars)</Label>
                <select
                  id="b-rating"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-border bg-card text-xs outline-none cursor-pointer"
                >
                  <option value="5">★★★★★ (5 - Masterpiece)</option>
                  <option value="4">★★★★☆ (4 - Great)</option>
                  <option value="3">★★★☆☆ (3 - Good)</option>
                  <option value="2">★★☆☆☆ (2 - Fair)</option>
                  <option value="1">★☆☆☆☆ (1 - Poor)</option>
                </select>
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
                  {isPending ? 'Saving...' : 'Add to Shelf'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shelf Filter Buttons */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(['all', 'reading', 'want_to_read', 'completed'] as const).map((tab) => (
          <Button
            key={tab}
            variant={filter === tab ? 'default' : 'outline'}
            size="sm"
            className={`h-8 text-xs rounded-lg capitalize border-border cursor-pointer ${
              filter === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setFilter(tab)}
          >
            {tab.replace(/_/g, ' ')} (
            {tab === 'all'
              ? books.length
              : books.filter((b) => b.status === tab).length}
            )
          </Button>
        ))}
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground border-border bg-card rounded-xl shadow-xs">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p>No books on this shelf yet.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="mt-4 text-xs h-8 rounded-lg border-border"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Book
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => {
            const pct =
              book.total_pages > 0
                ? Math.round((book.current_page / book.total_pages) * 100)
                : 0;

            return (
              <Card
                key={book.id}
                className="border-border bg-card rounded-xl shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold line-clamp-1 text-foreground">
                        {book.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        by {book.author}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize font-mono shrink-0 border-border">
                      {book.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>
                        Page {book.current_page} of {book.total_pages}
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

                  {book.rating && (
                    <div className="flex items-center gap-1 text-amber-500 text-xs">
                      {Array.from({ length: book.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 px-2 text-[11px] rounded-lg border-border"
                        disabled={isPending || book.current_page <= 0}
                        onClick={() => handleUpdatePage(book, -10)}
                      >
                        -10p
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 px-2 text-[11px] rounded-lg border-border"
                        disabled={isPending || book.current_page >= book.total_pages}
                        onClick={() => handleUpdatePage(book, 10)}
                      >
                        +10p
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 px-2 text-[11px] rounded-lg border-border"
                        disabled={isPending || book.current_page >= book.total_pages}
                        onClick={() => handleUpdatePage(book, 50)}
                      >
                        +50p
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(book.id)}
                      disabled={isPending}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      aria-label="Delete book"
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
    </div>
  );
}
