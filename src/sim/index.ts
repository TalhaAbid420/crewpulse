// Simulated crew data (seedable and deterministic).
// All numeric ranges are assumptions, listed in docs/ASSUMPTIONS.md.
export { METRIC_INFO, TYPICAL_BASELINE_RANGE } from './assumptions'
export { createCrew } from './crew'
export { DEMO_DAYS, DEMO_SEED, demoScenarios } from './demo'
export { generateMission, MISSION_START_MS, type MissionOptions } from './generate'
export { createRng, deriveSeed, type Rng } from './random'
export { envelope, SCENARIO_LABELS, scenarioModifiers, type ScenarioModifiers } from './scenarios'
export {
  METRIC_KEYS,
  type Alert,
  type Astronaut,
  type BaselineTraits,
  type MetricKey,
  type Reading,
  type ScenarioEvent,
  type ScenarioType,
  type Severity,
} from './types'
