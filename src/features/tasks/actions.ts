'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  createTaskSchema,
  updateTaskSchema,
  createCategorySchema,
  createTagSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type CreateCategoryInput,
  type CreateTagInput,
} from '@/lib/validation/task';

export type TaskActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function createTaskAction(
  values: CreateTaskInput
): Promise<TaskActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid task input.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      status: parsed.data.status,
      category_id: parsed.data.categoryId || null,
      start_date: parsed.data.startDate || null,
      due_date: parsed.data.dueDate || null,
      is_recurring: parsed.data.isRecurring,
      recurrence_rule: parsed.data.recurrenceRule || null,
      completed_at: parsed.data.status === 'completed' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (taskError || !task) {
    return { error: taskError?.message || 'Failed to create task.' };
  }

  // Insert subtasks if present
  if (parsed.data.subtasks && parsed.data.subtasks.length > 0) {
    const subtaskInserts = parsed.data.subtasks.map((st, idx) => ({
      task_id: task.id,
      user_id: user.id,
      title: st.title,
      position: idx,
      is_completed: false,
    }));

    await supabase.from('task_subtasks').insert(subtaskInserts);
  }

  // Insert tags if present
  if (parsed.data.tagIds && parsed.data.tagIds.length > 0) {
    const tagInserts = parsed.data.tagIds.map((tagId) => ({
      task_id: task.id,
      tag_id: tagId,
      user_id: user.id,
    }));

    await supabase.from('task_tags').insert(tagInserts);
  }

  revalidatePath('/productivity');
  revalidatePath('/dashboard');
  return { success: true, data: { id: task.id } };
}

export async function updateTaskAction(
  values: UpdateTaskInput
): Promise<TaskActionResult<void>> {
  const parsed = updateTaskSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid update input.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const updatePayload: Database['public']['Tables']['tasks']['Update'] = {};
  if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title;
  if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description;
  if (parsed.data.priority !== undefined) updatePayload.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) {
    updatePayload.status = parsed.data.status;
    updatePayload.completed_at =
      parsed.data.status === 'completed' ? new Date().toISOString() : null;
  }
  if (parsed.data.categoryId !== undefined) updatePayload.category_id = parsed.data.categoryId;
  if (parsed.data.startDate !== undefined) updatePayload.start_date = parsed.data.startDate;
  if (parsed.data.dueDate !== undefined) updatePayload.due_date = parsed.data.dueDate;
  if (parsed.data.isRecurring !== undefined) updatePayload.is_recurring = parsed.data.isRecurring;
  if (parsed.data.recurrenceRule !== undefined) updatePayload.recurrence_rule = parsed.data.recurrenceRule;

  const { error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/productivity');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTaskAction(
  taskId: string
): Promise<TaskActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/productivity');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function toggleSubtaskAction(
  subtaskId: string,
  isCompleted: boolean
): Promise<TaskActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('task_subtasks')
    .update({ is_completed: isCompleted })
    .eq('id', subtaskId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/productivity');
  return { success: true };
}

export async function createCategoryAction(
  values: CreateCategoryInput
): Promise<TaskActionResult<{ id: string }>> {
  const parsed = createCategorySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid category input.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('task_categories')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create category.' };
  }

  revalidatePath('/productivity');
  return { success: true, data: { id: data.id } };
}

export async function createTagAction(
  values: CreateTagInput
): Promise<TaskActionResult<{ id: string }>> {
  const parsed = createTagSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid tag input.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('tags')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create tag.' };
  }

  revalidatePath('/productivity');
  return { success: true, data: { id: data.id } };
}
