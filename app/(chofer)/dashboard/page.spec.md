# Página: Dashboard del Chofer

**Ruta:** `/chofer/dashboard`  
**Acceso:** Solo CHOFER

## Propósito
Vista principal del chofer al abrir la app. Muestra el estado de sus órdenes activas.

## Datos que muestra

### Sección "Orden activa" (si existe)
- Muestra la orden en estado EN_RETIRO o EN_TRANSITO
- Nombre de la empresa, código de orden, hora de inicio
- Botón "Continuar" que lleva a la orden en curso

### Sección "Órdenes de hoy"
- Lista de órdenes del día actual (todas las que no están CERRADAS)
- Estado visual: chip de color por status (EN_RETIRO = amarillo, EN_TRANSITO = azul, RECIBIDA = verde, DISCREPANCIA = rojo)

### Botón principal
- "Nueva orden" — lleva a `/chofer/nueva-orden`

## Comportamiento
- Si hay un borrador en localStorage (creado sin conexión), muestra un banner de alerta con "Tienes un borrador pendiente de sincronizar"
- Los datos se obtienen con fetch al cargar la página (`GET /api/ordenes?status=EN_RETIRO,EN_TRANSITO&driverId=me`)
- Mostrar estado de carga (skeleton) mientras se obtienen los datos
