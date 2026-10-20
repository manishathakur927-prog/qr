import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/myapp/',
  server: {
    proxy: {
      '/api': {
         target: 'https://qa.myalf.palsitecare.com/backend/public/index.php',
        changeOrigin: true,
      },
    },
  }, 
})
