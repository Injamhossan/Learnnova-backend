import express from 'express';
import {
  enrollInCourse,
  getMyEnrolledCourses,
  getMyEnrollments,
  getMyCertificates,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/studentController';
import { protect, isStudent } from '../middlewares/authMiddleware';

const router = express.Router();

// All student routes require auth + student role
router.use(protect, isStudent);

// Enrollments
router.post('/enroll/:courseId',    enrollInCourse);
router.get('/my-courses',           getMyEnrolledCourses); // backward-compat
router.get('/enrollments',          getMyEnrollments);

// Certificates
router.get('/certificates',         getMyCertificates);

// Wishlist
router.get('/wishlist',             getWishlist);
router.post('/wishlist/:courseId',  addToWishlist);
router.delete('/wishlist/:courseId', removeFromWishlist);

export default router;
