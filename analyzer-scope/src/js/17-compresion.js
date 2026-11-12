/* ---------- Compresión relativa (pinza en el motor de arranque + sincronismo de un cilindro) ---------- */
// Colores fijos por cilindro: 1 azul, 2 rojo, 3 verde, 4 amarillo, 5 morado, 6 naranja, 7 cian, 8 rosa…
const CRC=['#2f7bff','#ff3b3b','#22c55e','#ffd400','#9b5cff','#ff8a00','#00c8d7','#ff5fb0','#a0703c','#9aa6b3','#7a9a01','#e8e8e8'];
const crCol=c=>CRC[(c-1)%CRC.length];
let crRes=null,crMsg='';
const crV=id=>{const v=$(id).value;return v===''||v==null?-1:+v};
function crFill(){
  const opts=sel=>'<option value="-1">— elige canal —</option>'+CH.map((c,i)=>c.x?'<option value="'+i+'"'+(i===sel?' selected':'')+'>'+c.n+(c.u?' ('+c.u+')':'')+'</option>':'').join('');
  const L=CH.map((c,i)=>c.x?i:-1).filter(i=>i>=0),vI=crV('crI'),vS=crV('crS');
  $('crS').innerHTML=opts(CH[vS]&&CH[vS].x?vS:L.length?L[0]:-1);
  $('crI').innerHTML=opts(CH[vI]&&CH[vI].x?vI:L.length>1?L[1]:-1);
  const y=+$('crY').value||1;$('crY').innerHTML=Array.from({length:eng.n},(_,i)=>'<option value="'+(i+1)+'"'+(i+1===y?' selected':'')+'>'+(i+1)+'</option>').join('');
  $('crM').textContent=eng.n+' cilindros · orden de encendido '+eng.order.join('-')+' (se cambia en «Identificación de cilindros»)';
}
// Picos de corriente de arranque por cilindro. El disparo (inyección o chispa) del cilindro elegido marca su PMS de compresión;
// el resto de cilindros va cada 720°/n según el orden de encendido. Una ventana de ±360°/n alrededor de cada PMS.
function crCalc(si,ii,cyl){
  const S=CH[si],I=CH[ii],N=eng.n,ord=eng.order;
  const E=trigEvents(S,'up',.35);if(E.length<2)return{err:'No se detectan al menos dos disparos en '+S.n+': hace falta un ciclo completo.'};
  const d=[];for(let k=1;k<E.length;k++)d.push(E[k]-E[k-1]);d.sort((a,b)=>a-b);const T=d[d.length>>1];
  if(d[0]<T*.6)return{err:'Los disparos de '+S.n+' no son de un solo cilindro (uno por ciclo). Usa la señal de un solo inyector o bobina.'};
  const x=I.x,y=I.y,n=y.length,dt=(x[n-1]-x[0])/(n-1),k=Math.max(1,Math.round(.004/dt)),sm=new Float64Array(n);
  let acc=0;for(let i=0;i<n;i++){acc+=y[i];if(i>=k)acc-=y[i-k];sm[i]=acc/Math.min(i+1,k)}  // media móvil de 4 ms (quita el rizado de las delgas)
  const sh=Math.floor(k/2),at=t=>Math.min(n-1,Math.max(0,Math.round((t-x[0])/dt)+sh)),i0=ord.indexOf(cyl),P={};
  ord.forEach(c=>P[c]=[]);
  const kMin=Math.floor((x[0]-E[0])/T)-1,kMax=Math.ceil((x[n-1]-E[0])/T)+1;
  for(let kc=kMin;kc<=kMax;kc++)for(let j=0;j<N;j++){
    const tc=E[0]+kc*T+j*T/N,a=tc-T/N/2,b=tc+T/N/2;if(a<x[0]||b>x[n-1])continue;
    let m=-Infinity;for(let i=at(a),e=at(b);i<=e;i++)if(sm[i]>m)m=sm[i];
    P[ord[(i0+j)%N]].push(m)}
  const R=ord.slice().sort((a,b)=>a-b).map(c=>{const v=P[c];return{cyl:c,n:v.length,pk:v.length?v.reduce((s,q)=>s+q,0)/v.length:null}});
  if(R.some(r=>!r.n))return{err:'La captura no cubre todos los cilindros: hace falta al menos un ciclo completo (720°) de arranque.'};
  const mx=Math.max(...R.map(r=>r.pk));R.forEach(r=>r.pc=r.pk/mx*100);
  return{R,T,rpm:120/T,u:I.u||'A',sN:S.n,iN:I.n,cyl};
}
function crGo(){
  const si=crV('crS'),ii=crV('crI'),cyl=+$('crY').value||1;
  if(!(si>=0&&CH[si]&&CH[si].x)||!(ii>=0&&CH[ii]&&CH[ii].x)){crRes=null;crMsg='Elige el canal de sincronismo y el de la pinza del motor de arranque.';return crOut()}
  if(si===ii){crRes=null;crMsg='El sincronismo y la corriente deben ser canales distintos.';return crOut()}
  const r=crCalc(si,ii,cyl);
  if(r.err){crRes=null;crMsg=r.err}
  else{crRes=r;const lo=r.R.filter(q=>q.pc<90).map(q=>q.cyl);
    crMsg='Arranque a '+Math.round(r.rpm)+' rpm · '+Math.min(...r.R.map(q=>q.n))+' compresiones por cilindro promediadas. '+(lo.length?'Por debajo del 90 %: cilindro '+lo.join(', ')+'.':'Todos los cilindros por encima del 90 %.')}
  crOut();
}
function crDraw(){
  const cn=$('cv3'),W=700,H=460,g3=cn.getContext('2d');cn.width=W;cn.height=H;
  {const ft=g3.fillText.bind(g3);g3.fillText=(t,x,y)=>ft(i18(String(t)),x,y)}
  const tx='#e6edf6',mu='#8fa2b8',gr='#22324a';
  g3.fillStyle='#050a13';g3.fillRect(0,0,W,H);
  const txt=(s,x,y,col,al,fs,b)=>{g3.font=(b?'bold ':'')+(fs||13)+'px system-ui';g3.fillStyle=col||tx;g3.textAlign=al||'center';g3.fillText(s,x,y)};
  txt('Compresión relativa',W/2,30,tx,'center',18,1);
  const r=crRes,ml=56,mr=16,mt=56,mb=56,pw=W-ml-mr,ph2=H-mt-mb,Y=v=>mt+ph2*(1-v/100);
  g3.strokeStyle=gr;g3.lineWidth=1;
  for(let v=0;v<=100;v+=20){g3.beginPath();g3.moveTo(ml,Y(v)+.5);g3.lineTo(W-mr,Y(v)+.5);g3.stroke();txt(v+' %',ml-8,Y(v)+4,mu,'right',12)}
  if(!r){txt('Carga la captura, elige los canales y pulsa «Analizar»',W/2,H/2,mu);return}
  txt('mejor cilindro = 100 % · '+Math.min(...r.R.map(q=>q.n))+' ciclos',W/2,48,mu,'center',12);
  const n=r.R.length,bw=pw/n;
  r.R.forEach((q,i)=>{const x0=ml+i*bw+bw*.18,w=bw*.64,c=crCol(q.cyl);
    g3.fillStyle=c;g3.fillRect(x0,Y(q.pc),w,Y(0)-Y(q.pc));
    txt(q.pc.toFixed(1)+' %',x0+w/2,Y(q.pc)-8,q.pc<90?'#ff6b6b':tx,'center',14,1);
    txt('Cil. '+q.cyl,x0+w/2,Y(0)+20,c,'center',14,1);
    txt(fmt(q.pk,r.u),x0+w/2,Y(0)+38,mu,'center',11)});
  g3.strokeStyle='#ff6b6b';g3.setLineDash([6,5]);g3.beginPath();g3.moveTo(ml,Y(90)+.5);g3.lineTo(W-mr,Y(90)+.5);g3.stroke();g3.setLineDash([]);
}
function crOut(){$('crSt').textContent=crMsg;crDraw()}
function crTab(){crFill();crOut()}
$('crGo').onclick=crGo;$('tabC').onclick=()=>showTab('C');
