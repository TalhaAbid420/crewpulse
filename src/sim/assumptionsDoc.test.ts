import { describe, expect, it } from 'vitest'
import assumptionsDoc from '../../docs/ASSUMPTIONS.md?raw'
import { METRIC_INFO } from './assumptions'
import { createCrew } from './crew'
import { SCENARIO_LABELS } from './scenarios'

// Guards against the code and docs/ASSUMPTIONS.md drifting apart (CLAUDE.md principle 4).
describe('docs/ASSUMPTIONS.md', () => {
  it('lists every metric', () => {
    for (const { label } of Object.values(METRIC_INFO)) {
      expect(assumptionsDoc, label).toContain(label)
    }
  })

  it('lists every scenario', () => {
    for (const label of Object.values(SCENARIO_LABELS)) {
      expect(assumptionsDoc, label).toContain(label)
    }
  })

  it('lists every crew member and each of their baseline numbers', () => {
    for (const a of createCrew()) {
      expect(assumptionsDoc, a.name).toContain(a.name)
      expect(assumptionsDoc, `${a.id} id`).toContain(a.id)
    }
    // Spot-check one astronaut's baseline row values against the doc.
    const [first] = createCrew()
    expect(assumptionsDoc).toContain(String(first.baseline.restingHeartRate))
    expect(assumptionsDoc).toContain(String(first.baseline.dailyActivityMinutes))
  })

  it('marks every row as an assumption to verify', () => {
    const rows = assumptionsDoc
      .split('\n')
      .filter((line) => line.startsWith('|') && !line.includes('---') && !/^\| (Metric|Baseline|Parameter|Scenario) /.test(line))
    expect(rows.length).toBeGreaterThan(40)
    for (const row of rows) {
      expect(row, row).toMatch(/assumption, verify against NASA sources|fictional/)
    }
  })
})
