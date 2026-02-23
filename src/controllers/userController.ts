import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';

// @desc  Get all users (admin)
const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
  res.json(users);
});

// @desc  Get my own profile
// @route GET /api/users/me
const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, fullName: true, email: true, role: true,
      avatarUrl: true, bio: true, phone: true, createdAt: true, isActive: true,
      instructor: {
        select: {
          headline: true, description: true, expertise: true,
          websiteUrl: true, linkedinUrl: true, twitterUrl: true,
          totalStudents: true, totalCourses: true, averageRating: true,
        },
      },
    },
  });
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json(user);
});

// @desc  Update my profile (name, bio, phone, avatarUrl)
// @route PATCH /api/users/me
const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, bio, phone, avatarUrl } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(fullName  && { fullName }),
      ...(bio       !== undefined && { bio }),
      ...(phone     !== undefined && { phone }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true, bio: true, phone: true },
  });
  res.json(updated);
});

// @desc  Update instructor profile extras (headline, description, links, expertise)
// @route PATCH /api/users/me/instructor
const updateInstructorProfile = asyncHandler(async (req: Request, res: Response) => {
  const { headline, description, expertise, websiteUrl, linkedinUrl, twitterUrl } = req.body;

  // ensure instructor row exists for this user
  const instructor = await prisma.instructor.findUnique({ where: { userId: req.user.id } });
  if (!instructor) { res.status(403); throw new Error('No instructor profile — contact admin.'); }

  const updated = await prisma.instructor.update({
    where: { userId: req.user.id },
    data: {
      ...(headline    !== undefined && { headline }),
      ...(description !== undefined && { description }),
      ...(expertise   !== undefined && { expertise }),
      ...(websiteUrl  !== undefined && { websiteUrl }),
      ...(linkedinUrl !== undefined && { linkedinUrl }),
      ...(twitterUrl  !== undefined && { twitterUrl }),
    },
  });
  res.json(updated);
});

// @desc  Change password
// @route POST /api/users/me/change-password
const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400); throw new Error('Current and new password are required');
  }
  if (newPassword.length < 6) {
    res.status(400); throw new Error('New password must be at least 6 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !user.passwordHash) {
    res.status(400); throw new Error('Cannot change password for social login accounts');
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) { res.status(400); throw new Error('Current password is incorrect'); }

  const salt  = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hashed } });
  res.json({ message: 'Password changed successfully' });
});

// @desc  Set initial role (for social login users)
// @route POST /api/users/init-role
const setInitialRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;

  if (!['STUDENT', 'INSTRUCTOR'].includes(role)) {
    res.status(400); throw new Error('Invalid role selected');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: req.user.id },
      data: { role },
      select: { id: true, fullName: true, email: true, role: true },
    });

    if (role === 'INSTRUCTOR') {
      await tx.instructor.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id }
      });
    }

    return user;
  });

  res.json(updated);
});

export { getUsers, getMyProfile, updateMyProfile, updateInstructorProfile, changePassword, setInitialRole };
