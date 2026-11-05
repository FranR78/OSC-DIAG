/* Pruebas de regresión de Analyzer Scope (navegador real, sin pantalla).
 *
 *   cd tests && npm install && npx playwright install chromium && npm test
 *
 * Variables opcionales: APP=ruta/al.html  PLAYWRIGHT_PATH=ruta/a/node_modules/playwright
 * Sale con código 1 si falla alguna comprobación. */
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { if (!process.env.PLAYWRIGHT_PATH) throw e; pw = require(process.env.PLAYWRIGHT_PATH); }
const APP = 'file://' + path.resolve(process.env.APP || path.join(__dirname, '..', 'dist', 'analyzer-scope.html'));
const D = f => path.join(__dirname, 'data', f);
const CAPS = ['seat_altea_fase_pms_y_inyector_1.csv', 'fase_pms_inyecctor_2.csv', 'fase_pms_inyector_3.csv', 'fase_pms_inyector_4.csv'].map(D);

let ok = 0, bad = 0;
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log('  ✓', name); } else { bad++; console.log('  ✗', name, extra); } };
const SP = /[áéíóúñ¿¡«»]|(?<![\w])(de|del|la|las|el|los|con|para|por|una|un|en|al|que|sin|desde|hasta|entre|más|cada|todos|señal|archivos|cilindros|regla|reglas|página|pulsa|elige|canal|canales|disparo|ciclo|tiempo|tiempos|orden|avance|fondo|vista|escala|borrar|texto|línea|flecha|bajada|subida|flanco|umbral|fase|inicio|abrir|limpiar|ajustar|iniciar|parar|crear|descargar|añadir)(?![\w])/gi;
const spanish = t => [...new Set((t.replace(/Ortu Automoción|Ortúñez|Español|[\w.-]*(fase_pms|seat_altea|inyector|inyecctor|cilindro_1)[\w.-]*/gi, '').match(SP) || []))];

(async () => {
  const b = await pw.chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  await ctx.route(/^https?:/, r => r.abort()); // sin internet: todo debe funcionar en local
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const E = (fn, ...a) => p.evaluate(fn, ...a);
  const click = id => p.click(id);
  await p.goto(APP); await p.waitForTimeout(500);

  console.log('\n1 · Arranque');
  check('título con los créditos', (await p.title()).includes('J.A.Ortúñez') && (await p.title()).includes('Fran Rosales'));
  check('seis pestañas', (await p.$$eval('#tabs .tab', e => e.map(x => x.textContent))).join('|') === 'Osciloscopio|Diagrama de distribución|Convertir archivos|GIF|Instrucciones|Objetivo');
  check('ajustes de canales visibles por defecto', await E(() => !document.getElementById('leftp').classList.contains('nos')));
  check('sección «Sincronización» plegada por defecto', await E(() => document.getElementById('sBox').hidden));

  console.log('\n2 · Varios CSV como páginas');
  await p.setInputFiles('#fi', CAPS); await p.waitForTimeout(900);
  check('4 páginas', await E(() => PG.length) === 4);
  check('3 canales de 937 muestras', await E(() => PG[0].chs.length === 3 && PG[0].chs[0].x.length === 937));
  check('dt ≈ 53,36 µs', Math.abs(await E(() => PG[0].chs[0].x[1] * 1e6) - 53.36) < 0.05);
  check('barra de páginas visible', await E(() => !document.getElementById('pgbar').hidden));
  await E(() => { const r = document.getElementById('pgR'); r.value = 3; r.dispatchEvent(new Event('input')); });
  check('el cursor cambia de página', await E(() => pgI) === 2);

  console.log('\n3 · Fondo del visor (negro → blanco)');
  const lum = [];
  for (const v of [0, 50, 100]) { await E(v => { const r = document.getElementById('bgR'); r.value = v; r.dispatchEvent(new Event('input')); }, v); lum.push(await E(() => BGL)); }
  check('luminancia creciente', lum[0] < lum[1] && lum[1] < lum[2], JSON.stringify(lum));
  check('100 % = blanco', lum[2] > 0.99);
  await E(() => { const r = document.getElementById('bgR'); r.value = 0; r.dispatchEvent(new Event('input')); });

  console.log('\n4 · Panel de canales: botón «Ajustes»');
  await click('#bSet');
  check('ajustes ocultos, asignación visible', await E(() => { const v = s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; return !v('.chb select.st') && v('.chb .lab') && v('.chb .par'); }));
  await click('#bSet');
  check('ajustes visibles de nuevo', await E(() => { const r = document.querySelector('.chb select.st').getBoundingClientRect(); return r.width > 0; }));

  console.log('\n5 · Cilindros, sincronización por disparo y avance (señal sintética)');
  await E(() => {
    const NS = 20000, dt = 1e-5, x = new Float64Array(NS), y = new Float32Array(NS), starts = [];
    for (let k = 0; k < 8; k++) starts.push(5 + k * 10.2);
    for (let i = 0; i < NS; i++) { x[i] = i * dt; const ms = i * dt * 1000; let v = 0; for (const s of starts) { if (ms >= s && ms < s + .4) v = 60; else if (ms >= s + .4 && ms < s + .9) v = (Math.floor(ms * 20) % 2 ? 30 : -30); else if (ms >= s + 2.4 && ms < s + 2.9) v = 55; } y[i] = v; }
    Object.assign(CH[3], { n: 'CH4', x, y0: y, y, on: true, u: 'V', inv: false, fl: 'off' }); autoCh(3); ui(); draw();
  });
  for (const id of ['sOn', 'oCy']) { await E(id => { const c = document.getElementById(id); c.checked = true; c.dispatchEvent(new Event('change')); }, id); }
  await click('#tGr');
  await p.selectOption('#sC', '3'); await p.selectOption('#sM', 'all'); await p.selectOption('#sE', 'up'); await p.selectOption('#sY', '3'); await click('#bSy'); await p.waitForTimeout(300);
  check('8 disparos con piloto+principal+rebotes agrupados', await E(() => eng.sync && eng.sync.n) === 8);
  check('ciclo de 720° = 4 × 10,2 ms', Math.abs(await E(() => ph.T) - 0.0408) < 1e-4);
  const seq = await E(() => cylData().map(d => d.cyl).join(','));
  check('numeración desde el cilindro del disparo (3,4,2,1)', seq === '3,4,2,1', seq);
  const gaps = await E(() => { const e = engEvents(); const g = new Set(); for (let i = 1; i < e.length; i++) g.add(((e[i].t - e[i - 1].t) * 1000).toFixed(3)); return [...g]; });
  check('separación equidistante 720°/n', gaps.length === 1, JSON.stringify(gaps));
  const A0 = await E(() => engA()); await E(() => { eng.A += 0.003; draw(); });
  check('deslizar mueve todos a la vez', Math.abs(await E(() => engA()) - A0 - 0.003) < 1e-9);
  await E(() => { eng.A = engA(); });
  await E(() => { eng.vis = [true, false, true, false]; cylList(); });
  check('tabla solo con los cilindros marcados (Nº1 cil.3, Nº4 cil.1)', await E(() => cylData().map(d => 'N' + d.j + 'c' + d.cyl).join(',')) === 'N1c3,N4c1');
  await E(() => { eng.vis = null; cylList(); });

  console.log('\n6 · Reglas de distribución (AAA·RCE·AAE·RCA) y avance');
  await click('#tVv'); await click('#tAdv');
  await click('#tabD'); await p.waitForTimeout(250);
  const rows = await p.$$eval('#dd .r', r => r.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  check('orden AAA, RCE, AAE, RCA', rows.slice(0, 4).map(r => r.split(' ')[0]).join(',') === 'AAA,RCE,AAE,RCA', rows.join(' | '));
  check('ángulos 15/15/45/45 en positivo', rows.slice(0, 4).map(r => r.split(' ').pop()).join(',') === '15.0°,15.0°,45.0°,45.0°');
  await click('#tabS'); await E(() => { vv.ia = pms.t + ph.T * 5 / 720; draw(); }); await click('#tabD'); await p.waitForTimeout(150);
  check('regla al otro lado: valor positivo con ⚠', /5\.0° ⚠/.test(await p.$eval('#dd', e => e.innerText)));
  check('avance respecto a la regla PMS', await E(() => { adv.t = pms.t - ph.T * 12 / 720; return Math.abs(distCalc().adv - 12) < 1e-9; }));
  await click('#tabS');

  console.log('\n7 · Idioma (revisión de textos sin traducir en inglés)');
  await E(() => { for (const id of ['oPh', 'oCy', 'oAv', 'sOn']) { const c = document.getElementById(id); c.checked = true; c.dispatchEvent(new Event('change')); } });
  await click('#lEN'); await p.waitForTimeout(300);
  const left = [];
  const tabTxt = () => E(() => { const o = [document.body.innerText]; document.querySelectorAll('[title],[placeholder]').forEach(e => { ['title', 'placeholder'].forEach(a => { const v = e.getAttribute(a); if (v) o.push(v); }); }); return o.join('\n'); });
  for (const t of ['#tabS', '#tabD', '#tabF', '#tabG', '#tabI', '#tabO']) { await click(t); await p.waitForTimeout(150); left.push(...spanish(await tabTxt())); }
  check('sin texto en español en inglés (todas las pestañas)', left.length === 0, JSON.stringify([...new Set(left)]));
  check('mensajes de estado traducidos', await E(() => { st('Nada que exportar.'); return document.getElementById('st').textContent; }) === 'Nothing to export.');
  await click('#tabS'); await click('#lES'); await p.waitForTimeout(200);
  check('al volver a español se restauran los textos', (await p.textContent('#tabF')) === 'Convertir archivos' && (await p.textContent('#bSet')) === 'Ajustes');
  check('Iniciar/Parar no depende del texto traducido', await (async () => { await click('#lEN'); await p.selectOption('#src', 'sim'); await click('#bRun'); await click('#bRun'); const t = await p.textContent('#bRun'); await p.selectOption('#src', 'file'); await click('#lES'); return t === 'Start'; })());

  console.log('\n8 · Instrucciones: los nombres citados existen en la interfaz');
  for (const [lang, id, re] of [['es', '#lES', /«[^»]+»/g], ['en', '#lEN', /“[^”]+”/g]]) {
    await click(id); await p.waitForTimeout(200);
    const q = await E(re => [...new Set(((document.getElementById('docI').innerText + ' ' + document.getElementById('docO').innerText).match(new RegExp(re.source, 'g')) || []).map(x => x.slice(1, -1)))], re);
    const ui = await E(() => { const t = []; document.querySelectorAll('button,label,option,.tab,b,span,h2,h3,summary').forEach(e => { if (!e.closest('#docI,#docO')) t.push(e.textContent.trim()); }); document.querySelectorAll('[title],[placeholder]').forEach(e => { if (!e.closest('#docI,#docO')) t.push(e.getAttribute('title') || e.getAttribute('placeholder') || ''); }); return t; });
    const n = x => x.replace(/\s+/g, ' ').toLowerCase(), U = ui.map(n);
    const miss = q.filter(x => !U.some(u => u.includes(n(x).replace(/…$/, ''))));
    check(`(${lang}) ${q.length} nombres citados, ninguno huérfano`, miss.length === 0, JSON.stringify(miss));
  }
  await click('#lES');

  console.log('\n9 · Convertir archivos: unir, convertir, GIF');
  await click('#tabF'); await p.setInputFiles('#fIn', CAPS); await p.waitForTimeout(700);
  check('lista de 4 archivos', await E(() => QF.length) === 4);
  await p.uncheck('#fLoadM');
  const [dl] = await Promise.all([p.waitForEvent('download'), click('#fMerge')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8').split('\r\n');
  check('unido.csv: 3748 filas de datos y cabecera con unidades', csv.filter(l => /^-?\d+,\d+;/.test(l)).length === 3748 && csv[1].startsWith('(ms);'), csv.slice(0, 2).join(' / '));
  await click('#tabG'); await E(() => { document.getElementById('gA').value = 1; document.getElementById('gB').value = 3; document.getElementById('gW').value = 640; });
  await click('#gMk'); await p.waitForFunction(() => !document.getElementById('gMk').disabled, null, { timeout: 20000 });
  const hdr = await E(async () => new TextDecoder().decode(new Uint8Array(await lastGif.slice(0, 6).arrayBuffer())));
  check('GIF generado (cabecera GIF89a)', hdr === 'GIF89a');
  check('el GIF tiene 3 imágenes (páginas 1 a 3)', /páginas 1 – 3 \(3 imágenes/.test(await p.textContent('#gSt')), await p.textContent('#gSt'));
  await click('#tabS');

  console.log('\n10 · CSV de otros osciloscopios y .psdata nativo');
  await click('#bClr'); await p.setInputFiles('#fi', [D('inyector_cartransductor_prueba.csv')]); await p.waitForTimeout(500);
  check('CSV 1 canal / 610 muestras', await E(() => PG[0].chs.length === 1 && PG[0].chs[0].x.length === 610));
  await click('#bClr'); await p.setInputFiles('#fi', [D('cilindro_1_alfa_166.csv')]); await p.waitForTimeout(500);
  check('CSV con «;», coma decimal y unidades (A): 4887 muestras', await E(() => PG[0].chs[0].x.length === 4887 && PG[0].chs[0].u === 'A'));
  await p.setInputFiles('#fi', [D('sensor_inyector_test.psdata')]); await p.waitForTimeout(500);
  check('.psdata nativo: aviso en lugar de error', /no se puede leer/.test(await p.textContent('#st')));

  console.log('\n11 · PDF sin internet y sin restos de Hantek');
  check('jsPDF incrustado (sin red)', await E(() => !!(window.jspdf && window.jspdf.jsPDF)));
  check('sin opción de equipo USB en «Fuente»', await E(() => ![...document.querySelectorAll('#src option')].some(o => o.value === 'hantek')));
  await p.setInputFiles('#fi', [CAPS[0]]); await p.waitForTimeout(600); await click('#tabS');
  { const [dl] = await Promise.all([p.waitForEvent('download'), click('#bPdf')]);
    const buf = fs.readFileSync(await dl.path()); check('Informe PDF generado (%PDF)', buf.slice(0, 4).toString() === '%PDF', dl.suggestedFilename()); }

  console.log('\nErrores JS durante la sesión:', errs.length);
  errs.forEach(e => console.log('  !', e));
  check('sin errores JS', errs.length === 0);
  console.log(`\nRESULTADO: ${ok} correctas, ${bad} fallidas`);
  await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL GUION:', e.message.split('\n')[0]); process.exit(2); });
