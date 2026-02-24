import crypto from 'crypto';
import path from 'path';
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import generateToken from '../utils/generateToken';
import sendEmail from '../utils/sendEmail';
import { getEmailTemplate } from '../utils/emailTemplates';

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
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = await tx.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: role?.toUpperCase() || 'STUDENT',
        verificationCode,
        verificationCodeExpires,
      },
    });

    if (newUser.role === 'INSTRUCTOR') {
      await tx.instructor.create({
        data: { userId: newUser.id }
      });
    }

    // Send Verification Email
    const emailHtml = getEmailTemplate(
      'Verify Your Email',
      `Welcome to Learnova, ${fullName}! Please use the following code to verify your email address and activate your account.`,
      verificationCode
    );

    await sendEmail({
      email: newUser.email,
      subject: 'Learnova - Email Verification',
      message: emailHtml,
      attachments: [{
        filename: 'NavLogo.png',
        path: path.join(__dirname, '..', 'assets', 'NavLogo.png'),
        cid: 'logo'
      }]
    });

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

// @desc    Forgot Password
const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Generate Reset Token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expires (10 minutes)
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expires,
    },
  });

  // Create reset url
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const emailHtml = getEmailTemplate(
    'Password Reset Request',
    `Hi ${user.fullName}, you are receiving this email because you (or someone else) has requested the reset of a password. Please click the button below to reset your password.`,
    undefined,
    'Reset Password',
    resetUrl
  );

  try {
    await sendEmail({
      email: user.email,
      subject: 'Learnova - Password Reset Request',
      message: emailHtml,
      attachments: [{
        filename: 'NavLogo.png',
        path: path.join(__dirname, '..', 'assets', 'NavLogo.png'),
        cid: 'logo'
      }]
    });

    res.status(200).json({ message: 'Email sent' });
  } catch (error) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// @desc    Reset Password
const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;
  const { token } = req.params;

  // Hash token to compare with DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(token as string)
    .digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired token');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  res.status(200).json({
    message: 'Password reset successful',
    token: generateToken(user.id),
  });
});

// @desc    Verify Email
const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      email,
      verificationCode: code,
      verificationCodeExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    },
  });

  res.status(200).json({
    message: 'Email verified successfully',
    isEmailVerified: true,
  });
});

export { authUser, registerUser, socialLogin, forgotPassword, resetPassword, verifyEmail };
