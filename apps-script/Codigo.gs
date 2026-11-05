/**
 * OSC-Diag — formulario → carpeta del caso → informe (Google Docs).
 * Configuración en Propiedades del script (ver docs/INSTALAR.md).
 */
const P = PropertiesService.getScriptProperties();

function cfg_(k, def) {
  const v = P.getProperty(k);
  if (v == null || v === '') {
    if (def !== undefined) return def;
    throw new Error('Falta la propiedad del script: ' + k);
  }
  return v;
}

/** Ejecutar una vez: crea el disparador del formulario y el TOKEN. */
function instalar() {
  const form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'alEnviar')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('alEnviar').forForm(form).onFormSubmit().create();
  if (!P.getProperty('TOKEN')) P.setProperty('TOKEN', Utilities.getUuid());
  Logger.log('Disparador creado. El TOKEN está en Propiedades del script.');
}

/** Disparador: nueva respuesta del formulario. */
function alEnviar(e) {
  const caso = crearCaso_(e.response);
  if (cfg_('MOTOR', 'gemini') === 'gemini') procesarSeguro_(caso.carpeta);
}

/** Reintenta el caso más antiguo en «pendiente» o «error» (uno por ejecución). */
function reintentar() {
  const f = casosEn_(['pendiente', 'error'])[0];
  if (!f) return Logger.log('No hay casos pendientes.');
  procesarSeguro_(f);
  Logger.log(f.getName() + ' → ' + getEstado_(f));
}

function procesarSeguro_(carpeta) {
  try {
    procesarConGemini_(carpeta);
  } catch (err) {
    setEstado_(carpeta, 'error');
    carpeta.createFile('error.txt', String(err.stack || err), MimeType.PLAIN_TEXT);
  }
}

// ---------- Caso ----------

function crearCaso_(resp) {
  const datos = [], capturas = [];
  resp.getItemResponses().forEach(ir => {
    const item = ir.getItem(), r = ir.getResponse();
    if (item.getType() === FormApp.ItemType.FILE_UPLOAD) (r || []).forEach(id => capturas.push(id));
    else datos.push({ campo: item.getTitle(), valor: plano_(Array.isArray(r) ? r.join(', ') : r) });
  });
  const fecha = resp.getTimestamp();
  const veh = buscar_(datos, /veh[ií]culo|matr[ií]cula/i) || 'caso';
  const nombre = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm') + '_' + slug_(veh);
  const carpeta = DriveApp.getFolderById(cfg_('CARPETA_CASOS')).createFolder(nombre);
  capturas.forEach(id => DriveApp.getFileById(id).moveTo(carpeta));
  carpeta.createFile('caso.md', casoMd_(nombre, fecha, datos, capturas.length), MimeType.PLAIN_TEXT);
  setEstado_(carpeta, 'pendiente');
  return { carpeta, nombre, datos };
}

function casoMd_(nombre, fecha, datos, nCapturas) {
  return [
    '---',
    'id: ' + nombre,
    'fecha: ' + Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm"),
    'capturas: ' + nCapturas,
    '---',
    '',
    '## Datos del formulario',
    ...datos.map(d => '- **' + d.campo + ':** ' + d.valor),
    ''
  ].join('\n');
}

function leerCaso_(carpeta) {
  const md = carpeta.getFilesByName('caso.md').next().getBlob().getDataAsString();
  const capturas = [], it = carpeta.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (/^image\//.test(f.getMimeType())) capturas.push(f);
  }
  const datos = [];
  md.replace(/^- \*\*(.+?):\*\* (.*)$/gm, (_, campo, valor) => datos.push({ campo, valor }));
  return { nombre: carpeta.getName(), md, capturas, datos };
}

// ---------- Estado (descripción de la carpeta) ----------

function setEstado_(carpeta, e) { carpeta.setDescription('estado:' + e); }
function getEstado_(carpeta) { return (carpeta.getDescription() || '').replace('estado:', ''); }

function casosEn_(estados) {
  const it = DriveApp.getFolderById(cfg_('CARPETA_CASOS')).getFolders(), out = [];
  while (it.hasNext()) {
    const f = it.next();
    if (estados.indexOf(getEstado_(f)) >= 0) out.push(f);
  }
  return out.sort((a, b) => (a.getName() < b.getName() ? -1 : 1));
}

// ---------- Utilidades ----------

function buscar_(datos, re) {
  const d = datos.find(x => re.test(x.campo));
  return d ? d.valor : '';
}
function plano_(s) { return String(s == null ? '' : s).replace(/\s*\n+\s*/g, ' / ').trim(); }
function slug_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'caso';
}
