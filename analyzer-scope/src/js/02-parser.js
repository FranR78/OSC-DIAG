/* ---------- Parser multiformato (CSV/TSV/TXT) ---------- */
function parseText(txt){
  txt=txt.replace(/^\uFEFF/,'');
  const L=txt.split(/\r?\n/);
  const num=s=>{s=s.trim().replace(/^"|"$/g,'');return s!==''&&/^[+-]?(\d+[.,]?\d*|[.,]\d+)([eE][+-]?\d+)?$/.test(s)};
  const dl=l=>l.includes(';')?';':l.includes('\t')?'\t':l.includes(',')?',':null;
  let k=-1,D=null;
  for(let i=0;i<L.length-1&&i<400;i++){
    const d=dl(L[i]);if(!d)continue;
    const a=L[i].split(d),b=L[i+1].split(d);
    if(a.length>=2&&a.every(num)&&b.length===a.length&&b.every(num)){k=i;D=d;break}
  }
  if(k<0)throw new Error('No se encontraron columnas numéricas');
  const nc=L[k].split(D).length,meta={},tit=[];
  for(let i=0;i<k;i++){
    const c=L[i].split(D).map(s=>s.trim().replace(/^"|"$/g,''));
    if(c.length===nc&&c.every(s=>!num(s)))tit.push(c);
    else if(c[0]&&c[1]!==undefined&&c[0].endsWith(':'))meta[c[0].slice(0,-1).toLowerCase()]=c[1];
    else if(c[0]&&c[1]&&c.length===2)meta[c[0].toLowerCase()]=c[1];
  }
  let names=null,units=null;
  if(tit.length){const last=tit[tit.length-1];
    if(tit.length>=2&&last.every(s=>/^([\(\[].{0,10}[\)\]])?$/.test(s))){units=last;names=tit[tit.length-2]}else names=last}
  const cols=Array.from({length:nc},()=>new Float64Array(L.length-k)),dm=D!==',';let n=0;
  for(let i=k;i<L.length;i++){const q=L[i];if(!q)continue;const c=(dm?q.replace(/,/g,'.'):q).split(D);if(c.length!==nc)continue;
    let ok=true;for(let j=0;j<nc;j++){const v=+c[j];if(v!==v||c[j].trim()===''){ok=false;break}cols[j][n]=v}if(ok)n++}
  let tscale=1;const tu=((units&&units[0])||(names&&names[0])||'').toLowerCase();
  if(/\(?ms\)?/.test(tu)&&!/\(s\)/.test(tu))tscale=1e-3;else if(/(µs|us)/.test(tu))tscale=1e-6;else if(/ns/.test(tu))tscale=1e-9;
  const hasT=names?/time|tiempo|^t$|^x|sec|\(s\)|\(ms\)/i.test(names[0]):(nc>1&&monotonic(cols[0],n));
  const x=new Float64Array(n);
  if(hasT)for(let i=0;i<n;i++)x[i]=cols[0][i]*tscale;
  else{const dt=meta.rate?1/parseFloat(meta.rate):1;for(let i=0;i<n;i++)x[i]=i*dt}
  const c0=hasT?1:0,out=[];
  for(let c=c0;c<nc;c++){const y=new Float32Array(n);for(let i=0;i<n;i++)y[i]=cols[c][i];
    out.push({n:(names&&names[c])||('CH'+(c-c0+1)),x,y,u:(units&&units[c]?units[c].replace(/[()\[\]\s]/g,''):'V')})}
  return{chs:out,meta,n,_h:{D,nc,dm,tscale,hasT,dt:meta.rate?1/parseFloat(meta.rate):1,bpl:txt.length/Math.max(1,L.length)}};
}
function monotonic(a,n){for(let i=1;i<Math.min(n,200);i++)if(a[i]<a[i-1])return false;return true}

/* ---------- Lectura por trozos (archivos grandes: no se carga el texto entero) ---------- */
let BIGF=25e6;
async function parseStream(f,prog){
  let head=await f.slice(0,4e6).text(),cfg=null;
  const m=/^﻿?#analyzer-scope-ajustes;([^\r\n]*)\r?\n/.exec(head);
  if(m){try{cfg=JSON.parse(m[1])}catch(e){}head=head.slice(m[0].length)}
  head=head.slice(0,262144);head=head.slice(0,head.lastIndexOf('\n'));
  const r0=parseText(head),{D,nc,dm,tscale,hasT,dt,bpl}=r0._h,ny=hasT?nc-1:nc;
  let cap=Math.max(4096,Math.ceil(f.size/Math.max(4,bpl)*1.05)),n=0,X=new Float64Array(cap),Y=Array.from({length:ny},()=>new Float32Array(cap));
  const grow=()=>{cap=Math.ceil(cap*1.5);const x=new Float64Array(cap);x.set(X);X=x;Y=Y.map(y=>{const z=new Float32Array(cap);z.set(y);return z})};
  const tmp=new Float64Array(nc),o=hasT?1:0;
  const row=q=>{if(!q)return;const c=(dm?q.replace(/,/g,'.'):q).split(D);if(c.length!==nc)return;
    for(let j=0;j<nc;j++){const v=+c[j];if(v!==v||c[j].trim()==='')return;tmp[j]=v}
    if(n>=cap)grow();X[n]=hasT?tmp[0]*tscale:n*dt;for(let j=0;j<ny;j++)Y[j][n]=tmp[j+o];n++};
  const rd=f.stream().getReader(),dec=new TextDecoder();let rest='',done=0,last=0;
  for(;;){const{value,done:end}=await rd.read();if(end)break;
    const t=rest+dec.decode(value,{stream:true});let a=0,b;
    while((b=t.indexOf('\n',a))>=0){row(t.charCodeAt(b-1)===13?t.slice(a,b-1):t.slice(a,b));a=b+1}
    rest=t.slice(a);done+=value.length;
    if(prog&&done-last>4e6){last=done;prog(done/f.size);await new Promise(q=>setTimeout(q))}}
  row(rest.replace(/\r$/,''));
  if(!n)throw new Error('No se encontraron columnas numéricas');
  const x=X.slice(0,n);
  return{chs:r0.chs.map((c,j)=>({n:c.n,u:c.u,x,y:Y[j].slice(0,n)})),meta:r0.meta,n,cfg};
}
async function readAny(f,prog){
  if(f.size<BIGF)return parseAny(await f.text(),f.name);
  const r=await parseStream(f,prog);return[{name:f.name,chs:r.chs,n:r.n,meta:r.meta,cfg:r.cfg}];
}

