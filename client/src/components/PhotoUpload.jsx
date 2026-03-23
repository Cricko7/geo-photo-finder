import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// остальной код без изменений
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
  CircularProgress
} from '@mui/material';
import { 
  CloudUpload, 
  PhotoCamera, 
  Close, 
  LocationOn, 
  Info,
  CheckCircle,
  Error
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

  const uploadMutation = useMutation(
    async (formData) => {
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
    {
      onSuccess: () => {
        queryClient.invalidateQueries('photos');
        setFiles([]);
        setUploadProgress({});
      },
      onError: (error) => {
        console.error('Upload error:', error);
      }
    }
  );

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
    maxSize: 10 * 1024 * 1024 // 10MB
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
              disabled={uploadMutation.isLoading}
            >
              {uploadMutation.isLoading ? <CircularProgress size={24} /> : 'Загрузить все фото'}
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Детали фото</DialogTitle>
        <DialogContent>
          {selectedPhoto && (
            <Box>
              <img 
                src={selectedPhoto.preview} 
                alt={selectedPhoto.file.name}
                style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }}
              />
              <Typography variant="body2" gutterBottom>
                <strong>📄 Имя файла:</strong> {selectedPhoto.file.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>📦 Размер:</strong> {(selectedPhoto.file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
              {selectedPhoto.hasGPS && (
                <>
                  <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                    <strong>📍 GPS координаты:</strong>
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Широта: {selectedPhoto.gps.lat.toFixed(6)}°
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Долгота: {selectedPhoto.gps.lng.toFixed(6)}°
                  </Typography>
                </>
              )}
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