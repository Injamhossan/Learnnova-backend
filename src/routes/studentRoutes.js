const express = require('express');
const router = express.Router();
const { enrollInCourse, getMyEnrolledCourses } = require('../controllers/studentController');
const { protect, isStudent } = require('../middlewares/authMiddleware');

router.use(protect, isStudent);

router.post('/enroll/:courseId', enrollInCourse);
router.get('/my-courses', getMyEnrolledCourses);

module.exports = router;
