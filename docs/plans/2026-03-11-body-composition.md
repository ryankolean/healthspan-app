# Body Composition & BMI Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track weight and body composition over time with BMI, displayed as dashboard cards with standard + longevity health ranges, and unify weight as a single source of truth.

**Architecture:** New `BodyCompEntry` type stored in localStorage. Storage utilities follow existing patterns (e.g., `nutrition-storage.ts`). Health ranges defined in a data file (like `vo2max-targets.ts`). Dashboard gets a new "Body" section with 4 metric cards + inline log form. Nutrition page reads weight from body comp storage instead of its own settings. Demo data generator produces ~90 days of persona-specific body comp entries.

**Tech Stack:** React 18, TypeScript 5.6, Tailwind CSS 3.4, Vitest + jsdom, localStorage

**Design doc:** `docs/plans/2026-03-11-body-composition-design.md`

---

### Task 1: Body Composition Types + Storage

Create the type definitions and localStorage storage module.

**Files:**
- Create: `src/types/body-composition.ts`
- Create: `src/utils/body-composition-storage.ts`
- Create: `src/utils/body-composition-storage.test.ts`

**Step 1: Write the types file**

Create `src/types/body-composition.ts`:

```typescript
export interface BodyCompEntry {
  id: string
  date: string           // YYYY-MM-DD
  weightKg: number
  bodyFatPct?: number
  leanMassKg?: number    // auto-calculated: weightKg * (1 - bodyFatPct/100)
  waistCm?: number
  note?: string
}
```

**Step 2: Write failing tests for storage**

Create `src/utils/body-composition-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getBodyCompEntries,
  saveBodyCompEntry,
  deleteBodyCompEntry,
  getLatestEntry,
  getCurrentWeightKg,
  calculateBMI,
} from './body-composition-storage'
import type { BodyCompEntry } from '../types/body-composition'

beforeEach(() => localStorage.clear())

describe('body-composition-storage', () => {
  const entry: BodyCompEntry = {
    id: 'test-1',
    date: '2026-03-10',
    weightKg: 80,
  }

  it('returns empty array when no entries exist', () => {
    expect(getBodyCompEntries()).toEqual([])
  })

  it('saves and retrieves an entry', () => {
    saveBodyCompEntry(entry)
    const entries = getBodyCompEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual(entry)
  })

  it('auto-calculates leanMassKg when bodyFatPct provided', () => {
    saveBodyCompEntry({ ...entry, bodyFatPct: 20 })
    const saved = getBodyCompEntries()[0]
    expect(saved.leanMassKg).toBe(64) // 80 * 0.8
  })

  it('does not set leanMassKg when bodyFatPct not provided', () => {
    saveBodyCompEntry(entry)
    expect(getBodyCompEntries()[0].leanMassKg).toBeUndefined()
  })

  it('replaces entry with same id', () => {
    saveBodyCompEntry(entry)
    saveBodyCompEntry({ ...entry, weightKg: 82 })
    const entries = getBodyCompEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].weightKg).toBe(82)
  })

  it('deletes an entry by id', () => {
    saveBodyCompEntry(entry)
    deleteBodyCompEntry('test-1')
    expect(getBodyCompEntries()).toEqual([])
  })

  it('returns entries sorted by date descending', () => {
    saveBodyCompEntry({ ...entry, id: 'a', date: '2026-03-08' })
    saveBodyCompEntry({ ...entry, id: 'b', date: '2026-03-10' })
    saveBodyCompEntry({ ...entry, id: 'c', date: '2026-03-09' })
    const entries = getBodyCompEntries()
    expect(entries.map(e => e.date)).toEqual(['2026-03-10', '2026-03-09', '2026-03-08'])
  })
})

describe('getLatestEntry', () => {
  it('returns null when no entries', () => {
    expect(getLatestEntry()).toBeNull()
  })

  it('returns the most recent entry by date', () => {
    saveBodyCompEntry({ id: 'old', date: '2026-03-01', weightKg: 78 })
    saveBodyCompEntry({ id: 'new', date: '2026-03-10', weightKg: 80 })
    expect(getLatestEntry()?.id).toBe('new')
  })
})

describe('getCurrentWeightKg', () => {
  it('returns latest body comp weight when entries exist', () => {
    saveBodyCompEntry({ id: '1', date: '2026-03-10', weightKg: 82 })
    expect(getCurrentWeightKg()).toBe(82)
  })

  it('falls back to profile weight when no entries', () => {
    localStorage.setItem('healthspan:userWeight', '75')
    expect(getCurrentWeightKg()).toBe(75)
  })

  it('returns null when nothing available', () => {
    expect(getCurrentWeightKg()).toBeNull()
  })
})

describe('calculateBMI', () => {
  it('calculates BMI from weight and height', () => {
    // 80kg, 180cm -> 80 / (1.8^2) = 24.69
    expect(calculateBMI(80, 180)).toBeCloseTo(24.69, 1)
  })

  it('returns null for invalid inputs', () => {
    expect(calculateBMI(80, 0)).toBeNull()
    expect(calculateBMI(0, 180)).toBeNull()
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run src/utils/body-composition-storage.test.ts`
Expected: FAIL — module not found

**Step 4: Implement body-composition-storage.ts**

Create `src/utils/body-composition-storage.ts`:

```typescript
import type { BodyCompEntry } from '../types/body-composition'

const STORAGE_KEY = 'healthspan:bodycomp:entries'

function readEntries(): BodyCompEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeEntries(entries: BodyCompEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function getBodyCompEntries(): BodyCompEntry[] {
  return readEntries().sort((a, b) => b.date.localeCompare(a.date))
}

export function saveBodyCompEntry(entry: BodyCompEntry): void {
  const enriched = { ...entry }
  if (enriched.bodyFatPct != null) {
    enriched.leanMassKg = Math.round(enriched.weightKg * (1 - enriched.bodyFatPct / 100) * 100) / 100
  }
  const all = readEntries().filter(e => e.id !== enriched.id)
  all.push(enriched)
  writeEntries(all)
}

export function deleteBodyCompEntry(id: string): void {
  writeEntries(readEntries().filter(e => e.id !== id))
}

export function getLatestEntry(): BodyCompEntry | null {
  const entries = getBodyCompEntries()
  return entries.length > 0 ? entries[0] : null
}

export function getCurrentWeightKg(): number | null {
  const latest = getLatestEntry()
  if (latest) return latest.weightKg
  const profileWeight = localStorage.getItem('healthspan:userWeight')
  if (profileWeight) return Number(profileWeight)
  return null
}

export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/body-composition-storage.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/types/body-composition.ts src/utils/body-composition-storage.ts src/utils/body-composition-storage.test.ts
git commit -m "feat(body-comp): add types and storage module"
```

---

### Task 2: Health Ranges + Target Data

Create the data file defining BMI and body fat % health ranges with both standard and longevity thresholds.

**Files:**
- Create: `src/data/body-composition-targets.ts`
- Create: `src/data/body-composition-targets.test.ts`

**Step 1: Write failing tests**

Create `src/data/body-composition-targets.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getBMIStatus, getBodyFatStatus } from './body-composition-targets'

describe('getBMIStatus', () => {
  it('returns underweight for BMI < 18.5', () => {
    const s = getBMIStatus(17)
    expect(s.standard).toBe('underweight')
    expect(s.color).toBe('red')
  })

  it('returns normal for BMI 18.5-24.9', () => {
    const s = getBMIStatus(22)
    expect(s.standard).toBe('normal')
  })

  it('returns longevity optimal for BMI 20-23', () => {
    const s = getBMIStatus(21.5)
    expect(s.longevityOptimal).toBe(true)
    expect(s.color).toBe('green')
  })

  it('returns normal but not longevity optimal for BMI 24', () => {
    const s = getBMIStatus(24)
    expect(s.standard).toBe('normal')
    expect(s.longevityOptimal).toBe(false)
    expect(s.color).toBe('yellow')
  })

  it('returns overweight for BMI 25-29.9', () => {
    const s = getBMIStatus(27)
    expect(s.standard).toBe('overweight')
    expect(s.color).toBe('yellow')
  })

  it('returns obese for BMI >= 30', () => {
    const s = getBMIStatus(32)
    expect(s.standard).toBe('obese')
    expect(s.color).toBe('red')
  })
})

describe('getBodyFatStatus', () => {
  it('returns athletic for 10% male', () => {
    const s = getBodyFatStatus(10, 'male')
    expect(s.standard).toBe('athletic')
  })

  it('returns fitness + longevity optimal for 14% male', () => {
    const s = getBodyFatStatus(14, 'male')
    expect(s.standard).toBe('fitness')
    expect(s.longevityOptimal).toBe(true)
    expect(s.color).toBe('green')
  })

  it('returns acceptable for 20% male', () => {
    const s = getBodyFatStatus(20, 'male')
    expect(s.standard).toBe('acceptable')
    expect(s.color).toBe('yellow')
  })

  it('returns excess for 26% male', () => {
    const s = getBodyFatStatus(26, 'male')
    expect(s.standard).toBe('excess')
    expect(s.color).toBe('red')
  })

  it('uses female ranges when sex is female', () => {
    const s = getBodyFatStatus(22, 'female')
    expect(s.standard).toBe('fitness')
    expect(s.longevityOptimal).toBe(true)
  })

  it('returns excess for 33% female', () => {
    const s = getBodyFatStatus(33, 'female')
    expect(s.standard).toBe('excess')
    expect(s.color).toBe('red')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/body-composition-targets.test.ts`
Expected: FAIL — module not found

**Step 3: Implement body-composition-targets.ts**

Create `src/data/body-composition-targets.ts`:

```typescript
export interface BMIStatus {
  value: number
  standard: 'underweight' | 'normal' | 'overweight' | 'obese'
  longevityOptimal: boolean
  color: 'green' | 'yellow' | 'red'
}

export interface BodyFatStatus {
  value: number
  standard: 'essential' | 'athletic' | 'fitness' | 'acceptable' | 'excess'
  longevityOptimal: boolean
  color: 'green' | 'yellow' | 'red'
}

export function getBMIStatus(bmi: number): BMIStatus {
  const longevityOptimal = bmi >= 20 && bmi <= 23

  let standard: BMIStatus['standard']
  if (bmi < 18.5) standard = 'underweight'
  else if (bmi < 25) standard = 'normal'
  else if (bmi < 30) standard = 'overweight'
  else standard = 'obese'

  let color: BMIStatus['color']
  if (longevityOptimal) color = 'green'
  else if (standard === 'normal' || standard === 'overweight') color = 'yellow'
  else color = 'red'

  return { value: bmi, standard, longevityOptimal, color }
}

const BODY_FAT_RANGES = {
  male: {
    essential: [2, 5],
    athletic: [6, 13],
    fitness: [14, 17],
    acceptable: [18, 24],
    longevity: [10, 15],
  },
  female: {
    essential: [10, 13],
    athletic: [14, 20],
    fitness: [21, 24],
    acceptable: [25, 31],
    longevity: [18, 23],
  },
} as const

export function getBodyFatStatus(pct: number, sex: 'male' | 'female'): BodyFatStatus {
  const ranges = BODY_FAT_RANGES[sex]
  const longevityOptimal = pct >= ranges.longevity[0] && pct <= ranges.longevity[1]

  let standard: BodyFatStatus['standard']
  if (pct <= ranges.essential[1]) standard = 'essential'
  else if (pct <= ranges.athletic[1]) standard = 'athletic'
  else if (pct <= ranges.fitness[1]) standard = 'fitness'
  else if (pct <= ranges.acceptable[1]) standard = 'acceptable'
  else standard = 'excess'

  let color: BodyFatStatus['color']
  if (longevityOptimal) color = 'green'
  else if (standard === 'essential' || standard === 'excess') color = 'red'
  else color = 'yellow'

  return { value: pct, standard, longevityOptimal, color }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/body-composition-targets.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/data/body-composition-targets.ts src/data/body-composition-targets.test.ts
git commit -m "feat(body-comp): add BMI and body fat health ranges"
```

---

### Task 3: Dashboard Body Section

Add the "Body" metric cards and inline log form to the Dashboard.

**Files:**
- Modify: `src/pages/Dashboard.tsx` (add Body section)

**Step 1: Understand the Dashboard structure**

The Dashboard currently has tabs: `['Today', 'Trends', 'Overview', 'Sleep', 'Activity', 'Heart', 'Readiness', 'Resilience']`. The "Today" tab shows an actions checklist and metric cards organized by `METRIC_CATEGORIES`. The other tabs show charts.

The body comp section should be added to the "Today" tab after the existing metric sections. It uses the same card styling as existing sections.

**Step 2: Add imports**

At the top of `src/pages/Dashboard.tsx`, add:

```typescript
import { getBodyCompEntries, getLatestEntry, getCurrentWeightKg, calculateBMI, saveBodyCompEntry } from '../utils/body-composition-storage'
import { getBMIStatus, getBodyFatStatus } from '../data/body-composition-targets'
import { getEffectiveReferenceRange } from '../utils/profile-storage'
import { Scale } from 'lucide-react'
import type { BodyCompEntry } from '../types/body-composition'
```

**Step 3: Create a BodySection component**

Inside `Dashboard.tsx`, add a `BodySection` component that renders:

1. **Header row**: "Body" title with Scale icon, plus a "+ Log" button to toggle the form
2. **4 metric cards** in a 2x2 grid:
   - Weight: latest weightKg (converted to lbs if preferred), 7-day delta with arrow
   - BMI: calculated from latest weight + `healthspan:userHeight`, color-coded badge
   - Body Fat %: latest bodyFatPct if available, color-coded badge, "—" if none
   - Lean Mass: calculated leanMassKg if available, "—" if none
3. **Inline log form** (conditionally shown when "+ Log" is clicked):
   - Weight input (required) with unit toggle (kg/lbs)
   - Body Fat % input (optional)
   - Waist input (optional) with unit toggle (cm/in)
   - Note input (optional)
   - Save button (generates UUID id, today's date, calls `saveBodyCompEntry`)

Card styling should match the existing metric card pattern in the Dashboard:
- `bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4`
- Value in large text, label in small gray text, status badge color-coded

**Step 4: Add BodySection to the Today tab render**

In the Today tab's JSX, after the existing metric category sections, add:

```tsx
<BodySection />
```

**Step 5: Calculate 7-day weight trend**

For the weight card's trend arrow:
- Get entries from the last 7 days
- If there are at least 2 entries, calculate delta = latest - oldest
- Show up arrow (green if losing, red if gaining), down arrow, or dash for no change
- Show delta in lbs/kg next to the arrow

**Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(body-comp): add body section cards and log form to dashboard"
```

---

### Task 4: Weight Unification — Nutrition Integration

Make nutrition read weight from body comp storage instead of its own setting.

**Files:**
- Modify: `src/data/nutrition-targets.ts` (update `getProteinTarget`)
- Modify: `src/pages/Nutrition.tsx` (read weight from body comp, update display)
- Modify: `src/data/nutrition-targets.test.ts` (if it exists; update tests)

**Step 1: Update getProteinTarget**

In `src/data/nutrition-targets.ts`, the function `getProteinTarget(settings: NutritionSettings): number` currently returns `settings.bodyweightLbs`. Change it to accept an optional override:

```typescript
import { getCurrentWeightKg } from '../utils/body-composition-storage'

export function getProteinTarget(settings: NutritionSettings): number {
  const currentKg = getCurrentWeightKg()
  if (currentKg) {
    return Math.round(currentKg * 2.20462) // convert kg to lbs, 1g/lb rule
  }
  return settings.bodyweightLbs
}
```

This way, if body comp entries exist, protein target uses the latest weight. Otherwise falls back to the nutrition setting.

**Step 2: Update Nutrition.tsx display**

In `src/pages/Nutrition.tsx`, line ~359 shows:
```
Target: 1g per lb bodyweight ({settings.bodyweightLbs} lbs)
```

Update this to show the actual weight being used:
```typescript
const currentWeightLbs = getCurrentWeightKg()
  ? Math.round(getCurrentWeightKg()! * 2.20462)
  : settings.bodyweightLbs
```

Then display: `Target: 1g per lb bodyweight ({currentWeightLbs} lbs)`

Import `getCurrentWeightKg` from `../utils/body-composition-storage`.

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/data/nutrition-targets.ts src/pages/Nutrition.tsx
git commit -m "feat(body-comp): unify weight source for nutrition protein targets"
```

---

### Task 5: Demo Data Generation

Add body composition entries to the demo data generator for all 6 personas.

**Files:**
- Modify: `src/utils/demo-data.ts` (add `generateBodyCompData` function, call from `generateAllDemoData`)
- Modify: `src/utils/demo-data.test.ts` (add body comp demo data tests)

**Step 1: Add persona traits**

In `src/utils/demo-data.ts`, add to `PersonaTraits` interface:

```typescript
bodyFatPct?: number
```

Update each persona's traits:
- Elite athlete: `bodyFatPct: 8`
- Hypertension risk: `bodyFatPct: 28`
- College athlete: `bodyFatPct: 14`
- Metabolic syndrome: `bodyFatPct: 32`
- Postpartum recovery: `bodyFatPct: 26`
- Longevity optimized: `bodyFatPct: 15`

**Step 2: Write generateBodyCompData function**

```typescript
import { saveBodyCompEntry } from './body-composition-storage'
import type { BodyCompEntry } from '../types/body-composition'

function generateBodyCompData(traits: PersonaTraits): void {
  const bodyweightLbs = traits.bodyweightLbs ?? 170
  const baseKg = bodyweightLbs * 0.453592
  const bodyFatPct = traits.bodyFatPct
  const today = new Date()

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    // Add daily fluctuation ±0.5kg
    const fluctuation = (Math.random() - 0.5) * 1.0
    const weightKg = Math.round((baseKg + fluctuation) * 10) / 10

    const entry: BodyCompEntry = {
      id: `demo-bc-${dateStr}`,
      date: dateStr,
      weightKg,
      ...(bodyFatPct != null ? { bodyFatPct: bodyFatPct + (Math.random() - 0.5) * 2 } : {}),
    }

    saveBodyCompEntry(entry)
  }
}
```

For persona-specific trends, apply a weight drift:
- Hypertension risk: +0.02 kg/day upward trend
- Postpartum recovery: -0.03 kg/day downward trend
- Others: stable (fluctuation only)

**Step 3: Call from generateAllDemoData**

In `generateAllDemoData`, add after the molecules section:

```typescript
generateBodyCompData(traits)
```

**Step 4: Write tests**

Add to `src/utils/demo-data.test.ts`:

```typescript
describe('demo body composition', () => {
  it('generates body comp entries for each persona', () => {
    generateAllDemoData(DEMO_PERSONAS[0])
    const entries = getBodyCompEntries()
    expect(entries.length).toBeGreaterThanOrEqual(85)
  })

  it('includes body fat percentage when persona has bodyFatPct trait', () => {
    generateAllDemoData(DEMO_PERSONAS[0]) // elite-athlete has bodyFatPct: 8
    const entries = getBodyCompEntries()
    const withFat = entries.filter(e => e.bodyFatPct != null)
    expect(withFat.length).toBeGreaterThan(0)
  })
})
```

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/utils/demo-data.ts src/utils/demo-data.test.ts
git commit -m "feat(body-comp): add demo data generation for all personas"
```

---

### Task 6: Final Integration + Verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Run build**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds

**Step 3: Manual testing checklist**

Run: `npm run dev`

1. Load a demo persona → body comp cards appear on Dashboard
2. Weight card shows latest weight with 7-day trend
3. BMI card shows calculated BMI with color-coded standard + longevity status
4. Body Fat % card shows value with color coding
5. Lean Mass card shows calculated value
6. Click "+ Log" → inline form appears
7. Enter weight, save → card updates immediately
8. Enter weight + body fat % → lean mass auto-calculates
9. Nutrition page protein target reflects latest body comp weight
10. Clear demo data → body comp cards show empty state
11. Non-demo user with only profile weight → weight card shows profile weight, BMI calculates

**Step 4: Final commit if any fixes needed**

```bash
git add -u
git commit -m "fix(body-comp): integration fixes from manual testing"
```
