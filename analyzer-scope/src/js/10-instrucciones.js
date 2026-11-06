/* ---------- Instrucciones y objetivo (bilingüe) ---------- */
const DOCS={
es:{
O:{title:'Objetivo de la aplicación',
lead:'Analyzer Scope es una herramienta de análisis para la diagnosis de motores de combustión (gasolina y diésel) a partir de capturas de osciloscopio de hasta 8 canales.',
sec:[
{h:'Para qué sirve',t:[
'<b>Abrir y comparar capturas</b> guardadas por distintos osciloscopios (archivos CSV), unirlas en una sola y convertirlas a CSV.',
'<b>Medir con precisión</b> tiempos, amplitudes, frecuencias y ángulos con reglas verticales y horizontales.',
'<b>Relacionar cualquier señal con el ciclo del motor de 4 tiempos (720°)</b>: regla de fase, regla de PMS, identificación de cilindros por orden de encendido o de inyección y avance de encendido o de inyección.',
'<b>Calcular el diagrama de distribución</b> a partir de los puntos de apertura y cierre de válvulas (AAA, RCE, AAE y RCA) y obtener el cruce de válvulas.',
'<b>Leer mejor la señal</b> con filtros, inversión de canales, escalas independientes por canal y anotaciones sobre la gráfica.',
'<b>Documentar el trabajo</b> con informes PDF, archivos CSV y animaciones GIF de varias capturas.']},
{h:'A quién va dirigida',t:[
'A técnicos y formadores de automoción que necesitan interpretar señales (sensor de cigüeñal y de árbol de levas, inyectores, bobinas de encendido, presiones de admisión, escape o cilindro…) y explicarlas con referencia a los grados del motor.']},
{h:'Cómo trabaja',t:[
'Trabaja sobre capturas ya guardadas en archivo. Los archivos originales no se modifican: los filtros, la inversión y las reglas solo afectan a la vista.',
'Funciona en el navegador y está disponible en español e inglés.',
'Los archivos .psdata nativos del osciloscopio no se pueden leer: expórtalos a CSV desde su programa y ábrelos aquí.']}]},
I:{title:'Procedimiento de uso',
lead:'Sigue estos pasos en orden. No hace falta usar todos: cada herramienta se activa con su botón o con la casilla de su sección.',
sec:[
{h:'1 · Cargar las señales',t:[
'Pulsa «Abrir archivos…» o arrastra los archivos a la ventana. Se aceptan CSV de distintos osciloscopios.',
'Un archivo con varios canales ocupa CH1, CH2…, hasta 8 canales. Si cargas varios archivos a la vez, cada uno es una <b>página</b>: recórrelas con la barra «Páginas» (cursor y botones ◀ ▶).',
'Los .psdata nativos no se pueden leer: expórtalos a CSV desde el programa del osciloscopio.',
'Para probar la aplicación sin datos, elige una captura en el desplegable «Ejemplos…» de la cabecera.']},
{h:'2 · Preparar la vista',t:[
'«Ajustar» encaja las escalas y el tiempo; «Limpiar» borra todo.',
'Rueda del ratón = zoom en el tiempo; arrastrar el fondo del visor = desplazar.',
'En tablet o móvil: pellizca con dos dedos = zoom; arrastra con un dedo = desplazar; toca = T1. El botón «Canales» de la cabecera muestra u oculta el panel de canales (debajo del visor).',
'El botón «Ajustes» de la parte superior del panel izquierdo muestra u oculta a la vez los ajustes de todos los canales (escala, posición, reglas, filtro e invertir). La casilla, el nombre y el parámetro de cada canal se ven siempre; los ajustes aparecen por defecto al iniciar la aplicación.',
'Por cada canal (panel izquierdo): casilla «Ver», escala por división y posición, nombre del parámetro medido, filtro (Usuario, Paso bajo, Paso alto, Ancho de banda) e «Invertir». Pulsa el nombre del canal para que sea el de las lecturas y de la regla de amplitud.',
'Cada canal tiene una <b>flecha de color</b> en el borde izquierdo del visor: arrástrala para subir o bajar su gráfica.',
'El deslizador «Fondo» cambia el fondo del visor de negro a blanco pasando por los grises.']},
{h:'3 · Medir tiempos y amplitudes',t:[
'«Reglas T1/T2»: clic en la señal = T1 y Mayús+clic = T2 (o pulsa el botón). Muestra el intervalo, la frecuencia y los grados. «Reglas T3/T4» sirve para un segundo intervalo.',
'«Amplitud»: dos reglas horizontales por canal (casilla «Reglas» de cada canal) con su diferencia.',
'Bajo el visor aparecen las lecturas del canal seleccionado: mínimo, máximo, pico a pico, media, RMS, periodo, frecuencia y ciclo útil.',
'Candado 🔓/🔒: con el candado cerrado, al arrastrar una regla se mueve todo el grupo conservando la distancia.']},
{h:'4 · Referir la señal al ciclo del motor',t:[
'Pulsa «Reglas de fase» y abre la sección «Regla de fase» (casilla de su título).',
'INICIO marca los 0° y FIN el final del ciclo: arrástralos o escribe las «RPM del motor». Elige el rango (0–720° o 0–360°) y las divisiones (2, 4 u 8).',
'La regla «PMS» es independiente: colócala sobre el PMS real de la señal.']},
{h:'5 · Identificar los cilindros',t:[
'Pulsa «Cilindros» y abre «Identificación de cilindros»: elige el número de cilindros y el orden de encendido (hay órdenes habituales y uno de usuario).',
'Los círculos numerados se arrastran todos a la vez, con una separación equidistante de 720°/n. Con «Mostrar» puedes ver los 4 tiempos de un cilindro o las filas de varios cilindros marcados.',
'La tabla «Tiempos por cilindro» lista, en orden de encendido, el disparo y cada tiempo. «Picos de compresión» marca el máximo de cada cilindro en el canal seleccionado.']},
{h:'6 · Sincronizar con la señal de disparo',t:[
'Abre «Sincronización por disparo» y elige el canal que lleva el pulso de encendido (gasolina) o de inyección (diésel), el cilindro al que corresponde el disparo y si el canal trae un solo cilindro o todos.',
'Si hace falta, ajusta el umbral y el flanco. Pulsa «Sincronizar»: la aplicación calcula el ciclo y las rpm y numera los cilindros a partir de ese disparo.']},
{h:'7 · Avance de encendido o de inyección',t:[
'Pulsa «Avance» y elige A.Enc o A.Iny en la sección «Avance». Arrastra la regla: los grados se miden respecto a la regla PMS (positivo = antes del PMS).']},
{h:'8 · Diagrama de distribución',t:[
'Pulsa «AAA·RCE·AAE·RCA» y arrastra las cuatro reglas a los puntos de apertura y cierre de válvulas de la señal, con la regla PMS entre AAA y RCE.',
'Abre la pestaña «Diagrama de distribución»: verás el diagrama circular, los avances y retrasos, las duraciones y el cruce de válvulas.',
'Los ángulos se muestran siempre en positivo: AAA y RCE se miden respecto al PMS; AAE y RCA, respecto al PMI. Si una regla queda al otro lado de su referencia, aparece ⚠ junto al valor.']},
{h:'9 · Anotar y documentar',t:[
'«Anotar» muestra las herramientas de texto, flecha, línea, lápiz, rectángulo y elipse, con borrar y deshacer.',
'«Informe PDF» (con fondo blanco o negro) incluye la captura, las lecturas y el diagrama; «Exportar CSV» guarda el archivo completo con todos tus ajustes (escalas, reglas, cilindros, filtros, anotaciones): al volver a abrirlo aquí aparece tal como lo dejaste.',
'En la pestaña «GIF» eliges desde qué página hasta cuál, el retardo y el ancho, y creas una animación con las capturas.']},
{h:'10 · Unir y convertir archivos',t:[
'En «Unir y convertir CSV» añade los archivos en el orden que quieras: «Unir en un solo CSV» los concatena en el tiempo, «Convertir cada archivo a CSV» los convierte uno a uno y «Cargar como páginas en el osciloscopio» los abre para compararlos.']},
{h:'11 · Idioma',t:[
'El selector Español | English de la esquina superior derecha cambia todos los textos de la aplicación.']}]}
},
en:{
O:{title:'Purpose of the application',
lead:'Analyzer Scope is an analysis tool for diagnosing combustion engines (petrol and diesel) from oscilloscope captures of up to 8 channels.',
sec:[
{h:'What it is for',t:[
'<b>Open and compare captures</b> saved by different oscilloscopes (CSV files), join them into one and convert them to CSV.',
'<b>Measure accurately</b> times, amplitudes, frequencies and angles with vertical and horizontal rulers.',
'<b>Relate any signal to the 4-stroke engine cycle (720°)</b>: phase ruler, TDC ruler, cylinder identification by firing or injection order, and ignition or injection advance.',
'<b>Calculate the timing diagram</b> from the valve opening and closing points (IVO, EVC, EVO and IVC) and obtain the valve overlap.',
'<b>Read the signal better</b> with filters, channel inversion, independent scales per channel and annotations on the graph.',
'<b>Document your work</b> with PDF reports, CSV files and GIF animations of several captures.']},
{h:'Who it is for',t:[
'Automotive technicians and trainers who need to interpret signals (crankshaft and camshaft sensors, injectors, ignition coils, intake, exhaust or cylinder pressures…) and explain them in terms of engine degrees.']},
{h:'How it works',t:[
'It works on captures already saved to file. The original files are never modified: filters, inversion and rulers only affect the view.',
'It runs in the browser and is available in Spanish and English.',
'Native .psdata files from the oscilloscope cannot be read: export them to CSV from its own program and open them here.']}]},
I:{title:'How to use it',
lead:'Follow these steps in order. You do not need to use all of them: each tool is switched on with its button or with the checkbox of its section.',
sec:[
{h:'1 · Load the signals',t:[
'Press “Open files…” or drag the files into the window. CSV files from different oscilloscopes are accepted.',
'A file with several channels takes CH1, CH2…, up to 8 channels. If you load several files at once, each one is a <b>page</b>: browse them with the “Pages” bar (slider and ◀ ▶ buttons).',
'Native .psdata files cannot be read: export them to CSV from the oscilloscope program.',
'To try the application without data, choose a capture in the “Examples…” drop-down in the header.']},
{h:'2 · Set up the view',t:[
'“Fit” adjusts the scales and the time span; “Clear” removes everything.',
'Mouse wheel = zoom in time; dragging the viewer background = pan.',
'On a tablet or phone: pinch with two fingers = zoom; drag with one finger = pan; tap = T1. The “Channels” button in the header shows or hides the channels panel (below the viewer).',
'The “Settings” button at the top of the left panel shows or hides the settings of all channels at once (scale, position, rulers, filter and invert). The checkbox, name and parameter of each channel are always visible; the settings are shown by default when the application starts.',
'For each channel (left panel): “Show” checkbox, scale per division and position, name of the measured parameter, filter (User, Low-pass, High-pass, Band-pass) and “Invert”. Click the channel name to make it the one used for the readings and the amplitude ruler.',
'Every channel has a <b>coloured arrow</b> on the left edge of the viewer: drag it to move its trace up or down.',
'The “Background” slider changes the viewer background from black to white through the greys.']},
{h:'3 · Measure times and amplitudes',t:[
'“Rulers T1/T2”: click on the signal = T1 and Shift+click = T2 (or press the button). It shows the interval, the frequency and the degrees. “Rulers T3/T4” is for a second interval.',
'“Amplitude”: two horizontal rulers per channel (the channel’s “Rulers” checkbox) with their difference.',
'The readings of the selected channel appear below the viewer: minimum, maximum, peak to peak, mean, RMS, period, frequency and duty cycle.',
'Lock 🔓/🔒: with the lock closed, dragging one ruler moves the whole group while keeping the distance.']},
{h:'4 · Relate the signal to the engine cycle',t:[
'Press “Phase rulers” and open the “Phase ruler” section (checkbox in its title).',
'START marks 0° and END the end of the cycle: drag them or type the “Engine RPM”. Choose the range (0–720° or 0–360°) and the divisions (2, 4 or 8).',
'The “TDC” ruler is independent: place it on the real TDC of the signal.']},
{h:'5 · Identify the cylinders',t:[
'Press “Cylinders” and open “Cylinder identification”: choose the number of cylinders and the firing order (common orders and a user-defined one are available).',
'The numbered circles are dragged all at once, with an equal spacing of 720°/n. With “Show” you can see the 4 strokes of one cylinder or the rows of several selected cylinders.',
'The “Strokes per cylinder” table lists, in firing order, the trigger and each stroke. “Compression peaks” marks the maximum of each cylinder in the selected channel.']},
{h:'6 · Synchronize with the trigger signal',t:[
'Open “Trigger synchronization” and choose the channel carrying the ignition pulse (petrol) or injection pulse (diesel), the cylinder the trigger belongs to, and whether the channel carries one cylinder or all of them.',
'If needed, adjust the threshold and the edge. Press “Synchronize”: the application calculates the cycle and the rpm and numbers the cylinders starting from that trigger.']},
{h:'7 · Ignition or injection advance',t:[
'Press “Advance” and choose Ign.Adv or Inj.Adv in the “Advance” section. Drag the ruler: the degrees are measured relative to the TDC ruler (positive = before TDC).']},
{h:'8 · Timing diagram',t:[
'Press “IVO·EVC·EVO·IVC” and drag the four rulers to the valve opening and closing points of the signal, with the TDC ruler between IVO and EVC.',
'Open the “Timing diagram” tab: you will see the circular diagram, the advances and delays, the durations and the valve overlap.',
'Angles are always shown as positive values: IVO and EVC are measured relative to TDC; EVO and IVC, relative to BDC. If a ruler is on the other side of its reference, ⚠ appears next to the value.']},
{h:'9 · Annotate and document',t:[
'“Annotate” shows the text, arrow, line, pen, rectangle and ellipse tools, with erase and undo.',
'“PDF report” (with a white or black background) includes the capture, the readings and the diagram; “Export CSV” saves the whole file with all your settings (scales, rulers, cylinders, filters, annotations): when you open it here again it looks exactly as you left it.',
'In the “GIF” tab you choose from which page to which, the delay and the width, and create an animation of the captures.']},
{h:'10 · Join and convert files',t:[
'In “Join and convert CSV” add the files in the order you want: “Join into a single CSV” concatenates them in time, “Convert each file to CSV” converts them one by one, and “Load as pages in the oscilloscope” opens them for comparison.']},
{h:'11 · Language',t:[
'The Español | English selector in the top-right corner changes all the texts of the application.']}]}
}};
function renderDocs(){
  const D=DOCS[LANG==='en'?'en':'es'],mk=o=>'<h2>'+o.title+'</h2><p class="lead">'+o.lead+'</p>'+o.sec.map(s=>'<h3>'+s.h+'</h3><ul>'+s.t.map(x=>'<li>'+x+'</li>').join('')+'</ul>').join('');
  $('docI').innerHTML=mk(D.I);$('docO').innerHTML=mk(D.O);
}

