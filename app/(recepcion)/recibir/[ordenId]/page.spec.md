# Página: Registrar Recepción

**Ruta:** `/recepcion/recibir/[ordenId]`  
**Acceso:** RECEPCION

## Propósito
Formulario para que el receptor registre el material que físicamente llegó y el sistema calcule si hay discrepancias.

## Estructura de la página

### Panel izquierdo — "Lo que declaró el chofer"
- Empresa origen, nombre del chofer, hora del retiro
- Fotos tomadas por el chofer (miniaturas clicables)
- Lista de ítems declarados con cantidades y unidades
- Imagen de la firma del cliente

### Panel derecho — "Lo que llegó"
- Para cada ítem declarado, un campo numérico para ingresar la cantidad recibida
- El campo viene pre-rellenado con la cantidad declarada (asumiendo que llegó igual)
- Campo para fotos de recepción (botón "Tomar foto del material recibido")

### Panel de discrepancias (aparece en tiempo real)
- A medida que el receptor modifica las cantidades, se calcula la diferencia en tiempo real
- Si algún ítem tiene diferencia > 0%, muestra la tabla de diferencias:
  - Material | Declarado | Recibido | Diferencia | %
- Color: verde si diferencia = 0, amarillo si MENOR, naranja si MODERADA, rojo si GRAVE

### Botón de confirmación
- "Confirmar recepción sin discrepancias" (verde, visible si todo está OK)
- "Confirmar con discrepancias" (naranja/rojo, visible si hay diferencias)
  - Requiere ingresar una nota antes de confirmar

## Comportamiento al confirmar

### Sin discrepancias (diferencia ≤ umbral)
1. Actualiza la orden: status = `RECIBIDA`, registra `deliveredAt`
2. Actualiza `receivedQuantity` en todos los OrderItem
3. Redirige al dashboard con mensaje "Orden {código} recibida correctamente"

### Con discrepancias (diferencia > umbral en algún ítem)
1. Actualiza la orden: status = `DISCREPANCIA`
2. Crea registro `Discrepancy` con la severidad calculada
3. Actualiza `receivedQuantity` en todos los OrderItem
4. Redirige al dashboard con mensaje "Orden registrada con discrepancia. El admin fue notificado."

## Validaciones
- No se puede confirmar si hay ítems sin cantidad recibida
- Las cantidades recibidas no pueden ser negativas
- Las cantidades recibidas no pueden ser más de 3x lo declarado (campo de error: "¿Es correcto este valor?")
