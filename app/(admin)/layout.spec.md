# Layout: Administración

**Aplica a:** Rutas bajo `(admin)/`  
**Acceso:** Roles ADMIN, VENTAS, BODEGA y FINANZAS; módulos según permisos explícitos.

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

- La sesión y el rol se verifican en el layout; middleware y handlers conservan sus reglas de acceso.
- En mobile, el sidebar colapsa en un menú hamburguesa
- El badge de discrepancias se actualiza cada vez que el layout se monta
- El shell se organiza en columna en móvil y en fila desde 1024 px.
- El encabezado móvil incluye el acceso al menú; escritorio conserva el sidebar con scroll interno.
- Detalle vigente de módulos y navegación: `components/ui/AdminSidebar.spec.md`.
