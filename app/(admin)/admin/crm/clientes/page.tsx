import { prisma } from '@/lib/db'
import NuevaEmpresaModal from '@/components/ui/NuevaEmpresaModal'
import ImportContactsButton from '@/components/crm/ImportContactsButton'
import ClientesConContactos from '@/components/crm/ClientesConContactos'

async function getEmpresas() {
  return prisma.company.findMany({
    include: {
      _count: { select: { orders: true } },
      contacts: {
        where: { isActive: true },
        select: { id: true, name: true, role: true, email: true, phone: true, temperature: true, score: true, source: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export default async function ClientesPage() {
  const empresas = await getEmpresas()
  const activas   = empresas.filter((e) => e.isActive)
  const inactivas = empresas.filter((e) => !e.isActive)
  const totalContactos = empresas.reduce((sum, e) => sum + e.contacts.length, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Clientes</h1>
          <p className="text-crm-muted text-sm mt-1">
            {activas.length} activa{activas.length !== 1 ? 's' : ''} · {inactivas.length} inactiva{inactivas.length !== 1 ? 's' : ''} · {totalContactos} contacto{totalContactos !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportContactsButton />
          <NuevaEmpresaModal />
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
        <ClientesConContactos empresas={empresas as any} />
      </div>
    </div>
  )
}
