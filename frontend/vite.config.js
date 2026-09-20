import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // 3001 est réservé à l'auth-service : le front écoute sur le port Vite par défaut.
    port: 5173,
    proxy: {
      // Tout /api part vers l'API Gateway, qui répartit vers les microservices.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})