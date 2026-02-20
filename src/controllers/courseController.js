const { prisma } = require('../config/db');
const asyncHandler = require('express-async-handler');

// @desc    Get all courses
const getCourses = asyncHandler(async (req, res) => {
  const courses = await prisma.course.findMany({
    include: {
      instructor: {
        select: { name: true, email: true },
      },
    },
  });
  res.json(courses);
});

// @desc    Create a course
const createCourse = asyncHandler(async (req, res) => {
  const { title, description, thumbnail, price, category, lessons } = req.body;

  const course = await prisma.course.create({
    data: {
      title,
      description,
      thumbnail,
      price: parseFloat(price) || 0,
      category,
      lessons: lessons || [],
      instructorId: req.user.id,
    },
  });

  res.status(201).json(course);
});

module.exports = { getCourses, createCourse };
