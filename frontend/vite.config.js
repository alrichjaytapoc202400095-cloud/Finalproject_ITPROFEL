import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the /api proxy points at the Express API so no CORS setup is needed locally.
export default defineConfig({
  plugins: [react()],
  // Pre-bundle the app's runtime dependencies at startup so the very first
  // page load does not hit a mid-session dependency re-optimization (which
  // shows up as a failed request until the browser is reloaded).
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
