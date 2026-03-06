# Nutrition Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Nutrition tracking panel with per-meal macro logging, Attia longevity protein targets, and daily macro compliance tracking.

**Architecture:** Mirror Exercise/Sleep/Emotional pattern — localStorage-backed flat meal entries, 5-tab page, Dashboard card. Manual-only source. Per-meal logging with computed daily totals. User-configurable protein and calorie targets via NutritionSettings.

**Tech Stack:** React 18, TypeScript, Vitest, Recharts

---

### Task 1: NutritionEntry Type & Tests

**Files:**
- Create: `src/types/nutrition.ts`
- Create: `src/types/nutrition.test.ts`

**Step 1: Write the failing test**

Create `src/types/nutrition.test.ts`:

```typescript
import type { NutritionEntry, NutritionSource, MealType, NutritionSettings } from './nutrition'
import { DEFAULT_NUTRITION_SETTINGS } from './nutrition'

describe('Nutrition types', () => {
  it('NutritionEntry fields compile correctly', () => {
    const entry: NutritionEntry = {
      id: 'test',
      source: 'manual',
      date: '2026-03-01',
      mealType: 'lunch',
      mealName: 'Grilled chicken salad',
      calories: 550,
      proteinG: 45,
      carbsG: 30,
      fatG: 20,
      fiberG: 8,
      createdAt: Date.now(),
    }
    expect(entry.source).toBe('manual')
    expect(entry.mealType).toBe('lunch')
    expect(entry.proteinG).toBe(45)
  })

  it('MealType covers all meal types', () => {
    const types: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
    expect(types).toHaveLength(4)
  })

  it('optional fields are truly optional', () => {
    const entry: NutritionEntry = {
      id: 'minimal',
      source: 'manual',
      date: '2026-03-01',
      mealType: 'snack',
      createdAt: Date.now(),
    }
    expect(entry.calories).toBeUndefined()
    expect(entry.mealName).toBeUndefined()
    expect(entry.proteinG).toBeUndefined()
  })

  it('DEFAULT_NUTRITION_SETTINGS has correct defaults', () => {
    expect(DEFAULT_NUTRITION_SETTINGS.bodyweightLbs).toBe(170)
    expect(DEFAULT_NUTRITION_SETTINGS.dailyCalorieTarget).toBe(2200)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/nutrition.test.ts`
Expected: FAIL — cannot find module `./nutrition`

**Step 3: Write minimal implementation**

Create `src/types/nutrition.ts`:

```typescript
export type NutritionSource = 'manual'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface NutritionEntry {
  id: string
  source: NutritionSource
  date: string                    // YYYY-MM-DD
  mealType: MealType
  mealName?: string               // e.g. "Grilled chicken salad"

  // Macros
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  fiberG?: number

  createdAt: number
}

export interface NutritionSettings {
  bodyweightLbs: number           // for protein target: 1g/lb
  dailyCalorieTarget: number      // user-set goal
}

export const DEFAULT_NUTRITION_SETTINGS: NutritionSettings = {
  bodyweightLbs: 170,
  dailyCalorieTarget: 2200,
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/nutrition.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/types/nutrition.ts src/types/nutrition.test.ts
git commit -m "feat(nutrition): add NutritionEntry type and tests"
```

---

### Task 2: Nutrition Targets & Status Function

**Files:**
- Create: `src/data/nutrition-targets.ts`
- Create: `src/data/nutrition-targets.test.ts`

**Reference:** `src/data/emotional-targets.ts` — same pattern but with dynamic thresholds for protein and calories.

**Note:** Nutrition targets differ from other panels because protein and calorie targets depend on user settings (bodyweight, calorie goal). The status function accepts settings as a parameter.

**Step 1: Write the failing test**

Create `src/data/nutrition-targets.test.ts`:

```typescript
import { getNutritionStatus, getProteinTarget, getCalorieRange } from './nutrition-targets'
import type { NutritionSettings } from '../types/nutrition'

const settings: NutritionSettings = { bodyweightLbs: 170, dailyCalorieTarget: 2200 }

describe('getProteinTarget', () => {
  it('returns 1g per lb bodyweight', () => {
    expect(getProteinTarget(settings)).toBe(170)
  })

  it('adjusts for different bodyweight', () => {
    expect(getProteinTarget({ ...settings, bodyweightLbs: 200 })).toBe(200)
  })
})

describe('getCalorieRange', () => {
  it('returns ±10% for green, ±20% for amber', () => {
    const range = getCalorieRange(settings)
    expect(range.greenMin).toBe(1980)   // 2200 * 0.9
    expect(range.greenMax).toBe(2420)   // 2200 * 1.1
    expect(range.amberMin).toBe(1760)   // 2200 * 0.8
    expect(range.amberMax).toBe(2640)   // 2200 * 1.2
  })
})

describe('getNutritionStatus', () => {
  // Protein: higher is better, target = bodyweight in lbs
  it('returns green for protein >= 1g/lb', () => {
    expect(getNutritionStatus('protein', 170, settings)).toBe('green')
    expect(getNutritionStatus('protein', 200, settings)).toBe('green')
  })

  it('returns amber for protein >= 0.7g/lb but < 1g/lb', () => {
    expect(getNutritionStatus('protein', 140, settings)).toBe('amber')  // 140/170 = 0.82
    expect(getNutritionStatus('protein', 119, settings)).toBe('amber')  // 119/170 = 0.7
  })

  it('returns red for protein < 0.7g/lb', () => {
    expect(getNutritionStatus('protein', 100, settings)).toBe('red')    // 100/170 = 0.59
  })

  // Calories: within range of target
  it('returns green for calories within ±10%', () => {
    expect(getNutritionStatus('calories', 2200, settings)).toBe('green')
    expect(getNutritionStatus('calories', 2000, settings)).toBe('green')
    expect(getNutritionStatus('calories', 2400, settings)).toBe('green')
  })

  it('returns amber for calories within ±20% but outside ±10%', () => {
    expect(getNutritionStatus('calories', 1800, settings)).toBe('amber')
    expect(getNutritionStatus('calories', 2600, settings)).toBe('amber')
  })

  it('returns red for calories outside ±20%', () => {
    expect(getNutritionStatus('calories', 1500, settings)).toBe('red')
    expect(getNutritionStatus('calories', 3000, settings)).toBe('red')
  })

  // Fiber: fixed target, higher is better
  it('returns green for fiber >= 30g', () => {
    expect(getNutritionStatus('fiber', 35, settings)).toBe('green')
    expect(getNutritionStatus('fiber', 30, settings)).toBe('green')
  })

  it('returns amber for fiber >= 20g but < 30g', () => {
    expect(getNutritionStatus('fiber', 25, settings)).toBe('amber')
    expect(getNutritionStatus('fiber', 20, settings)).toBe('amber')
  })

  it('returns red for fiber < 20g', () => {
    expect(getNutritionStatus('fiber', 15, settings)).toBe('red')
  })

  it('returns red for unknown metric', () => {
    expect(getNutritionStatus('unknown', 100, settings)).toBe('red')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/nutrition-targets.test.ts`
Expected: FAIL — cannot find module `./nutrition-targets`

**Step 3: Write minimal implementation**

Create `src/data/nutrition-targets.ts`:

```typescript
import type { NutritionSettings } from '../types/nutrition'

export type NutritionStatus = 'green' | 'amber' | 'red'

export function getProteinTarget(settings: NutritionSettings): number {
  return settings.bodyweightLbs
}

export function getCalorieRange(settings: NutritionSettings): {
  greenMin: number; greenMax: number; amberMin: number; amberMax: number
} {
  const target = settings.dailyCalorieTarget
  return {
    greenMin: Math.round(target * 0.9),
    greenMax: Math.round(target * 1.1),
    amberMin: Math.round(target * 0.8),
    amberMax: Math.round(target * 1.2),
  }
}

export function getNutritionStatus(
  metricId: string,
  value: number,
  settings: NutritionSettings,
): NutritionStatus {
  if (metricId === 'protein') {
    const target = getProteinTarget(settings)
    if (value >= target) return 'green'
    if (value >= target * 0.7) return 'amber'
    return 'red'
  }

  if (metricId === 'calories') {
    const range = getCalorieRange(settings)
    if (value >= range.greenMin && value <= range.greenMax) return 'green'
    if (value >= range.amberMin && value <= range.amberMax) return 'amber'
    return 'red'
  }

  if (metricId === 'fiber') {
    if (value >= 30) return 'green'
    if (value >= 20) return 'amber'
    return 'red'
  }

  return 'red'
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/nutrition-targets.test.ts`
Expected: PASS (13 tests)

**Step 5: Commit**

```bash
git add src/data/nutrition-targets.ts src/data/nutrition-targets.test.ts
git commit -m "feat(nutrition): add nutrition targets with dynamic protein/calorie thresholds"
```

---

### Task 3: Nutrition Storage (localStorage CRUD + Daily Totals)

**Files:**
- Create: `src/utils/nutrition-storage.ts`
- Create: `src/utils/nutrition-storage.test.ts`

**Reference:** `src/utils/emotional-storage.ts` — same readJson pattern but no upsert-by-date (multiple meals per day). Adds getDailyTotals aggregation and settings CRUD.

**Step 1: Write the failing test**

Create `src/utils/nutrition-storage.test.ts`:

```typescript
import {
  getNutritionEntries,
  saveNutritionEntry,
  deleteNutritionEntry,
  getEntriesByDate,
  getDailyTotals,
  getNutritionSettings,
  saveNutritionSettings,
} from './nutrition-storage'
import type { NutritionEntry } from '../types/nutrition'

const makeEntry = (overrides: Partial<NutritionEntry> = {}): NutritionEntry => ({
  id: 'e1',
  source: 'manual',
  date: '2026-03-01',
  mealType: 'lunch',
  calories: 500,
  proteinG: 40,
  carbsG: 50,
  fatG: 15,
  fiberG: 8,
  createdAt: Date.now(),
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('getNutritionEntries', () => {
  it('returns empty array when nothing stored', () => {
    expect(getNutritionEntries()).toEqual([])
  })

  it('filters by date range', () => {
    saveNutritionEntry(makeEntry({ id: 'old', date: '2026-01-01' }))
    saveNutritionEntry(makeEntry({ id: 'new', date: '2026-03-01' }))
    const filtered = getNutritionEntries({ from: '2026-02-01', to: '2026-04-01' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('new')
  })
})

describe('saveNutritionEntry', () => {
  it('saves a new entry', () => {
    saveNutritionEntry(makeEntry())
    expect(getNutritionEntries()).toHaveLength(1)
  })

  it('allows multiple entries for the same date (different meals)', () => {
    saveNutritionEntry(makeEntry({ id: 'a', mealType: 'breakfast' }))
    saveNutritionEntry(makeEntry({ id: 'b', mealType: 'lunch' }))
    saveNutritionEntry(makeEntry({ id: 'c', mealType: 'dinner' }))
    expect(getNutritionEntries()).toHaveLength(3)
  })

  it('updates existing entry when same id', () => {
    saveNutritionEntry(makeEntry({ id: 'a', calories: 500 }))
    saveNutritionEntry(makeEntry({ id: 'a', calories: 600 }))
    const entries = getNutritionEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].calories).toBe(600)
  })
})

describe('deleteNutritionEntry', () => {
  it('removes entry by id', () => {
    saveNutritionEntry(makeEntry({ id: 'a' }))
    saveNutritionEntry(makeEntry({ id: 'b', mealType: 'dinner' }))
    deleteNutritionEntry('a')
    expect(getNutritionEntries()).toHaveLength(1)
    expect(getNutritionEntries()[0].id).toBe('b')
  })

  it('is a no-op for non-existent id', () => {
    saveNutritionEntry(makeEntry())
    deleteNutritionEntry('nonexistent')
    expect(getNutritionEntries()).toHaveLength(1)
  })
})

describe('getEntriesByDate', () => {
  it('returns all meals for a given date', () => {
    saveNutritionEntry(makeEntry({ id: 'a', date: '2026-03-01', mealType: 'breakfast' }))
    saveNutritionEntry(makeEntry({ id: 'b', date: '2026-03-01', mealType: 'lunch' }))
    saveNutritionEntry(makeEntry({ id: 'c', date: '2026-03-02', mealType: 'breakfast' }))
    expect(getEntriesByDate('2026-03-01')).toHaveLength(2)
  })

  it('returns empty array when no meals for date', () => {
    expect(getEntriesByDate('2026-03-01')).toEqual([])
  })
})

describe('getDailyTotals', () => {
  it('sums macros across all meals for a date', () => {
    saveNutritionEntry(makeEntry({ id: 'a', date: '2026-03-01', calories: 500, proteinG: 40, carbsG: 50, fatG: 15, fiberG: 8 }))
    saveNutritionEntry(makeEntry({ id: 'b', date: '2026-03-01', calories: 700, proteinG: 50, carbsG: 60, fatG: 25, fiberG: 10 }))
    const totals = getDailyTotals('2026-03-01')
    expect(totals.calories).toBe(1200)
    expect(totals.proteinG).toBe(90)
    expect(totals.carbsG).toBe(110)
    expect(totals.fatG).toBe(40)
    expect(totals.fiberG).toBe(18)
  })

  it('returns zeros when no meals for date', () => {
    const totals = getDailyTotals('2026-03-01')
    expect(totals.calories).toBe(0)
    expect(totals.proteinG).toBe(0)
  })

  it('handles missing optional macro fields', () => {
    saveNutritionEntry(makeEntry({ id: 'a', date: '2026-03-01', calories: 500, proteinG: undefined, carbsG: undefined, fatG: undefined, fiberG: undefined }))
    const totals = getDailyTotals('2026-03-01')
    expect(totals.calories).toBe(500)
    expect(totals.proteinG).toBe(0)
  })
})

describe('NutritionSettings', () => {
  it('returns default settings when none stored', () => {
    const s = getNutritionSettings()
    expect(s.bodyweightLbs).toBe(170)
    expect(s.dailyCalorieTarget).toBe(2200)
  })

  it('saves and retrieves settings', () => {
    saveNutritionSettings({ bodyweightLbs: 200, dailyCalorieTarget: 2500 })
    const s = getNutritionSettings()
    expect(s.bodyweightLbs).toBe(200)
    expect(s.dailyCalorieTarget).toBe(2500)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/nutrition-storage.test.ts`
Expected: FAIL — cannot find module `./nutrition-storage`

**Step 3: Write minimal implementation**

Create `src/utils/nutrition-storage.ts`:

```typescript
import type { NutritionEntry, NutritionSettings } from '../types/nutrition'
import { DEFAULT_NUTRITION_SETTINGS } from '../types/nutrition'

const KEYS = {
  entries: 'healthspan:nutrition:entries',
  settings: 'healthspan:nutrition:settings',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export interface NutritionFilters {
  from?: string
  to?: string
}

function getAllEntriesRaw(): NutritionEntry[] {
  return readJson<NutritionEntry[]>(KEYS.entries, [])
}

function saveAll(entries: NutritionEntry[]): void {
  localStorage.setItem(KEYS.entries, JSON.stringify(entries))
}

export function getNutritionEntries(filters: NutritionFilters = {}): NutritionEntry[] {
  let list = getAllEntriesRaw()
  if (filters.from) list = list.filter(e => e.date >= filters.from!)
  if (filters.to) list = list.filter(e => e.date <= filters.to!)
  return list
}

export function saveNutritionEntry(entry: NutritionEntry): void {
  const all = getAllEntriesRaw().filter(e => e.id !== entry.id)
  all.push(entry)
  saveAll(all)
}

export function deleteNutritionEntry(id: string): void {
  const all = getAllEntriesRaw().filter(e => e.id !== id)
  saveAll(all)
}

export function getEntriesByDate(date: string): NutritionEntry[] {
  return getAllEntriesRaw().filter(e => e.date === date)
}

export interface DailyTotals {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
}

export function getDailyTotals(date: string): DailyTotals {
  const meals = getEntriesByDate(date)
  return {
    calories: meals.reduce((s, m) => s + (m.calories ?? 0), 0),
    proteinG: meals.reduce((s, m) => s + (m.proteinG ?? 0), 0),
    carbsG: meals.reduce((s, m) => s + (m.carbsG ?? 0), 0),
    fatG: meals.reduce((s, m) => s + (m.fatG ?? 0), 0),
    fiberG: meals.reduce((s, m) => s + (m.fiberG ?? 0), 0),
  }
}

export function getNutritionSettings(): NutritionSettings {
  return readJson<NutritionSettings>(KEYS.settings, DEFAULT_NUTRITION_SETTINGS)
}

export function saveNutritionSettings(settings: NutritionSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/nutrition-storage.test.ts`
Expected: PASS (14 tests)

**Step 5: Commit**

```bash
git add src/utils/nutrition-storage.ts src/utils/nutrition-storage.test.ts
git commit -m "feat(nutrition): add nutrition storage with daily totals and settings"
```

---

### Task 4: Nutrition Page (5 Tabs)

**Files:**
- Create: `src/pages/Nutrition.tsx`
- Modify: `src/App.tsx` — add import and route
- Modify: `src/components/Layout.tsx` — set `active: true`

**Reference:** `src/pages/Emotional.tsx` for tab structure, chart patterns, styling constants.

**Step 1: Create the Nutrition page**

Create `src/pages/Nutrition.tsx` with full 5-tab implementation:

- Import from: `react`, `lucide-react` (Apple icon), `recharts`, `../utils/nutrition-storage`, `../data/nutrition-targets`, `../types/nutrition`, `uuid`
- Color constants: BRAND, AMBER, GREEN, RED, STATUS_COLORS (same as other panels)
- Chart helpers: grid, xax, yax (same as other panels, but yax without fixed domain)
- State: tab, entries, settings, form fields (date, mealType, mealName, calories, proteinG, carbsG, fatG, fiberG, editingId)

**Overview tab:**
- Today's meal log (list of meals for today with macros, mealType badges)
- Add meal button that switches to Sources tab
- Daily macro progress bars (calories/protein/carbs/fat/fiber vs targets from settings)
- Protein compliance card: 7-day avg protein vs target (1g/lb), color-coded
- Calorie trend area chart (30 days with target reference line)

**Trends tab:**
- Daily calorie line chart (30 days) with target reference line
- Protein intake line chart (30 days) with target reference line
- Macro breakdown stacked bar chart (proteinG/carbsG/fatG per day)
- Fiber trend line (30 days) with 30g target reference

**Analysis tab:**
- Macro ratio summary (avg protein/carbs/fat percentage)
- Meal timing patterns: calories by mealType (bar chart)
- Protein consistency (std dev over 30 days)
- Best/worst compliance days

**Insights tab:**
- Nutrition target table showing protein target (based on bodyweight), calorie range, fiber target, with current 7-day avg and status
- Per-metric recommendations when amber/red
- Disclaimer

**Sources tab:**
- Meal entry form: date input, mealType select (breakfast/lunch/dinner/snack), mealName text input, number inputs for calories/protein/carbs/fat/fiber
- Save/Update/Cancel buttons
- Meal history list (last 30 entries, newest first) with mealType badge, macros, edit/delete
- Nutrition settings section: bodyweight (lbs) and daily calorie target inputs with save button
- Future placeholder: disabled MFP/Cronometer import buttons

Compute daily totals for chart data by iterating unique dates and calling getDailyTotals for each. Use `useMemo` for performance.

**Step 2: Add route and activate nav**

Modify `src/App.tsx`:
```typescript
import Nutrition from './pages/Nutrition'
```
Add route: `<Route path="/nutrition" element={<Nutrition />} />`

Modify `src/components/Layout.tsx`:
```typescript
{ to: '/nutrition', icon: Apple, label: 'Nutrition', active: true },
```

**Step 3: Run TypeScript check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, all tests pass

**Step 4: Commit**

```bash
git add src/pages/Nutrition.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(nutrition): add Nutrition page with 5 tabs, route and nav"
```

---

### Task 5: Dashboard Integration

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Reference:** Lines 85-98 (emotional status pattern), lines 268-274 (emotional card).

**Step 1: Add nutrition status computation**

Add import:
```typescript
import { getNutritionEntries, getDailyTotals, getNutritionSettings } from '../utils/nutrition-storage'
import { getNutritionStatus, getProteinTarget } from '../data/nutrition-targets'
```

After the emotional status block, add:
```typescript
// Nutrition status
const nutritionEntries = useMemo(() => getNutritionEntries(), [])
const nutritionSettings = useMemo(() => getNutritionSettings(), [])
const avgProtein = useMemo(() => {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const cutoff = weekAgo.toISOString().slice(0, 10)
  const dates = [...new Set(nutritionEntries.filter(e => e.date >= cutoff).map(e => e.date))]
  if (dates.length === 0) return 0
  const totalProtein = dates.reduce((s, d) => s + getDailyTotals(d).proteinG, 0)
  return Math.round(totalProtein / dates.length)
}, [nutritionEntries])
const proteinTarget = getProteinTarget(nutritionSettings)
const nutritionLabel = avgProtein >= proteinTarget ? 'On Track' : avgProtein >= proteinTarget * 0.7 ? 'Building' : avgProtein > 0 ? 'Below Target' : 'No Data'
const nutritionColor = avgProtein >= proteinTarget ? '#10b981' : avgProtein >= proteinTarget * 0.7 ? '#f59e0b' : '#ef4444'
```

**Step 2: Add status card after emotional card**

```tsx
<Link to="/nutrition" className="block">
  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
    <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Nutrition</div>
    <div className="text-[24px] font-bold font-mono" style={{ color: nutritionColor }}>{nutritionLabel}</div>
    <div className="text-[11px] text-slate-500 mt-1">{avgProtein > 0 ? `${avgProtein}/${proteinTarget}g protein avg` : 'Start logging'} · {nutritionEntries.length} meals</div>
  </div>
</Link>
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(nutrition): add Nutrition status card to Dashboard"
```

---

### Task 6: Final Verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All test files pass, 0 failures

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify file count**

New files created:
- `src/types/nutrition.ts`
- `src/types/nutrition.test.ts`
- `src/data/nutrition-targets.ts`
- `src/data/nutrition-targets.test.ts`
- `src/utils/nutrition-storage.ts`
- `src/utils/nutrition-storage.test.ts`
- `src/pages/Nutrition.tsx`

Modified files:
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/pages/Dashboard.tsx`
