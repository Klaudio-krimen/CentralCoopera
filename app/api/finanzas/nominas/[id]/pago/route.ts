import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { canWriteFinance } from "@/lib/access";
import { descifrar } from "@/lib/finanzas/crypto";
import { withAudit } from "@/lib/finanzas/audit";

// Error tipado para distinguir el status HTTP dentro de la transacción sin
// perderlo al propagar hacia el catch de afuera.
class ErrorPago extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// GET /api/finanzas/nominas/[id]/pago — arma la nómina de pago descifrando
// las cuentas bancarias. La única ruta de todo el módulo que lo hace, y por
// eso exige escritura y no sólo lectura: quien sólo puede leer ve cuánto se
// le paga a cada trabajador en GET /api/finanzas/nominas/[id], nunca el
// número de cuenta.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!canWriteFinance(session.user)) return apiError("Acceso denegado", 403);

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const nomina = await tx.payrollRun.findUnique({
        where: { id: params.id },
        include: {
          items: {
            include: {
              employee: {
                select: {
                  fullName: true,
                  rut: true,
                  bankName: true,
                  bankAccountType: true,
                  bankAccountEnc: true,
                },
              },
            },
          },
        },
      });
      if (!nomina) throw new ErrorPago("No encontrada", 404);

      if (nomina.status !== "APROBADA" && nomina.status !== "PAGADA") {
        throw new ErrorPago(
          "La nómina debe estar aprobada antes de generar el pago",
          409
        );
      }

      const lineas = nomina.items.map((item) => ({
        employeeId: item.employeeId,
        fullName: item.employee.fullName,
        rut: item.employee.rut,
        bankName: item.employee.bankName,
        bankAccountType: item.employee.bankAccountType,
        bankAccount: item.employee.bankAccountEnc
          ? descifrar(item.employee.bankAccountEnc)
          : null,
        netAmount: item.netAmount,
      }));

      const cuentasDescifradas = lineas.filter(
        (l) => l.bankAccount !== null
      ).length;

      // Una fila, con el conteo — jamás las cuentas. Si esto lanza, la
      // transacción aborta entera y no se devuelve nada.
      await withAudit(tx, {
        actorId: session.user.id,
        actorEmail: session.user.email ?? "",
        actorRole: session.user.role,
        action: "DESCIFRAR",
        entityType: "PayrollRun",
        entityId: nomina.id,
        after: { cuentasDescifradas },
      });

      return { period: nomina.period, lineas };
    });

    return NextResponse.json(resultado);
  } catch (e) {
    if (e instanceof ErrorPago) return apiError(e.message, e.status);
    // Un fallo de configuración (falta la clave) y un fallo de datos se
    // diagnostican distinto: el mensaje de descifrar()/cifrar() ya nombra
    // cuál es, nunca lo reemplazamos por uno genérico.
    const mensaje = e instanceof Error ? e.message : "Error al descifrar";
    return apiError(mensaje, 500);
  }
}
