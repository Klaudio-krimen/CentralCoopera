# Destino inicial `/`

Valida sesión con getServerSession. Sin sesión, redirige a login. CHOFER/RECEPCION/ADMIN:
dashboard propio; VENTAS: CRM; BODEGA: stock. FINANZAS: `/admin/finanzas` sólo si tiene
hasFinanceAccess, sin bypass por rol. Roles desconocidos o Finanzas sin permiso vuelven a login.
