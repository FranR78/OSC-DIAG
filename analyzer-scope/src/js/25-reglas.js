/* ---------- Fuente de conocimiento: paquetes de reglas (docs/REGLAS.md) ----------
   Paquetes base (src/reglas/*.json, solo lectura, p. ej. Ortu) + paquetes del usuario (en su navegador, importables/exportables).
   Cada paquete se activa o no. Reglas de paquetes distintos con el mismo «tema» no se pisan: el hallazgo enseña los criterios de todos. */
const RG_FMT='analyzer-scope-reglas/1',RG_OPS=['<','<=','>','>=','entre','fuera','peor'],RG_CONF={alta:3,media:2,baja:1};
function rgUsuario(){let a=null;try{a=JSON.parse(LS.get('as_paqs')||'null')}catch(e){}
  return Array.isArray(a)&&a.length?a:[{formato:RG_FMT,paquete:'propio',nombre:'Mis reglas',autor:'',version:'',reglas:[]}]}
function rgGuardaUsuario(a){LS.set('as_paqs',JSON.stringify(a));if(typeof rgSube==='function')rgSube(a)}
function rgOnMap(){try{return JSON.parse(LS.get('as_paqon')||'{}')||{}}catch(e){return{}}}
const RG_NT={paquete:'nt',nombre:'Notas maestras (portal)',base:true,remoto:true,reglas:[]};
const rgConPortal=()=>APP_CFG.modo==='portal'||!!APP_CFG.apiUrl;
const rgTodos=()=>[...(rgConPortal()?[RG_NT]:[]),...REGLAS_BASE.map(p=>Object.assign({},p,{base:true})),...rgUsuario().map(p=>Object.assign({},p,{base:false}))];
const rgActivo=p=>rgOnMap()[p.paquete]!==false;
const rgActivos=()=>rgTodos().filter(rgActivo);
function rgSetActivo(id,on){const m=rgOnMap();m[id]=!!on;LS.set('as_paqon',JSON.stringify(m))}
/* validación (para importar y para el editor): devuelve lista de errores en español */
function rgValida(p){const E=[];if(!p||typeof p!=='object')return['No es un paquete de reglas.'];
  if(!p.paquete||!/^[a-z0-9_-]{2,30}$/i.test(p.paquete))E.push('«paquete»: identificador de 2 a 30 letras, números, - o _.');
  if(!Array.isArray(p.reglas))E.push('Falta la lista «reglas».');else{const ids=new Set();
    p.reglas.forEach((r,i)=>{const w='Regla '+(i+1)+(r&&r.id?' ('+r.id+')':'')+': ';
      if(!r||!r.id)E.push(w+'falta «id».');else if(ids.has(r.id))E.push(w+'«id» repetido.');else ids.add(r.id);
      if(!r||!r.sintoma)E.push(w+'falta «sintoma».');
      if(!r||!Array.isArray(r.si)||!r.si.length)E.push(w+'falta al menos una condición en «si».');
      else r.si.forEach(c=>{if(!c.medida)E.push(w+'condición sin «medida».');if(!RG_OPS.includes(c.op))E.push(w+'operador «'+c.op+'» no válido.');
        if(['entre','fuera'].includes(c.op)&&!(Array.isArray(c.valor)&&c.valor.length===2))E.push(w+'«'+c.op+'» necesita valor [a, b].');
        if(['<','<=','>','>='].includes(c.op)&&!isFinite(c.valor))E.push(w+'«'+c.op+'» necesita un número.')});
      if(r&&r.confianza&&!RG_CONF[r.confianza])E.push(w+'confianza alta, media o baja.')})}
  return E}
const rgL=v=>v==null||v===''?[]:Array.isArray(v)?v:[v];
const rgCmp=(c,v)=>{if(v==null||!isFinite(v))return false;v=+v;const a=c.valor;
  switch(c.op){case'<':return v<a;case'<=':return v<=a;case'>':return v>a;case'>=':return v>=a;
    case'entre':return v>=a[0]&&v<=a[1];case'fuera':return v<a[0]||v>a[1]}return false};
function rgCondTxt(c){const u=c.unidad?' '+c.unidad:'';
  if(c.op==='peor')return i18(c.sentido==='mayor'?'el mayor de todos los cilindros':'el menor de todos los cilindros')+(c.valor!=null?' · < '+c.valor+' % '+i18('del mejor'):'');
  if(c.op==='entre')return i18('entre')+' '+c.valor[0]+' '+i18('y')+' '+c.valor[1]+u;
  if(c.op==='fuera')return i18('fuera de')+' '+c.valor[0]+'–'+c.valor[1]+u;
  return c.op+' '+c.valor+u}
const rgSub=(t,v)=>String(t==null?'':t).replace(/\{(cil|valor|pct|canal)\}/g,(m,k)=>v[k]!=null?v[k]:m);
/* evalúa una regla con la petición del diagnóstico → hallazgos (uno por cilindro o canal que cumple) */
function rgEval(r,P,p){const H=[],motor=(p.contexto&&p.contexto.motor)||{},S=(p.contexto&&p.contexto.senales)||[],cx=r.contexto||{};
  if(motor.combustible&&rgL(cx.combustible).length&&!rgL(cx.combustible).includes(motor.combustible))return H;
  if(motor.cilindros&&rgL(cx.cilindros).length&&!rgL(cx.cilindros).map(Number).includes(+motor.cilindros))return H;
  const ents=rgL(cx.entidad),chans=ents.length?S.filter(s=>ents.includes(s.entidad)).map(s=>s.canal):[null];
  for(const ch of chans){
    const find=id=>p.medidas.find(m=>m.id===id&&(ch==null||m.canal==null||m.canal===ch));
    let cyls=null,ok=true;const U=[];
    for(const c of r.si){const m=find(c.medida);if(!m){ok=false;break}
      if(c.op==='peor'){const rk=dxRank(m.por_cilindro);if(!rk){ok=false;break}const w=c.sentido==='mayor'?rk[rk.length-1]:rk[0];
        if(c.valor!=null&&!(w.pct_mejor<c.valor)){ok=false;break}
        cyls=cyls?cyls.filter(k=>k===w.cilindro):[w.cilindro];U.push({c,m,rk})}
      else if(m.por_cilindro){const ks=Object.keys(m.por_cilindro).filter(k=>rgCmp(c,m.por_cilindro[k])).map(Number);
        cyls=cyls?cyls.filter(k=>ks.includes(k)):ks;U.push({c,m})}
      else{if(!rgCmp(c,m.valor)){ok=false;break}U.push({c,m})}
      if(cyls&&!cyls.length){ok=false;break}}
    if(!ok)continue;
    (cyls||[null]).forEach(cyl=>{let val=null,pct=null;
      const ev=U.map(({c,m,rk})=>{const v=cyl!=null&&m.por_cilindro?m.por_cilindro[cyl]:m.valor;if(val==null)val=v;
        const e={medida:m.id,canal:m.canal,cilindro:cyl,valor:v,condicion:rgCondTxt(c),etiqueta:'Medido'};
        if(rk){e.comparacion=rk;const q=rk.find(x=>x.cilindro===cyl);if(q&&pct==null)pct=q.pct_mejor}return e});
      const V={cil:cyl,valor:val,pct,canal:ch};
      H.push({regla:r.id,tema:r.tema||'',paquete:P.paquete,paquete_nombre:P.nombre||P.paquete,base:!!P.base,fuente:r.fuente||'',estado:r.estado||'',
        local:true,comparativa:r.si.some(c=>c.op==='peor'),confianza:r.confianza||'media',etiqueta:r.etiqueta||'',
        sintoma:i18(rgSub(r.sintoma,V)),evidencia:ev,
        causas:(r.causas||[]).map(c=>({texto:i18(rgSub(c.texto,V)),etiqueta:c.etiqueta||'Inferido',como_separar:c.separar?i18(rgSub(c.separar,V)):''})),
        comprobaciones:(r.comprobaciones||[]).map((c,i)=>({orden:i+1,texto:i18(rgSub(c.texto,V)),tipo:c.tipo||'',esperado:c.esperado?rgSub(c.esperado,V):''}))})})}
  return H}
/* diagnóstico con los paquetes activos; los temas con criterio de varios paquetes llevan «criterios» (cumple o no cada uno) */
const rgKey=x=>{const e=(x.evidencia||[])[0]||{};return(e.cilindro==null?'':e.cilindro)+'|'+(e.canal||'')};
const rgCondR=r=>(r.si||[]).map(c=>mlb(c.medida)+' '+rgCondTxt(c)).join(' · ');
/* ext (portal): {H: hallazgos de las notas maestras, crit: [{tema, regla, condicion, fuente, cumplen:[clave]}]} */
function dxLocal(p,ext){const PA=rgActivos().filter(P=>!P.remoto),H=[],temas={};
  PA.forEach(P=>(P.reglas||[]).forEach(r=>{if(rgValida({paquete:'xx',reglas:[r]}).length)return;
    const h=rgEval(r,P,p);H.push(...h);if(r.tema)(temas[r.tema]=temas[r.tema]||[]).push({src:P.paquete,paquete:P.nombre||P.paquete,regla:r.id,condicion:rgCondR(r),fuente:r.fuente||'',keys:h.map(rgKey)})}));
  if(ext){(ext.H||[]).slice().reverse().forEach(h=>{H.unshift(Object.assign(h,{paquete:'nt',paquete_nombre:RG_NT.nombre,base:true}))});
    (ext.crit||[]).forEach(c=>{if(c.tema)(temas[c.tema]=temas[c.tema]||[]).push({src:'nt',paquete:RG_NT.nombre,regla:c.regla,condicion:c.condicion,fuente:c.fuente||'',keys:c.cumplen||[]})})}
  H.forEach(h=>{const t=temas[h.tema];if(!t||new Set(t.map(x=>x.src)).size<2)return;const k=rgKey(h);
    h.criterios=t.map(x=>({paquete:x.paquete,regla:x.regla,condicion:x.condicion,fuente:x.fuente,cumple:x.keys.includes(k)}));
    h.discrepancia=h.criterios.some(c=>!c.cumple)});
  H.sort((a,b)=>(RG_CONF[b.confianza]||0)-(RG_CONF[a.confianza]||0));
  const av=[...new Set(PA.filter(P=>P.aviso&&H.some(h=>h.paquete===P.paquete)).map(P=>i18(P.aviso)))];
  return{ok:true,v:1,op:'diagnostico',hallazgos:H,relacionadas:[],local:true,perfil:(ext?[RG_NT.nombre]:[]).concat(PA.map(P=>P.nombre||P.paquete)),
    aviso:(av.join(' ')+' '+i18('Posibles causas: confírmalas con las comprobaciones antes de sustituir piezas.')).trim()}}
/* umbrales de compresión relativa de los paquetes activos (para la pestaña y su gráfica) */
function crUmbrales(){const U=[];rgActivos().forEach(P=>(P.reglas||[]).forEach(r=>(r.si||[]).forEach(c=>{
  if(c.medida==='comp_rel_pct'&&['<','<='].includes(c.op)&&isFinite(c.valor))U.push({v:+c.valor,nombre:P.nombre||P.paquete})})));
  return U.length?U:[{v:90,nombre:''}]}
/* ---------- panel «Fuente de conocimiento» en la pestaña Diagnóstico ---------- */
function rgPanel(){const el=$('xPq');if(!el)return;el.innerHTML='';
  rgTodos().forEach(P=>{const l=T('label',null,'dxc'),cb=document.createElement('input');cb.type='checkbox';cb.checked=rgActivo(P);
    cb.onchange=()=>{rgSetActivo(P.paquete,cb.checked);DXR=null;$('xRes').innerHTML='';$('xSt').textContent=''};
    if(P.remoto){l.appendChild(cb);l.appendChild(document.createTextNode(' '+i18(P.nombre)+' · '+i18('reglas de cada nota técnica')));el.appendChild(l);return}
    const n=(P.reglas||[]).length,b=(P.reglas||[]).filter(r=>r.estado==='borrador').length;
    l.appendChild(cb);l.appendChild(document.createTextNode(' '+i18(P.nombre||P.paquete)+' · '+n+' '+i18(n===1?'regla':'reglas')+(b?' ('+b+' '+i18('en borrador')+')':'')+(P.base?' · '+i18('base, solo lectura'):'')));el.appendChild(l)})}
function rgExport(P){const o=Object.assign({},P);delete o.base;o.formato=RG_FMT;
  saveFile('reglas_'+o.paquete+'.json',new Blob([JSON.stringify(o,null,1)],{type:'application/json'}))}
$('xPqI').onclick=()=>$('xPqF').click();
$('xPqF').onchange=e=>{const f=e.target.files[0];if(f)rgImport(f);e.target.value=''};
{const f=dxTab;dxTab=function(){rgPanel();f()}}
{const h=setLang;setLang=function(l){h(l);rgPanel()}}
rgPanel();
