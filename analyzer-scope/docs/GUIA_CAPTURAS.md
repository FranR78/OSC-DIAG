# Guía de capturas · qué dice el curso y cómo llevarlo a PicoScope

Base del contenido de los **Scripts** (pasos guiados). Fuente: curso «Diagnóstico avanzado con Scripts» (Autoscope), pág. citadas.
Etiquetas: **[Fuente]** = lo dice el curso · **[Inferido]** = propuesta para PicoScope, validar en taller.

> El curso explica sobre todo **cómo leer** los resultados. De **cómo capturar** da las maniobras y las señales,
> pero **no** da escalas, base de tiempos ni muestreo (en Autoscope el script los fija solo). Eso lo pone esta guía como [Inferido].

---------------------------------------------------------------------------------------------------

## S1 · Compresión relativa (método El Power)

| | |
|---|---|
| Señales | Corriente de arranque (pinza amperimétrica) o tensión de batería · sincronismo cil. 1: **bobina 1** (gasolina) o **inyector 1** (common rail) [Fuente, pág. 96] |
| Antes | Batería cargada; vehículo en reposo 1 h para medir bien la batería [Fuente, pág. 88] |
| Maniobra | Arrancar sin que el motor arranque (inyección cortada) [Inferido] · al menos 5 ciclos por cilindro (norma 5…10) [Fuente, pág. 95] |
| Valores | Arrastre 170…330 RPM · compresión de cada cilindro 90…100 % del mejor [Fuente, pág. 95] |
| PicoScope | 2 canales · pinza ±600 A (o tensión ±20 V) · sincronismo ±20 V · 10 s · 20 kS/s [Inferido] |

## S2 · Arranque, batería y carga (El Power completo)

| | |
|---|---|
| Señales | Tensión en bornes de batería + corriente con pinza amperimétrica [Fuente, pág. 87] |
| Mide | Tensión inicial y bajo carga (no < 9 V), corriente del solenoide y tiempo de cierre (10…45 ms), pico de arranque, bujías de incandescencia (diésel), carga del alternador (13,8…15 V), rizado y falta de fase [Fuente, pág. 88–99] |
| Maniobra [Inferido] | 1) Grabar con contacto quitado · 2) contacto (diésel: esperar a que se apaguen las bujías) · 3) arrancar · 4) ralentí con consumidores · 5) 2000–2500 RPM |
| PicoScope | 2 canales · tensión ±20 V · pinza ±600 A · 60 s · 10 kS/s (rizado del alternador: captura aparte de 0,5 s a 100 kS/s) [Inferido] |

## S3 · Contribución por cilindros con sensor de cigüeñal (CSS)

| | |
|---|---|
| Señales | Sensor de cigüeñal (CKP) + sincronismo cil. 1 (bobina o inyector) [Fuente, pág. 57–70] |
| Maniobra gasolina | Ralentí → aceleración → por encima de 3000 RPM **quitar el contacto (llave) con la mariposa abierta** hasta que se pare: esa caída solo depende de la mecánica (fugas de compresión) [Fuente, pág. 67] |
| Maniobra diésel | 1) Ralentí · 2) acelerar suave y **soltar de golpe** (calibra el dentado del CKP) · 3) vuelta a ralentí · 4) acelerón y soltar · 5) acelerón y **apagar el motor** [Fuente, pág. 70] |
| Ojo | La compresión solo vale en ralentí; un cilindro flojo baja también al siguiente en orden de encendido: confirmar con S1 [Fuente, pág. 71] |
| PicoScope | 2 canales · CKP ±20 V (inductivo) o ±10 V (Hall) · 20 s · **≥ 200 kS/s** (precisión del paso de dientes) [Inferido] |

## S4 · Presión en cilindro (Px)

| | |
|---|---|
| Señales | Transductor de presión en el cilindro (**bujía retirada**, ese cilindro no enciende) + chispa de otro cilindro opcional para el avance [Fuente, pág. 2, 12, 49] |
| Maniobra | Ralentí y carga máxima a varias RPM (acelerones); el avance se tabula en ralentí y carga máxima [Fuente, pág. 40, 49] |
| Valores | Pico 3…6 bar en ralentí [Fuente, pág. 2] · AAE 130…160° [pág. 3] · centro del cruce (sección 9) 370…390°, VVT-i 380…400° [pág. 5] · cierre de admisión 560…600° [pág. 6–7] · ejemplo a 730 RPM: AAA 356°, RCE 373°, AAE 143°, RCA 589° [pág. 23]. Pérdidas de gas: solo ejemplos (16 %…>90 %), sin límite fijo [pág. 11–18] |
| PicoScope | 2 canales · transductor según su escala · 20 s · 50 kS/s [Inferido] |

## S5 · Script de Fran: mecánica sin desmontar (transductores de pulso)

| Paso | Señales | Maniobra |
|---|---|---|
| 1 | = S1 (compresión relativa) | Arrastre sin arrancar |
| 2 | Bobina 1 · inyector 1 · transductor admisión · transductor cárter | Ralentí → acel. suave → acel. brusca → apagar motor **sin parar la grabación** |
| 3 | Bobina 1 · inyector 1 · transductor escape | Igual que el paso 2 |

* La maniobra de los pasos 2–3 es la del CSS diésel (pág. 70), y apagar grabando es el equivalente del corte con mariposa abierta (pág. 67). [Inferido]
* PicoScope: 4 canales · 20 s · 50 kS/s · un CSV por paso (búfer actual). [Inferido]
* Los umbrales de admisión, escape y cárter **no están en el curso** (allí se usa transductor en cilindro): quedan como borrador.

---------------------------------------------------------------------------------------------------

## Comunes para PicoScope [Inferido]

Autoscope graba sin límite (hasta llenar el disco). PicoScope acumula pantallas en el búfer y, si tardas, sustituye las
primeras. Por eso **todo script empieza configurando el osciloscopio**:

1. Prueba de señal con base de tiempos corta: escalas y canales correctos.
2. Subir a **1–2 s/div** (10–20 s por pantalla): una pantalla = la maniobra completa.
3. Muestras suficientes para ≥ 50 kS/s (≥ 200 kS/s en CSS).
4. Disparo único (Single) sobre la bobina para que no se sobrescriba (por confirmar).
5. Exportar a CSV solo el tramo indicado (pantalla del búfer con la maniobra), un CSV por paso.

* Motor a temperatura (salvo prueba en frío), consumidores apagados salvo que el paso diga lo contrario.
* Sin disparo (grabación continua) y **un solo búfer**; exportar «búfer actual» a CSV.
* Nombrar los canales en PicoScope igual que en el paso: la app los reconoce por el hueco, pero ayuda a revisar.
* Tamaño: 20 s × 4 canales × 50 kS/s = 4 M valores (decenas de MB). S3 a 200 kS/s es la más pesada: probar el parser con un CSV real.
