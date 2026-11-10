import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { EntertainmentView } from '@/features/entertainment/entertainment-view';
import type { MarvelProgressMap } from '@/types/marvel';

export const instant = false;

export default async function EntertainmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: mediaItems } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const initialMarvelProgress: MarvelProgressMap = {};
  (mediaItems || []).forEach((m) => {
    if (m.review?.startsWith('marvel:')) {
      const marvelId = m.review.replace('marvel:', '');
      if (m.status === 'completed') {
        initialMarvelProgress[marvelId] = {
          status: 'watched',
          rating: m.rating || null,
        };
      }
    }
  });

  return (
    <div className="space-y-6">
      <EntertainmentView
        mediaItems={mediaItems || []}
        initialMarvelProgress={initialMarvelProgress}
      />
    </div>
  );
}
