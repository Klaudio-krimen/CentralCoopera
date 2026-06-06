# Página: Gestión de Órdenes (Admin)

**Ruta:** `/admin/ordenes`  
**Acceso:** ADMIN

## Propósito
Vista completa de todas las órdenes del sistema con filtros avanzados.

## Filtros
- Rango de fechas
- Estado (multi-select)
- Chofer (selector)
- Empresa (selector)

## Tabla
Columnas: Código | Chofer | Empresa | Estado | Fecha retiro | Fecha recepción | Discrepancia

- Paginación: 25 por página
- Click en fila lleva a `/admin/ordenes/{id}` (detalle completo)
- Badge de color en columna Estado
- Ícono de alerta roja en columna Discrepancia si la tiene

## Detalle de orden (subruta `/admin/ordenes/[id]`)
- Toda la información: empresa, chofer, ítems declarados vs. recibidos, fotos, firma, geolocalización
- Si hay discrepancia: muestra el registro de discrepancia con opción de gestionar
- Solo lectura (admin no modifica órdenes, solo gestiona discrepancias)
