# API Routes: /api/reportes

**Todos los endpoints requieren rol ADMIN.**

---

## GET /api/reportes/ordenes
**Query params:** `from`, `to`, `driverId`, `companyId`

**Implementación:**
1. Filtrar órdenes por fecha y filtros opcionales
2. Agregar conteos por status
3. Agregar totales por tipo de material (sumar `OrderItem.receivedQuantity` de órdenes RECIBIDAS)
4. Retornar objeto de resumen

**Respuesta:**
```json
{
  "totalOrdenes": 42,
  "porEstado": { "EN_TRANSITO": 3, "RECIBIDA": 35, "DISCREPANCIA": 4 },
  "totalDiscrepancias": 4,
  "porMaterial": [
    { "material": "Cartón", "unit": "KG", "total": 1250 }
  ]
}
```

---

## GET /api/reportes/discrepancias/export
**Query params:** `from`, `to`, `status`, `severity`

**Implementación:**
1. Obtener discrepancias con el filtro
2. Generar CSV con headers:
   `Fecha,Código Orden,Chofer,Empresa,Material,Declarado,Recibido,Diferencia%,Severidad,Estado`
3. Retornar como `text/csv` con header `Content-Disposition: attachment; filename="discrepancias.csv"`
