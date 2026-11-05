# Prueba en taller: escala de tiempo del `.RFC` (Hantek 1008C)

**Objetivo:** confirmar qué significa `#CLOCK` en el `.RFC`. Hoy la app lo toma como
tiempo por división × 10 divisiones (suposición). Si es erróneo, fallan rpm, grados y avance.

**Idea:** grabar una señal de frecuencia conocida y comparar con lo que calcula la app.

## Prueba A — Generador de tono (sin coche, 10 min)
1. Móvil con app «generador de tonos» a **1000 Hz**, volumen medio, salida de auriculares
   (adaptador USB-C/jack si hace falta). Cable de auriculares pelado o pinzas en punta y masa del jack.
2. Sonda en CH1 (x1), masa al común del jack. Comprobar que se ve una senoide estable.
3. Guardar `.RFC` con estas bases de tiempo: **0,5 ms/div · 1 ms/div · 2 ms/div · 5 ms/div**.
4. Repetir a **100 Hz** con 5 ms/div y 20 ms/div.

## Prueba B — Sensor de cigüeñal en coche (referencia real)
1. Motor caliente a ralentí estable. Anotar **rpm del equipo de diagnosis** (no del cuadro).
2. CKP inductivo/Hall en CH1. Si se puede, una bujía/bobina o inyector en CH2.
3. Guardar `.RFC` con **2 ms/div · 5 ms/div · 10 ms/div**, anotando las rpm en cada una.
4. Anotar tipo de rueda fónica (60-2, 36-1…) si se conoce.

## Qué anotar en cada captura
- Nombre del archivo → frecuencia o rpm de referencia.
- **Foto de la pantalla** del software de Hantek justo al guardar (base de tiempo,
  muestras/s, longitud de registro, cursores si los usa).
- Versión del software de Hantek.

## Extra (si el software lo permite)
- Exportar **la misma captura** también en otro formato (CSV/TXT/Excel). Si incluye columna
  de tiempo, la duda queda resuelta sin más.
- Medir la frecuencia con los cursores del propio Hantek y apuntarla.

## Entrega
Subir todo a `analyzer-scope/tests/data/clock/` (o carpeta de Drive) con un `notas.txt`.
Sin datos de clientes ni matrículas en nombres de archivo ni fotos.
