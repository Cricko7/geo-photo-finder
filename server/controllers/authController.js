const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Генерация JWT токена
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'default-secret-key', { expiresIn: '30d' });
};

// Регистрация
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email, password } = req.body;
    
    // Проверка существующего пользователя
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Создание пользователя
    const user = new User({ username, email, password });
    await user.save();
    
    // Генерация токена
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Логин
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    
    // Поиск пользователя
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Генерация токена
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        stats: user.stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Получение текущего пользователя
exports.getMe = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Обновление профиля
exports.updateProfile = async (req, res, next) => {
  try {
    const updates = ['username', 'email'];
    const updateData = {};
    
    updates.forEach(field => {
      if (req.body[field]) {
        updateData[field] = req.body[field];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};