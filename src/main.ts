import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import existing Express Routers!
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import courseRoutes from './routes/courseRoutes';
import studentRoutes from './routes/studentRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';

import { notFound, errorHandler } from './middlewares/errorMiddleware';
import { initSocket } from './utils/socket';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Enable CORS using NestJS's native way
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://learnnova-ih.vercel.app',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Accept',
  });

  // 2. Base Middlewares
  app.use(morgan('dev'));
  app.use(express.json());

  // 3. Mount existing Express Router endpoints directly via adaptor instance
  const expressInstance = app.getHttpAdapter().getInstance();
  
  expressInstance.use('/api/auth', authRoutes);
  expressInstance.use('/api/users', userRoutes);
  expressInstance.use('/api/courses', courseRoutes);
  expressInstance.use('/api/students', studentRoutes);
  expressInstance.use('/api/admin', adminRoutes);
  expressInstance.use('/api/notifications', notificationRoutes);
  expressInstance.use('/api/payments', paymentRoutes);

  // Default welcome response (From index.ts)
  expressInstance.get('/', (req: any, res: any) => {
    res.json({ message: 'Welcome to Learnova API on NestJS hybrid!' });
  });

  // 4. Global Error Handlers
  app.use(notFound);
  app.use(errorHandler);

  // 5. Start Server Adapter
  const port = process.env.PORT || 5000;
  const httpServer = await app.listen(port);
  
  // 6. Initialize Socket.io (Socket logic stays intact)
  initSocket(httpServer);

  console.log(`Server launched on port ${port} utilizing NestJS Framework hybrid runtime.`);
}

if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}

export default bootstrap;
