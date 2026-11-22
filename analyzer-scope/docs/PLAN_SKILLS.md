# Plan · Código, skills y procedimientos (sin copias por cliente)

Decisión (2026-11-22): todos ejecutan **tu** proyecto. Nadie tiene una copia. El conocimiento se **instala** desde un catálogo
central, como paquetes. El código solo mide.

---------------------------------------------------------------------------------------------------

## 1. Tres capas

| Capa | Qué es | Dónde vive | Quién la cambia | Peso |
|---|---|---|---|---|
| **Motor (código)** | Lee CSV y **mide**: CKP, CAN, compresión, canales matemáticos, comprobador de PicoScope, informe. Publica **medidas con nombre** (`ckp_aporte_pct`, `can_dif_unidad`…). No opina. | Repo (git) → tu implementación | Solo tú (git + pruebas) | Fijo |
| **Skills** | Qué significan las medidas: reglas (medida + umbral → hallazgo, causas, comprobaciones), notas y valores de referencia, con autor, fuente y estado. **Solo datos, nunca código.** | Catálogo central (tu servidor) | Autores; tú verificas | KB por paquete |
| **Procedimientos** (antes «scripts») | Qué capturar: pasos, canales, maniobra, tiempo, muestreo, **análisis** de cada paso y **skills necesarias**. | Catálogo central | Autores; tú verificas | KB por paquete |

Regla: si algo es **un cálculo** → código. Si es **un criterio** (umbral, causa, valor de referencia, texto) → skill.
Cambiar un umbral nunca obliga a tocar código.

## 2. Sin copias: catálogo central + instalación

* La app base arranca **sin conocimiento incrustado** (solo un paquete mínimo de ejemplo para la demo).
* «**Instalar**» baja el paquete del catálogo (ya existe: `paquetes_lista` / `paquete_bajar` en `apps-script-scope`, con permisos por correo) y lo guarda en el navegador para trabajar sin conexión.
* Al abrir, la app compara versiones y ofrece **actualizar**. Un solo origen: corriges una skill y todos la reciben.
* Un procedimiento declara `skills_necesarias`; si falta alguna: «Este procedimiento necesita la skill X → Instalar».
* Acceso por permisos (ya existen: activo, caducidad, paquetes asignados, rol). Las VIP solo se sirven a quien tenga acceso.

## 3. Conocimiento propio de cada usuario

Sí puede trabajar con su fuente, sin tocar tu proyecto:

| Nivel | Quién la ve | Cómo sale en el informe |
|---|---|---|
| **Privada** («Mis skills») | Solo él (guardada en su cuenta del servidor, `ScopeReglas`) | «Fuente propia · no verificada» |
| **Enviada para verificar** | Tú | — (cola `pendientes/`, como la biblioteca de señales) |
| **Publicada** | Quien tenga permiso | Autor + fuente + «verificada» |

Solo lo que tú publicas entra en el catálogo común. Lo privado nunca contamina a los demás y siempre se ve marcado.

## 4. Canales matemáticos

* **El tipo de operación** (resta, producto, CAN, RPM desde CKP, filtro…) es **código**: lo añades tú.
* **La combinación de un usuario** (canal A − canal B con escala 10) es **configuración**: va con su captura (CSV con ajustes) o en su navegador. No es conocimiento y no pasa por el catálogo.
* Los **criterios** que hoy llevan dentro (p. ej. CAN 1,5–3 V) salen a una skill.

## 5. Material de Ortu (`CKP - RPM`, Drive)

Es una *skill para un asistente de IA* (SKILL.md + modelo en Python + páginas HTML), no una skill de la app:
un **simulador didáctico** de irregularidad (δ, RPM en 720°, órdenes de encendido de 1 a 12 cilindros, fallos por compresión, válvulas o encendido).

| Parte | Destino |
|---|---|
| Modelo (`modelo_motores.py`) | **Código**: pasarlo a JS como «curva esperada» (lo que debería dar un motor sano con ese nº de cilindros y orden) y como generador de señales de ejemplo. Validar con sus 34 casos de `validacion`. |
| `datos_modelo.json` · órdenes de encendido y ángulos | **Skill/datos de referencia** (órdenes y parejas por nº de cilindros; hoy la app solo trae algunas). |
| δ esperado, fallos tipo | **Notas** de la skill de equilibrio de cilindros, marcadas «supuesto didáctico, no medida» (como pide su SKILL.md). |
| Páginas HTML y ejercicios | **Portal** (Simulador / Notas interactivas), no Analyzer Scope. |

## 6. Fases

| Fase | Entrega |
|---|---|
| S1 | **Medidas con nombre** en el motor (CKP, CAN, compresión, arranque) + catálogo de medidas (id, qué es, unidad, análisis). |
| S2 | **Sacar criterios del código** a paquetes de skills (CKP 85 %, CAN ISO 11898-2, El Power 9 V / 13,8–15 V…), con autor y fuente. |
| S3 | **Catálogo e instalación**: app base vacía, instalar/actualizar desde el servidor, `skills_necesarias` en procedimientos. Renombrar Scripts → Procedimientos. |
| S4 | **Mis skills privadas + enviar para verificar** (cola en Drive) + publicar. |
| S5 | Plantillas Excel (skills y procedimientos) + editor con formulario. |
| S6 | **Informe combinado** (pantalla y PDF): medidas [Medido], hallazgos por skill [Inferido] con fuente y estado, pasos que faltan. |
| S7 | Modelo de Ortu en JS (curva esperada + demo), validado con sus 34 casos. |
