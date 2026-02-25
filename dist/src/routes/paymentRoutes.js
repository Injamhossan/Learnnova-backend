"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.post('/checkout', paymentController_1.checkout);
router.get('/history', paymentController_1.getPaymentHistory);
router.get('/instructor/earnings', authMiddleware_1.isInstructor, paymentController_1.getInstructorEarnings);
exports.default = router;
