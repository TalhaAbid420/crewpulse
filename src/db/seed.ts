import {
  createCrew,
  DEMO_DAYS,
  DEMO_SEED,
  demoScenarios,
  generateMission,
  type ScenarioEvent,
} from '../sim'
import { db } from './database'
import { updateSettings } from './settings'

export interface SeedResult {
  astronauts: number
  readings: number
}

/**
 * Replace everything in the database with a freshly generated mission:
 * clears astronauts, readings and alerts, then loads the new data and records
 * the mission length and seed in the settings. Other settings are kept.
 *
 * The data is generated BEFORE the database is touched, so bad input (for
 * example days = 0) throws without losing existing data. The swap itself is one
 * transaction, so readers never see a half-cleared database.
 */
export async function seedMission(
  days: number,
  seed: number,
  scenarios: readonly ScenarioEvent[] = demoScenarios(days),
): Promise<SeedResult> {
  const crew = createCrew()
  const readings = generateMission(days, seed, scenarios, { crew })

  await db.transaction('rw', [db.astronauts, db.readings, db.alerts, db.settings], async () => {
    await Promise.all([db.astronauts.clear(), db.readings.clear(), db.alerts.clear()])
    await db.astronauts.bulkAdd(crew)
    await db.readings.bulkAdd(readings)
    await updateSettings({ missionDays: days, missionSeed: seed, seededAt: Date.now() })
  })

  return { astronauts: crew.length, readings: readings.length }
}

let inFlight: Promise<boolean> | null = null

/**
 * First-run setup: if the database is empty, load the demo mission.
 * Returns true if it seeded, false if data was already there.
 * Calls made while a check is already running share it, so React StrictMode's
 * double effects (or two quick calls) seed only once.
 */
export function ensureDemoData(): Promise<boolean> {
  inFlight ??= (async () => {
    const [astronauts, readings] = await Promise.all([db.astronauts.count(), db.readings.count()])
    if (astronauts > 0 && readings > 0) return false
    await seedMission(DEMO_DAYS, DEMO_SEED)
    return true
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Throw away all current data and alerts and reload the default demo mission. */
export function resetDemoData(): Promise<SeedResult> {
  return seedMission(DEMO_DAYS, DEMO_SEED)
}
