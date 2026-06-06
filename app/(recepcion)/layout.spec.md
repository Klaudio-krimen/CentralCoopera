# Layout: Recepción

**Aplica a:** Rutas bajo `(recepcion)/`  
**Acceso:** Solo usuarios con rol RECEPCION

## Propósito
Shell de navegación para el panel de recepción/bodega.

## Componentes
- Header: logo + nombre "Recepción" + nombre del usuario + logout
- Sidebar o tabs de navegación:
  - Órdenes en tránsito (pendientes de recibir)
  - Historial de recepciones

## Comportamiento
- El middleware verifica rol RECEPCION o ADMIN
- Diseño para tablet o pantalla de PC (no necesita ser mobile-first)
