# CLAUDE.md: CrewPulse

Project brief and working rules. Follow this for the whole session.

## Project

**CrewPulse** is a crew health monitoring dashboard for astronauts on long-duration space missions.

Built for the **NASA Space Apps Challenge 2026**, challenge: *"Create Health Monitoring Software for Astronauts on Space Missions"*.

**Goal:** software that gathers health indicators and lets astronauts evaluate and act on their own health status. The mission context is radiation, isolation, altered gravity and a closed environment. These shape which indicators and alerts matter.

## Key principles (non-negotiable)

1. **Offline-first.** The app must work fully with no internet: data in local storage (IndexedDB), no required backend, no required API keys. Never add a hard dependency on a network call, a CDN, or a remote font/script. Everything ships in the bundle.
2. **Personal baselines.** Alerts compare each astronaut to their *own* baseline, never to a population average. Baselines are computed per person, per indicator.
3. **Explainable alerts.** Every alert must state: **what changed**, **why it matters**, and a **suggested action**. An alert without all three is a bug. The alert type should make it impossible to construct one without these fields.
4. **Honest about data.** All crew data is **SIMULATED**.
   - Show this clearly and persistently in the UI (a visible banner or badge, not buried).
   - Every numeric range or threshold is an *assumption*. Document each in `docs/ASSUMPTIONS.md` (value, where it is used, rationale, status "needs checking against NASA sources"). Do not present assumed numbers as NASA facts. If a number is added or changed in code, update `docs/ASSUMPTIONS.md` in the same change.
5. **Prototype, not a medical device.** Show a disclaimer in the UI footer and in the README. Suggested text: *"CrewPulse is a prototype built for a hackathon. It uses simulated data and is not a medical device. It must not be used for diagnosis or treatment."*

## Stack

- React + TypeScript (strict mode) + Vite
- Tailwind CSS
- Recharts
- Dexie (IndexedDB)
- vite-plugin-pwa (service worker, installable, works offline)
- Vitest for tests

Prefer these over adding new dependencies. Ask before adding a new runtime dependency.

## Structure

```
src/
  sim/          Simulated crew data generators (seedable, deterministic)
  engine/       Baselines, deviation detection, alert generation (pure functions)
  db/           Dexie schema, queries, seeding
  components/   Reusable UI pieces
  pages/        Route-level screens
docs/
  ASSUMPTIONS.md
README.md
CLAUDE.md
```

- Keep `engine/` and `sim/` free of React and DOM imports so they are easy to test.
- UI reads from `db/`; it does not call `sim/` or `engine/` logic inline.
- Simulation must be seedable so demos and tests are reproducible.

## Style and accessibility

- Clean, dark "mission control" look.
- Accessible: good contrast (target WCAG AA), full keyboard navigation, visible focus states, semantic HTML, ARIA where needed.
- **No color-only meaning.** Status and severity must also use text labels and/or icons/shapes (e.g. "Warning" plus an icon, not just amber).
- Charts need text alternatives (summary text or an accessible data table).
- Responsive for laptop and phone. Check layouts at narrow widths.

## Code conventions

- Modular, small files, clear names. TypeScript strict; avoid `any`.
- Short comments explaining **non-obvious logic** (baseline math, thresholds, simulation models). Do not comment the obvious.
- Pure functions in `engine/` and `sim/`.
- Handle empty states (no data yet, insufficient baseline history) explicitly in both engine and UI.

## Testing

- Vitest. Prioritize `engine/` (baseline calculation, deviation detection, alert fields always populated) and `sim/` (determinism with a fixed seed).
- Run tests and the type check before calling a task done.

## Definition of done for any change

- Works with the network disabled.
- Simulated-data label and footer disclaimer still visible.
- Any new numeric assumption recorded in `docs/ASSUMPTIONS.md`.
- Alerts still include what changed, why it matters, and a suggested action.
- Tests pass and types check.
- Keyboard and contrast sanity check on new UI.

## Working agreement

- Keep to this brief. If a request conflicts with a principle above, say so and propose an alternative instead of silently breaking it.
- Prefer small, working increments over big unfinished ones. The hackathon is time-boxed, so keep a runnable demo at every step.
- Never claim data is real, and never imply clinical validity.
