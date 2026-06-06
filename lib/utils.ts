import { NextResponse } from 'next/server'

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

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
