'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createAcademicYearSchema,
  createSemesterSchema,
  createSubjectSchema,
  createTimetableEntrySchema,
  logClassSessionSchema,
  createAssignmentSchema,
  createExaminationSchema,
  createSyllabusTopicSchema,
  type CreateAcademicYearInput,
  type CreateSemesterInput,
  type CreateSubjectInput,
  type CreateTimetableEntryInput,
  type LogClassSessionInput,
  type CreateAssignmentInput,
  type CreateExaminationInput,
  type CreateSyllabusTopicInput,
} from '@/lib/validation/academic';

export type AcademicActionResult<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
};

// 1. Academic Year
export async function createAcademicYearAction(
  values: CreateAcademicYearInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = createAcademicYearSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid academic year data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  if (parsed.data.isCurrent) {
    // Unset other current academic years
    await supabase
      .from('academic_years')
      .update({ is_current: false })
      .eq('user_id', user.id);
  }

  const { data, error } = await supabase
    .from('academic_years')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      is_current: parsed.data.isCurrent,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create academic year.' };
  }

  revalidatePath('/academics');
  return { success: true, data: { id: data.id } };
}

// 2. Semester
export async function createSemesterAction(
  values: CreateSemesterInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = createSemesterSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid semester data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  if (parsed.data.isCurrent) {
    await supabase
      .from('semesters')
      .update({ is_current: false })
      .eq('user_id', user.id);
  }

  const { data, error } = await supabase
    .from('semesters')
    .insert({
      user_id: user.id,
      academic_year_id: parsed.data.academicYearId || null,
      name: parsed.data.name,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      is_current: parsed.data.isCurrent,
      target_attendance_percentage: parsed.data.targetAttendancePercentage,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create semester.' };
  }

  revalidatePath('/academics');
  return { success: true, data: { id: data.id } };
}

// 3. Subject
export async function createSubjectAction(
  values: CreateSubjectInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = createSubjectSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid subject data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      user_id: user.id,
      semester_id: parsed.data.semesterId || null,
      name: parsed.data.name,
      code: parsed.data.code || null,
      instructor: parsed.data.instructor || null,
      credits: parsed.data.credits,
      color: parsed.data.color,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create subject.' };
  }

  revalidatePath('/academics');
  return { success: true, data: { id: data.id } };
}

// 4. Timetable Entry
export async function createTimetableEntryAction(
  values: CreateTimetableEntryInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = createTimetableEntrySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid timetable entry data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('timetable_entries')
    .insert({
      user_id: user.id,
      subject_id: parsed.data.subjectId,
      day_of_week: parsed.data.dayOfWeek,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      classroom: parsed.data.classroom || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create timetable entry.' };
  }

  revalidatePath('/academics');
  return { success: true, data: { id: data.id } };
}

export async function deleteTimetableEntryAction(
  id: string
): Promise<AcademicActionResult<void>> {
  if (!id) return { error: 'Entry ID is required.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('timetable_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/academics');
  return { success: true };
}

// 5. Class Session (Attendance Source of Truth)
export async function logClassSessionAction(
  values: LogClassSessionInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = logClassSessionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid class session data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('class_sessions')
    .insert({
      user_id: user.id,
      subject_id: parsed.data.subjectId,
      timetable_entry_id: parsed.data.timetableEntryId || null,
      session_date: parsed.data.sessionDate,
      start_time: parsed.data.startTime || null,
      end_time: parsed.data.endTime || null,
      status: parsed.data.status,
      topic_covered: parsed.data.topicCovered || null,
      notes: parsed.data.notes || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to log class session.' };
  }

  revalidatePath('/academics');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

export async function updateClassSessionStatusAction(
  sessionId: string,
  status: 'present' | 'absent' | 'cancelled' | 'no_class'
): Promise<AcademicActionResult<void>> {
  if (!sessionId) return { error: 'Session ID is required.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('class_sessions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/academics');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteClassSessionAction(
  sessionId: string
): Promise<AcademicActionResult<void>> {
  if (!sessionId) return { error: 'Session ID is required.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('class_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/academics');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function toggleSlotAttendanceAction(params: {
  timetableEntryId: string;
  subjectId: string;
  sessionDate: string;
  status: 'present' | 'absent' | 'cancelled';
}): Promise<AcademicActionResult<{ sessionId?: string; status: 'present' | 'absent' | 'cancelled' | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data: existing } = await supabase
    .from('class_sessions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('timetable_entry_id', params.timetableEntryId)
    .eq('session_date', params.sessionDate)
    .maybeSingle();

  if (existing) {
    if (existing.status === params.status) {
      await supabase
        .from('class_sessions')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', user.id);

      revalidatePath('/dashboard');
      revalidatePath('/academics');
      return { success: true, data: { status: null } };
    } else {
      await supabase
        .from('class_sessions')
        .update({
          status: params.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', user.id);

      revalidatePath('/dashboard');
      revalidatePath('/academics');
      return { success: true, data: { sessionId: existing.id, status: params.status } };
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('class_sessions')
      .insert({
        user_id: user.id,
        subject_id: params.subjectId,
        timetable_entry_id: params.timetableEntryId,
        session_date: params.sessionDate,
        status: params.status,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      return { error: error?.message || 'Failed to record attendance.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/academics');
    return { success: true, data: { sessionId: inserted.id, status: params.status } };
  }
}

export async function logHolidayAction(params: {
  date?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  subjectId?: string;
}): Promise<AcademicActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const fromDateStr = params.startDate || params.date;
  if (!fromDateStr) {
    return { error: 'Start date is required.' };
  }
  const toDateStr = params.endDate || fromDateStr;

  let subjectIds: string[] = [];
  if (params.subjectId && params.subjectId !== 'all') {
    subjectIds = [params.subjectId];
  } else {
    const { data: userSubjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', user.id);
    subjectIds = (userSubjects || []).map((s) => s.id);
  }

  if (subjectIds.length === 0) {
    return { error: 'No subjects found to log holiday.' };
  }

  // Generate all date strings in the range [fromDateStr, toDateStr]
  const dates: string[] = [];
  const [sY, sM, sD] = fromDateStr.split('-').map(Number);
  const [eY, eM, eD] = toDateStr.split('-').map(Number);
  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  const effectiveStart = start <= end ? start : end;
  const effectiveEnd = start <= end ? end : start;

  // Max 90 days limit to protect against invalid massive intervals
  const maxLimit = new Date(effectiveStart);
  maxLimit.setDate(maxLimit.getDate() + 90);
  const finalEnd = effectiveEnd > maxLimit ? maxLimit : effectiveEnd;

  const current = new Date(effectiveStart);
  while (current <= finalEnd) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  for (const dateItem of dates) {
    for (const subId of subjectIds) {
      const { data: existing } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('subject_id', subId)
        .eq('session_date', dateItem)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('class_sessions')
          .update({
            status: 'no_class',
            notes: params.title ? `Holiday: ${params.title}` : 'Holiday',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('user_id', user.id);
      } else {
        await supabase.from('class_sessions').insert({
          user_id: user.id,
          subject_id: subId,
          session_date: dateItem,
          status: 'no_class',
          notes: params.title ? `Holiday: ${params.title}` : 'Holiday',
        });
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/academics');
  return { success: true };
}

// 6. Assignment Actions
export async function createAssignmentAction(
  values: CreateAssignmentInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = createAssignmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid assignment data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      user_id: user.id,
      subject_id: parsed.data.subjectId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      due_date: parsed.data.dueDate,
      status: parsed.data.status,
      max_marks: parsed.data.maxMarks ?? null,
      obtained_marks: parsed.data.obtainedMarks ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create assignment.' };
  }

  revalidatePath('/academics');
  return { success: true, data: { id: data.id } };
}

export async function updateAssignmentStatusAction(
  assignmentId: string,
  status: 'pending' | 'submitted' | 'graded' | 'late'
): Promise<AcademicActionResult<void>> {
  if (!assignmentId) return { error: 'Assignment ID is required.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('assignments')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/academics');
  return { success: true };
}

// 7. Examination Actions
export async function createExaminationAction(
  values: CreateExaminationInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = createExaminationSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid examination data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('examinations')
    .insert({
      user_id: user.id,
      subject_id: parsed.data.subjectId || null,
      title: parsed.data.title,
      exam_date: parsed.data.examDate,
      classroom: parsed.data.classroom || null,
      max_marks: parsed.data.maxMarks ?? null,
      obtained_marks: parsed.data.obtainedMarks ?? null,
      weightage_percentage: parsed.data.weightagePercentage ?? null,
      notes: parsed.data.notes || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create examination.' };
  }

  // Also automatically create a calendar event so it shows on calendar & dashboard
  await supabase.from('calendar_events').insert({
    user_id: user.id,
    title: `Exam: ${parsed.data.title}`,
    description: parsed.data.classroom ? `Location: ${parsed.data.classroom}` : null,
    event_type: 'exam',
    start_time: parsed.data.examDate,
    end_time: new Date(new Date(parsed.data.examDate).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    is_all_day: false,
    color: '#ef4444',
  });

  revalidatePath('/academics');
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { success: true, data: { id: data.id } };
}

// 8. Syllabus Topic Actions
export async function createSyllabusTopicAction(
  values: CreateSyllabusTopicInput
): Promise<AcademicActionResult<{ id: string }>> {
  const parsed = createSyllabusTopicSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid syllabus topic data.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { data, error } = await supabase
    .from('syllabus_topics')
    .insert({
      user_id: user.id,
      subject_id: parsed.data.subjectId,
      unit_number: parsed.data.unitNumber,
      title: parsed.data.title,
      is_completed: parsed.data.isCompleted,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to create syllabus topic.' };
  }

  revalidatePath('/academics');
  return { success: true, data: { id: data.id } };
}

export async function toggleSyllabusTopicAction(
  topicId: string,
  isCompleted: boolean
): Promise<AcademicActionResult<void>> {
  if (!topicId) return { error: 'Topic ID is required.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Authentication required.' };

  const { error } = await supabase
    .from('syllabus_topics')
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', topicId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/academics');
  return { success: true };
}
