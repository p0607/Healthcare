import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix default Leaflet markers under bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const colorIcon = (color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<span style="
      display:inline-block;width:18px;height:18px;border-radius:50%;
      background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color};"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export const ICONS = {
  user: colorIcon('#0a9bf0'),
  nurse: colorIcon('#13c296'),
  request: colorIcon('#f59e0b'),
  emergency: colorIcon('#ef4444'),
};

const ClickPicker = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick && onPick([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
};

const Recenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center[1], center[0]], map.getZoom());
  }, [center, map]);
  return null;
};

const MapView = ({
  center = [77.5946, 12.9716],
  zoom = 12,
  markers = [],
  routes = [],
  onPick,
  className = '',
  height = '380px',
}) => {
  return (
    <div className={`overflow-hidden rounded-xl ${className}`} style={{ height }}>
      <MapContainer center={[center[1], center[0]]} zoom={zoom} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick && <ClickPicker onPick={onPick} />}
        <Recenter center={center} />

        {routes.map((r, i) => {
          if (!r?.coords?.length) return null;
          const positions = r.coords.map(([lng, lat]) => [lat, lng]);
          return (
            <Polyline
              key={r.id || i}
              positions={positions}
              pathOptions={{
                color: r.color || '#0a9bf0',
                weight: r.weight || 5,
                opacity: r.opacity ?? 0.85,
                dashArray: r.dashed ? '8 8' : undefined,
              }}
            />
          );
        })}

        {markers.map((m, i) => {
          const [lng, lat] = m.coordinates;
          return (
            <Marker
              key={m.id || i}
              position={[lat, lng]}
              icon={ICONS[m.type] || ICONS.user}
            >
              {m.popup && <Popup>{m.popup}</Popup>}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
