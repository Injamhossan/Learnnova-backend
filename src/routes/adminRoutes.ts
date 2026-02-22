import express from 'express';
import { protect, isAdmin, isSuperAdmin } from '../middlewares/authMiddleware';
import {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  getAllCourses,
  toggleCoursePublished,
  getCategories,
  createCategory,
  updateUserRole,
  deleteUser,
  createAdminUser,
} from '../controllers/adminController';

const router = express.Router();

// All routes are protected + admin only
router.use(protect, isAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle', toggleUserStatus);
router.post('/users/create-admin', isSuperAdmin, createAdminUser);
router.patch('/users/:id/role', isSuperAdmin, updateUserRole);
router.delete('/users/:id', isSuperAdmin, deleteUser);
router.get('/courses', getAllCourses);
router.patch('/courses/:id/toggle', toggleCoursePublished);
router.get('/categories', getCategories);
router.post('/categories', createCategory);

export default router;
