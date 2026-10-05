import { describe, it, expect } from "vitest";
import {
  serializeEmployee,
  serializeSupplier,
  serializeAuditLog,
  serializeTransaction,
  type EmployeeParaSerializar,
  type SupplierParaSerializar,
} from "./serialize";

const empleado: EmployeeParaSerializar = {
  id: "emp1",
  fullName: "Juan Pérez",
  rut: "12345678-5",
  email: "juan@example.com",
  phone: "+56911111111",
  status: "ACTIVO",
  hiredAt: new Date("2026-01-01"),
  terminatedAt: null,
  baseSalary: 800000,
  afp: "Modelo",
  health: "Fonasa",
  bankName: "Banco Estado",
  bankAccountType: "VISTA",
  bankAccountEnc: "v1:iv:tag:ct",
  bankAccountLast4: "6789",
  userId: null,
  purgedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const proveedor: SupplierParaSerializar = {
  id: "sup1",
  name: "Ferretería El Tornillo",
  rut: "76.543.210-1",
  email: "contacto@eltornillo.cl",
  phone: "+56922222222",
  bankName: "Banco de Chile",
  bankAccountEnc: "v1:iv:tag:ct",
  bankAccountLast4: "4321",
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const marcela = { role: "FINANZAS", moduleAccess: ["FINANZAS"] };
const elizabeth = { role: "ADMIN", moduleAccess: ["FINANZAS_LECTURA"] };
const adminSinGrant = { role: "ADMIN", moduleAccess: [] };
const sinModulos = { role: "CHOFER", moduleAccess: [] };

describe("salida de transacciones y auditoría", () => {
  const audit = {
    action: "EDITAR",
    before: {
      rut: "12345678-K",
      email: "private@example.com",
      phone: "123",
      address: "Privada",
      bankAccountLast4: "4567",
      nested: [{ password: "hash", bankAccountEnc: "cipher" }],
    },
    after: null,
  };
  it("proyecta proveedor y categoría aunque la entrada incluya más datos", () => {
    const fila = {
      amount: 1500,
      supplier: proveedor,
      category: { id: "cat", name: "Insumos", extra: "privado" },
    };
    expect(serializeTransaction(fila)).toEqual({
      amount: 1500,
      supplier: { id: "sup1", name: proveedor.name },
      category: { id: "cat", name: "Insumos" },
    });
  });
  it("enmascara contactos para lectura y elimina secretos anidados sin mutar el original", () => {
    const resultado = serializeAuditLog(audit, elizabeth);
    expect(resultado.before).toMatchObject({
      rut: "12.***.***-K",
      email: "[enmascarado]",
      phone: "[enmascarado]",
      address: "[enmascarado]",
      bankAccountLast4: "[enmascarado]",
      nested: [{}],
    });
    expect(audit.before.email).toBe("private@example.com");
    expect(JSON.stringify(resultado)).not.toContain("cipher");
  });
  it("escritura ve contactos vigentes, pero no los de una entidad purgada", () => {
    expect(serializeAuditLog(audit, marcela).before).toMatchObject({
      email: "private@example.com",
    });
    expect(serializeAuditLog(audit, marcela, true).before).toMatchObject({
      email: "[enmascarado]",
    });
  });
});

describe("serializeEmployee", () => {
  it("FINANZAS_LECTURA recibe el RUT enmascarado como 12.345.***-*", () => {
    const resultado = serializeEmployee(empleado, elizabeth);
    expect(resultado.rut).toBe("12.345.***-*");
  });

  it("FINANZAS recibe el RUT completo y bankAccountLast4", () => {
    const resultado = serializeEmployee(empleado, marcela);
    expect(resultado.rut).toBe("12345678-5");
    expect(resultado.bankAccountLast4).toBe("6789");
    expect(resultado.bankName).toBe("Banco Estado");
    expect(resultado.bankAccountType).toBe("VISTA");
  });

  it.each([
    ["FINANZAS", marcela],
    ["FINANZAS_LECTURA", elizabeth],
    ["ADMIN sin grant", adminSinGrant],
    ["sin ningún módulo", sinModulos],
  ])("%s nunca recibe bankAccountEnc", (_nombre, viewer) => {
    const resultado = serializeEmployee(empleado, viewer);
    expect(resultado).not.toHaveProperty("bankAccountEnc");
    expect(JSON.stringify(resultado)).not.toContain("v1:iv:tag:ct");
  });

  it("un lector (FINANZAS_LECTURA) no recibe bankName ni bankAccountType", () => {
    const resultado = serializeEmployee(empleado, elizabeth);
    expect(resultado).not.toHaveProperty("bankName");
    expect(resultado).not.toHaveProperty("bankAccountType");
    expect(resultado.bankAccountLast4).toBe("6789");
  });

  it("un ADMIN sin grant también recibe la vista de sólo lectura (enmascarada)", () => {
    const resultado = serializeEmployee(empleado, adminSinGrant);
    expect(resultado).not.toHaveProperty("bankName");
    expect(resultado.rut).not.toBe(empleado.rut);
  });
});

describe("serializeSupplier", () => {
  it("FINANZAS_LECTURA omite bankName y recibe sólo bankAccountLast4", () => {
    const resultado = serializeSupplier(proveedor, elizabeth);
    expect(resultado).not.toHaveProperty("bankName");
    expect(resultado.bankAccountLast4).toBe("4321");
  });

  it("FINANZAS recibe bankName", () => {
    const resultado = serializeSupplier(proveedor, marcela);
    expect(resultado.bankName).toBe("Banco de Chile");
  });

  it("nunca devuelve bankAccountEnc, sin importar el viewer", () => {
    for (const viewer of [marcela, elizabeth, adminSinGrant, sinModulos]) {
      const resultado = serializeSupplier(proveedor, viewer);
      expect(resultado).not.toHaveProperty("bankAccountEnc");
    }
  });
});
