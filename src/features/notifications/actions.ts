'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  createNotificationSchema,
  updateNotificationPreferencesSchema,
  type CreateNotificationInput,
  type UpdateNotificationPreferencesInput,
} from '@/lib/validation/notification';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export type NotificationActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function getNotificationsAction(
  limit = 20
): Promise<NotificationActionResult<NotificationRow[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.', data: [] };
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message, data: [] };
  }

  return { success: true, data: data ?? [] };
}

export async function getUnreadNotificationsCountAction(): Promise<
  NotificationActionResult<number>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.', data: 0 };
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    return { error: error.message, data: 0 };
  }

  return { success: true, data: count ?? 0 };
}

export async function createNotificationAction(
  values: CreateNotificationInput
): Promise<NotificationActionResult<{ id: string }>> {
  const parsed = createNotificationSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Invalid notification data.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      message: parsed.data.message,
      type: parsed.data.type,
      link: parsed.data.link || null,
      is_read: false,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create notification.' };
  }

  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<NotificationActionResult<void>> {
  if (!notificationId) {
    return { error: 'Notification ID is required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<
  NotificationActionResult<void>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteNotificationAction(
  notificationId: string
): Promise<NotificationActionResult<void>> {
  if (!notificationId) {
    return { error: 'Notification ID is required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateNotificationPreferencesAction(
  values: UpdateNotificationPreferencesInput
): Promise<NotificationActionResult<void>> {
  const parsed = updateNotificationPreferencesSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Invalid preferences data.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({
      notify_task_deadlines: parsed.data.notify_task_deadlines,
      notify_calendar_reminders: parsed.data.notify_calendar_reminders,
      notify_academic_classes: parsed.data.notify_academic_classes,
      sound_enabled: parsed.data.sound_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  return { success: true };
}
