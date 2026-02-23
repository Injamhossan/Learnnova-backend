import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      instructor?: any;
    }
  }
}

const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

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

const isInstructor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'INSTRUCTOR') {
    let instructor = await prisma.instructor.findUnique({
      where: { userId: req.user.id }
    });
    
    // Auto-create profile if missing but user has the role
    if (!instructor) {
      instructor = await prisma.instructor.create({
        data: { userId: req.user.id }
      });
    }
    
    req.instructor = instructor;
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Instructor role required.');
  }
});

const isStaff = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'INSTRUCTOR' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    // If instructor, make sure req.instructor is populated
    if (req.user.role === 'INSTRUCTOR' && !req.instructor) {
      let instructor = await prisma.instructor.findUnique({
        where: { userId: req.user.id }
      });
      if (!instructor) {
        instructor = await prisma.instructor.create({
          data: { userId: req.user.id }
        });
      }
      req.instructor = instructor;
    }
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Staff role required.');
  }
});

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as admin');
  }
};

const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as super admin');
  }
};

const isStudent = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'STUDENT') {
    next();
  } else {
    res.status(403);
    throw new Error('Access denied. Student role required.');
  }
};

export { protect, isStudent, isInstructor, isStaff, isAdmin, isSuperAdmin };
