import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from 'react-query';
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
  Grid
} from '@mui/material';
import { CloudUpload, PhotoCamera } from '@mui/icons-material';
import axios from 'axios';
import EXIF from 'exifr';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PhotoUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
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
      }
    }
  );

  const onDrop = useCallback(async (acceptedFiles) => {
    const filesWithMetadata = await Promise.all(
      acceptedFiles.map(async (file) => {
        try {
          const exifData = await EXIF.parse(file);
          return {
            file,
            preview: URL.createObjectURL(file),
            hasGPS: exifData?.latitude && exifData?.longitude,
            gps: exifData ? {
              lat: exifData.latitude,
              lng: exifData.longitude
            } : null
          };
        } catch (error) {
          return {
            file,
            preview: URL.createObjectURL(file),
            hasGPS: false,
            gps: null
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
    maxSize: 10485760 // 10MB
  });

  const handleUpload = () => {
    files.forEach(({ file }) => {
      const formData = new FormData();
      formData.append('photo', file);
      uploadMutation.mutate(formData);
    });
  };

  return (
    <Box sx={{ p: 3 }}>
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
          borderRadius: 2
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
      </Paper>

      {files.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Выбрано файлов: {files.length}
          </Typography>
          <Grid container spacing={2}>
            {files.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={file.preview}
                    alt={file.file.name}
                  />
                  <CardContent>
                    <Typography variant="body2" noWrap>
                      {file.file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {file.hasGPS ? '📍 GPS найден' : '⚠️ GPS не найден'}
                    </Typography>
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
          
          <Button
            variant="contained"
            startIcon={<PhotoCamera />}
            onClick={handleUpload}
            disabled={uploadMutation.isLoading}
            sx={{ mt: 2 }}
          >
            {uploadMutation.isLoading ? 'Загрузка...' : 'Загрузить все фото'}
          </Button>
        </Box>
      )}

      {uploadMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Ошибка загрузки: {uploadMutation.error.message}
        </Alert>
      )}
    </Box>
  );
};

export default PhotoUpload;