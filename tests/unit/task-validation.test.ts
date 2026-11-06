import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  createCategorySchema,
  createTagSchema,
} from '@/lib/validation/task';

describe('Task & Productivity Validation', () => {
  describe('createTaskSchema', () => {
    it('passes with minimum valid title', () => {
      const result = createTaskSchema.safeParse({
        title: 'Study Operating Systems',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('medium');
        expect(result.data.status).toBe('pending');
      }
    });

    it('rejects empty title', () => {
      const result = createTaskSchema.safeParse({
        title: '   ',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toBeDefined();
      }
    });

    it('validates subtasks checklist items', () => {
      const result = createTaskSchema.safeParse({
        title: 'Prepare Lab Presentation',
        subtasks: [
          { title: 'Create slides' },
          { title: 'Test code demonstrations' },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subtasks).toHaveLength(2);
      }
    });

    it('rejects invalid priority string', () => {
      const result = createTaskSchema.safeParse({
        title: 'Prepare for Exam',
        priority: 'super-urgent',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('requires a valid UUID id', () => {
      const invalid = updateTaskSchema.safeParse({
        id: '123',
        status: 'completed',
      });
      expect(invalid.success).toBe(false);

      const valid = updateTaskSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('createCategorySchema', () => {
    it('validates hex color and name', () => {
      const result = createCategorySchema.safeParse({
        name: 'Computer Science',
        color: '#10b981',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid color string', () => {
      const result = createCategorySchema.safeParse({
        name: 'Math',
        color: 'green',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createTagSchema', () => {
    it('validates tag input', () => {
      const result = createTagSchema.safeParse({
        name: 'urgent',
        color: '#ef4444',
      });
      expect(result.success).toBe(true);
    });
  });
});
