export interface OperationsActor {
  id: string;
  role: string;
  moduleAccess: readonly string[];
}

const ORDER_STATUSES = new Set([
  "BORRADOR",
  "EN_RETIRO",
  "EN_TRANSITO",
  "RECIBIDA",
  "DISCREPANCIA",
  "CERRADA",
]);

export function hasOperationsAccess(actor: OperationsActor): boolean {
  return (
    actor.role === "ADMIN" ||
    actor.role === "CHOFER" ||
    actor.role === "RECEPCION" ||
    actor.moduleAccess.includes("OPERACIONES")
  );
}

export function canAccessOrder(
  actor: OperationsActor,
  driverId: string
): boolean {
  return (
    hasOperationsAccess(actor) &&
    (actor.role !== "CHOFER" || actor.id === driverId)
  );
}

export function canCreatePickupOrder(actor: OperationsActor): boolean {
  return hasOperationsAccess(actor) && actor.role === "CHOFER";
}

export function canReceivePickupOrder(actor: OperationsActor): boolean {
  return (
    hasOperationsAccess(actor) &&
    (actor.role === "RECEPCION" || actor.role === "ADMIN")
  );
}

export function canEditPickupItems(
  actor: OperationsActor,
  driverId: string,
  status: string
): boolean {
  if (!hasOperationsAccess(actor) || status !== "EN_RETIRO") return false;
  return (
    actor.role === "ADMIN" || (actor.role === "CHOFER" && actor.id === driverId)
  );
}

export function canUpdatePickupStatus(
  actor: OperationsActor,
  driverId: string,
  currentStatus: string,
  nextStatus: string
): boolean {
  if (!hasOperationsAccess(actor) || !ORDER_STATUSES.has(nextStatus))
    return false;
  if (actor.role === "ADMIN") return true;
  return (
    actor.role === "CHOFER" &&
    actor.id === driverId &&
    currentStatus === "EN_RETIRO" &&
    nextStatus === "EN_TRANSITO"
  );
}

export function canUploadEvidence(
  actor: OperationsActor,
  driverId: string,
  status: string,
  stage: "RETIRO" | "RECEPCION"
): boolean {
  if (!hasOperationsAccess(actor)) return false;
  if (stage === "RETIRO") {
    return (
      actor.role === "CHOFER" && actor.id === driverId && status === "EN_RETIRO"
    );
  }
  if (actor.role === "RECEPCION") return status === "EN_TRANSITO";
  return (
    actor.role === "ADMIN" &&
    ["EN_TRANSITO", "RECIBIDA", "DISCREPANCIA"].includes(status)
  );
}

export function canDeleteEvidence(
  actor: OperationsActor,
  driverId: string,
  uploadedById: string,
  orderStatus: string
): boolean {
  if (!hasOperationsAccess(actor)) return false;
  if (actor.role === "ADMIN") return true;
  return (
    actor.role === "CHOFER" &&
    actor.id === driverId &&
    actor.id === uploadedById &&
    ["BORRADOR", "EN_RETIRO"].includes(orderStatus)
  );
}

export function canListCompanies(actor: OperationsActor): boolean {
  return (
    actor.role === "CHOFER" ||
    actor.role === "ADMIN" ||
    actor.moduleAccess.includes("CRM")
  );
}
