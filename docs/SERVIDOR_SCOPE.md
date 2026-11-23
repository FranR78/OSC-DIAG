# Analyzer Scope · servidor propio (Apps Script)

Proyecto aparte del portal: `apps-script-scope/` (`Servidor.gs`, `App.html` y `appsscript.json`).
Cada usuario ejecuta la app **sobre tu copia**: si cierras el proyecto o le quitas el acceso, deja de entrar.
`App.html` lo genera `analyzer-scope/build.js` (no se edita a mano).
**Se actualiza solo:** el servidor baja `App.html` de GitHub (`main`) cada ≤ 10 min; el `App` del proyecto solo es reserva
si GitHub falla. Para forzarlo ya: ejecutar `appActualizar`. Un cambio en `Servidor.gs` sí exige pegarlo y «Gestionar
implementaciones → Editar → Versión nueva» (misma URL `/exec`).

## Montarlo (una vez)
1. <https://script.google.com> → Proyecto nuevo «Analyzer Scope · servidor». Crea `Servidor.gs` y un archivo HTML `App`
   con el contenido de esta carpeta. En Configuración del proyecto, «Mostrar el archivo de manifiesto» y pega `appsscript.json`.
2. Ejecuta `scopeSetup` (acepta los permisos): crea la Hoja «Analyzer Scope · usuarios y paquetes» (sale el enlace en el registro).
3. Implementar → Nueva implementación → Aplicación web → Ejecutar como **Yo** · Acceso **Cualquier usuario con cuenta de Google**.
4. Configuración del proyecto → Propiedades del script → `URL_SCOPE` = la URL `/exec`.

## Dar acceso a alguien
1. En `Servidor.gs`, cambia el correo de `crearEnlaceEjemplo` y ejecútala: crea su fila en **Usuarios** y deja su
   **enlace personal** en el registro. Envíaselo.
2. Lo abre con su cuenta de Google: el enlace queda atado a esa cuenta (otra cuenta con el mismo enlace no entra).
   Sin usar, caduca a los 14 días. Google renueva la clave de la cuenta cada ~30 días: si deja de entrar, enlace nuevo.
3. En la Hoja, pestaña **Usuarios**: `activo` (sí/no), `caduca` (AAAA-MM-DD), `paquetes` (`*`, ids separados por comas o vacío)
   y `rol` (`cliente`; `autor` puede publicar paquetes; `admin`).
4. **Todo un dominio (alumnado del centro):** propiedad `DOMINIOS_LIBRES` = el dominio (varios, separados por comas).
   Entran sin fila ni enlace, como `cliente`; una fila en **Usuarios** con `activo = no` le cierra el paso a uno.
5. **Quitar acceso:** `activo = no` (al siguiente clic). Para anular también su enlace, ejecuta `quitarAcceso('correo')`.

## Conocimiento
* **Base Ortu** viene dentro de la app. **Plantilla Excel y editor** para que cada uno haga sus reglas («Mis reglas»,
  pestaña **Reglas**, una fila por correo).
* **Paquetes compartidos** (pestaña **Paquetes**): Ortu, tú o cualquier `autor` los publica desde la app
  (Diagnóstico → «Publicar para compartir»); nacen `asignado` y tú decides a quién (columna `paquetes` de cada usuario)
  o los pones `todos`. Cada uno los baja desde la app y le funcionan sin conexión. Subir `version` = «Actualizar».
* **Catálogo central** (`analyzer-scope/catalogo/` del repo, `analyzer-scope/docs/CATALOGO.md`): skills y procedimientos verificados por ti.
  El servidor los lee de GitHub `main` (10 min de caché; `catalogoActualizar()` para verlos ya). Los `vip` solo los ve quien
  los tenga en su columna `paquetes` (o `*`). **Tras cambiar `Servidor.gs` hay que pegarlo en el proyecto e implementar nueva versión**
  (la app se actualiza sola; el servidor no).
* **Sin notas técnicas:** este servidor no las tiene. El diagnóstico con las NT y las pruebas complementarias está en tu portal.

## Límites
Unas 30 ejecuciones simultáneas (sobra para ~100 usuarios que no consultan a la vez); cada paquete o «Mis reglas» ≤ 45 KB.
