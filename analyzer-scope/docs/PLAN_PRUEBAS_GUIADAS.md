# Plan · Pruebas guiadas (PicoScope → informe combinado)

Objetivo: que la app **guíe** la toma de capturas con PicoScope (qué canales, qué sondas, qué ajustes, qué maniobras)
y luego **junte varios CSV** en un solo informe que localice la anomalía por cilindro y por sistema.
Inspiración: los scripts de Autoscope (Px, CSS, El Power) del curso de referencia; aquí se emula el *método*, no el software.

---------------------------------------------------------------------------------------------------

## 1. Conceptos

| Concepto | Qué es |
|---|---|
| **Protocolo** | Receta de diagnóstico (p. ej. «Motor gasolina · mecánica completa»). Lista ordenada de pasos. JSON, mismo modelo que los paquetes de reglas (base en git + propios del usuario). |
| **Paso** | Una captura = un CSV. Define canales, sondas, ajustes de PicoScope y maniobras. |
| **Fase** | Tramo dentro de un paso: `ralenti`, `acel_suave`, `acel_brusca`, `parada`, `arranque`. La app las detecta sola. |
| **Sesión** | Un protocolo aplicado a un vehículo: los CSV cargados, sus resultados y el informe. Se guarda/abre como archivo. |

## 2. Protocolo inicial (el del profesor)

| Paso | Canales | Maniobra |
|---|---|---|
| P1 Compresión relativa | Pinza amperimétrica (motor de arranque) + sincronismo cil. 1 (bobina o inyector) | Arranque sin que arranque (inyección cortada), 5–8 s |
| P2 Admisión + cárter | Bobina cil. 1 · Inyector cil. 1 · Transductor admisión · Transductor cárter | Ralentí → acel. suave → acel. brusca → parar motor sin cortar la grabación |
| P3 Escape | Bobina cil. 1 · Inyector cil. 1 · Transductor escape | Ralentí → acel. suave → acel. brusca → parar motor sin cortar la grabación |

Bobina + inyector del cil. 1 en P2 y P3 = **referencia de fase común**: permite colocar 0–720° y atribuir cada pulso a su cilindro
en todos los pasos (lo mismo que hace la pestaña de distribución hoy).
El tramo **parada** sirve de cero de referencia del transductor (presión atmosférica) y para ver la caída de giro.

## 3. Formato del protocolo (`analyzer-scope-protocolo/1`)

```json
{ "formato": "analyzer-scope-protocolo/1", "id": "GAS-MEC-01", "nombre": "Gasolina · mecánica completa",
  "combustible": ["gasolina"], "objetivo": "Localizar fallo mecánico por cilindro (compresión, válvulas, segmentos, escape)",
  "pasos": [
    { "id": "P2", "titulo": "Admisión + cárter",
      "canales": [ { "canal": "A", "entidad": "encendido", "sonda": "pinza de inducción / secundario", "rango": "±20 V" },
                   { "canal": "B", "entidad": "inyector",  "sonda": "punta atenuada 10:1",           "rango": "±50 V" },
                   { "canal": "C", "entidad": "transductor admisión", "rango": "±2 V" },
                   { "canal": "D", "entidad": "transductor cárter",   "rango": "±1 V" } ],
      "picoscope": { "duracion_s": 20, "muestreo_kS": 50, "disparo": "ninguno", "exportar": "CSV, búfer actual" },
      "fases": ["ralenti", "acel_suave", "acel_brusca", "parada"],
      "instrucciones": "# Antes\n- Motor a temperatura\n# Durante\n- 5 s ralentí\n- ...",
      "requisitos": { "min_s": 12, "min_kS": 20 } } ] }
```
* `entidad` usa los mismos nombres que `DX_ENT` (`16-diagnostico.js`): el canal queda identificado por el **slot**, no por el nombre del CSV.
* `requisitos`: la app rechaza o avisa al cargar (duración corta, muestreo insuficiente, faltan canales, no se ve la parada).

## 4. Flujo en la app (vista nueva «Prueba guiada»)

1. **Elegir** protocolo (o síntoma → protocolo sugerido). Ficha del vehículo (reutiliza `19-ficha.js`).
2. **Checklist de pasos**: cada paso muestra conexión de canales, ajustes de PicoScope, maniobras y un hueco «Cargar CSV».
3. **Validación al cargar**: canales, muestreo, duración y fases detectadas → ✓ / ⚠ con motivo («no se detecta aceleración brusca»).
4. **Análisis por paso y fase** con los motores que ya existen (compresión relativa, distribución, `dxCyl`, mediciones).
5. **Informe combinado** (pantalla + PDF): matriz cilindro × prueba, hallazgos cruzados, etiquetas Medido / Inferido.
6. **Guardar sesión** (JSON con resultados + nombres de los CSV; los CSV no se incrustan salvo que se pida).

## 5. Detección de fases (núcleo nuevo)

* Curva de RPM a lo largo de la captura a partir de bobina o inyector (`trigEvents`).
* `ralenti`: RPM estable (variación < ~5 %) durante ≥ 2 s · `acel_suave`: subida lenta · `acel_brusca`: dRPM/dt sobre umbral ·
  `parada`: sin disparos y RPM → 0. Umbrales en el protocolo, no en el código.
* Corrección manual: barra de fases sobre la gráfica, arrastrable.

## 6. Medidas nuevas (catálogo `API_DIAGNOSTICO.md` §4.2)

| Señal | Medida | Uso |
|---|---|---|
| Transductor admisión | profundidad de pulso por cilindro, vacío medio por fase, respuesta en acel. brusca | válvula de admisión, entrada de aire falso, mariposa |
| Transductor escape | pulso por cilindro, presión media en acel. brusca, retorno en parada | válvula de escape, catalizador tapado |
| Transductor cárter | pulso sincronizado con un cilindro, presión media | segmentos / blow-by |
| Compresión relativa | ya existe (`comp_rel_pct`) | compresión |
| Todas | `fase` como parte del contexto | misma medida, valor distinto por fase |

## 7. Reglas cruzadas

Se amplía el formato de reglas (`REGLAS.md`) con referencias a otro paso y fase:
`"medida": "P2.adm.pulso_cil@ralenti"`. Ejemplos (Inferido, hasta validar en taller):

* Compresión baja cil. N + pulso de admisión anómalo cil. N → **válvula de admisión** cil. N.
* Compresión baja cil. N + pulso de escape anómalo cil. N → **válvula de escape** cil. N.
* Compresión baja cil. N + admisión/escape normales + pulso de cárter en fase con N → **segmentos** cil. N.
* Presión de escape que sube en acel. brusca y tarda en volver en parada → **restricción de escape / catalizador**.

Cada hallazgo dice qué pasos lo sostienen; si falta un paso, el informe lo marca como «sin confirmar».

## 8. Fases de trabajo

| Fase | Entrega | Depende de |
|---|---|---|
| F1 | Formato de protocolo + protocolo inicial + vista guiada con checklist, carga y validación de CSV | — |
| F2 | Detección de fases + medidas existentes por fase | F1 |
| F3 | Medidas nuevas de admisión / escape / cárter | F2 + capturas reales |
| F4 | Reglas cruzadas + informe combinado (PDF) + guardar/abrir sesión | F3 |
| F5 | Validación con capturas de taller; protocolos para diésel (CSS diésel) y batería/arranque (El Power) | Ortu |

## 9. Riesgos

* **Tamaño del CSV de PicoScope**: 20 s × 4 canales a 50 kS/s ≈ 4 M valores (decenas de MB). Recomendar muestreo en el protocolo y
  validar rendimiento del parser con un CSV real antes de F2.
* Formato de exportación distinto entre PicoScope 6 y 7 (cabeceras, unidades, varios búferes): probar ambos en `tests/data/`.
* Los umbrales de admisión/escape/cárter no están en las fuentes con transductor de pulso: quedan `borrador` hasta validar.
