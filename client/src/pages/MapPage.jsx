import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';  // ← исправлено!
import axios from 'axios';
import { Box, Typography, CircularProgress, Alert, Paper, Button, Slider, Chip } from '@mui/material';
import { MyLocation } from '@mui/icons-material';
import PhotoMap from '../components/PhotoMap';
// остальной код без изменений
const API_URL = process.env.REACT_APP_API_URL || 'http://194.87.43.20:5000/api';

const MapPage = () => {
  const token = localStorage.getItem('token');
  const [center, setCenter] = useState([55.751244, 37.618423]); // Москва
  const [radius, setRadius] = useState(1000);
  const [searchLocation, setSearchLocation] = useState(null);

  const { data: photos, isLoading, error } = useQuery(
    ['photos'],
    async () => {
      const response = await axios.get(`${API_URL}/photos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    { enabled: !!token }
  );

  const { data: nearbyPhotos } = useQuery(
    ['nearbyPhotos', searchLocation, radius],
    async () => {
      if (!searchLocation) return [];
      const response = await axios.get(`${API_URL}/photos/nearby`, {
        params: {
          lat: searchLocation.lat,
          lng: searchLocation.lng,
          radius
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    { enabled: !!searchLocation && !!token }
  );

  const handleGetUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSearchLocation({ lat: latitude, lng: longitude });
          setCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Не удалось получить ваше местоположение');
        }
      );
    } else {
      alert('Geolocation не поддерживается вашим браузером');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Ошибка загрузки фото: {error.message}
      </Alert>
    );
  }

  const photosWithLocation = photos?.filter(p => p.location?.coordinates) || [];
  const displayPhotos = searchLocation ? nearbyPhotos : photosWithLocation;
  const photosCount = displayPhotos?.length || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Карта фотографий
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          startIcon={<MyLocation />}
          onClick={handleGetUserLocation}
        >
          Моё местоположение
        </Button>
        
        {searchLocation && (
          <>
            <Box sx={{ minWidth: 200, flex: 1 }}>
              <Typography variant="caption">Радиус поиска: {radius} м</Typography>
              <Slider
                value={radius}
                onChange={(_, val) => setRadius(val)}
                min={100}
                max={5000}
                step={100}
                valueLabelDisplay="auto"
              />
            </Box>
            <Chip 
              label={`Найдено фото: ${photosCount}`}
              color="primary"
              variant="outlined"
            />
          </>
        )}
      </Paper>
      
      {photosWithLocation.length === 0 && !searchLocation ? (
        <Alert severity="info">
          📸 Нет фотографий с GPS координатами. Загрузите фото с геотегами, чтобы они появились на карте!
        </Alert>
      ) : photosCount === 0 && searchLocation ? (
        <Alert severity="info">
          🗺️ В радиусе {radius} метров не найдено фотографий
        </Alert>
      ) : (
        <PhotoMap 
          photos={displayPhotos} 
          center={center}
          zoom={searchLocation ? 13 : 5}
        />
      )}
    </Box>
  );
};

export default MapPage;