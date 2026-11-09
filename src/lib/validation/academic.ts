import { z } from 'zod';

export const classSessionStatusEnum = z.enum([
  'present',
  'absent',
  'cancelled',
  'no_class',
]);

export const assignmentStatusEnum = z.enum([
  'pending',
  'submitted',
  'graded',
  'late',
]);

export const createAcademicYearSchema = z.object({
  name: z.string().trim().min(1, 'Academic year name is required').max(50),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isCurrent: z.boolean().default(false),
});

export const createSemesterSchema = z.object({
  academicYearId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, 'Semester name is required').max(50),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isCurrent: z.boolean().default(false),
  targetAttendancePercentage: z.number().min(0).max(100).default(75.0),
});

export const createSubjectSchema = z.object({
  semesterId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, 'Subject name is required').max(100),
  code: z.string().trim().max(20).optional().nullable(),
  instructor: z.string().trim().max(100).optional().nullable(),
  credits: z.number().int().min(0).max(30).default(3),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color')
    .default('#3b82f6'),
});

export const updateSubjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Subject name is required').max(100).optional(),
  code: z.string().trim().max(20).optional().nullable(),
  instructor: z.string().trim().max(100).optional().nullable(),
  credits: z.number().int().min(0).max(30).optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color')
    .optional(),
});

export const createTimetableEntrySchema = z.object({
  subjectId: z.string().uuid('Subject is required'),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  classroom: z.string().trim().max(50).optional().nullable(),
});

export const logClassSessionSchema = z.object({
  subjectId: z.string().uuid('Subject is required'),
  timetableEntryId: z.string().uuid().optional().nullable(),
  sessionDate: z.string().min(1, 'Date is required'),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  status: classSessionStatusEnum.default('present'),
  topicCovered: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  toggleIfSame: z.boolean().optional(),
});

export const createAssignmentSchema = z.object({
  subjectId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, 'Title is required').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  dueDate: z.string().min(1, 'Due date is required'),
  status: assignmentStatusEnum.default('pending'),
  maxMarks: z.number().min(0).optional().nullable(),
  obtainedMarks: z.number().min(0).optional().nullable(),
});

export const createExaminationSchema = z.object({
  subjectId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, 'Title is required').max(150),
  examDate: z.string().min(1, 'Exam date is required'),
  classroom: z.string().trim().max(50).optional().nullable(),
  maxMarks: z.number().min(0).optional().nullable(),
  obtainedMarks: z.number().min(0).optional().nullable(),
  weightagePercentage: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createSyllabusTopicSchema = z.object({
  subjectId: z.string().uuid('Subject is required'),
  unitNumber: z.number().int().min(1).default(1),
  title: z.string().trim().min(1, 'Topic title is required').max(150),
  isCompleted: z.boolean().default(false),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type CreateTimetableEntryInput = z.infer<typeof createTimetableEntrySchema>;
export type LogClassSessionInput = z.infer<typeof logClassSessionSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type CreateExaminationInput = z.infer<typeof createExaminationSchema>;
export type CreateSyllabusTopicInput = z.infer<typeof createSyllabusTopicSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
