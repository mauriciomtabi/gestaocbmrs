/**
 * GeoMapViewer.tsx
 * Mapa somente-leitura para visualização forense de registros de check-in.
 * Exibe os pontos de Entrada e/ou Saída com o círculo do perímetro configurado.
 * Usa a mesma stack do GeoMapPicker (Leaflet + OpenStreetMap).
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface GeoPoint {
  lat: number;
  lng: number;
}

interface Perimeter {
  lat: number;
  lng: number;
  radius: number;
}

interface Props {
  entry?: GeoPoint;
  exit?: GeoPoint;
  perimeter?: Perimeter;
  height?: number;
}

const GeoMapViewer: React.FC<Props> = ({ entry, exit, perimeter, height = 300 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Determine map center: prefer perimeter center, then entry, then exit
    const center: [number, number] = perimeter
      ? [perimeter.lat, perimeter.lng]
      : entry
      ? [entry.lat, entry.lng]
      : exit
      ? [exit.lat, exit.lng]
      : [-29.4738, -51.0];

    const map = L.map(containerRef.current, {
      center,
      zoom: 17,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const bounds: L.LatLng[] = [];

    // Perimeter circle + center marker
    if (perimeter) {
      const perimCenter = L.latLng(perimeter.lat, perimeter.lng);
      bounds.push(perimCenter);

      L.circle(perimCenter, {
        radius: perimeter.radius,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.10,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);

      const perimIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:rgba(37,99,235,0.9);
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker(perimCenter, { icon: perimIcon })
        .bindTooltip(`Centro do Perímetro (raio: ${perimeter.radius}m)`, { direction: 'top' })
        .addTo(map);
    }

    // Entry marker (green)
    if (entry) {
      const entryLatLng = L.latLng(entry.lat, entry.lng);
      bounds.push(entryLatLng);

      const entryIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:rgba(22,163,74,0.95);
          border:3px solid white;
          box-shadow:0 2px 10px rgba(22,163,74,0.5);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
        ">
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'/><polyline points='10 17 15 12 10 7'/><line x1='15' y1='12' x2='3' y2='12'/>
          </svg>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const dist = perimeter
        ? Math.round(L.latLng(perimeter.lat, perimeter.lng).distanceTo(entryLatLng))
        : null;

      L.marker(entryLatLng, { icon: entryIcon })
        .bindTooltip(
          `Entrada: ${entry.lat.toFixed(6)}, ${entry.lng.toFixed(6)}` +
          (dist !== null ? `\nDistância ao perímetro: ${dist}m` : ''),
          { direction: 'top', permanent: false }
        )
        .addTo(map);
    }

    // Exit marker (red)
    if (exit) {
      const exitLatLng = L.latLng(exit.lat, exit.lng);
      bounds.push(exitLatLng);

      const exitIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:rgba(220,38,38,0.95);
          border:3px solid white;
          box-shadow:0 2px 10px rgba(220,38,38,0.5);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/>
          </svg>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const dist = perimeter
        ? Math.round(L.latLng(perimeter.lat, perimeter.lng).distanceTo(exitLatLng))
        : null;

      L.marker(exitLatLng, { icon: exitIcon })
        .bindTooltip(
          `Saída: ${exit.lat.toFixed(6)}, ${exit.lng.toFixed(6)}` +
          (dist !== null ? `\nDistância ao perímetro: ${dist}m` : ''),
          { direction: 'top', permanent: false }
        )
        .addTo(map);
    }

    // Draw line connecting entry → exit if both present
    if (entry && exit) {
      L.polyline(
        [[entry.lat, entry.lng], [exit.lat, exit.lng]],
        { color: '#6366f1', weight: 2, dashArray: '5 5', opacity: 0.7 }
      ).addTo(map);
    }

    // Fit map to all markers
    if (bounds.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 18 });
      } catch {
        // fallback: stay on center
      }
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-slate-200"
      style={{ height: `${height}px`, zIndex: 0 }}
    />
  );
};

export default GeoMapViewer;
