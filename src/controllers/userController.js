const { prisma } = require('../config/db');
const asyncHandler = require('express-async-handler');

// @desc    Get all users
const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.json(users);
});

module.exports = {
  getUsers,
};
