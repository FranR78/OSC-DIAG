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
  check('ocho pestañas', (await p.$$eval('#tabs .tab', e => e.map(x => x.textContent))).join('|') === 'Osciloscopio|Diagrama de distribución|Compresión relativa|Diagnóstico|Unir y convertir CSV|GIF|Instrucciones|Objetivo');
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
  check('PMS en compresión (360° del de cruce): mismos valores, sin desfase de 360°', await E(() => { vv.ia = pms.t - ph.T * 15 / 720; const k = () => { const d = distCalc(); return ['aaa', 'rce', 'aae', 'rca', 'cruce'].map(q => d[q].toFixed(3)).join(','); }; const a = k(); pms.t += ph.T / 2; const b = k(); pms.t -= ph.T; const c = k(); pms.t += ph.T / 2; return a === b && a === c && distCalc().aaa.toFixed(1) === '15.0' || [a, b, c].join(' | '); }) === true, await E(() => [distCalc().aaa, distCalc().rce, distCalc().aae, distCalc().rca].map(v => v.toFixed(1)).join(',')));
  check('avance respecto a la regla PMS', await E(() => { adv.t = pms.t - ph.T * 12 / 720; return Math.abs(distCalc().adv - 12) < 1e-9; }));
  await click('#tabS');

  console.log('\n7 · Idioma (revisión de textos sin traducir en inglés)');
  await E(() => { for (const id of ['oPh', 'oCy', 'oAv', 'sOn']) { const c = document.getElementById(id); c.checked = true; c.dispatchEvent(new Event('change')); } });
  await click('#lEN'); await p.waitForTimeout(300);
  const left = [];
  const tabTxt = () => E(() => { let bt = document.body.innerText; [...document.querySelectorAll('#ex option')].slice(1).forEach(op => { bt = bt.split(op.textContent).join(''); }); const o = [bt]; document.querySelectorAll('[title],[placeholder]').forEach(e => { ['title', 'placeholder'].forEach(a => { const v = e.getAttribute(a); if (v) o.push(v); }); }); return o.join('\n'); });
  for (const t of ['#tabS', '#tabD', '#tabC', '#tabX', '#tabF', '#tabG', '#tabI', '#tabO']) { await click(t); await p.waitForTimeout(150); left.push(...spanish(await tabTxt())); }
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
  { const [dl] = await Promise.all([p.waitForEvent('download'), click('#bPdf')]);
    const buf = fs.readFileSync(await dl.path()); check('Informe PDF generado (%PDF)', buf.slice(0, 4).toString() === '%PDF', dl.suggestedFilename()); }

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
  check('libre: «Consultar» da el diagnóstico local (o dice que no hay uno programado)', await E(() => $('xRes').querySelectorAll('.dxh').length > 0 || /programado/.test($('xSt').textContent)));
  const dxl = await E(() => dxLocal({ contexto: { senales: [{ canal: 'CH1', entidad: 'transductor admisión' }] },
    medidas: [{ id: 'desv_pulso_cil', canal: 'CH1', por_cilindro: { 1: 2.1, 2: -1, 3: 0.5, 4: -14.2 } }] }));
  check('libre: comparación local → el 4 es el más débil, con ranking (mejor = 100 %) y aviso',
    dxl.hallazgos.length === 1 && dxl.hallazgos[0].evidencia[0].cilindro === 4 && dxl.hallazgos[0].evidencia[0].comparacion[3].pct_mejor === 100 && /peor/.test(dxl.aviso), JSON.stringify(dxl.hallazgos[0] && dxl.hallazgos[0].evidencia));
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

  console.log('\nErrores JS durante la sesión:', errs.length);
  errs.forEach(e => console.log('  !', e));
  check('sin errores JS', errs.length === 0);
  console.log('\n16 · Versión portal (google.script.run simulado, contrato v1)');
  {
    const pp = await ctx.newPage(); const perr = []; pp.on('pageerror', e => perr.push(String(e)));
    await pp.addInitScript(() => {
      const mk = (s, f) => ({ withSuccessHandler: x => mk(x, f), withFailureHandler: y => mk(s, y), apiDiagnostico: req => { (window.__reqs = window.__reqs || []).push(req); setTimeout(() => s(window.__resp(req)), 5); } });
      window.google = { script: { run: mk(null, null) } };
      window.__resp = req => req.op === 'diagnostico' ? { ok: true, v: 1, op: 'diagnostico', hallazgos: [{ regla: 'ADM-TRANS-R01', nt_id: 'ADM-TRANS-001', nt_titulo: 'Transductor en admisión', sintoma: 'Un pulso de depresión menor que el resto', confianza: 'media',
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
    const rq = await pp.evaluate(() => window.__reqs && window.__reqs[0]);
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
    check('portal: sin errores JS', perr.length === 0, perr.join(' | '));
    await pp.close();
  }

  console.log(`\nRESULTADO: ${ok} correctas, ${bad} fallidas`);
  await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL GUION:', e.message.split('\n')[0]); process.exit(2); });
