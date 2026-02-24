"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Admin
router.get('/', userController_1.getUsers);
// Self-service — all roles
router.get('/me', authMiddleware_1.protect, userController_1.getMyProfile);
router.patch('/me', authMiddleware_1.protect, userController_1.updateMyProfile);
router.post('/init-role', authMiddleware_1.protect, userController_1.setInitialRole);
router.post('/me/change-password', authMiddleware_1.protect, userController_1.changePassword);
router.patch('/me/instructor', authMiddleware_1.protect, userController_1.updateInstructorProfile);
exports.default = router;
