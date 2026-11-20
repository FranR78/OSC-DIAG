# Scripts de captura (pestaña «Scripts»)

Los scripts se agrupan por **sistema**, para que quien tiene una avería entre por lo que le pasa al coche y no haga pruebas a ciegas:
**Arranque y carga · Integridad mecánica · Equilibrio de cilindros · Encendido · Inyección**. Cada apartado es un script y sus pasos son las pruebas (una captura cada una).

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
    "fuente": "de dónde sale" } ] }
```
* `sintomas`: se ve en la lista y en la cabecera («Cuándo entrar»). `mirar`: sale en la prueba («Qué mirar»).
* `combustible` en un paso: solo sale con ese motor (selector Gasolina / Diésel en la cabecera). `opcional` + `condicion`: prueba marcada «(opcional)», p. ej. «si tienes transductor de presión de cilindro».
* `canal`: A…H (colores de PicoScope). `entidad`: los nombres de `DX_ENT` (`16-diagnostico.js`), para el análisis de fases futuras.
* `maniobra`: fases en orden; `s` = segundos; `rpm` = [al empezar, al acabar] (dibuja el perfil). `tipo`: `reposo`, `contacto`, `arrastre`, `ralenti`, `suave`, `brusca`, `parada`, `corte` (color).
* `requisitos.fs_min`: muestreo mínimo (muestras/s). `criterio`: `grados` (objetivo ≤ 1° de cigüeñal por muestra a `rpm_max`), `diente` (≥ 50 muestras por diente de una rueda 60-2 a `rpm_max`).
* La recomendación de PicoScope sale sola: la base de tiempos más corta con pantalla ≥ maniobra + 10 %, y las muestras justas para `fs_min`.
* Un script mal escrito no se guarda ni se importa: la app dice qué falta.
