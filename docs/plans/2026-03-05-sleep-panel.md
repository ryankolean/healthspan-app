# Sleep Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/sleep` page that unifies sleep data from Oura, Apple Health, Whoop, and manual entry into a normalized store with Attia longevity compliance tracking.

**Architecture:** Layered adapter pattern (same as Exercise panel). New `SleepNight[]` store in localStorage. Oura adapter reads from existing `healthspan:ouraData`. Apple Health XML parser reuses DOMParser. Whoop uses CSV parser. Dashboard Sleep tab stays untouched. Conflict detection mirrors exercise-storage.ts.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Tailwind CSS, Recharts, React Router v6 (HashRouter), uuid, localStorage

**Existing patterns to follow:**
- Types: `src/types/exercise.ts` — flat interface with `as const satisfies` for defaults
- Storage: `src/utils/exercise-storage.ts` — `readJson()` helper, merge/conflict/import pipeline
- Parsers: `src/utils/exercise-parsers/*.ts` — return `{ workouts, vo2max }` shape (ours returns `{ nights }`)
- Tests: Vitest with `globals: true` — no need to import `describe`, `it`, `expect`, `beforeEach`
- Data: `src/data/vo2max-targets.ts` — simple export with getter function
- Page: `src/pages/Exercise.tsx` — tab-based layout, Recharts charts, same Tailwind class patterns

---

### Task 1: TypeScript Types (`src/types/sleep.ts`)

**Files:**
- Create: `src/types/sleep.ts`
- Create: `src/types/sleep.test.ts`

**Step 1: Write the test**

```ts
// src/types/sleep.test.ts
import type { SleepNight, SleepSettings, SleepSource } from './sleep'
import { DEFAULT_SLEEP_SETTINGS } from './sleep'

describe('Sleep types', () => {
  it('DEFAULT_SLEEP_SETTINGS has correct shape', () => {
    expect(DEFAULT_SLEEP_SETTINGS.globalPriority).toEqual(['oura', 'apple_health', 'whoop', 'manual'])
  })

  it('DEFAULT_SLEEP_SETTINGS is deeply frozen (as const)', () => {
    expect(() => {
      ;(DEFAULT_SLEEP_SETTINGS as any).globalPriority = []
    }).toThrow()
  })

  it('SleepNight fields compile correctly', () => {
    const night: SleepNight = {
      id: 'test',
      source: 'oura',
      sourceId: 'oura-2026-03-01',
      date: '2026-03-01',
      totalMin: 480,
      deepMin: 90,
      remMin: 110,
      lightMin: 240,
      awakeMin: 40,
      efficiency: 92,
      createdAt: Date.now(),
    }
    expect(night.source).toBe('oura')
    expect(night.totalMin).toBe(480)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/sleep.test.ts`
Expected: FAIL — module `./sleep` not found

**Step 3: Write the implementation**

```ts
// src/types/sleep.ts
export type SleepSource = 'oura' | 'apple_health' | 'whoop' | 'manual'

export interface SleepNight {
  id: string
  source: SleepSource
  sourceId: string
  date: string                    // YYYY-MM-DD (sleep start date)
  bedtime?: string                // ISO 8601 datetime
  wakeTime?: string               // ISO 8601 datetime
  totalMin?: number
  deepMin?: number
  remMin?: number
  lightMin?: number
  awakeMin?: number
  efficiency?: number             // percentage
  onsetMin?: number               // sleep onset latency
  avgHr?: number
  lowestHr?: number
  avgHrv?: number                 // ms
  avgBreath?: number              // breaths per minute
  spo2Avg?: number                // percentage
  sleepScore?: number             // 0-100
  qualityRating?: number          // manual: 1-5
  flaggedConflict?: boolean
  resolvedBy?: 'priority' | 'manual'
  createdAt: number
}

export interface SleepSettings {
  globalPriority: SleepSource[]
}

export const DEFAULT_SLEEP_SETTINGS = {
  globalPriority: ['oura', 'apple_health', 'whoop', 'manual'],
} as const satisfies SleepSettings
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/sleep.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/types/sleep.ts src/types/sleep.test.ts
git commit -m "feat(sleep): add TypeScript types for sleep panel"
```

---

### Task 2: Sleep Targets Data (`src/data/sleep-targets.ts`)

**Files:**
- Create: `src/data/sleep-targets.ts`
- Create: `src/data/sleep-targets.test.ts`

**Step 1: Write the test**

```ts
// src/data/sleep-targets.test.ts
import { SLEEP_TARGETS, getSleepStatus } from './sleep-targets'

describe('SLEEP_TARGETS', () => {
  it('has entries for total, deep, rem, efficiency, onset', () => {
    expect(SLEEP_TARGETS).toHaveLength(5)
    const ids = SLEEP_TARGETS.map(t => t.id)
    expect(ids).toContain('total')
    expect(ids).toContain('deep')
    expect(ids).toContain('rem')
    expect(ids).toContain('efficiency')
    expect(ids).toContain('onset')
  })

  it('total sleep target is 420 min (7 hrs)', () => {
    const total = SLEEP_TARGETS.find(t => t.id === 'total')!
    expect(total.greenMin).toBe(420)
  })
})

describe('getSleepStatus', () => {
  it('returns green for total >= 420 min', () => {
    expect(getSleepStatus('total', 480)).toBe('green')
  })

  it('returns amber for total 360-419 min', () => {
    expect(getSleepStatus('total', 390)).toBe('amber')
  })

  it('returns red for total < 360 min', () => {
    expect(getSleepStatus('total', 300)).toBe('red')
  })

  it('returns green for efficiency >= 90', () => {
    expect(getSleepStatus('efficiency', 92)).toBe('green')
  })

  it('returns amber for efficiency 80-89', () => {
    expect(getSleepStatus('efficiency', 85)).toBe('amber')
  })

  it('returns red for efficiency < 80', () => {
    expect(getSleepStatus('efficiency', 75)).toBe('red')
  })

  it('returns green for onset <= 20 min (lower is better)', () => {
    expect(getSleepStatus('onset', 15)).toBe('green')
  })

  it('returns red for onset > 40 min', () => {
    expect(getSleepStatus('onset', 50)).toBe('red')
  })

  it('returns green for deep >= 90 min', () => {
    expect(getSleepStatus('deep', 95)).toBe('green')
  })

  it('returns green for rem >= 105 min', () => {
    expect(getSleepStatus('rem', 110)).toBe('green')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/sleep-targets.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// src/data/sleep-targets.ts

export interface SleepTarget {
  id: string
  label: string
  unit: string
  greenMin: number      // >= this is green (for "lower is better" metrics, this is the upper bound)
  amberMin: number      // >= this is amber (below greenMin)
  lowerIsBetter: boolean
}

// Attia / Outlive sleep longevity targets
export const SLEEP_TARGETS: SleepTarget[] = [
  { id: 'total',      label: 'Total Sleep',      unit: 'min', greenMin: 420, amberMin: 360, lowerIsBetter: false },
  { id: 'deep',       label: 'Deep Sleep',        unit: 'min', greenMin: 90,  amberMin: 60,  lowerIsBetter: false },
  { id: 'rem',        label: 'REM Sleep',          unit: 'min', greenMin: 105, amberMin: 75,  lowerIsBetter: false },
  { id: 'efficiency', label: 'Sleep Efficiency',   unit: '%',   greenMin: 90,  amberMin: 80,  lowerIsBetter: false },
  { id: 'onset',      label: 'Sleep Onset',        unit: 'min', greenMin: 20,  amberMin: 40,  lowerIsBetter: true },
] as const satisfies readonly SleepTarget[]

export type SleepStatus = 'green' | 'amber' | 'red'

export function getSleepStatus(metricId: string, value: number): SleepStatus {
  const target = SLEEP_TARGETS.find(t => t.id === metricId)
  if (!target) return 'red'

  if (target.lowerIsBetter) {
    if (value <= target.greenMin) return 'green'
    if (value <= target.amberMin) return 'amber'
    return 'red'
  }

  if (value >= target.greenMin) return 'green'
  if (value >= target.amberMin) return 'amber'
  return 'red'
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/sleep-targets.test.ts`
Expected: 11 tests PASS

**Step 5: Commit**

```bash
git add src/data/sleep-targets.ts src/data/sleep-targets.test.ts
git commit -m "feat(sleep): add Attia longevity sleep targets data"
```

---

### Task 3: Sleep Storage Utilities (`src/utils/sleep-storage.ts`)

**Files:**
- Create: `src/utils/sleep-storage.ts`
- Create: `src/utils/sleep-storage.test.ts`

**Step 1: Write the test**

```ts
// src/utils/sleep-storage.test.ts
import {
  getSleepNights,
  saveSleepNights,
  getAllNightsRaw,
  getFlaggedSleepConflicts,
  resolveSleepConflict,
  mergeNights,
  importSleepNights,
  getSleepSettings,
  saveSleepSettings,
} from './sleep-storage'
import type { SleepNight, SleepSettings } from '../types/sleep'

const makeNight = (overrides: Partial<SleepNight> = {}): SleepNight => ({
  id: 'n1',
  source: 'oura',
  sourceId: 'oura-2026-03-01',
  date: '2026-03-01',
  totalMin: 480,
  createdAt: Date.now(),
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('getSleepNights / saveSleepNights', () => {
  it('returns empty array when nothing stored', () => {
    expect(getSleepNights()).toEqual([])
  })

  it('saves and retrieves nights', () => {
    saveSleepNights([makeNight()])
    expect(getSleepNights()).toHaveLength(1)
    expect(getSleepNights()[0].id).toBe('n1')
  })

  it('excludes flagged conflicts by default', () => {
    saveSleepNights([
      makeNight({ id: 'n1', flaggedConflict: false }),
      makeNight({ id: 'n2', flaggedConflict: true }),
    ])
    expect(getSleepNights()).toHaveLength(1)
    expect(getSleepNights()[0].id).toBe('n1')
  })

  it('filters by source', () => {
    saveSleepNights([
      makeNight({ id: 'a', source: 'oura' }),
      makeNight({ id: 'b', source: 'whoop' }),
    ])
    expect(getSleepNights({ source: 'oura' })).toHaveLength(1)
  })

  it('filters by date range', () => {
    saveSleepNights([
      makeNight({ id: 'old', date: '2026-01-01' }),
      makeNight({ id: 'new', date: '2026-03-01' }),
    ])
    expect(getSleepNights({ from: '2026-02-01', to: '2026-04-01' })).toHaveLength(1)
    expect(getSleepNights({ from: '2026-02-01', to: '2026-04-01' })[0].id).toBe('new')
  })
})

describe('getFlaggedSleepConflicts / resolveSleepConflict', () => {
  it('returns only flagged nights', () => {
    saveSleepNights([
      makeNight({ id: 'ok' }),
      makeNight({ id: 'bad', flaggedConflict: true }),
    ])
    expect(getFlaggedSleepConflicts()).toHaveLength(1)
    expect(getFlaggedSleepConflicts()[0].id).toBe('bad')
  })

  it('resolves conflict: keeps winner, removes loser', () => {
    saveSleepNights([
      makeNight({ id: 'keep', flaggedConflict: false }),
      makeNight({ id: 'drop', flaggedConflict: true }),
    ])
    resolveSleepConflict('keep', 'drop')
    const all = JSON.parse(localStorage.getItem('healthspan:sleep:nights') ?? '[]')
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('keep')
    expect(all[0].resolvedBy).toBe('manual')
  })

  it('is a no-op when keepId does not exist', () => {
    saveSleepNights([makeNight({ id: 'only', flaggedConflict: true })])
    resolveSleepConflict('nonexistent', 'only')
    const all = JSON.parse(localStorage.getItem('healthspan:sleep:nights') ?? '[]')
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('only')
  })
})

describe('mergeNights', () => {
  it('deduplicates by source + sourceId', () => {
    const existing = [makeNight({ id: 'e1', source: 'oura', sourceId: 'oura-d1' })]
    const incoming = [
      makeNight({ id: 'n1', source: 'oura', sourceId: 'oura-d1' }),
      makeNight({ id: 'n2', source: 'oura', sourceId: 'oura-d2' }),
    ]
    const settings: SleepSettings = { globalPriority: ['oura', 'apple_health', 'whoop', 'manual'] }
    const result = mergeNights(existing, incoming, settings)
    expect(result.filter(n => !n.flaggedConflict)).toHaveLength(2)
  })

  it('flags lower-priority source on same date', () => {
    const existing = [makeNight({
      id: 'e1', source: 'oura', sourceId: 'oura-d1', date: '2026-03-01',
    })]
    const incoming = [makeNight({
      id: 'n1', source: 'whoop', sourceId: 'whoop-d1', date: '2026-03-01',
    })]
    const settings: SleepSettings = { globalPriority: ['oura', 'apple_health', 'whoop', 'manual'] }
    const result = mergeNights(existing, incoming, settings)
    const flagged = result.filter(n => n.flaggedConflict)
    expect(flagged).toHaveLength(1)
    expect(flagged[0].source).toBe('whoop')
  })
})

describe('importSleepNights', () => {
  it('merges incoming into existing store', () => {
    saveSleepNights([makeNight({ id: 'e1', sourceId: 'oura-d1' })])
    importSleepNights([makeNight({ id: 'n1', sourceId: 'oura-d2' })])
    expect(getSleepNights()).toHaveLength(2)
  })

  it('skips exact duplicates', () => {
    saveSleepNights([makeNight({ id: 'e1', sourceId: 'oura-d1' })])
    importSleepNights([makeNight({ id: 'n1', sourceId: 'oura-d1' })])
    expect(getSleepNights()).toHaveLength(1)
  })

  it('uses getAllNightsRaw (includes flagged) for merge base', () => {
    saveSleepNights([makeNight({ id: 'f1', sourceId: 'oura-d1', flaggedConflict: true })])
    importSleepNights([makeNight({ id: 'n1', sourceId: 'oura-d1' })])
    const all = JSON.parse(localStorage.getItem('healthspan:sleep:nights') ?? '[]')
    expect(all).toHaveLength(1)
  })
})

describe('SleepSettings', () => {
  it('returns default settings when none stored', () => {
    const s = getSleepSettings()
    expect(s.globalPriority[0]).toBe('oura')
  })

  it('saves and retrieves settings', () => {
    const s: SleepSettings = { globalPriority: ['whoop', 'oura', 'apple_health', 'manual'] }
    saveSleepSettings(s)
    expect(getSleepSettings().globalPriority[0]).toBe('whoop')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/sleep-storage.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// src/utils/sleep-storage.ts
import type { SleepNight, SleepSettings, SleepSource } from '../types/sleep'
import { DEFAULT_SLEEP_SETTINGS } from '../types/sleep'

const KEYS = {
  nights: 'healthspan:sleep:nights',
  settings: 'healthspan:sleep:settings',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// ─── Nights ───

export interface SleepFilters {
  source?: SleepSource
  from?: string
  to?: string
  includeFlagged?: boolean
}

export function getAllNightsRaw(): SleepNight[] {
  return readJson<SleepNight[]>(KEYS.nights, [])
}

export function saveSleepNights(nights: SleepNight[]): void {
  localStorage.setItem(KEYS.nights, JSON.stringify(nights))
}

export function getSleepNights(filters: SleepFilters = {}): SleepNight[] {
  let list = getAllNightsRaw()
  if (!filters.includeFlagged) list = list.filter(n => !n.flaggedConflict)
  if (filters.source) list = list.filter(n => n.source === filters.source)
  if (filters.from) list = list.filter(n => n.date >= filters.from!)
  if (filters.to) list = list.filter(n => n.date <= filters.to!)
  return list
}

export function getFlaggedSleepConflicts(): SleepNight[] {
  return getAllNightsRaw().filter(n => n.flaggedConflict)
}

export function resolveSleepConflict(keepId: string, discardId: string): void {
  const all = getAllNightsRaw()
  const keepExists = all.some(n => n.id === keepId)
  if (!keepExists) return
  const updated = all
    .filter(n => n.id !== discardId)
    .map(n => n.id === keepId ? { ...n, flaggedConflict: false, resolvedBy: 'manual' as const } : n)
  saveSleepNights(updated)
}

// ─── Conflict Detection + Merge ───

function sourceRank(source: SleepSource, priority: SleepSource[]): number {
  const idx = priority.indexOf(source)
  return idx === -1 ? 999 : idx
}

export function mergeNights(
  existing: SleepNight[],
  incoming: SleepNight[],
  settings: SleepSettings,
): SleepNight[] {
  const result = [...existing]
  const priority = settings.globalPriority

  for (const entry of incoming) {
    const isDuplicate = result.some(n => n.source === entry.source && n.sourceId === entry.sourceId)
    if (isDuplicate) continue

    const conflict = result.find(n =>
      n.source !== entry.source &&
      n.date === entry.date &&
      !n.flaggedConflict
    )

    if (conflict) {
      const existingRank = sourceRank(conflict.source, priority)
      const incomingRank = sourceRank(entry.source, priority)
      if (incomingRank < existingRank) {
        const idx = result.indexOf(conflict)
        result[idx] = { ...conflict, flaggedConflict: true, resolvedBy: 'priority' }
        result.push(entry)
      } else {
        result.push({ ...entry, flaggedConflict: true, resolvedBy: 'priority' })
      }
    } else {
      result.push(entry)
    }
  }

  return result
}

export function importSleepNights(incoming: SleepNight[]): void {
  const existing = getAllNightsRaw()
  const settings = getSleepSettings()
  const merged = mergeNights(existing, incoming, settings)
  saveSleepNights(merged)
}

// ─── Settings ───

export function getSleepSettings(): SleepSettings {
  return readJson<SleepSettings>(KEYS.settings, DEFAULT_SLEEP_SETTINGS)
}

export function saveSleepSettings(settings: SleepSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/sleep-storage.test.ts`
Expected: 15 tests PASS

**Step 5: Commit**

```bash
git add src/utils/sleep-storage.ts src/utils/sleep-storage.test.ts
git commit -m "feat(sleep): add localStorage utilities for sleep data"
```

---

### Task 4: Oura Sleep Parser (`src/utils/sleep-parsers/oura.ts`)

**Files:**
- Create: `src/utils/sleep-parsers/oura.ts`
- Create: `src/utils/sleep-parsers/oura.test.ts`

**Context:** This adapter reads from the existing `healthspan:ouraData` stored by the Dashboard. It joins `DailySleep` (scores) with `SleepDetail` (stages, HR, HRV) on the `day` field to produce `SleepNight[]`. Check `src/types/index.ts` for the `DailySleep` and `SleepDetail` interfaces.

**Step 1: Write the test**

```ts
// src/utils/sleep-parsers/oura.test.ts
import { parseOuraSleep } from './oura'

const SAMPLE_OURA = {
  sleep: [
    { day: '2026-03-01', score: 85, deep: 80, rem: 75, efficiency: 90 },
    { day: '2026-03-02', score: 72, deep: 60, rem: 65, efficiency: 82 },
  ],
  sleepDetail: [
    {
      day: '2026-03-01',
      deep_s: 5400,     // 90 min
      rem_s: 6600,      // 110 min
      light_s: 14400,   // 240 min
      total_s: 28800,   // 480 min
      avg_hr: 58,
      lowest_hr: 52,
      avg_hrv: 45,
      efficiency: 92,
      avg_breath: 14,
    },
    {
      day: '2026-03-02',
      deep_s: 3600,     // 60 min
      rem_s: 4500,      // 75 min
      light_s: 12600,   // 210 min
      total_s: 25200,   // 420 min
      avg_hr: 62,
      lowest_hr: 55,
      avg_hrv: 38,
      efficiency: 84,
    },
  ],
}

describe('parseOuraSleep', () => {
  it('returns empty array for null input', () => {
    expect(parseOuraSleep(null)).toEqual({ nights: [] })
  })

  it('returns empty array when sleep array is missing', () => {
    expect(parseOuraSleep({ sleep: [], sleepDetail: [] })).toEqual({ nights: [] })
  })

  it('parses two nights from sample data', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    expect(result.nights).toHaveLength(2)
  })

  it('converts seconds to minutes for sleep stages', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const night1 = result.nights.find(n => n.date === '2026-03-01')!
    expect(night1.deepMin).toBe(90)
    expect(night1.remMin).toBe(110)
    expect(night1.lightMin).toBe(240)
    expect(night1.totalMin).toBe(480)
  })

  it('includes HR, HRV, efficiency, breath from sleepDetail', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const night1 = result.nights.find(n => n.date === '2026-03-01')!
    expect(night1.avgHr).toBe(58)
    expect(night1.lowestHr).toBe(52)
    expect(night1.avgHrv).toBe(45)
    expect(night1.efficiency).toBe(92)
    expect(night1.avgBreath).toBe(14)
  })

  it('includes sleep score from DailySleep', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const night1 = result.nights.find(n => n.date === '2026-03-01')!
    expect(night1.sleepScore).toBe(85)
  })

  it('sets source as oura with correct sourceId', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    expect(result.nights.every(n => n.source === 'oura')).toBe(true)
    expect(result.nights[0].sourceId).toBe('oura-2026-03-01')
  })

  it('handles sleepDetail missing for a day (graceful fallback)', () => {
    const data = {
      sleep: [{ day: '2026-03-01', score: 80 }],
      sleepDetail: [],
    }
    const result = parseOuraSleep(data)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].sleepScore).toBe(80)
    expect(result.nights[0].deepMin).toBeUndefined()
  })

  it('generates unique IDs', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const ids = result.nights.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/sleep-parsers/oura.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// src/utils/sleep-parsers/oura.ts
import { v4 as uuidv4 } from 'uuid'
import type { SleepNight } from '../../types/sleep'

interface OuraDailySleep {
  day: string
  score?: number
}

interface OuraSleepDetail {
  day: string
  deep_s?: number
  rem_s?: number
  light_s?: number
  total_s?: number
  avg_hr?: number
  lowest_hr?: number
  avg_hrv?: number
  efficiency?: number
  avg_breath?: number
}

interface OuraSleepData {
  sleep?: OuraDailySleep[]
  sleepDetail?: OuraSleepDetail[]
}

function secToMin(sec?: number): number | undefined {
  return sec != null ? Math.round(sec / 60) : undefined
}

export function parseOuraSleep(data: OuraSleepData | null): { nights: SleepNight[] } {
  if (!data?.sleep?.length) return { nights: [] }

  const detailMap = new Map<string, OuraSleepDetail>()
  if (data.sleepDetail) {
    data.sleepDetail.forEach(d => detailMap.set(d.day, d))
  }

  const nights: SleepNight[] = data.sleep.map(s => {
    const detail = detailMap.get(s.day)
    return {
      id: uuidv4(),
      source: 'oura' as const,
      sourceId: `oura-${s.day}`,
      date: s.day,
      sleepScore: s.score,
      totalMin: secToMin(detail?.total_s),
      deepMin: secToMin(detail?.deep_s),
      remMin: secToMin(detail?.rem_s),
      lightMin: secToMin(detail?.light_s),
      avgHr: detail?.avg_hr,
      lowestHr: detail?.lowest_hr,
      avgHrv: detail?.avg_hrv,
      efficiency: detail?.efficiency,
      avgBreath: detail?.avg_breath,
      createdAt: Date.now(),
    }
  })

  return { nights }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/sleep-parsers/oura.test.ts`
Expected: 9 tests PASS

**Step 5: Commit**

```bash
git add src/utils/sleep-parsers/oura.ts src/utils/sleep-parsers/oura.test.ts
git commit -m "feat(sleep): add Oura sleep parser adapter"
```

---

### Task 5: Apple Health Sleep Parser (`src/utils/sleep-parsers/apple-health.ts`)

**Files:**
- Create: `src/utils/sleep-parsers/apple-health.ts`
- Create: `src/utils/sleep-parsers/apple-health.test.ts`

**Context:** Apple Health exports sleep analysis as `<Record type="HKCategoryTypeIdentifierSleepAnalysis">` with `value` attribute indicating the sleep stage. Records have `startDate` and `endDate`. Multiple records per night must be grouped by date and summed by stage.

**Step 1: Write the test**

```ts
// src/utils/sleep-parsers/apple-health.test.ts
import { parseAppleHealthSleep } from './apple-health'

function makeXml(records: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  ${records}
</HealthData>`
}

const SAMPLE_XML = makeXml(`
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisInBed"
    startDate="2026-03-01 22:00:00 +0000"
    endDate="2026-03-02 06:30:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAsleepDeep"
    startDate="2026-03-01 22:30:00 +0000"
    endDate="2026-03-02 00:00:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAsleepREM"
    startDate="2026-03-02 00:00:00 +0000"
    endDate="2026-03-02 01:45:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAsleepCore"
    startDate="2026-03-02 01:45:00 +0000"
    endDate="2026-03-02 05:30:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAwake"
    startDate="2026-03-02 05:30:00 +0000"
    endDate="2026-03-02 05:45:00 +0000" />
`)

describe('parseAppleHealthSleep', () => {
  it('returns empty array for empty HealthData', () => {
    const result = parseAppleHealthSleep('<HealthData></HealthData>')
    expect(result.nights).toEqual([])
  })

  it('parses one night from sample XML', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    expect(result.nights).toHaveLength(1)
  })

  it('computes stage durations in minutes', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    expect(night.deepMin).toBe(90)       // 22:30 to 00:00 = 90 min
    expect(night.remMin).toBe(105)       // 00:00 to 01:45 = 105 min
    expect(night.lightMin).toBe(225)     // 01:45 to 05:30 = 225 min
    expect(night.awakeMin).toBe(15)      // 05:30 to 05:45 = 15 min
  })

  it('sets bedtime and wake time from InBed record', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    expect(night.bedtime).toContain('2026-03-01')
    expect(night.wakeTime).toContain('2026-03-02')
  })

  it('computes total sleep minutes (stages excluding awake)', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    // deep(90) + rem(105) + light(225) = 420 min
    expect(night.totalMin).toBe(420)
  })

  it('computes efficiency = total sleep / time in bed * 100', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    // Time in bed = 22:00 to 06:30 = 510 min, total sleep = 420 min
    // efficiency = 420/510 * 100 ≈ 82
    expect(night.efficiency).toBeCloseTo(82.4, 0)
  })

  it('uses sleep start date as the night date', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    expect(result.nights[0].date).toBe('2026-03-01')
  })

  it('sets source as apple_health', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    expect(result.nights[0].source).toBe('apple_health')
  })

  it('generates unique IDs', () => {
    const xml = makeXml(`
      <Record type="HKCategoryTypeIdentifierSleepAnalysis"
        value="HKCategoryValueSleepAnalysisInBed"
        startDate="2026-03-01 22:00:00 +0000"
        endDate="2026-03-02 06:00:00 +0000" />
      <Record type="HKCategoryTypeIdentifierSleepAnalysis"
        value="HKCategoryValueSleepAnalysisInBed"
        startDate="2026-03-02 22:00:00 +0000"
        endDate="2026-03-03 06:00:00 +0000" />
    `)
    const result = parseAppleHealthSleep(xml)
    expect(result.nights).toHaveLength(2)
    expect(result.nights[0].id).not.toBe(result.nights[1].id)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/sleep-parsers/apple-health.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// src/utils/sleep-parsers/apple-health.ts
import { v4 as uuidv4 } from 'uuid'
import type { SleepNight } from '../../types/sleep'

function parseAppleDate(dateStr: string): string {
  return dateStr.replace(' ', 'T').replace(/\s\+\d{4}$/, 'Z')
}

function diffMin(start: string, end: string): number {
  return Math.round((new Date(parseAppleDate(end)).getTime() - new Date(parseAppleDate(start)).getTime()) / 60000)
}

function nightDateKey(startDate: string): string {
  // Use the date portion of the sleep start — if after noon, it's tonight; if before noon, it's last night
  const d = new Date(parseAppleDate(startDate))
  if (d.getUTCHours() < 12) {
    // Early morning = previous night's date
    const prev = new Date(d)
    prev.setUTCDate(prev.getUTCDate() - 1)
    return prev.toISOString().slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

interface NightAccumulator {
  date: string
  bedtime: string
  wakeTime: string
  deepMin: number
  remMin: number
  lightMin: number
  awakeMin: number
  inBedMin: number
}

export function parseAppleHealthSleep(xmlString: string): { nights: SleepNight[] } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const records = doc.querySelectorAll('Record[type="HKCategoryTypeIdentifierSleepAnalysis"]')
  if (records.length === 0) return { nights: [] }

  const nightMap = new Map<string, NightAccumulator>()

  records.forEach(node => {
    const value = node.getAttribute('value') ?? ''
    const startDate = node.getAttribute('startDate') ?? ''
    const endDate = node.getAttribute('endDate') ?? ''
    const dateKey = nightDateKey(startDate)
    const minutes = diffMin(startDate, endDate)

    if (!nightMap.has(dateKey)) {
      nightMap.set(dateKey, {
        date: dateKey,
        bedtime: startDate,
        wakeTime: endDate,
        deepMin: 0,
        remMin: 0,
        lightMin: 0,
        awakeMin: 0,
        inBedMin: 0,
      })
    }

    const acc = nightMap.get(dateKey)!

    // Track earliest bedtime and latest wake time
    if (parseAppleDate(startDate) < parseAppleDate(acc.bedtime)) acc.bedtime = startDate
    if (parseAppleDate(endDate) > parseAppleDate(acc.wakeTime)) acc.wakeTime = endDate

    switch (value) {
      case 'HKCategoryValueSleepAnalysisInBed':
        acc.inBedMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAsleepDeep':
        acc.deepMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAsleepREM':
        acc.remMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAsleepCore':
        acc.lightMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAwake':
        acc.awakeMin += minutes
        break
    }
  })

  const nights: SleepNight[] = Array.from(nightMap.values()).map(acc => {
    const totalMin = acc.deepMin + acc.remMin + acc.lightMin
    const timeInBed = acc.inBedMin > 0 ? acc.inBedMin : totalMin + acc.awakeMin
    const efficiency = timeInBed > 0 ? Math.round((totalMin / timeInBed) * 1000) / 10 : undefined

    return {
      id: uuidv4(),
      source: 'apple_health' as const,
      sourceId: `apple-sleep-${acc.date}`,
      date: acc.date,
      bedtime: parseAppleDate(acc.bedtime),
      wakeTime: parseAppleDate(acc.wakeTime),
      totalMin,
      deepMin: acc.deepMin > 0 ? acc.deepMin : undefined,
      remMin: acc.remMin > 0 ? acc.remMin : undefined,
      lightMin: acc.lightMin > 0 ? acc.lightMin : undefined,
      awakeMin: acc.awakeMin > 0 ? acc.awakeMin : undefined,
      efficiency,
      createdAt: Date.now(),
    }
  })

  return { nights }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/sleep-parsers/apple-health.test.ts`
Expected: 9 tests PASS

**Step 5: Commit**

```bash
git add src/utils/sleep-parsers/apple-health.ts src/utils/sleep-parsers/apple-health.test.ts
git commit -m "feat(sleep): add Apple Health XML sleep parser"
```

---

### Task 6: Whoop CSV Sleep Parser (`src/utils/sleep-parsers/whoop.ts`)

**Files:**
- Create: `src/utils/sleep-parsers/whoop.ts`
- Create: `src/utils/sleep-parsers/whoop.test.ts`

**Context:** Whoop CSV exports contain sleep data with columns. The CSV parser should reuse the `splitCsvLine` pattern from `src/utils/exercise-parsers/hevy.ts` for handling quoted fields.

**Step 1: Write the test**

```ts
// src/utils/sleep-parsers/whoop.test.ts
import { parseWhoopSleep } from './whoop'

const SAMPLE_CSV = `Cycle start time,Cycle end time,Sleep onset,Wake onset,Light sleep duration (min),SWS duration (min),REM duration (min),Awake duration (min),Sleep Score,HRV (ms),Respiratory Rate
2026-03-01T22:00:00Z,2026-03-02T06:30:00Z,2026-03-01T22:15:00Z,2026-03-02T06:20:00Z,240,95,110,15,82,48,14.2
2026-03-02T22:30:00Z,2026-03-03T07:00:00Z,2026-03-02T22:40:00Z,2026-03-03T06:50:00Z,210,80,100,20,75,42,15.0`

describe('parseWhoopSleep', () => {
  it('returns empty array for empty input', () => {
    expect(parseWhoopSleep('')).toEqual({ nights: [] })
  })

  it('parses two nights from sample CSV', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights).toHaveLength(2)
  })

  it('maps stage durations correctly', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    const night1 = result.nights[0]
    expect(night1.lightMin).toBe(240)
    expect(night1.deepMin).toBe(95)
    expect(night1.remMin).toBe(110)
    expect(night1.awakeMin).toBe(15)
  })

  it('computes total sleep (light + deep + rem)', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].totalMin).toBe(445)  // 240 + 95 + 110
  })

  it('includes HRV and respiratory rate', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].avgHrv).toBe(48)
    expect(result.nights[0].avgBreath).toBe(14.2)
  })

  it('includes sleep score', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].sleepScore).toBe(82)
  })

  it('sets bedtime and wake time from onset columns', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].bedtime).toContain('2026-03-01')
    expect(result.nights[0].wakeTime).toContain('2026-03-02')
  })

  it('sets source as whoop', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights.every(n => n.source === 'whoop')).toBe(true)
  })

  it('handles missing optional fields gracefully', () => {
    const csv = `Cycle start time,Cycle end time,Sleep onset,Wake onset,Light sleep duration (min),SWS duration (min),REM duration (min),Awake duration (min),Sleep Score,HRV (ms),Respiratory Rate
2026-03-01T22:00:00Z,2026-03-02T06:00:00Z,2026-03-01T22:15:00Z,2026-03-02T05:50:00Z,200,70,90,10,,,`
    const result = parseWhoopSleep(csv)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].avgHrv).toBeUndefined()
    expect(result.nights[0].avgBreath).toBeUndefined()
  })

  it('generates unique IDs', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    const ids = result.nights.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/sleep-parsers/whoop.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// src/utils/sleep-parsers/whoop.ts
import { v4 as uuidv4 } from 'uuid'
import type { SleepNight } from '../../types/sleep'

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

function parseOptionalInt(val: string): number | undefined {
  if (!val) return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}

export function parseWhoopSleep(csv: string): { nights: SleepNight[] } {
  if (!csv.trim()) return { nights: [] }

  const rows = parseCsvRows(csv)

  const nights: SleepNight[] = rows.map(row => {
    const sleepOnset = row['Sleep onset'] ?? ''
    const wakeOnset = row['Wake onset'] ?? ''
    const date = sleepOnset.slice(0, 10)

    const lightMin = parseOptionalInt(row['Light sleep duration (min)'])
    const deepMin = parseOptionalInt(row['SWS duration (min)'])
    const remMin = parseOptionalInt(row['REM duration (min)'])
    const awakeMin = parseOptionalInt(row['Awake duration (min)'])
    const totalMin = (lightMin ?? 0) + (deepMin ?? 0) + (remMin ?? 0)

    return {
      id: uuidv4(),
      source: 'whoop' as const,
      sourceId: `whoop-${date}`,
      date,
      bedtime: sleepOnset,
      wakeTime: wakeOnset,
      totalMin: totalMin > 0 ? totalMin : undefined,
      deepMin,
      remMin,
      lightMin,
      awakeMin,
      sleepScore: parseOptionalInt(row['Sleep Score']),
      avgHrv: parseOptionalInt(row['HRV (ms)']),
      avgBreath: parseOptionalFloat(row['Respiratory Rate']),
      createdAt: Date.now(),
    }
  })

  return { nights }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/sleep-parsers/whoop.test.ts`
Expected: 10 tests PASS

**Step 5: Commit**

```bash
git add src/utils/sleep-parsers/whoop.ts src/utils/sleep-parsers/whoop.test.ts
git commit -m "feat(sleep): add Whoop CSV sleep parser"
```

---

### Task 7: Sleep Page — 5 Tabs (`src/pages/Sleep.tsx`)

**Files:**
- Create: `src/pages/Sleep.tsx`
- Modify: `src/App.tsx` — add route
- Modify: `src/components/Layout.tsx` — activate nav item

**Context:** Follow the exact tab pattern from `src/pages/Exercise.tsx`. Same Tailwind classes, same card/chart patterns, same Recharts setup. The page has 5 tabs: Overview, Trends, Analysis, Insights, Sources.

**Step 1: Create the Sleep page**

Create `src/pages/Sleep.tsx` with this structure:

```tsx
// src/pages/Sleep.tsx
import { useState, useEffect } from 'react'
import { Moon, TrendingUp, Brain, Lightbulb, Database, AlertTriangle, Check } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  getSleepNights, getFlaggedSleepConflicts, resolveSleepConflict,
  getSleepSettings, saveSleepSettings, importSleepNights,
} from '../utils/sleep-storage'
import { parseOuraSleep } from '../utils/sleep-parsers/oura'
import { parseAppleHealthSleep } from '../utils/sleep-parsers/apple-health'
import { parseWhoopSleep } from '../utils/sleep-parsers/whoop'
import { SLEEP_TARGETS, getSleepStatus } from '../data/sleep-targets'
import type { SleepNight, SleepSettings } from '../types/sleep'
import { v4 as uuidv4 } from 'uuid'

const BRAND = '#6366f1'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const RED = '#ef4444'

type Tab = 'overview' | 'trends' | 'analysis' | 'insights' | 'sources'

const STATUS_COLORS: Record<string, string> = { green: GREEN, amber: AMBER, red: RED }

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return `${d.getFullYear()}-W${String(1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)).padStart(2, '0')}`
}

function last7DaysAvg(nights: SleepNight[], field: keyof SleepNight): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const recent = nights.filter(n => n.date >= cutoffStr)
  if (recent.length === 0) return 0
  const sum = recent.reduce((s, n) => s + ((n[field] as number) ?? 0), 0)
  return Math.round((sum / recent.length) * 10) / 10
}

function minToHrs(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function Sleep() {
  const [tab, setTab] = useState<Tab>('overview')
  const [nights, setNights] = useState<SleepNight[]>([])
  const [conflicts, setConflicts] = useState<SleepNight[]>([])
  const [settings, setSettings] = useState<SleepSettings>(getSleepSettings())
  const [importing, setImporting] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState({ date: '', bedtime: '', wakeTime: '', quality: '3' })

  function reload() {
    setNights(getSleepNights())
    setConflicts(getFlaggedSleepConflicts())
    setSettings(getSleepSettings())
  }

  useEffect(() => { reload() }, [])

  async function handleFileImport(source: string, file: File) {
    setImporting(source)
    setImportError(null)
    setImportSuccess(null)
    try {
      let result: { nights: SleepNight[] }
      const text = await file.text()

      if (source === 'apple_health') {
        result = parseAppleHealthSleep(text)
      } else if (source === 'whoop') {
        result = parseWhoopSleep(text)
      } else {
        throw new Error('Unknown source')
      }

      importSleepNights(result.nights)
      setImportSuccess(`Imported ${result.nights.length} nights from ${source.replace('_', ' ')}`)
      reload()
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(null)
    }
  }

  function handleImportOura() {
    setImportError(null)
    setImportSuccess(null)
    const raw = localStorage.getItem('healthspan:ouraData')
    if (!raw) { setImportError('No Oura data found. Import Oura data from Settings first.'); return }
    const data = JSON.parse(raw)
    const result = parseOuraSleep(data)
    importSleepNights(result.nights)
    setImportSuccess(`Imported ${result.nights.length} nights from Oura`)
    reload()
  }

  function handleManualEntry() {
    if (!manualForm.date || !manualForm.bedtime || !manualForm.wakeTime) return
    const bedDt = new Date(`${manualForm.date}T${manualForm.bedtime}`)
    const wakeDt = new Date(`${manualForm.date}T${manualForm.wakeTime}`)
    // If wake time is before bedtime, it's the next day
    if (wakeDt <= bedDt) wakeDt.setDate(wakeDt.getDate() + 1)
    const totalMin = Math.round((wakeDt.getTime() - bedDt.getTime()) / 60000)

    const night: SleepNight = {
      id: uuidv4(),
      source: 'manual',
      sourceId: `manual-${manualForm.date}`,
      date: manualForm.date,
      bedtime: bedDt.toISOString(),
      wakeTime: wakeDt.toISOString(),
      totalMin,
      qualityRating: parseInt(manualForm.quality, 10),
      createdAt: Date.now(),
    }
    importSleepNights([night])
    setManualForm({ date: '', bedtime: '', wakeTime: '', quality: '3' })
    setImportSuccess('Manual sleep entry added')
    reload()
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'insights', label: 'Insights' },
    { id: 'sources', label: 'Sources' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Moon size={20} className="text-brand-400" />
        <h1 className="text-xl font-bold text-gray-100">Sleep</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/[0.06]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-brand-300 border-brand-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab nights={nights} />}
      {tab === 'trends' && <TrendsTab nights={nights} />}
      {tab === 'analysis' && <AnalysisTab nights={nights} />}
      {tab === 'insights' && <InsightsTab nights={nights} />}
      {tab === 'sources' && (
        <SourcesTab
          nights={nights}
          conflicts={conflicts}
          settings={settings}
          importing={importing}
          importError={importError}
          importSuccess={importSuccess}
          manualForm={manualForm}
          setManualForm={setManualForm}
          onFileImport={handleFileImport}
          onImportOura={handleImportOura}
          onManualEntry={handleManualEntry}
          onResolveConflict={(keepId, dropId) => { resolveSleepConflict(keepId, dropId); reload() }}
          onSaveSettings={(s) => { saveSleepSettings(s); setSettings(s) }}
        />
      )}
    </div>
  )
}
```

Then implement each tab component (`OverviewTab`, `TrendsTab`, `AnalysisTab`, `InsightsTab`, `SourcesTab`) following the same patterns as `Exercise.tsx`:

- **OverviewTab**: 4 compliance cards (total, deep, rem, efficiency) using `getSleepStatus()` for colors, sleep score area chart, weekly compliance count
- **TrendsTab**: Stacked bar chart (deep/rem/light/awake), HRV line, resting HR line, efficiency line, SpO2 line (if data exists)
- **AnalysisTab**: Bedtime consistency (min/max range display), sleep debt (7-day rolling deficit vs 480 min ideal), stage breakdown donut chart, circadian alignment metric
- **InsightsTab**: Target reference table (like VO2 Max tab), per-metric status with color and recommendation text, architecture summary
- **SourcesTab**: Import cards (Oura button, Apple Health XML upload, Whoop CSV upload, Manual form), priority config, conflict queue — same pattern as Exercise SourcesTab

**Step 2: Add the route to App.tsx**

In `src/App.tsx`, add:
```tsx
import Sleep from './pages/Sleep'
// ...
<Route path="/sleep" element={<Sleep />} />
```

**Step 3: Activate the nav item in Layout.tsx**

In `src/components/Layout.tsx`, change:
```tsx
{ to: '/sleep', icon: Moon, label: 'Sleep', active: false },
```
to:
```tsx
{ to: '/sleep', icon: Moon, label: 'Sleep', active: true },
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

**Step 6: Commit**

```bash
git add src/pages/Sleep.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(sleep): add Sleep page with 5 tabs, route, and nav"
```

---

### Task 8: Dashboard Integration — Sleep Status Card

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Context:** Add a Sleep status card to the Dashboard Overview stat strip, same pattern as the Exercise card at line ~222. The card shows 7-day avg total sleep vs 7 hr target, color-coded, links to `/sleep`.

**Step 1: Add import and compute sleep status**

At the top of `Dashboard.tsx`, add:
```tsx
import { getSleepNights } from '../utils/sleep-storage'
```

In the component, add a `useMemo` block for sleep status (similar to the exercise block at lines 45-66):
```tsx
const sleepNights = useMemo(() => getSleepNights(), [])
const avgTotalSleepMin = useMemo(() => {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const cutoff = weekAgo.toISOString().slice(0, 10)
  const recent = sleepNights.filter(n => n.date >= cutoff)
  if (recent.length === 0) return 0
  return Math.round(recent.reduce((s, n) => s + (n.totalMin ?? 0), 0) / recent.length)
}, [sleepNights])
const sleepHrs = (avgTotalSleepMin / 60).toFixed(1)
const sleepLabel = avgTotalSleepMin >= 420 ? 'On Track' : avgTotalSleepMin >= 360 ? 'Building' : 'Below Target'
const sleepColor = avgTotalSleepMin >= 420 ? '#10b981' : avgTotalSleepMin >= 360 ? '#f59e0b' : '#ef4444'
```

**Step 2: Add the card to the Overview stat strip**

After the Exercise card (around line 228), add:
```tsx
<Link to="/sleep" className="block">
  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
    <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Sleep</div>
    <div className="text-[24px] font-bold font-mono" style={{ color: sleepColor }}>{sleepLabel}</div>
    <div className="text-[11px] text-slate-500 mt-1">{sleepHrs}/7 hrs avg this week · {sleepNights.length} nights</div>
  </div>
</Link>
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(sleep): add Sleep status card to Dashboard"
```

---

### Task 9: Full Test Suite & Final Verification

**Files:** None new — verification only

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (existing 96 + new sleep tests)

**Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Production build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Update tasks/todo.md**

Update `tasks/todo.md` with all completed sleep tasks and commit SHAs.

**Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(sleep): address test/build issues from final verification"
```
