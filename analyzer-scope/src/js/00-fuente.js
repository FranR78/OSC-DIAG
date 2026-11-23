/* ---------- Letra de la app, de la gráfica y del PDF: Open Sans (OFL, src/fonts/OFL.txt), incrustada: funciona sin internet ---------- */
const FONT_UI="'Open Sans',system-ui,-apple-system,'Segoe UI',sans-serif";
(function(){if(typeof FONT_OS!=='object'||typeof FontFace!=='function')return;
  const P=[['r','400'],['b','700']].map(([k,w])=>{try{const f=new FontFace('Open Sans','url(data:font/ttf;base64,'+FONT_OS[k]+')',{weight:w});document.fonts.add(f);return f.load()}catch(e){return Promise.resolve()}});
  Promise.all(P).then(()=>{try{if(typeof draw==='function'&&typeof CH!=='undefined'&&CH.some(c=>c.x))draw()}catch(e){}},()=>{})})();
