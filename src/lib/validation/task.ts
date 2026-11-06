import { z } from 'zod';

export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

export const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.').max(200, 'Title cannot exceed 200 characters.'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters.').optional().nullable(),
  priority: taskPriorityEnum.default('medium'),
  status: taskStatusEnum.default('pending'),
  categoryId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
  subtasks: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'Subtask title cannot be empty.'),
      })
    )
    .optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(50),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Invalid hex color code.').default('#3b82f6'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required.').max(30),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Invalid hex color code.').default('#71717a'),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
