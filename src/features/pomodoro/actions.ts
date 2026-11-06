'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logSessionSchema, type LogSessionInput } from '@/lib/validation/pomodoro';

export type PomodoroActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function logPomodoroSessionAction(
  values: LogSessionInput
): Promise<PomodoroActionResult<{ id: string }>> {
  const parsed = logSessionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid session details.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert({
      user_id: user.id,
      duration_minutes: parsed.data.durationMinutes,
      actual_seconds: parsed.data.actualSeconds,
      type: parsed.data.type,
      status: parsed.data.status,
      task_id: parsed.data.taskId || null,
      notes: parsed.data.notes || null,
      started_at: parsed.data.startedAt || new Date().toISOString(),
      ended_at: parsed.data.endedAt || new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to record focus session.' };
  }

  revalidatePath('/pomodoro');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function deletePomodoroSessionAction(
  sessionId: string
): Promise<PomodoroActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('pomodoro_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/pomodoro');
  revalidatePath('/dashboard');
  return { success: true };
}
