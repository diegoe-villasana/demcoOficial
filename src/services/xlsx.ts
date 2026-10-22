// Generador mínimo de hojas de cálculo .xlsx (Office Open XML) sin dependencias.
//
// Un .xlsx es un ZIP con unos pocos XML adentro. Como los archivos son chicos,
// el ZIP se escribe sin compresión ("store"), que Excel y LibreOffice abren sin
// problema. Así la app no suma una librería de ~1 MB al precache del service
// worker, que tiene que funcionar offline.

export type CeldaExcel = string | number | null | undefined;

export interface ColumnaHoja {
  titulo: string;
  /** Ancho en "caracteres" de Excel. */
  ancho?: number;
  /**
   * Si se define, los encabezados contiguos con el mismo grupo se fusionan en
   * una fila superior (se usa para agrupar las preguntas por sección).
   */
  grupo?: string;
}

export interface HojaExcel {
  nombre: string;
  columnas: ColumnaHoja[];
  filas: CeldaExcel[][];
}

const encoder = new TextEncoder();

function xml(texto: string): Uint8Array {
  return encoder.encode(texto);
}

// ---- ZIP (método "store") -------------------------------------------------

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function concatenar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const salida = new Uint8Array(total);
  let pos = 0;
  for (const parte of partes) {
    salida.set(parte, pos);
    pos += parte.length;
  }
  return salida;
}

interface EntradaZip {
  nombre: string;
  datos: Uint8Array;
}

function crearZip(entradas: EntradaZip[]): Uint8Array {
  const ahora = new Date();
  const hora =
    ((ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1)) & 0xffff;
  const fecha =
    (((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate()) & 0xffff;

  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;

  for (const entrada of entradas) {
    const nombre = encoder.encode(entrada.nombre);
    const crc = crc32(entrada.datos);
    const tamano = entrada.datos.length;

    // Encabezado local del archivo.
    const local = new Uint8Array(30 + nombre.length + tamano);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // firma
    lv.setUint16(4, 20, true); // versión necesaria
    lv.setUint16(6, 0x0800, true); // nombres en UTF-8
    lv.setUint16(8, 0, true); // método: store
    lv.setUint16(10, hora, true);
    lv.setUint16(12, fecha, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, tamano, true); // comprimido
    lv.setUint32(22, tamano, true); // sin comprimir
    lv.setUint16(26, nombre.length, true);
    lv.setUint16(28, 0, true); // extra
    local.set(nombre, 30);
    local.set(entrada.datos, 30 + nombre.length);

    // Entrada del directorio central.
    const central = new Uint8Array(46 + nombre.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // versión creadora
    cv.setUint16(6, 20, true); // versión necesaria
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, hora, true);
    cv.setUint16(14, fecha, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, tamano, true);
    cv.setUint32(24, tamano, true);
    cv.setUint16(28, nombre.length, true);
    cv.setUint16(30, 0, true); // extra
    cv.setUint16(32, 0, true); // comentario
    cv.setUint16(34, 0, true); // disco
    cv.setUint16(36, 0, true); // atributos internos
    cv.setUint32(38, 0, true); // atributos externos
    cv.setUint32(42, offset, true);
    central.set(nombre, 46);

    locales.push(local);
    centrales.push(central);
    offset += local.length;
  }

  const tamanoCentral = centrales.reduce((n, c) => n + c.length, 0);
  const fin = new Uint8Array(22);
  const fv = new DataView(fin.buffer);
  fv.setUint32(0, 0x06054b50, true); // firma EOCD
  fv.setUint16(4, 0, true); // disco
  fv.setUint16(6, 0, true); // disco del directorio
  fv.setUint16(8, entradas.length, true);
  fv.setUint16(10, entradas.length, true);
  fv.setUint32(12, tamanoCentral, true);
  fv.setUint32(16, offset, true);
  fv.setUint16(20, 0, true); // comentario

  return concatenar([...locales, ...centrales, fin]);
}

// ---- XML ----------------------------------------------------------------

function escapar(texto: string): string {
  return texto
    // Caracteres de control que no son válidos en XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function letraColumna(indice: number): string {
  let letras = '';
  let n = indice + 1;
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function celdaTexto(columna: number, fila: number, texto: string, estilo: number): string {
  const ref = `${letraColumna(columna)}${fila}`;
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escapar(texto)}</t></is></c>`;
}

const ESTILO_ENCABEZADO = 1;
const ESTILO_GRUPO = 2;
const ESTILO_TEXTO = 3;
const ESTILO_NUMERO = 4;

function hojaXml(hoja: HojaExcel, primera: boolean): string {
  const columnas = hoja.columnas;
  const conGrupos = columnas.some((c) => c.grupo !== undefined);
  const filaEncabezado = conGrupos ? 2 : 1;
  const ultimaColumna = letraColumna(columnas.length - 1);
  const ultimaFila = filaEncabezado + hoja.filas.length;

  const filas: string[] = [];
  const fusiones: string[] = [];

  // Fila superior con los títulos de sección fusionados por tramos.
  if (conGrupos) {
    const celdas: string[] = [];
    let i = 0;
    while (i < columnas.length) {
      const grupo = columnas[i].grupo;
      let j = i;
      while (j + 1 < columnas.length && columnas[j + 1].grupo === grupo) j++;
      if (grupo) {
        celdas.push(celdaTexto(i, 1, grupo, ESTILO_GRUPO));
        if (j > i) fusiones.push(`${letraColumna(i)}1:${letraColumna(j)}1`);
      }
      i = j + 1;
    }
    filas.push(`<row r="1">${celdas.join('')}</row>`);
  }

  filas.push(
    `<row r="${filaEncabezado}">${columnas
      .map((c, i) => celdaTexto(i, filaEncabezado, c.titulo, ESTILO_ENCABEZADO))
      .join('')}</row>`
  );

  hoja.filas.forEach((fila, indice) => {
    const numFila = filaEncabezado + 1 + indice;
    const celdas = fila.map((valor, i) => {
      const ref = `${letraColumna(i)}${numFila}`;
      if (typeof valor === 'number' && Number.isFinite(valor)) {
        return `<c r="${ref}" s="${ESTILO_NUMERO}"><v>${valor}</v></c>`;
      }
      if (valor === null || valor === undefined || valor === '') {
        return `<c r="${ref}" s="${ESTILO_TEXTO}"/>`;
      }
      return `<c r="${ref}" s="${ESTILO_TEXTO}" t="inlineStr"><is><t xml:space="preserve">${escapar(
        String(valor)
      )}</t></is></c>`;
    });
    filas.push(`<row r="${numFila}">${celdas.join('')}</row>`);
  });

  const cols = columnas
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.ancho ?? 18}" customWidth="1"/>`)
    .join('');

  // La fila de encabezados queda fija al desplazarse.
  const vistas = `<sheetViews><sheetView${
    primera ? ' tabSelected="1"' : ''
  } workbookViewId="0"><pane ySplit="${filaEncabezado}" topLeftCell="A${
    filaEncabezado + 1
  }" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;

  const filtro =
    hoja.filas.length > 0
      ? `<autoFilter ref="A${filaEncabezado}:${ultimaColumna}${ultimaFila}"/>`
      : '';

  const bloqueFusiones =
    fusiones.length > 0
      ? `<mergeCells count="${fusiones.length}">${fusiones
          .map((f) => `<mergeCell ref="${f}"/>`)
          .join('')}</mergeCells>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${ultimaColumna}${ultimaFila}"/>${vistas}<sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${filas.join(
    ''
  )}</sheetData>${bloqueFusiones}${filtro}</worksheet>`;
}

function nombreValido(nombre: string, usados: Set<string>): string {
  // Excel no acepta estos caracteres ni más de 31 caracteres por hoja.
  const base =
    nombre
      .replace(/[[\]\\:*?/]/g, ' ')
      .replace(/^'+|'+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 31) || 'Hoja';

  let final = base;
  let n = 2;
  while (usados.has(final.toLowerCase())) {
    const sufijo = ` (${n++})`;
    final = base.slice(0, 31 - sufijo.length) + sufijo;
  }
  usados.add(final.toLowerCase());
  return final;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF1F2421"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF008751"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6F2EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9DEE3"/></left><right style="thin"><color rgb="FFD9DEE3"/></right><top style="thin"><color rgb="FFD9DEE3"/></top><bottom style="thin"><color rgb="FFD9DEE3"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" horizontal="right"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/** Arma el libro completo y lo devuelve como Blob listo para descargar. */
export function crearXlsx(hojas: HojaExcel[]): Blob {
  if (hojas.length === 0) throw new Error('El libro necesita al menos una hoja.');

  const usados = new Set<string>();
  const nombres = hojas.map((h) => nombreValido(h.nombre, usados));

  const tiposContenido = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${hojas
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const relacionesRaiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const libro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nombres
    .map((nombre, i) => `<sheet name="${escapar(nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')}</sheets></workbook>`;

  const relacionesLibro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
          i + 1
        }.xml"/>`
    )
    .join(
      ''
    )}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const entradas: EntradaZip[] = [
    { nombre: '[Content_Types].xml', datos: xml(tiposContenido) },
    { nombre: '_rels/.rels', datos: xml(relacionesRaiz) },
    { nombre: 'xl/workbook.xml', datos: xml(libro) },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: xml(relacionesLibro) },
    { nombre: 'xl/styles.xml', datos: xml(ESTILOS) },
    ...hojas.map((hoja, i) => ({
      nombre: `xl/worksheets/sheet${i + 1}.xml`,
      datos: xml(hojaXml(hoja, i === 0)),
    })),
  ];

  // TS 5.9 tipa Uint8Array sobre ArrayBufferLike, pero acá el buffer siempre es
  // propio (ArrayBuffer); el cast sólo evita el falso positivo de BlobPart.
  return new Blob([crearZip(entradas) as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
