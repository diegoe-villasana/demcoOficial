import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest nos deja escribir nuestro propio service worker
      // (src/sw.ts) con lógica custom de Background Sync, en vez de que
      // Workbox genere uno automático solo de cacheo.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'auto',
      manifest: {
        name: 'DEMCO',
        short_name: 'DEMCO',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#008751',
        icons: [],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
