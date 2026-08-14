import React from 'react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function CommandMap({ 
  center = [12.9716, 77.5946], // Default Bengaluru
  zoom = 12,
  children,
  className = "w-full h-full relative"
}) {
  const mapStyle = "https://tiles.openfreemap.org/styles/dark";

  return (
    <div className={className}>
      <Map
        initialViewState={{
          longitude: center[1],
          latitude: center[0],
          zoom: zoom
        }}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        mapStyle={mapStyle}
        attributionControl={false}
      >
        {children}
      </Map>
    </div>
  );
}
