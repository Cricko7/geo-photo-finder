const mongoose = require('mongoose');

module.exports = (err, req, res, next) => {
  console.error(err.stack);
  
  // Ошибки валидации Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation Error', details: errors });
  }
  
  // Ошибка CastError (неверный ID)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ 
      error: 'Invalid ID format',
      message: `Invalid ${err.path}: ${err.value}`
    });
  }
  
  // Дублирование ключа (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ error: `Duplicate value for ${field}` });
  }
  
  // Ошибки JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({ error: message });
};