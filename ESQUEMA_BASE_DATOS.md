# Esquema de Base de Datos

## Modelos (Prisma)

---

### User
Usuarios del sistema. Los clientes de empresa NO son usuarios — solo firman en pantalla.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (CUID) | Identificador único |
| name | String | Nombre completo |
| email | String (único) | Email para login |
| password | String | Hash bcrypt |
| role | Enum | CHOFER, RECEPCION, ADMIN |
| active | Boolean | Si está activo (soft delete) |
| createdAt | DateTime | Fecha de creación |
| updatedAt | DateTime | Última actualización |

---

### Company
Empresas cliente de donde se retiran los materiales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (CUID) | Identificador único |
| name | String | Nombre de la empresa |
| address | String | Dirección |
| contactName | String | Nombre del contacto principal |
| contactPhone | String | Teléfono del contacto |
| active | Boolean | Si está activa |
| createdAt | DateTime | Fecha de creación |

---

### MaterialType
Catálogo de tipos de material que se pueden retirar.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (CUID) | Identificador único |
| name | String | Nombre del material (ej: "Cartón", "Plástico PET", "Pallets") |
| unit | Enum | KG, M3, UNIDADES |
| active | Boolean | Si está disponible para selección |

---

### PickupOrder
Orden de retiro — documento central del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (CUID) | Identificador único |
| orderCode | String (único) | Código legible (ej: RET-2026-0001) |
| driverId | String (FK) | Chofer que realiza el retiro |
| companyId | String (FK) | Empresa de donde se retira |
| status | Enum | BORRADOR, EN_RETIRO, EN_TRANSITO, RECIBIDA, DISCREPANCIA, CERRADA |
| pickupAt | DateTime | Cuándo se completó el retiro (con firma) |
| deliveredAt | DateTime? | Cuándo fue recibida en bodega |
| pickupLat | Float? | Latitud GPS del retiro |
| pickupLng | Float? | Longitud GPS del retiro |
| clientSignerName | String? | Nombre de quien firmó por la empresa |
| signatureImagePath | String? | Path a la imagen PNG de la firma |
| notes | String? | Observaciones del chofer |
| createdAt | DateTime | Cuando se creó la orden |
| updatedAt | DateTime | Última actualización |

**Estados de la orden:**
- `BORRADOR` → Chofer inició pero no ha registrado aún
- `EN_RETIRO` → Chofer está en la empresa registrando
- `EN_TRANSITO` → Retiro confirmado con firma, en camino
- `RECIBIDA` → Ingresó a bodega sin problemas
- `DISCREPANCIA` → Diferencia entre declarado y recibido
- `CERRADA` → Investigada y cerrada por admin

---

### OrderItem
Ítems declarados por el chofer en el retiro.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (CUID) | Identificador único |
| orderId | String (FK) | Orden a la que pertenece |
| materialTypeId | String (FK) | Tipo de material |
| declaredQuantity | Float | Cantidad declarada por el chofer |
| receivedQuantity | Float? | Cantidad confirmada por recepción |
| unit | String | Unidad (copiada del MaterialType al momento del retiro) |

---

### Evidence
Evidencias fotográficas asociadas a una orden.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (CUID) | Identificador único |
| orderId | String (FK) | Orden a la que pertenece |
| stage | Enum | RETIRO, RECEPCION |
| imagePath | String | Path relativo a `/public/uploads/` |
| takenAt | DateTime | Timestamp del servidor (no del celular) |
| lat | Float? | Latitud GPS |
| lng | Float? | Longitud GPS |
| uploadedById | String (FK) | Usuario que subió la foto |

---

### Discrepancy
Registro de discrepancias detectadas al recibir una orden.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (CUID) | Identificador único |
| orderId | String (FK) | Orden con discrepancia |
| detectedBy | String (FK) | Usuario recepción que la detectó |
| description | String | Descripción del problema |
| severity | Enum | MENOR (< 5%), MODERADA (5-20%), GRAVE (> 20%) |
| status | Enum | PENDIENTE, EN_INVESTIGACION, RESUELTA |
| resolvedAt | DateTime? | Cuándo fue resuelta |
| resolvedById | String? (FK) | Admin que la resolvió |
| resolutionNotes | String? | Explicación de la resolución |
| createdAt | DateTime | Fecha de creación |

---

## Relaciones

```
User (CHOFER) ─────────┐
                        ├──> PickupOrder <── User (RECEPCION)
Company ───────────────┘          │
                                  ├──> OrderItem ──> MaterialType
                                  ├──> Evidence
                                  └──> Discrepancy
```

---

## Índices recomendados

- `PickupOrder.orderCode` — búsqueda por código
- `PickupOrder.driverId + status` — órdenes activas por chofer
- `PickupOrder.createdAt` — reportes por fecha
- `Discrepancy.status` — alertas pendientes
- `Evidence.orderId` — fotos de una orden

---

## Enums a definir en Prisma

```
enum UserRole { CHOFER RECEPCION ADMIN }
enum PickupOrderStatus { BORRADOR EN_RETIRO EN_TRANSITO RECIBIDA DISCREPANCIA CERRADA }
enum MaterialUnit { KG M3 UNIDADES }
enum EvidenceStage { RETIRO RECEPCION }
enum DiscrepancySeverity { MENOR MODERADA GRAVE }
enum DiscrepancyStatus { PENDIENTE EN_INVESTIGACION RESUELTA }
```

---

## Configuración de Prisma

- Archivo principal: `prisma/schema.prisma`
- Migraciones: `prisma/migrations/`
- Provider de desarrollo: `sqlite`
- Provider de producción: `postgresql` (controlado por `DATABASE_URL`)
- Generador: `prisma-client-js`
