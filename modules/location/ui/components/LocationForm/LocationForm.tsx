'use client';

import React, { useState, useCallback } from 'react';
import { CreateLocationPayload, Location } from '../../../core/models/location';
import { MoodCategory } from '@/shared/types';
import TagInput from '../TagInput';
import MapPicker from '../MapPicker';
import Button from '@/shared/components/atoms/Button';
import { cn } from '@/shared/utils/cn';

/**
 * Mood options for the mood category select.
 */
const MOOD_OPTIONS: { value: MoodCategory; label: string; emoji: string }[] = [
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'happy', label: 'Happy', emoji: '😄' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'chill', label: 'Chill', emoji: '🧘' },
  { value: 'excited', label: 'Excited', emoji: '🔥' },
];

/**
 * Props for the LocationForm component.
 */
interface LocationFormProps {
  /** Existing location data for edit mode (null for create mode) */
  initialData?: Location | null;
  /** Callback when the form is submitted */
  onSubmit: (payload: CreateLocationPayload) => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Whether manual tagging is enabled (feature flag) */
  manualTaggingEnabled?: boolean;
  /** Whether geo input is enabled (feature flag) */
  geoEnabled?: boolean;
  /** Whether public visibility toggle is available (feature flag) */
  publicLocationEnabled?: boolean;
}

/** Shared input classes for consistency */
const inputClasses = cn(
  'w-full rounded-md border border-transparent bg-surface-elevated px-4 py-3 font-primary text-sm text-text-primary outline-none',
  'transition-all duration-200 ease-out',
  'placeholder:text-text-disabled',
  'focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,123,255,0.2),0_0_20px_rgba(0,123,255,0.1)]',
);

/** Shared label classes */
const labelClasses = 'text-[13px] font-medium uppercase tracking-wider text-text-secondary';

/**
 * LocationForm handles both creating and editing locations.
 * Fields include name, description, tags, mood category,
 * geo coordinates, and visibility toggle.
 *
 * Source: rules/features/location/flags.md Stories 1, 5, 6, 10
 *
 * @param props - LocationForm props
 * @returns The location form component
 */
export default function LocationForm({
  initialData = null,
  onSubmit,
  isSubmitting = false,
  manualTaggingEnabled = true,
  geoEnabled = true,
  publicLocationEnabled = false,
}: LocationFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [tags, setTags] = useState<string[]>(
    initialData?.tags.map((t) => t.name) ?? [],
  );
  const [moodCategory, setMoodCategory] = useState<MoodCategory | ''>(
    initialData?.mood_category ?? '',
  );
  const [latitude, setLatitude] = useState<number | null>(
    initialData?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialData?.longitude ?? null,
  );
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? false);

  /**
   * Handles map pin drop — updates latitude and longitude state.
   *
   * @param lat - Selected latitude
   * @param lng - Selected longitude
   */
  const handleMapSelect = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  /**
   * Handles form submission — validates, constructs payload, and calls onSubmit.
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) return;

      const payload: CreateLocationPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        mood_category: moodCategory || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        is_public: publicLocationEnabled ? isPublic : false,
      };

      onSubmit(payload);
    },
    [
      name,
      description,
      tags,
      moodCategory,
      latitude,
      longitude,
      isPublic,
      publicLocationEnabled,
      onSubmit,
    ],
  );

  const isEditMode = !!initialData;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-[600px] flex-col gap-6"
    >
      {/* Name field (required) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="location-name" className={labelClasses}>
          Name *
        </label>
        <input
          id="location-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Give this spot a name"
          required
          maxLength={150}
          className={inputClasses}
        />
      </div>

      {/* Description field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="location-description" className={labelClasses}>
          Description
        </label>
        <textarea
          id="location-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes this place special?"
          maxLength={2000}
          className={cn(inputClasses, 'min-h-[100px] resize-y')}
        />
      </div>

      {/* Mood category */}
      <div className="flex flex-col gap-1">
        <label htmlFor="location-mood" className={labelClasses}>
          Mood
        </label>
        <select
          id="location-mood"
          value={moodCategory}
          onChange={(e) =>
            setMoodCategory(e.target.value as MoodCategory | '')
          }
          className={inputClasses}
        >
          <option value="">Select a mood...</option>
          {MOOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.emoji} {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags (gated behind manual_tagging_enabled) */}
      {manualTaggingEnabled && (
        <div className="flex flex-col gap-1">
          <span className={labelClasses}>Tags</span>
          <TagInput
            tags={tags}
            onChange={setTags}
            placeholder="Add tags (press Enter)"
          />
        </div>
      )}

      {/* Map pin drop (gated behind location_geo_enabled) */}
      {geoEnabled && (
        <div className="flex flex-col gap-1">
          <span className={labelClasses}>Location on Map</span>
          <MapPicker
            latitude={latitude}
            longitude={longitude}
            onChange={handleMapSelect}
          />
        </div>
      )}

      {/* Visibility toggle (gated behind public_location_enabled) */}
      {publicLocationEnabled && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className={labelClasses}>Make Public</span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              aria-label="Toggle location visibility"
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="mt-2"
      >
        {isSubmitting
          ? 'Saving...'
          : isEditMode
            ? 'Update Spot'
            : 'Add Spot'}
      </Button>
    </form>
  );
}
