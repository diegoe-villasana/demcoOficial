import { getDB, Encuesta, RespuestaEncuesta, Pregunta, VersionHistorial } from '../db/schema';

const SYNC_TAG = 'sync-encuestas';

// URL de tu backend real (ver carpeta demco-backend). Se lee de .env
// como VITE_ENCUESTAS_API_URL.
const API_URL = import.meta.env.VITE_ENCUESTAS_API_URL as string | undefined;

// ---- Datos mock: en un caso real vendrían de un GET a tu API la primera vez
// que hay conexión, y se cachean en IndexedDB para poder responderlas offline. ----
const mockEncuestas: Encuesta[] = [
  {
    id: 'enc-1',
    titulo: 'Satisfacción del servicio eléctrico',
    descripcion: 'Ayúdanos a mejorar tu experiencia con DEMCO',
    preguntas: [
      { id: 'p1', texto: '¿Qué tan satisfecho estás con la estabilidad del servicio?', tipo: 'escala' },
      { id: 'p2', texto: '¿Has tenido interrupciones en el último mes?', tipo: 'opcion_multiple', opciones: ['Sí', 'No'] },
      { id: 'p3', texto: 'Comentarios adicionales', tipo: 'texto' },
    ],
  },
  {
    id: 'enc-2',
    titulo: 'Interés en energía solar',
    preguntas: [
      { id: 'p1', texto: '¿Te interesaría instalar paneles solares?', tipo: 'opcion_multiple', opciones: ['Sí', 'No', 'Tal vez'] },
      { id: 'p2', texto: '¿Qué te detiene actualmente?', tipo: 'texto' },
    ],
  },
];

export async function inicializarEncuestas(): Promise<void> {
  const db = await getDB();

  // El servidor es la fuente de verdad: cuando hay conexión, refrescamos el
  // caché local con la versión activa de cada encuesta (por si cambió la
  // versión). Si no hay red, usamos lo que ya tengamos en IndexedDB.
  if (API_URL && navigator.onLine) {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const encuestas: Encuesta[] = await res.json();
        for (const encuesta of encuestas) {
          await db.put('encuestas', encuesta);
        }
        return;
      }
    } catch {
      // Sin conexión al backend: nos quedamos con el caché local.
    }
  }

  // Sin caché previo y sin backend: fallback mock para que la app siga usable.
  const existentes = await db.getAll('encuestas');
  if (existentes.length === 0) {
    for (const encuesta of mockEncuestas) {
      await db.put('encuestas', encuesta);
    }
  }
}

export async function obtenerEncuestas(): Promise<Encuesta[]> {
  const db = await getDB();
  return db.getAll('encuestas');
}

export interface EnviarEncuestasParams {
  encuestaIds: string[];
  destinatarios: string[];
  mensaje?: string;
}

export interface ResultadoEnvio {
  ok: boolean;
  enviados: number;
  proveedor: string;
  error?: string;
}

// Envía las encuestas seleccionadas a los destinatarios vía el backend
// (que a su vez las manda por Resend, Brevo o en modo simulado).
export async function enviarEncuestasPorCorreo(
  params: EnviarEncuestasParams
): Promise<ResultadoEnvio> {
  if (!API_URL) {
    throw new Error('VITE_ENCUESTAS_API_URL no está configurada.');
  }

  const res = await fetch(`${API_URL}/enviar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<ResultadoEnvio>;
  if (!res.ok || !data.ok) {
    throw new Error(data?.error ?? 'No se pudo enviar el correo.');
  }
  return data as ResultadoEnvio;
}

// Respuesta tal como la guarda el backend. OJO: es un tipo distinto a
// RespuestaEncuesta (schema.ts), que es la versión local con `estado` para la
// cola offline. El backend no conoce `estado` y agrega `recibidoEn`.
export interface RespuestaRecibida {
  id: string;
  encuestaId: string;
  versionId?: string | null;
  respuestas: Record<string, string | number>;
  fechaRespuesta: string;
  recibidoEn: string;
}

// GET de las respuestas ya recibidas en el servidor (las que llegaron por el
// link del correo o por la app). Requiere conexión: las pendientes offline
// siguen solo en IndexedDB hasta que se sincronizan.
export async function obtenerRespuestasRecibidas(encuestaId: string): Promise<RespuestaRecibida[]> {
  if (!API_URL) {
    throw new Error('VITE_ENCUESTAS_API_URL no está configurada.');
  }

  const res = await fetch(`${API_URL}/${encodeURIComponent(encuestaId)}/respuestas`);
  if (!res.ok) {
    throw new Error('No se pudieron cargar las respuestas.');
  }
  return (await res.json()) as RespuestaRecibida[];
}

export async function guardarEncuesta(encuesta: Encuesta): Promise<void> {
  const db = await getDB();
  await db.put('encuestas', encuesta);
}

// ---- CRUD de encuestas contra el servidor (persistencia real) ----

export interface EncuestaEditable {
  titulo: string;
  descripcion?: string;
  preguntas: Pregunta[];
}

function cuerpoDe(encuesta: EncuestaEditable) {
  return JSON.stringify({
    titulo: encuesta.titulo,
    descripcion: encuesta.descripcion,
    preguntas: encuesta.preguntas,
  });
}

async function peticion(url: string, init: RequestInit): Promise<Response> {
  if (!API_URL) {
    throw new Error('VITE_ENCUESTAS_API_URL no está configurada.');
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    const mensaje = (cuerpo as { error?: string })?.error ?? `El servidor respondió ${res.status}`;
    throw new Error(mensaje);
  }
  return res;
}

// Crea una encuesta nueva (v1). Devuelve el id que generó el servidor.
export async function crearEncuestaEnServidor(encuesta: EncuestaEditable): Promise<string> {
  const res = await peticion(`${API_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: cuerpoDe(encuesta),
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

// Edita una versión SIEMPRE QUE siga sin respuestas (no sellada).
export async function actualizarVersionEnServidor(
  encuestaId: string,
  versionId: string,
  encuesta: EncuestaEditable
): Promise<Encuesta> {
  const res = await peticion(`${API_URL}/${encodeURIComponent(encuestaId)}/versiones/${encodeURIComponent(versionId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: cuerpoDe(encuesta),
  });
  return (await res.json()) as Encuesta;
}

// Crea una versión nueva partiendo de la activa (o desde la base indicada).
// El servidor resuelve el número siguiente y sella la anterior cadena.
export async function crearVersionEnServidor(
  encuestaId: string,
  encuesta: EncuestaEditable
): Promise<Encuesta> {
  const res = await peticion(`${API_URL}/${encodeURIComponent(encuestaId)}/versiones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: cuerpoDe(encuesta),
  });
  return (await res.json()) as Encuesta;
}

export async function obtenerVersionesEnServidor(encuestaId: string): Promise<VersionHistorial[]> {
  const res = await peticion(
    `${API_URL}/${encodeURIComponent(encuestaId)}/versiones`,
    { method: 'GET' }
  );
  return (await res.json()) as VersionHistorial[];
}

// Guarda en servidor + caché local. Maneja los tres casos:
//   - encuesta nueva        -> POST / (v1)
//   - versión sin respuestas -> PUT sobre esa versión
//   - versión sellada       -> POST versión (fork)
export async function guardarEncuestaCompleta(
  encuesta: EncuestaEditable,
  existente?: Pick<Encuesta, 'id' | 'versionId' | 'sellada'>
): Promise<Encuesta> {
  const db = await getDB();

  let guardada: Encuesta;
  if (!existente) {
    const id = await crearEncuestaEnServidor(encuesta);
    const res = await peticion(`${API_URL}/${encodeURIComponent(id)}`, { method: 'GET' });
    guardada = (await res.json()) as Encuesta;
  } else if (existente.sellada || !existente.versionId) {
    guardada = await crearVersionEnServidor(existente.id, encuesta);
  } else {
    guardada = await actualizarVersionEnServidor(existente.id, existente.versionId, encuesta);
  }

  // Replace completo del caché local para que la app responda la versión nueva.
  await db.put('encuestas', guardada);
  return guardada;
}

export async function obtenerEncuesta(id: string): Promise<Encuesta | undefined> {
  const db = await getDB();
  return db.get('encuestas', id);
}

export async function guardarRespuesta(
  respuesta: Omit<RespuestaEncuesta, 'estado'>
): Promise<void> {
  const db = await getDB();
  const nueva: RespuestaEncuesta = { ...respuesta, estado: 'pendiente' };

  // 1) SIEMPRE se guarda local primero. Esto es lo que garantiza que
  //    funcione offline: el usuario nunca espera a la red para "terminar".
  await db.put('respuestas', nueva);

  if (navigator.onLine) {
    // 2) Si hay conexión, intentamos enviarla ya mismo.
    await intentarSincronizar();
  } else {
    // 3) Si no hay conexión, le pedimos al navegador que despierte al
    //    Service Worker en cuanto vuelva la conexión (Background Sync).
    await registrarBackgroundSync();
  }
}

export async function obtenerRespuestasPendientes(): Promise<RespuestaEncuesta[]> {
  const db = await getDB();
  return db.getAllFromIndex('respuestas', 'by-estado', 'pendiente');
}

export async function intentarSincronizar(): Promise<void> {
  const db = await getDB();
  const pendientes = await db.getAllFromIndex('respuestas', 'by-estado', 'pendiente');

  for (const respuesta of pendientes) {
    const exito = await enviarRespuestaAlServidor(respuesta);
    if (exito) {
      await db.put('respuestas', { ...respuesta, estado: 'sincronizado' });
    } else {
      // Se quedó sin conexión a medio camino: dejamos el resto pendiente
      // y programamos el reintento en background.
      await registrarBackgroundSync();
      break;
    }
  }
}

async function enviarRespuestaAlServidor(respuesta: RespuestaEncuesta): Promise<boolean> {
  if (!navigator.onLine) return false;

  if (!API_URL) {
    console.warn(
      'VITE_ENCUESTAS_API_URL no está configurada: la respuesta queda pendiente hasta que la definas.'
    );
    return false;
  }

  try {
    const res = await fetch(`${API_URL}/respuestas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(respuesta),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function registrarBackgroundSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // @ts-expect-error: SyncManager aún no está en los tipos estándar de TS
      await registration.sync.register(SYNC_TAG);
    } catch {
      // Background Sync no disponible (p. ej. Safari/Firefox): el fallback
      // por polling en useSyncEncuestas se encarga de reintentar igual.
    }
  }
}
