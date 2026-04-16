'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Props {
  lat: number;
  lng: number;
  onMove?: (lat: number, lng: number) => void;
}

export default function MapaInmueble({ lat, lng, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onMoveRef = useRef<Props['onMove']>(onMove);

  // Keep latest onMove without re-creating the map.
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  // Initialize map once.
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      // Guard: render a visible error inside the container instead of crashing.
      containerRef.current.innerHTML =
        '<div style="padding:16px;font-size:12px;color:#b91c1c;background:#fef2f2;border-radius:16px;height:100%;display:flex;align-items:center;justify-content:center;text-align:center">NEXT_PUBLIC_MAPBOX_TOKEN no configurado.</div>';
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: 15,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const marker = new mapboxgl.Marker({ draggable: true, color: '#000000' })
      .setLngLat([lng, lat])
      .addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      if (onMoveRef.current) onMoveRef.current(pos.lat, pos.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Intentionally only run on mount; updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync lat/lng changes from parent (e.g. autocomplete selection).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLngLat([lng, lat]);
    map.easeTo({ center: [lng, lat], zoom: 15, duration: 500 });
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[300px] rounded-2xl overflow-hidden border border-arqos-gray-200"
    />
  );
}
