import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['blip_logo.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15MB to allow TensorFlow models
      },
      manifest: {
        name: 'Blip Secure Messenger',
        short_name: 'Blip',
        description: 'Secure, private, 1-to-1 messaging app.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'blip_logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'blip_logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  define: {
    global: 'window',
    'process.env': {}
  },
  server: {
    host: true
  }
})
