import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/wordquest.svg'],
      manifest: {
        name: 'WordQuest 英语单词游戏库',
        short_name: 'WordQuest',
        description: '面向中国小学高年级和初中学生的英语单词游戏库。',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [{
          src: '/icons/wordquest.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: { host: '0.0.0.0' },
  preview: { host: '127.0.0.1' }
});