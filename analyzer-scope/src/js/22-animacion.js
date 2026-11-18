/* ---------- Animación del motor: pistones y válvulas según el ángulo de cigüeñal del punto de la señal ----------
   Esquema genérico (no es la geometría real del motor): relación manivela/biela fija; la apertura de válvulas sale de las
   reglas AAA·RCE·AAE·RCA si están colocadas y, si no, de valores típicos que se indican en pantalla. */
const AM={on:false,t:null,play:false,raf:0,last:0},AM_L=.3,AM_TIP={aaa:10,rca:40,aae:40,rce:10};
function amVal(){const d=distCalc();return d&&d.ok?{aaa:d.aaa,rca:d.rca,aae:d.aae,rce:d.rce,med:true}:Object.assign({med:false},AM_TIP)}
/* estado del cilindro c en el instante t: a = grados desde su PMS de compresión (0-180 EXP, 180-360 ESC, 360-540 ADM, 540-720 COMP),
   s = recorrido del pistón (0 PMS, 1 PMI), li/le = alzada de admisión y escape (0-1) */
function amCyl(t,c,V){
  const N=eng.n,T=ph.T,i0=Math.max(0,eng.order.indexOf(eng.c0)),k=((eng.order.indexOf(c)-i0)%N+N)%N,tc=engA()+k*T/N;
  const a=(((t-tc)/T*720)%720+720)%720,th=a*Math.PI/180,sn=Math.sin(th),s=(1-Math.cos(th)+(1-Math.sqrt(1-AM_L*AM_L*sn*sn))/AM_L)/2;
  V=V||amVal();const lift=(o,cl)=>{let x=a;if(x<o-360)x+=720;if(x>cl+360)x-=720;return x>o&&x<cl?Math.pow(Math.sin(Math.PI*(x-o)/(cl-o)),2):0};
  return{a,s,th,le:lift(180-V.aae,360+V.rce),li:lift(360-V.aaa,540+V.rca),st:a<180?2:a<360?3:a<540?0:1};
}
/* pinta los cilindros en (0,0)-(W,Hh) del contexto g2 para el instante t (lo usan el panel y la barra de grados) */
function amPaint(g2,W,Hh,t,ov){
  const cs=getComputedStyle(document.body),lt=BD.classList.contains('light')&&!ov,tx=ov?'#f2f6fb':cs.getPropertyValue('--tx').trim(),bd=lt?'rgba(20,85,143,.55)':'rgba(190,210,235,.6)',
    gas=$('xF')&&$('xF').value==='diesel'?'diesel':'gasolina';
  const N=eng.n,V=amVal(),cw=Math.min(150,W/N),x0=(W-cw*N)/2,R=Math.max(6,Math.min(20,cw*.17,(Hh-92)/5)),L=R/AM_L,bw=Math.min(cw*.56,R*3.4),top=50,ph0=Math.max(8,R*.7);
  const q1=amCyl(t,1,V),cyc=(((t-ph.t0)/ph.T*720)%720+720)%720;
  g2.textAlign='center';
  for(let n=1;n<=N;n++){const q=amCyl(t,n,V),cx=x0+cw*(n-.5),cyc0=top+ph0/2+R+L+6,py=cyc0-(R*Math.cos(q.th)+Math.sqrt(L*L-R*R*Math.sin(q.th)**2)),pt=py-ph0/2,col=ST4[q.st][1];
    /* mezcla: puntos fijos por cilindro; entran en ADM, se aprietan en COMP, arden en EXP y salen en ESC */
    const ch=Math.max(1,pt-top),np=28,vis=q.st===0?q.s:q.st===3?q.s:1,burn=q.st===2&&q.a<60;
    for(let k=0;k<np;k++){if(k/np>=vis)break;const r1=Math.abs(Math.sin(n*12.9898+k*78.233)*43758.5453)%1,r2=Math.abs(Math.sin(n*39.3468+k*11.135)*24634.6345)%1;
      g2.fillStyle=burn?(k%3?'#ffb14d':'#ff6b4d'):q.st>=2?'#9aa6b3':'#3da5ff';g2.globalAlpha=burn?.95:.8;
      g2.beginPath();g2.arc(cx-bw/2+3+r1*(bw-6),top+2+r2*(ch-4),q.st===1?1.6+.8*(1-q.s):1.5,0,6.2832);g2.fill()}
    g2.globalAlpha=1;
    if(burn){g2.globalAlpha=.35*Math.max(0,1-q.a/60);g2.fillStyle='#ffb14d';g2.fillRect(cx-bw/2,top,bw,ch);g2.globalAlpha=1}
    /* camisa, culata y conductos */
    g2.strokeStyle=bd;g2.lineWidth=1.5;g2.beginPath();g2.moveTo(cx-bw/2,top);g2.lineTo(cx-bw/2,top+2*R+ph0+8);g2.moveTo(cx+bw/2,top);g2.lineTo(cx+bw/2,top+2*R+ph0+8);g2.moveTo(cx-bw/2,top);g2.lineTo(cx+bw/2,top);g2.stroke();
    /* válvulas con su leva (gira a la mitad que el cigüeñal): admisión izquierda azul, escape derecha rojo */
    [[-1,q.li,'#3da5ff',(360-V.aaa+540+V.rca)/2],[1,q.le,'#ff6b4d',(180-V.aae+360+V.rce)/2]].forEach(([sd,lf,vc,mid])=>{const vx=cx+sd*bw*.24,vy=top+lf*Math.min(9,R*.5),hw=bw*.17,cy2=top-30,cr=Math.min(6,bw*.12);
      g2.strokeStyle=g2.fillStyle=vc;g2.lineWidth=2;g2.beginPath();g2.moveTo(vx,top-20+lf*Math.min(9,R*.5));g2.lineTo(vx,vy);g2.stroke();
      g2.globalAlpha=lf>0?1:.55;g2.beginPath();g2.moveTo(vx-hw,vy+3.5);g2.lineTo(vx+hw,vy+3.5);g2.lineTo(vx+hw*.35,vy);g2.lineTo(vx-hw*.35,vy);g2.closePath();g2.fill();g2.globalAlpha=1;
      const ang=Math.PI/2+(q.a-mid)/2*Math.PI/180;g2.strokeStyle=bd;g2.lineWidth=1.2;g2.beginPath();g2.arc(vx,cy2,cr,0,6.2832);g2.stroke();
      g2.fillStyle=bd;g2.beginPath();g2.moveTo(vx+Math.cos(ang-.9)*cr,cy2+Math.sin(ang-.9)*cr);g2.lineTo(vx+Math.cos(ang)*cr*1.75,cy2+Math.sin(ang)*cr*1.75);g2.lineTo(vx+Math.cos(ang+.9)*cr,cy2+Math.sin(ang+.9)*cr);g2.closePath();g2.fill();
      if(lf>.05){g2.globalAlpha=.3+.6*lf;g2.fillStyle=vc;for(let k=0;k<3;k++){const u=((t/ph.T*8+k/3)%1);g2.beginPath();g2.arc(vx+sd*(hw+4)*(sd<0?1-u:u)*(sd<0?1:1),top+2+u*4,1.6,0,6.2832);g2.fill()}g2.globalAlpha=1}});
    /* bujía (gasolina) o inyector (diésel) en el centro de la culata */
    g2.strokeStyle=g2.fillStyle=tx;g2.lineWidth=2;g2.beginPath();g2.moveTo(cx,top-16);g2.lineTo(cx,top+1);g2.stroke();
    const near=q.a>705||q.a<8;
    if(near&&gas==='gasolina'){g2.strokeStyle='#ffe066';g2.lineWidth=1.5;for(let k=0;k<6;k++){const an=k*Math.PI/3;g2.beginPath();g2.moveTo(cx,top+3);g2.lineTo(cx+Math.cos(an)*6,top+3+Math.sin(an)*6);g2.stroke()}}
    if(near&&gas==='diesel'){g2.fillStyle='#ffe066';g2.globalAlpha=.7;g2.beginPath();g2.moveTo(cx,top+1);g2.lineTo(cx-bw*.3,top+Math.min(14,ch));g2.lineTo(cx+bw*.3,top+Math.min(14,ch));g2.closePath();g2.fill();g2.globalAlpha=1}
    /* pistón, biela y cigüeñal */
    g2.fillStyle=bd;g2.fillRect(cx-bw/2+1.5,pt,bw-3,ph0);
    const kx=cx+R*Math.sin(q.th),ky=cyc0-R*Math.cos(q.th);g2.strokeStyle=bd;g2.lineWidth=3;g2.beginPath();g2.moveTo(cx,py);g2.lineTo(kx,ky);g2.stroke();
    g2.lineWidth=1.2;g2.beginPath();g2.arc(cx,cyc0,R,0,6.2832);g2.stroke();g2.lineWidth=3;g2.beginPath();g2.moveTo(cx,cyc0);g2.lineTo(kx,ky);g2.stroke();
    g2.fillStyle=tx;g2.beginPath();g2.arc(kx,ky,2.6,0,6.2832);g2.fill();
    /* grados de cada cilindro en la misma escala que la regla de 720° (cilindro 1 = la regla) */
    const gd=Math.round((((q.a-q1.a+cyc)%720)+720)%720);
    g2.font='600 12px system-ui';g2.fillStyle=tx;g2.fillText('Cil. '+n+' · '+gd+'°',cx,13);g2.font='600 11px system-ui';g2.fillStyle=col;g2.fillText(ST4[q.st][0],cx,Hh-5)}
  return cyc;
}
function amDraw(){
  const c=$('anC'),r=c.getBoundingClientRect(),dp=devicePixelRatio||1,W=r.width,Hh=r.height;if(!W)return;c.width=W*dp;c.height=Hh*dp;
  const g2=c.getContext('2d');g2.setTransform(dp,0,0,dp,0,0);{const ft=g2.fillText.bind(g2);g2.fillText=(t,x,y)=>ft(i18(String(t)),x,y)}
  const mu=getComputedStyle(document.body).getPropertyValue('--mu').trim();
  g2.clearRect(0,0,W,Hh);g2.textAlign='center';
  if(!(ph.T>0)||!eng.on||AM.t==null){g2.fillStyle=mu;g2.font='13px system-ui';g2.fillText('Activa «Cilindros» y ajusta el ciclo de 720° para ver la animación',W/2,Hh/2);$('anT').textContent='';$('anN').textContent='';return}
  const V=amVal(),cyc=amPaint(g2,W,Hh,AM.t);
  $('anT').textContent=cyc.toFixed(0)+'° · '+fmt(AM.t,'s');
  $('anN').textContent=(V.med?'Válvulas según tus reglas AAA·RCE·AAE·RCA.':'Válvulas con valores típicos (coloca las reglas AAA·RCE·AAE·RCA para usar los tuyos).')+' Esquema genérico: no es la geometría real del motor.';
}
function amLine(){const l=$('anL'),u=AM.t==null?-1:(AM.t-view.t0)/view.span;l.hidden=!AM.on||u<0||u>1;if(!l.hidden){l.style.left=(M.l+u*PW())+'px';l.style.top=M.t+'px';l.style.height=PH()+'px'}}
function amSet(t,fromR){AM.t=t;if(!fromR)$('anR').value=Math.round(Math.max(0,Math.min(1,(t-view.t0)/view.span))*1000);amLine();amDraw()}
function amPlay(o){AM.play=o;$('anP').textContent=o?'⏸':'▶';cancelAnimationFrame(AM.raf);AM.last=0;if(!o)return;
  const f=ts=>{if(!AM.play||!AM.on)return;if(AM.last){let t=AM.t+(ts-AM.last)/7000*view.span;if(t>view.t0+view.span||t<view.t0)t=view.t0;amSet(t)}AM.last=ts;AM.raf=requestAnimationFrame(f)};AM.raf=requestAnimationFrame(f)}
function amOn(o){AM.on=o;$('anim').hidden=!o;$('tAnm').classList.toggle('on',o);if(!o){amPlay(false);amLine();draw();return}
  if(ph.T>0&&!eng.on)$('tGr').click();if(AM.t==null||AM.t<view.t0||AM.t>view.t0+view.span)AM.t=view.t0+view.span/2;draw();amSet(AM.t)}
$('tAnm').onclick=()=>{if(!CH.some(c=>c.x))return st('No hay señales cargadas.');closePops();amOn(!AM.on)};
$('anX').onclick=()=>amOn(false);$('anP').onclick=()=>amPlay(!AM.play);
$('anR').oninput=()=>{amPlay(false);amSet(view.t0+view.span*$('anR').value/1000,true)};
cv.addEventListener('pointermove',e=>{if(AM.on&&!AM.play&&e.pointerType!=='touch'&&!e.buttons&&e.offsetX>=M.l&&e.offsetX<=M.l+PW())amSet(tOf(e))});
{const d=draw;draw=function(...a){const r=d(...a);if(AM.on&&!a.length){amLine();if(!AM.play)amDraw()}return r}}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(AM.on)amDraw()}).observe($('anC'));
