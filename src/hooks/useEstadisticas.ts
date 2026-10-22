import { useCallback, useEffect, useState } from 'react';
import { obtenerEstadisticas, type Estadisticas } from '../services/estadisticasService';
import { inicializarEncuestas } from '../services/encuestasService';
import { useOnlineStatus } from './useOnlineStatus';

// Carga el resumen agregado del módulo de encuestas. Lo comparten el
// dashboard y la lista de proyectos, así que vive en un hook y no en cada
// pantalla.

export function useEstadisticas() {
  const isOnline = useOnlineStatus();
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEstadisticas(await obtenerEstadisticas());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al volver la conexión recargamos: el caché local ya no refleja el servidor.
  useEffect(() => {
    if (isOnline) cargar();
  }, [isOnline, cargar]);

  // Deja el caché local al día: es lo que permite que estas pantallas
  // siga mostrando datos cuando se cae la conexión.
  useEffect(() => {
    inicializarEncuestas().catch(() => undefined);
  }, []);

  return { estadisticas, cargando, error, recargar: cargar, isOnline };
}
