# Layout: Chofer

**Aplica a:** Rutas bajo `(chofer)/`  
**Acceso:** Solo usuarios con rol CHOFER

## Propósito
Shell de navegación para la interfaz del chofer, optimizada para celular.

## Componentes
- Header superior: nombre del chofer + botón logout
- Contenido principal (slot)
- Barra de navegación inferior (bottom nav) con 3 íconos:
  - Inicio (dashboard)
  - Nueva orden
  - Historial

## Comportamiento
- El middleware verifica que el usuario autenticado sea CHOFER
- Si no lo es, redirige a `/login`
- El layout marca qué ítem del bottom nav está activo según la ruta actual
