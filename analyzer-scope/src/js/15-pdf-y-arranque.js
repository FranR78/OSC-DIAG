/* ---------- Guardar archivos, informe PDF y arranque ---------- */
async function saveFile(name,blob){
  name=String(name).replace(/\s*[^\p{L}\p{N} ._()+-]+\s*/gu,'_').replace(/_+/g,'_');  // el navegador rechaza nombres con «·», «/»…
  try{const d=window.claude&&await claude.use('downloads');
    if(d){try{await d.save({filename:name,data:blob});return}catch(e){if(e&&e.code==='rejected_extension'){await d.save({filename:name+'.json',data:blob});return}throw e}}}
  catch(e){if(e&&e.code==='declined')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
}
/* Qué entra en el informe: los hallazgos de «Diagnóstico» o, si no hay, los de los análisis de «Procedimientos» sobre la captura abierta */
function pdfDatos(){const an={can:null,ckp:null},act=PG[pgI];
  if(typeof DXA==='object'&&(typeof DXR_PG==='undefined'||!DXR_PG||DXR_PG===act)){if(DXA.can&&!DXA.can.err)an.can=DXA.can;if(DXA.ckp&&!DXA.ckp.err)an.ckp=DXA.ckp}
  if(typeof SK==='object'){for(const k in SK.csv){const cv=SK.csv[k];if(!cv||!cv.ds||!cv.ds.length||cv.ds[0]!==act)continue;
    if(!an.can&&SK.can[k]&&!SK.can[k].err)an.can=SK.can[k];if(!an.ckp&&SK.ckp[k]&&!SK.ckp[k].err)an.ckp=SK.ckp[k]}}
  if(typeof DXR!=='undefined'&&DXR&&DXR.ok&&DXR.op==='diagnostico'&&(typeof DXR_PG==='undefined'||!DXR_PG||DXR_PG===act))return{H:DXR.hallazgos||[],perfil:DXR.perfil||null,aviso:DXR.aviso||'',an,dx:true};
  if((an.can||an.ckp)&&typeof mdSkills==='function'){const M=[...(an.can?canMedidas(an.can):[]),...(an.ckp?ckpMedidas(an.ckp):[])],sk=mdSkills(M);
    return{H:sk.H,perfil:sk.usadas,aviso:'Posibles causas: confírmalas con las comprobaciones antes de sustituir piezas.',an,dx:true}}
  return{H:[],perfil:null,aviso:'',an,dx:false}}
async function report(){
  if(!window.jspdf)return st('No se pudo cargar el generador de PDF.');
  if(!CH.some(c=>c.x))return st('No hay señales cargadas.');
  const K=$('pdfBg').value==='k',{jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true}),lg=$('logo').src,
    cl=s=>String(s).replace(/∞/g,'inf').replace(/●/g,'-'),
    tc=K?[235,240,248]:[25,25,25],hc=K?[255,255,255]:[20,85,143],mc=K?[160,172,190]:[95,105,120],ok=[34,163,90],bad=[200,45,45],warn=[194,120,0];
  // Open Sans en el PDF (la misma letra que la app y la gráfica); los signos que no tiene se cambian por texto
  if(typeof FONT_OS==='object'){try{doc.addFileToVFS('OS-R.ttf',FONT_OS.r);doc.addFont('OS-R.ttf','OpenSans','normal');doc.addFileToVFS('OS-B.ttf',FONT_OS.b);doc.addFont('OS-B.ttf','OpenSans','bold');doc.setFont('OpenSans','normal')}catch(e){}}
  const B=on=>{try{doc.setFont('OpenSans',on?'bold':'normal')}catch(e){}};
  const pdfTx=x=>String(x).replace(/→/g,'›').replace(/↔/g,'–').replace(/✓/g,'OK').replace(/✗/g,'X').replace(/⚠/g,'!').replace(/▶ ?/g,'').replace(/📖 ?/g,'');
  let page=1;window.PDF_TXT=[];{const _tx=doc.text.bind(doc);doc.text=(t,...a)=>{const v=Array.isArray(t)?t.map(x=>pdfTx(i18(String(x)))):pdfTx(i18(String(t)));PDF_TXT.push(Array.isArray(v)?v.join(' '):v);return _tx(v,...a)}}  // PDF_TXT: el texto del informe (la letra incrustada no deja buscarlo en el archivo)
  const D=pdfDatos(),fecha=new Date().toLocaleString(LANG==='en'?'en-GB':'es-ES');
  const head=()=>{if(K){doc.setFillColor(5,10,19);doc.rect(0,0,297,210,'F');doc.setFillColor(255,255,255);doc.roundedRect(8.5,6.3,36,13.8,2,2,'F')}
    doc.addImage(lg,'JPEG',10,7.5,33,11.4);doc.setTextColor(...hc);doc.setFontSize(15);B(1);doc.text(D.dx?'Informe de diagnóstico':'Informe de señales',50,13.5);B(0);
    doc.setFontSize(8.5);doc.setTextColor(...mc);doc.text('Analyzer Scope · by J.A.Ortúñez y Fran Rosales · '+fecha,50,19);
    doc.setDrawColor(...hc);doc.setLineWidth(.4);doc.line(10,24,287,24);doc.setLineWidth(.2)};
  const foot=()=>{doc.setFontSize(7.5);doc.setTextColor(...mc);doc.text('Ortu & Rosales Automoción · Analyzer Scope '+APP_CFG.ver,10,204);doc.text('Pág. '+page,287,204,{align:'right'})};
  const nueva=()=>{foot();doc.addPage();page++;head()};
  let yy=32;
  const line=(t,sz,colr,ind,neg)=>{doc.setFontSize(sz);const L=doc.splitTextToSize(cl(t),275-(ind||0));if(yy+L.length*sz*.42>198){nueva();yy=32}doc.setTextColor(...colr);B(neg);doc.text(L,10+(ind||0),yy);B(0);yy+=L.length*sz*.42+1.4};
  const zoom=ev=>{const v0={t0:view.t0,span:view.span},m0=typeof MARCA!=='undefined'?MARCA:null,w=Math.max(ev.t1-ev.t0,1e-6),pad=Math.max(w*.6,2e-5);
    view.t0=ev.t0-pad;view.span=w+2*pad;MARCA={t0:ev.t0,t1:ev.t1,txt:ev.txt};draw(K?'dark':'light');const im=cv.toDataURL('image/jpeg',.88);view.t0=v0.t0;view.span=v0.span;MARCA=m0;draw();return im};
  const imgH=(w,maxH)=>{let h=w*cv.height/cv.width;if(h>maxH){h=maxH;w=h*cv.width/cv.height}return[w,h]};
  const evLab=e=>{const m=typeof MEDIDAS!=='undefined'&&MEDIDAS.find(x=>x.id===e.medida);return(typeof mlb==='function'?mlb(e.medida):e.medida)+(e.canal?' · '+e.canal:'')+
    (e.cilindro!=null?(m&&m.por==='unidad'?' · '+i18('unidad')+' 0x'+Number(e.cilindro).toString(16).toUpperCase().padStart(3,'0'):' · '+i18('cilindro')+' '+e.cilindro):'')+': '+(typeof rgNumTxt==='function'?rgNumTxt(e.valor):e.valor)+(m&&m.unidad?' '+m.unidad:'')+' ('+e.condicion+') · '+(e.etiqueta||'Medido')};
  /* 1 · portada: resultado. Se escribe al final, cuando ya se sabe en qué página está cada hallazgo */
  head();const pagHall=[];
  /* 2 · la señal */
  doc.addPage();page++;head();const R=draw(K?'dark':'light'),img=cv.toDataURL('image/jpeg',.9);draw();
  let[w,h]=imgH(277,100);doc.addImage(img,'JPEG',10,30,w,h);
  const fd={usuario:'usuario',bajo:'paso bajo',alto:'paso alto',banda:'ancho de banda'};
  const items=[...CH.filter(c=>c.x&&c.on).map(c=>c.n+(c.p?' ('+c.p+')':'')+' ['+c.u+'] escala '+fmtV(c.vd,c.u)+'/div'+(c.fl!=='off'?' · filtro '+fd[c.fl]+' '+c.f1+(c.fl==='banda'?'-'+c.f2:'')+' Hz':'')+(c.sen?' · sensor ×'+c.sen.k+(c.sen.o?' +'+c.sen.o:''):'')+(c.inv?' · invertido':'')),
    'Vista: '+fmt(view.span,'s')+' desde '+fmt(view.t0,'s')].concat(PG.length>1?['Página '+(pgI+1)+' de '+PG.length+': '+PG[pgI].name]:[])
    .concat(ph.T>0&&ph.on?['Fase: 720° = '+fmt(ph.T,'s')+' ('+Math.round(120/ph.T)+' rpm)']:[])
    .concat(eng.on&&!D.an.can?['Motor: '+eng.n+' cilindros · orden de encendido '+eng.order.join('-')]:[]).concat(eng.on&&!D.an.can?cylData().map(d=>'Orden '+d.j+' · Cil. '+d.cyl+': disparo '+fmt(d.trig,'s')+' · PMS compresión '+fmt(d.tdc,'s')+' ('+d.deg+')'):[])
    .concat(D.H.length?[]:R.map(([k,v])=>k+': '+v));  // medidas genéricas solo si no hay diagnóstico
  const base=30+h+6;let col=0,y=base;doc.setFontSize(8);
  items.forEach(t=>{const L=doc.splitTextToSize(cl(t),88);
    if(y+L.length*4>198){if(col<2){col++;y=base}else{nueva();col=0;y=32}}
    doc.setTextColor(...tc);doc.text(L,10+col*93,y);y+=L.length*4+1});
  const dr=distRows();
  if(dr.length){nueva();
    const c2=document.createElement('canvas');drawDist(c2,K?'dark':'light',760,760);
    doc.addImage(c2.toDataURL('image/png'),'PNG',10,30,160,160);
    doc.setFontSize(13);doc.setTextColor(...hc);B(1);doc.text('Diagrama de distribución',180,40);B(0);
    let y2=50;doc.setFontSize(9);dr.forEach(([k,v])=>{const L=doc.splitTextToSize(cl(k),70);doc.setTextColor(...tc);doc.text(L,180,y2);doc.setTextColor(...hc);doc.text(cl(v),284,y2,{align:'right'});y2+=L.length*4.2+2.5});
    doc.setFontSize(7.5);doc.setTextColor(...mc);doc.text(doc.splitTextToSize('Referencia: la regla PMS marca los 0 grados. AAA y RCE se miden respecto al PMS; AAE y RCA, respecto al PMI. Ángulos siempre positivos.',105),180,y2+4)}
  /* 3 · una página por hallazgo: qué, dónde (imagen ampliada), causas y comprobaciones para rellenar */
  D.H.forEach((x,hi)=>{nueva();yy=32;pagHall.push(page);
    line((hi+1)+'. '+x.sintoma,13,hc,0,1);
    line([x.paquete_nombre,x.fuente&&x.fuente!==x.paquete_nombre?x.fuente:'',x.regla,'confianza '+x.confianza,x.estado==='borrador'?'BORRADOR':''].filter(Boolean).join(' · '),8,mc);
    if(x.criterios){line(x.discrepancia?'Discrepancia entre fuentes:':'Criterios de las fuentes activas:',8.5,hc,0,1);x.criterios.forEach(c=>line((c.cumple?'[cumple] ':'[no cumple] ')+c.paquete+': '+c.condicion+(c.fuente&&c.fuente!==c.paquete?' ('+c.fuente+')':''),8,tc,4))}
    (x.evidencia||[]).forEach(e=>line(evLab(e),9,tc));
    let L=[];if(typeof mdDonde==='function'){for(const r of[D.an.can,D.an.ckp])if(r&&!L.length)L=mdDonde(r,x)}
    const Lt=L.filter(e=>isFinite(e.t0)&&isFinite(e.t1));
    if(L.length)line('Dónde: '+L.map(e=>(isFinite(e.t0)?mdMs(e.t0)+' · ':e.b!=null&&e.b!==''?'búfer '+e.b+' · fila '+e.fila+' · ':'')+e.txt).join('  |  '),8.5,tc,0);
    if(Lt.length){try{const im=zoom(Lt[0]);let[w2,h2]=imgH(180,62);if(yy+h2>196){nueva();yy=32}doc.addImage(im,'JPEG',10,yy,w2,h2);
      doc.setFontSize(7.5);doc.setTextColor(...mc);doc.text(i18('En rojo, el tramo')+': '+Lt[0].txt+' ('+mdMs(Lt[0].t0)+')',10+w2+4,yy+5);yy+=h2+4}catch(e){}}
    if((x.causas||[]).length){line('Posibles causas',9.5,hc,0,1);x.causas.forEach(c=>line('• '+c.texto+' ['+(c.etiqueta||'Inferido')+']'+(c.como_separar?' — '+c.como_separar:''),8.5,tc,3))}
    if((x.comprobaciones||[]).length){line('Comprobaciones (marca y anota el resultado)',9.5,hc,0,1);
      x.comprobaciones.forEach(c=>{if(yy>182){nueva();yy=32}line((c._ok?'[x] ':'[ ] ')+c.orden+'. '+c.texto,9,tc,1,1);
        if(typeof mdCompLineas==='function')mdCompLineas(c).forEach(([k,v])=>line(k+': '+v,8,/mal|wrong/i.test(k)?bad:/bien|right/i.test(k)?ok:mc,9));
        (c.pasos||[]).forEach((p,j)=>line((j+1)+') '+p,8,mc,9));
        line('Resultado: ____________________________________________',8,mc,9);yy+=1})}
    (x.notas_paquete||[]).forEach(n=>line('Nota: '+n.titulo+(n.fuente?' ('+n.fuente+')':''),7.5,mc))});
  /* 4 · tabla por unidad o por cilindro */
  const f2=v=>v==null||!isFinite(v)?'—':(+v).toFixed(2).replace('.',',');
  const tabla=(tit,cab,filas,anch)=>{nueva();yy=32;line(tit,12,hc,0,1);yy+=2;let x0=10;doc.setFontSize(8.5);B(1);doc.setTextColor(...mc);cab.forEach((c,k)=>{doc.text(c,x0,yy);x0+=anch[k]});B(0);yy+=2;doc.setDrawColor(...mc);doc.line(10,yy,10+anch.reduce((a,b)=>a+b,0),yy);yy+=4.5;
    filas.forEach(fl=>{if(yy>196){nueva();yy=32}x0=10;doc.setTextColor(...(fl.mal?bad:tc));fl.c.forEach((c,k)=>{doc.text(String(c),x0,yy);x0+=anch[k]});yy+=5})};
  if(D.an.can){const r=D.an.can,mal=new Set(D.H.flatMap(x=>(x.evidencia||[]).filter(e=>/_unidad/.test(e.medida)&&e.cilindro!=null).map(e=>String(e.cilindro))));
    if(r.deco)tabla('Medidas por unidad (ID) · tabla de decodificación',['ID','Tramas','Máx. (V)','Mín. (V)','Amplitud (V)','Desviación','CRC mal'],r.U.map(u=>({mal:mal.has(String(u.id)),c:[canId(u),u.n,f2(u.mx),f2(u.mn),f2(u.amp),u.desv==null?'—':f2(u.desv)+' %',u.crc||0]})),[34,24,30,30,34,30,26]);
    else if(!r.sin)tabla('Medidas por unidad (ID) · '+(r.rate/1e3)+' kbit/s',['ID','Tramas','Dominante H (V)','Dominante L (V)','Diferencial (V)','Subida (ns)','Sobreosc.','CRC mal'],r.U.map(u=>({mal:mal.has(String(u.id)),c:[canId(u),u.n,f2(u.dH),f2(u.dL),f2(u.dif),u.sube==null?'—':Math.round(u.sube*1e9),u.ov==null?'—':Math.round(u.ov)+' %',u.crc]})),[30,22,34,34,32,28,26,24])}
  if(D.an.ckp&&D.an.ckp.R){const r=D.an.ckp,G=[['est','Estable'],['acel','Aceleración'],['sin','Sin combustión']].filter(g=>r.R[g[0]]),mal=new Set(D.H.flatMap(x=>(x.evidencia||[]).slice(0,1).filter(e=>/^ckp_/.test(e.medida)).map(e=>String(e.cilindro))));
    tabla('Aporte de cada cilindro (% del mejor) · rueda '+r.N+'-'+r.m,['Cilindro',...G.map(g=>g[1]+' ('+r.R[g[0]].rpm+' RPM)')],r.order.slice().sort((a,b)=>a-b).map(c=>({mal:mal.has(String(c)),c:[c,...G.map(g=>r.R[g[0]].pct[c]+' %')]})),[30,...G.map(()=>55)])}
  foot();
  /* portada (página 1), ya con las páginas de cada hallazgo */
  doc.setPage(1);page=1;yy=36;
  line(D.dx?(D.H.length?D.H.length+' '+i18(D.H.length===1?'hallazgo':'hallazgos'):i18('Sin hallazgos: las skills activas no encuentran nada anormal.')):i18('Informe de la señal, sin diagnóstico.'),18,D.H.length?bad:ok,0,1);yy+=2;
  const fl=ficLines();if(fl.length){line('Vehículo y prueba',10,hc,0,1);fl.forEach(t=>line(t,9,tc,3));yy+=2}
  if(D.H.length){line('Resultado',10,hc,0,1);D.H.forEach((x,k)=>line((k+1)+'. '+x.sintoma+' — pág. '+pagHall[k]+(x.estado==='borrador'?' (criterio en borrador)':''),9.5,tc,3));yy+=2}
  if(D.perfil&&D.perfil.length)line('Fuentes de conocimiento activas: '+D.perfil.join(' + '),8.5,mc);
  line('Medido = sale de la captura · Inferido = interpretación de la skill · Teórico = valor de referencia.',8,mc);
  if(D.aviso)line(D.aviso,8,mc);
  line('Contenido: pág. 2 la señal'+(dr.length?' · diagrama de distribución':'')+(D.H.length?' · una página por hallazgo con dónde está y sus comprobaciones':'')+(D.an.can||(D.an.ckp&&D.an.ckp.R)?' · tabla por unidad o cilindro':'')+'.',8,mc);
  foot();
  await saveFile('informe_osciloscopio.pdf',doc.output('blob'));
}
$('tPh').onclick=()=>{ph.on=!ph.on;sync();draw()};
$('tPmi').onclick=()=>{pmi.on=!pmi.on;if(pmi.on&&pmi.t==null){const p0=pms.t!=null?pms.t:view.t0+view.span/2;pmi.t=ph.T>0?p0+ph.T/4:p0}sync();draw();if(typeof distTab==='function'&&curTab==='D')distTab()};
$('tPms').onclick=()=>{pms.on=!pms.on;if(pms.on&&pms.t==null)pms.t=view.t0+view.span/2;sync();draw()};
$('tT').onclick=()=>{tr.on=!tr.on;if(tr.on){if(cur.a==null)cur.a=view.t0+view.span/3;if(cur.b==null)cur.b=view.t0+view.span*2/3}sync();draw()};
$('tT2').onclick=()=>{tr2.on=!tr2.on;if(tr2.on){if(cur.c==null)cur.c=view.t0+view.span*.55;if(cur.d==null)cur.d=view.t0+view.span*.8}sync();draw()};
$('tAmp').onclick=()=>{amp.on=!amp.on;sync();draw()};
$('bPdf').onclick=report;
$('rpm').oninput=()=>{const r=+$('rpm').value;if(r>0){ph.T=120/r;ph.auto=false;if(ph.t0==null)ph.t0=view.t0;draw()}};
$('bO').onclick=()=>{if(cur.a==null)return st('Activa «Reglas T1/T2» y coloca T1 (clic en la señal).');ph.t0=cur.a;ph.auto=false;if(!(ph.T>0))ph.T=view.span;draw()};
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
  if(adv.on)advInit();advUI();sync();draw()};
/* sección «Avance»: elegir qué reglas existen (encendido, y una o dos inyecciones) las crea respecto al PMS */
['avE','avI','avN'].forEach(id=>$(id).onchange=()=>{adv.e=$('avE').checked;adv.n=$('avI').checked?+$('avN').value:0;
  if(ph.T>0){if(adv.e||adv.n){adv.on=true;advInit()}else adv.on=false}advUI();sync();draw();if(!$('viewD').hidden)distTab()});
advUI();
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
