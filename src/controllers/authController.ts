import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import generateToken from '../utils/generateToken';

// @desc    Auth user & get token
const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log(`Login attempt: ${email}`);

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && (await bcrypt.compare(password, user.passwordHash))) {
    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      token: generateToken(user.id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, role } = req.body;

  const userExists = await prisma.user.findUnique({ where: { email } });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: role?.toUpperCase() || 'STUDENT',
      },
    });

    if (newUser.role === 'INSTRUCTOR') {
      await tx.instructor.create({
        data: { userId: newUser.id }
      });
    }

    return newUser;
  });

  if (user) {
    res.status(201).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Handle social login
const socialLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, fullName, avatarUrl } = req.body;

  let user = await prisma.user.findUnique({ where: { email } });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    // Create new user for social login
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(Math.random().toString(36), salt);

    user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        avatarUrl,
        role: 'STUDENT', // Default, but can be changed later
      },
    });
  } else if (!user.avatarUrl && avatarUrl) {
    // Sync avatar if missing
    user = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl }
    });
  }

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    token: generateToken(user.id),
    needsRole: isNewUser, // Flag to tell frontend to show role selection
  });
});

export { authUser, registerUser, socialLogin };
