/* ---------- Portada (primera visita) con demo en vivo y caso real paso a paso ---------- */
/* Caso real: recorre una captura incluida en la app usando las herramientas de verdad (no afirma ningún diagnóstico) */
const csOn=id=>{if(!$(id).classList.contains('on'))$(id).click()};
let csAnn=false;
const CASE=[
  ['#chips','Caso real · La captura','Es una captura real de un Seat Altea (PMS e inyector 1) con tres canales. Cada pastilla es un canal: púlsala para ver su escala.',()=>{}],
  ['#cv','Caso real · El ciclo de 720°','Las marcas INICIO y FIN delimitan un ciclo completo del motor. Arrástralas para ajustarlo a tu señal.',()=>{csOn('tPh')}],
  ['#gMo','Caso real · Los cilindros','Con «Cilindros» activado se ven los cuatro tiempos de cada cilindro, según el orden de encendido.',()=>{csOn('tGr')}],
  ['#gRu','Caso real · Medir','Las reglas T1 y T2 miden el tiempo entre dos puntos. La lectura aparece debajo de la gráfica.',()=>{csOn('tT');cur.a=view.t0+view.span*.27;cur.b=view.t0+view.span*.34;draw()}],
  ['#tAn','Caso real · Anotar','Marca lo que quieras comentar: flechas, círculos y texto quedan sobre la señal.',()=>{if(csAnn)return;csAnn=true;const t=u=>view.t0+view.span*u;
    ann.vis=true;ann.list.push({k:'ell',col:'#ffd24d',w:2,x1:t(.265),y1:.26,x2:t(.345),y2:.66},{k:'text',col:'#ffd24d',w:2,x1:t(.36),y1:.31,txt:i18('Revisar este pulso')});draw()}],
  ['#gEx','Caso real · El informe','«Informe PDF» guarda la gráfica con las reglas, los cilindros y tus anotaciones.',()=>{}]];
async function caseStart(){
  closePops();if(isFix())setUI('new');if(curTab!=='S')showTab('S');csAnn=false;
  $('ex').value='0';ficSkip=true;const e=EJEMPLOS[0];if(!e)return;await loadFiles([new File([e.txt],e.name+'.csv',{type:'text/csv'})]);
  GDL=CASE;gdShow(0);
}
/* Demo de la portada: la captura de ejemplo se dibuja sola, de izquierda a derecha */
let ldRaf=0;
function ldDemo(){
  const c=$('ldCv'),e=EJEMPLOS[0];if(!e)return;let d;try{d=parseText(e.txt)}catch(x){return}
  $('ldCap').textContent='Captura real: '+e.name;
  const r=c.getBoundingClientRect(),dp=devicePixelRatio||1,W=Math.max(200,r.width),Hh=Math.max(140,r.height);c.width=W*dp;c.height=Hh*dp;const g2=c.getContext('2d');g2.setTransform(dp,0,0,dp,0,0);
  const chs=d.chs.slice(0,4),lane=Hh/chs.length,cols=chs.map((ch,k)=>{let mn=Infinity,mx=-Infinity;for(const v of ch.y){if(v<mn)mn=v;if(v>mx)mx=v}const sp=mx-mn||1,n=ch.y.length,a=[];
    for(let p=0;p<W;p++){const i0=Math.floor(p*n/W),i1=Math.max(i0+1,Math.floor((p+1)*n/W));let lo=Infinity,hi=-Infinity;for(let i=i0;i<i1&&i<n;i++){const v=ch.y[i];if(v<lo)lo=v;if(v>hi)hi=v}
      const y=v=>k*lane+lane*.86-(v-mn)/sp*lane*.72;a.push([y(hi),y(lo)])}return a});
  const light=BD.classList.contains('light'),still=matchMedia('(prefers-reduced-motion:reduce)').matches;let t0=0;
  const frame=ts=>{if($('land').hidden)return;if(!t0)t0=ts;const u=still?1:Math.min(1,((ts-t0)%6500)/4200),xe=Math.round(u*W);
    g2.clearRect(0,0,W,Hh);g2.strokeStyle=light?'rgba(20,85,143,.12)':'rgba(160,190,230,.10)';g2.lineWidth=1;g2.beginPath();
    for(let i=1;i<10;i++){const x=Math.round(i*W/10)+.5;g2.moveTo(x,0);g2.lineTo(x,Hh)}for(let i=1;i<6;i++){const y=Math.round(i*Hh/6)+.5;g2.moveTo(0,y);g2.lineTo(W,y)}g2.stroke();
    cols.forEach((a,k)=>{g2.strokeStyle=COL[k];g2.lineWidth=1.5;g2.lineJoin='round';g2.beginPath();for(let p=0;p<xe;p++){const[y1,y2]=a[p];p?g2.lineTo(p,y1):g2.moveTo(p,y1);if(y2-y1>1)g2.lineTo(p,y2)}g2.stroke()});
    if(u<1){g2.strokeStyle=light?'#1f6fb5':'#ffd24d';g2.beginPath();g2.moveTo(xe+.5,0);g2.lineTo(xe+.5,Hh);g2.stroke()}
    if(!still)ldRaf=requestAnimationFrame(frame)};
  cancelAnimationFrame(ldRaf);ldRaf=requestAnimationFrame(frame);
}
function landShow(o){$('land').hidden=!o;if(o){closePops();ldDemo()}else{cancelAnimationFrame(ldRaf);LS.set('as_portada','1');draw()}}
const landOut=()=>{landShow(false);if(!isFix()&&!LS.get('as_guia')&&gdI<0){GDL=GD;gdShow(0)}};
$('ldIn').onclick=landOut;
$('ldOp').onclick=()=>{landShow(false);$('fi').click()};
$('ldCs').onclick=()=>{landShow(false);caseStart()};
$('bLd').onclick=()=>landShow(true);$('bCs').onclick=caseStart;
$('ldES').onclick=()=>setLang('es');$('ldEN').onclick=()=>setLang('en');
{const g=setLang;setLang=function(l){g(l);$('ldES').classList.toggle('on',l==='es');$('ldEN').classList.toggle('on',l==='en');if(!$('land').hidden)ldDemo()}}
$('land').addEventListener('keydown',e=>{if(e.key==='Escape')landOut()});
addEventListener('resize',()=>{if(!$('land').hidden)ldDemo()});
if(!isFix()&&!LS.get('as_portada'))landShow(true);else if(!isFix()&&!LS.get('as_guia'))gdShow(0);
