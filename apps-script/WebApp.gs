/**
 * Web app para el motor NotebookLM (extensión de Chrome).
 *  GET  ?accion=siguiente&token=…           → caso pendiente más antiguo (md + capturas base64)
 *  POST {accion:'informe', token, id, texto, fuentes[]} → Doc del caso
 */
function doGet(e) { return json_(manejar_(e.parameter || {})); }
function doPost(e) { return json_(manejar_(JSON.parse((e.postData && e.postData.contents) || '{}'))); }

function manejar_(p) {
  try {
    if (!p.token || p.token !== cfg_('TOKEN')) return { ok: false, error: 'token' };
    if (p.accion === 'siguiente') return siguiente_();
    if (p.accion === 'informe') return recibirInforme_(p.id, p.texto, p.fuentes);
    return { ok: false, error: 'accion' };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function siguiente_() {
  const f = casosEn_(['pendiente'])[0];
  if (!f) return { ok: true, caso: null };
  const c = leerCaso_(f);
  return { ok: true, caso: {
    id: f.getId(), nombre: c.nombre, md: c.md,
    capturas: c.capturas.map(x => ({
      nombre: x.getName(), mime: x.getMimeType(), b64: Utilities.base64Encode(x.getBlob().getBytes())
    }))
  } };
}

function recibirInforme_(id, texto, fuentes) {
  const carpeta = DriveApp.getFolderById(id);
  const padre = carpeta.getParents();
  if (!padre.hasNext() || padre.next().getId() !== cfg_('CARPETA_CASOS')) throw new Error('El caso no está en Casos.');
  if (!texto) throw new Error('Sin texto.');
  const c = leerCaso_(carpeta);
  // Si la respuesta no viene en bloques, Gemini (solo texto, barato) la maqueta.
  const txt = /\[\[SINTOMA\]\]/.test(texto)
    ? texto
    : generar_(PROMPT_MAQUETAR, [{ text: 'CASO:\n' + c.md + '\n\nANÁLISIS:\n' + texto }]);
  return { ok: true, url: crearInforme_(carpeta, c, txt, fuentes || []) };
}
