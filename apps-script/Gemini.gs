/** Motor Gemini: Files API (PDF fijos + capturas temporales) y generateContent. */
const GEM = 'https://generativelanguage.googleapis.com';

function gemHeaders_() { return { 'x-goog-api-key': cfg_('GEMINI_KEY') }; }

function procesarConGemini_(carpeta) {
  const c = leerCaso_(carpeta);
  if (!c.capturas.length) throw new Error('El caso no tiene capturas.');
  const fuentes = fuentesGem_();
  const temp = c.capturas.map((f, i) => subirArchivo_(f.getBlob(), 'CASO_' + i + '_' + f.getName()));
  try {
    const parts = [];
    fuentes.forEach(f => parts.push({ fileData: { mimeType: 'application/pdf', fileUri: f.uri } }));
    temp.forEach(t => parts.push({ fileData: { mimeType: t.mimeType, fileUri: t.uri } }));
    parts.push({ text:
      'FUENTES DISPONIBLES: ' + fuentes.map(f => '«' + f.nombre + '»').join(', ') +
      '\n\nCASO:\n' + c.md + '\n\nGenera el informe con los bloques indicados.' });
    const txt = generar_(PROMPT_SISTEMA, parts);
    crearInforme_(carpeta, c, txt, fuentes.map(f => f.nombre));
  } finally {
    temp.forEach(t => borrarArchivoGem_(t.name));
  }
}

/** PDF de la carpeta de fuentes, subidos una vez y reutilizados hasta que caducan (48 h). */
function fuentesGem_() {
  const it = DriveApp.getFolderById(cfg_('CARPETA_FUENTES')).getFilesByType(MimeType.PDF), out = [];
  while (it.hasNext()) {
    const f = it.next(), k = 'FU_' + f.getId(), mod = f.getLastUpdated().getTime();
    let c = JSON.parse(P.getProperty(k) || 'null');
    const caduca = !c || new Date(c.exp).getTime() - Date.now() < 3600e3;
    if (caduca || c.mod !== mod) {
      const up = subirArchivo_(f.getBlob(), f.getName());
      c = { uri: up.uri, name: up.name, exp: up.expirationTime, mod };
      P.setProperty(k, JSON.stringify(c));
    }
    out.push({ nombre: f.getName(), uri: c.uri });
  }
  if (!out.length) throw new Error('No hay PDF en la carpeta de fuentes.');
  return out;
}

function subirArchivo_(blob, nombre) {
  const bytes = blob.getBytes(), mime = blob.getContentType();
  const ini = UrlFetchApp.fetch(GEM + '/upload/v1beta/files', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: Object.assign(gemHeaders_(), {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': mime
    }),
    payload: JSON.stringify({ file: { display_name: nombre } })
  });
  const h = ini.getAllHeaders();
  const kUrl = Object.keys(h).find(k => k.toLowerCase() === 'x-goog-upload-url');
  if (!kUrl) throw new Error('Files API (inicio) ' + ini.getResponseCode() + ': ' + ini.getContentText().slice(0, 300));
  const fin = UrlFetchApp.fetch(h[kUrl], {
    method: 'post', contentType: mime, payload: bytes, muteHttpExceptions: true,
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }
  });
  const f = (JSON.parse(fin.getContentText() || '{}')).file;
  if (!f) throw new Error('Files API (subida) ' + fin.getResponseCode() + ': ' + fin.getContentText().slice(0, 300));
  return esperarActivo_(f);
}

function esperarActivo_(f) {
  for (let i = 0; i < 30 && f.state === 'PROCESSING'; i++) {
    Utilities.sleep(3000);
    f = JSON.parse(UrlFetchApp.fetch(GEM + '/v1beta/' + f.name, { headers: gemHeaders_() }).getContentText());
  }
  if (f.state !== 'ACTIVE') throw new Error('Files API: ' + f.displayName + ' en estado ' + f.state);
  return f;
}

function borrarArchivoGem_(name) {
  UrlFetchApp.fetch(GEM + '/v1beta/' + name, { method: 'delete', headers: gemHeaders_(), muteHttpExceptions: true });
}

/** generateContent con reintentos ante 429/5xx (límite del plan gratuito). */
function generar_(sistema, parts) {
  const url = GEM + '/v1beta/models/' + cfg_('MODELO', 'gemini-flash-latest') + ':generateContent';
  const body = {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 16384 }
  };
  for (let i = 0; i < 4; i++) {
    const r = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: gemHeaders_(), payload: JSON.stringify(body)
    });
    const code = r.getResponseCode();
    if (code === 200) {
      const cand = (JSON.parse(r.getContentText()).candidates || [])[0] || {};
      const txt = ((cand.content || {}).parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
      if (!txt.trim()) throw new Error('Gemini: respuesta vacía (' + cand.finishReason + ')');
      return txt;
    }
    if (code === 429 || code >= 500) { Utilities.sleep(20000 * (i + 1)); continue; }
    throw new Error('Gemini ' + code + ': ' + r.getContentText().slice(0, 400));
  }
  throw new Error('Gemini: sin respuesta tras 4 intentos (límite del plan gratuito).');
}
