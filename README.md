# CrewPulse

Crew health monitoring dashboard for astronauts on long-duration missions.
Built for the NASA Space Apps Challenge 2026 challenge
**"Create Health Monitoring Software for Astronauts on Space Missions"**.

> **Disclaimer:** CrewPulse is a prototype built for a hackathon. All crew data is
> **simulated**. It is **not a medical device** and must not be used for diagnosis
> or treatment.

## Principles

1. **Offline-first**: works with no internet, no backend and no API keys.
2. **Personal baselines**: each astronaut is compared with their own baseline.
3. **Explainable alerts**: what changed, why it matters, and a suggested action.
4. **Honest about data**: simulated data is labelled in the UI; assumed numbers
   are listed in [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md).
5. **Prototype, not a medical device.**

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # development server (http://localhost:5173)
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build (http://localhost:4173)
npm test           # run the Vitest suite once
```

The app works offline after its first load in a browser that supports service
workers. Use `npm run build` then `npm run preview` to try the offline behavior,
because the service worker is only active in the production build.

## Simulator

`src/sim` generates the (simulated) crew data. It is seeded, so the same seed
always gives the same mission.

```ts
import { createCrew, generateMission } from './sim'

const crew = createCrew() // 4 fictional astronauts with different baselines
const readings = generateMission(30, 2026, [
  // hours are counted from the start of the mission
  { type: 'solar-particle-event', startHour: 96, durationHours: 36, astronautIds: ['astro-1', 'astro-2'] },
  { type: 'isolation-fatigue', startHour: 240, durationHours: 240, astronautIds: ['astro-4'] },
])
```

Scenario types: `solar-particle-event`, `sleep-disruption`, `isolation-fatigue`,
`exercise-skipped`. Every number the simulator uses is listed in
[docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md).

## Storage

All data is kept in the browser with IndexedDB (via Dexie), so the app needs no
backend and works offline. Tables: `astronauts`, `readings` (keyed by
`[astronautId+timestamp]`), `alerts` and `settings`.

- On first load, if the database is empty, a 60-day demo mission is generated and
  stored automatically.
- **Menu > Reset demo data** (in the header) replaces everything with a fresh demo
  mission and clears all alerts.
- Functions live in `src/db`: `seedMission`, `getReadings`, `saveAlert`,
  `getAlerts`, `acknowledgeAlert`, `getSettings`, `updateSettings`.
- React hooks (`useAlerts`, `useReadings`, `useAstronauts`, `useSettings`, and the
  general `useLiveData`) re-render a component whenever the data it reads changes.

```tsx
const { data: alerts, isLoading } = useAlerts({ astronautId: 'astro-3', acknowledged: false })
```

Tests use `fake-indexeddb`, so they run without a browser.

## Alerts

`src/engine` learns each astronaut's baseline from the first 14 days, separately for
every hour of the day, using medians so an early event cannot skew it. A reading
alerts only after the deviation lasts several hours in a row, and each episode raises
one alert (plus another only if it gets worse). On a mission with no events this gives
about 2 chance alerts per 60 days for the whole crew; the four scripted demo events
are all caught. Every threshold is listed in [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md).

## Stack

React, TypeScript, Vite, Tailwind CSS, Recharts, Dexie (IndexedDB), React Router,
vite-plugin-pwa, Vitest.

## Structure

```
src/sim/         simulated crew data generators
src/engine/      baselines, deviation detection, alerts (pure functions)
src/db/          Dexie (IndexedDB) storage, seeding and React hooks
src/components/  reusable UI
src/pages/       route-level screens
docs/            ASSUMPTIONS.md
```

See [CLAUDE.md](CLAUDE.md) for the full project brief and working rules.
