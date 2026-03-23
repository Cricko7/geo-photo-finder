const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const photoRoutes = require('../routes/photoRoutes');
const authRoutes = require('../routes/authRoutes');
const errorHandler = require('../middleware/errorHandler');

// Создаем тестовое приложение
const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/api/photos', photoRoutes);
  app.use('/api/auth', authRoutes);
  
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });
  
  app.use(errorHandler);
  
  return app;
};

describe('Photo API Tests', () => {
  let app;
  let testUser;
  let authToken;
  let connection;

  beforeAll(async () => {
    // Подключаемся к тестовой БД
    const testDB = 'mongodb://localhost:27017/geophoto_test';
    connection = await mongoose.connect(testDB);
    console.log('Test DB connected');
  });

  afterAll(async () => {
    // Очищаем и закрываем соединение
    if (connection) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      console.log('Test DB disconnected');
    }
  });

  beforeEach(async () => {
    // Создаем новое приложение для каждого теста
    app = createTestApp();
    
    // Очищаем коллекции
    await User.deleteMany({});
    
    // Создаем тестового пользователя
    testUser = await User.create({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123'
    });
    
    // Создаем JWT токен
    authToken = jwt.sign(
      { id: testUser._id.toString() },
      'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/photos')
        .expect(401);
      
      expect(response.body.error).toBe('Please authenticate');
    });

    it('should accept valid authentication token', async () => {
      const response = await request(app)
        .get('/api/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Photo endpoints with authentication', () => {
    it('should get empty photos list for new user', async () => {
      const response = await request(app)
        .get('/api/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle invalid photo ID', async () => {
      const response = await request(app)
        .get('/api/photos/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });
});