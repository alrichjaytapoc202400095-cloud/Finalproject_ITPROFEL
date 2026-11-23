import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// In development the /api proxy points at the Express API so no CORS setup is
// needed locally. In production VITE_API_BASE_URL points at the deployed API.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration is handled manually in src/main.jsx so the app can react
      // to the "offline ready" event.
      injectRegister: false,
      // globPatterns below already covers favicon.svg, icons and the manifest.
      manifest: {
        id: '/',
        name: 'SPC Book Store',
        short_name: 'SPC Books',
        description:
          'The St. Peter\u2019s College campus bookstore. Find required textbooks, reserve campus pickup, and pay securely.',
        lang: 'en',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        background_color: '#f6f3ee',
        theme_color: '#5c111c',
        categories: ['books', 'education', 'shopping'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Browse the catalog',
            short_name: 'Catalog',
            url: '/products',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'My orders',
            short_name: 'Orders',
            url: '/orders',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // App shell precache: HTML, JS, CSS, icons and the manifest.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Never let a navigation request for the API fall through to index.html.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Read-only catalog GETs: fresh when online, cached copy offline.
            // Auth, cart, checkout, orders, AI and admin requests are NOT
            // matched here, so they are never cached by the service worker.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /^\/api\/v1\/(products|categories|pickup-slots)(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'spc-catalog-v1',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Remote book covers and local icons.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'spc-images-v1',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
  preview: {
    port: 4173,
    // Mirror the dev proxy so `vite preview` can exercise the real API when
    // VITE_API_BASE_URL is left empty (local smoke tests only).
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
