/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Wine Discovery',
        short_name: 'Wine',
        description: 'Find wines you’ll actually like, in plain language.',
        theme_color: '#7a1f3d',
        background_color: '#faf5ec',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Keep first-install light on weak connections: skip non-Latin font subsets
        // (browsers still fetch them on demand via unicode-range if ever needed).
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', 'samples/**'],
        // Bottle photos are cached the first time they're viewed, not downloaded up front.
        runtimeCaching: [{ urlPattern: /\/bottles\/.+\.jpg$/, handler: 'CacheFirst', options: { cacheName: 'bottle-photos', expiration: { maxEntries: 60 } } }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Tests run on the made-up sample bottles, so they don't change when the real catalog does.
    env: { VITE_CATALOG: 'sample' },
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
