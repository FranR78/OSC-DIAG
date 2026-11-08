/* ---------- Superponer capturas por el cilindro 1 (no simultáneas) ----------
   Cada captura lleva la referencia del cilindro 1 en el mismo canal. Se detecta un disparo por ciclo (trigEvents),
   y cada ciclo se pasa a grados con SU periodo real (compensa la variación de rpm entre ciclos y capturas).
   Resultado: una página con eje de tiempo «virtual» x = θ/720·T0 (T0 = periodo mediano) para que la regla de fase,
   los cilindros y el resto de herramientas funcionen igual. El disparo cae en 360° − avance (cilindro 1 a 360°). */
const SUP_P=3000;   // muestras por ciclo de 720°
function supFile(d,ri,edge){
  const ref=d.chs[ri];if(!ref)return{err:'no tiene el canal de referencia CH'+(ri+1)};
  const E=trigEvents(ref,edge,.35);if(E.length<3)return{err:'menos de 3 disparos en la referencia'};
  const iv=[];for(let i=1;i<E.length;i++)iv.push(E[i]-E[i-1]);const s=iv.slice().sort((a,b)=>a-b),T=s[s.length>>1];
  const irr=iv.some(v=>Math.abs(v/T-1)>.25);return{E,T,irr};
}
const supAt=(c,t)=>{const x=c.x,n=x.length;if(t<=x[0])return c.y[0];if(t>=x[n-1])return c.y[n-1];const j=lb(x,t),a=x[j-1],b=x[j];return c.y[j-1]+(c.y[j]-c.y[j-1])*(t-a)/(b-a)};
function fSup(){
  const L=QF.filter(q=>q.ds&&q.ds.length).map(q=>({name:q.name.replace(/\.[^.]+$/,''),d:q.ds[0]}));
  if(L.length<2)return fst('Añade al menos dos capturas para superponerlas.');
  const ri=+$('sRef').value,edge=$('sRe').value,adv=+$('sRa').value||0,inc=$('sRi').checked,msg=[];
  const R=L.map(f=>Object.assign(f,supFile(f.d,ri,edge)));const bad=R.filter(f=>f.err);
  if(bad.length)return fst(bad.map(f=>f.name+': '+f.err).join(' | ')+'. Revisa el canal de referencia o el flanco.');
  const K=Math.max(1,Math.min(+$('sRk').value||2,...R.map(f=>f.E.length-2))),Ts=R.map(f=>f.T).sort((a,b)=>a-b),T0=Ts[Ts.length>>1];
  const n=SUP_P*K,x=new Float64Array(n);for(let i=0;i<n;i++)x[i]=i/SUP_P*T0;
  const th0=360-adv,chs=[];
  const tOfTh=(E,j,th)=>{const te=720*j+th0,k=j+1;   // ciclo j alrededor del disparo E[k] (se usan E[k−1] y E[k+1])
    return th>=te?E[k]+(th-te)/720*(E[k+1]-E[k]):E[k]-(te-th)/720*(E[k]-E[k-1])};
  const take=(f,c,nm)=>{if(chs.length>=8){msg.push('más de 8 canales: se omite '+nm);return}const y=new Float32Array(n);
    for(let i=0;i<n;i++){const th=i/SUP_P*720,j=Math.min(K-1,Math.floor(th/720));y[i]=supAt(c,tOfTh(f.E,j,th))}chs.push({n:nm,u:c.u||'V',x,y})};
  R.forEach((f,fi)=>f.d.chs.forEach((c,ci)=>{if(ci===ri&&!(inc&&fi===0))return;take(f,c,(ci===ri?'Ref. cil. 1':f.name)+' · '+c.n)}));
  const rpm=R.map(f=>Math.round(120/f.T)),sp=(Math.max(...rpm)-Math.min(...rpm))/Math.min(...rpm)*100;
  if(sp>10)msg.push('⚠ las rpm varían un '+sp.toFixed(0)+' % entre capturas');
  R.filter(f=>f.irr).forEach(f=>msg.push('⚠ '+f.name+': disparos irregulares (¿más de un pulso por ciclo?)'));
  const cfg={ph:{on:true,auto:false,t0:0,T:T0,deg:720},eng:{on:true,A:(360)/720*T0,c0:1,sync:null},view:{t0:0,span:K*T0}};
  addPages([{name:'Superposición · '+R.length+' capturas (no simultáneas)',chs,n,meta:{},cfg}]);showTab('S');
  const info='Superpuestas '+R.length+' capturas por el cilindro 1: '+K+' ciclo(s), '+chs.length+' canales · rpm '+rpm.join(' / ')+'. No son simultáneas.'+(msg.length?' '+msg.join(' · '):'');
  fst(info);st(info);
}
$('fSup').onclick=fSup;
