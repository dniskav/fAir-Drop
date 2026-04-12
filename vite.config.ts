import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER_PORT = Number(process.env.SERVER_PORT) || Number(process.env.PORT) || 3002
const DEV_PORT = Number(process.env.VITE_PORT) || 3002

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },

  // Los archivos de public/ (style.css) se sirven como assets estáticos
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    // Allow binding to the local network so other devices can reach the dev server
    // `true` tells Vite to listen on all addresses (0.0.0.0)
    host: true,
    port: DEV_PORT,
    proxy: {
      // API REST → Express (usar el mismo puerto que `server.js`)
      '/api': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
      // Página de status → Express
      '/status': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
      // WebSocket de signaling → Express
      '/ws': {
        target: `ws://localhost:${SERVER_PORT}`,
        ws: true,
      },
    },
  },
})
