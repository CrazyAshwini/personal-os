'use server';

import { createClient } from '@/lib/supabase/server';
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
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Allow guest / offline usage without throwing
      return { success: true, data: { status: nextStatus } };
    }

    const marvelTag = `marvel:${item.id}`;

    if (nextStatus === 'unwatched') {
      await supabase
        .from('media_items')
        .delete()
        .eq('user_id', user.id)
        .eq('review', marvelTag);
    } else {
      const isSeries = item.type.includes('Series');
      const totalEp = item.seasons ? item.seasons : 1;

      // Find existing by review tag
      const { data: existingList } = await supabase
        .from('media_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('review', marvelTag);

      const existing = existingList?.[0];

      if (existing) {
        await supabase
          .from('media_items')
          .update({
            status: 'completed',
            watched_episodes: totalEp,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('user_id', user.id);
      } else {
        await supabase.from('media_items').insert({
          user_id: user.id,
          title: item.title,
          type: isSeries ? 'series' : 'movie',
          status: 'completed',
          total_episodes: totalEp,
          watched_episodes: totalEp,
          release_year: item.releaseYear,
          review: marvelTag,
        });
      }
    }

    return { success: true, data: { status: nextStatus } };
  } catch (err) {
    console.warn('Failed to sync marvel item with Supabase:', err);
    return { success: true, data: { status: nextStatus } };
  }
}

export async function batchSetMarvelItemsAction(
  updates: { item: MarvelItem; status: MarvelWatchStatus }[]
): Promise<MarvelActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !updates || updates.length === 0) {
      return { success: true };
    }

    const toDeleteTags: string[] = [];
    const toUpsert: {
      user_id: string;
      title: string;
      type: 'movie' | 'series';
      status: 'completed';
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
        toUpsert.push({
          user_id: user.id,
          title: item.title,
          type: isSeries ? 'series' : 'movie',
          status: 'completed',
          total_episodes: totalEp,
          watched_episodes: totalEp,
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

    return { success: true };
  } catch (err) {
    console.warn('Failed batch sync marvel items:', err);
    return { success: true };
  }
}

export async function fetchUserMarvelProgressAction(): Promise<MarvelActionResult<MarvelProgressMap>> {
  try {
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
        if (m.status === 'completed') {
          map[marvelId] = {
            status: 'watched',
            rating: m.rating || null,
          };
        }
      }
    });

    return { success: true, data: map };
  } catch (err) {
    console.warn('Failed to fetch user marvel progress:', err);
    return { success: true, data: {} };
  }
}
