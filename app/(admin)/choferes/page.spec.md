# Página: Gestión de Choferes

**Ruta:** `/admin/choferes`  
**Acceso:** ADMIN

## Propósito
CRUD de usuarios con rol CHOFER.

## Lista de choferes
- Tabla: Nombre | Email | Estado (Activo/Inactivo) | N° órdenes totales | N° discrepancias
- Botón "Nuevo chofer"

## Crear chofer (modal o página)
- Campos: Nombre, Email, Contraseña temporal
- Al crear, el chofer debe cambiar la contraseña en su primer login (versión futura — en V1 el admin le comunica la contraseña directamente)

## Editar chofer
- Campos: Nombre, Email
- Opción de resetear contraseña (genera nueva contraseña temporal)

## Desactivar chofer
- Confirmación: "¿Desactivar a {nombre}? El chofer no podrá ingresar al sistema. Sus órdenes históricas se conservan."
- No elimina — solo cambia `active = false`

## Ver historial de un chofer
- Link a `/admin/ordenes?driverId={id}` con las órdenes del chofer
