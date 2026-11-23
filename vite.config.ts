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
      // 'prompt' (L11): a new version waits until the user chooses to reload, so nothing mid-edit is lost.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'theme-init.js'],
      manifest: {
        id: '/',
        name: 'Mindset Finance Planner',
        short_name: 'Mindset',
        description: 'Local-first personal finance & mindset planner. Track months, debts, goals and reflections — offline.',
        theme_color: '#0b0f14',
        background_color: '#fafafa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
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
        globIgnores: ['og-image.png'],
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
