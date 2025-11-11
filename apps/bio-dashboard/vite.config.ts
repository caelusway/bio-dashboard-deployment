import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 3000,
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
