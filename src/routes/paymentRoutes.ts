import express from 'express';
import { checkout, getPaymentHistory, getInstructorEarnings } from '../controllers/paymentController';
import { protect, isInstructor } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.post('/checkout', checkout);
router.get('/history', getPaymentHistory);
router.get('/instructor/earnings', isInstructor, getInstructorEarnings);

export default router;
