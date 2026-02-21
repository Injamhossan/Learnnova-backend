import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import slugify from 'slugify';
import { prisma } from '../config/db';

// @desc    Get all published courses
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      instructor: {
        include: { user: { select: { fullName: true, avatarUrl: true } } }
      },
      category: { select: { name: true, slug: true } }
    },
  });
  res.json(courses);
});

// @desc    Get instructor's own courses
// @route   GET /api/courses/my-courses
// @access  Private/Instructor
const getMyCourses = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = req.instructor ? req.instructor.id : null;
  
  if (!instructorId) {
    res.status(400);
    throw new Error('Instructor profile not found');
  }

  const courses = await prisma.course.findMany({
    where: { instructorId },
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { enrollments: true } }
    },
    orderBy: { createdAt: 'desc' } as any
  });
  res.json(courses);
});

// @desc    Create a course
// @route   POST /api/courses
// @access  Private/Instructor
const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, categoryId, price, level, thumbnailUrl } = req.body;
  const instructorId = req.instructor.id;

  const slug = slugify(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 7);

  const course = await prisma.course.create({
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

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Instructor
const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, categoryId, price, level, thumbnailUrl, isPublished, whatYouWillLearn, requirements } = req.body;
  const courseId = req.params.id as string;
  
  const course = await prisma.course.findUnique({
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

  const data: any = {
    title,
    description,
    categoryId,
    price: price !== undefined ? parseFloat(price) : undefined,
    level,
    thumbnailUrl,
    isPublished,
    whatYouWillLearn,
    requirements
  };

  if (title && title !== course.title) {
    data.slug = slugify(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 7);
  }

  if (isPublished === true && !course.isPublished) {
    data.publishedAt = new Date();
  }

  const updatedCourse = await prisma.course.update({
    where: { id: courseId },
    data
  });

  res.json(updatedCourse);
});

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Instructor/Admin
const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params.id as string;
  const course = await prisma.course.findUnique({
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

  await prisma.course.delete({
    where: { id: courseId }
  });

  res.json({ message: 'Course deleted successfully' });
});

// @desc    Get Instructor Dashboard Stats
// @route   GET /api/courses/instructor/stats
// @access  Private/Instructor
const getInstructorStats = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = req.instructor.id;

  const [courseCount, totalEnrollments, earnings] = await Promise.all([
    prisma.course.count({ where: { instructorId } }),
    prisma.enrollment.count({ where: { course: { instructorId } } }),
    prisma.payment.aggregate({
      where: { course: { instructorId }, status: 'COMPLETED' as any },
      _sum: { amount: true }
    })
  ]);

  // Get recent enrollments for analytics
  const recentEnrollments = await prisma.enrollment.findMany({
    where: { course: { instructorId } },
    take: 5,
    orderBy: { enrolledAt: 'desc' } as any,
    include: {
      user: { select: { fullName: true, email: true, avatarUrl: true } },
      course: { select: { title: true } }
    }
  });

  res.json({
    totalCourses: courseCount,
    totalStudents: totalEnrollments,
    totalEarnings: (earnings._sum as any).amount || 0,
    recentEnrollments
  });
});

export {
  getCourses,
  getMyCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getInstructorStats
};
