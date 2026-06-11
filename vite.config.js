import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/swagger-proxy': {
        target: 'https://localhost:7187',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/swagger-proxy/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
})
