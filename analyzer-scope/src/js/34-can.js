/* ---------- Red CAN: análisis trama a trama (CAN de alta velocidad, ISO 11898-2) ----------
   Entrada: CAN-H y CAN-L en dos canales respecto a masa.
   1. Diferencial H−L con histéresis (dominante > 0,9 V, recesivo < 0,5 V) → tramos.
   2. Velocidad: el tramo más corto típico es un bit → la velocidad normalizada más cercana.
   3. Tramas: separadas por ≥ 7 bits recesivos; se quitan los bits de relleno, se lee el ID y se comprueba el CRC-15.
   4. Niveles por trama (centro de los bits, sin arbitraje ni ACK: solo transmite esa unidad) y flancos (subida 10–90 %, sobreoscilación).
   5. Por ID: niveles, desviación frente al resto, flancos y CRC. Solo mide: qué es normal y qué avería indica lo dicen las skills (35-medidas.js, reglas/fran-can.json). */
const CAN_RATES=[1e6,5e5,25e4,125e3,1e5,83333,5e4,33333];
function canMed(a){if(!a.length)return null;const s=Float64Array.from(a).sort();return s[s.length>>1]}
function canCrc(bits){let c=0;for(const b of bits){const nx=b^((c>>14)&1);c=(c<<1)&0x7fff;if(nx)c^=0x4599}return c}
/* tramos dominante/recesivo del diferencial */
function canTramos(x,d){const R=[];let s=d[0]>.9?1:0,t0=x[0];
  for(let i=1;i<d.length;i++){const v=d[i],ns=s?(v<.5?0:1):(v>.9?1:0);if(ns!==s){R.push({dom:s,t0,t1:x[i]});s=ns;t0=x[i]}}
  R.push({dom:s,t0,t1:x[x.length-1]});return R}
/* lee una trama desde sus bits en bruto (0 = dominante): quita el relleno, ID, DLC, datos y CRC */
function canLee(raw){
  const b=[];let run=0,last=-1,i=0,stuffErr=false;
  const next=()=>{while(i<raw.length){const v=raw[i++];if(run===5){if(v===last){stuffErr=true}run=1;last=v;continue}
      if(v===last)run++;else{run=1;last=v}return v}return null};
  const take=n=>{const o=[];for(let k=0;k<n;k++){const v=next();if(v==null)return null;o.push(v)}return o};
  const sof=take(1);if(!sof||sof[0]!==0)return null;b.push(0);
  const id=take(11);if(!id)return null;b.push(...id);const r1=take(2);if(!r1)return null;b.push(...r1);
  let ide=r1[1],idv=parseInt(id.join(''),2),ext=false;
  if(ide){const e=take(18);if(!e)return null;b.push(...e);const rr=take(3);if(!rr)return null;b.push(...rr);idv=idv*262144+parseInt(e.join(''),2);ext=true}
  else{const r0=take(1);if(!r0)return null;b.push(...r0)}
  const dl=take(4);if(!dl)return null;b.push(...dl);const dlc=Math.min(8,parseInt(dl.join(''),2)),rtr=ext?b[32]:r1[0];
  const dat=rtr?[]:take(dlc*8);if(!dat)return null;b.push(...dat);
  const crc=take(15);if(!crc)return null;
  return{id:idv,ext,dlc,ok:canCrc(b)===parseInt(crc.join(''),2)&&!stuffErr,stuffErr};
}
function canAnaliza(d,o){
  const H=d.chs[o.ih],L=d.chs[o.il];if(!H||!L||o.ih===o.il)return{err:'Elige dos canales distintos: CAN-H y CAN-L.'};
  const x=H.x,n=x.length,yl=L.x===x?L.y:Float32Array.from(x,t=>{const i=Math.min(L.x.length-1,lb(L.x,t));return L.y[i]}),df=new Float32Array(n);
  for(let i=0;i<n;i++)df[i]=H.y[i]-yl[i];
  const st=Math.max(1,Math.floor(n/30000)),sH=[],sL=[];for(let i=0;i<n;i+=st){sH.push(H.y[i]);sL.push(yl[i])}
  const sD=[];for(let i=0;i<n;i+=st)sD.push(Math.abs(H.y[i]-yl[i]));const g={hMed:canMed(sH),lMed:canMed(sL),hlMed:canMed(sD)};
  const R=canTramos(x,df),dur=x[n-1]-x[0];
  if(R.length<20)return canSinTramas(g,dur);
  const lens=R.slice(1,-1).map(r=>r.t1-r.t0).sort((a,b)=>a-b),tmin=lens[Math.floor(lens.length*.1)];
  const rate=CAN_RATES.reduce((a,b)=>Math.abs(1/b-tmin)<Math.abs(1/a-tmin)?b:a),T=1/rate,fs=(n-1)/dur;
  if(fs<rate*8)return{err:'Muestreo insuficiente para '+(rate/1e3)+' kbit/s: '+Math.round(fs/1e3)+' kS/s (hacen falta ≥ '+(rate*10/1e6)+' MS/s).'};
  const ix=t=>Math.min(n-1,lb(x,t));
  const F=[];let k=0,errFr=0;
  while(k<R.length&&!(!R[k].dom&&R[k].t1-R[k].t0>=7*T))k++;
  for(k++;k<R.length;k++){if(!R[k].dom)continue;const a=k;let b=k;
    while(b+1<R.length&&!(!R[b+1].dom&&R[b+1].t1-R[b+1].t0>=7*T))b++;
    if(b+1>=R.length)break;  // trama cortada al final
    const runs=R.slice(a,b+1),raw=[];let errf=false;
    for(const r of runs){const nb=Math.max(1,Math.round((r.t1-r.t0)/T));if(r.dom&&nb>=6)errf=true;for(let q=0;q<nb;q++)raw.push(r.dom?0:1)}
    if(errf){errFr++;k=b;continue}
    const fr=canLee(raw);
    // niveles: bits dominantes y recesivos desde el bit 20 (pasado el arbitraje) hasta antes del ACK (último tramo dominante)
    const dH=[],dL=[],rH=[],rL=[],sub=[],ovs=[];let bit=0;
    runs.forEach((r,ri)=>{const nb=Math.max(1,Math.round((r.t1-r.t0)/T));
      if(bit>=20&&ri<runs.length-1){const i0=ix(r.t0+.3*T),i1=ix(r.t1-.3*T),stp=Math.max(1,Math.floor((i1-i0)/8));
        for(let i=i0;i<i1;i+=stp){if(r.dom){dH.push(H.y[i]);dL.push(yl[i])}else{rH.push(H.y[i]);rL.push(yl[i])}}}
      if(r.dom&&ri>0&&bit>=20&&ri<runs.length-1&&sub.length<12)sub.push(r.t0);bit+=nb});
    const m={id:fr?fr.id:null,ext:fr&&fr.ext,ok:!!(fr&&fr.ok),t:runs[0].t0,dH:canMed(dH),dL:canMed(dL),rH:canMed(rH),rL:canMed(rL)};
    if(m.dH!=null&&m.rH!=null){const lo=m.rH-m.rL,hi=m.dH-m.dL,sp=hi-lo,rs=[];
      for(const te of sub){const i0=ix(te-.3*T),i1=ix(te+.6*T);let t10=null,t90=null,mx=-Infinity;
        for(let i=i0;i<i1;i++){const v=df[i];if(t10==null&&v>=lo+.1*sp)t10=x[i];if(t90==null&&v>=lo+.9*sp)t90=x[i];if(x[i]>=te&&v>mx)mx=v}
        if(t10!=null&&t90!=null)rs.push(t90-t10);if(sp>0)ovs.push((mx-hi)/sp*100)}
      m.sube=canMed(rs);m.ov=canMed(ovs)}
    F.push(m);k=b}
  if(!F.length)return canSinTramas(g,dur,'Hay actividad pero no se reconocen tramas completas (¿captura muy corta o velocidad no estándar?).');
  // por unidad (ID)
  const byId=new Map();F.forEach(f=>{const q=f.id==null?'?':f.id;if(!byId.has(q))byId.set(q,[]);byId.get(q).push(f)});
  const U=[...byId.entries()].map(([id,L])=>{const v=k=>canMed(L.map(f=>f[k]).filter(z=>z!=null));
    const u={id,ext:L[0].ext,n:L.length,crc:L.filter(f=>!f.ok).length,dH:v('dH'),dL:v('dL'),rH:v('rH'),rL:v('rL'),sube:v('sube'),ov:v('ov')};u.dif=u.dH!=null?u.dH-u.dL:null;return u});
  const dm=canMed(U.filter(u=>u.dif!=null).map(u=>u.dif));
  U.sort((a,b)=>(a.id==='?')-(b.id==='?')||a.id-b.id);
  const all=k=>canMed(F.map(f=>f[k]).filter(z=>z!=null));
  return{rate,tramas:F.length,errFr,crcMal:F.filter(f=>!f.ok).length,U,dur,lv:{dH:all('dH'),dL:all('dL'),rH:all('rH'),rL:all('rL'),dif:dm,sube:all('sube'),ov:all('ov')},g};
}
function canSinTramas(g,dur,msg){return{sin:true,msg:msg||'',g,dur}}
/* lo medido, sin opinar (la interpretación la dan las skills) */
function canMedido(r){const f=v=>v==null?'—':v.toFixed(2).replace('.',',')+' V',G=r.g,L=[];
  if(r.sin){L.push('Sin tramas en '+skT(r.dur)+'. CAN-H ≈ '+f(G.hMed)+', CAN-L ≈ '+f(G.lMed)+'.'+(r.msg?' '+r.msg:''));return L}
  const v=r.lv;L.push((r.rate/1e3)+' kbit/s · '+r.tramas+' tramas de '+r.U.length+' unidades (ID) en '+skT(r.dur)+'.');
  L.push('Recesivo: H '+f(v.rH)+' · L '+f(v.rL)+'.');L.push('Dominante: H '+f(v.dH)+' · L '+f(v.dL)+' · diferencial '+f(v.dif)+'.');
  return L}
const canId=u=>u.id==='?'?'?':'0x'+u.id.toString(16).toUpperCase().padStart(u.ext?8:3,'0');
/* señal de ejemplo: 500 kbit/s, 4 unidades; la del ID 0x2F1 con el nivel dominante bajo (ramal o conector con resistencia) */
function canDemo(o={}){
  const rate=5e5,T=1/rate,fs=2e7,dur=.02,N=Math.round(dur*fs),x=new Float64Array(N),h=new Float32Array(N),l=new Float32Array(N);
  const nodos=[{id:0x0C9,dif:2},{id:0x1A0,dif:2.05},{id:0x2F1,dif:o.bajo===false?2:1.35},{id:0x3E0,dif:1.95}];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const lv=[];let t=40*T,q=0;
  while(t<dur-300*T){const nd=nodos[q++%nodos.length],dl=8,dat=Array.from({length:dl*8},()=>rnd()<.5?1:0);
    const b=[0,...nd.id.toString(2).padStart(11,'0').split('').map(Number),0,0,0,...dl.toString(2).padStart(4,'0').split('').map(Number),...dat];
    const c=canCrc(b),fb=[...b,...c.toString(2).padStart(15,'0').split('').map(Number)],sb=[];let run=0,last=-1;
    for(const v of fb){sb.push(v);if(v===last)run++;else{run=1;last=v}if(run===5){const s=1-v;sb.push(s);last=s;run=1}}
    sb.push(1);sb.push(0);sb.push(1);for(let i=0;i<10;i++)sb.push(1);
    sb.forEach((v,i)=>lv.push([t+i*T,v===0?(i===sb.length-12?2:nd.dif):0]));t+=sb.length*T+(5+Math.floor(rnd()*30))*T}
  let j=0,cur=0,tg=0;const tau=25e-9,a=1-Math.exp(-1/(fs*tau));
  for(let i=0;i<N;i++){const ti=i/fs;x[i]=ti;while(j<lv.length&&lv[j][0]<=ti){tg=lv[j][1];j++}cur+=(tg-cur)*a;
    const nz=(rnd()-.5)*.04;h[i]=2.5+cur/2+nz;l[i]=2.5-cur/2+nz}
  return{name:'ejemplo_can_500k.csv',chs:[{n:'CAN-H',x,y:h,u:'V'},{n:'CAN-L',x,y:l,u:'V'}],n:N,meta:{}};
}
/* ---- tarjeta en la prueba ---- */
function canCard(key,cv){
  const d=cv.ds[0],r=SK.can[key],o=SK.canO[key]||(SK.canO[key]={ih:Math.max(0,d.chs.findIndex(c=>/h\b|high|can.?h/i.test(c.n))),il:-1});
  if(o.il<0){const j=d.chs.findIndex((c,i)=>i!==o.ih&&/l\b|low|can.?l/i.test(c.n));o.il=j>=0?j:o.ih===0?1:0}
  const opt=sel=>d.chs.map((c,i)=>'<option value="'+i+'"'+(i===sel?' selected':'')+'>'+esc(c.n)+'</option>').join('');
  let h='<div class="skC"><b class="skH">Analizar la red CAN</b><p class="hint">Trama a trama: velocidad, ID de cada unidad, niveles de CAN-H y CAN-L, flancos y CRC. La unidad cuyo nivel se aparta del resto es la sospechosa.</p>'+
    '<div class="row"><label>CAN-H <select id="kCn1">'+opt(o.ih)+'</select></label><label>CAN-L <select id="kCn2">'+opt(o.il)+'</select></label><button class="p" id="kCnGo">Analizar</button></div>';
  if(r&&r.err)h+='<div class="skCk"><div class="skA bad"><b>✗</b><span>'+r.err+'</span></div></div>';
  else if(r){
    if(!r.sin)h+='<div class="skKv"><div><small>Velocidad</small><b>'+(r.rate/1e3)+' kbit/s</b></div><div><small>Tramas</small><b>'+r.tramas+'</b></div><div><small>Unidades (ID)</small><b>'+r.U.length+'</b></div><div><small>CRC mal / error</small><b>'+r.crcMal+' / '+r.errFr+'</b></div></div>';
    const sk=mdSkills(canMedidas(r)),mal=new Set(['can_desv_unidad_pct','can_dif_unidad','can_ov_unidad_pct','can_crc_unidad'].flatMap(m=>[...mdMarcados(sk,m)]));
    h+='<div class="skCk">'+canMedido(r).map(l=>'<div class="skA '+(r.sin?'warn':'ok')+'"><b>'+(r.sin?'!':'✓')+'</b><span><b>[Medido]</b> '+l+'</span></div>').join('')+'</div>'+
      mdHallazgosHTML(sk,'Las skills activas no encuentran nada anormal en la red.');
    if(!r.sin){const f=v=>v==null?'—':v.toFixed(2).replace('.',','),ns=v=>v==null?'—':Math.round(v*1e9),dm=r.lv.dif||2;
      h+='<div class="skTw" style="margin-top:10px"><table class="skTb ckT"><thead><tr><th>ID</th><th>Tramas</th><th>Dominante H / L (V)</th><th>Diferencial</th><th>Subida (ns)</th><th>Sobreosc.</th><th>CRC mal</th></tr></thead><tbody>'+
        r.U.map(u=>'<tr'+(mal.has(String(u.id))?' class="canMal"':'')+'><td class="nw"><b>'+canId(u)+'</b></td><td>'+u.n+'</td><td class="nw">'+f(u.dH)+' / '+f(u.dL)+'</td><td><div class="ckB'+(mal.has(String(u.id))?' lo':'')+'"><i style="width:'+Math.min(100,(u.dif||0)/3*100)+'%"></i><span>'+f(u.dif)+' V</span></div></td><td>'+ns(u.sube)+'</td><td>'+(u.ov==null?'—':Math.round(u.ov)+' %')+'</td><td>'+u.crc+'</td></tr>').join('')+'</tbody></table></div>';}
  }
  return h+'</div>';
}
function canWire(key){
  const e=$('kCnGo');if(!e)return;
  e.onclick=()=>{const o=SK.canO[key];o.ih=+$('kCn1').value;o.il=+$('kCn2').value;st('Analizando la red CAN…');
    setTimeout(()=>{try{SK.can[key]=canAnaliza(SK.csv[key].ds[0],o)}catch(er){SK.can[key]={err:'No se pudo analizar: '+er.message}}
      st(SK.can[key].err||'Análisis de la red CAN hecho.');skTab()},20)};
}
