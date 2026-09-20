import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import Routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import visitorRoutes from './routes/visitors.js';
import messageRoutes from './routes/messages.js';

// Load Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: "https://abdullah-portfolio-lovat-five.vercel.app",
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.resolve('uploads')));

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/messages', messageRoutes);

// Root Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'Portfolio Admin API is running...' });
});

// Connect to MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connection established successfully.');
    app.listen(PORT, () => {
      console.log(`Server started running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error.message);
  });
