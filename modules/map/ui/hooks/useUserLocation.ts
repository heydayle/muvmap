import { useState, useCallback } from 'react';

/**
 * Possible states for the user geolocation flow.
 */
export type UserLocationStatus =
  | 'idle'
  | 'requesting'
  | 'success'
  | 'denied'
  | 'unsupported';

/**
 * State returned by the useUserLocation hook.
 */
export interface UseUserLocationState {
  /** [longitude, latitude] when status is 'success', null otherwise */
  position: [number, number] | null;
  /** Accuracy in metres when status is 'success', null otherwise */
  accuracy: number | null;
  /** Current geolocation status */
  status: UserLocationStatus;
  /** Human-readable error message if denied or unsupported */
  errorMessage: string | null;
  /** Triggers a geolocation request. No-op if already requesting. */
  requestLocation: () => void;
}

/**
 * useUserLocation wraps the browser Geolocation API.
 * Requesting is lazy — geolocation is only triggered when the user
 * explicitly clicks "Locate Me" (Story 3: `user_location_enabled`).
 *
 * @returns Location state and requestLocation trigger
 */
export function useUserLocation(): UseUserLocationState {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      setErrorMessage('Geolocation is not supported by this browser.');
      return;
    }

    if (status === 'requesting') return;

    setStatus('requesting');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        setPosition([lng, lat]);
        setAccuracy(pos.coords.accuracy);
        setStatus('success');
      },
      (err) => {
        setStatus('denied');
        setErrorMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Please allow location in your browser settings.'
            : 'Could not determine your location. Please try again.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, [status]);

  return { position, accuracy, status, errorMessage, requestLocation };
}
