import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';

// @desc    Get all users
const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
  res.json(users);
});

export { getUsers };
