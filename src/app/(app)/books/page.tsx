import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { BooksView } from '@/features/books/books-view';

export const instant = false;

export default async function BooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <BooksView books={books || []} />
    </div>
  );
}
