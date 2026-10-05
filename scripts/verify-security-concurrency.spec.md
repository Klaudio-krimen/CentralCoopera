# QA de concurrencia de seguridad

`npm run qa:security-concurrency` requiere `DATABASE_URL` ya cargada en el shell.
Sólo acepta host loopback y base `coopera_qa_*`, creada para pruebas y con schema vigente.
No carga `.env.local` ni permite ejecutarse contra una URL remota.

Comprueba con transacciones Prisma reales: 20 entradas sin pérdidas, 12 salidas competidoras
con seis rechazos por stock insuficiente, ajustes y entradas con historial continuo, precisión
del stock previo decimal y diez canjes del mismo token con un solo ganador. Los demás enlaces
del usuario quedan inutilizables. El comando falla si alguna aserción no se cumple.

Genera IDs únicos y elimina exclusivamente sus propios datos sintéticos al cerrar.
No lee ni modifica auditorías. No forma parte de Vitest porque necesita PostgreSQL disponible.
