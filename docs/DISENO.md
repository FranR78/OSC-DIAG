# OSC-Diag — diseño

Informe de diagnóstico con osciloscopio a partir de capturas, basado solo en
PDF de experto. Cada usuario lo monta sobre **su propio Drive y su propia key**
(pensado para venderlo).

## Piezas

| Pieza | Corre en | Hace |
|---|---|---|
| Formulario | cuenta del usuario | datos del caso + capturas |
| Apps Script (`apps-script/`) | cuenta del usuario | carpeta del caso, Gemini, Doc, limpieza |
| Plantilla Docs | Drive del usuario | formato del informe |
| Extensión Chrome (fase 3) | navegador | motor NotebookLM opcional |

Todo lo que toca Drive lo hace el script del propio usuario → no hace falta
verificación OAuth de Google para distribuirlo.

## Flujo (motor Gemini, por defecto)

1. Formulario → `alEnviar` crea `Casos/AAAA-MM-DD_HHmm_<vehículo>/` con `caso.md` y las capturas.
2. PDF de `Fuentes` → Files API (se reutilizan 48 h; se resuben si caducan o cambian).
3. Capturas → Files API temporales (`CASO_n_`), se borran al terminar.
4. `generateContent`: PDF + capturas + `caso.md`, con `PROMPT_SISTEMA`.
5. Respuesta en bloques → Doc desde plantilla + `informe.md` (formato biblioteca).
6. Capturas a la papelera. Estado `hecho` o `revisar` (falta algún bloque).

## Flujo (motor NotebookLM, fase 3)

Extensión → `?accion=siguiente` → sube capturas y caso al cuaderno → copia la
respuesta → `POST accion=informe`. Si la respuesta no viene en bloques,
Gemini la maqueta solo con texto (`PROMPT_MAQUETAR`, barato). Mismo Doc.
Riesgo: la web de NotebookLM cambia y no tiene API personal; revisar términos
de Google antes de vender esta ruta.

## Contrato de respuesta

Bloques `[[FICHA]] [[TITULO]] [[SINTOMA]] [[CAUSAS]] [[SEPARAR]] [[IMAGENES]]
[[VALORES]] [[VERIFICACION]] [[COBERTURA]]` (definidos en `Prompt.gs`).
Cada bloque rellena el marcador `{{IGUAL}}` de la plantilla.

## Reglas del informe

- Cita «PDF», pág. N en cada afirmación; «No consta en las fuentes» si no hay respaldo.
- Etiquetas [Medido] / [Teórico OEM] / [Inferido].
- Aviso fijo en el Doc: «revisar antes de entregar».

## Fases

1. ✅ Script: formulario → caso → Gemini → Doc → limpieza.
2. Probar con casos reales y ajustar `Prompt.gs`.
3. Extensión Chrome: motor NotebookLM + entrada rápida (popup).
4. Instalador para terceros: copia de formulario + script + plantilla con un clic.
