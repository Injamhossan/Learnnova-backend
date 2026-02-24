"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = exports.createAdminUser = exports.deleteUser = exports.updateUserRole = exports.createCategory = exports.getCategories = exports.toggleCoursePublished = exports.getAllCourses = exports.toggleUserStatus = exports.getAllUsers = exports.getDashboardStats = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const db_1 = require("../config/db");
// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getDashboardStats = (0, express_async_handler_1.default)(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days) || 10, 7), 90);
    const [totalUsers, totalInstructors, activeStudents, totalEnrollments, totalCourses, totalRevenue, recentUsers, popularCourses, topInstructors, recentEnrollments, prevEnrollments, prevUsers, prevCourses,] = await Promise.all([
        db_1.prisma.user.count(),
        db_1.prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
        db_1.prisma.user.count({ where: { role: 'STUDENT' } }),
        db_1.prisma.enrollment.count(),
        db_1.prisma.course.count({ where: { deletedAt: null } }),
        db_1.prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: 'COMPLETED' },
        }),
        db_1.prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, fullName: true, email: true, role: true, avatarUrl: true, createdAt: true },
        }),
        db_1.prisma.course.findMany({
            take: 5,
            orderBy: { totalEnrollments: 'desc' },
            include: {
                instructor: { include: { user: { select: { fullName: true } } } },
                category: { select: { name: true } },
            },
        }),
        db_1.prisma.instructor.findMany({
            take: 10,
            orderBy: { averageRating: 'desc' },
            include: {
                user: { select: { fullName: true, email: true, avatarUrl: true } },
                _count: { select: { courses: true } },
                courses: {
                    select: {
                        totalEnrollments: true,
                        _count: { select: { enrollments: true } },
                    },
                },
            },
        }),
        // Chart: current period
        db_1.prisma.$queryRawUnsafe(`
      SELECT DATE(enrolled_at) as date, COUNT(*)::int as count
      FROM enrollments
      WHERE enrolled_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(enrolled_at)
      ORDER BY date ASC
    `),
        // Previous period enrollments count (for % change)
        db_1.prisma.enrollment.count({
            where: {
                enrolledAt: {
                    gte: new Date(Date.now() - days * 2 * 86400000),
                    lt: new Date(Date.now() - days * 86400000),
                },
            },
        }),
        // Previous period users (for % change)
        db_1.prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - days * 2 * 86400000),
                    lt: new Date(Date.now() - days * 86400000),
                },
            },
        }),
        // Previous period courses (for % change)
        db_1.prisma.course.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - days * 2 * 86400000),
                    lt: new Date(Date.now() - days * 86400000),
                },
            },
        }),
    ]);
    // Compute current-period enrollments sum from chart for change %
    const currentPeriodEnrollments = recentEnrollments.reduce((sum, r) => sum + (typeof r.count === 'bigint' ? Number(r.count) : Number(r.count)), 0);
    const pctChange = (curr, prev) => {
        if (prev === 0)
            return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
    };
    res.json({
        stats: {
            totalUsers,
            totalInstructors,
            activeStudents,
            totalEnrollments,
            totalCourses,
            totalRevenue: totalRevenue._sum.amount || 0,
        },
        changes: {
            enrollments: pctChange(currentPeriodEnrollments, prevEnrollments),
            users: pctChange(totalUsers, totalUsers - prevUsers),
            courses: pctChange(totalCourses, totalCourses - prevCourses),
        },
        recentUsers,
        popularCourses,
        topInstructors,
        enrollmentChart: recentEnrollments.map((r) => ({
            date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
            count: typeof r.count === 'bigint' ? Number(r.count) : Number(r.count),
        })),
        days,
    });
});
exports.getDashboardStats = getDashboardStats;
// @desc    Get all users (paginated)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = (0, express_async_handler_1.default)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || undefined;
    const isRequesterSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const where = {
        ...(search && {
            OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };
    if (role) {
        // If a specific role is requested, use it. 
        // Security check: normal admins cannot request SUPER_ADMIN
        if (!isRequesterSuperAdmin && role === 'SUPER_ADMIN') {
            where.role = 'NONE'; // Should return nothing or we could throw 403
        }
        else {
            where.role = role;
        }
    }
    else if (!isRequesterSuperAdmin) {
        // If no role requested, show everything except SUPER_ADMIN
        where.role = { not: 'SUPER_ADMIN' };
    }
    const [users, total] = await Promise.all([
        db_1.prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                avatarUrl: true,
                isActive: true,
                isEmailVerified: true,
                createdAt: true,
            },
        }),
        db_1.prisma.user.count({ where }),
    ]);
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
});
exports.getAllUsers = getAllUsers;
// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/toggle
// @access  Admin
const toggleUserStatus = (0, express_async_handler_1.default)(async (req, res) => {
    const targetId = req.params.id;
    const user = await db_1.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    // PROTECTION: No one can demote/suspend a SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Super Admin accounts are protected and cannot be suspended');
    }
    const updated = await db_1.prisma.user.update({
        where: { id: targetId },
        data: { isActive: !user.isActive },
        select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });
    res.json(updated);
});
exports.toggleUserStatus = toggleUserStatus;
// @desc    Get all courses (admin)
// @route   GET /api/admin/courses
// @access  Admin
const getAllCourses = (0, express_async_handler_1.default)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const where = {
        deletedAt: null,
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
    };
    const [courses, total] = await Promise.all([
        db_1.prisma.course.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                instructor: { include: { user: { select: { fullName: true, email: true } } } },
                category: { select: { name: true } },
                _count: { select: { enrollments: true, reviews: true } },
            },
        }),
        db_1.prisma.course.count({ where }),
    ]);
    res.json({ courses, total, page, pages: Math.ceil(total / limit) });
});
exports.getAllCourses = getAllCourses;
// @desc    Toggle course published (Draft <-> Published)
// @route   PATCH /api/admin/courses/:id/toggle
// @access  Admin
const toggleCoursePublished = (0, express_async_handler_1.default)(async (req, res) => {
    const courseId = req.params.id;
    const course = await db_1.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const updated = await db_1.prisma.course.update({
        where: { id: courseId },
        data: {
            status: newStatus,
            publishedAt: newStatus === 'PUBLISHED' ? new Date() : course.publishedAt,
        },
        select: { id: true, title: true, status: true },
    });
    res.json(updated);
});
exports.toggleCoursePublished = toggleCoursePublished;
// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Admin
const getCategories = (0, express_async_handler_1.default)(async (req, res) => {
    const categories = await db_1.prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { courses: true } } },
    });
    res.json(categories);
});
exports.getCategories = getCategories;
// @desc    Create category
// @route   POST /api/admin/categories
// @access  Admin
const createCategory = (0, express_async_handler_1.default)(async (req, res) => {
    const { name, description, iconUrl } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const category = await db_1.prisma.category.create({
        data: { name, slug, description, iconUrl },
    });
    res.status(201).json(category);
});
exports.createCategory = createCategory;
// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Super Admin
const updateUserRole = (0, express_async_handler_1.default)(async (req, res) => {
    const { role } = req.body;
    const targetId = req.params.id;
    // Only SUPER_ADMIN can change roles
    if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Only Super Admin can change user roles');
    }
    const user = await db_1.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    // PROTECTION: You CANNOT change the role of a SUPER_ADMIN (even your own)
    if (user.role === 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Super Admin roles are permanent and cannot be modified');
    }
    const updated = await db_1.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { id: targetId },
            data: { role },
            select: { id: true, fullName: true, email: true, role: true },
        });
        if (updatedUser.role === 'INSTRUCTOR') {
            const existingInstructor = await tx.instructor.findUnique({ where: { userId: targetId } });
            if (!existingInstructor) {
                await tx.instructor.create({ data: { userId: targetId } });
            }
        }
        return updatedUser;
    });
    res.json(updated);
});
exports.updateUserRole = updateUserRole;
// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Super Admin
const deleteUser = (0, express_async_handler_1.default)(async (req, res) => {
    const targetId = req.params.id;
    if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Only Super Admin can delete users');
    }
    const user = await db_1.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    // PROTECTION: No one can delete a SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
        res.status(400);
        throw new Error('Super Admin accounts cannot be deleted');
    }
    await db_1.prisma.user.delete({ where: { id: targetId } });
    res.json({ message: 'User removed' });
});
exports.deleteUser = deleteUser;
// @desc    Create admin user (Super Admin only)
// @route   POST /api/admin/users/create-admin
// @access  Super Admin
const createAdminUser = (0, express_async_handler_1.default)(async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Only Super Admin can create Admin accounts');
    }
    const { fullName, email, password, role = 'ADMIN' } = req.body;
    if (!fullName || !email || !password) {
        res.status(400);
        throw new Error('fullName, email, and password are required');
    }
    const validRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
        res.status(400);
        throw new Error('Role must be ADMIN or SUPER_ADMIN');
    }
    const existing = await db_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(400);
        throw new Error('A user with this email already exists');
    }
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await db_1.prisma.user.create({
        data: {
            fullName,
            email,
            passwordHash: hashedPassword,
            role: role,
            isEmailVerified: true,
            isActive: true,
        },
        select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json({ message: 'Admin account created successfully', user: newUser });
});
exports.createAdminUser = createAdminUser;
// @desc    Get detailed analytics
// @route   GET /api/admin/analytics
// @access  Admin
const getAnalytics = (0, express_async_handler_1.default)(async (req, res) => {
    const [revenuePerCourse, instructorPerformance, categoryDistribution,] = await Promise.all([
        // 1. Revenue per course
        db_1.prisma.payment.groupBy({
            by: ['courseId'],
            _sum: { amount: true },
            where: { status: 'COMPLETED' },
        }),
        // 2. Instructor performance
        db_1.prisma.instructor.findMany({
            include: {
                user: { select: { fullName: true } },
                courses: {
                    include: {
                        _count: {
                            select: {
                                enrollments: { where: { status: 'COMPLETED' } }
                            }
                        },
                        enrollments: { select: { id: true } }
                    }
                }
            }
        }),
        // 3. Category distribution
        db_1.prisma.category.findMany({
            select: {
                name: true,
                _count: { select: { courses: true } }
            }
        })
    ]);
    // Transform instructor performance to calculate rates
    // Note: For a more accurate "Completion Rate per Instructor", 
    // we'd need to count enrollments with status 'COMPLETED' across all their courses.
    const instructors = await db_1.prisma.instructor.findMany({
        include: {
            user: { select: { fullName: true } },
            courses: {
                include: {
                    _count: {
                        select: {
                            enrollments: { where: { status: 'COMPLETED' } }
                        }
                    },
                    enrollments: { select: { id: true } }
                }
            }
        }
    });
    const instructorStats = instructors.map(inst => {
        let totalEnrolled = 0;
        let totalCompleted = 0;
        inst.courses.forEach(c => {
            totalEnrolled += c.enrollments.length;
            totalCompleted += c._count.enrollments;
        });
        return {
            name: inst.user.fullName,
            totalStudents: totalEnrolled,
            totalCompletions: totalCompleted,
            completionRate: totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0
        };
    });
    res.json({
        revenuePerCourse: revenuePerCourse.map(r => ({
            courseId: r.courseId,
            totalRevenue: r._sum.amount || 0
        })),
        instructorPerformance: instructorStats,
        categoryDistribution: categoryDistribution.map(c => ({
            name: c.name,
            courseCount: c._count.courses
        }))
    });
});
exports.getAnalytics = getAnalytics;
