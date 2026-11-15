import type { Astronaut } from './types'

// A fictional crew of four with clearly different baselines. Names and roles are
// invented. The crew is fixed (it does not depend on the seed) so scenarios can
// refer to stable ids. All baseline numbers are assumptions (see docs/ASSUMPTIONS.md).
const CREW: readonly Astronaut[] = [
  {
    id: 'astro-1',
    name: 'Mara Voss',
    role: 'Commander',
    age: 46,
    baseline: {
      restingHeartRate: 58,
      hrv: 48,
      sleepHours: 6.8,
      sleepQuality: 72,
      stressScore: 32,
      dailyActivityMinutes: 110,
      bodyTemp: 36.7,
      spo2: 97.5,
      radiationDoseRate: 0.55,
      mood: 4.0,
      exerciseStartHour: 16,
    },
  },
  {
    id: 'astro-2',
    name: 'Kenji Aoyama',
    role: 'Flight Engineer',
    age: 39,
    baseline: {
      restingHeartRate: 54,
      hrv: 66,
      sleepHours: 7.2,
      sleepQuality: 80,
      stressScore: 26,
      dailyActivityMinutes: 140,
      bodyTemp: 36.6,
      spo2: 98.0,
      radiationDoseRate: 0.52,
      mood: 4.2,
      exerciseStartHour: 8,
    },
  },
  {
    id: 'astro-3',
    name: 'Lucía Ferreira',
    role: 'Medical Officer',
    age: 42,
    baseline: {
      restingHeartRate: 63,
      hrv: 54,
      sleepHours: 6.5,
      sleepQuality: 68,
      stressScore: 36,
      dailyActivityMinutes: 95,
      bodyTemp: 36.8,
      spo2: 97.8,
      radiationDoseRate: 0.58,
      mood: 3.8,
      exerciseStartHour: 17,
    },
  },
  {
    id: 'astro-4',
    name: 'Dev Raman',
    role: 'Mission Specialist',
    age: 34,
    baseline: {
      restingHeartRate: 66,
      hrv: 61,
      sleepHours: 7.6,
      sleepQuality: 84,
      stressScore: 22,
      dailyActivityMinutes: 75,
      bodyTemp: 36.5,
      spo2: 98.3,
      radiationDoseRate: 0.5,
      mood: 4.4,
      exerciseStartHour: 12,
    },
  },
]

/** Returns a fresh copy of the crew, so callers can't change the shared one. */
export function createCrew(): Astronaut[] {
  return CREW.map((a) => ({ ...a, baseline: { ...a.baseline } }))
}
