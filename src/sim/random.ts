// Seeded random numbers, so the same seed always gives the same mission.
// Math.random is never used anywhere in src/sim.

export interface Rng {
  /** Uniform number in [0, 1). Consumes exactly one step of the stream. */
  next(): number
  /** Standard normal number. Always consumes exactly two steps of the stream. */
  gaussian(): number
}

/** Mulberry32: small, fast, and good enough for simulation noise. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Box-Muller. We deliberately throw away the second value so every call uses
  // the same number of steps; that keeps streams aligned between runs.
  const gaussian = (): number => {
    const u1 = 1 - next() // in (0, 1], so Math.log never sees 0
    const u2 = next()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }

  return { next, gaussian }
}

/**
 * Derive an independent seed for a named stream (for example one astronaut's
 * hourly noise). Separate streams mean that changing one part of the simulation
 * (a scenario, the mission length, another astronaut) cannot shift the random
 * numbers used by another part.
 */
export function deriveSeed(seed: number, label: string): number {
  // FNV-1a over the label, started from the seed, then a final bit mix.
  let h = (2166136261 ^ (seed >>> 0)) >>> 0
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
