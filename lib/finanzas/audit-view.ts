import { serializeAuditLog } from "./serialize";

interface ClienteEstadoEmpleado {
  employee: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; purgedAt: true };
    }): Promise<{ id: string; purgedAt: Date | null }[]>;
  };
}

/** Consulta el estado actual: también enmascara instantáneas anteriores a la purga. */
export async function serializarAuditorias<
  T extends {
    entityType: string;
    entityId: string | null;
    before: unknown;
    after: unknown;
    action: string;
  },
>(
  cliente: ClienteEstadoEmpleado,
  filas: T[],
  viewer: { role: string; moduleAccess: string[] }
) {
  const ids = Array.from(
    new Set(
      filas
        .filter((f) => f.entityType === "Employee" && f.entityId)
        .map((f) => f.entityId!)
    )
  );
  const empleados = ids.length
    ? await cliente.employee.findMany({
        where: { id: { in: ids } },
        select: { id: true, purgedAt: true },
      })
    : [];
  const estados = new Map(empleados.map((e) => [e.id, e.purgedAt]));
  return filas.map((fila) =>
    serializeAuditLog(
      fila,
      viewer,
      fila.entityType === "Employee" &&
        (!fila.entityId ||
          !estados.has(fila.entityId) ||
          estados.get(fila.entityId) != null)
    )
  );
}
