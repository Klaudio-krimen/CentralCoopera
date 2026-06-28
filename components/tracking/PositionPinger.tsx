'use client'

import { usePositionPing } from '@/lib/usePositionPing'

/** Componente invisible: activa el envío de posición mientras está montado. */
export default function PositionPinger() {
  usePositionPing(true)
  return null
}
