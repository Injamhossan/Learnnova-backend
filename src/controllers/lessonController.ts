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

// @desc    Get YouTube video duration
const getYoutubeDuration = asyncHandler(async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400);
    throw new Error('URL is required');
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;

  if (!videoId) {
    res.status(400);
    throw new Error('Invalid YouTube URL');
  }

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    const html = await response.text();
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);

    if (durationMatch) {
      res.json({ durationSeconds: parseInt(durationMatch[1], 10) });
    } else {
      res.status(404).json({ error: 'Duration not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch duration' });
  }
});

export {
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson,
  getYoutubeDuration
};
