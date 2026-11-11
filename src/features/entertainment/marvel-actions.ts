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

export async function setMarvelItemRatingAction(
  item: MarvelItem,
  rating: number | null
): Promise<MarvelActionResult<{ rating: number | null }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: true, data: { rating } };

    const marvelTag = `marvel:${item.id}`;

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
          rating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', user.id);
    } else {
      const isSeries = item.type.includes('Series');
      const totalEp = item.seasons ? item.seasons : 1;

      await supabase.from('media_items').insert({
        user_id: user.id,
        title: item.title,
        type: isSeries ? 'series' : 'movie',
        status: 'completed',
        total_episodes: totalEp,
        watched_episodes: totalEp,
        release_year: item.releaseYear,
        review: marvelTag,
        rating,
      });
    }

    return { success: true, data: { rating } };
  } catch (err) {
    console.warn('Failed to update marvel rating:', err);
    return { success: true, data: { rating } };
  }
}

export async function addPremiereToCalendarAction(
  item: MarvelItem
): Promise<MarvelActionResult<{ eventId: string }>> {
  try {
    if (!item.releaseDate) return { error: 'No confirmed release date for this premiere.' };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Authentication required to save to calendar.' };

    const title = `Marvel Premiere: ${item.title}`;
    const startTime = `${item.releaseDate}T09:00:00Z`;
    const endTime = `${item.releaseDate}T12:00:00Z`;

    // Check if already in calendar
    const { data: existing } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('title', title)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true, data: { eventId: existing[0].id } };
    }

    const { data: inserted, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title,
        description: `Premiere release of ${item.title} (${item.universe} • ${item.group}) in the Marvel Universe Watchlist.`,
        event_type: 'personal',
        start_time: startTime,
        end_time: endTime,
        is_all_day: true,
        color: '#E62429',
      })
      .select('id')
      .single();

    if (error) return { error: error.message };

    return { success: true, data: { eventId: inserted.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add premiere to calendar.';
    return { error: message };
  }
}
