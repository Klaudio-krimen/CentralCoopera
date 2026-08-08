// Auditoría transaccional de Finanzas. Sin import de runtime de Prisma: el
// cliente/transacción llega por parámetro con la forma estructural mínima
// que este módulo necesita, lo que permite testear sin base de datos.

export interface EntradaAuditoria {
  actorId?: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export interface ClienteAuditoria {
  financeAuditLog: {
    create(args: { data: EntradaAuditoria }): Promise<unknown>;
  };
}

const CLAVES_SENSIBLES = ["bankAccountEnc", "password"];

function redactar(valor: unknown): unknown {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    return valor;
  }
  const copia: Record<string, unknown> = {
    ...(valor as Record<string, unknown>),
  };
  for (const clave of CLAVES_SENSIBLES) {
    if (clave in copia) {
      copia[clave] = "[redactado]";
    }
  }
  return copia;
}

/** Escribe una fila de FinanceAuditLog. Lanza sin escribir si faltan los
 *  campos obligatorios, y redacta bankAccountEnc/password de before/after
 *  antes de guardar. */
export async function withAudit(
  tx: ClienteAuditoria,
  entrada: EntradaAuditoria
): Promise<void> {
  if (!entrada.actorEmail || !entrada.action || !entrada.entityType) {
    throw new Error(
      "withAudit: actorEmail, action y entityType son obligatorios"
    );
  }

  await tx.financeAuditLog.create({
    data: {
      ...entrada,
      before: redactar(entrada.before),
      after: redactar(entrada.after),
    },
  });
}

/** Corre `mutacion` y luego escribe su auditoría, dentro del mismo `tx`. Si
 *  withAudit lanza, esta promesa se rechaza — y con ella el
 *  prisma.$transaction que la envuelve aborta. */
export async function mutarConAuditoria<T>(
  tx: ClienteAuditoria,
  mutacion: () => Promise<T>,
  entrada: EntradaAuditoria
): Promise<T> {
  const resultado = await mutacion();
  await withAudit(tx, entrada);
  return resultado;
}
