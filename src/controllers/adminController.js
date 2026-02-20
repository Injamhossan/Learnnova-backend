const { prisma } = require('../config/db');
const asyncHandler = require('express-async-handler');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalInstructors,
    activeStudents,
    totalEnrollments,
    totalCourses,
    totalRevenue,
    recentUsers,
    popularCourses,
    recentEnrollments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.enrollment.count(),
    prisma.course.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, fullName: true, email: true, role: true, avatarUrl: true, createdAt: true },
    }),
    prisma.course.findMany({
      take: 5,
      orderBy: { totalEnrollments: 'desc' },
      include: {
        instructor: { include: { user: { select: { fullName: true } } } },
        category: { select: { name: true } },
      },
    }),
    // Enrollment chart data: last 10 days
    prisma.$queryRaw`
      SELECT DATE(enrolled_at) as date, COUNT(*)::int as count
      FROM enrollments
      WHERE enrolled_at >= NOW() - INTERVAL '10 days'
      GROUP BY DATE(enrolled_at)
      ORDER BY date ASC
    `,
  ]);

  res.json({
    stats: {
      totalUsers,
      totalInstructors,
      activeStudents,
      totalEnrollments,
      totalCourses,
      totalRevenue: totalRevenue._sum.amount || 0,
    },
    recentUsers,
    popularCourses,
    enrollmentChart: recentEnrollments,
  });
});

// @desc    Get all users (paginated)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const role = req.query.role || undefined;

  const where = {
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role && { role }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/toggle
// @access  Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });
  res.json(updated);
});

// @desc    Get all courses (admin)
// @route   GET /api/admin/courses
// @access  Admin
const getAllCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  const where = search
    ? { title: { contains: search, mode: 'insensitive' } }
    : {};

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        instructor: { include: { user: { select: { fullName: true, email: true } } } },
        category: { select: { name: true } },
        _count: { select: { enrollments: true, reviews: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  res.json({ courses, total, page, pages: Math.ceil(total / limit) });
});

// @desc    Toggle course published
// @route   PATCH /api/admin/courses/:id/toggle
// @access  Admin
const toggleCoursePublished = asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }
  const updated = await prisma.course.update({
    where: { id: req.params.id },
    data: {
      isPublished: !course.isPublished,
      publishedAt: !course.isPublished ? new Date() : null,
    },
    select: { id: true, title: true, isPublished: true },
  });
  res.json(updated);
});

// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Admin
const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { courses: true } } },
  });
  res.json(categories);
});

// @desc    Create category
// @route   POST /api/admin/categories
// @access  Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, iconUrl } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const category = await prisma.category.create({
    data: { name, slug, description, iconUrl },
  });
  res.status(201).json(category);
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  getAllCourses,
  toggleCoursePublished,
  getCategories,
  createCategory,
};
