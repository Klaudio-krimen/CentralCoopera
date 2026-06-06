# Página: Historial de Órdenes (Chofer)

**Ruta:** `/chofer/historial`  
**Acceso:** Solo CHOFER (solo sus propias órdenes)

## Propósito
Lista paginada de todas las órdenes del chofer, para referencia e historial personal.

## Filtros
- Rango de fechas (por defecto: último mes)
- Estado (todos, o filtrar por uno específico)

## Lista de órdenes
Cada fila muestra:
- Código de orden
- Empresa cliente
- Fecha del retiro
- Estado (chip de color)
- Ícono de discrepancia si la tuvo

## Al tocar una orden
- Navega a `/chofer/orden/{id}`

## Paginación
- 20 órdenes por página
- Botón "Cargar más" (infinite scroll o paginación simple)
