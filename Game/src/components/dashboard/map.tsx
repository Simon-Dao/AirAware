import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useSessionStore } from "../../state/sessionState";
import { SERVER_BASE_URL } from "../../state/constants";

interface Reading {
  pm: number;
  timestamp: string;
  latitude: number;
  longitude: number;
}

function toApiDate(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [positions, map]);
  return null;
}

type Props = {
  center?: LatLngExpression;
  zoom?: number;
  date: Date;
};

export default function Map({ center = [47.6062, -122.3321], zoom = 12, date }: Props) {
  const username = useSessionStore((s) => s.username);
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    if (!username) return;

    const fetchData = () => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      axios
        .get(SERVER_BASE_URL + "user/get/data", {
          params: { username, begin_time: toApiDate(start), end_time: toApiDate(end) },
        })
        .then((res) => {
          const data = res.data as Reading[];
          data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setReadings(data);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [username, date]);

  const positions: [number, number][] = readings.map((r) => [r.latitude, r.longitude]);

  return (
    <MapContainer center={center} zoom={zoom} style={{ width: "100%", height: "100%" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {positions.length > 0 && <FitBounds positions={positions} />}

      {readings.map((r, i) => {
        const time = new Date(r.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <Marker key={i} position={[r.latitude, r.longitude]}>
            <Popup>
              <strong>{time}</strong>
              <br />
              PM2.5: {r.pm}
            </Popup>
          </Marker>
        );
      })}

      {positions.length > 1 && (
        <Polyline positions={positions} color="#3b82f6" weight={2} dashArray="6 4" />
      )}
    </MapContainer>
  );
}
