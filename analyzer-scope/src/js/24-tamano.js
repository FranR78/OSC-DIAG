/* ---------- Alto de la gráfica (tirador), alto de las franjas ADM·COMP·EXP·ESC y aviso de informe sin diagnóstico ---------- */
{const W=$('wrap'),H=$('wrapH'),mn=200,mx=()=>Math.max(mn,innerHeight*1.5);
  const setH=h=>{if(h==null){W.style.height='';W.classList.remove('man')}else{W.style.height=Math.round(Math.min(mx(),Math.max(mn,h)))+'px';W.classList.add('man')}};
  setH(LS.get('as_wh')?+LS.get('as_wh'):null);
  let y0=0,h0=0;
  H.addEventListener('pointerdown',e=>{e.preventDefault();y0=e.clientY;h0=W.getBoundingClientRect().height;H.setPointerCapture(e.pointerId);H.classList.add('on')});
  H.addEventListener('pointermove',e=>{if(!H.classList.contains('on'))return;setH(h0+e.clientY-y0)});
  const end=()=>{if(!H.classList.contains('on'))return;H.classList.remove('on');LS.set('as_wh',parseInt(W.style.height)||'')};
  H.addEventListener('pointerup',end);H.addEventListener('pointercancel',end);
  H.ondblclick=()=>{setH(null);LS.set('as_wh','')}}
$('rhR').value=eng.rh||14;
$('rhR').oninput=()=>{eng.rh=+$('rhR').value;draw()};
const dxHecho=()=>typeof DXR!=='undefined'&&DXR&&DXR.ok&&DXR.op==='diagnostico';
$('bPdf').onclick=()=>{if(!CH.some(c=>c.x)||dxHecho())return report();closePops();$('dxW').hidden=false;$('dxWGo').focus()};
$('dxWNo').onclick=()=>{$('dxW').hidden=true};
$('dxWPdf').onclick=()=>{$('dxW').hidden=true;report()};
$('dxWGo').onclick=()=>{$('dxW').hidden=true;showTab('X');st('Pulsa «Consultar diagnóstico» y después genera el informe.')};
$('dxW').addEventListener('pointerdown',e=>{if(e.target===$('dxW'))$('dxW').hidden=true});
