import { useEffect, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import { AlertCard } from '../components/AlertCard'
import { CrewCard } from '../components/CrewCard'
import { ArrowRightIcon } from '../components/icons'
import { syncAlerts, useAlerts, useAstronauts, useSettings } from '../db'
import { getReadings } from '../db/readings'
import { computePersonalBaselines, radiationStatus, type MetricBaseline } from '../engine'
import type { Reading } from '../sim'

export function OverviewPage() {
  const { data: astronauts = [] } = useAstronauts()
  const { data: alerts = [] } = useAlerts()
  const { data: settings } = useSettings()

  const [crewData, setCrewData] = useState<
    Record<
      string,
      {
        latest?: Reading
        baselines?: Partial<Record<string, MetricBaseline>>
      }
    >
  >({})
  const [isScanning, startScan] = useTransition()
  const [scanMessage, setScanMessage] = useState('')

  useEffect(() => {
    document.title = 'Overview - CrewPulse'
  }, [])

  // Load latest readings & baselines for each astronaut
  useEffect(() => {
    if (astronauts.length === 0) return

    let cancelled = false
    async function loadData() {
      const results: Record<
        string,
        { latest?: Reading; baselines?: Partial<Record<string, MetricBaseline>> }
      > = {}

      for (const a of astronauts) {
        const readings = await getReadings(a.id)
        if (readings.length > 0) {
          const latest = readings[readings.length - 1]
          const baselines = computePersonalBaselines(a.id, readings)
          results[a.id] = { latest, baselines }
        }
      }

      if (!cancelled) {
        setCrewData(results)
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [astronauts])

  // Run alert engine on demand
  function handleScanAlerts() {
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

  const unackAlerts = alerts.filter((a) => !a.acknowledged)
  const criticalCount = unackAlerts.filter((a) => a.severity === 'critical').length
  const warningCount = unackAlerts.filter((a) => a.severity === 'warning').length
  const missionDays = settings?.missionDays ?? 60

  // Everything below is computed from the stored simulated readings, not hardcoded.
  const latestTimes = Object.values(crewData).map((d) => d.latest?.timestamp ?? 0)
  const latestTimestamp = latestTimes.length > 0 ? Math.max(...latestTimes) : 0
  const reporting = Object.values(crewData).filter((d) => d.latest).length
  const latestLabel = latestTimestamp
    ? `Latest simulated reading ${new Date(latestTimestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC`
    : 'No readings stored yet'
  // Alerts from the last 48 simulated hours count as current; older ones are listed as earlier.
  const RECENT_MS = 48 * 3600 * 1000
  const isRecent = (t: number) => latestTimestamp > 0 && t >= latestTimestamp - RECENT_MS

  const radiationRows = astronauts.flatMap((a) => {
    const d = crewData[a.id]
    return d?.latest && d.baselines?.radiationDoseRate
      ? [{ value: d.latest.radiationDoseRate, status: radiationStatus(d.latest.radiationDoseRate, d.baselines.radiationDoseRate.mean) }]
      : []
  })
  const radiationOrder = { nominal: 0, elevated: 1, storm: 2 } as const
  const worstRadiation = radiationRows.reduce<(typeof radiationRows)[number] | undefined>(
    (w, r) => (!w || radiationOrder[r.status] > radiationOrder[w.status] || (r.status === w.status && r.value > w.value) ? r : w),
    undefined,
  )
  const radiationLabel = { nominal: 'Nominal', elevated: 'Elevated', storm: 'Storm level' } as const

  return (
    <div className="space-y-8">
      {/* Page Title & Status Header */}
      <section aria-labelledby="overview-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 id="overview-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
              Overview
            </h1>
            <p className="mt-1 text-sm text-muted">
              Crew health status at a glance, compared strictly with each astronaut's personal
              baseline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleScanAlerts}
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

      {/* Mission Quick Stats KPI Bar */}
      <section
        aria-label="Mission indicators"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4"
      >
        <div className="rounded-lg border border-line bg-panel p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Mission Elapsed
          </span>
          <div className="mt-1 font-mono text-xl font-semibold text-fg">Day {missionDays}</div>
          <span className="text-[11px] text-muted">End of simulated {missionDays}-day demo mission</span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Monitored Crew
          </span>
          <div className="mt-1 font-mono text-xl font-semibold text-fg">
            {reporting} / {astronauts.length} Reporting
          </div>
          <span className="text-[11px] text-muted">{latestLabel}</span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Active Alerts
          </span>
          <div className="mt-1 font-mono text-xl font-semibold text-fg">
            {unackAlerts.length} Unresolved
          </div>
          <span className="text-[11px] text-muted">
            {criticalCount > 0 ? (
              <span className="font-medium text-rose-400">{criticalCount} critical</span>
            ) : warningCount > 0 ? (
              <span className="font-medium text-amber-400">{warningCount} warnings</span>
            ) : (
              'All crew within baseline'
            )}
          </span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Radiation Field
          </span>
          <div className="mt-1 font-mono text-xl font-semibold text-fg">
            {worstRadiation ? radiationLabel[worstRadiation.status] : '—'}
          </div>
          <span className="text-[11px] text-muted">
            {worstRadiation
              ? `Highest current dose rate ${worstRadiation.value.toFixed(2)} mSv/day (simulated)`
              : 'No readings yet'}
          </span>
        </div>
      </section>

      {/* Crew Health Cards Grid */}
      <section aria-labelledby="crew-cards-title">
        <div className="flex items-center justify-between pb-3">
          <h2 id="crew-cards-title" className="text-lg font-semibold tracking-tight text-fg">
            Crew Status & Personal Baselines
          </h2>
          <Link
            to="/crew"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-signal"
          >
            <span>Detailed Indicators</span>
            <ArrowRightIcon />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {astronauts.map((astronaut) => {
            const data = crewData[astronaut.id]
            const crewAlerts = unackAlerts.filter((a) => a.astronautId === astronaut.id)
            const recentAlerts = crewAlerts.filter((a) => isRecent(a.timestamp))

            return (
              <CrewCard
                key={astronaut.id}
                astronaut={astronaut}
                latestReading={data?.latest}
                baselines={data?.baselines}
                activeAlerts={recentAlerts}
                earlierAlertCount={crewAlerts.length - recentAlerts.length}
              />
            )
          })}
        </div>
      </section>

      {/* Recent Explainable Alerts Section */}
      <section aria-labelledby="active-alerts-title" className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <div className="flex items-center gap-2">
            <h2 id="active-alerts-title" className="text-lg font-semibold tracking-tight text-fg">
              Active Crew Alerts
            </h2>
            {unackAlerts.length > 0 && (
              <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-semibold text-fg">
                {unackAlerts.length}
              </span>
            )}
          </div>
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-signal"
          >
            <span>All Alerts Archive</span>
            <ArrowRightIcon />
          </Link>
        </div>

        {unackAlerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-panel p-6 text-center">
            <p className="font-medium text-fg">No Active Alerts</p>
            <p className="mt-1 text-sm text-muted">
              All crew indicators are currently within their expected personal baseline variations.
            </p>
            <button
              type="button"
              onClick={handleScanAlerts}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-line px-3 text-xs font-medium text-muted hover:bg-raised hover:text-fg"
            >
              Run Anomaly Check
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {unackAlerts.slice(0, 4).map((alert) => {
              const astro = astronauts.find((a) => a.id === alert.astronautId)
              return <AlertCard key={alert.id} alert={alert} astronaut={astro} />
            })}
          </div>
        )}
      </section>
    </div>
  )
}
