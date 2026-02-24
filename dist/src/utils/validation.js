"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(3, 'Full name must be at least 3 characters'),
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
        role: zod_1.z.enum(['STUDENT', 'INSTRUCTOR']).optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.courseSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(5, 'Title must be at least 5 characters'),
        description: zod_1.z.string().min(20, 'Description must be at least 20 characters'),
        categoryId: zod_1.z.string().uuid('Invalid category ID'),
        price: zod_1.z.number().min(0, 'Price must be 0 or more'),
        level: zod_1.z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']).optional(),
        thumbnailUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    }),
});
