import type { MetricKey, Severity } from '../sim'

export interface MetricBaseline {
  metric: MetricKey
  astronautId: string
  /** Number of readings used to compute this baseline. */
  sampleCount: number
  mean: number
  stdDev: number
  median: number
  q25: number
  q75: number
  iqr: number
  min: number
  max: number
  /** Personal normal lower limit (mean - 1.5 * stdDev or clinical clamp). */
  lowerNormal: number
  /** Personal normal upper limit (mean + 1.5 * stdDev or clinical clamp). */
  upperNormal: number
  /** Personal warning/critical lower limit (mean - 2.5 * stdDev). */
  lowerCritical: number
  /** Personal warning/critical upper limit (mean + 2.5 * stdDev). */
  upperCritical: number
}

export type PersonalBaselines = Record<MetricKey, MetricBaseline>

export interface Deviation {
  astronautId: string
  metric: MetricKey
  timestamp: number
  missionDay: number
  value: number
  baselineValue: number
  deviationPercent: number
  severity: Severity
  direction: 'high' | 'low'
}
