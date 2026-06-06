# Página: Dashboard de Recepción

**Ruta:** `/recepcion/dashboard`  
**Acceso:** RECEPCION

## Propósito
Lista de órdenes en tránsito que están esperando ser recibidas en bodega.

## Secciones

### "Esperando recepción"
- Lista de órdenes con status `EN_TRANSITO`
- Por orden muestra: código, empresa, nombre del chofer, hora de salida, ítems (resumen: "3 tipos de material")
- Botón "Recibir" por cada orden que lleva a `/recepcion/recibir/{ordenId}`

### Buscador
- Buscar por código de orden
- Al ingresar el código y presionar Enter o el botón buscar, navega directamente a `/recepcion/recibir/{ordenId}`

## Actualización
- Los datos se recargan cada 60 segundos automáticamente (polling simple)
- Botón "Actualizar" manual
