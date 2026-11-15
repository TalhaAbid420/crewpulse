import { DEMO_DAYS, DEMO_SEED } from '../sim'
import { db, type Settings } from './database'

const SETTINGS_KEY = 'app'

export const DEFAULT_SETTINGS: Settings = {
  missionDays: DEMO_DAYS,
  missionSeed: DEMO_SEED,
  seededAt: null,
  selectedAstronautId: null,
}

/** Current settings, with defaults for anything not saved yet. */
export async function getSettings(): Promise<Settings> {
  const record = await db.settings.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...record?.value }
}

/** Change some settings and return the new full settings. `undefined` values are ignored. */
export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const changes = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
  return db.transaction('rw', db.settings, async () => {
    const next: Settings = { ...(await getSettings()), ...changes }
    await db.settings.put({ key: SETTINGS_KEY, value: next })
    return next
  })
}
