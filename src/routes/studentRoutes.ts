import express from 'express';
import { enrollInCourse, getMyEnrolledCourses } from '../controllers/studentController';
import { protect, isStudent } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect, isStudent);

router.post('/enroll/:courseId', enrollInCourse);
router.get('/my-courses', getMyEnrolledCourses);

export default router;
