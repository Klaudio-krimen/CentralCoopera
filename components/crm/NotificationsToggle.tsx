'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff } from 'lucide-react'
import { NOTIFICATIONS_ENABLED_KEY } from '@/lib/notifications'

export default function NotificationsToggle() {
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setSupported(false)
      return
    }
    setPermission(Notification.permission)
    setEnabled(localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true' && Notification.permission === 'granted')
  }, [])

  const handleToggle = async () => {
    if (!enabled) {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        toast.error('Permiso de notificaciones denegado por el navegador')
        return
      }
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true')
      setEnabled(true)
      new Notification('Central Coopera', {
        body: 'Notificaciones activadas — avisaremos de seguimientos pendientes.',
      })
      toast.success('Notificaciones activadas')
    } else {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false')
      setEnabled(false)
      toast.success('Notificaciones desactivadas')
    }
  }

  if (!supported) {
    return (
      <div className="crm-card">
        <p className="text-sm text-crm-muted">Tu navegador no soporta notificaciones push.</p>
      </div>
    )
  }

  return (
    <div className="crm-card space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-crm-secondary flex items-center justify-center shrink-0">
            {enabled ? <Bell className="h-4 w-4 text-crm-primary" /> : <BellOff className="h-4 w-4 text-crm-muted" />}
          </div>
          <div>
            <p className="text-sm font-medium text-crm-foreground">Notificaciones del navegador</p>
            <p className="text-xs text-crm-muted mt-0.5">
              Avisa de seguimientos vencidos o de hoy mientras el navegador esté abierto.
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-crm-primary' : 'bg-crm-border'}`}
          aria-label={enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </button>
      </div>
      {permission === 'denied' && (
        <p className="text-[11px] text-crm-destructive">
          Bloqueado por el navegador — habilítalo desde la configuración del sitio (ícono de candado en la barra de direcciones).
        </p>
      )}
    </div>
  )
}
