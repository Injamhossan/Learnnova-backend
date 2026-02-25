"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const validateMiddleware_1 = require("../middlewares/validateMiddleware");
const validation_1 = require("../utils/validation");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/login', (0, validateMiddleware_1.validate)(validation_1.loginSchema), authController_1.authUser);
router.post('/register', (0, validateMiddleware_1.validate)(validation_1.registerSchema), authController_1.registerUser);
router.post('/social-login', authController_1.socialLogin);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password/:token', authController_1.resetPassword);
router.post('/verify-email', authController_1.verifyEmail);
router.post('/request-verification', authMiddleware_1.protect, authController_1.requestEmailVerification);
exports.default = router;
