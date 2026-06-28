import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/rooms': {
        target: 'http://localhost:3000',
        ws: true,
      },
      '/ws/hocus': {
        target: 'http://localhost:1234',
        ws: true,
        rewrite: (path) => path.replace(/^\/ws\/hocus/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
});
