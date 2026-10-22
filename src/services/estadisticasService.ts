import { getDB, Encuesta, RespuestaEncuesta } from '../db/schema';

// Datos agregados del módulo de encuestas para el dashboard y la lista de
// proyectos. El servidor los calcula en una sola llamada (GET /estadisticas);
// si no hay conexión se reconstruyen con el caché local de IndexedDB, que
// siempre va un paso atrasado pero evita dejar las pantallas en blanco.

const API_URL = import.meta.env.VITE_ENCUESTAS_API_URL as string | undefined;

/** Estado de una encuesta según su actividad real. */
export type EstadoEncuesta =
  | 'borrador'
  | 'enviada'
  | 'en_curso'
  | 'finalizada'
  | 'retrasada';

export interface EstadisticaEncuesta {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoEncuesta;
  /** Respuestas recibidas de todas sus versiones. */
  respuestas: number;
  /** Preguntas respondibles de la versión activa. */
  preguntas: number;
  /**
   * % de preguntas de la versión activa que ya tienen alguna respuesta.
   * `null` cuando no se puede calcular (sin conexión y sin las respuestas
   * en el dispositivo).
   */
  cobertura: number | null;
  /** % promedio de llenado de las respuestas recibidas. `null` si no se sabe. */
  avance: number | null;
  versionNumero: number;
  sellada: boolean;
  creadaEn: string;
  ultimaRespuesta: string | null;
  ultimoEnvio: string | null;
  correosEnviados: number;
}

export interface AlertaEncuesta {
  id: string;
  titulo: string;
  motivo: string;
  severidad: 'alta' | 'media';
}

export interface Estadisticas {
  generadoEn: string;
  kpis: {
    encuestas: number;
    respuestas: number;
    correosEnviados: number;
    alertas: number;
    coberturaPromedio: number;
    llenadoPromedio: number;
  };
  /** Respuestas por mes (los últimos meses, incluido el actual). */
  serie: Array<{ clave: string; etiqueta: string; respuestas: number }>;
  encuestas: EstadisticaEncuesta[];
  alertas: AlertaEncuesta[];
  /** Los datos vienen del caché local: no reflejan el estado del servidor. */
  parcial?: boolean;
}

const DIAS_INACTIVIDAD = 30;
const MESES_SERIE = 6;

/** Etiqueta y color de cada estado, para que las dos pantallas los着用an igual. */
export const ETIQUETAS_ESTADO: Record<EstadoEncuesta, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
  retrasada: 'Retrasada',
};

export const CLASES_ESTADO: Record<EstadoEncuesta, string> = {
  borrador: 'bg-slate-100 text-slate-700',
  enviada: 'bg-amber-100 text-amber-700',
  en_curso: 'bg-blue-100 text-blue-700',
  finalizada: 'bg-green-100 text-green-700',
  retrasada: 'bg-red-100 text-red-700',
};

/** "1 encuesta" / "2 encuestas": evita los plurales mal puestos. */
export function plural(cantidad: number, singular: string, pluralForma: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : pluralForma}`;
}

const ETIQUETAS_MES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function diasDesde(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

function tieneValor(valor: unknown): boolean {
  if (valor === undefined || valor === null || valor === '') return false;
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === 'object') return Object.keys(valor as object).length > 0;
  return true;
}

/** Las preguntas compuestas guardan una clave por fila: `p1-Excelente`. */
function respondio(respuestas: Record<string, unknown>, preguntaId: string): boolean {
  for (const [clave, valor] of Object.entries(respuestas)) {
    if (clave !== preguntaId && !clave.startsWith(`${preguntaId}-`)) continue;
    if (tieneValor(valor)) return true;
  }
  return false;
}

function claveDeMes(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mesesDeSerie(): Array<{ clave: string; etiqueta: string; respuestas: number }> {
  const hoy = new Date();
  const serie: Array<{ clave: string; etiqueta: string; respuestas: number }> = [];
  for (let i = MESES_SERIE - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    serie.push({
      clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      etiqueta: ETIQUETAS_MES[d.getMonth()],
      respuestas: 0,
    });
  }
  return serie;
}

/**
 * Reconstruye el resumen con lo que hay en el dispositivo: las encuestas
 * cacheadas y las respuestas que se han respondido aquí.
 */
export async function estadisticasDesdeCache(): Promise<Estadisticas> {
  const db = await getDB();
  const [todasEncuestas, respuestasLocales] = await Promise.all([
    db.getAll('encuestas'),
    db.getAll('respuestas'),
  ]);

  // Las encuestas de ejemplo (sembradas por la app cuando no hay backend)
  // no son datos reales: no cuentan para las estadísticas.
  const encuestas = todasEncuestas.filter((e) => !e.mock);
  const idsReales = new Set(encuestas.map((e) => e.id));

  const porEncuesta = new Map<string, RespuestaEncuesta[]>();
  for (const r of respuestasLocales) {
    if (!idsReales.has(r.encuestaId)) continue;
    const lista = porEncuesta.get(r.encuestaId);
    if (lista) lista.push(r);
    else porEncuesta.set(r.encuestaId, [r]);
  }

  const serie = mesesDeSerie();
  const indiceMes = new Map(serie.map((m) => [m.clave, m]));
  for (const r of respuestasLocales) {
    if (!idsReales.has(r.encuestaId)) continue;
    const mes = indiceMes.get(claveDeMes(r.fechaRespuesta));
    if (mes) mes.respuestas++;
  }

  const estadisticas: EstadisticaEncuesta[] = encuestas.map((encuesta) => {
    const propias = porEncuesta.get(encuesta.id) ?? [];
    const preguntas = encuesta.preguntas.filter((p) => p.tipo !== 'mostrar_texto');

    const contestadas = new Set<string>();
    const llenados: number[] = [];
    for (const r of propias) {
      let contestadasAqui = 0;
      for (const p of preguntas) {
        if (respondio(r.respuestas, p.id)) {
          contestadas.add(p.id);
          contestadasAqui++;
        }
      }
      llenados.push(preguntas.length === 0 ? 0 : (contestadasAqui / preguntas.length) * 100);
    }

    const total = Math.max(propias.length, encuesta.totalRespuestas ?? 0);
    // La última respuesta la envía el backend al cachear la encuesta; si este
    // dispositivo respondió algo, su fecha es más reciente.
    const ultimaLocal =
      propias.length > 0
        ? propias.reduce((a, b) => (a.fechaRespuesta > b.fechaRespuesta ? a : b)).fechaRespuesta
        : null;
    const ultimaRespuesta =
      ultimaLocal && (!encuesta.ultimaRespuesta || ultimaLocal > encuesta.ultimaRespuesta)
        ? ultimaLocal
        : encuesta.ultimaRespuesta ?? null;

    let estado: EstadoEncuesta;
    if (total > 0) {
      estado = diasDesde(ultimaRespuesta) > DIAS_INACTIVIDAD ? 'finalizada' : 'en_curso';
    } else if ((encuesta.correosEnviados ?? 0) > 0) {
      estado = 'enviada';
    } else {
      estado = 'borrador';
    }

    // La cobertura y el llenado se calculan con las respuestas que están en
    // este dispositivo. Si las llegaron al servidor y no las tenemos, no hay
    // forma de saberlo: se devuelve `null` en vez de un 0 inventado.
    const hayRespuestasLocales = propias.length > 0;

    return {
      id: encuesta.id,
      titulo: encuesta.titulo,
      descripcion: encuesta.descripcion,
      estado,
      respuestas: total,
      preguntas: preguntas.length,
      cobertura: hayRespuestasLocales
        ? preguntas.length === 0
          ? 0
          : Math.round((contestadas.size / preguntas.length) * 100)
        : null,
      avance: hayRespuestasLocales ? Math.round(promedio(llenados)) : null,
      versionNumero: encuesta.versionNumero ?? 1,
      sellada: encuesta.sellada ?? false,
      creadaEn: encuesta.creadaEn ?? new Date().toISOString(),
      ultimaRespuesta,
      ultimoEnvio: null,
      correosEnviados: encuesta.correosEnviados ?? 0,
    };
  });

  // Mismo orden que el servidor: primero las que ya tienen respuestas.
  const prioridad = (estado: EstadoEncuesta): number => {
    switch (estado) {
      case 'en_curso':
        return 0;
      case 'finalizada':
        return 1;
      case 'retrasada':
        return 2;
      case 'enviada':
        return 3;
      default:
        return 4;
    }
  };

  estadisticas.sort((a, b) => {
    const pa = prioridad(a.estado);
    const pb = prioridad(b.estado);
    if (pa !== pb) return pa - pb;
    const fa = a.ultimaRespuesta ?? a.ultimoEnvio ?? a.creadaEn;
    const fb = b.ultimaRespuesta ?? b.ultimoEnvio ?? b.creadaEn;
    return fa < fb ? 1 : fa > fb ? -1 : 0;
  });

  const conRespuestas = estadisticas.filter((e) => e.respuestas > 0);
  const conCobertura = conRespuestas.filter((e) => e.cobertura !== null);
  const conAvance = conRespuestas.filter((e) => e.avance !== null);

  return {
    generadoEn: new Date().toISOString(),
    kpis: {
      encuestas: estadisticas.length,
      respuestas: estadisticas.reduce((a, e) => a + e.respuestas, 0),
      correosEnviados: estadisticas.reduce((a, e) => a + e.correosEnviados, 0),
      alertas: 0,
      coberturaPromedio: promedio(conCobertura.map((e) => e.cobertura as number)),
      llenadoPromedio: promedio(conAvance.map((e) => e.avance as number)),
    },
    serie,
    encuestas: estadisticas,
    alertas: [],
    parcial: true,
  };
}

/**
 * Resumen del módulo de encuestas. Si el servidor no está disponible
 * (o no hay internet) se devuelve la versión reconstruida desde el caché.
 */
export async function obtenerEstadisticas(): Promise<Estadisticas> {
  if (API_URL && navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/estadisticas`);
      if (res.ok) {
        return (await res.json()) as Estadisticas;
      }
    } catch {
      // Sin backend: seguimos con el caché local.
    }
  }
  return estadisticasDesdeCache();
}
