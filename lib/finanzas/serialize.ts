// Punto único de salida de Finanzas. Ninguna ruta devuelve una entidad sin
// pasar por aquí. bankAccountEnc nunca sale, sin importar el viewer.

import { canWriteFinance } from "../access";
import { enmascararRut } from "./rut";

export function serializeTransaction<
  T extends {
    supplier?: { id: string; name: string } | null;
    category?: { id: string; name: string } | null;
  },
>(fila: T) {
  const { supplier, category, ...campos } = fila;
  return {
    ...campos,
    ...(supplier !== undefined
      ? { supplier: supplier ? { id: supplier.id, name: supplier.name } : null }
      : {}),
    ...(category !== undefined
      ? { category: category ? { id: category.id, name: category.name } : null }
      : {}),
  };
}

const CONTACTO_AUDITORIA = new Set([
  "email",
  "phone",
  "address",
  "bankAccountLast4",
]);

function serializarDetalle(valor: unknown, enmascarar: boolean): unknown {
  if (Array.isArray(valor))
    return valor.map((v) => serializarDetalle(v, enmascarar));
  if (valor === null || typeof valor !== "object") return valor;
  const objeto = valor as Record<string, unknown>;
  const purgado = enmascarar || objeto.purgedAt != null;
  const resultado: Record<string, unknown> = {};
  for (const [clave, dato] of Object.entries(objeto)) {
    if (clave === "bankAccountEnc" || clave === "password") continue;
    if (purgado && CONTACTO_AUDITORIA.has(clave)) {
      resultado[clave] = dato == null ? dato : "[enmascarado]";
    } else if (purgado && clave === "rut" && typeof dato === "string") {
      const normalizado = dato.replace(/[^0-9kK]/g, "");
      resultado[clave] =
        normalizado.length >= 2
          ? `${normalizado.slice(0, 2)}.***.***-${normalizado.slice(-1).toUpperCase()}`
          : "[enmascarado]";
    } else {
      resultado[clave] = serializarDetalle(dato, purgado);
    }
  }
  return resultado;
}

export function serializeAuditLog<
  T extends { before: unknown; after: unknown; action: string },
>(fila: T, viewer: Viewer, entidadPurgada = false) {
  const enmascarar =
    !canWriteFinance(viewer) || entidadPurgada || fila.action === "DESVINCULAR";
  return {
    ...fila,
    before: serializarDetalle(fila.before, enmascarar),
    after: serializarDetalle(fila.after, enmascarar),
  };
}

interface Viewer {
  role: string;
  moduleAccess: string[];
}

export interface EmployeeParaSerializar {
  id: string;
  fullName: string;
  rut: string;
  email: string | null;
  phone: string | null;
  status: string;
  hiredAt: Date;
  terminatedAt: Date | null;
  baseSalary: number;
  afp: string | null;
  health: string | null;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountEnc: string | null;
  bankAccountLast4: string | null;
  userId: string | null;
  purgedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeSerializado {
  id: string;
  fullName: string;
  rut: string;
  email: string | null;
  phone: string | null;
  status: string;
  hiredAt: Date;
  terminatedAt: Date | null;
  baseSalary: number;
  afp: string | null;
  health: string | null;
  bankAccountLast4: string | null;
  userId: string | null;
  purgedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bankName?: string | null;
  bankAccountType?: string | null;
}

export interface SupplierParaSerializar {
  id: string;
  name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccountEnc: string | null;
  bankAccountLast4: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** RUT enmascarado y sin bankName/bankAccountType/bankAccountEnc para quien
 *  sólo lee; completo (salvo bankAccountEnc, que nunca sale) para quien
 *  escribe. */
export function serializeEmployee(
  employee: EmployeeParaSerializar,
  viewer: Viewer
): EmployeeSerializado {
  const puedeEscribir = canWriteFinance(viewer);

  const base = {
    id: employee.id,
    fullName: employee.fullName,
    rut: puedeEscribir ? employee.rut : enmascararRut(employee.rut),
    email: employee.email,
    phone: employee.phone,
    status: employee.status,
    hiredAt: employee.hiredAt,
    terminatedAt: employee.terminatedAt,
    baseSalary: employee.baseSalary,
    afp: employee.afp,
    health: employee.health,
    bankAccountLast4: employee.bankAccountLast4,
    userId: employee.userId,
    purgedAt: employee.purgedAt,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };

  if (!puedeEscribir) {
    return base;
  }

  return {
    ...base,
    bankName: employee.bankName,
    bankAccountType: employee.bankAccountType,
  };
}

export interface SupplierSerializado {
  id: string;
  name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  bankAccountLast4: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  bankName?: string | null;
}

export function serializeSupplier(
  supplier: SupplierParaSerializar,
  viewer: Viewer
): SupplierSerializado {
  const puedeEscribir = canWriteFinance(viewer);

  const base = {
    id: supplier.id,
    name: supplier.name,
    rut: supplier.rut,
    email: supplier.email,
    phone: supplier.phone,
    bankAccountLast4: supplier.bankAccountLast4,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };

  if (!puedeEscribir) {
    return base;
  }

  return {
    ...base,
    bankName: supplier.bankName,
  };
}
