const { prisma } = require('../config/db');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc    Auth user & get token
const authUser = asyncHandler(async (req, res) => {
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
const registerUser = asyncHandler(async (req, res) => {
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
const socialLogin = asyncHandler(async (req, res) => {
  const { email, fullName, avatarUrl } = req.body;

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Create new user for social login
    // Since it's social login, we don't have a password, so we create a random/dummy one
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(Math.random().toString(36), salt);

    user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        avatarUrl,
        role: 'STUDENT', // Default role for social login
      },
    });
  }

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    token: generateToken(user.id),
  });
});

module.exports = { authUser, registerUser, socialLogin };
