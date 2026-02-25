"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstructorEarnings = exports.getPaymentHistory = exports.checkout = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const db_1 = require("../config/db");
const socket_1 = require("../utils/socket");
// @desc    Initiate payment (Checkout)
// @route   POST /api/payments/checkout
// @access  Private
const checkout = (0, express_async_handler_1.default)(async (req, res) => {
    const { courseId, paymentMethod } = req.body;
    const userId = req.user.id;
    const course = await db_1.prisma.course.findUnique({
        where: { id: courseId },
    });
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    // Check if already enrolled
    const existingEnrollment = await db_1.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment && existingEnrollment.status !== 'DROPPED') {
        res.status(400);
        throw new Error('You are already enrolled in this course');
    }
    const amount = course.discountPrice || course.price;
    // In a real application, you would integrate with a payment gateway here (Stripe, SSLCommerz, etc.)
    // For this project, we'll simulate a successful payment process.
    const transactionId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const payment = await db_1.prisma.$transaction(async (tx) => {
        // 1. Create Payment Record
        const newPayment = await tx.payment.create({
            data: {
                userId,
                courseId,
                amount,
                currency: 'USD', // Default to USD as per schema
                paymentMethod: paymentMethod || 'Mock Payment',
                transactionId,
                status: 'COMPLETED', // Simulating instant completion
            },
        });
        // 2. Create or Update Enrollment
        if (existingEnrollment) {
            await tx.enrollment.update({
                where: { id: existingEnrollment.id },
                data: { status: 'ACTIVE', enrolledAt: new Date() },
            });
        }
        else {
            await tx.enrollment.create({
                data: { userId, courseId, status: 'ACTIVE' },
            });
        }
        // 3. Update Course & Instructor Stats
        await tx.course.update({
            where: { id: courseId },
            data: { totalEnrollments: { increment: 1 } },
        });
        await tx.instructor.update({
            where: { id: course.instructorId },
            data: { totalStudents: { increment: 1 } },
        });
        // 4. Create Notification
        await tx.notification.create({
            data: {
                userId,
                type: 'PAYMENT_SUCCESS',
                title: 'Payment Successful',
                message: `Your payment of $${amount} for "${course.title}" was successful.`,
                linkUrl: `/dashboard/enrolled-courses`,
            },
        });
        return newPayment;
    });
    // Real-time notification
    (0, socket_1.sendNotification)(userId, {
        title: 'Enrollment Successful',
        message: `You have successfully enrolled in ${course.title}`,
        type: 'ENROLLMENT_SUCCESS'
    });
    res.status(201).json({
        message: 'Payment and enrollment successful',
        payment,
    });
});
exports.checkout = checkout;
// @desc    Get student's payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const payments = await db_1.prisma.payment.findMany({
        where: { userId },
        include: {
            course: {
                select: {
                    title: true,
                    thumbnailUrl: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
});
exports.getPaymentHistory = getPaymentHistory;
// @desc    Get instructor's earnings (alternate endpoint)
// @route   GET /api/payments/instructor/earnings
// @access  Private/Instructor
const getInstructorEarnings = (0, express_async_handler_1.default)(async (req, res) => {
    const instructorId = req.instructor.id;
    const payments = await db_1.prisma.payment.findMany({
        where: {
            course: { instructorId },
            status: 'COMPLETED',
        },
        include: {
            course: { select: { title: true } },
            user: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);
    res.json({
        totalEarnings,
        payments,
    });
});
exports.getInstructorEarnings = getInstructorEarnings;
