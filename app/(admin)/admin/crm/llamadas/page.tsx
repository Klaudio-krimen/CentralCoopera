import { prisma } from "@/lib/db";
import ListaLlamadas, {
  type LlamadaContacto,
} from "@/components/crm/ListaLlamadas";

// Vista de lista de llamadas del CRM (E2-T6). Server component: consulta
// `prisma` DIRECTO (nunca `fetch` a `/api/llamadas` — esa ruta existe para las
// mutaciones y el filtro del cliente, no para alimentar la página). Pasa los
// contactos con teléfono a `<ListaLlamadas>` (client).
async function getLlamadas() {
  return prisma.contact.findMany({
    where: { phone: { not: null } },
    include: {
      company: { select: { id: true, name: true, segment: true } },
    },
    orderBy: { company: { name: "asc" } },
  });
}

const ESTADOS = [
  { value: "POR_LLAMAR", label: "por llamar" },
  { value: "LLAMADA", label: "llamadas" },
  { value: "SIN_RESPUESTA", label: "sin respuesta" },
  { value: "CORREO_CONSEGUIDO", label: "correo conseguido" },
] as const;

export default async function LlamadasPage() {
  const contactos = await getLlamadas();

  const porEstado = ESTADOS.map((e) => ({
    label: e.label,
    n: contactos.filter((c) => c.callStatus === e.value).length,
  }));
  const sinEstado = contactos.filter((c) => c.callStatus === null).length;

  const resumen =
    contactos.length === 0
      ? "Sin contactos con teléfono todavía"
      : [
          `${contactos.length} con teléfono`,
          ...porEstado.filter((e) => e.n > 0).map((e) => `${e.n} ${e.label}`),
          sinEstado > 0 ? `${sinEstado} sin estado` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">
            Llamadas
          </h1>
          <p className="text-crm-muted text-sm mt-1">{resumen}</p>
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <ListaLlamadas data={contactos as LlamadaContacto[]} />
      </div>
    </div>
  );
}
