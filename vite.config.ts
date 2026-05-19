import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  optimizeDeps: {},
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin', // sql.js WASM 需要 SharedArrayBuffer
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});

