import { describe, expect, it } from 'vitest'
import { createRng, deriveSeed } from './random'

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(123)
    const b = createRng(123)
    const first = Array.from({ length: 20 }, () => a.next())
    const second = Array.from({ length: 20 }, () => b.next())
    expect(first).toEqual(second)
  })

  it('gives different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next())
  })

  it('stays inside [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 5000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('produces roughly standard normal values', () => {
    const rng = createRng(99)
    const values = Array.from({ length: 20000 }, () => rng.gaussian())
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
    expect(Math.abs(mean)).toBeLessThan(0.05)
    expect(Math.abs(variance - 1)).toBeLessThan(0.08)
  })

  it('uses exactly two steps per gaussian, so streams stay aligned', () => {
    const a = createRng(5)
    const b = createRng(5)
    a.gaussian()
    b.next()
    b.next()
    expect(a.next()).toBe(b.next())
  })
})

describe('deriveSeed', () => {
  it('is stable, and differs by label and by seed', () => {
    expect(deriveSeed(42, 'astro-1/hourly')).toBe(deriveSeed(42, 'astro-1/hourly'))
    expect(deriveSeed(42, 'astro-1/hourly')).not.toBe(deriveSeed(42, 'astro-2/hourly'))
    expect(deriveSeed(42, 'astro-1/hourly')).not.toBe(deriveSeed(43, 'astro-1/hourly'))
  })
})
