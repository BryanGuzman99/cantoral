import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // rutas relativas: funciona en GitHub Pages sin importar el nombre del repositorio
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Cantoral Católico',
        short_name: 'Cantoral',
        description: 'Letras y acordes con cambio de tono, sin conexión a internet',
        lang: 'es',
        display: 'standalone', // en iPhone esto es lo que evita el borrado de datos por inactividad de Safari
        start_url: './',
        scope: './',
        background_color: '#f2f8f6',
        theme_color: '#0f766e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'] },
    }),
  ],
  test: { environment: 'node' },
});
