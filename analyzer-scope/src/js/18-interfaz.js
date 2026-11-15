/* ---------- Interfaz: vista nueva (la señal manda; todo lo demás se despliega y se recoge) / vista clásica, y tema ---------- */
const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const BD=document.body,isFix=()=>BD.classList.contains('fix');
let popT=0;
function closePops(){document.querySelectorAll('.grp.open').forEach(g=>g.classList.remove('open'));BD.classList.remove('vw','mo');
  if(BD.classList.contains('cho')){BD.classList.remove('cho');chOpen=-1;ui()}clearTimeout(popT)}
function armPops(){clearTimeout(popT);popT=setTimeout(()=>{if(!document.activeElement||!document.activeElement.closest('.gp,#chBox,#hMore'))closePops();else armPops()},9000)}
function chipClick(i){const was=BD.classList.contains('cho')&&chOpen===i;closePops();sel=i;if(!was){chOpen=i;BD.classList.add('cho');armPops()}ui();draw()}
document.querySelectorAll('.grp>.gb').forEach(b=>b.onclick=()=>{const g=b.parentElement,o=g.classList.contains('open');closePops();if(!o){g.classList.add('open');armPops()}});
$('bVw').onclick=()=>{const o=BD.classList.contains('vw');closePops();if(!o){BD.classList.add('vw');armPops()}};
$('bMore').onclick=()=>{const o=BD.classList.contains('mo');closePops();if(!o){BD.classList.add('mo');armPops()}};
const drawer=o=>{BD.classList.toggle('drw',o)};
$('bDrw').onclick=()=>{closePops();drawer(true);$('leftp').scrollTop=0};
$('bDrM').onclick=()=>{closePops();drawer(true);if(!$('oMa').checked){$('oMa').checked=true;$('oMa').onchange()}$('oMa').scrollIntoView({block:'start'})};
$('bDrX').onclick=()=>drawer(false);
document.addEventListener('pointerdown',e=>{if(isFix())return;const t=e.target;
  if(t.closest('.gp,#chBox,#hMore,#tabs'))return armPops();
  if(!t.closest('.gb,.chip,#bVw,#bMore'))closePops();
  if(BD.classList.contains('drw')&&!t.closest('#leftp,#bDrw,#bDrM'))drawer(false)},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&!isFix()){closePops();drawer(false)}});
const uiTxt=()=>{$('bVw').textContent=$('tab'+curTab).textContent+' ▾';$('bUi').textContent=isFix()?'Vista nueva':'Vista clásica';$('bThm').textContent=BD.classList.contains('light')?'Tema oscuro':'Tema claro'};
{const f=showTab;showTab=function(t){f(t);uiTxt();BD.classList.remove('vw')};const h=setLang;setLang=function(l){h(l);uiTxt()}}
$('ex').addEventListener('change',()=>BD.classList.remove('mo'));['bFit','bClr'].forEach(id=>$(id).addEventListener('click',()=>BD.classList.remove('mo')));
function setUI(m){
  closePops();drawer(false);BD.classList.toggle('fix',m==='fix');
  if(m==='fix')$('leftp').insertBefore($('chBox'),$('leftp').children[1]);else $('tb').insertBefore($('chBox'),$('chips').nextSibling);
  LS.set('as_ui',m);uiTxt();ui();draw();
}
function setTheme(l){
  BD.classList.toggle('light',l);document.documentElement.style.colorScheme=l?'light':'dark';
  uiTxt();$('bgR').value=l?100:0;$('bgR').oninput();LS.set('as_tema',l?'claro':'oscuro');
}
$('bUi').onclick=()=>setUI(isFix()?'new':'fix');
$('bThm').onclick=()=>setTheme(!BD.classList.contains('light'));
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(curTab==='S')draw()}).observe($('wrap'));
setUI(LS.get('as_ui')==='fix'?'fix':'new');if(LS.get('as_tema')==='claro')setTheme(true);
