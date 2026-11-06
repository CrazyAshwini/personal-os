import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { TaskListView } from '@/features/tasks/task-list-view';

export const instant = false;

export default async function ProductivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch categories
  const { data: categories } = await supabase
    .from('task_categories')
    .select('id, name, color')
    .eq('user_id', user?.id || '')
    .order('name');

  // Fetch tasks with subtasks and category
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      category:task_categories (
        id,
        name,
        color
      ),
      subtasks:task_subtasks (
        id,
        title,
        is_completed
      )
    `)
    .eq('user_id', user?.id || '')
    .order('created_at', { ascending: false });

  // Format tasks ensuring strict type compliance
  const formattedTasks = (tasks || []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    category: Array.isArray(t.category) ? t.category[0] : t.category,
    subtasks: t.subtasks || [],
  }));

  return (
    <TaskListView
      initialTasks={formattedTasks}
      categories={categories || []}
    />
  );
}
