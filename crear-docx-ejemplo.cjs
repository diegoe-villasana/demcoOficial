const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const parrafos = [
  { texto: 'Encuesta de satisfacción DEMCO', estilo: 'Title' },
  { texto: '¿Cuál es tu barrio? [Múltiple]' },
  { texto: '- Centro' },
  { texto: '- Norte' },
  { texto: '- Sur' },
  { texto: '¿Qué opinas del servicio al cliente? [Abierta]' },
  { texto: '¿Cómo calificas estos aspectos? [Matriz]' },
  { texto: '- Atención al cliente' },
  { texto: '- Calidad del servicio técnico' },
  { texto: '¿Recomendarías los servicios de DEMCO a alguien más? [Múltiple]' },
  { texto: '- Sí' },
  { texto: '- No' },
];

function bloquep(p) {
  const pPr = p.estilo ? `<w:pPr><w:pStyle w:val="${p.estilo}"/></w:pPr>` : '';
  const rPr = p.estilo ? `<w:rPr><w:rStyle w:val="${p.estilo}"/></w:rPr>` : '';
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${p.texto}</w:t></w:r></w:p>`;
}

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${parrafos.map(bloquep).join('')}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>
</w:body>
</w:document>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', contentTypesXml);
zip.folder('_rels').file('.rels', relsXml);
zip.folder('word').file('document.xml', documentXml);

const salida = path.join(__dirname, '..', 'encuesta-muestra.docx');
zip
  .generateAsync({ type: 'nodebuffer' })
  .then((buffer) => fs.writeFileSync(salida, buffer))
  .then(() => console.log('Creado:', salida));