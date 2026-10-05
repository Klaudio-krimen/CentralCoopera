export const SESSION_SHORT_MS = 8 * 60 * 60 * 1000;
export const SESSION_LONG_MS = 7 * 24 * 60 * 60 * 1000;

export function calcularVencimiento({
  ahora,
  recordar,
  moduleAccess,
  role,
}: {
  ahora: number;
  recordar: boolean;
  moduleAccess: readonly string[];
  role?: string;
}) {
  const finanzas =
    role === "FINANZAS" ||
    moduleAccess.some((m) => m === "FINANZAS" || m === "FINANZAS_LECTURA");
  return ahora + (recordar && !finanzas ? SESSION_LONG_MS : SESSION_SHORT_MS);
}

export function sesionVencida({
  ahora,
  sessionExpiresAt,
  passwordChangedAt,
  passwordVersion,
  iat,
  authenticatedAt,
}: {
  ahora: number;
  sessionExpiresAt?: number;
  passwordChangedAt?: Date | null;
  passwordVersion?: number | null;
  iat?: number;
  authenticatedAt?: number;
}) {
  if (!Number.isFinite(sessionExpiresAt) || ahora >= sessionExpiresAt!)
    return true;
  // También detecta un cambio que confirmó después de emitir JWT pero cuya fecha
  // se tomó antes: evita la ventana entre timestamp y commit de la transacción.
  if (
    passwordVersion !== undefined &&
    passwordVersion !== (passwordChangedAt?.getTime() ?? null)
  )
    return true;
  const inicio =
    authenticatedAt ?? (iat === undefined ? undefined : iat * 1000);
  if (!Number.isFinite(inicio)) return true;
  return (
    passwordChangedAt != null &&
    (!Number.isFinite(passwordChangedAt.getTime()) ||
      passwordChangedAt.getTime() > inicio!)
  );
}
