/* ---------- Lupa: recuadro sobre la señal = ampliar esa zona (tiempo y, si el recuadro es alto, también amplitud) ---------- */
const zm={on:false,r:null,st:[]};
const zmSnap=()=>({t0:view.t0,span:view.span,ch:CH.map(c=>[c.vd,c.off])});
function zmPush(){zm.st.push(zmSnap());if(zm.st.length>30)zm.st.shift()}
function zmSet(o){zm.on=o;$('tZm').classList.toggle('on',o);$('zb').hidden=!o;$('zmR').hidden=true;zm.r=null;cv.style.cursor=o?'zoom-in':'crosshair';
  if(o&&ann.tool!=='none')setTool('none');if(o)st('Lupa: arrastra un recuadro sobre la zona que quieres ver. Esc para salir.')}
function zmBox(){const r=zm.r,b=$('zmR'),x=Math.min(r.x0,r.x1),y=Math.min(r.y0,r.y1);b.style.left=x+'px';b.style.top=y+'px';b.style.width=Math.abs(r.x1-r.x0)+'px';b.style.height=Math.abs(r.y1-r.y0)+'px';b.hidden=false}
const zmClamp=e=>[Math.max(M.l,Math.min(M.l+PW(),e.offsetX)),Math.max(M.t,Math.min(M.t+PH(),e.offsetY))];
function zmDown(e){if(!CH.some(c=>c.x))return;try{cv.setPointerCapture(e.pointerId)}catch(_){}const[x,y]=zmClamp(e);zm.r={x0:x,y0:y,x1:x,y1:y}}
function zmMove(e){if(!zm.r)return;[zm.r.x1,zm.r.y1]=zmClamp(e);zmBox()}
function zmUp(e){const r=zm.r;zm.r=null;$('zmR').hidden=true;if(!r)return;
  const w=Math.abs(r.x1-r.x0),h=Math.abs(r.y1-r.y0),tA=view.t0+(Math.min(r.x0,r.x1)-M.l)/PW()*view.span;
  zmPush();
  if(w<6){const u=(r.x0-M.l)/PW(),t=view.t0+u*view.span,f=e.shiftKey?2:.5;view.span*=f;view.t0=t-u*view.span}   // clic: ×2 (Mayús: alejar)
  else{view.t0=tA;view.span=Math.max(w/PW()*view.span,1e-9);
    if(h>=30&&h<PH()*.95){const yc=(r.y0+r.y1)/2,k=h/PH();   // recuadro alto: también la amplitud de los canales visibles
      CH.forEach(c=>{if(!c.x||!c.on)return;const vc=((M.t+PH()/2-yc)/(PH()/8)-c.off)*c.vd;c.vd=c.vd*k;c.off=-vc/c.vd})}}
  ui();draw()}
function zmBack(){const s=zm.st.pop();if(!s)return st('No hay zoom anterior.');view.t0=s.t0;view.span=s.span;CH.forEach((c,i)=>{if(s.ch[i]){c.vd=s.ch[i][0];c.off=s.ch[i][1]}});ui();draw()}
$('tZm').onclick=()=>{closePops();zmSet(!zm.on)};$('zmX').onclick=()=>zmSet(false);$('zmB').onclick=zmBack;$('zmA').onclick=()=>{zmPush();$('bFit').click()};
{const s=setTool;setTool=function(t){if(t!=='none'&&zm.on)zmSet(false);s(t)}}
{const p=showPage;showPage=function(i){zm.st=[];p(i)}}
addEventListener('keydown',e=>{const t=e.target;if(t&&t.closest&&t.closest('input,select,textarea'))return;if(e.ctrlKey||e.metaKey||e.altKey||curTab!=='S')return;
  if(!$('fic').hidden||!$('kb').hidden)return;
  if(e.key==='Escape'&&zm.on)zmSet(false);else if(e.key==='z'||e.key==='Z'){if(CH.some(c=>c.x))zmSet(!zm.on)}else if(e.key==='Backspace'&&zm.st.length){e.preventDefault();zmBack()}});
