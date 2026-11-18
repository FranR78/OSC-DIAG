/* ---------- Editor de reglas propias (formulario) · formato en docs/REGLAS.md ----------
   Edita los paquetes del usuario (los base son de solo lectura: se pueden copiar para adaptarlos, conservando el «tema»). */
const RGE={pq:0,ed:null};
const rgeEnts=()=>[...new Set(DX_ENT.map(x=>x[1]))];
const rgeH=(tag,attrs,kids)=>{const e=document.createElement(tag);Object.entries(attrs||{}).forEach(([k,v])=>{if(k==='text')e.textContent=i18(v);else if(k.startsWith('on'))e[k]=v;else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v)});
  (kids||[]).forEach(k=>k&&e.appendChild(k));return e};
const rgeSel=(opts,val)=>{const s=rgeH('select');opts.forEach(([v,t])=>{const o=rgeH('option',{value:v});o.textContent=i18(t);if(String(v)===String(val))o.selected=true;s.appendChild(o)});return s};
const rgeLbl=(t,el)=>{const l=rgeH('label',{class:'rgl'});l.appendChild(rgeH('span',{text:t}));l.appendChild(el);return l};
function rgeOpen(){RGE.ed=null;$('rgE').hidden=false;rgeList()}
function rgeClose(){$('rgE').hidden=true;rgPanel();DXR=null}
function rgeTemas(){return[...new Set(rgTodos().flatMap(P=>(P.reglas||[]).map(r=>r.tema).filter(Boolean)))]}
/* lista de reglas del paquete propio elegido + reglas base para copiar */
function rgeList(){const B=$('rgEB');B.innerHTML='';const U=rgUsuario();if(RGE.pq>=U.length)RGE.pq=0;const P=U[RGE.pq];
  const ps=rgeSel(U.map((p,i)=>[i,p.nombre||p.paquete]),RGE.pq);ps.onchange=()=>{RGE.pq=+ps.value;rgeList()};
  const nm=rgeH('input',{type:'text',value:P.nombre||'',maxlength:60});nm.onchange=()=>{P.nombre=nm.value.trim()||P.paquete;rgGuardaUsuario(U)};
  const au=rgeH('input',{type:'text',value:P.autor||'',maxlength:60});au.onchange=()=>{P.autor=au.value.trim();rgGuardaUsuario(U)};
  B.appendChild(rgeH('div',{class:'rgg'},[rgeLbl('Paquete',ps),rgeLbl('Nombre',nm),rgeLbl('Autor',au)]));
  const ul=rgeH('div',{class:'tcy'});
  if(!P.reglas.length)ul.appendChild(rgeH('p',{class:'hint',text:'Todavía no hay reglas. Crea una nueva o copia una de la base para adaptarla.'}));
  P.reglas.forEach((r,i)=>{const row=rgeH('div',{class:'cy'});
    row.appendChild(rgeH('b',{text:r.id+(r.estado==='borrador'?' · borrador':'')}));row.appendChild(rgeH('div',{class:'hint',text:r.sintoma}));
    row.appendChild(rgeH('div',{class:'row'},[rgeH('button',{text:'Editar',onclick:()=>rgeForm(JSON.parse(JSON.stringify(r)),i)}),
      rgeH('button',{text:'Duplicar',onclick:()=>{const c=JSON.parse(JSON.stringify(r));c.id=rgeNewId(P,c.id);rgeForm(c,-1)}}),
      rgeH('button',{text:'Borrar',onclick:()=>{if(row.dataset.ok){P.reglas.splice(i,1);rgGuardaUsuario(U);rgeList()}else{row.dataset.ok=1;row.querySelector('button:last-child').textContent=i18('¿Seguro? Pulsa otra vez')}}})]));
    ul.appendChild(row)});
  B.appendChild(ul);
  const base=rgeSel([['','— copiar una regla de la base —'],...REGLAS_BASE.flatMap(b=>b.reglas.map(r=>[b.paquete+'|'+r.id,(b.nombre||b.paquete)+' · '+r.id]))],'');
  base.onchange=()=>{const[pq,id]=base.value.split('|');const b=REGLAS_BASE.find(x=>x.paquete===pq);const r=b&&b.reglas.find(x=>x.id===id);if(!r)return;
    const c=JSON.parse(JSON.stringify(r));c.id=rgeNewId(P,'FR-'+r.id.replace(/^[A-Z]+-/,''));c.estado='borrador';c.fuente='';rgeForm(c,-1)};
  B.appendChild(rgeH('div',{class:'row'},[rgeH('button',{class:'p',text:'Nueva regla',onclick:()=>rgeForm({id:rgeNewId(P,'FR-01'),tema:'',sintoma:'',si:[{medida:'desv_pulso_cil',op:'peor'}],confianza:'media',estado:'borrador',fuente:'',causas:[],comprobaciones:[]},-1)}),base]));
  B.appendChild(rgeH('div',{class:'row'},[rgeH('button',{text:'Nuevo paquete',onclick:()=>{const id='propio'+(U.length+1);U.push({formato:RG_FMT,paquete:id,nombre:i18('Mis reglas')+' '+(U.length+1),reglas:[]});rgGuardaUsuario(U);RGE.pq=U.length-1;rgeList()}}),
    rgeH('button',{text:'Exportar este paquete',onclick:()=>rgExport(P)}),
    U.length>1?rgeH('button',{text:'Borrar paquete',onclick:e=>{if(e.target.dataset.ok){U.splice(RGE.pq,1);rgGuardaUsuario(U);RGE.pq=0;rgeList()}else{e.target.dataset.ok=1;e.target.textContent=i18('¿Seguro? Pulsa otra vez')}}}):null,
    rgeH('span',{class:'sp'}),rgeH('button',{text:'Cerrar',onclick:rgeClose})]))}
function rgeNewId(P,id){const ids=new Set(P.reglas.map(r=>r.id));if(!ids.has(id))return id;const m=/^(.*?)(\d+)$/.exec(id)||[0,id+'-',1];let n=+m[2];while(ids.has(m[1]+String(n).padStart(2,'0')))n++;return m[1]+String(n).padStart(2,'0')}
/* formulario de una regla */
function rgeForm(r,idx){const B=$('rgEB');B.innerHTML='';const U=rgUsuario(),P=U[RGE.pq];
  const inp=(v,ml,ph)=>rgeH('input',{type:'text',value:v||'',maxlength:ml||120,placeholder:ph?i18(ph):null});
  const fId=inp(r.id,30),fTe=inp(r.tema,40,'p. ej. compresion-relativa'),fSi=inp(r.sintoma,160,'El cilindro {cil} …'),fFu=inp(r.fuente,120,'Curso, manual, ficha técnica…');
  const dl=rgeH('datalist',{id:'rgeTl'});rgeTemas().forEach(t=>dl.appendChild(rgeH('option',{value:t})));fTe.setAttribute('list','rgeTl');
  const cx=r.contexto||{},fEn=rgeSel([['','cualquier señal'],...rgeEnts().map(e=>[e,e])],rgL(cx.entidad)[0]||''),
    fCb=rgeSel([['','cualquiera'],['diesel','Diésel'],['gasolina','Gasolina']],rgL(cx.combustible)[0]||''),
    fCo=rgeSel([['alta','alta'],['media','media'],['baja','baja']],r.confianza||'media'),fEs=rgeSel([['borrador','borrador'],['validada','validada']],r.estado||'borrador'),
    fEt=rgeSel([['Inferido','Inferido'],['Teórico OEM','Teórico OEM'],['Medido','Medido']],((r.causas||[])[0]||{}).etiqueta||'Inferido');
  B.appendChild(rgeH('h3',{text:idx<0?'Nueva regla':'Editar regla'}));
  B.appendChild(rgeH('div',{class:'rgg'},[rgeLbl('Identificador',fId),rgeLbl('Tema (igual que la regla de la otra fuente para compararlas)',fTe),dl]));
  B.appendChild(rgeLbl('Síntoma (texto del hallazgo)',fSi));
  B.appendChild(rgeH('div',{class:'rgg'},[rgeLbl('Señal',fEn),rgeLbl('Combustible',fCb),rgeLbl('Confianza',fCo),rgeLbl('Estado',fEs)]));
  /* condiciones */
  const CS=rgeH('div',{class:'rgc'}),MED=Object.keys(MLB).map(k=>[k,mlb(k)+' ('+k+')']);
  const cRow=c=>{const m=rgeSel(MED,c.medida),o=rgeSel(RG_OPS.map(x=>[x,{peor:'el peor cilindro',entre:'entre a y b',fuera:'fuera de a–b'}[x]||x]),c.op),
      v=inp(Array.isArray(c.valor)?c.valor.join('; '):(c.valor!=null?c.valor:''),30,'número o a; b'),pc=rgeH('input',{type:'checkbox'});pc.checked=!!c.por_cilindro;
      const row=rgeH('div',{class:'rgcr'},[m,o,v,rgeH('label',{class:'dxc'},[pc,rgeH('span',{text:'por cilindro'})]),rgeH('button',{text:'✕',title:'Quitar condición',onclick:()=>row.remove()})]);
      row._get=()=>{const q={medida:m.value,op:o.value},t=v.value.trim().replace(/,/g,'.');
        if(['entre','fuera'].includes(q.op))q.valor=t.split(/[;\s]+/).filter(Boolean).map(Number);else if(t!=='')q.valor=+t;
        if(pc.checked&&q.op!=='peor')q.por_cilindro=true;return q};CS.appendChild(row)};
  (r.si||[]).forEach(cRow);
  B.appendChild(rgeH('b',{text:'Condiciones (se cumplen todas)'}));B.appendChild(CS);
  B.appendChild(rgeH('div',{class:'row'},[rgeH('button',{text:'+ Condición',onclick:()=>cRow({medida:'pico_pico',op:'<',valor:''})})]));
  const ta=(lines,ph)=>{const t=rgeH('textarea',{rows:3,placeholder:i18(ph)});t.value=lines.join('\n');return t};
  const fCa=ta((r.causas||[]).map(c=>c.texto+(c.separar?' — '+c.separar:'')),'Una causa por línea. Opcional: « — cómo separarla»'),
    fCh=ta((r.comprobaciones||[]).map(c=>c.texto+(c.esperado?' → '+c.esperado:'')),'Una comprobación por línea, en orden. Opcional: « → valor esperado»');
  B.appendChild(rgeH('div',{class:'rgg'},[rgeLbl('Posibles causas',fCa),rgeLbl('Etiqueta de las causas',fEt)]));
  B.appendChild(rgeLbl('Comprobaciones',fCh));B.appendChild(rgeLbl('Fuente (de dónde sale el criterio)',fFu));
  B.appendChild(rgeH('p',{class:'hint',text:'En los textos: {cil} = cilindro, {valor} = valor medido, {pct} = % del mejor, {canal} = canal.'}));
  const msg=rgeH('p',{class:'hint',id:'rgeM'});
  const get=()=>{const o={id:fId.value.trim(),tema:fTe.value.trim(),sintoma:fSi.value.trim(),si:[...CS.children].map(x=>x._get()),confianza:fCo.value,estado:fEs.value,fuente:fFu.value.trim(),
      causas:fCa.value.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const[a,b]=x.split(/\s+—\s+/);const c={texto:a,etiqueta:fEt.value};if(b)c.separar=b;return c}),
      comprobaciones:fCh.value.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const[a,b]=x.split(/\s*→\s*/);const c={texto:a,tipo:'prueba'};if(b)c.esperado=b;return c})};
    const c={};if(fEn.value)c.entidad=[fEn.value];if(fCb.value)c.combustible=[fCb.value];if(Object.keys(c).length)o.contexto=c;if(!o.tema)delete o.tema;return o};
  const test=()=>{const o=get(),E=rgValida({paquete:'xx',reglas:[o]});if(E.length)return msg.textContent=E.join(' ');
    if(!CH.some(c=>c.x))return msg.textContent=i18('Carga una señal para probar la regla.');
    const p=dxPeticion(),h=rgEval(o,{paquete:P.paquete,nombre:P.nombre},p);
    msg.textContent=h.length?i18('Con la señal actual se cumple')+': '+h.map(x=>x.sintoma).join(' · '):i18('Con la señal actual no se cumple.')+' '+i18('Medidas disponibles')+': '+[...new Set(p.medidas.map(m=>m.id))].join(', ')};
  const save=()=>{const o=get(),others=P.reglas.filter((x,i)=>i!==idx),E=rgValida({paquete:'xx',reglas:[...others,o]});if(E.length)return msg.textContent=E.join(' ');
    if(idx<0)P.reglas.push(o);else P.reglas[idx]=o;rgGuardaUsuario(U);rgeList();$('rgEB').prepend(rgeH('p',{class:'hint',text:'Regla guardada: '+o.id}))};
  B.appendChild(msg);
  B.appendChild(rgeH('div',{class:'row'},[rgeH('button',{class:'p',text:'Guardar',onclick:save}),rgeH('button',{text:'Probar con la señal actual',onclick:test}),rgeH('button',{text:'Volver',onclick:rgeList})]));
  fSi.focus()}
$('xPqEd').onclick=rgeOpen;
$('rgE').addEventListener('pointerdown',e=>{if(e.target===$('rgE'))rgeClose()});
