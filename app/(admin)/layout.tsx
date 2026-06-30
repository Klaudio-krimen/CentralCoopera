import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import AdminSidebar from '@/components/ui/AdminSidebar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/login')

  const discrepanciasCount = await prisma.discrepancy.count({
    where: { status: 'PENDIENTE' },
  })

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex">
      <AdminSidebar
        userName={session.user.name ?? ''}
        email={session.user.email ?? ''}
        discrepanciasCount={discrepanciasCount}
      />
      <main className="flex-1 min-w-0 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
