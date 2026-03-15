# Data Imports & Device Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive data import system supporting 15 devices/apps across scales, wearables, and fitness/nutrition apps with file-based imports, a central Data Sources UI, and contextual import buttons on domain pages.

**Architecture:** A manifest file (`src/data/import-sources.ts`) catalogs all 15 sources with metadata, parser status, and future API tracking. Flat parser files in domain folders (`scale-parsers/`, `nutrition-parsers/`, etc.) follow existing patterns. A Data Sources section in Settings provides the central import hub. Each parser task is fully independent.

**Tech Stack:** React 18, TypeScript 5.6, Tailwind CSS 3.4, Vitest + jsdom, localStorage

---

## Existing Patterns to Follow

### CSV Parser Pattern (from `src/utils/exercise-parsers/hevy.ts` and `src/utils/sleep-parsers/whoop.ts`)

```typescript
import { v4 as uuidv4 } from 'uuid'

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

function parseOptionalFloat(val: string): number | undefined {
  if (!val) return undefined
  const n = parseFloat(val)
  return isNaN(n) ? undefined : n
}
```

### Existing Source Types

- `SleepSource = 'oura' | 'apple_health' | 'whoop' | 'manual'` (in `src/types/sleep.ts:1`)
- `ExerciseSource = 'oura' | 'apple_health' | 'strava' | 'hevy' | 'manual'` (in `src/types/exercise.ts:2`)
- `NutritionSource = 'manual'` (in `src/types/nutrition.ts:1`)
- `BodyCompEntry` has no `source` field (in `src/types/body-composition.ts`)

### Existing Storage Functions

- `importSleepNights(incoming)` — merges with conflict detection (`src/utils/sleep-storage.ts`)
- `importWorkouts(incoming)` — merges with 30-min window conflict detection (`src/utils/exercise-storage.ts`)
- `saveBodyCompEntry(entry)` — saves single entry (`src/utils/body-composition-storage.ts`)
- `saveNutritionEntry(entry)` — saves single entry (`src/utils/nutrition-storage.ts`)

---

## Phase 1: Foundation

### Task 1: Import Sources Manifest

**Files:**
- Create: `src/data/import-sources.ts`
- Create: `src/data/import-sources.test.ts`

**Step 1: Write the failing test**

```typescript
// src/data/import-sources.test.ts
import { IMPORT_SOURCES } from './import-sources'

describe('IMPORT_SOURCES', () => {
  it('has 15 sources', () => {
    expect(IMPORT_SOURCES).toHaveLength(15)
  })

  it('every source has required fields', () => {
    for (const src of IMPORT_SOURCES) {
      expect(src.id).toBeTruthy()
      expect(src.name).toBeTruthy()
      expect(['scale', 'wearable', 'app']).toContain(src.category)
      expect(src.fileFormats.length).toBeGreaterThan(0)
      expect(src.domains.length).toBeGreaterThan(0)
      expect(['supported', 'planned', 'not-started']).toContain(src.parserStatus)
    }
  })

  it('has unique ids', () => {
    const ids = IMPORT_SOURCES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('already-supported sources have parserStatus supported', () => {
    const supported = IMPORT_SOURCES.filter(s => s.parserStatus === 'supported')
    const supportedIds = supported.map(s => s.id)
    expect(supportedIds).toContain('oura')
    expect(supportedIds).toContain('apple-watch')
    expect(supportedIds).toContain('whoop')
    expect(supportedIds).toContain('strava')
    expect(supportedIds).toContain('hevy')
  })

  it('sources with futureApi have required fields', () => {
    const withApi = IMPORT_SOURCES.filter(s => s.futureApi)
    for (const src of withApi) {
      expect(typeof src.futureApi!.hasPublicApi).toBe('boolean')
      expect(typeof src.futureApi!.requiresOAuth).toBe('boolean')
      expect(src.futureApi!.notes).toBeTruthy()
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/import-sources.test.ts --reporter=verbose`
Expected: FAIL — module not found

**Step 3: Write the manifest**

```typescript
// src/data/import-sources.ts

export type ImportDomain = 'sleep' | 'exercise' | 'body-composition' | 'nutrition' | 'heart' | 'activity'

export interface ImportSource {
  id: string
  name: string
  category: 'scale' | 'wearable' | 'app'
  fileFormats: ('json' | 'csv' | 'xml')[]
  domains: ImportDomain[]
  parserStatus: 'supported' | 'planned' | 'not-started'
  futureApi?: {
    hasPublicApi: boolean
    apiUrl?: string
    requiresOAuth: boolean
    notes: string
  }
}

export const IMPORT_SOURCES: readonly ImportSource[] = [
  // Wearables — already supported
  {
    id: 'oura',
    name: 'Oura Ring',
    category: 'wearable',
    fileFormats: ['json'],
    domains: ['sleep', 'exercise', 'heart', 'activity'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://cloud.ouraring.com/v2/docs', requiresOAuth: true, notes: 'REST API with OAuth2, comprehensive sleep/activity/readiness data' },
  },
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    category: 'wearable',
    fileFormats: ['xml'],
    domains: ['sleep', 'exercise', 'heart'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.apple.com/documentation/healthkit', requiresOAuth: false, notes: 'HealthKit API — native iOS only, no REST API' },
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    category: 'wearable',
    fileFormats: ['csv'],
    domains: ['sleep'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.whoop.com', requiresOAuth: true, notes: 'REST API with OAuth2, recovery/strain/sleep data' },
  },
  // Wearables — planned
  {
    id: 'garmin',
    name: 'Garmin',
    category: 'wearable',
    fileFormats: ['csv'],
    domains: ['sleep', 'exercise', 'body-composition', 'heart', 'activity'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.garmin.com/health-api/overview/', requiresOAuth: true, notes: 'Garmin Health API — comprehensive, requires partner agreement' },
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    category: 'wearable',
    fileFormats: ['json'],
    domains: ['sleep', 'exercise', 'body-composition', 'heart', 'activity'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, apiUrl: 'https://dev.fitbit.com/build/reference/web-api/', requiresOAuth: true, notes: 'Google-owned REST API with OAuth2, broad data access' },
  },
  {
    id: 'samsung',
    name: 'Samsung Health',
    category: 'wearable',
    fileFormats: ['csv'],
    domains: ['sleep', 'exercise', 'body-composition', 'activity'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'Health Connect on Android only — no REST API for web apps' },
  },
  // Scales
  {
    id: 'withings-scale',
    name: 'Withings Scale',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.withings.com/api-reference', requiresOAuth: true, notes: 'Well-documented REST API, weight + body comp measurements' },
  },
  {
    id: 'garmin-scale',
    name: 'Garmin Index S2',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, requiresOAuth: true, notes: 'Uses same Garmin Health API as wearables' },
  },
  {
    id: 'renpho',
    name: 'Renpho',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — Bluetooth sync to app only, CSV export available' },
  },
  {
    id: 'eufy',
    name: 'Eufy Smart Scale',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — app-only with CSV export' },
  },
  {
    id: 'fitbit-scale',
    name: 'Fitbit Aria',
    category: 'scale',
    fileFormats: ['json'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, requiresOAuth: true, notes: 'Uses Fitbit Web API body endpoints' },
  },
  // Apps — already supported
  {
    id: 'strava',
    name: 'Strava',
    category: 'app',
    fileFormats: ['json'],
    domains: ['exercise'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developers.strava.com', requiresOAuth: true, notes: 'REST API with OAuth2, activity data' },
  },
  {
    id: 'hevy',
    name: 'Hevy',
    category: 'app',
    fileFormats: ['csv'],
    domains: ['exercise'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — CSV export only' },
  },
  // Apps — planned
  {
    id: 'strong',
    name: 'Strong',
    category: 'app',
    fileFormats: ['csv'],
    domains: ['exercise'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — CSV export only' },
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    category: 'app',
    fileFormats: ['csv'],
    domains: ['nutrition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — Premium CSV export only' },
  },
] as const
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/import-sources.test.ts --reporter=verbose`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/data/import-sources.ts src/data/import-sources.test.ts
git commit -m "feat(imports): add import sources manifest with 15 devices"
```

---

### Task 2: Expand Source Types

**Files:**
- Modify: `src/types/sleep.ts:1`
- Modify: `src/types/exercise.ts:2`
- Modify: `src/types/nutrition.ts:1`
- Modify: `src/types/body-composition.ts`

**Step 1: Update SleepSource**

In `src/types/sleep.ts`, change line 1:

```typescript
export type SleepSource = 'oura' | 'apple_health' | 'whoop' | 'garmin' | 'fitbit' | 'samsung' | 'manual'
```

Also update `DEFAULT_SLEEP_SETTINGS` to include new sources in priority:

```typescript
export const DEFAULT_SLEEP_SETTINGS = Object.freeze({
  globalPriority: Object.freeze(['oura', 'apple_health', 'whoop', 'garmin', 'fitbit', 'samsung', 'manual'] as const),
}) satisfies SleepSettings
```

**Step 2: Update ExerciseSource**

In `src/types/exercise.ts`, change line 2:

```typescript
export type ExerciseSource = 'oura' | 'apple_health' | 'strava' | 'hevy' | 'garmin' | 'fitbit' | 'strong' | 'samsung' | 'manual'
```

**Step 3: Update NutritionSource**

In `src/types/nutrition.ts`, change line 1:

```typescript
export type NutritionSource = 'manual' | 'myfitnesspal' | 'cronometer'
```

**Step 4: Add source to BodyCompEntry**

In `src/types/body-composition.ts`, add source field and type:

```typescript
export type BodyCompSource = 'manual' | 'withings' | 'garmin' | 'renpho' | 'eufy' | 'fitbit'

export interface BodyCompEntry {
  id: string
  date: string           // YYYY-MM-DD
  source?: BodyCompSource
  weightKg: number
  bodyFatPct?: number
  leanMassKg?: number    // auto-calculated: weightKg * (1 - bodyFatPct/100)
  waistCm?: number
  note?: string
}
```

Note: `source` is optional to maintain backward compatibility with existing entries.

**Step 5: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass (source is optional, existing code unaffected).

**Step 6: Commit**

```bash
git add src/types/sleep.ts src/types/exercise.ts src/types/nutrition.ts src/types/body-composition.ts
git commit -m "feat(imports): expand source types for new devices"
```

---

### Task 3: Import History Storage

**Files:**
- Create: `src/utils/import-storage.ts`
- Create: `src/utils/import-storage.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/utils/import-storage.test.ts
import { getImportHistory, addImportRecord, clearImportHistory } from './import-storage'
import type { ImportRecord } from './import-storage'

beforeEach(() => localStorage.clear())

describe('import-storage', () => {
  it('returns empty array when no imports', () => {
    expect(getImportHistory()).toEqual([])
  })

  it('saves and retrieves an import record', () => {
    const record: ImportRecord = {
      id: 'test-1',
      sourceId: 'withings-scale',
      importedAt: '2026-03-13T10:00:00Z',
      recordCount: 42,
      domains: ['body-composition'],
      dateRange: { from: '2025-12-01', to: '2026-03-13' },
    }
    addImportRecord(record)
    const history = getImportHistory()
    expect(history).toHaveLength(1)
    expect(history[0].sourceId).toBe('withings-scale')
    expect(history[0].recordCount).toBe(42)
  })

  it('sorts by importedAt descending', () => {
    addImportRecord({ id: 'a', sourceId: 'oura', importedAt: '2026-03-01T00:00:00Z', recordCount: 10, domains: ['sleep'], dateRange: { from: '2026-02-01', to: '2026-03-01' } })
    addImportRecord({ id: 'b', sourceId: 'strava', importedAt: '2026-03-10T00:00:00Z', recordCount: 5, domains: ['exercise'], dateRange: { from: '2026-02-01', to: '2026-03-10' } })
    const history = getImportHistory()
    expect(history[0].id).toBe('b')
    expect(history[1].id).toBe('a')
  })

  it('clears all history', () => {
    addImportRecord({ id: 'a', sourceId: 'oura', importedAt: '2026-03-01T00:00:00Z', recordCount: 10, domains: ['sleep'], dateRange: { from: '2026-02-01', to: '2026-03-01' } })
    clearImportHistory()
    expect(getImportHistory()).toEqual([])
  })

  it('getLastImportForSource returns most recent', () => {
    // import the function
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/import-storage.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/utils/import-storage.ts
import type { ImportDomain } from '../data/import-sources'

const KEY = 'healthspan:imports'

export interface ImportRecord {
  id: string
  sourceId: string
  importedAt: string        // ISO 8601
  recordCount: number
  domains: ImportDomain[]
  dateRange: { from: string; to: string }
}

export function getImportHistory(): ImportRecord[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  const records: ImportRecord[] = JSON.parse(raw)
  return records.sort((a, b) => b.importedAt.localeCompare(a.importedAt))
}

export function addImportRecord(record: ImportRecord): void {
  const existing = getImportHistory()
  existing.push(record)
  localStorage.setItem(KEY, JSON.stringify(existing))
}

export function getLastImportForSource(sourceId: string): ImportRecord | null {
  const history = getImportHistory()
  return history.find(r => r.sourceId === sourceId) ?? null
}

export function clearImportHistory(): void {
  localStorage.removeItem(KEY)
}
```

**Step 4: Run tests**

Run: `npx vitest run src/utils/import-storage.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/import-storage.ts src/utils/import-storage.test.ts
git commit -m "feat(imports): add import history storage"
```

---

### Task 4: Data Sources UI in Settings

**Files:**
- Modify: `src/pages/Settings.tsx`

This adds a "Data Sources" section to the Settings page. It shows all 15 sources grouped by category, with file upload for supported sources and "Coming Soon" badges for planned ones.

**Step 1: Read Settings.tsx to understand current structure**

Read `src/pages/Settings.tsx` fully before making changes.

**Step 2: Add imports**

Add at the top of Settings.tsx:

```typescript
import { IMPORT_SOURCES } from '../data/import-sources'
import type { ImportSource } from '../data/import-sources'
import { getImportHistory, addImportRecord, getLastImportForSource } from '../utils/import-storage'
import type { ImportRecord } from '../utils/import-storage'
import { v4 as uuidv4 } from 'uuid'
```

**Step 3: Add Data Sources section**

Add a new section in the Settings page (after the existing sections). This needs:

1. A `handleFileImport(source: ImportSource, file: File)` function that:
   - Reads the file as text
   - Routes to the correct parser based on `source.id`
   - Saves parsed data via existing storage functions
   - Logs to import history
   - Shows success count

2. UI grouped by category (Scales, Wearables, Apps):
   - Each source card shows: name, domain pills, status badge
   - Supported: file upload button
   - Planned: "Coming Soon" badge, disabled

The actual parser routing will initially only handle already-supported sources (oura, apple-watch, whoop, strava, hevy). New parsers get wired up as they're built in later tasks.

```tsx
{/* Data Sources Section */}
<div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
  <h2 className="text-sm font-semibold text-gray-300 mb-4">Data Sources</h2>

  {(['wearable', 'scale', 'app'] as const).map(category => {
    const sources = IMPORT_SOURCES.filter(s => s.category === category)
    const label = category === 'wearable' ? 'Wearables' : category === 'scale' ? 'Smart Scales' : 'Apps'

    return (
      <div key={category} className="mb-6 last:mb-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map(source => {
            const lastImport = getLastImportForSource(source.id)
            const isSupported = source.parserStatus === 'supported'

            return (
              <div key={source.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300 font-medium">{source.name}</div>
                  <div className="flex gap-1 mt-1">
                    {source.domains.map(d => (
                      <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-500">{d}</span>
                    ))}
                  </div>
                  {lastImport && (
                    <div className="text-[10px] text-gray-600 mt-1">
                      Last import: {lastImport.importedAt.slice(0, 10)} ({lastImport.recordCount} records)
                    </div>
                  )}
                </div>
                <div>
                  {isSupported ? (
                    <label className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 cursor-pointer hover:bg-brand-500/30 transition-colors">
                      Import
                      <input
                        type="file"
                        className="hidden"
                        accept={source.fileFormats.map(f => `.${f}`).join(',')}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleFileImport(source, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] text-gray-600 border border-white/[0.06]">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  })}
</div>
```

**Step 4: Implement handleFileImport**

This is a routing function. Start with existing parsers only. New parsers get added as they're built:

```typescript
async function handleFileImport(source: ImportSource, file: File) {
  const text = await file.text()
  let recordCount = 0
  const domains = source.domains

  try {
    // Route to parser based on source ID
    // Each case imports its parser, calls it, saves results, and counts records
    // New parsers are wired up here as they are implemented

    switch (source.id) {
      // Already supported — wire up existing parsers
      // (implementation details depend on existing import flows)
      default:
        alert(`Parser for ${source.name} is not yet implemented.`)
        return
    }

    // Log import
    addImportRecord({
      id: uuidv4(),
      sourceId: source.id,
      importedAt: new Date().toISOString(),
      recordCount,
      domains,
      dateRange: { from: '', to: '' }, // filled by parser
    })

    alert(`Imported ${recordCount} records from ${source.name}`)
  } catch (err) {
    alert(`Import failed: ${(err as Error).message}`)
  }
}
```

**Step 5: Run tests and verify build**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All pass

**Step 6: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat(imports): add Data Sources UI section to Settings"
```

---

## Phase 2: Scale Parsers

Each scale parser is fully independent. They convert scale CSV/JSON exports to `BodyCompEntry[]`.

### Task 5: Withings Scale CSV Parser

**Files:**
- Create: `src/utils/scale-parsers/withings.ts`
- Create: `src/utils/scale-parsers/withings.test.ts`

**CSV Format:** Withings exports CSV with columns: `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments`
Weight in kg or lbs depending on user settings. Dates in `YYYY-MM-DD HH:MM:SS` format.

**Step 1: Write the failing test**

```typescript
// src/utils/scale-parsers/withings.test.ts
import { parseWithingsScale } from './withings'

describe('parseWithingsScale', () => {
  it('returns empty array for empty input', () => {
    expect(parseWithingsScale('')).toEqual([])
  })

  it('parses a single row', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,77.5,12.4,3.2,35.1,52.3,`
    const result = parseWithingsScale(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(77.5)
    expect(result[0].bodyFatPct).toBeCloseTo(16.0) // 12.4 / 77.5 * 100
    expect(result[0].source).toBe('withings')
  })

  it('handles missing fat mass', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,77.5,,,,`
    const result = parseWithingsScale(csv)
    expect(result).toHaveLength(1)
    expect(result[0].bodyFatPct).toBeUndefined()
  })

  it('parses multiple rows', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,77.5,12.4,3.2,35.1,52.3,
2026-03-02 08:15:00,77.2,12.2,3.2,35.0,52.1,morning`
    const result = parseWithingsScale(csv)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[1].date).toBe('2026-03-02')
  })

  it('auto-calculates leanMassKg', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,80.0,16.0,,,`
    const result = parseWithingsScale(csv)
    expect(result[0].leanMassKg).toBeCloseTo(64.0) // 80 * (1 - 20/100)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/scale-parsers/withings.test.ts --reporter=verbose`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/utils/scale-parsers/withings.ts
import { v4 as uuidv4 } from 'uuid'
import type { BodyCompEntry } from '../../types/body-composition'

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function parseWithingsScale(csv: string): BodyCompEntry[] {
  if (!csv.trim()) return []

  const rows = parseCsvRows(csv)

  return rows.map(row => {
    const dateStr = (row['Date'] ?? '').slice(0, 10) // 'YYYY-MM-DD HH:MM:SS' → 'YYYY-MM-DD'
    const weightKg = parseFloat(row['Weight'])
    const fatMassKg = row['Fat mass'] ? parseFloat(row['Fat mass']) : undefined

    if (isNaN(weightKg) || !dateStr) return null

    const bodyFatPct = fatMassKg !== undefined && !isNaN(fatMassKg) && weightKg > 0
      ? (fatMassKg / weightKg) * 100
      : undefined

    const leanMassKg = bodyFatPct !== undefined
      ? weightKg * (1 - bodyFatPct / 100)
      : undefined

    return {
      id: uuidv4(),
      date: dateStr,
      source: 'withings' as const,
      weightKg,
      bodyFatPct: bodyFatPct !== undefined ? Math.round(bodyFatPct * 10) / 10 : undefined,
      leanMassKg: leanMassKg !== undefined ? Math.round(leanMassKg * 10) / 10 : undefined,
      note: row['Comments'] || undefined,
    }
  }).filter((e): e is BodyCompEntry => e !== null)
}
```

**Step 4: Run tests**

Run: `npx vitest run src/utils/scale-parsers/withings.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/scale-parsers/withings.ts src/utils/scale-parsers/withings.test.ts
git commit -m "feat(imports): add Withings scale CSV parser"
```

---

### Task 6: Garmin Index S2 CSV Parser

**Files:**
- Create: `src/utils/scale-parsers/garmin.ts`
- Create: `src/utils/scale-parsers/garmin.test.ts`

**CSV Format:** First line is "Body", second line headers: `weight,bmi,fat,date,time`. Weight in kg, fat as percentage.

**Step 1: Write tests**

```typescript
// src/utils/scale-parsers/garmin.test.ts
import { parseGarminScale } from './garmin'

describe('parseGarminScale', () => {
  it('returns empty for empty input', () => {
    expect(parseGarminScale('')).toEqual([])
  })

  it('parses Garmin body comp CSV', () => {
    const csv = `Body
weight,bmi,fat,date,time
83.6,24.1,18.5,2026-03-01,08:00:17
82.8,23.9,18.2,2026-03-02,22:02:16`
    const result = parseGarminScale(csv)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(83.6)
    expect(result[0].bodyFatPct).toBeCloseTo(18.5)
    expect(result[0].source).toBe('garmin')
  })

  it('handles zero fat percentage', () => {
    const csv = `Body
weight,bmi,fat,date,time
83.6,24.1,0.0,2026-03-01,08:00:17`
    const result = parseGarminScale(csv)
    expect(result[0].bodyFatPct).toBeUndefined() // 0.0 likely means no data
  })

  it('auto-calculates leanMassKg', () => {
    const csv = `Body
weight,bmi,fat,date,time
100.0,28.0,20.0,2026-03-01,08:00:00`
    const result = parseGarminScale(csv)
    expect(result[0].leanMassKg).toBeCloseTo(80.0)
  })
})
```

**Step 2: Run test to fail, Step 3: Implement**

```typescript
// src/utils/scale-parsers/garmin.ts
import { v4 as uuidv4 } from 'uuid'
import type { BodyCompEntry } from '../../types/body-composition'

export function parseGarminScale(csv: string): BodyCompEntry[] {
  if (!csv.trim()) return []

  const lines = csv.trim().split('\n')
  // Skip "Body" header line if present
  const startIdx = lines[0].trim().toLowerCase() === 'body' ? 1 : 0
  if (lines.length < startIdx + 2) return []

  const headers = lines[startIdx].split(',').map(h => h.trim().toLowerCase())
  const weightIdx = headers.indexOf('weight')
  const fatIdx = headers.indexOf('fat')
  const dateIdx = headers.indexOf('date')

  if (weightIdx === -1 || dateIdx === -1) return []

  return lines.slice(startIdx + 1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const weightKg = parseFloat(cols[weightIdx])
    const fatRaw = fatIdx !== -1 ? parseFloat(cols[fatIdx]) : NaN
    const date = cols[dateIdx]

    if (isNaN(weightKg) || !date) return null

    // Garmin reports 0.0 when no fat data available
    const bodyFatPct = !isNaN(fatRaw) && fatRaw > 0 ? fatRaw : undefined
    const leanMassKg = bodyFatPct !== undefined
      ? Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10
      : undefined

    return {
      id: uuidv4(),
      date,
      source: 'garmin' as const,
      weightKg,
      bodyFatPct,
      leanMassKg,
    }
  }).filter((e): e is BodyCompEntry => e !== null)
}
```

**Step 4: Run tests, Step 5: Commit**

```bash
git add src/utils/scale-parsers/garmin.ts src/utils/scale-parsers/garmin.test.ts
git commit -m "feat(imports): add Garmin Index S2 scale CSV parser"
```

---

### Task 7: Renpho CSV Parser

**Files:**
- Create: `src/utils/scale-parsers/renpho.ts`
- Create: `src/utils/scale-parsers/renpho.test.ts`

**CSV Format:** Renpho exports with columns including `Time of Measurement,Weight(kg),BMI,Body Fat(%),Subcutaneous Fat(%),Visceral Fat,Body Water(%),Skeletal Muscle(%),Muscle Mass(kg),Bone Mass(kg),Protein(%),BMR(kcal),Metabolic Age`. Headers contain units in parentheses.

**Step 1: Write tests**

```typescript
// src/utils/scale-parsers/renpho.test.ts
import { parseRenphoScale } from './renpho'

describe('parseRenphoScale', () => {
  it('returns empty for empty input', () => {
    expect(parseRenphoScale('')).toEqual([])
  })

  it('parses Renpho CSV', () => {
    const csv = `Time of Measurement,Weight(kg),BMI,Body Fat(%),Subcutaneous Fat(%),Visceral Fat,Body Water(%),Skeletal Muscle(%),Muscle Mass(kg),Bone Mass(kg),Protein(%),BMR(kcal),Metabolic Age
2026-03-01 08:30,77.5,23.8,18.5,15.2,8,55.3,45.2,35.1,3.2,16.5,1680,28`
    const result = parseRenphoScale(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(77.5)
    expect(result[0].bodyFatPct).toBeCloseTo(18.5)
    expect(result[0].source).toBe('renpho')
  })

  it('auto-calculates leanMassKg', () => {
    const csv = `Time of Measurement,Weight(kg),BMI,Body Fat(%),Subcutaneous Fat(%),Visceral Fat,Body Water(%),Skeletal Muscle(%),Muscle Mass(kg),Bone Mass(kg),Protein(%),BMR(kcal),Metabolic Age
2026-03-01 08:30,100.0,28.0,20.0,,,,,,,,,`
    const result = parseRenphoScale(csv)
    expect(result[0].leanMassKg).toBeCloseTo(80.0)
  })
})
```

**Step 2-3: Implement**

```typescript
// src/utils/scale-parsers/renpho.ts
import { v4 as uuidv4 } from 'uuid'
import type { BodyCompEntry } from '../../types/body-composition'

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function parseRenphoScale(csv: string): BodyCompEntry[] {
  if (!csv.trim()) return []

  const rows = parseCsvRows(csv)

  return rows.map(row => {
    const dateTime = row['Time of Measurement'] ?? ''
    const date = dateTime.slice(0, 10)

    // Find weight column — header may include unit
    const weightKey = Object.keys(row).find(k => k.toLowerCase().startsWith('weight'))
    const fatKey = Object.keys(row).find(k => k.toLowerCase().startsWith('body fat'))

    const weightKg = weightKey ? parseFloat(row[weightKey]) : NaN
    const bodyFatPct = fatKey ? parseFloat(row[fatKey]) : undefined

    if (isNaN(weightKg) || !date) return null

    const validFat = bodyFatPct !== undefined && !isNaN(bodyFatPct) ? bodyFatPct : undefined
    const leanMassKg = validFat !== undefined
      ? Math.round(weightKg * (1 - validFat / 100) * 10) / 10
      : undefined

    return {
      id: uuidv4(),
      date,
      source: 'renpho' as const,
      weightKg,
      bodyFatPct: validFat,
      leanMassKg,
    }
  }).filter((e): e is BodyCompEntry => e !== null)
}
```

**Step 4-5: Run tests, Commit**

```bash
git add src/utils/scale-parsers/renpho.ts src/utils/scale-parsers/renpho.test.ts
git commit -m "feat(imports): add Renpho scale CSV parser"
```

---

### Task 8: Eufy CSV Parser

Same pattern as Renpho. Eufy exports similar columns. Create `src/utils/scale-parsers/eufy.ts` and test file following the same pattern. Key difference: Eufy column headers may differ slightly (e.g., `Date,Weight (kg),Body Fat (%),BMI,...`).

**Commit:** `git commit -m "feat(imports): add Eufy scale CSV parser"`

---

### Task 9: Fitbit Aria JSON Parser

**Files:**
- Create: `src/utils/scale-parsers/fitbit.ts`
- Create: `src/utils/scale-parsers/fitbit.test.ts`

**JSON Format:** Array of objects: `{ logId, weight, bmi, fat, date, time, source }`. Weight in lbs, fat as percentage, date in `MM/DD/YY` format.

**Step 1: Write tests**

```typescript
// src/utils/scale-parsers/fitbit.test.ts
import { parseFitbitScale } from './fitbit'

describe('parseFitbitScale', () => {
  it('returns empty for empty input', () => {
    expect(parseFitbitScale('[]')).toEqual([])
  })

  it('parses Fitbit weight JSON', () => {
    const json = JSON.stringify([
      { logId: 1703663764000, weight: 180.9, bmi: 25.34, fat: 24.98, date: '03/01/26', time: '07:56:04', source: 'Aria' }
    ])
    const result = parseFitbitScale(json)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(82.1) // 180.9 * 0.453592
    expect(result[0].bodyFatPct).toBeCloseTo(24.98)
    expect(result[0].source).toBe('fitbit')
  })

  it('handles missing fat field', () => {
    const json = JSON.stringify([
      { logId: 1, weight: 170.0, bmi: 24.0, date: '03/01/26', time: '08:00:00', source: 'API' }
    ])
    const result = parseFitbitScale(json)
    expect(result[0].bodyFatPct).toBeUndefined()
  })
})
```

**Step 2-3: Implement**

```typescript
// src/utils/scale-parsers/fitbit.ts
import { v4 as uuidv4 } from 'uuid'
import type { BodyCompEntry } from '../../types/body-composition'

const LBS_TO_KG = 0.453592

interface FitbitWeightEntry {
  logId: number
  weight: number    // lbs
  bmi: number
  fat?: number      // percentage
  date: string      // MM/DD/YY
  time: string
  source: string
}

function parseFitbitDate(dateStr: string): string {
  // MM/DD/YY → YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length !== 3) return ''
  const [month, day, year] = parts
  const fullYear = parseInt(year, 10) < 50 ? `20${year}` : `19${year}`
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function parseFitbitScale(jsonStr: string): BodyCompEntry[] {
  if (!jsonStr.trim()) return []

  let entries: FitbitWeightEntry[]
  try {
    entries = JSON.parse(jsonStr)
  } catch {
    return []
  }

  if (!Array.isArray(entries)) return []

  return entries.map(entry => {
    const date = parseFitbitDate(entry.date)
    const weightKg = Math.round(entry.weight * LBS_TO_KG * 10) / 10
    const bodyFatPct = entry.fat != null && entry.fat > 0 ? entry.fat : undefined

    if (!date || isNaN(weightKg)) return null

    const leanMassKg = bodyFatPct !== undefined
      ? Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10
      : undefined

    return {
      id: uuidv4(),
      date,
      source: 'fitbit' as const,
      weightKg,
      bodyFatPct,
      leanMassKg,
    }
  }).filter((e): e is BodyCompEntry => e !== null)
}
```

**Step 4-5: Run tests, Commit**

```bash
git add src/utils/scale-parsers/fitbit.ts src/utils/scale-parsers/fitbit.test.ts
git commit -m "feat(imports): add Fitbit Aria JSON parser"
```

---

## Phase 3: Wearable Parsers

### Task 10: Garmin Sleep CSV Parser

**Files:**
- Create: `src/utils/sleep-parsers/garmin.ts`
- Create: `src/utils/sleep-parsers/garmin.test.ts`

**CSV Format:** Garmin sleep export includes columns like `Calendar Date,Sleep Start,Sleep End,Overall Sleep Score,Deep Sleep Duration,Light Sleep Duration,REM Sleep Duration,Awake Duration`. Durations in `H:MM` or minutes format.

Follow the same pattern as `whoop.ts`. Parser signature: `parseGarminSleep(csv: string): { nights: SleepNight[] }`. Source: `'garmin'`.

**Commit:** `git commit -m "feat(imports): add Garmin sleep CSV parser"`

---

### Task 11: Garmin Exercise CSV Parser

**Files:**
- Create: `src/utils/exercise-parsers/garmin.ts`
- Create: `src/utils/exercise-parsers/garmin.test.ts`

**CSV Format:** Garmin activities export: `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss`.

Parser signature: `parseGarminExercise(csv: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] }`. Source: `'garmin'`. Map activity types to cardio/strength/sport.

**Commit:** `git commit -m "feat(imports): add Garmin exercise CSV parser"`

---

### Task 12: Fitbit Sleep JSON Parser

**Files:**
- Create: `src/utils/sleep-parsers/fitbit.ts`
- Create: `src/utils/sleep-parsers/fitbit.test.ts`

**JSON Format:** Array of sleep log entries with `dateOfSleep`, `duration`, `efficiency`, `minutesAsleep`, `minutesAwake`, and `levels.summary` containing `deep.minutes`, `light.minutes`, `rem.minutes`, `wake.minutes`.

Parser signature: `parseFitbitSleep(jsonStr: string): { nights: SleepNight[] }`. Source: `'fitbit'`.

**Commit:** `git commit -m "feat(imports): add Fitbit sleep JSON parser"`

---

### Task 13: Fitbit Exercise JSON Parser

**Files:**
- Create: `src/utils/exercise-parsers/fitbit.ts`
- Create: `src/utils/exercise-parsers/fitbit.test.ts`

**JSON Format:** From Fitbit bulk export, `exercise-*.json` files contain arrays with `logId`, `activityName`, `startTime`, `duration`, `averageHeartRate`, `calories`, `steps`, `distance`.

Parser signature: `parseFitbitExercise(jsonStr: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] }`. Source: `'fitbit'`.

**Commit:** `git commit -m "feat(imports): add Fitbit exercise JSON parser"`

---

### Task 14: Samsung Health Sleep CSV Parser

**Files:**
- Create: `src/utils/sleep-parsers/samsung.ts`
- Create: `src/utils/sleep-parsers/samsung.test.ts`

**CSV Format:** Samsung exports `com.samsung.shealth.sleep.csv` with columns including start/end times, sleep stages in minutes, efficiency. Timestamps are UTC with offset column.

Parser signature: `parseSamsungSleep(csv: string): { nights: SleepNight[] }`. Source: `'samsung'`.

**Commit:** `git commit -m "feat(imports): add Samsung Health sleep CSV parser"`

---

### Task 15: Samsung Health Exercise CSV Parser

**Files:**
- Create: `src/utils/exercise-parsers/samsung.ts`
- Create: `src/utils/exercise-parsers/samsung.test.ts`

**CSV Format:** Samsung exports `com.samsung.shealth.exercise.csv` with activity type, start/end time, duration, calories, distance, heart rate.

Parser signature: `parseSamsungExercise(csv: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] }`. Source: `'samsung'`.

**Commit:** `git commit -m "feat(imports): add Samsung Health exercise CSV parser"`

---

## Phase 4: App Parsers

### Task 16: Strong CSV Parser

**Files:**
- Create: `src/utils/exercise-parsers/strong.ts`
- Create: `src/utils/exercise-parsers/strong.test.ts`

**CSV Format:** Strong exports: `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes`. Very similar to Hevy.

**Step 1: Write tests**

```typescript
// src/utils/exercise-parsers/strong.test.ts
import { parseStrongCsv } from './strong'

describe('parseStrongCsv', () => {
  it('returns empty for empty input', () => {
    const result = parseStrongCsv('')
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses a strength workout', () => {
    const csv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes
2026-03-01,Push Day,45m,Bench Press,1,80,8,,,
2026-03-01,Push Day,45m,Bench Press,2,80,8,,,
2026-03-01,Push Day,45m,Overhead Press,1,40,10,,,`
    const result = parseStrongCsv(csv)
    expect(result.workouts).toHaveLength(1)
    expect(result.workouts[0].source).toBe('strong')
    expect(result.workouts[0].type).toBe('strength')
    expect(result.workouts[0].activityName).toBe('Push Day')
    expect(result.workouts[0].sets).toHaveLength(3)
    expect(result.workouts[0].sets![0].exercise).toBe('Bench Press')
    expect(result.workouts[0].sets![0].weightKg).toBe(80)
    expect(result.workouts[0].sets![0].reps).toBe(8)
  })

  it('groups by date + workout name', () => {
    const csv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes
2026-03-01,Push Day,45m,Bench Press,1,80,8,,,
2026-03-02,Pull Day,50m,Deadlift,1,120,5,,,`
    const result = parseStrongCsv(csv)
    expect(result.workouts).toHaveLength(2)
  })
})
```

**Step 2-3: Implement** (nearly identical to Hevy parser, just with `source: 'strong'`)

```typescript
// src/utils/exercise-parsers/strong.ts
import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseSet, VO2MaxEntry } from '../../types/exercise'

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function parseStrongCsv(csv: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  if (!csv.trim()) return { workouts: [], vo2max: [] }

  const rows = parseCsvRows(csv)
  const groups = new Map<string, { date: string; name: string; sets: ExerciseSet[] }>()

  for (const row of rows) {
    const key = `${row['Date']}__${row['Workout Name']}`
    if (!groups.has(key)) {
      groups.set(key, { date: row['Date'], name: row['Workout Name'], sets: [] })
    }
    const group = groups.get(key)!
    const weightRaw = row['Weight']
    const repsRaw = row['Reps']
    const durationRaw = row['Seconds']
    const weightKg = weightRaw ? parseFloat(weightRaw) : undefined
    const reps = repsRaw ? parseInt(repsRaw, 10) : undefined
    const durationSec = durationRaw ? parseInt(durationRaw, 10) : undefined
    const setOrderRaw = row['Set Order']
    const setIndex = setOrderRaw ? parseInt(setOrderRaw, 10) - 1 : 0
    group.sets.push({
      exercise: row['Exercise Name'],
      setIndex,
      weightKg: weightKg !== undefined && !isNaN(weightKg) ? weightKg : undefined,
      reps: reps !== undefined && !isNaN(reps) ? reps : undefined,
      durationSec: durationSec !== undefined && !isNaN(durationSec) ? durationSec : undefined,
    })
  }

  const workouts: ExerciseWorkout[] = Array.from(groups.values()).map(g => ({
    id: uuidv4(),
    source: 'strong' as const,
    sourceId: `strong-${g.date}-${g.name}`,
    date: g.date,
    type: 'strength' as const,
    activityName: g.name,
    sets: g.sets,
    createdAt: Date.now(),
  }))

  return { workouts, vo2max: [] }
}
```

**Step 4-5: Run tests, Commit**

```bash
git add src/utils/exercise-parsers/strong.ts src/utils/exercise-parsers/strong.test.ts
git commit -m "feat(imports): add Strong CSV parser"
```

---

### Task 17: MyFitnessPal CSV Parser

**Files:**
- Create: `src/utils/nutrition-parsers/myfitnesspal.ts`
- Create: `src/utils/nutrition-parsers/myfitnesspal.test.ts`

**CSV Format:** MyFitnessPal exports meal nutrition as CSV with columns: `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note`.

**Step 1: Write tests**

```typescript
// src/utils/nutrition-parsers/myfitnesspal.test.ts
import { parseMyFitnessPalCsv } from './myfitnesspal'

describe('parseMyFitnessPalCsv', () => {
  it('returns empty for empty input', () => {
    expect(parseMyFitnessPalCsv('')).toEqual([])
  })

  it('parses a single meal entry', () => {
    const csv = `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note
2026-03-01,Breakfast,450,15,,,,,,,45,3,,35,,,,`
    const result = parseMyFitnessPalCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].mealType).toBe('breakfast')
    expect(result[0].calories).toBe(450)
    expect(result[0].fatG).toBe(15)
    expect(result[0].carbsG).toBe(45)
    expect(result[0].proteinG).toBe(35)
    expect(result[0].fiberG).toBe(3)
    expect(result[0].source).toBe('myfitnesspal')
  })

  it('maps meal names to mealType', () => {
    const csv = `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note
2026-03-01,Lunch,600,20,,,,,,,60,5,,40,,,,
2026-03-01,Dinner,700,25,,,,,,,55,4,,45,,,,
2026-03-01,Snacks,200,8,,,,,,,20,2,,10,,,,`
    const result = parseMyFitnessPalCsv(csv)
    expect(result[0].mealType).toBe('lunch')
    expect(result[1].mealType).toBe('dinner')
    expect(result[2].mealType).toBe('snack')
  })
})
```

**Step 2-3: Implement**

```typescript
// src/utils/nutrition-parsers/myfitnesspal.ts
import { v4 as uuidv4 } from 'uuid'
import type { NutritionEntry, MealType } from '../../types/nutrition'

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

function toMealType(meal: string): MealType {
  const lower = meal.toLowerCase()
  if (lower === 'breakfast') return 'breakfast'
  if (lower === 'lunch') return 'lunch'
  if (lower === 'dinner') return 'dinner'
  return 'snack' // Snacks, or anything else
}

function optionalInt(val: string): number | undefined {
  if (!val) return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}

export function parseMyFitnessPalCsv(csv: string): NutritionEntry[] {
  if (!csv.trim()) return []

  const rows = parseCsvRows(csv)

  return rows.map(row => {
    const date = row['Date']
    const meal = row['Meal']
    if (!date || !meal) return null

    const calories = optionalInt(row['Calories'])
    // Find columns with units in header
    const fatKey = Object.keys(row).find(k => k.toLowerCase().startsWith('fat'))
    const carbsKey = Object.keys(row).find(k => k.toLowerCase().startsWith('carbohydrates'))
    const proteinKey = Object.keys(row).find(k => k.toLowerCase().startsWith('protein'))
    const fiberKey = Object.keys(row).find(k => k.toLowerCase() === 'fiber')

    return {
      id: uuidv4(),
      source: 'myfitnesspal' as const,
      date,
      mealType: toMealType(meal),
      calories,
      fatG: fatKey ? optionalInt(row[fatKey]) : undefined,
      carbsG: carbsKey ? optionalInt(row[carbsKey]) : undefined,
      proteinG: proteinKey ? optionalInt(row[proteinKey]) : undefined,
      fiberG: fiberKey ? optionalInt(row[fiberKey]) : undefined,
      createdAt: Date.now(),
    }
  }).filter((e): e is NutritionEntry => e !== null)
}
```

**Step 4-5: Run tests, Commit**

```bash
git add src/utils/nutrition-parsers/myfitnesspal.ts src/utils/nutrition-parsers/myfitnesspal.test.ts
git commit -m "feat(imports): add MyFitnessPal CSV parser"
```

---

### Task 18: Cronometer CSV Parser

**Files:**
- Create: `src/utils/nutrition-parsers/cronometer.ts`
- Create: `src/utils/nutrition-parsers/cronometer.test.ts`

Cronometer exports daily nutrition summaries as CSV. Follow the same pattern as MyFitnessPal parser. Source: `'cronometer'`.

**Commit:** `git commit -m "feat(imports): add Cronometer CSV parser"`

---

## Phase 5: Contextual Import UI

### Task 19: Per-Domain Import Buttons

**Files:**
- Modify: `src/pages/Sleep.tsx` (Sources tab)
- Modify: `src/pages/Exercise.tsx` (Sources tab)
- Modify: `src/pages/Nutrition.tsx` (Sources tab)
- Modify: `src/pages/BodyComposition.tsx` or body comp section in Dashboard

Add an "Import" button to each domain page's Sources tab that:
1. Shows a dropdown/modal of sources filtered to that domain
2. Has file upload for each supported source
3. Uses the same `handleFileImport` pattern from Settings

Filter sources using:
```typescript
const sleepSources = IMPORT_SOURCES.filter(s => s.domains.includes('sleep'))
const exerciseSources = IMPORT_SOURCES.filter(s => s.domains.includes('exercise'))
const nutritionSources = IMPORT_SOURCES.filter(s => s.domains.includes('nutrition'))
const bodyCompSources = IMPORT_SOURCES.filter(s => s.domains.includes('body-composition'))
```

**Commit:** `git commit -m "feat(imports): add contextual import buttons to domain pages"`
