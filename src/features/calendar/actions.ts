'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  createEventSchema,
  updateEventSchema,
  createReminderSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type CreateReminderInput,
} from '@/lib/validation/calendar';

export type CalendarActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function createEventAction(
  values: CreateEventInput
): Promise<CalendarActionResult<{ id: string }>> {
  const parsed = createEventSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid event data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      event_type: parsed.data.eventType,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      is_all_day: parsed.data.isAllDay,
      location: parsed.data.location || null,
      color: parsed.data.color,
      recurrence_rule: parsed.data.recurrenceRule || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create event.' };
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function updateEventAction(
  values: UpdateEventInput
): Promise<CalendarActionResult<void>> {
  const parsed = updateEventSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid event update data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const payload: Database['public']['Tables']['calendar_events']['Update'] = {};
  if (parsed.data.title !== undefined) payload.title = parsed.data.title;
  if (parsed.data.description !== undefined) payload.description = parsed.data.description;
  if (parsed.data.eventType !== undefined) payload.event_type = parsed.data.eventType;
  if (parsed.data.startTime !== undefined) payload.start_time = parsed.data.startTime;
  if (parsed.data.endTime !== undefined) payload.end_time = parsed.data.endTime;
  if (parsed.data.isAllDay !== undefined) payload.is_all_day = parsed.data.isAllDay;
  if (parsed.data.location !== undefined) payload.location = parsed.data.location;
  if (parsed.data.color !== undefined) payload.color = parsed.data.color;

  const { error } = await supabase
    .from('calendar_events')
    .update(payload)
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteEventAction(
  eventId: string
): Promise<CalendarActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function createReminderAction(
  values: CreateReminderInput
): Promise<CalendarActionResult<{ id: string }>> {
  const parsed = createReminderSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid reminder data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      remind_at: parsed.data.remindAt,
      event_id: parsed.data.eventId || null,
      task_id: parsed.data.taskId || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create reminder.' };
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function dismissReminderAction(
  reminderId: string
): Promise<CalendarActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('reminders')
    .update({ is_dismissed: true })
    .eq('id', reminderId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { success: true };
}
