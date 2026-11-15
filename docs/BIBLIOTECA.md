# Biblioteca de señales de referencia (Analyzer Scope)

Servidor propio y pequeño, **independiente de cualquier portal**. Recibe desde la app la ficha de una captura y la
señal reducida, y las deja en Drive para que quien administra la biblioteca las verifique.

Código: `apps-script-biblioteca/` (un proyecto de Apps Script aparte del de `apps-script/`).

## Instalar (una vez)

1. Crea en Drive la carpeta de la biblioteca y copia su id (lo que va tras `/folders/` en la dirección).
2. En script.google.com crea un proyecto nuevo y pega `Biblioteca.gs` y `appsscript.json`
   (Configuración del proyecto → «Mostrar el archivo de manifiesto»).
3. Configuración del proyecto → **Propiedades del script**: `CARPETA_BIBLIOTECA` = el id de la carpeta.
   Opcionales: `LIMITE_DIA` (envíos por código y día, 20) y `MAX_KB` (tamaño máximo del CSV, 3000).
4. Ejecuta `instalar()` y acepta los permisos: crea `pendientes/`, `verificadas/` y `descartadas/`.
5. Implementar → Nueva implementación → **Aplicación web**, «Ejecutar como: yo», «Acceso: cualquier usuario».
   Copia la dirección que termina en `/exec`.
6. En `analyzer-scope/src/config.json` pon esa dirección en `bibliotecaUrl` y ejecuta `node build.js`.
   Con `bibliotecaUrl` vacío la app no ofrece el envío.

La dirección `/exec` no es un secreto: sin código de invitación no se guarda nada.

## Códigos de invitación

Desde el editor de Apps Script:

* `nuevoCodigo('Nombre del taller o la persona')` → el código sale en el registro de ejecución.
* `listarCodigos()` → códigos en vigor y a quién pertenecen.
* `anularCodigo('CODIGO')` → deja de valer.

Quien envía escribe su código en la ficha de la app (se recuerda en su navegador). Cada envío queda con el nombre
asociado al código.

## Verificar

Cada envío son dos archivos en `pendientes/`, con el mismo nombre (`motor_condición_estado_fecha`):

* `.csv` — CSV con ajustes de Analyzer Scope: al abrirlo en la app recupera escalas, reglas, anotaciones y la ficha.
* `.json` — la ficha, quién lo envió, cuándo y con qué versión de la app.

Abre el CSV en la app, comprueba la señal y la ficha, y mueve **los dos archivos** a `verificadas/` o `descartadas/`.
Lo que declara quien envía («motor sin fallos / con fallo») no es la verificación: solo cuenta lo que está en `verificadas/`.

## Contrato

`POST <bibliotecaUrl>` con `Content-Type: text/plain` (así el navegador no hace petición previa) y cuerpo JSON:

```json
{ "v": 1, "op": "referencia", "codigo": "<código de invitación>", "lang": "es",
  "cliente": { "app": "analyzer-scope", "ver": "2026.11.15" },
  "ficha": { "marca": "", "codigo": "", "combustible": "diesel | gasolina",
             "condicion": "arranque | ralenti | aceleracion | carga | otra | \"\"", "temp": "frio | caliente | \"\"",
             "obs": "", "estado": "ok | fallo", "averia": "", "cilindros": 4, "orden": [1,3,4,2], "rpm": 820,
             "senales": [ { "canal": "CH1", "nombre": "", "parametro": "", "entidad": "", "unidad": "V" } ] },
  "archivo": { "nombre": "captura_ref.csv", "muestras": 20000, "muestras_original": 5000000, "csv": "#analyzer-scope-ajustes;…" } }
```

Respuesta: `{ "ok": true, "v": 1, "op": "referencia", "id": "<id del CSV>", "estado": "pendiente" }` o
`{ "ok": false, "v": 1, "op": "referencia", "error": { "codigo": "no_autorizado | peticion_invalida | cuota | interno", "mensaje": "…" } }`.

`GET <bibliotecaUrl>?op=comprobar&codigo=…` dice si un código vale.

* El CSV va reducido a ~20 000 filas como máximo, conservando el mínimo y el máximo de cada tramo.
* La ficha no lleva matrícula, bastidor ni datos del cliente; el servidor recorta la longitud de cada campo.

## Límites conocidos

* Probado con servicios simulados y con la app contra una biblioteca simulada; **falta la prueba contra un despliegue real**.
* Desde la página de prueba en claude.ai el envío no funciona (esa página no puede llamar a otros servidores):
  hay que usar la app alojada en otro sitio o abierta como archivo.
