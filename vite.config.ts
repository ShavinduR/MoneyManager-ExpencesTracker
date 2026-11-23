import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Mindset Finance Planner',
        short_name: 'Mindset',
        description: 'Local-first personal finance & mindset planner. Track months, debts, goals and reflections — offline.',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['finance', 'productivity', 'lifestyle'],
        shortcuts: [
          { name: 'This month', short_name: 'Monthly', url: '/monthly', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Debts & payoff simulator', short_name: 'Debts', url: '/debts', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
          { name: 'Summary of the year', short_name: 'Summary', url: '/summary', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Lazy route chunks (Debts, Year Summary, Recharts) are precached too, so they open offline.
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
