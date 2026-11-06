#!/usr/bin/env node
/* Construye dist/analyzer-scope.html (un único archivo autocontenido) desde src/.
 *
 *   node build.js           → escribe dist/analyzer-scope.html
 *   node build.js --check   → falla si dist/ no coincide con src/ (olvidaste construir)
 *
 * Plantilla: src/index.html. Marcadores (no se buscan dentro de lo incluido):
 *   {{ruta}}          contenido de src/ruta tal cual
 *   {{base64:ruta}}   archivo en base64 (para data: URI)
 *   {{ejemplos:dir}}  los .csv de src/dir como JSON [{name, txt}] (el desarrollador añade ejemplos soltándolos ahí)
 *   {{js/*.js}}       todos los .js de src/js en orden alfabético (un solo <script>, ámbito global compartido)
 * Sin dependencias. */
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src'), OUT = path.join(__dirname, 'dist', 'analyzer-scope.html');
const rd = p => fs.readFileSync(path.join(SRC, p));

function build() {
  const tpl = rd('index.html').toString('utf8');
  const html = tpl.replace(/\{\{([^{}]+)\}\}/g, (_, k) => {
    if (k.startsWith('base64:')) return rd(k.slice(7)).toString('base64');
    if (k.startsWith('ejemplos:')) {  // CSV de ejemplo → [{name, txt}] (nombre = archivo sin extensión ni número inicial)
      const d = k.slice(9), dir = path.join(SRC, d);
      const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.csv$/i.test(f)).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
        .map(f => ({ name: f.replace(/\.csv$/i, '').replace(/^\d+[\s._-]+/, ''), txt: rd(d + '/' + f).toString('utf8').replace(/^\uFEFF/, '') })) : [];
      return JSON.stringify(list).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    }
    if (k === 'js/*.js') return fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js')).sort().map(f => rd('js/' + f).toString('utf8')).join('');
    return rd(k).toString('utf8');
  });
  // Comprobación del ensamblado: estructura única
  const n = t => html.split(t).length - 1;
  if (n('<header>') !== 1 || n('<main>') !== 1 || !html.trimEnd().endsWith('</body></html>')) throw new Error('estructura HTML inesperada');
  return html;
}

const html = build();
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== html) { console.error('dist/analyzer-scope.html no está al día: ejecuta  node build.js'); process.exit(1); }
  console.log('dist/ al día');
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log('dist/analyzer-scope.html', (html.length / 1024).toFixed(0) + ' KB');
}
