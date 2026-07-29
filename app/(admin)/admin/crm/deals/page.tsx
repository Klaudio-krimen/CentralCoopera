import { prisma } from '@/lib/db'
import { Plus } from 'lucide-react'
import DealsTable from '@/components/crm/DealsTable'
import DealModal from '@/components/ui/DealModal'

async function getData() {
  const [deals, companies] = await Promise.all([
    prisma.deal.findMany({
      include: {
        company: { select: { name: true } },
        contact: { select: { name: true } },
        stage: { select: { name: true, color: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        contacts: { where: { isActive: true }, select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])
  return { deals, companies }
}

export default async function DealsPage() {
  const { deals, companies } = await getData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Deals</h1>
          <p className="text-crm-muted text-sm mt-1">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <DealModal
          empresas={companies}
          trigger={
            <button className="crm-btn-primary">
              <Plus className="h-4 w-4" />
              Nuevo Deal
            </button>
          }
        />
      </div>

      <DealsTable deals={deals as any} />
    </div>
  )
}
