import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,   // mesma porta que o CRA usava (mantém o CORS/FRONTEND_URL do backend válido)
    open: true,
  },

  // Mantém a pasta de saída como "build" (igual ao CRA e já ignorada no .gitignore).
  // Se preferir o padrão do Vite, troque para "dist".
  build: {
    outDir: 'build',
  },

  // Configuração de testes (Vitest) — substitui o "react-scripts test".
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    css: true,
  },
});
