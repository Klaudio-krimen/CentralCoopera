'use client'

import { useEffect } from 'react'
import { NOTIFICATIONS_ENABLED_KEY, NOTIFIED_IDS_KEY } from '@/lib/notifications'

const POLL_MS = 3 * 60 * 1000

interface Pendiente {
  id: string
  description: string
  company: { name: string }
}

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_IDS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveNotifiedIds(ids: Set<string>) {
  localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(Array.from(ids).slice(-300)))
}

// Montado en el layout de CRM: mientras el usuario tenga notificaciones
// activadas (toggle en Configuración) y el navegador esté abierto, revisa
// periódicamente /api/actividades/pendientes y dispara una notificación push
// por cada seguimiento vencido/de hoy que no se haya avisado antes.
export default function NotificationsWatcher() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const check = async () => {
      if (localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== 'true') return
      if (Notification.permission !== 'granted') return

      try {
        const res = await fetch('/api/actividades/pendientes')
        if (!res.ok) return
        const data: { overdue: Pendiente[]; today: Pendiente[] } = await res.json()
        const notified = getNotifiedIds()
        const fresh = [...data.overdue, ...data.today].filter((p) => !notified.has(p.id))

        fresh.forEach((p) => {
          new Notification(`Seguimiento — ${p.company.name}`, { body: p.description })
          notified.add(p.id)
        })

        if (fresh.length > 0) saveNotifiedIds(notified)
      } catch {
        // silencioso — un fallo de red no debe interrumpir la navegación
      }
    }

    check()
    const interval = setInterval(check, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  return null
}
