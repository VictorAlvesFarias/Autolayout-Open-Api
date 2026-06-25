import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react()
  ],
  base: '/Autolayout/',
  assetsInclude: ['**/*.svg'],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      
      external(id) {
        const externalModules = ['auto.config', 'environment']
      
        return externalModules.includes(id)
      },
      output: {
        format: 'es',
        paths(id) {
          if (id.includes('environment')) {
            return '../environment.js'
          }
          
          if (id.includes('auto.config')) {
            return '../auto.config.js'
          }

          return id
        },
        entryFileNames: 'source/[name].js',
        chunkFileNames: 'source/[name].js',
        assetFileNames: 'source/[name].[ext]'
      }
    }
  }
})
