import { describe, it, expect } from 'vitest';
import {
  createAcademicYearSchema,
  createSemesterSchema,
  createSubjectSchema,
  createTimetableEntrySchema,
  logClassSessionSchema,
  createAssignmentSchema,
  createExaminationSchema,
  createSyllabusTopicSchema,
} from '@/lib/validation/academic';

describe('Academic Validation Schemas', () => {
  it('validates a correct academic year', () => {
    const valid = {
      name: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-05-31',
      isCurrent: true,
    };
    const result = createAcademicYearSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('validates a semester with target attendance', () => {
    const valid = {
      name: 'Fall 2026',
      startDate: '2026-08-15',
      endDate: '2026-12-20',
      isCurrent: true,
      targetAttendancePercentage: 80,
    };
    const result = createSemesterSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetAttendancePercentage).toBe(80);
    }
  });

  it('validates a subject with credit constraints and color', () => {
    const valid = {
      name: 'Distributed Systems',
      code: 'CS501',
      instructor: 'Dr. Jane Doe',
      credits: 4,
      color: '#4f46e5',
    };
    const result = createSubjectSchema.safeParse(valid);
    expect(result.success).toBe(true);

    const invalidColor = {
      name: 'Distributed Systems',
      credits: 4,
      color: 'blue-invalid',
    };
    const resColor = createSubjectSchema.safeParse(invalidColor);
    expect(resColor.success).toBe(false);
  });

  it('validates a timetable entry with day of week', () => {
    const valid = {
      subjectId: '550e8400-e29b-41d4-a716-446655440000',
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '10:00',
      classroom: 'Hall 401',
    };
    const result = createTimetableEntrySchema.safeParse(valid);
    expect(result.success).toBe(true);

    const invalidDay = {
      ...valid,
      dayOfWeek: 7, // Out of range 0-6
    };
    const resInvalid = createTimetableEntrySchema.safeParse(invalidDay);
    expect(resInvalid.success).toBe(false);
  });

  it('validates class session logging with allowed status values', () => {
    const validStatuses = ['present', 'absent', 'cancelled', 'no_class'] as const;
    for (const status of validStatuses) {
      const entry = {
        subjectId: '550e8400-e29b-41d4-a716-446655440000',
        sessionDate: '2026-09-15',
        status,
        topicCovered: 'Consensus algorithms - Paxos and Raft',
      };
      const result = logClassSessionSchema.safeParse(entry);
      expect(result.success).toBe(true);
    }

    const invalidStatus = {
      subjectId: '550e8400-e29b-41d4-a716-446655440000',
      sessionDate: '2026-09-15',
      status: 'holiday_not_allowed',
    };
    const resInvalid = logClassSessionSchema.safeParse(invalidStatus);
    expect(resInvalid.success).toBe(false);
  });

  it('validates assignment and examination schemas', () => {
    const assignment = {
      title: 'Lab 2: Vector Clocks',
      dueDate: new Date().toISOString(),
      maxMarks: 100,
      obtainedMarks: 95,
      status: 'submitted',
    };
    expect(createAssignmentSchema.safeParse(assignment).success).toBe(true);

    const exam = {
      title: 'Midterm Examination',
      examDate: new Date().toISOString(),
      classroom: 'Auditorium 2',
      maxMarks: 100,
      weightagePercentage: 30,
    };
    expect(createExaminationSchema.safeParse(exam).success).toBe(true);

    const topic = {
      subjectId: '550e8400-e29b-41d4-a716-446655440000',
      unitNumber: 2,
      title: 'Byzantine Fault Tolerance',
      isCompleted: true,
    };
    expect(createSyllabusTopicSchema.safeParse(topic).success).toBe(true);
  });
});
