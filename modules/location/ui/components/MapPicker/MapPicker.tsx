'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/shared/utils/cn';

/**
 * OpenFreeMap liberty style URL — the default muted style.
 * Available styles: liberty, bright, positron
 * Free, no API key required, uses OpenStreetMap data.
 * @see https://openfreemap.org/quick_start/
 */
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Default map center (Bangkok) when no initial coordinates are provided.
 */
const DEFAULT_CENTER: [number, number] = [100.5018, 13.7563];

/** Default zoom level */
const DEFAULT_ZOOM = 12;

/**
 * Props for the MapPicker component.
 */
interface MapPickerProps {
  /** Current latitude value */
  latitude: number | null;
  /** Current longitude value */
  longitude: number | null;
  /** Callback when the user selects a location on the map */
  onChange: (lat: number, lng: number) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

/**
 * MapPicker renders a dark-themed map for selecting locations
 * via click (pin drop) using MapLibre GL + OpenFreeMap tiles.
 *
 * Completely free — no API key, no usage limits.
 *
 * Source: rules/features/location/flags.md Story 6
 * - Coordinates captured via map pin drop or device geolocation
 * - Lat/lng validated for range (lat: -90..90, lng: -180..180)
 * - Stored with 6 decimal places precision
 *
 * Source: rules/design.md §6 (Map UI)
 * - Dark theme matching #0A0F1C background
 * - Glassmorphic controls overlay
 *
 * @param props - MapPicker props
 * @returns The map picker component
 */
export default function MapPicker({
  latitude,
  longitude,
  onChange,
  disabled = false,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [hasPin, setHasPin] = useState(
    latitude !== null && longitude !== null,
  );

  /**
   * Creates a custom marker DOM element with electric blue styling.
   *
   * @returns HTMLDivElement styled as a map pin
   */
  const createMarkerElement = useCallback((): HTMLDivElement => {
    const el = document.createElement('div');
    el.style.width = '36px';
    el.style.height = '48px';
    el.style.cursor = 'grab';
    el.style.filter = 'drop-shadow(0 2px 6px rgba(0, 123, 255, 0.5))';
    el.style.transition = 'filter 0.2s ease';
    el.style.animation = 'pinDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48">
        <defs>
          <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#3B9EFF"/>
            <stop offset="100%" stop-color="#007BFF"/>
          </linearGradient>
        </defs>
        <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 16.2 28.4 16.88 29.12a1.5 1.5 0 0 0 2.24 0C19.8 46.4 36 30.6 36 18 36 8.06 27.94 0 18 0z"
              fill="url(#pinGrad)" stroke="white" stroke-width="2"/>
        <circle cx="18" cy="18" r="7" fill="white" opacity="0.95"/>
        <circle cx="18" cy="18" r="3.5" fill="#007BFF"/>
      </svg>
    `;

    return el;
  }, []);

  /**
   * Places or moves the marker on the map.
   *
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   */
  const placeMarker = useCallback(
    (lng: number, lat: number) => {
      if (!mapRef.current) return;

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({
          element: createMarkerElement(),
          draggable: !disabled,
          anchor: 'bottom',
        })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);

        markerRef.current.on('dragend', () => {
          const lngLat = markerRef.current!.getLngLat();
          onChange(
            parseFloat(lngLat.lat.toFixed(6)),
            parseFloat(lngLat.lng.toFixed(6)),
          );
        });
      }

      setHasPin(true);
    },
    [disabled, onChange, createMarkerElement],
  );

  /**
   * Initializes the MapLibre GL map on mount using OpenFreeMap tiles.
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const center: [number, number] =
      longitude !== null && latitude !== null
        ? [longitude, latitude]
        : DEFAULT_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-left',
    );

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    mapRef.current = map;

    // Place initial marker if coords are provided
    if (latitude !== null && longitude !== null) {
      map.on('load', () => {
        placeMarker(longitude, latitude);
      });
    }

    // Click to place/move marker
    map.on('click', (e) => {
      if (disabled) return;
      const lat = parseFloat(e.lngLat.lat.toFixed(6));
      const lng = parseFloat(e.lngLat.lng.toFixed(6));
      placeMarker(lng, lat);
      onChange(lat, lng);
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // Map init runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Map initialization must run exactly once on mount to avoid re-creating the MapLibre instance
  }, []);

  /**
   * Syncs the marker position when lat/lng props change externally.
   */
  useEffect(() => {
    if (latitude !== null && longitude !== null && mapRef.current) {
      placeMarker(longitude, latitude);
    }
  }, [latitude, longitude, placeMarker]);

  /**
   * Handles "Use my location" GPS button click.
   * Uses the Geolocation API to fly to the user's current position.
   */
  const handleGpsLocate = useCallback(() => {
    if (!navigator.geolocation || disabled) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1500,
          });
        }

        placeMarker(lng, lat);
        onChange(lat, lng);
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [disabled, onChange, placeMarker]);

  return (
    <div
      className={cn(
        'relative h-[300px] w-full cursor-crosshair overflow-hidden rounded-lg border border-border-glass',
        /* MapLibre control overrides for dark theme */
        '[&_.maplibregl-ctrl-bottom-left]:hidden [&_.maplibregl-ctrl-bottom-right]:hidden',
        '[&_.maplibregl-ctrl-group]:!rounded-sm [&_.maplibregl-ctrl-group]:!border [&_.maplibregl-ctrl-group]:!border-border-glass [&_.maplibregl-ctrl-group]:!bg-surface-glass [&_.maplibregl-ctrl-group]:backdrop-blur-[16px]',
        '[&_.maplibregl-ctrl-group_button]:!border-border-glass [&_.maplibregl-ctrl-group_button]:!bg-transparent',
        '[&_.maplibregl-ctrl-group_button+button]:!border-t [&_.maplibregl-ctrl-group_button+button]:!border-t-border-glass',
        '[&_.maplibregl-ctrl-group_button_span]:invert',
        '[&_.maplibregl-ctrl-attrib]:!bg-surface-glass [&_.maplibregl-ctrl-attrib]:text-[10px] [&_.maplibregl-ctrl-attrib]:text-text-tertiary [&_.maplibregl-ctrl-attrib]:backdrop-blur-[16px]',
        '[&_.maplibregl-ctrl-attrib_a]:text-text-secondary',
      )}
    >
      <div ref={containerRef} className="h-full w-full" />

      {!hasPin && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-pill border border-border-glass bg-surface-glass px-4 py-2 text-[13px] text-text-secondary backdrop-blur-[16px]">
          📍 Click on the map to drop a pin
        </div>
      )}

      <button
        type="button"
        onClick={handleGpsLocate}
        title="Use my location"
        aria-label="Use my current GPS location"
        className={cn(
          'absolute top-2.5 right-2.5 z-10 flex h-9 w-9 cursor-pointer items-center justify-center',
          'rounded-sm border border-border-glass bg-surface-glass text-lg text-text-secondary backdrop-blur-[16px]',
          'transition-colors duration-200 ease-out',
          'hover:border-primary hover:text-primary',
        )}
      >
        📡
      </button>

      {latitude !== null && longitude !== null && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 flex items-center justify-between border-t border-border-glass bg-surface-glass px-3.5 py-2 text-xs text-text-secondary backdrop-blur-[16px]">
          <span>
            Lat:{' '}
            <span className="font-mono text-xs font-medium text-primary-light">
              {latitude.toFixed(6)}
            </span>
          </span>
          <span>
            Lng:{' '}
            <span className="font-mono text-xs font-medium text-primary-light">
              {longitude.toFixed(6)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
