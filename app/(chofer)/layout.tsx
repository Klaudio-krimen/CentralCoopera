import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import ChoferHeader from '@/components/ui/ChoferHeader'
import PositionPinger from '@/components/tracking/PositionPinger'

export default async function ChoferLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'CHOFER' && session.user.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col">
      <div className="w-full max-w-[430px] mx-auto flex flex-col flex-1">
        <PositionPinger />
        <ChoferHeader userName={session.user.name ?? 'Chofer'} />
        <main className="flex-1 px-4 pb-28">{children}</main>
      </div>
    </div>
  )
}
