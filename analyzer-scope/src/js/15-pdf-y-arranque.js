/* ---------- Guardar archivos, informe PDF y arranque ---------- */
async function saveFile(name,blob){
  name=String(name).replace(/\s*[^\p{L}\p{N} ._()+-]+\s*/gu,'_').replace(/_+/g,'_');  // el navegador rechaza nombres con «·», «/»…
  try{const d=window.claude&&await claude.use('downloads');
    if(d){try{await d.save({filename:name,data:blob});return}catch(e){if(e&&e.code==='rejected_extension'){await d.save({filename:name+'.json',data:blob});return}throw e}}}
  catch(e){if(e&&e.code==='declined')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
}
async function report(){
  if(!window.jspdf)return st('No se pudo cargar el generador de PDF.');
  if(!CH.some(c=>c.x))return st('No hay señales cargadas.');
  const K=$('pdfBg').value==='k',{jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),lg=$('logo').src,
    cl=s=>String(s).replace(/Δ/g,'Dif ').replace(/∞/g,'inf').replace(/–/g,'-').replace(/●/g,'-'),
    tc=K?[235,240,248]:[25,25,25],hc=K?[255,255,255]:[20,40,80],mc=K?[160,172,190]:[100,100,100];
  let page=1;{const _tx=doc.text.bind(doc);doc.text=(t,...a)=>_tx(Array.isArray(t)?t.map(x=>i18(String(x))):i18(String(t)),...a)}
  const head=()=>{if(K){doc.setFillColor(5,10,19);doc.rect(0,0,297,210,'F');doc.setFillColor(255,255,255);doc.roundedRect(8.5,6,31,15,2,2,'F')}
    doc.addImage(lg,'JPEG',10,7.5,28,12.6);doc.setTextColor(...hc);doc.setFontSize(16);doc.text('Informe de señales',46,14);
    doc.setFontSize(9);doc.setTextColor(...mc);doc.text('Analyzer Scope · by J.A.Ortúñez y Fran Rosales · '+new Date().toLocaleString(LANG==='en'?'en-GB':'es-ES'),46,20);
    doc.setDrawColor(217,169,58);doc.line(10,25,287,25)};
  const foot=()=>{doc.setFontSize(8);doc.setTextColor(...mc);doc.text('Ortu Automoción · ortuautomocion.com',10,205);doc.text('Pág. '+page,287,205,{align:'right'})};
  head();
  const R=draw(K?'dark':'light'),img=cv.toDataURL('image/png');draw();
  let w=277,h=w*cv.height/cv.width;if(h>108){h=108;w=h*cv.width/cv.height}
  doc.addImage(img,'PNG',10,33,w,h);
  const fd={usuario:'usuario',bajo:'paso bajo',alto:'paso alto',banda:'ancho de banda'};
  const items=[...CH.filter(c=>c.x&&c.on).map(c=>c.n+(c.p?' ('+c.p+')':'')+' ['+c.u+'] escala '+fmt(c.vd,c.u)+'/div'+(c.fl!=='off'?' · filtro '+fd[c.fl]+' '+c.f1+(c.fl==='banda'?'-'+c.f2:'')+' Hz':'')+(c.inv?' · invertido':'')),
    'Vista: '+fmt(view.span,'s')+' desde '+fmt(view.t0,'s')].concat(PG.length>1?['Página '+(pgI+1)+' de '+PG.length+': '+PG[pgI].name]:[])
    .concat(ph.T>0&&ph.on?['Fase: 720° = '+fmt(ph.T,'s')+' ('+Math.round(120/ph.T)+' rpm)']:[])
    .concat(eng.on?['Motor: '+eng.n+' cilindros · orden de encendido '+eng.order.join('-')]:[]).concat(cylData().map(d=>'Orden '+d.j+' · Cil. '+d.cyl+': disparo '+fmt(d.trig,'s')+' · PMS compresión '+fmt(d.tdc,'s')+' ('+d.deg+')')).concat(R.map(([k,v])=>k+': '+v));
  const base=33+h+6;let col=0,y=base;doc.setFontSize(8);doc.setTextColor(...tc);
  items.forEach(t=>{const L=doc.splitTextToSize(cl(t),88);
    if(y+L.length*4>199){if(col<2){col++;y=base}else{foot();doc.addPage();page++;head();col=0;y=36}}
    doc.setTextColor(...tc);doc.text(L,10+col*93,y);y+=L.length*4+1});
  const dr=distRows();
  if(dr.length){foot();doc.addPage();page++;head();
    const c2=document.createElement('canvas');drawDist(c2,K?'dark':'light',760,760);
    doc.addImage(c2.toDataURL('image/png'),'PNG',10,33,160,160);
    doc.setFontSize(13);doc.setTextColor(...hc);doc.text('Diagrama de distribución',180,42);
    let yy=52;doc.setFontSize(9);dr.forEach(([k,v])=>{const L=doc.splitTextToSize(cl(k),70);doc.setTextColor(...tc);doc.text(L,180,yy);doc.setTextColor(...hc);doc.text(cl(v),284,yy,{align:'right'});yy+=L.length*4.2+2.5});
    doc.setFontSize(7.5);doc.setTextColor(...mc);doc.text(doc.splitTextToSize('Referencia: la regla PMS marca los 0 grados. AAA y RCE se miden respecto al PMS; AAE y RCA, respecto al PMI. Ángulos siempre positivos.',105),180,yy+4)}
  foot();
  await saveFile('informe_osciloscopio.pdf',doc.output('blob'));
}
$('tPh').onclick=()=>{ph.on=!ph.on;sync();draw()};
$('tPms').onclick=()=>{pms.on=!pms.on;if(pms.on&&pms.t==null)pms.t=view.t0+view.span/2;sync();draw()};
$('tT').onclick=()=>{tr.on=!tr.on;if(tr.on){if(cur.a==null)cur.a=view.t0+view.span/3;if(cur.b==null)cur.b=view.t0+view.span*2/3}sync();draw()};
$('tT2').onclick=()=>{tr2.on=!tr2.on;if(tr2.on){if(cur.c==null)cur.c=view.t0+view.span*.55;if(cur.d==null)cur.d=view.t0+view.span*.8}sync();draw()};
$('tAmp').onclick=()=>{amp.on=!amp.on;sync();draw()};
$('bPdf').onclick=report;
$('rpm').oninput=()=>{const r=+$('rpm').value;if(r>0){ph.T=120/r;ph.auto=false;if(ph.t0==null)ph.t0=view.t0;draw()}};
$('bO').onclick=()=>{if(cur.a==null)return st('Coloca primero T1 (clic en la señal o botón «Reglas T1/T2»).');ph.t0=cur.a;ph.auto=false;if(!(ph.T>0))ph.T=view.span;draw()};
$('bP').onclick=()=>{if(pms.t==null)return st('Activa primero la regla PMS.');ph.t0=pms.t;ph.auto=false;if(!(ph.T>0))ph.T=view.span*720/ph.deg;draw()};
$('bAB').onclick=()=>{if(cur.a==null||cur.b==null)return st('Coloca T1 (clic) y T2 (Mayús+clic).');ph.t0=Math.min(cur.a,cur.b);ph.T=Math.abs(cur.b-cur.a)*720/ph.deg;ph.auto=false;$('rpm').value=Math.round(120/ph.T);draw()};
$('bAu').onclick=()=>{ph.auto=true;ph.t0=view.t0;ph.T=view.span*720/ph.deg;$('rpm').value='';draw()};
$('phR').onchange=()=>{ph.deg=+$('phR').value;if(ph.auto)ph.T=view.span*720/ph.deg;$('bAB').textContent='T1→T2 = '+ph.deg+'°';$('bAu').textContent='Vista = '+ph.deg+'°';draw()};
$('phD').onchange=()=>{ph.div=+$('phD').value;draw()};
function fillG(){
  $('gO').innerHTML=ORD[eng.n].map((o,i)=>'<option value="'+i+'">'+o+'</option>').join('')+'<option value="u">Usuario</option>';
  const i=ORD[eng.n].indexOf(eng.order.join('-'));$('gO').value=i>=0?i:'u';
  $('gS').innerHTML='<option value="0">Todos los cilindros</option><option value="-1">Tiempos de cilindros · rejilla</option>'+Array.from({length:eng.n},(_,k)=>'<option value="'+(k+1)+'">Cilindro '+(k+1)+' · 4 tiempos</option>').join('');
  $('gS').value=eng.show>eng.n?1:eng.show;$('gU').value=eng.order.join('-');
  $('sY').innerHTML=Array.from({length:eng.n},(_,k)=>'<option value="'+(k+1)+'">Cilindro '+(k+1)+'</option>').join('');$('sY').value=eng.c0<=eng.n?eng.c0:1;fillVis();
}
const parseOrd=s=>{const a=s.split(/[^0-9]+/).filter(Boolean).map(Number);return a.length===eng.n&&[...a].sort((p,q)=>p-q).every((v,i)=>v===i+1)?a:null};
$('gN').innerHTML=[1,2,3,4,5,6,8,10,12,16].map(n=>'<option value="'+n+'">'+n+'</option>').join('');$('gN').value=4;
$('gN').onchange=()=>{eng.n=+$('gN').value;eng.order=ORD[eng.n][0].split('-').map(Number);eng.show=-1;eng.vis=null;eng.sync=null;eng.A=null;eng.c0=1;fillG();draw();cylList()};
function fillVis(){const N=eng.n,v=eng.vis;let h='';for(let k=1;k<=N;k++)h+='<label><input type="checkbox" data-c="'+k+'" '+(!v||v[k-1]!==false?'checked':'')+'>'+k+'</label>';
  h+='<button data-a="all">Todos</button><button data-a="none">Ninguno</button>';$('cVis').innerHTML=h}
$('cVis').onchange=e=>{const c=e.target&&e.target.dataset?e.target.dataset.c:null;if(c==null)return;if(!eng.vis)eng.vis=Array(eng.n).fill(true);eng.vis[+c-1]=e.target.checked;draw();cylList()};
$('cVis').onclick=e=>{const a=e.target&&e.target.dataset?e.target.dataset.a:null;if(!a)return;eng.vis=Array(eng.n).fill(a==='all');fillVis();draw();cylList()};
$('gO').onchange=()=>{const v=$('gO').value;if(v==='u'){const a=parseOrd($('gU').value);if(a)eng.order=a}else{eng.order=ORD[eng.n][+v].split('-').map(Number);$('gU').value=eng.order.join('-')}draw();cylList()};
$('gU').onchange=()=>{const a=parseOrd($('gU').value);if(a){eng.order=a;$('gO').value='u';draw();cylList()}else st('Orden no válido: debe contener cada cilindro de 1 a '+eng.n+' una sola vez (p. ej. '+ORD[eng.n][0]+').')};
$('gS').onchange=()=>{eng.show=+$('gS').value;draw();cylList()};
$('cPk').onchange=()=>{eng.pk=$('cPk').checked;draw()};
$('tGr').onclick=()=>{eng.on=!eng.on;sync();draw();cylList()};
const at=a=>ph.t0+ph.T*a/720;
$('tVv').onclick=()=>{if(!(ph.T>0))return st('Carga una señal primero.');vv.on=!vv.on;
  if(vv.on){if(!pms.on||pms.t==null){pms.on=true;if(pms.t==null)pms.t=view.t0+view.span/2}
  const rt=refT(),a2=a=>rt+ph.T*a/720;if(vv.ie==null){vv.ie=a2(-225);vv.ia=a2(-15);vv.fe=a2(15);vv.fa=a2(225)}}sync();draw()};
$('tAdv').onclick=()=>{if(!(ph.T>0))return st('Carga una señal primero.');adv.on=!adv.on;
  if(adv.on){if(!pms.on||pms.t==null){pms.on=true;if(pms.t==null)pms.t=view.t0+view.span/2}
    if(adv.t==null)adv.t=pms.t-ph.T*10/720}sync();draw()};
$('advk').onchange=()=>{adv.k=$('advk').value;draw();if(!$('viewD').hidden)distTab()};
function distTab(){drawDist($('cv2'),'dark',700,700);
  const r=distRows(),c0=distCalc(),warn=c0&&c0.ok&&[c0.aaa,c0.rce,c0.aae,c0.rca].some(v=>v<0);$('dd').innerHTML=r.length?r.map(([k,v])=>'<div class="r"><span>'+k+'</span><b>'+v+'</b></div>').join('')+'<p class="hint">'+(warn?'⚠ Una o más reglas están al otro lado de su referencia (se muestra el valor absoluto). ':'')+'Referencias: AAA y RCE respecto al PMS; AAE y RCA respecto al PMI. Todos los ángulos se muestran en positivo.</p>':
  '<p class="hint">Activa «AAA·RCE·AAE·RCA» y «Avance» en la pestaña Osciloscopio y colócalas sobre la señal. La regla PMS marca los 0°.</p>'}
$('tabS').onclick=()=>showTab('S');$('tabD').onclick=()=>showTab('D');
fillG();
[['kPh',ph],['kT',tr],['kT2',tr2],['kVv',vv]].forEach(([id,o])=>$(id).onclick=()=>{o.lk=!o.lk;sync();draw()});
$('sK').onchange=()=>{$('sE').value=$('sK').value==='gas'?'down':'up'};
$('bSy').onclick=syncCyl;$('sY').onchange=()=>{eng.c0=+$('sY').value;draw();cylList()};$('bDx').onclick=()=>{eng.A=null;draw();cylList()};
[['oPh','bPh'],['oCy','bCy'],['oAv','bAv'],['sOn','sBox'],['oMa','bMa']].forEach(([c,b])=>{$(c).onchange=()=>{$(b).hidden=!$(c).checked}});
$('bSet').onclick=()=>{const h=$('leftp').classList.toggle('nos');$('bSet').classList.toggle('on',!h)};
$('bgR').oninput=()=>{bgV=$('bgR').value/100;draw()};
$('lES').onclick=()=>setLang('es');$('lEN').onclick=()=>setLang('en');
ui();sync();draw();cylList();renderDocs();
