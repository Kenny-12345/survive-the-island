import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: here,
  envDir: path.resolve(here, '..'),
  plugins: [react()],
  css: { postcss: path.resolve(here, 'postcss.config.cjs') },
  server: {
    port: 5173,
    host: true,
    fs: { allow: [path.resolve(here, '..')] },
    proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true }, '/api': 'http://localhost:3001' },
  },
  build: { outDir: path.resolve(here, 'dist'), emptyOutDir: true },
});
