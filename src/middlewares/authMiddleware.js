const { prisma } = require('../config/db');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
      });
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const isInstructor = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'INSTRUCTOR') {
    const instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!instructor) {
      res.status(403);
      throw new Error('Instructor profile not found');
    }
    
    req.instructor = instructor;
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Instructor role required.');
  }
});

const isStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'INSTRUCTOR' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Staff role required.');
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as admin');
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as super admin');
  }
};

const isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'STUDENT') {
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Student role required.');
  }
};

module.exports = { protect, isStudent, isInstructor, isStaff, isAdmin, isSuperAdmin };
