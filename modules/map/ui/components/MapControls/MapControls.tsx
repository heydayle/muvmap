'use client';

import { cn } from '@/shared/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';
import { UserLocationStatus } from '../../hooks/useUserLocation';

/**
 * Props for the MapControls component.
 */
export interface MapControlsProps {
  /** Whether heatmap overlay is currently visible */
  heatmapActive: boolean;
  /** Whether 3D mode is currently active */
  is3DActive: boolean;
  /** Geolocation status for the "Locate Me" button */
  locationStatus: UserLocationStatus;
  /** Feature flags controlling which buttons are shown */
  flags: {
    user_location_enabled: boolean;
    heatmap_enabled: boolean;
    map_3d_enabled: boolean;
  };
  /** Called to toggle the heatmap overlay */
  onToggleHeatmap: () => void;
  /** Called to toggle 3D mode */
  onToggle3D: () => void;
  /** Called to trigger GPS location */
  onLocateMe: () => void;
}

/**
 * A single glassmorphic control button.
 */
function ControlButton({
  id,
  label,
  emoji,
  active,
  loading,
  onClick,
}: {
  id: string;
  label: string;
  emoji: string;
  active?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      id={id}
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px]',
        'border text-base transition-all duration-200',
        active
          ? 'border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(0,123,255,0.35)]'
          : 'border-border-glass bg-surface-glass text-text-secondary backdrop-blur-[16px]',
        'hover:border-primary/60 hover:text-white',
      )}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-glass border-t-primary" />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </motion.button>
  );
}

/**
 * MapControls renders a floating glassmorphic control panel for the map.
 * Conditionally shows buttons based on feature flags.
 *
 * Position: top-right, floating above the map canvas.
 *
 * @param props - MapControlsProps
 * @returns Control panel JSX
 */
export default function MapControls({
  heatmapActive,
  is3DActive,
  locationStatus,
  flags,
  onToggleHeatmap,
  onToggle3D,
  onLocateMe,
}: MapControlsProps) {
  const hasAnyControl =
    flags.user_location_enabled ||
    flags.heatmap_enabled ||
    flags.map_3d_enabled;

  if (!hasAnyControl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.3 }}
        className="absolute right-4 bottom-4 z-30 flex flex-col gap-2"
        aria-label="Map controls"
      >
        {flags.user_location_enabled && (
          <ControlButton
            id="map-control-locate"
            label="Use my location"
            emoji="📍"
            loading={locationStatus === 'requesting'}
            active={locationStatus === 'success'}
            onClick={onLocateMe}
          />
        )}

        {flags.heatmap_enabled && (
          <ControlButton
            id="map-control-heatmap"
            label="Toggle heatmap"
            emoji="🔥"
            active={heatmapActive}
            onClick={onToggleHeatmap}
          />
        )}

        {flags.map_3d_enabled && (
          <ControlButton
            id="map-control-3d"
            label="Toggle 3D mode"
            emoji="🏔️"
            active={is3DActive}
            onClick={onToggle3D}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
