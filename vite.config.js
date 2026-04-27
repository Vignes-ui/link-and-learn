import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// XAMPP Apache runs on port 80 by default.
// If you changed Apache to a different port (e.g. 8080) during setup,
// update the target below to match: e.g. 'http://localhost:8080'
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
