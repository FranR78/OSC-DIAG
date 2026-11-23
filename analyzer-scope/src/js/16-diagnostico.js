/* ---------- Diagnóstico: consulta al portal (contrato v1, docs/API_DIAGNOSTICO.md) ----------
   Versión libre: mide y prepara la consulta; «Consultar» avisa de que está en el portal.
   Versión portal (build --portal): apiDiagnostico(peticion) por google.script.run. */
let DXR=null;   // último diagnóstico (para el PDF)
const DX_ENT=[[/admisi[oó]n|colector/i,'transductor admisión'],[/escape/i,'transductor escape'],[/c[aá]rter/i,'transductor cárter'],[/cilindro|compresi[oó]n/i,'transductor cilindro'],
  [/inyector|inyecci[oó]n/i,'inyector'],[/cig[uü]e[nñ]al|ckp|r[uú]eda f[oó]nica/i,'sensor cigüeñal'],[/[aá]rbol|cmp|levas|fase/i,'sensor árbol de levas'],
  [/maf|caudal[ií]metro/i,'caudalímetro'],[/\bmap\b|presi[oó]n absoluta/i,'sensor MAP'],[/can[\s-]?(h|l|bus)?\b/i,'CAN'],[/bobina|encendido|secundario|primario/i,'encendido'],[/lambda|sonda/i,'sonda lambda']];
const dxEnt=c=>{const s=(c.p||'')+' '+(c.n||'')+' '+(c.m?c.m.k:'');for(const[r,e]of DX_ENT)if(r.test(s))return e;return''};
const MLB={rpm:'RPM',frecuencia:'Frecuencia',ciclo_util:'Ciclo útil',pico_pico:'Pico a pico',maximo:'Máx',minimo:'Mín',media:'Media',desv_pulso_cil:'Desviación del pulso por cilindro',desv_pico_cil:'Desviación del pico por cilindro',
  duracion_t1t2:'T1→T2',avance:'Avance',aaa:'AAA',rce:'RCE',aae:'AAE',rca:'RCA',cruce:'Cruce',can_dominante:'CAN dominante',can_recesivo:'CAN recesivo',can_fuera_pct:'CAN fuera de rango',comp_rel_pct:'Compresión relativa'};
const mlb=id=>MLB[id]?i18(MLB[id]):id;
const r4=v=>v==null||!isFinite(v)?null:+(+v).toPrecision(4);
/* medidas por cilindro: ventana de cada cilindro centrada en su PMS de compresión (+ desfase) y media de los ciclos de la vista */
function dxCyl(c,off){
  if(!(eng.on&&ph.T>0)||!c.x)return null;const N=eng.n,T=ph.T,sh=off/720*T,a0=view.t0,a1=view.t0+view.span;
  const ev=engEvents(a0-T,a1+T),acc={};
  for(const e of ev){const ta=e.t+sh-T/N/2,tb=e.t+sh+T/N/2;if(ta<a0||tb>a1||ta<c.x[0]||tb>c.x[c.x.length-1])continue;
    const i0=lb(c.x,ta),i1=Math.min(c.x.length,lb(c.x,tb));if(i1-i0<3)continue;let mn=Infinity,mx=-Infinity;
    for(let j=i0;j<i1;j++){const v=c.y[j];if(v<mn)mn=v;if(v>mx)mx=v}
    const q=acc[e.cyl]||(acc[e.cyl]={p:0,a:0,n:0});q.p+=mx;q.a+=mx-mn;q.n++}
  const ks=Object.keys(acc);if(ks.length<N)return null;
  const P={},A={};ks.forEach(k=>{P[k]=acc[k].p/acc[k].n;A[k]=acc[k].a/acc[k].n});
  // base común = amplitud media del pulso (siempre > 0): evita porcentajes absurdos si la media de los picos está cerca de 0
  const mean=o=>ks.reduce((s,k)=>s+o[k],0)/ks.length,mA=mean(A),dv=o=>{const m=mean(o),r={};ks.forEach(k=>r[k]=mA>0?r4((o[k]-m)/mA*100):0);return r};
  return{pico:dv(P),pulso:dv(A),ciclos:Math.min(...ks.map(k=>acc[k].n))};
}
function dxStats(c){const a=lb(c.x,view.t0),b=Math.min(c.x.length,lb(c.x,view.t0+view.span));if(b-a<2)return null;
  let mn=Infinity,mx=-Infinity,s=0;for(let i=a;i<b;i++){const v=c.y[i];if(v<mn)mn=v;if(v>mx)mx=v;s+=v}return{mn,mx,me:s/(b-a)}}
function dxPeticion(){
  const off=+$('xO').value||0,senales=[],medidas=[],cil=[];
  CH.forEach((c,i)=>{if(!c.x||!c.on)return;const cn='CH'+(i+1),en=dxEnt(c);
    senales.push(Object.assign({canal:cn,parametro:c.p||c.n,entidad:en,unidad:c.u},eng.sync&&eng.sync.ch===i?{referencia_cil1:true}:{}));
    const s=dxStats(c);if(s)medidas.push({id:'pico_pico',canal:cn,valor:r4(s.mx-s.mn),unidad:c.u},{id:'maximo',canal:cn,valor:r4(s.mx),unidad:c.u},{id:'minimo',canal:cn,valor:r4(s.mn),unidad:c.u},{id:'media',canal:cn,valor:r4(s.me),unidad:c.u});
    if(c.m&&c.ms)[['can_dominante',c.ms.dom,'V'],['can_recesivo',c.ms.rec,'V'],['can_fuera_pct',c.ms.fuera,'%']].forEach(([id,v,u])=>v!=null&&medidas.push({id,canal:cn,valor:r4(v),unidad:u}));
    if(c.m&&c.m.k==='rpm'){const s2=dxStats(c);if(s2)medidas.push({id:'rpm',canal:cn,valor:r4(s2.me),unidad:'rpm'})}
    const q=dxCyl(c,off);if(q){medidas.push({id:'desv_pico_cil',canal:cn,unidad:'%',por_cilindro:q.pico},{id:'desv_pulso_cil',canal:cn,unidad:'%',por_cilindro:q.pulso});cil.push(cn+': '+q.ciclos)}});
  if(ph.T>0&&!ph.auto&&!medidas.some(m=>m.id==='rpm'))medidas.push({id:'rpm',valor:r4(120/ph.T),unidad:'rpm'});
  if(typeof crRes!=='undefined'&&crRes&&crRes.R)medidas.push({id:'comp_rel_pct',unidad:'%',por_cilindro:Object.fromEntries(crRes.R.map(q=>[q.cyl,r4(q.pc)]))});
  if(tr.on&&cur.a!=null&&cur.b!=null)medidas.push({id:'duracion_t1t2',valor:r4(Math.abs(cur.b-cur.a)*1000),unidad:'ms'});
  const d=distCalc();if(d){if(adv.on&&d.advs)d.advs.forEach(a=>medidas.push(Object.assign({id:'avance',valor:r4(a.deg),unidad:'°',k:a.k},a.k==='iny'?{inyeccion:a.i}:{})));
    if(vv.on&&d.ok)['aaa','rce','aae','rca','cruce'].forEach(k=>medidas.push({id:k,valor:r4(d[k]),unidad:'°'}))}
  const motor={combustible:$('xF').value,cilindros:eng.n,orden:eng.order.slice()};const cod=$('xC').value.trim();if(cod)motor.codigo=cod;
  const p={v:1,op:'diagnostico',lang:LANG,cliente:{app:'analyzer-scope',ver:APP_CFG.ver},contexto:{motor,senales},medidas,limite:5};
  const sy=$('xS').value.trim();if(sy)p.sintoma_texto=sy;p._cil=cil;return p;
}
/* ---------- Diagnóstico programado (local, también sin portal) ----------
   Transductor de pulso = COMPARACIÓN: no hay mV ni % de «motor bueno/malo». Se dice qué cilindro está peor
   (el mejor = 100 %) y se pasa a pruebas de confirmación. Si todos fallan igual, la comparación no lo ve. */
function dxRank(pc){const ks=Object.keys(pc||{}).filter(k=>isFinite(pc[k]));if(ks.length<2)return null;
  const o=ks.map(k=>({cilindro:+k,valor:+pc[k]})).sort((a,b)=>a.valor-b.valor),mejor=100+o[o.length-1].valor;
  o.forEach(x=>{if(mejor>0)x.pct_mejor=Math.round((100+x.valor)/mejor*1000)/10});return o}
/* dxLocal (diagnóstico con los paquetes de reglas activos): js/25-reglas.js */
/* transporte: dentro del portal google.script.run; fuera, GET al puente si está configurado */
function dxCall(req){return new Promise((ok,ko)=>{
  const g=window.google&&google.script&&google.script.run;
  if(g){g.withSuccessHandler(ok).withFailureHandler(e=>ko({codigo:'interno',mensaje:String(e&&e.message||e)})).apiDiagnostico(req);return}
  if(APP_CFG.apiUrl){let tk='';try{tk=localStorage.getItem('as_token')||''}catch(e){}
    fetch(APP_CFG.apiUrl+(APP_CFG.apiUrl.includes('?')?'&':'?')+'api=diagnostico&q='+encodeURIComponent(JSON.stringify(req))+(tk?'&token='+encodeURIComponent(tk):''))
      .then(r=>r.json()).then(ok,()=>ko({codigo:'sin_conexion',mensaje:'No se pudo conectar con el portal.'}));return}
  ko({codigo:'sin_portal',mensaje:'La consulta de notas técnicas está disponible en la versión del portal (con tu cuenta).'})})}
/* pintado seguro: el contenido del portal va como texto (sin HTML y sin pasar por el traductor de la interfaz) */
const T=(tag,txt,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.appendChild(document.createTextNode(String(txt)));return e};
const lnk=(u,txt)=>{const a=T('a',txt);if(/^https:\/\//.test(u||'')){a.href=u;a.target='_blank';a.rel='noopener'}return a};
function mdRender(md){const box=T('div',null,'doc');let ul=null;
  String(md||'').split(/\r?\n/).forEach(l=>{const h=/^(#{1,4})\s+(.*)/.exec(l),li=/^\s*[-*]\s+(.*)/.exec(l);
    if(li){if(!ul){ul=T('ul');box.appendChild(ul)}ul.appendChild(T('li',li[1].replace(/\*\*/g,'')));return}ul=null;
    if(h)box.appendChild(T(h[1].length<3?'h3':'h4',h[2].replace(/\*\*/g,'')));else if(l.trim())box.appendChild(T('p',l.replace(/\*\*/g,'')))});return box}
function dxErr(e){$('xSt').textContent=(e&&e.mensaje)||'Error'}
function dxMedidas(){const p=dxPeticion(),el=$('xMed');el.innerHTML='';
  if(!p.medidas.length){el.appendChild(T('p',i18('Carga una señal (y activa «Cilindros» para las medidas por cilindro).'),'hint'));return p}
  p.medidas.forEach(m=>{const r=T('div',null,'s');r.appendChild(T('span',mlb(m.id)+(m.canal?' · '+m.canal:'')));
    r.appendChild(T('span',m.por_cilindro?Object.entries(m.por_cilindro).map(([k,v])=>k+': '+(v>0?'+':'')+v+' %').join('  '):m.valor+' '+(m.unidad||'')));el.appendChild(r)});
  el.appendChild(T('p',(p._cil.length?i18('Ciclos promediados')+' · '+p._cil.join(' · ')+'. ':'')+i18('Todas son medidas (Medido). El cilindro sale de la identificación de cilindros de la app.'),'hint'));
  const sg=$('xSig');sg.innerHTML='';p.contexto.senales.forEach(s=>sg.appendChild(T('div',s.canal+' · '+s.parametro+(s.entidad?' → '+s.entidad:' → '+i18('(sin entidad: escribe el «Parámetro medido» del canal)')),'hint')));
  return p}
function dxShow(res){
  const box=$('xRes');box.innerHTML='';DXR=res;
  if(!res||!res.ok)return dxErr(res&&res.error);
  if(res.op==='buscar'){$('xSt').textContent=res.total+' nota(s) técnica(s)';
    (res.resultados||[]).forEach(r=>{const d=T('div',null,'cy');const b=T('b',r.titulo);d.appendChild(b);d.appendChild(T('div',r.resumen||'','hint'));
      const row=T('div',null,'row');const v=T('button',i18('Ver'));v.onclick=()=>dxNt(r.id);row.appendChild(v);if(r.url_portal)row.appendChild(lnk(r.url_portal,i18('Abrir en el portal')));d.appendChild(row);box.appendChild(d)});return}
  if(res.op==='nt'){const n=res.nt;$('xSt').textContent='';box.appendChild(T('h3',n.titulo));box.appendChild(mdRender(n.cuerpo||n.resumen));
    (n.valores_referencia||[]).forEach(v=>box.appendChild(T('div',v.magnitud+': '+(v.valor!=null?v.valor:(v.min+'–'+v.max))+' '+(v.unidad||'')+(v.condicion?' ('+v.condicion+')':'')+' · '+v.etiqueta+(v.fuente?' · '+v.fuente+(v.pagina?', pág. '+v.pagina:''):''),'s')));
    (n.videos||[]).forEach(v=>box.appendChild(lnk(v.url,'▶ '+v.titulo)));if(n.url_portal)box.appendChild(lnk(n.url_portal,i18('Abrir en el portal')));return}
  const H=res.hallazgos||[];$('xSt').textContent=H.length?H.length+' hallazgo(s)'+(res.perfil?' · '+i18('fuentes')+': '+res.perfil.join(' + '):''):(res.sin_reglas?'Esta señal aún no tiene reglas en el portal: mira las notas relacionadas.':'Ninguna regla se cumple con estas medidas.');
  H.forEach((h,hi)=>{const d=T('div',null,'cy dxh');d.appendChild(T('b',h.sintoma+' · '+i18('confianza')+' '+h.confianza));
    if(h.paquete_nombre)d.appendChild(T('div',i18('Fuente')+': '+h.paquete_nombre+(h.fuente&&h.fuente!==h.paquete_nombre?' · '+h.fuente:'')+' · '+h.regla+(h.estado==='borrador'?' · '+i18('BORRADOR'):''),'hint'));
    if(h.criterios){const k=T('div',null,'dxk'+(h.discrepancia?' dsc':''));k.appendChild(T('b',i18(h.discrepancia?'⚠ Discrepancia entre fuentes':'Criterios de las fuentes activas')));
      h.criterios.forEach(c=>k.appendChild(T('div',(c.cumple?'✓ ':'✗ ')+c.paquete+': '+c.condicion+(c.fuente&&c.fuente!==c.paquete?' ('+c.fuente+')':''),'s')));d.appendChild(k)}
    (h.evidencia||[]).forEach(e=>d.appendChild(T('div',mlb(e.medida)+(e.canal?' · '+e.canal:'')+(e.cilindro!=null?(typeof MEDIDAS!=='undefined'&&(MEDIDAS.find(m=>m.id===e.medida)||{}).por==='unidad'?' · '+i18('unidad')+' 0x'+Number(e.cilindro).toString(16).toUpperCase().padStart(3,'0'):' · '+i18('cilindro')+' '+e.cilindro):'')+': '+e.valor+' ('+e.condicion+') · '+(e.etiqueta||'Medido'),'s')));
    (h.evidencia||[]).forEach(e=>{if(e.comparacion)d.appendChild(T('div',i18('Comparación (mejor = 100 %)')+': '+e.comparacion.map(x=>x.cilindro+': '+(x.pct_mejor!=null?x.pct_mejor+' %':x.valor)).join(' · '),'s'))});
    if(h.causas&&h.causas.length){d.appendChild(T('h4',i18('Posibles causas')));h.causas.forEach(c=>d.appendChild(T('div','• '+c.texto+' ('+c.etiqueta+')'+(c.como_separar?' — '+c.como_separar:''),'hint')))}
    if(h.comprobaciones&&h.comprobaciones.length){d.appendChild(T('h4',i18('Comprobaciones')));
      h.comprobaciones.forEach((c,ci)=>{const l=T('label',null,'dxc'),cb=document.createElement('input');cb.type='checkbox';cb.checked=!!c._ok;cb.onchange=()=>{c._ok=cb.checked};
        l.appendChild(cb);l.appendChild(document.createTextNode(' '+c.orden+'. '+c.texto+(c.esperado?' → '+c.esperado:'')));d.appendChild(l)})}
    (h.notas_paquete||[]).forEach(n=>{const b=T('button','📖 '+n.titulo,'nu');b.onclick=()=>rgNotaVer(n,h.paquete_nombre);d.appendChild(b)});
    if(h.url_portal)d.appendChild(lnk(h.url_portal,i18('Nota técnica')+': '+(h.nt_titulo||h.nt_id)));box.appendChild(d)});
  if(res.relacionadas&&res.relacionadas.length){box.appendChild(T('h4',i18('Notas relacionadas')));res.relacionadas.forEach(r=>{const d=T('div');d.appendChild(lnk(r.url_portal,r.titulo));box.appendChild(d)})}
  if(res.aviso)box.appendChild(T('p','⚠ '+res.aviso,'hint'));
}
/* nota de un paquete (skill): texto, valores de referencia y fuente, como una NT */
function rgNotaVer(n,pq){const box=$('xRes'),prev=[...box.childNodes];box.innerHTML='';const back=T('button',i18('← Volver al diagnóstico'));back.onclick=()=>{box.innerHTML='';prev.forEach(x=>box.appendChild(x))};
  box.appendChild(back);box.appendChild(T('h3',n.titulo));box.appendChild(T('div',i18('Fuente')+': '+(pq||'')+(n.fuente?' · '+n.fuente:''),'hint'));box.appendChild(mdRender(n.texto||''));
  (n.valores||[]).forEach(v=>box.appendChild(T('div',v.magnitud+': '+(v.valor!=null?v.valor:(v.min+'–'+v.max))+' '+(v.unidad||'')+(v.condicion?' ('+v.condicion+')':'')+(v.etiqueta?' · '+v.etiqueta:''),'s')))}
const dxBusy=m=>{$('xSt').textContent=m;$('xRes').innerHTML=''};
function dxGo(){const p=dxMedidas();delete p._cil;if(!p.medidas.length)return;const loc=dxLocal(p);
  if(APP_CFG.modo!=='portal'&&!APP_CFG.apiUrl){dxShow(loc);if(!loc.hallazgos.length)$('xSt').textContent=i18('Ninguna regla de las fuentes activas se cumple con estas señales (o falta activar «Cilindros» o la compresión relativa).');return}
  if(!rgConPortal()||!rgActivo(RG_NT)){dxShow(loc);return}
  dxBusy('Consultando…');
  // Notas maestras del portal + paquetes activos de la app: se juntan y se comparan por tema.
  dxCall(p).then(r=>{if(r&&r.error&&r.error.codigo==='sin_notas')return dxShow(loc);if(!r||!r.ok)return dxShow(r);const m=dxLocal(p,{H:r.hallazgos,crit:r.criterios_nt});
    m.relacionadas=r.relacionadas||[];m.sin_reglas=!m.hallazgos.length&&r.sin_reglas;m.aviso=[...new Set([r.aviso,loc.aviso].filter(Boolean))].join(' ');dxShow(m)},e=>{dxShow(loc);dxErr(e)})}
function dxBuscar(){const t=$('xQ').value.trim();if(!t)return;dxBusy('Buscando…');dxCall({v:1,op:'buscar',lang:LANG,cliente:{app:'analyzer-scope',ver:APP_CFG.ver},texto:t,filtros:{solo_osciloscopio:true},limite:10}).then(dxShow,dxErr)}
function dxNt(id){dxBusy('Cargando…');dxCall({v:1,op:'nt',lang:LANG,cliente:{app:'analyzer-scope',ver:APP_CFG.ver},id,formato:'md'}).then(dxShow,dxErr)}
function dxTab(){dxMedidas();if(APP_CFG.modo!=='portal'&&!APP_CFG.apiUrl&&!DXR){$('xSt').textContent=i18('Versión libre: aquí se compara cilindro a cilindro; cómo comprobarlo, valores y notas técnicas, en el portal.');if(APP_CFG.portalUrl){$('xRes').innerHTML='';$('xRes').appendChild(lnk(APP_CFG.portalUrl,i18('Abrir en el portal')))}}}
$('xGo').onclick=dxGo;$('xBu').onclick=dxBuscar;$('xQ').onkeydown=e=>{if(e.key==='Enter')dxBuscar()};$('xO').onchange=dxMedidas;$('tabX').onclick=()=>showTab('X');
if(APP_CFG.modo==='portal')document.body.classList.add('portal');
