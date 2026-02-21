import express from 'express';
import { authUser, registerUser, socialLogin } from '../controllers/authController';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.post('/social-login', socialLogin);

export default router;
