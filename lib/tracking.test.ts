import { describe, it, expect } from 'vitest'
import { validateCoordinates, minutesSince, signalFreshness } from './tracking'

describe('validateCoordinates', () => {
  it('acepta coordenadas válidas', () => {
    expect(validateCoordinates(-33.45, -70.66)).toBe(true)
  })
  it('rechaza latitud fuera de rango', () => {
    expect(validateCoordinates(91, 0)).toBe(false)
    expect(validateCoordinates(-91, 0)).toBe(false)
  })
  it('rechaza longitud fuera de rango', () => {
    expect(validateCoordinates(0, 181)).toBe(false)
    expect(validateCoordinates(0, -181)).toBe(false)
  })
  it('rechaza tipos no numéricos', () => {
    expect(validateCoordinates('-33.45' as unknown as number, -70)).toBe(false)
    expect(validateCoordinates(undefined as unknown as number, 0)).toBe(false)
  })
  it('rechaza NaN e Infinity', () => {
    expect(validateCoordinates(NaN, 0)).toBe(false)
    expect(validateCoordinates(0, Infinity)).toBe(false)
  })
})

describe('minutesSince', () => {
  it('calcula minutos transcurridos', () => {
    const now = 1_000_000_000_000
    const fiveMinAgo = new Date(now - 5 * 60_000)
    expect(minutesSince(fiveMinAgo, now)).toBe(5)
  })
})

describe('signalFreshness', () => {
  it('marca fresh si es menor a 5 minutos', () => {
    const now = 1_000_000_000_000
    const recent = new Date(now - 2 * 60_000)
    expect(signalFreshness(recent, now)).toBe('fresh')
  })
  it('marca stale si es 5 minutos o más', () => {
    const now = 1_000_000_000_000
    const old = new Date(now - 10 * 60_000)
    expect(signalFreshness(old, now)).toBe('stale')
  })
})
