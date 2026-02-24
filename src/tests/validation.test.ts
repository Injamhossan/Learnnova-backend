import { registerSchema, loginSchema } from '../utils/validation';

describe('Validation Schemas', () => {
  describe('Register Schema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        body: {
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          role: 'STUDENT',
        },
      };
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail if email is invalid', () => {
      const invalidData = {
        body: {
          fullName: 'John Doe',
          email: 'invalid-email',
          password: 'password123',
        },
      };
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail if password is too short', () => {
      const invalidData = {
        body: {
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'short',
        },
      };
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Login Schema', () => {
    it('should validate correct login data', () => {
      const validData = {
        body: {
          email: 'john@example.com',
          password: 'password123',
        },
      };
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
