import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useState } from "react";

type MapPoint = {
  id: string;
  position: LatLngExpression;
  label?: string;
};

type Props = {
  center?: LatLngExpression;
  zoom?: number;
};

export default function Map({
  center = [47.6062, -122.3321], // Seattle default
  zoom = 12,
}: Props) {
  const [points, setPoints] = useState<MapPoint[]>([]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: "100%", height: "100%", background: "red" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((point) => (
        <Marker key={point.id} position={point.position}>
          {point.label && <Popup>{point.label}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
