const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middlewares/authMiddleware');
const {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  getAllCourses,
  toggleCoursePublished,
  getCategories,
  createCategory,
} = require('../controllers/adminController');

// All routes are protected + admin only
router.use(protect, isAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle', toggleUserStatus);
router.get('/courses', getAllCourses);
router.patch('/courses/:id/toggle', toggleCoursePublished);
router.get('/categories', getCategories);
router.post('/categories', createCategory);

module.exports = router;
