# Inventario EPP — Elementos de Protección Personal

La categoría de datos es `EPP` y en pantalla aparece como **EPP — Elementos de Protección
Personal**. Cada artículo conserva su nombre, marca, formato, color, cantidad, condición y
movimientos como cualquier otro ítem de bodega.

## Artículos frecuentes

- Antiparras y lentes de seguridad.
- Cascos de seguridad y barboquejos.
- Tapones auditivos y orejeras.
- Chalecos, poleras, polerones y chaquetas reflectantes.
- Zapatos, botines y botas de seguridad.
- Guantes de seguridad y anticorte.
- Protectores faciales, mascarillas, respiradores y filtros.
- Arnés, línea de vida y cabo de vida.
- Overoles y buzos de protección, rodilleras y protector solar.

El formulario ofrece estos nombres como sugerencias al seleccionar EPP; se pueden escribir otros
artículos afines. La aplicación reconoce palabras clave en nombres sin distinguir mayúsculas,
tildes ni separadores.

## Clasificación

Las altas, ediciones e importaciones detectan EPP en el servidor. Cuando el nombre corresponde a un
elemento de protección personal, `EPP` prevalece sobre la categoría enviada por el navegador o la
planilla. La importación muestra la categoría prevista antes de confirmar.

Para reclasificar filas ya existentes, primero respalda la base y aplica el schema de Prisma según
el procedimiento del repositorio. Después inspecciona el listado del modo de prueba y sólo aplica
los cambios tras revisarlo:

```bash
npm run backfill:epp-inventario -- --dry-run
npm run backfill:epp-inventario -- --apply
```

El primer comando es de solo lectura. El segundo actualiza únicamente el campo `category`; no crea
artículos ni inventa cantidades. La tarea INV-001 queda pendiente de aplicar el schema y ejecutar
el backfill sobre la base correspondiente.
