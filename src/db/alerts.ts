import type { Alert, MetricKey, Severity } from '../sim'
import { db } from './database'
import type { TimeRange } from './readings'

export interface AlertFilters extends TimeRange {
  astronautId?: string
  /** One severity or several. */
  severity?: Severity | readonly Severity[]
  metric?: MetricKey
  acknowledged?: boolean
  /** Return at most this many alerts (the newest ones). */
  limit?: number
}

/**
 * Save an alert, keyed by its id. Saving an id that already exists replaces it,
 * so re-running the alert engine never creates duplicates. If the existing alert
 * was already acknowledged it stays acknowledged: an astronaut's "seen it"
 * should not be undone by a re-run.
 */
export async function saveAlert(alert: Alert): Promise<void> {
  await db.transaction('rw', db.alerts, async () => {
    const existing = await db.alerts.get(alert.id)
    await db.alerts.put({
      ...alert,
      acknowledged: alert.acknowledged || existing?.acknowledged === true,
    })
  })
}

/** Alerts matching the filters, newest first. */
export async function getAlerts(filters: AlertFilters = {}): Promise<Alert[]> {
  const { astronautId, severity, metric, acknowledged, from, to, limit } = filters
  const severities = severity === undefined ? undefined : new Set([severity].flat())

  const base =
    astronautId === undefined
      ? db.alerts.toCollection()
      : db.alerts.where('astronautId').equals(astronautId)

  const matches = await base
    .filter(
      (a) =>
        (severities === undefined || severities.has(a.severity)) &&
        (metric === undefined || a.metric === metric) &&
        (acknowledged === undefined || a.acknowledged === acknowledged) &&
        (from === undefined || a.timestamp >= from) &&
        (to === undefined || a.timestamp <= to),
    )
    .toArray()

  // Newest first; the id breaks ties so the order is always the same.
  matches.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id))
  return limit === undefined ? matches : matches.slice(0, Math.max(0, limit))
}

/** Mark an alert as seen. Returns false if no alert has that id. */
export async function acknowledgeAlert(id: string): Promise<boolean> {
  const updated = await db.alerts.update(id, { acknowledged: true })
  return updated === 1
}

/**
 * Runs the alert engine across all current readings in the database,
 * saving any detected explainable alerts into the local database.
 * Existing alerts keep their acknowledged state.
 */
export async function syncAlerts(): Promise<number> {
  const [astronauts, readings] = await Promise.all([
    db.astronauts.toArray(),
    db.readings.toArray(),
  ])
  if (astronauts.length === 0 || readings.length === 0) return 0
  const { generateAlertsForReadings } = await import('../engine')
  const alerts = generateAlertsForReadings(readings, astronauts.map((a) => a.id))
  for (const alert of alerts) {
    await saveAlert(alert)
  }
  return alerts.length
}
