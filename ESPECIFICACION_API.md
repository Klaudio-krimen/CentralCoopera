# Especificación de API

Todas las rutas son Next.js Route Handlers en `app/api/`.  
Todas requieren sesión activa (NextAuth).  
Formato: JSON. Errores retornan `{ error: string, code: string }`.

---

## Autenticación

### POST /api/auth/login
Manejado por NextAuth.js — usar la configuración estándar de credentials provider.

---

## Órdenes de Retiro

### GET /api/ordenes
Retorna lista de órdenes.

**Query params:**
- `page` (number, default 1)
- `status` (enum PickupOrderStatus, opcional)
- `driverId` (string, opcional — solo admin puede filtrar por otros choferes)
- `companyId` (string, opcional)
- `from` (date ISO, opcional)
- `to` (date ISO, opcional)

**Permisos:**
- CHOFER: solo ve sus propias órdenes
- RECEPCION: ve órdenes con status `EN_TRANSITO`
- ADMIN: ve todas

**Respuesta:** `{ data: PickupOrder[], total: number, page: number }`

---

### POST /api/ordenes
Crea una nueva orden de retiro.

**Cuerpo:**
- `companyId` (string, requerido)
- `notes` (string, opcional)

**Acción:** Genera `orderCode` único, asigna `driverId` del usuario autenticado.  
**Permisos:** Solo CHOFER.  
**Respuesta:** `{ order: PickupOrder }`

---

### GET /api/ordenes/[id]
Retorna el detalle completo de una orden: items, evidencias, discrepancias, firma.

**Permisos:**
- CHOFER: solo si es su propia orden
- RECEPCION: cualquier orden en tránsito
- ADMIN: cualquier orden

---

### PATCH /api/ordenes/[id]
Actualiza una orden existente.

**Cuerpo (campos opcionales):**
- `status` (enum)
- `clientSignerName` (string)
- `signatureImagePath` (string)
- `pickupLat` (float)
- `pickupLng` (float)
- `notes` (string)
- `items` (array de OrderItem — reemplaza los items existentes si se envía)
- `receivedItems` (array `{itemId, receivedQuantity}` — solo RECEPCION)

**Reglas de negocio:**
- Solo se puede modificar una orden que no esté `CERRADA`
- El cambio de status debe seguir las transiciones válidas (ver FLUJOS_DE_USUARIO.md)
- Si el status cambia a `EN_TRANSITO`, se registra `pickupAt` automáticamente
- Si se envían `receivedItems`, se calcula la discrepancia automáticamente

---

## Evidencias (Fotos)

### POST /api/evidencias
Sube una foto y la asocia a una orden.

**Cuerpo:** `multipart/form-data`
- `file` (imagen, requerido)
- `orderId` (string, requerido)
- `stage` (enum EvidenceStage: RETIRO | RECEPCION, requerido)
- `lat` (float, opcional)
- `lng` (float, opcional)

**Acciones:**
- Valida tipo de archivo (solo jpg/png/webp)
- Comprime si supera 1MB
- Guarda en `/public/uploads/{orderId}/{timestamp}_{random}.jpg`
- Registra timestamp del servidor (no confiar en el del cliente)

**Permisos:**
- CHOFER: solo stage RETIRO en sus propias órdenes
- RECEPCION: solo stage RECEPCION en órdenes EN_TRANSITO

### DELETE /api/evidencias/[id]
Elimina una foto. Solo ADMIN o el dueño de la orden si está en BORRADOR/EN_RETIRO.

---

## Discrepancias

### GET /api/discrepancias
Lista discrepancias. Solo ADMIN.

**Query params:** `status`, `severity`, `driverId`, `from`, `to`, `page`

### PATCH /api/discrepancias/[id]
Actualiza el estado de una discrepancia.

**Cuerpo:**
- `status` (enum DiscrepancyStatus)
- `resolutionNotes` (string, requerido si status = RESUELTA)

**Permisos:** Solo ADMIN.

---

## Usuarios

### GET /api/usuarios
Lista usuarios. Solo ADMIN.  
**Query params:** `role`, `active`

### POST /api/usuarios
Crea un usuario nuevo. Solo ADMIN.

**Cuerpo:**
- `name` (string, requerido)
- `email` (string, requerido)
- `role` (enum UserRole, requerido)
- `password` (string, requerido — se hashea con bcrypt)

### PATCH /api/usuarios/[id]
Edita un usuario. Solo ADMIN.  
Campos: `name`, `email`, `active`, `password` (opcional, si se envía se rehashea).

---

## Empresas

### GET /api/empresas
Lista empresas. ADMIN y CHOFER (el chofer las necesita para el selector).  
**Query params:** `active` (default true)

### POST /api/empresas
Crea empresa. Solo ADMIN.

### PATCH /api/empresas/[id]
Edita empresa. Solo ADMIN.

---

## Reportes

### GET /api/reportes/ordenes
Retorna resumen de órdenes para el período indicado. Solo ADMIN.

**Query params:** `from`, `to`, `driverId`, `companyId`  
**Respuesta:** `{ totalOrdenes, totalPorEstado, totalPorMaterial, totalDiscrepancias }`

### GET /api/reportes/chofer/[id]
Historial y estadísticas de un chofer. Solo ADMIN.

### GET /api/reportes/discrepancias/export
Exporta CSV de discrepancias. Solo ADMIN.  
**Query params:** `from`, `to`, `status`, `severity`  
**Respuesta:** `text/csv`

---

## Generación de códigos de orden

El `orderCode` se genera en el servidor al crear la orden:
- Formato: `RET-{AÑO}-{NUMERO_CORRELATIVO_4_DIGITOS}`
- Ejemplo: `RET-2026-0001`, `RET-2026-0042`
- El correlativo es global (no por chofer ni empresa)
- Se implementa con una transacción de base de datos para evitar duplicados
