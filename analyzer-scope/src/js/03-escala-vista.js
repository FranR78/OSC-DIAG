/* ---------- Escala / vista ---------- */
function rng(c){let mn=Infinity,mx=-Infinity;for(let i=0;i<c.y.length;i++){const v=c.y[i];if(v<mn)mn=v;if(v>mx)mx=v}return[mn,mx]}
function autoCh(i){const c=CH[i];if(!c.y)return;c.h=null;const[a,b]=rng(c);c.vd=nice(Math.max(b-a,1e-6)/6);c.ref=(a+b)/2;c.off=-c.ref/c.vd}
function refOf(c){if(c.ref==null){const[a,b]=rng(c);c.ref=(a+b)/2}return c.ref}
const rawY=c=>M.t+PH()/2-(refOf(c)/c.vd+c.off)*PH()/8;
const arrowY=c=>Math.max(M.t+8,Math.min(M.t+PH()-8,rawY(c)));
function fit(){let a=Infinity,b=-Infinity;CH.forEach(c=>{if(c.x&&c.on&&c.x.length){a=Math.min(a,c.x[0]);b=Math.max(b,c.x[c.x.length-1])}});
  if(isFinite(a)){view.t0=a;view.span=Math.max(b-a,1e-9);if(ph.auto){ph.t0=a;ph.T=view.span*720/(ph.deg||720)}}}
const lb=(x,t)=>{let l=0,h=x.length;while(l<h){const m=(l+h)>>1;x[m]<t?l=m+1:h=m}return l};

