/* ---------- Reglas en hoja de cálculo (plantilla CSV para Excel/Sheets) y «Mis reglas» guardadas en el portal ----------
   Una fila = una regla. Más condiciones de la misma regla: otra fila con el mismo id y solo medida/operador/valor/por_cilindro.
   Separador «;» (Excel en español). Causas y comprobaciones separadas por «|». Formato en docs/REGLAS.md. */
const RG_COLS=['id','tema','sintoma','senal','combustible','medida','operador','valor','por_cilindro','confianza','estado','causas','etiqueta_causas','comprobaciones','fuente'];
const RG_AYUDA=['Identificador único (sin espacios)','Mismo tema que la regla de otra fuente para compararlas','Texto del hallazgo: {cil}=cilindro {valor}=valor medido {pct}=% del mejor',
  'Vacío = cualquier señal; o: transductor admisión, transductor escape, transductor cárter, inyector, encendido…','Vacío, diesel o gasolina',
  'comp_rel_pct, desv_pulso_cil, desv_pico_cil, pico_pico, maximo, minimo, media, rpm, frecuencia, ciclo_util, duracion_t1t2, avance, aaa, rce, aae, rca, cruce…',
  '< <= > >= entre fuera peor','Número; con entre/fuera: a|b; con peor: vacío o % del mejor','si / no','alta, media o baja','borrador o validada',
  'Una causa por bloque, separadas por |. Opcional: «causa — cómo separarla»','Inferido, Teórico OEM o Medido','Separadas por |, en orden. Opcional: «prueba → valor esperado»','De dónde sale el criterio'];
const RG_EJ=[
  ['FR-COMP-01','compresion-relativa','El cilindro {cil} está por debajo del 85 % en compresión relativa ({valor} %)','','','comp_rel_pct','<','85','si','media','borrador',
   'Segmentos — prueba de aceite en el cilindro {cil}|Válvulas o asientos — prueba de fugas: el aire sale por admisión o escape','Inferido','Prueba de fugas en el cilindro {cil} → menos del 20 %|Compresión absoluta con manómetro en el cilindro {cil}','Curso de diagnosis (ejemplo)'],
  ['FR-ESC-01','pulso-cilindro-esc','El cilindro {cil} da el pulso de escape más débil ({pct} % del mejor)','transductor escape','','desv_pulso_cil','peor','90','','media','borrador',
   'Fallo de combustión en el cilindro {cil}|Válvula de escape que no abre del todo','Inferido','Repetir en varios ciclos de 720°|Comprobar encendido o inyección del cilindro {cil}','Apuntes propios (ejemplo)'],
  ['FR-RAL-01','','Ralentí alto con el motor caliente ({valor} rpm)','','gasolina','rpm','>','950','','baja','borrador','Toma de aire|Mariposa sucia','Inferido','Máquina de humo en la admisión','Ejemplo de dos condiciones'],
  ['FR-RAL-01','','','','','pico_pico','>','0','','','','','','','']];
const csvQ=v=>{v=v==null?'':String(v);return/[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
function csvParse(t){t=String(t).replace(/^﻿/,'');const sep=(t.split('\n')[0].match(/;/g)||[]).length>=(t.split('\n')[0].match(/,/g)||[]).length?';':',';
  const R=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===sep){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);R.push(row);row=[];f=''}else f+=c}
  if(f!==''||row.length){row.push(f);R.push(row)}return R.filter(r=>r.some(x=>String(x).trim()!==''))}
const rgNum=s=>{s=String(s).trim().replace(',','.');return s===''?null:+s};
function rgDeCsv(txt,nombre){const R=csvParse(txt);if(!R.length)return null;
  const H=R[0].map(h=>h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'_'));if(!H.includes('id')||!H.includes('medida'))return null;
  const ix=k=>H.indexOf(k),g=(r,k)=>ix(k)<0?'':String(r[ix(k)]||'').trim(),reglas=[],by={};
  R.slice(1).forEach(r=>{const id=g(r,'id');if(!id||/^#/.test(id)||/^Identificador/i.test(id))return;
    const op=g(r,'operador')||'<',v=g(r,'valor'),c={medida:g(r,'medida'),op};
    if(['entre','fuera'].includes(op))c.valor=v.split(/[|;]/).map(rgNum);else if(v!=='')c.valor=rgNum(v);
    if(/^s[ií]|^true|^1$|^x$/i.test(g(r,'por_cilindro'))&&op!=='peor')c.por_cilindro=true;
    if(by[id]){by[id].si.push(c);return}
    const pl=s=>s.split('|').map(x=>x.trim()).filter(Boolean),et=g(r,'etiqueta_causas')||'Inferido';
    const o={id,sintoma:g(r,'sintoma'),si:[c],confianza:(g(r,'confianza')||'media').toLowerCase(),estado:(g(r,'estado')||'borrador').toLowerCase(),fuente:g(r,'fuente'),
      causas:pl(g(r,'causas')).map(x=>{const[a,b]=x.split(/\s+—\s+|\s+--\s+/);const q={texto:a,etiqueta:et};if(b)q.separar=b;return q}),
      comprobaciones:pl(g(r,'comprobaciones')).map(x=>{const[a,b]=x.split(/\s*→\s*|\s*->\s*/);const q={texto:a,tipo:'prueba'};if(b)q.esperado=b;return q})};
    if(g(r,'tema'))o.tema=g(r,'tema');const cx={};if(g(r,'senal'))cx.entidad=[g(r,'senal')];if(g(r,'combustible'))cx.combustible=[g(r,'combustible').toLowerCase()];if(Object.keys(cx).length)o.contexto=cx;
    by[id]=o;reglas.push(o)});
  const pq=String(nombre||'propio').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30)||'propio';
  return{formato:RG_FMT,paquete:pq.length<2?'propio':pq,nombre:nombre||'Mis reglas',reglas}}
function rgACsv(P){const L=[RG_COLS.join(';')];
  (P.reglas||[]).forEach(r=>(r.si||[]).forEach((c,k)=>{const v=Array.isArray(c.valor)?c.valor.join('|'):(c.valor!=null?c.valor:''),cx=r.contexto||{};
    L.push((k?[r.id,'','','','',c.medida,c.op,v,c.por_cilindro?'si':'','','','','','','']:[r.id,r.tema||'',r.sintoma,rgL(cx.entidad)[0]||'',rgL(cx.combustible)[0]||'',c.medida,c.op,v,c.por_cilindro?'si':'',r.confianza||'media',r.estado||'',
      (r.causas||[]).map(q=>q.texto+(q.separar?' — '+q.separar:'')).join(' | '),((r.causas||[])[0]||{}).etiqueta||'',(r.comprobaciones||[]).map(q=>q.texto+(q.esperado?' → '+q.esperado:'')).join(' | '),r.fuente||'']).map(csvQ).join(';'))}));
  return'﻿'+L.join('\r\n')+'\r\n'}
const RG_NCOLS=['id','titulo','tema','texto','valores','fuente'];
const RG_NAYUDA=['Identificador de la nota (N-01…)','Título','Mismo tema que sus reglas: se enlazan solas','Explicación o procedimiento (en Excel, Alt+Intro para saltos de línea)','Separados por |: «magnitud: valor unidad (condición)»','De dónde sale'];
const RG_NEJ=[['N-01','Compresión relativa: cómo confirmarla','compresion-relativa','Si un cilindro sale bajo:\n- Prueba de fugas en ese cilindro\n- Si el aire sale por el escape, válvula de escape','presión de compresión: 25–32 bar (diésel, motor caliente)','Curso de diagnosis (ejemplo)']];
function rgPlantillaNotas(){const L=[RG_NCOLS.join(';'),RG_NAYUDA.map(csvQ).join(';'),...RG_NEJ.map(r=>r.map(x=>csvQ(String(x).replace(/\\n/g,'\n'))).join(';'))];
  saveFile('plantilla_notas_analyzer_scope.csv',new Blob(['\uFEFF'+L.join('\r\n')+'\r\n'],{type:'text/csv'}))}
function rgNotasDeCsv(txt){const R=csvParse(txt);const H=(R[0]||[]).map(h=>h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));if(!H.includes('titulo')||!H.includes('texto'))return null;
  const g=(r,k)=>H.indexOf(k)<0?'':String(r[H.indexOf(k)]||'').trim();
  return R.slice(1).filter(r=>g(r,'id')&&!/^Identificador/i.test(g(r,'id'))).map(r=>{const o={id:g(r,'id'),titulo:g(r,'titulo'),texto:g(r,'texto'),fuente:g(r,'fuente'),
    valores:g(r,'valores').split('|').map(x=>x.trim()).filter(Boolean).map(x=>{const m=/^(.*?):\s*([\d.,]+)(?:\s*[–-]\s*([\d.,]+))?\s*([^()]*?)\s*(?:\((.*)\))?$/.exec(x);if(!m)return{magnitud:x};
      const v={magnitud:m[1].trim()},a=+m[2].replace(',','.');if(m[3]!=null){v.min=a;v.max=+m[3].replace(',','.')}else v.valor=a;if(m[4])v.unidad=m[4].trim();if(m[5])v.condicion=m[5].trim();return v})};if(g(r,'tema'))o.tema=g(r,'tema');return o})}
function rgPlantilla(){setTimeout(rgPlantillaNotas,600);const L=[RG_COLS.join(';'),RG_AYUDA.map(csvQ).join(';'),...RG_EJ.map(r=>r.map(csvQ).join(';'))];
  saveFile('plantilla_reglas_analyzer_scope.csv',new Blob(['﻿'+L.join('\r\n')+'\r\n'],{type:'text/csv'}))}
/* importar: .json (paquete) o .csv (hoja); los .csv entran en el paquete «Mis reglas» (sustituyen las reglas con el mismo id) */
function rgImport(f){const rd=new FileReader();rd.onload=()=>{const txt=String(rd.result);let p=null;
  if(/\.json$/i.test(f.name)||/^\s*\{/.test(txt)){try{p=JSON.parse(txt)}catch(e){return $('xSt').textContent=i18('El archivo no es JSON.')}}
  else{const NN=rgNotasDeCsv(txt);if(NN){const U=rgUsuario(),P=U[0],ids=new Set(NN.map(n=>n.id)),nuevo={...P,notas:(P.notas||[]).filter(n=>!ids.has(n.id)).concat(NN)},E=rgValida(nuevo);
      if(E.length)return $('xSt').textContent=i18('Hoja no válida')+': '+E.slice(0,3).join(' ');U[0]=nuevo;rgGuardaUsuario(U);rgPanel();return $('xSt').textContent=i18('Notas cargadas desde la hoja')+': '+NN.length}
    p=rgDeCsv(txt,'Mis reglas');if(!p)return $('xSt').textContent=i18('La hoja no tiene las columnas de la plantilla (id, medida…). Descarga la plantilla y rellénala.');
    const U=rgUsuario(),P=U[0],ids=new Set(p.reglas.map(r=>r.id));const nuevo={...P,reglas:P.reglas.filter(r=>!ids.has(r.id)).concat(p.reglas)};
    const E=rgValida(nuevo);if(E.length)return $('xSt').textContent=i18('Hoja no válida')+': '+E.slice(0,3).join(' ');
    U[0]=nuevo;rgGuardaUsuario(U);rgPanel();return $('xSt').textContent=i18('Reglas cargadas desde la hoja')+': '+p.reglas.length+' → '+(P.nombre||P.paquete)}
  if(REGLAS_BASE.some(b=>b.paquete===p.paquete)||p.paquete==='nt')p.paquete=p.paquete+'_copia';
  const E=rgValida(p);if(E.length)return $('xSt').textContent=i18('Paquete no válido')+': '+E.slice(0,3).join(' ');
  const a=rgUsuario().filter(x=>x.paquete!==p.paquete);a.push(p);rgGuardaUsuario(a);rgPanel();
  $('xSt').textContent=i18('Paquete importado')+': '+(p.nombre||p.paquete)+' · '+p.reglas.length+' '+i18('reglas')};rd.readAsText(f)}
$('xPqT').onclick=rgPlantilla;
function rgNotasACsv(P){return'\uFEFF'+[RG_NCOLS.join(';'),...(P.notas||[]).map(n=>[n.id,n.titulo,n.tema||'',n.texto||'',(n.valores||[]).map(v=>v.magnitud+': '+(v.valor!=null?v.valor:v.min+'–'+v.max)+(v.unidad?' '+v.unidad:'')+(v.condicion?' ('+v.condicion+')':'')).join(' | '),n.fuente||''].map(csvQ).join(';'))].join('\r\n')+'\r\n'}
$('xPqE').onclick=()=>rgUsuario().forEach(P=>{saveFile('reglas_'+P.paquete+'.csv',new Blob([rgACsv(P)],{type:'text/csv'}));if((P.notas||[]).length)setTimeout(()=>saveFile('notas_'+P.paquete+'.csv',new Blob([rgNotasACsv(P)],{type:'text/csv'})),600)});
/* portal: «Mis reglas» se guardan en tu cuenta (op reglas_leer / reglas_guardar), así las tienes en cualquier equipo */
let rgSubeT=0;
function rgSube(a){if(APP_CFG.modo!=='portal')return;clearTimeout(rgSubeT);rgSubeT=setTimeout(()=>{
  dxCall({v:1,op:'reglas_guardar',cliente:{app:'analyzer-scope',ver:APP_CFG.ver},paquetes:a}).then(r=>{if(r&&!r.ok)st(i18('No se pudieron guardar tus reglas en el portal')+': '+((r.error&&r.error.mensaje)||''))},()=>{})},800)}
if(APP_CFG.modo==='portal')dxCall({v:1,op:'reglas_leer',cliente:{app:'analyzer-scope',ver:APP_CFG.ver}}).then(r=>{if(r&&r.ok&&r.permisos){RG_PERM=r.permisos;rgPanel();if(typeof pqCargar==='function')pqCargar()}
  if(r&&r.ok&&Array.isArray(r.paquetes)&&r.paquetes.length){LS.set('as_paqs',JSON.stringify(r.paquetes));rgPanel()}
  else if(r&&r.ok){const loc=rgUsuario();if(loc.some(P=>P.reglas.length))rgSube(loc)}},()=>{});
