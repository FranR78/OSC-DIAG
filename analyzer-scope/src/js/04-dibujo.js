/* ---------- Dibujo ---------- */
const M={l:76,t:60,r:14,b:26};
const PW=()=>cv.clientWidth-M.l-M.r,PH=()=>cv.clientHeight-M.t-M.b;
const LIGHT=['#1f5fd1','#d42a2a','#1a8f3e','#b58900','#6b46c1','#d46a00','#0e8fa3','#c2188a'];
const ST4=[['ADM','#3da5ff'],['COMP','#ffd24d'],['EXP','#ff6b4d'],['ESC','#9aa6b3']];
const ORD={1:['1'],2:['1-2'],3:['1-2-3','1-3-2'],4:['1-3-4-2','1-2-4-3'],5:['1-2-4-5-3'],6:['1-5-3-6-2-4','1-4-2-5-3-6','1-2-3-4-5-6'],
  8:['1-8-4-3-6-5-7-2','1-5-4-2-6-3-7-8','1-5-4-8-6-3-7-2','1-6-2-5-8-3-7-4'],10:['1-6-5-10-2-7-3-8-4-9','1-6-2-7-3-8-4-9-5-10'],
  12:['1-7-5-11-3-9-6-12-2-8-4-10'],16:['1-8-9-2-3-10-11-4-5-12-13-6-7-14-15-16']};
function sync(){[['tPh',ph.on],['tPms',pms.on],['tT',tr.on],['tT2',tr2.on],['tAmp',amp.on],['tGr',eng.on],['tVv',vv.on],['tAdv',adv.on]].forEach(([i,v])=>$(i).classList.toggle('on',v));[['kPh',ph],['kT',tr],['kT2',tr2],['kVv',vv]].forEach(([i,o])=>{$(i).textContent=o.lk?'🔒':'🔓';$(i).classList.toggle('on',!!o.lk)});$('tBox').hidden=!eng.on}
function ensureH(c){if(!c.h){const m=-c.off*c.vd;c.h=[m+c.vd,m-c.vd]}}
const w720=x=>((x+360)%720+720)%720-360;
const w360=x=>((x+180)%360+360)%360-180;
const refT=()=>pms.on&&pms.t!=null?pms.t:ph.t0,rel=t=>(t-refT())/ph.T*720;
let PK=[];
let bgV=0,BGL=0,BGO='#050a13',BGP='#0a1424',BGA='rgba(5,10,19,.85)';
const toRGB=c=>{if(c[0]==='#'){let h=c.slice(1);if(h.length===3)h=h.replace(/./g,'$&$&');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255]}return c.match(/[\d.]+/g).slice(0,3).map(Number)};
const lumRGB=a=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};
const lumHex=c=>lumRGB(toRGB(c));
const cr=c=>{const L=lumHex(c),a=Math.max(L,BGL),b=Math.min(L,BGL);return(a+.05)/(b+.05)};
const pkc=(b,d)=>cr(b)>=cr(d)?b:d,pkca=(a,b)=>a.map((v,i)=>pkc(v,b[i]));
const mixc=(a,b,t)=>{const x=toRGB(a),y=toRGB(b);return'rgb('+x.map((v,i)=>Math.round(v+(y[i]-v)*t))+')'};
const ann={tool:'none',col:'#ffd24d',w:2,list:[],cur:null};
const dtxt=(v,a,b)=>Math.abs(v).toFixed(1)+'° '+(v>=0?a:b);
function distCalc(){
  if(!(ph.T>0))return null;const R={};
  if([vv.ia,vv.fa,vv.ie,vv.fe].every(v=>v!=null)){
    // w360: la regla PMS puede estar en el PMS de compresión o en el de cruce (separados 360°); cada regla se mide al PMS/PMI más cercano
    R.aae=-w360(rel(vv.ie)+180);R.aaa=-w360(rel(vv.ia));R.rce=w360(rel(vv.fe));R.rca=w360(rel(vv.fa)-180);
    R.dadm=180+R.aaa+R.rca;R.desc=180+R.aae+R.rce;R.cruce=R.aaa+R.rce;R.ok=true}
  if(adv.t!=null){R.adv=w360(-rel(adv.t));R.advk=adv.k}
  return R;
}
function distRows(){
  const c=distCalc(),f=v=>v.toFixed(1)+'°',r=[];
  const pos=v=>Math.abs(v).toFixed(1)+'°'+(v<0?' ⚠':'');
  if(c&&c.ok)r.push(['AAA · avance apertura admisión (antes del PMS)',pos(c.aaa)],['RCE · retraso cierre escape (después del PMS)',pos(c.rce)],
    ['AAE · avance apertura escape (antes del PMI)',pos(c.aae)],['RCA · retraso cierre admisión (después del PMI)',pos(c.rca)],
    ['Duración de la admisión',f(c.dadm)],['Duración del escape',f(c.desc)],['Cruce de válvulas (AAA + RCE)',f(c.cruce)]);
  if(c&&c.adv!=null)r.push([(c.advk==='enc'?'A.Enc · avance de encendido':'A.Iny · avance de inyección')+' (respecto a la regla PMS)',f(c.adv)]);
  return r;
}
function draw(theme){
  const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1;
  cv.width=r.width*dpr;cv.height=r.height*dpr;g.setTransform(dpr,0,0,dpr,0,0);
  const Vb=theme==='light'?1:theme==='dark'?0:bgV,bo=[5,10,19].map(v=>Math.round(v+(255-v)*Vb)),bp=[10,20,36].map(v=>Math.round(v+(255-v)*Vb));
  BGO='rgb('+bo+')';BGP='rgb('+bp+')';BGA='rgba('+bo+',.85)';BGL=lumRGB(bp);
  const D=BGL<.179,W=r.width,H=r.height,pw=W-M.l-M.r,hh=H-M.t-M.b,yb=M.t+hh,X=t=>M.l+(t-view.t0)/view.span*pw;
  const cc=c=>pkc(c.c,LIGHT[CH.indexOf(c)]),txc=pkc('#b4c0cc','#2a3442'),rk=pkc('#8795a1','#5b6773'),OR=pkc('#ffb347','#c26a00'),OR2=pkc('#b8782a','#dba765');
  const TC=pkca(['#7cc4ff','#ff9ec7','#7dffb0','#ffe27d'],['#0a6fc2','#c2185b','#15803d','#a16207']);
  const VC=pkca(['#ff9a5c','#2ee6a0','#ff5c5c','#5ddc8a'],['#c2530a','#0f9d6c','#c92a2a','#15803d']);
  const AC=pkca(['#ff7bf1','#7bffe3'],['#b3199e','#0f8f7a']),PMC=pkc('#ff4d6d','#d11a40');
  const GRID=mixc(BGP,txc,.18),GRIDB=mixc(BGP,txc,.32);
  g.font='11px system-ui';
  const tag=(t,x,y,col,al)=>{g.textAlign=al||'left';const w=g.measureText(t).width,x0=al==='right'?x-w:al==='center'?x-w/2:x;
    g.fillStyle=BGA;g.fillRect(x0-3,y-11,w+6,15);g.fillStyle=col;g.fillText(t,x,y)};
  g.fillStyle=BGO;g.fillRect(0,0,W,H);g.fillStyle=BGP;g.fillRect(M.l,M.t,pw,hh);
  const T=ph.on&&ph.T>0?ph.T:0,RG=ph.deg||720,RT=T*RG/720;
  if(T){const x0=Math.max(M.l,X(ph.t0)),x1=Math.min(M.l+pw,X(ph.t0+RT));if(x1>x0){g.fillStyle=D?'rgba(255,179,71,.07)':'rgba(255,179,71,.10)';g.fillRect(x0,M.t,x1-x0,hh)}}
  g.strokeStyle=GRID;g.lineWidth=1;g.beginPath();
  for(let i=0;i<=10;i++){const x=Math.round(M.l+i*pw/10)+.5;g.moveTo(x,M.t);g.lineTo(x,yb)}
  for(let i=0;i<=8;i++){const y=Math.round(M.t+i*hh/8)+.5;g.moveTo(M.l,y);g.lineTo(M.l+pw,y)}g.stroke();
  g.strokeStyle=GRIDB;g.strokeRect(M.l+.5,M.t+.5,pw-1,hh-1);
  if(!CH.some(c=>c.x)){g.fillStyle=txc;g.textAlign='center';g.fillText('Abre un archivo CSV de tu osciloscopio o elige un ejemplo',M.l+pw/2,M.t+hh/2)}
  /* regla de tiempo (inferior) */
  g.strokeStyle=rk;g.fillStyle=txc;g.beginPath();
  for(let i=0;i<=10;i++){const x=Math.round(M.l+i*pw/10)+.5;g.moveTo(x,yb);g.lineTo(x,yb+7);
    if(i<10)for(let q=1;q<5;q++){const xs=Math.round(M.l+(i+q/5)*pw/10)+.5;g.moveTo(xs,yb);g.lineTo(xs,yb+3)}}
  g.stroke();
  for(let i=0;i<=10;i++){g.textAlign=i===0?'left':i===10?'right':'center';g.fillText(fmt(view.t0+view.span*i/10,'s'),M.l+i*pw/10,H-4)}
  /* regla de amplitud (izquierda) del canal seleccionado */
  const cs=CH[sel];
  if(cs&&cs.x){g.strokeStyle=g.fillStyle=cc(cs);g.textAlign='right';g.beginPath();
    for(let i=0;i<=8;i++){const y=Math.round(M.t+i*hh/8)+.5;g.moveTo(M.l,y);g.lineTo(M.l-7,y);
      if(i<8)for(let q=1;q<5;q++){const ys=Math.round(M.t+(i+q/5)*hh/8)+.5;g.moveTo(M.l,ys);g.lineTo(M.l-3,ys)}}
    g.stroke();
    for(let i=0;i<=8;i++)g.fillText(fmt((4-i-cs.off)*cs.vd,cs.u),M.l-10,M.t+i*hh/8+4);
    g.fillText(cs.n,M.l-10,M.t-6)}
  /* regla de fase (0-360° o 0-720°, con 2, 4 u 8 divisiones); 0° = INICIO (independiente de la regla PMS) */
  if(T){const dpt=720/T,step=RG/(ph.div||4),mn=step<=45?3:6,sub=step/mn,d0=(view.t0-ph.t0)*dpt,d1=(view.t0+view.span-ph.t0)*dpt,
      qa=Math.floor(d0/sub)-1,qb=Math.ceil(d1/sub)+1,minor=pw*(sub/dpt)/view.span>5,
      lab=d=>{const r=((d%RG)+RG)%RG;return d===0?'0°':d===RG?RG+'°':r===0?RG+'°/0°':+r.toFixed(1)+'°'};
    g.textAlign='center';g.lineWidth=1;
    for(let q=qa;q<=qb;q++){const dd=Math.round(q*sub*1000)/1000,x=X(ph.t0+dd/dpt);if(x<M.l-.5||x>M.l+pw+.5)continue;
      if(q%mn===0){g.strokeStyle=g.fillStyle=OR;
        g.setLineDash([4,4]);g.beginPath();g.moveTo(x,M.t);g.lineTo(x,yb);g.stroke();g.setLineDash([]);
        g.beginPath();g.moveTo(x,M.t-18);g.lineTo(x,M.t);g.stroke();g.fillText(lab(dd),x,M.t-22)}
      else if(minor){g.strokeStyle=OR2;g.beginPath();g.moveTo(x,M.t-7);g.lineTo(x,M.t);g.stroke()}}
    g.fillStyle=OR;g.textAlign='right';g.fillText('Fase',M.l-10,M.t-22);
    [[ph.t0,'INICIO 0°'],[ph.t0+RT,'FIN '+RG+'°']].forEach(([t,l])=>{const x=X(t);if(x<M.l-8||x>M.l+pw+8)return;
      g.fillStyle=g.strokeStyle=OR;g.lineWidth=2.5;g.beginPath();g.moveTo(x,M.t-30);g.lineTo(x,yb);g.stroke();
      g.beginPath();g.moveTo(x-7,M.t-42);g.lineTo(x+7,M.t-42);g.lineTo(x,M.t-30);g.closePath();g.fill();tag(l+(ph.lk?' 🔒':''),x>W-70?W-6:x,M.t-46,OR,x>W-70?'right':'center')})}
  /* zona de dibujo */
  g.save();g.beginPath();g.rect(M.l,M.t,pw,hh);g.clip();
  /* identificación de cilindros (overlay): números siempre visibles (solo los marcados); con un cilindro elegido sus 4 tiempos; o los tiempos de los marcados en filas verticales por orden de encendido */
  const EV=eng.on&&ph.T>0,N=eng.n,gold=pkc('#ffd24d','#9a6b00'),EVS=EV?engEvents():[],one=eng.show>0,multi=eng.show<0;
  PK=[];
  if(EV){
    EVS.forEach((e,i)=>{const nx=EVS[i+1],xc=X(e.t);
      if(nx&&eng.show===0){const xl=X((e.t+nx.t)/2);g.strokeStyle=gold;g.globalAlpha=.55;g.lineWidth=1;g.setLineDash([2,4]);g.beginPath();g.moveTo(xl,M.t);g.lineTo(xl,yb);g.stroke();g.setLineDash([]);g.globalAlpha=1}
      if(isVis(e.cyl)&&xc>M.l-12&&xc<M.l+pw+12){const hl=one?e.cyl===eng.show:(eng.sync&&e.cyl===eng.c0);
        g.globalAlpha=one&&!hl?.55:1;g.fillStyle=gold;g.beginPath();g.arc(xc,M.t+11,9,0,6.2832);g.fill();g.globalAlpha=1;
        if(hl){g.strokeStyle=pkc('#ffffff','#000000');g.lineWidth=2;g.stroke()}
        g.fillStyle=lumHex(gold)>.4?'#1b1400':'#fff';g.textAlign='center';g.font='bold 11px system-ui';g.fillText(e.cyl,xc,M.t+15);g.font='11px system-ui'}});
    if(one)EVS.filter(e=>e.cyl===eng.show).forEach(e=>{
      for(let s2=0;s2<4;s2++){const t0s=e.t+(s2-2)*ph.T/4,xa=X(t0s),xm=X(t0s+ph.T/8);
        g.strokeStyle=gold;g.globalAlpha=.6;g.lineWidth=1;g.setLineDash([2,4]);g.beginPath();g.moveTo(xa,M.t+22);g.lineTo(xa,yb);g.stroke();g.setLineDash([]);g.globalAlpha=1;
        if(xm>M.l&&xm<M.l+pw){g.fillStyle=gold;g.textAlign='center';g.fillText(ST4[s2][0],xm,M.t+38)}}});
    if(multi){const T=ph.T,i0=Math.max(0,eng.order.indexOf(eng.c0)),rot=[...eng.order.slice(i0),...eng.order.slice(0,i0)].filter(isVis),rh=14,y0=M.t+26;
      rot.forEach((cyl,r)=>{const y=y0+r*(rh+1);
        EVS.filter(e=>e.cyl===cyl).forEach(e=>{for(let s2=0;s2<4;s2++){const ta=e.t+(s2-2)*T/4,xa=X(ta),xb=X(ta+T/4);
          const x0=Math.max(xa,M.l+24),x1=Math.min(xb,M.l+pw);if(x1-x0<3)continue;
          g.globalAlpha=D?.38:.45;g.fillStyle=ST4[s2][1];g.fillRect(x0,y,x1-x0-1,rh);g.globalAlpha=1;
          g.strokeStyle=ST4[s2][1];g.lineWidth=1;g.strokeRect(x0+.5,y+.5,x1-x0-2,rh-1);
          if(x1-x0>34){g.fillStyle=pkc('#f2f6fb','#1b2430');g.textAlign='center';g.fillText(ST4[s2][0],(x0+x1)/2,y+rh-3)}}});
        g.fillStyle=gold;g.textAlign='left';g.font='bold 10px system-ui';g.fillText('C'+cyl,M.l+3,y+rh-3);g.font='11px system-ui'})}
  }
  /* trazas */
  const t1=view.t0+view.span;
  CH.forEach((c,ci)=>{
    if(!c.on||!c.x)return;
    const Y=v=>M.t+hh/2-(v/c.vd+c.off)*hh/8;
    g.strokeStyle=cc(c);g.lineWidth=ci===sel?1.8:1.2;g.beginPath();
    const ia=Math.max(0,lb(c.x,view.t0)-1),ib=Math.min(c.x.length,lb(c.x,t1)+1);
    if(ib-ia<pw*2){for(let i=ia;i<ib;i++){const px=X(c.x[i]);i===ia?g.moveTo(px,Y(c.y[i])):g.lineTo(px,Y(c.y[i]))}}
    else{let first=true;for(let p=0;p<pw;p++){
      const a=lb(c.x,view.t0+view.span*p/pw),b=lb(c.x,view.t0+view.span*(p+1)/pw);if(b<=a)continue;
      let mn=Infinity,mx=-Infinity;for(let i=a;i<b;i++){const v=c.y[i];if(v<mn)mn=v;if(v>mx)mx=v}
      const px=M.l+p;if(first){g.moveTo(px,Y(mn));first=false}else g.lineTo(px,Y(mn));g.lineTo(px,Y(mx))}}
    g.stroke();
  });
  if(EV&&eng.pk&&CH[sel]&&CH[sel].x){const c=CH[sel],pk=[];
    for(let i=1;i<EVS.length-1;i++){const ta=(EVS[i-1].t+EVS[i].t)/2,tb=(EVS[i].t+EVS[i+1].t)/2;
      if(ta<view.t0||tb>view.t0+view.span)continue;
      const i0=lb(c.x,ta),i1=Math.min(c.x.length,lb(c.x,tb));if(i1-i0<2)continue;
      let mx=-Infinity,im=i0;for(let j=i0;j<i1;j++)if(c.y[j]>mx){mx=c.y[j];im=j}
      pk.push({cyl:EVS[i].cyl,v:mx,t:c.x[im]})}
    if(pk.length){const avg=pk.reduce((a,p)=>a+p.v,0)/pk.length,Y=v=>M.t+hh/2-(v/c.vd+c.off)*hh/8;pk.avg=avg;PK=pk;
      g.strokeStyle=gold;g.lineWidth=1;g.setLineDash([3,3]);g.beginPath();g.moveTo(M.l,Y(avg));g.lineTo(M.l+pw,Y(avg));g.stroke();g.setLineDash([]);
      pk.forEach(p=>{const dev=avg?(p.v-avg)/Math.abs(avg)*100:0,col=dev<=-10?(pkc('#ff5c5c','#c92a2a')):dev<=-5?(pkc('#ffb347','#c26a00')):(pkc('#5ddc8a','#15803d')),x=X(p.t),y=Y(p.v);p.dev=dev;
        g.fillStyle=col;g.beginPath();g.moveTo(x-5,y-12);g.lineTo(x+5,y-12);g.lineTo(x,y-4);g.closePath();g.fill();
        tag('C'+p.cyl+' '+fmt(p.v,c.u)+' ('+(dev>=0?'+':'')+dev.toFixed(1)+'%)',x,y-16,col,'center')})}}
  if(amp.on)CH.forEach((c,ci)=>{if(!c.on||!c.x||!c.hr)return;ensureH(c);const col=cc(c);
    const ys=c.h.map(v=>M.t+hh/2-(v/c.vd+c.off)*hh/8),xa=M.l+pw-16-ci*11;
    g.strokeStyle=g.fillStyle=col;g.lineWidth=1;g.setLineDash([6,3]);g.beginPath();ys.forEach(y=>{g.moveTo(M.l,y);g.lineTo(M.l+pw,y)});g.stroke();g.setLineDash([]);
    ys.forEach((y,i)=>{g.fillRect(M.l+pw-9,y-4,9,8);tag(fmt(c.h[i],c.u),M.l+4,y-3,col)});
    g.beginPath();g.moveTo(xa,ys[0]);g.lineTo(xa,ys[1]);g.stroke();
    tag('Dif '+fmt(Math.abs(c.h[0]-c.h[1]),c.u),xa-4,(ys[0]+ys[1])/2+4,col,'right')});
  [[tr,'a','b','T1','T2',TC[0],TC[1],M.t+34],[tr2,'c','d','T3','T4',TC[2],TC[3],yb-34]].forEach(([q,ka,kb,la,lb2,c1,c2,ya])=>{
    if(!q.on||cur[ka]==null||cur[kb]==null)return;
    [[la,cur[ka],c1],[lb2,cur[kb],c2]].forEach(([l,t,col])=>{const x=X(t);
      g.strokeStyle=col;g.lineWidth=1.6;g.beginPath();g.moveTo(x,M.t);g.lineTo(x,yb);g.stroke();tag(l,x+5,ya-20,col)});
    const xa=X(cur[ka]),xb=X(cur[kb]),d=Math.abs(cur[kb]-cur[ka]);
    g.strokeStyle=pkc('#fff','#111');g.lineWidth=1;g.beginPath();g.moveTo(xa,ya);g.lineTo(xb,ya);g.moveTo(xa,ya-4);g.lineTo(xa,ya+4);g.moveTo(xb,ya-4);g.lineTo(xb,ya+4);g.stroke();
    tag((q.lk?'🔒 ':'')+'Δt '+fmt(d,'s')+(d?'  ·  '+fmt(1/d,'Hz'):'')+(ph.T>0?'  ·  '+(d/ph.T*720).toFixed(1)+'°':''),(xa+xb)/2,ya-6,pkc('#fff','#111'),'center')});
  if(pms.on&&pms.t!=null){const x=X(pms.t);g.strokeStyle=PMC;g.lineWidth=2.2;g.beginPath();g.moveTo(x,M.t);g.lineTo(x,yb);g.stroke();
    tag('PMS · 0° · '+fmt(pms.t,'s'),x+5,yb-8,PMC)}
  const dc=distCalc();
  if(vv.on)[['ie','AAE','aae','APMI','DPMI'],['ia','AAA','aaa','APMS','DPMS'],['fe','RCE','rce','DPMS','APMS'],['fa','RCA','rca','DPMI','APMI']].forEach(([k,l,f,p,n],i)=>{
    if(vv[k]==null)return;const x=X(vv[k]);if(x<M.l-2||x>M.l+pw+2)return;
    g.strokeStyle=VC[i];g.lineWidth=2;g.beginPath();g.moveTo(x,M.t);g.lineTo(x,yb);g.stroke();
    tag(l+(dc&&dc.ok?' '+dtxt(dc[f],p,n):'')+(vv.lk?' 🔒':''),x+5,M.t+58+i*16,VC[i])});
  if(adv.on&&adv.t!=null){const x=X(adv.t),col=adv.k==='enc'?AC[0]:AC[1];g.strokeStyle=col;g.lineWidth=2.4;g.setLineDash([8,4]);
    g.beginPath();g.moveTo(x,M.t);g.lineTo(x,yb);g.stroke();g.setLineDash([]);
    tag((adv.k==='enc'?'A.Enc':'A.Iny')+(dc&&dc.adv!=null?' '+dtxt(dc.adv,'APMS','DPMS'):''),x+5,M.t+128,col)}
  /* leyenda de parámetros */
  let ly=M.t+14;CH.forEach(c=>{if(c.on&&c.x&&c.p){tag('● '+c.n+' · '+c.p,M.l+8,ly,cc(c));ly+=16}});
  if(eng.on)tag('Cil. '+(eng.show>0?eng.show:'1-'+eng.n)+' · orden '+eng.order.join('-'),M.l+8,ly,pkc('#ffd24d','#9a6b00'));
  CH.forEach((c,ci)=>{if(!c.on||!c.x)return;const y=arrowY(c),col=cc(c);
    if(ci===sel){g.strokeStyle=col;g.globalAlpha=.45;g.lineWidth=1;g.setLineDash([2,4]);g.beginPath();g.moveTo(M.l+24,y);g.lineTo(M.l+pw,y);g.stroke();g.setLineDash([]);g.globalAlpha=1}
    g.fillStyle=col;g.strokeStyle=BGP;g.lineWidth=1.5;g.beginPath();
    g.moveTo(M.l,y-8);g.lineTo(M.l+14,y-8);g.lineTo(M.l+24,y);g.lineTo(M.l+14,y+8);g.lineTo(M.l,y+8);g.closePath();g.fill();g.stroke();
    g.fillStyle=lumHex(col)>.4?'#0b1018':'#ffffff';g.textAlign='center';g.font='bold 10px system-ui';g.fillText(ci+1,M.l+8,y+3.5);g.font='11px system-ui'});
  drawAnn(g,X,hh,D);
  g.restore();
  $('phi').textContent=ph.T>0?'720° = '+fmt(ph.T,'s')+' · 1° = '+fmt(ph.T/720,'s')+' · '+Math.round(120/ph.T)+' rpm (4 tiempos = 2 vueltas)':'Sin datos.';
  return measure();
}

