import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertCard } from '../components/AlertCard'
import { acknowledgeAlert, syncAlerts, useAlerts, useAstronauts } from '../db'
import { METRIC_INFO, type MetricKey } from '../sim'

// Indicators the alert engine watches (the others are recorded but never alert).
const ALERTED_METRICS: MetricKey[] = ['heartRate', 'hrv', 'spo2', 'sleepHours', 'stressScore', 'radiationDoseRate', 'mood']

export function AlertsPage() {
  const { data: alerts = [] } = useAlerts()
  const { data: astronauts = [] } = useAstronauts()

  const [astronautFilter, setAstronautFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [ackFilter, setAckFilter] = useState<'all' | 'unack' | 'ack'>('unack')
  const [metricFilter, setMetricFilter] = useState<string>('all')

  const [isScanning, startScan] = useTransition()
  const [scanMessage, setScanMessage] = useState('')

  useEffect(() => {
    document.title = 'Alerts - CrewPulse'
  }, [])

  function handleScan() {
    startScan(async () => {
      setScanMessage('Scanning mission telemetry against personal baselines…')
      const count = await syncAlerts()
      setScanMessage(
        count > 0
          ? `Analysis complete: ${count} explainable alerts evaluated.`
          : 'Analysis complete: all vitals within personal baseline tolerances.',
      )
    })
  }

  async function handleAcknowledgeAll() {
    const unacknowledged = alerts.filter((a) => !a.acknowledged)
    for (const a of unacknowledged) {
      await acknowledgeAlert(a.id)
    }
  }

  // Filter alerts according to active controls
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (astronautFilter !== 'all' && a.astronautId !== astronautFilter) return false
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (metricFilter !== 'all' && a.metric !== metricFilter) return false
      if (ackFilter === 'unack' && a.acknowledged) return false
      if (ackFilter === 'ack' && !a.acknowledged) return false
      return true
    })
  }, [alerts, astronautFilter, severityFilter, metricFilter, ackFilter])

  const unackCount = alerts.filter((a) => !a.acknowledged).length
  const criticalCount = alerts.filter((a) => !a.acknowledged && a.severity === 'critical').length
  const warningCount = alerts.filter((a) => !a.acknowledged && a.severity === 'warning').length
  const watchCount = alerts.filter((a) => !a.acknowledged && a.severity === 'watch').length

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <section aria-labelledby="alerts-page-heading">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 id="alerts-page-heading" className="text-2xl font-semibold tracking-tight md:text-3xl">
                Alerts
              </h1>
              {unackCount > 0 && (
                <span className="rounded-full bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  {unackCount} Open
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              Explainable deviations from each astronaut's personal baseline: what changed, why it
              matters, and suggested next actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unackCount > 0 && (
              <button
                type="button"
                onClick={handleAcknowledgeAll}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-line px-3 text-xs font-medium text-muted hover:bg-raised hover:text-fg focus-visible:bg-raised"
              >
                Acknowledge All ({unackCount})
              </button>
            )}

            <button
              type="button"
              onClick={handleScan}
              disabled={isScanning}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-panel px-3.5 text-xs font-medium text-fg shadow-sm transition-colors hover:bg-raised focus-visible:bg-raised disabled:opacity-50"
            >
              {isScanning ? 'Evaluating Telemetry…' : 'Scan for Anomaly Alerts'}
            </button>
          </div>
        </div>

        {scanMessage && (
          <p role="status" className="mt-2 text-xs text-signal">
            {scanMessage}
          </p>
        )}
      </section>

      {/* KPI Severity Counters */}
      <section aria-label="Severity Summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        <button
          type="button"
          onClick={() => {
            setSeverityFilter('critical')
            setAckFilter('unack')
          }}
          className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
            severityFilter === 'critical' ? 'border-rose-500 bg-rose-950/40' : 'border-line bg-panel hover:bg-raised'
          }`}
        >
          <span className="text-xs text-muted">Critical</span>
          <span className="mt-0.5 font-mono text-xl font-bold text-rose-400">{criticalCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSeverityFilter('warning')
            setAckFilter('unack')
          }}
          className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
            severityFilter === 'warning' ? 'border-amber-500 bg-amber-950/40' : 'border-line bg-panel hover:bg-raised'
          }`}
        >
          <span className="text-xs text-muted">Warning</span>
          <span className="mt-0.5 font-mono text-xl font-bold text-amber-300">{warningCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSeverityFilter('watch')
            setAckFilter('unack')
          }}
          className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
            severityFilter === 'watch' ? 'border-amber-400 bg-amber-950/20' : 'border-line bg-panel hover:bg-raised'
          }`}
        >
          <span className="text-xs text-muted">Watch</span>
          <span className="mt-0.5 font-mono text-xl font-bold text-amber-200">{watchCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSeverityFilter('all')
            setAckFilter('all')
          }}
          className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
            severityFilter === 'all' && ackFilter === 'all' ? 'border-signal bg-raised' : 'border-line bg-panel hover:bg-raised'
          }`}
        >
          <span className="text-xs text-muted">Total Archive</span>
          <span className="mt-0.5 font-mono text-xl font-bold text-fg">{alerts.length}</span>
        </button>
      </section>

      {/* Filter Toolbar */}
      <section aria-label="Alert Filters" className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel p-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-status" className="font-medium text-muted">
            Status:
          </label>
          <select
            id="filter-status"
            value={ackFilter}
            onChange={(e) => setAckFilter(e.target.value as 'all' | 'unack' | 'ack')}
            className="rounded border border-line bg-base px-2 py-1.5 text-xs text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            <option value="unack">Unacknowledged</option>
            <option value="ack">Acknowledged</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Astronaut Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-crew" className="font-medium text-muted">
            Crew:
          </label>
          <select
            id="filter-crew"
            value={astronautFilter}
            onChange={(e) => setAstronautFilter(e.target.value)}
            className="rounded border border-line bg-base px-2 py-1.5 text-xs text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            <option value="all">All Crew</option>
            {astronauts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-severity" className="font-medium text-muted">
            Severity:
          </label>
          <select
            id="filter-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded border border-line bg-base px-2 py-1.5 text-xs text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="watch">Watch</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Metric Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-metric" className="font-medium text-muted">
            Indicator:
          </label>
          <select
            id="filter-metric"
            value={metricFilter}
            onChange={(e) => setMetricFilter(e.target.value)}
            className="rounded border border-line bg-base px-2 py-1.5 text-xs text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            <option value="all">All Indicators</option>
            {ALERTED_METRICS.map((key) => (
              <option key={key} value={key}>
                {METRIC_INFO[key].label}
              </option>
            ))}
          </select>
        </div>

        {(astronautFilter !== 'all' || severityFilter !== 'all' || metricFilter !== 'all' || ackFilter !== 'unack') && (
          <button
            type="button"
            onClick={() => {
              setAstronautFilter('all')
              setSeverityFilter('all')
              setMetricFilter('all')
              setAckFilter('unack')
            }}
            className="ml-auto text-xs text-signal hover:underline"
          >
            Reset Filters
          </button>
        )}
      </section>

      {/* Alerts List */}
      <section aria-label="Alert List" className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-panel p-8 text-center">
            <p className="font-semibold text-fg">No alerts matching filter criteria</p>
            <p className="mt-1 text-sm text-muted">
              {alerts.length === 0
                ? 'No alerts have been generated for this mission yet. Run an anomaly scan to evaluate all telemetry.'
                : 'Try adjusting the filters above to view acknowledged or other severity categories.'}
            </p>
            {alerts.length === 0 && (
              <button
                type="button"
                onClick={handleScan}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-raised px-4 text-xs font-medium text-fg hover:bg-panel"
              >
                Evaluate Telemetry
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredAlerts.map((alert) => {
              const astronaut = astronauts.find((a) => a.id === alert.astronautId)
              return <AlertCard key={alert.id} alert={alert} astronaut={astronaut} />
            })}
          </div>
        )}
      </section>
    </div>
  )
}
