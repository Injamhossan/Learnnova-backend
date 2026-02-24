import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db';
import { notFound, errorHandler } from './src/middlewares/errorMiddleware';

// Routes
import authRoutes from './src/routes/authRoutes';
import userRoutes from './src/routes/userRoutes';
import courseRoutes from './src/routes/courseRoutes';
import studentRoutes from './src/routes/studentRoutes';
import adminRoutes from './src/routes/adminRoutes';
import notificationRoutes from './src/routes/notificationRoutes';

import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { createServer } from 'http';
import { initSocket } from './src/utils/socket';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initSocket(httpServer);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 5000 : 100, // much higher limit in dev
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet()); // Security headers
app.use(limiter); // Applied to all requests
app.use(morgan('dev')); // Logging
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Learnova API' });
});

// Error handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start Server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
