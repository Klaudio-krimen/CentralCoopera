import { prisma } from "@/lib/db";
import NuevaEmpresaModal from "@/components/ui/NuevaEmpresaModal";
import ContactoModal from "@/components/ui/ContactoModal";
import ImportContactsButton from "@/components/crm/ImportContactsButton";
import ClientesConContactos from "@/components/crm/ClientesConContactos";
import { Button } from "@/components/crm/ui/button";
import { UserPlus } from "@phosphor-icons/react/dist/ssr";

async function getEmpresas() {
  return prisma.company.findMany({
    include: {
      _count: { select: { orders: true } },
      contacts: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          phone: true,
          temperature: true,
          score: true,
          source: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export default async function ClientesPage() {
  const empresas = await getEmpresas();
  const activas = empresas.filter((e) => e.isActive);
  const inactivas = empresas.filter((e) => !e.isActive);
  const totalContactos = empresas.reduce(
    (sum, e) => sum + e.contacts.length,
    0
  );
  const empresasActivas = activas.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">
            Clientes
          </h1>
          <p className="text-crm-muted text-sm mt-1">
            {activas.length} activa{activas.length !== 1 ? "s" : ""} ·{" "}
            {inactivas.length} inactiva{inactivas.length !== 1 ? "s" : ""} ·{" "}
            {totalContactos} contacto{totalContactos !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportContactsButton />
          <NuevaEmpresaModal />
          <ContactoModal
            empresas={empresasActivas}
            trigger={
              <Button>
                <UserPlus size={15} />
                Nuevo Contacto
              </Button>
            }
          />
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <ClientesConContactos empresas={empresas as any} />
      </div>
    </div>
  );
}
