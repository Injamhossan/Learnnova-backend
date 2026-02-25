import express from 'express';
import { 
  getCourses,
  getCourseDetail,
  getMyCourses,
  createCourse, 
  updateCourse,
  deleteCourse,
  getInstructorStats,
  getCategories
} from '../controllers/courseController';
import {
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson
} from '../controllers/lessonController';
import { protect, isInstructor, isStaff } from '../middlewares/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getCourses);
router.get('/categories', getCategories);
// Authenticated routes (Specific)
router.get('/my-courses', protect, isInstructor, getMyCourses);
router.get('/instructor/stats', protect, isInstructor, getInstructorStats);

// Public routes (Generic parameter)
router.get('/:idOrSlug', getCourseDetail);

// Authenticated routes
router.use(protect);

router.post('/', isInstructor, createCourse);

// Staff (Instructor, Admin, SuperAdmin) can manage (Update/Delete)
// Note: updateCourse/deleteCourse should still check ownership internal to the controller 
// (Instructors only own courses, Admins own everything)
router.route('/:id').put(isStaff, updateCourse).delete(isStaff, deleteCourse);

// Section management (Staff)
router.post('/:courseId/sections', isStaff, addSection);
router.route('/sections/:id').put(isStaff, updateSection).delete(isStaff, deleteSection);

// Lesson management (Staff)
router.post('/sections/:sectionId/lessons', isStaff, addLesson);
router.route('/lessons/:id').put(isStaff, updateLesson).delete(isStaff, deleteLesson);

export default router;
