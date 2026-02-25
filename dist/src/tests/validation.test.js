"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("../utils/validation");
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
            const result = validation_1.registerSchema.safeParse(validData);
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
            const result = validation_1.registerSchema.safeParse(invalidData);
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
            const result = validation_1.registerSchema.safeParse(invalidData);
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
            const result = validation_1.loginSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });
});
