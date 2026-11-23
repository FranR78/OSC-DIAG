/* ---------- Catálogo central de skills y procedimientos (docs/CATALOGO.md) ----------
   La app no trae este conocimiento activo: se INSTALA. Origen del catálogo:
   · versión con servidor (portal / Servidor Scope): op «catalogo_lista» / «catalogo_bajar» (incluye lo VIP según permisos);
   · sin servidor: la copia de lo «libre» que va dentro de la app al construir (CATALOGO).
   Lo instalado queda en este navegador y funciona sin conexión: skills en «as_subs» (como los paquetes compartidos), procedimientos en «as_procs». */
let CAT_IDX=(typeof CATALOGO==='object'&&CATALOGO.indice)||[],CAT_SRV=false;
const catProcs=()=>{try{const a=JSON.parse(LS.get('as_procs')||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
const catInst=it=>it.tipo==='skill'?rgSubs().find(p=>p.paquete===it.id):catProcs().find(s=>s.id===it.id);
const catEstado=it=>{const y=catInst(it);return!y?'no':String(y.version||'')!==String(it.version||'')?'nueva':'ok'};
const catDeTema=t=>CAT_IDX.find(it=>it.tipo==='skill'&&(it.temas||[]).includes(t));
function catGuarda(it,o){
  if(it.tipo==='skill'){const E=rgValida(o);if(E.length)throw new Error(E[0]);o.version=o.version||it.version;LS.set('as_subs',JSON.stringify(rgSubs().filter(p=>p.paquete!==it.id).concat([o])))}
  else{const e=skValida(o);if(e)throw new Error(e);o.version=o.version||it.version;LS.set('as_procs',JSON.stringify(catProcs().filter(s=>s.id!==it.id).concat([o])))}
  if(typeof rgPanel==='function')rgPanel()}
function catQuita(it){if(it.tipo==='skill')LS.set('as_subs',JSON.stringify(rgSubs().filter(p=>p.paquete!==it.id)));else LS.set('as_procs',JSON.stringify(catProcs().filter(s=>s.id!==it.id)));if(typeof rgPanel==='function')rgPanel()}
/* instala (o actualiza): de la copia interna si es libre y no hay servidor; si no, del servidor */
function catInstala(it){
  const loc=typeof CATALOGO==='object'&&CATALOGO.items&&CATALOGO.items[it.tipo+':'+it.id];
  const fin=o=>{try{catGuarda(it,JSON.parse(JSON.stringify(o)));st(i18('Instalado')+': '+it.nombre)}catch(e){st(i18('No se pudo instalar')+': '+e.message);$('st').classList.add('err')}if(curTab==='K')skTab()};
  if(!CAT_SRV&&loc)return Promise.resolve(fin(loc));
  if(!CAT_SRV)return Promise.resolve(st(i18('Este elemento solo se sirve desde el servidor (acceso VIP).')));
  return dxCall({v:1,op:'catalogo_bajar',cliente:{app:'analyzer-scope',ver:APP_CFG.ver},tipo:it.tipo,id:it.id}).then(r=>{
    if(!r||!r.ok){if(loc)return fin(loc);return st((r&&r.error&&r.error.mensaje)||'Error')}fin(r.item)},()=>{if(loc)fin(loc)})}
/* con servidor: su catálogo (lo VIP según permisos) sustituye a la copia interna */
function catCargar(){if(APP_CFG.modo!=='portal')return;
  dxCall({v:1,op:'catalogo_lista',cliente:{app:'analyzer-scope',ver:APP_CFG.ver}}).then(r=>{if(r&&r.ok&&Array.isArray(r.indice)){CAT_IDX=r.indice;CAT_SRV=true;if(curTab==='K')skTab()}},()=>{})}
/* bloque «Catálogo» del panel de Procedimientos */
function catHTML(){
  if(!CAT_IDX.length)return '<b class="skH">Catálogo</b><p class="hint">El catálogo está vacío.</p>';
  const fila=it=>{const e=catEstado(it);
    return '<div class="catI"><div><b>'+skE(it.nombre)+'</b>'+(it.acceso==='vip'?' <span class="skB">VIP</span>':'')+'<small>'+(it.tipo==='skill'?i18('Skill')+' · '+it.reglas+' '+i18('reglas'):i18('Procedimiento')+' · '+it.pasos+' '+i18('pruebas'))+(it.version?' · v'+skE(it.version):'')+'</small></div>'+
      '<div class="row">'+(e==='no'?'<button class="p catB" data-a="i" data-t="'+it.tipo+'" data-i="'+esc(it.id)+'">Instalar</button>':
        (e==='nueva'?'<button class="p catB" data-a="i" data-t="'+it.tipo+'" data-i="'+esc(it.id)+'">Actualizar</button>':'<span class="hint">✓ Instalado</span>')+'<button class="catB" data-a="q" data-t="'+it.tipo+'" data-i="'+esc(it.id)+'">Quitar</button>')+'</div></div>'};
  return '<b class="skH">Catálogo</b><p class="hint">'+(CAT_SRV?'Del servidor: lo verificado y lo que tienes asignado.':'Copia incluida en la app. Lo VIP solo se sirve desde el servidor.')+'</p>'+CAT_IDX.map(fila).join('')}
function catWire(){document.querySelectorAll('.catB').forEach(b=>b.onclick=()=>{const it=CAT_IDX.find(x=>x.tipo===b.dataset.t&&x.id===b.dataset.i);if(!it)return;
  if(b.dataset.a==='q'){catQuita(it);st(i18('Quitado')+': '+it.nombre);skTab()}else catInstala(it)})}
catCargar();
