import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Pico Block Coding',
        short_name: 'PicoBlock',
        description: '오프라인 마이크로파이썬 코딩 에디터',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  define: {
    // 브라우저 환경에서 'process'를 찾을 때 에러가 나지 않도록 빈 객체로 정의
    'process.env': {},
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify(''),
  },
  server: {
    open: true, // 서버 시작 시 브라우저 자동 오픈
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
