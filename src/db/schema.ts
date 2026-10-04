import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Pregunta {
  id: string;
  texto: string;
  tipo: 'texto' | 'opcion_multiple' | 'escala' | 'matriz';
  opciones?: string[];
  columnas?: string[];
}

// Encuesta tal como la ve la app: la versión activa aplanada por el backend,
// más metadata para mostrar "v3 · 6 respuestas" y para saber si se puede
// editar en sitio (sellada=false) o hay que crear versión nueva (sellada=true).
export interface Encuesta {
  id: string;
  titulo: string;
  descripcion?: string;
  preguntas: Pregunta[];
  versionId?: string;
  versionNumero?: number;
  sellada?: boolean;
  totalRespuestas?: number;
}

// Historial de versiones que devuelve GET /:id/versiones.
export interface VersionHistorial {
  id: string;
  numero: number;
  titulo: string;
  descripcion?: string;
  preguntas: Pregunta[];
  creadaEn: string;
  sellada: boolean;
  totalRespuestas: number;
}

export interface RespuestaEncuesta {
  id: string; // uuid generado en el cliente
  encuestaId: string;
  respuestas: Record<string, string | number>;
  fechaRespuesta: string; // ISO string
  versionId?: string; // versión que el usuario vio al responder
  estado: 'pendiente' | 'sincronizado';
}

interface DemcoDB extends DBSchema {
  encuestas: {
    key: string;
    value: Encuesta;
  };
  respuestas: {
    key: string;
    value: RespuestaEncuesta;
    indexes: { 'by-estado': string };
  };
}

const DB_NAME = 'demco-encuestas-db';
const DB_VERSION = 1;

// Este archivo lo importan TANTO la app (main bundle) COMO el service worker
// (src/sw.ts), así el esquema de la base nunca queda desincronizado entre los dos.
export function getDB(): Promise<IDBPDatabase<DemcoDB>> {
  return openDB<DemcoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('encuestas')) {
        db.createObjectStore('encuestas', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('respuestas')) {
        const store = db.createObjectStore('respuestas', { keyPath: 'id' });
        store.createIndex('by-estado', 'estado');
      }
    },
  });
}
