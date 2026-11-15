import { Link } from 'react-router-dom'
import type { MetricBaseline } from '../engine'
import type { Alert, Astronaut, Reading, Severity } from '../sim'
import { ArrowRightIcon } from './icons'
import { SeverityBadge } from './SeverityBadge'

interface Props {
  astronaut: Astronaut
  latestReading?: Reading
  baselines?: Partial<Record<string, MetricBaseline>>
  /** Unacknowledged alerts raised recently (these decide the status badge). */
  activeAlerts?: Alert[]
  /** Older unacknowledged alerts, shown as a count only. */
  earlierAlertCount?: number
}

export function CrewCard({
  astronaut,
  latestReading,
  baselines,
  activeAlerts = [],
  earlierAlertCount = 0,
}: Props) {
  // Determine aggregate crew member status
  let status: Severity | 'nominal' = 'nominal'
  if (activeAlerts.some((a) => a.severity === 'critical')) {
    status = 'critical'
  } else if (activeAlerts.some((a) => a.severity === 'warning')) {
    status = 'warning'
  } else if (activeAlerts.some((a) => a.severity === 'watch')) {
    status = 'watch'
  }

  const initials = astronaut.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="flex flex-col rounded-lg border border-line bg-panel p-5 transition-colors hover:border-line/90">
      {/* Top Profile Header */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-mono text-sm font-semibold text-signal">
            {initials}
          </div>
          <div>
            <h3 className="font-semibold text-fg">{astronaut.name}</h3>
            <p className="text-xs text-muted">
              {astronaut.role} · Age {astronaut.age}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <SeverityBadge severity={status} size="sm" />
        </div>
      </div>

      {/* Primary Metrics vs Personal Baseline Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-md border border-line/60 bg-base/50 p-3 text-xs">
        {/* Heart Rate */}
        <div>
          <span className="text-muted">Resting HR</span>
          <div className="mt-0.5 font-mono font-medium text-fg">
            {latestReading ? `${Math.round(latestReading.heartRate)} bpm` : '—'}
          </div>
          <span className="text-[11px] text-muted">
            Base: {baselines?.heartRate ? `${Math.round(baselines.heartRate.mean)} bpm` : '—'}
          </span>
        </div>

        {/* HRV */}
        <div>
          <span className="text-muted">HRV (RMSSD)</span>
          <div className="mt-0.5 font-mono font-medium text-fg">
            {latestReading ? `${Math.round(latestReading.hrv)} ms` : '—'}
          </div>
          <span className="text-[11px] text-muted">
            Base: {baselines?.hrv ? `${Math.round(baselines.hrv.mean)} ms` : '—'}
          </span>
        </div>

        {/* SpO2 */}
        <div>
          <span className="text-muted">SpO2</span>
          <div className="mt-0.5 font-mono font-medium text-fg">
            {latestReading ? `${latestReading.spo2.toFixed(1)}%` : '—'}
          </div>
          <span className="text-[11px] text-muted">
            Base: {baselines?.spo2 ? `${baselines.spo2.mean.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* Sleep */}
        <div>
          <span className="text-muted">Last Sleep</span>
          <div className="mt-0.5 font-mono font-medium text-fg">
            {latestReading ? `${latestReading.sleepHours.toFixed(1)}h` : '—'}
          </div>
          <span className="text-[11px] text-muted">
            Base: {baselines?.sleepHours ? `${baselines.sleepHours.mean.toFixed(1)}h` : '—'}
          </span>
        </div>
      </div>

      {/* Open alerts counter if any */}
      {(activeAlerts.length > 0 || earlierAlertCount > 0) && (
        <div className="mt-3 space-y-0.5 text-xs">
          {activeAlerts.length > 0 && (
            <p className="text-amber-300">
              {activeAlerts.length} recent alert{activeAlerts.length > 1 ? 's' : ''} · highest: {status}
            </p>
          )}
          {earlierAlertCount > 0 && (
            <p className="text-muted">
              {earlierAlertCount} earlier unacknowledged alert{earlierAlertCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Profile Detail Link */}
      <div className="mt-4 pt-2">
        <Link
          to={`/crew?id=${astronaut.id}`}
          className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-raised/80 px-3 text-xs font-medium text-fg transition-colors hover:bg-raised hover:text-signal focus-visible:bg-raised"
        >
          <span>View Health Profile</span>
          <ArrowRightIcon />
        </Link>
      </div>
    </div>
  )
}
