import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';

// @desc    Enroll in a course
// @route   POST /api/students/enroll/:courseId
// @access  Private/Student
const enrollInCourse = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params.courseId as string;
  const userId = req.user.id as string;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check if already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId }
    }
  });

  if (existingEnrollment) {
    res.status(400);
    throw new Error('Already enrolled in this course');
  }

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId
    }
  });

  // Update total enrollments count in course
  await prisma.course.update({
    where: { id: courseId },
    data: { totalEnrollments: { increment: 1 } }
  });

  res.status(201).json(enrollment);
});

// @desc    Get my enrolled courses
// @route   GET /api/students/my-courses
// @access  Private/Student
const getMyEnrolledCourses = asyncHandler(async (req: Request, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: req.user.id },
    include: {
      course: {
        include: {
          instructor: { include: { user: { select: { fullName: true } } } },
          category: { select: { name: true } }
        }
      }
    },
    orderBy: { enrolledAt: 'desc' } as any
  });

  res.json(enrollments);
});

export {
  enrollInCourse,
  getMyEnrolledCourses
};
