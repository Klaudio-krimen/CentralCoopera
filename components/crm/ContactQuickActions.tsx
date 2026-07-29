'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { WhatsappLogo, Phone, Copy, Check } from '@phosphor-icons/react'

// Deja solo dígitos y antepone el código de país si falta (Chile por defecto).
function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('56')) return digits
  if (digits.startsWith('9') && digits.length === 9) return `56${digits}`
  return digits
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={`Copiar ${label}`}
      className="p-1 rounded hover:bg-zinc-100 transition-colors"
    >
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-zinc-400" />}
    </button>
  )
}

export function EmailQuickActions({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-1">
      <a href={`mailto:${email}`} className="text-crm-primary hover:underline text-sm truncate">
        {email}
      </a>
      <CopyButton value={email} label="email" />
    </div>
  )
}

export function PhoneQuickActions({ phone }: { phone: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-zinc-700">{phone}</span>
      <a
        href={`https://wa.me/${cleanPhoneForWhatsApp(phone)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir WhatsApp"
        className="p-1 rounded hover:bg-emerald-50 transition-colors"
      >
        <WhatsappLogo size={14} className="text-emerald-600" weight="fill" />
      </a>
      <a href={`tel:${phone}`} aria-label="Llamar" className="p-1 rounded hover:bg-crm-secondary transition-colors">
        <Phone size={14} className="text-crm-primary" />
      </a>
      <CopyButton value={phone} label="teléfono" />
    </div>
  )
}
