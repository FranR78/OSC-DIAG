/**
 * Analyzer Scope — biblioteca de señales de referencia (servidor propio, independiente de cualquier portal).
 *
 * La app envía la ficha de una captura y la señal reducida; aquí se guardan en «pendientes» de una carpeta de Drive.
 * Quien administra la biblioteca abre cada CSV en Analyzer Scope, lo comprueba y lo mueve a «verificadas» o «descartadas».
 * Solo puede enviar quien tenga un código de invitación.
 *
 * Configuración en Propiedades del script (docs/BIBLIOTECA.md). Nada fijo en el código:
 *   CARPETA_BIBLIOTECA  id de la carpeta de Drive de la biblioteca
 *   CODIGOS             JSON {"codigo": "nombre de quien lo usa"} — lo mantienen nuevoCodigo() y anularCodigo()
 *   LIMITE_DIA          envíos por código y día (por defecto 20)
 *   MAX_KB              tamaño máximo del CSV en KB (por defecto 3000)
 *
 *   POST  {v:1, op:'referencia', codigo, ficha, archivo:{nombre, csv, muestras, muestras_original}, cliente, lang}
 *   GET   ?op=comprobar&codigo=…   → dice si el código vale (para que la app lo compruebe antes de enviar)
 */
const P = PropertiesService.getScriptProperties();
const SUB = ['pendientes', 'verificadas', 'descartadas'];

function cfg_(k, def) {
  const v = P.getProperty(k);
  if (v == null || v === '') {
    if (def !== undefined) return def;
    throw new Error('Falta la propiedad del script: ' + k);
  }
  return v;
}

/** Ejecutar una vez tras poner CARPETA_BIBLIOTECA: crea las subcarpetas. */
function instalar() {
  const raiz = DriveApp.getFolderById(cfg_('CARPETA_BIBLIOTECA'));
  SUB.forEach(n => { if (!raiz.getFoldersByName(n).hasNext()) raiz.createFolder(n); });
  if (!P.getProperty('CODIGOS')) P.setProperty('CODIGOS', '{}');
  Logger.log('Biblioteca lista: ' + SUB.join(', ') + '. Crea códigos con nuevoCodigo("nombre").');
}

/** Crea un código de invitación. Ejecutar desde el editor: nuevoCodigo('Taller de ejemplo'). El código sale en el registro. */
function nuevoCodigo(nombre) {
  if (!nombre) throw new Error('Indica para quién es: nuevoCodigo("nombre")');
  const c = codigos_(), cod = Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
  c[cod] = String(nombre).slice(0, 60);
  P.setProperty('CODIGOS', JSON.stringify(c));
  Logger.log('Código para ' + c[cod] + ': ' + cod);
  return cod;
}

/** Anula un código: anularCodigo('ABCDEF1234'). */
function anularCodigo(cod) {
  const c = codigos_();
  delete c[String(cod || '').toUpperCase()];
  P.setProperty('CODIGOS', JSON.stringify(c));
}

/** Lista en el registro los códigos en vigor y a quién pertenecen. */
function listarCodigos() {
  const c = codigos_();
  Object.keys(c).forEach(k => Logger.log(k + ' · ' + c[k]));
}

function codigos_() {
  try { return JSON.parse(P.getProperty('CODIGOS') || '{}') || {}; } catch (e) { return {}; }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.op === 'comprobar') return json_(quien_(p.codigo) ? { ok: true, v: 1, op: 'comprobar' } : err_('comprobar', 'no_autorizado', 'El código de invitación no es válido.'));
  return json_(err_(p.op || '', 'peticion_invalida', 'Operación no reconocida.'));
}

function doPost(e) {
  let p;
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (x) { return json_(err_('', 'peticion_invalida', 'La petición no es JSON.')); }
  try {
    if (p.op !== 'referencia') return json_(err_(p.op || '', 'peticion_invalida', 'Operación no reconocida.'));
    return json_(referencia_(p));
  } catch (x) {
    return json_(err_('referencia', 'interno', 'No se pudo guardar. Inténtalo más tarde.'));
  }
}

function referencia_(p) {
  const quien = quien_(p.codigo);
  if (!quien) return err_('referencia', 'no_autorizado', 'El código de invitación no es válido.');
  const f = p.ficha || {}, a = p.archivo || {}, csv = String(a.csv || '');
  if (f.estado !== 'ok' && f.estado !== 'fallo') return err_('referencia', 'peticion_invalida', 'Falta el estado del motor.');
  if (!csv || !/^(﻿)?#analyzer-scope-ajustes;/.test(csv)) return err_('referencia', 'peticion_invalida', 'El archivo no es un CSV con ajustes de Analyzer Scope.');
  if (csv.length > Number(cfg_('MAX_KB', '3000')) * 1024) return err_('referencia', 'peticion_invalida', 'El archivo es demasiado grande.');
  if (!cuota_(String(p.codigo).toUpperCase())) return err_('referencia', 'cuota', 'Has llegado al límite de envíos de hoy.');

  const t = s => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim();
  const ficha = {
    marca: t(f.marca).slice(0, 60), codigo: t(f.codigo).slice(0, 12), combustible: t(f.combustible).slice(0, 12),
    condicion: t(f.condicion).slice(0, 12), temp: t(f.temp).slice(0, 12), obs: t(f.obs).slice(0, 200),
    estado: f.estado, averia: t(f.averia).slice(0, 120),
    cilindros: Number(f.cilindros) || null, orden: Array.isArray(f.orden) ? f.orden.slice(0, 16).map(Number) : [], rpm: Number(f.rpm) || null,
    senales: (Array.isArray(f.senales) ? f.senales : []).slice(0, 8).map(s => ({
      canal: t(s.canal).slice(0, 6), nombre: t(s.nombre).slice(0, 40), parametro: t(s.parametro).slice(0, 40),
      entidad: t(s.entidad).slice(0, 40), unidad: t(s.unidad).slice(0, 8)
    }))
  };
  const ahora = new Date(), sello = Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const base = [slug_(ficha.codigo || ficha.marca || 'motor'), slug_(ficha.condicion || 'prueba'), ficha.estado, sello].join('_');
  const dest = sub_('pendientes');
  const fcsv = dest.createFile(base + '.csv', csv, MimeType.CSV);
  dest.createFile(base + '.json', JSON.stringify({
    v: 1, estado_revision: 'pendiente', recibido: ahora.toISOString(), enviado_por: quien,
    cliente: { app: t((p.cliente || {}).app).slice(0, 30), ver: t((p.cliente || {}).ver).slice(0, 20) },
    archivo: { nombre_original: t(a.nombre).slice(0, 120), muestras: Number(a.muestras) || null, muestras_original: Number(a.muestras_original) || null, csv: fcsv.getId() },
    ficha: ficha
  }, null, 1), MimeType.PLAIN_TEXT);
  return { ok: true, v: 1, op: 'referencia', id: fcsv.getId(), estado: 'pendiente' };
}

function quien_(cod) {
  const c = codigos_(), k = String(cod || '').trim().toUpperCase();
  return k && Object.prototype.hasOwnProperty.call(c, k) ? c[k] : null;
}

/** Cuenta los envíos del día por código; false si se ha pasado del límite. */
function cuota_(cod) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
    let c = {};
    try { c = JSON.parse(P.getProperty('CUENTA') || '{}') || {}; } catch (e) { c = {}; }
    if (c.dia !== hoy) c = { dia: hoy, n: {} };
    const n = (c.n[cod] || 0) + 1;
    if (n > Number(cfg_('LIMITE_DIA', '20'))) return false;
    c.n[cod] = n;
    P.setProperty('CUENTA', JSON.stringify(c));
    return true;
  } finally { lock.releaseLock(); }
}

function sub_(nombre) {
  const raiz = DriveApp.getFolderById(cfg_('CARPETA_BIBLIOTECA')), it = raiz.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : raiz.createFolder(nombre);
}

function slug_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).toLowerCase() || 'x';
}

function err_(op, codigo, mensaje) { return { ok: false, v: 1, op: op, error: { codigo: codigo, mensaje: mensaje } }; }

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
