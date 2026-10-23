import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5505,
    host: '127.0.0.1',
    proxy: {
      '/hardhat': {
        target: 'http://127.0.0.1:8545',
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
});
