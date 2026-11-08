/* ---------- Cilindros: eventos, sincronización por disparo y tiempos ---------- */
const isVis=c=>!eng.vis||eng.vis[c-1]!==false;
function engA(){return eng.A!=null?eng.A:ph.t0+ph.T/2}
function engEvents(a,b){
  if(!(ph.T>0))return[];const N=eng.n,step=ph.T/N,A=engA(),i0=Math.max(0,eng.order.indexOf(eng.c0));
  a=a==null?view.t0:a;b=b==null?view.t0+view.span:b;
  const j0=Math.floor((a-A)/step)-1,j1=Math.ceil((b-A)/step)+1,ev=[];
  for(let j=j0;j<=j1;j++)ev.push({t:A+j*step,cyl:eng.order[(((i0+j)%N)+N)%N],j});
  return ev;
}
function cylData(){return cylDataAll().filter(d=>isVis(d.cyl))}
function cylDataAll(){
  if(!(ph.T>0)||!(eng.on||eng.sync))return[];
  const N=eng.n,T=ph.T,A=engA(),S=eng.sync,ev=engEvents(A-T/N/2,A+T).filter(e=>e.t>=A-T/N/2).slice(0,N);
  return ev.map((e,j)=>({j:j+1,cyl:e.cyl,trig:S&&S.E?(S.mode==='one'?(j===0?S.E[0]:null):(S.E[j]!=null?S.E[j]:null)):null,tdc:e.t,deg:((e.t-ph.t0)/T*720).toFixed(1)+'°',
    st:[['ADM','0°–180°',-.5,-.25],['COMP','180°–360°',-.25,0],['EXP','360°–540°',0,.25],['ESC','540°–720°',.25,.5]].map(([n,a,f0,f1],i)=>({n,a,t0:e.t+f0*T,t1:e.t+f1*T,c:ST4[i][1]}))}));
}
function cylList(){
  const el=$('tCy');if(!el)return;const D=cylData();
  if(!D.length){el.innerHTML='<p class="hint">'+(cylDataAll().length?'Ningún cilindro marcado: marca los que quieras ver.':'Activa «Cilindros» o elige el canal de disparo, el cilindro al que corresponde y pulsa «Sincronizar».')+'</p>';return}
  el.innerHTML='<p class="hint" style="margin:2px 0 6px">Separación entre cilindros: 720°/'+eng.n+' = '+(720/eng.n).toFixed(1)+'° · '+fmt(ph.T/eng.n,'s')+' · mostrando '+D.length+' de '+eng.n+'</p>'+
    D.map(d=>'<div class="cy'+(d.cyl===eng.show?' sel':'')+'"><b>Nº '+d.j+' · Cilindro '+d.cyl+'</b><div class="s"><span>Disparo</span><span>'+fmt(d.trig,'s')+'</span></div><div class="s"><span>PMS compresión</span><span>'+fmt(d.tdc,'s')+' · '+d.deg+'</span></div>'+
    d.st.map(q=>'<div class="s"><span><i style="background:'+q.c+'"></i>'+q.n+' '+q.a+'</span><span>'+fmt(q.t0,'s')+' → '+fmt(q.t1,'s')+'</span></div>').join('')+'</div>').join('');
}
function fillSC(){
  const v=$('sC').value||'-1';
  $('sC').innerHTML='<option value="-1">— elige canal —</option>'+CH.map((c,i)=>c.x?'<option value="'+i+'">'+c.n+(c.p?' · '+c.p:'')+'</option>':'').join('');
  $('sC').value=v;
}
function groupIv(iv){
  let G=iv.map(a=>a.slice());
  for(let it=0;it<5&&G.length>2;it++){
    const gp=[];for(let i=1;i<G.length;i++)gp.push(Math.max(G[i][0]-G[i-1][1],1e-9));
    const sg=gp.slice().sort((a,b)=>a-b);let best=0,cut=0;
    for(let i=1;i<sg.length;i++){const r=sg[i]/sg[i-1],need=(sg.length-i)>=0.5*i?2.5:8;if(r>need&&r>best){best=r;cut=Math.sqrt(sg[i]*sg[i-1])}}
    if(!cut)break;
    const out=[G[0].slice()];for(let i=1;i<G.length;i++){if(gp[i-1]>cut)out.push(G[i].slice());else out[out.length-1][1]=G[i][1]}
    G=out;
  }
  return G;
}
function trigEvents(c,edge,frac){
  const y=c.y,x=c.x,n=y.length;if(n<10)return[];
  const stp=Math.max(1,Math.floor(n/50000)),sm=[];for(let i=0;i<n;i+=stp)sm.push(y[i]);sm.sort((a,b)=>a-b);const med=sm[sm.length>>1];
  let pk=0;for(let i=0;i<n-1;i++){const d=Math.min(Math.abs(y[i]-med),Math.abs(y[i+1]-med));if(d>pk)pk=d}
  if(!(pk>0))return[];
  const hi=pk*(frac||.35),lo=hi*.6,iv=[];let on=false,s0=0;
  for(let i=0;i<n;i++){const d=Math.abs(y[i]-med);
    if(!on&&d>hi){on=true;s0=x[i]}else if(on&&d<lo){on=false;iv.push([s0,x[i]])}}
  if(on)iv.push([s0,x[n-1]]);
  return groupIv(iv).map(g=>edge==='up'?g[0]:g[1]);
}
function syncCyl(){
  const v=$('sC').value,ci=v===''?-1:+v;if(!(ci>=0)||!CH[ci]||!CH[ci].x)return st('Elige el canal que contiene la señal de disparo (encendido o inyección).');
  const kind=$('sK').value,edge=$('sE').value,cyl=+$('sY').value,N=eng.n,c=CH[ci],mode=$('sM').value;
  const frac=Math.min(90,Math.max(5,+$('sU').value||35))/100;
  const E=trigEvents(c,edge,frac);
  if(E.length<2)return st('No se detectaron disparos suficientes en '+c.n+' (umbral '+Math.round(frac*100)+' % del pico). Prueba con el otro flanco o baja el umbral.');
  const d=[];for(let i=1;i<E.length;i++)d.push(E[i]-E[i-1]);d.sort((a,b)=>a-b);
  const med=d[Math.floor(d.length/2)],T=mode==='all'?med*N:med,adv=+$('sA').value||0,idx0=eng.order.indexOf(cyl);
  const A=E[0]+adv*T/720;ph.T=T;ph.auto=false;ph.t0=A-T/2-idx0*T/N;
  eng.A=A;eng.c0=cyl;eng.on=true;eng.show=0;eng.sync={ch:ci,kind,edge,cyl,adv,mode,t0:A,n:E.length,E:E.slice(0,2*N)};
  $('rpm').value=Math.round(120/T);fillG();sync();draw();cylList();
  const rpm=120/T;
  st('Sincronizado con '+c.n+': '+E.length+' disparos '+(mode==='all'?'(uno por cilindro)':'del cilindro '+cyl+' (uno por ciclo)')+'; ciclo de 720° = '+fmt(T,'s')+' ('+Math.round(rpm)+' rpm). El primer disparo es del cilindro '+cyl+' y sigue el orden de encendido '+eng.order.join('-')+'.'+(rpm<150||rpm>12000?' Aviso: revoluciones poco habituales; revisa «Pulsos del canal» o el umbral.':''));
}

