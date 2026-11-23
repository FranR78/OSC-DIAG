/* ---------- Medidas con nombre y skills sobre los análisis de los procedimientos (docs/PLAN_SKILLS.md) ----------
   El motor (33-ckp.js, 34-can.js) solo mide. Aquí sus resultados se convierten en MEDIDAS con nombre y las skills activas
   (paquetes de reglas, 25-reglas.js) las interpretan. Ningún umbral de diagnóstico vive en el código. */
const MEDIDAS=[
  // sensor de cigüeñal (33-ckp.js) · % del mejor cilindro, por cilindro
  {id:'ckp_aporte_est_pct',nombre:'Aporte del cilindro (régimen estable)',unidad:'%',analisis:'ckp',por:'cilindro',que:'Subida de velocidad del cigüeñal en la carrera de trabajo de cada cilindro, en % del mejor, a régimen estable'},
  {id:'ckp_aporte_acel_pct',nombre:'Aporte del cilindro (aceleración)',unidad:'%',analisis:'ckp',por:'cilindro',que:'Igual, en los ciclos en que el motor acelera'},
  {id:'ckp_aporte_sin_pct',nombre:'Aporte del cilindro (sin combustión)',unidad:'%',analisis:'ckp',por:'cilindro',que:'Igual, sin combustión (apagar grabando o corte): solo la mecánica'},
  {id:'ckp_dientes',nombre:'Posiciones de la rueda fónica',unidad:'',analisis:'ckp',que:'Dientes + huecos por vuelta (p. ej. 60 en una 60-2)'},
  {id:'ckp_vueltas_mal',nombre:'Vueltas con dientes de menos o de más',unidad:'',analisis:'ckp',que:'Vueltas en que no se cuentan los dientes esperados'},
  // red CAN (34-can.js)
  {id:'can_tramas',nombre:'Tramas CAN reconocidas',unidad:'',analisis:'can',que:'Tramas completas leídas en la captura'},
  {id:'can_h_med',nombre:'CAN-H (mediana)',unidad:'V',analisis:'can',que:'Nivel típico de CAN-H en toda la captura'},
  {id:'can_l_med',nombre:'CAN-L (mediana)',unidad:'V',analisis:'can',que:'Nivel típico de CAN-L en toda la captura'},
  {id:'can_hl_dif_med',nombre:'Diferencia H−L (mediana)',unidad:'V',analisis:'can',que:'|CAN-H − CAN-L| típico (≈ 0 sin tráfico)'},
  {id:'can_rec_h',nombre:'CAN-H recesivo',unidad:'V',analisis:'can',que:'CAN-H en los bits recesivos de las tramas'},
  {id:'can_rec_l',nombre:'CAN-L recesivo',unidad:'V',analisis:'can',que:'CAN-L en los bits recesivos de las tramas'},
  {id:'can_dom_h',nombre:'CAN-H dominante',unidad:'V',analisis:'can',que:'CAN-H en los bits dominantes (sin arbitraje ni ACK)'},
  {id:'can_dom_l',nombre:'CAN-L dominante',unidad:'V',analisis:'can',que:'CAN-L en los bits dominantes'},
  {id:'can_dif',nombre:'Diferencial dominante de la red',unidad:'V',analisis:'can',que:'Mediana del diferencial dominante de todas las unidades'},
  {id:'can_ov_pct',nombre:'Sobreoscilación de los flancos',unidad:'%',analisis:'can',que:'Pico tras el flanco sobre el nivel dominante'},
  {id:'can_crc_mal',nombre:'Tramas con CRC mal',unidad:'',analisis:'can',que:'Tramas cuyo CRC-15 no cuadra'},
  {id:'can_err_tramas',nombre:'Tramas de error',unidad:'',analisis:'can',que:'Dominantes de 6 bits o más'},
  {id:'can_dif_unidad',nombre:'Diferencial dominante por unidad',unidad:'V',analisis:'can',por:'unidad',que:'Diferencial de las tramas de cada ID'},
  {id:'can_desv_unidad_pct',nombre:'Desviación de la unidad frente al resto',unidad:'%',analisis:'can',por:'unidad',que:'|diferencial de la unidad − mediana| / mediana'},
  {id:'can_ov_unidad_pct',nombre:'Sobreoscilación por unidad',unidad:'%',analisis:'can',por:'unidad',que:'Sobreoscilación de los flancos de cada ID'},
  {id:'can_crc_unidad',nombre:'CRC mal por unidad',unidad:'',analisis:'can',por:'unidad',que:'Tramas de cada ID con el CRC mal'}];
MEDIDAS.forEach(m=>{if(typeof MLB==='object'&&!MLB[m.id])MLB[m.id]=m.nombre});
const mdUn=id=>(MEDIDAS.find(m=>m.id===id)||{}).unidad||'';
const mdV=(id,v)=>v==null||!isFinite(v)?null:{id,valor:r4(v),unidad:mdUn(id)};
const mdP=(id,o)=>{const k=Object.keys(o||{}).filter(c=>o[c]!=null&&isFinite(o[c]));return k.length?{id,por_cilindro:Object.fromEntries(k.map(c=>[c,r4(o[c])])),unidad:mdUn(id)}:null};
/* resultados de los análisis → medidas con nombre */
function ckpMedidas(r){if(!r||r.err)return[];const M=[];
  [['est','ckp_aporte_est_pct'],['acel','ckp_aporte_acel_pct'],['sin','ckp_aporte_sin_pct']].forEach(([g,id])=>{if(r.R[g])M.push(mdP(id,r.R[g].pct))});
  M.push(mdV('ckp_dientes',r.N),mdV('ckp_vueltas_mal',r.vueltasMal||0));return M.filter(Boolean)}
function canMedidas(r){if(!r||r.err)return[];const M=[];
  M.push(mdV('can_tramas',r.sin?0:r.tramas),mdV('can_h_med',r.g.hMed),mdV('can_l_med',r.g.lMed),mdV('can_hl_dif_med',r.g.hlMed));
  if(!r.sin){const v=r.lv;M.push(mdV('can_rec_h',v.rH),mdV('can_rec_l',v.rL),mdV('can_dom_h',v.dH),mdV('can_dom_l',v.dL),mdV('can_dif',v.dif),mdV('can_ov_pct',v.ov),
      mdV('can_crc_mal',r.crcMal),mdV('can_err_tramas',r.errFr));
    const U=r.U.filter(u=>u.id!=='?'),by=f=>Object.fromEntries(U.map(u=>[u.id,f(u)]));
    M.push(mdP('can_dif_unidad',by(u=>u.dif)),mdP('can_desv_unidad_pct',by(u=>u.dif!=null&&v.dif?Math.abs(u.dif-v.dif)/v.dif*100:null)),
      mdP('can_ov_unidad_pct',by(u=>u.ov)),mdP('can_crc_unidad',by(u=>u.crc)))}
  return M.filter(Boolean)}
/* skills activas sobre unas medidas → hallazgos (mismo motor de reglas que «Diagnóstico») */
function mdSkills(medidas,ctx){const p={medidas,contexto:{motor:Object.assign({combustible:SK.fuel},ctx||{}),senales:[]}},H=[],usadas=new Set();
  const ids=new Set(medidas.map(m=>m.id));
  rgActivos().filter(P=>!P.remoto).forEach(P=>(P.reglas||[]).forEach(r=>{if(!(r.si||[]).some(c=>ids.has(c.medida)))return;usadas.add(P.nombre||P.paquete);
    if(rgValida({paquete:'xx',reglas:[r]}).length)return;H.push(...rgEval(r,P,p))}));
  return{H,usadas:[...usadas]}}
const mdSev=h=>h.confianza==='alta'?'bad':h.confianza==='baja'?'warn':'bad';
function mdHallazgosHTML(res,vacio){
  if(!res.usadas.length)return '<div class="skCk"><div class="skA warn"><b>!</b><span>Ninguna skill activa interpreta estas medidas. Actívala o instálala en «Diagnóstico → Fuente de conocimiento».</span></div></div>';
  let h='<div class="skCk">';
  if(!res.H.length)h+='<div class="skA ok"><b>✓</b><span>'+vacio+'</span></div>';
  res.H.forEach(x=>{h+='<div class="skA '+mdSev(x)+' mdH"><b>'+(mdSev(x)==='bad'?'✗':'!')+'</b><span><b>[Medido]</b> '+esc(x.sintoma)+(x.estado==='borrador'?' <span class="skB">BORRADOR</span>':'')+
    (x.causas.length?'<br><b>[Inferido]</b> '+x.causas.map(c=>esc(c.texto)+(c.como_separar?' <i>('+esc(c.como_separar)+')</i>':'')).join(' · '):'')+
    (x.comprobaciones.length?'<br><b>Comprobar:</b> '+x.comprobaciones.map(c=>esc(c.texto)+(c.esperado?' → '+esc(c.esperado):'')).join(' · '):'')+
    '<br><small class="hint">'+esc(x.paquete_nombre)+(x.fuente?' · '+esc(x.fuente):'')+'</small></span></div>'});
  return h+'</div><p class="hint">Skills usadas: '+res.usadas.map(esc).join(' · ')+'</p>'}
/* qué (cilindro/unidad) señala alguna skill, para marcar la tabla */
const mdMarcados=(res,medida)=>new Set(res.H.map(h=>h.evidencia[0]).filter(e=>e&&e.medida===medida&&e.cilindro!=null).map(e=>String(e.cilindro)));  // solo la 1.ª condición de cada regla: las demás son contexto
/* skills (temas) que pide un procedimiento y no tiene ninguna skill activa */
function mdFaltan(S){const t=new Set();rgActivos().forEach(P=>(P.reglas||[]).forEach(r=>r.tema&&t.add(r.tema)));
  const todas=new Map();rgTodos().forEach(P=>(P.reglas||[]).forEach(r=>{if(r.tema&&!todas.has(r.tema))todas.set(r.tema,P)}));
  return(S.skills||[]).filter(x=>!t.has(x)).map(x=>({tema:x,paquete:todas.get(x)||null}))}
