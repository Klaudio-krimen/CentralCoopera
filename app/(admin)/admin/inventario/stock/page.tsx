import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolverPaginacion, construirMeta } from "@/lib/finanzas/paginacion";
import TablaInventario from "@/components/inventario/TablaInventario";
import ItemFormModal from "@/components/inventario/ItemFormModal";
import ArchivarEliminarBotones from "@/components/inventario/ArchivarEliminarBotones";
import AjustarStockModal from "@/components/ui/AjustarStockModal";
import {
  CATEGORIA_LABEL,
  MEDIDA_LABEL,
  formatearCantidad,
} from "@/components/inventario/types";
import { Package } from "@phosphor-icons/react/dist/ssr";

export default async function StockPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "ADMIN";

  const { take, skip } = resolverPaginacion({});
  const where = { isActive: true };
  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { numero: "asc" },
      take,
      skip,
    }),
    prisma.inventoryItem.count({ where }),
  ]);
  const meta = construirMeta(total, 1, take);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Stock
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {total} ítem{total !== 1 ? "s" : ""} en inventario
          </p>
        </div>
      </div>

      {/* Escritorio: planilla editable en línea. */}
      <div className="hidden md:block">
        <TablaInventario
          initialItems={items}
          initialMeta={meta}
          isAdmin={isAdmin}
        />
      </div>

      {/* Celular: tarjetas + formulario, la tabla de 12 columnas no cabe. */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center gap-2">
          <ItemFormModal />
        </div>

        {items.length === 0 ? (
          <div className="panel text-center py-16 animate-fade-up">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Package size={22} className="text-zinc-400" />
            </div>
            <p className="text-zinc-700 font-medium">Sin ítems registrados</p>
            <p className="text-zinc-500 text-sm mt-1">
              Agrega el primer ítem de stock
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="panel p-4 animate-fade-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                        {item.numero ?? "—"}
                      </span>
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {item.name}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {CATEGORIA_LABEL[item.category] ?? item.category}
                      {item.details ? ` · ${item.details}` : ""}
                      {item.color ? ` · ${item.color}` : ""}
                    </p>
                    {item.measureValue != null && item.measureUnit && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {item.format ? `${item.format} ` : ""}
                        {item.measureValue} {MEDIDA_LABEL[item.measureUnit]}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 font-mono tabular-nums shrink-0">
                    {formatearCantidad(item)}
                  </p>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100">
                  <AjustarStockModal
                    itemId={item.id}
                    itemName={item.name}
                    unit={
                      item.measureUnit ? MEDIDA_LABEL[item.measureUnit] : "un"
                    }
                  />
                  <ItemFormModal item={item} />
                </div>
                {isAdmin && (
                  <div className="mt-2 pt-2 border-t border-zinc-100">
                    <ArchivarEliminarBotones
                      itemId={item.id}
                      itemName={item.name}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
