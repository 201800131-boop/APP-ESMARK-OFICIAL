import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/utils/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/_node_modules/**', '**/dist/**', '**/.assistant-backup/**'],
    env: {
      VITE_SUPABASE_URL: 'https://testproject.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
