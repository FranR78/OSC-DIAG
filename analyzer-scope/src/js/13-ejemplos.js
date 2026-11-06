/* ---------- Ejemplos incluidos (src/ejemplos/*.csv, los mete build.js en EJEMPLOS) ---------- */
function fillEx(){
  const s=$('ex');s.innerHTML='<option value="">Ejemplos…</option>'+EJEMPLOS.map((e,i)=>'<option value="'+i+'" data-dyn>'+esc(e.name)+'</option>').join('');s.value='';
}
$('ex').onchange=async()=>{
  const e=EJEMPLOS[+$('ex').value];$('ex').value='';if(!e)return;
  await loadFiles([new File([e.txt],e.name+'.csv',{type:'text/csv'})]);
  st('Ejemplo cargado: '+e.name);
};
fillEx();
