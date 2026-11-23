# Crear una skill a partir de documentos (instrucciones para una sesión)

Entrada: documentos que pasa el usuario (PDF, transcripciones `.md`, apuntes, fichas de fabricante, capturas CSV).
Salida: un paquete JSON en `catalogo/skills/` (o la mejora de uno existente), probado, en `main`.

## 0. Reglas fijas
* Primer comando: `git fetch --all --prune && git status -sb`. Trabajar sobre `main`.
* Los documentos de entrada **nunca a git** (ni PDF ni transcripciones). Solo el JSON y los cambios de código y docs.
* Sin keys, tokens, IPs ni datos de alumnado, clientes o personas. En `fuente`: título del documento o «Vídeo de diagnóstico de …», nunca nombres de canales ni de personas (salvo el autor del paquete).
* Respuesta final al usuario: español, corta, `OK` + checklist (probar / revisar / pusheado sí-no).

## 1. Leer antes de escribir
1. `docs/REGLAS.md`: formato `analyzer-scope-reglas/1` y tabla de medidas.
2. `src/js/35-medidas.js` → `MEDIDAS`: **los únicos ids de medida válidos**.
3. `catalogo/skills/fran-can.json`: modelo de paquete completo (reglas, comprobaciones detalladas, notas).
4. `catalogo/skills/*.json`: ¿ya hay un paquete del mismo `tema`? Si lo hay, **mejorarlo** (subir `version`) en vez de crear otro.
5. Los documentos del usuario. Si son largos, limpiar primero a un fichero en el scratchpad y leer por secciones.

## 2. Clasificar cada dato
| Dato del documento | Destino |
|---|---|
| Criterio medible con una medida que **ya existe** (umbral, rango, «si X entonces…») | **Regla** |
| Criterio medible con una medida que **no existe** | **No inventar el id**. Va a «Medidas pendientes» en el informe final (y como texto en una nota) |
| Valores de referencia, procedimientos, orden de diagnóstico, cómo medir | **Nota** (`notas`, con `valores` si hay números) |
| Casos reales (síntoma → causa encontrada) | `causas` y `comprobaciones` de la regla que corresponda |
| Teoría general sin criterio | Fuera (o una línea en una nota) |

Etiquetas: `Medido` (lo da la captura), `Teórico OEM` (dato de fabricante o norma), `Inferido` (deducción, casos de vídeo).
Un valor que sale de un caso grabado y no de fabricante se dice en el texto («dato de un caso, no de fabricante»).

## 3. Escribir las reglas
* `id`: prefijo del paquete + número (`FR-CAN-23`). No reutilizar ids.
* `tema`: el mismo que el procedimiento que lo usa (`red-can`, `aporte-cilindro`…). Si es nuevo, decir qué procedimiento debería declararlo en `skills`.
* `sintoma`: con `{valor}`, `{cil}`, `{unidad}`, `{pct}`, `{canal}`; números con coma decimal.
* `si`: evitar falsos positivos. Añadir una 2.ª condición de contexto si la 1.ª sola puede saltar en una señal sana. La 1.ª condición es la que localiza en la señal («Ver en la señal»).
* `confianza`: `alta` solo si el criterio es de fabricante o norma y la medida es directa; `baja` para casos de vídeo o umbrales dudosos.
* `comprobaciones`: siempre con `donde`, `estado`, `herramienta`, `esperado`, `si_bien`, `si_mal`; `pasos` si hay más de una acción. Que un técnico sin experiencia lo pueda hacer.
* `estado`: **siempre `borrador`**. Solo el usuario lo pasa a `validada`.
* No contradecir reglas existentes del mismo `tema` sin decirlo en el informe final.

## 4. Paquete
Fichero `catalogo/skills/<autor>-<tema>.json` con `formato`, `paquete` (= nombre del fichero), `nombre`, `autor`, `version` (`AAAA.MM.DD`), `aviso` (límites: qué no cubre), `acceso` (`libre` o `vip`), `reglas`, `notas`.

## 5. Probar
1. `node build.js` (regenera `catalogo/indice.json`, `dist/` y `apps-script-scope/App.html`) y `node build.js --check`.
2. Con Playwright sobre `dist/analyzer-scope.html`: `rgValida(CATALOGO.items['skill:<paquete>'])` debe dar `[]`; evaluar cada regla nueva con medidas sintéticas: `mdSkills([{id,valor,unidad}])` → salta cuando debe y **no** salta con valores sanos (y con las demos `canDemo()` / `ckpDemo()` si aplica).
3. Añadir una prueba en `tests/smoke.js` con esos casos. `cd tests && timeout 900 env NODE_PATH=$(npm root -g) npm test`: todo en verde.

## 6. Entregar
1. Subir `src/version.txt`, entrada en `CHANGELOG.md`; actualizar `docs/REGLAS.md` si cambian medidas.
2. Commit + push a `main` (reintentar si se corta la red).
3. Informe al usuario: reglas y notas añadidas (número), **medidas pendientes** (qué habría que programar en el motor), dudas o contradicciones entre documentos. Sin más.

## Prompt para la otra sesión
> Lee `analyzer-scope/docs/CREAR_SKILL.md` y síguelo. Crea (o mejora) una skill a partir de los documentos que te adjunto. Tema: ______.
