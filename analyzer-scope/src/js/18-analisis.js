/* ---------- Valores digitales de la señal: mide cada evento del canal seleccionado en la vista ----------
   Bobina primario (V): tiempo de carga, tensión de inducción, tiempo y tensión de quemado, oscilaciones (rebotes).
   Bobina secundario: tensión de inducción, quemado y oscilaciones (la carga no se ve bien en el secundario).
   Corriente de bobina (A): tiempo de carga, corriente máxima, limitación. Inyector (V): tiempo de inyección y pico de cierre.
   Inyector (A): duración y corriente máxima de cada pulso (piloto/principal por separado). */
var AN={k:'auto',R:null};
const AN_K=[['auto','Automático (según el parámetro del canal)'],['bp','Bobina · primario (tensión)'],['bs','Bobina · secundario'],['bi','Bobina · corriente del primario'],['iv','Inyector · tensión'],['ii','Inyector · corriente']];
function anOn(){return $('oSa').checked}
function anKind(c){
  if(AN.k!=='auto')return AN.k;const s=(c.p||'')+' '+(c.n||''),A=/A$/.test(c.u||'');
  if(/secundari/i.test(s))return'bs';if(/inyector|inyecci[oó]n/i.test(s))return A?'ii':'iv';return A?'bi':'bp';
}
function anMed(y,i0,i1){const n=i1-i0;if(n<1)return NaN;const st=Math.max(1,Math.floor(n/4000)),a=[];for(let i=i0;i<i1;i+=st)a.push(y[i]);a.sort((p,q)=>p-q);return a[a.length>>1]}
function anCalc(){
  const c=CH[sel];if(!c||!c.x||!c.on)return null;const x=c.x,y=c.y,a=lb(x,view.t0),b=Math.min(x.length,lb(x,view.t0+view.span));
  if(b-a<20)return null;const k=anKind(c),dt=(x[b-1]-x[a])/(b-a-1),ns=ms=>Math.max(1,Math.round(ms*1e-3/dt)),ev=[];
  if(k==='bi'||k==='ii'){  // corriente: pulsos por encima del 10 % del máximo
    let mn=Infinity,mx=-Infinity;for(let i=a;i<b;i++){if(y[i]<mn)mn=y[i];if(y[i]>mx)mx=y[i]}
    const bs=anMed(y,a,b)<mn+(mx-mn)*.5?Math.min(anMed(y,a,b),mn+(mx-mn)*.05):mn,A=mx-bs;if(!(A>0))return{k,u:c.u,ev};
    const on=bs+A*.1,off=bs+A*.05;let i=a;
    while(i<b&&y[i]>on)i++;  // descarta un pulso cortado al inicio de la vista
    for(;i<b;i++){if(!(y[i-1]<on&&y[i]>=on))continue;let s=i;while(s>a&&y[s-1]>off)s--;let e=i,pk=-Infinity,ip=i;
      while(e<b&&y[e]>off){if(y[e]>pk){pk=y[e];ip=e}e++}if(e>=b)break;
      const q={t:x[s],t1:x[e],dur:x[e]-x[s],pk};
      if(k==='bi'){let j=ip;while(j>s&&y[j]>bs+(pk-bs)*.95)j--;q.lim=x[e]-x[j]>.15*q.dur?x[e]-x[j]:0}
      ev.push(q);i=e}
    return{k,u:c.u,ev};
  }
  // tensión: picos de inducción por encima de la mitad del máximo respecto a la línea de reposo
  let bs=anMed(y,a,b),sg=1;
  if(k==='bs'){let mn=Infinity,mx=-Infinity;for(let i=a;i<b;i++){if(y[i]<mn)mn=y[i];if(y[i]>mx)mx=y[i]}if(bs-mn>mx-bs)sg=-1}
  const Y=i=>sg*y[i];let mx=-Infinity;for(let i=a;i<b;i++)if(Y(i)>mx)mx=Y(i);const B=sg*bs,A=mx-B;if(!(A>0))return{k,u:c.u,ev,bs};
  const th=B+A*.5,lo=B*.8,rf=ns(1);let i=a+1;
  for(;i<b;i++){if(!(Y(i-1)<th&&Y(i)>=th))continue;
    let ip=i;for(let j=i;j<Math.min(b,i+ns(.3));j++)if(Y(j)>Y(ip))ip=j;
    const q={t:x[i],pk:y[ip],tp:x[ip]};
    if(k==='bp'||k==='iv'){  // carga / inyección: tramo bajo (< 80 % del reposo) justo antes del pico
      let e=i;while(e>a&&y[e]>=lo)e--;let s=e;while(s>a&&y[s]<lo)s--;
      if(e>a&&s>a&&i-e<ns(.5)&&s<e){q.c0=x[s+1];q.c1=x[e];q.dur=x[e]-x[s+1]}}
    if(k==='bp'||k==='bs'){  // quemado: meseta tras el pico; termina al bajar a la mitad entre meseta y reposo
      const m0=ip+ns(.1),m1=Math.min(b,ip+ns(.4)),Bl=m1>m0?sg*anMed(y,m0,m1):NaN;
      if(Bl-B>A*.03){const half=B+(Bl-B)*.5,sus=ns(.03);let e=m0;
        while(e<b){if(Y(e)<half){let ok=true;for(let j=e;j<Math.min(b,e+sus);j++)if(Y(j)>=half){ok=false;break}if(ok)break}e++}
        if(e<b){q.q0=x[i];q.q1=x[e];q.qT=x[e]-x[i];q.qV=sg*anMed(y,m0,Math.max(m0+1,e-ns(.05)));
          // oscilaciones: ciclos alrededor del reposo con histéresis del 15 % de (meseta − reposo), hasta 3 ms o el siguiente evento
          const h=Math.max((Bl-B)*.15,A*.01),lim=Math.min(b,e+ns(3));let st=0,n=0,j=e;
          for(;j<lim;j++){const v=Y(j);if(st>=0&&v<B-h)st=-1;else if(st===-1&&v>B+h){st=1;n++}if(v>=th)break}
          q.osc=n}}}
    ev.push(q);i=Math.max(i,ip)+rf}
  return{k,u:c.u,ev,bs};
}
const anAvg=(ev,f)=>{const v=ev.map(e=>e[f]).filter(v=>v!=null&&isFinite(v));return v.length?{me:v.reduce((s,q)=>s+q,0)/v.length,mn:Math.min(...v),mx:Math.max(...v),n:v.length}:null};
/* filas: [id medida, etiqueta, campo, unidad ('s' tiempo, 'n' cuenta, 'u' unidad del canal)] */
const AN_ROWS={bp:[['t_carga','Tiempo de carga','dur','s'],['tension_induccion','Tensión de inducción','pk','u'],['t_quemado','Tiempo de quemado','qT','s'],['tension_quemado','Tensión de quemado','qV','u'],['oscilaciones','Oscilaciones (rebotes)','osc','n']],
  bs:[['tension_induccion','Tensión de inducción','pk','u'],['t_quemado','Tiempo de quemado','qT','s'],['tension_quemado','Tensión de quemado','qV','u'],['oscilaciones','Oscilaciones (rebotes)','osc','n']],
  bi:[['t_carga','Tiempo de carga','dur','s'],['corriente_max','Corriente máxima','pk','u'],['t_limitacion','Tiempo de limitación de corriente','lim','s']],
  iv:[['t_inyeccion','Tiempo de inyección','dur','s'],['tension_induccion','Pico de cierre','pk','u']],
  ii:[['t_inyeccion','Duración del pulso','dur','s'],['corriente_max','Corriente máxima','pk','u']]};
const anF=(v,t,u)=>t==='n'?(+v).toFixed(1).replace(/\.0$/,''):fmt(v,t==='s'?'s':u);
function anRows(R){
  if(!R)return[];const L=AN_ROWS[R.k],kn=(AN_K.find(q=>q[0]===R.k)||[])[1],r=[['Valores digitales',kn+' · '+R.ev.length+' evento(s)']];
  if(!R.ev.length)return r.concat([['Sin eventos','Ajusta la vista o el tipo de señal']]);
  L.forEach(([,l,f,t])=>{const s=anAvg(R.ev,f);if(s)r.push([l,anF(s.me,t,R.u)+(s.n>1?' ('+anF(s.mn,t,R.u)+' – '+anF(s.mx,t,R.u)+')':'')])});
  if(R.k==='bi')r.push(['Limitación de corriente',R.ev.some(e=>e.lim>0)?'sí':'no']);
  return r;
}
function anPanel(){
  if(!anOn()){AN.R=null;return}
  AN.R=anCalc();const R=AN.R,c=CH[sel];
  if(!R){$('saR').innerHTML='<p class="hint">Selecciona un canal con señal.</p>';return}
  const L=AN_ROWS[R.k];
  $('saR').innerHTML=anRows(R).map(([k,v])=>'<div class="s"><span>'+k+'</span><span>'+v+'</span></div>').join('')+
    R.ev.slice(0,12).map((e,i)=>'<div class="cy"><b>'+(i+1)+'</b> · '+fmt(e.t,'s')+'<br>'+L.filter(q=>e[q[2]]!=null).map(([,l,f,t])=>l+' '+anF(e[f],t,R.u)).join(' · ')+'</div>').join('')+
    (R.ev.length>12?'<p class="hint">… '+(R.ev.length-12)+' más</p>':'')+'<p class="hint">Canal '+(c.n||'CH'+(sel+1))+'. Medido en la vista actual.</p>';
}
/* marcas sobre la gráfica: carga (barra), pico (punto), quemado (barra), número de oscilaciones */
function anDraw(g,X,yb,tag,pkc,c,Yv){
  const R=AN.R;if(!R||!R.ev.length||!c||!c.x)return;const cC=pkc('#ffd24d','#9a6b00'),cQ=pkc('#ff7bf1','#b3199e'),y1=yb-30,y2=yb-14;
  const bar=(t0,t1,y,col,l)=>{const a=X(t0),b=X(t1);g.strokeStyle=col;g.lineWidth=3;g.beginPath();g.moveTo(a,y);g.lineTo(b,y);g.stroke();
    g.lineWidth=1;g.beginPath();g.moveTo(a,y-5);g.lineTo(a,y+5);g.moveTo(b,y-5);g.lineTo(b,y+5);g.stroke();if(b-a>48)tag(l,(a+b)/2,y-6,col,'center')};
  R.ev.forEach(e=>{
    if(e.c0!=null)bar(e.c0,e.c1,y1,cC,fmt(e.dur,'s'));
    if((R.k==='bi'||R.k==='ii')&&e.dur!=null)bar(e.t,e.t1,y1,cC,fmt(e.dur,'s'));
    if(e.q0!=null)bar(e.q0,e.q1,y2,cQ,fmt(e.qT,'s')+(e.osc!=null?' · '+e.osc+' osc':''));
    if(e.tp!=null){const px=X(e.tp),py=Yv(e.pk);g.fillStyle=cQ;g.beginPath();g.arc(px,py,3.5,0,7);g.fill();tag(fmt(e.pk,R.u),px+6,py+4,cQ)}});
}
$('saK').innerHTML=AN_K.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
$('saK').onchange=()=>{AN.k=$('saK').value;draw()};
