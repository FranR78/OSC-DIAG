/* ---------- Canales matemáticos (plantillas de un botón) ---------- */
// c.m = {k, a, b, f, o, u, z}: plantilla, canales de origen (índices), factor, desplazamiento, unidad, dientes
const MK={
  freq:{n:1,t:'Frecuencia · señal digital → analógica (MAF, MAP de frecuencia)',s:1},
  rpm:{n:1,t:'RPM desde el sensor de cigüeñal'},
  duty:{n:1,t:'Ciclo útil (%)'},
  can:{n:2,t:'CAN · CAN-H − CAN-L'},
  sub:{n:2,t:'A − B'},add:{n:2,t:'A + B'},mul:{n:2,t:'A × B'},
  scale:{n:1,t:'Escala · A × factor + desplazamiento',s:1}};
const MH={
  freq:'Mide el tiempo entre flancos de subida y da la frecuencia instantánea: la curva sigue al caudal o a la presión, como si midieras con transductor. Si conoces la curva del sensor, valor = Hz × factor + desplazamiento (si no, deja Hz).',
  rpm:'Mide el tiempo entre dientes y da las rpm instantáneas. El hueco de la rueda (60-2, 36-1…) se detecta solo y no produce caídas falsas.',
  duty:'Porcentaje del periodo en que la señal está en nivel alto, periodo a periodo.',
  can:'Diferencia CAN-H − CAN-L. Referencia CAN de alta velocidad: dominante 1,5–3 V (≈2 V) y recesivo −0,5–0,05 V (≈0 V). El diferencial indica si el bus falla; para localizar la unidad mide la terminación (≈60 Ω) o desconecta unidades.',
  sub:'Resta punto a punto (B se ajusta a la base de tiempos de A).',add:'Suma punto a punto (B se ajusta a la base de tiempos de A).',mul:'Producto punto a punto, p. ej. tensión × corriente = potencia.',
  scale:'Convierte con la sensibilidad de la pinza o del transductor: p. ej. pinza 100 mV/A → factor 10, unidad A.'};
const mNm={freq:a=>'f('+a+')',rpm:a=>'RPM('+a+')',duty:a=>'DC%('+a+')',can:(a,b)=>'CAN '+a+'−'+b,sub:(a,b)=>a+'−'+b,add:(a,b)=>a+'+'+b,mul:(a,b)=>a+'×'+b,scale:a=>'k·'+a};
const _proc=proc,_ui=ui;
proc=function(c){_proc(c);if(c.m||proc.busy)return;proc.busy=1;try{CH.forEach((d,i)=>{if(d.m&&(CH[d.m.a]===c||CH[d.m.b]===c))mathCalc(i)})}finally{proc.busy=0}};
ui=function(){_ui();fillMath()};
/* flancos con histéresis (umbral = mitad entre los percentiles 5 y 95) */
function mEdges(x,y){
  const n=y.length;if(n<4)return null;const s=Float32Array.from(y).sort(),lo=s[Math.floor(n*.05)],hi=s[Math.floor(n*.95)];
  if(!(hi-lo>0))return null;const th=(lo+hi)/2,h=(hi-lo)*.1,r=[],f=[];
  const at=(i,up)=>{let j=i;while(j>1&&(up?y[j-1]>th:y[j-1]<th))j--;const a=y[j-1],b=y[j],u=b!==a?(th-a)/(b-a):0;return x[j-1]+(x[j]-x[j-1])*Math.min(1,Math.max(0,u))};
  let hiS=y[0]>th;
  for(let i=1;i<n;i++){const v=y[i];if(!hiS&&v>th+h){hiS=true;r.push(at(i,true))}else if(hiS&&v<th-h){hiS=false;f.push(at(i,false))}}
  return{r,f};
}
function mResamp(px,py,x){const n=x.length,y=new Float32Array(n);if(!px.length)return y;let k=0;
  for(let i=0;i<n;i++){const t=x[i];while(k<px.length-2&&px[k+1]<t)k++;
    y[i]=t<=px[0]?py[0]:t>=px[px.length-1]?py[py.length-1]:py[k]+(py[k+1]-py[k])*(t-px[k])/(px[k+1]-px[k])}return y}
const mAt=(c,x)=>{if(c.x===x||c.x.length===x.length)return c.y;const y=new Float32Array(x.length);for(let i=0;i<x.length;i++){const j=Math.min(c.x.length-1,lb(c.x,x[i]));y[i]=c.y[j]}return y};
function mathCalc(i){
  const c=CH[i],m=c.m,A=CH[m.a],B=m.b!=null?CH[m.b]:null;c.mi='';
  if(!A||!A.y||(MK[m.k].n>1&&(!B||!B.y))){c.x=c.y=c.y0=null;return false}
  const x=A.x,n=x.length,ya=A.y;let y=new Float32Array(n),u=A.u||'V';
  if(m.k==='freq'||m.k==='rpm'||m.k==='duty'){
    const e=mEdges(x,ya);if(!e||e.r.length<3){c.mi='sin flancos suficientes';c.x=c.y=c.y0=null;return false}
    const r=e.r,px=[],py=[];
    if(m.k==='duty'){let j=0;for(let k=1;k<r.length;k++){while(j<e.f.length&&e.f[j]<=r[k-1])j++;if(j<e.f.length&&e.f[j]<r[k]){px.push((r[k-1]+r[k])/2);py.push((e.f[j]-r[k-1])/(r[k]-r[k-1])*100)}}u='%'}
    else{let prev=null;
      for(let k=1;k<r.length;k++){let d=r[k]-r[k-1];
        if(m.k==='rpm'&&prev&&d>1.6*prev){const q=Math.round(d/prev);d/=q}   // hueco de la rueda fónica
        prev=d;px.push((r[k-1]+r[k])/2);py.push(m.k==='rpm'?60/((m.z||60)*d):1/d)}
      u=m.k==='rpm'?'rpm':'Hz'}
    y=mResamp(px,py,x);
  }else if(m.k==='scale'){for(let k=0;k<n;k++)y[k]=ya[k]}
  else{const yb=mAt(B,x);
    for(let k=0;k<n;k++)y[k]=m.k==='mul'?ya[k]*yb[k]:m.k==='add'?ya[k]+yb[k]:ya[k]-yb[k];
    u=m.k==='mul'?(A.u||'V')+'·'+(B.u||'V'):A.u===B.u?A.u:(A.u||'V');
    if(m.k==='can'){let dm=[],rc=[];for(let k=0;k<n;k++){const v=y[k];if(v>.9)dm.push(v);else if(v<.5)rc.push(v)}
      const med=a=>{if(!a.length)return null;const s=Float32Array.from(a).sort();return s[s.length>>1]},bad=(a,l,h)=>a.length?a.filter(v=>v<l||v>h).length/a.length*100:0;
      const md=med(dm),mr=med(rc),bd=bad(dm,1.5,3),br=bad(rc,-.5,.05);
      c.mi=(md==null?'sin nivel dominante (bus en reposo o sin señal)':'dominante '+md.toFixed(2)+' V ('+bd.toFixed(0)+' % fuera de 1,5–3 V)')+' · '+(mr==null?'sin nivel recesivo':'recesivo '+mr.toFixed(2)+' V ('+br.toFixed(0)+' % fuera de −0,5–0,05 V)')+((bd>5||br>5||md==null||mr==null)?' ⚠':' ✓')}}
  if(MK[m.k].s){const f=+m.f||1,o=+m.o||0;if(f!==1||o!==0){for(let k=0;k<n;k++)y[k]=y[k]*f+o}if(m.u)u=m.u}
  const nw=!c.x;Object.assign(c,{x,y0:y,y,u,n:mNm[m.k](A.n,B?B.n:'')});_proc(c);
  if(nw){c.on=true}if(!c._set){c.h=null;autoCh(i);c._set=true}return true;
}
function mathAll(){CH.forEach((c,i)=>{if(c.m)mathCalc(i)})}
function fillMath(){
  const kv=$('mK').value||'freq';$('mK').innerHTML=Object.keys(MK).map(k=>'<option value="'+k+'">'+MK[k].t+'</option>').join('');$('mK').value=kv;mForm();   // se rehace al cambiar de idioma
  const src=CH.map((c,i)=>c.x&&!c.m?'<option value="'+i+'">'+esc(c.n)+'</option>':'').join('');
  const keep=id=>{const v=$(id).value;return v};const va=keep('mA'),vb=keep('mB');
  $('mA').innerHTML=src||'<option value="">— carga una señal —</option>';$('mB').innerHTML=src||'<option value="">— carga una señal —</option>';
  if(va!==''&&$('mA').querySelector('option[value="'+va+'"]'))$('mA').value=va;
  if(vb!==''&&$('mB').querySelector('option[value="'+vb+'"]'))$('mB').value=vb;else if($('mB').options.length>1)$('mB').selectedIndex=1;
  $('mD').innerHTML=CH.map((c,i)=>!c.x||c.m?'<option value="'+i+'">CH'+(i+1)+(c.m?' · '+esc(c.n):' · libre')+'</option>':'').join('')||'<option value="">— no hay canales libres —</option>';
  {const fr=CH.findIndex(c=>!c.x&&!c.m);if(fr>=0)$('mD').value=fr}   // por defecto, el primer canal libre (no sobrescribir sin querer)
  $('mL').innerHTML=CH.map((c,i)=>c.m?'<div class="cy"><b>CH'+(i+1)+' · '+esc(c.n)+'</b> <button data-i="'+i+'" title="Quitar canal matemático">✕</button>'+(c.mi?'<div class="s"><span>'+esc(c.mi)+'</span></div>':'')+'</div>':'').join('');
}
function mForm(){const k=$('mK').value,t=MK[k];$('mBl').hidden=t.n<2;$('mZl').hidden=k!=='rpm';$('mSl').hidden=!t.s;$('mH').textContent=MH[k];
  if(t.s&&!$('mU').value)$('mU').placeholder=k==='freq'?'Hz':'V'}
$('mK').onchange=mForm;
$('mGo').onclick=()=>{
  const k=$('mK').value,a=$('mA').value,b=$('mB').value,d=$('mD').value;
  if(a==='')return st('Carga primero una señal.');if(d==='')return st('No hay canales libres: quita un canal matemático o limpia.');
  if(MK[k].n>1&&(b===''||b===a))return st('Elige dos canales distintos (A y B).');
  const i=+d,c=CH[i];c.m={k,a:+a,b:MK[k].n>1?+b:null,f:+$('mF').value||1,o:+$('mO').value||0,u:$('mU').value.trim(),z:+$('mZ').value||60};
  c.x=null;c._set=false;Object.assign(c,{fl:'off',inv:false,h:null,p:''});
  if(!mathCalc(i)){const why=c.mi;c.m=null;c.mi='';return st('No se pudo calcular: '+(why||'faltan datos'))}
  sel=i;ui();draw();st('Canal matemático creado en CH'+(i+1)+': '+c.n+(c.mi?' · '+c.mi:''));
};
$('mL').onclick=e=>{const i=e.target&&e.target.dataset?e.target.dataset.i:null;if(i==null)return;const c=CH[+i];
  Object.assign(c,{m:null,mi:'',x:null,y:null,y0:null,on:false,_set:false,n:'CH'+(+i+1),u:'V'});ui();draw()};
fillMath();
