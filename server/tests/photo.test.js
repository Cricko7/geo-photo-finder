const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('Photo API Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    const testDB = process.env.MONGODB_URI || 'mongodb://localhost:27017/geophoto_test';
    await mongoose.connect(testDB);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Очистка коллекций
    await User.deleteMany({});
    
    // Создаем тестового пользователя
    testUser = await User.create({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123'
    });
    
    // Создаем JWT токен
    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret-key',
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
        .expect(500);
      
      expect(response.body.error).toBeDefined();
    });
  });
});