import { useState } from 'react'
import { acknowledgeAlert } from '../db'
import { METRIC_INFO, MISSION_START_MS, type Alert, type Astronaut } from '../sim'
import { SeverityBadge } from './SeverityBadge'

interface Props {
  alert: Alert
  astronaut?: Astronaut
  onAcknowledge?: (alertId: string) => void
}

export function AlertCard({ alert, astronaut, onAcknowledge }: Props) {
  const [busy, setBusy] = useState(false)
  const isAck = alert.acknowledged

  async function handleAcknowledge() {
    if (isAck || busy) return
    setBusy(true)
    try {
      await acknowledgeAlert(alert.id)
      onAcknowledge?.(alert.id)
    } finally {
      setBusy(false)
    }
  }

  // Format timestamp into Mission day and UTC time
  const date = new Date(alert.timestamp)
  const missionDay = Math.floor((alert.timestamp - MISSION_START_MS) / 864e5) + 1
  const timeStr = `Day ${missionDay} · ${date.toISOString().slice(11, 16)} UTC`

  return (
    <article
      aria-labelledby={`alert-title-${alert.id}`}
      className={`rounded-lg border p-4 transition-colors md:p-5 ${
        isAck
          ? 'border-line/60 bg-panel/50 opacity-75'
          : alert.severity === 'critical'
            ? 'border-rose-500/40 bg-raised/90 shadow-sm shadow-rose-950/20'
            : alert.severity === 'warning'
              ? 'border-amber-500/40 bg-raised/90'
              : 'border-line bg-panel'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2.5">
          <SeverityBadge severity={alert.severity} size="sm" />
          {astronaut && (
            <span className="font-medium text-fg">
              {astronaut.name} <span className="text-xs text-muted">({astronaut.role})</span>
            </span>
          )}
        </div>
        <time dateTime={date.toISOString()} className="font-mono text-xs text-muted">
          {timeStr}
        </time>
      </header>

      <div className="mt-3 space-y-2.5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            What Changed
          </span>
          <h3 id={`alert-title-${alert.id}`} className="mt-0.5 text-base font-semibold text-fg">
            {alert.title}
          </h3>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Why It Matters
          </span>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">{alert.explanation}</p>
        </div>

        <div className="rounded-md border border-line/70 bg-panel/70 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-signal">
            Suggested Action
          </span>
          <p className="mt-0.5 text-sm font-medium text-fg">{alert.suggestedAction}</p>
        </div>
      </div>

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-line/50 pt-3">
        <span className="text-xs text-muted">
          Indicator: <span className="font-medium text-fg">{METRIC_INFO[alert.metric].label}</span>
        </span>
        <button
          type="button"
          onClick={handleAcknowledge}
          disabled={isAck || busy}
          className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
            isAck
              ? 'cursor-default border-line/50 text-muted'
              : 'border-line bg-panel hover:bg-raised text-fg focus-visible:bg-raised'
          }`}
        >
          {isAck ? '✓ Acknowledged' : busy ? 'Saving…' : 'Acknowledge Alert'}
        </button>
      </footer>
    </article>
  )
}
