import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAstronauts } from '../db'
import { getReadings } from '../db/readings'
import { type MetricKey, type Reading } from '../sim'

const CREW_COLORS = ['#52d6c8', '#f5b94a', '#a78bfa', '#fb7185']

const METRICS_OPTIONS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'radiationDoseRate', label: 'Radiation Dose Rate (SPE)', unit: 'mSv/day' },
  { key: 'heartRate', label: 'Resting Heart Rate', unit: 'bpm' },
  { key: 'hrv', label: 'Heart Rate Variability', unit: 'ms' },
  { key: 'sleepHours', label: 'Sleep Duration', unit: 'hours' },
  { key: 'stressScore', label: 'Physiological Stress', unit: '/100' },
  { key: 'spo2', label: 'Blood Oxygen (SpO2)', unit: '%' },
  { key: 'mood', label: 'Mood & Morale', unit: '/5.0' },
]

interface MissionScenarioInfo {
  name: string
  dayRange: string
  startHour: number
  endHour: number
  affected: string
  description: string
}

const DEMO_SCENARIO_EVENTS: MissionScenarioInfo[] = [
  {
    name: 'Solar Particle Event (SPE)',
    dayRange: 'Day 12 – 14',
    startHour: 12 * 24,
    endHour: 12 * 24 + 36,
    affected: 'All Crew Members',
    description: 'Radiation rate spikes to 12× baseline, prompting radiation shelter protocol.',
  },
  {
    name: 'Acoustic Sleep Disruption',
    dayRange: 'Day 25 – 28',
    startHour: 25 * 24,
    endHour: 25 * 24 + 72,
    affected: 'Lucía Ferreira (astro-3)',
    description: 'Sleep duration drops by ~2.5h, followed 24h later by a 28% drop in HRV and elevated stress.',
  },
  {
    name: 'Isolation & Confinement Fatigue',
    dayRange: 'Day 35 – 45',
    startHour: 35 * 24,
    endHour: 35 * 24 + 240,
    affected: 'Dev Raman (astro-4)',
    description: 'Gradual morale decline and climbing stress scores over a 10-day period.',
  },
  {
    name: 'Exercise Countermeasure Skipped',
    dayRange: 'Day 47 – 52',
    startHour: 47 * 24,
    endHour: 47 * 24 + 120,
    affected: 'Mara Voss (astro-1)',
    description: 'Daily activity drops 80%, accompanied by a slow upward drift in resting heart rate.',
  },
]

type WindowKey = 'all' | 'spe' | 'sleep' | 'isolation' | 'exercise'

export function TimelinePage() {
  const { data: astronauts = [] } = useAstronauts()
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('radiationDoseRate')
  const [activeWindow, setActiveWindow] = useState<WindowKey>('all')
  const [allReadings, setAllReadings] = useState<Record<string, Reading[]>>({})
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    document.title = 'Timeline - CrewPulse'
  }, [])

  // Load readings for all astronauts
  useEffect(() => {
    if (astronauts.length === 0) return
    let cancelled = false

    async function fetchAll() {
      const data: Record<string, Reading[]> = {}
      for (const a of astronauts) {
        data[a.id] = await getReadings(a.id)
      }
      if (!cancelled) {
        setAllReadings(data)
      }
    }

    void fetchAll()
    return () => {
      cancelled = true
    }
  }, [astronauts])

  // Aggregate multi-crew chart data by mission day/hour
  const chartData = useMemo(() => {
    const firstAstro = astronauts[0]
    if (!firstAstro || !allReadings[firstAstro.id]) return []

    const baseList = allReadings[firstAstro.id]
    let startIdx = 0
    let endIdx = baseList.length

    if (activeWindow === 'spe') {
      startIdx = Math.max(0, 11 * 24)
      endIdx = Math.min(baseList.length, 16 * 24)
    } else if (activeWindow === 'sleep') {
      startIdx = Math.max(0, 24 * 24)
      endIdx = Math.min(baseList.length, 30 * 24)
    } else if (activeWindow === 'isolation') {
      startIdx = Math.max(0, 34 * 24)
      endIdx = Math.min(baseList.length, 46 * 24)
    } else if (activeWindow === 'exercise') {
      startIdx = Math.max(0, 46 * 24)
      endIdx = Math.min(baseList.length, 54 * 24)
    }

    const sampledSlice = baseList.slice(startIdx, endIdx)
    // To keep chart rendering fast over 60 days (1,440 hours), downsample by 4 for 'all', or 1 for windows
    const step = activeWindow === 'all' ? 4 : 1

    const result = []
    for (let i = 0; i < sampledSlice.length; i += step) {
      const baseR = sampledSlice[i]
      const row: Record<string, number | string> = {
        missionDay: baseR.missionDay,
        timeLabel: `D${baseR.missionDay} ${new Date(baseR.timestamp).toISOString().slice(11, 16)}`,
      }

      for (const a of astronauts) {
        const astroReadings = allReadings[a.id]
        if (astroReadings && astroReadings[startIdx + i]) {
          const val = astroReadings[startIdx + i][selectedMetric]
          row[a.name] = Number(val?.toFixed(2))
        }
      }
      result.push(row)
    }

    return result
  }, [astronauts, allReadings, activeWindow, selectedMetric])

  const activeMetricOption = METRICS_OPTIONS.find((m) => m.key === selectedMetric)

  return (
    <div className="space-y-8">
      {/* Header */}
      <section aria-labelledby="timeline-heading">
        <h1 id="timeline-heading" className="text-2xl font-semibold tracking-tight md:text-3xl">
          Mission Health Timeline
        </h1>
        <p className="mt-1 text-sm text-muted">
          Longitudinal 60-day telemetry across all astronauts, highlighting personal deviations
          during key operational scenarios.
        </p>
      </section>

      {/* Scripted Mission Scenario Cards */}
      <section aria-label="Mission Scenarios" className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Injected Mission Scenarios (Click to inspect time window):
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_SCENARIO_EVENTS.map((scenario, index) => {
            const key: Exclude<WindowKey, 'all'> =
              index === 0
                ? 'spe'
                : index === 1
                  ? 'sleep'
                  : index === 2
                    ? 'isolation'
                    : 'exercise'
            const isSelected = activeWindow === key

            return (
              <button
                key={scenario.name}
                type="button"
                onClick={() => setActiveWindow(isSelected ? 'all' : key)}
                className={`flex flex-col rounded-lg border p-3.5 text-left transition-colors ${
                  isSelected
                    ? 'border-signal bg-raised/90 shadow-sm'
                    : 'border-line bg-panel hover:bg-raised'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-fg">
                  <span>{scenario.name}</span>
                  <span className="rounded bg-base px-1.5 py-0.5 text-[10px] text-muted">
                    {scenario.dayRange}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                  {scenario.description}
                </p>
                <span className="mt-2 text-[11px] font-medium text-signal">
                  Target: {scenario.affected}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Chart Control Toolbar */}
      <section aria-label="Chart Controls" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel p-4">
        {/* Metric Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="timeline-metric-select" className="text-xs font-medium text-muted">
            Indicator:
          </label>
          <select
            id="timeline-metric-select"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
            className="rounded border border-line bg-base px-2.5 py-1.5 text-xs text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            {METRICS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Window View Selector */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-line bg-base p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveWindow('all')}
              className={`min-h-7 rounded px-3 font-medium transition-colors ${
                activeWindow === 'all'
                  ? 'bg-signal font-semibold text-base'
                  : 'text-muted hover:text-fg'
              }`}
            >
              Full 60 Days
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            className="inline-flex min-h-8 items-center rounded-md border border-line px-3 text-xs font-medium text-muted hover:bg-raised hover:text-fg"
          >
            {showTable ? 'View Chart' : 'Accessible Table'}
          </button>
        </div>
      </section>

      {/* Interactive Recharts Graph */}
      <section aria-label="Comparative Timeline Graph" className="rounded-lg border border-line bg-panel p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-fg">
            Comparative {activeMetricOption?.label} ({activeMetricOption?.unit})
          </h2>
          <p className="text-xs text-muted">
            {activeWindow === 'all'
              ? 'Displaying 60-day telemetry trends across all four astronauts.'
              : `Focusing on ${DEMO_SCENARIO_EVENTS.find((s) => s.name.toLowerCase().includes(activeWindow))?.name || 'Scenario window'}.`}
          </p>
        </div>

        {!showTable ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a57" opacity={0.5} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#9db0cc"
                  fontSize={11}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#9db0cc" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121c30',
                    borderColor: '#2a3a57',
                    borderRadius: '6px',
                    color: '#e8eef8',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '12px', color: '#e8eef8' }}
                />

                {/* Scenario Highlights Area */}
                {activeWindow === 'spe' && (
                  <ReferenceArea
                    x1="D12 00:00"
                    x2="D13 12:00"
                    fill="#fb7185"
                    fillOpacity={0.15}
                    label={{ value: 'Solar Particle Event', fill: '#fb7185', fontSize: 11 }}
                  />
                )}

                {astronauts.map((astro, index) => (
                  <Line
                    key={astro.id}
                    type="monotone"
                    dataKey={astro.name}
                    stroke={CREW_COLORS[index % CREW_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Accessible Data Table Alternative */
          <div className="max-h-80 overflow-y-auto rounded border border-line">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-raised border-b border-line text-muted">
                <tr>
                  <th className="p-2">Time / Day</th>
                  {astronauts.map((a) => (
                    <th key={a.id} className="p-2">
                      {a.name} ({activeMetricOption?.unit})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {chartData.slice(-30).map((row, idx) => (
                  <tr key={idx} className="hover:bg-raised/40">
                    <td className="p-2 text-muted">{row.timeLabel}</td>
                    {astronauts.map((a) => (
                      <td key={a.id} className="p-2 font-medium text-fg">
                        {row[a.name] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
