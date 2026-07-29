'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock, ArrowRight } from 'lucide-react'

interface Pendiente {
  id: string
}

export default function NotificationBanner() {
  const [overdueCount, setOverdueCount] = useState(0)
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/actividades/pendientes')
      .then((r) => r.json())
      .then((data: { overdue: Pendiente[]; today: Pendiente[] }) => {
        if (cancelled) return
        setOverdueCount(data.overdue?.length ?? 0)
        setTodayCount(data.today?.length ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (overdueCount === 0 && todayCount === 0) return null

  return (
    <div className="space-y-2">
      {overdueCount > 0 && (
        <Link
          href="/admin/crm/actividades"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
        >
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">
            <span className="font-medium">{overdueCount}</span> seguimiento{overdueCount !== 1 ? 's' : ''} vencido{overdueCount !== 1 ? 's' : ''}
          </p>
          <ArrowRight className="h-4 w-4 text-red-600 shrink-0" />
        </Link>
      )}
      {todayCount > 0 && (
        <Link
          href="/admin/crm/actividades"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
        >
          <Clock className="h-4 w-4 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800 flex-1">
            <span className="font-medium">{todayCount}</span> seguimiento{todayCount !== 1 ? 's' : ''} para hoy
          </p>
          <ArrowRight className="h-4 w-4 text-orange-600 shrink-0" />
        </Link>
      )}
    </div>
  )
}
