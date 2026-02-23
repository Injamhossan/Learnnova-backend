import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';

const COURSE_INCLUDE = {
  instructor: { include: { user: { select: { fullName: true } } } },
  category:   { select: { name: true } },
};

// ── Enroll in a course ──────────────────────────────────────────────────────
const enrollInCourse = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params['courseId'] as string;
  const userId = req.user.id as string;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404); throw new Error('Course not found'); }

  const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) { res.status(400); throw new Error('Already enrolled in this course'); }

  const enrollment = await prisma.enrollment.create({ data: { userId, courseId } });
  await prisma.course.update({ where: { id: courseId }, data: { totalEnrollments: { increment: 1 } } });
  res.status(201).json(enrollment);
});

// ── Get my enrollments (rich) ────────────────────────────────────────────────
const getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: req.user.id },
    include: { course: { include: { ...COURSE_INCLUDE, _count: { select: { sections: true } } } } },
    orderBy: { enrolledAt: 'desc' } as any,
  });
  res.json({ enrollments, total: enrollments.length });
});

// alias kept for backward-compat
const getMyEnrolledCourses = getMyEnrollments;

// ── Get my certificates ──────────────────────────────────────────────────────
const getMyCertificates = asyncHandler(async (req: Request, res: Response) => {
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id },
    include: { course: { include: COURSE_INCLUDE } },
    orderBy: { issuedAt: 'desc' } as any,
  });
  res.json({ certificates, total: certificates.length });
});

// ── Get wishlist ──────────────────────────────────────────────────────────────
const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const wishlist = await prisma.wishlist.findMany({
    where: { userId: req.user.id },
    include: { course: { include: COURSE_INCLUDE } },
    orderBy: { addedAt: 'desc' } as any,
  });
  res.json({ wishlist, total: wishlist.length });
});

// ── Add to wishlist ───────────────────────────────────────────────────────────
const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params['courseId'] as string;
  const userId = req.user.id as string;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404); throw new Error('Course not found'); }

  const existing = await prisma.wishlist.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) { res.status(400); throw new Error('Already in wishlist'); }

  const item = await prisma.wishlist.create({ data: { userId, courseId } });
  res.status(201).json(item);
});

// ── Remove from wishlist ──────────────────────────────────────────────────────
const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params['courseId'] as string;
  const userId = req.user.id as string;

  await prisma.wishlist.deleteMany({ where: { userId, courseId } });
  res.json({ message: 'Removed from wishlist' });
});

export {
  enrollInCourse,
  getMyEnrolledCourses,
  getMyEnrollments,
  getMyCertificates,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
