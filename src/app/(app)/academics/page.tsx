import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { AcademicOverview } from '@/features/academics/academic-overview';

export const instant = false;

export default async function AcademicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || '';

  // 1. Fetch subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  // 2. Fetch timetable entries with subject
  const { data: timetable } = await supabase
    .from('timetable_entries')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  // 3. Fetch class sessions with subject
  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .order('session_date', { ascending: false });

  // 4. Fetch assignments with subject
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  // 5. Fetch examinations with subject
  const { data: examinations } = await supabase
    .from('examinations')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .order('exam_date', { ascending: true });

  // 6. Fetch syllabus topics with subject
  const { data: syllabusTopics } = await supabase
    .from('syllabus_topics')
    .select('*, subject:subjects(*)')
    .eq('user_id', userId)
    .order('unit_number', { ascending: true });

  return (
    <div className="space-y-6">
      <AcademicOverview
        subjects={subjects || []}
        timetable={timetable || []}
        sessions={sessions || []}
        assignments={assignments || []}
        examinations={examinations || []}
        syllabusTopics={syllabusTopics || []}
      />
    </div>
  );
}
