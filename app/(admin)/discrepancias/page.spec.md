# Página: Gestión de Discrepancias

**Ruta:** `/admin/discrepancias`  
**Acceso:** ADMIN

## Propósito
Vista centralizada de todas las discrepancias detectadas. Es la herramienta principal para investigar posibles robos.

## Filtros
- Status: PENDIENTE | EN_INVESTIGACION | RESUELTA
- Severidad: MENOR | MODERADA | GRAVE
- Chofer
- Empresa
- Rango de fechas

## Tabla
Columnas: Orden | Chofer | Empresa | Severidad | Detectada el | Estado | Tiempo transcurrido

- Por defecto muestra primero las PENDIENTES y GRAVES
- Click en fila expande o navega al detalle

## Detalle de discrepancia
- Resumen de la orden: fotos de retiro vs. fotos de recepción (lado a lado)
- Tabla comparativa: Material | Declarado | Recibido | Diferencia | %
- Notas del receptor
- Historia de estados

## Acciones
- Cambiar estado a "EN_INVESTIGACION"
- Agregar nota
- Resolver: campo de texto "Explicación de resolución" + botón "Marcar como resuelta"

## Alertas por email (versión futura)
- Cuando se crea una discrepancia GRAVE, enviar email al admin
- Marcado como "versión futura" — no implementar en V1
