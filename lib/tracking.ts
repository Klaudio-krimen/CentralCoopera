/** Valida que lat/lng sean números finitos dentro de rango geográfico. */
export function validateCoordinates(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  )
}

/** Minutos enteros transcurridos desde `date` hasta `now` (ms). */
export function minutesSince(date: Date | string, now: number = Date.now()): number {
  return Math.floor((now - new Date(date).getTime()) / 60_000)
}

/** 'fresh' si la última señal es de hace menos de 5 minutos, si no 'stale'. */
export function signalFreshness(date: Date | string, now: number = Date.now()): 'fresh' | 'stale' {
  return minutesSince(date, now) < 5 ? 'fresh' : 'stale'
}
