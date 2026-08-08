import { describe, it, expect, vi } from "vitest";
import { withAudit, mutarConAuditoria, type ClienteAuditoria } from "./audit";

function crearClienteDoble(
  create = vi.fn().mockResolvedValue(undefined)
): ClienteAuditoria {
  return { financeAuditLog: { create } };
}

describe("withAudit", () => {
  it("escribe exactamente una fila con los campos obligatorios presentes", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const tx = crearClienteDoble(create);

    await withAudit(tx, {
      actorEmail: "marcela@cooperapro.cl",
      actorRole: "FINANZAS",
      action: "CREAR",
      entityType: "Employee",
    });

    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data.actorEmail).toBe("marcela@cooperapro.cl");
    expect(data.actorRole).toBe("FINANZAS");
    expect(data.action).toBe("CREAR");
    expect(data.entityType).toBe("Employee");
  });

  it("redacta bankAccountEnc en before y after, nunca el valor original", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const tx = crearClienteDoble(create);

    await withAudit(tx, {
      actorEmail: "marcela@cooperapro.cl",
      actorRole: "FINANZAS",
      action: "EDITAR",
      entityType: "Employee",
      before: { bankAccountEnc: "v1:abc:def:ghi", fullName: "Juan" },
      after: { bankAccountEnc: "v1:xyz:uvw:rst", fullName: "Juan Pérez" },
    });

    const data = create.mock.calls[0][0].data;
    expect(data.before.bankAccountEnc).toBe("[redactado]");
    expect(data.after.bankAccountEnc).toBe("[redactado]");
    expect(data.before.fullName).toBe("Juan");
    expect(JSON.stringify(data)).not.toContain("v1:abc:def:ghi");
    expect(JSON.stringify(data)).not.toContain("v1:xyz:uvw:rst");
  });

  it("redacta password en after", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const tx = crearClienteDoble(create);

    await withAudit(tx, {
      actorEmail: "admin@cooperapro.cl",
      actorRole: "ADMIN",
      action: "CAMBIAR_PERMISOS",
      entityType: "User",
      after: { password: "$2a$12$hashedvalue", moduleAccess: ["FINANZAS"] },
    });

    const data = create.mock.calls[0][0].data;
    expect(data.after.password).toBe("[redactado]");
    expect(data.after.moduleAccess).toEqual(["FINANZAS"]);
  });

  it("lanza si actorEmail viene vacío y no llama a create", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const tx = crearClienteDoble(create);

    await expect(
      withAudit(tx, {
        actorEmail: "",
        actorRole: "FINANZAS",
        action: "CREAR",
        entityType: "Employee",
      })
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it("lanza si action o entityType vienen vacíos", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const tx = crearClienteDoble(create);

    await expect(
      withAudit(tx, {
        actorEmail: "marcela@cooperapro.cl",
        actorRole: "FINANZAS",
        action: "",
        entityType: "Employee",
      })
    ).rejects.toThrow();

    await expect(
      withAudit(tx, {
        actorEmail: "marcela@cooperapro.cl",
        actorRole: "FINANZAS",
        action: "CREAR",
        entityType: "",
      })
    ).rejects.toThrow();

    expect(create).not.toHaveBeenCalled();
  });
});

describe("mutarConAuditoria", () => {
  it("corre la mutación y luego escribe la auditoría en el mismo tx", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const tx = crearClienteDoble(create);
    const mutacion = vi.fn().mockResolvedValue({ id: "abc" });

    const resultado = await mutarConAuditoria(tx, mutacion, {
      actorEmail: "marcela@cooperapro.cl",
      actorRole: "FINANZAS",
      action: "CREAR",
      entityType: "Employee",
      entityId: "abc",
    });

    expect(resultado).toEqual({ id: "abc" });
    expect(mutacion).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("si la escritura de auditoría falla, la promesa se rechaza (aborta la transacción)", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db down"));
    const tx = crearClienteDoble(create);
    const mutacion = vi.fn().mockResolvedValue({ id: "abc" });

    await expect(
      mutarConAuditoria(tx, mutacion, {
        actorEmail: "marcela@cooperapro.cl",
        actorRole: "FINANZAS",
        action: "CREAR",
        entityType: "Employee",
      })
    ).rejects.toThrow("db down");
  });
});
