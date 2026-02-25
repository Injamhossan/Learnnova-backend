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
import paymentRoutes from './src/routes/paymentRoutes';

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
  } else if (!origin) {
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

const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initSocket(httpServer);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === 'development' ? 5000 : 100, 
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
// app.use(helmet()); 
// app.use(limiter); 
app.use(morgan('dev')); 
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Learnova API' });
});

// Error handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

export default app;
