import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BASE = process.env.VITE_BASE || '/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: BASE,
  server: {
    proxy: {
      [`${BASE}api`]: {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
