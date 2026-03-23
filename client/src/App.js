import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import PhotoUpload from './components/PhotoUpload';
import MapPage from './pages/MapPage';

const queryClient = new QueryClient();

function HomePage() {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h2" gutterBottom>
        📍 Geo Photo Finder
      </Typography>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        Находите места по фотографиям
      </Typography>
      <Typography variant="body1" sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
        Загружайте фото с GPS координатами и смотрите где они были сделаны на карте
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button component={Link} to="/upload" variant="contained" size="large">
          Загрузить фото
        </Button>
        <Button component={Link} to="/map" variant="outlined" size="large">
          Смотреть карту
        </Button>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              📍 Geo Photo Finder
            </Typography>
            <Button color="inherit" component={Link} to="/">Главная</Button>
            <Button color="inherit" component={Link} to="/upload">Загрузить</Button>
            <Button color="inherit" component={Link} to="/map">Карта</Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<PhotoUpload />} />
            <Route path="/map" element={<MapPage />} />
          </Routes>
        </Container>
      </Router>
    </QueryClientProvider>
  );
}

export default App;