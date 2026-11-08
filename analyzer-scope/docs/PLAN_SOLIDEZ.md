# Plan de solidez · Analyzer Scope

Para la sesión que lo continúe. Contexto: la app funciona y crece rápido (174 pruebas en verde, dos versiones
libre/portal, reglas propias, canales matemáticos, superposición). Lo que falta es **que no se rompa sin avisar,
que se sepa qué versión tiene cada uno y que lo validado en taller quede como prueba**.

Antes de empezar: leer `CLAUDE.md` (raíz), `analyzer-scope/README.md` y `analyzer-scope/PROMPT_INICIAL.md`.
Reglas que aplican a todo: editar solo `src/` (nunca `dist/` a mano), `node build.js` + `npm test` en `tests/`
tras cada cambio, textos visibles con su par en `DICT`, nada fijo de un usuario en el código, sin datos de
clientes ni matrículas, commit + push al terminar cada tarea.

---------------------------------------------------------------------------------------------------

## Estado de partida (2026-11-18)

| Área | Estado |
|---|---|
| Repo ordenado, módulos `src/` + `build.js`, PDF sin internet, tablet/móvil | ✅ |
| Hantek (.RFC/.RFE, puente USB) | Descartado: solo CSV |
| Peticiones de Ortu (arranque, Ejemplos, CSV con ajustes, nombres, desfase 360°) | ✅ |
| Canales matemáticos, diagnóstico local, reglas y editor, versión portal | ✅ en `main` |
| Superposición por cilindro 1 (`src/js/28-superposicion.js`) | ✅ en la rama `claude/relaxed-edison-dj1cke`, **pendiente de llevar a `main`** |
| Integración real en el portal (`apiDiagnostico`, tamaño, descargas en iframe) | Sin verificar desde aquí |
| Validación con capturas reales de taller | ⏳ Pendiente (depende de Ortu) |
| Pruebas automáticas en GitHub | ❌ No existen: las pruebas solo corren si alguien se acuerda |

---------------------------------------------------------------------------------------------------

## Tareas (en este orden)

### T1 · Pruebas automáticas en cada push/PR (GitHub Actions) — prioridad alta
**Por qué:** hoy un cambio puede romper la app y nadie lo ve hasta que Ortu lo usa.
**Qué:**
1. `analyzer-scope/tests/package-lock.json`: ejecutar `npm install` en `tests/` y subir el lockfile (instalación reproducible).
2. `.github/workflows/analyzer-scope.yml`:
   * disparo: `push` y `pull_request` con `paths: ['analyzer-scope/**', '.github/workflows/analyzer-scope.yml']`;
   * `ubuntu-latest`, Node 20, `working-directory: analyzer-scope`;
   * pasos: `node build.js --check` → `cd tests && npm ci && npx playwright install --with-deps chromium && npm test`;
   * `timeout-minutes: 15`; subir `tests/*.png` como artefacto solo si falla (si las pruebas generan capturas).
**Hecho cuando:** una PR de prueba muestra el check en verde; una PR que rompa `dist/` (sin reconstruir) sale en rojo.

### T2 · Plantilla para avisar de fallos — prioridad alta, 15 min
**Por qué:** los fallos llegan por audio o WhatsApp; sin versión, pasos ni captura no se pueden reproducir.
**Qué:** `.github/ISSUE_TEMPLATE/fallo.md` con: versión (pie de la app o `src/version.txt`), libre/portal,
dispositivo y navegador, pasos, qué esperaba y qué salió, **CSV adjunto** (sin matrícula en el nombre ni línea
`Author:`), captura de pantalla. Y `.github/ISSUE_TEMPLATE/mejora.md` corta (qué, dónde, cómo debe quedar,
numerado como pide Ortu).
**Hecho cuando:** «New issue» en GitHub ofrece las dos plantillas.

### T3 · Versiones con nombre y registro de cambios — prioridad media
**Por qué:** saber qué versión tiene cada uno cuando avisa de un fallo.
**Qué:**
1. La versión (`APP_CFG.ver`, de `src/version.txt`) **visible** en la app: pie de página y pestaña «Objetivo»
   (comprobar si ya se muestra; si no, añadirlo) y en el PDF.
2. `analyzer-scope/CHANGELOG.md`: una entrada por entrega a Ortu (fecha-versión, 3–5 líneas, qué probar).
3. Política: subir `version.txt` en cada entrega; etiqueta git `scope-<versión>` sobre el commit entregado.
4. Prueba en `smoke.js`: la versión del pie coincide con `src/version.txt`.
**Hecho cuando:** pie y PDF muestran la versión; `CHANGELOG.md` tiene la entrada actual; existe la etiqueta.

### T4 · Fallos pequeños conocidos — prioridad media
1. **Etiquetas de amplitud que se pisan** («Dif 4 V V V» con dos reglas de amplitud a la vez, visto en las
   capturas de noviembre). Verificar si sigue; si sí, separar etiquetas que solapen (desplazar en vertical).
   Prueba: dos canales con reglas de amplitud a la misma altura → las cajas de texto no se solapan.
2. **Regla de PMI propia** (README §6, punto 4): hoy el PMI se toma a ±180° del PMS. Añadir regla PMI opcional
   (por defecto ligada a PMS ± 180°, arrastrable), usada por AAE y RCA en `distCalc`. Con su prueba.
**Hecho cuando:** cada punto con su prueba en verde.

### T5 · Casos reales como pruebas de regresión — prioridad alta, depende de Ortu
**Por qué:** lo validado en taller es lo que da confianza; si queda como prueba, ningún cambio lo puede romper.
**Qué:**
1. Carpeta `analyzer-scope/tests/reales/` con un CSV por caso + `casos.json`:
   `{ "archivo": "...", "descripcion": "VW TDI · admisión + inyector 1", "esperado": { "rpm": [640, 700], "cilindro_debil": 4, "entidad": "transductor admisión" } }`.
2. Sección nueva en `smoke.js` que recorre `casos.json`, carga cada CSV, sincroniza y comprueba lo esperado
   (rpm, cilindro más débil del diagnóstico local, niveles CAN, rpm de un CKP…).
3. Los casos confirmados por Ortu se añaden también a `src/ejemplos/` (con nombre descriptivo).
4. Limpieza obligatoria: quitar la línea `Author:` y cualquier nombre; nombre de archivo sin matrícula.
**Casos pedidos a Ortu:** VW TDI (cilindro 4, válvula de escape) con inyector 1; MAF digital + transductor de
admisión a la vez (para ajustar la plantilla «Frecuencia»); CAN-H/CAN-L; CKP 60-2; admisión/escape/cárter con
la misma referencia del cilindro 1 (superposición).
**Hecho cuando:** al menos 3 casos reales en `casos.json` en verde.

### T6 · Integración en el portal (la lleva la sesión del portal) — seguimiento
Checklist de `docs/API_DIAGNOSTICO.md` §8: `apiDiagnostico` responde el contrato v1; la página del portal sirve
`dist/analyzer-scope-portal.html`; **tamaño** (~1,3 MB) aceptado por Apps Script; **descargas** PDF/CSV/GIF desde
el iframe de HtmlService/Sites. Anotar aquí el resultado de cada punto (fecha, OK/falla, qué se hizo).

---------------------------------------------------------------------------------------------------

## Fuera de alcance (no empezar sin pedirlo)
Puente USB de osciloscopios, más de 8 canales en la superposición, el libro PDF de 400 páginas como fuente
(derechos de autor), cuantización adaptativa del GIF.

## Al cerrar cada tarea
Actualizar la tabla «Estado de partida» de este archivo, `README.md` si cambia la arquitectura, y avisar con
`OK` + checklist (probar / revisar / pusheado) como pide `CLAUDE.md`.
