import { Encuesta, Pregunta, Seccion, ValorRespuesta, VersionHistorial } from '../db/schema';
import type { RespuestaRecibida } from './encuestasService';
import { TIPOS_ESCALA, esInformativa } from './tiposPregunta';
import { CeldaExcel, ColumnaHoja, HojaExcel, crearXlsx } from './xlsx';

// Una hoja por versión: las preguntas cambian entre versiones, así que
// mezclarlas en una sola tabla dejaría columnas vacías por todos lados.
// Cada fila es una respuesta; cada columna, una pregunta (las matrices se
// abren en una columna por fila/columna para poder analizarlas en Excel).

const ANCHO_PREGUNTA = 34;
const ANCHO_COMENTARIO = 40;

interface ColumnaRespuesta extends ColumnaHoja {
  valor: (respuesta: RespuestaRecibida) => CeldaExcel;
}

function texto(v: ValorRespuesta | undefined): CeldaExcel {
  if (v === undefined || v === null || v === '') return null;
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') {
    return Object.entries(v)
      .map(([k, val]) => `${k}: ${val}`)
      .join(' · ');
  }
  return v;
}

function numero(v: ValorRespuesta | undefined): CeldaExcel {
  const comoTexto = texto(v);
  if (comoTexto === null || comoTexto === '') return null;
  const n = typeof comoTexto === 'number' ? comoTexto : Number(String(comoTexto).replace(',', '.'));
  return Number.isFinite(n) ? n : comoTexto;
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(
    d.getHours()
  )}:${dos(d.getMinutes())}`;
}

function columnasDe(preguntas: Pregunta[], secciones: Seccion[] | undefined): ColumnaRespuesta[] {
  const nombreSeccion = new Map((secciones ?? []).map((s) => [s.id, s.titulo]));
  const columnas: ColumnaRespuesta[] = [];

  for (const p of preguntas) {
    if (esInformativa(p.tipo)) continue;

    const opciones = p.opciones ?? [];
    const clave = (sufijo: string) => `${p.id}-${sufijo}`;
    const grupo = p.seccionId ? nombreSeccion.get(p.seccionId) : undefined;

    const agregar = (
      titulo: string,
      valor: (r: RespuestaRecibida) => CeldaExcel,
      ancho = ANCHO_PREGUNTA
    ) => columnas.push({ titulo, valor, ancho, grupo: grupo || undefined });

    const directa = (c: string) => (r: RespuestaRecibida) => texto(r.respuestas[c]);
    const numerica = (c: string) => (r: RespuestaRecibida) => numero(r.respuestas[c]);

    switch (p.tipo) {
      case 'matriz_doble_eje':
        for (const fila of opciones) {
          agregar(`${p.texto} · ${fila} (${p.ejeIzquierdo ?? 'Izquierda'})`, numerica(clave(`${fila}-izq`)));
          agregar(`${p.texto} · ${fila} (${p.ejeDerecho ?? 'Derecha'})`, numerica(clave(`${fila}-der`)));
        }
        break;

      case 'matriz_columnas':
        for (const columna of p.columnas ?? []) {
          agregar(`${p.texto} · ${columna}`, directa(clave(columna)));
        }
        break;

      case 'matriz':
      case 'matriz_aumentar':
      case 'matriz_sino':
      case 'matriz_texto':
        for (const fila of opciones) agregar(`${p.texto} · ${fila}`, directa(clave(fila)));
        break;

      case 'matriz_escala':
      case 'matriz_numero':
        for (const fila of opciones) agregar(`${p.texto} · ${fila}`, numerica(clave(fila)));
        break;

      case 'textos_multiples':
        for (const fila of opciones) agregar(`${p.texto} · ${fila}`, directa(clave(fila)));
        break;

      case 'numero_multiple':
        for (const fila of opciones) agregar(`${p.texto} · ${fila}`, numerica(clave(fila)));
        break;

      case 'opcion_unica_comentario':
        agregar(p.texto, directa(p.id));
        agregar(`${p.texto} · Comentario`, directa(clave('comentario')), ANCHO_COMENTARIO);
        break;

      case 'opcion_multiple_comentario':
        agregar(p.texto, directa(p.id));
        agregar(
          `${p.texto} · Comentarios`,
          (r) => {
            const prefijo = clave('comentario-');
            const partes = Object.entries(r.respuestas)
              .filter(([k, v]) => k.startsWith(prefijo) && String(v).trim() !== '')
              .map(([k, v]) => `${k.slice(prefijo.length)}: ${v}`);
            return partes.length > 0 ? partes.join(' · ') : null;
          },
          ANCHO_COMENTARIO
        );
        break;

      case 'ranking':
        agregar(p.texto, (r) => {
          const v = r.respuestas[p.id];
          return Array.isArray(v) ? v.join(' > ') : texto(v);
        });
        break;

      case 'escala':
      case 'escala_n':
      case 'numero':
        agregar(p.texto, numerica(p.id), 16);
        break;

      default:
        agregar(p.texto, directa(p.id));
    }
  }

  return columnas;
}

function ordenar(respuestas: RespuestaRecibida[]): RespuestaRecibida[] {
  return [...respuestas].sort((a, b) => a.fechaRespuesta.localeCompare(b.fechaRespuesta));
}

function hojaDeVersion(version: VersionHistorial, respuestas: RespuestaRecibida[]): HojaExcel {
  const propias = columnasDe(version.preguntas, version.secciones);
  const ordenadas = ordenar(respuestas);

  return {
    nombre: `Versión ${version.numero}`,
    columnas: [
      { titulo: 'N°', ancho: 6 },
      { titulo: 'Fecha de respuesta', ancho: 20 },
      ...propias.map(({ valor: _valor, ...columna }) => columna),
      { titulo: 'ID de respuesta', ancho: 38 },
    ],
    filas: ordenadas.map((r, i) => [
      i + 1,
      fechaCorta(r.fechaRespuesta),
      ...propias.map((c) => c.valor(r)),
      r.id,
    ]),
  };
}

// Respuestas viejas sin versión: no sabemos qué preguntas vieron, así que se
// exportan tal cual, con una columna por clave guardada.
function hojaSinVersion(respuestas: RespuestaRecibida[]): HojaExcel {
  const claves = [...new Set(respuestas.flatMap((r) => Object.keys(r.respuestas)))].sort();
  const ordenadas = ordenar(respuestas);

  return {
    nombre: 'Sin versión',
    columnas: [
      { titulo: 'N°', ancho: 6 },
      { titulo: 'Fecha de respuesta', ancho: 20 },
      ...claves.map((c) => ({ titulo: c, ancho: ANCHO_PREGUNTA })),
      { titulo: 'ID de respuesta', ancho: 38 },
    ],
    filas: ordenadas.map((r, i) => [
      i + 1,
      fechaCorta(r.fechaRespuesta),
      ...claves.map((c) => texto(r.respuestas[c])),
      r.id,
    ]),
  };
}

function nombreArchivo(titulo: string): string {
  const slug =
    titulo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'encuesta';
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`;
  return `respuestas-${slug}-${fecha}.xlsx`;
}

function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Algunos navegadores disparan la descarga de forma asíncrona.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Arma las hojas del libro (una por versión) sin descargar nada. */
export function hojasDeRespuestas(
  versiones: VersionHistorial[],
  respuestas: RespuestaRecibida[]
): HojaExcel[] {
  const hojas: HojaExcel[] = [];

  for (const version of [...versiones].sort((a, b) => a.numero - b.numero)) {
    const propias = respuestas.filter((r) => r.versionId === version.id);
    if (propias.length > 0) hojas.push(hojaDeVersion(version, propias));
  }

  const sinVersion = respuestas.filter((r) => !r.versionId);
  if (sinVersion.length > 0) hojas.push(hojaSinVersion(sinVersion));

  return hojas;
}

/**
 * Genera y descarga un .xlsx con todas las respuestas de la encuesta.
 * Devuelve `false` si no hay nada para exportar.
 */
export function exportarRespuestasAExcel(
  encuesta: Encuesta,
  versiones: VersionHistorial[],
  respuestas: RespuestaRecibida[]
): boolean {
  const hojas = hojasDeRespuestas(versiones, respuestas);
  if (hojas.length === 0) return false;

  descargar(crearXlsx(hojas), nombreArchivo(encuesta.titulo));
  return true;
}
