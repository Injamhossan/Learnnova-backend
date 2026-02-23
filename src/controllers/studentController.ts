import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';

const COURSE_INCLUDE = {
  instructor: { include: { user: { select: { fullName: true } } } },
  category:   { select: { name: true } },
};

// ── Enroll in a course
const enrollInCourse = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params['courseId'] as string;
  const userId = req.user.id as string;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) { res.status(404); throw new Error('Course not found'); }

  const enrollment = await prisma.$transaction(async (tx) => {
    const existing = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (existing) throw new Error('Already enrolled in this course');

    const newEnrollment = await tx.enrollment.create({ data: { userId, courseId, status: 'ACTIVE' } });
    await tx.course.update({ where: { id: courseId }, data: { totalEnrollments: { increment: 1 } } });
    
    return newEnrollment;
  });

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

// ── Update lesson progress & calculate course progress ────────────────────────
const updateLessonProgress = asyncHandler(async (req: Request, res: Response) => {
  const lessonId = req.params['lessonId'] as string;
  const userId = req.user.id as string;
  const { isCompleted } = req.body;

  // 1. Find the lesson and its course
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { section: { select: { courseId: true } } }
  });

  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }

  const courseId = lesson.section.courseId;

  // 2. Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } }
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('Not enrolled in this course');
  }

  // 3. Upsert lesson progress
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { isCompleted, completedAt: isCompleted ? new Date() : null },
    create: { userId, lessonId, isCompleted, completedAt: isCompleted ? new Date() : null }
  });

  // 4. Calculate overall course progress
  // Get all lessons in this course
  const allCourseLessons = await prisma.courseLesson.findMany({
    where: { section: { courseId } },
    select: { id: true }
  });

  const totalLessons = allCourseLessons.length;
  
  // Get completed lessons by this user in this course
  const completedLessonsCount = await prisma.lessonProgress.count({
    where: {
      userId,
      isCompleted: true,
      lesson: { section: { courseId } }
    }
  });

  const percentage = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

  // 5. Update Enrollment
  const updatedEnrollment = await prisma.enrollment.update({
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

// ── Get student dashboard stats ─────────────────────────────────────────────
const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id as string;

  const [
    enrollments,
    completedLessons,
    certificates,
  ] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      select: { progressPercentage: true, status: true }
    }),
    prisma.lessonProgress.findMany({
      where: { userId, isCompleted: true },
      orderBy: { completedAt: 'desc' } as any,
    }),
    prisma.certificate.count({ where: { userId } }),
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
    const dates = [...new Set(completedLessons.map(lp => lp.completedAt?.toISOString().split('T')[0]))].filter(Boolean) as string[];
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Check if user did something today or yesterday to maintain streak
    if (dates[0] === today || dates[0] === yesterday) {
      streak = 1;
      for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i]);
        const next = new Date(dates[i+1]);
        const diff = (current.getTime() - next.getTime()) / (1000 * 3600 * 24);
        
        if (diff === 1) {
          streak++;
        } else {
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

export {
  enrollInCourse,
  getMyEnrolledCourses,
  getMyEnrollments,
  getMyCertificates,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  updateLessonProgress,
  getDashboardStats,
};
