import { Pregunta, Seccion } from '../db/schema';

// Helpers de las secciones (tramos) de una encuesta. Las preguntas siguen
// viviendo en un arreglo plano; cada una apunta a su sección con `seccionId`.
// Así el orden global de las preguntas se conserva y las secciones son sólo
// una agrupación: se agrega o se quita sin tocar el resto del formato.

export interface GrupoSeccion {
  /** null = preguntas que no pertenecen a ninguna sección. */
  seccion: Seccion | null;
  preguntas: Pregunta[];
}

/** Crea una sección nueva con el título por defecto "Sección N". */
export function nuevaSeccion(indice: number): Seccion {
  return {
    id: crypto.randomUUID(),
    titulo: `Sección ${indice}`,
  };
}

/**
 * Agrupa las preguntas por sección. El orden de las secciones manda; dentro
 * de cada sección se respeta el orden original de las preguntas. Las preguntas
 * sin sección (o con una sección que ya no existe) quedan al final, en un
 * grupo sin encabezado.
 */
export function agruparPorSeccion(
  preguntas: Pregunta[],
  secciones: Seccion[] = []
): GrupoSeccion[] {
  const grupos: GrupoSeccion[] = secciones.map((seccion) => ({ seccion, preguntas: [] }));
  const porId = new Map(grupos.map((g) => [g.seccion!.id, g]));

  const sueltas: Pregunta[] = [];
  for (const pregunta of preguntas) {
    const grupo = pregunta.seccionId ? porId.get(pregunta.seccionId) : undefined;
    if (grupo) {
      grupo.preguntas.push(pregunta);
    } else {
      sueltas.push(pregunta);
    }
  }

  if (sueltas.length > 0) {
    grupos.push({ seccion: null, preguntas: sueltas });
  }

  return grupos;
}

/** Preguntas que no pertenecen a ninguna sección (o a una que ya no existe). */
export function preguntasSinSeccion(preguntas: Pregunta[], secciones: Seccion[] = []): Pregunta[] {
  const ids = new Set(secciones.map((s) => s.id));
  return preguntas.filter((p) => !p.seccionId || !ids.has(p.seccionId));
}

/**
 * Mueve una pregunta dentro de su grupo (sección), sin pasarse de los límites
 * del grupo. Devuelve el arreglo nuevo; si no hay a quién moverse, devuelve el
 * mismo arreglo.
 */
export function moverEnSuGrupo(
  preguntas: Pregunta[],
  preguntaId: string,
  dir: -1 | 1
): Pregunta[] {
  const pregunta = preguntas.find((p) => p.id === preguntaId);
  if (!pregunta) return preguntas;

  const APT = preguntas.filter((p) => (p.seccionId ?? null) === (pregunta.seccionId ?? null));
  const posicion = APT.findIndex((p) => p.id === preguntaId);
  const destino = posicion + dir;
  if (posicion === -1 || destino < 0 || destino >= APT.length) return preguntas;

  const otra = APT[destino];
  const i = preguntas.findIndex((p) => p.id === preguntaId);
  const j = preguntas.findIndex((p) => p.id === otra.id);
  if (i === -1 || j === -1) return preguntas;

  const copia = [...preguntas];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

/** Normaliza las secciones que llegan del servidor: sin título, se descartan. */
export function seccionesValidas(secciones: Seccion[] | undefined): Seccion[] {
  if (!secciones) return [];
  return secciones
    .filter((s) => s && typeof s.titulo === 'string' && s.titulo.trim())
    .map((s) => ({
      id: s.id,
      titulo: s.titulo.trim(),
      descripcion: s.descripcion?.trim() || undefined,
    }));
}
