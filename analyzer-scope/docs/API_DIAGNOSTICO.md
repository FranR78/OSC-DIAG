# API de diagnóstico · contrato v1 (Analyzer Scope ⇄ portal)

Ruta nueva en el proyecto Apps Script del portal: `doGet` con `?api=diagnostico`.
Fuente: `notas.json` (ya compilado). Este documento fija **solo** la forma de entrada/salida.
Lo programa la sesión del repo del portal (`portal/`); Analyzer Scope lo consume.

---------------------------------------------------------------------------------------------------

## 0. Transporte y autenticación

Un mismo objeto `peticion` → un mismo objeto `respuesta`, por dos vías:

| Vía | Cuándo | Cómo | Quién pregunta |
|---|---|---|---|
| **A · Dentro del portal** (recomendada) | La app servida/incrustada por la web app | `google.script.run.withSuccessHandler(f).apiDiagnostico(peticion)` | Sesión Google (`Session.getActiveUser()`) |
| **B · App suelta** | Archivo local, tablet, otro alojamiento | `GET ?api=diagnostico&q=<JSON url-encoded>&token=<token>` | Token personal (Propiedades del script, con caducidad) |

* Vía B: `q` ≤ 1,5 KB (la petición de diagnóstico va resumida, ver §3). Respuesta `ContentService` JSON.
  La lectura cross-origin de `script.google.com` desde otra web está **por verificar** (Inferido: los GET sin credenciales suelen funcionar). Si falla, la vía B queda para más adelante; la A no depende de ello.
* La página de prueba en claude.ai **no** podrá llamar al puente (CSP). La integración se prueba desde el portal.
* La app **nunca** envía datos de cliente: solo medidas, contexto técnico y texto de síntoma.

## 1. Comunes

Petición (todas):
```json
{ "v": 1, "op": "buscar | nt | diagnostico", "lang": "es",
  "cliente": { "app": "analyzer-scope", "ver": "2026.11" } }
```
Respuesta correcta: `{ "ok": true, "v": 1, "op": "<op>", ... }`
Respuesta con error:
```json
{ "ok": false, "v": 1, "op": "<op>",
  "error": { "codigo": "no_autenticado | no_autorizado | peticion_invalida | no_encontrado | cuota | interno",
             "mensaje": "texto para el usuario" } }
```
Reglas: campos desconocidos se ignoran (compatibilidad hacia delante); un cambio incompatible sube `v`.
`lang`: las NT están en español; `en` queda reservado (la app traduce solo su interfaz).

**Fuentes privadas**: en cualquier respuesta se publican como `"Material del curso · PRV-XXXX"`, sin nombre ni enlace (igual que en el portal).

---------------------------------------------------------------------------------------------------

## 2. `buscar`

Petición:
```json
{ "v": 1, "op": "buscar",
  "texto": "inyector bomba inyector corriente",
  "filtros": { "tipo": ["componente", "diagnostico"], "entidad": "inyector", "sistema": "diésel",
               "unidad": null, "solo_osciloscopio": true, "con_reglas": false },
  "limite": 10, "pagina": 1 }
```
Todos opcionales salvo `op` (sin `texto` ni filtros → error `peticion_invalida`). `limite` 1–50 (por defecto 10).

Respuesta:
```json
{ "ok": true, "v": 1, "op": "buscar", "total": 23, "pagina": 1,
  "resultados": [
    { "id": "INY-PD-001", "titulo": "Inyector bomba-inyector · corriente",
      "tipo": "componente", "entidad": "inyector", "sistema": "diésel", "unidad": "UT-3",
      "resumen": "≤ 300 caracteres",
      "palabras_clave": ["PD", "corriente", "BIP"],
      "osciloscopio": true, "tiene_reglas": true, "videos": 2,
      "url_portal": "<enlace a la NT dentro del portal>", "puntuacion": 0.87 } ] }
```
Orden por `puntuacion` (búsqueda por texto + coincidencia de filtros; el algoritmo es del portal).

---------------------------------------------------------------------------------------------------

## 3. `nt` (ver una NT)

Petición:
```json
{ "v": 1, "op": "nt", "id": "INY-PD-001",
  "secciones": ["resumen", "valores", "sintomas", "procedimiento", "fuentes", "videos", "relacionados"],
  "formato": "md" }
```
`secciones` opcional (por defecto todas). `formato`: `md` (por defecto) o `html` (saneado, sin scripts).

Respuesta:
```json
{ "ok": true, "v": 1, "op": "nt",
  "nt": {
    "id": "INY-PD-001", "titulo": "...", "tipo": "componente", "entidad": "inyector", "sistema": "diésel",
    "unidad": "UT-3", "cursos": ["EMV2"], "palabras_clave": ["..."],
    "resumen": "...",
    "cuerpo": "Markdown o HTML de las secciones pedidas",
    "valores_referencia": [
      { "magnitud": "corriente de pico", "min": 18, "max": 22, "unidad": "A",
        "condicion": "ralentí, motor caliente", "etiqueta": "Teórico OEM", "fuente": "Material del curso · PRV-0123", "pagina": 45 } ],
    "fuentes": [ { "texto": "Material del curso · PRV-0123", "pagina": 45, "publica": false } ],
    "videos": [ { "titulo": "...", "url": "...", "inicio_s": 0 } ],
    "relacionados": [ { "id": "INY-PD-002", "titulo": "..." } ],
    "url_portal": "...", "actualizado": "2026-11-08" } }
```
`valores_referencia[].etiqueta` ∈ `Medido | Teórico OEM | Inferido` (como en el YAML). `valor` puede ir en lugar de `min`/`max`.
`videos` sale de `Osciloscopio/videos/indice.json` por `entidad`.

---------------------------------------------------------------------------------------------------

## 4. `diagnostico`

### 4.1 Petición (la arma la app con lo que mide)
```json
{ "v": 1, "op": "diagnostico",
  "contexto": {
    "motor": { "combustible": "diesel", "cilindros": 4, "orden": [1, 3, 4, 2], "codigo": "BKC" },
    "senales": [
      { "canal": "CH1", "parametro": "Presión admisión", "entidad": "transductor admisión", "unidad": "V" },
      { "canal": "CH2", "parametro": "Inyector 1", "entidad": "inyector", "unidad": "V", "referencia_cil1": true } ] },
  "medidas": [
    { "id": "rpm", "valor": 668, "unidad": "rpm" },
    { "id": "desv_pulso_cil", "canal": "CH1", "unidad": "%",
      "por_cilindro": { "1": 2.1, "2": -1.0, "3": 0.5, "4": -14.2 } } ],
  "sintoma_texto": "ralentí irregular",
  "limite": 5 }
```
* Todas las medidas de la app son **Medido** (no hace falta enviar la etiqueta).
* `entidad` de cada señal: la app la deduce de «Parámetro medido» y de la plantilla; puede ir vacía.
* `motor.codigo` y `sintoma_texto` son opcionales.

### 4.2 Catálogo de medidas (ids compartidos app ⇄ reglas)
| id | Unidad | Qué es |
|---|---|---|
| `rpm` | rpm | Régimen (ciclo de 720° o canal matemático RPM) |
| `frecuencia` | Hz | Frecuencia media del canal |
| `ciclo_util` | % | Ciclo útil medio |
| `pico_pico`, `maximo`, `minimo`, `media` | unidad del canal | Valores del canal en la vista |
| `desv_pulso_cil` | % | (pulso pico a pico del cilindro − media) / media de los pulsos × 100 (por_cilindro) |
| `desv_pico_cil` | % | (pico del cilindro − media de los picos) / media de los pulsos × 100 (por_cilindro). Base = pulso medio, para que no se dispare si los picos rondan 0 |
| `duracion_t1t2` | ms | Intervalo T1–T2 (p. ej. duración de inyección) |
| `avance` | ° | A.Enc / A.Iny respecto al PMS (`k`: `enc`/`iny`) |
| `aaa`, `rce`, `aae`, `rca`, `cruce` | ° | Distribución |
| `can_dominante`, `can_recesivo` | V | Mediana del diferencial CAN |
| `can_fuera_pct` | % | Muestras fuera de rango (dominante 1,5–3 V; recesivo −0,5–0,05 V) |

Ventana de cada cilindro: ±(360°/n) alrededor de su PMS de compresión según la identificación de cilindros de la app, más el «Desfase» elegido en la pestaña (p. ej. un transductor de admisión ve el pulso del cilindro antes de su compresión). Se promedian todos los ciclos completos de la vista.

Ampliar el catálogo = añadir una fila aquí (y el cálculo en la app). Una regla con una medida desconocida simplemente no se evalúa.

### 4.3 Respuesta
```json
{ "ok": true, "v": 1, "op": "diagnostico",
  "hallazgos": [
    { "regla": "ADM-TRANS-R01", "nt_id": "ADM-TRANS-001", "nt_titulo": "Transductor en admisión · pulsos por cilindro",
      "sintoma": "Un pulso de depresión menor que el resto",
      "evidencia": [ { "medida": "desv_pulso_cil", "canal": "CH1", "cilindro": 4, "valor": -14.2, "condicion": "< -10 %", "etiqueta": "Medido" } ],
      "confianza": "media",
      "causas": [
        { "texto": "Válvula de escape que no cierra", "etiqueta": "Inferido", "como_separar": "Prueba de fugas: el aire sale por el escape" },
        { "texto": "Leva de admisión gastada", "etiqueta": "Teórico OEM", "como_separar": "Medir la alzada de la leva" } ],
      "comprobaciones": [
        { "orden": 1, "texto": "Compresión relativa (pinza en el motor de arranque)", "tipo": "medida", "esperado": "cilindros dentro de ±5 %", "nt_id": "COMP-REL-001" },
        { "orden": 2, "texto": "Prueba de fugas en el cilindro 4", "tipo": "prueba" } ],
      "valores_referencia": [ ],
      "url_portal": "..." } ],
  "relacionadas": [ { "id": "ESC-TRANS-001", "titulo": "...", "url_portal": "..." } ],
  "sin_reglas": false,
  "aviso": "Posibles causas: confírmalas con las comprobaciones antes de sustituir piezas." }
```
* `hallazgos` ordenados por `confianza` (alta > media > baja) y por cuánto se supera el umbral.
* En las reglas por cilindro, `{cil}` en el texto se sustituye por el número (ej. «Prueba de fugas en el cilindro {cil}»).
* Si ninguna regla se cumple: `hallazgos: []`, `sin_reglas: true` si la entidad no tiene reglas todavía, y `relacionadas` con las NT de esa entidad (búsqueda como en §2).
* `aviso` siempre presente: la app lo muestra y lo copia al PDF.

---------------------------------------------------------------------------------------------------

## 5. Campo `reglas` en el YAML de las maestras de osciloscopio

```yaml
reglas:
  - id: ADM-TRANS-R01
    sintoma: Un pulso de depresión menor que el resto
    contexto:                 # opcional: solo se evalúa si coincide
      entidad: transductor admisión
      combustible: [diesel, gasolina]
    si:                       # todas se cumplen (Y)
      - medida: desv_pulso_cil
        op: "<"               # <  <=  >  >=  entre  fuera
        valor: -10            # «entre»/«fuera»: valor: [a, b]
        por_cilindro: true    # evalúa cada cilindro; cada uno que cumpla = un hallazgo
    confianza: media          # alta | media | baja
    causas:
      - texto: Válvula de escape que no cierra
        etiqueta: Inferido
        separar: "Prueba de fugas: el aire sale por el escape"
    comprobaciones:
      - texto: Compresión relativa (pinza en el motor de arranque)
        tipo: medida
        esperado: cilindros dentro de ±5 %
        nt: COMP-REL-001
      - texto: Prueba de fugas en el cilindro {cil}
        tipo: prueba
```
El workflow que compila `notas.json` copia `reglas` tal cual (validando: `id` único, `medida` del catálogo §4.2, `op` válido).

## 6. Notas para la implementación (portal)
* Caché: `CacheService` admite ~100 KB por clave (Teórico): guardar un **índice ligero** (id, título, tipo, entidad, sistema, palabras clave, resumen, reglas) troceado, y leer el cuerpo completo de `notas.json` solo en `op: "nt"`.
* Control de acceso antes de leer nada; registro mínimo (usuario/token, op, fecha) sin el contenido de las medidas.
* Límites: `limite` ≤ 50; `q` ≤ 1,5 KB; respuesta de `diagnostico` ≤ 50 KB.

## 7. Pruebas de aceptación (las mismas en portal y app)
1. `buscar` con `entidad: "inyector"`, `solo_osciloscopio: true` → solo NT de osciloscopio de inyector.
2. `nt` de una NT con fuente privada → aparece «Material del curso · PRV-XXXX», sin nombre ni enlace.
3. `diagnostico` con el ejemplo de §4.1 → hallazgo `ADM-TRANS-R01` en el **cilindro 4**, con «{cil}» sustituido.
4. Sin sesión ni token → `no_autenticado`; token caducado → `no_autorizado`.
5. Medida desconocida en la petición → se ignora, sin error.

---------------------------------------------------------------------------------------------------

## 8. Integración de la versión portal (para la sesión del portal)

* Archivo: `analyzer-scope/dist/analyzer-scope-portal.html` (lo genera `node build.js`; no editar a mano). Copiarlo al proyecto Apps Script como página HTML (p. ej. `analyzer-scope.html`).
* Servirlo: `HtmlService.createHtmlOutputFromFile('analyzer-scope').setTitle('Analyzer Scope').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)` desde la ruta que elija el portal (p. ej. `?pagina=scope`).
* Función de servidor que llama la app (vía A): `function apiDiagnostico(peticion) { … return respuesta; }` — mismo objeto que `?api=diagnostico` (§1–4). Que compruebe la sesión igual que la ruta GET.
* La app usa: `apiDiagnostico` (op `buscar`, `nt`, `diagnostico`). Nada más del servidor.
* **Por verificar en el portal** (Inferido, no probado aquí): tamaño del archivo (~1,1 MB) dentro del proyecto Apps Script; descargas (PDF, CSV, GIF) desde el iframe de HtmlService/Sites.
* Lo que la app ya hace (probado con un `google.script.run` simulado, `tests/smoke.js` §16): arma la petición v1, pinta hallazgos/causas/comprobaciones con casillas, `buscar` → `nt`, y añade la página de diagnóstico al PDF. Todo el contenido del portal se pinta como **texto** (sin HTML ejecutable).
