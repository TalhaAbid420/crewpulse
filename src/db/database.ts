import Dexie, { type EntityTable, type Table } from 'dexie'
import type { Alert, Astronaut, Reading } from '../sim'

/** App settings. Stored as one record, with defaults filled in when reading. */
export interface Settings {
  /** Length of the loaded mission, in days. Written when data is seeded. */
  missionDays: number
  /** Seed the loaded mission was generated with. Written when data is seeded. */
  missionSeed: number
  /** When the data was last seeded (ms since the epoch), or null if never. */
  seededAt: number | null
  /** The crew member last viewed, so the app can reopen on them. */
  selectedAstronautId: string | null
}

export interface SettingsRecord {
  key: string
  value: Settings
}

/**
 * Local-only storage (IndexedDB), so the app needs no backend or network.
 *
 * Note: IndexedDB cannot index boolean values, so `alerts.acknowledged` is
 * deliberately not an index. Alerts are few, so that filter runs in memory.
 */
export class CrewPulseDB extends Dexie {
  astronauts!: EntityTable<Astronaut, 'id'>
  /** Primary key [astronautId+timestamp]: one reading per astronaut per hour. */
  readings!: Table<Reading, [string, number]>
  alerts!: EntityTable<Alert, 'id'>
  settings!: EntityTable<SettingsRecord, 'key'>

  constructor(name = 'crewpulse') {
    super(name)
    this.version(1).stores({
      astronauts: 'id',
      // The compound primary key also serves range queries per astronaut.
      // `timestamp` alone supports crew-wide queries over a time window.
      readings: '[astronautId+timestamp], timestamp',
      alerts: 'id, astronautId, timestamp, severity, metric',
      settings: 'key',
    })
  }
}

export const db = new CrewPulseDB()
