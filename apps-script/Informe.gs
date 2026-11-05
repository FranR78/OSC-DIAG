/** Respuesta en bloques → Doc desde plantilla + informe.md. */
const BLOQUES = ['FICHA', 'TITULO', 'SINTOMA', 'CAUSAS', 'SEPARAR', 'IMAGENES', 'VALORES', 'VERIFICACION', 'COBERTURA'];
const SECCIONES = [
  ['Síntoma', 'SINTOMA'],
  ['Causas posibles', 'CAUSAS'],
  ['Cómo separar las causas', 'SEPARAR'],
  ['Imágenes de referencia', 'IMAGENES'],
  ['Valores de referencia', 'VALORES'],
  ['Verificación tras la reparación', 'VERIFICACION'],
  ['Cobertura de las fuentes', 'COBERTURA']
];

function parsear_(txt) {
  const b = {}, faltan = [];
  BLOQUES.forEach(k => {
    const m = txt.match(new RegExp('\\[\\[' + k + '\\]\\]([\\s\\S]*?)\\[\\[/' + k + '\\]\\]'));
    b[k] = m ? limpiar_(m[1]) : '';
    if (!m) faltan.push(k);
  });
  return { b, faltan };
}

function limpiar_(s) {
  return s.trim().replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '');
}

function crearInforme_(carpeta, caso, txt, fuentes) {
  carpeta.createFile('respuesta.md', txt, MimeType.PLAIN_TEXT);
  const { b, faltan } = parsear_(txt);
  const aviso = (faltan.length ? 'REVISAR: faltan bloques ' + faltan.join(', ') + '. ' : '') +
    'Informe generado por IA: revisar antes de entregar.';
  const campos = Object.assign({}, b, {
    VEHICULO: buscar_(caso.datos, /veh[ií]culo|matr[ií]cula/i),
    MOTOR: buscar_(caso.datos, /motor|cilindr/i),
    CANALES: buscar_(caso.datos, /canal/i),
    FECHA: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    FUENTES: fuentes.join(' · '),
    AVISO: aviso
  });

  const nombre = 'Informe ' + caso.nombre;
  const pid = P.getProperty('PLANTILLA_ID');
  const doc = pid
    ? DocumentApp.openById(DriveApp.getFileById(pid).makeCopy(nombre, carpeta).getId())
    : docBasico_(nombre, carpeta);
  [doc.getBody(), doc.getHeader(), doc.getFooter()].forEach(s => {
    if (s) Object.keys(campos).forEach(k => s.replaceText('\\{\\{' + k + '\\}\\}', campos[k] || '—'));
  });
  doc.saveAndClose();

  carpeta.createFile('informe.md', fichaMd_(b), MimeType.PLAIN_TEXT);
  if (cfg_('BORRAR_CAPTURAS', 'si') === 'si') caso.capturas.forEach(f => f.setTrashed(true));
  setEstado_(carpeta, faltan.length ? 'revisar' : 'hecho');
  return doc.getUrl();
}

/** Ficha en el formato de la biblioteca (YAML + secciones). */
function fichaMd_(b) {
  return ['---', b.FICHA, '---', '', '# ' + b.TITULO, '']
    .concat(...SECCIONES.filter(s => s[1] !== 'COBERTURA').map(([t, k]) => ['## ' + t, b[k], '']))
    .concat([b.COBERTURA, ''])
    .join('\n');
}

function escribirPlantilla_(body) {
  body.clear();
  body.appendParagraph('{{TITULO}}').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Vehículo: {{VEHICULO}} · Motor: {{MOTOR}} · Fecha: {{FECHA}}');
  body.appendParagraph('Canales: {{CANALES}}');
  body.appendParagraph('Fuentes: {{FUENTES}}');
  body.appendParagraph('{{AVISO}}').editAsText().setItalic(true);
  SECCIONES.forEach(([t, k]) => {
    body.appendParagraph(t).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph('{{' + k + '}}');
  });
}

function docBasico_(nombre, carpeta) {
  const d = DocumentApp.create(nombre);
  DriveApp.getFileById(d.getId()).moveTo(carpeta);
  escribirPlantilla_(d.getBody());
  return d;
}

/** Ejecutar una vez (opcional): crea una plantilla editable y guarda su ID. */
function crearPlantillaEjemplo() {
  const d = DocumentApp.create('OSC-Diag · Plantilla');
  escribirPlantilla_(d.getBody());
  d.saveAndClose();
  P.setProperty('PLANTILLA_ID', d.getId());
  Logger.log('Plantilla creada: ' + d.getUrl());
}
