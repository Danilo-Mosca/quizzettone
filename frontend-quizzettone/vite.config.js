import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

/********** Oppure invece del comando "npm run dev -- --host" aggiungere la chiave server da tornare al defineConfig come di seguito:
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  }
})
************/
