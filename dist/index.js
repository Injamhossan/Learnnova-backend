"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./src/config/db");
const errorMiddleware_1 = require("./src/middlewares/errorMiddleware");
// Routes
const authRoutes_1 = __importDefault(require("./src/routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./src/routes/userRoutes"));
const courseRoutes_1 = __importDefault(require("./src/routes/courseRoutes"));
const studentRoutes_1 = __importDefault(require("./src/routes/studentRoutes"));
const adminRoutes_1 = __importDefault(require("./src/routes/adminRoutes"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Load environment variables
dotenv_1.default.config();
// Connect to Database
(0, db_1.connectDB)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 5000 : 100, // much higher limit in dev
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use(limiter); // Applied to all requests
app.use((0, morgan_1.default)('dev')); // Logging
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/courses', courseRoutes_1.default);
app.use('/api/students', studentRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Learnova API' });
});
// Error handling Middleware
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
