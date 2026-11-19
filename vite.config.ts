import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const THEME = '#f7f1e8';

// `vite build --mode pages` targets https://rotmanss.github.io/EasyDough/
export default defineConfig(({ mode }) => {
  const base = mode === 'pages' ? '/EasyDough/' : '/';
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'EasyDough — Sourdough Calculator',
          short_name: 'EasyDough',
          description: 'Sourdough calculator: recipe, levain and starter in grams.',
          lang: 'en',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: THEME,
          theme_color: THEME,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        },
      }),
    ],
  };
});
