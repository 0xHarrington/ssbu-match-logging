import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/log_game': 'http://localhost:5000',
      '/add_game': 'http://localhost:5000',
      '/matchup_stats': 'http://localhost:5000',
    }
  }
})