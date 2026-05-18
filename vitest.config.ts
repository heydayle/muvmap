import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    /** CSS imports are irrelevant in unit tests — skip processing */
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.config.*',
        '**/*.d.ts',
        'vitest.setup.ts',
        '__mocks__/',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
  resolve: {
    alias: {
      /** App path alias */
      '@': path.resolve(__dirname, './'),
      /**
       * Stub browser-only libs so unit tests don't crash in jsdom.
       * These aliases apply at Vite's import-analysis stage (transform time),
       * which is why they must live in resolve.alias, not test.alias.
       */
      'framer-motion': path.resolve(__dirname, './__mocks__/framer-motion.tsx'),
      'maplibre-gl': path.resolve(__dirname, './__mocks__/maplibre-gl.ts'),
      'maplibre-gl/dist/maplibre-gl.css': path.resolve(__dirname, './__mocks__/empty.css'),
    },
  },
});

