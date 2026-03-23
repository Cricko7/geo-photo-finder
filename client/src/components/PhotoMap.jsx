import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Исправляем проблему с иконками Leaflet в React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const PhotoMap = ({ photos, center, zoom }) => {
  const photosWithLocation = photos?.filter(p => p.location?.coordinates) || [];

  return (
    <MapContainer 
      style={{ height: '500px', width: '100%', borderRadius: '8px' }}
      center={center}
      zoom={zoom}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ChangeView center={center} zoom={zoom} />
      {photosWithLocation.map(photo => (
        <Marker 
          key={photo._id}
          position={[photo.location.coordinates[1], photo.location.coordinates[0]]}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <img 
                src={`http://194.87.43.20:5000/${photo.path}`}
                alt={photo.originalName}
                style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px' }}
              />
              <p><strong>📅 Дата:</strong> {new Date(photo.createdAt).toLocaleString()}</p>
              {photo.metadata?.make && (
                <p><strong>📷 Устройство:</strong> {photo.metadata.make} {photo.metadata.model}</p>
              )}
              {photo.aiAnalysis?.description && (
                <p><strong>🤖 AI:</strong> {photo.aiAnalysis.description}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default PhotoMap;