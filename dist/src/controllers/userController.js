"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setInitialRole = exports.changePassword = exports.updateInstructorProfile = exports.updateMyProfile = exports.getMyProfile = exports.getUsers = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const db_1 = require("../config/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// @desc  Get all users (admin)
const getUsers = (0, express_async_handler_1.default)(async (req, res) => {
    const users = await db_1.prisma.user.findMany({
        select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });
    res.json(users);
});
exports.getUsers = getUsers;
// @desc  Get my own profile
// @route GET /api/users/me
const getMyProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await db_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true, fullName: true, email: true, role: true,
            avatarUrl: true, bio: true, phone: true, createdAt: true, isActive: true,
            instructor: {
                select: {
                    headline: true, description: true, expertise: true,
                    websiteUrl: true, linkedinUrl: true, twitterUrl: true,
                    totalStudents: true, totalCourses: true, averageRating: true,
                },
            },
        },
    });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    res.json(user);
});
exports.getMyProfile = getMyProfile;
// @desc  Update my profile (name, bio, phone, avatarUrl)
// @route PATCH /api/users/me
const updateMyProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const { fullName, bio, phone, avatarUrl } = req.body;
    const updated = await db_1.prisma.user.update({
        where: { id: req.user.id },
        data: {
            ...(fullName && { fullName }),
            ...(bio !== undefined && { bio }),
            ...(phone !== undefined && { phone }),
            ...(avatarUrl !== undefined && { avatarUrl }),
        },
        select: { id: true, fullName: true, email: true, role: true, avatarUrl: true, bio: true, phone: true },
    });
    res.json(updated);
});
exports.updateMyProfile = updateMyProfile;
// @desc  Update instructor profile extras (headline, description, links, expertise)
// @route PATCH /api/users/me/instructor
const updateInstructorProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const { headline, description, expertise, websiteUrl, linkedinUrl, twitterUrl } = req.body;
    // ensure instructor row exists for this user
    const instructor = await db_1.prisma.instructor.findUnique({ where: { userId: req.user.id } });
    if (!instructor) {
        res.status(403);
        throw new Error('No instructor profile — contact admin.');
    }
    const updated = await db_1.prisma.instructor.update({
        where: { userId: req.user.id },
        data: {
            ...(headline !== undefined && { headline }),
            ...(description !== undefined && { description }),
            ...(expertise !== undefined && { expertise }),
            ...(websiteUrl !== undefined && { websiteUrl }),
            ...(linkedinUrl !== undefined && { linkedinUrl }),
            ...(twitterUrl !== undefined && { twitterUrl }),
        },
    });
    res.json(updated);
});
exports.updateInstructorProfile = updateInstructorProfile;
// @desc  Change password
// @route POST /api/users/me/change-password
const changePassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error('Current and new password are required');
    }
    if (newPassword.length < 6) {
        res.status(400);
        throw new Error('New password must be at least 6 characters');
    }
    const user = await db_1.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.passwordHash) {
        res.status(400);
        throw new Error('Cannot change password for social login accounts');
    }
    const match = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!match) {
        res.status(400);
        throw new Error('Current password is incorrect');
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashed = await bcryptjs_1.default.hash(newPassword, salt);
    await db_1.prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hashed } });
    res.json({ message: 'Password changed successfully' });
});
exports.changePassword = changePassword;
// @desc  Set initial role (for social login users)
// @route POST /api/users/init-role
const setInitialRole = (0, express_async_handler_1.default)(async (req, res) => {
    const { role } = req.body;
    if (!['STUDENT', 'INSTRUCTOR'].includes(role)) {
        res.status(400);
        throw new Error('Invalid role selected');
    }
    const updated = await db_1.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: { id: req.user.id },
            data: { role },
            select: { id: true, fullName: true, email: true, role: true },
        });
        if (role === 'INSTRUCTOR') {
            await tx.instructor.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id }
            });
        }
        return user;
    });
    res.json(updated);
});
exports.setInitialRole = setInitialRole;
