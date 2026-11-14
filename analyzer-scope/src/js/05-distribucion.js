/* ---------- Diagrama de distribución ---------- */
function drawDist(cn,th,W,H){
  const D=th!=='light',g2=cn.getContext('2d');{const ft=g2.fillText.bind(g2);g2.fillText=(t,x,y)=>ft(i18(String(t)),x,y)}cn.width=W;cn.height=H;
  const bg=D?'#050a13':'#ffffff',tx=D?'#e6edf6':'#1b2430',mu=D?'#8fa2b8':'#6b7785',gr=D?'#22324a':'#d3dae3',
    cI=D?'#3da5ff':'#1f78d1',cE=D?'#ff6b4d':'#d63a1f',cO=D?'#ffd24d':'#d99a00',cA=D?'#ff7bf1':'#b3199e',cJ=D?['#7bffe3','#4dd2ff','#b6ff6b','#ffb84d','#c9a0ff']:['#0f8f7a','#1a6fb0','#3c8c1a','#b36b00','#6b3fc9'];
  g2.fillStyle=bg;g2.fillRect(0,0,W,H);
  const c=distCalc(),cx=W/2,cy=H/2+4,R=Math.min(W,H)*.285,wd=W*.045,f=v=>v.toFixed(1)+'°';
  const P=(r,t)=>[cx+r*Math.sin(t*Math.PI/180),cy-r*Math.cos(t*Math.PI/180)];
  const arc=(r,t0,t1,col,lw)=>{g2.beginPath();g2.arc(cx,cy,r,(t0-90)*Math.PI/180,(t1-90)*Math.PI/180);g2.lineWidth=lw;g2.strokeStyle=col;g2.stroke()};
  const txt=(s,x,y,col,al,fs)=>{g2.font=(fs||W*.024)+'px system-ui';g2.fillStyle=col||tx;g2.textAlign=al||'center';g2.fillText(s,x,y)};
  const rI=R+wd*.65,rE=R-wd*.65;
  [rI+wd/2,R,rE-wd/2].forEach(r=>arc(r,0,360,gr,1));
  g2.strokeStyle=gr;g2.lineWidth=1;g2.beginPath();g2.moveTo(cx,cy-R-wd*2.6);g2.lineTo(cx,cy+R+wd*2.6);g2.moveTo(cx-R-wd*2,cy);g2.lineTo(cx+R+wd*2,cy);g2.stroke();
  txt('PMS',cx,cy-R-wd*2.9,tx);txt('PMI',cx,cy+R+wd*3.5,tx);
  txt('Diagrama de distribución',cx,cy-4,tx,'center',W*.032);txt('ciclo de 720° · 4 tiempos',cx,cy+W*.032,mu);
  const ev=(t,s,col)=>{const [x0,y0]=P(R-wd*1.7,t),[x1,y1]=P(R+wd*1.7,t),sn=Math.sin(t*Math.PI/180);
    g2.strokeStyle=col;g2.lineWidth=2;g2.beginPath();g2.moveTo(x0,y0);g2.lineTo(x1,y1);g2.stroke();
    const [tx2,ty]=P(R+wd*2.2,t);txt(s,tx2,ty+4,col,Math.abs(sn)<.2?'center':sn>0?'left':'right')};
  if(c&&c.ok){
    arc(rI,-c.aaa,180+c.rca,cI,wd);arc(rE,180-c.aae,360+c.rce,cE,wd);if(c.cruce>0)arc(R,-c.aaa,c.rce,cO,wd*.4);
    ev(-c.aaa,'AAA '+f(Math.abs(c.aaa)),cI);ev(c.rce,'RCE '+f(Math.abs(c.rce)),cE);ev(180-c.aae,'AAE '+f(Math.abs(c.aae)),cE);ev(180+c.rca,'RCA '+f(Math.abs(c.rca)),cI);
    txt('Cruce '+f(c.cruce),cx,cy-R-wd*3.8,cO)}
  else txt('Coloca las reglas AAA, RCE, AAE y RCA en la pestaña Osciloscopio',cx,H-W*.06,mu);
  if(c&&c.adv!=null){const t=-c.adv,[x0,y0]=P(R-wd*1.9,t),[x1,y1]=P(R+wd*2,t);
    g2.strokeStyle=cA;g2.lineWidth=3.5;g2.beginPath();g2.moveTo(x0,y0);g2.lineTo(x1,y1);g2.stroke();
    const [tx2,ty]=P(R+wd*3.3,t);txt('A.Enc '+f(c.adv),tx2,ty,cA,'right')}
  if(c&&c.iny)c.iny.forEach((v,i)=>{const t=-v,col=cJ[i%cJ.length],[x0,y0]=P(R-wd*1.5,t),[x1,y1]=P(R+wd*1.6,t);
    g2.strokeStyle=col;g2.lineWidth=3;g2.setLineDash([5,4]);g2.beginPath();g2.moveTo(x0,y0);g2.lineTo(x1,y1);g2.stroke();g2.setLineDash([]);
    const [tx2,ty]=P(R+wd*2.1,t);txt(String(i+1),tx2,ty+4,col,'center',W*.022);txt(inyL(i)+' '+f(v),W*.04,W*.06+i*W*.034,col,'left',W*.026)});
  [[cI,'Admisión'],[cE,'Escape'],[cO,'Cruce'],[cA,'A.Enc'],...(c&&c.iny?[[cJ[0],'A.Iny']]:[])].forEach(([col,l],i,a)=>{const x=W*.06+i*W*(a.length>4?.18:.22);
    g2.fillStyle=col;g2.fillRect(x,H-W*.04,W*.025,W*.025);txt(l,x+W*.035,H-W*.02,tx,'left',W*.022)});
}

