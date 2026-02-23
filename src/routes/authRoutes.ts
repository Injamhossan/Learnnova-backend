import express from 'express';
import { authUser, registerUser, socialLogin } from '../controllers/authController';

import { validate } from '../middlewares/validateMiddleware';
import { loginSchema, registerSchema } from '../utils/validation';

const router = express.Router();

router.post('/login', validate(loginSchema), authUser);
router.post('/register', validate(registerSchema), registerUser);
router.post('/social-login', socialLogin);

export default router;
