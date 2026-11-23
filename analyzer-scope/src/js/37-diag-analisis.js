/* ---------- Diagnóstico: los análisis que piden las skills activas (CAN, cigüeñal) sobre la señal cargada ----------
   Si una skill activa usa medidas de un análisis (catálogo MEDIDAS: «can», «ckp»), «Diagnóstico» lo ejecuta con los canales
   cargados y añade sus medidas a la consulta. Así la skill instalada diagnostica también aquí, no solo en «Procedimientos». */
const DXA={can:null,ckp:null},DXAO={can:{},ckp:{}};
function dxAnNecesarios(){const k=new Set();rgActivos().filter(P=>!P.remoto).forEach(P=>(P.reglas||[]).forEach(r=>(r.si||[]).forEach(c=>{const m=MEDIDAS.find(x=>x.id===c.medida);if(m)k.add(m.analisis)})));return k}
const dxAnCanales=()=>CH.map((c,i)=>({i,c})).filter(o=>o.c.x);
const dxAnDs=()=>({chs:CH.filter(c=>c.x).map(c=>({n:c.n,x:c.x,y:c.y,u:c.u}))});
function dxAnDef(){const L=dxAnCanales(),idx=re=>{const j=L.findIndex(o=>re.test(o.c.n));return j};
  const o=DXAO.can;if(o.ih==null||o.ih>=L.length){const h=idx(/h\b|high|can.?h/i),l=idx(/l\b|low|can.?l/i);o.ih=h>=0?h:0;o.il=l>=0&&l!==o.ih?l:(o.ih===0?1:0)}
  const q=DXAO.ckp;if(q.ick==null||q.ick>=L.length){const a=idx(/ckp|cig|crank/i);q.ick=a>=0?a:0;q.isy=q.ick===0?1:0}if(q.ord==null)q.ord=eng.order.join('-');if(q.off==null)q.off=0}
function dxAnRun(k){const L=dxAnCanales();if(L.length<2){DXA[k]={err:i18('Hacen falta dos canales cargados.')};return}dxAnDef();const d=dxAnDs();
  try{if(k==='can')DXA.can=canAnaliza(d,{ih:DXAO.can.ih,il:DXAO.can.il});
    else{const o=DXAO.ckp;DXA.ckp=ckpAnaliza(d,{ick:o.ick,isy:o.isy,order:String(o.ord).split(/[^0-9]+/).filter(Boolean).map(Number),off:+o.off||0})}}
  catch(e){DXA[k]={err:'No se pudo analizar: '+e.message}}}
function dxAnPanel(){const el=$('xAn');if(!el)return;const K=dxAnNecesarios(),L=dxAnCanales();el.innerHTML='';if(!K.size)return;dxAnDef();
  const opt=sel=>L.map((o,j)=>'<option value="'+j+'"'+(j===sel?' selected':'')+'>'+esc(o.c.n)+'</option>').join('');
  let h='<b class="skH">Análisis de las skills activas</b>';
  if(L.length<2)h+='<p class="hint">Carga una señal con al menos dos canales.</p>';
  else{if(K.has('can')){const r=DXA.can;h+='<div class="row"><label>CAN-H <select id="xAnH">'+opt(DXAO.can.ih)+'</select></label><label>CAN-L <select id="xAnL">'+opt(DXAO.can.il)+'</select></label><button id="xAnCan">Analizar red CAN</button></div>'+
      (r?'<p class="hint">'+(r.err?'✗ '+r.err:r.sin?i18('Sin tramas reconocibles.')+' '+(r.msg||''):(r.rate/1e3)+' kbit/s · '+r.tramas+' '+i18('tramas')+' · '+r.U.length+' '+i18('unidades (ID)'))+'</p>':'')}
    if(K.has('ckp')){const r=DXA.ckp,o=DXAO.ckp;h+='<div class="row"><label>CKP <select id="xAnK">'+opt(o.ick)+'</select></label><label>Sincronismo cil. 1 <select id="xAnS">'+opt(o.isy)+'</select></label><label>Orden <input id="xAnO" value="'+esc(o.ord)+'" style="width:80px"></label><button id="xAnCkp">Analizar cigüeñal</button></div>'+
      (r?'<p class="hint">'+(r.err?'✗ '+r.err:i18('Rueda')+' '+r.N+'-'+r.m+' · '+r.ciclos+' '+i18('ciclos'))+'</p>':'')}
    h+='<p class="hint">«Consultar diagnóstico» los repite con la señal cargada; sus medidas salen en la lista.</p>'}
  el.innerHTML=h;
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  on('xAnCan',()=>{DXAO.can.ih=+$('xAnH').value;DXAO.can.il=+$('xAnL').value;dxAnRun('can');dxMedidas()});
  on('xAnCkp',()=>{Object.assign(DXAO.ckp,{ick:+$('xAnK').value,isy:+$('xAnS').value,ord:$('xAnO').value});dxAnRun('ckp');dxMedidas()})}
{const f=dxPeticion;dxPeticion=function(){const p=f();if(DXA.can&&!DXA.can.err)p.medidas.push(...canMedidas(DXA.can));if(DXA.ckp&&!DXA.ckp.err)p.medidas.push(...ckpMedidas(DXA.ckp));return p}}
{const f=dxMedidas;dxMedidas=function(){const p=f();dxAnPanel();return p}}
{const f=dxGo;dxGo=function(){dxAnNecesarios().forEach(dxAnRun);return f()};$('xGo').onclick=dxGo}  // siempre con la señal y los canales de ahora
{const f=dxShow;dxShow=function(res){f(res);const box=$('xRes');if(!box)return;let h='';
  for(const[k,fn] of [['can',canMedidas],['ckp',ckpMedidas]]){const r=DXA[k];if(!r||r.err)continue;
    mdSkills(fn(r)).H.forEach(x=>{const d=mdDondeHTML(r,x,null);if(d)h+='<div class="s"><b>'+esc(x.sintoma)+'</b>'+d+'</div>'})}
  if(h){const el=document.createElement('div');el.className='mdBox';el.innerHTML='<b>'+i18('Dónde está en la señal')+'</b>'+h;box.appendChild(el)}}}
