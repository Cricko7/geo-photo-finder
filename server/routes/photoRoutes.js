const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const auth = require('../middleware/auth');

// Все роуты защищены middleware auth
router.use(auth);

// Загрузка фото
router.post('/upload', photoController.uploadPhoto);

// Получение всех фото пользователя
router.get('/', photoController.getUserPhotos);

// Поиск фото по геолокации
router.get('/nearby', photoController.findPhotosByLocation);

// Статистика по геолокациям
router.get('/stats/locations', photoController.getLocationStats);

// Получение конкретного фото
router.get('/:id', photoController.getPhotoById);

// Удаление фото
router.delete('/:id', photoController.deletePhoto);

module.exports = router;