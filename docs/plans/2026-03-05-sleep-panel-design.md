# Sleep Panel — Design Document

**Date:** 2026-03-05
**Status:** Approved

---

## Overview

A dedicated `/sleep` page that unifies sleep data from Oura Ring, Apple Health (XML export), Whoop (CSV export), and manual entry into a single normalized local store. Tracks sleep duration, architecture (deep/REM/light), efficiency, and HRV against Peter Attia / Medicine 3.0 longevity targets. All data stored in `localStorage`; no backend.

---

## Architecture: Layered Adapter (Option C)

New normalized `SleepNight[]` store for the Sleep page. Dashboard Sleep tab stays untouched — it reads raw Oura data directly from `healthspan:ouraData`. The Sleep page's Oura adapter reads from the same `healthspan:ouraData` localStorage key, so no duplication of actual data — just a different view. This matches the Exercise panel pattern exactly.

### localStorage Keys

```
healthspan:sleep:nights     → SleepNight[]
healthspan:sleep:settings   → SleepSettings
```

---

## Data Sources

| Source | Format | Primary Data |
|---|---|---|
| Oura Ring | JSON (existing `healthspan:ouraData`) | Sleep stages, HR, HRV, efficiency, breath, SpO2, score |
| Apple Health | XML export (`export.xml`) | Sleep analysis records (InBed, AsleepCore, AsleepDeep, AsleepREM, Awake) |
| Whoop | CSV export | Sleep stages, HRV, respiratory rate, sleep score |
| Manual | In-app form | Bedtime, wake time, subjective quality rating (1-5) |

---

## TypeScript Types

### `SleepNight`

```ts
export type SleepSource = 'oura' | 'apple_health' | 'whoop' | 'manual'

export interface SleepNight {
  id: string                      // uuid
  source: SleepSource
  sourceId: string                // dedup key
  date: string                    // YYYY-MM-DD (sleep start date)
  bedtime?: string                // ISO 8601 datetime
  wakeTime?: string               // ISO 8601 datetime
  totalMin?: number               // total sleep duration in minutes
  deepMin?: number                // deep/SWS stage minutes
  remMin?: number                 // REM stage minutes
  lightMin?: number               // light/N1+N2 stage minutes
  awakeMin?: number               // time awake during night
  efficiency?: number             // % (time asleep / time in bed)
  onsetMin?: number               // sleep onset latency in minutes
  avgHr?: number                  // average HR during sleep
  lowestHr?: number               // lowest resting HR
  avgHrv?: number                 // average HRV (ms)
  avgBreath?: number              // breaths per minute
  spo2Avg?: number                // blood oxygen %
  sleepScore?: number             // source's composite score (0-100)
  qualityRating?: number          // manual: 1-5 subjective rating
  flaggedConflict?: boolean
  resolvedBy?: 'priority' | 'manual'
  createdAt: number
}
```

### `SleepSettings`

```ts
export interface SleepSettings {
  globalPriority: SleepSource[]   // ordered highest-priority first
}

export const DEFAULT_SLEEP_SETTINGS = {
  globalPriority: ['oura', 'apple_health', 'whoop', 'manual'],
} as const satisfies SleepSettings
```

---

## Longevity Targets (Attia / Medicine 3.0)

Stored in `src/data/sleep-targets.ts`.

| Metric | Target | Green | Amber | Red |
|--------|--------|-------|-------|-----|
| Total sleep | 7–8.5 hrs | ≥7 hrs | 6–6.9 hrs | <6 hrs |
| Deep sleep | ≥1.5 hrs (≥15% of total) | ≥1.5 hrs | 1–1.4 hrs | <1 hr |
| REM sleep | ≥1.75 hrs (≥20% of total) | ≥1.75 hrs | 1.25–1.74 hrs | <1.25 hrs |
| Sleep efficiency | ≥90% | ≥90% | 80–89% | <80% |
| Sleep onset | ≤20 min | ≤20 min | 21–40 min | >40 min |
| HRV during sleep | Trending up or stable | Tracked as trend, no fixed threshold |

---

## Import Parsers

All parsers live in `src/utils/sleep-parsers/`. Each returns `{ nights: SleepNight[] }`.

### `oura.ts`
- Adapter over existing `healthspan:ouraData`
- Reads `sleepDetail[]` + `sleep[]`, joins on `day` field
- Maps: `deep_s / 60` → `deepMin`, `rem_s / 60` → `remMin`, `light_s / 60` → `lightMin`, `total_s / 60` → `totalMin`
- HR, HRV, efficiency, breath rate from `SleepDetail`
- Sleep score from `DailySleep.score`
- `source: 'oura'`, `sourceId: 'oura-{day}'`

### `apple-health.ts`
- Reuses DOMParser XML pattern from Exercise
- Extracts `HKCategoryTypeIdentifierSleepAnalysis` records
- Groups overlapping records by night
- Computes stage durations from `value` attribute:
  - `HKCategoryValueSleepAnalysisInBed` → total time in bed
  - `HKCategoryValueSleepAnalysisAsleepCore` → light sleep
  - `HKCategoryValueSleepAnalysisAsleepDeep` → deep sleep
  - `HKCategoryValueSleepAnalysisAsleepREM` → REM sleep
  - `HKCategoryValueSleepAnalysisAwake` → awake time
- Efficiency = (total sleep / time in bed) × 100
- Bedtime/wake time from earliest start / latest end per night
- No HRV or HR from sleep records (those are in separate record types — out of scope for this phase)

### `whoop.ts`
- CSV parser using `splitCsvLine` pattern from Exercise's Hevy parser
- Whoop CSV columns: `Sleep Start`, `Sleep End`, `Time in Bed (min)`, `Light Sleep (min)`, `SWS (min)`, `REM (min)`, `Awake (min)`, `Sleep Score`, `HRV (ms)`, `Respiratory Rate`
- Maps directly to `SleepNight` fields
- `source: 'whoop'`, `sourceId: 'whoop-{date}'`

### Manual Entry
- Not a file parser — form handler in the Sources tab
- Creates `SleepNight` with: bedtime, wake time (auto-computes totalMin), subjective quality rating (1-5)
- `source: 'manual'`, `sourceId: 'manual-{date}'`

---

## Import Pipeline (`src/utils/sleep-storage.ts`)

Same pattern as `exercise-storage.ts`:

```
parseRawFile(file) → SleepNight[]
  ↓
for each new entry:
  detectConflict(entry, existingNights)
    → conflict if: same date AND cross-source
  ↓
  if conflict:
    autoResolve(conflict, settings)
      → lower-priority entry flaggedConflict = true, resolvedBy = 'priority'
  ↓
write to healthspan:sleep:nights
  (flagged entries included but excluded from queries)
```

Key functions:
- `getSleepNights(filters?)` — returns non-flagged nights, optional date/source filters
- `getAllNightsRaw()` — returns all including flagged
- `saveSleepNights(nights)` — writes to localStorage
- `importSleepNights(incoming)` — reads existing, merges, saves
- `mergeNights(existing, incoming, settings)` — dedup by source+sourceId, conflict detection
- `getFlaggedSleepConflicts()` — returns flagged entries
- `resolveSleepConflict(keepId, discardId)` — resolves conflict
- `getSleepSettings()` / `saveSleepSettings(settings)` — priority config

---

## Sleep Page (`/sleep`)

Five tabs, same visual pattern as Exercise.

### Overview Tab
- **Compliance cards** (grid of 4): Total Sleep, Deep, REM, Efficiency — each shows current 7-day avg vs target, color-coded green/amber/red
- **Sleep Score trend** (area chart, 12 weeks rolling)
- **Weekly compliance summary**: how many nights in the past week hit all targets
- Empty state: "No sleep data yet. Import data from the Sources tab."

### Trends Tab
- **Sleep duration stacked bar** (deep/REM/light/awake per night, 12-week rolling)
- **HRV during sleep** trend line
- **Resting HR** trend line
- **Sleep efficiency** trend line
- **SpO2 trend** (if data available, otherwise hidden)

### Analysis Tab
- **Sleep consistency**: bedtime/wake time range showing variance over past 30 days
- **Sleep debt tracker**: rolling 7-day average vs 8-hr ideal, cumulative deficit
- **Stage breakdown**: donut chart of current week's average stage percentages (deep/REM/light/awake)
- **Circadian alignment**: display bedtime variance — "consistent" if ±30 min, "irregular" if >1 hr variance

### Insights Tab
- **Attia target reference table** (like VO2 Max tab shows targets by tier)
- **Per-metric status**: each metric with current value, target, compliance color, and actionable recommendation
- **Sleep architecture summary**: what's working, what needs attention
- Note: "These targets are based on population averages from *Outlive*. Individual needs vary."

### Sources Tab
- Import card per source:
  - Oura: button (reads existing localStorage data)
  - Apple Health: XML file upload
  - Whoop: CSV file upload
  - Manual: inline form (date, bedtime, wake time, quality rating 1-5)
- Source priority configuration: reorderable list (same as Exercise)
- Conflict resolution queue: flagged pairs, "Keep this one" / "Keep both"
- Import history: count per source

---

## Dashboard Integration

Sleep status card added to Dashboard Overview stat strip:
- Label: "Sleep"
- Value: compliance label ("On Track" / "Building" / "Below Target")
- Sub-text: "X.X/7 hrs avg this week"
- Color: green / amber / red (based on 7-day total sleep average)
- Links to `/sleep`

---

## File Structure

```
src/
  types/
    sleep.ts                      # SleepNight, SleepSettings, SleepSource
  utils/
    sleep-storage.ts              # getSleepNights, saveSleepNights, conflict detection
    sleep-parsers/
      oura.ts                     # Oura adapter
      apple-health.ts             # XML parser (sleep records)
      whoop.ts                    # CSV parser
  data/
    sleep-targets.ts              # Attia longevity sleep targets
  pages/
    Sleep.tsx                     # Main sleep page (5 tabs)
  App.tsx                         # Add /sleep route
  components/
    Layout.tsx                    # Activate Sleep nav item
  pages/
    Dashboard.tsx                 # Add Sleep status card
```

---

## Out of Scope (This Phase)

- Real-time API sync (Oura API, Apple HealthKit)
- Smart alarm / sleep schedule recommendations
- Correlation analysis between sleep and exercise performance
- Melatonin/supplement tracking (Molecules panel)
- HR/HRV extraction from Apple Health sleep windows (separate record types, complex to correlate)
- Sleep environment tracking (temperature, light, noise)
