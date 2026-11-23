# Catálogo central (skills y procedimientos instalables)

La app **no trae activo** este conocimiento: cada uno **instala** lo que necesita. Un solo origen, sin copias del proyecto por cliente.

| Dónde | Qué |
|---|---|
| `analyzer-scope/catalogo/skills/*.json` | Skills (paquetes de reglas, `analyzer-scope-reglas/1`) |
| `analyzer-scope/catalogo/procedimientos/*.json` | Procedimientos (`analyzer-scope-script/1`) |
| `analyzer-scope/catalogo/indice.json` | Índice. **Lo genera `node build.js`**: no se edita a mano |

Entrar en el catálogo = **commit en `main`** (lo verificas tú). Cada archivo lleva `"acceso": "libre"` o `"vip"`.

## Cómo llega a cada usuario
* **Con servidor** (Servidor Scope o portal): `catalogo_lista` y `catalogo_bajar` leen el catálogo de GitHub `main` (caché 10 min;
  `catalogoActualizar()` en el editor para verlo ya). Lo **VIP** solo se sirve a quien lo tenga en su columna `paquetes` (o `*`).
* **Sin servidor** (versión libre): la app lleva una copia de lo **libre**; lo VIP no va dentro.
* Lo instalado queda en el navegador y funciona sin conexión: skills en `as_subs`, procedimientos en `as_procs`.
  Si sube la `version` en el catálogo, sale «Actualizar».

## En la app
* **Procedimientos → Catálogo** (panel izquierdo): Instalar · Actualizar · Quitar.
* Un procedimiento que necesita una skill no instalada ofrece **«Instalar «…»»** en su cabecera; si está instalada pero
  desactivada, **«Activar»**.
* Las skills instaladas se ven, se activan y se copian en «Diagnóstico → Fuente de conocimiento».

## Añadir algo al catálogo
1. Copia el `.json` en `catalogo/skills/` o `catalogo/procedimientos/` (con `version` y `acceso`).
2. `node build.js` (regenera `indice.json` y la copia libre de la app) y `npm test` en `tests/`.
3. Commit + push a `main`. En el servidor, `catalogoActualizar()` si no quieres esperar 10 min.

Pendiente (S4): «Mis skills» privadas en la cuenta y **enviar para verificar** (cola) antes de entrar en el catálogo.
