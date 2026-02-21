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
    topInstructors,
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
    prisma.instructor.findMany({
      take: 5,
      orderBy: { averageRating: 'desc' },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
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
    topInstructors,
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

  const isRequesterSuperAdmin = req.user.role === 'SUPER_ADMIN';

  const where = {
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role && { role }),
    ...(!isRequesterSuperAdmin && {
      role: { not: 'SUPER_ADMIN' }
    })
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
  const targetId = req.params.id;
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // PROTECTION: No one can demote/suspend a SUPER_ADMIN
  if (user.role === 'SUPER_ADMIN') {
    res.status(403);
    throw new Error('Super Admin accounts are protected and cannot be suspended');
  }

  // Normal Admins cannot toggle other Admins if you want to be stricter (optional)
  // But definitely cannot toggle SUPER_ADMIN (already checked above)

  const updated = await prisma.user.update({
    where: { id: targetId },
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

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Super Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const targetId = req.params.id;

  // Only SUPER_ADMIN can change roles
  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403);
    throw new Error('Only Super Admin can change user roles');
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // PROTECTION: You CANNOT change the role of a SUPER_ADMIN (even your own)
  if (user.role === 'SUPER_ADMIN') {
    res.status(403);
    throw new Error('Super Admin roles are permanent and cannot be modified');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, fullName: true, email: true, role: true },
    });

    if (updatedUser.role === 'INSTRUCTOR') {
      const existingInstructor = await tx.instructor.findUnique({ where: { userId: targetId } });
      if (!existingInstructor) {
        await tx.instructor.create({ data: { userId: targetId } });
      }
    }

    return updatedUser;
  });

  res.json(updated);
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Super Admin
const deleteUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403);
    throw new Error('Only Super Admin can delete users');
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // PROTECTION: No one can delete a SUPER_ADMIN
  if (user.role === 'SUPER_ADMIN') {
    res.status(400);
    throw new Error('Super Admin accounts cannot be deleted');
  }

  await prisma.user.delete({ where: { id: targetId } });
  res.json({ message: 'User removed' });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  getAllCourses,
  toggleCoursePublished,
  getCategories,
  createCategory,
  updateUserRole,
  deleteUser,
};
