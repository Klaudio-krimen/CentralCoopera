import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import RecepcionNav from '@/components/ui/RecepcionNav'

export default async function RecepcionLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'RECEPCION' && session.user.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-[100dvh] bg-zinc-50">
      <RecepcionNav userName={session.user.name ?? ''} />
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
