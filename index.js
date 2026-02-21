const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middlewares/errorMiddleware');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/courses', require('./src/routes/courseRoutes'));
app.use('/api/students', require('./src/routes/studentRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Learnova API' });
});

// Error handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
