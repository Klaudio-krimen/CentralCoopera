import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { resumirPeriodo, agruparPorCategoria } from "@/lib/finanzas/reportes";
import GraficoCategorias from "./GraficoCategorias";

function limitesDelMesActual() {
  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const hasta = new Date(
    ahora.getFullYear(),
    ahora.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { desde, hasta };
}

export default async function ResumenFinanzasPage() {
  const { desde, hasta } = limitesDelMesActual();

  const transacciones = await prisma.financeTransaction.findMany({
    where: { date: { gte: desde, lte: hasta } },
    include: { category: { select: { name: true } } },
  });

  const resumen = resumirPeriodo(transacciones);
  const categorias = agruparPorCategoria(transacciones).map((c) => ({
    nombre: c.nombre,
    monto: c.monto,
  }));

  const mesLabel = desde.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <p className="mb-4 text-sm text-[#475569]">
        Resumen de <span className="capitalize">{mesLabel}</span>
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <p className="text-[12px] font-medium tracking-[0.04em] text-[#475569] uppercase">
            Ingresos
          </p>
          <p className="mt-1 font-mono text-[20px] tabular-nums font-semibold text-[#15803D]">
            + {formatCurrency(resumen.ingresos)}
          </p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <p className="text-[12px] font-medium tracking-[0.04em] text-[#475569] uppercase">
            Egresos
          </p>
          <p className="mt-1 font-mono text-[20px] tabular-nums font-semibold text-[#B91C1C]">
            − {formatCurrency(resumen.egresos)}
          </p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <p className="text-[12px] font-medium tracking-[0.04em] text-[#475569] uppercase">
            Saldo
          </p>
          <p
            className={`mt-1 font-mono text-[20px] tabular-nums font-semibold ${
              resumen.saldo >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"
            }`}
          >
            {resumen.saldo >= 0 ? "+ " : "− "}
            {formatCurrency(Math.abs(resumen.saldo))}
          </p>
        </div>
      </div>

      <GraficoCategorias data={categorias} />
    </div>
  );
}
