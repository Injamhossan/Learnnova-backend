"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const courseController_1 = require("../controllers/courseController");
const lessonController_1 = require("../controllers/lessonController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/', courseController_1.getCourses);
// Authenticated routes
router.use(authMiddleware_1.protect);
// Only instructors can create and see their dashboard
router.get('/my-courses', authMiddleware_1.isInstructor, courseController_1.getMyCourses);
router.get('/instructor/stats', authMiddleware_1.isInstructor, courseController_1.getInstructorStats);
router.post('/', authMiddleware_1.isInstructor, courseController_1.createCourse);
// Staff (Instructor, Admin, SuperAdmin) can manage (Update/Delete)
// Note: updateCourse/deleteCourse should still check ownership internal to the controller 
// (Instructors only own courses, Admins own everything)
router.route('/:id').put(authMiddleware_1.isStaff, courseController_1.updateCourse).delete(authMiddleware_1.isStaff, courseController_1.deleteCourse);
// Section management (Staff)
router.post('/:courseId/sections', authMiddleware_1.isStaff, lessonController_1.addSection);
router.route('/sections/:id').put(authMiddleware_1.isStaff, lessonController_1.updateSection).delete(authMiddleware_1.isStaff, lessonController_1.deleteSection);
// Lesson management (Staff)
router.post('/sections/:sectionId/lessons', authMiddleware_1.isStaff, lessonController_1.addLesson);
router.route('/lessons/:id').put(authMiddleware_1.isStaff, lessonController_1.updateLesson).delete(authMiddleware_1.isStaff, lessonController_1.deleteLesson);
exports.default = router;
