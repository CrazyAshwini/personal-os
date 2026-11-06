import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { HabitsView } from '@/features/habits/habits-view';

export const instant = false;

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId);

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <HabitsView
        habits={habits || []}
        habitLogs={habitLogs || []}
        goals={goals || []}
      />
    </div>
  );
}
