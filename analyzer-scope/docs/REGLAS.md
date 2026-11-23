# Fuente de conocimiento · paquetes de reglas (skills)

Un **paquete es un skill**: **reglas** (lo que detecta) + **notas** (lo que sabe: explicación, valores de referencia,
procedimiento para confirmar o reparar). Cada hallazgo enseña las notas de su paquete enlazadas (botón 📖), que salen también en el PDF.

El diagnóstico local de Analyzer Scope (las dos versiones) no lleva criterios escritos en el código: los lee de **paquetes de reglas**.

| Paquete | Dónde vive | Quién lo cambia |
|---|---|---|
| **Base** (p. ej. `ortu`) | `src/reglas/*.json`, se incrusta al construir | El responsable del paquete, por git. En la app es de solo lectura. |
| **Del usuario** («Mis reglas» y los importados) | En el navegador (`localStorage` `as_paqs`) | El usuario, con el editor o importando un `.json`. Se exporta para copia o para compartir. |

En la pestaña **Diagnóstico → Fuente de conocimiento** cada paquete se activa o se desactiva (`as_paqon`). El resultado y el PDF dicen qué fuentes estaban activas.

**Discrepancias.** Las reglas de paquetes distintos no se pisan. Si tienen el mismo `tema`, cada hallazgo de ese tema enseña los criterios de todas las fuentes activas y si cada uno se cumple (✓/✗). Si alguno no se cumple, el hallazgo se marca «Discrepancia entre fuentes».

## Plantilla de hoja de cálculo (lo normal para el usuario)
«Diagnóstico → Descargar plantilla (Excel)» baja `plantilla_reglas_analyzer_scope.csv` (separador `;`, UTF-8 con BOM: Excel la abre bien). Fila 1: columnas; fila 2: ayuda de cada columna (se ignora al subir); debajo, ejemplos.

Columnas: `id; tema; sintoma; senal; combustible; medida; operador; valor; por_cilindro; confianza; estado; causas; etiqueta_causas; comprobaciones; fuente`.
* Una fila = una regla. Otra condición de la misma regla = otra fila con el mismo `id` y solo `medida`, `operador`, `valor`, `por_cilindro`.
* `valor` con `entre`/`fuera`: `a|b`. `por_cilindro`: `si`.
* `causas` y `comprobaciones`: separadas por `|`. Causa: «texto — cómo separarla». Comprobación: «texto → valor esperado».
* «Subir reglas (Excel/CSV o JSON)…»: un CSV entra en «Mis reglas» (sustituye las reglas con el mismo `id`); un JSON entra como paquete aparte. «Exportar mis reglas (Excel)» da el CSV con el mismo formato.

## Portal
En la versión del portal hay una fuente más, **Notas maestras (portal)**: las reglas de `notas-tecnicas/reglas/<clave de la maestra>.yml` del repo del portal, que evalúa el servidor. La app junta sus hallazgos con los de los paquetes activos y compara por `tema` (el servidor manda `criterios_nt`). «Mis reglas» se guardan además en la cuenta del usuario (`reglas_leer` / `reglas_guardar`, `API_DIAGNOSTICO.md` §12).

## Formato (`analyzer-scope-reglas/1`)
Es el mismo esquema que las reglas del portal (`API_DIAGNOSTICO.md` §5), en JSON, con `tema`, `fuente` y `estado`.
```json
{ "formato": "analyzer-scope-reglas/1", "paquete": "propio", "nombre": "Mis reglas", "autor": "", "version": "",
  "aviso": "Texto opcional que acompaña a sus hallazgos",
  "reglas": [
    { "id": "FR-COMP-01", "tema": "compresion-relativa",
      "sintoma": "El cilindro {cil} está por debajo del 85 % ({valor} %)",
      "contexto": { "entidad": ["transductor admisión"], "combustible": ["diesel"], "cilindros": [4] },
      "si": [ { "medida": "comp_rel_pct", "op": "<", "valor": 85, "por_cilindro": true } ],
      "confianza": "media", "etiqueta": "Medido",
      "causas": [ { "texto": "Segmentos", "etiqueta": "Inferido", "separar": "Prueba de aceite en el cilindro {cil}" } ],
      "comprobaciones": [ { "texto": "Prueba de fugas en el cilindro {cil}", "tipo": "prueba", "esperado": "< 20 %" } ],
      "fuente": "Curso de diagnosis 2026", "estado": "borrador" } ] }
```
* `si`: todas las condiciones se cumplen (Y). `medida` = id del catálogo (`API_DIAGNOSTICO.md` §4.2, más `comp_rel_pct`: compresión relativa en % del mejor, por cilindro).
* `op`: `<` `<=` `>` `>=` (número), `entre` `fuera` (`[a, b]`), `peor` (el cilindro con el valor más bajo; `valor` opcional = solo si queda por debajo de ese % del mejor).
* `por_cilindro: true`: cada cilindro que cumple da un hallazgo.
* `contexto` (opcional): solo se evalúa si coincide la entidad de la señal, el combustible o el número de cilindros.
* Textos: `{cil}`, `{valor}`, `{pct}` (% del mejor) y `{canal}` se sustituyen.
* `tema`: los criterios que tratan lo mismo llevan el mismo tema, así se comparan entre fuentes.
* `notas` (en la regla, opcional): ids de notas del paquete. Sin ellas, la regla se enlaza sola con las notas de su mismo `tema`.
* **Notas del paquete** (`"notas": [...]` junto a `"reglas"`): `{ "id": "N-01", "titulo": "...", "tema": "...", "texto": "# títulos y - listas",
  "valores": [{ "magnitud": "...", "valor": 0 | "min": 0, "max": 0, "unidad": "...", "condicion": "..." }], "fuente": "..." }`.
  Plantilla aparte en hoja de cálculo (`plantilla_notas_analyzer_scope.csv`, columnas `id; titulo; tema; texto; valores; fuente`;
  valores separados por `|` como «magnitud: 25–32 bar (condición)»). Se sube con el mismo botón.
* `estado`: `validada` o `borrador` (sale marcada «BORRADOR» en pantalla y en el PDF).

## Editor («Diagnóstico → Editar mis reglas…»)
Crea, edita, duplica y borra reglas de los paquetes propios, y crea o exporta paquetes. «Copiar una regla de la base» la trae en borrador con el mismo `tema`: cambias el umbral y la fuente, y el diagnóstico enseña los dos criterios. «Probar con la señal actual» evalúa la regla con lo que hay cargado.

Una regla mal escrita no se evalúa. Un paquete importado mal escrito se rechaza y la app dice por qué.

## Medidas de los procedimientos (catálogo `MEDIDAS`, `src/js/35-medidas.js`)
| id | qué es | unidad | por |
|---|---|---|---|
| `ckp_aporte_est_pct` / `_acel_pct` / `_sin_pct` | Aporte de cada cilindro en % del mejor (estable / aceleración / sin combustión) | % | cilindro |
| `ckp_dientes`, `ckp_vueltas_mal` | Posiciones de la rueda fónica; vueltas mal contadas | — | — |
| `can_tramas`, `can_h_med`, `can_l_med`, `can_hl_dif_med` | Tramas leídas; niveles típicos de H, L y |H−L| | V | — |
| `can_rec_h`, `can_rec_l`, `can_dom_h`, `can_dom_l`, `can_dif` | Niveles recesivo y dominante; diferencial de la red | V | — |
| `can_ov_pct`, `can_crc_mal`, `can_err_tramas` | Sobreoscilación; CRC mal; tramas de error | %, — | — |
| `can_dif_unidad`, `can_desv_unidad_pct`, `can_ov_unidad_pct`, `can_crc_unidad` | Lo mismo por unidad (ID) | V, % | unidad (`{unidad}` = ID en hex) |
Skills base que las usan: `fran-ckp.json`, `fran-can.json`.
