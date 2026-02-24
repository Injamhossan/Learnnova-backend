"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// All routes are protected + admin only
router.use(authMiddleware_1.protect, authMiddleware_1.isAdmin);
router.get('/stats', adminController_1.getDashboardStats);
router.get('/users', adminController_1.getAllUsers);
router.patch('/users/:id/toggle', adminController_1.toggleUserStatus);
router.post('/users/create-admin', authMiddleware_1.isSuperAdmin, adminController_1.createAdminUser);
router.patch('/users/:id/role', authMiddleware_1.isSuperAdmin, adminController_1.updateUserRole);
router.delete('/users/:id', authMiddleware_1.isSuperAdmin, adminController_1.deleteUser);
router.get('/courses', adminController_1.getAllCourses);
router.patch('/courses/:id/toggle', adminController_1.toggleCoursePublished);
router.get('/categories', adminController_1.getCategories);
router.post('/categories', adminController_1.createCategory);
router.get('/analytics', adminController_1.getAnalytics);
exports.default = router;
