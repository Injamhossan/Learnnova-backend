import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../config/db';

// Helper to check course ownership
const checkCourseOwnership = async (courseId: string, req: Request) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: 'Course not found', status: 404 };
  
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && course.instructorId !== req.instructor.id) {
    return { error: 'Not authorized for this course', status: 403 };
  }
  return { course };
};

// ==================== SECTIONS ====================

// @desc    Add a section to a course
const addSection = asyncHandler(async (req: Request, res: Response) => {
  const { title, orderIndex } = req.body;
  const courseId = req.params.courseId as string;

  const ownership = await checkCourseOwnership(courseId, req);
  if (ownership.error) {
    res.status(ownership.status as number);
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
const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const { title, orderIndex } = req.body;
  const sectionId = req.params.id as string;

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
    res.status(ownership.status as number);
    throw new Error(ownership.error);
  }

  const updatedSection = await prisma.courseSection.update({
    where: { id: sectionId },
    data: { title, orderIndex }
  });

  res.json(updatedSection);
});

// @desc    Delete a section
const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  const sectionId = req.params.id as string;

  const section = await prisma.courseSection.findUnique({ 
    where: { id: sectionId }
  });

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  const ownership = await checkCourseOwnership(section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status as number);
    throw new Error(ownership.error);
  }

  await prisma.courseSection.delete({ where: { id: sectionId } });
  res.json({ message: 'Section removed' });
});

// ==================== LESSONS ====================

// @desc    Add a lesson to a section
const addLesson = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, videoUrl, videoDurationSeconds, isPreview, orderIndex, resources } = req.body;
  const sectionId = req.params.sectionId as string;

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
    res.status(ownership.status as number);
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
const updateLesson = asyncHandler(async (req: Request, res: Response) => {
  const lessonId = req.params.id as string;
  const { title, description, videoUrl, videoDurationSeconds, isPreview, orderIndex, resources } = req.body;

  const lesson: any = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { course: true } } }
  });

  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }

  const ownership = await checkCourseOwnership(lesson.section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status as number);
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
const deleteLesson = asyncHandler(async (req: Request, res: Response) => {
  const lessonId = req.params.id as string;

  const lesson: any = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { section: true }
  });

  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }

  const ownership = await checkCourseOwnership(lesson.section.courseId, req);
  if (ownership.error) {
    res.status(ownership.status as number);
    throw new Error(ownership.error);
  }

  await prisma.courseLesson.delete({ where: { id: lessonId } });
  res.json({ message: 'Lesson removed' });
});

export {
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson
};
