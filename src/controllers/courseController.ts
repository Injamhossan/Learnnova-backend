import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import slugify from 'slugify';
import { prisma } from '../config/db';

// @desc    Get all published courses
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const { search, category, level, sort } = req.query;

  const where: any = { 
    status: 'PUBLISHED',
    deletedAt: null,
    ...(search && { title: { contains: search as string, mode: 'insensitive' } }),
    ...(category && { category: { slug: category } }),
    ...(level && { level }),
  };

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'newest') orderBy = { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  if (sort === 'price-low') orderBy = { price: 'asc' };
  if (sort === 'price-high') orderBy = { price: 'desc' };
  if (sort === 'rating') orderBy = { averageRating: 'desc' };

  const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
  const cursor = req.query.cursor as string | undefined;

  const courses = await prisma.course.findMany({
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
    where: { 
      instructorId,
      deletedAt: null 
    },
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
      price: parseFloat(price as string) || 0,
      level: level || 'ALL',
      categoryId,
      instructorId,
      whatYouWillLearn: req.body.whatYouWillLearn || [],
      requirements: req.body.requirements || [],
    },
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { enrollments: true } }
    }
  });

  res.status(201).json(course);
});

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Instructor
const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, categoryId, price, level, thumbnailUrl, status, whatYouWillLearn, requirements } = req.body;
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
    status,
    whatYouWillLearn,
    requirements
  };

  if (title && title !== course.title) {
    data.slug = slugify(title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 7);
  }

  if (status === 'PUBLISHED' && course.status !== 'PUBLISHED') {
    data.publishedAt = new Date();
  }

  const updatedCourse = await prisma.course.update({
    where: { id: courseId },
    data,
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { enrollments: true } }
    }
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

  // Perform Soft Delete
  await prisma.course.update({
    where: { id: courseId },
    data: { deletedAt: new Date(), status: 'ARCHIVED' }
  });

  res.json({ message: 'Course removed successfully (soft-deleted)' });
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

// @desc    Get course details (public)
// @route   GET /api/courses/:idOrSlug
// @access  Public
const getCourseDetail = asyncHandler(async (req: Request, res: Response) => {
  const idOrSlug = req.params.idOrSlug as string;

  const course = await prisma.course.findFirst({
    where: {
      OR: [ { id: idOrSlug }, { slug: idOrSlug } ],
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

// @desc    Get all categories for selection
// @route   GET /api/courses/categories
// @access  Public
const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' } as any,
  });
  res.json(categories);
});

export {
  getCourses,
  getCourseDetail,
  getMyCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getInstructorStats,
  getCategories
};
