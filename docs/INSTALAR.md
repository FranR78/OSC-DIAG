# Instalar OSC-Diag (motor Gemini)

## 1. Drive
1. Crea la carpeta `OSC-Diag` con dos subcarpetas: `Fuentes` y `Casos`.
2. Mete en `Fuentes` los PDF de experto (3-4). Máx. 50 MB por PDF.

## 2. Formulario
Crea un Formulario de Google con estos campos (el script los detecta por el título):

| Título (contiene) | Tipo |
|---|---|
| Vehículo / matrícula | Respuesta corta |
| Motor (código, nº cilindros) | Respuesta corta |
| Canales (color → señal, escala) | Párrafo |
| Condición de prueba (ralentí, arranque, rpm) | Respuesta corta |
| Síntoma / observaciones | Párrafo |
| Capturas | Subida de archivos (solo imágenes, máx. 5) |

Cualquier otro campo se copia también al `caso.md`.

## 3. Script
1. En el formulario: ⋮ → **Editor de secuencias de comandos**.
2. Crea un archivo por cada `.gs` de `apps-script/` y pega su contenido.
3. ⚙️ Configuración del proyecto → marca «Mostrar appsscript.json» y pega `appsscript.json`.
4. ⚙️ → **Propiedades del script**:

| Propiedad | Valor |
|---|---|
| `GEMINI_KEY` | tu key de aistudio.google.com |
| `CARPETA_FUENTES` | ID de la carpeta `Fuentes` |
| `CARPETA_CASOS` | ID de la carpeta `Casos` |
| `MOTOR` | `gemini` (por defecto) o `notebooklm` |
| `MODELO` | opcional, por defecto `gemini-flash-latest` |
| `BORRAR_CAPTURAS` | opcional, `si` (por defecto) o `no` |
| `PLANTILLA_ID` | opcional (ver paso 4) |

El ID es la parte final de la URL de la carpeta: `drive.google.com/drive/folders/<ID>`.

5. Ejecuta `instalar` y acepta los permisos.

## 4. Plantilla
- Ejecuta `crearPlantillaEjemplo` → crea el Doc y guarda `PLANTILLA_ID`.
- Edítalo a tu gusto (logo, colores, tipografía) sin borrar los `{{MARCADORES}}`.
- Marcadores: `TITULO VEHICULO MOTOR FECHA CANALES FUENTES AVISO SINTOMA CAUSAS SEPARAR IMAGENES VALORES VERIFICACION COBERTURA`.

## 5. Probar
Envía una respuesta al formulario. En `Casos/` aparece la carpeta del caso:
- `caso.md`, `respuesta.md`, `informe.md` y el Doc «Informe …».
- La descripción de la carpeta indica el estado: `pendiente`, `hecho`, `revisar` o `error` (con `error.txt`).
- Si hay error por límite de cuota, ejecuta `reintentar`.

## Límites del plan gratuito
Cada página de PDF ≈ 258 tokens. 4 PDF de 200 págs. ≈ 200k tokens por informe →
aprox. 1 informe/min. Si da 429 a menudo, deja en `Fuentes` solo los PDF que tocan.

## Motor NotebookLM (opcional, fase 3)
`MOTOR = notebooklm` → los casos quedan `pendiente` para la extensión.
Implementar → Nueva implementación → Aplicación web. La extensión usa la URL
y el `TOKEN` (Propiedades del script).
