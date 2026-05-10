'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * Props for the UserLocationDot component.
 */
export interface UserLocationDotProps {
  /** MapLibre map instance */
  map: maplibregl.Map | null;
  /** User's position as [longitude, latitude] */
  position: [number, number] | null;
}

/**
 * UserLocationDot injects a pulsing blue dot marker on the map
 * at the user's GPS position (Story 3: `user_location_enabled`).
 *
 * Renders nothing in the DOM — all output is direct MapLibre DOM injection.
 * Cleans up the marker on position change or unmount.
 *
 * @param props - UserLocationDotProps
 * @returns null (no React DOM output)
 */
export default function UserLocationDot({ map, position }: UserLocationDotProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !position) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const el = document.createElement('div');
    el.setAttribute('aria-label', 'Your location');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.position = 'relative';

    el.innerHTML = `
      <style>
        @keyframes locationPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(2); opacity: 0; }
        }
      </style>
      <div style="
        position: absolute; inset: 0;
        border-radius: 50%;
        background: rgba(0, 123, 255, 0.25);
        animation: locationPulse 2s ease-in-out infinite;
      "></div>
      <div style="
        position: absolute; inset: 4px;
        border-radius: 50%;
        background: #007BFF;
        border: 2.5px solid white;
        box-shadow: 0 0 8px rgba(0, 123, 255, 0.6);
      "></div>
    `;

    if (markerRef.current) {
      markerRef.current.setLngLat(position);
    } else {
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(position)
        .addTo(map);
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map, position]);

  return null;
}
