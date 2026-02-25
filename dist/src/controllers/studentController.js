"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.updateLessonProgress = exports.removeFromWishlist = exports.addToWishlist = exports.getWishlist = exports.getMyCertificates = exports.getMyEnrollments = exports.getMyEnrolledCourses = exports.dropCourse = exports.enrollInCourse = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../config/db");
const sendEmail_1 = __importDefault(require("../utils/sendEmail"));
const emailTemplates_1 = require("../utils/emailTemplates");
const socket_1 = require("../utils/socket");
const COURSE_INCLUDE = {
    instructor: { include: { user: { select: { fullName: true } } } },
    category: { select: { name: true } },
};
// ── Enroll in a course
const enrollInCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const courseId = req.params['courseId'];
    const userId = req.user.id;
    const course = await db_1.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    if (course.price > 0) {
        res.status(400);
        throw new Error('This is a paid course. Please use the checkout process.');
    }
    const { enrollment, notif } = await db_1.prisma.$transaction(async (tx) => {
        const existing = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
        if (existing) {
            if (existing.status === 'DROPPED') {
                // Re-active if dropped
                const updated = await tx.enrollment.update({
                    where: { id: existing.id },
                    data: { status: 'ACTIVE', enrolledAt: new Date() }
                });
                return { enrollment: updated, notif: null };
            }
            throw new Error('Already enrolled in this course');
        }
        const newEnrollment = await tx.enrollment.create({ data: { userId, courseId, status: 'ACTIVE' } });
        await tx.course.update({ where: { id: courseId }, data: { totalEnrollments: { increment: 1 } } });
        // Create DB Notification
        const dbNotif = await tx.notification.create({
            data: {
                userId,
                type: 'ENROLLMENT',
                title: 'New Course Enrollment',
                message: `You have successfully enrolled in "${course.title}". Happy learning!`,
                linkUrl: `/courses/${courseId}`
            }
        });
        return { enrollment: newEnrollment, notif: dbNotif };
    });
    // ── Actions outside transaction ──────────────────────────────────────────
    if (notif) {
        // Real-time notification
        (0, socket_1.sendNotification)(userId, notif);
        // Send Confirmation Email (Async, don't await if you want speed, but here we wait for safety)
        try {
            const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
            if (user) {
                const emailHtml = (0, emailTemplates_1.getEmailTemplate)('Enrollment Confirmation', `Congratulations! You have successfully enrolled in "${course.title}". You can now access all course materials and start your learning journey.`, undefined, 'Access Course', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses/${courseId}`);
                await (0, sendEmail_1.default)({
                    email: user.email,
                    subject: `Learnova - Enrolled: ${course.title}`,
                    message: emailHtml,
                    attachments: [{
                            filename: 'NavLogo.png',
                            path: path_1.default.join(__dirname, '..', 'assets', 'NavLogo.png'),
                            cid: 'logo'
                        }]
                });
            }
        }
        catch (emailErr) {
            console.error('Failed to send enrollment email:', emailErr);
        }
    }
    res.status(201).json(enrollment);
});
exports.enrollInCourse = enrollInCourse;
// ── Drop a course
const dropCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const courseId = req.params['courseId'];
    const userId = req.user.id;
    const enrollment = await db_1.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } }
    });
    if (!enrollment) {
        res.status(404);
        throw new Error('Enrollment not found');
    }
    const updatedEnrollment = await db_1.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'DROPPED' }
    });
    res.json({ message: 'Course dropped', enrollment: updatedEnrollment });
});
exports.dropCourse = dropCourse;
// ── Get my enrollments (rich) ────────────────────────────────────────────────
const getMyEnrollments = (0, express_async_handler_1.default)(async (req, res) => {
    const enrollments = await db_1.prisma.enrollment.findMany({
        where: { userId: req.user.id },
        include: { course: { include: { ...COURSE_INCLUDE, _count: { select: { sections: true } } } } },
        orderBy: { enrolledAt: 'desc' },
    });
    res.json({ enrollments, total: enrollments.length });
});
exports.getMyEnrollments = getMyEnrollments;
// alias kept for backward-compat
const getMyEnrolledCourses = getMyEnrollments;
exports.getMyEnrolledCourses = getMyEnrolledCourses;
// ── Get my certificates ──────────────────────────────────────────────────────
const getMyCertificates = (0, express_async_handler_1.default)(async (req, res) => {
    const certificates = await db_1.prisma.certificate.findMany({
        where: { userId: req.user.id },
        include: { course: { include: COURSE_INCLUDE } },
        orderBy: { issuedAt: 'desc' },
    });
    res.json({ certificates, total: certificates.length });
});
exports.getMyCertificates = getMyCertificates;
// ── Get wishlist ──────────────────────────────────────────────────────────────
const getWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const wishlist = await db_1.prisma.wishlist.findMany({
        where: { userId: req.user.id },
        include: { course: { include: COURSE_INCLUDE } },
        orderBy: { addedAt: 'desc' },
    });
    res.json({ wishlist, total: wishlist.length });
});
exports.getWishlist = getWishlist;
// ── Add to wishlist ───────────────────────────────────────────────────────────
const addToWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const courseId = req.params['courseId'];
    const userId = req.user.id;
    const course = await db_1.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    const existing = await db_1.prisma.wishlist.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (existing) {
        res.status(400);
        throw new Error('Already in wishlist');
    }
    const item = await db_1.prisma.wishlist.create({ data: { userId, courseId } });
    res.status(201).json(item);
});
exports.addToWishlist = addToWishlist;
// ── Remove from wishlist ──────────────────────────────────────────────────────
const removeFromWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const courseId = req.params['courseId'];
    const userId = req.user.id;
    await db_1.prisma.wishlist.deleteMany({ where: { userId, courseId } });
    res.json({ message: 'Removed from wishlist' });
});
exports.removeFromWishlist = removeFromWishlist;
// ── Update lesson progress & calculate course progress ────────────────────────
const updateLessonProgress = (0, express_async_handler_1.default)(async (req, res) => {
    const lessonId = req.params['lessonId'];
    const userId = req.user.id;
    const { isCompleted } = req.body;
    // 1. Find the lesson and its course
    const lesson = await db_1.prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: { section: { select: { courseId: true } } }
    });
    if (!lesson) {
        res.status(404);
        throw new Error('Lesson not found');
    }
    const courseId = lesson.section.courseId;
    // 2. Verify enrollment
    const enrollment = await db_1.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } }
    });
    if (!enrollment) {
        res.status(403);
        throw new Error('Not enrolled in this course');
    }
    // 3. Upsert lesson progress
    await db_1.prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: { isCompleted, completedAt: isCompleted ? new Date() : null },
        create: { userId, lessonId, isCompleted, completedAt: isCompleted ? new Date() : null }
    });
    // 4. Calculate overall course progress
    // Get all lessons in this course
    const allCourseLessons = await db_1.prisma.courseLesson.findMany({
        where: { section: { courseId } },
        select: { id: true }
    });
    const totalLessons = allCourseLessons.length;
    // Get completed lessons by this user in this course
    const completedLessonsCount = await db_1.prisma.lessonProgress.count({
        where: {
            userId,
            isCompleted: true,
            lesson: { section: { courseId } }
        }
    });
    const percentage = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
    // 5. Update Enrollment
    const updatedEnrollment = await db_1.prisma.enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: {
            progressPercentage: percentage,
            status: percentage === 100 ? 'COMPLETED' : enrollment.status,
            completedAt: percentage === 100 ? (enrollment.completedAt || new Date()) : enrollment.completedAt
        }
    });
    res.json({
        message: 'Progress updated',
        progressPercentage: percentage,
        isCompleted: percentage === 100
    });
});
exports.updateLessonProgress = updateLessonProgress;
// ── Get student dashboard stats ─────────────────────────────────────────────
const getDashboardStats = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const [enrollments, completedLessons, certificates,] = await Promise.all([
        db_1.prisma.enrollment.findMany({
            where: { userId },
            select: { progressPercentage: true, status: true }
        }),
        db_1.prisma.lessonProgress.findMany({
            where: { userId, isCompleted: true },
            orderBy: { completedAt: 'desc' },
        }),
        db_1.prisma.certificate.count({ where: { userId } }),
    ]);
    const inProgressCount = enrollments.filter(e => e.status === 'ACTIVE').length;
    const completedCount = enrollments.filter(e => e.status === 'COMPLETED').length;
    // Calculate Weekly Goal (lessons completed in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const lessonsThisWeek = completedLessons.filter(lp => lp.completedAt && new Date(lp.completedAt) >= sevenDaysAgo).length;
    // Streak calculation (simplified: consecutive days with at least one lesson completed)
    let streak = 0;
    if (completedLessons.length > 0) {
        const dates = [...new Set(completedLessons.map(lp => lp.completedAt?.toISOString().split('T')[0]))].filter(Boolean);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        // Check if user did something today or yesterday to maintain streak
        if (dates[0] === today || dates[0] === yesterday) {
            streak = 1;
            for (let i = 0; i < dates.length - 1; i++) {
                const current = new Date(dates[i]);
                const next = new Date(dates[i + 1]);
                const diff = (current.getTime() - next.getTime()) / (1000 * 3600 * 24);
                if (diff === 1) {
                    streak++;
                }
                else {
                    break;
                }
            }
        }
    }
    res.json({
        inProgress: inProgressCount,
        completed: completedCount,
        certificates,
        lessonsThisWeek,
        weeklyGoal: 5, // Default goal
        streak,
    });
});
exports.getDashboardStats = getDashboardStats;
