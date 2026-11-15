import { describe, expect, it } from 'vitest'
import {
  computeHourlyBaselines,
  computeMetricBaseline,
  computePersonalBaselines,
  createAlert,
  evaluateReadingForAlert,
  generateAlertsForReadings,
  MIN_BASELINE_SAMPLES,
  radiationStatus,
  type MetricBaseline,
} from './index'
import { createCrew, demoScenarios, generateMission, type Reading } from '../sim'

function createSampleReadings(
  astronautId: string,
  count: number,
  baseHeartRate = 60,
  baseHrv = 50,
): Reading[] {
  const readings: Reading[] = []
  const startTime = Date.UTC(2026, 0, 1)

  for (let i = 0; i < count; i++) {
    readings.push({
      astronautId,
      timestamp: startTime + i * 3600 * 1000,
      missionDay: Math.floor(i / 24) + 1,
      heartRate: baseHeartRate + (i % 5) - 2,
      hrv: baseHrv + (i % 7) - 3,
      sleepHours: 7.0,
      sleepQuality: 80,
      stressScore: 25,
      activityMinutes: 30,
      bodyTemp: 36.6,
      spo2: 98.0,
      radiationDoseRate: 0.5,
      mood: 4.2,
    })
  }

  return readings
}

describe('Engine: Personal Baselines', () => {
  it('returns null if history is below MIN_BASELINE_SAMPLES', () => {
    const readings = createSampleReadings('astro-1', MIN_BASELINE_SAMPLES - 1)
    const baseline = computeMetricBaseline('heartRate', 'astro-1', readings)
    expect(baseline).toBeNull()
  })

  it('computes accurate statistical parameters for sufficient history', () => {
    const readings = createSampleReadings('astro-1', 48, 60, 50)
    const baseline = computeMetricBaseline('heartRate', 'astro-1', readings)

    expect(baseline).not.toBeNull()
    if (!baseline) return

    expect(baseline.astronautId).toBe('astro-1')
    expect(baseline.metric).toBe('heartRate')
    expect(baseline.sampleCount).toBe(48)
    expect(baseline.mean).toBeCloseTo(60, 0)
    expect(baseline.median).toBeCloseTo(60, 0)
    expect(baseline.stdDev).toBeGreaterThan(0)
    expect(baseline.lowerNormal).toBeLessThan(baseline.mean)
    expect(baseline.upperNormal).toBeGreaterThan(baseline.mean)
    expect(baseline.lowerCritical).toBeLessThan(baseline.lowerNormal)
    expect(baseline.upperCritical).toBeGreaterThan(baseline.upperNormal)
  })

  it('guarantees personal baselines differ between individuals (CLAUDE.md Principle 2)', () => {
    const astro1Readings = createSampleReadings('astro-1', 48, 55, 75)
    const astro2Readings = createSampleReadings('astro-2', 48, 72, 35)

    const baseline1 = computeMetricBaseline('heartRate', 'astro-1', astro1Readings)
    const baseline2 = computeMetricBaseline('heartRate', 'astro-2', astro2Readings)

    expect(baseline1).not.toBeNull()
    expect(baseline2).not.toBeNull()
    expect(baseline1!.mean).toBeCloseTo(55, 0)
    expect(baseline2!.mean).toBeCloseTo(72, 0)
    expect(baseline1!.mean).not.toEqual(baseline2!.mean)
  })

  it('computes full suite of personal baselines for all metrics', () => {
    const readings = createSampleReadings('astro-1', 48)
    const baselines = computePersonalBaselines('astro-1', readings)

    expect(baselines.heartRate).toBeDefined()
    expect(baselines.hrv).toBeDefined()
    expect(baselines.sleepHours).toBeDefined()
    expect(baselines.spo2).toBeDefined()
    expect(baselines.radiationDoseRate).toBeDefined()
  })
})

describe('Engine: Explainable Alerts (CLAUDE.md Principle 3)', () => {
  it('throws an error if title (what changed) is missing or empty', () => {
    expect(() =>
      createAlert({
        astronautId: 'astro-1',
        timestamp: Date.now(),
        metric: 'heartRate',
        severity: 'warning',
        title: '',
        explanation: 'Elevated resting HR',
        suggestedAction: 'Drink water',
      }),
    ).toThrow(/title/i)
  })

  it('throws an error if explanation (why it matters) is missing or empty', () => {
    expect(() =>
      createAlert({
        astronautId: 'astro-1',
        timestamp: Date.now(),
        metric: 'heartRate',
        severity: 'warning',
        title: 'Heart rate elevated',
        explanation: '',
        suggestedAction: 'Drink water',
      }),
    ).toThrow(/explanation/i)
  })

  it('throws an error if suggestedAction is missing or empty', () => {
    expect(() =>
      createAlert({
        astronautId: 'astro-1',
        timestamp: Date.now(),
        metric: 'heartRate',
        severity: 'warning',
        title: 'Heart rate elevated',
        explanation: 'Indicates dehydration',
        suggestedAction: '  ',
      }),
    ).toThrow(/suggestedAction/i)
  })

  it('evaluates reading deviations against personal baseline and creates explainable alert', () => {
    const baseline: MetricBaseline = {
      metric: 'heartRate',
      astronautId: 'astro-1',
      sampleCount: 48,
      mean: 60,
      stdDev: 3,
      median: 60,
      q25: 58,
      q75: 62,
      iqr: 4,
      min: 55,
      max: 65,
      lowerNormal: 55.5,
      upperNormal: 64.5,
      lowerCritical: 52.5,
      upperCritical: 67.5,
    }

    const nominalReading: Reading = {
      astronautId: 'astro-1',
      timestamp: Date.now(),
      missionDay: 5,
      heartRate: 61,
      hrv: 50,
      sleepHours: 7,
      sleepQuality: 80,
      stressScore: 20,
      activityMinutes: 30,
      bodyTemp: 36.6,
      spo2: 98,
      radiationDoseRate: 0.5,
      mood: 4,
    }

    const elevatedReading: Reading = {
      ...nominalReading,
      heartRate: 75, // significantly above upperCritical (67.5)
    }

    expect(evaluateReadingForAlert(nominalReading, baseline)).toBeNull()

    const alert = evaluateReadingForAlert(elevatedReading, baseline)
    expect(alert).not.toBeNull()
    if (!alert) return

    expect(alert.severity).toBe('critical')
    expect(alert.title).toContain('75 bpm')
    expect(alert.explanation).toContain('personal baseline')
    expect(alert.suggestedAction.length).toBeGreaterThan(15)
  })

  it('generates fully populated alerts on simulated mission scenarios', () => {
    const crew = createCrew()
    const readings = generateMission(30, 42, demoScenarios(30), { crew })
    const alerts = generateAlertsForReadings(readings, crew.map((c) => c.id))

    expect(alerts.length).toBeGreaterThan(0)

    for (const a of alerts) {
      expect(a.title.trim().length).toBeGreaterThan(0)
      expect(a.explanation.trim().length).toBeGreaterThan(0)
      expect(a.suggestedAction.trim().length).toBeGreaterThan(0)
      expect(['info', 'watch', 'warning', 'critical']).toContain(a.severity)
      expect(a.acknowledged).toBe(false)
    }
  })
})

describe('Engine: alert noise and detection', () => {
  const crew = createCrew()
  const ids = crew.map((c) => c.id)
  const day = (t: number) => Math.floor((t - Date.UTC(2030, 0, 1)) / 864e5) + 1

  it('stays quiet on a mission with no events (no false-alarm flood)', () => {
    // A handful of chance alerts over 60 days is expected; hundreds is a bug.
    for (const seed of [1, 2, 3]) {
      const alerts = generateAlertsForReadings(generateMission(60, seed, []), ids)
      expect(alerts.length).toBeLessThanOrEqual(8)
    }
  })

  it('does not alert on normal daily rhythm (afternoon heart-rate peak)', () => {
    const readings = generateMission(30, 5, [])
    const alerts = generateAlertsForReadings(readings, ids).filter((a) => a.metric === 'heartRate')
    expect(alerts.length).toBeLessThanOrEqual(2)
  })

  it('detects every scripted demo event for the affected astronaut', () => {
    const alerts = generateAlertsForReadings(generateMission(60, 2026, demoScenarios()), ids)
    const has = (id: string, metrics: string[], d0: number, d1: number) =>
      alerts.some((a) => a.astronautId === id && metrics.includes(a.metric) && day(a.timestamp) >= d0 && day(a.timestamp) <= d1)

    for (const id of ids) expect(has(id, ['radiationDoseRate'], 12, 14)).toBe(true) // solar particle event
    expect(has('astro-3', ['sleepHours', 'hrv'], 25, 29)).toBe(true) // sleep disruption
    expect(has('astro-4', ['mood', 'stressScore'], 35, 46)).toBe(true) // isolation fatigue
    expect(has('astro-1', ['heartRate'], 47, 55)).toBe(true) // exercise skipped
  })

  it('gives one alert per episode, not one per hour', () => {
    const alerts = generateAlertsForReadings(generateMission(60, 2026, demoScenarios()), ids)
    expect(alerts.length).toBeLessThan(40)
    const spe = alerts.filter((a) => a.metric === 'radiationDoseRate' && a.astronautId === 'astro-1')
    expect(spe.length).toBeLessThanOrEqual(2)
  })

  it('is not thrown off by an event inside the baseline window (robust baseline)', () => {
    // The solar particle event starts on day 12, inside the 14-day baseline window.
    const alerts = generateAlertsForReadings(generateMission(60, 2026, demoScenarios()), ids)
    expect(alerts.filter((a) => a.metric === 'radiationDoseRate' && a.severity === 'critical').length).toBeGreaterThanOrEqual(4)
  })

  it('builds a separate baseline for each hour of the day', () => {
    const readings = generateMission(14, 7, [])
    const hourly = computeHourlyBaselines('heartRate', 'astro-1', readings, { normalZ: 3, criticalZ: 4.5 })
    expect(hourly).toHaveLength(24)
    // Afternoon resting heart rate is higher than the 04:00 value (daily rhythm in the simulator).
    expect(hourly![16].mean).toBeGreaterThan(hourly![4].mean)
  })

  it('returns no hourly baseline when history is too short', () => {
    const readings = generateMission(1, 7, []).slice(0, MIN_BASELINE_SAMPLES - 1)
    expect(computeHourlyBaselines('heartRate', 'astro-1', readings, { normalZ: 3, criticalZ: 4.5 })).toBeNull()
  })

  it('is deterministic for a fixed seed', () => {
    const a = generateAlertsForReadings(generateMission(30, 11, demoScenarios(30)), ids)
    const b = generateAlertsForReadings(generateMission(30, 11, demoScenarios(30)), ids)
    expect(a).toEqual(b)
  })
})

describe('Engine: radiation status (shared by alerts and the Overview tile)', () => {
  it('classifies against the personal baseline and absolute limits', () => {
    expect(radiationStatus(0.55, 0.55)).toBe('nominal')
    expect(radiationStatus(1.6, 0.55)).toBe('elevated')
    expect(radiationStatus(0.55 * 7, 0.55)).toBe('storm')
    expect(radiationStatus(5.2, 2)).toBe('storm')
  })
})
