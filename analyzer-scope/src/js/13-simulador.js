/* ---------- Adquisición: simulador ---------- */
function frame(rate,data){
  data.forEach((y,i)=>{if(!y)return;const n=y.length,x=new Float64Array(n);for(let k=0;k<n;k++)x[k]=k/rate;
    const c=CH[i],first=!c.x;c.x=x;c.y0=Float32Array.from(y);proc(c);if(first){c.on=true;c.vd=1;c.off=-2+0*i}});
  if(!frame.ok){frame.ok=1;CH.forEach((c,i)=>c.x&&autoCh(i));fit();ui()}draw();
}
let simPh=0;
function sim(){const rate=100000,n=5000,out=[];
  for(let ch=0;ch<8;ch++){const y=new Float32Array(n),f=50*(ch+1);
    for(let k=0;k<n;k++){const t=(k+simPh)/rate,s=Math.sin(2*Math.PI*f*t);
      y[k]=ch%3===0?2.5+2.5*s:ch%3===1?(s>0?5:0):2*s+0.3*Math.sin(2*Math.PI*2000*t)}out.push(y)}
  simPh+=n/7;frame(rate,out)}
function start(){
  const s=$('src').value;frame.ok=0;
  if(s==='sim'){timer=setInterval(sim,100);st('Simulador en marcha.')}
  else return st('Elige «Simulador» en el desplegable de fuente; en modo archivo usa «Abrir archivos».');
  $('bRun').textContent='Parar';
}
function stop(){clearInterval(timer);timer=null;$('bRun').textContent='Iniciar'}
$('bRun').onclick=()=>timer?stop():start();
