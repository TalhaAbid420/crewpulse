import type { MetricKey, Reading } from './types'

/** One astronaut's readings, indexed by mission hour. */
export function series(readings: readonly Reading[], astronautId: string): Reading[] {
  return readings.filter((r) => r.astronautId === astronautId)
}

export function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0)
}

/** Values of one metric over mission hours [from, to). */
export function metricWindow(
  hours: readonly Reading[],
  metric: MetricKey,
  from: number,
  to: number,
): number[] {
  return hours.slice(from, to).map((r) => r[metric])
}
