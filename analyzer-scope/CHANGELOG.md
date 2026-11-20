# Registro de cambios · Analyzer Scope

Una entrada por entrega. La versión sale de `src/version.txt` y se ve en el menú ☰, en la pestaña «Objetivo» y en el pie del PDF.
Política: subir `version.txt` en cada entrega y poner la etiqueta git `scope-<versión>` en el commit entregado.

## 2026.11.21
- **Scripts por sistema:** cinco apartados que se eligen por lo que le pasa al coche: **Arranque y carga**, **Integridad mecánica**, **Equilibrio de cilindros**, **Encendido** e **Inyección**. Cada uno dice cuándo entrar y lleva sus pruebas (una captura cada una).
- **Compresión relativa** ya no es un apartado: va dentro de Arranque y carga (principio de la gráfica) y de Integridad mecánica (oscilaciones estables). Cada prueba dice **qué mirar**.
- **Gasolina / Diésel** en los apartados con pruebas distintas; **presión en cilindro (Px)** y avance, como pruebas opcionales para quien tenga transductor de cilindro.
- **Qué probar:** Integridad mecánica en gasolina y en diésel; la prueba de corriente de inyector (captura corta).

## 2026.11.20b
- **Arreglo:** en «Scripts» solo se podía abrir el primer script; ahora se abre cualquiera.

## 2026.11.20
- **Pestaña «Scripts»:** pruebas guiadas para PicoScope. Cada script dice qué medir (canal, señal, sonda, rango), cómo y la maniobra en orden, con su perfil de RPM.
- **Comprobación de PicoScope por paso:** con la base de tiempos y las muestras que pongas, avisa si la pantalla no abarca la maniobra (p. ej. 5 ms/div), si el muestreo o la resolución no llegan y del tamaño del CSV; «Usar lo recomendado».
- **CSV por paso:** se carga en su paso y se comprueba (canales, duración, muestreo); se abre en el osciloscopio.
- **Originales y copias:** 5 scripts base (borrador) de solo lectura; «Duplicar y editar», importar y exportar (.json). Formato en `docs/SCRIPTS.md`.
- **Qué probar:** paso 2 de «Mecánica sin desmontar» con 5 ms/div y luego «Usar lo recomendado»; cargar un CSV real de PicoScope; duplicar y cambiar una duración.

## 2026.11.19b
- **Skills = reglas + notas:** cada paquete puede llevar notas (explicación, valores de referencia, procedimiento), enlazadas a sus reglas por el tema; plantilla de notas en hoja de cálculo; botón 📖 en el hallazgo y en el PDF.
- **Servidor propio** (`apps-script-scope/`): los clientes ejecutan sobre la copia del dueño, sin entrar en el portal.

## 2026.11.19
- **Portal para clientes:** permisos por correo (activo, caducidad, notas maestras sí/no, paquetes asignados).
- **Paquetes compartidos:** se bajan desde Diagnóstico y funcionan sin conexión; los autores los publican desde la app.
- **Qué probar:** con una cuenta sin notas maestras, que el diagnóstico salga solo con sus paquetes.

## 2026.11.18c
- **Fuentes de conocimiento:** base Ortu, «Mis reglas» con editor y plantilla de hoja de cálculo (Excel/CSV); en el portal, además, las notas maestras. Las discrepancias entre fuentes se ven en pantalla y en el PDF.
- **Barra de grados** (menú Reglas): al arrastrarla se ven los cilindros sobre la señal en ese ángulo; animación con grados por cilindro, mezcla, chispa o inyector y levas.
- **Gráfica más grande:** tirador bajo la gráfica y alto de las franjas ADM·COMP·EXP·ESC ajustable (Motor → Franjas).
- **Aviso** antes de generar el PDF sin diagnóstico.
- **Qué probar:** descargar la plantilla, cambiar un ejemplo y subirla; arrastrar la barra de grados en el iPhone.
