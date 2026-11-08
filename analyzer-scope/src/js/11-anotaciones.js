/* ---------- Herramientas de anotación ---------- */
const fyOf=e=>Math.min(1,Math.max(0,(e.offsetY-M.t)/PH()));
const inPlot=e=>e.offsetX>=M.l&&e.offsetX<=M.l+PW()&&e.offsetY>=M.t&&e.offsetY<=M.t+PH();
function setTool(t){
  ann.tool=t;ann.cur=null;if(t!=='none'){ann.vis=true;$('aVis').checked=true}const o=$('annIn');if(o)o.remove();
  ['none','text','arrow','line','pen','rect','ell','del'].forEach(k=>$('a_'+k).classList.toggle('on',k===t));
  cv.style.cursor=t==='none'?'crosshair':t==='del'?'not-allowed':'copy';
  if(t!=='none')st({text:'Texto: clic en la señal y escribe; Intro acepta.',arrow:'Flecha: arrastra desde el origen hasta la punta.',line:'Línea: arrastra.',pen:'Lápiz: mantén pulsado y dibuja.',rect:'Rectángulo: arrastra una esquina a la opuesta.',ell:'Elipse: arrastra el recuadro que la contiene.',del:'Borrar: clic sobre una anotación.'}[t]+' Las anotaciones siguen a la señal al hacer zoom o desplazar. Cursor = volver a medir.');
  draw();
}
function annDown(e){
  if(!inPlot(e))return;const t=tOf(e),fy=fyOf(e),k=ann.tool;
  if(k==='del'){const i=annHit(e);if(i>=0){ann.list.splice(i,1);draw()}return}
  if(k==='text'){ann.cur={k:'tp',x1:t,y1:fy,ex:e.offsetX,ey:e.offsetY};return}
  cv.setPointerCapture(e.pointerId);
  ann.cur={k,col:ann.col,w:ann.w,x1:t,y1:fy,x2:t,y2:fy,pts:[[t,fy]]};
}
function annMove(e){
  const c=ann.cur;if(!c||c.k==='tp')return;
  c.x2=tOf(e);c.y2=fyOf(e);if(c.k==='pen')c.pts.push([c.x2,c.y2]);draw();
}
function annUp(e){
  const c=ann.cur;if(!c)return;ann.cur=null;
  if(c.k==='tp'){annText(c);return}
  const small=Math.abs(c.x2-c.x1)/view.span*PW()<3&&Math.abs(c.y2-c.y1)*PH()<3;
  if(c.k==='pen'?c.pts.length>2:!small)ann.list.push(c);draw();
}
function annText(c){
  const old=$('annIn');if(old)old.remove();
  const inp=document.createElement('input');inp.id='annIn';inp.type='text';inp.placeholder=i18('Texto… (Intro = aceptar)');
  inp.style.cssText='position:absolute;z-index:5;left:'+Math.max(0,Math.min(c.ex,cv.clientWidth-200))+'px;top:'+Math.max(0,c.ey-14)+'px;width:190px;padding:3px 6px';
  $('wrap').appendChild(inp);inp.focus();let done=false;
  const fin=ok=>{if(done)return;done=true;const v=inp.value.trim();inp.remove();if(ok&&v){ann.list.push({k:'text',col:ann.col,w:ann.w,x1:c.x1,y1:c.y1,txt:v});draw()}};
  inp.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Enter')fin(true);else if(ev.key==='Escape')fin(false)};inp.onblur=()=>fin(true);
}
function annHit(e){
  const px=e.offsetX,py=e.offsetY,X=t=>M.l+(t-view.t0)/view.span*PW(),Yf=f=>M.t+f*PH();
  const dseg=(x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,u=l?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l)):0;return Math.hypot(px-x1-u*dx,py-y1-u*dy)};
  for(let i=ann.list.length-1;i>=0;i--){const a=ann.list[i],x1=X(a.x1),y1=Yf(a.y1);let d=1e9;
    if(a.k==='line'||a.k==='arrow')d=dseg(x1,y1,X(a.x2),Yf(a.y2));
    else if(a.k==='pen'){for(let j=1;j<a.pts.length;j++)d=Math.min(d,dseg(X(a.pts[j-1][0]),Yf(a.pts[j-1][1]),X(a.pts[j][0]),Yf(a.pts[j][1])))}
    else if(a.k==='rect'||a.k==='ell'){const x2=X(a.x2),y2=Yf(a.y2),l=Math.min(x1,x2),r=Math.max(x1,x2),t=Math.min(y1,y2),b=Math.max(y1,y2);
      d=Math.min(dseg(l,t,r,t),dseg(r,t,r,b),dseg(r,b,l,b),dseg(l,b,l,t))}
    else if(a.k==='text'){const w=a.txt.length*(6+a.w)+8,h=16+a.w*2;if(px>=x1-4&&px<=x1+w&&py>=y1-h&&py<=y1+4)d=0}
    if(d<=8)return i}
  return -1;
}
function drawAnn(g,X,hh,D){
  if(ann.vis===false)return;
  const LC={'#ffd24d':'#b58900','#ff5c5c':'#c92a2a','#5ddc8a':'#15803d','#4da3ff':'#0a6fc2','#ffffff':'#111111','#ff7bf1':'#b3199e'};
  [...ann.list,...(ann.cur&&ann.cur.k!=='tp'?[ann.cur]:[])].forEach(a=>{
    const col=pkc(a.col,LC[a.col]||a.col),x1=X(a.x1),y1=M.t+a.y1*hh,x2=X(a.x2),y2=M.t+a.y2*hh;
    g.strokeStyle=g.fillStyle=col;g.lineWidth=a.w;g.lineCap='round';g.lineJoin='round';g.setLineDash([]);
    if(a.k==='line'||a.k==='arrow'){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
      if(a.k==='arrow'){const th=Math.atan2(y2-y1,x2-x1),L=9+a.w*2;g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-L*Math.cos(th-.45),y2-L*Math.sin(th-.45));g.lineTo(x2-L*Math.cos(th+.45),y2-L*Math.sin(th+.45));g.closePath();g.fill()}}
    else if(a.k==='pen'){g.beginPath();a.pts.forEach(([t,f],i)=>{const x=X(t),y=M.t+f*hh;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()}
    else if(a.k==='rect'){g.strokeRect(x1,y1,x2-x1,y2-y1);g.globalAlpha=.1;g.fillRect(x1,y1,x2-x1,y2-y1);g.globalAlpha=1}
    else if(a.k==='ell'){g.beginPath();g.ellipse((x1+x2)/2,(y1+y2)/2,Math.abs(x2-x1)/2,Math.abs(y2-y1)/2,0,0,6.2832);g.stroke();g.globalAlpha=.1;g.fill();g.globalAlpha=1}
    else if(a.k==='text'){g.font='bold '+(12+a.w*2)+'px system-ui';const w=g.measureText(a.txt).width,h=14+a.w*2;
      g.fillStyle=BGA;g.fillRect(x1-3,y1-h,w+6,h+5);g.fillStyle=col;g.textAlign='left';g.fillText(a.txt,x1,y1);g.font='11px system-ui'}
    g.lineCap='butt'});
}
['none','text','arrow','line','pen','rect','ell','del'].forEach(t=>$('a_'+t).onclick=()=>setTool(t));
$('aCol').onchange=()=>{ann.col=$('aCol').value};$('aW').onchange=()=>{ann.w=+$('aW').value};
$('aUn').onclick=()=>{ann.list.pop();draw()};$('aClr').onclick=()=>{ann.list=[];draw()};
$('aVis').onchange=()=>{ann.vis=$('aVis').checked;draw()};
$('tAn').onclick=()=>{const h=!$('at').hidden;$('at').hidden=h;$('tAn').classList.toggle('on',!h);if(h)setTool('none')};
addEventListener('keydown',e=>{if(e.key==='Escape')setTool('none');else if((e.ctrlKey||e.metaKey)&&e.key==='z'&&document.activeElement===document.body){ann.list.pop();draw()}});

