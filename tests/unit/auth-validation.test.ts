import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validation/auth';

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('passes with valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('fails with invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
      }
    });

    it('fails with short password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('passes with full name, valid email, and compliant password', () => {
      const result = registerSchema.safeParse({
        fullName: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'SecurePassword1',
      });
      expect(result.success).toBe(true);
    });

    it('fails if password lacks an uppercase letter', () => {
      const result = registerSchema.safeParse({
        fullName: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'securepassword1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toContain(
          'Password must contain at least one uppercase letter.'
        );
      }
    });

    it('fails if password lacks a number', () => {
      const result = registerSchema.safeParse({
        fullName: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'SecurePassword',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toContain(
          'Password must contain at least one number.'
        );
      }
    });

    it('fails if name is too short', () => {
      const result = registerSchema.safeParse({
        fullName: 'A',
        email: 'alex@example.com',
        password: 'SecurePassword1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('validates email address', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'valid@example.com' }).success).toBe(true);
      expect(forgotPasswordSchema.safeParse({ email: 'invalid' }).success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('passes when passwords match and meet complexity rules', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('fails when passwords do not match', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
          'Passwords do not match.'
        );
      }
    });
  });
});
