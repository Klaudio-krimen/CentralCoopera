# Página: Detalle de Orden (Chofer)

**Ruta:** `/chofer/orden/[id]`  
**Acceso:** Solo CHOFER (solo su propia orden)

## Propósito
Vista de solo lectura del detalle de una orden. Sirve para que el chofer vea el estado y tenga el código a mano para mostrarlo en recepción.

## Datos que muestra
- Código de orden (prominente, texto grande)
- Estado actual con color
- Empresa cliente
- Fecha y hora del retiro
- Lista de ítems (tipo, cantidad, unidad)
- Miniaturas de fotos
- Nombre del firmante
- Geolocalización del retiro (si está disponible: "Registrado en [dirección aproximada]")

## Si la orden tiene discrepancia
- Banner de alerta rojo: "Esta orden tiene una discrepancia registrada"
- Muestra la diferencia por ítem (declarado vs. recibido)
- Nota: "El administrador ha sido notificado"

## Comportamiento
- El código de orden se muestra grande para facilitar la lectura desde cierta distancia (cuando el chofer lo muestra al receptor)
- Botón "Volver al inicio"
- No permite editar nada desde esta vista
