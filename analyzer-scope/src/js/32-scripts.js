/* ---------- Scripts de captura: pruebas guiadas paso a paso (docs/SCRIPTS.md) ----------
   Originales: SCRIPTS_BASE (src/scripts/*.json, solo lectura). Del usuario: localStorage «as_scripts» (duplicar, editar, importar, exportar).
   Cada paso: qué medir, cómo, maniobra en orden, comprobación de la configuración de PicoScope y carga del CSV. */
const SK_TB=[[.001,'1 ms'],[.002,'2 ms'],[.005,'5 ms'],[.01,'10 ms'],[.02,'20 ms'],[.05,'50 ms'],[.1,'100 ms'],[.2,'200 ms'],[.5,'500 ms'],[1,'1 s'],[2,'2 s'],[5,'5 s'],[10,'10 s']];
const SK_MS=[[1e5,'100 kS'],[2e5,'200 kS'],[5e5,'500 kS'],[1e6,'1 MS'],[2e6,'2 MS'],[5e6,'5 MS'],[1e7,'10 MS'],[2e7,'20 MS'],[5e7,'50 MS']];
const SK_FC={reposo:'#7d8da1',contacto:'#c99a00',arrastre:'#3d8bff',ralenti:'#8a9bb0',suave:'#1fa98f',brusca:'#ff8a00',parada:'#9b5cff',corte:'#d0479a'};
const SK_CH={A:0,B:1,C:2,D:3,E:4,F:5,G:6,H:7};
const SK={sel:null,step:0,cfg:{},csv:{},edit:false,del:false};
const skUser=()=>{let a=null;try{a=JSON.parse(LS.get('as_scripts')||'null')}catch(e){}return Array.isArray(a)?a:[]};
const skSave=a=>LS.set('as_scripts',JSON.stringify(a));
const skAll=()=>[...SCRIPTS_BASE.map(s=>Object.assign({},s,{_o:true})),...skUser()];
const skCur=()=>{const A=skAll();return A.find(s=>s.id===SK.sel)||A[0]};
const skDur=p=>p.maniobra.reduce((a,f)=>a+(+f.s||0),0);
const skT=s=>s===0?'0 s':s>=1?(+(+s).toFixed(1)).toLocaleString('es')+' s':s*1e3>=1?(+(s*1e3).toFixed(1)).toLocaleString('es')+' ms':Math.round(s*1e6)+' µs';
const skF=f=>f>=1e6?(+(f/1e6).toFixed(2)).toLocaleString('es')+' MS/s':(+(f/1e3).toFixed(1)).toLocaleString('es')+' kS/s';
const skTbN=v=>(SK_TB.find(x=>x[0]===v)||[0,v+' s'])[1];
const skE=x=>'<span class="skD">'+esc(x)+'</span>';  // texto que viene del script (datos, no interfaz)
const skMsN=v=>(SK_MS.find(x=>x[0]===v)||[0,v])[1];
/* Validación del formato (originales e importados) */
function skValida(s){
  if(!s||typeof s!=='object')return'no es un objeto JSON';
  if(s.formato!=='analyzer-scope-script/1')return'falta «formato»: "analyzer-scope-script/1"';
  if(!s.id||!s.nombre)return'faltan «id» o «nombre»';
  if(!Array.isArray(s.pasos)||!s.pasos.length)return'no tiene pasos';
  for(const[i,p]of s.pasos.entries()){const n='paso '+(i+1)+': ';
    if(!p.titulo)return n+'falta «titulo»';
    if(!Array.isArray(p.canales)||!p.canales.length)return n+'no tiene canales';
    if(p.canales.some(c=>!(c.canal in SK_CH)||!c.senal))return n+'cada canal necesita «canal» (A…H) y «senal»';
    if(!Array.isArray(p.maniobra)||!p.maniobra.length||p.maniobra.some(f=>!f.fase||!(+f.s>0)||!Array.isArray(f.rpm)))return n+'cada fase de la maniobra necesita «fase», «s» (segundos) y «rpm» [inicio, fin]';
    const r=p.requisitos||{};if(!(+r.fs_min>0))return n+'falta «requisitos.fs_min» (muestras por segundo)'}
  return'';
}
/* Recomendación: la base de tiempos más corta que deja ver la maniobra entera (+10 %) y las muestras justas para el muestreo mínimo */
function skRec(p){const need=skDur(p)*1.1,tb=SK_TB.find(x=>x[0]*10>=need)||SK_TB[SK_TB.length-1],w=tb[0]*10,
  ms=SK_MS.find(x=>x[0]/w>=p.requisitos.fs_min)||SK_MS[SK_MS.length-1];return{tb:tb[0],ms:ms[0]}}
/* Comprobación de la configuración de PicoScope frente a lo que pide el paso */
function skChecks(p,c){
  const win=c.tb*10,fs=c.ms/win,tot=skDur(p),r=p.requisitos,o=[],rec=skRec(p);
  const fi=p.maniobra.find(f=>(f.tipo==='ralenti'||f.tipo==='arrastre')&&f.rpm[0]>0),cyc=fi?120/fi.rpm[0]:0;
  if(win>=tot)o.push(['ok','Tiempo','La pantalla dura '+skT(win)+' y la maniobra '+skT(tot)+': cabe entera en una sola captura.']);
  else if(cyc&&win>=cyc*2)o.push(['bad','Tiempo','Con '+skTbN(c.tb)+'/div la pantalla dura '+skT(win)+': se ven unos '+Math.floor(win/cyc)+' ciclos, pero no el proceso completo ('+skT(tot)+'). PicoScope guarda varias pantallas y sustituye las primeras. Sube a '+skTbN(rec.tb)+'/div.']);
  else o.push(['bad','Tiempo','Con '+skTbN(c.tb)+'/div la pantalla dura '+skT(win)+(cyc?': ni un ciclo completo a '+fi.rpm[0]+' RPM ('+skT(cyc)+').':'.')+' Sirve para ver la forma de la señal, no para grabar el script. Sube a '+skTbN(rec.tb)+'/div.']);
  if(fs>=r.fs_min)o.push(['ok','Muestreo',skF(fs)+' (mínimo '+skF(r.fs_min)+').']);
  else o.push(['bad','Muestreo',skF(fs)+' es poco: el paso necesita '+skF(r.fs_min)+'. Sube las muestras a '+skMsN(rec.ms)+'.']);
  if(r.criterio==='grados'&&r.rpm_max){const g=6*r.rpm_max/fs;o.push([g<=1?'ok':g<=3?'warn':'bad','Resolución',(+g.toPrecision(2)).toLocaleString('es')+'° de cigüeñal por muestra a '+r.rpm_max+' RPM'+(g<=1?'.':': se pierden detalles de las válvulas (objetivo ≤ 1°).')])}
  if(r.criterio==='diente'&&r.rpm_max){const k=fs/(r.rpm_max/60*60);o.push([k>=50?'ok':k>=20?'warn':'bad','Resolución',Math.round(k)+' muestras por diente (rueda 60-2) a '+r.rpm_max+' RPM'+(k>=50?'.':': poca precisión para la aceleración de cada cilindro (objetivo ≥ 50).')])}
  const mb=c.ms*(12+11*p.canales.length)/1e6;
  o.push([mb<150?'ok':mb<400?'warn':'bad','Tamaño del CSV','≈ '+Math.round(mb)+' MB con '+p.canales.length+' canales'+(mb<150?'.':mb<400?': la app tardará en abrirlo.':': demasiado grande, baja las muestras.')]);
  return{win,fs,o};
}
/* Perfil de RPM de la maniobra y tramo que cabe en una pantalla */
function skPerfil(p,win){
  const W=640,H=190,L=42,R=10,T=26,B=40,tot=skDur(p),xm=Math.max(tot,Math.min(win,tot*1.5)),rmax=Math.max(1,...p.maniobra.map(f=>Math.max(+f.rpm[0]||0,+f.rpm[1]||0)))*1.15;
  const X=t=>L+(W-L-R)*Math.min(t,xm)/xm,Y=r=>T+(H-T-B)*(1-r/rmax);
  let s='<svg class="skP" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Perfil de RPM">';
  const st=rmax>3000?1000:500;for(let r=0;r<=rmax;r+=st)s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(r)+'" y2="'+Y(r)+'" stroke="var(--bd)"/><text x="'+(L-6)+'" y="'+(Y(r)+4)+'" text-anchor="end" font-size="10" fill="var(--mu)">'+r+'</text>';
  let t=0;p.maniobra.forEach(f=>{s+='<rect x="'+X(t)+'" y="'+(H-B+6)+'" width="'+Math.max(1,X(t+ +f.s)-X(t)-1)+'" height="8" rx="2" fill="'+(SK_FC[f.tipo]||'#8a9bb0')+'"/>';t+=+f.s});
  s+='<rect x="'+X(0)+'" y="'+T+'" width="'+Math.max(1,X(win)-X(0))+'" height="'+(H-T-B)+'" fill="rgba(61,139,255,.13)" stroke="var(--ac)" stroke-dasharray="4 3"/>';
  let d='';t=0;p.maniobra.forEach(f=>{d+=(d?' L':'M')+X(t).toFixed(1)+' '+Y(+f.rpm[0]).toFixed(1)+' L'+X(t+ +f.s).toFixed(1)+' '+Y(+f.rpm[1]).toFixed(1);t+=+f.s});
  s+='<path d="'+d+'" fill="none" stroke="var(--tx)" stroke-width="2" stroke-linejoin="round"/>';
  const lb=win<tot?'Una pantalla: '+skT(win)+' de '+skT(tot):'Una pantalla: '+skT(win)+' (cabe todo)',xl=X(win);
  s+='<text x="'+(xl>W-180?Math.max(L+4,xl-4):xl+4)+'" y="'+(T-7)+'" font-size="11" fill="var(--ac)" text-anchor="'+(xl>W-180?'end':'start')+'">'+lb+'</text>';
  [[0,'start'],[tot,'end']].forEach(([v,a])=>s+='<text x="'+X(v)+'" y="'+(H-6)+'" font-size="10" fill="var(--mu)" text-anchor="'+a+'">'+skT(v)+'</text>');
  s+='<text x="4" y="11" font-size="10" fill="var(--mu)">RPM</text></svg>';
  return s+'<div class="skLg">'+p.maniobra.map((f,i)=>'<span><i style="background:'+(SK_FC[f.tipo]||'#8a9bb0')+'"></i>'+(i+1)+'. '+skE(f.fase)+' · '+skT(+f.s)+'</span>').join('')+'</div>';
}
/* ---- pintado ---- */
function skTab(){
  const S=skCur();if(!S)return;SK.sel=S.id;const U=skUser();
  const it=s=>'<button class="skI'+(s.id===S.id?' on':'')+'" data-k="'+esc(s.id)+'"><b>'+skE(s.nombre)+'</b><small>'+skE(s.autor||'')+(s.autor?' · ':'')+s.pasos.length+(s.pasos.length>1?' capturas':' captura')+(s._o?' · original':'')+'</small></button>';
  $('kL').innerHTML='<b class="skH">Originales</b>'+SCRIPTS_BASE.map(s=>it(Object.assign({},s,{_o:true}))).join('')+
    '<b class="skH">Mis scripts</b>'+(U.length?U.map(it).join(''):'<p class="hint">Duplica un original para hacer el tuyo.</p>')+
    '<div class="row"><button id="kImpB">Importar script (.json)…</button></div>';
  const ori=S._o?null:SCRIPTS_BASE.find(b=>S.origen&&b.id===S.origen.id),nuevo=ori&&S.origen.version&&ori.version!==S.origen.version;
  $('kCab').innerHTML='<div class="skCab"><div class="skTt"><h2>'+skE(S.nombre)+(S.estado==='borrador'?' <span class="skB">BORRADOR</span>':'')+'</h2><p class="hint">'+skE(S.descripcion||'')+'</p>'+
    (S.origen?'<p class="hint">Copia de «'+skE(S.origen.nombre||S.origen.id)+'»'+(nuevo?' · <b>hay una versión nueva del original</b> ('+skE(ori.version)+')':'')+'</p>':'')+'</div><div class="row">'+
    (S._o?'<span class="hint">Original de '+skE(S.autor||'')+': solo lectura</span><button class="p" id="kDup">Duplicar y editar</button>':
      '<button id="kEd">Editar</button><button id="kDup">Duplicar</button><button id="kExp">Exportar (.json)</button><button id="kDel">'+(SK.del?'¿Borrar? Pulsa otra vez':'Borrar')+'</button>')+'</div></div>';
  const n=S.pasos.length,ok=k=>SK.csv[S.id+'|'+k];
  $('kSteps').innerHTML='<button class="skS'+(SK.step===0?' on':'')+'" data-s="0"><i>0</i>Configurar PicoScope</button>'+
    S.pasos.map((p,k)=>'<button class="skS'+(SK.step===k+1?' on':'')+(ok(k+1)?(ok(k+1).bad?' wa':' ok'):'')+'" data-s="'+(k+1)+'"><i>'+(ok(k+1)?(ok(k+1).bad?'!':'✓'):k+1)+'</i>'+skE(p.titulo)+'</button>').join('')+
    '<button class="skS'+(SK.step===n+1?' on':'')+'" data-s="'+(n+1)+'"><i>★</i>Resumen</button>';
  $('kPaso').innerHTML=SK.edit?skEditor(S):skPaso(S,SK.step);
  skWire(S);
}
function skPaso(S,i){
  const n=S.pasos.length;
  if(i===0)return '<div class="skC"><b class="skH">Antes de empezar</b><p class="hint">Autoscope graba sin límite hasta llenar el disco. PicoScope guarda pantallas en un búfer y, si tardas, las nuevas sustituyen a las primeras. Por eso se configura antes de cada captura:</p><ol class="skO">'+
    '<li><b>Prueba de señal</b>: base de tiempos corta, ajustar escalas y comprobar que cada canal se ve bien.</li>'+
    '<li><b>Subir la base de tiempos</b> a 1–2 s/div para que una pantalla contenga la maniobra completa. Cada paso dice cuánto necesita y comprueba tu configuración.</li>'+
    '<li><b>Muestras</b> suficientes para el muestreo mínimo del paso.</li>'+
    '<li><b>Disparo único</b> sobre la bobina: graba una pantalla y se para (por confirmar en taller).</li>'+
    '<li><b>Exportar a CSV</b> solo la pantalla con la maniobra (forma de onda actual). Un CSV por paso.</li></ol>'+
    '<div class="row"><span class="hint">'+n+(n>1?' capturas':' captura')+' en este script.</span><span class="sp"></span><button class="p" data-go="1">Empezar: paso 1</button></div></div>';
  if(i>n){const L=S.pasos.map((p,k)=>SK.csv[S.id+'|'+(k+1)]);
    return '<div class="skC"><b class="skH">Resumen de las capturas</b><div class="skCk">'+S.pasos.map((p,k)=>{const c=L[k];
      return '<div class="skA '+(c?(c.bad?'warn':'ok'):'warn')+'"><b>'+(c?(c.bad?'!':'✓'):'!')+'</b><span>Paso '+(k+1)+' · '+skE(p.titulo)+(c?' — '+skE(c.name):' — falta el CSV')+'</span></div>'}).join('')+'</div>'+
      '<div class="row"><button class="p" id="kAll"'+(L.some(Boolean)?'':' disabled')+'>Abrir las capturas en el osciloscopio</button></div>'+
      '<p class="hint">Cada captura se abre como una página. El informe combinado (fases y cruce de pruebas por cilindro) llegará en una próxima versión.</p></div>';}
  const p=S.pasos[i-1],key=S.id+'|'+i,c=SK.cfg[key]||(SK.cfg[key]=skRec(p)),r=skChecks(p,c),cv=SK.csv[key];
  return '<div class="skC"><b class="skH2">Paso '+i+' de '+n+' · '+skE(p.titulo)+'</b><div class="skG2"><div class="skMin"><b class="skH">Qué medir</b><div class="skTw"><table class="skTb"><thead><tr><th>Canal</th><th>Señal</th><th>Sonda</th><th>Rango</th></tr></thead><tbody>'+
    p.canales.map(ch=>'<tr><td><span class="skCh" style="background:'+COL[SK_CH[ch.canal]]+'">'+ch.canal+'</span></td><td>'+skE(ch.senal)+'</td><td>'+skE(ch.sonda||'')+'</td><td class="nw">'+skE(ch.rango||'')+'</td></tr>').join('')+'</tbody></table></div>'+
    (p.como&&p.como.length?'<b class="skH">Cómo</b><ol class="skO">'+p.como.map(x=>'<li>'+skE(x)+'</li>').join('')+'</ol>':'')+'</div>'+
    '<div class="skMin"><b class="skH">Maniobra, en este orden</b>'+skPerfil(p,r.win)+(p.fuente?'<p class="hint">'+skE(p.fuente)+'</p>':'')+'</div></div></div>'+
   '<div class="skC"><b class="skH">Tu configuración de PicoScope</b><div class="row"><label>Base de tiempos <select id="kTb">'+SK_TB.map(x=>'<option value="'+x[0]+'"'+(x[0]===c.tb?' selected':'')+'>'+x[1]+'/div</option>').join('')+'</select></label>'+
    '<label>Muestras <select id="kMs">'+SK_MS.map(x=>'<option value="'+x[0]+'"'+(x[0]===c.ms?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label><button id="kRec">Usar lo recomendado</button></div>'+
    '<div class="skKv"><div><small>Una pantalla dura</small><b>'+skT(r.win)+'</b></div><div><small>Maniobra</small><b>'+skT(skDur(p))+'</b></div><div><small>Muestreo</small><b>'+skF(r.fs)+'</b></div><div><small>Canales</small><b>'+p.canales.length+'</b></div></div>'+
    '<div class="skCk" id="kCk">'+r.o.map(o=>'<div class="skA '+o[0]+'"><b>'+(o[0]==='ok'?'✓':o[0]==='warn'?'!':'✗')+'</b><span><b>'+o[1]+'.</b> '+o[2]+'</span></div>').join('')+'</div></div>'+
   '<div class="skC"><b class="skH">Cargar la captura</b><div class="drop" id="kDrop">'+(cv?'<b>'+skE(cv.name)+'</b><div class="skCk">'+cv.chk.map(o=>'<div class="skA '+o[0]+'"><b>'+(o[0]==='ok'?'✓':'!')+'</b><span>'+o[1]+'</span></div>').join('')+'</div>':
     'Suelta aquí el CSV exportado de PicoScope')+'<div class="row" style="justify-content:center;margin-top:8px"><button id="kLoad">'+(cv?'Cambiar CSV…':'Elegir CSV…')+'</button>'+(cv?'<button id="kVer">Ver en el osciloscopio</button><button id="kQuit">Quitar</button>':'')+'</div></div>'+
    '<div class="row" style="margin-top:10px"><button data-go="'+(i-1)+'">← Anterior</button><span class="sp"></span><button class="p" data-go="'+(i+1)+'">'+(i<n?'Siguiente: paso '+(i+1):'Ir al resumen')+' →</button></div></div>';
}
function skEditor(S){
  const v=JSON.stringify(Object.assign({},S,{_o:undefined}),null,2);
  return '<div class="skC"><b class="skH">Editar «'+skE(S.nombre)+'»</b><p class="hint">Formato <code>analyzer-scope-script/1</code> (docs/SCRIPTS.md). Cambia textos, canales, maniobra o requisitos y guarda; si algo está mal escrito, la app dice qué.</p>'+
    '<textarea id="kTx" class="skTx" spellcheck="false">'+esc(v)+'</textarea><p class="hint" id="kESt"></p><div class="row"><button class="p" id="kGu">Guardar</button><button id="kCa">Cancelar</button></div></div>';
}
/* ---- acciones ---- */
async function skCargaCsv(S,i,f){
  const p=S.pasos[i-1],key=S.id+'|'+i;
  try{st('Leyendo '+f.name+'…');const ds=await readAny(f,u=>st('Leyendo '+f.name+'… '+Math.round(u*100)+' %'));const d=ds[0];
    const x=d.chs[0].x,n=x.length,dur=n>1?x[n-1]-x[0]:0,fs=dur>0?(n-1)/dur:0,need=skDur(p),r=p.requisitos,chk=[];
    chk.push([d.chs.length>=p.canales.length?'ok':'warn',d.chs.length+(d.chs.length>1?' canales':' canal')+(d.chs.length>=p.canales.length?'':' (el paso pide '+p.canales.length+')')]);
    chk.push([dur>=need*.9?'ok':'warn','Dura '+skT(dur)+(dur>=need*.9?'':' (la maniobra necesita '+skT(need)+')')]);
    chk.push([fs>=r.fs_min*.95?'ok':'warn',skF(fs)+(fs>=r.fs_min*.95?'':' (mínimo '+skF(r.fs_min)+')')]);
    if(ds.length>1)chk.push(['warn','El archivo trae '+ds.length+' pantallas: se usa la primera']);
    SK.csv[key]={name:f.name,ds:ds.slice(0,1),chk,bad:chk.some(c=>c[0]!=='ok')};st(f.name+': cargado en el paso '+i+' de «'+S.nombre+'».');
  }catch(e){st(f.name+': '+e.message);$('st').classList.add('err')}
  skTab();
}
function skWire(S){
  $('kL').querySelectorAll('.skI').forEach(b=>b.onclick=()=>{SK.sel=b.dataset.k;SK.step=0;SK.edit=SK.del=false;skTab()});
  $('kSteps').querySelectorAll('.skS').forEach(b=>b.onclick=()=>{SK.step=+b.dataset.s;SK.edit=false;skTab()});
  $('kPaso').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{SK.step=+b.dataset.go;skTab()});
  $('kImpB').onclick=()=>$('kImp').click();
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  on('kDup',()=>{const U=skUser(),c=JSON.parse(JSON.stringify(Object.assign({},S,{_o:undefined})));
    c.id='MIO-'+Date.now().toString(36).toUpperCase();c.nombre=S.nombre+' (copia)';c.autor='';c.origen={id:S.origen?S.origen.id:S.id,nombre:S.origen?S.origen.nombre:S.nombre,version:S.origen?S.origen.version:S.version||''};
    U.push(c);skSave(U);SK.sel=c.id;SK.step=0;SK.edit=true;skTab();st('Copia creada en «Mis scripts». El original no cambia.')});
  on('kEd',()=>{SK.edit=true;skTab()});
  on('kCa',()=>{SK.edit=false;skTab()});
  on('kGu',()=>{let o;try{o=JSON.parse($('kTx').value)}catch(e){$('kESt').textContent='JSON mal escrito: '+e.message;return}
    o.id=S.id;if(S.origen&&!o.origen)o.origen=S.origen;const er=skValida(o);if(er){$('kESt').textContent='No se guarda: '+er+'.';return}
    const U=skUser().map(x=>x.id===S.id?o:x);skSave(U);SK.edit=false;skTab();st('Script guardado.')});
  on('kExp',()=>saveFile((S.nombre||'script')+'.json',new Blob([JSON.stringify(Object.assign({},S,{_o:undefined}),null,2)],{type:'application/json'})));
  on('kDel',()=>{if(!SK.del){SK.del=true;skTab();return}SK.del=false;skSave(skUser().filter(x=>x.id!==S.id));SK.sel=null;SK.step=0;skTab();st('Script borrado.')});
  const key=S.id+'|'+SK.step;
  if($('kTb')){$('kTb').onchange=e=>{SK.cfg[key].tb=+e.target.value;skTab()};$('kMs').onchange=e=>{SK.cfg[key].ms=+e.target.value;skTab()};
    $('kRec').onclick=()=>{SK.cfg[key]=skRec(S.pasos[SK.step-1]);skTab()}}
  on('kLoad',()=>$('kIn').click());
  on('kQuit',()=>{delete SK.csv[key];skTab()});
  on('kVer',()=>{addPages(SK.csv[key].ds);showTab('S')});
  on('kAll',()=>{const l=[];S.pasos.forEach((p,k)=>{const c=SK.csv[S.id+'|'+(k+1)];if(c)c.ds.forEach(d=>l.push(Object.assign({},d,{name:'Paso '+(k+1)+' · '+p.titulo+' · '+c.name})))});if(l.length){addPages(l);showTab('S')}});
  const dr=$('kDrop');if(dr){dr.ondragover=e=>{e.preventDefault();dr.classList.add('on')};dr.ondragleave=()=>dr.classList.remove('on');
    dr.ondrop=e=>{e.preventDefault();e.stopPropagation();dr.classList.remove('on');const f=e.dataTransfer.files[0];if(f)skCargaCsv(S,SK.step,f)}}
}
$('tabK').onclick=()=>showTab('K');
$('kIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)skCargaCsv(skCur(),SK.step,f)};
$('kImp').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let o;
  try{o=JSON.parse(await f.text())}catch(er){st(f.name+': JSON mal escrito.');$('st').classList.add('err');return}
  const er=skValida(o);if(er){st(f.name+': no es un script válido ('+er+').');$('st').classList.add('err');return}
  const U=skUser();if(SCRIPTS_BASE.some(b=>b.id===o.id)||U.some(x=>x.id===o.id))o.id='MIO-'+Date.now().toString(36).toUpperCase();
  delete o._o;U.push(o);skSave(U);SK.sel=o.id;SK.step=0;skTab();st(f.name+': script importado en «Mis scripts».')};
