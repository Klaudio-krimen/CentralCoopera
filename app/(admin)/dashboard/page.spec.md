# Página: Dashboard de Administración

**Ruta:** `/admin/dashboard`  
**Acceso:** ADMIN

## Propósito
Vista resumen del estado del negocio hoy y en el último mes.

## Tarjetas de métricas (KPIs)
- Órdenes hoy (total, desglose por status)
- Órdenes este mes
- Discrepancias pendientes (con enlace a `/admin/discrepancias`)
- Total de material retirado este mes (en KG, si aplica)

## Tabla: Órdenes recientes
- Últimas 10 órdenes de cualquier status
- Columnas: Código, Chofer, Empresa, Estado, Fecha
- Click en fila navega a detalle de la orden

## Alertas activas
- Lista de discrepancias con status PENDIENTE o EN_INVESTIGACION
- Muestra: código de orden, chofer, severidad, horas transcurridas desde que se detectó
- Botón "Ver todas" lleva a `/admin/discrepancias`

## Datos
- Se obtienen con `GET /api/reportes/ordenes?from=hoy&to=hoy` y `GET /api/discrepancias?status=PENDIENTE`
