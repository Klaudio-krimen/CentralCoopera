import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import UsuarioActions from "@/components/ui/UsuarioActions";
import NuevoUsuarioModal from "@/components/ui/NuevoUsuarioModal";
import {
  UserCirclePlus,
  Users,
  Truck,
  Storefront,
  Package,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";

async function getByRole(role: "CHOFER" | "RECEPCION" | "VENTAS" | "BODEGA") {
  return prisma.user.findMany({
    where: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      moduleAccess: true,
      isActive: true,
      createdAt: true,
      _count: { select: { ordersAsDriver: true } },
    },
    orderBy: { name: "asc" },
  });
}

export default async function EquipoPage() {
  const [choferes, recepcionistas, ventas, bodega] = await Promise.all([
    getByRole("CHOFER"),
    getByRole("RECEPCION"),
    getByRole("VENTAS"),
    getByRole("BODEGA"),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Equipo
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {choferes.length} chofer{choferes.length !== 1 ? "es" : ""} ·{" "}
            {recepcionistas.length} recepcionista
            {recepcionistas.length !== 1 ? "s" : ""} · {ventas.length} venta
            {ventas.length !== 1 ? "s" : ""} · {bodega.length} bodega
          </p>
        </div>
        <NuevoUsuarioModal />
      </div>

      <Section title="Choferes" icon={Truck} count={choferes.length}>
        {choferes.length === 0 ? (
          <EmptySection label="Sin choferes registrados" />
        ) : (
          <UserTable users={choferes} showOrderCount />
        )}
      </Section>

      <Section
        title="Recepcionistas"
        icon={Users}
        count={recepcionistas.length}
      >
        {recepcionistas.length === 0 ? (
          <EmptySection label="Sin recepcionistas registrados" />
        ) : (
          <UserTable users={recepcionistas} />
        )}
      </Section>

      <Section title="Ventas (CRM)" icon={Storefront} count={ventas.length}>
        {ventas.length === 0 ? (
          <EmptySection label="Sin encargadas de ventas registradas" />
        ) : (
          <UserTable users={ventas} />
        )}
      </Section>

      <Section title="Bodega (Inventario)" icon={Package} count={bodega.length}>
        {bodega.length === 0 ? (
          <EmptySection label="Sin bodegueros registrados" />
        ) : (
          <UserTable users={bodega} />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: any;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
        <span className="text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-full tabular-nums">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="panel px-5 py-8 text-center">
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function UserTable({
  users,
  showOrderCount = false,
}: {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    moduleAccess: string[];
    isActive: boolean;
    createdAt: Date;
    _count: { ordersAsDriver: number };
  }[];
  showOrderCount?: boolean;
}) {
  return (
    <div className="panel overflow-hidden">
      {/* Head */}
      <div
        className={`grid ${showOrderCount ? "grid-cols-[1fr_1.5fr_80px_80px_100px]" : "grid-cols-[1fr_1.5fr_80px_100px]"} gap-4 px-5 py-3 border-b border-zinc-100 bg-zinc-50/60`}
      >
        {["Nombre", "Email", showOrderCount && "Órdenes", "Estado", "Acciones"]
          .filter(Boolean)
          .map((h) => (
            <p
              key={h as string}
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider"
            >
              {h}
            </p>
          ))}
      </div>

      <div className="divide-y divide-zinc-100">
        {users.map((user) => (
          <div
            key={user.id}
            className={`grid ${showOrderCount ? "grid-cols-[1fr_1.5fr_80px_80px_100px]" : "grid-cols-[1fr_1.5fr_80px_100px]"} gap-4 px-5 py-3.5 items-center`}
          >
            <div>
              <p className="text-sm font-medium text-zinc-900">{user.name}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Desde {formatDate(user.createdAt)}
              </p>
            </div>

            <p className="text-sm text-zinc-500 truncate">{user.email}</p>

            {showOrderCount && (
              <p className="text-sm font-mono tabular-nums text-zinc-700 text-center">
                {user._count.ordersAsDriver}
              </p>
            )}

            <div className="flex items-center gap-1.5">
              {user.isActive ? (
                <>
                  <CheckCircle
                    size={14}
                    weight="fill"
                    className="text-emerald-500"
                  />
                  <span className="text-xs text-emerald-700">Activo</span>
                </>
              ) : (
                <>
                  <XCircle size={14} weight="fill" className="text-zinc-400" />
                  <span className="text-xs text-zinc-500">Inactivo</span>
                </>
              )}
            </div>

            <UsuarioActions user={user} />
          </div>
        ))}
      </div>
    </div>
  );
}
