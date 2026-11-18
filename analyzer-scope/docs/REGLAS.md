# Fuente de conocimiento · paquetes de reglas

El diagnóstico local de Analyzer Scope (las dos versiones) no lleva criterios escritos en el código: los lee de **paquetes de reglas**.

| Paquete | Dónde vive | Quién lo cambia |
|---|---|---|
| **Base** (p. ej. `ortu`) | `src/reglas/*.json`, se incrusta al construir | El responsable del paquete, por git. En la app es de solo lectura. |
| **Del usuario** («Mis reglas» y los importados) | En el navegador (`localStorage` `as_paqs`) | El usuario, con el editor o importando un `.json`. Se exporta para copia o para compartir. |

En la pestaña **Diagnóstico → Fuente de conocimiento** cada paquete se activa o se desactiva (`as_paqon`). El resultado y el PDF dicen qué fuentes estaban activas.

**Discrepancias.** Las reglas de paquetes distintos no se pisan. Si tienen el mismo `tema`, cada hallazgo de ese tema enseña los criterios de todas las fuentes activas y si cada uno se cumple (✓/✗). Si alguno no se cumple, el hallazgo se marca «Discrepancia entre fuentes».

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
* `estado`: `validada` o `borrador` (sale marcada «BORRADOR» en pantalla y en el PDF).

Una regla mal escrita no se evalúa. Un paquete importado mal escrito se rechaza y la app dice por qué.
