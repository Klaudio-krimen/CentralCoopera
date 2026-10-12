# Alba · Elizabeth — revisión gráfica LOGIN-004

Revisión solicitada por el usuario sobre la propuesta de Claude LOGIN-003, base Git 9d692de.
La referencia original se conserva íntegra en la carpeta vecina.

Abrir [maqueta.html](maqueta.html) desde un servidor local. Los controles permiten repetir el
amanecer, ver las poses de Elizabeth, mostrar error y simular éxito. El formulario es una
maqueta: no inicia sesión ni envía valores a ningún servicio. `#t=14000` congela el alba completa.
Se respeta la preferencia de movimiento reducido al abrir la página.

## Cambios y motivos

| Antes                                                | Revisión                                                      | Motivo                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Tramado muy visible sobre toda la escena y el acceso | Rampa de ocho tonos en la bodega y azul uniforme en el disco  | Mantener profundidad sin dificultar la lectura                  |
| Grano que se desplazaba                              | Grano fijo tenue y líneas de barrido suaves sobre el decorado | Encanto de consola y película antigua con menos distracción     |
| Halo sobre cualquier superficie brillante            | Bloom limitado a ventana y ampolleta                          | Mantener bordes del personaje y texturas nítidos                |
| Pelo oscuro corto                                    | Melena castaña clara con visos dorados                        | Interpretación pixel art de Elizabeth solicitada por el usuario |
| Lámpara de 24 px y disco de radio 46, centro y98     | Lámpara de 20 px y disco de radio 50, centro y94              | Hacer coincidir la maqueta con las medidas del diseño           |
| Orientación forzada al disco cada frame              | La máquina conserva la pose del foco                          | Girarse y cubrir los ojos al enfocar contraseña                 |
| Palanca y asiento en las posiciones nocturnas        | Control x249 y asiento x294                                   | Evitar que la operaria cruce por detrás del acceso              |
| Formulario incompleto y botón diferente              | Casilla, mostrar clave, error y «INICIAR TURNO»               | Revisar el espacio que necesita la interfaz real                |

El acceso usa 60 píxeles lógicos de ancho, frente a los 62 del spec original, para aumentar los
tamaños mínimos del texto y conservar el error dentro de la zona segura en escala 3. Esta
variación debe incorporarse al spec de integración de Claude junto con la rampa de ocho tonos.
El cuerpo del disco se repone después del postproceso: conserva exactamente #2a344d.
El éxito completa el alba en unos 700 ms. Si el coste medio supera 50 ms durante 2 segundos,
se conserva el alba completa y estática; los campos siguen operativos.

## Entrega para integración

- `lib/login-escena/operaria.ts`: personaje puro reusable, conservando el contrato existente.
- `operaria.test.ts`, `operaria.spec.md` y actualización de `dibujo.test.ts`: melena, simetría y límites.
- `build-review.cjs`: genera la maqueta a partir de la referencia original y del personaje
  actualizado. Ejecutar con `node docs/superpowers/specs/2026-10-11-login-alba-elizabeth/build-review.cjs`.
  Usa TypeScript ya instalado; no agrega dependencias.
- [Evidencia de revisión](../../../qa/LOGIN-004.md).

La integración completa de Alba en /login sigue siendo trabajo de LOGIN-003. Esta revisión no
publica la maqueta ni modifica el checkout reservado por Claude. El personaje está preparado
en la rama aislada codex/login-alba-elizabeth; no hay commit ni push.
