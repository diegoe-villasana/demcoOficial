import * as mammoth from 'mammoth';
import { Encuesta, Pregunta } from '../db/schema';

export async function extraerTextoDocx(archivo: File): Promise<string> {
  const buffer = await archivo.arrayBuffer();
  const resultado = await mammoth.extractRawText({ arrayBuffer: buffer });
  return resultado.value;
}

const TIPO_PATTERN = /\[([^\]]+)\]\s*$/i;
const OPCION_PATTERN = /^[-•*]\s+|\d+[.)]\s+|[a-zA-Z][.)]\s+/;

const COLUMNAS_MATRIZ = [
  'Muy en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Muy de acuerdo',
];

function detectarTipo(etiqueta: string): Pregunta['tipo'] {
  const texto = etiqueta.toLowerCase();
  if (/(matrix|matriz|grilla|cuadricula)/.test(texto)) return 'matriz';
  if (/(multiple|opcion|opción|seleccion|selección|multi)/.test(texto)) return 'opcion_multiple';
  if (/(escala|likert)/.test(texto)) return 'escala';
  return 'texto';
}

export function etiquetaTipo(tipo: Pregunta['tipo']): string {
  switch (tipo) {
    case 'opcion_multiple':
      return 'Múltiple';
    case 'matriz':
      return 'Matriz';
    case 'escala':
      return 'Escala';
    default:
      return 'Abierta';
  }
}

export function convertirTextoEnEncuesta(texto: string): Encuesta {
  const parrafos = texto
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const preguntas: Pregunta[] = [];
  let actual: Pregunta | null = null;

  const titulo = parrafos[0] || 'Encuesta sin título';

  for (const parrafo of parrafos.slice(1)) {
    if (actual && OPCION_PATTERN.test(parrafo)) {
      const opcion = parrafo.replace(/^[-•*]\s+|\d+[.)]\s+|[a-zA-Z][.)]\s+/, '').trim();
      if (!actual.opciones) actual.opciones = [];
      actual.opciones.push(opcion);
      continue;
    }

    const match = parrafo.match(TIPO_PATTERN);
    let tipo: Pregunta['tipo'] = 'texto';
    let textoPregunta = parrafo;

    if (match) {
      tipo = detectarTipo(match[1]);
      textoPregunta = parrafo.replace(TIPO_PATTERN, '').trim();
    }

    actual = {
      id: crypto.randomUUID(),
      texto: textoPregunta,
      tipo,
      ...(tipo === 'matriz' ? { columnas: [...COLUMNAS_MATRIZ] } : {}),
    };
    preguntas.push(actual);
  }

  return {
    id: crypto.randomUUID(),
    titulo,
    preguntas,
  };
}