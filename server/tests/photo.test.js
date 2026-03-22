const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const Photo = require('../models/Photo');

describe('Photo API', () => {
  let token;
  let userId;

  beforeEach(async () => {
    await User.deleteMany({});
    await Photo.deleteMany({});
    
    const user = await User.create({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123'
    });
    userId = user._id;
    
    // Получение токена (упрощенно)
    token = 'test-token';
  });

  describe('POST /api/photos/upload', () => {
    it('should upload photo with GPS data', async () => {
      const response = await request(app)
        .post('/api/photos/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('photo', 'tests/fixtures/test-image.jpg');
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.gpsData).toBeDefined();
    });
  });
});