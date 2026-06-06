# Página: Nueva Orden

**Ruta:** `/chofer/nueva-orden`  
**Acceso:** Solo CHOFER

## Propósito
Formulario de múltiples pasos (wizard) para registrar el retiro de materiales en una empresa cliente. Es el flujo central del sistema.

## Pasos del wizard

### Paso 1 — Seleccionar empresa
- Selector searchable de empresas activas (carga desde `GET /api/empresas?active=true`)
- Botón "Siguiente"
- Al avanzar: crea la orden en el servidor (`POST /api/ordenes`) y guarda el `orderId` en estado local

### Paso 2 — Agregar materiales
- Lista de ítems agregados (inicialmente vacía)
- Botón "Agregar material":
  - Selector de tipo de material
  - Campo de cantidad (número)
  - Selector de unidad (pre-relleno según el tipo de material)
- Botón eliminar por ítem
- Mínimo 1 ítem para continuar
- Al cambiar: actualiza la orden (`PATCH /api/ordenes/{id}` con los items)

### Paso 3 — Fotos del material
- Botón "Abrir cámara" (usa `<input type="file" capture="environment" accept="image/*">`)
- Muestra miniaturas de fotos ya tomadas
- Mínimo 1 foto requerida
- Máximo 5 fotos (se deshabilita el botón al llegar al máximo)
- Cada foto se sube inmediatamente al servidor (`POST /api/evidencias`)
- Botón para eliminar cada foto

### Paso 4 — Firma del representante
- Instrucción al chofer: "Entregue el teléfono al representante de la empresa"
- Canvas de firma (componente `FirmaCanvas`)
- Campo nombre del firmante (texto libre)
- Botón "Limpiar firma"
- Botón "Confirmar firma" (habilitado solo si hay trazo en el canvas Y nombre ingresado)
- Al confirmar: la imagen de la firma se envía al servidor y se guarda `clientSignerName` y `signatureImagePath` en la orden

### Paso 5 — Confirmación
- Resumen de todo: empresa, ítems con cantidades, número de fotos, nombre del firmante
- Botón "Confirmar retiro":
  - Registra geolocalización del celular
  - Cambia status de la orden a `EN_TRANSITO` (`PATCH /api/ordenes/{id}`)
  - Redirige a `/chofer/orden/{id}` con mensaje de éxito

## Manejo de estado
- El wizard mantiene el estado en React state (no localStorage para el wizard activo)
- Si el usuario retrocede un paso, los datos del paso anterior se conservan
- Si el usuario abandona la página, la orden queda en `EN_RETIRO` (puede retomarla desde el dashboard)

## Indicador de progreso
- Barra de progreso o puntos en la parte superior mostrando en qué paso está (1/5, 2/5, etc.)

## Borrador offline
- Si en cualquier paso falla la conexión, se guarda el estado del wizard en localStorage con clave `drafOrden_{orderId}`
- Al volver a conectarse, el sistema sincroniza automáticamente
