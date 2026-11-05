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
  return{chs:out,meta,n};
}
function monotonic(a,n){for(let i=1;i<Math.min(n,200);i++)if(a[i]<a[i-1])return false;return true}

