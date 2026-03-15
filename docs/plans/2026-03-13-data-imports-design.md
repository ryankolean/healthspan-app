# Data Imports & Device Integration Design

## Goal

Allow users to import health data from smart scales, fitness trackers, and exercise/nutrition apps via file upload. Tag all imported data with its origin source. Track future API integration candidates.

## Constraints

- Client-side only (localStorage, no backend) — rules out OAuth-based API flows
- All imports are file-based: users export from their device/app, upload into Healthspan
- Future API integrations tracked in manifest for when a backend is added

## Device Landscape

### Smart Scales (CSV export)

| Device | Export Format | Data Available |
|--------|-------------|----------------|
| Withings Body Smart/Scan | CSV | weight, fat mass, bone mass, muscle mass, hydration |
| Garmin Index S2 | CSV | weight, BMI, body fat % |
| Renpho | CSV (via app) | weight, body fat %, muscle mass, bone mass |
| Eufy Smart Scale | CSV (via app) | weight, body fat %, muscle mass |
| Fitbit Aria | JSON (bulk export) | weight, BMI, body fat % |

### Fitness Trackers/Wearables

| Device | Export Format | Current Status |
|--------|-------------|----------------|
| Oura Ring | JSON | **Supported** (sleep, exercise, HRV, readiness) |
| Apple Watch | XML (Health export) | **Supported** (sleep, exercise, VO2max) |
| WHOOP | CSV | **Supported** (sleep only) |
| Garmin | CSV/FIT | Not yet supported |
| Fitbit | JSON (bulk export) | Not yet supported |
| Samsung Health | CSV (19 files) | Not yet supported |

### Exercise & Nutrition Apps

| App | Export Format | Current Status |
|-----|-------------|----------------|
| Strava | JSON | **Supported** (exercise) |
| Hevy | CSV | **Supported** (strength training) |
| Strong | CSV | Not yet (similar to Hevy) |
| MyFitnessPal | CSV (Premium) | Not yet (nutrition data) |
| Cronometer | CSV | Not yet (nutrition data) |

## Architecture

### Import Sources Manifest

A single file `src/data/import-sources.ts` catalogs every device/app:

```typescript
type ImportDomain = 'sleep' | 'exercise' | 'body-composition' | 'nutrition' | 'heart' | 'activity'

interface ImportSource {
  id: string
  name: string
  category: 'scale' | 'wearable' | 'app'
  fileFormats: ('json' | 'csv' | 'xml')[]
  domains: ImportDomain[]
  parserStatus: 'supported' | 'planned' | 'not-started'
  parserPath?: string
  futureApi?: {
    hasPublicApi: boolean
    apiUrl?: string
    requiresOAuth: boolean
    notes: string
  }
}
```

15 sources total. The manifest drives the import UI and serves as the API integration tracking file.

### Parser Architecture

Flat parser files organized by domain, following existing patterns:

```
src/utils/
├── sleep-parsers/        # existing: oura.ts, apple-health.ts, whoop.ts
│   ├── garmin.ts         # NEW
│   ├── fitbit.ts         # NEW
│   └── samsung.ts        # NEW
├── exercise-parsers/     # existing: oura.ts, apple-health.ts, strava.ts, hevy.ts
│   ├── garmin.ts         # NEW
│   ├── fitbit.ts         # NEW
│   ├── strong.ts         # NEW
│   └── samsung.ts        # NEW
├── scale-parsers/        # NEW folder
│   ├── withings.ts       # CSV → BodyCompEntry[]
│   ├── garmin.ts         # CSV → BodyCompEntry[]
│   ├── renpho.ts         # CSV → BodyCompEntry[]
│   ├── eufy.ts           # CSV → BodyCompEntry[]
│   └── fitbit.ts         # JSON → BodyCompEntry[]
└── nutrition-parsers/    # NEW folder
    ├── myfitnesspal.ts   # CSV → NutritionEntry[]
    └── cronometer.ts     # CSV → NutritionEntry[]
```

Each parser exports a single function:
- Scale: `parseWithingsScale(csv: string): BodyCompEntry[]`
- Sleep: `parseGarminSleep(csv: string): { nights: SleepNight[] }`
- Exercise: `parseStrongCsv(csv: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] }`
- Nutrition: `parseMyFitnessPalCsv(csv: string): NutritionEntry[]`

All parsed records tagged with `source` field (e.g., `source: 'withings'`).

### Source Type Expansion

Expand existing union types:

- `SleepSource`: add `'garmin' | 'fitbit' | 'samsung'`
- `ExerciseSource`: add `'garmin' | 'fitbit' | 'strong' | 'samsung'`
- `NutritionSource`: add `'myfitnesspal' | 'cronometer'`
- `BodyCompEntry`: add `source` field with type `'manual' | 'withings' | 'garmin' | 'renpho' | 'eufy' | 'fitbit'`

### Multi-Domain Devices

Garmin, Fitbit, and Samsung exports contain data for multiple domains. User uploads one file; we route to all relevant parsers (sleep + exercise + body comp).

## UI Design

### Settings → Data Sources Section

Central import hub showing:
- **Connected Sources**: devices with prior imports, last import date, record count
- **Available Sources**: grouped by category (Scales, Wearables, Apps)
  - Device name + icon
  - Domain pills (Sleep, Exercise, Body Comp, etc.)
  - Status badge: "Supported" (green) / "Coming Soon" (gray)
  - File upload button for supported sources
  - Coming Soon sources visible but disabled

### Per-Domain Contextual Import

Each domain page's Sources tab gets an "Import" button:
- Opens modal showing only devices relevant to that domain
- Filtered from the same manifest
- Same file upload flow

### Import Flow

1. User selects device → file picker with correct format filter
2. File read client-side, passed to parser
3. Preview: "Found X records (date range). Y new, Z conflicts."
4. Confirm → records merged via existing import functions
5. Import logged to `healthspan:imports` in localStorage

### Import History Storage

```typescript
interface ImportRecord {
  id: string
  sourceId: string          // e.g. 'withings-scale'
  importedAt: string        // ISO 8601
  recordCount: number
  domains: ImportDomain[]
  dateRange: { from: string; to: string }
}
```

## Roadmap (Independent Tasks for Ralph)

### Phase 1: Foundation (sequential — must complete first)
1. Import Sources Manifest (`src/data/import-sources.ts`)
2. Expand source union types across domain types
3. Import history storage (`src/utils/import-storage.ts`)
4. Data Sources UI in Settings

### Phase 2: Scale Parsers (all independent)
5. Withings Scale CSV parser
6. Garmin Index S2 CSV parser
7. Renpho CSV parser
8. Eufy CSV parser
9. Fitbit Aria JSON parser (body comp from bulk export)

### Phase 3: Wearable Parsers (all independent)
10. Garmin sleep CSV parser
11. Garmin exercise CSV parser
12. Fitbit sleep JSON parser
13. Fitbit exercise JSON parser
14. Samsung Health sleep CSV parser
15. Samsung Health exercise CSV parser

### Phase 4: App Parsers (all independent)
16. Strong CSV parser (strength workouts)
17. MyFitnessPal CSV parser (nutrition)
18. Cronometer CSV parser (nutrition)

### Phase 5: Contextual Import UI
19. Per-domain import buttons on Sources tabs

## What's NOT Changing

- Onboarding wearable cards (first-time flow, not ongoing import)
- Existing parser signatures (Oura, Apple Health, WHOOP, Strava, Hevy)
- No OAuth/API flows (client-side only)
- Existing merge/conflict detection logic

## Future API Integrations (tracked in manifest)

| Device | Has Public API | OAuth Required | Notes |
|--------|---------------|----------------|-------|
| Withings | Yes | Yes | Well-documented REST API, weight + body comp |
| Garmin | Yes | Yes | Garmin Health API, comprehensive |
| Fitbit | Yes | Yes | Google-owned, broad data access |
| WHOOP | Yes | Yes | Recovery, strain, sleep |
| Oura | Yes | Yes | Already have JSON parser, API would add live sync |
| Strava | Yes | Yes | Already have JSON parser |
| Samsung | Partial | Yes | Health Connect on Android only |
| Renpho | No | N/A | No public API, Bluetooth sync to app only |
| Eufy | No | N/A | No public API |
| MyFitnessPal | No | N/A | Premium CSV export only |
| Cronometer | No | N/A | CSV/spreadsheet export |
| Strong | No | N/A | CSV export only |
| Hevy | No | N/A | Already have CSV parser |

## Tech Stack

- React 18, TypeScript 5.6, Tailwind CSS 3.4
- localStorage with `healthspan:` key prefix
- Vitest + jsdom for testing
- Existing CSV/JSON/XML parsing patterns
