# Registro de cambios · Analyzer Scope

Una entrada por entrega. La versión sale de `src/version.txt` y se ve en el menú ☰, en la pestaña «Objetivo» y en el pie del PDF.
Política: subir `version.txt` en cada entrega y poner la etiqueta git `scope-<versión>` en el commit entregado.

## 2026.12.06
- **Skill Transductor de presión 2026.12.06** (biblioteca Pico, WPS500X): 3 reglas en borrador sobre `desv_pico_cil` / `desv_pulso_cil` (escape: empuje más bajo; admisión: jalón más débil; cárter: pico por encima del resto) y 9 notas (dónde medir según síntoma, leer la traza y desfase, adquisición y rangos, escape, restricción de escape, vacío, cárter/PCV, presión en cilindro, junta de culata).
- **Catálogo completo (15 skills nuevas, borrador):** compresión, distribución, encendido, common rail, PWM, lambda, sensores de motor, carga y arranque, consumo parásito, caída de tensión, ABS, FlexRay, NVH, trifásicos y manejo de PicoScope. 7 reglas (compresión, encendido, lambda ×2, MAP ×2) y ~100 notas.
- Las skills pueden usar también las medidas del Diagnóstico (API_DIAGNOSTICO §4.2).

## 2026.12.05
- **Skill Red CAN 2026.12.05** (con 30 vídeos de redes): CRC relativo (pocas tramas mal = baja confianza; > 2 % = avería), suma H+L ≈ 5 V, recesivo desplazado (unidad conectada sin alimentación), firmas con polímetro y 60 Ω en las comprobaciones. 22 reglas, 6 notas (orden de diagnóstico, polímetro, terminación, intermitentes, otras redes: CAN baja velocidad, FD, LIN, FlexRay, PCI).
- Medidas nuevas: `can_crc_pct`, `can_suma_dom`.

## 2026.12.04b
- Sin la dirección web en el pie de la app y del PDF.

## 2026.12.04
- **PDF nuevo:**
  - **Portada** con el resultado: número de hallazgos, la lista con la página de cada uno, el vehículo y las fuentes activas.
  - **La señal** en la página 2. Las medidas genéricas (media, RMS…) solo salen si no hay diagnóstico.
  - **Una página por hallazgo:** qué es, de qué skill sale, la evidencia con su nombre (no el identificador interno), **dónde** está y la **imagen ampliada del tramo marcado en rojo**, las causas y las **comprobaciones para rellenar en el taller** (casilla, dónde, herramienta, pasos, valor correcto, si sale bien / mal y una línea de «Resultado»).
  - **Tabla por unidad (ID) o por cilindro**, con en rojo lo que señala la skill.
- El informe sirve tanto para «Diagnóstico» como para los análisis de «Procedimientos» de la captura abierta.
- Imágenes en JPEG y PDF comprimido: de ~12 MB a ~0,7 MB.
- Skill **Fran · Red CAN** 2026.12.04: los síntomas se leen mejor («Tramas con CRC mal: 1»).

## 2026.12.03
- **Logo nuevo Ortu & Rosales Automoción** en la app, la portada y los informes.
- **Una sola letra, Open Sans**, incrustada (sin internet): interfaz, gráfica y PDF. En el PDF ya salen bien Ω, °, µ, Δ, ≈, ≤ y ≥ (antes «60 ©»).
- Licencia de la letra: `src/fonts/OFL.txt` (SIL Open Font License, permite incrustarla en un producto comercial).

## 2026.12.02
- **Comprobaciones detalladas** (formato de skill ampliado): cada comprobación puede llevar **dónde** (conector, pines), **estado del vehículo**, **herramienta**, **pasos**, **valor correcto** y qué hacer **si sale bien / si sale mal**. Se ven en Procedimientos (desplegable «Comprobar»), en Diagnóstico y en el PDF.
- Skills **Fran · Red CAN** y **Fran · Equilibrio de cilindros (CKP)** 2026.12.02 con todas sus comprobaciones detalladas (terminación 60 Ω en pines 6–14, aislar cortocircuitos, masas, conector de la unidad, prueba de fugas, cambio de bobina, retorno de inyectores…).
- Los números de los hallazgos salen con coma en español (32,5 %).

## 2026.12.01
- **Dónde está cada hallazgo:** cada hallazgo de CAN y del cigüeñal lista los tramos que lo muestran: trama con CRC mal (instante e ID leído, «dudoso»), tramas de la unidad que se aparta, carrera del cilindro flojo en cada ciclo.
- **«Ver en la señal»:** abre la captura en el osciloscopio, amplía ese tramo y lo marca en rojo con su nombre. En «Procedimientos» y en «Diagnóstico» («Dónde está en la señal»).
- **Tabla de decodificación completa:** exporta todas las columnas desde PicoScope; la app usa Start/End Time, DLC, CRC Valid, Bit Stuffing Valid, Valid y ACK (tramas malas con su instante, tramas sin confirmar) y descarta el resto. Skill **Fran · Red CAN** 2026.12.01: regla nueva «tramas sin ACK».

## 2026.11.31
- **Tabla de decodificación CAN de PicoScope** (Desc. serie → exportar CSV: ID, datos, tensión máx./mín.) en «Procedimientos → Red CAN»: pesa muy poco. Deduce el canal decodificado (diferencial, CAN-H o CAN-L), descarta las filas cortadas en el borde del búfer y compara la amplitud de cada ID con el resto; la skill señala la que se aparta. Sin flancos ni CRC (para eso, la forma de onda).
- Skill **Fran · Red CAN** 2026.11.31: regla nueva del diferencial recesivo (−0,5…0,05 V). Sale «Actualizar» en el catálogo.
- Abrir esa tabla en «Osciloscopio» ya no da error: dice dónde cargarla.

## 2026.11.30b
- **Diagnóstico usa las skills instaladas sobre la señal cargada:** si una skill activa necesita un análisis (red CAN, cigüeñal), «Diagnóstico» lo ejecuta con los canales cargados (bloque «Análisis de las skills activas», con elección de canales) y sus medidas entran en la consulta. Antes solo ocurría en «Procedimientos».
- La evidencia de una unidad CAN sale como «unidad 0x2F1» (antes «cilindro 753»), en pantalla y en el PDF.

## 2026.11.30
- **Catálogo central** (`analyzer-scope/catalogo/`, `docs/CATALOGO.md`): skills y procedimientos instalables. La app ya no trae activas las skills de CKP y CAN: se **instalan** desde «Procedimientos → Catálogo» o con el botón «Instalar» del procedimiento que las necesita.
- **Con servidor**, el catálogo se lee de GitHub `main` y lo **VIP** solo se sirve a quien lo tenga asignado (`catalogo_lista` / `catalogo_bajar` en `Servidor.gs`). **Sin servidor**, la app lleva una copia de lo libre.
- Instalado = en el navegador, sin conexión; si sube la versión en el catálogo, «Actualizar».
- **Qué probar:** Red CAN → «Instalar «Fran · Red CAN»» → señal de ejemplo → Analizar; «Quitar» desde el catálogo.

## 2026.11.29
- **Tablas de DeepMeasure en el análisis del cigüeñal:** en una prueba con CKP se puede cargar el CSV de DeepMeasure (columnas «Tiempo de inicio» y «Tiempo final»). Sale el mismo análisis, sin sincronismo: la fase se indica con «PMS del cil. 1 en el diente n.º» y la app avisa de que cada cilindro puede ser su pareja.
- **Aviso de poco muestreo:** si los periodos van a saltos (p. ej. 100 µs a 10 kS/s) lo dice, con el % del periodo que se pierde.
- Una tabla de DeepMeasure sin tiempos (solo Máx./Mín.) o en una prueba que no es de CKP se rechaza diciendo qué exportar.

## 2026.11.28
- **Scripts → Procedimientos.** Cada procedimiento declara las skills (temas) que necesita; si falta alguna lo avisa y, si está desactivada, ofrece **Activar**. Las medidas salen igual.
- **Medidas con nombre** (`35-medidas.js`): el análisis del cigüeñal y el de CAN publican medidas (`ckp_aporte_est_pct`, `can_dif_unidad`…) con su catálogo (qué es, unidad, de qué análisis sale).
- **El código ya no opina:** los umbrales del CKP (85 %) y de CAN (ISO 11898-2) salen del código a dos skills base, **Fran · Equilibrio de cilindros (CKP)** y **Fran · Red CAN (ISO 11898-2)**, con reglas, notas, fuente y estado borrador. Se ven, se activan y se copian en «Diagnóstico → Fuente de conocimiento».
- Los hallazgos de los procedimientos salen de las skills activas: [Medido] síntoma, [Inferido] causas, qué comprobar y de qué skill viene.
- **Qué probar:** Procedimientos → Equilibrio de cilindros o Red CAN → señal de ejemplo → Analizar; desactivar la skill en Diagnóstico y ver el aviso.

## 2026.11.27
- **Reglas T1/T2 apagadas por defecto:** el «Caso real» de la portada las enciende para enseñarlas y ahora las apaga al terminar.

## 2026.11.26
- **Compresión relativa en diésel:** métodos para que no arranque (desconectar inyectores; o sensor de presión del raíl o válvula reguladora; el CKP no suele servir) y comprobar que el sincronismo sigue saliendo.
- **Adaptación a Europa:** canal C con el CKP y pedal a fondo en el arrastre (acelerador electrónico) para comparar compresiones con la mariposa abierta; avisos de mariposa en emergencia al quitar la llave, de no bloquearla a mano y de la mariposa anti-sacudidas del diésel.
- Nueva etiqueta de origen «Taller».

## 2026.11.25
- **Scripts al detalle:** cada prueba trae preparación y seguridad, conexiones, qué hacer en cada fase de la maniobra, qué comprobar en la captura antes de desmontar, cómo leerla y avisos. Cada frase lleva su origen (curso de scripts con página, Bradley, ISO o propuesta nuestra).
- **Correcciones con el curso:** cierre de admisión 560–600° (no 585–615°), centro del cruce 370–390° (VVT-i 380–400°), quitado el «avance 5–15°» y las «fugas 15–20 %» que el curso no da; la caída de giro en gasolina se hace quitando el contacto con la llave; páginas citadas corregidas.
- **Paso 0:** grabación continua sin disparo y Stop al terminar la maniobra.

## 2026.11.24
- **Reglas T1/T2:** un clic en la señal ya no las saca solas; solo se colocan con «Reglas T1/T2» activas.
- **Animación de cilindros:** en el lateral, diagrama de distribución del cilindro 1 con el punto del ciclo (vuelta, tiempo y grados). Solo si hay sitio (en móvil no sale).

## 2026.11.23
- **Apartado «Red CAN»:** captura guiada de CAN-H y CAN-L (dos canales respecto a masa) y análisis trama a trama: velocidad, ID de cada unidad (con CRC comprobado), niveles de H y L, diferencial, flancos (subida y sobreoscilación) y tramas de error.
- **Dónde y qué:** la unidad cuyo nivel se aparta del resto sale señalada; por niveles dice H o L a masa o a positivo, H y L unidos o bus en reposo, terminación que falta o de más. Referencia ISO 11898-2 como [Teórico].
- **Señal de ejemplo:** 500 kbit/s, 4 unidades, la 0x2F1 con el nivel bajo.
- **Qué probar:** Red CAN → «Probar con una señal de ejemplo» → «Analizar»; con una captura real del conector de diagnosis (pines 6 y 14).

## 2026.11.22
- **Analizar el sensor de cigüeñal** (pruebas con CKP: Equilibrio de cilindros, Encendido, Inyección y caída de giro): detecta los dientes y el hueco de la rueda fónica, calcula la velocidad de cada diente y el aporte de cada cilindro en su propia carrera de trabajo (el señalado es el responsable, sin restar uno).
- Por regímenes: **estable, aceleración y sin combustión**. Si el cilindro flojo está bien sin combustión → fallo de combustión (encendido o inyección); si también queda bajo → fuga de compresión (integridad mecánica). Conclusiones con [Medido] / [Inferido].
- **Señal de ejemplo** (60-2, cilindro 3 flojo) para probarlo sin captura. Umbral del 85 % en borrador: se ajusta con capturas reales.
- **Qué probar:** Equilibrio de cilindros → «Probar con una señal de ejemplo» → «Analizar»; el lunes, con el CSV real de CKP + inyector 1.

## 2026.11.21
- **Scripts por sistema:** cinco apartados que se eligen por lo que le pasa al coche: **Arranque y carga**, **Integridad mecánica**, **Equilibrio de cilindros**, **Encendido** e **Inyección**. Cada uno dice cuándo entrar y lleva sus pruebas (una captura cada una).
- **Compresión relativa** ya no es un apartado: va dentro de Arranque y carga (principio de la gráfica) y de Integridad mecánica (oscilaciones estables). Cada prueba dice **qué mirar**.
- **Gasolina / Diésel** en los apartados con pruebas distintas; **presión en cilindro (Px)** y avance, como pruebas opcionales para quien tenga transductor de cilindro.
- **Qué probar:** Integridad mecánica en gasolina y en diésel; la prueba de corriente de inyector (captura corta).

## 2026.11.20b
- **Arreglo:** en «Scripts» solo se podía abrir el primer script; ahora se abre cualquiera.

## 2026.11.20
- **Pestaña «Scripts»:** pruebas guiadas para PicoScope. Cada script dice qué medir (canal, señal, sonda, rango), cómo y la maniobra en orden, con su perfil de RPM.
- **Comprobación de PicoScope por paso:** con la base de tiempos y las muestras que pongas, avisa si la pantalla no abarca la maniobra (p. ej. 5 ms/div), si el muestreo o la resolución no llegan y del tamaño del CSV; «Usar lo recomendado».
- **CSV por paso:** se carga en su paso y se comprueba (canales, duración, muestreo); se abre en el osciloscopio.
- **Originales y copias:** 5 scripts base (borrador) de solo lectura; «Duplicar y editar», importar y exportar (.json). Formato en `docs/SCRIPTS.md`.
- **Qué probar:** paso 2 de «Mecánica sin desmontar» con 5 ms/div y luego «Usar lo recomendado»; cargar un CSV real de PicoScope; duplicar y cambiar una duración.

## 2026.11.19b
- **Skills = reglas + notas:** cada paquete puede llevar notas (explicación, valores de referencia, procedimiento), enlazadas a sus reglas por el tema; plantilla de notas en hoja de cálculo; botón 📖 en el hallazgo y en el PDF.
- **Servidor propio** (`apps-script-scope/`): los clientes ejecutan sobre la copia del dueño, sin entrar en el portal.

## 2026.11.19
- **Portal para clientes:** permisos por correo (activo, caducidad, notas maestras sí/no, paquetes asignados).
- **Paquetes compartidos:** se bajan desde Diagnóstico y funcionan sin conexión; los autores los publican desde la app.
- **Qué probar:** con una cuenta sin notas maestras, que el diagnóstico salga solo con sus paquetes.

## 2026.11.18c
- **Fuentes de conocimiento:** base Ortu, «Mis reglas» con editor y plantilla de hoja de cálculo (Excel/CSV); en el portal, además, las notas maestras. Las discrepancias entre fuentes se ven en pantalla y en el PDF.
- **Barra de grados** (menú Reglas): al arrastrarla se ven los cilindros sobre la señal en ese ángulo; animación con grados por cilindro, mezcla, chispa o inyector y levas.
- **Gráfica más grande:** tirador bajo la gráfica y alto de las franjas ADM·COMP·EXP·ESC ajustable (Motor → Franjas).
- **Aviso** antes de generar el PDF sin diagnóstico.
- **Qué probar:** descargar la plantilla, cambiar un ejemplo y subirla; arrastrar la barra de grados en el iPhone.
