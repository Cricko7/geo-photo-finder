const Photo = require('../models/Photo');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const exifr = require('exifr');
const sharp = require('sharp');
const ollamaService = require('../services/ollamaService');

const UPLOADS_RELATIVE_DIR = 'uploads';
const uploadsDirAbsolute = path.join(process.cwd(), UPLOADS_RELATIVE_DIR);
if (!fs.existsSync(uploadsDirAbsolute)) {
  fs.mkdirSync(uploadsDirAbsolute, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDirAbsolute),
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const ext = path.extname(safeName) || '.jpg';
    const base = path.basename(safeName, ext);
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).single('photo');

const toAbsolutePath = (filePath) => {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(process.cwd(), filePath);
};

const toPublicUploadPath = (absoluteFilePath) =>
  path.posix.join(UPLOADS_RELATIVE_DIR, path.basename(absoluteFilePath));

const removeFileIfExists = (filePath) => {
  try {
    const absolutePath = toAbsolutePath(filePath);
    if (absolutePath && fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
const removeFileIfExists = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.warn('Could not remove file:', e.message);
  }
};

exports.uploadPhoto = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
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

      let optimizedPath = req.file.path;
      try {
        optimizedPath = req.file.path.replace(/\.\w+$/, '_optimized.jpg');
        await sharp(req.file.path)
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(optimizedPath);

        if (optimizedPath !== req.file.path) {
          removeFileIfExists(req.file.path);
        }
      } catch (sharpError) {
        console.error('Image optimization failed:', sharpError.message);
        optimizedPath = req.file.path;
      }

      let aiAnalysis = null;
      if (process.env.ENABLE_AI_ANALYSIS === 'true') {
        try {
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

      const photo = await Photo.create({
        userId: req.user.id,
        filename: path.basename(optimizedPath),
        originalName: req.file.originalname,
        path: toPublicUploadPath(optimizedPath),
        mimeType: 'image/jpeg',
        size: fs.existsSync(optimizedPath) ? fs.statSync(optimizedPath).size : 0,
        location,
        gpsData,
        metadata: {
          make: exifData?.Make,
          model: exifData?.Model,
          dateTime: exifData?.DateTimeOriginal,
          focalLength: exifData?.FocalLength,
          iso: exifData?.ISO,
          exposureTime: exifData?.ExposureTime,
          aperture: exifData?.ApertureValue
        },
        aiAnalysis
      });

      if (req.user && req.user.updateOne) {
        await req.user.updateOne({ $inc: { 'stats.totalPhotos': 1 } });
      }

      return res.status(201).json({
        success: true,
        data: photo,
        message: 'Photo uploaded successfully',
        aiAnalysis: aiAnalysis ? 'Completed' : 'Skipped or failed'
      });
    } catch (error) {
      return next(error);
    }
  });
};

exports.getUserPhotos = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Photo.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Photo.countDocuments({ userId: req.user.id })
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return next(error);
  }
};

exports.findPhotosByLocation = async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius) || 1000;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required numbers' });
    }

    const data = await Photo.find({
      userId: req.user.id,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius
        }
      }
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

exports.getLocationStats = async (req, res, next) => {
  try {
    const userObjectId = req.user._id || req.user.id;
    const stats = await Photo.aggregate([
      {
        $match: {
          userId: userObjectId,
          'location.coordinates.0': { $exists: true },
          'location.coordinates.1': { $exists: true }
        }
      },
      {
        $project: {
          lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] },
          lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] }
        }
      },
      {
        $group: {
          _id: { lat: '$lat', lng: '$lng' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return res.json({ success: true, data: stats });
  } catch (error) {
    return next(error);
  }
};

exports.getPhotoById = async (req, res, next) => {
  try {
    const photo = await Photo.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    photo.views += 1;
    await photo.save();

    return res.json({ success: true, data: photo });
  } catch (error) {
    return next(error);
  }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    const photo = await Photo.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    removeFileIfExists(photo.path);
    await photo.deleteOne();

    if (req.user && req.user.updateOne) {
      await req.user.updateOne({ $inc: { 'stats.totalPhotos': -1 } });
    }

    return res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};
