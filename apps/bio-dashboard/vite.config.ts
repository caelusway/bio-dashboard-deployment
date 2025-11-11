import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/v1': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
  },
});
