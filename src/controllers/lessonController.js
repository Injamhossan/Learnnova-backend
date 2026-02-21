const { prisma } = require('../config/db');
const asyncHandler = require('express-async-handler');

// Helper to check course ownership
const checkCourseOwnership = async (courseId, req) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: 'Course not found', status: 404 };
  
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && course.instructorId !== req.instructor.id) {
    return { error: 'Not authorized for this course', status: 403 };
  }
  return { course };
};

// ==================== SECTIONS ====================

// @desc    Add a section to a course
const addSection = asyncHandler(async (req, res) => {
  const { title, orderIndex } = req.body;
  const courseId = req.params.courseId;

  const ownership = await checkCourseOwnership(courseId, req);
  if (ownership.error) {
    res.status(ownership.status);
    throw new Error(ownership.error);
  }

  const section = await prisma.courseSection.create({
    data: {
      title,
      orderIndex: orderIndex || 0,
      courseId
    }
  });

  res.status(201).json(section);
});

// @desc    Update a section
const updateSection = asyncHandler(async (req, res) => {
  const { title, orderIndex } = req.body;
  const sectionId = req.params.id;

  const section = await prisma.courseSection.findUnique({ 
    where: { id: sectionId },
    include: { course: true }
  });

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  const ownership = await checkCourseOwnership(section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status);
    throw new Error(ownership.error);
  }

  const updatedSection = await prisma.courseSection.update({
    where: { id: sectionId },
    data: { title, orderIndex }
  });

  res.json(updatedSection);
});

// @desc    Delete a section
const deleteSection = asyncHandler(async (req, res) => {
  const sectionId = req.params.id;

  const section = await prisma.courseSection.findUnique({ 
    where: { id: sectionId }
  });

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  const ownership = await checkCourseOwnership(section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status);
    throw new Error(ownership.error);
  }

  await prisma.courseSection.delete({ where: { id: sectionId } });
  res.json({ message: 'Section removed' });
});

// ==================== LESSONS ====================

// @desc    Add a lesson to a section
const addLesson = asyncHandler(async (req, res) => {
  const { title, description, videoUrl, videoDurationSeconds, isPreview, orderIndex, resources } = req.body;
  const sectionId = req.params.sectionId;

  const section = await prisma.courseSection.findUnique({ 
    where: { id: sectionId },
    include: { course: true }
  });

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  const ownership = await checkCourseOwnership(section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status);
    throw new Error(ownership.error);
  }

  const lesson = await prisma.courseLesson.create({
    data: {
      title,
      description,
      videoUrl,
      videoDurationSeconds,
      isPreview: isPreview || false,
      orderIndex: orderIndex || 0,
      resources: resources || [],
      sectionId
    }
  });

  res.status(201).json(lesson);
});

// @desc    Update a lesson
const updateLesson = asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const { title, description, videoUrl, videoDurationSeconds, isPreview, orderIndex, resources } = req.body;

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { course: true } } }
  });

  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }

  const ownership = await checkCourseOwnership(lesson.section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status);
    throw new Error(ownership.error);
  }

  const updatedLesson = await prisma.courseLesson.update({
    where: { id: lessonId },
    data: {
      title,
      description,
      videoUrl,
      videoDurationSeconds,
      isPreview,
      orderIndex,
      resources
    }
  });

  res.json(updatedLesson);
});

// @desc    Delete a lesson
const deleteLesson = asyncHandler(async (req, res) => {
  const lessonId = req.params.id;

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { section: true }
  });

  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }

  const ownership = await checkCourseOwnership(lesson.section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status);
    throw new Error(ownership.error);
  }

  await prisma.courseLesson.delete({ where: { id: lessonId } });
  res.json({ message: 'Lesson removed' });
});

module.exports = {
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson
};
