import * as mammoth from 'mammoth';
import { Encuesta, Pregunta, Seccion } from '../db/schema';
import { COLUMNAS_LIKERT, crearPreguntaPorTipo, detectarTipoDesdeEtiqueta } from './tiposPregunta';

export async function extraerTextoDocx(archivo: File): Promise<string> {
  const buffer = await archivo.arrayBuffer();
  const resultado = await mammoth.extractRawText({ arrayBuffer: buffer });
  return resultado.value;
}

const TIPO_PATTERN = /\[([^\]]+)\]\s*$/i;
const OPCION_PATTERN = /^[-•*]\s+|\d+[.)]\s+|[a-zA-Z][.)]\s+/;
// Un encabezado de sección en el documento: [Sección: Datos generales]
const SECCION_PATTERN = /^\[\s*Secci[oó]n\s*[:\-]\s*(.+?)\s*\]$/i;

function sinEtiqueta(parrafo: string): { texto: string; etiqueta: string | null } {
  const match = parrafo.match(TIPO_PATTERN);
  if (!match) return { texto: parrafo, etiqueta: null };
  return { texto: parrafo.replace(TIPO_PATTERN, '').trim(), etiqueta: match[1] };
}

export function convertirTextoEnEncuesta(texto: string): Encuesta {
  const parrafos = texto
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const preguntas: Pregunta[] = [];
  const secciones: Seccion[] = [];
  let actual: Pregunta | null = null;
  let seccionActual: Seccion | null = null;

  const titulo = parrafos[0] || 'Encuesta sin título';

  for (const parrafo of parrafos.slice(1)) {
    // Encabezado de sección: abre un tramo nuevo de la encuesta.
    const matchSeccion = parrafo.match(SECCION_PATTERN);
    if (matchSeccion) {
      const tituloSeccion = matchSeccion[1].trim();
      if (tituloSeccion) {
        seccionActual = { id: crypto.randomUUID(), titulo: tituloSeccion };
        secciones.push(seccionActual);
      }
      actual = null;
      continue;
    }

    if (actual && OPCION_PATTERN.test(parrafo)) {
      const opcion = parrafo.replace(/^[-•*]\s+|\d+[.)]\s+|[a-zA-Z][.)]\s+/, '').trim();
      if (!actual.opciones) actual.opciones = [];
      actual.opciones.push(opcion);
      continue;
    }

    const { texto: textoPregunta, etiqueta } = sinEtiqueta(parrafo);
    const tipo = etiqueta ? detectarTipoDesdeEtiqueta(etiqueta) : 'texto';

    // Partimos del catálogo para heredar columnas, escalas y formato; lo que
    // venga en el documento (opciones) se encima encima.
    actual = crearPreguntaPorTipo(tipo);
    actual.texto = textoPregunta;
    if (tipo === 'matriz' && !actual.columnas?.length) {
      actual.columnas = [...COLUMNAS_LIKERT];
    }
    if (seccionActual) actual.seccionId = seccionActual.id;
    preguntas.push(actual);
  }

  return {
    id: crypto.randomUUID(),
    titulo,
    preguntas,
    secciones,
  };
}
