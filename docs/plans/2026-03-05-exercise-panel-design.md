# Exercise Panel — Design Document

**Date:** 2026-03-05
**Status:** Approved

---

## Overview

A dedicated `/exercise` page that unifies workout and activity data from Oura Ring, Apple Health (XML export), Strava (JSON export), and Hevy (CSV export) into a single normalized local store. Tracks Zone 2 cardio, Zone 5 intervals, strength training volume, and VO2 max trends against Peter Attia / Medicine 3.0 longevity targets. All data stored in `localStorage`; no backend.

---

## Data Sources

| Source | Format | Primary Data |
|---|---|---|
| Oura Ring | JSON (existing `healthspan:ouraData`) | Workouts, daily activity, steps |
| Apple Health | XML export (`export.xml`) | Workouts, HR records, VO2 max estimates |
| Strava | JSON (`activities.json` from bulk export) | Cardio workouts, GPS, HR zones |
| Hevy | CSV export | Strength workouts, sets, reps, weight |
| Manual | In-app form | VO2 max tests, ad-hoc workouts |

---

## Architecture: Unified Normalized Store (Option A)

All data normalized into a single `ExerciseWorkout[]` array at import time. Conflicts detected and resolved using user-configured priority rules. Flagged conflicts hidden from charts until resolved.

### localStorage Keys

```
healthspan:exercise:workouts     → ExerciseWorkout[]
healthspan:exercise:vo2max       → VO2MaxEntry[]
healthspan:exercise:settings     → ExerciseSettings
```

---

## TypeScript Types

### `ExerciseWorkout`

```ts
export type ExerciseSource = 'oura' | 'apple_health' | 'strava' | 'hevy' | 'manual'
export type ExerciseType = 'cardio' | 'strength' | 'stability' | 'sport'

export interface ExerciseWorkout {
  id: string                      // uuid
  source: ExerciseSource
  sourceId: string                // original ID from source for dedup detection
  date: string                    // ISO 8601 YYYY-MM-DD
  startTime?: string              // ISO 8601 datetime
  endTime?: string                // ISO 8601 datetime
  type: ExerciseType
  activityName: string            // e.g. "Run", "Cycling", "Back Squat"
  durationMin?: number
  distanceKm?: number             // cardio only
  avgHr?: number
  maxHr?: number
  calories?: number
  zone2Min?: number               // minutes in Zone 2 (HR 60–70% of max HR)
  zone5Min?: number               // minutes in Zone 5 (HR ≥90% of max HR)
  sets?: ExerciseSet[]            // strength only (Hevy)
  flaggedConflict?: boolean       // true if another source has overlapping workout
  resolvedBy?: 'priority' | 'manual'
  createdAt: number               // Date.now() at import time
}

export interface ExerciseSet {
  exercise: string
  setIndex: number
  reps?: number
  weightKg?: number
  durationSec?: number
}
```

### `VO2MaxEntry`

Tracked in a separate array so Apple Watch estimates and clinical tests are never merged. Both appear on the same chart as distinct series.

```ts
export interface VO2MaxEntry {
  id: string
  date: string                    // ISO 8601 YYYY-MM-DD
  value: number                   // mL/kg/min
  source: 'apple_health' | 'manual'
  method?: 'apple_watch' | 'clinical' | 'cooper_test' | 'ramp_test'
  notes?: string
  createdAt: number
}
```

### `ExerciseSettings`

```ts
export interface ExerciseSettings {
  priorityMode: 'global' | 'per_metric'
  globalPriority: ExerciseSource[]   // ordered highest-priority first
  perMetricPriority?: {
    cardio: ExerciseSource[]
    strength: ExerciseSource[]
    steps: ExerciseSource[]
  }
}

// Default:
const DEFAULT_SETTINGS: ExerciseSettings = {
  priorityMode: 'global',
  globalPriority: ['strava', 'hevy', 'apple_health', 'oura', 'manual'],
}
```

---

## Import Parsers

All parsers live in `src/utils/exercise-parsers/`. Each returns `{ workouts: ExerciseWorkout[], vo2max: VO2MaxEntry[] }`.

### `apple-health.ts`
- Input: `export.xml` (Apple Health XML export)
- Parse using browser DOM XML parser (`DOMParser`)
- Extract `HKWorkout` nodes → `ExerciseWorkout`
- Extract `HKQuantityTypeIdentifierVO2Max` records → `VO2MaxEntry` with `method: 'apple_watch'`
- Extract `HKQuantityTypeIdentifierHeartRate` records keyed to workout windows → `avgHr`, `maxHr`
- Zone 2/5 minutes computed from HR records: Zone 2 = 60–70% max HR, Zone 5 = ≥90% max HR
- Max HR defaults to `220 − age`; age taken from a user profile field in settings (or 35 if unset)
- Note: Apple Health XML exports can be very large (100MB+); parse is synchronous but chunked using `requestIdleCallback` to avoid blocking the UI

### `strava.ts`
- Input: `activities.json` from Strava bulk export (user uploads this single file directly — no ZIP extraction)
- Map `sport_type` → `ExerciseType`
- Fields: `elapsed_time` → `durationMin`, `distance` → `distanceKm`, `average_heartrate` / `max_heartrate`, `total_elevation_gain`, `start_date` → `startTime`
- Zone 2/5 minutes not available from `activities.json` — left as `undefined`

### `hevy.ts`
- Input: CSV export from Hevy app
- Columns: `Date`, `Workout Name`, `Exercise Name`, `Set Order`, `Weight`, `Reps`, `Duration`
- Group rows by (`Date` + `Workout Name`) → one `ExerciseWorkout` per group
- `type: 'strength'`, `sets[]` array populated from grouped rows
- Parse weight as kg (Hevy exports in user's preferred unit; note in UI)

### `oura.ts`
- Thin adapter over existing `healthspan:ouraData`
- Maps `Workout[]` entries from Oura JSON to `ExerciseWorkout` format
- Run once at import time when user clicks "Import from Oura" — not on every page load
- Oura provides: `activity` (type name), `calories`, `start`, `end`, `intensity`
- Zone 2/5 not available from Oura workout records — left as `undefined`

---

## Import Pipeline (`src/utils/exercise-storage.ts`)

```
parseRawFile(file) → ExerciseWorkout[]
  ↓
for each new entry:
  detectConflict(entry, existingWorkouts)
    → conflict if: same date ± 30 min window AND same ExerciseType category
  ↓
  if conflict:
    autoResolve(conflict, settings)
      → lower-priority entry flaggedConflict = true, resolvedBy = 'priority'
      → if priority ambiguous: flaggedConflict = true, resolvedBy = undefined (manual queue)
  ↓
write to healthspan:exercise:workouts
  (flagged entries included but excluded from chart queries)
```

Key functions:
- `getWorkouts(filters?)` — returns non-flagged workouts, optional date/type/source filters
- `getFlaggedConflicts()` — returns flagged entries for resolution UI
- `resolveConflict(keepId, discardId)` — marks one as resolved, removes the other
- `saveVO2Max(entry)` — appends to `healthspan:exercise:vo2max`
- `getVO2Max()` — returns all entries sorted by date desc
- `getExerciseSettings()` / `saveExerciseSettings(settings)` — priority config

---

## Exercise Page (`/exercise`)

Five tabs, same visual pattern as the Dashboard.

### Overview Tab
- **Zone 2 compliance card**: current week minutes vs 180 min goal, color-coded (green ≥180, amber 90–179, red <90)
- **Weekly training load chart**: bar chart, stacked cardio min + strength sessions, 12-week rolling window
- **Zone 2 trend chart**: area chart of zone2Min/week over time, reference line at 180
- **Workout frequency**: sessions/week trend, 12-week rolling
- **Status strip**: Zone 2 / Strength / Zone 5 — On Track / Building / Below Target

### Cardio Tab
- Recent cardio workout list (date, type, distance, duration, avg HR, source badge)
- Zone 2 vs Zone 5 minutes stacked chart over time
- Distance trend chart (Strava data)
- Avg HR trend

### Strength Tab
- Weekly volume chart (total sets × reps × weight in kg) by muscle group (Hevy data)
- PR tracker: heaviest set per exercise over time (line chart)
- Workout frequency (sessions/week, 12-week rolling)
- Recent workout log: expandable rows showing set/rep tables

### VO2 Max Tab
- Dual time series:
  - Apple Watch estimates: dashed line
  - Clinical/field tests: solid dots with labels
- Attia longevity reference bands by age bracket (from *Outlive*):
  - "Above average" (top 50%): dashed reference line
  - "Superior" (top 25%): solid amber reference line
  - "Elite" (top 2.5%): solid green reference line
- Manual entry form: date, value (mL/kg/min), method, notes
- Note displayed: "Apple Watch VO2 max estimates are approximations. Clinical or field tests are more accurate."

### Sources Tab
- Import card per source with file upload button + step-by-step instructions
- Import history: last imported date, entry count per source
- Source priority configuration:
  - Toggle: Global / Per-metric
  - Global: ordered list (drag to reorder rank)
  - Per-metric: dropdown selectors for Cardio, Strength, Steps
- Conflict resolution queue: flagged pairs shown side-by-side, "Keep this one" / "Keep both" buttons

---

## Longevity Targets

| Metric | Target | Source |
|---|---|---|
| Zone 2 cardio | ≥180 min/week | Attia / Inigo San Millán |
| Zone 5 intervals | ≥1 session/week | Attia |
| Strength sessions | ≥3 sessions/week | Attia |
| VO2 max "superior" (men, 35–45) | ≥50 mL/kg/min | *Outlive* Table |
| VO2 max "superior" (women, 35–45) | ≥44 mL/kg/min | *Outlive* Table |

Full VO2 max table by age/sex included in `src/data/vo2max-targets.ts`.

---

## Settings Page Additions

New "Exercise Sources" section added to the existing `/settings` page:
- User age field (used for max HR calculation and VO2 max target lookup)
- Weight unit preference (kg / lbs) for Hevy import
- Source priority UI (same as Sources tab above — single source of truth, linked from both pages)

---

## Dashboard Integration

Exercise status card added to the Dashboard Overview tab stat strip:
- Label: "Exercise"
- Value: Zone 2 compliance label ("On Track" / "Building" / "Below Target")
- Sub-text: "X/180 min Zone 2 this week · N workouts"
- Color: green / amber / red
- Links to `/exercise`

---

## File Structure

```
src/
  types/
    exercise.ts                   # ExerciseWorkout, VO2MaxEntry, ExerciseSettings
  utils/
    exercise-storage.ts           # getWorkouts, saveWorkouts, conflict detection
    exercise-parsers/
      apple-health.ts             # XML parser
      strava.ts                   # JSON parser
      hevy.ts                     # CSV parser
      oura.ts                     # Oura adapter
  data/
    vo2max-targets.ts             # Attia longevity targets by age/sex
  pages/
    Exercise.tsx                  # Main exercise page (5 tabs)
  App.tsx                         # Add /exercise route
  components/
    Layout.tsx                    # Activate Exercise nav item
  pages/
    Settings.tsx                  # Add Exercise Sources section
    Dashboard.tsx                 # Add Exercise status card
```

---

## Out of Scope (This Phase)

- PDF/FIT file parsing (Apple Health XML and Strava activities.json cover the same data)
- Live API sync (Strava OAuth, Apple HealthKit API) — export-based only
- Nutrition or sleep data from Apple Health (separate pillars)
- GPS map rendering for runs/rides
