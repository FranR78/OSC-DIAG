# Analyzer Scope — guía de traspaso

Aplicación web de **análisis de señales de osciloscopio (hasta 8 canales) para diagnosis de motores de combustión**.
Autores/créditos que deben aparecer: **J.A.Ortúñez y Fran Rosales**. Marca del taller: **Ortu Automoción** (logo en `assets/`).
Idioma de trabajo con el usuario: **español**. La interfaz es bilingüe (español/inglés).

Dos versiones del mismo código: **libre** `dist/analyzer-scope.html` (fuera del portal) y **portal** `dist/analyzer-scope-portal.html` (servida por la web app; pestaña «Diagnóstico» conectada a las NT, ver `docs/API_DIAGNOSTICO.md`). Cada una es **un único archivo HTML autocontenido** (`dist/analyzer-scope.html`, ~520 KB con jsPDF incrustado). Funciona **sin internet**.
Se **edita** en módulos (`src/`) y se **construye** con `node build.js` (sin dependencias). `dist/` se sube a git: es lo que se entrega.
Era un artefacto publicado de claude.ai (`https://claude.ai/artifact/Mo32r74KB8kD9ih1SZevHw`); en otro proyecto hay que **publicarlo de nuevo** (será otra URL).

```
analyzer-scope/
├─ README.md                 ← este documento
├─ PROMPT_INICIAL.md         ← mensaje listo para pegar al empezar el nuevo proyecto
├─ build.js                  ← src/ → dist/analyzer-scope.html  (--check: comprueba que dist está al día)
├─ dist/analyzer-scope.html  ← LA APLICACIÓN para entregar (generada, no editar a mano)
├─ src/
│  ├─ index.html             ← plantilla: cabecera, HTML de la interfaz y marcadores {{…}}
│  ├─ css/styles.css
│  ├─ js/01-idioma.js … 14-pdf-y-arranque.js  ← se concatenan en orden en UN <script> (ámbito global)
│  ├─ img/logo.jpg           ← se incrusta en base64
│  ├─ ejemplos/*.csv         ← capturas del desplegable «Ejemplos…»: soltar aquí el CSV y construir (nombre = archivo sin «N » inicial)
│  └─ vendor/jspdf.umd.min.js ← jsPDF 2.5.1 (MIT), sin tocar
├─ assets/logo_ortu_automocion.jpg
├─ tests/                    ← pruebas de regresión en navegador real (Playwright) + datos de ejemplo
│  ├─ smoke.js, package.json
│  └─ data/ (7 CSV de varios osciloscopios, 1 .psdata nativo)
└─ docs/i18n-dictionary.json ← diccionario español→inglés (341 pares) en formato legible
```

---------------------------------------------------------------------------------------------------

## 1. Qué hace la aplicación (estado actual)

Pestañas: **Osciloscopio · Diagrama de distribución · Compresión relativa · Diagnóstico · Convertir archivos · GIF · Instrucciones · Objetivo**.
Selector **Español | English** arriba a la derecha (cambia TODO el contenido).

| Área | Funciones |
|---|---|
| **Carga** | CSV/TSV/TXT de varias marcas (separador `,` `;` tab, coma decimal, fila de unidades `(ms)`, `(mbar)`…), sesiones propias `.psdata` JSON (solo lectura). Varios archivos ⇒ **páginas** (barra «Páginas» con cursor ◀ ▶). CSV con cabeceras repetidas ⇒ varias páginas. |
| **Visor** | 8 canales, zoom con rueda, desplazar arrastrando, escala V/div y posición por canal, **flecha de color** por canal en el borde izquierdo (arrastrar = mover la gráfica en vertical), parámetro medido por canal (etiqueta), filtros por canal (Usuario 500 Hz / paso bajo / paso alto / ancho de banda, doble pasada sin desfase), invertir, **deslizador de fondo negro→gris→blanco** (los colores se adaptan por contraste). |
| **Reglas** | Fase 0–720° / 0–360° con 2/4/8 divisiones (INICIO=0°, FIN), PMS independiente de INICIO, T1/T2 y T3/T4 (Δt, frecuencia, grados), amplitud por canal (2 reglas horizontales), **candados 🔓/🔒** que mueven el grupo conservando la distancia. |
| **Cilindros** | Nº de cilindros (1,2,3,4,5,6,8,10,12,16), orden de encendido habitual + orden de usuario, círculos numerados que se **deslizan todos a la vez** con separación equidistante **720°/n**, cilindros a mostrar (casillas), modos «Todos · identificación» / «Cilindro n · 4 tiempos» / «Tiempos de los marcados · vertical» (filas apiladas), tabla de tiempos por cilindro, picos de compresión (verde/ámbar/rojo −5 %/−10 %). |
| **Sincronización por disparo** | Elegir canal de disparo, gasolina/diésel, «un cilindro (1 por ciclo)» o «todos (n por ciclo)», umbral % del pico, flanco, cilindro del disparo, avance. Detecta pulsos (agrupa rebotes y piloto+principal), calcula ciclo y rpm, numera desde el cilindro elegido. |
| **Avance** | Regla A.Enc / A.Iny medida en grados **respecto a la regla PMS** (positivo = antes; se toma el PMS más cercano porque se repite cada 360°). |
| **Distribución** | Reglas **AAA·RCE·AAE·RCA** (botón), tabla y diagrama circular. Ángulos **siempre en positivo**: AAA y RCE respecto al PMS; AAE y RCA respecto al PMI; ⚠ si la regla está al otro lado de su referencia (se muestra el valor absoluto, pero duraciones y cruce usan el valor con signo). |
| **Compresión relativa** | Pinza en el motor de arranque + sincronismo de un cilindro (inyector o bobina, uno por ciclo). Media móvil de 4 ms, pico por cilindro en ±360°/n alrededor de su PMS (orden de encendido de «Identificación de cilindros»), promedio de los ciclos y barras en % del mejor; línea al 90 %. Colores fijos: 1 azul, 2 rojo, 3 verde, 4 amarillo, 5 morado, 6 naranja, 7 cian, 8 rosa (`17-compresion.js`). |
| **Anotar** | Botón «Anotar» muestra/oculta la barra: texto, flecha, línea, lápiz, rectángulo, elipse, borrar, deshacer (Ctrl+Z), color, grosor, «ver anotaciones». Se anclan al tiempo (siguen zoom/desplazamiento). |
| **Documentar** | Informe **PDF** (fondo blanco/negro; captura + lecturas + diagrama; logo pequeño), **CSV** de la vista, **GIF** animado por rango de páginas. |
| **Convertir archivos** | Lista en orden de carga; **unir en un solo CSV** (concatena en el tiempo), **convertir cada archivo a CSV**, cargar como páginas |
| **Panel izquierdo** | Asignación de canales siempre visible (casilla, nombre, parámetro). Botón **«Ajustes»** pliega/despliega en bloque escala, posición, reglas, filtro e invertir (desplegados por defecto). Secciones plegables con casilla (empiezan plegadas): Regla de fase, Identificación de cilindros, Avance, Sincronización por disparo. |

Interacciones: rueda = zoom · arrastrar fondo = desplazar · clic = T1 · Mayús+clic = T2 · Esc = volver a «Cursor» · Ctrl+Z = deshacer anotación.

---------------------------------------------------------------------------------------------------

## 2. Arquitectura del código (`src/js/`)

Un archivo por sección, en este orden (cada uno empieza con `/* ---------- … ---------- */`). **No son módulos ES**: se concatenan y comparten el ámbito global, así que el orden importa y los nombres no se pueden repetir entre archivos.

* `01-idioma.js` – `DICT`, `i18()`, parches de `innerHTML`/`textContent`, `applyStatic()`, `setLang()`.
* `02-parser.js` – `parseText()` (CSV/TSV/TXT).
* `03-escala-vista.js` – `rng`, `autoCh`, `refOf`, `fit`, búsqueda binaria `lb`.
* `04-dibujo.js` – `draw(theme)` (lienzo principal) y helpers de color (`pkc`, `mixc`, `lumHex`…).
* `05-distribucion.js` – `distCalc()`, `distRows()`, `drawDist()` (diagrama circular).
* `06-mediciones.js` – `measure()`.
* `07-filtros-canales.js` – `filt2` (biquad Butterworth RBJ adelante+atrás), `proc(c)`, `ui()`.
* `08-cilindros.js` – `engA`, `engEvents`, `cylData`, `cylList`, `fillSC`, **`groupIv`/`trigEvents`/`syncCyl`** (disparos y sincronización).
* `09-paginas-csv-gif.js` – `splitBlocks`, `parseAny`, `addPages/showPage/updPager`, `loadFiles`, `fAddFiles/fMerge/fConv`, `lzw/quant/gifEncode/makeGif`, `showTab`.
* `10-instrucciones.js` – objeto `DOCS` (es/en) + `renderDocs()`.
* `11-anotaciones.js` – `setTool`, `annDown/Move/Up`, `drawAnn`.
* `12-interaccion.js` – `hit()`, `lockMove()`, manejadores de puntero/rueda, CSV/sesión.
* `13-ejemplos.js` – desplegable «Ejemplos…» (capturas de `src/ejemplos/`, que `build.js` incrusta en `EJEMPLOS`).
* `14-matematicos.js` – **canales matemáticos** (`MK` plantillas, `mathCalc`, `mEdges` flancos con histéresis, `mResamp`): frecuencia, RPM desde CKP (hueco de rueda automático), ciclo útil, CAN-H−CAN-L con niveles, A±B, A×B, escala. Envuelve `proc` (recalcula si cambia el origen) y `ui` (`fillMath`). Definición en `c.m` (se guarda en el CSV con ajustes, índices remapeados).
* `16-diagnostico.js` – pestaña **«Diagnóstico»**: `dxPeticion` (medidas del catálogo, por cilindro con `dxCyl`), `dxCall` (portal: `google.script.run.apiDiagnostico`; libre: GET opcional a `apiUrl` o aviso), pintado seguro con `T()` (texto, sin traductor), página en el PDF (`DXR`). `APP_CFG.modo` = `libre`|`portal` (lo fija `build.js`; `src/config.json` para `portalUrl`/`apiUrl` de la libre).
* `15-pdf-y-arranque.js` – `saveFile()`, `report()` (PDF), cableado de botones y `ui();sync();draw();…`.

### Estado global (los nombres importan)
```
CH[0..7]  {n,p(parámetro),u,x(Float64),y0(crudo),y(mostrado: filtrado/invertido),on,vd,off,ref,h[2],hr,fl,f1,f2,inv,_set}
view      {t0,span}                      ph  {on,t0(INICIO=0°),T(=duración de 720°),auto,deg(360|720),div,lk}
pms       {on,t,}                        tr / tr2  → reglas T1/T2 y T3/T4 (tiempos en cur.a,b / cur.c,d), tr.lk
vv        {on,ie,ia,fe,fa,lk}            ← ATENCIÓN: ia=AAA, fe=RCE, ie=AAE, fa=RCA
adv       {on,t,k:'enc'|'iny'}           eng {on,n,order[],show(0 todos | >0 un cil. | −1 marcados),pk,A,c0,sync,vis}
PG[] páginas {name,chs[],n}   pgI        QF[] cola de «Convertir archivos»   ann {tool,col,w,list[],cur,vis}
```
Convenciones físicas: ciclo de 4 tiempos = **720°**; `ph.T` es SIEMPRE el tiempo de 720°; `ph.deg` solo decide dónde cae FIN.
`distCalc()` usa `refT()` = regla PMS si está activa (si no, INICIO). Eventos de cilindro: `t = engA() + j·T/N`, cilindro `order[(idx(c0)+j) mod N]`;
ancla por defecto `ph.t0 + T/2` (el cilindro 1 a 360° de INICIO) hasta que se arrastra o se sincroniza.

### Algoritmos que conviene no romper
* **Detección de disparos** (`trigEvents`): reposo = mediana; pico = máx. de min(|y[i]|,|y[i+1]|) (ignora picos de 1 muestra); histéresis 0,6; los intervalos se agrupan jerárquicamente (`groupIv`) cortando en el mayor salto de razón de huecos (≥2,5, o ≥8 si hay muchos huecos pequeños) ⇒ rebotes y piloto+principal cuentan como **un** disparo. Evento = inicio (subida) o fin (bajada) del grupo. Modo `one`: T = mediana de intervalos; modo `all`: T = mediana × N.
* **Filtros**: se quita el primer valor de cada etapa (arranque sin transitorio) y se filtra adelante y atrás.
* **GIF**: paleta fija 6×7×6 (252 colores), LZW estilo *omggif*; se verificó con PIL píxel a píxel (incluye reinicios de tabla).
* **Contraste automático** (`draw`): el color de fondo se interpola con el deslizador `bgV`; `D = luminancia<0,179`; cada color toma la variante (clara/oscura) con mejor contraste (`pkc`). `draw('light'|'dark')` fuerza el tema (PDF/GIF).

---------------------------------------------------------------------------------------------------

## 3. Internacionalización (muy importante al editar textos)

* **El código fuente está en español.** Para cada texto nuevo visible hay que **añadir su par al `DICT`** (inicio del script). Si no, en inglés aparecerá en español.
* `i18(s)` traduce por **frases con límites de palabra (`_` cuenta como letra, para no tocar nombres de archivo)**, las más largas primero; las entradas de 1 carácter (`o`) solo se usan en coincidencia exacta del DOM. Los fragmentos con espacios al borde (`' disparos '`) sirven para mensajes compuestos.
* Parchea los *setters* `innerHTML`/`textContent`, `ctx.fillText/measureText` del lienzo y `jsPDF.doc.text`. Lo asignado por **propiedad** (`placeholder=`, etc.) hay que envolverlo a mano: `i18('…')`.
* Los elementos escritos desde JS llevan `data-dyn`; `applyStatic()` solo recorre el DOM estático (guarda el texto original en `_es` / `data-es*`). `setLang()` vuelve a generar lo dinámico (`fillG, ui, sync, cylList, fRender, updPager, renderDocs…`).
* **Nunca** programar lógica que dependa del texto visible (ya hubo un fallo en Iniciar/Parar).
* Equivalencias fijas ES→EN: PMS→TDC · PMI→BDC · APMS/DPMS→BTDC/ATDC · APMI/DPMI→BBDC/ABDC · **AAA→IVO · RCE→EVC · AAE→EVO · RCA→IVC** · A.Enc/A.Iny→Ign.Adv/Inj.Adv · INICIO/FIN→START/END · ADM/COMP/EXP/ESC→INT/CMP/PWR/EXH · Tiempos (carreras)→strokes.
* Las **Instrucciones/Objetivo** están escritas a mano en los dos idiomas dentro de `DOCS`. Los nombres entre «» (ES) o “” (EN) deben existir en la interfaz (lo comprueba `smoke.js`).

---------------------------------------------------------------------------------------------------

## 4. Decisiones y preferencias del usuario (respetarlas)

* Título «**Analyzer Scope** — by J.A.Ortúñez y Fran Rosales». Logo de Ortu Automoción en cabecera y en el PDF (pequeño), **no** dentro del visor.
* En la pantalla de inicio **no** deben aparecer las marcas PicoScope/Hantek.
* **Se quitó todo lo de Hantek** (lectura `.RFC`/`.RFE`, puente USB, `tools/hantek_inspect.py`): la app trabaja con **CSV** exportados desde el software de cada osciloscopio.
* Estética: fondo azul-negro/blanco/gris con paneles de cristal; visor que va de negro a blanco con el deslizador.
* **Sin bandas de color a toda altura** para identificar cilindros: se usan círculos dorados numerados (estilo «Pressure Waveform Overlays»); las filas verticales por cilindro son una opción aparte.
* Orden de siglas en listas/tablas: **AAA · RCE · AAE · RCA**. Sobre la señal las reglas se colocan en orden cronológico AAE, AAA, RCE, RCA.
* PMS **independiente** de INICIO. Ángulos de distribución **siempre positivos** (con ⚠ si hay inversión).
* Al iniciar (petición de Ortu): «Regla de fase» e «Identificación de cilindros» **desplegadas**, «Cilindros» activo en «Tiempos de cilindros · rejilla»; el resto de secciones plegadas; ajustes de canales desplegados.
* Sin simulador ni «Fuente»: en su lugar el desplegable **«Ejemplos…»**.
* **«Exportar CSV»** = archivo completo, valores **sin filtrar** (`y0`) + 1.ª línea `#analyzer-scope-ajustes;{json}` (`cfgOf`/`applyCfg`); al reabrirlo se recupera todo. Otros programas verán esa línea extra.
* Se quitó la exportación `.psdata` (no se puede generar el formato nativo de PicoScope).
* Los órdenes de encendido de 10, 12 y 16 cilindros son **de referencia** (avisar al usuario de que los confirme con el manual).

---------------------------------------------------------------------------------------------------

## 5. Formatos de archivo (lo que se averiguó)

* **`.psdata` de PicoScope**: empieza por `JWWD`; el bloque de datos está comprimido/cifrado (alta entropía, no es zlib/lzma/bz2) y solo hay una miniatura PNG 256×256 legible al final. **No se puede leer**; la app avisa y pide exportar a CSV.
* **CSV de PicoScope**: `Tiempo;Canal A…` / `(ms);(V)…` / línea vacía / datos con coma decimal. Otros CSV: cabecera `Time,CH-1` con bloque de metadatos previo.
* Sesión propia (solo lectura): JSON que empieza por `{"format":"ortu-psdata"`.

---------------------------------------------------------------------------------------------------

## 6. Pendiente / ideas

1. ~~Puente USB para Hantek 1008C~~ (descartado: el navegador no puede usar la DLL; se trabaja con CSV exportados).
2. ~~Formato `.RFE`~~ (descartado).
3. ~~PDF con internet~~: hecho, jsPDF 2.5.1 (MIT) incrustado en el HTML.
4. Regla de **PMI** propia (hoy se toma a ±180° del PMS).
* **Siguiente (pedido por Ortu):** superponer capturas de distintos puntos (transductores en admisión, escape, cárter…) alineadas por la referencia del cilindro 1 y pasadas a grados (0–720°), para ver varios puntos del mismo coche en una vista. Ojo: no son simultáneas (motor estable).
5. Umbrales de picos de compresión (5 %/10 %) y de detección (35 %) son elecciones propias.
6. El GIF usa paleta fija (degradados algo menos finos); se podría añadir cuantización adaptativa.

---------------------------------------------------------------------------------------------------

## 7. Cómo seguir trabajando

**Editar**: el archivo de `src/` que toque (JS en `src/js/`, estilos en `src/css/`, interfaz en `src/index.html`). Después:
```
node --check src/js/<archivo>.js
cd tests && npm install && npx playwright install chromium && npm test   # construye las dos versiones y pasa 67 comprobaciones
```
Antes de subir a git: `node build.js --check` (falla si `dist/` no se reconstruyó).
`smoke.js` abre la página en Chromium real, carga los CSV de `tests/data` (con la red bloqueada), y comprueba carga, páginas, fondo, ajustes, sincronización, distribución, idioma (busca español sobrante en inglés), instrucciones, unión, conversión, GIF y errores JS.
Para depurar visualmente: `page.screenshot()` con Playwright y mirar la imagen (así se detectaron etiquetas cortadas y problemas de contraste).

**Publicar como artefacto de claude.ai** (si el nuevo proyecto lo permite): publicar el archivo con la herramienta Artifact declarando `capabilities {"downloads": true}` (las descargas usan `window.claude.use('downloads')`, con `<a download>` como alternativa en local; extensiones permitidas incluyen csv, pdf, gif, json). La acción `edit` actúa sobre la copia **publicada**: si el archivo local cambió y no se publicó, publicar primero el archivo entero.

### Trampas ya encontradas (no repetir)
* **No editar `dist/` a mano**: se sobrescribe en cada `node build.js`. (Antes, parchear el HTML único buscando `</script>` encontraba el de jsPDF y duplicó media aplicación; con `src/` ya no hace falta.)
* **Choques de nombres**: `tr` ya es el estado de las reglas T1/T2 (el traductor se llama `i18`); `pk` es el array local de picos en `draw()` (el helper de color es `pkc`).
* Al comprobar el GIF con PIL, `round()` de Python es de «banquero»: usar redondeo hacia arriba como JS.
* Playwright `setInputFiles` falla en silencio con rutas con `Ñ`/`º`: copiar a un nombre ASCII.
* `{…}` en el diccionario: las claves deben coincidir **exactamente** con el texto fuente (espacios incluidos); si se cambia un texto de la interfaz, cambiar también su clave.
* En `distCalc` los valores internos conservan el signo; solo la **presentación** es positiva.
* Las reglas AAA·RCE·AAE·RCA se miden con `w360` (PMS/PMI más cercano): la regla PMS puede estar en el PMS de compresión o en el de cruce. Con `w720` salía un desfase de 360° en los valores (el diagrama, circular, no lo mostraba).

---------------------------------------------------------------------------------------------------

## 8. Referencia rápida de IDs de la interfaz

Cabecera: `fi` (selector de archivos), `bFit`, `bClr`, `src`, `bRun`, `lES`/`lEN`. Panel: `leftp`, `bSet`, `chs`, `oPh/oCy/oAv/sOn` (casillas de sección) y `bPh/bCy/bAv/sBox` (bloques), `rpm`, `phR`, `phD`, `gN`, `gO`, `gU`, `gS`, `cVis`, `cPk`, `tBox/tCy`, `advk`, `sC/sM/sU/sE/sY/sA`, `bSy`, `bDx`.
Barra de herramientas: `tPh,tPms,tT,tT2,tAmp,tGr,tVv,tAdv,tAn`, candados `kPh,kT,kT2,kVv`, `bgR` (fondo), `bExp`, `pdfBg`, `bPdf`; anotación `at`, `a_none…a_del`, `aCol`, `aW`, `aVis`, `aUn`, `aClr`. Visor: `cv`, `pgbar/pgR/pgP/pgN/pgL/pgNm`, `rd` (lecturas), `st` (estado). Pestañas: `tabS/D/C/X/F/G/I/O` y vistas `viewS/D/C/X/F/G/I/O`; compresión `cv3,crS,crY,crI,crGo,crSt,crM`; `cv2` y `dd` (diagrama); `fIn,fList,fMerge,fConv,fPages,rfM,rfD`; `gA,gB,gD,gW,gT,gL,gMk,gDl,gSt,gImg`; `docI`, `docO`.
