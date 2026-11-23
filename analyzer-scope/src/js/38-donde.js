/* ---------- Dónde está cada hallazgo y marcarlo en la señal ----------
   A partir del resultado de un análisis (CAN, decodificación, cigüeñal) y de la 1.ª evidencia de un hallazgo, saca los tramos
   de la captura que lo muestran (trama con CRC mal, tramas de la unidad, carrera del cilindro). «Ver en la señal» abre la captura,
   amplía ese tramo y lo deja marcado en rojo en el osciloscopio. */
let MARCA=null;const MD_EV=[];
const mdMs=t=>isFinite(t)?(t*1e3).toLocaleString('es',{maximumFractionDigits:t<.01?3:1})+' ms':'';
const mdHex=id=>id==null||!isFinite(id)?'?':'0x'+Number(id).toString(16).toUpperCase().padStart(id>0x7ff?8:3,'0');
function mdDonde(r,h){const e=(h.evidencia||[])[0];if(!r||!e)return[];const L=[],u=e.cilindro;
  const g=/^ckp_aporte_(est|acel|sin)_pct$/.exec(e.medida);
  if(g&&r.cyc)r.cyc.forEach((c,k)=>{if(c.reg===g[1]&&c.w&&c.w[u]&&L.length<6)L.push({t0:c.w[u][0],t1:c.w[u][1],txt:i18('Cilindro')+' '+u+' · '+i18('ciclo')+' '+(k+1)})});
  const ev=t=>(r.EV||[]).filter(x=>x.tipo===t).slice(0,8).map(x=>({t0:x.t0,t1:x.t1,b:x.b,fila:x.fila,txt:(t==='crc'?i18('CRC mal'):i18('Trama de error'))+(x.id!=null&&t==='crc'?' · ID '+mdHex(x.id)+' '+i18('(dudoso)'):'')}));
  if(e.medida==='can_crc_mal'||e.medida==='can_crc_pct')L.push(...ev('crc'));
  if(e.medida==='can_err_tramas')L.push(...ev('error'));
  if(e.medida==='can_crc_unidad')L.push(...(r.EV||[]).filter(x=>x.tipo==='crc'&&x.id===+u).slice(0,8).map(x=>({t0:x.t0,t1:x.t1,b:x.b,fila:x.fila,txt:'CRC mal · ID '+mdHex(+u)})));
  else if(/_unidad(_pct)?$/.test(e.medida)&&u!=null&&r.U){const U=r.U.find(x=>String(x.id)===String(u));if(U)U.tt.slice(0,5).forEach(t=>L.push({t0:t[0],t1:t[1],b:t[2],fila:t[3],txt:'ID '+mdHex(U.id)}))}
  return L}
/* chips «Dónde»; ds = captura que hay que abrir (null = la señal cargada ahora) */
function mdDondeHTML(r,h,ds){const L=mdDonde(r,h);if(!L.length)return'';if(MD_EV.length>400)MD_EV.length=0;
  return '<br><b>Dónde:</b> '+L.map(x=>{const ok=isFinite(x.t0)&&isFinite(x.t1);const txt=(ok?mdMs(x.t0)+' · ':x.b!==''&&x.b!=null?i18('búfer')+' '+x.b+' · '+i18('fila')+' '+x.fila+' · ':'')+x.txt;
    if(!ok)return '<span class="mdD">'+esc(txt)+'</span>';MD_EV.push(Object.assign({ds},x));return '<button class="mdD mdV" data-ev="'+(MD_EV.length-1)+'" title="Ver en la señal">▶ '+esc(txt)+'</button>'}).join(' ')}
function mdVer(ev){if(!ev)return;
  if(ev.ds&&PG[pgI]!==ev.ds){const i=PG.indexOf(ev.ds);if(i>=0)showPage(i);else addPages([ev.ds])}
  showTab('S');const w=Math.max(ev.t1-ev.t0,1e-6),pad=Math.max(w*.6,2e-5);
  view.t0=ev.t0-pad;view.span=w+2*pad;MARCA={t0:ev.t0,t1:ev.t1,txt:ev.txt};if(typeof ui==='function')ui();draw();st(i18('Marcado en la señal')+': '+ev.txt+' ('+mdMs(ev.t0)+')')}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.mdV');if(b){e.preventDefault();mdVer(MD_EV[+b.dataset.ev])}});
{const f=draw;draw=function(th){const R0=f(th);if(!MARCA||!cv)return R0;const pw=PW(),hh=PH(),X=t=>M.l+(t-view.t0)/view.span*pw;
  const x0=Math.max(M.l,X(MARCA.t0)),x1=Math.min(M.l+pw,X(MARCA.t1));if(x1<M.l||x0>M.l+pw)return R0;
  g.save();g.fillStyle='rgba(255,59,59,.16)';g.fillRect(x0,M.t,Math.max(2,x1-x0),hh);g.strokeStyle='#ff3b3b';g.setLineDash([5,4]);g.lineWidth=1.5;
  g.beginPath();g.moveTo(x0,M.t);g.lineTo(x0,M.t+hh);g.moveTo(x1,M.t);g.lineTo(x1,M.t+hh);g.stroke();g.setLineDash([]);
  g.font='bold 12px '+(typeof FONT_UI==='string'?FONT_UI:'system-ui');const t='⚠ '+MARCA.txt,tw=g.measureText(t).width;g.fillStyle='#ff3b3b';g.fillRect(x0,M.t,tw+10,18);g.fillStyle='#fff';g.textAlign='left';g.fillText(t,x0+5,M.t+13);g.restore();return R0}}
{const f=showPage;showPage=function(i){if(PG[i]!==PG[pgI])MARCA=null;return f(i)}}
