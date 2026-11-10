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

export async function batchSetMarvelItemsAction(
  updates: { item: MarvelItem; status: MarvelWatchStatus }[]
): Promise<MarvelActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };
  if (!updates || updates.length === 0) return { success: true };

  const toDeleteTags: string[] = [];
  const toUpsert: {
    user_id: string;
    title: string;
    type: 'movie' | 'series';
    status: 'completed' | 'watching';
    total_episodes: number;
    watched_episodes: number;
    release_year: number;
    review: string;
  }[] = [];

  for (const { item, status } of updates) {
    const marvelTag = `marvel:${item.id}`;
    if (status === 'unwatched') {
      toDeleteTags.push(marvelTag);
    } else {
      const isSeries = item.type.includes('Series');
      const totalEp = item.seasons ? item.seasons : 1;
      const watchedEp = status === 'watched' ? totalEp : 1;
      toUpsert.push({
        user_id: user.id,
        title: item.title,
        type: isSeries ? 'series' : 'movie',
        status: status === 'watched' ? 'completed' : 'watching',
        total_episodes: totalEp,
        watched_episodes: watchedEp,
        release_year: item.releaseYear,
        review: marvelTag,
      });
    }
  }

  if (toDeleteTags.length > 0) {
    await supabase
      .from('media_items')
      .delete()
      .eq('user_id', user.id)
      .in('review', toDeleteTags);
  }

  const upsertTags = toUpsert.map((u) => u.review);
  if (upsertTags.length > 0) {
    await supabase
      .from('media_items')
      .delete()
      .eq('user_id', user.id)
      .in('review', upsertTags);

    const chunkSize = 50;
    for (let i = 0; i < toUpsert.length; i += chunkSize) {
      const chunk = toUpsert.slice(i, i + chunkSize);
      await supabase.from('media_items').insert(chunk);
    }
  }

  revalidatePath('/entertainment');
  return { success: true };
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
