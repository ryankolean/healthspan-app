import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/healthspan-app/',  // GitHub Pages base path — change to '/' for custom domain
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
