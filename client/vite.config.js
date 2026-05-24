import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Rewrite /api/* → http://localhost:3001/api/* during development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    // Use jsdom to simulate a browser environment for React components
    environment: 'jsdom',
    // Make describe/test/expect/vi available without importing them
    globals: true,
    // Load jest-dom matchers (toBeInTheDocument, toBeDisabled, etc.) before every file
    setupFiles: ['./src/tests/setup.js'],
  },
})
