const { prisma } = require('../config/db');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc    Auth user & get token
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

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

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      role: role || 'STUDENT',
    },
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

module.exports = { authUser, registerUser };
