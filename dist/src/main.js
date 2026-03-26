"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import existing Express Routers!
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const courseRoutes_1 = __importDefault(require("./routes/courseRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const errorMiddleware_1 = require("./middlewares/errorMiddleware");
const socket_1 = require("./utils/socket");
dotenv_1.default.config();
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // 1. Enable CORS using NestJS's native way
    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:3001',
                'https://learnnova-ih.vercel.app',
                process.env.FRONTEND_URL,
            ].filter(Boolean);
            if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
                callback(null, true);
            }
            else {
                callback(null, false);
            }
        },
        credentials: true,
        methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Accept',
    });
    // 2. Base Middlewares
    app.use((0, morgan_1.default)('dev'));
    app.use(express_1.default.json());
    // 3. Mount existing Express Router endpoints directly via adaptor instance
    const expressInstance = app.getHttpAdapter().getInstance();
    expressInstance.use('/api/auth', authRoutes_1.default);
    expressInstance.use('/api/users', userRoutes_1.default);
    expressInstance.use('/api/courses', courseRoutes_1.default);
    expressInstance.use('/api/students', studentRoutes_1.default);
    expressInstance.use('/api/admin', adminRoutes_1.default);
    expressInstance.use('/api/notifications', notificationRoutes_1.default);
    expressInstance.use('/api/payments', paymentRoutes_1.default);
    // Default welcome response (From index.ts)
    expressInstance.get('/', (req, res) => {
        res.json({ message: 'Welcome to Learnova API on NestJS hybrid!' });
    });
    // 4. Global Error Handlers
    app.use(errorMiddleware_1.notFound);
    app.use(errorMiddleware_1.errorHandler);
    // 5. Start Server Adapter
    const port = process.env.PORT || 5000;
    const httpServer = await app.listen(port);
    // 6. Initialize Socket.io (Socket logic stays intact)
    (0, socket_1.initSocket)(httpServer);
    console.log(`Server launched on port ${port} utilizing NestJS Framework hybrid runtime.`);
}
if (process.env.NODE_ENV !== 'production') {
    bootstrap();
}
exports.default = bootstrap;
