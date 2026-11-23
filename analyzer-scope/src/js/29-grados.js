/* ---------- Barra de grados: línea arrastrable dentro del ciclo de 720° con sus grados arriba ----------
   Mientras se arrastra, la animación de los cilindros aparece sobre la señal; al soltar, se quita (la barra se queda). */
const gd={on:false,t:null,drag:false};
function gdX(){return M.l+(gd.t-view.t0)/view.span*PW()}
function gdDeg(t){return(t-ph.t0)/ph.T*720}
function gdOn(o){gd.on=o;$('tGd').classList.toggle('on',o);if(o&&ph.T>0&&(gd.t==null||gd.t<view.t0||gd.t>view.t0+view.span))gd.t=Math.max(view.t0,Math.min(view.t0+view.span,ph.t0+ph.T*.425));if(o&&!(ph.T>0))st('Coloca primero las reglas de fase (ciclo de 720°).');draw()}
function gdPaint(){
  if(!gd.on||!(ph.T>0)||gd.t==null)return;const x=gdX(),pw=PW(),ph2=PH();if(x<M.l-1||x>M.l+pw+1)return;
  const lab=gdDeg(gd.t).toFixed(0)+'°';
  g.save();g.strokeStyle=bgV>.6?'#12263a':'#ffffff';g.lineWidth=gd.drag?2:1.5;g.beginPath();g.moveTo(x+.5,M.t);g.lineTo(x+.5,M.t+ph2);g.stroke();
  g.font='bold 12px '+FONT_UI;const w=g.measureText(lab).width+12;g.fillStyle=bgV>.6?'#12263a':'#ffffff';g.fillRect(x-w/2,M.t-36,w,17);
  g.fillStyle=bgV>.6?'#ffffff':'#050a13';g.textAlign='center';g.fillText(lab,x,M.t-23);
  if(gd.drag&&eng.on){const W=Math.min(pw-16,eng.n*150),Hh=Math.min(ph2*.62,250),ox=M.l+(pw-W)/2,oy=M.t+(ph2-Hh)/2;
    g.globalAlpha=.86;g.fillStyle='#0b1626';g.fillRect(ox,oy,W,Hh);g.globalAlpha=1;g.strokeStyle='rgba(190,210,235,.6)';g.lineWidth=1;g.strokeRect(ox+.5,oy+.5,W-1,Hh-1);
    g.translate(ox,oy);amPaint(g,W,Hh,gd.t,true)}
  g.restore();g.font='11px '+FONT_UI}
{const d=draw;draw=function(...a){const r=d(...a);gdPaint();return r}}
/* arrastre: tiene prioridad sobre el resto cuando el dedo o el ratón está a menos de 12 px de la barra */
cv.addEventListener('pointerdown',e=>{if(!gd.on||!(ph.T>0)||gd.t==null||zm.on||ann.tool!=='none')return;
  if(Math.abs(e.offsetX-gdX())>(e.pointerType==='touch'?18:10)||e.offsetY<M.t-40||e.offsetY>M.t+PH())return;
  e.stopImmediatePropagation();try{cv.setPointerCapture(e.pointerId)}catch(_){}gd.drag=true;draw()},true);
cv.addEventListener('pointermove',e=>{if(!gd.drag)return;e.stopImmediatePropagation();gd.t=Math.max(view.t0,Math.min(view.t0+view.span,tOf(e)));draw();if(AM.on){amPlay(false);amSet(gd.t)}},true);
const gdUp=e=>{if(!gd.drag)return;e.stopImmediatePropagation();gd.drag=false;draw()};
cv.addEventListener('pointerup',gdUp,true);cv.addEventListener('pointercancel',gdUp,true);
$('tGd').onclick=()=>gdOn(!gd.on);
