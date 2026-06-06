# Layout: Administración

**Aplica a:** Rutas bajo `(admin)/`  
**Acceso:** Solo usuarios con rol ADMIN

## Propósito
Shell con navegación lateral para el panel de administración.

## Componentes
- Header: logo + nombre del admin + logout
- Sidebar izquierda con menú:
  - Dashboard (inicio)
  - Órdenes
  - Discrepancias (con badge de conteo de pendientes)
  - Choferes
  - Empresas
  - Reportes
- Área de contenido principal (slot)

## Comportamiento
- El middleware verifica rol ADMIN
- En mobile, el sidebar colapsa en un menú hamburguesa
- El badge de discrepancias se actualiza cada vez que el layout se monta
