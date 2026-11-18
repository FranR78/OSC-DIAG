/* ---------- Portal: paquetes de reglas compartidos (ScopePaquetes) · bajar, actualizar, quitar y publicar ----------
   Lo que se baja queda en este navegador (as_subs) como fuente de solo lectura; funciona sin conexión. */
let PQ_LISTA=[];
function pqGuarda(a){LS.set('as_subs',JSON.stringify(a));rgPanel();pqPanel()}
function pqPanel(){const el=$('xPqP');if(!el)return;el.innerHTML='';el.hidden=APP_CFG.modo!=='portal';if(el.hidden)return;
  el.appendChild(T('b',i18('Paquetes compartidos')));
  if(RG_PERM)el.appendChild(T('div',(RG_PERM.notas?i18('Tu acceso incluye las notas maestras.'):i18('El diagnóstico usa tus paquetes de reglas.'))+(RG_PERM.caduca?' '+i18('Caduca el')+' '+RG_PERM.caduca+'.':''),'hint'));
  const S=rgSubs();if(!PQ_LISTA.length)el.appendChild(T('div',i18('No hay paquetes compartidos para tu cuenta.'),'hint'));
  PQ_LISTA.forEach(p=>{const ya=S.find(x=>x.paquete===p.id),r=T('div',null,'row');
    r.appendChild(T('span',p.nombre+' · '+p.reglas+' '+i18(p.reglas===1?'regla':'reglas')+(p.autor?' · '+p.autor:'')+(p.version?' · v'+p.version:'')));
    const b=T('button',i18(ya?(ya.version!==p.version?'Actualizar':'Quitar'):'Bajar'));
    b.onclick=()=>{if(ya&&ya.version===p.version)return pqGuarda(rgSubs().filter(x=>x.paquete!==p.id));
      dxCall({v:1,op:'paquete_bajar',cliente:{app:'analyzer-scope',ver:APP_CFG.ver},id:p.id}).then(res=>{if(!res||!res.ok)return st((res&&res.error&&res.error.mensaje)||'Error');
        const E=rgValida(res.paquete);if(E.length)return st(i18('Paquete no válido')+': '+E[0]);pqGuarda(rgSubs().filter(x=>x.paquete!==p.id).concat([res.paquete]));st(i18('Paquete bajado')+': '+p.nombre)},dxErr)};
    r.appendChild(b);el.appendChild(r)});
  if(RG_PERM&&/^(autor|admin)$/.test(RG_PERM.rol)){const u=rgUsuario(),sel=document.createElement('select');u.forEach((P,i)=>{const o=document.createElement('option');o.value=i;o.textContent=P.nombre||P.paquete;sel.appendChild(o)});
    const b=T('button',i18('Publicar para compartir'));b.onclick=()=>{const P=rgUsuario()[+sel.value];if(!P||!P.reglas.length)return st(i18('Ese paquete no tiene reglas.'));
      dxCall({v:1,op:'paquete_publicar',cliente:{app:'analyzer-scope',ver:APP_CFG.ver},paquete:P}).then(res=>{if(!res||!res.ok)return st((res&&res.error&&res.error.mensaje)||'Error');st(i18('Publicado como')+' «'+res.id+'». '+i18('Quien administra decide a quién se asigna.'));pqCargar()},dxErr)};
    const r=T('div',null,'row');r.appendChild(sel);r.appendChild(b);el.appendChild(r)}}
function pqCargar(){if(APP_CFG.modo!=='portal')return;dxCall({v:1,op:'paquetes_lista',cliente:{app:'analyzer-scope',ver:APP_CFG.ver}}).then(r=>{if(r&&r.ok){PQ_LISTA=r.paquetes||[];if(r.permisos)RG_PERM=r.permisos;pqPanel();rgPanel()}},()=>{})}
pqPanel();
