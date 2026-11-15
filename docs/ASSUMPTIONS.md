# Assumptions

CrewPulse is a prototype. **All crew data is simulated**, and every number used
by the simulator is an **assumption**, not a NASA-verified value.

Every row below has the source **"assumption, verify against NASA sources"**.
The numbers live in `src/sim/assumptions.ts` (and the fictional crew in
`src/sim/crew.ts`). If you change a number there, update this file in the same
change. The alert engine will add its own thresholds to this file later.

Where a note mentions what is "commonly reported", that is an unchecked recollection
used only to choose a plausible placeholder. Check it before relying on it.

## 1. Metrics

"Typical range" is the range an astronaut's own average (baseline) is chosen
from. "Hard limits" are the bounds generated values are clamped into, so the
simulator can never output something physically absurd.

| Metric | Unit | Typical range | Hard limits | Notes | Source |
| ------ | ---- | ------------- | ----------- | ----- | ------ |
| Resting heart rate | bpm | 50 to 75 | 35 to 140 | Resting adult range, fit adults toward the low end. | assumption, verify against NASA sources |
| Heart rate variability (RMSSD) | ms | 30 to 90 | 5 to 200 | Lower with age and under strain. | assumption, verify against NASA sources |
| Sleep duration | hours per night | 5.5 to 8 | 2 to 10 | Station crews are commonly reported to sleep less than the 8 hours recommended on Earth. | assumption, verify against NASA sources |
| Sleep quality | score 0-100 | 55 to 90 | 0 to 100 | Invented score, no real-world scale implied. | assumption, verify against NASA sources |
| Stress score | score 0-100 | 15 to 45 | 0 to 100 | Invented score, no real-world scale implied. | assumption, verify against NASA sources |
| Physical activity | minutes per hour | 60 to 150 minutes per DAY | 0 to 60 per hour | Each reading holds the minutes of activity in that hour. The 24 hourly values add up to the day's total. | assumption, verify against NASA sources |
| Body temperature | °C | 36.3 to 37.0 (24-hour mean) | 35 to 40 | The daily rhythm in section 3 moves it above and below this mean. | assumption, verify against NASA sources |
| Blood oxygen saturation (SpO2) | % | 96 to 99 | 85 to 100 | Healthy adults at rest. | assumption, verify against NASA sources |
| Radiation dose rate | mSv/day equivalent | 0.3 to 0.8 | 0 to 50 | Low-Earth-orbit-like. Deep-space missions are commonly reported to be several times higher. This is a rate, not an accumulated dose. | assumption, verify against NASA sources |
| Mood | score 1-5 | 3.5 to 4.6 | 1 to 5 | Self-rated, shown with decimals so slow trends are visible. | assumption, verify against NASA sources |

## 2. Fictional crew baselines

The crew is invented. Names, roles and ages are fictional. Each baseline is the
long-run value the simulator steers that person toward. **The alert engine must
learn baselines from the readings and must not read these values.**

| Baseline | Mara Voss (astro-1) | Kenji Aoyama (astro-2) | Lucía Ferreira (astro-3) | Dev Raman (astro-4) | Source |
| -------- | ------------------- | ---------------------- | ------------------------ | ------------------- | ------ |
| Role | Commander | Flight Engineer | Medical Officer | Mission Specialist | fictional |
| Age | 46 | 39 | 42 | 34 | fictional |
| Resting heart rate (bpm) | 58 | 54 | 63 | 66 | assumption, verify against NASA sources |
| HRV, RMSSD (ms) | 48 | 66 | 54 | 61 | assumption, verify against NASA sources |
| Sleep duration (hours per night) | 6.8 | 7.2 | 6.5 | 7.6 | assumption, verify against NASA sources |
| Sleep quality (0-100) | 72 | 80 | 68 | 84 | assumption, verify against NASA sources |
| Stress score (0-100) | 32 | 26 | 36 | 22 | assumption, verify against NASA sources |
| Daily activity (minutes per day) | 110 | 140 | 95 | 75 | assumption, verify against NASA sources |
| Body temperature, 24-hour mean (°C) | 36.7 | 36.6 | 36.8 | 36.5 | assumption, verify against NASA sources |
| SpO2 (%) | 97.5 | 98.0 | 97.8 | 98.3 | assumption, verify against NASA sources |
| Radiation dose rate (mSv/day equivalent) | 0.55 | 0.52 | 0.58 | 0.50 | assumption, verify against NASA sources |
| Mood (1-5) | 4.0 | 4.2 | 3.8 | 4.4 | assumption, verify against NASA sources |
| Exercise block starts at (hour of day) | 16 | 8 | 17 | 12 | assumption, verify against NASA sources |

## 3. Daily rhythm

Hours are mission-clock hours (0 to 23). A "peak" is the hour a smooth cosine
curve is highest. The lowest point is 12 hours later.

| Parameter | Value | Used for | Source |
| --------- | ----- | -------- | ------ |
| Sleep window | 23:00 to 07:00 | Sleep-time dips, no activity while asleep, when sleep values update | assumption, verify against NASA sources |
| Resting heart rate rhythm | plus or minus 4 bpm, peak 16:00 | Lower at night, higher in the afternoon | assumption, verify against NASA sources |
| HRV rhythm | plus or minus 15% of baseline, peak 04:00 | Higher during sleep | assumption, verify against NASA sources |
| Body temperature rhythm | plus or minus 0.35 °C, peak 17:00 | Coolest before dawn | assumption, verify against NASA sources |
| Stress score rhythm | plus or minus 5 points, peak 14:00 | Lower at night | assumption, verify against NASA sources |
| Mood rhythm | plus or minus 0.12 points, peak 15:00 | Small afternoon lift | assumption, verify against NASA sources |
| SpO2 dip while asleep | 0.4 percentage points lower | Small overnight dip | assumption, verify against NASA sources |
| Exercise block | 2 consecutive hours per day, holding 65% of the day's activity | Spread of activity minutes. The other 35% is spread evenly over the remaining waking hours (07:00 to 23:00). | assumption, verify against NASA sources |

## 4. Random variation (noise)

Values are standard deviations unless noted.

| Metric | Hourly noise | Day-to-day wandering | Night-to-night | Source |
| ------ | ------------ | -------------------- | -------------- | ------ |
| Resting heart rate | 1.5 bpm | 1.5 bpm | | assumption, verify against NASA sources |
| Heart rate variability | 3 ms | 4 ms | | assumption, verify against NASA sources |
| Body temperature | 0.08 °C | | | assumption, verify against NASA sources |
| SpO2 | 0.35 percentage points | | | assumption, verify against NASA sources |
| Stress score | 4 points | 4 points | | assumption, verify against NASA sources |
| Mood | 0.08 points | 0.2 points | | assumption, verify against NASA sources |
| Physical activity | 15% of the hour's expected minutes | 12% of the day's baseline minutes | | assumption, verify against NASA sources |
| Radiation dose rate | 8% of baseline | | | assumption, verify against NASA sources |
| Sleep duration | | | 0.6 hours | assumption, verify against NASA sources |
| Sleep quality | | | 7 points | assumption, verify against NASA sources |

Day-to-day wandering keeps 60% of the previous day's offset and adds a fresh
random nudge, so good and bad days tend to cluster a little.

## 5. Scenario sizes

All sizes are at full intensity (intensity 1). A lower intensity scales every
effect down proportionally.

| Scenario | Parameter | Value | Source |
| -------- | --------- | ----- | ------ |
| Solar particle event | Peak dose rate | 12 times baseline | assumption, verify against NASA sources |
| Solar particle event | Rise to peak | the smaller of 2 hours and 20% of the duration | assumption, verify against NASA sources |
| Solar particle event | Decay | exponential, 4 time constants across the rest of the duration, so close to normal by the end | assumption, verify against NASA sources |
| Sleep disruption | Sleep duration loss | 2.5 hours per night | assumption, verify against NASA sources |
| Sleep disruption | Sleep quality loss | 25 points | assumption, verify against NASA sources |
| Sleep disruption | Direct effects fade out | over 12 hours after the event | assumption, verify against NASA sources |
| Sleep disruption | HRV and stress start reacting | 24 hours after sleep goes bad, reaching full size over 12 hours | assumption, verify against NASA sources |
| Sleep disruption | HRV drop | 30% | assumption, verify against NASA sources |
| Sleep disruption | Stress rise | 20 points | assumption, verify against NASA sources |
| Sleep disruption | HRV and stress fade out | over 48 hours after their window ends | assumption, verify against NASA sources |
| Isolation fatigue | Mood decline | 1.2 points, building steadily over the whole event | assumption, verify against NASA sources |
| Isolation fatigue | Stress rise | 18 points, building steadily over the whole event | assumption, verify against NASA sources |
| Isolation fatigue | Fade out | over 72 hours after the event | assumption, verify against NASA sources |
| Exercise skipped | Activity drop | 85%, reached within 2 hours | assumption, verify against NASA sources |
| Exercise skipped | Activity returns to normal | over 24 hours after the event | assumption, verify against NASA sources |
| Exercise skipped | Resting heart rate drift | up to 6 bpm, building steadily over the whole event | assumption, verify against NASA sources |
| Exercise skipped | Heart rate drift fades out | over 72 hours after the event | assumption, verify against NASA sources |

Scenarios only change the metrics listed above. Other metrics are deliberately
left alone, so each event is easy to recognize and to test.

## 6. How the simulation is organized

These are design choices rather than physiological numbers, but they affect how
the data should be read.

- **Cadence:** one reading per astronaut per simulated hour. Mission hour 0 is
  mission day 1 at 00:00. The mission clock starts at 2030-01-01 00:00 UTC, an
  arbitrary date chosen so demos are reproducible.
- **Sleep values are about the last completed night.** Sleep duration and sleep
  quality stay the same for many consecutive readings and change at 07:00, when
  the night ends. Before the first morning they describe a pre-mission night.
- **Which night a scenario affects:** a night counts as part of a scenario if the
  scenario is active at the midpoint of that night (around 03:00).
- **Activity is per hour.** To get a day's activity, add up the 24 hourly values.
- **Reproducibility:** the same seed always gives the same mission. Each astronaut
  and each kind of noise has its own random stream, and scenarios use no random
  numbers. So adding a scenario changes only the affected astronauts, and a longer
  mission starts with exactly the same readings as a shorter one.

## 7. Demo mission script

The demo mission loaded on first run and by "Reset demo data" is 60 days long,
generated with seed 2026 (`src/sim/demo.ts`). It includes one scripted event of
each type so the dashboard always has something to find. The timing and choice of
astronaut are demo-script choices, not predictions of real events. Mission days
are 1-based.

- **Solar particle event:** starts on mission day 12, lasts 36 hours, affects all
  four astronauts.
- **Sleep disruption:** starts on mission day 25, lasts 72 hours, affects Lucía
  Ferreira (astro-3).
- **Isolation fatigue:** starts on mission day 35, lasts 240 hours (10 days),
  affects Dev Raman (astro-4).
- **Exercise skipped:** starts on mission day 47, lasts 120 hours (5 days),
  affects Mara Voss (astro-1).

Kenji Aoyama (astro-2) has no scripted event except the shared solar particle
event, so he shows what a quiet baseline looks like.

## 8. Alert engine thresholds

Alerts compare each astronaut with their **own baseline**, never a population
average. Every value below is an assumption chosen for the demo (status: needs
checking against NASA sources). Code: `src/engine/circadian.ts` and
`src/engine/alerts.ts`.

### 8.1 How the personal baseline is built

| Parameter | Value | Used for | Rationale | Source |
| --------- | ----- | -------- | --------- | ------ |
| Baseline window | first 14 days of the mission | Learning each person's normal | Long enough for about 14 samples of every hour of the day. A real system would use pre-flight data. | assumption, verify against NASA sources |
| Minimum baseline sample size | 24 readings (24 hours) | All metrics | Below this there is no baseline and no alerts (the UI shows an empty state). | assumption, verify against NASA sources |
| Per-hour baseline | one typical value per hour of the day (UTC), needs at least 3 readings for each hour, otherwise one flat baseline | All metrics | Heart rate, HRV and stress follow a daily rhythm. Comparing every reading with an all-day average flags normal afternoons as "elevated". | assumption, verify against NASA sources |
| Typical value | median of that hour's readings | All metrics | A real event inside the baseline window (the demo solar particle event is on day 12) must not hide the next one. Medians ignore a few extreme hours. | assumption, verify against NASA sources |
| Spread | 1.4826 x median absolute deviation of the residuals (value minus that hour's typical value); never below half the classical standard deviation | All metrics | Robust spread of unexplained variation only. The floor stops constant data from producing a spread of about 0. | assumption, verify against NASA sources |

### 8.2 When a reading counts as a deviation

| Parameter | Value | Metric | Rationale | Source |
| --------- | ----- | ------ | --------- | ------ |
| Personal normal boundary | typical value +/- 3.0 spreads | All | Tuned on the simulator so a mission with no events gives about 2 chance alerts per 60 days across the whole crew, and every scripted event is still caught. | assumption, verify against NASA sources |
| Personal critical boundary | typical value +/- 4.5 spreads | All | Significant departure from personal norm. | assumption, verify against NASA sources |
| Warning heart rate | above the normal boundary | Resting heart rate | Autonomic stress or deconditioning | assumption, verify against NASA sources |
| Critical heart rate | above the critical boundary | Resting heart rate | Possible acute cardiovascular strain | assumption, verify against NASA sources |
| Warning HRV drop | below the normal boundary and at least 20% below typical | HRV | Incomplete overnight recovery | assumption, verify against NASA sources |
| Critical HRV drop | below the critical boundary and at least 35% below typical | HRV | Severe fatigue | assumption, verify against NASA sources |
| Critical radiation dose rate | at least 5.0 mSv/day or at least 6.0 x personal typical rate | Radiation dose rate | Solar particle event level | assumption, verify against NASA sources |
| Warning radiation dose rate | at least 1.5 mSv/day or at least 2.5 x personal typical rate | Radiation dose rate | Elevated, needs tracking. Also used by the Overview "Radiation" tile. | assumption, verify against NASA sources |
| Critical SpO2 | at or below 93% | SpO2 | Possible hypoxemia | assumption, verify against NASA sources |
| Warning SpO2 | at or below 95% and below the normal boundary | SpO2 | Mild desaturation | assumption, verify against NASA sources |
| Warning sleep deficit | at or below 4.0 hours per night | Sleep duration | Acute sleep deprivation | assumption, verify against NASA sources |
| Watch sleep deficit | below the normal boundary and at least 1.5 hours below typical | Sleep duration | Building sleep debt | assumption, verify against NASA sources |
| Warning stress score | at least 70 and above the critical boundary | Stress score | High absolute strain | assumption, verify against NASA sources |
| Watch stress rise | above the normal boundary and at least 8 points above typical | Stress score | Slow build-up that never reaches 70 | assumption, verify against NASA sources |
| Watch mood decline (absolute) | at or below 2.5 and below the critical boundary | Mood | Low morale | assumption, verify against NASA sources |
| Watch mood decline (relative) | below the normal boundary and at least 0.5 points below typical | Mood | Gradual decline during isolation | assumption, verify against NASA sources |

### 8.3 How often alerts are raised

| Parameter | Value | Metric | Rationale | Source |
| --------- | ----- | ------ | --------- | ------ |
| Persistence: heart rate, HRV | 6 consecutive hourly readings | Resting heart rate, HRV | One noisy hour should not alert. The severity is the lowest seen in the run. | assumption, verify against NASA sources |
| Persistence: stress, mood | 12 consecutive hourly readings | Stress score, mood | These wander more from day to day. | assumption, verify against NASA sources |
| Persistence: SpO2 | 3 consecutive hourly readings | SpO2 | Short confirmation window | assumption, verify against NASA sources |
| Persistence: sleep, radiation | 1 reading | Sleep duration, radiation dose rate | A sleep value already covers a whole night, and radiation spikes are acute. | assumption, verify against NASA sources |
| One alert per episode | no repeat while the deviation continues, unless severity gets worse | All | Avoids one alert per hour. | assumption, verify against NASA sources |
| Episode reset | 6 consecutive normal hourly readings | All | After this, a new deviation raises a new alert. | assumption, verify against NASA sources |

The Overview page treats alerts from the last 48 simulated hours as "recent" for
the crew status badge (a display choice, not a physiological number).
