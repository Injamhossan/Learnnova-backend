"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./src/config/db");
const errorMiddleware_1 = require("./src/middlewares/errorMiddleware");
// Routes
const authRoutes_1 = __importDefault(require("./src/routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./src/routes/userRoutes"));
const courseRoutes_1 = __importDefault(require("./src/routes/courseRoutes"));
const studentRoutes_1 = __importDefault(require("./src/routes/studentRoutes"));
const adminRoutes_1 = __importDefault(require("./src/routes/adminRoutes"));
const notificationRoutes_1 = __importDefault(require("./src/routes/notificationRoutes"));
const paymentRoutes_1 = __importDefault(require("./src/routes/paymentRoutes"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_1 = require("./src/utils/socket");
// Load environment variables
dotenv_1.default.config();
// Connect to Database
(0, db_1.connectDB)();
const app = (0, express_1.default)();
// 1. Custom CORS Middleware (More robust for Vercel/Serverless)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://learnnova-ih.vercel.app',
        process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else if (!origin) {
        // Allow server-to-server or tools like Postman/curl
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
// Initialize Socket.io
(0, socket_1.initSocket)(httpServer);
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 5000 : 100,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Middleware
// app.use(helmet()); 
// app.use(limiter); 
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/courses', courseRoutes_1.default);
app.use('/api/students', studentRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Learnova API' });
});
// Error handling Middleware
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// Start Server
if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
}
exports.default = app;
