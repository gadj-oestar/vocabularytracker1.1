import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Le front (port 5173) et le serveur (port 3001) sont deux programmes séparés.
    // Ici, Vite relaie tout ce qui commence par /api vers le serveur : le navigateur ne voit qu'un seul site.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
