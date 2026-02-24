"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const studentController_1 = require("../controllers/studentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// All student routes require auth + student role
router.use(authMiddleware_1.protect, authMiddleware_1.isStudent);
router.get('/stats', studentController_1.getDashboardStats);
// Enrollments
router.post('/enroll/:courseId', studentController_1.enrollInCourse);
router.delete('/enroll/:courseId', studentController_1.dropCourse);
router.get('/my-courses', studentController_1.getMyEnrolledCourses); // backward-compat
router.get('/enrollments', studentController_1.getMyEnrollments);
// Certificates
router.get('/certificates', studentController_1.getMyCertificates);
// Wishlist
router.get('/wishlist', studentController_1.getWishlist);
router.post('/wishlist/:courseId', studentController_1.addToWishlist);
router.delete('/wishlist/:courseId', studentController_1.removeFromWishlist);
// Progress Tracking
router.patch('/progress/:lessonId', studentController_1.updateLessonProgress);
exports.default = router;
