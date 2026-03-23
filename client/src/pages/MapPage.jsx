import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Box, Typography, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, Slider, Paper } from '@mui/material';
import PhotoMap from '../components/PhotoMap';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MapPage = () => {
  const { token } = useAuth();
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
    }
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
    { enabled: !!searchLocation }
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Карта фотографий
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={handleGetUserLocation}>
          Моё местоположение
        </Button>
        
        {searchLocation && (
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="caption">Радиус поиска (м)</Typography>
            <Slider
              value={radius}
              onChange={(_, val) => setRadius(val)}
              min={100}
              max={5000}
              step={100}
              valueLabelDisplay="auto"
            />
          </Box>
        )}
        
        {searchLocation && (
          <Typography variant="body2" color="text.secondary">
            Найдено фото: {nearbyPhotos?.length || 0}
          </Typography>
        )}
      </Paper>
      
      {displayPhotos && displayPhotos.length > 0 ? (
        <PhotoMap 
          photos={displayPhotos} 
          center={center}
          zoom={searchLocation ? 13 : 5}
        />
      ) : (
        <Alert severity="info">
          {searchLocation 
            ? 'Нет фотографий в выбранном радиусе' 
            : 'Нет фотографий с GPS координатами. Загрузите фото с геотегами!'}
        </Alert>
      )}
    </Box>
  );
};

export default MapPage;