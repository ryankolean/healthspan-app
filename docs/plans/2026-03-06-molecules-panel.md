# Molecules Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Molecules tracking panel with stack definition, daily checklist logging, and adherence tracking for supplements and compounds.

**Architecture:** Two-model pattern — MoleculeDefinition (your stack) and MoleculeEntry (daily check-offs). localStorage-backed. 5-tab page with checklist-driven Overview. Dashboard card showing 7-day adherence. Manual-only source.

**Tech Stack:** React 18, TypeScript, Recharts, Vitest

---

### Task 1: Molecule Types

**Files:**
- Create: `src/types/molecules.ts`
- Create: `src/types/molecules.test.ts`

**Step 1: Write the failing test**

Create `src/types/molecules.test.ts`:

```typescript
import type { MoleculeDefinition, MoleculeEntry, MoleculeSource, MoleculeCategory } from './molecules'

describe('Molecule types', () => {
  it('MoleculeDefinition fields compile correctly', () => {
    const def: MoleculeDefinition = {
      id: 'creatine',
      name: 'Creatine Monohydrate',
      category: 'supplement',
      dosage: 5,
      unit: 'g',
      frequency: 'daily',
      active: true,
      createdAt: Date.now(),
    }
    expect(def.name).toBe('Creatine Monohydrate')
    expect(def.active).toBe(true)
  })

  it('MoleculeEntry fields compile correctly', () => {
    const entry: MoleculeEntry = {
      id: 'entry1',
      source: 'manual',
      date: '2026-03-01',
      moleculeId: 'creatine',
      taken: true,
      createdAt: Date.now(),
    }
    expect(entry.taken).toBe(true)
    expect(entry.source).toBe('manual')
  })

  it('MoleculeCategory covers all categories', () => {
    const categories: MoleculeCategory[] = ['supplement', 'compound', 'vitamin', 'mineral', 'amino_acid']
    expect(categories).toHaveLength(5)
  })

  it('optional fields are truly optional', () => {
    const entry: MoleculeEntry = {
      id: 'entry1',
      source: 'manual',
      date: '2026-03-01',
      moleculeId: 'creatine',
      taken: false,
      createdAt: Date.now(),
    }
    expect(entry.notes).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/molecules.test.ts`
Expected: FAIL — cannot find module `./molecules`

**Step 3: Write minimal implementation**

Create `src/types/molecules.ts`:

```typescript
export type MoleculeSource = 'manual'
export type MoleculeCategory = 'supplement' | 'compound' | 'vitamin' | 'mineral' | 'amino_acid'

export interface MoleculeDefinition {
  id: string
  name: string                    // e.g. "Creatine Monohydrate"
  category: MoleculeCategory
  dosage: number                  // e.g. 5
  unit: string                    // e.g. "g", "mg", "IU", "mcg"
  frequency: 'daily'             // daily only for now
  active: boolean                // can deactivate without deleting
  createdAt: number
}

export interface MoleculeEntry {
  id: string
  source: MoleculeSource
  date: string                   // YYYY-MM-DD
  moleculeId: string             // references MoleculeDefinition.id
  taken: boolean
  notes?: string
  createdAt: number
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/molecules.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/types/molecules.ts src/types/molecules.test.ts
git commit -m "feat(molecules): add MoleculeDefinition and MoleculeEntry types"
```

---

### Task 2: Molecules Targets

**Files:**
- Create: `src/data/molecules-targets.ts`
- Create: `src/data/molecules-targets.test.ts`

**Context:** Molecules has a single target — adherence percentage. Green >= 90%, amber >= 70%, red < 70%. This is simpler than other panels since there's just one metric.

**Step 1: Write the failing test**

Create `src/data/molecules-targets.test.ts`:

```typescript
import { MOLECULES_TARGETS, getAdherenceStatus } from './molecules-targets'
import type { AdherenceStatus } from './molecules-targets'

describe('MOLECULES_TARGETS', () => {
  it('has an adherence target', () => {
    expect(MOLECULES_TARGETS).toHaveLength(1)
    expect(MOLECULES_TARGETS[0].id).toBe('adherence')
  })

  it('adherence green threshold is 90', () => {
    const adherence = MOLECULES_TARGETS.find(t => t.id === 'adherence')!
    expect(adherence.greenMin).toBe(90)
    expect(adherence.amberMin).toBe(70)
  })
})

describe('getAdherenceStatus', () => {
  it('returns green for adherence >= 90%', () => {
    expect(getAdherenceStatus(90)).toBe('green')
    expect(getAdherenceStatus(95)).toBe('green')
    expect(getAdherenceStatus(100)).toBe('green')
  })

  it('returns amber for adherence >= 70% and < 90%', () => {
    expect(getAdherenceStatus(70)).toBe('amber')
    expect(getAdherenceStatus(80)).toBe('amber')
    expect(getAdherenceStatus(89)).toBe('amber')
  })

  it('returns red for adherence < 70%', () => {
    expect(getAdherenceStatus(69)).toBe('red')
    expect(getAdherenceStatus(50)).toBe('red')
    expect(getAdherenceStatus(0)).toBe('red')
  })

  it('handles edge case of exactly 90', () => {
    expect(getAdherenceStatus(90)).toBe('green')
  })

  it('handles edge case of exactly 70', () => {
    expect(getAdherenceStatus(70)).toBe('amber')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/molecules-targets.test.ts`
Expected: FAIL — cannot find module `./molecules-targets`

**Step 3: Write minimal implementation**

Create `src/data/molecules-targets.ts`:

```typescript
export interface MoleculeTarget {
  id: string
  label: string
  unit: string
  greenMin: number
  amberMin: number
}

export const MOLECULES_TARGETS: readonly MoleculeTarget[] = [
  { id: 'adherence', label: 'Adherence', unit: '%', greenMin: 90, amberMin: 70 },
] as const satisfies readonly MoleculeTarget[]

export type AdherenceStatus = 'green' | 'amber' | 'red'

export function getAdherenceStatus(percentage: number): AdherenceStatus {
  if (percentage >= 90) return 'green'
  if (percentage >= 70) return 'amber'
  return 'red'
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/molecules-targets.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/data/molecules-targets.ts src/data/molecules-targets.test.ts
git commit -m "feat(molecules): add adherence targets with green/amber/red status"
```

---

### Task 3: Molecules Storage

**Files:**
- Create: `src/utils/molecules-storage.ts`
- Create: `src/utils/molecules-storage.test.ts`

**Context:** Two localStorage collections: definitions (your stack) and entries (daily check-offs). Entries upsert by id (like nutrition, not by date). Multiple entries per day (one per molecule). Aggregation functions for adherence calculation.

**Step 1: Write the failing test**

Create `src/utils/molecules-storage.test.ts`:

```typescript
import {
  getDefinitions,
  saveDefinition,
  deleteDefinition,
  getMoleculeEntries,
  saveMoleculeEntry,
  deleteMoleculeEntry,
  getDailyAdherence,
  getAdherenceRange,
} from './molecules-storage'
import type { MoleculeDefinition, MoleculeEntry } from '../types/molecules'

const makeDef = (overrides: Partial<MoleculeDefinition> = {}): MoleculeDefinition => ({
  id: 'creatine',
  name: 'Creatine Monohydrate',
  category: 'supplement',
  dosage: 5,
  unit: 'g',
  frequency: 'daily',
  active: true,
  createdAt: Date.now(),
  ...overrides,
})

const makeEntry = (overrides: Partial<MoleculeEntry> = {}): MoleculeEntry => ({
  id: 'entry1',
  source: 'manual',
  date: '2026-03-01',
  moleculeId: 'creatine',
  taken: true,
  createdAt: Date.now(),
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('getDefinitions / saveDefinition / deleteDefinition', () => {
  it('returns empty array when nothing stored', () => {
    expect(getDefinitions()).toEqual([])
  })

  it('saves and retrieves a definition', () => {
    saveDefinition(makeDef())
    expect(getDefinitions()).toHaveLength(1)
    expect(getDefinitions()[0].name).toBe('Creatine Monohydrate')
  })

  it('upserts by id — updates existing definition', () => {
    saveDefinition(makeDef({ id: 'creatine', dosage: 5 }))
    saveDefinition(makeDef({ id: 'creatine', dosage: 10 }))
    const defs = getDefinitions()
    expect(defs).toHaveLength(1)
    expect(defs[0].dosage).toBe(10)
  })

  it('allows multiple definitions', () => {
    saveDefinition(makeDef({ id: 'creatine' }))
    saveDefinition(makeDef({ id: 'vitd', name: 'Vitamin D3' }))
    expect(getDefinitions()).toHaveLength(2)
  })

  it('deletes definition by id', () => {
    saveDefinition(makeDef({ id: 'creatine' }))
    saveDefinition(makeDef({ id: 'vitd', name: 'Vitamin D3' }))
    deleteDefinition('creatine')
    const defs = getDefinitions()
    expect(defs).toHaveLength(1)
    expect(defs[0].id).toBe('vitd')
  })
})

describe('getMoleculeEntries / saveMoleculeEntry / deleteMoleculeEntry', () => {
  it('returns empty array when nothing stored', () => {
    expect(getMoleculeEntries()).toEqual([])
  })

  it('saves and retrieves entries', () => {
    saveMoleculeEntry(makeEntry())
    expect(getMoleculeEntries()).toHaveLength(1)
  })

  it('upserts by id', () => {
    saveMoleculeEntry(makeEntry({ id: 'e1', taken: true }))
    saveMoleculeEntry(makeEntry({ id: 'e1', taken: false }))
    const entries = getMoleculeEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].taken).toBe(false)
  })

  it('allows multiple entries for same date (different molecules)', () => {
    saveMoleculeEntry(makeEntry({ id: 'e1', moleculeId: 'creatine' }))
    saveMoleculeEntry(makeEntry({ id: 'e2', moleculeId: 'vitd' }))
    expect(getMoleculeEntries()).toHaveLength(2)
  })

  it('filters by date range', () => {
    saveMoleculeEntry(makeEntry({ id: 'e1', date: '2026-01-01' }))
    saveMoleculeEntry(makeEntry({ id: 'e2', date: '2026-03-01' }))
    const filtered = getMoleculeEntries({ from: '2026-02-01', to: '2026-04-01' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('e2')
  })

  it('deletes entry by id', () => {
    saveMoleculeEntry(makeEntry({ id: 'e1' }))
    saveMoleculeEntry(makeEntry({ id: 'e2', moleculeId: 'vitd' }))
    deleteMoleculeEntry('e1')
    expect(getMoleculeEntries()).toHaveLength(1)
    expect(getMoleculeEntries()[0].id).toBe('e2')
  })
})

describe('getDailyAdherence', () => {
  it('returns 0% when no active definitions', () => {
    const result = getDailyAdherence('2026-03-01')
    expect(result.taken).toBe(0)
    expect(result.total).toBe(0)
    expect(result.percentage).toBe(0)
  })

  it('calculates adherence based on active definitions and taken entries', () => {
    saveDefinition(makeDef({ id: 'creatine', active: true }))
    saveDefinition(makeDef({ id: 'vitd', name: 'Vitamin D3', active: true }))
    saveDefinition(makeDef({ id: 'old', name: 'Old Supplement', active: false }))

    saveMoleculeEntry(makeEntry({ id: 'e1', date: '2026-03-01', moleculeId: 'creatine', taken: true }))
    // vitd not logged = not taken

    const result = getDailyAdherence('2026-03-01')
    expect(result.taken).toBe(1)
    expect(result.total).toBe(2) // only active definitions
    expect(result.percentage).toBe(50)
  })

  it('counts only taken: true entries', () => {
    saveDefinition(makeDef({ id: 'creatine', active: true }))
    saveMoleculeEntry(makeEntry({ id: 'e1', date: '2026-03-01', moleculeId: 'creatine', taken: false }))

    const result = getDailyAdherence('2026-03-01')
    expect(result.taken).toBe(0)
    expect(result.total).toBe(1)
    expect(result.percentage).toBe(0)
  })
})

describe('getAdherenceRange', () => {
  it('returns daily adherence for a date range', () => {
    saveDefinition(makeDef({ id: 'creatine', active: true }))
    saveDefinition(makeDef({ id: 'vitd', name: 'Vitamin D3', active: true }))

    saveMoleculeEntry(makeEntry({ id: 'e1', date: '2026-03-01', moleculeId: 'creatine', taken: true }))
    saveMoleculeEntry(makeEntry({ id: 'e2', date: '2026-03-01', moleculeId: 'vitd', taken: true }))
    saveMoleculeEntry(makeEntry({ id: 'e3', date: '2026-03-02', moleculeId: 'creatine', taken: true }))
    // vitd not taken on 03-02

    const range = getAdherenceRange('2026-03-01', '2026-03-02')
    expect(range).toHaveLength(2)
    expect(range[0].date).toBe('2026-03-01')
    expect(range[0].percentage).toBe(100)
    expect(range[1].date).toBe('2026-03-02')
    expect(range[1].percentage).toBe(50)
  })

  it('returns empty array for range with no data', () => {
    const range = getAdherenceRange('2026-03-01', '2026-03-02')
    expect(range).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/molecules-storage.test.ts`
Expected: FAIL — cannot find module `./molecules-storage`

**Step 3: Write minimal implementation**

Create `src/utils/molecules-storage.ts`:

```typescript
import type { MoleculeDefinition, MoleculeEntry } from '../types/molecules'

const KEYS = {
  definitions: 'healthspan:molecules:definitions',
  entries: 'healthspan:molecules:entries',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// ─── Definitions ───

function getAllDefinitionsRaw(): MoleculeDefinition[] {
  return readJson<MoleculeDefinition[]>(KEYS.definitions, [])
}

function saveAllDefinitions(defs: MoleculeDefinition[]): void {
  localStorage.setItem(KEYS.definitions, JSON.stringify(defs))
}

export function getDefinitions(): MoleculeDefinition[] {
  return getAllDefinitionsRaw()
}

export function saveDefinition(def: MoleculeDefinition): void {
  const all = getAllDefinitionsRaw().filter(d => d.id !== def.id)
  all.push(def)
  saveAllDefinitions(all)
}

export function deleteDefinition(id: string): void {
  const all = getAllDefinitionsRaw().filter(d => d.id !== id)
  saveAllDefinitions(all)
}

// ─── Entries ───

export interface MoleculeFilters {
  from?: string
  to?: string
}

function getAllEntriesRaw(): MoleculeEntry[] {
  return readJson<MoleculeEntry[]>(KEYS.entries, [])
}

function saveAllEntries(entries: MoleculeEntry[]): void {
  localStorage.setItem(KEYS.entries, JSON.stringify(entries))
}

export function getMoleculeEntries(filters: MoleculeFilters = {}): MoleculeEntry[] {
  let list = getAllEntriesRaw()
  if (filters.from) list = list.filter(e => e.date >= filters.from!)
  if (filters.to) list = list.filter(e => e.date <= filters.to!)
  return list
}

export function saveMoleculeEntry(entry: MoleculeEntry): void {
  const all = getAllEntriesRaw().filter(e => e.id !== entry.id)
  all.push(entry)
  saveAllEntries(all)
}

export function deleteMoleculeEntry(id: string): void {
  const all = getAllEntriesRaw().filter(e => e.id !== id)
  saveAllEntries(all)
}

// ─── Aggregation ───

export interface DailyAdherence {
  date: string
  taken: number
  total: number
  percentage: number
}

export function getDailyAdherence(date: string): DailyAdherence {
  const activeDefs = getAllDefinitionsRaw().filter(d => d.active)
  const total = activeDefs.length
  if (total === 0) return { date, taken: 0, total: 0, percentage: 0 }

  const dayEntries = getAllEntriesRaw().filter(e => e.date === date && e.taken)
  const taken = activeDefs.filter(d => dayEntries.some(e => e.moleculeId === d.id)).length

  return { date, taken, total, percentage: Math.round((taken / total) * 100) }
}

export function getAdherenceRange(from: string, to: string): DailyAdherence[] {
  const activeDefs = getAllDefinitionsRaw().filter(d => d.active)
  if (activeDefs.length === 0) return []

  const allEntries = getAllEntriesRaw().filter(e => e.date >= from && e.date <= to)
  const dates = [...new Set(allEntries.map(e => e.date))].sort()

  return dates.map(date => {
    const dayEntries = allEntries.filter(e => e.date === date && e.taken)
    const taken = activeDefs.filter(d => dayEntries.some(e => e.moleculeId === d.id)).length
    return {
      date,
      taken,
      total: activeDefs.length,
      percentage: Math.round((taken / activeDefs.length) * 100),
    }
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/molecules-storage.test.ts`
Expected: 14 tests PASS

**Step 5: Commit**

```bash
git add src/utils/molecules-storage.ts src/utils/molecules-storage.test.ts
git commit -m "feat(molecules): add localStorage CRUD with adherence aggregation"
```

---

### Task 4: Molecules Page + Route + Nav

**Files:**
- Create: `src/pages/Molecules.tsx`
- Modify: `src/App.tsx` — add import and route
- Modify: `src/components/Layout.tsx` — set `active: true` for molecules

**Context:** Full 5-tab page following the same pattern as Emotional/Nutrition pages. Overview tab has today's checklist with checkboxes, Trends has adherence charts, Analysis has per-molecule consistency, Insights has Attia protocol references, Sources has stack editor and entry history.

**Important patterns from existing pages:**
- Vitest uses `globals: true` — no imports needed for `describe`, `it`, `expect`, `beforeEach`
- Use `useState` for tab state, form state, editing state
- Use `useMemo` for computed data
- Color scheme: green `#10b981`, amber `#f59e0b`, red `#ef4444`, brand `#6366f1`
- Card style: `bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5`
- Tab style: matches Dashboard tab bar pattern
- Generate IDs with `crypto.randomUUID()`
- Date defaults to `new Date().toISOString().slice(0, 10)`
- Charts use Recharts: `LineChart`, `BarChart`, `AreaChart` with `ResponsiveContainer`

**Step 1: Create the Molecules page**

Create `src/pages/Molecules.tsx` with:

1. **State:** `tab` (5 tabs), `editingDef` (MoleculeDefinition form), `showDefForm` boolean
2. **Data:** Load definitions and entries from storage, compute today's adherence, 30-day adherence range
3. **Overview tab:**
   - Today's date header
   - Checklist of active molecules with checkboxes — each checkbox calls `saveMoleculeEntry` with `taken: true/false`
   - Daily adherence percentage bar
   - 7-day avg adherence stat
4. **Trends tab:**
   - Daily adherence % line chart (30 days) with 90% reference line
   - Per-molecule adherence horizontal bar chart
   - Current streak counter
5. **Analysis tab:**
   - Most/least consistent molecules lists
   - Category adherence breakdown
6. **Insights tab:**
   - Attia longevity protocol reference table (hardcoded recommended supplements)
   - Adherence recommendations
   - Healthcare disclaimer
7. **Sources tab:**
   - Stack editor form: name, category dropdown, dosage, unit, active toggle
   - Definition list with edit/delete buttons
   - Entry history with date filter

**Step 2: Add route to App.tsx**

In `src/App.tsx`:
- Add import: `import Molecules from './pages/Molecules'`
- Add route after nutrition: `<Route path="/molecules" element={<Molecules />} />`

**Step 3: Enable nav item in Layout.tsx**

In `src/components/Layout.tsx`:
- Change `{ to: '/molecules', icon: Pill, label: 'Molecules', active: false }` to `active: true`

**Step 4: Run all tests to verify nothing breaks**

Run: `npx vitest run`
Expected: All existing tests PASS (should be 218+ tests)

**Step 5: Commit**

```bash
git add src/pages/Molecules.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(molecules): add Molecules page with 5-tab layout, route, and nav"
```

---

### Task 5: Dashboard Integration

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Context:** Add a Molecules status card after the Nutrition card in the Overview tab. Shows 7-day adherence percentage with green/amber/red status. Pattern matches the existing exercise/sleep/emotional/nutrition cards.

**Step 1: Add imports**

In `src/pages/Dashboard.tsx`, add after the nutrition imports:

```typescript
import { getMoleculeEntries, getDefinitions, getDailyAdherence } from '../utils/molecules-storage'
import { getAdherenceStatus } from '../data/molecules-targets'
```

**Step 2: Add molecules status computation**

After the nutrition status block (around line 116), add:

```typescript
// Molecules status
const moleculeDefinitions = useMemo(() => getDefinitions(), [])
const moleculeEntries = useMemo(() => getMoleculeEntries(), [])
const avgAdherence = useMemo(() => {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const cutoff = weekAgo.toISOString().slice(0, 10)
  const dates = [...new Set(moleculeEntries.filter(e => e.date >= cutoff).map(e => e.date))]
  if (dates.length === 0 || moleculeDefinitions.filter(d => d.active).length === 0) return 0
  const adherences = dates.map(d => getDailyAdherence(d).percentage)
  return Math.round(adherences.reduce((s, v) => s + v, 0) / adherences.length)
}, [moleculeEntries, moleculeDefinitions])
const moleculesStatus = useMemo(() => getAdherenceStatus(avgAdherence), [avgAdherence])
const moleculesLabel = moleculesStatus === 'green' ? 'On Track' : moleculesStatus === 'amber' ? 'Building' : avgAdherence > 0 ? 'Below Target' : 'No Data'
const moleculesColor = moleculesStatus === 'green' ? '#10b981' : moleculesStatus === 'amber' ? '#f59e0b' : '#ef4444'
const todayAdherence = useMemo(() => getDailyAdherence(new Date().toISOString().slice(0, 10)), [moleculeEntries])
```

**Step 3: Add the card**

After the Nutrition card `</Link>` in the Overview tab, add:

```tsx
<Link to="/molecules" className="block">
  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
    <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Molecules</div>
    <div className="text-[24px] font-bold font-mono" style={{ color: moleculesColor }}>{moleculesLabel}</div>
    <div className="text-[11px] text-slate-500 mt-1">{avgAdherence > 0 ? `${avgAdherence}% adherence` : 'Start logging'} · {todayAdherence.taken}/{todayAdherence.total} today</div>
  </div>
</Link>
```

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(molecules): add molecules adherence card to Dashboard"
```

---

### Task 6: Final Verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS (should be 230+ across 29+ test files)

**Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Production build**

Run: `npx vite build`
Expected: Build succeeds

**Step 4: Verify file structure**

Confirm these files exist:
- `src/types/molecules.ts`
- `src/types/molecules.test.ts`
- `src/data/molecules-targets.ts`
- `src/data/molecules-targets.test.ts`
- `src/utils/molecules-storage.ts`
- `src/utils/molecules-storage.test.ts`
- `src/pages/Molecules.tsx`

**Step 5: Push to remote**

```bash
git push
```
