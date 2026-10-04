import { useCallback, useEffect, useState } from 'react';
import { intentarSincronizar, obtenerRespuestasPendientes } from '../services/encuestasService';
import { useOnlineStatus } from './useOnlineStatus';

// Fallback tipo "cron" mientras la pestaña está abierta: reintenta cada 30s.
// Esto cubre navegadores sin Background Sync API (Safari, Firefox de escritorio).
const INTERVALO_REINTENTO_MS = 30_000;

export function useSyncEncuestas() {
  const isOnline = useOnlineStatus();
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescarPendientes = useCallback(async () => {
    const lista = await obtenerRespuestasPendientes();
    setPendientes(lista.length);
  }, []);

  const sincronizarAhora = useCallback(async () => {
    if (!navigator.onLine) return;
    setSincronizando(true);
    await intentarSincronizar();
    await refrescarPendientes();
    setSincronizando(false);
  }, [refrescarPendientes]);

  useEffect(() => {
    refrescarPendientes();
  }, [refrescarPendientes]);

  // Reintenta apenas vuelve la conexión (evento 'online' del navegador).
  useEffect(() => {
    if (isOnline) sincronizarAhora();
  }, [isOnline, sincronizarAhora]);

  // Reintento periódico mientras la app está abierta (fallback de "cron").
  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) sincronizarAhora();
    }, INTERVALO_REINTENTO_MS);
    return () => clearInterval(id);
  }, [sincronizarAhora]);

  // Cuando el Service Worker sincroniza en segundo plano (Background Sync,
  // app cerrada o en background), nos avisa por postMessage.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ENCUESTAS_SINCRONIZADAS') {
        refrescarPendientes();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [refrescarPendientes]);

  return { isOnline, pendientes, sincronizando, sincronizarAhora };
}
