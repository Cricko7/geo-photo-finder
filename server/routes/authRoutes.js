const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');

// Регистрация
router.post('/register',
  body('username').isLength({ min: 3 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  authController.register
);

// Логин
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  authController.login
);

// Получение текущего пользователя
router.get('/me', authController.getMe);

// Обновление профиля
router.put('/profile', authController.updateProfile);

module.exports = router;