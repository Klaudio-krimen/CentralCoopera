# Navegación administrativa

- Usa los permisos de sesión recibidos: ADMIN conserva el acceso a Operaciones, CRM e
  Inventario; Finanzas siempre exige `hasFinanceAccess`, también para ADMIN.
- Desde 1024 px presenta un sidebar fijo al hacer scroll, con altura de viewport y scroll interno.
- Por debajo de 1024 px presenta encabezado y botón "Abrir menú de navegación" de 44 px.
  El menú es un diálogo lateral de Base UI con título, Escape, captura/restauración de foco y
  bloqueo del fondo. Se cierra al seguir un enlace, cambiar de ruta o pasar a escritorio.
- Móvil y escritorio comparten la definición de enlaces, módulos, usuario y cierre de sesión.
- Los módulos son enlaces dentro de una navegación, no tabs. Se distribuyen en dos columnas.
- La ruta determina el módulo activo desde el primer render. La sección activa usa
  `aria-current="page"`; los módulos usan `aria-current="location"`.
- El resumen financiero solo queda activo en `/admin/finanzas`. Las fichas conservan
  activa su sección correspondiente, sin confundir prefijos similares.
- Todos los controles tienen foco visible; los iconos decorativos se ocultan a lectores.
- Drawer de 200 ms y fondo de 150 ms; movimiento reducido elimina ambas transiciones.

## Marca AUD-002

BrandLogo circular oficial de 32 px junto al nombre, sin envoltorio esmeralda ni Recycle genérico.
