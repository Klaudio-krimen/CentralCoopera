import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AdminSidebar from '@/components/ui/AdminSidebar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex">
      <AdminSidebar userName={session.user.name ?? ''} email={session.user.email ?? ''} />
      <main className="flex-1 min-w-0 px-6 py-8 lg:px-10">{children}</main>
    </div>
  )
}
