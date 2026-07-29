import { prisma } from '@/lib/db'
import { ensurePipelineStages } from '@/lib/pipeline'
import KPICards from '@/components/crm/KPICards'
import PipelineChart from '@/components/crm/PipelineChart'
import RecentActivity from '@/components/crm/RecentActivity'
import NotificationBanner from '@/components/crm/NotificationBanner'

async function getDashboardData() {
  await ensurePipelineStages()

  const [totalContacts, hotLeads, openDeals, stages, recentActivities] = await Promise.all([
    prisma.contact.count({ where: { isActive: true } }),
    prisma.contact.count({ where: { isActive: true, temperature: 'CALIENTE' } }),
    prisma.deal.findMany({
      where: { stage: { isWon: false, isLost: false } },
      select: { value: true },
    }),
    prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { deals: true } } },
    }),
    prisma.activity.findMany({
      include: {
        contact: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    stats: {
      totalContacts,
      hotLeads,
      activeDeals: openDeals.length,
      pipelineValue: openDeals.reduce((sum, d) => sum + d.value, 0),
    },
    chartData: stages.map((s) => ({ name: s.name, count: s._count.deals, color: s.color })),
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      contactName: a.contact?.name ?? null,
      companyName: a.company.name,
      createdAt: a.createdAt,
    })),
  }
}

export default async function CrmDashboardPage() {
  const { stats, chartData, recentActivities } = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-crm-foreground">Dashboard</h1>
        <p className="text-crm-muted text-sm mt-1">Resumen de ventas y actividad comercial</p>
      </div>

      <NotificationBanner />

      <KPICards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineChart data={chartData} />
        </div>
        <RecentActivity items={recentActivities} />
      </div>
    </div>
  )
}
