import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En développement, l'API Express tourne sur le port 4000.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
