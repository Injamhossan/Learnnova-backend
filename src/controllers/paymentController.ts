import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';
import { sendNotification } from '../utils/socket';

// @desc    Initiate payment (Checkout)
// @route   POST /api/payments/checkout
// @access  Private
const checkout = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, paymentMethod } = req.body;
  const userId = req.user.id as string;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check if already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
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

  const payment = await prisma.$transaction(async (tx) => {
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
    } else {
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
  sendNotification(userId, {
    title: 'Enrollment Successful',
    message: `You have successfully enrolled in ${course.title}`,
    type: 'ENROLLMENT_SUCCESS'
  });

  res.status(201).json({
    message: 'Payment and enrollment successful',
    payment,
  });
});

// @desc    Get student's payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id as string;

  const payments = await prisma.payment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          title: true,
          thumbnailUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' } as any,
  });

  res.json(payments);
});

// @desc    Get instructor's earnings (alternate endpoint)
// @route   GET /api/payments/instructor/earnings
// @access  Private/Instructor
const getInstructorEarnings = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = req.instructor.id;

  const payments = await prisma.payment.findMany({
    where: {
      course: { instructorId },
      status: 'COMPLETED' as any,
    },
    include: {
      course: { select: { title: true } },
      user: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' } as any,
  });

  const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({
    totalEarnings,
    payments,
  });
});

export { checkout, getPaymentHistory, getInstructorEarnings };
