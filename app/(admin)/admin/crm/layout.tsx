import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import NotificationsWatcher from '@/components/crm/NotificationsWatcher'
import './crm.css'

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors />
      <NotificationsWatcher />
    </>
  )
}
