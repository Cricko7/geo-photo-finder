const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const photoRoutes = require('./routes/photoRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use('/api/photos', photoRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.use(errorHandler);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/geophoto';
const PORT = process.env.PORT || 5000;

let server;

// Функция graceful shutdown
const gracefulShutdown = async () => {
  console.log('Received shutdown signal, closing connections...');
  
  if (server) {
    await new Promise(resolve => server.close(resolve));
    console.log('HTTP server closed');
  }
  
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  
  console.log('Graceful shutdown completed');
  process.exit(0);
};

// Подключение к MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Обработка сигналов для graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;