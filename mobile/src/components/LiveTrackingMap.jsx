import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DEFAULT_SEED_COORDS } from '@nursecare/shared';

function sanitizeCoord(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return null;
  const lng = Number(coord[0]);
  const lat = Number(coord[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lng, lat];
}

function sanitizeRoute(coords) {
  if (!Array.isArray(coords)) return [];
  return coords.map(sanitizeCoord).filter(Boolean);
}

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .pin {
      width: 18px; height: 18px; border-radius: 50%;
      border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(0,0,0,0.15);
    }
    .pin-patient { background: #e11d48; }
    .pin-nurse { background: #0a9bf0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const DEFAULT = [${DEFAULT_SEED_COORDS[1]}, ${DEFAULT_SEED_COORDS[0]}];
    let map, patientMarker, nurseMarker, routeLine;

    function icon(className) {
      return L.divIcon({
        className: '',
        html: '<span class="pin ' + className + '"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
    }

    function toLatLng(coord) {
      if (!coord || coord.length < 2) return null;
      return L.latLng(coord[1], coord[0]);
    }

    function fitMap(patient, nurse, route) {
      const points = [];
      if (patient) points.push(toLatLng(patient));
      if (nurse) points.push(toLatLng(nurse));
      (route || []).forEach((c) => {
        const p = toLatLng(c);
        if (p) points.push(p);
      });
      if (points.length === 0) {
        map.setView(DEFAULT, 13);
        return;
      }
      if (points.length === 1) {
        map.setView(points[0], 14);
        return;
      }
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
    }

    function ensureMap() {
      if (map) return;
      map = L.map('map', { zoomControl: true, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      map.setView(DEFAULT, 13);
    }

    window.__updateTracking = function updateTracking(data) {
      ensureMap();
      const patient = data.patient || null;
      const nurse = data.nurse || null;
      const route = data.route || [];
      const status = data.status || 'on_the_way';
      const routeColor = status === 'in_progress' ? '#13c296' : '#0a9bf0';

      if (patient) {
        const pos = toLatLng(patient);
        if (!patientMarker) {
          patientMarker = L.marker(pos, { icon: icon('pin-patient'), title: 'Your location' }).addTo(map);
        } else {
          patientMarker.setLatLng(pos);
        }
      } else if (patientMarker) {
        map.removeLayer(patientMarker);
        patientMarker = null;
      }

      if (nurse) {
        const pos = toLatLng(nurse);
        if (!nurseMarker) {
          nurseMarker = L.marker(pos, { icon: icon('pin-nurse'), title: 'Caregiver' }).addTo(map);
        } else {
          nurseMarker.setLatLng(pos);
        }
      } else if (nurseMarker) {
        map.removeLayer(nurseMarker);
        nurseMarker = null;
      }

      const lineCoords = route.length >= 2 ? route.map(toLatLng).filter(Boolean) : [];
      if (lineCoords.length >= 2) {
        if (!routeLine) {
          routeLine = L.polyline(lineCoords, {
            color: routeColor,
            weight: 4,
            opacity: 0.9,
            dashArray: status === 'in_progress' ? '8 6' : null,
          }).addTo(map);
        } else {
          routeLine.setLatLngs(lineCoords);
          routeLine.setStyle({
            color: routeColor,
            dashArray: status === 'in_progress' ? '8 6' : null,
          });
        }
      } else if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }

      fitMap(patient, nurse, route);
    };
  </script>
</body>
</html>`;

/**
 * OpenStreetMap live tracking via WebView — avoids Android Google Maps API key crashes.
 */
export default function LiveTrackingMap({
  patientCoords,
  nurseCoords,
  routeCoords,
  status = 'on_the_way',
}) {
  const webRef = useRef(null);

  const patient = useMemo(() => sanitizeCoord(patientCoords), [patientCoords]);
  const nurse = useMemo(() => sanitizeCoord(nurseCoords), [nurseCoords]);
  const route = useMemo(() => {
    const fromApi = sanitizeRoute(routeCoords);
    if (fromApi.length >= 2) return fromApi;
    if (patient && nurse) return [nurse, patient];
    return [];
  }, [routeCoords, patient, nurse]);

  const pushUpdate = useCallback(() => {
    const payload = JSON.stringify({ patient, nurse, route, status }).replace(/</g, '\\u003c');
    webRef.current?.injectJavaScript(
      `window.__updateTracking && window.__updateTracking(${payload}); true;`
    );
  }, [patient, nurse, route, status]);

  useEffect(() => {
    pushUpdate();
  }, [pushUpdate]);

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webRef}
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: MAP_HTML }}
        onLoadEnd={pushUpdate}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        {...(Platform.OS === 'android' ? { androidLayerType: 'hardware' } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 280 },
  map: { flex: 1 },
});
