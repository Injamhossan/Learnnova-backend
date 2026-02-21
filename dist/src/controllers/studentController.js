"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyEnrolledCourses = exports.enrollInCourse = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const db_1 = require("../config/db");
// @desc    Enroll in a course
// @route   POST /api/students/enroll/:courseId
// @access  Private/Student
const enrollInCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    const course = await db_1.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    // Check if already enrolled
    const existingEnrollment = await db_1.prisma.enrollment.findUnique({
        where: {
            userId_courseId: { userId, courseId }
        }
    });
    if (existingEnrollment) {
        res.status(400);
        throw new Error('Already enrolled in this course');
    }
    // Create enrollment
    const enrollment = await db_1.prisma.enrollment.create({
        data: {
            userId,
            courseId
        }
    });
    // Update total enrollments count in course
    await db_1.prisma.course.update({
        where: { id: courseId },
        data: { totalEnrollments: { increment: 1 } }
    });
    res.status(201).json(enrollment);
});
exports.enrollInCourse = enrollInCourse;
// @desc    Get my enrolled courses
// @route   GET /api/students/my-courses
// @access  Private/Student
const getMyEnrolledCourses = (0, express_async_handler_1.default)(async (req, res) => {
    const enrollments = await db_1.prisma.enrollment.findMany({
        where: { userId: req.user.id },
        include: {
            course: {
                include: {
                    instructor: { include: { user: { select: { fullName: true } } } },
                    category: { select: { name: true } }
                }
            }
        },
        orderBy: { enrolledAt: 'desc' }
    });
    res.json(enrollments);
});
exports.getMyEnrolledCourses = getMyEnrolledCourses;
