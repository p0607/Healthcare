import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

function lngLatToMap(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return null;
  return { latitude: coord[1], longitude: coord[0] };
}

function coordsToPolyline(coords) {
  if (!Array.isArray(coords)) return [];
  return coords.map(lngLatToMap).filter(Boolean);
}

function regionForPoints(points, padding = 1.35) {
  const valid = points.map(lngLatToMap).filter(Boolean);
  if (valid.length === 0) {
    return {
      latitude: 12.9716,
      longitude: 77.5946,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }
  const lats = valid.map((p) => p.latitude);
  const lngs = valid.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latDelta = Math.max((maxLat - minLat) * padding, 0.01);
  const lngDelta = Math.max((maxLng - minLng) * padding, 0.01);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * Zomato-style live map — patient destination + moving caregiver marker + route line.
 */
export default function LiveTrackingMap({
  patientCoords,
  nurseCoords,
  routeCoords,
  status = 'on_the_way',
}) {
  const mapRef = useRef(null);

  const patientPoint = useMemo(() => lngLatToMap(patientCoords), [patientCoords]);
  const nursePoint = useMemo(() => lngLatToMap(nurseCoords), [nurseCoords]);
  const polyline = useMemo(
    () => coordsToPolyline(routeCoords || (nurseCoords && patientCoords ? [nurseCoords, patientCoords] : [])),
    [routeCoords, nurseCoords, patientCoords]
  );

  const initialRegion = useMemo(() => {
    const pts = [patientCoords, nurseCoords].filter(Boolean);
    return regionForPoints(pts);
  }, [patientCoords, nurseCoords]);

  useEffect(() => {
    if (!mapRef.current || !nursePoint) return;
    mapRef.current.animateToRegion(
      {
        ...nursePoint,
        latitudeDelta: initialRegion.latitudeDelta,
        longitudeDelta: initialRegion.longitudeDelta,
      },
      600
    );
  }, [nursePoint?.latitude, nursePoint?.longitude, initialRegion.latitudeDelta, initialRegion.longitudeDelta]);

  const routeColor = status === 'in_progress' ? '#13c296' : '#0a9bf0';

  return (
    <View style={styles.wrap}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} showsUserLocation={false}>
        {patientPoint ? (
          <Marker coordinate={patientPoint} title="Your location" pinColor="#e11d48" />
        ) : null}
        {nursePoint ? (
          <Marker coordinate={nursePoint} title="Caregiver" pinColor="#0a9bf0" />
        ) : null}
        {polyline.length >= 2 ? (
          <Polyline
            coordinates={polyline}
            strokeColor={routeColor}
            strokeWidth={4}
            lineDashPattern={status === 'in_progress' ? [8, 6] : undefined}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 280 },
  map: { ...StyleSheet.absoluteFillObject },
});
