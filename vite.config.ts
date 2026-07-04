import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served as a GitHub Pages project site (https://waytaapp.github.io/wayta-ai-studio/).
// The Node server (server.ts) serves the same bundle from / when self-hosted, so the
// base can be overridden with VITE_BASE_PATH=/ for Cloud Run builds.
const BASE_PATH = process.env.VITE_BASE_PATH || '/wayta-ai-studio/';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: BASE_PATH,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-192.svg', 'pwa-512.svg', 'icons.svg'],
        manifest: {
          name: 'Wayta — Order & Pay',
          short_name: 'Wayta',
          description: 'Order & Pay Throughput Engine',
          theme_color: '#059669',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: BASE_PATH,
          scope: BASE_PATH,
          lang: 'en',
          categories: ['food', 'drink', 'lifestyle'],
          icons: [
            { src: 'pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' },
            {
              src: 'pwa-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                networkTimeoutSeconds: 5,
              },
            },
            {
              urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'worker_threads': path.resolve(__dirname, 'src/empty.ts'),
      },
    },
    server: {
      hmr: false,
      watch: {
        usePolling: true
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/firestore'],
            socket: ['socket.io-client'],
            vendor: ['react', 'react-dom', 'motion/react', 'lucide-react', 'recharts']
          }
        }
      }
    },
  };
});
