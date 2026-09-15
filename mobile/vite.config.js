import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Dealer App entry
        dealer: resolve(__dirname, 'dealer.html'),
        // Kabadiwala Lite App entry
        'kabadiwala-lite': resolve(__dirname, 'kabadiwala-lite.html'),
      }
    }
  }
});
