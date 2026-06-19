import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      // Comprimir imágenes en /public también
      includePublic: true,
      // Configuración por formato
      png: {
        quality: 82,
      },
      jpg: {
        quality: 82,
      },
      webp: {
        lossless: false,
        quality: 82,
        alphaQuality: 90,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separar vendors grandes en chunks independientes para mejor cache
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['react-icons'],
        },
      },
    },
  },
});
