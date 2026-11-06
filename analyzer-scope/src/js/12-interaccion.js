/* ---------- Interacción ---------- */
let drag=null;
/* gestos táctiles: dos dedos = zoom (pellizco) centrado entre los dedos */
const TP=new Map();let pinch=null;
function pinchSet(){const [a,b]=[...TP.values()],m=(a+b)/2,u=(m-M.l)/PW();pinch={d:Math.max(20,Math.abs(a-b)),span:view.span,t:view.t0+u*view.span}}
function pinchMove(){const [a,b]=[...TP.values()],u=((a+b)/2-M.l)/PW();view.span=pinch.span*pinch.d/Math.max(20,Math.abs(a-b));view.t0=pinch.t-u*view.span;draw()}
const tOf=e=>view.t0+(e.offsetX-M.l)/PW()*view.span;
function hit(e){
  const x=e.offsetX,y=e.offsetY,inV=y>=M.t-46&&y<=M.t+PH(),inP=x>=M.l-6&&x<=M.l+PW()+6&&y>=M.t&&y<=M.t+PH();
  for(const ci of [sel,...CH.map((_,i)=>i).filter(i=>i!==sel).reverse()]){const c=CH[ci];
    if(c&&c.on&&c.x&&x>=M.l-4&&x<=M.l+27&&Math.abs(y-arrowY(c))<=9)return{k:'arrow',ci}}
  if(eng.on&&ph.T>0){for(const e of engEvents()){const ex=M.l+(e.t-view.t0)/view.span*PW();if(isVis(e.cyl)&&Math.abs(x-ex)<=11&&Math.abs(y-(M.t+11))<=11)return{k:'cyl',cyl:e.cyl}}}
  let best=null,bd=e.pointerType==='touch'?16:7;
  const vx=(k,t)=>{if(t==null||!inV)return;const d=Math.abs(x-(M.l+(t-view.t0)/view.span*PW()));if(d<bd){bd=d;best={k}}};
  if(pms.on)vx('pms',pms.t);
  if(tr.on){vx('t1',cur.a);vx('t2',cur.b)}
  if(tr2.on){vx('t3',cur.c);vx('t4',cur.d)}
  if(vv.on)['ia','fa','ie','fe'].forEach(k=>vx(k,vv[k]));
  if(adv.on)vx('adv',adv.t);
  if(ph.on&&ph.T>0){vx('p0',ph.t0);vx('p1',ph.t0+ph.T*ph.deg/720)}
  if(amp.on&&inP)CH.forEach((c,ci)=>{if(c.on&&c.x&&c.hr){ensureH(c);c.h.forEach((v,i)=>{
    const d=Math.abs(y-(M.t+PH()/2-(v/c.vd+c.off)*PH()/8));if(d<bd){bd=d;best={k:'h',ci,i}}})}});
  return best;
}
function lockMove(o,dt){
  const S=drag.snap,k=o.k;
  if((k==='t1'||k==='t2')&&tr.lk){cur.a=S.a+dt;cur.b=S.b+dt;return true}
  if((k==='t3'||k==='t4')&&tr2.lk){cur.c=S.c+dt;cur.d=S.d+dt;return true}
  if(['ia','fa','ie','fe'].includes(k)&&vv.lk){['ia','fa','ie','fe'].forEach(q=>vv[q]=S.vv[q]+dt);return true}
  if(k==='cyl'){eng.A=S.A+dt;return true}
  if((k==='p0'||k==='p1')&&ph.lk){ph.t0=S.t0+dt;ph.auto=false;return true}
  return false;
}
cv.addEventListener('pointerdown',e=>{if(ann.tool!=='none'){annDown(e);return}try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(e.pointerType==='touch'){TP.set(e.pointerId,e.offsetX);if(TP.size===2){drag=null;pinchSet();return}if(TP.size>2)return}
  drag={x:e.clientX,t0:view.t0,mv:false,o:hit(e),t00:tOf(e),snap:{a:cur.a,b:cur.b,c:cur.c,d:cur.d,t0:ph.t0,pms:pms.t,A:ph.T>0?engA():null,vv:{ia:vv.ia,fa:vv.fa,ie:vv.ie,fe:vv.fe}}};if(drag.o&&drag.o.k==='arrow'){const c=CH[drag.o.ci];drag.dy=e.offsetY-arrowY(c);if(sel!==drag.o.ci){sel=drag.o.ci;ui();draw()}}});
cv.addEventListener('pointermove',e=>{
  if(ann.tool!=='none'){annMove(e);return}
  if(TP.has(e.pointerId)){TP.set(e.pointerId,e.offsetX);if(pinch){pinchMove();return}}
  if(!drag){const h=hit(e);cv.style.cursor=h?(h.k==='h'||h.k==='arrow'?'ns-resize':'ew-resize'):'crosshair';return}
  const dx=e.clientX-drag.x;if(Math.abs(dx)>3||drag.o)drag.mv=true;if(!drag.mv)return;
  const o=drag.o;
  if(!o){view.t0=drag.t0-dx/PW()*view.span;draw();return}
  const t=tOf(e),eps=view.span*1e-4;
  if(lockMove(o,t-drag.t00));else if(o.k==='pms')pms.t=t;else if(o.k==='t1')cur.a=t;else if(o.k==='t2')cur.b=t;else if(o.k==='t3')cur.c=t;else if(o.k==='t4')cur.d=t;else if(o.k==='adv')adv.t=t;else if(['ia','fa','ie','fe'].includes(o.k))vv[o.k]=t;
  else if(o.k==='p0'){const end=ph.t0+ph.T*ph.deg/720;if(t<end-eps){ph.t0=t;ph.T=(end-t)*720/ph.deg}ph.auto=false}
  else if(o.k==='p1'){if(t>ph.t0+eps)ph.T=(t-ph.t0)*720/ph.deg;ph.auto=false}
  else if(o.k==='arrow'){const c=CH[o.ci],yy=Math.max(M.t,Math.min(M.t+PH(),e.offsetY-(drag.dy||0)));c.off=(M.t+PH()/2-yy)*8/PH()-refOf(c)/c.vd}
  else if(o.k==='h'){const c=CH[o.ci];c.h[o.i]=((M.t+PH()/2-e.offsetY)/(PH()/8)-c.off)*c.vd}
  if(ph.T>0&&!ph.auto)$('rpm').value=Math.round(120/ph.T);
  draw()});
cv.addEventListener('pointerup',e=>{
  if(ann.tool!=='none'){annUp(e);return}
  if(TP.delete(e.pointerId)&&pinch){if(TP.size<2)pinch=null;drag=null;return}
  if(drag&&!drag.mv&&!drag.o&&e.offsetX>=M.l&&e.offsetX<=M.l+PW()&&e.offsetY>=M.t&&e.offsetY<=M.t+PH()){
    const t=tOf(e);if(e.shiftKey)cur.b=t;else cur.a=t;if(cur.a==null)cur.a=t;if(cur.b==null)cur.b=t;tr.on=true;sync();draw()}
  if(drag&&drag.mv&&drag.o&&drag.o.k==='arrow')ui();
  if(drag&&drag.mv&&drag.o&&drag.o.k==='cyl')cylList();
  drag=null});
cv.addEventListener('wheel',e=>{e.preventDefault();const f=e.deltaY>0?1.25:.8,u=Math.min(1,Math.max(0,(e.offsetX-M.l)/PW())),t=view.t0+u*view.span;
  view.span*=f;view.t0=t-u*view.span;draw()},{passive:false});
cv.addEventListener('pointercancel',e=>{TP.delete(e.pointerId);if(TP.size<2)pinch=null;drag=null});
addEventListener('resize',draw);
$('bPan').onclick=()=>{const o=document.body.classList.toggle('pan');$('bPan').classList.toggle('on',o);if(o)$('leftp').scrollIntoView({behavior:'smooth',block:'start'})};
$('bOpen').onclick=()=>$('fi').click();
$('fi').onchange=e=>{loadFiles([...e.target.files]);e.target.value=''};
$('bFit').onclick=()=>{CH.forEach((c,i)=>c.x&&autoCh(i));fit();ui();draw()};
$('bClr').onclick=()=>{stop();CH.forEach(c=>{c.x=c.y=c.y0=null;c.h=null;c.on=false;c._set=false});PG.length=0;pgI=0;updPager();cur={a:null,b:null};ui();draw();st('Limpio.')};
document.body.addEventListener('dragover',e=>e.preventDefault());
document.body.addEventListener('drop',e=>{e.preventDefault();loadFiles([...e.dataTransfer.files])});
/* CSV con ajustes: 1.ª línea «#analyzer-scope-ajustes;{json}» + archivo completo con valores sin filtrar (y0) */
const CHK=['n','p','on','vd','off','hr','h','fl','f1','f2','inv'];
function cfgOf(A){
  const cp=o=>JSON.parse(JSON.stringify(o));
  return{v:1,ch:A.map(c=>{const o={};CHK.forEach(k=>o[k]=c[k]);return o}),sel:Math.max(0,A.indexOf(CH[sel])),view:cp(view),cur:cp(cur),
    ph:cp(ph),pms:cp(pms),tr:cp(tr),tr2:cp(tr2),amp:cp(amp),adv:cp(adv),vv:cp(vv),eng:cp(eng),bg:bgV,ann:cp(ann.list),
    sec:['oPh','oCy','oAv','sOn'].filter(id=>$(id).checked)};
}
function applyCfg(j){
  (j.ch||[]).forEach((q,k)=>{const c=CH[k];if(!c||!c.x)return;CHK.forEach(f=>{if(q[f]!==undefined)c[f]=q[f]});proc(c);c._set=true});
  [[view,j.view],[cur,j.cur],[ph,j.ph],[pms,j.pms],[tr,j.tr],[tr2,j.tr2],[amp,j.amp],[adv,j.adv],[vv,j.vv],[eng,j.eng]].forEach(([o,v])=>v&&Object.assign(o,v));
  if(j.sel!=null&&CH[j.sel]&&CH[j.sel].x)sel=j.sel;if(j.bg!=null){bgV=j.bg;$('bgR').value=Math.round(bgV*100)}if(j.ann)ann.list=j.ann;
  if(j.sec)['oPh','oCy','oAv','sOn'].forEach(id=>{$(id).checked=j.sec.includes(id);$(id).onchange()});
  $('phR').value=ph.deg;$('phD').value=ph.div;$('gN').value=eng.n;$('rpm').value=ph.T>0&&!ph.auto?Math.round(120/ph.T):'';
  $('cPk').checked=!!eng.pk;$('advk').value=adv.k;fillG();fillSC();if(eng.sync)$('sC').value=eng.sync.ch;cylList();
}
$('bExp').onclick=()=>{
  const A=CH.filter(c=>c.x);if(!A.length)return st('Nada que exportar.');const x=A[0].x;
  const val=(c,i)=>c.x===x||c.y0.length===x.length?c.y0[i]:c.y0[Math.min(c.y0.length-1,lb(c.x,x[i]))],nf=v=>(+v).toFixed(8).replace('.',',');
  const out=['#analyzer-scope-ajustes;'+JSON.stringify(cfgOf(A)),i18('Tiempo')+';'+A.map(c=>String(c.n||'CH').replace(/;/g,',')).join(';'),'(ms);'+A.map(c=>'('+c.u+')').join(';'),''];
  for(let i=0;i<x.length;i++)out.push(nf(x[i]*1000)+';'+A.map(c=>nf(val(c,i))).join(';'));
  const nm=((PG[pgI]&&PG[pgI].name)||'captura').replace(/\.[^.]+$/,'').replace(/_ajustes$/,'');
  saveFile(nm+'_ajustes.csv',new Blob([out.join('\r\n')],{type:'text/csv'}));
  st('CSV exportado con los ajustes (archivo completo, valores sin filtrar; al abrirlo aquí se recuperan escalas, reglas, cilindros, filtros y anotaciones).');
};
async function importSession(f){
  const j=JSON.parse(await f.text()),u8=s=>{const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a.buffer};
  const sx=j.x?new Float64Array(u8(j.x)):null;
  j.channels.forEach(q=>{const c=CH[q.slot],y=new Float32Array(u8(q.y));
    Object.assign(c,{n:q.n,p:q.p||'',u:q.u,x:sx||new Float64Array(u8(q.t)),y0:y,y,on:true,vd:q.vd,off:q.off,fl:q.fl,f1:q.f1,f2:q.f2,inv:q.inv,hr:true,h:null});proc(c)});
  Object.assign(ph,j.phase,{auto:false});[[pms,j.pms],[adv,j.adv],[vv,j.vv],[tr,j.tr],[tr2,j.tr2],[cur,j.cur],[eng,j.eng]].forEach(([o,v])=>v&&Object.assign(o,v));
  if(j.ann)ann.list=j.ann;$('phR').value=ph.deg;$('phD').value=ph.div;fillG();fillSC();if(eng.sync)$('sC').value=eng.sync.ch;cylList();$('cPk').checked=!!eng.pk;$('gN').value=eng.n;$('advk').value=adv.k;
  return f.name+': sesión .psdata con '+j.channels.length+' canal(es)';
}

