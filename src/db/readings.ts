import Dexie from 'dexie'
import type { Reading } from '../sim'
import { db } from './database'

/** Time window in ms since the epoch. Both ends are inclusive and optional. */
export interface TimeRange {
  from?: number
  to?: number
}

/** One astronaut's readings in a time window, oldest first. */
export function getReadings(astronautId: string, range: TimeRange = {}): Promise<Reading[]> {
  const from = range.from ?? Dexie.minKey
  const to = range.to ?? Dexie.maxKey
  return db.readings
    .where('[astronautId+timestamp]')
    .between([astronautId, from], [astronautId, to], true, true)
    .toArray()
}
