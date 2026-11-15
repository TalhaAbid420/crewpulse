import { useEffect } from 'react'
import { METRIC_INFO, METRIC_KEYS, TYPICAL_BASELINE_RANGE } from '../sim'

export function AboutDataPage() {
  useEffect(() => {
    document.title = 'About the Data - CrewPulse'
  }, [])

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Title & Core Honesty Notice */}
      <section aria-labelledby="about-title">
        <h1 id="about-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
          About the Data & Simulation Models
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          CrewPulse was created as a software prototype for the{' '}
          <strong className="text-fg">NASA Space Apps Challenge 2026</strong>. In accordance with
          our core principles, this page details the mathematical simulation models, the
          architectural guarantees, and every numeric assumption used.
        </p>
      </section>

      {/* Simulated Data & Medical Disclaimer Alert */}
      <div
        role="alert"
        className="rounded-lg border border-dashed border-caution/60 bg-caution/10 p-5 text-sm"
      >
        <div className="flex items-start gap-3">
          <span className="font-bold text-caution uppercase tracking-wider text-xs">
            Prototype Disclaimer
          </span>
        </div>
        <p className="mt-2 text-fg/90 leading-relaxed font-medium">
          CrewPulse is a prototype built for a hackathon. It uses simulated data and is not a
          medical device. It must not be used for diagnosis or treatment.
        </p>
        <p className="mt-1 text-xs text-muted">
          All astronaut names, roles, vital telemetry values, and mission scenarios are synthetic
          and generated locally inside your browser. No actual astronaut medical records were used.
        </p>
      </div>

      {/* Key Architectural Principles */}
      <section aria-labelledby="principles-title" className="space-y-4">
        <h2 id="principles-title" className="text-lg font-semibold tracking-tight text-fg">
          Core Architectural Principles
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-panel p-4">
            <h3 className="font-semibold text-signal text-sm">1. Offline-First</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Zero network dependencies. All data is persisted in browser IndexedDB via Dexie. Font
              files, stylesheets, and application scripts ship entirely inside the standalone bundle.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-panel p-4">
            <h3 className="font-semibold text-signal text-sm">2. Personal Baselines</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Astronaut health alerts are calculated strictly against their own historical baseline
              distribution (rolling mean and standard deviation), never against a generic population
              average.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-panel p-4">
            <h3 className="font-semibold text-signal text-sm">3. Explainable Alerts</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Every alert explicitly provides <strong>What Changed</strong>,{' '}
              <strong>Why It Matters</strong>, and a concrete <strong>Suggested Action</strong>. An
              alert without all three fields is treated as a software bug.
            </p>
          </div>
        </div>
      </section>

      {/* Metric Assumptions Table */}
      <section aria-labelledby="metrics-table-title" className="space-y-4">
        <div>
          <h2 id="metrics-table-title" className="text-lg font-semibold tracking-tight text-fg">
            Simulated Health Indicators & Assumptions
          </h2>
          <p className="mt-1 text-xs text-muted">
            Typical ranges represent the distribution baseline means are drawn from. Hard limits
            enforce physical boundaries. All values are documented in{' '}
            <code className="text-signal font-mono">docs/ASSUMPTIONS.md</code>.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-raised font-mono text-muted">
              <tr>
                <th className="p-3">Indicator</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Typical Baseline</th>
                <th className="p-3">Simulation Limits</th>
                <th className="p-3">Source Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 font-mono">
              {METRIC_KEYS.map((key) => {
                const info = METRIC_INFO[key]
                const typical =
                  key === 'heartRate'
                    ? TYPICAL_BASELINE_RANGE.restingHeartRate
                    : key === 'activityMinutes'
                      ? TYPICAL_BASELINE_RANGE.dailyActivityMinutes
                      : TYPICAL_BASELINE_RANGE[key as keyof typeof TYPICAL_BASELINE_RANGE]

                return (
                  <tr key={key} className="hover:bg-raised/30">
                    <td className="p-3 font-semibold text-fg font-sans">{info.label}</td>
                    <td className="p-3 text-muted">{info.unit}</td>
                    <td className="p-3 text-fg">
                      {typical ? `${typical[0]} to ${typical[1]}` : '—'}
                    </td>
                    <td className="p-3 text-muted">
                      {info.limits[0]} to {info.limits[1]}
                    </td>
                    <td className="p-3 text-amber-300/90 font-sans text-[11px]">
                      assumption, verify with NASA
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Simulation Engine Details */}
      <section aria-labelledby="simulation-details-title" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="simulation-details-title" className="text-base font-semibold text-fg">
          Deterministic PRNG & Scenario Injection
        </h2>
        <p className="text-xs text-muted leading-relaxed">
          The simulation engine uses a seedable, deterministic pseudo-random number generator
          (splitmix32 / Mulberry32). The demo mission runs for 60 simulated days under fixed seed{' '}
          <code className="font-mono text-signal">2026</code>.
        </p>
        <p className="text-xs text-muted leading-relaxed">
          Circadian cosine rhythms (±4 bpm heart rate, ±0.35°C body temperature, afternoon peaks, and
          overnight HRV elevation) modulate the readings hourly. Scripted mission scenarios (Solar
          Particle Event on Day 12, Sleep Disruption on Day 25, Isolation Fatigue on Day 35, and
          Exercise Skipped on Day 47) inject realistic physiological stressors without altering the
          underlying random noise stream.
        </p>
      </section>
    </div>
  )
}
