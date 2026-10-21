import { FormatoNumero, Pregunta, TipoPregunta } from '../db/schema';

// Catálogo único de tipos de pregunta. La pantalla de creación, el importador
// de Word y el render del formulario leen de aquí, para que agregar un tipo sea
// tocar un solo archivo.

export const COLUMNAS_LIKERT = [
  'Muy en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Muy de acuerdo',
];

export const COLUMNAS_AUMENTAR = ['Reducir', 'Mantener', 'Ampliar'];

export const COLUMNAS_SINO = ['Sí', 'No', 'No sé'];

export const IDIOMAS = [
  'Español',
  'English',
  'Português',
  'Français',
  'Deutsch',
  'Italiano',
  'Albanian - Shqip',
  'Croatian - Hrvatski',
];

export const FORMATOS_NUMERO: Array<{ valor: FormatoNumero; etiqueta: string; paso: number }> = [
  { valor: 'entero', etiqueta: 'Números enteros', paso: 1 },
  { valor: 'decimal', etiqueta: 'Números decimales', paso: 0.01 },
  { valor: 'porcentaje', etiqueta: 'Porcentaje (%)', paso: 1 },
  { valor: 'moneda', etiqueta: 'Moneda', paso: 0.01 },
];

export const FORMATOS_NUMERO_ETIQUETA: Record<FormatoNumero, string> = {
  entero: 'Números enteros',
  decimal: 'Números decimales',
  porcentaje: 'Porcentaje (%)',
  moneda: 'Moneda',
};

export function pasoDeFormato(formato: FormatoNumero | undefined): number {
  return FORMATOS_NUMERO.find((f) => f.valor === formato)?.paso ?? 1;
}

export interface TipoDef {
  tipo: TipoPregunta;
  etiqueta: string;
  descripcion: string;
  /** Grupo en el que aparece en el selector de la pantalla de creación. */
  grupo: GrupoTipo;
  /** Texto por defecto. Las máscaras lo traen predefinido y es editable. */
  texto?: string;
  opciones?: string[];
  columnas?: string[];
  minimo?: number;
  maximo?: number;
  formato?: FormatoNumero;
  puntos?: number;
  ejeIzquierdo?: string;
  ejeDerecho?: string;
  otro?: boolean;
  variosArchivos?: boolean;
  extensiones?: string[];
  tamanoMaximo?: number;
  placeholder?: string;
}

export type GrupoTipo =
  | 'predefinidas'
  | 'unica'
  | 'multiple'
  | 'texto'
  | 'numerico'
  | 'matriz'
  | 'especiales';

export const GRUPOS_TIPOS: Array<{ id: GrupoTipo; etiqueta: string; tipos: TipoDef[] }> = [
  {
    id: 'predefinidas',
    etiqueta: 'Predefinidas',
    tipos: [
      {
        tipo: 'genero',
        etiqueta: 'Género (F / M)',
        descripcion: 'Máscara de opción única con F y M',
        grupo: 'predefinidas',
        texto: '¿Cuál es tu género?',
        opciones: ['F', 'M'],
      },
      {
        tipo: 'si_no',
        etiqueta: 'Sí / No',
        descripcion: 'Máscara de dos opciones',
        grupo: 'predefinidas',
        texto: '',
        opciones: ['Sí', 'No'],
      },
      {
        tipo: 'idioma',
        etiqueta: 'Idioma / Localización',
        descripcion: 'Máscara de selección de idioma',
        grupo: 'predefinidas',
        texto: '¿En qué idioma deseas recibir la información?',
        opciones: [...IDIOMAS],
      },
      {
        tipo: 'ranking',
        etiqueta: 'Ranking',
        descripcion: 'Ordena los elementos de mayor a menor',
        grupo: 'predefinidas',
        texto: 'Ordena estos elementos de mayor a menor',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
        ejeIzquierdo: 'Mejor',
        ejeDerecho: 'Peor',
      },
    ],
  },
  {
    id: 'unica',
    etiqueta: 'Respuesta única',
    tipos: [
      {
        tipo: 'opcion_unica',
        etiqueta: 'Lista (Radio)',
        descripcion: 'Una sola respuesta de una lista',
        grupo: 'unica',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
      },
      {
        tipo: 'opcion_unica_comentario',
        etiqueta: 'Lista con comentarios',
        descripcion: 'Lista de radios con un comentario opcional',
        grupo: 'unica',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
        placeholder: 'Escribe tu comentario',
      },
      {
        tipo: 'desplegable',
        etiqueta: 'Lista (Desplegable)',
        descripcion: 'Una sola respuesta desde una lista desplegable',
        grupo: 'unica',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
      },
      {
        tipo: 'escala',
        etiqueta: 'Escala de 1 a 5',
        descripcion: '5 point choice: un número del 1 al 5',
        grupo: 'unica',
        minimo: 1,
        maximo: 5,
      },
      {
        tipo: 'escala_n',
        etiqueta: 'Escala de 1 a N',
        descripcion: 'Escala numérica configurable (1 a 10, 1 a 7...)',
        grupo: 'unica',
        minimo: 1,
        maximo: 10,
      },
    ],
  },
  {
    id: 'multiple',
    etiqueta: 'Opción múltiple',
    tipos: [
      {
        tipo: 'opcion_multiple',
        etiqueta: 'Opción múltiple',
        descripcion: 'Marca todas las opciones que apliquen',
        grupo: 'multiple',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
      },
      {
        tipo: 'opcion_multiple_comentario',
        etiqueta: 'Opción múltiple con comentarios',
        descripcion: 'Casillas con un comentario por opción',
        grupo: 'multiple',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
        placeholder: 'Escribe tu comentario',
      },
    ],
  },
  {
    id: 'texto',
    etiqueta: 'Texto libre',
    tipos: [
      {
        tipo: 'texto',
        etiqueta: 'Texto libre (párrafo)',
        descripcion: 'Respuesta abierta de varias líneas',
        grupo: 'texto',
        placeholder: 'Escribe tu respuesta',
      },
      {
        tipo: 'texto_linea',
        etiqueta: 'Texto libre (línea)',
        descripcion: 'Respuesta abierta de una sola línea',
        grupo: 'texto',
        placeholder: 'Escribe tu respuesta',
      },
      {
        tipo: 'texto_parrafos',
        etiqueta: 'Texto libre (varios párrafos)',
        descripcion: 'Respuesta abierta extensa',
        grupo: 'texto',
        placeholder: 'Escribe tu respuesta',
      },
      {
        tipo: 'textos_multiples',
        etiqueta: 'Opción múltiple solo texto',
        descripcion: 'Varios textos cortos, uno por renglón',
        grupo: 'texto',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
        placeholder: 'Escribe tu respuesta',
      },
    ],
  },
  {
    id: 'numerico',
    etiqueta: 'Numéricos y fecha',
    tipos: [
      {
        tipo: 'numero',
        etiqueta: 'Entrada Numérica',
        descripcion: 'Un número; tú eliges si admite enteros, decimales, porcentaje o moneda',
        grupo: 'numerico',
        formato: 'entero',
      },
      {
        tipo: 'numero_multiple',
        etiqueta: 'Entrada Numérica Múltiple',
        descripcion: 'Un número por renglón',
        grupo: 'numerico',
        formato: 'entero',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción', 'Última opción'],
      },
      {
        tipo: 'fecha',
        etiqueta: 'Fecha / tiempo',
        descripcion: 'Fecha y hora',
        grupo: 'numerico',
      },
    ],
  },
  {
    id: 'matriz',
    etiqueta: 'Matrices',
    tipos: [
      {
        tipo: 'matriz',
        etiqueta: 'Matriz',
        descripcion: 'Filas x columnas de una sola respuesta',
        grupo: 'matriz',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
        columnas: [...COLUMNAS_LIKERT],
      },
      {
        tipo: 'matriz_escala',
        etiqueta: 'Matriz (1 a 5 / 1 a 10)',
        descripcion: 'Cada fila se califica de 1 a 5 o de 1 a 10',
        grupo: 'matriz',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
        columnas: ['1', '2', '3', '4', '5'],
        maximo: 5,
      },
      {
        tipo: 'matriz_aumentar',
        etiqueta: 'Matriz (Ampliar / Mantener / Reducir)',
        grupo: 'matriz',
        descripcion: 'Cada fila se compara con la situación actual',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
        columnas: [...COLUMNAS_AUMENTAR],
      },
      {
        tipo: 'matriz_sino',
        etiqueta: 'Matriz (Sí / No / No sé)',
        descripcion: 'Cada fila se responde con Sí, No o No sé',
        grupo: 'matriz',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
        columnas: [...COLUMNAS_SINO],
      },
      {
        tipo: 'matriz_texto',
        etiqueta: 'Matriz (Textos)',
        descripcion: 'Una respuesta de texto por fila',
        grupo: 'matriz',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
      },
      {
        tipo: 'matriz_numero',
        etiqueta: 'Matriz (Números)',
        descripcion: 'Un número por fila',
        grupo: 'matriz',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
        formato: 'entero',
      },
      {
        tipo: 'matriz_doble_eje',
        etiqueta: 'Matriz de doble eje',
        descripcion: 'Dos escalas por fila, una de cada lado',
        grupo: 'matriz',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
        puntos: 5,
        ejeIzquierdo: 'Izquierda',
        ejeDerecho: 'Derecha',
      },
      {
        tipo: 'matriz_columnas',
        etiqueta: 'Matriz en columnas',
        descripcion: 'Cada columna se califica con las opciones compartidas',
        grupo: 'matriz',
        opciones: ['Primera opción', 'Segunda opción', 'Tercera opción'],
        columnas: ['Primera columna', 'Segunda columna', 'Tercera columna'],
      },
    ],
  },
  {
    id: 'especiales',
    etiqueta: 'Especiales',
    tipos: [
      {
        tipo: 'archivo',
        etiqueta: 'Subir ficheros',
        descripcion: 'Permite adjuntar archivos',
        grupo: 'especiales',
        variosArchivos: true,
        extensiones: ['pdf', 'jpg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
        tamanoMaximo: 10,
      },
      {
        tipo: 'mostrar_texto',
        etiqueta: 'Mostrar texto',
        descripcion: 'Bloque informativo: no espera respuesta',
        grupo: 'especiales',
        texto: '',
      },
    ],
  },
];

export const TIPOS_DEF: Record<TipoPregunta, TipoDef> = Object.fromEntries(
  GRUPOS_TIPOS.flatMap((grupo) => grupo.tipos.map((tipo) => [tipo.tipo, tipo] as const))
) as Record<TipoPregunta, TipoDef>;

export const ORDEN_TIPOS: TipoPregunta[] = GRUPOS_TIPOS.flatMap((g) => g.tipos.map((t) => t.tipo));

export function etiquetaTipo(tipo: TipoPregunta): string {
  return TIPOS_DEF[tipo]?.etiqueta ?? 'Abierta';
}

export function defDeTipo(tipo: TipoPregunta): TipoDef {
  return (
    TIPOS_DEF[tipo] ?? {
      tipo,
      etiqueta: 'Abierta',
      descripcion: 'Respuesta abierta',
      grupo: 'texto',
    }
  );
}

// Construye una pregunta nueva del tipo pedido, con los valores predefinidos
// del catálogo (máscaras, escalas y columnas por defecto).
export function crearPreguntaPorTipo(tipo: TipoPregunta, id?: string): Pregunta {
  const def = defDeTipo(tipo);

  const pregunta: Pregunta = {
    id: id ?? crypto.randomUUID(),
    texto: def.texto ?? '',
    tipo,
  };

  if (def.opciones) pregunta.opciones = [...def.opciones];
  if (def.columnas) pregunta.columnas = [...def.columnas];
  if (def.minimo !== undefined) pregunta.minimo = def.minimo;
  if (def.maximo !== undefined) pregunta.maximo = def.maximo;
  if (def.formato) pregunta.formato = def.formato;
  if (def.puntos !== undefined) pregunta.puntos = def.puntos;
  if (def.ejeIzquierdo !== undefined) pregunta.ejeIzquierdo = def.ejeIzquierdo;
  if (def.ejeDerecho !== undefined) pregunta.ejeDerecho = def.ejeDerecho;
  if (def.otro) pregunta.otro = true;
  if (def.variosArchivos !== undefined) pregunta.variosArchivos = def.variosArchivos;
  if (def.extensiones) pregunta.extensiones = [...def.extensiones];
  if (def.tamanoMaximo !== undefined) pregunta.tamanoMaximo = def.tamanoMaximo;
  if (def.placeholder) pregunta.placeholder = def.placeholder;

  return pregunta;
}

// ---- Helpers de configuración, para no repetir los switch en cada pantalla ----

export const TIPOS_CON_OPCIONES: TipoPregunta[] = [
  'genero',
  'si_no',
  'idioma',
  'ranking',
  'opcion_unica',
  'opcion_unica_comentario',
  'desplegable',
  'opcion_multiple',
  'opcion_multiple_comentario',
  'textos_multiples',
  'numero_multiple',
  'matriz',
  'matriz_escala',
  'matriz_aumentar',
  'matriz_sino',
  'matriz_texto',
  'matriz_numero',
  'matriz_doble_eje',
  'matriz_columnas',
];

/** Los tipos donde `opciones` son filas de una matriz, no opciones sueltas. */
export const TIPOS_MATRIZ: TipoPregunta[] = [
  'matriz',
  'matriz_escala',
  'matriz_aumentar',
  'matriz_sino',
  'matriz_texto',
  'matriz_numero',
  'matriz_doble_eje',
  'matriz_columnas',
];

// Tipos cuya lista de columnas se muestra al autor para que la edite.
export const TIPOS_MATRIZ_CON_COLUMNAS: TipoPregunta[] = [
  'matriz',
  'matriz_aumentar',
  'matriz_sino',
  'matriz_columnas',
];

// Tipos donde las columnas son obligatorias. En el resto son un valor por
// defecto que el catálogo ya trae: `matriz_escala` las genera del rango y
// `matriz_aumentar`/`matriz_sino` usan su escala fija.
export const TIPOS_MATRIZ_REQUIEREN_COLUMNAS: TipoPregunta[] = ['matriz_columnas'];

export const TIPOS_ESCALA: TipoPregunta[] = ['escala', 'escala_n', 'matriz_escala'];

export const TIPOS_TEXTO: TipoPregunta[] = [
  'texto',
  'texto_linea',
  'texto_parrafos',
  'textos_multiples',
  'matriz_texto',
];

export const TIPOS_COMENTARIO: TipoPregunta[] = [
  'opcion_unica_comentario',
  'opcion_multiple_comentario',
];

export function esMatriz(tipo: TipoPregunta): boolean {
  return TIPOS_MATRIZ.includes(tipo);
}

export function usaOpciones(tipo: TipoPregunta): boolean {
  return TIPOS_CON_OPCIONES.includes(tipo);
}

export function usaColumnas(tipo: TipoPregunta): boolean {
  return TIPOS_MATRIZ_CON_COLUMNAS.includes(tipo);
}

export function esTexto(tipo: TipoPregunta): boolean {
  return TIPOS_TEXTO.includes(tipo);
}

export function tieneComentario(tipo: TipoPregunta): boolean {
  return TIPOS_COMENTARIO.includes(tipo);
}

/** `mostrar_texto` es informativo: no genera control ni respuesta. */
export function esInformativa(tipo: TipoPregunta): boolean {
  return tipo === 'mostrar_texto';
}

/** Cuántos valores por renglón usa cada tipo (1 salvo los compuestos). */
export function valoresPorFila(tipo: TipoPregunta): number {
  return tipo === 'matriz_doble_eje' ? 2 : 1;
}

export function rangoEscala(pregunta: Pregunta): { min: number; max: number } {
  const def = TIPOS_DEF[pregunta.tipo];
  const min = pregunta.minimo ?? def?.minimo ?? 1;
  const max = pregunta.maximo ?? def?.maximo ?? 5;
  return { min, max: Math.max(max, min) };
}

// ---- Detección de tipo a partir de la etiqueta [Tipo] de un .docx ----

// Se evalúan en orden: el primero que coincide gana. Los alias cubren los
// nombres tal como aparecen en "Preguntas DEMCO SURVEY.docx" y las variantes
// que la gente escribe en Word.
const DETECCION: Array<{ patron: RegExp; tipo: TipoPregunta }> = [
  { patron: /matriz\s*(de\s*)?doble\s*eje|doble\s*eje|dual\s*scale/, tipo: 'matriz_doble_eje' },
  { patron: /matriz\s*en\s*columnas|array\s*by\s*column/, tipo: 'matriz_columnas' },
  { patron: /matriz.*(n[uú]meros|numeros|number)|array\s*numbers?/, tipo: 'matriz_numero' },
  { patron: /matriz.*(textos|texts?)|array\s*texts?/, tipo: 'matriz_texto' },
  { patron: /matriz.*(s[ií]\s*\/?\s*no|s[ií].no.se)/, tipo: 'matriz_sino' },
  { patron: /matriz.*(aumentar|mantener|reducir)/, tipo: 'matriz_aumentar' },
  { patron: /matriz.*(1\s*al?\s*10|10\s*point)|array\s*\d+\s*point/, tipo: 'matriz_escala' },
  { patron: /matriz.*(1\s*al?\s*5|5\s*point)/, tipo: 'matriz_escala' },
  { patron: /matriz|array|grilla|cuadricula/, tipo: 'matriz' },

  // Antes que "opción múltiple": "Opción múltiple solo texto" es un tipo distinto.
  { patron: /solo\s*texto|textos\s*cortos|multiple\s*short\s*text/, tipo: 'textos_multiples' },

  { patron: /opci[oó]n\s*m[uú]ltiple.*(comentario|comment)|multiple\s*options?\s*with/, tipo: 'opcion_multiple_comentario' },
  { patron: /opci[oó]n\s*m[uú]ltiple|multiple\s*(options?|choice)|casillas|checkbox/, tipo: 'opcion_multiple' },

  { patron: /entrada\s*num[eé]rica\s*m[uú]ltiple|multiple\s*numerical/, tipo: 'numero_multiple' },
  { patron: /entrada\s*num[eé]rica|nu(?:m|mer)ical|number|ecuaci[oó]n|equation/, tipo: 'numero' },

  // Solo "Múltiple", después de "entrada numérica múltiple".
  { patron: /^m[uú]ltiple$/, tipo: 'opcion_multiple' },

  { patron: /fecha|tiempo|date|time/, tipo: 'fecha' },

  { patron: /ranking|ordena|jerarqu/, tipo: 'ranking' },

  { patron: /g[eé]nero|gender/, tipo: 'genero' },
  { patron: /s[ií]\s*\/?\s*no|yes\s*\/?\s*no|binaria/, tipo: 'si_no' },
  { patron: /idioma|language|localizaci[oó]n|localization|locale/, tipo: 'idioma' },

  { patron: /desplegable|dropdown|combo/, tipo: 'desplegable' },
  { patron: /(lista|radio|botones?\s*radiales).*(comentario|comment)|with\s*comment/, tipo: 'opcion_unica_comentario' },
  { patron: /lista|radio|selecci[oó]n\s*[uú]nica|single\s*choice/, tipo: 'opcion_unica' },

  { patron: /(elegir|choice|puntos?|scale).*(1\s*al?\s*10|10\s*point)|escala\s*de\s*1\s*a\s*n|10\s*point/, tipo: 'escala_n' },
  { patron: /escala|likert|(elegir|choice|puntos?|scale).*(1\s*al?\s*5|5\s*point)|5\s*point/, tipo: 'escala' },

  { patron: /mostrar\s*texto|texto\s*mostrar|display\s*text/, tipo: 'mostrar_texto' },
  { patron: /subir\s*fichero|file\s*upload|adjuntar|upload/, tipo: 'archivo' },

  { patron: /texto\s*libre.*(varios\s*p[aá]rrafos|huge)|huge\s*free\s*text/, tipo: 'texto_parrafos' },
  { patron: /texto\s*libre.*(l[ií]nea|short)|short\s*free\s*text/, tipo: 'texto_linea' },
  { patron: /texto|abierta|open|comment/, tipo: 'texto' },
];

export function detectarTipoDesdeEtiqueta(etiqueta: string): TipoPregunta {
  const texto = etiqueta.toLowerCase().trim();
  for (const { patron, tipo } of DETECCION) {
    if (patron.test(texto)) return tipo;
  }
  return 'texto';
}
