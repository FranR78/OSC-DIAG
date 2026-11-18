# OSC-Diag

Formulario con capturas de osciloscopio → informe de diagnóstico en Google Docs,
basado solo en tus PDF de experto. Motor: Gemini API con key personal (gratis).

- Instalación: [`docs/INSTALAR.md`](docs/INSTALAR.md)
- Diseño: [`docs/DISENO.md`](docs/DISENO.md)
- Código: [`apps-script/`](apps-script/)

## Analyzer Scope

Analizador de señales de osciloscopio (8 canales) para diagnosis de motores.
Proyecto aparte: [`analyzer-scope/`](analyzer-scope/) — leer su `README.md`. Archivo para usar: `analyzer-scope/dist/analyzer-scope.html`.

Servidor propio de Analyzer Scope (clientes, paquetes compartidos): [`apps-script-scope/`](apps-script-scope/) — guía en [`docs/SERVIDOR_SCOPE.md`](docs/SERVIDOR_SCOPE.md).

Biblioteca de señales de referencia (servidor propio, con código de invitación): [`apps-script-biblioteca/`](apps-script-biblioteca/) — guía en [`docs/BIBLIOTECA.md`](docs/BIBLIOTECA.md).
