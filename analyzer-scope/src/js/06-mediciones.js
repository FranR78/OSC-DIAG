/* ---------- Mediciones ---------- */
function measure(){
  const c=CH[sel],R=[],dg=t=>ph.T>0?((t-ph.t0)/ph.T*720).toFixed(1)+'°':null;
  if(c&&c.x){
    const a=lb(c.x,view.t0),b=Math.min(c.x.length,lb(c.x,view.t0+view.span)),u=c.u;
    if(b-a>1){let mn=Infinity,mx=-Infinity,s=0,s2=0;
      for(let i=a;i<b;i++){const v=c.y[i];if(v<mn)mn=v;if(v>mx)mx=v;s+=v;s2+=v*v}
      const n=b-a,mean=s/n,rms=Math.sqrt(s2/n),thr=(mn+mx)/2;let cr=[],hi=0;
      for(let i=a+1;i<b;i++){if(c.y[i]>=thr)hi++;if(c.y[i-1]<thr&&c.y[i]>=thr)cr.push(c.x[i-1]+(thr-c.y[i-1])/(c.y[i]-c.y[i-1])*(c.x[i]-c.x[i-1]))}
      const T=cr.length>1?(cr[cr.length-1]-cr[0])/(cr.length-1):null;
      R.push(['Canal',c.n+(c.p?' · '+c.p:'')],['Mín',fmt(mn,u)],['Máx',fmt(mx,u)],['Pico a pico',fmt(mx-mn,u)],['Media',fmt(mean,u)],['RMS',fmt(rms,u)],
        ['Periodo',T?fmt(T,'s'):'—'],['Frecuencia',T?fmt(1/T,'Hz'):'—'],['Ciclo útil',((hi/n)*100).toFixed(1)+' %'],['Muestras vista',n]);
    }
  }
  const v=(q,t)=>q.y[Math.min(q.x.length-1,lb(q.x,t))];
  if(pms.on&&pms.t!=null){R.push(['PMS (t)',fmt(pms.t,'s')]);if(dg(pms.t))R.push(['PMS (fase)',dg(pms.t)])}
  if(tr.on&&cur.a!=null&&cur.b!=null){const d=cur.b-cur.a;
    R.push(['T1',fmt(cur.a,'s')],['T2',fmt(cur.b,'s')],['Tiempo T1–T2',fmt(Math.abs(d),'s')],['1/Δt',d?fmt(1/Math.abs(d),'Hz'):'—']);
    if(ph.T>0)R.push(['Fase T1',dg(cur.a)],['Fase T2',dg(cur.b)],['Δ fase',(Math.abs(d)/ph.T*720).toFixed(1)+'°']);
    if(pms.on&&pms.t!=null&&ph.T>0)R.push(['T1 desde PMS',((cur.a-pms.t)/ph.T*720).toFixed(1)+'°'],['T2 desde PMS',((cur.b-pms.t)/ph.T*720).toFixed(1)+'°']);
    CH.forEach(q=>{if(q.on&&q.x)R.push([q.n+' en T1 / T2',fmt(v(q,cur.a),q.u)+' / '+fmt(v(q,cur.b),q.u)])})}
  if(tr2.on&&cur.c!=null&&cur.d!=null){const d=cur.d-cur.c;R.push(['T3',fmt(cur.c,'s')],['T4',fmt(cur.d,'s')],['Tiempo T3–T4',fmt(Math.abs(d),'s')],['1/Δt (T3–T4)',d?fmt(1/Math.abs(d),'Hz'):'—']);
    if(ph.T>0)R.push(['Δ fase T3–T4',(Math.abs(d)/ph.T*720).toFixed(1)+'°'])}
  if(amp.on)CH.forEach(q=>{if(q.on&&q.x&&q.hr&&q.h)R.push([q.n+' amplitud','H1 '+fmt(q.h[0],q.u)+' · H2 '+fmt(q.h[1],q.u)+' · Δ '+fmt(Math.abs(q.h[0]-q.h[1]),q.u)])});
  if(PK.length){const u=CH[sel].u;R.push(['Pico medio '+CH[sel].n,fmt(PK.avg,u)]);PK.slice(0,16).forEach(p=>R.push(['Pico cil. '+p.cyl,fmt(p.v,u)+' ('+(p.dev>=0?'+':'')+p.dev.toFixed(1)+' %)']))}
  const dc=distCalc();
  if(dc&&dc.ok&&vv.on)R.push(['AAA',Math.abs(dc.aaa).toFixed(1)+'°'],['RCE',Math.abs(dc.rce).toFixed(1)+'°'],['AAE',Math.abs(dc.aae).toFixed(1)+'°'],['RCA',Math.abs(dc.rca).toFixed(1)+'°'],['Cruce',dc.cruce.toFixed(1)+'°']);
  if(dc&&dc.adv!=null&&adv.on)R.push([adv.k==='enc'?'A.Enc':'A.Iny',dc.adv.toFixed(1)+'°']);
  $('rd').innerHTML=R.map(([k,x])=>'<div><b>'+k+'</b> '+x+'</div>').join('');
  return R;
}

