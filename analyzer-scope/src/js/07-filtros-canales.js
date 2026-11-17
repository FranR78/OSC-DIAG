/* ---------- Filtros, inversión y panel de canales ---------- */
const FD={usuario:[500,0],bajo:[1000,0],alto:[100,0],banda:[100,1000]};
function filt2(x,t,fc,fs){
  const w=2*Math.PI*fc/fs,cs=Math.cos(w),al=Math.sin(w)/(2*Math.SQRT1_2),a0=1+al;
  const b0=(t==='lp'?(1-cs):(1+cs))/2/a0,b1=(t==='lp'?(1-cs):-(1+cs))/a0,A1=-2*cs/a0,A2=(1-al)/a0,n=x.length;
  const run=(src,dst,s0,e,d)=>{const m=src[s0];let z1=0,z2=0;
    for(let i=s0;i!==e;i+=d){const v=src[i]-m,o=b0*v+z1;z1=b1*v-A1*o+z2;z2=b0*v-A2*o;dst[i]=o+(t==='lp'?m:0)}};
  const y=new Float64Array(n),z=new Float64Array(n);run(x,y,0,n,1);run(y,z,n-1,-1,-1);return z;
}
function proc(c){
  if(!c.y0)return;
  let y=c.y0;const n=c.x.length,fs=n>1?(n-1)/(c.x[n-1]-c.x[0]):0,ny=fs/2;
  if(c.fl!=='off'&&fs>0){
    const lo=Math.min(c.f1,c.f2),hi=Math.max(c.f1,c.f2);
    const spec=c.fl==='alto'?[['hp',c.f1]]:c.fl==='banda'?[['hp',lo],['lp',hi]]:[['lp',c.f1]];
    let a=Float64Array.from(y),bad=false;
    for(const [t,fc] of spec){if(!(fc>0&&fc<ny*.98)){bad=true;continue}a=filt2(a,t,fc,fs)}
    if(bad)st(c.n+': el corte debe ser menor que '+fmt(ny*.98,'Hz')+' (frecuencia de Nyquist).');
    y=Float32Array.from(a);
  }
  /* sensor: convierte la unidad del archivo (V, mV…) a la magnitud real (bar, A…): valor = k·lectura + o */
  if(c.sen){if(!c._su){c.ur=c.u;c._su=true}c.u=c.sen.u;const k=+c.sen.k||1,o=+c.sen.o||0,z=new Float32Array(y.length);for(let i=0;i<z.length;i++)z[i]=y[i]*k+o;y=z}
  else if(c._su){c.u=c.ur;c._su=false}
  if(c.inv){const z=new Float32Array(y.length);for(let i=0;i<z.length;i++)z[i]=-y[i];y=z}
  c.y=y;
}
const escH=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* Nombre del canal: viene del CSV y se puede cambiar; el cambio vale para todas las páginas (buffers) con ese mismo nombre */
function setName(i,v){const c=CH[i],d=PG[pgI]&&PG[pgI].chs[i],old=d&&d.y===c.y0?d.n:null;
  if(old!=null)PG.forEach(p=>{const q=p.chs[i];if(q&&q.n===old)q.n=v});c.n=v}
let chOpen=-1;
function updChips(){const cp=$('chips');cp.innerHTML='';
  CH.forEach((c,i)=>{if(!c.x)return;const b=document.createElement('button');b.className='chip'+(c.on?'':' off')+(i===chOpen?' cur':'');
    b.innerHTML='<i class="dot" style="background:'+c.c+'"></i><b>'+escH(c.n)+'</b><span>'+fmtV(c.vd,c.u)+'/div</span>'+(c.fl!=='off'?'<b class="fb" title="Filtro activo: la forma de la señal está modificada">F</b>':'');
    b.onclick=()=>chipClick(i);cp.appendChild(b)});
  if(!cp.children.length)cp.innerHTML='<span class="chE">Abre un CSV o elige un ejemplo</span>';
  $('empty').hidden=CH.some(c=>c.x)}
/* Sensores de uso general (factor por voltio). Los propios se guardan en el navegador. */
const SEN0=[['Presión · 1 V = 1 bar',1,'bar'],['Presión · 1 V = 10 bar',10,'bar'],['Vacío · 1 V = 100 mbar',100,'mbar'],['Pinza 100 mV/A',10,'A'],['Pinza 10 mV/A',100,'A'],['Pinza 1 mV/A',1000,'A']];
function senList(){let m=[];try{m=JSON.parse(localStorage.getItem('as_sensores')||'[]')||[]}catch(e){}return SEN0.concat(m.filter(q=>q&&q.length===3))}
function senSave(s){let m=[];try{m=JSON.parse(localStorage.getItem('as_sensores')||'[]')||[]}catch(e){}const n='1 V = '+s.k+' '+s.u;if(!senList().some(q=>q[1]===s.k&&q[2]===s.u)){m.push([n,s.k,s.u]);try{localStorage.setItem('as_sensores',JSON.stringify(m.slice(-12)))}catch(e){}}}
function senSet(i,s){const c=CH[i];c.sen=s;c.h=null;proc(c);autoCh(i);mathAll();ui();draw()}
function ui(){
  $('chs').innerHTML='';
  CH.forEach((c,i)=>{
    const w=document.createElement('div');w.className='chb'+(i===chOpen?' cur':'');
    const d=document.createElement('div');d.className='ch';
    d.innerHTML='<input type="checkbox" title="Mostrar canal" '+(c.on?'checked':'')+(c.x?'':' disabled')+'>'+
      '<span class="lab'+(i===sel?' sel':'')+'"><i class="dot" style="background:'+c.c+'"></i>'+escH(c.n)+(c.fl!=='off'&&c.x?' <b class="fb" title="Filtro activo: la forma de la señal está modificada">F</b>':'')+(c.x&&!c.m?'<button class="ed" title="Cambiar el nombre del canal">✎</button>':'')+'</span>'+
      '<select class="st" title="Escala por división">'+(VD.includes(c.vd)?VD:VD.concat(c.vd).sort((a,b)=>a-b)).map(v=>'<option value="'+v+'"'+(v===c.vd?' selected':'')+'>'+fmtV(v,c.u)+'/div</option>').join('')+'</select>'+
      '<input class="st" type="number" step="0.5" value="'+(+c.off.toFixed(2))+'" title="Posición (div)">'+
      '<input class="st" type="checkbox" title="Reglas de amplitud de este canal" '+(c.hr?'checked':'')+'>';
    const k=d.children;
    k[0].onchange=()=>{c.on=k[0].checked;updChips();draw()};k[1].onclick=()=>{sel=i;ui();draw()};
    k[2].onchange=()=>{c.vd=+k[2].value;updChips();draw()};k[3].oninput=()=>{c.off=+k[3].value||0;draw()};
    k[4].onchange=()=>{c.hr=k[4].checked;draw()};
    const ed=k[1].querySelector('.ed');if(ed)ed.onclick=ev=>{ev.stopPropagation();
      const inp=document.createElement('input');inp.type='text';inp.className='nmI';inp.maxLength=24;inp.value=c.n;k[1].replaceWith(inp);inp.focus();inp.select();let done=false;
      const fin=ok=>{if(done)return;done=true;const v=inp.value.trim();if(ok&&v&&v!==c.n)setName(i,v);ui();sync();draw()};
      inp.onkeydown=e2=>{e2.stopPropagation();if(e2.key==='Enter')fin(true);else if(e2.key==='Escape')fin(false)};inp.onblur=()=>fin(true)};
    const e=document.createElement('div');e.className='ch2 st';
    e.innerHTML='<select title="Filtro del canal">'+[['off','Sin filtro'],['usuario','Usuario'],['bajo','Paso bajo'],['alto','Paso alto'],['banda','Ancho de banda']].map(([v,t])=>'<option value="'+v+'"'+(c.fl===v?' selected':'')+'>'+t+'</option>').join('')+'</select>'+
      '<input type="number" min="1" step="10" value="'+c.f1+'" title="Frecuencia de corte (Hz)"'+(c.fl==='off'||!c.x?' disabled':'')+'>'+
      '<input type="number" min="1" step="10" value="'+c.f2+'" title="Corte superior (Hz), solo ancho de banda"'+(c.fl==='banda'?'':' disabled')+'>'+
      '<button class="tog'+(c.inv?' on':'')+'" title="Invertir la señal del canal">Invertir</button>';
    const q=e.children;
    q[0].onchange=()=>{c.fl=q[0].value;if(FD[c.fl]){c.f1=FD[c.fl][0];if(FD[c.fl][1])c.f2=FD[c.fl][1]}proc(c);ui();draw()};
    q[1].onchange=()=>{c.f1=+q[1].value||1;proc(c);draw()};
    q[2].onchange=()=>{c.f2=+q[2].value||1;proc(c);draw()};
    q[3].onclick=()=>{if(!c.x)return;c.inv=!c.inv;c.off=-c.off;if(c.ref!=null)c.ref=-c.ref;if(c.h)c.h=c.h.map(v=>-v);proc(c);ui();draw()};
    const e3=document.createElement('div');e3.className='ch3 st';
    {const raw=c._su?c.ur:c.u,mv=/^mV$/i.test(raw||'')?1e-3:1,L=senList(),cur=c.sen?L.findIndex(q=>Math.abs(q[1]*mv-c.sen.k)<1e-12&&q[2]===c.sen.u&&!c.sen.o):-2;
     e3.innerHTML='<select title="Sensor: convierte la lectura a la magnitud real (bar, A…)"'+(c.x&&!c.m?'':' disabled')+'><option value="">Sin sensor</option>'+L.map((q,j)=>'<option value="'+j+'"'+(j===cur?' selected':'')+'>'+escH(q[0])+'</option>').join('')+'<option value="c"'+(c.sen&&cur<0?' selected':'')+'>Personalizado…</option></select>'+
       (c.sen?'<input type="number" step="any" value="'+c.sen.k+'" title="Factor: unidades del sensor por cada '+escH(raw||'V')+' del archivo"><input type="text" maxlength="6" value="'+escH(c.sen.u)+'" title="Unidad del sensor"><input type="number" step="any" value="'+(c.sen.o||0)+'" title="Desplazamiento (se suma tras multiplicar)"><button title="Guardar este sensor para otros canales">Guardar</button>':'');
     const s3=e3.children;
     s3[0].onchange=()=>{const v=s3[0].value;if(v==='')senSet(i,null);else if(v==='c')senSet(i,c.sen||{k:1,o:0,u:raw||'V'});else{const q=L[+v];senSet(i,{k:q[1]*mv,o:0,u:q[2]})}};
     if(c.sen){const up=()=>senSet(i,{k:+s3[1].value||1,u:s3[2].value.trim()||'ud',o:+s3[3].value||0});s3[1].onchange=s3[2].onchange=s3[3].onchange=up;
       s3[4].onclick=()=>{senSave({k:c.sen.k/mv,u:c.sen.u});ui();st('Sensor guardado en este navegador.')}}}
    const pr=document.createElement('input');pr.type='text';pr.className='par';pr.placeholder=i18('Parámetro medido (p. ej. Presión admisión)');pr.maxLength=40;pr.value=c.p||'';pr.oninput=()=>{c.p=pr.value;draw()};w.appendChild(d);w.appendChild(pr);w.appendChild(e);w.appendChild(e3);$('chs').appendChild(w);
  });
  updChips();fillSC();
}

