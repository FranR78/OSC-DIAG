/* ---------- Usabilidad: deshacer/rehacer, atajos de teclado y guía de primer uso ---------- */
/* Historial: una foto de los ajustes (escalas, vista, reglas, cilindros, anotaciones) cada vez que la pantalla se queda quieta */
const HI={s:[],i:-1,t:0,busy:false};
const hSnap=()=>{const o=cfgOf(CH);delete o.fic;return JSON.stringify(o)};
function hPush(){HI.t=0;if(HI.busy||!CH.some(c=>c.x))return;const s=hSnap();if(s===HI.s[HI.i])return;HI.s.length=HI.i+1;HI.s.push(s);if(HI.s.length>60)HI.s.shift();HI.i=HI.s.length-1}
function hTouch(){if(HI.busy)return;clearTimeout(HI.t);HI.t=setTimeout(hPush,350)}
function hGo(d){if(HI.t){clearTimeout(HI.t);hPush()}const n=HI.i+d;if(n<0||n>=HI.s.length)return st(d<0?'Nada que deshacer.':'Nada que rehacer.');
  HI.busy=true;try{applyCfg(JSON.parse(HI.s[n]));HI.i=n;ui();sync();draw()}finally{HI.busy=false}st(d<0?'Deshecho.':'Rehecho.')}
{const d=draw;draw=function(...a){const r=d(...a);hTouch();return r};
 const s=showPage;showPage=function(i){clearTimeout(HI.t);HI.s=[];HI.i=-1;s(i)}}
/* Atajos */
const kbOpen=o=>{$('kb').hidden=!o;if(o)$('kbX').focus()};
addEventListener('keydown',e=>{
  const t=e.target,k=e.key;if(t&&t.closest&&t.closest('input,select,textarea,[contenteditable]'))return;if(!$('fic').hidden)return;
  if(!$('kb').hidden){if(k==='Escape'||k==='?')kbOpen(false);return}
  if((e.ctrlKey||e.metaKey)&&(k==='z'||k==='Z'||k==='y')){e.preventDefault();hGo(k==='y'||e.shiftKey?1:-1);return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(k==='?'){kbOpen(true);return}
  if(curTab!=='S')return;const has=CH.some(c=>c.x);
  if(k==='f'||k==='F'){if(has)ficOpen();return}
  if(!has)return;let ok=true;
  if(k==='ArrowLeft'||k==='ArrowRight'){view.t0+=(k==='ArrowLeft'?-1:1)*view.span*(e.shiftKey?.5:.1);draw()}
  else if(k==='+'||k==='='||k==='-'){const f=k==='-'?1.25:.8,c=view.t0+view.span/2;view.span*=f;view.t0=c-view.span/2;draw()}
  else if(k==='0'||k==='Home')$('bFit').click();
  else if(k==='PageUp')showPage(pgI-1);else if(k==='PageDown')showPage(pgI+1);
  else if(k>='1'&&k<='8'){const i=+k-1;if(CH[i].x){if(isFix()){sel=i;ui();draw()}else chipClick(i)}}
  else if(k==='r'||k==='R')$('tT').click();else if(k==='c'||k==='C')$('tGr').click();else if(k==='a'||k==='A')$('tAn').click();
  else ok=false;
  if(ok)e.preventDefault()});
$('kbX').onclick=()=>kbOpen(false);$('bKb').onclick=()=>{closePops();kbOpen(true)};
$('kb').addEventListener('pointerdown',e=>{if(e.target===$('kb'))kbOpen(false)});
/* Guía de primer uso (3 pasos, solo en la vista nueva; se puede repetir desde ☰) */
const GD=[['#bOpen','1 · Abre tu captura','Arrastra un CSV sobre la gráfica o pulsa «Abrir archivos…». Si no tienes ninguno a mano, prueba con «Ver un ejemplo».'],
  ['#chips','2 · Cada canal es una pastilla','Púlsala para cambiar la escala, la posición, el filtro o el nombre. Se recoge sola al pulsar fuera.'],
  ['#gRu','3 · Mide, anota y exporta','«Reglas» y «Motor» miden; «Anotar» dibuja sobre la señal; «Exportar» crea el informe PDF. Pulsa ? para ver los atajos de teclado.']];
let gdI=-1;
function gdShow(i){document.querySelectorAll('.gdT').forEach(e=>e.classList.remove('gdT'));gdI=i;
  if(i<0||i>=GD.length){$('gd').hidden=true;gdI=-1;LS.set('as_guia','1');return}
  const[s,t,p]=GD[i];document.querySelector(s).classList.add('gdT');$('gdT').textContent=t;$('gdP').textContent=p;$('gdN').textContent=(i+1)+' / '+GD.length;
  $('gdG').textContent=i===GD.length-1?'Entendido':'Siguiente';$('gd').hidden=false}
$('gdG').onclick=()=>gdShow(gdI+1);$('gdS').onclick=()=>gdShow(-1);$('bGd').onclick=()=>{closePops();gdShow(0)};
{const g=setLang;setLang=function(l){g(l);if(gdI>=0)gdShow(gdI)}}
if(!isFix()&&!LS.get('as_guia'))gdShow(0);
