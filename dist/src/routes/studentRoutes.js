"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const studentController_1 = require("../controllers/studentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect, authMiddleware_1.isStudent);
router.post('/enroll/:courseId', studentController_1.enrollInCourse);
router.get('/my-courses', studentController_1.getMyEnrolledCourses);
exports.default = router;
