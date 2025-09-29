import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Default React plugin configuration — keep it simple for React 18
    react(),
  ],
})
