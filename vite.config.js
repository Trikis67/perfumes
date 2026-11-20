import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Rutas relativas: así funciona igual en GitHub Pages (usuario.github.io/repositorio/) o en un dominio propio.
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
        tienda: resolve(import.meta.dirname, 'tienda/index.html'),
      },
    },
  },
});
