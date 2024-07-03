import * as React from 'react'
import './Map.css';
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function Map_Data_Recovery({ setMap, rectangle }) {
  const position = [48.86251266449499, 1.8863868713378908]
  const blackOptions = { color: 'black' }

  return (
    <MapContainer style={{height: '100vh', width: '80vw', margin: '0 auto'}} center={position} zoom={14} scrollWheelZoom={false} ref={ref => setMap(ref)}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      {rectangle.length && <Rectangle bounds={rectangle} pathOptions={blackOptions} />}
    </MapContainer>
  );
}

export default Map_Data_Recovery;