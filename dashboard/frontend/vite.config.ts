import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Puerto fijo distinto a los otros proyectos del usuario (5173 app de mascotas, 5180 secop-agentes).
  server: { port: 5190, strictPort: true },
})
