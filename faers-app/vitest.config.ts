import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'out'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'out',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts'
      ]
    },
    // Use different setup files based on test type
    environmentMatchGlobs: [
      // React component tests use jsdom
      ['src/renderer/**/*.test.tsx', 'jsdom'],
      // Backend tests use node
      ['src/main/**/*.test.ts', 'node']
    ],
    setupFiles: ['./src/test/setup.ts']
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer')
    }
  }
});
