# Procedimientos (pestaña «Procedimientos», antes «Scripts»)

Los scripts se agrupan por **sistema**, para que quien tiene una avería entre por lo que le pasa al coche y no haga pruebas a ciegas:
**Arranque y carga · Integridad mecánica · Equilibrio de cilindros · Encendido · Inyección · Red CAN**. Cada apartado es un script y sus pasos son las pruebas (una captura cada una).

Un **script** dice **qué hacer**: qué capturas tomar con PicoScope, con qué canales y sondas, cómo y en qué orden.
Las **skills** (paquetes de reglas y notas, `REGLAS.md`) dicen **qué pasa**. Plan completo: `PLAN_PRUEBAS_GUIADAS.md`; origen de cada maniobra: `GUIA_CAPTURAS.md`.

| Script | Dónde vive | Quién lo cambia |
|---|---|---|
| **Original** | `src/scripts/*.json`, se incrusta al construir | El responsable, por git. En la app es de solo lectura. |
| **Del usuario** («Mis scripts») | En el navegador (`localStorage` `as_scripts`) | El usuario: «Duplicar y editar», importar o exportar `.json`. |

Una copia guarda `origen: { id, nombre, version }` y avisa si el original cambia de versión; nunca se actualiza sola.

## En la app
1. **Configurar PicoScope** (paso 0): prueba de señal, subir la base de tiempos, muestras, disparo único, exportar la pantalla a CSV.
2. **Un paso por captura**: qué medir · cómo · maniobra en orden (perfil de RPM y tramo que cabe en una pantalla).
3. **Tu configuración de PicoScope**: base de tiempos y muestras → duración de la pantalla, muestreo, resolución y tamaño del CSV, con aviso y «Usar lo recomendado».
4. **Cargar la captura**: el CSV del paso se comprueba (canales, duración, muestreo) y se abre en el osciloscopio.
5. **Resumen**: qué pasos tienen CSV; abre todas las capturas como páginas. El informe combinado llega en la fase F4 del plan.

## Formato (`analyzer-scope-script/1`)
```json
{ "formato": "analyzer-scope-script/1", "id": "FR-MEC-01", "nombre": "Mecánica sin desmontar", "autor": "", "version": "2026.11.20",
  "estado": "borrador | validado", "combustible": ["gasolina", "diesel"], "sintomas": "cuándo entrar", "skills": ["compresion-relativa"], "descripcion": "",
  "pasos": [ { "id": "P1", "titulo": "Compresión relativa",
    "canales": [ { "canal": "A", "senal": "Corriente de arranque", "sonda": "Pinza amperimétrica", "rango": "±600 A", "entidad": "pinza arranque" } ],
    "como": [ "texto", "…" ],
    "maniobra": [ { "fase": "Arrastre", "tipo": "arrastre", "s": 6, "rpm": [250, 250] } ],
    "requisitos": { "fs_min": 20000, "rpm_max": 330, "criterio": "grados | diente | ninguno" },
    "mirar": "qué mirar en la captura", "combustible": ["gasolina"], "opcional": false, "condicion": "",
    "antes": [ "preparación y seguridad" ], "validar": [ "qué comprobar en la captura antes de desmontar" ],
    "leer": [ "cómo leerla" ], "ojo": [ "riesgos y errores" ],
    "fuente": "de dónde sale" } ] }
```
* `antes`, `como`, `validar`, `leer`, `ojo`: listas; cada fase de `maniobra` puede llevar `hacer` (qué hacer exactamente). Cada frase termina con su origen entre corchetes: `[Fuente pág. N]` (curso de scripts), `[Teórico …]` (Bradley, ISO…), `[Medido]` o `[Inferido]`; la app los pinta como chapas.
* `sintomas`: se ve en la lista y en la cabecera («Cuándo entrar»). `mirar`: sale en la prueba («Qué mirar»).
* `combustible` en un paso: solo sale con ese motor (selector Gasolina / Diésel en la cabecera). `opcional` + `condicion`: prueba marcada «(opcional)», p. ej. «si tienes transductor de presión de cilindro».
* `canal`: A…H (colores de PicoScope). `entidad`: los nombres de `DX_ENT` (`16-diagnostico.js`), para el análisis de fases futuras.
* `maniobra`: fases en orden; `s` = segundos; `rpm` = [al empezar, al acabar] (dibuja el perfil). `tipo`: `reposo`, `contacto`, `arrastre`, `ralenti`, `suave`, `brusca`, `parada`, `corte` (color).
* `requisitos.fs_min`: muestreo mínimo (muestras/s). `criterio`: `grados` (objetivo ≤ 1° de cigüeñal por muestra a `rpm_max`), `diente` (≥ 50 muestras por diente de una rueda 60-2 a `rpm_max`).
* La recomendación de PicoScope sale sola: la base de tiempos más corta con pantalla ≥ maniobra + 10 %, y las muestras justas para `fs_min`.
* Un script mal escrito no se guarda ni se importa: la app dice qué falta.

## Analizar el sensor de cigüeñal (`33-ckp.js`)
Sale en las pruebas con `requisitos.criterio: "diente"` en cuanto hay CSV (o la señal de ejemplo).
1. **Dientes**: flanco de subida con histéresis (Hall o inductivo). **Hueco**: periodo > 1,6 × los anteriores → `N-m` (p. ej. 60-2).
2. **Velocidad por diente**: ángulo del periodo / duración (RPM), suavizada en 3 dientes.
3. **Fase**: el pulso de sincronismo + `Desfase (°)` = PMS del cilindro 1; con el orden de encendido, cada cilindro tiene su ventana de 720°/n desde su PMS.
4. **Aporte**: en su ventana, el pico de velocidad sobre la recta PMS→PMS siguiente (quita la tendencia). % del mejor, mediana por régimen.
5. **Regímenes por ciclo**: estable, aceleración (+3 %), sin combustión (sin pulsos de sincronismo, > 150 RPM).
6. **Conclusión**: cilindro < 85 % del mejor → [Medido]; sin combustión bien → fallo de combustión, también bajo → fuga de compresión → [Inferido].
* En gasolina el sincronismo bueno es la **bobina 1** (el inyector secuencial inyecta en admisión, ~360° antes). En diésel, el inyector 1.
* Umbral y método en borrador: validar con capturas reales (cilindro con fallo conocido).

## Analizar la red CAN (`34-can.js`)
Sale en las pruebas con `requisitos.criterio: "can"` (`requisitos.bitrate` para el comprobador, 500 kbit/s por defecto).
1. **Diferencial** H−L con histéresis (dominante > 0,9 V, recesivo < 0,5 V) → tramos. **Velocidad**: tramo corto típico = 1 bit → velocidad normalizada más cercana.
2. **Tramas**: separadas por ≥ 7 bits recesivos; se quitan los bits de relleno, se lee el ID (11 o 29 bits) y se comprueba el **CRC-15**. Un dominante de ≥ 6 bits = trama de error.
3. **Niveles por trama** en el centro de los bits, desde el bit 20 (pasado el arbitraje) y sin el ACK: solo transmite esa unidad. **Flancos**: subida 10–90 % y sobreoscilación.
4. **Por unidad (ID)**: diferencial que se aparta > 12 % de la mediana, fuera de 1,5–3 V, sobreoscilación > 25 % o CRC mal → sospechosa.
5. **Sin tramas**: por niveles, H/L a masa (< 0,5 V), a positivo (> 5 V), o H = L (reposo o unidos).
* Referencia [Teórico]: ISO 11898-2, CAN de alta velocidad. El CAN de baja velocidad tolerante a fallos no está cubierto.

## Skills que necesita cada procedimiento
`"skills": ["aporte-cilindro", …]` son **temas** de reglas. Vale cualquier skill activa con reglas de ese tema (de Ortu, de Fran o propia).
Si falta, la cabecera avisa; si está desactivada, ofrece «Activar». Los hallazgos de CKP y CAN salen de las skills activas (`35-medidas.js`), no del código.
