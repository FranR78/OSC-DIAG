# Mensaje inicial para el nuevo proyecto

Pega esto como primer mensaje y adjunta el contenido del paquete (al menos `src/analyzer-scope.html` y `README.md`).

---

Voy a continuar el desarrollo de una aplicación web llamada **Analyzer Scope** (créditos: J.A.Ortúñez y Fran Rosales; marca del taller: Ortu Automoción). Es un analizador de señales de osciloscopio de hasta 8 canales para diagnosis de motores de combustión (gasolina y diésel). Está hecha como **un único archivo HTML** (`src/analyzer-scope.html`) y viene de otra conversación, de la que no tienes memoria.

**Antes de tocar nada, lee `README.md`** (arquitectura, estado global, convenciones físicas, internacionalización, decisiones mías, formatos de archivo, trampas ya encontradas y pendientes).

Reglas de trabajo:
1. Háblame en **español**. La interfaz es bilingüe (ES/EN): cada texto nuevo visible necesita su par en el diccionario `DICT` y, si es de ayuda larga, su versión en `DOCS`. No programes lógica que dependa del texto visible.
2. Haz **cambios mínimos y exactos** sobre el archivo existente; no reescribas la aplicación ni cambies el aspecto o las decisiones del README sin que yo lo pida.
3. Tras cada cambio: comprueba la sintaxis del `<script>` y ejecuta `tests/smoke.js` (Playwright, 40 comprobaciones). Si añades una función, añade su comprobación. Mira capturas de pantalla cuando el cambio sea visual.
4. Cuida estas trampas: localizar el **último** `<script>` al parchear (el primero es el de jsPDF), no pisar los nombres `tr` (reglas T1/T2) ni `pk` (picos locales), y mantener las claves del diccionario idénticas al texto fuente.
5. Si no puedes verificar algo (por ejemplo la lectura de un formato que no tienes), dímelo en vez de suponerlo.
6. Al terminar cada petición resume qué cambió y qué probaste, y avísame de lo que sea una interpretación tuya.

Pendientes conocidos: ver §6 del README (lo de Hantek está descartado; la app trabaja con CSV).

Mi primera petición es: **[escribe aquí lo que quieres hacer]**
