// Esquemas zod de entrada para las rutas de /api/finanzas (ver blueprint §5).
// Todo handler valida con esto antes de tocar la base. Montos: entero
// positivo, nunca decimal — el CLP no tiene centavos.

import { z } from "zod";

export const montoSchema = z.number().int().positive();

export const bankAccountTypeSchema = z.enum([
  "CORRIENTE",
  "VISTA",
  "AHORRO",
  "RUT",
]);

export const employeeStatusSchema = z.enum(["ACTIVO", "DESVINCULADO"]);

export const transactionKindSchema = z.enum(["INGRESO", "EGRESO"]);

export const transactionStatusSchema = z.enum([
  "BORRADOR",
  "CONFIRMADO",
  "ANULADO",
]);

export const paymentMethodSchema = z.enum([
  "TRANSFERENCIA",
  "EFECTIVO",
  "CHEQUE",
  "TARJETA",
  "OTRO",
]);

export const advanceStatusSchema = z.enum([
  "PENDIENTE",
  "PAGADO",
  "DESCONTADO",
  "ANULADO",
]);

export const payrollStatusSchema = z.enum(["BORRADOR", "APROBADA", "PAGADA"]);

// ── Trabajadores ────────────────────────────────────────────────────────────

export const crearEmpleadoSchema = z.object({
  fullName: z.string().min(1),
  rut: z.string().min(1),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  hiredAt: z.coerce.date(),
  baseSalary: montoSchema,
  afp: z.string().nullish(),
  health: z.string().nullish(),
  bankName: z.string().nullish(),
  bankAccountType: bankAccountTypeSchema.nullish(),
  bankAccount: z.string().nullish(), // texto plano de entrada; la ruta lo cifra
});

export const editarEmpleadoSchema = crearEmpleadoSchema.partial().extend({
  status: employeeStatusSchema.optional(),
});

// ── Proveedores ─────────────────────────────────────────────────────────────

export const crearProveedorSchema = z.object({
  name: z.string().min(1),
  rut: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  bankName: z.string().nullish(),
  bankAccount: z.string().nullish(),
});

export const editarProveedorSchema = crearProveedorSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Categorías ──────────────────────────────────────────────────────────────

export const crearCategoriaSchema = z.object({
  name: z.string().min(1),
  kind: transactionKindSchema,
});

// ── Transacciones (ingresos y egresos) ──────────────────────────────────────

export const crearTransaccionSchema = z.object({
  kind: transactionKindSchema,
  amount: montoSchema,
  date: z.coerce.date(),
  description: z.string().min(1),
  categoryId: z.string().nullish(),
  supplierId: z.string().nullish(),
  method: paymentMethodSchema,
  reference: z.string().nullish(),
});

export const editarTransaccionSchema = z.object({
  kind: transactionKindSchema.optional(),
  amount: montoSchema.optional(),
  date: z.coerce.date().optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().nullish(),
  supplierId: z.string().nullish(),
  method: paymentMethodSchema.optional(),
  reference: z.string().nullish(),
  status: transactionStatusSchema.optional(),
});

// ── Anticipos ───────────────────────────────────────────────────────────────

export const crearAnticipoSchema = z.object({
  employeeId: z.string().min(1),
  amount: montoSchema,
  requestedAt: z.coerce.date(),
  notes: z.string().nullish(),
});

export const editarAnticipoSchema = z.object({
  status: advanceStatusSchema,
});

// ── Nóminas ─────────────────────────────────────────────────────────────────
// afpAmount/healthAmount no salen de ninguna tabla: Employee.afp/health son
// texto libre (nombre de la AFP/isapre), no una tasa. Marcela los escribe al
// generar cada nómina, una línea por cada trabajador ACTIVO.

export const lineaNominaSchema = z.object({
  employeeId: z.string().min(1),
  afpAmount: z.number().int().nonnegative(),
  healthAmount: z.number().int().nonnegative(),
  otherDeductions: z.number().int().nonnegative().default(0),
});

export const crearNominaSchema = z.object({
  period: z
    .string()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])$/,
      "Formato de período inválido, usa AAAA-MM"
    ),
  lineas: z.array(lineaNominaSchema).min(1),
});

export const editarNominaSchema = z.object({
  status: payrollStatusSchema,
});

// ── Filtros de listado (paginación) ─────────────────────────────────────────

export const filtrosListadoSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
