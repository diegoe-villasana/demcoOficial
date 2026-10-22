import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Catálogo completo de tipos de pregunta soportados. Las máscaras (predefinidas)
// traen su contenido listo y sólo hay que editar el texto; el resto se arma
// con opciones / filas / columnas.
export type TipoPregunta =
  // Predefinidas (máscaras)
  | 'genero'
  | 'si_no'
  | 'idioma'
  | 'ranking'
  // Respuesta única
  | 'opcion_unica'
  | 'opcion_unica_comentario'
  | 'desplegable'
  | 'escala'
  | 'escala_n'
  // Opción múltiple
  | 'opcion_multiple'
  | 'opcion_multiple_comentario'
  // Texto libre
  | 'texto'
  | 'texto_linea'
  | 'texto_parrafos'
  | 'textos_multiples'
  // Numéricos y fecha
  | 'numero'
  | 'numero_multiple'
  | 'fecha'
  // Matrices
  | 'matriz'
  | 'matriz_escala'
  | 'matriz_aumentar'
  | 'matriz_sino'
  | 'matriz_texto'
  | 'matriz_numero'
  | 'matriz_doble_eje'
  | 'matriz_columnas'
  // Especiales
  | 'archivo'
  | 'mostrar_texto';

// Formato de respuesta de las preguntas numéricas (sustituye a "Ecuación",
// que en el .docx sólo servía para forzar un valor numérico).
export type FormatoNumero = 'entero' | 'decimal' | 'porcentaje' | 'moneda';

// Una sección divide la encuesta en tramos ("sección 1", "Datos generales",
// etc.). Las preguntas apuntan a su sección con `seccionId`; las que no
// tienen sección se muestran al final, sin encabezado.
export interface Seccion {
  id: string;
  titulo: string;
  descripcion?: string;
}

export interface Pregunta {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  /** Sección a la que pertenece la pregunta (opcional). */
  seccionId?: string;
  /** Opciones de respuesta. En matrices son las filas. */
  opciones?: string[];
  /** Columnas de la matriz. En `matriz_columnas` son los ítems a calificar. */
  columnas?: string[];
  obligatorio?: boolean;
  placeholder?: string;
  /** Límites de las escalas y preguntas numéricas. */
  minimo?: number;
  maximo?: number;
  formato?: FormatoNumero;
  /** Puntos de la matriz de doble eje. */
  puntos?: number;
  /** Extremos de la matriz de doble eje y del ranking. */
  ejeIzquierdo?: string;
  ejeDerecho?: string;
  /** Opción libre "Otro" en las de opción múltiple. */
  otro?: boolean;
  variosArchivos?: boolean;
  extensiones?: string[];
  /** Tamaño máximo por archivo, en MB. */
  tamanoMaximo?: number;
}

// Una respuesta puede ser un valor simple, una lista (opción múltiple,
// ranking) o un mapa con una clave por sub-elemento (doble eje, archivos).
export type ValorRespuesta = string | number | string[] | Record<string, string>;

// Encuesta tal como la ve la app: la versión activa aplanada por el backend,
// más metadata para mostrar "v3 · 6 respuestas" y para saber si se puede
// editar en sitio (sellada=false) o hay que crear versión nueva (sellada=true).
export interface Encuesta {
  id: string;
  titulo: string;
  descripcion?: string;
  preguntas: Pregunta[];
  secciones?: Seccion[];
  versionId?: string;
  versionNumero?: number;
  sellada?: boolean;
  totalRespuestas?: number;
  /** Fecha de creación de la encuesta (la envía el backend). */
  creadaEn?: string;
  /** Fecha de la última respuesta recibida (la envía el backend). */
  ultimaRespuesta?: string | null;
  /** Destinatarios que recibieron la encuesta por correo (lo envía el backend). */
  correosEnviados?: number;
  /**
   * Datos de ejemplo que se siembran cuando no hay backend (para que la app
   * siga siendo usable). No son datos reales: las estadísticas los ignoran.
   */
  mock?: boolean;
}

// Historial de versiones que devuelve GET /:id/versiones.
export interface VersionHistorial {
  id: string;
  numero: number;
  titulo: string;
  descripcion?: string;
  preguntas: Pregunta[];
  secciones?: Seccion[];
  creadaEn: string;
  sellada: boolean;
  totalRespuestas: number;
}

export interface RespuestaEncuesta {
  id: string; // uuid generado en el cliente
  encuestaId: string;
  respuestas: Record<string, ValorRespuesta>;
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
