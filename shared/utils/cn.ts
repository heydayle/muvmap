import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names with conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge
 * for accurate Tailwind class overriding.
 *
 * @param inputs - Class values to merge (strings, arrays, objects)
 * @returns Merged class string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
