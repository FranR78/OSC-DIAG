#!/usr/bin/env node
/* Construye las dos versiones (cada una, un único archivo autocontenido) desde src/:
 *   dist/analyzer-scope.html         versión LIBRE  (fuera del portal; «Diagnóstico» solo mide)
 *   dist/analyzer-scope-portal.html  versión PORTAL (servida por la web app; consulta con google.script.run)
 *
 *   node build.js           → escribe las dos
 *   node build.js --check   → falla si dist/ no coincide con src/ (olvidaste construir)
 *
 * Configuración (sin datos fijos en el código): src/config.json → {"portalUrl": "", "apiUrl": ""}
 *   portalUrl: enlace «Abrir en el portal» de la versión libre · apiUrl: puente GET para la versión libre (opcional)
 *
 * Plantilla: src/index.html. Marcadores (no se buscan dentro de lo incluido):
 *   {{ruta}}          contenido de src/ruta tal cual
 *   {{base64:ruta}}   archivo en base64 (para data: URI)
 *   {{ejemplos:dir}}  los .csv de src/dir como JSON [{name, txt}] (el desarrollador añade ejemplos soltándolos ahí)
 *   {{appcfg}}        APP_CFG = {modo, ver, portalUrl, apiUrl}
 *   {{js/*.js}}       todos los .js de src/js en orden alfabético (un solo <script>, ámbito global compartido)
 * Sin dependencias. */
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src'), DIST = path.join(__dirname, 'dist');
const OUTS = { libre: 'analyzer-scope.html', portal: 'analyzer-scope-portal.html' };
const rd = p => fs.readFileSync(path.join(SRC, p));

function build(modo) {
  const tpl = rd('index.html').toString('utf8');
  const html = tpl.replace(/\{\{([^{}]+)\}\}/g, (_, k) => {
    if (k.startsWith('base64:')) return rd(k.slice(7)).toString('base64');
    if (k.startsWith('ejemplos:')) {  // CSV de ejemplo → [{name, txt}] (nombre = archivo sin extensión ni número inicial)
      const d = k.slice(9), dir = path.join(SRC, d);
      const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.csv$/i.test(f)).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
        .map(f => ({ name: f.replace(/\.csv$/i, '').replace(/^\d+[\s._-]+/, ''), txt: rd(d + '/' + f).toString('utf8').replace(/^\uFEFF/, '') })) : [];
      return JSON.stringify(list).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    }
    if (k === 'appcfg') {
      const cfg = fs.existsSync(path.join(SRC, 'config.json')) ? JSON.parse(rd('config.json')) : {};
      return JSON.stringify({ modo, ver: rd('version.txt').toString('utf8').trim(), portalUrl: modo === 'libre' ? cfg.portalUrl || '' : '', apiUrl: modo === 'libre' ? cfg.apiUrl || '' : '' });
    }
    if (k === 'js/*.js') return fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js')).sort().map(f => rd('js/' + f).toString('utf8')).join('');
    return rd(k).toString('utf8');
  });
  // Comprobación del ensamblado: estructura única
  const n = t => html.split(t).length - 1;
  if (n('<header>') !== 1 || n('<main>') !== 1 || !html.trimEnd().endsWith('</body></html>')) throw new Error('estructura HTML inesperada');
  return html;
}

const check = process.argv.includes('--check');let bad = false;
for (const [modo, f] of Object.entries(OUTS)) {
  const html = build(modo), out = path.join(DIST, f);
  if (check) {
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (cur !== html) { console.error('dist/' + f + ' no está al día: ejecuta  node build.js'); bad = true; }
  } else {
    fs.mkdirSync(DIST, { recursive: true }); fs.writeFileSync(out, html);
    console.log('dist/' + f, (html.length / 1024).toFixed(0) + ' KB');
  }
}
if (check) { if (bad) process.exit(1); console.log('dist/ al día'); }
