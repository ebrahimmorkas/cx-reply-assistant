import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Reads .env from the project root (one level up), so the frontend
  // shares the same .env file as the ingestion scripts instead of
  // needing a second copy of the same secrets inside web/.
  envDir: '../',
})