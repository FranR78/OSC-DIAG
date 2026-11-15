/* ---------- Ficha de la captura: vehículo, prueba y estado del motor (sin fallos / con fallo) ----------
   Se pide al abrir archivos, viaja en el CSV con ajustes y en el PDF, y con código de invitación se puede enviar a
   verificación a la biblioteca propia (op «referencia», docs/BIBLIOTECA.md). Nunca lleva matrícula, bastidor ni datos del cliente. */
let FIC=null,ficSt='',ficSkip=false,GRP=0;
const FK={arranque:'arranque',ralenti:'ralentí',aceleracion:'aceleración en vacío',carga:'en carga o en marcha',otra:'otra condición'},FT={frio:'motor frío',caliente:'motor caliente'},FF={diesel:'diésel',gasolina:'gasolina'};
const ficBib=()=>APP_CFG.bibliotecaUrl||'';
function ficE(e){ficSt=e;$('fcOk').classList.toggle('on',e==='ok');$('fcKo').classList.toggle('on',e==='fallo');$('fcAl').hidden=e!=='fallo'}
function ficOpen(){
  if(!CH.some(c=>c.x))return st('No hay señales cargadas.');
  const f=FIC||{};$('fcM').value=f.marca||'';$('fcC').value=f.codigo||$('xC').value||'';$('fcF').value=f.combustible||$('xF').value||'diesel';
  $('fcK').value=f.condicion||'';$('fcT').value=f.temp||'';$('fcO').value=f.obs||'';$('fcA').value=f.averia||$('xS').value||'';
  const box=$('fcCh');box.innerHTML='';
  CH.forEach((c,i)=>{if(!c.x)return;const l=document.createElement('label');l.innerHTML='<span><i class="dot" style="background:'+c.c+'"></i>'+escH(c.n)+'</span>';
    const inp=document.createElement('input');inp.type='text';inp.maxLength=40;inp.value=c.p||'';inp.dataset.i=i;inp.placeholder=i18('Parámetro medido (p. ej. Presión admisión)');l.appendChild(inp);box.appendChild(l)});
  ficE(f.estado||'');$('fcSt').textContent='';$('fcTx').hidden=$('fcIl').hidden=!ficBib();$('fcI').value=LS.get('as_bib')||'';$('fic').hidden=false;$('fcM').focus();
}
function ficSave(){
  if(!ficSt){$('fcSt').textContent='Elige el estado del motor: sin fallos o con fallo.';return null}
  const v=id=>$(id).value.trim(),f={marca:v('fcM'),codigo:v('fcC'),combustible:$('fcF').value,condicion:$('fcK').value,temp:$('fcT').value,obs:v('fcO'),estado:ficSt,averia:ficSt==='fallo'?v('fcA'):''};
  $('fcCh').querySelectorAll('input').forEach(q=>{CH[+q.dataset.i].p=q.value.trim()});
  $('xC').value=f.codigo;$('xF').value=f.combustible;if(f.averia)$('xS').value=f.averia;
  FIC=f;const p=PG[pgI];if(p)PG.forEach(q=>{if(q===p||(q.grp&&q.grp===p.grp))q.fic=f});
  ui();ficChip();draw();return f;
}
function ficChip(){const b=$('bFic'),on=CH.some(c=>c.x);b.hidden=!on;if(!on)return;
  b.className=FIC?(FIC.estado==='ok'?'fOk':'fKo'):'fNo';
  b.textContent=FIC?(FIC.estado==='ok'?'✓ Motor sin fallos':'⚠ Motor con fallo')+(FIC.codigo?' · '+FIC.codigo:''):'Ficha: sin completar'}
function ficLines(){if(!FIC)return[];const f=FIC,a=[f.marca,f.codigo&&'motor '+f.codigo,FF[f.combustible],FK[f.condicion],FT[f.temp]].filter(Boolean);
  return(a.length?['Ficha: '+a.join(' · ')]:[]).concat(['Estado: '+(f.estado==='ok'?'Motor sin fallos':'Motor con fallo'+(f.averia?' — '+f.averia:''))],f.obs?['Observaciones: '+f.obs]:[])}
/* CSV reducido para la biblioteca: como mucho ~20 000 filas, conservando mínimo y máximo de cada tramo (no se pierden picos) */
function ficCsv(maxN){
  const A=CH.filter(c=>c.x&&c.x===CH.find(q=>q.x).x),x=A[0].x,n=x.length,nf=v=>(+v).toFixed(8).replace('.',',');
  const out=['#analyzer-scope-ajustes;'+JSON.stringify(cfgOf(A)),i18('Tiempo')+';'+A.map(c=>String(c.n||'CH').replace(/;/g,',')).join(';'),'(ms);'+A.map(c=>'('+c.u+')').join(';'),''];
  if(n<=maxN)for(let i=0;i<n;i++)out.push(nf(x[i]*1000)+';'+A.map(c=>nf(c.y0[i])).join(';'));
  else{const B=maxN>>1;for(let k=0;k<B;k++){const i0=Math.floor(k*n/B),i1=Math.max(i0+1,Math.floor((k+1)*n/B)),r1=[],r2=[];
    A.forEach(c=>{let a=i0,b=i0;const y=c.y0;for(let i=i0;i<i1;i++){if(y[i]<y[a])a=i;if(y[i]>y[b])b=i}r1.push(nf(y[Math.min(a,b)]));r2.push(nf(y[Math.max(a,b)]))});
    out.push(nf(x[i0]*1000)+';'+r1.join(';'),nf(x[(i0+i1)>>1]*1000)+';'+r2.join(';'))}}
  return{csv:out.join('\r\n'),filas:out.length-4,original:n,A};
}
async function ficSend(f){
  const r=ficCsv(20000),nm=((PG[pgI]&&PG[pgI].name)||'captura').replace(/\.[^.]+$/,'');
  const req={v:1,op:'referencia',lang:LANG,cliente:{app:'analyzer-scope',ver:APP_CFG.ver},
    ficha:Object.assign({},f,{cilindros:eng.n,orden:eng.order.slice(),rpm:ph.T>0&&!ph.auto?Math.round(120/ph.T):null,
      senales:r.A.map(c=>({canal:'CH'+(CH.indexOf(c)+1),nombre:c.n,parametro:c.p||'',entidad:dxEnt(c),unidad:c.u}))}),
    archivo:{nombre:nm+'_ref.csv',muestras:r.filas,muestras_original:r.original,csv:r.csv}};
  req.codigo=LS.get('as_bib')||'';st('Enviando a verificación…');
  try{let a;try{a=await(await fetch(ficBib(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(req)})).json()}catch(e){throw{mensaje:i18('no hay conexión con la biblioteca.')}}
    if(!a||!a.ok)throw(a&&a.error)||{mensaje:'Respuesta no válida.'};f.enviada=a.id||true;st('Enviada a verificación: queda pendiente de revisión.')}
  catch(e){st('No se pudo enviar: '+((e&&e.mensaje)||e));$('st').classList.add('err')}
}
$('fcOk').onclick=()=>ficE('ok');$('fcKo').onclick=()=>ficE('fallo');
$('fcNo').onclick=()=>{$('fic').hidden=true};
$('fcSv').onclick=()=>{if(ficSave()){$('fic').hidden=true;st('Ficha guardada: irá en el CSV con ajustes y en el informe PDF.')}};
$('fcTx').onclick=()=>{const c=$('fcI').value.trim();if(!c){$('fcSt').textContent='Escribe tu código de invitación para enviar.';return}LS.set('as_bib',c);const f=ficSave();if(f){$('fic').hidden=true;ficSend(f)}};
$('bFic').onclick=ficOpen;
$('fic').addEventListener('pointerdown',e=>{if(e.target===$('fic'))$('fic').hidden=true});
$('fic').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')$('fic').hidden=true});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='ex')ficSkip=true},true);
{const a=addPages;addPages=function(l){const g=++GRP;l.forEach(d=>{d.grp=g});a(l)};
 const s=showPage;showPage=function(i){s(i);FIC=(PG[pgI]&&PG[pgI].fic)||null;ficChip()};
 const c=cfgOf;cfgOf=function(A){const o=c(A);if(FIC)o.fic=FIC;return o};
 const p=applyCfg;applyCfg=function(j){p(j);if(j.fic&&PG[pgI])PG[pgI].fic=j.fic};
 const l=loadFiles;loadFiles=async function(files){const n=PG.length,skip=ficSkip;ficSkip=false;await l(files);ficChip();
   if(!skip&&PG.length>n&&PG[pgI]&&!PG[pgI].fic&&LS.get('as_ficha')!=='off')ficOpen()};
 const g=setLang;setLang=function(x){g(x);ficChip()};
 const k=$('bClr').onclick;$('bClr').onclick=()=>{k();FIC=null;ficChip()}}
ficChip();
