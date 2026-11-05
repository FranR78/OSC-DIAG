# CLAUDE.md — OSC-Diag

## Formato de respuesta
- Español, corto, legible en móvil. Más detalle solo si lo pido.
- Cierre de tarea: `OK` + checklist (probar / revisar / pusheado sí-no). Nada más.
- Sin narrar pasos, sin resumir, sin preámbulos. Solo el fragmento cambiado.
- Duda bloqueante: 1 línea + opciones numeradas. Permiso para todo.
- No propongas mejoras que no he pedido.

## Colores (HTML/artefactos)
Azul `#14558f` (títulos), `#1f6fb5`, fondo `#eaf3fb`, texto `#12263a`, Open Sans, tema claro.

## Git
- `main` manda. Primer comando: `git fetch --all --prune && git status -sb`.
- Nada solo en local: commit + push al terminar.

## Reglas del proyecto
- Producto para terceros: nada fijo de un usuario (IDs de carpeta, key, dominio) en el código → Propiedades del script.
- Los PDF nunca a git.
- El contrato de bloques (`Prompt.gs`) y los marcadores (`Informe.gs`) van juntos: si cambia uno, cambia el otro y `docs/`.
- Extensión (`extension/`, fase 3): sube `version` en `manifest.json` en cada cambio.
- Seguridad: sin keys, tokens, IPs ni datos de alumnado o clientes.
