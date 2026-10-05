# Política de autorización de Operaciones

**Archivo:** `lib/operations/authorization.ts`

- Contiene funciones puras: recibe actor, propietario, estado y acción; no accede a Prisma ni al
  sistema de archivos.
- ADMIN, CHOFER, RECEPCION y usuarios con acceso OPERACIONES tienen el alcance de lectura definido.
- CHOFER consulta, crea y modifica exclusivamente órdenes propias y dentro de las etapas permitidas.
- RECEPCION/ADMIN registra recepción; la transición de CHOFER a tránsito queda limitada a su orden.
- La carga y eliminación de evidencias valida rol, dueño, etapa y estado.
- Usuarios CRM pueden listar empresas para CRM; CHOFER recibe el selector mínimo de Operaciones.
- Los casos permitidos y denegados están cubiertos por `authorization.test.ts`.
