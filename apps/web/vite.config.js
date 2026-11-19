import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// envDir apunta a la raíz del monorepo para compartir un único archivo .env
export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  server: { port: 5173 },
});
