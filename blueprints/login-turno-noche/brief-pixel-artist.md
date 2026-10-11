# Encargo de pixel art — Login «Turno de noche» de Central Coopera

> **EN PAUSA (2026-10-11).** El usuario aprobó la escena 100 % por código (`blueprint.md` v2).
> Este encargo queda como opción futura para pulir sólo el personaje, si se decide.


> Documento para cotizar y contratar al artista. Contexto técnico completo en `blueprint.md` §8.

## 1. El cliente y el proyecto

**Coopera Pro** es una cooperativa chilena (Santiago) de gestión de residuos y economía circular.
Retira material reciclable desde empresas y opera un taller de pallets. **Central Coopera** es su
sistema interno. Queremos que la pantalla de inicio de sesión en computadores de escritorio sea una
pequeña escena animada estilo videojuego de los 90.

## 2. La escena

De noche, en la bodega y taller de pallets. Una **operaria** entra a oscuras, busca y tira de la
cadena de una lámpara industrial colgada sobre una pila de pallets. La luz revela un **cartel o
terminal del taller** donde aparece el formulario de inicio de sesión. Mientras la persona escribe,
la operaria reacciona; al entrar, baja una palanca y se encienden todas las luces de la bodega.

Tono: cálido, ingenioso, digno. Debe transmitir trabajo real, orden y confianza, no caricatura.

## 3. Personaje

- Operaria **original**, adulta, de Coopera Pro: casco, chaleco reflectante, ropa de trabajo,
  botas de seguridad; opcional, linterna o guantes.
- **No** puede parecerse a personajes existentes de videojuegos, películas ni marcas.
- Legible a 32×48 px: silueta clara, chaleco como acento de color.

## 4. Especificaciones técnicas

| Ítem            | Especificación |
| --------------- | -------------- |
| Lienzo base     | 320×180 px (se escalará ×4 y ×6 sin suavizado) |
| Personaje       | Cuadro de 32×48 px |
| Lámpara         | Cuadro de 32×64 px |
| Paleta          | Máximo 32 colores, incluye el verde de la marca (lo entregamos); archivo `.gpl` o `.pal` |
| Estilo          | Pixel art de los 90, sin antialias, sin degradados suaves, sin sub-píxeles |
| Herramienta     | Aseprite (se requieren los `.aseprite` fuente) |
| Exportación     | Hoja PNG + JSON (formato **Array**) con `frameTags` y duración por cuadro |
| Peso total      | El conjunto final debe poder quedar bajo 200 KB en PNG indexado |

## 5. Lista de entregables

### Fondos (320×180, por capas)

1. Bodega **apagada** (siluetas y poca luz ambiental).
2. Misma bodega **iluminada por la lámpara** (luz local, alineada píxel a píxel con la apagada).
3. Bodega **con todas las luces encendidas** (final feliz).
4. **Primer plano** con transparencia (elementos delante del personaje).
5. **Cartel/terminal** del taller con un área lisa reservada para el formulario (acordar tamaño).

### Animaciones de la operaria (32×48)

| Tag (nombre exacto) | Cuadros | Acción |
| ------------------- | ------- | ------ |
| `caminar`           | 8       | Caminata lateral de entrada |
| `buscar`            | 6       | Mira alrededor y hacia arriba |
| `cadena`            | 6       | Tira de la cadena de la lámpara |
| `reposo`            | 4       | Quieta, respirando (bucle) |
| `mirar`             | 3       | Mira hacia el cartel |
| `tapar-ojos`        | 4       | Se da vuelta o se tapa los ojos, con humor |
| `rascar`            | 6       | Se rasca el casco (algo salió mal) |
| `palanca`           | 8       | Baja una palanca de pared |
| `sentarse`          | 6       | Se sienta en un pallet |
| `sentada`           | 4       | Sentada esperando (bucle) |

### Lámpara y efectos

| Archivo / tag            | Cuadros | Acción |
| ------------------------ | ------- | ------ |
| Lámpara `apagada`        | 1       | — |
| Lámpara `balanceo`       | 4       | Vaivén suave (bucle) |
| Lámpara `titileo`        | 3       | Encendido con parpadeo (se usará ≤ 3 veces por segundo) |
| Polvo `flotar` (8×8)     | 6       | Partícula de polvo en el aire |

### Datos de posición

Un listado (o capa guía en Aseprite) con: centro de la luz de la lámpara, punto donde se detiene la
operaria, posición de la palanca y rectángulo útil del cartel, en coordenadas de 320×180.

## 6. Etapas y aprobaciones

1. **Boceto**: diseño del personaje (frente/perfil), paleta y composición de la escena → aprobación.
2. **Fondos**: las 5 capas → aprobación.
3. **Operaria**: todas las animaciones → aprobación.
4. **Lámpara y efectos** + datos de posición → entrega final.

Incluye **2 rondas de revisión** por etapa.

## 7. Condiciones

- **Cesión de derechos patrimoniales** para uso comercial de Coopera Pro (sitio, sistema interno,
  material de marca), sin límite de tiempo ni territorio.
- Entrega de los archivos fuente `.aseprite` y de la paleta.
- Obra original; el artista garantiza que no copia ni deriva de obras de terceros.
- El artista puede mostrar la obra en su portafolio tras el lanzamiento, salvo que se acuerde lo
  contrario.

## 8. Lo que pedimos en la cotización

Precio por etapa, plazo por etapa, portafolio de pixel art animado y disponibilidad para la
ronda de ajustes posterior a la integración.
