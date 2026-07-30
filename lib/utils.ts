import { NextResponse } from 'next/server'
import type { ContactSource } from '@prisma/client'

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  WEBSITE: 'Sitio web',
  WHATSAPP: 'WhatsApp',
  REFERIDO: 'Referido',
  REDES_SOCIALES: 'Redes sociales',
  LLAMADA_FRIA: 'Llamada fría',
  EMAIL: 'Email',
  FORMULARIO: 'Formulario',
  EVENTO: 'Evento',
  IMPORT: 'Importado',
  WEBHOOK: 'Webhook',
  SCRAPING: 'Web scraping',
  OTRO: 'Otro',
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function calculateDiscrepancy(declared: number, received: number) {
  if (declared === 0) return { percentage: 0, severity: null }
  const percentage = (Math.abs(declared - received) / declared) * 100
  let severity: 'MENOR' | 'MODERADA' | 'GRAVE' | null = null
  if (percentage > 20) severity = 'GRAVE'
  else if (percentage > 5) severity = 'MODERADA'
  else if (percentage > 2) severity = 'MENOR'
  return { percentage, severity }
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function generateOrderCode(counter: number): string {
  const year = new Date().getFullYear()
  return `RET-${year}-${String(counter).padStart(4, '0')}`
}

export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatRelativeDate(date: Date | string): string {
  const then = new Date(date).getTime()
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  return formatDate(date)
}
