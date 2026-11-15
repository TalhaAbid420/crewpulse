import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertCard } from '../components/AlertCard'
import { SeverityBadge } from '../components/SeverityBadge'
import { useAlerts, useAstronauts, useReadings } from '../db'
import { computePersonalBaselines } from '../engine'
import { METRIC_INFO, type MetricKey } from '../sim'

const CHART_METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'heartRate', label: 'Resting Heart Rate', unit: 'bpm' },
  { key: 'hrv', label: 'Heart Rate Variability', unit: 'ms' },
  { key: 'spo2', label: 'Blood Oxygen (SpO2)', unit: '%' },
  { key: 'sleepHours', label: 'Sleep Duration', unit: 'hours' },
  { key: 'stressScore', label: 'Stress Score', unit: '/100' },
  { key: 'radiationDoseRate', label: 'Radiation Dose Rate', unit: 'mSv/day' },
  { key: 'mood', label: 'Mood & Morale', unit: '/5.0' },
]

export function CrewMemberPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: astronauts = [] } = useAstronauts()

  // Selected astronaut id (default to first astronaut)
  const astronautId = searchParams.get('id') || astronauts[0]?.id || 'astro-1'
  const activeAstronaut = astronauts.find((a) => a.id === astronautId) || astronauts[0]

  const { data: readings = [] } = useReadings(activeAstronaut?.id)
  const { data: alerts = [] } = useAlerts({ astronautId: activeAstronaut?.id })

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('heartRate')
  const [timeWindowDays, setTimeWindowDays] = useState<number>(14)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    if (activeAstronaut) {
      document.title = `${activeAstronaut.name} - Crew Member - CrewPulse`
    } else {
      document.title = 'Crew Member - CrewPulse'
    }
  }, [activeAstronaut])

  // Compute personal baseline from historical readings
  const baselines = useMemo(() => {
    if (!activeAstronaut || readings.length === 0) return null
    return computePersonalBaselines(activeAstronaut.id, readings)
  }, [activeAstronaut, readings])

  // Filter readings for chart based on selected time window
  const chartData = useMemo(() => {
    if (readings.length === 0) return []
    const count = Math.min(readings.length, timeWindowDays * 24)
    const windowSlice = readings.slice(-count)

    return windowSlice.map((r) => {
      const date = new Date(r.timestamp)
      return {
        timestamp: r.timestamp,
        timeLabel: `D${r.missionDay} ${date.toISOString().slice(11, 16)}`,
        missionDay: r.missionDay,
        value: Number(r[selectedMetric]?.toFixed(2)),
      }
    })
  }, [readings, timeWindowDays, selectedMetric])

  const latestReading = readings.length > 0 ? readings[readings.length - 1] : undefined
  const activeMetricInfo = METRIC_INFO[selectedMetric]
  const currentBaseline = baselines?.[selectedMetric]

  // Overall status based on active alerts
  const unackAlerts = alerts.filter((a) => !a.acknowledged)
  let status: 'critical' | 'warning' | 'watch' | 'nominal' = 'nominal'
  if (unackAlerts.some((a) => a.severity === 'critical')) status = 'critical'
  else if (unackAlerts.some((a) => a.severity === 'warning')) status = 'warning'
  else if (unackAlerts.some((a) => a.severity === 'watch')) status = 'watch'

  return (
    <div className="space-y-8">
      {/* Astronaut Selector Pills */}
      <section aria-label="Crew Member Selection">
        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-2">
            Select Crew:
          </span>
          {astronauts.map((astro) => {
            const isSelected = astro.id === activeAstronaut?.id
            return (
              <button
                key={astro.id}
                type="button"
                onClick={() => setSearchParams({ id: astro.id })}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-signal bg-raised font-semibold text-fg shadow-sm'
                    : 'border-line bg-panel text-muted hover:bg-raised hover:text-fg'
                }`}
                aria-pressed={isSelected}
              >
                <span>{astro.name}</span>
                <span className="text-[10px] text-muted">({astro.role})</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Profile Header */}
      {activeAstronaut && (
        <section
          aria-labelledby="astronaut-profile-name"
          className="flex flex-col gap-4 rounded-lg border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-mono text-lg font-bold text-signal">
              {activeAstronaut.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 id="astronaut-profile-name" className="text-xl font-bold tracking-tight text-fg md:text-2xl">
                  {activeAstronaut.name}
                </h1>
                <SeverityBadge severity={status} size="sm" />
              </div>
              <p className="text-xs text-muted mt-0.5">
                {activeAstronaut.role} · Age {activeAstronaut.age} · Telemetry Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted sm:border-l sm:border-line sm:pl-6">
            <div>
              <span className="block font-semibold text-fg">
                {readings.length > 0 ? `${Math.round(readings.length / 24)} Days` : '—'}
              </span>
              <span>Baseline History</span>
            </div>
            <div className="pl-4">
              <span className="block font-semibold text-fg">{unackAlerts.length}</span>
              <span>Open Alerts</span>
            </div>
          </div>
        </section>
      )}

      {/* Key Health Indicators Grid vs Personal Baseline */}
      <section aria-labelledby="vitals-heading" className="space-y-4">
        <h2 id="vitals-heading" className="text-lg font-semibold tracking-tight text-fg">
          Current Health Indicators vs Personal Baseline
        </h2>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {CHART_METRICS.map(({ key, label, unit }) => {
            const val = latestReading ? latestReading[key] : undefined
            const base = baselines?.[key]
            const isSelected = selectedMetric === key

            // Assess deviation
            let stateBadge: { text: string; color: string } = {
              text: 'Nominal',
              color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30',
            }
            if (val !== undefined && base) {
              if (val > base.upperCritical || val < base.lowerCritical) {
                stateBadge = {
                  text: 'Critical Deviation',
                  color: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
                }
              } else if (val > base.upperNormal || val < base.lowerNormal) {
                stateBadge = {
                  text: 'Off Baseline',
                  color: 'text-amber-400 border-amber-500/30 bg-amber-950/30',
                }
              }
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMetric(key)}
                className={`flex flex-col rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-signal bg-raised/90 ring-1 ring-signal/50'
                    : 'border-line bg-panel hover:border-line/90 hover:bg-raised/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-medium text-muted">{label}</span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${stateBadge.color}`}
                  >
                    {stateBadge.text}
                  </span>
                </div>

                <div className="mt-2 font-mono text-2xl font-bold text-fg">
                  {val !== undefined ? `${val.toFixed(key === 'spo2' || key === 'radiationDoseRate' || key === 'mood' ? 1 : 0)} ${unit}` : '—'}
                </div>

                <div className="mt-2 border-t border-line/60 pt-2 text-[11px] text-muted">
                  <div>
                    Personal Baseline:{' '}
                    <span className="font-mono font-medium text-fg">
                      {base ? `${base.mean.toFixed(1)} ${unit}` : 'Calibrating'}
                    </span>
                  </div>
                  <div>
                    Normal Range:{' '}
                    <span className="font-mono text-fg/80">
                      {base ? `[${base.lowerNormal.toFixed(1)} – ${base.upperNormal.toFixed(1)}]` : '—'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Interactive Trend Chart with Personal Baseline Bands */}
      <section aria-labelledby="chart-heading" className="space-y-4 rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="chart-heading" className="text-lg font-semibold tracking-tight text-fg">
              {activeMetricInfo.label} Trend & Baseline Band
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Shaded band indicates this astronaut's personal ±1.5 standard deviation nominal zone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time Window Switcher */}
            <div className="flex items-center rounded-md border border-line bg-base p-0.5 text-xs">
              {[
                { label: '7D', days: 7 },
                { label: '14D', days: 14 },
                { label: '30D', days: 30 },
                { label: '60D', days: 60 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTimeWindowDays(days)}
                  className={`min-h-7 rounded px-2.5 font-medium transition-colors ${
                    timeWindowDays === days
                      ? 'bg-signal font-semibold text-base'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Accessibility Toggle: Accessible Table Alternative */}
            <button
              type="button"
              onClick={() => setShowTable((prev) => !prev)}
              className="inline-flex min-h-8 items-center rounded-md border border-line px-2.5 text-xs font-medium text-muted hover:bg-raised hover:text-fg"
            >
              {showTable ? 'View Chart' : 'Accessible Table'}
            </button>
          </div>
        </div>

        {/* Chart View */}
        {!showTable ? (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a57" opacity={0.5} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#9db0cc"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#9db0cc" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121c30',
                    borderColor: '#2a3a57',
                    borderRadius: '6px',
                    color: '#e8eef8',
                    fontSize: '12px',
                  }}
                />

                {/* Shaded Personal Baseline Nominal Zone */}
                {currentBaseline && (
                  <ReferenceArea
                    y1={currentBaseline.lowerNormal}
                    y2={currentBaseline.upperNormal}
                    fill="#1a2740"
                    fillOpacity={0.6}
                    stroke="#2a3a57"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Personal Baseline Mean Line */}
                {currentBaseline && (
                  <ReferenceLine
                    y={currentBaseline.mean}
                    stroke="#9db0cc"
                    strokeDasharray="4 4"
                    label={{
                      value: `Base: ${currentBaseline.mean}`,
                      fill: '#9db0cc',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                {/* Actual Telemetry Line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  name={activeMetricInfo.label}
                  stroke="#52d6c8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#52d6c8', stroke: '#0b1220' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Accessible Data Table Alternative */
          <div className="max-h-72 overflow-y-auto rounded border border-line">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-raised border-b border-line text-muted">
                <tr>
                  <th className="p-2">Time / Day</th>
                  <th className="p-2">Observed ({CHART_METRICS.find((m) => m.key === selectedMetric)?.unit})</th>
                  <th className="p-2">Baseline Mean</th>
                  <th className="p-2">Normal Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {chartData.slice(-24).map((row) => (
                  <tr key={row.timestamp} className="hover:bg-raised/40">
                    <td className="p-2 text-muted">{row.timeLabel}</td>
                    <td className="p-2 font-semibold text-fg">{row.value}</td>
                    <td className="p-2 text-muted">{currentBaseline?.mean ?? '—'}</td>
                    <td className="p-2 text-muted">
                      {currentBaseline
                        ? `[${currentBaseline.lowerNormal} – ${currentBaseline.upperNormal}]`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Astronaut Specific Active Alerts */}
      <section aria-labelledby="crew-alerts-heading" className="space-y-4">
        <h2 id="crew-alerts-heading" className="text-lg font-semibold tracking-tight text-fg">
          Health Alerts ({activeAstronaut?.name})
        </h2>

        {alerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-panel p-6 text-center text-sm text-muted">
            No alerts logged for {activeAstronaut?.name}. Telemetry adheres to personal baselines.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} astronaut={activeAstronaut} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
