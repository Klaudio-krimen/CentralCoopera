# Página: Reportes

**Ruta:** `/admin/reportes`  
**Acceso:** ADMIN

## Propósito
Generación de reportes para supervisión y análisis.

## Reporte 1 — Resumen general
**Filtros:** Rango de fechas, Chofer (opcional), Empresa (opcional)

**Muestra:**
- Total de órdenes en el período
- Desglose por estado
- Total de material retirado por tipo (KG / M3 / Unidades)
- Número de discrepancias y porcentaje sobre total de órdenes

## Reporte 2 — Por chofer
**Filtros:** Chofer, Rango de fechas

**Muestra:**
- Órdenes realizadas
- Material retirado
- Discrepancias: cuántas, severidad promedio
- Tabla con historial completo de órdenes en el período

## Reporte 3 — Discrepancias
**Filtros:** Rango de fechas, Chofer, Empresa, Severidad, Estado

**Muestra:**
- Tabla detallada de todas las discrepancias
- Columnas: Fecha | Orden | Chofer | Empresa | Material | Declarado | Recibido | % Diff | Severidad | Estado

**Exportar CSV:** Botón que llama a `GET /api/reportes/discrepancias/export` y descarga el archivo

## Notas de implementación
- Los reportes se generan en el cliente con fetch a los endpoints de reportes
- Mostrar spinner mientras cargan
- Si no hay datos en el período: mensaje "Sin registros para el período seleccionado"
