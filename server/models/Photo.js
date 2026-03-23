const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: String,
  path: String,
  mimeType: String,
  size: Number,
  
  // GPS данные
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: false
    }
  },
  gpsData: {
    latitude: Number,
    longitude: Number,
    altitude: Number,
    accuracy: Number,
    timestamp: Date
  },
  
  // Метаданные
  metadata: {
    make: String,
    model: String,
    dateTime: Date,
    focalLength: Number,
    iso: Number,
    exposureTime: String,
    aperture: Number
  },
  
  // AI анализ
  aiAnalysis: {
    description: String,
    objects: [String],
    scene: String,
    colors: [String],
    details: [String],
    locationClues: [String],
    confidence: Number,
    analyzedAt: Date,
    model: String
  },
  
  // Статистика
  views: {
    type: Number,
    default: 0
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Геопространственный индекс
photoSchema.index({ location: '2dsphere' });
photoSchema.index({ createdAt: -1 });
photoSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Photo', photoSchema);