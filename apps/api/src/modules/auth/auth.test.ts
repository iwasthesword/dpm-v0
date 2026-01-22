import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verify2FASchema,
} from './auth.schema.js';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should validate valid login input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const result = loginSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration input', () => {
      const validInput = {
        clinicId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        email: 'test@example.com',
        password: 'Password@123',
        name: 'Test User',
        role: 'ADMIN',
      };

      const result = registerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const invalidInput = {
        clinicId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        role: 'ADMIN',
      };

      const result = registerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require password with uppercase', () => {
      const invalidInput = {
        clinicId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        email: 'test@example.com',
        password: 'password@123',
        name: 'Test User',
        role: 'ADMIN',
      };

      const result = registerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should require password with special character', () => {
      const invalidInput = {
        clinicId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'ADMIN',
      };

      const result = registerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalidInput = {
        clinicId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        email: 'test@example.com',
        password: 'Password@123',
        name: 'Test User',
        role: 'INVALID_ROLE',
      };

      const result = registerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('verify2FASchema', () => {
    it('should validate valid 6-digit code', () => {
      const validInput = { code: '123456' };

      const result = verify2FASchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject code with wrong length', () => {
      const invalidInput = { code: '12345' };

      const result = verify2FASchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject code with non-digits', () => {
      const invalidInput = { code: '12345a' };

      const result = verify2FASchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});

describe('Password Hashing', () => {
  it('should hash and verify password correctly', async () => {
    const password = 'TestPassword@123';
    const hash = await bcrypt.hash(password, 12);

    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare('wrongpassword', hash)).toBe(false);
  });
});
