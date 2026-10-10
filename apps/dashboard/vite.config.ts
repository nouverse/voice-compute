import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:8880',
        changeOrigin: true,
      },
      '/temp': {
        target: 'http://127.0.0.1:8880',
        changeOrigin: true,
      },
      '/status': {
        target: 'http://127.0.0.1:8880',
        changeOrigin: true,
      },
    },
  },
});
