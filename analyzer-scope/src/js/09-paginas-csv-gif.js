/* ---------- Páginas, unión de CSV y GIF ---------- */
let PG=[],pgI=0,viewSet=false,curTab='S',QF=[],lastGif=null,gTouched=false;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tick=()=>new Promise(r=>setTimeout(r,20));
const fst=m=>{$('fSt').textContent=m};
function splitBlocks(txt){
  const L=txt.split(/\r?\n/),num=s=>/^[+-]?(\d+[.,]?\d*|[.,]\d+)([eE][+-]?\d+)?$/.test(s.trim().replace(/^"|"$/g,''));
  const isD=l=>{if(!l.trim())return null;const d=l.includes(';')?';':l.includes('\t')?'\t':',',c=l.split(d);return c.length>=2&&c.every(num)};
  const st0=[0];let seen=false,hdr=true;
  for(let i=0;i<L.length;i++){const t=isD(L[i]);if(t===null)continue;
    if(t){seen=true;hdr=false}else if(seen&&!hdr){st0.push(i);hdr=true;seen=false}}
  if(st0.length<2)return[txt];
  return st0.map((a,k)=>L.slice(a,st0[k+1]).join('\n'));
}
function parseAny(text,name){
  let cfg=null;const m=/^\uFEFF?#analyzer-scope-ajustes;([^\r\n]*)\r?\n/.exec(text);
  if(m){try{cfg=JSON.parse(m[1])}catch(e){}text=text.slice(m[0].length)}
  const blocks=text.length<30e6?splitBlocks(text):[text],res=[];let err=null;
  blocks.forEach((b,i)=>{try{const r=parseText(b);res.push({name:name+(blocks.length>1?' · bloque '+(i+1):''),chs:r.chs,n:r.n,meta:r.meta,cfg:i===0?cfg:null})}catch(e){err=err||e}});
  if(!res.length)throw err||new Error('archivo vacío');return res;
}
/* ---- páginas ---- */
function addPages(list){const first=PG.length;list.forEach(d=>PG.push(d));CH.forEach(c=>{c._set=false});viewSet=false;showPage(first)}
function showPage(i){
  if(!PG.length)return;i=Math.max(0,Math.min(PG.length-1,i));pgI=i;const p=PG[i];
  CH.forEach((c,k)=>{const d=p.chs[k];
    if(d){Object.assign(c,{n:d.n,u:d.u||'V',x:d.x,y0:d.y,y:d.y,on:true});proc(c);if(!c._set){c.h=null;autoCh(k);c._set=true}}
    else{c.x=c.y=c.y0=null;c.on=false;c._set=false}});
  if(!viewSet){fit();viewSet=true}
  if(p.cfg&&!p.cfgOk){p.cfgOk=true;applyCfg(p.cfg)}
  ui();sync();draw();updPager();
}
function updPager(){
  const N=PG.length;$('pgbar').hidden=N<2;$('pgR').max=Math.max(1,N);$('pgR').value=pgI+1;
  $('pgL').textContent=(pgI+1)+' / '+N;$('pgNm').textContent=PG[pgI]?PG[pgI].name:'';
  $('gA').max=$('gB').max=Math.max(1,N);if(!gTouched||+$('gB').value>N)$('gB').value=N;if(+$('gA').value>N)$('gA').value=1;
  $('gInfo').textContent=N?N+' página(s) cargada(s). Elige el rango y crea el GIF.':'No hay páginas cargadas: añade archivos en «Unir y convertir CSV» o con «Abrir archivos…».';
}
async function loadFiles(files){
  const msg=[],pages=[],asCh=$('fmode').value==='channels';
  for(const f of files){
    try{
      const head=new Uint8Array(await f.slice(0,4).arrayBuffer());
      if(String.fromCharCode(...head)==='JWWD'){msg.push(f.name+': .psdata nativo (formato propietario cifrado/comprimido): no se puede leer aquí. Expórtalo a CSV desde el programa de tu osciloscopio y ábrelo aquí.');continue}
      const h2=await f.slice(0,80).text();if(h2.includes('ortu-psdata')){st('Leyendo sesión…');msg.push(await importSession(f));continue}
      st('Leyendo '+f.name+'…');await new Promise(q=>setTimeout(q,30));
      const ds=parseAny(await f.text(),f.name);ds.forEach(d=>pages.push(d));
      msg.push(f.name+': '+ds.map(d=>d.chs.length+' canal(es), '+d.n+' muestras').join(' | ')+(ds.length>1?' ('+ds.length+' páginas)':'')+(ds[0].cfg?' · ajustes recuperados':''));
    }catch(e){msg.push(f.name+': '+e.message)}
  }
  if(pages.length){
    if(asCh){let slot=CH.findIndex(c=>!c.x);
      pages.forEach(p=>p.chs.forEach(c=>{if(slot<0||slot>7){msg.push('Más de 8 canales: se omite '+c.n);return}
        Object.assign(CH[slot],{n:c.n,x:c.x,y:c.y,y0:c.y,on:true,u:c.u||'V',fl:'off',inv:false,f1:500,f2:1000});autoCh(slot);slot=CH.findIndex(q=>!q.x)}));
      fit();ui();sync();draw()}
    else addPages(pages)}
  st(msg.join(' | ')+(pages.length>1&&!asCh?' · usa el cursor de páginas para recorrerlas':''));
}
/* ---- archivos: lista, unión y conversión ---- */
async function fAddFiles(files){
  for(const f of files){const q={f,name:f.name};
    try{fst('Leyendo '+f.name+'…');await tick();q.ds=parseAny(await f.text(),f.name)}catch(e){q.err=e.message}
    QF.push(q)}
  fRender();fst(QF.length+' archivo(s) en la lista, en orden de carga.');
}
function fRender(){
  $('fList').innerHTML=QF.map((q,i)=>'<li><b>'+esc(q.name)+'</b> — '+(q.err?'<span style="color:#ff8a8a">'+esc(q.err)+'</span>':q.ds.map(d=>d.chs.length+' canal(es) · '+d.n+' muestras · '+fmt(d.chs[0].x[d.n-1]-d.chs[0].x[0],'s')).join(' | '))+'<button data-i="'+i+'" title="Quitar de la lista">✕</button></li>').join('')||'<li style="list-style:none;color:var(--mu)">Aún no hay archivos.</li>';
}
function mergeDS(list){
  const nc=Math.min(...list.map(d=>d.chs.length));let tot=0;list.forEach(d=>{tot+=d.chs[0].x.length});
  const X=new Float64Array(tot),Y=Array.from({length:nc},()=>new Float32Array(tot));let pos=0,cur=0;
  list.forEach(d=>{const x=d.chs[0].x,n=x.length,dt=n>1?(x[n-1]-x[0])/(n-1):0;
    for(let i=0;i<n;i++)X[pos+i]=cur+(x[i]-x[0]);
    for(let k=0;k<nc;k++)Y[k].set(d.chs[k].y.length>n?d.chs[k].y.subarray(0,n):d.chs[k].y,pos);
    pos+=n;cur+=(n>1?x[n-1]-x[0]:0)+dt});
  return{chs:Y.map((y,k)=>({n:list[0].chs[k].n,u:list[0].chs[k].u,x:X,y})),n:tot};
}
function toCsvBlob(ds){
  const chs=ds.chs,n=chs[0].x.length,nf=v=>(+v).toFixed(8).replace('.',','),parts=[];
  parts.push(i18('Tiempo')+';'+chs.map(c=>String(c.n||'CH').replace(/;/g,',')).join(';')+'\r\n(ms);'+chs.map(c=>'('+(c.u||'V')+')').join(';')+'\r\n\r\n');
  let buf=[];for(let i=0;i<n;i++){buf.push(nf(chs[0].x[i]*1000)+';'+chs.map(c=>nf(c.y[i])).join(';'));if(buf.length>=5000){parts.push(buf.join('\r\n')+'\r\n');buf=[]}}
  if(buf.length)parts.push(buf.join('\r\n')+'\r\n');return new Blob(parts,{type:'text/csv'});
}
async function fMerge(){
  const ok=QF.filter(q=>q.ds&&q.ds.length);if(ok.length<2)return fst('Añade al menos dos archivos para unirlos.');
  const list=[];ok.forEach(q=>q.ds.forEach(d=>list.push(d)));const nc=new Set(list.map(d=>d.chs.length)).size;
  const m=mergeDS(list);
  await saveFile('unido.csv',toCsvBlob(m));
  fst('Unidos '+ok.length+' archivo(s) en orden de carga: '+m.n+' muestras, '+m.chs.length+' canal(es)'+(nc>1?' (los archivos tenían distinto nº de canales: se usan los '+m.chs.length+' primeros)':'')+'. Guardado como unido.csv.');
  if($('fLoadM').checked){addPages([{name:'Unido ('+ok.length+' archivos)',chs:m.chs,n:m.n,meta:{}}]);showTab('S')}
}
async function fConv(){
  const ok=QF.filter(q=>q.ds&&q.ds.length);if(!ok.length)return fst('No hay archivos válidos en la lista.');let n=0;
  for(const q of ok){const base=q.name.replace(/\.[^.]+$/,'');
    for(let j=0;j<q.ds.length;j++){await saveFile(base+(q.ds.length>1?'_'+(j+1):'')+'.csv',toCsvBlob(q.ds[j]));n++}}
  fst(n+' archivo(s) CSV generado(s).');
}
/* ---- GIF ---- */
function lzw(px){
  const clear=256,eoi=257;let next=258,size=9,tab=new Map(),out=[],cur=0,sh=0;
  const emit=c=>{cur|=c<<sh;sh+=size;while(sh>=8){out.push(cur&255);cur>>>=8;sh-=8}};
  emit(clear);let ib=px[0];
  for(let i=1;i<px.length;i++){const k=px[i],key=(ib<<8)|k,v=tab.get(key);
    if(v===undefined){emit(ib);
      if(next===4096){emit(clear);next=258;size=9;tab=new Map()}
      else{if(next>=(1<<size))size++;tab.set(key,next++)}
      ib=k}
    else ib=v}
  emit(ib);emit(eoi);if(sh>0)out.push(cur&255);return out;
}
const QR=new Uint8Array(256),QG=new Uint8Array(256);for(let v=0;v<256;v++){QR[v]=Math.round(v*5/255);QG[v]=Math.round(v*6/255)}
function quant(f){const d=f.data,n=f.width*f.height,px=new Uint8Array(n);for(let i=0,j=0;i<n;i++,j+=4)px[i]=QR[d[j]]*42+QG[d[j+1]]*6+QR[d[j+2]];return px}
function gifEncode(fr,delay,loop){
  const w=fr[0].width,h=fr[0].height,o=[],b2=n=>o.push(n&255,(n>>8)&255);
  for(const ch of 'GIF89a')o.push(ch.charCodeAt(0));b2(w);b2(h);o.push(0xF7,0,0);
  for(let r=0;r<6;r++)for(let g=0;g<7;g++)for(let b=0;b<6;b++)o.push(Math.round(r*51),Math.round(g*255/6),Math.round(b*51));
  while(o.length<13+768)o.push(0);
  if(loop){o.push(0x21,0xFF,0x0B);for(const ch of 'NETSCAPE2.0')o.push(ch.charCodeAt(0));o.push(3,1,0,0,0)}
  const d=Math.max(2,Math.round(delay/10));
  fr.forEach(f=>{const codes=lzw(quant(f));
    o.push(0x21,0xF9,4,0,d&255,(d>>8)&255,0,0,0x2C);b2(0);b2(0);b2(w);b2(h);o.push(0,8);
    for(let i=0;i<codes.length;i+=255){const n=Math.min(255,codes.length-i);o.push(n);for(let k=0;k<n;k++)o.push(codes[i+k])}
    o.push(0)});
  o.push(0x3B);return new Uint8Array(o);
}
const gst=m=>{$('gSt').textContent=m};
async function makeGif(){
  const N=PG.length;if(!N)return gst('No hay páginas cargadas: añade archivos en «Unir y convertir CSV» o con «Abrir archivos…».');
  let a=Math.max(1,Math.min(N,+$('gA').value||1)),b=Math.max(1,Math.min(N,+$('gB').value||N));if(a>b)[a,b]=[b,a];
  const W=+$('gW').value||800,th=$('gT').value||'dark',delay=+$('gD').value||600,loop=$('gL').checked,keep=pgI,was=curTab,fr=[];
  $('gMk').disabled=true;showTab('S');await tick();
  try{
    for(let p=a;p<=b;p++){showPage(p-1);gst('Capturando la página '+p+' ('+(p-a+1)+' de '+(b-a+1)+')…');draw(th);await tick();
      const H=Math.round(W*cv.height/cv.width),oc=document.createElement('canvas');oc.width=W;oc.height=H;const o=oc.getContext('2d');
      o.drawImage(cv,0,0,W,H);o.font='bold 13px system-ui';const lab=i18('Pág. ')+p+' / '+N+' · '+PG[p-1].name,tw=o.measureText(lab).width;
      o.fillStyle=th==='light'?'rgba(255,255,255,.9)':'rgba(5,10,20,.85)';o.fillRect(6,H-26,tw+14,20);o.fillStyle=th==='light'?'#1b2430':'#ffd24d';o.fillText(lab,13,H-12);
      fr.push(o.getImageData(0,0,W,H))}
    gst('Codificando el GIF ('+fr.length+' imágenes)…');await tick();
    const bytes=gifEncode(fr,delay,loop);lastGif=new Blob([bytes],{type:'image/gif'});
    let s='';for(let i=0;i<bytes.length;i+=30000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+30000));
    $('gImg').src='data:image/gif;base64,'+btoa(s);$('gImg').style.display='block';$('gDl').disabled=false;
    gst('GIF creado: páginas '+a+' – '+b+' ('+fr.length+' imágenes, '+(bytes.length/1024).toFixed(0)+' KB). Pulsa «Descargar GIF».');
  }catch(e){gst('No se pudo crear el GIF: '+e.message)}
  showPage(keep);$('gMk').disabled=false;showTab(was);
}
function showTab(t){curTab=t;['S','D','F','G','I','O'].forEach(k=>{$('view'+k).hidden=t!==k;$('tab'+k).classList.toggle('on',t===k)});if(t==='D')distTab();else if(t==='S')draw();else if(t==='F')fRender();else if(t==='G')updPager();else renderDocs()}
/* ---- cableado ---- */
$('tabF').onclick=()=>showTab('F');$('tabG').onclick=()=>showTab('G');$('tabI').onclick=()=>showTab('I');$('tabO').onclick=()=>showTab('O');
$('pgR').oninput=()=>showPage(+$('pgR').value-1);$('pgP').onclick=()=>showPage(pgI-1);$('pgN').onclick=()=>showPage(pgI+1);
$('fAdd').onclick=()=>$('fIn').click();$('fIn').onchange=e=>{fAddFiles([...e.target.files]);e.target.value=''};
$('fdrop').ondragover=e=>{e.preventDefault();$('fdrop').classList.add('on')};$('fdrop').ondragleave=()=>$('fdrop').classList.remove('on');
$('fdrop').ondrop=e=>{e.preventDefault();e.stopPropagation();$('fdrop').classList.remove('on');fAddFiles([...e.dataTransfer.files])};
$('fList').onclick=e=>{const i=e.target&&e.target.dataset?e.target.dataset.i:null;if(i!=null){QF.splice(+i,1);fRender()}};
$('fClr').onclick=()=>{QF=[];fRender();fst('')};
$('fMerge').onclick=fMerge;$('fConv').onclick=fConv;
$('fPages').onclick=()=>{const l=[];QF.forEach(q=>q.ds&&q.ds.forEach(d=>l.push(d)));if(!l.length)return fst('No hay archivos válidos en la lista.');addPages(l);showTab('S')};
$('gA').onchange=$('gB').onchange=()=>{gTouched=true};
$('gMk').onclick=makeGif;$('gDl').onclick=()=>{if(lastGif)saveFile('capturas.gif',lastGif)};

