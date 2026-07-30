# Product

## Register

product

## Users

Personal interno de Coopera Pro, en 5 roles con contextos de uso muy distintos:

- **Chofer**: usa la app en el celular, en terreno, muchas veces con guantes o al sol, entre retiros. Necesita pantallas simples, botones grandes, y feedback táctil inmediato — no puede detenerse a leer texto largo.
- **Recepción**: en bodega, recibiendo cargas y comparando lo declarado contra lo recibido. Necesita comparar números rápido y marcar discrepancias sin fricción.
- **Ventas (CRM)**: en escritorio, gestionando el pipeline de clientes, leads y seguimientos del nuevo taller de pallets. Contexto de oficina, sesiones largas.
- **Bodega (Inventario)**: control de stock del taller de pallets, ajustes y movimientos.
- **Admin**: visión completa de los tres módulos (Operaciones/CRM/Inventario), gestión de usuarios y reportes.

El trabajo es operativo y repetitivo, no exploratorio — cada rol vuelve a las mismas 3-5 pantallas muchas veces al día.

## Product Purpose

Central Coopera es la intranet operativa de Coopera Pro: cadena de custodia de retiros de reciclaje (declarado vs. recibido, evidencia fotográfica, discrepancias), CRM de ventas para el nuevo taller de pallets y bins (pipeline, contactos, leads automáticos vía webhook/scraping), inventario del taller, y tracking GPS en vivo de choferes. Éxito = cada rol completa su tarea del día sin fricción y sin tener que preguntarle a otro cómo usar la herramienta.

## Brand Personality

Precisa, confiable, sin fricción — como Linear o el dashboard de Stripe: densidad de datos alta pero ordenada, números en mono/tabular para escanear rápido, cero decoración que no informe. La herramienta debe transmitir que los datos (cadena de custodia, dinero en el pipeline) son serios y confiables, sin sentirse fría o burocrática.

## Anti-references

- Plantilla genérica de admin (clon de Bootstrap/Tailwind UI sin criterio propio, sidebar + cards repetidas sin jerarquía).
- Estética excesivamente juguetona o "consumer" — es una herramienta de cadena de custodia y ventas B2B, no una app de consumo.
- Dashboards sobrecargados de gráficos/KPIs decorativos sin información real — cada número visible debe ser accionable.

## Design Principles

- **Un shell, módulos con acento propio**: Operaciones/CRM/Inventario comparten sidebar y estructura, pero cada uno tiene su paleta de acento (emerald/zinc por defecto, azul en CRM) para que el usuario nunca dude en qué módulo está.
- **Mobile-first para roles de terreno**: Chofer y Recepción se diseñan primero para pantalla de celular con targets táctiles ≥44px; Ventas/Admin asumen escritorio.
- **Anti-sobre-encajonamiento**: patrón `.panel` para agrupar contenido plano en vez de anidar `.card` dentro de `.card`; las tarjetas (`.card`) se reservan para elevación real.
- **Números en mono tabular**: cifras, IDs y montos siempre en fuente mono con `tabular-nums` para que se puedan comparar de un vistazo (crítico en Recepción comparando declarado vs. recibido).
- **Movimiento con propósito, no decoración**: fade-up en cascada al cargar listas (confirma que la data llegó), sin animaciones de layout ni rebotes.

## Accessibility & Inclusion

Línea base WCAG AA: contraste de texto ≥4.5:1 (ya corregido zinc-400→zinc-500 en esta sesión), `aria-label` en todo botón de solo-ícono, targets táctiles ≥44px en las vistas de Chofer/Recepción. Sin requisitos adicionales declarados por el usuario más allá de esta línea base.
