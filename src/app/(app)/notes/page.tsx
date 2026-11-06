import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { NotesView } from '@/features/notes/notes-view';

export const instant = false;

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <NotesView notes={notes || []} />
    </div>
  );
}
