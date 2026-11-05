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
  if(c.inv){const z=new Float32Array(y.length);for(let i=0;i<z.length;i++)z[i]=-y[i];y=z}
  c.y=y;
}
function ui(){
  $('chs').innerHTML='';
  CH.forEach((c,i)=>{
    const w=document.createElement('div');w.className='chb';
    const d=document.createElement('div');d.className='ch';
    d.innerHTML='<input type="checkbox" title="Mostrar canal" '+(c.on?'checked':'')+(c.x?'':' disabled')+'>'+
      '<span class="lab'+(i===sel?' sel':'')+'"><i class="dot" style="background:'+c.c+'"></i>'+c.n+'</span>'+
      '<select class="st" title="Escala por división">'+VD.map(v=>'<option value="'+v+'"'+(v===c.vd?' selected':'')+'>'+fmt(v,c.u)+'/div</option>').join('')+'</select>'+
      '<input class="st" type="number" step="0.5" value="'+(+c.off.toFixed(2))+'" title="Posición (div)">'+
      '<input class="st" type="checkbox" title="Reglas de amplitud de este canal" '+(c.hr?'checked':'')+'>';
    const k=d.children;
    k[0].onchange=()=>{c.on=k[0].checked;draw()};k[1].onclick=()=>{sel=i;ui();draw()};
    k[2].onchange=()=>{c.vd=+k[2].value;draw()};k[3].oninput=()=>{c.off=+k[3].value||0;draw()};
    k[4].onchange=()=>{c.hr=k[4].checked;draw()};
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
    const pr=document.createElement('input');pr.type='text';pr.className='par';pr.placeholder=i18('Parámetro medido (p. ej. Presión admisión)');pr.maxLength=40;pr.value=c.p||'';pr.oninput=()=>{c.p=pr.value;draw()};w.appendChild(d);w.appendChild(pr);w.appendChild(e);$('chs').appendChild(w);
  });
  fillSC();
}

