const Photo = require('../models/Photo');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const exifr = require('exifr');
const sharp = require('sharp');
const ollamaService = require('../services/ollamaService');

// ... (остальной код без изменений)

// Загрузка фото (обновленная версия с AI)
exports.uploadPhoto = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      // Извлечение EXIF данных
      let exifData = null;
      try {
        exifData = await exifr.parse(req.file.path);
      } catch (exifError) {
        console.warn('Could not parse EXIF data:', exifError.message);
      }
      
      let location = null;
      let gpsData = null;
      
      if (exifData && exifData.latitude && exifData.longitude) {
        gpsData = {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          altitude: exifData.altitude || null,
          accuracy: exifData.gps_accuracy || null,
          timestamp: exifData.DateTimeOriginal || new Date()
        };
        
        location = {
          type: 'Point',
          coordinates: [exifData.longitude, exifData.latitude]
        };
      }
      
      // Оптимизация изображения
      let optimizedPath = req.file.path;
      try {
        optimizedPath = req.file.path.replace(/\.\w+$/, '_optimized.jpg');
        await sharp(req.file.path)
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(optimizedPath);
        
        if (optimizedPath !== req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (sharpError) {
        console.error('Image optimization failed:', sharpError.message);
      }
      
      // AI анализ через Ollama
      let aiAnalysis = null;
      if (process.env.ENABLE_AI_ANALYSIS === 'true') {
        try {
          // Читаем изображение для AI анализа
          const imageBuffer = await sharp(optimizedPath)
            .resize(800, 800, { fit: 'inside' })
            .toBuffer();
          
          const analysis = await ollamaService.analyzeImage(imageBuffer, req.file.originalname);
          
          if (analysis) {
            aiAnalysis = {
              description: analysis.description,
              objects: analysis.objects || [],
              scene: analysis.scene || 'unknown',
              colors: analysis.colors || [],
              details: analysis.details || [],
              locationClues: analysis.locationClues || [],
              confidence: analysis.confidence || 0.85,
              analyzedAt: analysis.analyzedAt || new Date(),
              model: analysis.model || 'llava'
            };
          }
        } catch (aiError) {
          console.error('AI analysis failed:', aiError.message);
          aiAnalysis = null;
        }
      }
      
      // Создание записи в БД
      const photo = new Photo({
        userId: req.user.id,
        filename: path.basename(optimizedPath),
        originalName: req.file.originalname,
        path: optimizedPath,
        mimeType: 'image/jpeg',
        size: fs.existsSync(optimizedPath) ? fs.statSync(optimizedPath).size : 0,
        location: location,
        gpsData: gpsData,
        metadata: {
          make: exifData?.Make,
          model: exifData?.Model,
          dateTime: exifData?.DateTimeOriginal,
          focalLength: exifData?.FocalLength,
          iso: exifData?.ISO,
          exposureTime: exifData?.ExposureTime,
          aperture: exifData?.ApertureValue
        },
        aiAnalysis: aiAnalysis
      });
      
      await photo.save();
      
      if (req.user && req.user.updateOne) {
        await req.user.updateOne({ $inc: { 'stats.totalPhotos': 1 } });
      }
      
      res.status(201).json({
        success: true,
        data: photo,
        message: 'Photo uploaded successfully',
        aiAnalysis: aiAnalysis ? 'Completed' : 'Skipped or failed'
      });
    } catch (error) {
      next(error);
    }
  });
};

// Получение фото по ID (с AI анализом)
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