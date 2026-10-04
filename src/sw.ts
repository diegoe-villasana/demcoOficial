/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from 'workbox-precaching';
import { getDB } from './db/schema';

// Precachea el app shell (JS/CSS/HTML generados por el build) para que la
// app cargue aunque no haya conexión. __WB_MANIFEST lo inyecta vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

const SYNC_TAG = 'sync-encuestas';
// vite-plugin-pwa bundlea este archivo con Vite, así que import.meta.env
// se reemplaza en build time igual que en el resto de la app.
const API_URL = import.meta.env.VITE_ENCUESTAS_API_URL as string | undefined;

async function sincronizarPendientes(): Promise<void> {
  const db = await getDB();
  const pendientes = await db.getAllFromIndex('respuestas', 'by-estado', 'pendiente');

  for (const respuesta of pendientes) {
    try {
      if (!API_URL) continue; // sin backend configurado, no hay a dónde enviar

      const res = await fetch(`${API_URL}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(respuesta),
      });

      if (res.ok) {
        await db.put('respuestas', { ...respuesta, estado: 'sincronizado' });
      }
    } catch {
      // Sigue sin haber conexión real; el navegador reintentará este evento
      // 'sync' automáticamente con backoff.
    }
  }

  // Avisa a las pestañas abiertas para que refresquen el contador de pendientes.
  const clientsList = await self.clients.matchAll();
  clientsList.forEach((client) => client.postMessage({ type: 'ENCUESTAS_SINCRONIZADAS' }));
}

self.addEventListener('sync', (event) => {
  const syncEvent = event as unknown as { tag: string; waitUntil: (p: Promise<unknown>) => void };
  if (syncEvent.tag === SYNC_TAG) {
    syncEvent.waitUntil(sincronizarPendientes());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_NOW') {
    event.waitUntil?.(sincronizarPendientes());
  }
});

self.skipWaiting();
