import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        fotos: resolve(import.meta.dirname, 'fotos.html'),
      },
    },
  },
})
