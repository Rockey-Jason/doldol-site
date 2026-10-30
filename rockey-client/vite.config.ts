import { defineConfig } from 'vite';

export default defineConfig({
  base: '/doldol-site/rockey/',
  build: {
    outDir: '../rockey',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022'
  },
  server: { host: '0.0.0.0', port: 5173 }
});