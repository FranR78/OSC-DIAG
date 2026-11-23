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
// Origen http simulado para las pruebas que recargan: en Chromium sin pantalla, localStorage de file:// se pierde a veces al recargar
const APP_H = 'http://app.test/', serve = c => c.route(APP_H, r => r.fulfill({ path: APP.replace('file://', ''), contentType: 'text/html; charset=utf-8' }));
const CAPS = ['seat_altea_fase_pms_y_inyector_1.csv', 'fase_pms_inyecctor_2.csv', 'fase_pms_inyector_3.csv', 'fase_pms_inyector_4.csv'].map(D);

let ok = 0, bad = 0;
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log('  ✓', name); } else { bad++; console.log('  ✗', name, extra); } };
const SP = /[áéíóúñ¿¡«»]|(?<![\w])(de|del|la|las|el|los|con|para|por|una|un|en|al|que|sin|desde|hasta|entre|más|cada|todos|señal|archivos|cilindros|regla|reglas|página|pulsa|elige|canal|canales|disparo|ciclo|tiempo|tiempos|orden|avance|fondo|vista|escala|borrar|texto|línea|flecha|bajada|subida|flanco|umbral|fase|inicio|abrir|limpiar|ajustar|iniciar|parar|crear|descargar|añadir)(?![\w])/gi;
const spanish = t => [...new Set((t.replace(/Ortu Automoción|Ortúñez|Español|[\w.-]*(fase_pms|seat_altea|inyector|inyecctor|cilindro_1)[\w.-]*/gi, '').match(SP) || []))];

(async () => {
  const b = await pw.chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  await ctx.route(/^https?:/, r => r.abort()); // sin internet: todo debe funcionar en local
  await ctx.addInitScript(() => { try { localStorage.setItem('as_ui', 'fix'); localStorage.setItem('as_ficha', 'off'); localStorage.setItem('as_guia', '1'); localStorage.setItem('as_portada', '1'); } catch (e) { } }); // esta batería recorre la vista clásica (todo a la vista); la vista nueva se prueba en F1
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const E = (fn, ...a) => p.evaluate(fn, ...a);
  const click = id => p.click(id);
  await p.goto(APP); await p.waitForTimeout(500);

  console.log('\n1 · Arranque');
  check('título con los créditos', (await p.title()).includes('J.A.Ortúñez') && (await p.title()).includes('Fran Rosales'));
  check('nueve pestañas', (await p.$$eval('#tabs .tab', e => e.map(x => x.textContent))).join('|') === 'Osciloscopio|Diagrama de distribución|Compresión relativa|Procedimientos|Diagnóstico|Unir y convertir CSV|GIF|Instrucciones|Objetivo');
  check('ajustes de canales visibles por defecto', await E(() => !document.getElementById('leftp').classList.contains('nos')));
  check('sección «Sincronización» plegada por defecto', await E(() => document.getElementById('sBox').hidden));
  check('«Regla de fase» e «Identificación de cilindros» desplegadas al iniciar', await E(() => !$('bPh').hidden && !$('bCy').hidden && $('oPh').checked && $('oCy').checked));
  check('Cilindros activo con «Tiempos de cilindros · rejilla»', await E(() => eng.on && eng.show === -1 && $('gS').selectedOptions[0].textContent === 'Tiempos de cilindros · rejilla' && $('tGr').classList.contains('on')));
  check('sin «Fuente»/simulador; desplegable «Ejemplos» con capturas', await E(() => !$('src') && !$('bRun') && $('ex').options.length === EJEMPLOS.length + 1 && EJEMPLOS.length >= 1));

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
  const A0 = await E(() => engA()); await E(a => { eng.A = a + 0.003; draw(); }, A0);
  check('con las reglas de fase: un arrastre corto no descuadra los tiempos (encajados en la tabla de 720°)', Math.abs(await E(() => engA()) - A0) < 1e-9);
  await E(a => { eng.A = a + ph.T / eng.n * 1.1; draw(); }, A0);
  check('deslizar mueve todos a la vez, a saltos de 720°/n', Math.abs(await E(() => engA()) - A0 - (await E(() => ph.T / eng.n))) < 1e-9);
  check('cada tiempo dura 180° y empieza en INICIO + múltiplo de 180°', await E(() => cylDataAll().every(d => d.st.every(q => { const a = (q.t0 - ph.t0) / ph.T * 720, l = (q.t1 - q.t0) / ph.T * 720; return Math.abs(l - 180) < 1e-6 && Math.abs(a / 180 - Math.round(a / 180)) < 1e-6; }))));
  await E(a => { eng.A = a + 0.003; ph.on = false; draw(); }, A0);
  check('sin reglas de fase el cilindro se desliza libre', Math.abs(await E(() => engA()) - A0 - 0.003) < 1e-9);
  await E(() => { ph.on = true; draw(); });
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
  check('PMS en compresión (360° del de cruce): mismos valores, sin desfase de 360°', await E(() => { vv.ia = pms.t - ph.T * 15 / 720; const k = () => { const d = distCalc(); return ['aaa', 'rce', 'aae', 'rca', 'cruce'].map(q => d[q].toFixed(3)).join(','); }; const a = k(); pms.t += ph.T / 2; const b = k(); pms.t -= ph.T; const c = k(); pms.t += ph.T / 2; return a === b && a === c && distCalc().aaa.toFixed(1) === '15.0' || [a, b, c].join(' | '); }) === true, await E(() => [distCalc().aaa, distCalc().rce, distCalc().aae, distCalc().rca].map(v => v.toFixed(1)).join(',')));
  check('avance respecto a la regla PMS', await E(() => { adv.t = pms.t - ph.T * 12 / 720; return Math.abs(distCalc().adv - 12) < 1e-9; }));
  await E(() => { $('avI').checked = true; $('avI').onchange(); $('avN').value = '2'; $('avN').onchange(); adv.i1 = pms.t - ph.T * 20 / 720; adv.i2 = pms.t + ph.T * 3 / 720; draw(); });
  check('sección Avance: A.Enc + dos inyecciones crean tres reglas respecto al PMS', await E(() => { const a = distCalc().advs; return adv.on && a.length === 3 && a.map(x => x.lab).join() === 'A.Enc,Inyec.1,Inyec.2' && Math.abs(a[1].deg - 20) < 1e-9 && Math.abs(a[2].deg + 3) < 1e-9; }));
  check('las tres salen en el diagrama/informe, en las lecturas y son arrastrables', await E(() => { const r = distRows().map(x => x[0]).join('|'), rd = $('rd').textContent; return /A\.Enc · avance de encendido/.test(r) && /Inyec\.1 · avance de la 1\.ª inyección/.test(r) && /Inyec\.2 · avance de la 2\.ª inyección/.test(r) && /Inyec\.1/.test(rd) && /Inyec\.2/.test(rd) && dxPeticion().medidas.filter(m => m.id === 'avance').map(m => m.k + (m.inyeccion || '')).join() === 'enc,iny1,iny2'; }));
  check('una sola inyección quita Inyec.2; ajustes antiguos (A.Iny) se convierten en Inyec.1', await E(() => { $('avN').value = '1'; $('avN').onchange(); const one = distCalc().advs.map(x => x.lab).join(); const keep = JSON.stringify(adv); advLoad({ on: true, t: pms.t - ph.T * 7 / 720, k: 'iny' }); const leg = distCalc().advs; const ok = leg.length === 1 && leg[0].lab === 'Inyec.1' && Math.abs(leg[0].deg - 7) < 1e-9; Object.assign(adv, JSON.parse(keep)); $('avI').checked = false; $('avI').onchange(); return one === 'A.Enc,Inyec.1' && ok && distCalc().advs.length === 1; }));
  await click('#tabS');

  console.log('\n7 · Idioma (revisión de textos sin traducir en inglés)');
  await E(() => { for (const id of ['oPh', 'oCy', 'oAv', 'sOn']) { const c = document.getElementById(id); c.checked = true; c.dispatchEvent(new Event('change')); } });
  await click('#lEN'); await p.waitForTimeout(300);
  const left = [];
  const tabTxt = () => E(() => { let bt = document.body.innerText; [...document.querySelectorAll('#ex option')].slice(1).forEach(op => { bt = bt.split(op.textContent).join(''); }); const o = [bt]; document.querySelectorAll('[title],[placeholder]').forEach(e => { ['title', 'placeholder'].forEach(a => { const v = e.getAttribute(a); if (v) o.push(v); }); }); return o.join('\n'); });
  for (const t of ['#tabS', '#tabD', '#tabC', '#tabK', '#tabX', '#tabF', '#tabG', '#tabI', '#tabO']) { await click(t); await p.waitForTimeout(150); if (t === '#tabK') await E(() => document.querySelectorAll('.skD').forEach(e => { e.hidden = true; })); left.push(...spanish(await tabTxt())); }
  check('sin texto en español en inglés (todas las pestañas)', left.length === 0, JSON.stringify([...new Set(left)]));
  check('mensajes de estado traducidos', await E(() => { st('Nada que exportar.'); return document.getElementById('st').textContent; }) === 'Nothing to export.');
  await click('#tabS'); await click('#lES'); await p.waitForTimeout(200);
  check('al volver a español se restauran los textos', (await p.textContent('#tabF')) === 'Unir y convertir CSV' && (await p.textContent('#bSet')) === 'Ajustes');
  check('«Ejemplos» traducido en inglés', await (async () => { await click('#lEN'); const t = await p.$eval('#ex option', o => o.textContent); await click('#lES'); return t === 'Examples…'; })());

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
  await click('#bPdf'); await p.waitForTimeout(200);
  check('aviso de informe sin diagnóstico', await E(() => !document.getElementById('dxW').hidden));
  { const [dl] = await Promise.all([p.waitForEvent('download'), click('#dxWPdf')]);
    const buf = fs.readFileSync(await dl.path()); check('Informe PDF generado (%PDF)', buf.slice(0, 4).toString() === '%PDF', dl.suggestedFilename()); }

  { const h0 = await E(() => document.getElementById('wrap').getBoundingClientRect().height);
    const r = await p.locator('#wrapH').boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + 6); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2, r.y + 126, { steps: 5 }); await p.mouse.up();
    const h1 = await E(() => document.getElementById('wrap').getBoundingClientRect().height);
    check('tirador: la gráfica crece al arrastrar', h1 > h0 + 80, h0 + ' → ' + h1);
    await p.dblclick('#wrapH'); await p.waitForTimeout(100); }
  await E(() => { const r = document.getElementById('rhR'); r.value = 40; r.oninput(); });
  check('alto de franjas ADM·COMP·EXP·ESC ajustable', await E(() => eng.rh === 40));
  await E(() => { const r = document.getElementById('rhR'); r.value = 14; r.oninput(); });

  console.log('\n12 · Tablet / móvil');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  check('sin desplazamiento horizontal a 390 px', await E(() => document.documentElement.scrollWidth <= innerWidth + 1), await E(() => document.documentElement.scrollWidth));
  check('panel de canales oculto y botón «Canales» visible', await E(() => getComputedStyle(document.getElementById('leftp')).display === 'none' && getComputedStyle(document.getElementById('bPan')).display !== 'none'));
  await click('#bPan');
  check('«Canales» muestra el panel debajo del visor', await E(() => { const l = document.getElementById('leftp').getBoundingClientRect(), v = document.getElementById('cv').getBoundingClientRect(); return l.height > 0 && l.top > v.top; }));
  await click('#bPan');
  check('pellizco con dos dedos: separar ×3 = zoom ×3', await E(() => {
    fit(); const s0 = view.span, r = cv.getBoundingClientRect(), y = r.top + r.height / 2, cx = r.left + M.l + PW() / 2;
    const ev = (t, id, x) => cv.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
    ev('pointerdown', 1, cx - 50); ev('pointerdown', 2, cx + 50); ev('pointermove', 2, cx + 150); ev('pointermove', 1, cx - 150); ev('pointerup', 1, cx - 150); ev('pointerup', 2, cx + 150);
    return Math.abs(view.span / s0 - 1 / 3) < 0.02 && pinch === null && TP.size === 0; }), await E(() => view.span));
  await p.setViewportSize({ width: 1500, height: 950 });

  console.log('\n13 · Ejemplos y CSV con ajustes');
  await click('#bClr').catch(() => {}); await E(() => { PG.length = 0; });
  await p.selectOption('#ex', '0'); await p.waitForTimeout(700);
  check('el ejemplo se carga como página', await E(() => PG.length === 1 && CH[0].x && CH[0].x.length > 100 && /Ejemplo cargado/.test($('st').textContent)));
  const before = await E(() => { CH[1].vd = 5; CH[1].off = 1.5; CH[1].p = 'Sensor PMS'; CH[2].inv = true; CH[0].fl = 'lp'; CH[0].f1 = 300; proc(CH[0]); proc(CH[2]);
    view.t0 += view.span * 0.1; view.span *= 0.5; pms.on = true; pms.t = view.t0 + view.span / 3; eng.n = 6; eng.order = [1,5,3,6,2,4]; ann.list.push({ k: 'text', col: '#ffd24d', w: 2, x1: view.t0, y1: .5, txt: 'nota' });
    fillG(); ui(); draw(); return JSON.stringify([CH.slice(0,3).map(c => [c.vd, c.off, c.p, c.inv, c.fl, c.f1, c.y[5]]), view, pms, eng.n, eng.order, ann.list.length]); });
  const [dlx] = await Promise.all([p.waitForEvent('download'), click('#bExp')]);
  const csvPath = path.join(require('os').tmpdir(), 'as_ajustes.csv'); await dlx.saveAs(csvPath);
  check('CSV exportado: 1.ª línea con ajustes y nombre «…_ajustes.csv»', fs.readFileSync(csvPath, 'utf8').startsWith('#analyzer-scope-ajustes;{') && /_ajustes\.csv$/.test(dlx.suggestedFilename()), dlx.suggestedFilename());
  await E(() => { PG.length = 0; CH.forEach(c => { c.x = c.y = c.y0 = null; c.on = false; c._set = false; c.vd = 1; c.off = 0; c.p = ''; c.inv = false; c.fl = 'off'; }); pms.on = false; eng.n = 4; ann.list = []; });
  await p.setInputFiles('#fi', csvPath); await p.waitForTimeout(800);
  const after = await E(() => JSON.stringify([CH.slice(0,3).map(c => [c.vd, c.off, c.p, c.inv, c.fl, c.f1, c.y[5]]), view, pms, eng.n, eng.order, ann.list.length]));
  check('al reabrirlo se recuperan los ajustes (canales, filtros, vista, PMS, cilindros, anotaciones)', before === after, before + '\n    ≠ ' + after);
  check('mensaje «ajustes recuperados»', /ajustes recuperados/.test(await p.textContent('#st')));

  console.log('\n14 · Canales matemáticos');
  await click('#bClr');
  await E(() => CH.forEach(c => { c.fl = 'off'; c.inv = false; }));
  await E(async () => { const fs = 2e5, N = 80000, L = ['Tiempo;MAF;CANH;CANL;CKP', '(ms);(V);(V);(V);(V)', '']; let ph = 0;
    for (let i = 0; i < N; i++) { const t = i / fs, f = 1000 + 200 * Math.sin(2 * Math.PI * 5 * t); ph += f / fs; const sq = (ph % 1) < .5 ? 5 : 0, dom = Math.floor(t * 2000) % 2 === 1;
      const tp = t * 800, pos = Math.floor(tp) % 60, ck = pos < 58 && (tp % 1) < .5 ? 5 : 0;   // rueda 60-2 a 800 rpm
      L.push([(t * 1000).toFixed(6), sq, dom ? 3.5 : 2.5, dom ? 1.5 : 2.5, ck].join(';').replace(/\./g, ',')); }
    await loadFiles([new File([L.join('\n')], 'sintetica.csv')]); });
  await p.check('#oMa'); await p.waitForTimeout(100);
  const mk = async (k, a, b) => { await p.selectOption('#mK', k); await E(() => mForm()); await p.selectOption('#mA', a); if (b) await p.selectOption('#mB', b); await click('#mGo'); await p.waitForTimeout(150); };
  await mk('freq', '0');
  const fq = await E(() => { const c = CH[5 - 1], at = t => c.y[lb(c.x, t)]; return c.m && c.m.k === 'freq' && c.u === 'Hz' ? [at(0.05), at(0.15)] : null; });
  check('Frecuencia: sigue la modulación (1200 / 800 Hz ±1 %)', fq && Math.abs(fq[0] / 1200 - 1) < .01 && Math.abs(fq[1] / 800 - 1) < .01, JSON.stringify(fq));
  await mk('rpm', '3');
  const rp = await E(() => { const c = CH[5]; const a = lb(c.x, .05), b = lb(c.x, .35); let lo = 1e9, hi = 0; for (let i = a; i < b; i++) { lo = Math.min(lo, c.y[i]); hi = Math.max(hi, c.y[i]); } return c.u === 'rpm' ? [lo, hi] : null; });
  check('RPM desde CKP 60-2: 800 rpm sin caídas en el hueco (±1 %)', rp && rp[0] > 792 && rp[1] < 808, JSON.stringify(rp));
  await mk('can', '1', '2');
  check('CAN: diferencial y niveles correctos (dominante 2,00 V ✓)', await E(() => CH[6].m && CH[6].m.k === 'can' && /dominante 2\.00 V/.test(CH[6].mi) && /✓$/.test(CH[6].mi)), await E(() => CH[6].mi));
  check('el canal matemático se guarda en los ajustes del CSV', await E(() => { const j = cfgOf(CH.filter(c => c.x)); return j.ch[4].m.k === 'freq' && j.ch[4].m.a === 0 && j.ch[6].m.b === 2; }));
  await E(() => { CH[0].inv = true; proc(CH[0]); });
  check('si cambia el origen, se recalcula', await E(() => CH[4].y && Math.abs(CH[4].y[lb(CH[4].x, 0.05)] / 1200 - 1) < .02));
  await E(() => { CH[0].inv = false; proc(CH[0]); });
  { await click('#lEN'); await p.waitForTimeout(150); const t = await E(() => { const o = [$('leftp').innerText]; $('leftp').querySelectorAll('[title],[placeholder]').forEach(e => ['title', 'placeholder'].forEach(a => { const v = e.getAttribute(a); if (v) o.push(v); })); return o.join('\n'); });
    const left = spanish(t.replace(/sintetica\.csv/g, '')); check('canales matemáticos traducidos al inglés', left.length === 0, JSON.stringify(left)); await click('#lES'); }
  await p.click('#mL button[data-i="6"]');
  check('✕ quita el canal matemático', await E(() => !CH[6].m && !CH[6].x));

  console.log('\n15 · Diagnóstico (versión libre)');
  await click('#tabX'); await p.waitForTimeout(150);
  check('libre: calcula medidas y avisa de que la consulta está en el portal', await E(() => APP_CFG.modo === 'libre' && $('xMed').children.length > 0 && /portal/.test($('xSt').textContent)));
  await click('#xGo'); await p.waitForTimeout(100);
  check('libre: «Consultar» da el diagnóstico local (o dice que no hay uno programado)', await E(() => $('xRes').querySelectorAll('.dxh').length > 0 || /programado|Ninguna regla/.test($('xSt').textContent)));
  const dxl = await E(() => dxLocal({ contexto: { senales: [{ canal: 'CH1', entidad: 'transductor admisión' }] },
    medidas: [{ id: 'desv_pulso_cil', canal: 'CH1', por_cilindro: { 1: 2.1, 2: -1, 3: 0.5, 4: -14.2 } }] }));
  check('libre: comparación local → el 4 es el más débil, con ranking (mejor = 100 %) y aviso',
    dxl.hallazgos.length === 1 && dxl.hallazgos[0].evidencia[0].cilindro === 4 && dxl.hallazgos[0].evidencia[0].comparacion[3].pct_mejor === 100 && /peor/.test(dxl.aviso), JSON.stringify(dxl.hallazgos[0] && dxl.hallazgos[0].evidencia));
  check('paquete Ortu cargado como base y activo', await E(() => REGLAS_BASE.some(p => p.paquete === 'ortu' && p.reglas.length >= 4) && $('xPq').children.length >= 2));
  const dsc = await E(() => { localStorage.setItem('as_paqs', JSON.stringify([{ paquete: 'propio', nombre: 'Mis reglas', reglas: [
      { id: 'FR-COMP', tema: 'compresion-relativa', sintoma: 'Cil {cil} bajo', si: [{ medida: 'comp_rel_pct', op: '<', valor: 80, por_cilindro: true }], fuente: 'Curso X', estado: 'borrador' }] }]));
    const r = dxLocal({ contexto: { motor: { cilindros: 4 }, senales: [] }, medidas: [{ id: 'comp_rel_pct', por_cilindro: { 1: 85, 2: 100, 3: 70, 4: 98 } }] });
    localStorage.removeItem('as_paqs'); return r; });
  const h1 = dsc.hallazgos.filter(h => h.evidencia[0].cilindro === 1), h3 = dsc.hallazgos.filter(h => h.evidencia[0].cilindro === 3);
  check('dos fuentes: no se pisan y la discrepancia se ve (cil 1: Ortu sí, propia no)', h1.length === 1 && h1[0].paquete === 'ortu' && h1[0].discrepancia && h1[0].criterios.length === 2 && h3.length === 2 && !h3[0].discrepancia, JSON.stringify(dsc.hallazgos.map(h => [h.paquete, h.evidencia[0].cilindro, h.discrepancia])));
  await click('#xPqEd'); await p.waitForTimeout(100);
  await p.click('#rgEB button.p'); await p.waitForTimeout(100);
  await p.fill('#rgEB label:nth-of-type(1) input', 'FR-TEST');
  await E(() => { const i = [...document.querySelectorAll('#rgEB .rgl input[type=text]')]; i[2].value = 'El cilindro {cil} es el peor (prueba)'; });
  await p.click('#rgEB button.p'); await p.waitForTimeout(100);
  check('editor: crea y guarda una regla propia', await E(() => rgUsuario()[0].reglas.some(r => r.sintoma === 'El cilindro {cil} es el peor (prueba)' && r.estado === 'borrador')));
  await E(() => { localStorage.removeItem('as_paqs'); rgeClose(); });
  const csvR = await E(() => { const P = rgDeCsv(RG_COLS.join(';') + '\n' + RG_AYUDA.join(';') + '\n' + RG_EJ.map(r => r.map(csvQ).join(';')).join('\n'), 'Mis reglas');
    const back = rgDeCsv(rgACsv(P), 'Mis reglas'); return { n: P.reglas.length, c2: P.reglas[2].si.length, err: rgValida(P), same: JSON.stringify(back.reglas) === JSON.stringify(P.reglas) }; });
  check('plantilla CSV: 3 reglas de ejemplo válidas, condición extra por fila e ida y vuelta', csvR.n === 3 && csvR.c2 === 2 && !csvR.err.length && csvR.same, JSON.stringify(csvR));
  const mx = await E(() => dxLocal({ contexto: { motor: { cilindros: 4 }, senales: [] }, medidas: [{ id: 'comp_rel_pct', por_cilindro: { 1: 85, 2: 100, 3: 70, 4: 98 } }] },
    { H: [], crit: [{ tema: 'compresion-relativa', regla: 'COMP-REL-R01', condicion: '< 80', fuente: 'NT', cumplen: ['3|'] }] }));
  check('portal: criterio de la nota maestra entra en la comparación por tema', mx.hallazgos.some(h => h.evidencia[0].cilindro === 1 && h.discrepancia && h.criterios.some(c => c.regla === 'COMP-REL-R01' && !c.cumple)), JSON.stringify(mx.hallazgos.map(h => h.criterios)));
  const sk = await E(() => { const P = { paquete: 'sk', nombre: 'Skill', reglas: [{ id: 'S1', tema: 't-x', sintoma: 'Cil {cil}', si: [{ medida: 'comp_rel_pct', op: '<', valor: 90, por_cilindro: true }] }],
      notas: [{ id: 'N-01', titulo: 'Cómo confirmarlo', tema: 't-x', texto: '# Paso\n- uno', valores: [{ magnitud: 'p', min: 25, max: 32, unidad: 'bar' }] }] };
    const h = rgEval(P.reglas[0], P, { contexto: { motor: {}, senales: [] }, medidas: [{ id: 'comp_rel_pct', por_cilindro: { 1: 80, 2: 100 } }] });
    const NN = rgNotasDeCsv(rgNotasACsv(P)); return { err: rgValida(P), n: h[0] && h[0].notas_paquete.length, csv: NN && NN[0].titulo === 'Cómo confirmarlo' && NN[0].valores[0].max === 32 && NN[0].texto.includes('- uno') }; });
  check('skill = reglas + notas: la regla trae su nota por el tema y las notas van y vuelven en CSV', !sk.err.length && sk.n === 1 && sk.csv, JSON.stringify(sk));
  check('validación de paquetes', await E(() => rgValida({ paquete: 'xx', reglas: [{ id: 'a', sintoma: 's', si: [{ medida: 'rpm', op: '~' }] }] }).length === 1));
  await click('#tabS');

  console.log('\n15b · Compresión relativa (pinza de arranque + inyector 1, C4 1.6 HDi con 2 cilindros lavados)');
  await p.setInputFiles('#fi', D('arranque_inyector_1_c4_hdi.csv')); await p.waitForTimeout(800);
  await E(() => { eng.n = 4; eng.order = [1, 3, 4, 2]; });
  await click('#tabC'); await p.waitForTimeout(150);
  await p.selectOption('#crS', '0'); await p.selectOption('#crI', '1'); await p.selectOption('#crY', '1');
  await click('#crGo'); await p.waitForTimeout(200);
  const cr = await E(() => crRes && crRes.R.map(r => ({ c: r.cyl, pc: r.pc })));
  const crLow = cr ? cr.filter(r => r.pc < 90).map(r => r.c).join(',') : '';
  check('compresión relativa: ~183 rpm y los cilindros 1 y 3 por debajo del 90 %', cr && crLow === '1,3' && Math.abs(await E(() => crRes.rpm) - 183) < 10 && cr.some(r => r.pc === 100), JSON.stringify(cr));
  await click('#tabS');

  { const v = require('fs').readFileSync(path.join(__dirname, '..', 'src', 'version.txt'), 'utf8').trim();
    check('versión visible (menú ☰ y «Objetivo») = src/version.txt', await E(v => $('verM').textContent.includes(v) && $('docO').textContent.includes(v), v)); }
  console.log('\nT4 · Etiquetas de amplitud y regla PMI');
  { const ov = await E(() => { CH.forEach(c => { if (c.x) { c.on = true; c.hr = true; ensureH(c); c.h = [c.vd * 2, c.vd]; c.off = 0; } }); amp.on = true; draw();
      const A = AMP_TAGS; let bad = 0; A.forEach((r, i) => A.forEach((q, j) => { if (i < j && r.x < q.x + q.w && r.x + r.w > q.x && r.y - 12 < q.y + 3 && r.y + 3 > q.y - 12) bad++; })); amp.on = false; draw(); return [A.length, bad]; });
    check('reglas de amplitud de varios canales a la misma altura: etiquetas sin solaparse', ov[0] >= 6 && ov[1] === 0, JSON.stringify(ov));
    const pm = await E(() => { ph.auto = false; ph.T = view.span / 2; ph.t0 = view.t0; pms.on = true; pms.t = view.t0 + view.span / 4; const d = ph.T / 720;
      vv.on = true; vv.ia = pms.t - 15 * d; vv.fe = pms.t + 15 * d; vv.ie = pms.t + 135 * d; vv.fa = pms.t + 225 * d; const a = distCalc();
      pmi.on = true; pmi.t = pms.t + 190 * d; const b = distCalc(); pmi.on = false; vv.on = false; draw(); return [a.aae, a.rca, b.aae, b.rca, b.pmi]; });
    check('regla PMI propia: AAE y RCA se miden desde ella (PMI a 190° → AAE +10°, RCA −10°)', Math.abs(pm[0] - 45) < .01 && Math.abs(pm[1] - 45) < .01 && Math.abs(pm[2] - 55) < .01 && Math.abs(pm[3] - 35) < .01, JSON.stringify(pm)); }

  check('animación con las reglas AAA·RCE·AAE·RCA: con AAA 25° la admisión ya abre a 340° (con el típico de 10°, no)', await E(() => {
    ph.auto = false; ph.T = view.span / 2; ph.t0 = view.t0; eng.on = true; eng.A = null; pms.on = true; pms.t = engA(); const d = ph.T / 720, P = pms.t, c = eng.c0 || 1, li = g => amCyl(P + g * d, c).li;
    const a = li(340); vv.ia = P - 25 * d; vv.fe = P + 15 * d; vv.ie = P + 130 * d; vv.fa = P + 220 * d; const b = li(340), v = amVal(); vv.ia = vv.fe = vv.ie = vv.fa = null; return a === 0 && b > 0 && v.med && v.aaa === 25; }));
  console.log('\nF7 · Barra de grados con animación al arrastrar');
  { await E(() => { ph.auto = false; ph.t0 = view.t0 + view.span * .1; ph.T = view.span * .8; eng.on = true; eng.A = null; draw(); gdOn(true); });
    const bx = await p.$eval('#cv', c => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y }; }), gx = await E(() => gdX()), gy = await E(() => M.t + PH() / 2);
    await p.mouse.move(bx.x + gx, bx.y + gy); await p.mouse.down(); await p.mouse.move(bx.x + gx + 80, bx.y + gy, { steps: 3 });
    const mid = await E(() => ({ d: gd.drag, deg: gdDeg(gd.t) }));
    await p.mouse.up();
    check('barra de grados: se arrastra, cambia los grados y la animación solo se ve mientras se arrastra', mid.d && mid.deg > 306 && !(await E(() => gd.drag)), JSON.stringify(mid));
    await E(() => gdOn(false)); }

  console.log('\nErrores JS durante la sesión:', errs.length);
  errs.forEach(e => console.log('  !', e));
  check('sin errores JS', errs.length === 0);
  console.log('\n16 · Versión portal (google.script.run simulado, contrato v1)');
  {
    const pp = await ctx.newPage(); const perr = []; pp.on('pageerror', e => perr.push(String(e)));
    await pp.addInitScript(() => {
      const mk = (s, f) => ({ withSuccessHandler: x => mk(x, f), withFailureHandler: y => mk(s, y), apiDiagnostico: req => { (window.__reqs = window.__reqs || []).push(req); setTimeout(() => s(window.__resp(req)), 5); } });
      window.google = { script: { run: mk(null, null) } };
      window.__resp = req => req.op === 'reglas_leer' ? { ok: true, v: 1, op: 'reglas_leer', paquetes: [], permisos: { notas: true, rol: 'cliente' } } : req.op === 'paquetes_lista' ? { ok: true, paquetes: [{ id: 'ortu-pro', nombre: 'Ortu Pro', autor: 'x', version: '1', reglas: 1 }], permisos: { notas: true, rol: 'cliente' } } : req.op === 'paquete_bajar' ? { ok: true, paquete: { paquete: 'ortu-pro', nombre: 'Ortu Pro', version: '1', reglas: [{ id: 'P1', sintoma: 's', si: [{ medida: 'rpm', op: '>', valor: 1 }] }] } } : req.op === 'reglas_guardar' ? { ok: true } : req.op === 'diagnostico' ? { ok: true, v: 1, op: 'diagnostico', hallazgos: [{ regla: 'ADM-TRANS-R01', nt_id: 'ADM-TRANS-001', nt_titulo: 'Transductor en admisión', sintoma: 'Un pulso de depresión menor que el resto', confianza: 'media',
          evidencia: [{ medida: 'desv_pulso_cil', canal: 'CH1', cilindro: 4, valor: -14.2, condicion: '< -10 %', etiqueta: 'Medido' }],
          causas: [{ texto: 'Válvula de escape que no cierra', etiqueta: 'Inferido', como_separar: 'Prueba de fugas' }],
          comprobaciones: [{ orden: 1, texto: 'Compresión relativa', tipo: 'medida' }, { orden: 2, texto: 'Prueba de fugas en el cilindro 4', tipo: 'prueba' }], url_portal: 'https://example.org/nt/ADM-TRANS-001' }],
          relacionadas: [], sin_reglas: false, aviso: 'Posibles causas: confírmalas con las comprobaciones antes de sustituir piezas.' }
        : req.op === 'buscar' ? { ok: true, v: 1, op: 'buscar', total: 1, resultados: [{ id: 'INY-1', titulo: 'Inyector PD', resumen: 'Resumen', url_portal: 'https://example.org/nt/INY-1' }] }
        : { ok: true, v: 1, op: 'nt', nt: { id: 'INY-1', titulo: 'Inyector PD', cuerpo: '## Patrón\n- pico **20 A**\n<img src=x onerror="window.__xss=1">', valores_referencia: [{ magnitud: 'corriente de pico', min: 18, max: 22, unidad: 'A', etiqueta: 'Teórico OEM', fuente: 'Material del curso · PRV-0123', pagina: 45 }] } };
    });
    await pp.goto('file://' + path.resolve(__dirname, '..', 'dist', 'analyzer-scope-portal.html')); await pp.waitForTimeout(400);
    await pp.setInputFiles('#fi', CAPS[0]); await pp.waitForTimeout(600);
    await pp.evaluate(() => { CH[0].p = 'Presión admisión'; fit(); ph.auto = false; ph.t0 = view.t0; ph.T = view.span / 2.5; eng.A = null; eng.on = true; ui(); draw(); });
    await pp.click('#tabX'); await pp.click('#xGo'); await pp.waitForTimeout(150);
    const rq = await pp.evaluate(() => window.__reqs && window.__reqs.find(r => r.op === 'diagnostico'));
    check('portal: al abrir pide «Mis reglas» guardadas en la cuenta', await pp.evaluate(() => window.__reqs.some(r => r.op === 'reglas_leer')));
    check('portal: petición «diagnostico» con contrato v1', rq && rq.v === 1 && rq.op === 'diagnostico' && rq.contexto.motor.cilindros === 4 && rq.contexto.senales[0].entidad === 'transductor admisión' && !('_cil' in rq), JSON.stringify(rq && rq.contexto));
    check('portal: medidas por cilindro (desv_pulso_cil con 4 cilindros)', rq && rq.medidas.some(m => m.id === 'desv_pulso_cil' && Object.keys(m.por_cilindro).length === 4));
    const tx = await pp.textContent('#xRes');
    check('portal: hallazgo con cilindro, causas, comprobaciones y aviso', /cilindro 4/.test(tx) && /Válvula de escape/.test(tx) && /Prueba de fugas en el cilindro 4/.test(tx) && /confírmalas/.test(tx));
    await pp.check('#xRes .dxc input >> nth=0');
    await pp.click('#tabS');
    const [pd] = await Promise.all([pp.waitForEvent('download'), pp.click('#bPdf')]);
    const pdf = fs.readFileSync(await pd.path()).toString('latin1');
    check('portal: el PDF incluye la página de diagnóstico con la comprobación marcada', /posibles causas y comprobaciones/.test(pdf) && /\[x\] 1\. Compresi/.test(pdf));
    await pp.click('#tabX'); await pp.fill('#xQ', 'inyector'); await pp.click('#xBu'); await pp.waitForTimeout(100); await pp.click('#xRes button'); await pp.waitForTimeout(100);
    check('portal: buscar → ver NT (texto seguro, sin HTML ejecutable)', await pp.evaluate(() => /Inyector PD/.test($('xRes').innerText) && /PRV-0123/.test($('xRes').innerText) && !$('xRes').querySelector('img') && !window.__xss));
    await pp.evaluate(() => pqCargar()); await pp.waitForTimeout(100);
    await pp.click('#xPqP button'); await pp.waitForTimeout(100);
    check('portal: paquete compartido se baja y queda como fuente de solo lectura', await pp.evaluate(() => rgTodos().some(p => p.paquete === 'ortu-pro' && p.base && p.sub)));
    check('portal: sin notas maestras en el permiso, desaparece esa fuente', await pp.evaluate(() => { RG_PERM = { notas: false, rol: 'cliente' }; const r = !rgTodos().some(p => p.paquete === 'nt'); RG_PERM = { notas: true }; return r; }));
    check('portal: sin errores JS', perr.length === 0, perr.join(' | '));
    await pp.close();
  }

  console.log('\nF0 · Escala común, buffers, lectura por trozos, filtros y nombre de canal');
  {
    const q = await ctx.newPage(); const qe = []; q.on('pageerror', e => qe.push(String(e))); await q.goto(APP); await q.waitForTimeout(400);
    const mk = (amp, n = 4000) => { let t = 'Tiempo;Canal A;Canal B\r\n(ms);(V);(V)\r\n\r\n'; for (let i = 0; i < n; i++) t += (i * 0.1).toFixed(4).replace('.', ',') + ';' + (amp * Math.sin(i / 20)).toFixed(6).replace('.', ',') + ';' + (0.5 * Math.cos(i / 30)).toFixed(6).replace('.', ',') + '\r\n'; return t; };
    const F = (name, txt) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(txt) });
    await q.setInputFiles('#fi', [F('cap-0003_2.csv', mk(1.2)), F('cap-0003_1.csv', mk(0.004))]); await q.waitForTimeout(700);
    check('los buffers se ordenan por su número (_1, _2)', await q.evaluate(() => PG.map(p => p.name).join()) === 'cap-0003_1.csv,cap-0003_2.csv');
    check('la barra indica el buffer', (await q.evaluate(() => $('pgL').textContent)).startsWith('Buffer 1 · 1 / 2'));
    check('buffer plano: la escala sale del conjunto (500 mV/div), no del ruido', await q.evaluate(() => CH[0].vd) === 0.5, String(await q.evaluate(() => CH[0].vd)));
    await q.evaluate(() => { CH[0].fl = 'bajo'; proc(CH[0]); ui(); });
    check('aviso «F» de filtro activo en el canal', await q.evaluate(() => !!document.querySelector('.chb .fb')));
    await q.click('.chb .ed'); await q.fill('.nmI', 'CR <b>'); await q.press('.nmI', 'Enter');
    check('nombre de canal editable, en todos los buffers y sin HTML', await q.evaluate(() => CH[0].n === 'CR <b>' && PG.every(p => p.chs[0].n === 'CR <b>') && !document.querySelector('.chb .lab b:not(.fb)')));
    await q.setInputFiles('#fi', [F('otra.csv', mk(2))]); await q.waitForTimeout(600);
    check('al cargar otro archivo los filtros vuelven a «Sin filtro»', await q.evaluate(() => CH.every(c => c.fl === 'off') && !document.querySelector('.chb .fb')));
    const big = mk(1, 30000), ref = await q.evaluate(t => { const r = parseText(t); return [r.n, r.chs.length, r.chs[0].x[r.n - 1], r.chs[1].y[777]]; }, big);
    await q.evaluate(() => { BIGF = 1000; $('bClr').click(); });
    await q.setInputFiles('#fi', [F('grande.csv', big)]); await q.waitForTimeout(900);
    const got = await q.evaluate(() => { const c = PG[0].chs; return [c[0].x.length, c.length, c[0].x[c[0].x.length - 1], c[1].y[777]]; });
    check('lectura por trozos = lectura normal (muestras, canales, tiempo y valores)', JSON.stringify(got) === JSON.stringify(ref), JSON.stringify([got, ref]));
    check('fase 0: sin errores JS', qe.length === 0, qe.join(' | '));
    await q.close();
  }

  console.log('\nF1 · Vista nueva: la señal manda, todo lo demás se despliega y se recoge');
  {
    const c2 = await b.newContext({ viewport: { width: 1400, height: 820 } }); await c2.route(/^https?:/, r => r.abort()); await c2.addInitScript(() => { try { localStorage.setItem('as_guia', '1'); localStorage.setItem('as_portada', '1'); } catch (e) { } });
    const q = await c2.newPage(); const qe = []; q.on('pageerror', e => qe.push(String(e))); await serve(c2); await q.goto(APP_H); await q.waitForTimeout(400);
    const vis = s => q.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, s);
    check('vista nueva por defecto, panel lateral recogido', await q.evaluate(() => !document.body.classList.contains('fix')) && !(await vis('#leftp')));
    check('sin señal: estado vacío con «Abrir archivos…» y «Ver un ejemplo»; iconos en los grupos', await vis('#empty') && await vis('#emOp') && await q.evaluate(() => !!document.querySelector('#gRu .gb svg') && !!document.querySelector('#bMore svg')));
    await q.click('#emEx'); await q.waitForTimeout(700);
    check('«Ver un ejemplo» carga la señal y quita el estado vacío', !(await vis('#empty')) && await q.evaluate(() => CH.some(c => c.x)));
    await q.evaluate(async () => { await loadFiles([new File(['esto no es un csv'], 'malo.csv')]); });
    check('un archivo no válido se avisa en rojo sin perder la señal', await q.evaluate(() => CH.some(c => c.x) && /malo\.csv/.test($('st').textContent)));
    check('la gráfica ocupa más del 70 % del alto', await q.evaluate(() => cv.clientHeight / innerHeight) > 0.7);
    check('una pastilla por canal cargado', await q.evaluate(() => document.querySelectorAll('.chip').length === CH.filter(c => c.x).length && document.querySelectorAll('.chip').length > 0));
    await q.click('.chip');
    check('pastilla → ajustes solo de ese canal', await q.evaluate(() => [...document.querySelectorAll('#chBox .chb')].filter(e => e.getBoundingClientRect().height > 0).length) === 1 && await vis('#chBox select.st'));
    await q.selectOption('#chBox .chb.cur select.st', '5');
    check('la pastilla refleja la escala elegida', (await q.evaluate(() => document.querySelector('.chip.cur span').textContent)).startsWith('5 '));
    await q.mouse.click(700, 500); await q.waitForTimeout(100);
    check('clic fuera: los ajustes del canal se recogen', !(await vis('#chBox')));
    await q.click('#gRu .gb'); const t0 = await q.evaluate(() => tr.on); await q.click('#tT');
    check('grupo «Reglas»: activa T1/T2 y sigue abierto', await q.evaluate(() => tr.on) !== t0 && await vis('#tT'));
    await q.keyboard.press('Escape');
    check('Escape recoge el grupo', !(await vis('#tT')));
    await q.click('#gMo .gb'); await q.click('#bDrw');
    check('«Configurar fase y cilindros…» abre el panel lateral', await vis('#leftp') && await vis('#gN') && !(await vis('#tPms')));
    await q.click('#bDrX'); check('✕ lo cierra', !(await vis('#leftp')));
    await q.click('#gMo .gb'); await q.click('#bMD');
    check('«Motor» abre el diagrama de distribución (ya no está en el selector de vista)', await q.evaluate(() => curTab === 'D' && $('bVw').textContent.startsWith('Diagrama')) && !(await vis('#tPms')));
    await q.click('#bVw');
    check('selector de vista: sin diagrama ni compresión, que van en «Motor»', await vis('#tabS') && !(await vis('#tabD')) && !(await vis('#tabC')));
    await q.keyboard.press('Escape');
    await q.click('#bVw'); await q.click('#tabS');
    await q.click('#bMore'); await q.click('#bThm');
    check('tema claro: interfaz y fondo de la gráfica', await q.evaluate(() => document.body.classList.contains('light') && BGL > 0.99));
    await q.click('#lEN'); await q.waitForTimeout(200);
    check('textos nuevos traducidos', await q.evaluate(() => $('bVw').textContent.startsWith('Oscilloscope') && $('bThm').textContent === 'Dark theme' && document.querySelector('#gMo .gb').textContent === 'Engine'));
    await q.click('#lES'); await q.click('#bThm'); await q.click('#bUi');
    check('«Vista clásica»: paneles a la vista y canales de vuelta en su panel', await q.evaluate(() => document.body.classList.contains('fix') && $('chBox').parentElement.id === 'leftp') && await vis('#leftp') && await vis('#tPms'));
    await q.waitForTimeout(500); // el navegador confirma localStorage de forma asíncrona: recargar al instante puede leer el valor anterior
    await q.waitForTimeout(500); await q.reload(); await q.waitForFunction(() => typeof landShow === 'function'); await q.waitForTimeout(300);
    check('la vista elegida se recuerda', await q.evaluate(() => document.body.classList.contains('fix')));
    await q.click('#bUi');
    await q.setViewportSize({ width: 400, height: 780 }); await q.click('#bMore'); await q.selectOption('#ex', '0'); await q.waitForTimeout(600);
    check('móvil: sin desplazamiento horizontal y gráfica ≥ 45 % del alto', await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth && cv.clientHeight / innerHeight >= 0.45), JSON.stringify(await q.evaluate(() => [document.documentElement.scrollWidth, cv.clientHeight])));
    check('vista nueva: sin errores JS', qe.length === 0, qe.join(' | '));
    await c2.close();
  }

  console.log('\nF2 · Ficha de la captura (vehículo, prueba y estado del motor)');
  {
    const c3 = await b.newContext({ viewport: { width: 1400, height: 820 }, acceptDownloads: true }); await c3.route(/^https?:/, r => r.abort()); await c3.addInitScript(() => { try { localStorage.setItem('as_guia', '1'); localStorage.setItem('as_portada', '1'); } catch (e) { } });
    const q = await c3.newPage(); const qe = []; q.on('pageerror', e => qe.push(String(e))); await q.goto(APP); await q.waitForTimeout(400);
    const vis = s => q.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, s);
    await q.click('#bMore'); await q.selectOption('#ex', '0'); await q.waitForTimeout(600);
    check('un ejemplo no pide ficha, pero se puede rellenar', !(await vis('#fic')) && (await q.evaluate(() => $('bFic').textContent)) === 'Ficha: sin completar');
    await q.evaluate(() => $('bClr').click());
    await q.setInputFiles('#fi', D('seat_altea_fase_pms_y_inyector_1.csv')); await q.waitForTimeout(700);
    check('al abrir un archivo se pide la ficha', await vis('#fic') && await q.evaluate(() => document.querySelectorAll('#fcCh input').length === 3));
    await q.fill('#fcM', 'Seat Altea 2.0 TDI'); await q.fill('#fcC', 'BKD'); await q.selectOption('#fcK', 'ralenti'); await q.selectOption('#fcT', 'caliente');
    await q.fill('#fcCh input', 'Inyector 1'); await q.click('#fcSv');
    check('sin estado del motor no se guarda', await vis('#fic') && /estado del motor/.test(await q.evaluate(() => $('fcSt').textContent)));
    await q.click('#fcKo'); check('«Motor con fallo» pide la avería', await vis('#fcA'));
    await q.click('#fcOk'); await q.click('#fcSv');
    check('guardada: pastilla, parámetro del canal y código para el diagnóstico', !(await vis('#fic')) && await q.evaluate(() => $('bFic').textContent === '✓ Motor sin fallos · BKD' && CH[0].p === 'Inyector 1' && $('xC').value === 'BKD'));
    check('la ficha va en el CSV con ajustes y en el PDF', await q.evaluate(() => cfgOf(CH.filter(c => c.x)).fic.estado === 'ok' && ficLines().join('|') === 'Ficha: Seat Altea 2.0 TDI · motor BKD · diésel · ralentí · motor caliente|Estado: Motor sin fallos'));
    const csv = await q.evaluate(() => ficCsv(400).csv);
    check('CSV reducido para la biblioteca (≤ 400 filas, con ajustes)', csv.startsWith('#analyzer-scope-ajustes;') && csv.split('\r\n').length <= 404 && csv.split('\r\n').length > 300, String(csv.split('\r\n').length));
    await q.evaluate(() => $('bClr').click());
    await q.setInputFiles('#fi', { name: 'ref.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) }); await q.waitForTimeout(700);
    check('al reabrirlo se recupera la ficha sin volver a preguntar', !(await vis('#fic')) && await q.evaluate(() => FIC && FIC.codigo === 'BKD' && $('bFic').textContent.startsWith('✓')));
    check('sin biblioteca configurada no se ofrece el envío', await q.evaluate(() => { ficOpen(); const h = $('fcTx').hidden && $('fcIl').hidden; $('fic').hidden = true; return h; }));
    await q.evaluate(() => { APP_CFG.bibliotecaUrl = 'https://example.org/exec'; window._n = 0;
      window.fetch = async (u, o) => { window._n++; window._url = u; window._opt = o; window._req = JSON.parse(o.body); return { json: async () => window._req.codigo === 'BUENO' ? { ok: true, v: 1, op: 'referencia', id: 'R1', estado: 'pendiente' } : { ok: false, v: 1, op: 'referencia', error: { codigo: 'no_autorizado', mensaje: 'El código de invitación no es válido.' } } }; }; });
    await q.click('#bFic'); await q.click('#fcKo'); await q.fill('#fcA', 'tirones'); await q.click('#fcTx');
    check('sin código de invitación no se envía', await vis('#fic') && await q.evaluate(() => window._n === 0 && /invitación/.test($('fcSt').textContent)));
    await q.fill('#fcI', 'MALO'); await q.click('#fcTx'); await q.waitForTimeout(300);
    check('código no válido: aviso en rojo y no queda como enviada', await q.evaluate(() => /no es válido/.test($('st').textContent) && $('st').classList.contains('err') && !FIC.enviada));
    await q.click('#bFic'); await q.fill('#fcI', 'BUENO'); await q.click('#fcTx'); await q.waitForTimeout(300);
    check('biblioteca: POST sin preflight con código, ficha, señales y CSV con ajustes', await q.evaluate(() => { const r = window._req, o = window._opt; return window._url === 'https://example.org/exec' && o.method === 'POST' && /^text\/plain/.test(o.headers['Content-Type']) && r.op === 'referencia' && r.codigo === 'BUENO' && r.ficha.estado === 'fallo' && r.ficha.averia === 'tirones' && r.ficha.senales.length === 3 && r.ficha.senales[0].parametro === 'Inyector 1' && r.archivo.csv.startsWith('#analyzer-scope-ajustes;') && /pendiente/.test($('st').textContent) && FIC.enviada === 'R1'; }));
    check('el código se recuerda para el siguiente envío', await q.evaluate(() => { ficOpen(); const v = $('fcI').value; $('fic').hidden = true; return v === 'BUENO'; }));
    check('ficha: sin errores JS', qe.length === 0, qe.join(' | '));
    await c3.close();
  }

  console.log('\nF3 · Usabilidad: guía de primer uso, atajos, deshacer y móvil');
  {
    const c4 = await b.newContext({ viewport: { width: 1400, height: 820 } }); await c4.route(/^https?:/, r => r.abort()); await c4.addInitScript(() => { try { localStorage.setItem('as_portada', '1'); } catch (e) { } });
    const q = await c4.newPage(); const qe = []; q.on('pageerror', e => qe.push(String(e))); await serve(c4); await q.goto(APP_H); await q.waitForTimeout(400);
    const vis = s => q.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, s);
    check('primera visita: guía en el paso 1 señalando «Abrir archivos…»', await vis('#gd') && await q.evaluate(() => $('gdN').textContent === '1 / 3' && $('bOpen').classList.contains('gdT')));
    await q.click('#gdG'); await q.click('#gdG');
    check('paso 3 y botón «Entendido»', await q.evaluate(() => $('gdN').textContent === '3 / 3' && $('gdG').textContent === 'Entendido'));
    await q.click('#gdG'); await q.waitForTimeout(500); await q.reload(); await q.waitForTimeout(300);
    check('terminada, no vuelve a salir', !(await vis('#gd')) && await q.evaluate(() => !document.querySelector('.gdT')));
    await q.click('#emEx'); await q.waitForTimeout(900);
    const v0 = await q.evaluate(() => [view.t0, view.span]);
    await q.keyboard.press('ArrowRight'); await q.keyboard.press('+');
    const v1 = await q.evaluate(() => [view.t0, view.span]);
    check('atajos: → desplaza y + acerca', v1[1] < v0[1] && v1[0] > v0[0], JSON.stringify([v0, v1]));
    await q.keyboard.press('0');
    check('atajo 0: ajusta a la pantalla', Math.abs((await q.evaluate(() => view.span)) - v0[1]) < 1e-9);
    await q.keyboard.press('2'); check('atajo 2: abre los ajustes del canal 2', await q.evaluate(() => chOpen === 1 && sel === 1) && await vis('#chBox'));
    await q.keyboard.press('Escape'); await q.waitForTimeout(500);
    const vd0 = await q.evaluate(() => CH[0].vd);
    await q.evaluate(() => { CH[0].vd = 10; ann.list.push({ k: 'line', col: '#ffd24d', w: 2, x1: 0, y1: .2, x2: .01, y2: .4 }); ui(); draw(); }); await q.waitForTimeout(500);
    await q.keyboard.press('Control+z'); await q.waitForTimeout(100);
    check('Ctrl+Z deshace escala y anotación', await q.evaluate(() => [CH[0].vd, ann.list.length]).then(r => r[0] === vd0 && r[1] === 0));
    await q.keyboard.press('Control+Shift+Z'); await q.waitForTimeout(100);
    check('Ctrl+Mayús+Z rehace', await q.evaluate(() => CH[0].vd === 10 && ann.list.length === 1));
    await q.keyboard.press('?'); check('? abre los atajos de teclado', await vis('#kb')); await q.keyboard.press('Escape'); check('Esc los cierra', !(await vis('#kb')));
    await q.setViewportSize({ width: 400, height: 780 }); await q.waitForTimeout(200); await q.click('#gRu .gb'); await q.waitForTimeout(300);
    check('móvil: el grupo se abre como hoja inferior a todo el ancho', await q.evaluate(() => { const r = document.querySelector('#gRu .gp').getBoundingClientRect(); return r.left === 0 && Math.round(r.right) === innerWidth && Math.abs(r.bottom - innerHeight) < 2; }));
    check('usabilidad: sin errores JS', qe.length === 0, qe.join(' | '));
    await c4.close();
  }

  console.log('\nF4 · Portada con demo en vivo y caso real paso a paso');
  {
    const c5 = await b.newContext({ viewport: { width: 1400, height: 820 } }); await c5.route(/^https?:/, r => r.abort());
    const q = await c5.newPage(); const qe = []; q.on('pageerror', e => qe.push(String(e))); await serve(c5); await q.goto(APP_H); await q.waitForTimeout(1500);
    const vis = s => q.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, s);
    check('primera visita: portada en español', await vis('#land') && await q.evaluate(() => document.querySelector('#land h1').textContent === 'La señal, sin ruido.' && LANG === 'es'));
    check('demo en vivo: la captura de ejemplo se está dibujando', await q.evaluate(() => { const c = $('ldCv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; return n > 500 && /Seat Altea/.test($('ldCap').textContent); }));
    await q.click('#ldEN'); await q.waitForTimeout(200);
    check('portada en inglés', await q.evaluate(() => document.querySelector('#land h1').textContent === 'The signal, without the noise.' && $('ldCs').textContent === 'See a real case'));
    await q.click('#ldES'); await q.click('#ldCs'); await q.waitForTimeout(900);
    check('«Ver un caso real»: entra, carga la captura y abre el paso 1 de 6 sin pedir ficha', !(await vis('#land')) && !(await vis('#fic')) && await q.evaluate(() => CH.filter(c => c.x).length === 3 && $('gdN').textContent === '1 / 6'));
    for (let i = 0; i < 4; i++) await q.click('#gdG');
    check('los pasos usan las herramientas de verdad: cilindros, T1/T2 y anotación', await q.evaluate(() => $('tGr').classList.contains('on') && tr.on && cur.a != null && cur.b > cur.a && ann.list.length === 2 && $('gdN').textContent === '5 / 6'));
    await q.click('#gdG'); await q.click('#gdG');
    check('fin del caso', !(await vis('#gd')));
    await q.waitForTimeout(500); await q.reload(); await q.waitForTimeout(400);
    check('segunda visita: directo a la app (la portada sigue en ☰)', !(await vis('#land')) && await q.evaluate(() => !!$('bLd')));
    await q.click('#gdS'); await q.click('#bMore'); await q.click('#bLd');
    await q.setViewportSize({ width: 400, height: 780 }); await q.waitForTimeout(300);
    check('portada en móvil: sin desplazamiento horizontal', await vis('#land') && await q.evaluate(() => $('land').scrollWidth <= innerWidth && document.documentElement.scrollWidth <= innerWidth));
    check('portada: sin errores JS', qe.length === 0, qe.join(' | '));
    await c5.close();
  }

  console.log('\nF5 · Sensor por canal (barras en bar) y animación del motor');
  {
    const c6 = await b.newContext({ viewport: { width: 1400, height: 900 } }); await c6.route(/^https?:/, r => r.abort());
    await c6.addInitScript(() => { try { localStorage.setItem('as_guia', '1'); localStorage.setItem('as_portada', '1'); } catch (e) { } });
    const q = await c6.newPage(); const qe = []; q.on('pageerror', e => qe.push(String(e))); await serve(c6); await q.goto(APP_H); await q.waitForTimeout(400);
    const vis = s => q.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, s);
    await q.click('#emEx'); await q.waitForTimeout(800);
    await q.click('.chip'); await q.selectOption('#chBox .chb.cur .ch3 select', '1');
    check('sensor «1 V = 10 bar»: el canal pasa a bar y la señal se multiplica', await q.evaluate(() => { const c = CH[0]; return c.u === 'bar' && Math.abs(c.y[100] - c.y0[100] * 10) < Math.abs(c.y0[100] * 10) * 1e-5 + 1e-6 && /bar\/div/.test(document.querySelector('.chip').textContent); }));
    await q.fill('#chBox .chb.cur .ch3 input[type=number]', '2'); await q.press('#chBox .chb.cur .ch3 input[type=number]', 'Tab'); await q.waitForTimeout(150);
    check('factor personalizado y reglas de amplitud con su diferencia en bar', await q.evaluate(() => { const c = CH[0]; ensureH(c); draw(); return c.sen.k === 2 && Math.abs(c.y[100] - c.y0[100] * 2) < Math.abs(c.y0[100] * 2) * 1e-5 + 1e-6 && /amplitud.*Δ [-\d.,]+ [kmµ]?bar/.test($('rd').textContent); }), await q.evaluate(() => $('rd').textContent.slice(0, 300)));
    check('el sensor va en los ajustes (CSV y deshacer) y se quita con «Sin sensor»', await q.evaluate(() => { const ok = cfgOf(CH).ch[0].sen.k === 2; senSet(0, null); return ok && CH[0].u === 'V' && CH[0].y[100] === CH[0].y0[100]; }));
    await q.keyboard.press('Escape'); await q.click('#gMo .gb'); await q.click('#tAnm'); await q.waitForTimeout(300);
    check('«Animación del motor» abre el panel con el dibujo', await vis('#anim') && await q.evaluate(() => { const c = $('anC'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 100) n++; return n > 800; }));
    const k = await q.evaluate(() => { const A = engA(), c = eng.c0, T = ph.T, V = Object.assign({ med: false }, AM_TIP), f = u => { const r = amCyl(A + T * u, c, V); return [Math.round(r.a), +r.s.toFixed(3), +r.li.toFixed(3), +r.le.toFixed(3), r.st]; }; return [f(0), f(.25), f(.5), f(.625), f(.875)]; });
    check('cinemática: PMS de compresión (pistón arriba, válvulas cerradas) y PMI tras la expansión (escape abriendo)', k[0].join() === '0,0,0,0,2' && k[1][0] === 180 && k[1][1] === 1 && k[1][2] === 0 && k[1][3] > 0, JSON.stringify(k));
    check('cruce en el PMS de escape, admisión abierta a mitad de carrera y todo cerrado en compresión', k[2][0] === 360 && k[2][1] === 0 && k[2][2] > 0 && k[2][3] > 0 && k[3][2] > 0.5 && k[3][3] === 0 && k[3][4] === 0 && k[4][2] === 0 && k[4][3] === 0 && k[4][4] === 1, JSON.stringify(k));
    await q.evaluate(() => { const r = $('anR'); r.value = 250; r.dispatchEvent(new Event('input')); });
    check('el deslizador mueve el punto y la línea sobre la señal', await q.evaluate(() => Math.abs(AM.t - (view.t0 + view.span * .25)) < 1e-9 && !$('anL').hidden && /°/.test($('anT').textContent)));
    const t1 = await q.evaluate(() => AM.t); await q.click('#anP'); await q.waitForTimeout(500);
    check('▶ reproduce y ✕ cierra', (await q.evaluate(() => AM.t)) > t1 && await q.evaluate(() => { $('anX').click(); return $('anim').hidden && $('anL').hidden && !AM.play; }));
    check('sensor y animación: sin errores JS', qe.length === 0, qe.join(' | '));
    await c6.close();
  }

  console.log('\nF6 · Unidades por escala, rueda, lupa y tiempos entre INICIO y FIN');
  {
    const c7 = await b.newContext({ viewport: { width: 1400, height: 900 } }); await c7.route(/^https?:/, r => r.abort());
    await c7.addInitScript(() => { try { localStorage.setItem('as_guia', '1'); localStorage.setItem('as_portada', '1'); localStorage.setItem('as_ficha', 'off'); } catch (e) { } });
    const q = await c7.newPage(); const qe = []; q.on('pageerror', e => qe.push(String(e))); await serve(c7); await q.goto(APP_H); await q.waitForTimeout(400);
    const mk = n => { let t = 'Tiempo;Pinza A\r\n(ms);(A)\r\n\r\n'; for (let i = 0; i < n; i++) t += (i * 0.01).toFixed(4).replace('.', ',') + ';' + (i % 500 < 20 ? 0.7287 : -0.0827).toFixed(4).replace('.', ',') + '\r\n'; return t; };
    await q.setInputFiles('#fi', { name: 'pinza.csv', mimeType: 'text/csv', buffer: Buffer.from(mk(4000)) }); await q.waitForTimeout(600);
    await q.evaluate(() => { CH[0].vd = 0.1; ui(); draw(); });
    check('pinza a 100 mA/div: lecturas en A, como el rango del osciloscopio (0,7287 A, no 728,7 mA)', await q.evaluate(() => /Máx 0\.7287 A/.test($('rd').textContent) && document.querySelector('.chip span').textContent === '0.1 A/div'), await q.evaluate(() => $('rd').textContent.slice(0, 120)));
    check('escalas pequeñas siguen en mA (20 mA/div) y el eje usa valores redondos', await q.evaluate(() => fmtV(0.02, 'A') === '20 mA' && fmtC(0.0648, { vd: 0.02, u: 'A' }) === '64.8 mA' && (autoCh(0), Number.isInteger(CH[0].off))));
    const span0 = await q.evaluate(() => view.span), box = await q.evaluate(() => { const r = cv.getBoundingClientRect(); return { x: r.left + M.l + PW() / 2, y: r.top + M.t + PH() / 2 }; });
    await q.mouse.move(box.x, box.y); await q.mouse.wheel(0, 4); await q.waitForTimeout(100);
    const span1 = await q.evaluate(() => view.span);
    check('rueda de trackpad (paso pequeño): zoom suave, < 2 %', span1 / span0 > 1 && span1 / span0 < 1.02, String(span1 / span0));
    const t0a = await q.evaluate(() => view.t0); await q.mouse.wheel(60, 0); await q.waitForTimeout(100);
    check('deslizar en horizontal desplaza la señal sin cambiar el zoom', await q.evaluate(t => view.t0 > t && Math.abs(view.span - (window._s = view.span)) < 1e-12, t0a) && Math.abs((await q.evaluate(() => view.span)) - span1) < 1e-12);
    await q.keyboard.press('z');
    check('Z activa la lupa con su barra', await q.evaluate(() => zm.on && !$('zb').hidden && $('tZm').classList.contains('on')));
    const g = await q.evaluate(() => { const r = cv.getBoundingClientRect(); return { l: r.left + M.l, t: r.top + M.t, w: PW(), h: PH(), span: view.span, t0: view.t0, vd: CH[0].vd }; });
    await q.mouse.move(g.l + g.w * .2, g.t + g.h * .5); await q.mouse.down(); await q.mouse.move(g.l + g.w * .4, g.t + g.h * .5 + 5, { steps: 4 }); await q.mouse.up();
    check('recuadro bajo: amplía solo el tiempo de esa zona', await q.evaluate(g => Math.abs(view.span - g.span * .2) < g.span * .01 && Math.abs(view.t0 - (g.t0 + g.span * .2)) < g.span * .01 && CH[0].vd === g.vd, g));
    { const h = await q.evaluate(() => { const r = cv.getBoundingClientRect(); return { l: r.left + M.l, t: r.top + M.t, w: PW(), h: PH() }; });
      await q.mouse.move(h.l + h.w * .3, h.t + h.h * .25); await q.mouse.down(); await q.mouse.move(h.l + h.w * .6, h.t + h.h * .5, { steps: 4 }); await q.mouse.up(); }
    check('recuadro alto: amplía también la amplitud (¼ de la escala) y el selector la muestra', await q.evaluate(g => { const o = document.querySelector('.chb select.st').selectedOptions[0]; return Math.abs(CH[0].vd - g.vd * .25) < 1e-9 && +o.value === CH[0].vd && o.textContent === fmtV(CH[0].vd, 'A') + '/div'; }, g));
    await q.keyboard.press('Backspace'); await q.keyboard.press('Backspace');
    check('Retroceso: vuelve paso a paso al zoom anterior', await q.evaluate(g => Math.abs(view.span - g.span) < 1e-12 && Math.abs(view.t0 - g.t0) < 1e-12 && CH[0].vd === g.vd, g));
    await q.keyboard.press('Escape');
    check('Esc sale de la lupa', await q.evaluate(() => !zm.on && $('zb').hidden));
    const pix = await q.evaluate(() => {
      CH.forEach(c => c.on = false); eng.on = true; eng.show = -1; ph.on = true; ph.deg = 720; ph.auto = false;
      ph.t0 = view.t0 + view.span * .3; ph.T = view.span * .3; eng.A = null; draw();
      const d = cv.getContext('2d'), dp = cv.width / cv.clientWidth, at = u => { const p = d.getImageData(Math.round((M.l + PW() * u) * dp), Math.round((M.t + 26 + 7) * dp), 1, 1).data; return p[0] + p[1] + p[2]; };
      return { fuera: at(.15), dentro: at(.45), despues: at(.75) };
    });
    check('ADM·COMP·EXP·ESC solo entre INICIO y FIN', pix.dentro > pix.fuera + 40 && pix.dentro > pix.despues + 40, JSON.stringify(pix));
    check('reglas de 720° bloqueadas: al llevarlas a otra zona van con ellas los cilindros, el PMS y las reglas de distribución y avance (mismos grados)', await q.evaluate(() => { ph.lk = true; ph.t0 = view.t0 + view.span * .3; eng.A = ph.t0 + ph.T / 2 + 0.001; const A0 = engA(), t0 = ph.t0, dt = view.span * .1; pms.t = t0 + .01; vv.ia = t0 + .02; vv.fe = t0 + .03; adv.t = t0 + .004; adv.i1 = t0 + .005; drag = { snap: { t0: t0, A: A0, pms: pms.t, vv: { ia: vv.ia, fa: vv.fa, ie: vv.ie, fe: vv.fe }, adv: { t: adv.t, i1: adv.i1, i2: adv.i2 } } }; const rd = () => JSON.stringify(distCalc(), (k, v) => typeof v === 'number' ? +v.toFixed(6) : v), dc0 = rd(); const ok = lockMove({ k: 'p1' }, dt) && Math.abs(ph.t0 - (t0 + dt)) < 1e-12 && Math.abs(engA() - (A0 + dt)) < 1e-12 && Math.abs(pms.t - (t0 + .01 + dt)) < 1e-12 && Math.abs(vv.ia - (t0 + .02 + dt)) < 1e-12 && Math.abs(vv.fe - (t0 + .03 + dt)) < 1e-12 && Math.abs(adv.t - (t0 + .004 + dt)) < 1e-12 && Math.abs(adv.i1 - (t0 + .005 + dt)) < 1e-12 && rd() === dc0; drag = null; ph.lk = false; return ok; }));
    check('unidades, rueda y lupa: sin errores JS', qe.length === 0, qe.join(' | '));
    await c7.close();
  }

  console.log('\nF8 · Procedimientos (pasos guiados para PicoScope) y skills');
  {
    const k = await ctx.newPage(); const ke = []; k.on('pageerror', e => ke.push(String(e))); k.setDefaultTimeout(6000);
    await k.goto(APP); await k.waitForTimeout(400); await k.click('#tabK'); await k.waitForTimeout(150);
    const KE = fn => k.evaluate(fn);
    check('apartados por sistema: Arranque y carga, Integridad mecánica, Equilibrio de cilindros, Encendido, Inyección, Red CAN', await KE(() => SCRIPTS_BASE.map(s => s.nombre).join('|') === 'Arranque y carga|Integridad mecánica|Equilibrio de cilindros|Encendido|Inyección|Red CAN'));
    check('originales: los scripts de src/scripts, de solo lectura', await KE(() => SCRIPTS_BASE.length >= 5 && document.querySelectorAll('#kL .skI').length >= 5 && /solo lectura/.test($('kCab').textContent) && !$('kEd')));
    await k.click('#kL .skI:nth-of-type(3)'); await k.waitForTimeout(100);
    check('cambiar de script: cada original se abre al pulsarlo', await KE(() => { const r = []; document.querySelectorAll('#kL .skI').forEach((b, i) => { b.click(); r.push($('kCab').querySelector('h2').textContent); }); return new Set(r).size === r.length && r.length >= 5; }));
    await k.click('#kL .skI[data-k="FR-MEC-01"]'); await k.waitForTimeout(100);
    check('Integridad mecánica (gasolina): pruebas en orden y Px opcional', await KE(() => [...document.querySelectorAll('#kSteps .skS')].map(b => b.textContent).join('|') === '0Configurar PicoScope|1Compresión relativa|2Admisión y cárter|3Escape|4Caída de giro con el contacto quitado y la mariposa abierta|5Presión en cilindro (opcional)|★Resumen'), await KE(() => [...document.querySelectorAll('#kSteps .skS')].map(b => b.textContent).join('|')));
    await k.click('#kFd'); await k.waitForTimeout(100);
    check('diésel: cambia la caída de giro por «al apagar»', await KE(() => /4Caída de giro al apagar/.test($('kSteps').textContent) && !/contacto quitado/.test($('kSteps').textContent)));
    await k.click('#kFg'); await k.waitForTimeout(100);
    await k.click('#kSteps .skS[data-s="2"]'); await k.selectOption('#kTb', '0.005'); await k.waitForTimeout(100);
    check('5 ms/div: avisa de que no se ve el proceso completo y propone 2 s/div', /✗Tiempo\. Con 5 ms\/div la pantalla dura 50 ms.*Sube a 2 s\/div/.test(await k.textContent('#kCk')), await k.textContent('#kCk'));
    await k.click('#kRec'); await k.waitForTimeout(100);
    check('«Usar lo recomendado»: tiempo, muestreo, resolución y tamaño en verde', await KE(() => $('kTb').value === '2' && [...document.querySelectorAll('#kCk .skA')].every(a => a.classList.contains('ok'))), await k.textContent('#kCk'));
    const [fc] = await Promise.all([k.waitForEvent('filechooser'), k.click('#kLoad')]); await fc.setFiles(CAPS[0]); await k.waitForTimeout(600);
    check('CSV del paso: comprueba canales, duración y muestreo frente al paso', await KE(() => /canales \(el paso pide 4\)/.test($('kDrop').textContent) && /Dura .* \(la maniobra necesita 18 s\)/.test($('kDrop').textContent) && document.querySelector('#kSteps .skS[data-s="2"]').classList.contains('wa')), await k.textContent('#kDrop'));
    await k.click('#kVer'); await k.waitForTimeout(200);
    check('«Ver en el osciloscopio» abre la captura', await KE(() => curTab === 'S' && PG.length >= 1 && CH[0].x));
    await k.click('#tabK'); await k.click('#kDup'); await k.waitForTimeout(150);
    check('duplicar: copia en «Mis procedimientos», con editor y sin tocar el original', await KE(() => { const u = JSON.parse(localStorage.getItem('as_scripts')); return u.length === 1 && u[0].origen.id === 'FR-MEC-01' && !!$('kTx') && SCRIPTS_BASE.find(s => s.id === 'FR-MEC-01').nombre === 'Integridad mecánica'; }));
    await k.evaluate(() => { $('kTx').value = $('kTx').value.replace('"pasos": [', '"pasos": [], "x": ['); }); await k.click('#kGu');
    check('editor: un script mal escrito no se guarda y dice por qué', /No se guarda: no tiene pasos/.test(await k.textContent('#kESt')), await k.textContent('#kESt'));
    await k.evaluate(() => { const o = JSON.parse(JSON.stringify(SCRIPTS_BASE[0])); o.nombre = 'Mi mecánica'; $('kTx').value = JSON.stringify(o); }); await k.click('#kGu');
    check('editor: guarda los cambios en la copia', await KE(() => JSON.parse(localStorage.getItem('as_scripts'))[0].nombre === 'Mi mecánica' && /Mi mecánica/.test($('kL').textContent)));
    const ck = await KE(() => { const o = { ick: 0, isy: 1, order: [1, 3, 4, 2], off: 0 }, r = {};
      for (const [k, q, f] of [['flojo', { flojo: 3 }, 'gasolina'], ['flojoD', { flojo: 3 }, 'diesel'], ['fuga', { flojo: 3, fuga: 3 }, 'gasolina'], ['bien', {}, 'gasolina'], ['flojo2', { flojo: 2 }, 'gasolina']]) {
        SK.fuel = f; const a = ckpAnaliza(ckpDemo(q), o); r[k] = { a, d: a.err ? [] : mdSkills(ckpMedidas(a), { cilindros: 4 }).H.map(h => h.regla + ':' + h.sintoma) }; } SK.fuel = 'gasolina'; return r; });
    check('CKP: detecta la rueda 60-2 (58 dientes, hueco de 2)', ck.flojo.a.N === 60 && ck.flojo.a.T === 58 && ck.flojo.a.m === 2, JSON.stringify([ck.flojo.a.err, ck.flojo.a.N, ck.flojo.a.T]));
    check('skill CKP: señala al responsable (cil. 3 flojo, cil. 2 flojo) y no a otro', /^FR-CKP-01:Cilindro 3:/.test(ck.flojo.d[0]) && /^FR-CKP-01:Cilindro 2:/.test(ck.flojo2.d[0]) && ck.flojo.d.filter(x => /^FR-CKP-01/.test(x)).length === 1, JSON.stringify([ck.flojo.d, ck.flojo2.d]));
    check('skill CKP: combustión (gasolina/diésel) frente a fuga de compresión', ck.flojo.d.some(x => /^FR-CKP-03:Cilindro 3/.test(x)) && ck.flojoD.d.some(x => /^FR-CKP-04:Cilindro 3.*inyección/.test(x)) && ck.fuga.d.some(x => /^FR-CKP-02:Cilindro 3.*fuga de compresión/.test(x)), JSON.stringify([ck.flojo.d, ck.flojoD.d, ck.fuga.d]));
    check('skill CKP: motor sano → ningún hallazgo', ck.bien.d.length === 0, JSON.stringify(ck.bien.d));
    check('el código no lleva umbrales de diagnóstico (CKP_UMBRAL, CAN_REF, ckpDiag, canDiag fuera)', await KE(() => typeof CKP_UMBRAL === 'undefined' && typeof CAN_REF === 'undefined' && typeof ckpDiag === 'undefined' && typeof canDiag === 'undefined'));
    await k.click('#kL .skI[data-k="FR-EQ-01"]'); await k.click('#kSteps .skS[data-s="1"]'); await k.click('#kDemo'); await k.click('#kCkGo'); await k.waitForTimeout(500);
    check('CKP en la app: señal de ejemplo → tabla por cilindro, gráfica y conclusión', await KE(() => /60-2/.test($('kPaso').textContent) && /\[Medido\] Cilindro 3: aporta/.test($('kPaso').textContent) && /Fran · Equilibrio de cilindros/.test($('kPaso').textContent) && document.querySelectorAll('.ckT tbody tr').length === 4));
    const cn = await KE(() => { const H = d => mdSkills(canMedidas(d)).H.map(h => h.regla + ':' + h.sintoma), a = canAnaliza(canDemo(), { ih: 0, il: 1 }), b = canAnaliza(canDemo({ bajo: false }), { ih: 0, il: 1 }), z = canDemo(); z.chs[1].y = z.chs[1].y.map(() => 0.02); const c = canAnaliza(z, { ih: 0, il: 1 });
      return { rate: a.rate, tramas: a.tramas, crc: a.crcMal, ids: a.U.map(u => canId(u)).sort().join(), da: H(a), db: H(b), dc: H(c) }; });
    check('CAN: 500 kbit/s, tramas decodificadas con CRC correcto y los 4 ID', cn.rate === 5e5 && cn.tramas > 50 && cn.crc === 0 && cn.ids === '0x0C9,0x1A0,0x2F1,0x3E0', JSON.stringify(cn));
    check('skill CAN: señala la unidad con el nivel bajo (0x2F1) y solo esa', cn.da.length && cn.da.every(x => /Unidad 0x2F1/.test(x)) && cn.da.some(x => /^FR-CAN-15/.test(x)), JSON.stringify(cn.da));
    check('skill CAN: red sana → ningún hallazgo; CAN-L a masa → lo dice', cn.db.length === 0 && cn.dc.some(x => /^FR-CAN-04:CAN-L a masa/.test(x)), JSON.stringify([cn.db, cn.dc]));
    await k.click('#kL .skI[data-k="FR-CAN-01"]'); await k.click('#kSteps .skS[data-s="1"]'); await k.click('#kDemo'); await k.click('#kCnGo'); await k.waitForTimeout(600);
    check('CAN en la app: señal de ejemplo → tabla por unidad y conclusión', await KE(() => /500 kbit\/s/.test($('kPaso').textContent) && /Unidad 0x2F1: su nivel se aparta/.test($('kPaso').textContent) && document.querySelectorAll('.ckT tr.canMal').length === 1 && document.querySelectorAll('.ckT tbody tr').length === 4));
    await k.click('#kL .skI[data-k="FR-ARR-01"]'); await k.waitForTimeout(100);
    check('procedimiento con skills que faltan: lo avisa (arranque-carga) sin bloquear', /necesita skills que no tienes activas: arranque-carga/.test(await k.textContent('#kCab')));
    await k.evaluate(() => rgSetActivo('fran-can', false)); await k.click('#kL .skI[data-k="FR-CAN-01"]'); await k.waitForTimeout(100);
    check('skill desactivada: ofrece activarla y al pulsar queda activa', /Activar «Fran · Red CAN/.test(await k.textContent('#kCab')) && await (async () => { await k.click('#kCab .skAct'); await k.waitForTimeout(100); return await KE(() => rgActivo({ paquete: 'fran-can' }) && !/necesita skills/.test($('kCab').textContent)); })());
    check('catálogo de medidas: cada medida que usan las skills existe en el motor', await KE(() => { const ids = new Set(MEDIDAS.map(m => m.id)); return REGLAS_BASE.filter(P => /^fran-/.test(P.paquete)).every(P => P.reglas.every(r => r.si.every(c => ids.has(c.medida)))); }));
    check('procedimientos: sin errores JS', ke.length === 0, ke.join(' | '));
    await k.close();
  }

  console.log(`\nRESULTADO: ${ok} correctas, ${bad} fallidas`);
  await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL GUION:', e.message.split('\n')[0]); process.exit(2); });
