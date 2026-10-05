import { expect, it } from "vitest";
import { serializarAuditorias } from "./audit-view";
it("enmascara el historial previo de un empleado que hoy está purgado", async () => {
  const filas = [
    {
      entityType: "Employee",
      entityId: "emp",
      action: "EDITAR",
      before: { email: "previo@example.com" },
      after: null,
    },
  ];
  const db = {
    employee: { findMany: async () => [{ id: "emp", purgedAt: new Date() }] },
  };
  expect(
    (
      await serializarAuditorias(db, filas, {
        role: "FINANZAS",
        moduleAccess: ["FINANZAS"],
      })
    )[0].before
  ).toEqual({ email: "[enmascarado]" });
});
