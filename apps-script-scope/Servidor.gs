/**
 * Analyzer Scope · servidor (proyecto propio, NO es el portal).
 * Guía: docs/SERVIDOR_SCOPE.md. Contrato con la app: analyzer-scope/docs/API_DIAGNOSTICO.md §12–13.
 *
 * Cada usuario ejecuta la app sobre la copia del dueño (implementación «Ejecutar como: yo» ·
 * «Cualquier usuario con cuenta de Google»). Si el dueño cierra el proyecto o quita a alguien, deja de entrar.
 *
 * Quién es: con cuenta de Google de fuera del dominio del dueño, Google NO da el correo; se le reconoce por su
 * clave temporal (Session.getTemporaryActiveUserKey), que se ata a su correo al abrir su enlace personal (?inv=…).
 *
 * Hoja (Propiedades del script: SCOPE_SHEET_ID, la crea scopeSetup()):
 *   Usuarios  correo · nombre · activo (sí/no) · caduca (AAAA-MM-DD) · paquetes («*», ids o vacío) · rol (cliente|autor|admin) · alta
 *   Paquetes  id · nombre · autor · visibilidad (todos|asignado) · version · json · actualizado
 *   Reglas    correo · json («Mis reglas») · actualizado
 *   Canales   id · nombre · autor · visibilidad · version · json · actualizado   (canales matemáticos compartidos)
 * Catálogo central (skills y procedimientos verificados): analyzer-scope/catalogo del repo, leído de GitHub (catalogo_lista / catalogo_bajar).
 * Propiedades: URL_SCOPE (URL /exec, para los enlaces), DOMINIOS_LIBRES (dominios que entran sin fila, separados por comas), INV_<hash código> {c,t,k}, K_<hash clave> correo, KC_<correo> hash.
 */
var HOJAS = {
  Usuarios: ['correo', 'nombre', 'activo', 'caduca', 'paquetes', 'rol', 'alta'],
  Paquetes: ['id', 'nombre', 'autor', 'visibilidad', 'version', 'json', 'actualizado'],
  Reglas: ['correo', 'json', 'actualizado'],
  Canales: ['id', 'nombre', 'autor', 'visibilidad', 'version', 'json', 'actualizado']
};
var V = 1, JSON_MAX = 45000, INV_CADUCA_MS = 14 * 24 * 3600 * 1000, CORREO_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
var OPS = { reglas_leer: 1, reglas_guardar: 1, paquetes_lista: 1, paquete_bajar: 1, paquete_publicar: 1, catalogo_lista: 1, catalogo_bajar: 1, buscar: 1, nt: 1, diagnostico: 1 };

/* ------------------------------------------------------------- entrada --- */

function doGet(e) {
  var inv = e && e.parameter && e.parameter.inv;
  if (inv) { try { canjear_(inv); } catch (err) { return sinAcceso_(err.message); } }
  var pm = permisos_();
  if (!pm.ok) return sinAcceso_(pm.motivo);
  return HtmlService.createHtmlOutput(app_()).setTitle('Analyzer Scope')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* La app se baja de GitHub (main): cada versión nueva llega sola en ≤ 10 min, sin pegar App.html ni reimplementar.
   Propiedad opcional APP_URL (otra rama o un fork). Si GitHub falla, sirve el archivo App del proyecto. */
var APP_URL_ = 'https://raw.githubusercontent.com/FranR78/OSC-DIAG/main/apps-script-scope/App.html', APP_TROZO_ = 45000;
function app_() {
  var c = CacheService.getScriptCache(), n = parseInt(c.get('app:n'), 10);
  if (n) {
    var keys = []; for (var i = 0; i < n; i++) keys.push('app:' + i);
    var t = c.getAll(keys), s = '';
    for (var j = 0; j < n && s !== null; j++) s = t[keys[j]] == null ? null : s + t[keys[j]];
    if (s) return s;
  }
  try {
    var url = PropertiesService.getScriptProperties().getProperty('APP_URL') || APP_URL_;
    var r = UrlFetchApp.fetch(url + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      var txt = r.getContentText('UTF-8'), o = {}, m = Math.ceil(txt.length / APP_TROZO_);
      for (var k = 0; k < m; k++) o['app:' + k] = txt.slice(k * APP_TROZO_, (k + 1) * APP_TROZO_);
      try { c.putAll(o, 600); c.put('app:n', String(m), 600); } catch (e) { /* sin caché */ }
      return txt;
    }
  } catch (e) { console.error('app_: ' + e); }
  return HtmlService.createHtmlOutputFromFile('App').getContent();
}
/** Editor: fuerza a bajar ya la última versión (tras publicar una nueva). */
function appActualizar() { CacheService.getScriptCache().remove('app:n'); return app_().length; }

/** La app llama aquí con google.script.run (mismo nombre que en el portal). */
function apiDiagnostico(pt) {
  var op = pt && pt.op;
  if (!pt || typeof pt !== 'object' || !OPS[op]) return err_(op, 'peticion_invalida', 'op desconocida.');
  var pm = permisos_();
  if (!pm.ok) return err_(op, 'no_autorizado', pm.motivo);
  // Este servidor no tiene notas técnicas: el diagnóstico se hace en la app con los paquetes de reglas.
  if (op === 'buscar' || op === 'nt' || op === 'diagnostico') return err_(op, 'sin_notas', 'Este servidor no tiene notas técnicas: el diagnóstico usa tus paquetes de reglas.');
  try {
    var r = op === 'reglas_leer' ? reglasLeer_(pm) : op === 'reglas_guardar' ? reglasGuardar_(pm, pt)
      : op === 'paquetes_lista' ? paquetesLista_(pm) : op === 'paquete_bajar' ? paqueteBajar_(pm, pt)
      : op === 'catalogo_lista' ? catalogoLista_(pm) : op === 'catalogo_bajar' ? catalogoBajar_(pm, pt) : paquetePublicar_(pm, pt);
    if (r.ok === false) return r;
    r.ok = true; r.v = V; r.op = op;
    return r;
  } catch (e) {
    console.error(op + ': ' + (e && e.stack || e));
    return err_(op, 'interno', 'No se pudo atender la petición.');
  }
}
function err_(op, codigo, mensaje) { return { ok: false, v: V, op: op || '', error: { codigo: codigo, mensaje: mensaje } }; }

function sinAcceso_(msg) {
  return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<p style="font-family:\'Open Sans\',sans-serif;padding:24px;max-width:36em;line-height:1.5;color:#12263a">' +
    String(msg).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</p>')
    .setTitle('Analyzer Scope');
}

/* ------------------------------------------------------------- quién es --- */

function hash_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)).replace(/=+$/, '');
}
function correoGoogle_() { try { return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { return ''; } }
function claveTemporal_() { try { return String(Session.getTemporaryActiveUserKey() || ''); } catch (e) { return ''; } }
function dueno_() { try { return String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { return ''; } }

var ID_ = null;
/** Correo de quien llama (del dominio del dueño, o atado a su clave por el enlace personal), o ''. */
function quien_() {
  if (ID_ !== null) return ID_;
  var c = correoGoogle_();
  if (!c) { var k = claveTemporal_(); if (k) c = PropertiesService.getScriptProperties().getProperty('K_' + hash_(k)) || ''; }
  ID_ = c;
  return c;
}

function canjear_(codigo) {
  codigo = String(codigo || '').replace(/[^A-Za-z0-9_-]/g, '');
  var k = claveTemporal_();
  if (correoGoogle_()) return;   // del dominio: Google ya da el correo
  if (!k || codigo.length < 20) throw new Error('Enlace no válido.');
  var hk = hash_(k), cache = CacheService.getScriptCache(), fallos = parseInt(cache.get('fallo:' + hk), 10) || 0;
  if (fallos >= 10) throw new Error('Demasiados intentos. Prueba dentro de una hora.');
  var p = PropertiesService.getScriptProperties(), hc = hash_(codigo), lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var inv = null;
    try { inv = JSON.parse(p.getProperty('INV_' + hc) || 'null'); } catch (e) { inv = null; }
    if (!inv || !inv.c) { cache.put('fallo:' + hk, String(fallos + 1), 3600); throw new Error('Enlace no válido o caducado. Pide uno nuevo.'); }
    if (inv.k && inv.k !== hk) { cache.put('fallo:' + hk, String(fallos + 1), 3600); throw new Error('Este enlace ya lo usa otra cuenta de Google. Pide uno nuevo.'); }
    if (!inv.k) {
      if (Date.now() - (inv.t || 0) > INV_CADUCA_MS) throw new Error('Enlace caducado (14 días sin usar). Pide uno nuevo.');
      inv.k = hk; p.setProperty('INV_' + hc, JSON.stringify(inv));
    }
    var viejo = p.getProperty('KC_' + inv.c);
    if (viejo && viejo !== hk) p.deleteProperty('K_' + viejo);
    p.setProperty('K_' + hk, inv.c); p.setProperty('KC_' + inv.c, hk);
  } finally { lock.releaseLock(); }
  ID_ = null;
}

/* ------------------------------------------------------------- permisos --- */

function hoy_() { return Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd'); }
function fecha_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Europe/Madrid', 'yyyy-MM-dd') : String(v || '').trim(); }
function si_(v) { return String(v).trim().toUpperCase().indexOf('S') === 0; }

/** { ok, motivo, correo, paquetes:'*'|[ids], rol, caduca }. Nunca lanza. */
function permisos_() {
  var correo = quien_();
  if (!correo) return { ok: false, motivo: 'No sabemos quién eres. Abre el enlace personal que te dieron, con tu cuenta de Google.' };
  if (correo === dueno_()) return { ok: true, correo: correo, paquetes: '*', rol: 'admin', notas: false };
  var u = null;
  try { u = filas_('Usuarios').filter(function (x) { return String(x.correo).trim().toLowerCase() === correo; })[0] || null; } catch (e) { u = null; }
  if (!u) {   // sin fila: entra si su dominio está en DOMINIOS_LIBRES (p. ej. el alumnado del centro), como cliente
    var dl = String(PropertiesService.getScriptProperties().getProperty('DOMINIOS_LIBRES') || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
    if (dl.indexOf(correo.split('@')[1]) !== -1) return { ok: true, correo: correo, caduca: '', notas: false, paquetes: [], rol: 'cliente' };
  }
  if (!u || !si_(u.activo)) return { ok: false, correo: correo, motivo: 'Tu cuenta (' + correo + ') no tiene acceso a Analyzer Scope o está desactivada.' };
  var cad = fecha_(u.caduca);
  if (cad && cad < hoy_()) return { ok: false, correo: correo, motivo: 'Tu acceso a Analyzer Scope caducó el ' + cad + '.' };
  var pq = String(u.paquetes || '').trim();
  return { ok: true, correo: correo, caduca: cad, notas: false, paquetes: pq === '*' ? '*' : pq.split(/[,;\s]+/).filter(Boolean),
           rol: /^(autor|admin)$/i.test(String(u.rol || '')) ? String(u.rol).toLowerCase() : 'cliente' };
}

/* ---------------------------------------------------------------- Hoja --- */

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SCOPE_SHEET_ID');
  if (!id) throw new Error('Falta SCOPE_SHEET_ID: ejecuta scopeSetup() en el editor.');
  return SpreadsheetApp.openById(id);
}
function hoja_(n) {
  var ss = ss_(), sh = ss.getSheetByName(n);
  if (sh) return sh;
  sh = ss.insertSheet(n);
  sh.getRange(1, 1, 1, HOJAS[n].length).setValues([HOJAS[n]]).setFontWeight('bold');
  return sh;
}
function filas_(n) {
  var v = hoja_(n).getDataRange().getValues();
  if (v.length < 2) return [];
  var cab = v[0].map(function (c) { return String(c).trim(); });
  return v.slice(1).filter(function (r) { return String(r[0]).trim() !== ''; })
    .map(function (r) { var o = {}; cab.forEach(function (c, j) { o[c] = r[j]; }); return o; });
}
/** Escribe la fila cuya 1.ª columna es clave (o la añade). */
function guardaFila_(n, clave, row) {
  var sh = hoja_(n), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (String(v[i][0]) === String(clave)) { sh.getRange(i + 1, 1, 1, row.length).setValues([row]); return; }
  sh.appendRow(row);
}

/* ----------------------------------------------------- reglas y paquetes --- */

function reglasLeer_(pm) {
  var txt = '';
  filas_('Reglas').forEach(function (r) { if (String(r.correo).toLowerCase() === pm.correo) txt = String(r.json || ''); });
  var a = []; try { a = txt ? JSON.parse(txt) : []; } catch (e) { a = []; }
  return { paquetes: Array.isArray(a) ? a : [], permisos: { notas: false, rol: pm.rol, caduca: pm.caduca || '' } };
}
function reglasGuardar_(pm, pt) {
  var a = Array.isArray(pt.paquetes) ? pt.paquetes : null;
  if (!a || a.some(function (p) { return !p || typeof p !== 'object' || !p.paquete || !Array.isArray(p.reglas); }))
    return err_('reglas_guardar', 'peticion_invalida', 'paquetes debe ser una lista de paquetes de reglas.');
  var txt = JSON.stringify(a);
  if (txt.length > JSON_MAX) return err_('reglas_guardar', 'demasiado_grande', 'Tus reglas pasan de 45 KB: exporta y borra las que no uses.');
  guardaFila_('Reglas', pm.correo, [pm.correo, txt, new Date()]);
  return { bytes: txt.length };
}
function visibles_(pm) {
  return filas_('Paquetes').filter(function (p) {
    return String(p.visibilidad || 'todos').toLowerCase() !== 'asignado' || pm.paquetes === '*' || pm.paquetes.indexOf(String(p.id).trim()) !== -1;
  });
}
function paquetesLista_(pm) {
  return {
    paquetes: visibles_(pm).map(function (p) {
      var n = 0; try { n = (JSON.parse(p.json || '{}').reglas || []).length; } catch (e) { n = 0; }
      return { id: String(p.id), nombre: String(p.nombre || p.id), autor: String(p.autor || ''), version: String(p.version || ''), reglas: n };
    }),
    permisos: { notas: false, rol: pm.rol, caduca: pm.caduca || '' }
  };
}
function paqueteBajar_(pm, pt) {
  var id = String(pt.id || ''), p = visibles_(pm).filter(function (x) { return String(x.id) === id; })[0];
  if (!p) return err_('paquete_bajar', 'no_autorizado', 'Ese paquete no existe o no lo tienes asignado.');
  var o; try { o = JSON.parse(p.json); } catch (e) { return err_('paquete_bajar', 'interno', 'El paquete guardado no es válido.'); }
  o.paquete = id; o.nombre = String(p.nombre || o.nombre || id); o.autor = String(p.autor || o.autor || ''); o.version = String(p.version || o.version || '');
  return { paquete: o };
}
/** Autor o admin. Nace «asignado»: el dueño decide a quién en la Hoja. */
function paquetePublicar_(pm, pt) {
  if (pm.rol !== 'autor' && pm.rol !== 'admin') return err_('paquete_publicar', 'no_autorizado', 'Solo los autores pueden publicar paquetes.');
  var p = pt.paquete, txt = JSON.stringify(p || null);
  if (!p || !p.paquete || !Array.isArray(p.reglas)) return err_('paquete_publicar', 'peticion_invalida', 'Falta el paquete.');
  if (txt.length > JSON_MAX) return err_('paquete_publicar', 'demasiado_grande', 'El paquete pasa de 45 KB.');
  var id = String(p.paquete).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
  if (id === 'nt' || id.length < 2) return err_('paquete_publicar', 'peticion_invalida', 'Identificador de paquete no válido.');
  var ya = filas_('Paquetes').filter(function (x) { return String(x.id) === id; })[0];
  if (ya && String(ya.autor).toLowerCase() !== pm.correo && pm.rol !== 'admin') return err_('paquete_publicar', 'no_autorizado', 'Ese identificador es de otro autor.');
  guardaFila_('Paquetes', id, [id, String(p.nombre || id), ya ? ya.autor : pm.correo, ya ? ya.visibilidad || 'asignado' : 'asignado', String(p.version || hoy_()), txt, new Date()]);
  return { id: id };
}

/* ----------------------------------------------------- catálogo central --- */
/* Skills y procedimientos verificados: carpeta analyzer-scope/catalogo del repo (main), leída de GitHub con caché de 10 min.
   Lo «libre» lo ve todo el que entra; lo «vip» solo quien lo tenga en su columna «paquetes» (o «*»). Propiedad opcional CATALOGO_URL. */
var CAT_URL_ = 'https://raw.githubusercontent.com/FranR78/OSC-DIAG/main/analyzer-scope/catalogo/';
function catUrl_() { return PropertiesService.getScriptProperties().getProperty('CATALOGO_URL') || CAT_URL_; }
function catLee_(ruta) {
  var c = CacheService.getScriptCache(), k = 'cat:' + ruta, v = c.get(k);
  if (v) return JSON.parse(v);
  var r = UrlFetchApp.fetch(catUrl_() + ruta + '?t=' + Date.now(), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('catálogo: ' + ruta + ' → ' + r.getResponseCode());
  var txt = r.getContentText('UTF-8');
  try { if (txt.length < 95000) c.put(k, txt, 600); } catch (e) { /* sin caché */ }
  return JSON.parse(txt);
}
function catVe_(pm, it) { return it.acceso !== 'vip' || pm.paquetes === '*' || pm.paquetes.indexOf(String(it.id)) !== -1; }
function catalogoLista_(pm) {
  var ix = catLee_('indice.json').indice || [];
  return { indice: ix.filter(function (it) { return catVe_(pm, it); }), permisos: { notas: false, rol: pm.rol, caduca: pm.caduca || '' } };
}
function catalogoBajar_(pm, pt) {
  var ix = catLee_('indice.json').indice || [], it = ix.filter(function (x) { return x.tipo === pt.tipo && String(x.id) === String(pt.id); })[0];
  if (!it || !catVe_(pm, it)) return err_('catalogo_bajar', 'no_autorizado', 'Ese elemento no existe en el catálogo o no lo tienes asignado.');
  if (!/^(skills|procedimientos)\/[a-z0-9._-]+\.json$/i.test(it.archivo)) return err_('catalogo_bajar', 'interno', 'Ruta no válida en el índice.');
  return { item: catLee_(it.archivo) };
}
/** Editor: tras publicar algo nuevo en el catálogo, que se vea ya (sin esperar a la caché). */
function catalogoActualizar() { var c = CacheService.getScriptCache(); c.remove('cat:indice.json'); return catalogoLista_({ paquetes: '*', rol: 'admin' }).indice.length; }

/* ------------------------------------------- para el dueño, desde el editor --- */

/** Una vez: crea la Hoja con sus pestañas y la guarda en Propiedades del script. */
function scopeSetup() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SCOPE_SHEET_ID')) p.setProperty('SCOPE_SHEET_ID', SpreadsheetApp.create('Analyzer Scope · usuarios y paquetes').getId());
  Object.keys(HOJAS).forEach(hoja_);
  console.log('Hoja: ' + ss_().getUrl());
}

/** Alta o enlace nuevo (anula el anterior). Pon el correo, ejecuta y copia el enlace del registro. */
function crearEnlace(correo) {
  correo = String(correo || '').trim().toLowerCase();
  if (!CORREO_RE.test(correo)) throw new Error('Correo no válido: ' + correo);
  var p = PropertiesService.getScriptProperties();
  var hk = p.getProperty('KC_' + correo); if (hk) p.deleteProperty('K_' + hk); p.deleteProperty('KC_' + correo);
  var viejo = p.getProperty('CODIGO_' + correo); if (viejo) p.deleteProperty('INV_' + viejo);
  var codigo = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''), h = hash_(codigo);
  p.setProperty('INV_' + h, JSON.stringify({ c: correo, t: Date.now(), k: '' })); p.setProperty('CODIGO_' + correo, h);
  if (!filas_('Usuarios').some(function (u) { return String(u.correo).trim().toLowerCase() === correo; }))
    guardaFila_('Usuarios', correo, [correo, '', 'sí', '', '', 'cliente', new Date()]);
  var url = p.getProperty('URL_SCOPE') || '<URL /exec>';
  var enlace = url + (url.indexOf('?') < 0 ? '?' : '&') + 'inv=' + codigo;
  console.log(correo + ' → ' + enlace);
  return enlace;
}
/** Ejemplo para el editor: cambia el correo y ejecuta esta. */
function crearEnlaceEjemplo() { crearEnlace('cliente@ejemplo.com'); }

/** Quitar acceso al momento (además de poner activo = no en la Hoja). */
function quitarAcceso(correo) {
  correo = String(correo || '').trim().toLowerCase();
  var p = PropertiesService.getScriptProperties(), hk = p.getProperty('KC_' + correo), c = p.getProperty('CODIGO_' + correo);
  if (hk) p.deleteProperty('K_' + hk); if (c) p.deleteProperty('INV_' + c);
  ['KC_', 'CODIGO_'].forEach(function (x) { p.deleteProperty(x + correo); });
}
