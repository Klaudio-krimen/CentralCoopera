import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import './crm.css'

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors />
    </>
  )
}
