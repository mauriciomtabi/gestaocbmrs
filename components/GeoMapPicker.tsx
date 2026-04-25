/**
 * GeoMapPicker.tsx
 * Mapa interativo para configurar o perímetro de check-in.
 * Usa Leaflet + OpenStreetMap (sem chave de API).
 *
 * Funcionalidades:
 * - Visualizar o ponto central e o raio do perímetro como círculo
 * - Clicar no mapa para mover o centro
 * - Arrastar o marcador para reposicionar
 * - Arrastar o círculo (handle) para ajustar o raio
 */

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';

// Fix default marker icons (Leaflet asset resolution issue with bundlers)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Props {
  lat: number;
  lng: number;
  radius: number; // metros
  onChange: (lat: number, lng: number, radius: number) => void;
}

const GeoMapPicker: React.FC<Props> = ({ lat, lng, radius, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const radiusHandleRef = useRef<L.CircleMarker | null>(null);

  // Keep a ref to latest props so callbacks don't close over stale values
  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const radiusRef = useRef(radius);
  latRef.current = lat;
  lngRef.current = lng;
  radiusRef.current = radius;

  const updateHandle = useCallback((center: L.LatLng, r: number) => {
    if (radiusHandleRef.current) {
      // Position the radius handle at the east edge of the circle
      const handleLng = center.lng + (r / (111320 * Math.cos((center.lat * Math.PI) / 180)));
      radiusHandleRef.current.setLatLng([center.lat, handleLng]);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Init map
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Center marker (draggable)
    const centerIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:36px;height:36px;border-radius:50%;
        background:rgba(37,99,235,0.9);
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
        cursor:grab;
      ">
        <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
          <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([lat, lng], { icon: centerIcon, draggable: true }).addTo(map);
    marker.bindTooltip('Arraste para mover o centro', { permanent: false, direction: 'top' });

    // Perimeter circle
    const circle = L.circle([lat, lng], {
      radius,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6 4',
    }).addTo(map);

    // Radius handle (orange dot on the east edge)
    const handleIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:22px;height:22px;border-radius:50%;
        background:#f97316;
        border:3px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        cursor:ew-resize;
      "></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const handleLng = lng + (radius / (111320 * Math.cos((lat * Math.PI) / 180)));
    const radiusHandle = L.circleMarker([lat, handleLng], {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    // Replace with draggable marker using divIcon
    const handleMarker = L.marker([lat, handleLng], {
      icon: handleIcon,
      draggable: true,
    }).addTo(map);
    handleMarker.bindTooltip('Arraste para ajustar o raio', { permanent: false, direction: 'top' });

    // Store refs
    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;
    radiusHandleRef.current = handleMarker as unknown as L.CircleMarker;

    // Center marker drag
    marker.on('drag', () => {
      const pos = marker.getLatLng();
      circle.setLatLng(pos);
      updateHandle(pos, radiusRef.current);
    });
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onChange(
        parseFloat(pos.lat.toFixed(7)),
        parseFloat(pos.lng.toFixed(7)),
        radiusRef.current
      );
    });

    // Radius handle drag
    handleMarker.on('drag', () => {
      const center = markerRef.current!.getLatLng();
      const handlePos = handleMarker.getLatLng();
      const newRadius = Math.round(center.distanceTo(handlePos));
      circle.setRadius(Math.max(10, newRadius));
      // Update label
      circle.setStyle({});
    });
    handleMarker.on('dragend', () => {
      const center = markerRef.current!.getLatLng();
      const handlePos = handleMarker.getLatLng();
      const newRadius = Math.max(10, Math.round(center.distanceTo(handlePos)));
      onChange(
        parseFloat(center.lat.toFixed(7)),
        parseFloat(center.lng.toFixed(7)),
        newRadius
      );
    });

    // Click map to reposition center
    map.on('click', (e: L.LeafletMouseEvent) => {
      const pos = e.latlng;
      marker.setLatLng(pos);
      circle.setLatLng(pos);
      updateHandle(pos, radiusRef.current);
      onChange(
        parseFloat(pos.lat.toFixed(7)),
        parseFloat(pos.lng.toFixed(7)),
        radiusRef.current
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      radiusHandleRef.current = null;
    };
  }, []); // only on mount

  // Sync external prop changes → map
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return;
    const pos = L.latLng(lat, lng);
    markerRef.current.setLatLng(pos);
    circleRef.current.setLatLng(pos);
    circleRef.current.setRadius(radius);
    updateHandle(pos, radius);
    // Pan only if significantly different from current center
    const currentCenter = mapRef.current.getCenter();
    if (currentCenter.distanceTo(pos) > 5) {
      mapRef.current.setView(pos, mapRef.current.getZoom(), { animate: true });
    }
  }, [lat, lng, radius]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-slate-200"
      style={{ height: '340px', zIndex: 0 }}
    />
  );
};

export default GeoMapPicker;
