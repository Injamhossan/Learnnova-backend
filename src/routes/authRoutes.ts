import express from 'express';
import { authUser, registerUser, socialLogin, forgotPassword, resetPassword, verifyEmail, requestEmailVerification } from '../controllers/authController';
import { validate } from '../middlewares/validateMiddleware';
import { loginSchema, registerSchema } from '../utils/validation';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/login', validate(loginSchema), authUser);
router.post('/register', validate(registerSchema), registerUser);
router.post('/social-login', socialLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/request-verification', protect, requestEmailVerification);

export default router;
