import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // app shell only sir — never cache /api/v1/* responses. This app runs auth cookies,
      // live credit balances, and payment state through those routes; a stale cached
      // response would show wrong data or break CSRF, so all API calls always hit the
      // network. Only the built JS/CSS/HTML/icons are precached for offline/instant load.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      manifest: {
        name: 'Notewise — AI Notes Summarizer',
        short_name: 'Notewise',
        description: 'Summarize notes, chat with your documents, and study with AI-generated flashcards and quizzes.',
        theme_color: '#0b0e17',
        background_color: '#0b0e17',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
