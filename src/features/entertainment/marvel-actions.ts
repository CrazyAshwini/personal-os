'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MarvelItem, MarvelWatchStatus, MarvelProgressMap } from '@/types/marvel';

export interface MarvelActionResult<T = void> {
  success?: boolean;
  data?: T;
  error?: string;
}

export async function toggleMarvelItemAction(
  item: MarvelItem,
  nextStatus: MarvelWatchStatus
): Promise<MarvelActionResult<{ status: MarvelWatchStatus }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const marvelTag = `marvel:${item.id}`;

  // Find existing media item for this marvel entry
  const { data: existingList } = await supabase
    .from('media_items')
    .select('id, status, review')
    .eq('user_id', user.id)
    .or(`review.eq.${marvelTag},title.eq."${item.title.replace(/"/g, '""')}"`);

  const existing = existingList?.[0];

  if (nextStatus === 'unwatched') {
    if (existing) {
      await supabase
        .from('media_items')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', user.id);
    }
  } else {
    const isSeries = item.type.includes('Series');
    const totalEp = item.seasons ? item.seasons : 1;
    const watchedEp = nextStatus === 'watched' ? totalEp : 1;
    const dbStatus = nextStatus === 'watched' ? 'completed' : 'watching';

    if (existing) {
      await supabase
        .from('media_items')
        .update({
          status: dbStatus,
          watched_episodes: watchedEp,
          review: marvelTag,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', user.id);
    } else {
      await supabase.from('media_items').insert({
        user_id: user.id,
        title: item.title,
        type: isSeries ? 'series' : 'movie',
        status: dbStatus,
        total_episodes: totalEp,
        watched_episodes: watchedEp,
        release_year: item.releaseYear,
        review: marvelTag,
      });
    }
  }

  revalidatePath('/entertainment');
  return { success: true, data: { status: nextStatus } };
}

export async function fetchUserMarvelProgressAction(): Promise<MarvelActionResult<MarvelProgressMap>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: true, data: {} };

  const { data: mediaList, error } = await supabase
    .from('media_items')
    .select('title, status, rating, review')
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  const map: MarvelProgressMap = {};
  (mediaList || []).forEach((m) => {
    if (m.review?.startsWith('marvel:')) {
      const marvelId = m.review.replace('marvel:', '');
      const st: MarvelWatchStatus =
        m.status === 'completed' ? 'watched' : m.status === 'watching' ? 'watching' : 'unwatched';
      if (st !== 'unwatched') {
        map[marvelId] = {
          status: st,
          rating: m.rating || null,
        };
      }
    }
  });

  return { success: true, data: map };
}
