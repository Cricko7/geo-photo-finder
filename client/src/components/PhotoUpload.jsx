import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  CloudUpload, 
  PhotoCamera, 
  LocationOn, 
  Info,
  ExpandMore,
  Psychology,
  ColorLens,
  Visibility
} from '@mui/icons-material';
import axios from 'axios';
import EXIF from 'exifr';

const API_URL = process.env.REACT_APP_API_URL || 'http://194.87.43.20:5000/api';

const PhotoUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/photos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({
            ...prev,
            [formData.get('photo').name]: percentCompleted
          }));
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      setFiles([]);
      setUploadProgress({});
      // Если есть AI анализ, показываем уведомление
      if (data.aiAnalysis === 'Completed') {
        console.log('AI анализ завершен для фото');
      }
    },
    onError: (error) => {
      console.error('Upload error:', error);
    }
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    const filesWithMetadata = await Promise.all(
      acceptedFiles.map(async (file) => {
        try {
          const exifData = await EXIF.parse(file);
          const hasGPS = !!(exifData?.latitude && exifData?.longitude);
          
          return {
            file,
            preview: URL.createObjectURL(file),
            hasGPS,
            gps: hasGPS ? {
              lat: exifData.latitude,
              lng: exifData.longitude
            } : null,
            metadata: {
              make: exifData?.Make,
              model: exifData?.Model,
              dateTime: exifData?.DateTimeOriginal,
              focalLength: exifData?.FocalLength,
              iso: exifData?.ISO,
              exposureTime: exifData?.ExposureTime
            }
          };
        } catch (error) {
          return {
            file,
            preview: URL.createObjectURL(file),
            hasGPS: false,
            gps: null,
            metadata: {}
          };
        }
      })
    );
    
    setFiles(filesWithMetadata);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.heic']
    },
    maxSize: 10 * 1024 * 1024
  });

  const handleUpload = () => {
    files.forEach(({ file }) => {
      const formData = new FormData();
      formData.append('photo', file);
      uploadMutation.mutate(formData);
    });
  };

  const handleViewDetails = (photo) => {
    setSelectedPhoto(photo);
    setOpenDialog(true);
  };

  const formatDate = (date) => {
    if (!date) return 'Неизвестно';
    return new Date(date).toLocaleString();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Загрузить фото
      </Typography>
      
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          border: '2px dashed',
          borderColor: 'primary.main',
          borderRadius: 2,
          transition: 'all 0.3s',
          '&:hover': {
            bgcolor: 'action.hover',
            transform: 'translateY(-2px)'
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6">
          {isDragActive
            ? 'Отпустите файлы здесь'
            : 'Перетащите фото или нажмите для выбора'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Поддерживаются JPG, PNG, HEIC (до 10MB)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          📍 Фото с GPS координатами будут автоматически отмечены на карте
        </Typography>
        <Typography variant="caption" color="secondary" sx={{ mt: 0.5, display: 'block' }}>
          🤖 AI анализ будет выполнен автоматически после загрузки
        </Typography>
      </Paper>

      {files.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Выбрано файлов: {files.length}
            </Typography>
            <Button
              variant="contained"
              startIcon={<PhotoCamera />}
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? <CircularProgress size={24} /> : 'Загрузить все фото'}
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            {files.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ position: 'relative' }}>
                  <IconButton
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'white', '&:hover': { bgcolor: '#f5f5f5' } }}
                    onClick={() => handleViewDetails(file)}
                  >
                    <Info />
                  </IconButton>
                  <CardMedia
                    component="img"
                    height="200"
                    image={file.preview}
                    alt={file.file.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="body2" noWrap>
                      {file.file.name}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={<LocationOn />}
                        label={file.hasGPS ? '📍 GPS найден' : '❌ GPS не найден'}
                        color={file.hasGPS ? 'success' : 'default'}
                      />
                    </Box>
                    {uploadProgress[file.file.name] && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={uploadProgress[file.file.name]} 
                        />
                        <Typography variant="caption">
                          {uploadProgress[file.file.name]}%
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {uploadMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Ошибка загрузки: {uploadMutation.error.response?.data?.error || uploadMutation.error.message}
        </Alert>
      )}

      {/* Диалог с деталями фото */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info />
            Детали фото
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPhoto && (
            <Box>
              <img 
                src={selectedPhoto.preview} 
                alt={selectedPhoto.file.name}
                style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }}
              />
              
              {/* Основная информация */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1">📄 Основная информация</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" gutterBottom>
                    <strong>Имя файла:</strong> {selectedPhoto.file.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Размер:</strong> {(selectedPhoto.file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  {selectedPhoto.metadata?.make && (
                    <Typography variant="body2" gutterBottom>
                      <strong>📷 Устройство:</strong> {selectedPhoto.metadata.make} {selectedPhoto.metadata.model}
                    </Typography>
                  )}
                  {selectedPhoto.metadata?.dateTime && (
                    <Typography variant="body2" gutterBottom>
                      <strong>📅 Дата съемки:</strong> {formatDate(selectedPhoto.metadata.dateTime)}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
              
              {/* GPS информация */}
              {selectedPhoto.hasGPS && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">📍 GPS координаты</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" gutterBottom>
                      <strong>Широта:</strong> {selectedPhoto.gps.lat.toFixed(6)}°
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Долгота:</strong> {selectedPhoto.gps.lng.toFixed(6)}°
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      href={`https://www.google.com/maps?q=${selectedPhoto.gps.lat},${selectedPhoto.gps.lng}`}
                      target="_blank"
                      sx={{ mt: 1 }}
                    >
                      Открыть в Google Maps
                    </Button>
                  </AccordionDetails>
                </Accordion>
              )}
              
              {/* Параметры съемки */}
              {(selectedPhoto.metadata?.focalLength || selectedPhoto.metadata?.iso || selectedPhoto.metadata?.exposureTime) && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">🎯 Параметры съемки</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {selectedPhoto.metadata?.focalLength && (
                      <Typography variant="body2" gutterBottom>
                        <strong>🔍 Фокусное расстояние:</strong> {selectedPhoto.metadata.focalLength} мм
                      </Typography>
                    )}
                    {selectedPhoto.metadata?.iso && (
                      <Typography variant="body2" gutterBottom>
                        <strong>🎚️ ISO:</strong> {selectedPhoto.metadata.iso}
                      </Typography>
                    )}
                    {selectedPhoto.metadata?.exposureTime && (
                      <Typography variant="body2" gutterBottom>
                        <strong>⏱️ Выдержка:</strong> {selectedPhoto.metadata.exposureTime} сек
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              )}
              
              {/* AI анализ - будет отображаться после загрузки с сервера */}
              {selectedPhoto.aiAnalysis ? (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Psychology color="secondary" />
                      <Typography variant="subtitle1">🤖 AI анализ</Typography>
                      <Chip 
                        size="small" 
                        label={`Модель: ${selectedPhoto.aiAnalysis.model || 'LLaVA'}`}
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
                        <strong>📝 Описание:</strong><br />
                        {selectedPhoto.aiAnalysis.description || 'Нет описания'}
                      </Typography>
                      
                      {selectedPhoto.aiAnalysis.objects?.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>🔍 Обнаруженные объекты:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {selectedPhoto.aiAnalysis.objects.map((obj, idx) => (
                              <Chip key={idx} label={obj} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {selectedPhoto.aiAnalysis.scene && (
                        <Typography variant="body2" sx={{ mt: 2 }}>
                          <strong>🏞️ Тип сцены:</strong> {selectedPhoto.aiAnalysis.scene}
                        </Typography>
                      )}
                      
                      {selectedPhoto.aiAnalysis.colors?.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong><ColorLens sx={{ fontSize: 16, verticalAlign: 'middle' }} /> Основные цвета:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {selectedPhoto.aiAnalysis.colors.map((color, idx) => (
                              <Chip 
                                key={idx} 
                                label={color} 
                                size="small" 
                                sx={{ 
                                  bgcolor: color.toLowerCase(),
                                  color: ['black', 'dark', 'navy'].some(c => color.toLowerCase().includes(c)) ? 'white' : 'black'
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {selectedPhoto.aiAnalysis.details?.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>✨ Детали:</strong>
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {selectedPhoto.aiAnalysis.details.map((detail, idx) => (
                              <li key={idx}>
                                <Typography variant="body2">{detail}</Typography>
                              </li>
                            ))}
                          </ul>
                        </Box>
                      )}
                      
                      {selectedPhoto.aiAnalysis.locationClues?.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>🗺️ Подсказки о местоположении:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {selectedPhoto.aiAnalysis.locationClues.map((clue, idx) => (
                              <Chip key={idx} label={clue} size="small" color="info" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {selectedPhoto.aiAnalysis.confidence && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            <Visibility sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                            {' '}Уверенность анализа: {(selectedPhoto.aiAnalysis.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ) : (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Psychology color="disabled" />
                      <Typography variant="subtitle1" color="text.secondary">
                        🤖 AI анализ (будет доступен после загрузки)
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Alert severity="info">
                      AI анализ будет выполнен автоматически после загрузки фото на сервер. 
                      Обновите страницу через несколько секунд после загрузки.
                    </Alert>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoUpload;