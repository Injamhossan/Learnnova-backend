"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.getInstructorStats = exports.deleteCourse = exports.updateCourse = exports.createCourse = exports.getMyCourses = exports.getCourseDetail = exports.getCourses = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const slugify_1 = __importDefault(require("slugify"));
const db_1 = require("../config/db");
// @desc    Get all published courses
// @route   GET /api/courses
// @access  Public
const getCourses = (0, express_async_handler_1.default)(async (req, res) => {
    const { search, category, level, sort } = req.query;
    const where = {
        status: 'PUBLISHED',
        deletedAt: null,
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
        ...(category && { category: { slug: category } }),
        ...(level && { level }),
    };
    let orderBy = { createdAt: 'desc' };
    if (sort === 'newest')
        orderBy = { createdAt: 'desc' };
    if (sort === 'oldest')
        orderBy = { createdAt: 'asc' };
    if (sort === 'price-low')
        orderBy = { price: 'asc' };
    if (sort === 'price-high')
        orderBy = { price: 'desc' };
    if (sort === 'rating')
        orderBy = { averageRating: 'desc' };
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const cursor = req.query.cursor;
    const courses = await db_1.prisma.course.findMany({
        where,
        take: limit,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        include: {
            instructor: {
                include: { user: { select: { fullName: true, avatarUrl: true } } }
            },
            category: { select: { name: true, slug: true } }
        },
        orderBy,
    });
    const nextCursor = courses.length === limit ? courses[courses.length - 1].id : null;
    res.json({
        courses,
        nextCursor,
    });
});
exports.getCourses = getCourses;
// @desc    Get instructor's own courses
// @route   GET /api/courses/my-courses
// @access  Private/Instructor
const getMyCourses = (0, express_async_handler_1.default)(async (req, res) => {
    const instructorId = req.instructor ? req.instructor.id : null;
    if (!instructorId) {
        res.status(400);
        throw new Error('Instructor profile not found');
    }
    const courses = await db_1.prisma.course.findMany({
        where: { instructorId },
        include: {
            category: { select: { name: true, slug: true } },
            _count: { select: { enrollments: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json(courses);
});
exports.getMyCourses = getMyCourses;
// @desc    Create a course
// @route   POST /api/courses
// @access  Private/Instructor
const createCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, description, categoryId, price, level, thumbnailUrl } = req.body;
    const instructorId = req.instructor.id;
    const slug = (0, slugify_1.default)(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 7);
    const course = await db_1.prisma.course.create({
        data: {
            title,
            slug,
            description,
            thumbnailUrl,
            price: parseFloat(price) || 0,
            level: level || 'ALL',
            categoryId,
            instructorId,
        },
    });
    res.status(201).json(course);
});
exports.createCourse = createCourse;
// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Instructor
const updateCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, description, categoryId, price, level, thumbnailUrl, status, whatYouWillLearn, requirements } = req.body;
    const courseId = req.params.id;
    const course = await db_1.prisma.course.findUnique({
        where: { id: courseId }
    });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    // Check ownership (Admin/SuperAdmin can edit anything)
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && course.instructorId !== req.instructor.id) {
        res.status(403);
        throw new Error('Not authorized to edit this course');
    }
    const data = {
        title,
        description,
        categoryId,
        price: price !== undefined ? parseFloat(price) : undefined,
        level,
        thumbnailUrl,
        status,
        whatYouWillLearn,
        requirements
    };
    if (title && title !== course.title) {
        data.slug = (0, slugify_1.default)(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 7);
    }
    if (status === 'PUBLISHED' && course.status !== 'PUBLISHED') {
        data.publishedAt = new Date();
    }
    const updatedCourse = await db_1.prisma.course.update({
        where: { id: courseId },
        data
    });
    res.json(updatedCourse);
});
exports.updateCourse = updateCourse;
// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Instructor/Admin
const deleteCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const courseId = req.params.id;
    const course = await db_1.prisma.course.findUnique({
        where: { id: courseId }
    });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    // Check ownership
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && course.instructorId !== req.instructor.id) {
        res.status(403);
        throw new Error('Not authorized to delete this course');
    }
    // Perform Soft Delete
    await db_1.prisma.course.update({
        where: { id: courseId },
        data: { deletedAt: new Date(), status: 'ARCHIVED' }
    });
    res.json({ message: 'Course removed successfully (soft-deleted)' });
});
exports.deleteCourse = deleteCourse;
// @desc    Get Instructor Dashboard Stats
// @route   GET /api/courses/instructor/stats
// @access  Private/Instructor
const getInstructorStats = (0, express_async_handler_1.default)(async (req, res) => {
    const instructorId = req.instructor.id;
    const [courseCount, totalEnrollments, earnings] = await Promise.all([
        db_1.prisma.course.count({ where: { instructorId } }),
        db_1.prisma.enrollment.count({ where: { course: { instructorId } } }),
        db_1.prisma.payment.aggregate({
            where: { course: { instructorId }, status: 'COMPLETED' },
            _sum: { amount: true }
        })
    ]);
    // Get recent enrollments for analytics
    const recentEnrollments = await db_1.prisma.enrollment.findMany({
        where: { course: { instructorId } },
        take: 5,
        orderBy: { enrolledAt: 'desc' },
        include: {
            user: { select: { fullName: true, email: true, avatarUrl: true } },
            course: { select: { title: true } }
        }
    });
    res.json({
        totalCourses: courseCount,
        totalStudents: totalEnrollments,
        totalEarnings: earnings._sum.amount || 0,
        recentEnrollments
    });
});
exports.getInstructorStats = getInstructorStats;
// @desc    Get course details (public)
// @route   GET /api/courses/:idOrSlug
// @access  Public
const getCourseDetail = (0, express_async_handler_1.default)(async (req, res) => {
    const idOrSlug = req.params.idOrSlug;
    const course = await db_1.prisma.course.findFirst({
        where: {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }],
            status: 'PUBLISHED',
            deletedAt: null
        },
        include: {
            instructor: {
                include: { user: { select: { fullName: true, avatarUrl: true, bio: true } } }
            },
            category: { select: { name: true, slug: true } },
            sections: {
                orderBy: { orderIndex: 'asc' },
                include: {
                    lessons: {
                        orderBy: { orderIndex: 'asc' },
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            isPreview: true,
                            videoDurationSeconds: true,
                            orderIndex: true,
                            videoUrl: true, // we'll filter this in frontend or just keep it since it's public for preview
                        }
                    }
                }
            },
            _count: { select: { enrollments: true, reviews: true } }
        }
    });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    res.json(course);
});
exports.getCourseDetail = getCourseDetail;
// @desc    Get all categories for selection
// @route   GET /api/courses/categories
// @access  Public
const getCategories = (0, express_async_handler_1.default)(async (req, res) => {
    const categories = await db_1.prisma.category.findMany({
        orderBy: { name: 'asc' },
    });
    res.json(categories);
});
exports.getCategories = getCategories;
