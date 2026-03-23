const Photo = require('../models/Photo');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
}).single('photo');

// Загрузка фото
exports.uploadPhoto = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      // Создание записи в БД
      const photo = new Photo({
        userId: req.user.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        location: null,
        gpsData: null,
        metadata: {}
      });
      
      await photo.save();
      
      // Обновление статистики пользователя
      if (req.user && req.user.updateOne) {
        await req.user.updateOne({ $inc: { 'stats.totalPhotos': 1 } });
      }
      
      res.status(201).json({
        success: true,
        data: photo,
        message: 'Photo uploaded successfully'
      });
    } catch (error) {
      // Удаляем файл в случае ошибки
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  });
};

// Поиск фото по геолокации
exports.findPhotosByLocation = async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    const photos = await Photo.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      userId: req.user.id
    }).limit(50);
    
    res.json({
      success: true,
      count: photos.length,
      data: photos
    });
  } catch (error) {
    next(error);
  }
};

// Получение всех фото пользователя
exports.getUserPhotos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const photos = await Photo.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Photo.countDocuments({ userId: req.user.id });
    
    res.json({
      success: true,
      data: photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Получение фото по ID
exports.getPhotoById = async (req, res, next) => {
  try {
    const photo = await Photo.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Увеличиваем счетчик просмотров
    photo.views += 1;
    await photo.save();
    
    res.json({ success: true, data: photo });
  } catch (error) {
    next(error);
  }
};

// Удаление фото
exports.deletePhoto = async (req, res, next) => {
  try {
    const photo = await Photo.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Удаляем файл
    if (fs.existsSync(photo.path)) {
      fs.unlinkSync(photo.path);
    }
    
    // Обновляем статистику пользователя
    if (req.user && req.user.updateOne) {
      await req.user.updateOne({ $inc: { 'stats.totalPhotos': -1 } });
    }
    
    res.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
};

// Статистика по геолокациям
exports.getLocationStats = async (req, res, next) => {
  try {
    const stats = await Photo.aggregate([
      { $match: { userId: req.user._id, location: { $exists: true, $ne: null } } },
      { $group: {
        _id: {
          lat: { $arrayElemAt: ['$location.coordinates', 1] },
          lng: { $arrayElemAt: ['$location.coordinates', 0] }
        },
        count: { $sum: 1 },
        photos: { $push: '$_id' }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};