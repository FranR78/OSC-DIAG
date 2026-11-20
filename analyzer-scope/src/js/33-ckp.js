/* ---------- Sensor de cigüeñal: dientes, hueco, velocidad por diente y aporte de cada cilindro (método CSS) ----------
   Entrada: una captura con el CKP y un sincronismo del cilindro 1 (inyector 1 en diésel, bobina 1 en gasolina).
   1. Dientes: flanco de subida con histéresis (Hall o inductivo), instante interpolado.
   2. Hueco: periodo > 1,6 × los anteriores → dientes por vuelta (T presentes + m que faltan = N posiciones).
   3. Velocidad: ángulo de cada periodo / su duración → RPM por diente.
   4. Fase: el sincronismo (+ desfase) da el PMS del cilindro 1; con el orden de encendido, cada cilindro tiene su carrera de trabajo (720°/n desde su PMS).
   5. Aporte: en su propia carrera, cuánto sube la velocidad sobre la recta que une el PMS con el siguiente (quita la tendencia). Por eso el cilindro señalado es el responsable, sin restar uno.
   Regímenes por ciclo: estable, aceleración y sin combustión (sin sincronismo: corte o motor apagándose → solo mecánica). */
const CKP_UMBRAL=85;  // % del mejor por debajo del cual se señala un cilindro (borrador, a validar con capturas reales)
function ckpPct(a,q){const s=Array.from(a).sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.max(0,Math.round(q*(s.length-1))))]}
const ckpMed=a=>{if(!a.length)return NaN;const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
function ckpSub(y){const st=Math.max(1,Math.floor(y.length/20000)),o=[];for(let i=0;i<y.length;i+=st)o.push(y[i]);return o}
/* flancos de subida del CKP */
function ckpDientes(x,y){
  const s=ckpSub(y),lo=ckpPct(s,.02),hi=ckpPct(s,.98),mid=(lo+hi)/2,h=.15*(hi-lo),E=[];if(!(hi-lo>0))return E;
  let arm=false;for(let i=1;i<y.length;i++){const v=y[i];if(v<mid-h)arm=true;else if(arm&&v>=mid){const a=y[i-1];E.push(x[i-1]+(mid-a)/(v-a||1)*(x[i]-x[i-1]));arm=false}}
  return E;
}
/* pulsos del sincronismo (inyección o chispa): inicio de cada grupo de pulsos */
function ckpSync(x,y){
  const b=ckpMed(ckpSub(y)),E=[];let mx=0;for(let i=0;i<y.length;i++){const d=Math.abs(y[i]-b);if(d>mx)mx=d}const thr=.35*mx;if(!(thr>0))return E;  // pulsos cortos y escasos: umbral sobre el máximo, no sobre percentiles
  let up=false,last=-1;for(let i=0;i<y.length;i++){const d=Math.abs(y[i]-b);if(!up&&d>thr){up=true;if(last<0||x[i]-last>.003)E.push(x[i]);last=x[i]}else if(up&&d<thr*.6){up=false;last=x[i]}}
  return E;
}
function ckpAnaliza(d,o){
  const C=d.chs[o.ick],S=d.chs[o.isy];if(!C||!S||o.ick===o.isy)return{err:'Elige dos canales distintos: el del sensor de cigüeñal y el del sincronismo.'};
  const n=o.order.length;if(n<2||n>12||[...new Set(o.order)].length!==n)return{err:'Revisa el orden de encendido (p. ej. 1-3-4-2).'};
  const E=ckpDientes(C.x,C.y);if(E.length<60)return{err:'No se detectan dientes en «'+C.n+'»: ¿es el canal del sensor de cigüeñal?'};
  const P=[];for(let i=0;i+1<E.length;i++)P.push(E[i+1]-E[i]);
  const G=[];for(let i=3;i<P.length;i++){const m=(P[i-1]+P[i-2]+P[i-3])/3;if(P[i]>1.6*m&&(i+1>=P.length||P[i]>1.6*P[i+1]))G.push(i)}
  if(G.length<2)return{err:'No se encuentra el hueco de la rueda fónica: hace falta al menos una vuelta completa con hueco.'};
  const TT=[];for(let j=1;j<G.length;j++)TT.push(G[j]-G[j-1]);const T=Math.round(ckpMed(TT));
  const mm=G.filter(g=>g>0&&g+1<P.length).map(g=>Math.round(P[g]/((P[g-1]+P[g+1])/2))-1),m=Math.max(1,Math.round(ckpMed(mm)));
  const N=T+m,dp=360/N,bad=TT.filter(t=>t!==T).length,warn=[];
  if(bad)warn.push(bad+' de '+TT.length+' vueltas no tienen '+T+' dientes: señal con ruido o dientes perdidos; revisa la escala del canal.');
  // ángulo de cada flanco desde el primer hueco
  const g0=G[0],gs=new Set(G),th=new Float64Array(E.length).fill(NaN);th[g0]=-(m+1)*dp;
  for(let i=g0;i+1<E.length;i++)th[i+1]=th[i]+(gs.has(i)?(m+1):1)*dp;
  // velocidad por periodo (RPM), suavizada en 3 dientes
  const tm=[],am=[],rp=[];for(let i=g0;i+1<E.length;i++){const da=th[i+1]-th[i];tm.push((E[i]+E[i+1])/2);am.push((th[i]+th[i+1])/2);rp.push(da/P[i]/6)}
  const rs=rp.map((v,i)=>i&&i<rp.length-1?(rp[i-1]+v+rp[i+1])/3:v);
  // fase: PMS del cilindro 1
  const Y=ckpSync(S.x,S.y).filter(t=>t>=E[g0]&&t<=E[E.length-1]);if(!Y.length)return{err:'No se ven pulsos en «'+S.n+'»: sin sincronismo no se sabe qué cilindro es cada uno.'};
  const thAt=t=>{const i=Math.max(g0,Math.min(E.length-2,lb(E,t)-1));return th[i]+(t-E[i])/(E[i+1]-E[i])*(th[i+1]-th[i])};
  const ph=Y.map(t=>((thAt(t)+o.off)%720+720)%720),r0=ph[0],th0=ckpMed(ph.map(a=>{let q=a-r0;if(q>360)q-=720;if(q<-360)q+=720;return q}))+r0;
  // ciclos y ventanas de cada cilindro
  const W=720/n,cyc=[];let k=0,a0=th0;while(a0>am[0])a0-=720;
  for(;a0+720<=am[am.length-1];a0+=720){
    const c={t0:null,t1:null,d:{},ok:true};
    for(let j=0;j<n;j++){const s=a0+j*W,i0=lb(am,s),i1=lb(am,s+W);if(i1-i0<3){c.ok=false;break}
      const e=Math.min(i1,rs.length-1),v0=rs[i0],v1=rs[e],sp=(am[e]-am[i0])||1;let mx=-Infinity;  // pico sobre la cuerda inicio→fin: quita la tendencia (acelera o se para)
      for(let i=i0;i<i1;i++){const q=rs[i]-(v0+(v1-v0)*(am[i]-am[i0])/sp);if(q>mx)mx=q}c.d[o.order[j]]=mx;
      if(j===0)c.t0=tm[i0];if(j===n-1)c.t1=tm[i1-1]}
    if(!c.ok)continue;let s=0,q=0;for(let i=lb(am,a0);i<lb(am,a0+720);i++){s+=rp[i];q++}c.rpm=s/q;
    c.comb=Y.some(t=>t>=c.t0-.002&&t<=c.t1);cyc.push(c)}
  if(cyc.length<2)return{err:'La captura es demasiado corta: hacen falta al menos 2 ciclos completos (720°).'};
  cyc.forEach((c,i)=>{const p=cyc[i-1];c.reg=!c.comb?(c.rpm>150?'sin':''):p&&c.rpm>p.rpm*1.03?'acel':p&&c.rpm<p.rpm*.97?'dec':'est'});
  const R={};for(const g of['est','acel','sin']){const L=cyc.filter(c=>c.reg===g);if(L.length<2)continue;
    const md={};o.order.forEach(c=>md[c]=ckpMed(L.map(q=>q.d[c])));const mx=Math.max(...Object.values(md));
    R[g]={n:L.length,rpm:Math.round(ckpMed(L.map(q=>q.rpm))),pct:Object.fromEntries(o.order.map(c=>[c,mx>0?Math.max(0,Math.round(md[c]/mx*100)):0]))}}
  const st=Math.max(1,Math.floor(rp.length/700)),serie=[];for(let i=0;i<rp.length;i+=st)serie.push([tm[i],rp[i]]);
  return{N,T,m,vueltas:G.length-1,ciclos:cyc.length,R,cyc:cyc.map(c=>({t0:c.t0,t1:c.t1,reg:c.reg})),serie,warn,order:o.order,dur:E[E.length-1]-E[0]};
}
/* conclusión: [Medido] lo que sale de la captura, [Inferido] lo que se deduce */
function ckpDiag(r,fuel){
  const L=[],cb=r.R.est||r.R.acel,sn=r.R.sin,lab=r.R.est?'estable':'en aceleración';
  if(!cb){L.push(['warn','Inferido','No hay al menos 2 ciclos con combustión: no se puede comparar el aporte. Graba ralentí y aceleraciones con el sincronismo conectado.']);return L}
  const lo=r.order.map(c=>[c,cb.pct[c]]).sort((a,b)=>a[1]-b[1]),w=lo.filter(x=>x[1]<CKP_UMBRAL);
  if(!w.length){L.push(['ok','Medido','Aporte uniforme '+lab+': todos los cilindros por encima del '+CKP_UMBRAL+' % del mejor (el más bajo, el '+lo[0][0]+', con '+lo[0][1]+' %).'])}
  else w.forEach(([c,v])=>{L.push(['bad','Medido','Cilindro '+c+': aporta el '+v+' % del mejor '+lab+'.']);
    if(sn){const s=sn.pct[c];L.push(s<CKP_UMBRAL?['bad','Inferido','Sin combustión también queda bajo ('+s+' %): fuga de compresión en el cilindro '+c+'. Sigue en «Integridad mecánica».']:
      ['warn','Inferido','Sin combustión está bien ('+s+' %): la mecánica del cilindro '+c+' responde; el fallo está en la combustión. Sigue en '+(fuel==='diesel'?'«Inyección»':'«Encendido» o «Inyección»')+'.'])}
    else L.push(['warn','Inferido','No hay tramo sin combustión (apagar grabando o cortar encendido) para separar mecánica de combustión.'])});
  if(r.R.acel&&r.R.est){const a=r.order.filter(c=>r.R.acel.pct[c]<CKP_UMBRAL&&r.R.est.pct[c]>=CKP_UMBRAL);if(a.length)L.push(['warn','Medido','Solo en aceleración baja el cilindro '+a.join(', ')+' ('+a.map(c=>r.R.acel.pct[c]+' %').join(', ')+').'])}
  return L;
}
/* señal de ejemplo: rueda 60-2, Hall, sincronismo en el inyector 1; ralentí, aceleración y corte (sin combustión) */
function ckpDemo(o={}){
  const order=o.order||[1,3,4,2],n=order.length,W=720/n,fs=o.fs||1e5,dur=3.6,N=60,m=2,TDC=100,flojo=o.flojo||0,fuga=o.fuga||0;
  const L=Math.round(dur*fs),x=new Float64Array(L),a=new Float32Array(L),b=new Float32Array(L);let th=0;
  for(let i=0;i<L;i++){const t=i/fs;x[i]=t;
    const comb=t<2.3,base=t<1.5?800:t<2.3?800+(t-1.5)/.8*1200:Math.max(120,2000-(t-2.3)/1.3*1800);
    const rel=((th-TDC)%720+720)%720,j=Math.floor(rel/W),c=order[j],phi=rel-j*W;
    const A=comb?(c===flojo?.006:.02):(c===fuga?.003:.01);
    th+=base*6*(1-A*Math.cos(2*Math.PI*phi/W))/fs;
    const p=(th%360)/(360/N),kk=Math.floor(p);a[i]=kk<N-m&&p-kk<.5?5:0;
    b[i]=comb&&((th-(TDC-5))%720+720)%720<3?12:0}
  return{name:'ejemplo_ckp_inyector1.csv',chs:[{n:'CKP',x,y:a,u:'V'},{n:'Inyector 1',x,y:b,u:'V'}],n:L,meta:{}};
}
/* ---- tarjeta en la prueba ---- */
function ckpCard(key,cv){
  const d=cv.ds[0],r=SK.ckp[key],o=SK.ckpO[key]||(SK.ckpO[key]={ick:Math.max(0,d.chs.findIndex(c=>/ckp|cig|crank/i.test(c.n))),isy:-1,ord:eng.order.join('-'),off:0});
  if(o.isy<0)o.isy=o.ick===0?1:0;
  const opt=sel=>d.chs.map((c,i)=>'<option value="'+i+'"'+(i===sel?' selected':'')+'>'+esc(c.n)+'</option>').join('');
  let h='<div class="skC"><b class="skH">Analizar el sensor de cigüeñal</b><p class="hint">Cada cilindro se mide en su propia carrera de trabajo, desde su PMS: el cilindro señalado es el responsable, sin restar uno.</p>'+
    '<div class="row"><label>Sensor de cigüeñal <select id="kCk1">'+opt(o.ick)+'</select></label><label>Sincronismo cil. 1 <select id="kCk2">'+opt(o.isy)+'</select></label>'+
    '<label>Orden de encendido <input id="kCkO" value="'+esc(o.ord)+'" style="width:90px"></label><label title="Grados desde el pulso de sincronismo hasta el PMS del cilindro 1">Desfase (°) <input id="kCkF" type="number" step="1" value="'+o.off+'" style="width:64px"></label><button class="p" id="kCkGo">Analizar</button></div>';
  if(r&&r.err)h+='<div class="skCk"><div class="skA bad"><b>✗</b><span>'+r.err+'</span></div></div>';
  else if(r){
    h+='<div class="skKv"><div><small>Rueda fónica</small><b>'+r.N+'-'+r.m+'</b></div><div><small>Dientes por vuelta</small><b>'+r.T+'</b></div><div><small>Vueltas</small><b>'+r.vueltas+'</b></div><div><small>Ciclos (720°)</small><b>'+r.ciclos+'</b></div></div>';
    h+='<div class="skCk">'+r.warn.map(w=>'<div class="skA warn"><b>!</b><span>'+w+'</span></div>').join('')+ckpDiag(r,SK.fuel).map(l=>'<div class="skA '+l[0]+'"><b>'+(l[0]==='ok'?'✓':l[0]==='bad'?'✗':'!')+'</b><span><b>['+l[1]+']</b> '+l[2]+'</span></div>').join('')+'</div>';
    const G=[['est','Estable'],['acel','Aceleración'],['sin','Sin combustión']].filter(g=>r.R[g[0]]);
    h+='<div class="skTw" style="margin-top:10px"><table class="skTb ckT"><thead><tr><th>Cilindro</th>'+G.map(g=>'<th>'+g[1]+' <small>('+r.R[g[0]].n+' ciclos · '+r.R[g[0]].rpm+' RPM)</small></th>').join('')+'</tr></thead><tbody>'+
      r.order.slice().sort((a,b)=>a-b).map(c=>'<tr><td><span class="skCh" style="background:'+crCol(c)+'">'+c+'</span></td>'+G.map(g=>{const v=r.R[g[0]].pct[c];
        return '<td><div class="ckB'+(v<CKP_UMBRAL?' lo':'')+'"><i style="width:'+v+'%"></i><span>'+v+' %</span></div></td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
    h+=ckpGraf(r);
  }
  return h+'</div>';
}
function ckpGraf(r){
  const W=640,H=170,L=46,R=8,T=10,B=22,s=r.serie,t0=s[0][0],t1=s[s.length-1][0],mx=Math.max(...s.map(p=>p[1]))*1.08;
  const X=t=>L+(W-L-R)*(t-t0)/(t1-t0||1),Y=v=>T+(H-T-B)*(1-v/mx),C={est:'rgba(31,169,143,.16)',acel:'rgba(255,138,0,.16)',sin:'rgba(155,92,255,.18)'};
  let g='<svg class="skP" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="RPM por diente">';
  r.cyc.forEach(c=>{if(C[c.reg])g+='<rect x="'+X(c.t0)+'" y="'+T+'" width="'+Math.max(1,X(c.t1)-X(c.t0))+'" height="'+(H-T-B)+'" fill="'+C[c.reg]+'"/>'});
  const st=mx>3000?1000:mx>1200?500:200;for(let v=0;v<=mx;v+=st)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--bd)"/><text x="'+(L-5)+'" y="'+(Y(v)+4)+'" font-size="10" text-anchor="end" fill="var(--mu)">'+v+'</text>';
  g+='<polyline fill="none" stroke="var(--tx)" stroke-width="1.2" points="'+s.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
  g+='<text x="'+L+'" y="'+(H-6)+'" font-size="10" fill="var(--mu)">'+skT(0)+'</text><text x="'+(W-R)+'" y="'+(H-6)+'" font-size="10" text-anchor="end" fill="var(--mu)">'+skT(t1-t0)+'</text><text x="2" y="9" font-size="10" fill="var(--mu)">RPM</text></svg>';
  return '<b class="skH">Velocidad por diente</b>'+g+'<div class="skLg"><span><i style="background:rgba(31,169,143,.6)"></i>Estable</span><span><i style="background:rgba(255,138,0,.6)"></i>Aceleración</span><span><i style="background:rgba(155,92,255,.6)"></i>Sin combustión</span></div>';
}
function ckpWire(key){
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  on('kCkGo',()=>{const o=SK.ckpO[key];o.ick=+$('kCk1').value;o.isy=+$('kCk2').value;o.ord=$('kCkO').value;o.off=+$('kCkF').value||0;
    const ord=o.ord.split(/[^0-9]+/).filter(Boolean).map(Number);st('Analizando el sensor de cigüeñal…');
    setTimeout(()=>{try{SK.ckp[key]=ckpAnaliza(SK.csv[key].ds[0],{ick:o.ick,isy:o.isy,order:ord,off:o.off})}catch(e){SK.ckp[key]={err:'No se pudo analizar: '+e.message}}
      st(SK.ckp[key].err?SK.ckp[key].err:'Análisis del sensor de cigüeñal hecho.');skTab()},20)});
}
