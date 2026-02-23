import express from 'express';
import { getUsers, getMyProfile, updateMyProfile, updateInstructorProfile, changePassword, setInitialRole } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Admin
router.get('/', getUsers);

// Self-service — all roles
router.get('/me',                    protect, getMyProfile);
router.patch('/me',                  protect, updateMyProfile);
router.post('/init-role',            protect, setInitialRole);
router.post('/me/change-password',   protect, changePassword);
router.patch('/me/instructor',       protect, updateInstructorProfile);

export default router;
