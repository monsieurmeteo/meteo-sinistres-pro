import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api-meteo': {
        target: 'https://public-api.meteofrance.fr/public/DPObs/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-meteo/, '')
      },
      '/api-meteo-clim': {
        target: 'https://public-api.meteofrance.fr/public/DPClim/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-meteo-clim/, '')
      }
    }
  }
});
