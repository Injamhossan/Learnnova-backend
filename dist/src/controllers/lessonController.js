"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYoutubeDuration = exports.deleteLesson = exports.updateLesson = exports.addLesson = exports.deleteSection = exports.updateSection = exports.addSection = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const db_1 = require("../config/db");
// Helper to check course ownership
const checkCourseOwnership = async (courseId, req) => {
    const course = await db_1.prisma.course.findUnique({ where: { id: courseId } });
    if (!course)
        return { error: 'Course not found', status: 404 };
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && course.instructorId !== req.instructor.id) {
        return { error: 'Not authorized for this course', status: 403 };
    }
    return { course };
};
// ==================== SECTIONS ====================
// @desc    Add a section to a course
const addSection = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, orderIndex } = req.body;
    const courseId = req.params.courseId;
    const ownership = await checkCourseOwnership(courseId, req);
    if (ownership.error) {
        res.status(ownership.status);
        throw new Error(ownership.error);
    }
    const section = await db_1.prisma.courseSection.create({
        data: {
            title,
            orderIndex: orderIndex || 0,
            courseId
        }
    });
    res.status(201).json(section);
});
exports.addSection = addSection;
// @desc    Update a section
const updateSection = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, orderIndex } = req.body;
    const sectionId = req.params.id;
    const section = await db_1.prisma.courseSection.findUnique({
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
    const updatedSection = await db_1.prisma.courseSection.update({
        where: { id: sectionId },
        data: { title, orderIndex }
    });
    res.json(updatedSection);
});
exports.updateSection = updateSection;
// @desc    Delete a section
const deleteSection = (0, express_async_handler_1.default)(async (req, res) => {
    const sectionId = req.params.id;
    const section = await db_1.prisma.courseSection.findUnique({
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
    await db_1.prisma.courseSection.delete({ where: { id: sectionId } });
    res.json({ message: 'Section removed' });
});
exports.deleteSection = deleteSection;
// ==================== LESSONS ====================
// @desc    Add a lesson to a section
const addLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, description, videoUrl, videoDurationSeconds, isPreview, orderIndex, resources } = req.body;
    const sectionId = req.params.sectionId;
    const section = await db_1.prisma.courseSection.findUnique({
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
    const lesson = await db_1.prisma.courseLesson.create({
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
exports.addLesson = addLesson;
// @desc    Update a lesson
const updateLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const lessonId = req.params.id;
    const { title, description, videoUrl, videoDurationSeconds, isPreview, orderIndex, resources } = req.body;
    const lesson = await db_1.prisma.courseLesson.findUnique({
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
    const updatedLesson = await db_1.prisma.courseLesson.update({
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
exports.updateLesson = updateLesson;
// @desc    Delete a lesson
const deleteLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const lessonId = req.params.id;
    const lesson = await db_1.prisma.courseLesson.findUnique({
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
    await db_1.prisma.courseLesson.delete({ where: { id: lessonId } });
    res.json({ message: 'Lesson removed' });
});
exports.deleteLesson = deleteLesson;
// @desc    Get YouTube video duration
const getYoutubeDuration = (0, express_async_handler_1.default)(async (req, res) => {
    const url = req.query.url;
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
        }
        else {
            res.status(404).json({ error: 'Duration not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch duration' });
    }
});
exports.getYoutubeDuration = getYoutubeDuration;
