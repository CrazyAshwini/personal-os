'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createHabitSchema,
  logHabitSchema,
  createGoalSchema,
  createJourneySchema,
  createBookSchema,
  createMediaItemSchema,
  createNoteSchema,
  type CreateHabitInput,
  type LogHabitInput,
  type CreateGoalInput,
  type CreateJourneyInput,
  type CreateBookInput,
  type CreateMediaItemInput,
  type CreateNoteInput,
} from '@/lib/validation/personal-life';

export type LifeActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

// ==========================================
// 1. HABITS & GOALS
// ==========================================

export async function createHabitAction(
  values: CreateHabitInput
): Promise<LifeActionResult<{ id: string }>> {
  const parsed = createHabitSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid habit data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      frequency: parsed.data.frequency,
      target_days_per_week: parsed.data.targetDaysPerWeek,
      color: parsed.data.color,
      icon: parsed.data.icon,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message || 'Failed to create habit.' };

  revalidatePath('/habits');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function toggleHabitDayAction(
  values: LogHabitInput
): Promise<LifeActionResult<{ completed: boolean }>> {
  const parsed = logHabitSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid habit log data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  // Check if log exists
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('habit_id', parsed.data.habitId)
    .eq('completed_date', parsed.data.completedDate)
    .maybeSingle();

  if (existing) {
    // Un-check
    await supabase.from('habit_logs').delete().eq('id', existing.id);
    revalidatePath('/habits');
    revalidatePath('/dashboard');
    return { success: true, data: { completed: false } };
  } else {
    // Check
    await supabase.from('habit_logs').insert({
      user_id: user.id,
      habit_id: parsed.data.habitId,
      completed_date: parsed.data.completedDate,
      notes: parsed.data.notes || null,
    });
    revalidatePath('/habits');
    revalidatePath('/dashboard');
    return { success: true, data: { completed: true } };
  }
}

export async function deleteHabitAction(
  habitId: string
): Promise<LifeActionResult<void>> {
  if (!habitId) return { error: 'Habit ID is required.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/habits');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function createGoalAction(
  values: CreateGoalInput
): Promise<LifeActionResult<{ id: string }>> {
  const parsed = createGoalSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid goal data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      target_date: parsed.data.targetDate || null,
      progress_percentage: parsed.data.progressPercentage,
      status: 'in_progress',
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message || 'Failed to create goal.' };

  revalidatePath('/habits');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function updateGoalProgressAction(
  goalId: string,
  progress: number
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const status = progress >= 100 ? 'completed' : 'in_progress';

  const { error } = await supabase
    .from('goals')
    .update({
      progress_percentage: Math.min(100, Math.max(0, progress)),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/habits');
  return { success: true };
}

export async function deleteGoalAction(
  goalId: string
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/habits');
  return { success: true };
}

// ==========================================
// 2. TRAVEL & JOURNEYS
// ==========================================

export async function createJourneyAction(
  values: CreateJourneyInput
): Promise<LifeActionResult<{ id: string }>> {
  const parsed = createJourneySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid trip data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('journeys')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      transport_type: parsed.data.transportType,
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      departure_time: parsed.data.departureTime,
      arrival_time: parsed.data.arrivalTime || null,
      booking_reference: parsed.data.bookingReference || null,
      carrier_name: parsed.data.carrierName || null,
      seat_number: parsed.data.seatNumber || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message || 'Failed to create journey.' };

  // Add travel to calendar
  await supabase.from('calendar_events').insert({
    user_id: user.id,
    title: `Travel: ${parsed.data.title} (${parsed.data.origin} → ${parsed.data.destination})`,
    description: parsed.data.bookingReference
      ? `PNR/Ref: ${parsed.data.bookingReference}`
      : null,
    event_type: 'travel',
    start_time: parsed.data.departureTime,
    end_time:
      parsed.data.arrivalTime ||
      new Date(new Date(parsed.data.departureTime).getTime() + 4 * 3600000).toISOString(),
    is_all_day: false,
    color: '#06b6d4',
  });

  revalidatePath('/travel');
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function deleteJourneyAction(
  journeyId: string
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('journeys')
    .delete()
    .eq('id', journeyId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/travel');
  return { success: true };
}

// ==========================================
// 3. BOOKS
// ==========================================

export async function createBookAction(
  values: CreateBookInput
): Promise<LifeActionResult<{ id: string }>> {
  const parsed = createBookSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid book data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('books')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      author: parsed.data.author,
      isbn: parsed.data.isbn || null,
      status: parsed.data.status,
      total_pages: parsed.data.totalPages,
      current_page: parsed.data.currentPage,
      rating: parsed.data.rating || null,
      review: parsed.data.review || null,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message || 'Failed to create book.' };

  revalidatePath('/books');
  return { success: true, data: { id: data.id } };
}

export async function updateBookProgressAction(
  bookId: string,
  currentPage: number,
  status: 'want_to_read' | 'reading' | 'completed' | 'abandoned'
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('books')
    .update({
      current_page: currentPage,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/books');
  return { success: true };
}

export async function deleteBookAction(
  bookId: string
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/books');
  return { success: true };
}

// ==========================================
// 4. ENTERTAINMENT & MEDIA
// ==========================================

export async function createMediaItemAction(
  values: CreateMediaItemInput
): Promise<LifeActionResult<{ id: string }>> {
  const parsed = createMediaItemSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid media data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      type: parsed.data.type,
      status: parsed.data.status,
      total_episodes: parsed.data.totalEpisodes,
      watched_episodes: parsed.data.watchedEpisodes,
      rating: parsed.data.rating || null,
      release_year: parsed.data.releaseYear || null,
      review: parsed.data.review || null,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message || 'Failed to create media item.' };

  revalidatePath('/entertainment');
  return { success: true, data: { id: data.id } };
}

export async function updateMediaProgressAction(
  mediaId: string,
  watchedEpisodes: number,
  status: 'plan_to_watch' | 'watching' | 'completed' | 'dropped'
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('media_items')
    .update({
      watched_episodes: watchedEpisodes,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediaId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/entertainment');
  return { success: true };
}

export async function deleteMediaItemAction(
  mediaId: string
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', mediaId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/entertainment');
  return { success: true };
}

// ==========================================
// 5. NOTES & KNOWLEDGE VAULT
// ==========================================

export async function createNoteAction(
  values: CreateNoteInput
): Promise<LifeActionResult<{ id: string }>> {
  const parsed = createNoteSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid note data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
      is_pinned: parsed.data.isPinned,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message || 'Failed to create note.' };

  revalidatePath('/notes');
  return { success: true, data: { id: data.id } };
}

export async function updateNoteAction(
  noteId: string,
  title: string,
  content: string,
  category: string
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('notes')
    .update({
      title,
      content,
      category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/notes');
  return { success: true };
}

export async function deleteNoteAction(
  noteId: string
): Promise<LifeActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/notes');
  return { success: true };
}
