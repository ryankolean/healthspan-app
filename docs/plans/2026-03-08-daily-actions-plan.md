# Daily Actions Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Today" tab as the default Dashboard tab with user-configurable daily actions, auto-complete from domain data, and a notification badge on the sidebar.

**Architecture:** Types + storage layer first, then auto-complete engine, then UI (Today tab + badge). Each layer is independently testable. Storage follows the existing `healthspan:` prefixed localStorage pattern with `readJson` helpers.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Lucide icons, Vitest (jsdom), localStorage

---

### Task 1: Action Types

**Files:**
- Create: `src/types/actions.ts`
- Test: `src/types/actions.test.ts`

**Step 1: Write the type file**

```ts
// src/types/actions.ts
export type ActionFrequency =
  | { type: 'daily' }
  | { type: 'weekdays' }
  | { type: 'specific_days'; days: number[] }
  | { type: 'times_per_week'; count: number }

export type ActionDomain = 'exercise' | 'nutrition' | 'sleep' | 'emotional' | 'molecules'

export type AutoCompleteRule =
  | 'any_workout' | 'cardio_workout' | 'strength_workout'
  | 'any_meal' | 'all_meals' | 'breakfast' | 'lunch' | 'dinner'
  | 'any_sleep'
  | 'any_emotion'
  | 'any_supplement' | 'all_supplements'

export interface ActionDefinition {
  id: string
  label: string
  frequency: ActionFrequency
  domain?: ActionDomain
  autoCompleteRule?: AutoCompleteRule
  createdAt: string
  active: boolean
  sortOrder: number
}

export interface DailyActionEntry {
  actionId: string
  date: string             // YYYY-MM-DD
  completed: boolean
  completedAt?: string     // ISO timestamp
  autoCompleted: boolean
}

export interface ActionSettings {
  dayResetHour: number     // 0-23, default 0 (midnight)
}

export const DEFAULT_ACTION_SETTINGS: ActionSettings = {
  dayResetHour: 0,
}
```

**Step 2: Write the type test**

```ts
// src/types/actions.test.ts
import { describe, it, expect } from 'vitest'
import type { ActionDefinition, DailyActionEntry, ActionFrequency, ActionSettings } from './actions'
import { DEFAULT_ACTION_SETTINGS } from './actions'

describe('ActionDefinition type', () => {
  it('accepts a daily custom action', () => {
    const action: ActionDefinition = {
      id: 'a1',
      label: 'Meditate',
      frequency: { type: 'daily' },
      createdAt: '2026-03-08T00:00:00Z',
      active: true,
      sortOrder: 0,
    }
    expect(action.domain).toBeUndefined()
    expect(action.autoCompleteRule).toBeUndefined()
  })

  it('accepts a domain-linked action with auto-complete', () => {
    const action: ActionDefinition = {
      id: 'a2',
      label: 'Log a workout',
      frequency: { type: 'times_per_week', count: 4 },
      domain: 'exercise',
      autoCompleteRule: 'any_workout',
      createdAt: '2026-03-08T00:00:00Z',
      active: true,
      sortOrder: 1,
    }
    expect(action.domain).toBe('exercise')
  })

  it('accepts specific_days frequency', () => {
    const freq: ActionFrequency = { type: 'specific_days', days: [1, 3, 5] }
    expect(freq.days).toEqual([1, 3, 5])
  })
})

describe('DailyActionEntry type', () => {
  it('tracks manual completion', () => {
    const entry: DailyActionEntry = {
      actionId: 'a1',
      date: '2026-03-08',
      completed: true,
      completedAt: '2026-03-08T14:30:00Z',
      autoCompleted: false,
    }
    expect(entry.autoCompleted).toBe(false)
  })

  it('tracks auto-completion', () => {
    const entry: DailyActionEntry = {
      actionId: 'a2',
      date: '2026-03-08',
      completed: true,
      completedAt: '2026-03-08T10:00:00Z',
      autoCompleted: true,
    }
    expect(entry.autoCompleted).toBe(true)
  })
})

describe('DEFAULT_ACTION_SETTINGS', () => {
  it('defaults to midnight reset', () => {
    expect(DEFAULT_ACTION_SETTINGS.dayResetHour).toBe(0)
  })
})
```

**Step 3: Run tests**

Run: `npx vitest run src/types/actions.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/types/actions.ts src/types/actions.test.ts
git commit -m "feat(actions): add action types and defaults"
```

---

### Task 2: Actions Storage

**Files:**
- Create: `src/utils/actions-storage.ts`
- Test: `src/utils/actions-storage.test.ts`

**Context:** Follow the same pattern as `src/utils/molecules-storage.ts` — private `readJson` helper, `KEYS` constant, exported CRUD functions.

**Step 1: Write the storage module**

```ts
// src/utils/actions-storage.ts
import type { ActionDefinition, DailyActionEntry, ActionSettings } from '../types/actions'
import { DEFAULT_ACTION_SETTINGS } from '../types/actions'

const KEYS = {
  definitions: 'healthspan:actions:definitions',
  settings: 'healthspan:actions:settings',
} as const

function entryKey(date: string): string {
  return `healthspan:actions:entries:${date}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// ─── Definitions ───

export function getActionDefinitions(): ActionDefinition[] {
  return readJson<ActionDefinition[]>(KEYS.definitions, [])
}

export function saveActionDefinition(def: ActionDefinition): void {
  const all = getActionDefinitions().filter(d => d.id !== def.id)
  all.push(def)
  all.sort((a, b) => a.sortOrder - b.sortOrder)
  localStorage.setItem(KEYS.definitions, JSON.stringify(all))
}

export function deleteActionDefinition(id: string): void {
  const all = getActionDefinitions().filter(d => d.id !== id)
  localStorage.setItem(KEYS.definitions, JSON.stringify(all))
}

// ─── Daily Entries ───

export function getDailyEntries(date: string): DailyActionEntry[] {
  return readJson<DailyActionEntry[]>(entryKey(date), [])
}

export function saveDailyEntry(entry: DailyActionEntry): void {
  const all = getDailyEntries(entry.date).filter(e => e.actionId !== entry.actionId)
  all.push(entry)
  localStorage.setItem(entryKey(entry.date), JSON.stringify(all))
}

// ─── Settings ───

export function getActionSettings(): ActionSettings {
  return readJson<ActionSettings>(KEYS.settings, DEFAULT_ACTION_SETTINGS)
}

export function saveActionSettings(settings: ActionSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}

// ─── Date Utilities ───

export function getEffectiveToday(resetHour: number): string {
  const now = new Date()
  if (now.getHours() < resetHour) {
    now.setDate(now.getDate() - 1)
  }
  return now.toISOString().slice(0, 10)
}

export function isActionDueOnDate(action: ActionDefinition, date: string, completedDaysThisWeek?: number): boolean {
  if (!action.active) return false
  const d = new Date(date + 'T12:00:00')
  const dayOfWeek = d.getDay() // 0=Sun..6=Sat

  switch (action.frequency.type) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'specific_days':
      return action.frequency.days.includes(dayOfWeek)
    case 'times_per_week':
      return (completedDaysThisWeek ?? 0) < action.frequency.count
  }
}

export function getWeekStart(date: string): string {
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday = start of week
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

export function getCompletedDaysThisWeek(actionId: string, today: string): number {
  const weekStart = getWeekStart(today)
  let count = 0
  const d = new Date(weekStart + 'T12:00:00')
  const end = new Date(today + 'T12:00:00')
  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10)
    const entries = getDailyEntries(dateStr)
    if (entries.some(e => e.actionId === actionId && e.completed)) {
      count++
    }
    d.setDate(d.getDate() + 1)
  }
  return count
}
```

**Step 2: Write the test file**

```ts
// src/utils/actions-storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getActionDefinitions, saveActionDefinition, deleteActionDefinition,
  getDailyEntries, saveDailyEntry,
  getActionSettings, saveActionSettings,
  getEffectiveToday, isActionDueOnDate, getWeekStart, getCompletedDaysThisWeek,
} from './actions-storage'
import type { ActionDefinition, DailyActionEntry } from '../types/actions'

const makeDef = (overrides: Partial<ActionDefinition> = {}): ActionDefinition => ({
  id: 'a1',
  label: 'Meditate',
  frequency: { type: 'daily' },
  createdAt: '2026-03-08T00:00:00Z',
  active: true,
  sortOrder: 0,
  ...overrides,
})

const makeEntry = (overrides: Partial<DailyActionEntry> = {}): DailyActionEntry => ({
  actionId: 'a1',
  date: '2026-03-08',
  completed: true,
  autoCompleted: false,
  ...overrides,
})

beforeEach(() => { localStorage.clear() })

describe('definitions CRUD', () => {
  it('returns empty array when nothing stored', () => {
    expect(getActionDefinitions()).toEqual([])
  })

  it('saves and retrieves a definition', () => {
    saveActionDefinition(makeDef())
    expect(getActionDefinitions()).toHaveLength(1)
    expect(getActionDefinitions()[0].label).toBe('Meditate')
  })

  it('updates existing definition by id', () => {
    saveActionDefinition(makeDef())
    saveActionDefinition(makeDef({ label: 'Breathwork' }))
    expect(getActionDefinitions()).toHaveLength(1)
    expect(getActionDefinitions()[0].label).toBe('Breathwork')
  })

  it('deletes a definition', () => {
    saveActionDefinition(makeDef())
    deleteActionDefinition('a1')
    expect(getActionDefinitions()).toEqual([])
  })

  it('sorts by sortOrder', () => {
    saveActionDefinition(makeDef({ id: 'b', sortOrder: 2, label: 'B' }))
    saveActionDefinition(makeDef({ id: 'a', sortOrder: 1, label: 'A' }))
    const defs = getActionDefinitions()
    expect(defs[0].label).toBe('A')
    expect(defs[1].label).toBe('B')
  })
})

describe('daily entries', () => {
  it('returns empty array for date with no entries', () => {
    expect(getDailyEntries('2026-03-08')).toEqual([])
  })

  it('saves and retrieves an entry', () => {
    saveDailyEntry(makeEntry())
    expect(getDailyEntries('2026-03-08')).toHaveLength(1)
  })

  it('updates entry for same actionId+date', () => {
    saveDailyEntry(makeEntry({ completed: false }))
    saveDailyEntry(makeEntry({ completed: true }))
    const entries = getDailyEntries('2026-03-08')
    expect(entries).toHaveLength(1)
    expect(entries[0].completed).toBe(true)
  })

  it('keeps entries for different dates separate', () => {
    saveDailyEntry(makeEntry({ date: '2026-03-08' }))
    saveDailyEntry(makeEntry({ date: '2026-03-09' }))
    expect(getDailyEntries('2026-03-08')).toHaveLength(1)
    expect(getDailyEntries('2026-03-09')).toHaveLength(1)
  })
})

describe('settings', () => {
  it('returns defaults when nothing stored', () => {
    expect(getActionSettings().dayResetHour).toBe(0)
  })

  it('saves and retrieves settings', () => {
    saveActionSettings({ dayResetHour: 4 })
    expect(getActionSettings().dayResetHour).toBe(4)
  })
})

describe('isActionDueOnDate', () => {
  it('daily actions are always due', () => {
    expect(isActionDueOnDate(makeDef(), '2026-03-08')).toBe(true) // Sunday
    expect(isActionDueOnDate(makeDef(), '2026-03-09')).toBe(true) // Monday
  })

  it('weekday actions are due Mon-Fri only', () => {
    const action = makeDef({ frequency: { type: 'weekdays' } })
    expect(isActionDueOnDate(action, '2026-03-09')).toBe(true)  // Monday
    expect(isActionDueOnDate(action, '2026-03-08')).toBe(false) // Sunday
    expect(isActionDueOnDate(action, '2026-03-07')).toBe(false) // Saturday
  })

  it('specific_days checks day of week', () => {
    const action = makeDef({ frequency: { type: 'specific_days', days: [1, 3, 5] } }) // Mon, Wed, Fri
    expect(isActionDueOnDate(action, '2026-03-09')).toBe(true)  // Monday
    expect(isActionDueOnDate(action, '2026-03-10')).toBe(false) // Tuesday
    expect(isActionDueOnDate(action, '2026-03-11')).toBe(true)  // Wednesday
  })

  it('times_per_week checks completed count', () => {
    const action = makeDef({ frequency: { type: 'times_per_week', count: 3 } })
    expect(isActionDueOnDate(action, '2026-03-09', 2)).toBe(true)  // 2 < 3
    expect(isActionDueOnDate(action, '2026-03-09', 3)).toBe(false) // 3 >= 3
  })

  it('inactive actions are never due', () => {
    expect(isActionDueOnDate(makeDef({ active: false }), '2026-03-08')).toBe(false)
  })
})

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    expect(getWeekStart('2026-03-11')).toBe('2026-03-09') // Wed -> Mon
  })

  it('returns Monday for a Monday', () => {
    expect(getWeekStart('2026-03-09')).toBe('2026-03-09')
  })

  it('returns previous Monday for a Sunday', () => {
    expect(getWeekStart('2026-03-08')).toBe('2026-03-02') // Sun -> prev Mon
  })
})

describe('getCompletedDaysThisWeek', () => {
  it('counts completed days from Monday to today', () => {
    saveDailyEntry(makeEntry({ date: '2026-03-09', completed: true })) // Monday
    saveDailyEntry(makeEntry({ date: '2026-03-10', completed: true })) // Tuesday
    saveDailyEntry(makeEntry({ date: '2026-03-11', completed: false })) // Wed not done
    expect(getCompletedDaysThisWeek('a1', '2026-03-11')).toBe(2)
  })
})
```

**Step 3: Run tests**

Run: `npx vitest run src/utils/actions-storage.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/actions-storage.ts src/utils/actions-storage.test.ts
git commit -m "feat(actions): add actions storage with CRUD, scheduling, and date utils"
```

---

### Task 3: Auto-Complete Engine

**Files:**
- Create: `src/utils/actions-auto-complete.ts`
- Test: `src/utils/actions-auto-complete.test.ts`

**Context:** This module checks domain data and returns which actions are auto-completed. It reads from the existing storage modules (`exercise-storage`, `nutrition-storage`, etc.) and writes completion entries via `actions-storage`. Both Layout.tsx and the Today tab will call this.

**Step 1: Write the auto-complete module**

```ts
// src/utils/actions-auto-complete.ts
import type { ActionDefinition, DailyActionEntry, AutoCompleteRule } from '../types/actions'
import { getWorkouts } from './exercise-storage'
import { getNutritionEntries } from './nutrition-storage'
import { getSleepNights } from './sleep-storage'
import { getEmotionalEntries } from './emotional-storage'
import { getMoleculeEntries, getDefinitions as getMoleculeDefinitions } from './molecules-storage'
import { getDailyEntries, saveDailyEntry } from './actions-storage'

function checkRule(rule: AutoCompleteRule, date: string): boolean {
  switch (rule) {
    // Exercise
    case 'any_workout':
      return getWorkouts({ from: date, to: date }).length > 0
    case 'cardio_workout':
      return getWorkouts({ from: date, to: date, type: 'cardio' }).length > 0
    case 'strength_workout':
      return getWorkouts({ from: date, to: date, type: 'strength' }).length > 0

    // Nutrition
    case 'any_meal':
      return getNutritionEntries({ from: date, to: date }).length > 0
    case 'all_meals':
      return getNutritionEntries({ from: date, to: date }).length >= 3
    case 'breakfast':
      return getNutritionEntries({ from: date, to: date }).some(e => e.mealType === 'breakfast')
    case 'lunch':
      return getNutritionEntries({ from: date, to: date }).some(e => e.mealType === 'lunch')
    case 'dinner':
      return getNutritionEntries({ from: date, to: date }).some(e => e.mealType === 'dinner')

    // Sleep — check yesterday's date since sleep is logged for the night before
    case 'any_sleep': {
      const yesterday = new Date(date + 'T12:00:00')
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      return getSleepNights({ from: yesterdayStr, to: yesterdayStr }).length > 0
    }

    // Emotional
    case 'any_emotion':
      return getEmotionalEntries({ from: date, to: date }).length > 0

    // Molecules
    case 'any_supplement':
      return getMoleculeEntries({ from: date, to: date }).some(e => e.taken)
    case 'all_supplements': {
      const activeDefs = getMoleculeDefinitions().filter(d => d.active)
      if (activeDefs.length === 0) return false
      const takenEntries = getMoleculeEntries({ from: date, to: date }).filter(e => e.taken)
      return activeDefs.every(def => takenEntries.some(e => e.moleculeId === def.id))
    }

    default:
      return false
  }
}

export interface ActionStatus {
  action: ActionDefinition
  completed: boolean
  autoCompleted: boolean
}

export function runAutoCompleteChecks(actions: ActionDefinition[], date: string): ActionStatus[] {
  const existingEntries = getDailyEntries(date)

  return actions.map(action => {
    const existing = existingEntries.find(e => e.actionId === action.id)

    // If manually completed or manually unchecked, respect that
    if (existing && !existing.autoCompleted) {
      return { action, completed: existing.completed, autoCompleted: false }
    }

    // If domain-linked with auto-complete rule, check it
    if (action.autoCompleteRule) {
      const isComplete = checkRule(action.autoCompleteRule, date)

      if (isComplete && (!existing || !existing.completed)) {
        // Auto-complete: save the entry
        const entry: DailyActionEntry = {
          actionId: action.id,
          date,
          completed: true,
          completedAt: new Date().toISOString(),
          autoCompleted: true,
        }
        saveDailyEntry(entry)
        return { action, completed: true, autoCompleted: true }
      }

      if (!isComplete && existing?.autoCompleted && existing.completed) {
        // Data was removed — un-auto-complete
        const entry: DailyActionEntry = {
          ...existing,
          completed: false,
          completedAt: undefined,
        }
        saveDailyEntry(entry)
        return { action, completed: false, autoCompleted: true }
      }

      if (existing) {
        return { action, completed: existing.completed, autoCompleted: existing.autoCompleted }
      }

      return { action, completed: false, autoCompleted: false }
    }

    // Custom action (no auto-complete)
    return {
      action,
      completed: existing?.completed ?? false,
      autoCompleted: false,
    }
  })
}

export function getIncompleteCount(actions: ActionDefinition[], date: string): number {
  const statuses = runAutoCompleteChecks(actions, date)
  return statuses.filter(s => !s.completed).length
}
```

**Step 2: Write the test file**

```ts
// src/utils/actions-auto-complete.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { runAutoCompleteChecks, getIncompleteCount } from './actions-auto-complete'
import { saveDailyEntry } from './actions-storage'
import type { ActionDefinition } from '../types/actions'
import type { ExerciseWorkout } from '../types/exercise'
import type { NutritionEntry } from '../types/nutrition'
import type { EmotionalEntry } from '../types/emotional'
import type { MoleculeDefinition, MoleculeEntry } from '../types/molecules'

// Helper to write directly to localStorage (simulating domain data)
function storeWorkout(date: string, type: 'cardio' | 'strength' = 'cardio') {
  const key = 'healthspan:exercise:workouts'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push({
    id: `w-${Date.now()}-${Math.random()}`,
    source: 'manual',
    sourceId: `src-${Date.now()}`,
    date,
    type,
    activityName: type === 'cardio' ? 'Running' : 'Bench Press',
    createdAt: Date.now(),
  })
  localStorage.setItem(key, JSON.stringify(existing))
}

function storeMeal(date: string, mealType: 'breakfast' | 'lunch' | 'dinner' = 'breakfast') {
  const key = 'healthspan:nutrition:entries'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push({
    id: `m-${Date.now()}-${Math.random()}`,
    source: 'manual',
    date,
    mealType,
    createdAt: Date.now(),
  })
  localStorage.setItem(key, JSON.stringify(existing))
}

function storeEmotion(date: string) {
  const key = 'healthspan:emotional:entries'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push({
    id: `e-${Date.now()}`,
    date,
    mood: 4,
    stress: 2,
    anxiety: 1,
    energy: 4,
    createdAt: Date.now(),
  })
  localStorage.setItem(key, JSON.stringify(existing))
}

function storeSleepNight(date: string) {
  const key = 'healthspan:sleep:nights'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push({
    id: `s-${Date.now()}`,
    source: 'manual',
    sourceId: `src-${Date.now()}`,
    date,
    totalMin: 420,
    createdAt: Date.now(),
  })
  localStorage.setItem(key, JSON.stringify(existing))
}

function storeMoleculeDef(id: string, active = true) {
  const key = 'healthspan:molecules:definitions'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push({
    id,
    name: id,
    category: 'supplement',
    dosage: 5,
    unit: 'g',
    frequency: 'daily',
    active,
    createdAt: Date.now(),
  })
  localStorage.setItem(key, JSON.stringify(existing))
}

function storeMoleculeEntry(moleculeId: string, date: string, taken: boolean) {
  const key = 'healthspan:molecules:entries'
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push({
    id: `me-${Date.now()}-${Math.random()}`,
    source: 'manual',
    date,
    moleculeId,
    taken,
    createdAt: Date.now(),
  })
  localStorage.setItem(key, JSON.stringify(existing))
}

const makeDef = (overrides: Partial<ActionDefinition> = {}): ActionDefinition => ({
  id: 'a1',
  label: 'Test Action',
  frequency: { type: 'daily' },
  createdAt: '2026-03-08T00:00:00Z',
  active: true,
  sortOrder: 0,
  ...overrides,
})

beforeEach(() => { localStorage.clear() })

describe('runAutoCompleteChecks', () => {
  it('returns incomplete for custom action with no entry', () => {
    const result = runAutoCompleteChecks([makeDef()], '2026-03-08')
    expect(result[0].completed).toBe(false)
  })

  it('auto-completes any_workout when workout exists', () => {
    storeWorkout('2026-03-08')
    const action = makeDef({ domain: 'exercise', autoCompleteRule: 'any_workout' })
    const result = runAutoCompleteChecks([action], '2026-03-08')
    expect(result[0].completed).toBe(true)
    expect(result[0].autoCompleted).toBe(true)
  })

  it('does not auto-complete any_workout when no workout', () => {
    const action = makeDef({ domain: 'exercise', autoCompleteRule: 'any_workout' })
    const result = runAutoCompleteChecks([action], '2026-03-08')
    expect(result[0].completed).toBe(false)
  })

  it('auto-completes cardio_workout only for cardio', () => {
    storeWorkout('2026-03-08', 'strength')
    const action = makeDef({ domain: 'exercise', autoCompleteRule: 'cardio_workout' })
    const result = runAutoCompleteChecks([action], '2026-03-08')
    expect(result[0].completed).toBe(false)

    storeWorkout('2026-03-08', 'cardio')
    const result2 = runAutoCompleteChecks([action], '2026-03-08')
    expect(result2[0].completed).toBe(true)
  })

  it('auto-completes any_meal when meal exists', () => {
    storeMeal('2026-03-08')
    const action = makeDef({ domain: 'nutrition', autoCompleteRule: 'any_meal' })
    const result = runAutoCompleteChecks([action], '2026-03-08')
    expect(result[0].completed).toBe(true)
  })

  it('auto-completes all_meals when 3+ meals exist', () => {
    const action = makeDef({ domain: 'nutrition', autoCompleteRule: 'all_meals' })

    storeMeal('2026-03-08', 'breakfast')
    storeMeal('2026-03-08', 'lunch')
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(false)

    storeMeal('2026-03-08', 'dinner')
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(true)
  })

  it('auto-completes specific meal type', () => {
    const action = makeDef({ domain: 'nutrition', autoCompleteRule: 'breakfast' })
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(false)

    storeMeal('2026-03-08', 'breakfast')
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(true)
  })

  it('auto-completes any_sleep checking yesterday', () => {
    const action = makeDef({ domain: 'sleep', autoCompleteRule: 'any_sleep' })
    // Sleep for night of March 7 shows up on March 8
    storeSleepNight('2026-03-07')
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(true)
  })

  it('auto-completes any_emotion', () => {
    storeEmotion('2026-03-08')
    const action = makeDef({ domain: 'emotional', autoCompleteRule: 'any_emotion' })
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(true)
  })

  it('auto-completes any_supplement', () => {
    storeMoleculeDef('creatine')
    storeMoleculeEntry('creatine', '2026-03-08', true)
    const action = makeDef({ domain: 'molecules', autoCompleteRule: 'any_supplement' })
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(true)
  })

  it('auto-completes all_supplements only when all active are taken', () => {
    storeMoleculeDef('creatine')
    storeMoleculeDef('vitamin_d')
    storeMoleculeEntry('creatine', '2026-03-08', true)
    const action = makeDef({ domain: 'molecules', autoCompleteRule: 'all_supplements' })
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(false)

    storeMoleculeEntry('vitamin_d', '2026-03-08', true)
    expect(runAutoCompleteChecks([action], '2026-03-08')[0].completed).toBe(true)
  })

  it('respects manual override — manual completion sticks', () => {
    const action = makeDef({ domain: 'exercise', autoCompleteRule: 'any_workout' })
    saveDailyEntry({
      actionId: 'a1',
      date: '2026-03-08',
      completed: true,
      autoCompleted: false,
    })
    const result = runAutoCompleteChecks([action], '2026-03-08')
    expect(result[0].completed).toBe(true)
    expect(result[0].autoCompleted).toBe(false)
  })
})

describe('getIncompleteCount', () => {
  it('counts incomplete actions', () => {
    const actions = [
      makeDef({ id: 'a1' }),
      makeDef({ id: 'a2', domain: 'exercise', autoCompleteRule: 'any_workout' }),
    ]
    storeWorkout('2026-03-08')
    expect(getIncompleteCount(actions, '2026-03-08')).toBe(1) // a1 still incomplete
  })

  it('returns 0 when all complete', () => {
    const actions = [makeDef({ id: 'a1' })]
    saveDailyEntry({ actionId: 'a1', date: '2026-03-08', completed: true, autoCompleted: false })
    expect(getIncompleteCount(actions, '2026-03-08')).toBe(0)
  })
})
```

**Step 3: Run tests**

Run: `npx vitest run src/utils/actions-auto-complete.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/actions-auto-complete.ts src/utils/actions-auto-complete.test.ts
git commit -m "feat(actions): add auto-complete engine with domain checks"
```

---

### Task 4: Auto-Complete Rule Definitions

**Files:**
- Create: `src/data/actions-rules.ts`

**Context:** Simple mapping of domains to their available auto-complete rules with human-readable labels. Used by the Add/Edit action form to populate the rule dropdown.

**Step 1: Write the rules file**

```ts
// src/data/actions-rules.ts
import type { ActionDomain, AutoCompleteRule } from '../types/actions'

export interface RuleOption {
  value: AutoCompleteRule
  label: string
}

export const DOMAIN_RULES: Record<ActionDomain, RuleOption[]> = {
  exercise: [
    { value: 'any_workout', label: 'Any workout logged' },
    { value: 'cardio_workout', label: 'Cardio workout logged' },
    { value: 'strength_workout', label: 'Strength workout logged' },
  ],
  nutrition: [
    { value: 'any_meal', label: 'Any meal logged' },
    { value: 'all_meals', label: 'All meals logged (3+)' },
    { value: 'breakfast', label: 'Breakfast logged' },
    { value: 'lunch', label: 'Lunch logged' },
    { value: 'dinner', label: 'Dinner logged' },
  ],
  sleep: [
    { value: 'any_sleep', label: 'Sleep entry logged' },
  ],
  emotional: [
    { value: 'any_emotion', label: 'Mood check-in logged' },
  ],
  molecules: [
    { value: 'any_supplement', label: 'Any supplement taken' },
    { value: 'all_supplements', label: 'All supplements taken' },
  ],
}

export const DOMAIN_LABELS: Record<ActionDomain, string> = {
  exercise: 'Exercise',
  nutrition: 'Nutrition',
  sleep: 'Sleep',
  emotional: 'Emotional',
  molecules: 'Molecules',
}
```

**Step 2: Commit**

```bash
git add src/data/actions-rules.ts
git commit -m "feat(actions): add auto-complete rule definitions per domain"
```

---

### Task 5: Notification Badge on Sidebar

**Files:**
- Modify: `src/components/Layout.tsx`

**Context:** Add a red badge with the count of incomplete actions due today on the Dashboard nav item. The badge reads action definitions, computes effective today, filters to due actions, runs auto-complete, and renders the count. The badge hides when count is 0 or no actions are configured.

**Step 1: Add badge to Layout.tsx**

In `src/components/Layout.tsx`:

1. Add imports at top:
```ts
import { getActionDefinitions, getActionSettings, getEffectiveToday, isActionDueOnDate, getCompletedDaysThisWeek } from '../utils/actions-storage'
import { getIncompleteCount } from '../utils/actions-auto-complete'
import { useState, useEffect } from 'react'
```

2. Inside the `Layout` component, before the return, add:
```ts
const [badgeCount, setBadgeCount] = useState(0)

useEffect(() => {
  function updateBadge() {
    const settings = getActionSettings()
    const today = getEffectiveToday(settings.dayResetHour)
    const allActions = getActionDefinitions().filter(a => a.active)
    const dueActions = allActions.filter(a => {
      if (a.frequency.type === 'times_per_week') {
        const completed = getCompletedDaysThisWeek(a.id, today)
        return isActionDueOnDate(a, today, completed)
      }
      return isActionDueOnDate(a, today)
    })
    setBadgeCount(getIncompleteCount(dueActions, today))
  }

  updateBadge()
  // Re-check when window gains focus (user may have logged data on another tab/page)
  window.addEventListener('focus', updateBadge)
  // Re-check on storage events (data logged on same page)
  window.addEventListener('storage', updateBadge)
  // Custom event for in-page updates
  window.addEventListener('healthspan:actions-updated', updateBadge)
  return () => {
    window.removeEventListener('focus', updateBadge)
    window.removeEventListener('storage', updateBadge)
    window.removeEventListener('healthspan:actions-updated', updateBadge)
  }
}, [])
```

3. In the NavLink render, after the icon, add the badge (only for Dashboard):
```tsx
<item.icon size={18} className="flex-shrink-0" />
{item.to === '/dashboard' && badgeCount > 0 && (
  <span className="absolute -top-1 -right-1 lg:relative lg:top-auto lg:right-auto lg:ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
    {badgeCount}
  </span>
)}
```

4. Add `relative` class to the NavLink wrapper so badge can be positioned:
Update the NavLink className to include `relative`:
```tsx
className={({ isActive }) =>
  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
```

**Step 2: Manually verify**

Run: `npx vite dev`
- Navigate to Dashboard
- Confirm no badge shows (no actions configured yet)
- The badge will show once we have the Today tab for adding actions

**Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(actions): add notification badge to Dashboard nav item"
```

---

### Task 6: Today Tab — Empty State + Action List

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Context:** Add "Today" as the first tab (position 0) and make it the default. When no actions exist, show empty state. When actions exist, show the checklist with auto-complete status.

**Step 1: Add imports to Dashboard.tsx**

Add at top of `src/pages/Dashboard.tsx`:
```ts
import {
  getActionDefinitions, getActionSettings, getEffectiveToday,
  isActionDueOnDate, getCompletedDaysThisWeek,
  saveActionDefinition, deleteActionDefinition, saveDailyEntry,
  saveActionSettings,
} from '../utils/actions-storage'
import { runAutoCompleteChecks, type ActionStatus } from '../utils/actions-auto-complete'
import { DOMAIN_RULES, DOMAIN_LABELS } from '../data/actions-rules'
import type { ActionDefinition, ActionDomain, AutoCompleteRule, ActionFrequency } from '../types/actions'
import {
  Plus, Check, MoreVertical, CircleCheck, Dumbbell, Apple, Moon, Brain, Pill,
  Settings2, X, Pencil, Trash2,
} from 'lucide-react'
import { v4 as uuid } from 'uuid'
```

**Step 2: Add the TABS constant update**

Change:
```ts
const TABS = ['Trends', 'Overview', 'Sleep', 'Activity', 'Heart', 'Readiness', 'Resilience']
```
To:
```ts
const TABS = ['Today', 'Trends', 'Overview', 'Sleep', 'Activity', 'Heart', 'Readiness', 'Resilience']
```

Change default tab:
```ts
const [tab, setTab] = useState('Today')
```

**Step 3: Add domain icon mapping**

Add after TABS:
```ts
const DOMAIN_ICONS: Record<ActionDomain, typeof Dumbbell> = {
  exercise: Dumbbell,
  nutrition: Apple,
  sleep: Moon,
  emotional: Brain,
  molecules: Pill,
}
```

**Step 4: Add the renderToday function**

Inside the `Dashboard` component, before the return, add `renderToday`. This is a large block — see full code below.

```tsx
// ─── TODAY TAB ───
const renderToday = () => {
  const [actionStatuses, setActionStatuses] = useState<ActionStatus[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAction, setEditingAction] = useState<ActionDefinition | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const settings = getActionSettings()
  const today = getEffectiveToday(settings.dayResetHour)

  // This is a nested component to keep it self-contained. We need state for the form.
  // Load actions and run auto-complete checks
  const refreshActions = () => {
    const allActions = getActionDefinitions().filter(a => a.active)
    const dueActions = allActions.filter(a => {
      if (a.frequency.type === 'times_per_week') {
        const completed = getCompletedDaysThisWeek(a.id, today)
        return isActionDueOnDate(a, today, completed)
      }
      return isActionDueOnDate(a, today)
    })
    setActionStatuses(runAutoCompleteChecks(dueActions, today))
  }

  // NOTE: This is actually better as a component. See refactored version in step.

  // ...
}
```

**IMPORTANT:** Due to the complexity of React hooks in a render function, the Today tab should be extracted as a separate component `TodayTab` within Dashboard.tsx. This avoids hook rule violations.

Create `TodayTab` as a component inside Dashboard.tsx (before the `Dashboard` default export):

```tsx
function TodayTab() {
  const [actionStatuses, setActionStatuses] = useState<ActionStatus[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAction, setEditingAction] = useState<ActionDefinition | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const settings = getActionSettings()
  const today = getEffectiveToday(settings.dayResetHour)

  const refreshActions = useCallback(() => {
    const allActions = getActionDefinitions().filter(a => a.active)
    const dueActions = allActions.filter(a => {
      if (a.frequency.type === 'times_per_week') {
        const completed = getCompletedDaysThisWeek(a.id, today)
        return isActionDueOnDate(a, today, completed)
      }
      return isActionDueOnDate(a, today)
    })
    setActionStatuses(runAutoCompleteChecks(dueActions, today))
  }, [today])

  useEffect(() => {
    refreshActions()
    window.addEventListener('focus', refreshActions)
    return () => window.removeEventListener('focus', refreshActions)
  }, [refreshActions])

  const handleToggle = (actionId: string, currentCompleted: boolean) => {
    saveDailyEntry({
      actionId,
      date: today,
      completed: !currentCompleted,
      completedAt: !currentCompleted ? new Date().toISOString() : undefined,
      autoCompleted: false,
    })
    refreshActions()
    window.dispatchEvent(new Event('healthspan:actions-updated'))
  }

  const handleSave = (def: ActionDefinition) => {
    saveActionDefinition(def)
    setShowForm(false)
    setEditingAction(null)
    refreshActions()
    window.dispatchEvent(new Event('healthspan:actions-updated'))
  }

  const handleDelete = (id: string) => {
    deleteActionDefinition(id)
    setMenuOpen(null)
    refreshActions()
    window.dispatchEvent(new Event('healthspan:actions-updated'))
  }

  const completed = actionStatuses.filter(s => s.completed).length
  const total = actionStatuses.length
  const allActions = getActionDefinitions()

  // Format today's date nicely
  const todayDate = new Date(today + 'T12:00:00')
  const dateStr = todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Empty state
  if (allActions.length === 0 && !showForm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
          <CircleCheck size={28} className="text-brand-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Set up your daily actions</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Create a daily checklist to stay on track. Actions can auto-complete when you log data in other sections.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Add your first action
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[13px] text-slate-400">{dateStr}</div>
          {total > 0 && (
            <div className="text-sm text-slate-500 mt-0.5">
              <span className="text-emerald-400 font-semibold">{completed}</span> of {total} complete
            </div>
          )}
        </div>
        {/* Reset hour setting */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-500">Day resets at:</label>
          <select
            value={settings.dayResetHour}
            onChange={e => {
              saveActionSettings({ ...settings, dayResetHour: Number(e.target.value) })
              refreshActions()
              window.dispatchEvent(new Event('healthspan:actions-updated'))
            }}
            className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-xs text-gray-300"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}

      {/* Action cards */}
      <div className="space-y-2">
        {actionStatuses.map(({ action, completed: isDone, autoCompleted }) => {
          const DomainIcon = action.domain ? DOMAIN_ICONS[action.domain] : CircleCheck
          return (
            <div
              key={action.id}
              className={`flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3.5 transition-all ${
                isDone ? 'opacity-50' : ''
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(action.id, isDone)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-600 hover:border-slate-400'
                }`}
              >
                {isDone && <Check size={14} className="text-white" />}
              </button>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isDone ? 'text-slate-500 line-through' : 'text-gray-200'}`}>
                  {action.label}
                </div>
                {autoCompleted && isDone && (
                  <span className="inline-block mt-0.5 text-[9px] tracking-wider uppercase text-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    auto
                  </span>
                )}
              </div>

              {/* Domain icon */}
              <DomainIcon size={16} className="text-slate-600 flex-shrink-0" />

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === action.id ? null : action.id)}
                  className="p-1 rounded hover:bg-white/10 text-slate-600 hover:text-slate-400"
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen === action.id && (
                  <div className="absolute right-0 top-8 z-10 bg-[#1a1d2e] border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px]">
                    <button
                      onClick={() => { setEditingAction(action); setShowForm(true); setMenuOpen(null) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(action.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => { setEditingAction(null); setShowForm(true) }}
          className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-lg border border-dashed border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20 text-sm transition-colors w-full justify-center"
        >
          <Plus size={16} />
          Add action
        </button>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <ActionForm
          initial={editingAction}
          nextSortOrder={allActions.length}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingAction(null) }}
        />
      )}
    </>
  )
}
```

**Step 5: Wire Today tab into Dashboard render**

In the return of `Dashboard`, add before `{tab === 'Trends' && renderTrends()}`:
```tsx
{tab === 'Today' && <TodayTab />}
```

**Step 6: Verify**

Run: `npx vite dev`
- Dashboard should default to "Today" tab
- Empty state should show with "Add your first action" button

**Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(actions): add Today tab with action list, toggle, and empty state"
```

---

### Task 7: Action Add/Edit Form Component

**Files:**
- Modify: `src/pages/Dashboard.tsx` (add `ActionForm` component)

**Context:** The `ActionForm` is used by `TodayTab` for both creating and editing actions. It renders inline below the action list.

**Step 1: Add ActionForm component**

Add before `TodayTab` in Dashboard.tsx:

```tsx
interface ActionFormProps {
  initial: ActionDefinition | null
  nextSortOrder: number
  onSave: (def: ActionDefinition) => void
  onCancel: () => void
}

function ActionForm({ initial, nextSortOrder, onSave, onCancel }: ActionFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [domain, setDomain] = useState<ActionDomain | ''>(initial?.domain ?? '')
  const [rule, setRule] = useState<AutoCompleteRule | ''>(initial?.autoCompleteRule ?? '')
  const [freqType, setFreqType] = useState<ActionFrequency['type']>(initial?.frequency.type ?? 'daily')
  const [specificDays, setSpecificDays] = useState<number[]>(
    initial?.frequency.type === 'specific_days' ? initial.frequency.days : []
  )
  const [timesPerWeek, setTimesPerWeek] = useState(
    initial?.frequency.type === 'times_per_week' ? initial.frequency.count : 3
  )

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const buildFrequency = (): ActionFrequency => {
    switch (freqType) {
      case 'daily': return { type: 'daily' }
      case 'weekdays': return { type: 'weekdays' }
      case 'specific_days': return { type: 'specific_days', days: specificDays }
      case 'times_per_week': return { type: 'times_per_week', count: timesPerWeek }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return

    onSave({
      id: initial?.id ?? uuid(),
      label: label.trim(),
      frequency: buildFrequency(),
      domain: domain || undefined,
      autoCompleteRule: (domain && rule) ? rule as AutoCompleteRule : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      active: true,
      sortOrder: initial?.sortOrder ?? nextSortOrder,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{initial ? 'Edit Action' : 'New Action'}</h3>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300">
          <X size={16} />
        </button>
      </div>

      {/* Label */}
      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Label</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g., Log a workout, Meditate 10 min"
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
          autoFocus
        />
      </div>

      {/* Domain */}
      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Link to domain (optional)</label>
        <select
          value={domain}
          onChange={e => { setDomain(e.target.value as ActionDomain | ''); setRule('') }}
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        >
          <option value="">None (manual checkoff)</option>
          {(Object.keys(DOMAIN_LABELS) as ActionDomain[]).map(d => (
            <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
          ))}
        </select>
      </div>

      {/* Auto-complete rule */}
      {domain && (
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider">Auto-complete when</label>
          <select
            value={rule}
            onChange={e => setRule(e.target.value as AutoCompleteRule)}
            className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
          >
            <option value="">Manual checkoff only</option>
            {DOMAIN_RULES[domain as ActionDomain]?.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Frequency */}
      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Frequency</label>
        <select
          value={freqType}
          onChange={e => setFreqType(e.target.value as ActionFrequency['type'])}
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        >
          <option value="daily">Every day</option>
          <option value="weekdays">Weekdays (Mon–Fri)</option>
          <option value="specific_days">Specific days</option>
          <option value="times_per_week">X times per week</option>
        </select>
      </div>

      {/* Specific days picker */}
      {freqType === 'specific_days' && (
        <div className="flex gap-1.5">
          {dayNames.map((name, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSpecificDays(prev =>
                prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort()
              )}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                specificDays.includes(i)
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Times per week */}
      {freqType === 'times_per_week' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={7}
            value={timesPerWeek}
            onChange={e => setTimesPerWeek(Number(e.target.value))}
            className="w-16 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
          />
          <span className="text-sm text-slate-400">times per week</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!label.trim()}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors"
        >
          {initial ? 'Save Changes' : 'Add Action'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 text-sm hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

**Step 2: Add `useCallback` to imports**

Update the React import at top of Dashboard.tsx:
```ts
import { useState, useMemo, useCallback, useEffect } from 'react'
```

**Step 3: Verify**

Run: `npx vite dev`
- Click "Add your first action"
- Fill out form with label "Log a workout"
- Select domain "Exercise", rule "Any workout logged", frequency "Daily"
- Click "Add Action" — card should appear
- Check the checkbox — should toggle
- Click "..." menu — Edit and Delete should work
- Badge should appear on Dashboard nav with count "1"

**Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(actions): add action form for create/edit with domain linking"
```

---

### Task 8: Demo Data for Actions

**Files:**
- Modify: `src/utils/demo-data.ts`

**Context:** When generating demo data for a persona, also create default actions with completion patterns. Each persona should have actions that match their tracking habits.

**Step 1: Add action generation to demo data**

At the top of `demo-data.ts`, add imports:
```ts
import type { ActionDefinition, DailyActionEntry } from '../types/actions'
```

Add a function `generateDemoActions` that:
1. Creates 5-7 action definitions per persona (exercise, nutrition, sleep, emotional, molecules + 1-2 custom)
2. Generates completion entries for the last 90 days based on persona's adherence patterns
3. Stores them using `localStorage.setItem` directly (matching existing demo-data patterns)

```ts
function generateDemoActions(persona: DemoPersona): void {
  const actions: ActionDefinition[] = [
    { id: 'demo-workout', label: 'Log a workout', frequency: { type: 'times_per_week', count: persona.traits.exercise?.workoutsPerWeek ?? 4 }, domain: 'exercise', autoCompleteRule: 'any_workout', createdAt: new Date().toISOString(), active: true, sortOrder: 0 },
    { id: 'demo-meals', label: 'Log all meals', frequency: { type: 'daily' }, domain: 'nutrition', autoCompleteRule: 'all_meals', createdAt: new Date().toISOString(), active: true, sortOrder: 1 },
    { id: 'demo-sleep', label: 'Log sleep', frequency: { type: 'daily' }, domain: 'sleep', autoCompleteRule: 'any_sleep', createdAt: new Date().toISOString(), active: true, sortOrder: 2 },
    { id: 'demo-mood', label: 'Mood check-in', frequency: { type: 'daily' }, domain: 'emotional', autoCompleteRule: 'any_emotion', createdAt: new Date().toISOString(), active: true, sortOrder: 3 },
    { id: 'demo-supplements', label: 'Take all supplements', frequency: { type: 'daily' }, domain: 'molecules', autoCompleteRule: 'all_supplements', createdAt: new Date().toISOString(), active: true, sortOrder: 4 },
    { id: 'demo-hydrate', label: 'Drink 8 glasses of water', frequency: { type: 'daily' }, createdAt: new Date().toISOString(), active: true, sortOrder: 5 },
  ]

  localStorage.setItem('healthspan:actions:definitions', JSON.stringify(actions))
  localStorage.setItem('healthspan:actions:settings', JSON.stringify({ dayResetHour: 0 }))

  // Note: Auto-complete actions will be detected from existing demo domain data.
  // Only need to generate entries for custom (non-domain) actions.
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    // Hydration — ~80% adherence
    if (Math.random() < 0.8) {
      const entries: DailyActionEntry[] = [{
        actionId: 'demo-hydrate',
        date: dateStr,
        completed: true,
        completedAt: `${dateStr}T18:00:00Z`,
        autoCompleted: false,
      }]
      localStorage.setItem(`healthspan:actions:entries:${dateStr}`, JSON.stringify(entries))
    }
  }
}
```

Call `generateDemoActions(persona)` at the end of `generateAllDemoData`.

**Step 2: Add actions cleanup to clearDemoData**

In the `clearDemoData` function, add cleanup for action storage keys. Since entries are date-keyed, use a loop or clear all `healthspan:actions:` prefixed keys.

**Step 3: Run existing demo data tests**

Run: `npx vitest run src/utils/demo-data.test.ts`
Expected: PASS (or update tests if they check localStorage key counts)

**Step 4: Verify manually**

Run: `npx vite dev`
- Go to Settings, load any demo persona
- Navigate to Dashboard — Today tab should show 6 actions
- Domain-linked actions should auto-complete based on demo data
- Hydration action should show as manually completed for most days

**Step 5: Commit**

```bash
git add src/utils/demo-data.ts
git commit -m "feat(actions): add demo data generation for daily actions"
```

---

### Task 9: Final Integration + Manual Testing

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Build check**

Run: `npx vite build`
Expected: No TypeScript errors, build succeeds

**Step 3: End-to-end manual verification**

1. Fresh state: Dashboard shows "Today" tab by default with empty state
2. Add a custom action "Meditate" (daily, no domain) — appears in list, badge shows "1"
3. Add a domain action "Log a workout" (exercise, any_workout, daily) — badge shows "2"
4. Check "Meditate" manually — badge drops to "1", card dims with strikethrough
5. Navigate to Exercise, log a workout — navigate back, "Log a workout" auto-completes with "auto" badge
6. Badge now shows "0" and disappears
7. Demo mode: load a persona, Today tab populated with 6 actions, auto-complete working
8. Edit an action — verify changes persist
9. Delete an action — verify removed from list and badge updates
10. Change reset hour — verify count recalculates

**Step 4: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix(actions): address integration issues from manual testing"
```

---

### Summary of files

| File | Action |
|------|--------|
| `src/types/actions.ts` | Create |
| `src/types/actions.test.ts` | Create |
| `src/utils/actions-storage.ts` | Create |
| `src/utils/actions-storage.test.ts` | Create |
| `src/utils/actions-auto-complete.ts` | Create |
| `src/utils/actions-auto-complete.test.ts` | Create |
| `src/data/actions-rules.ts` | Create |
| `src/pages/Dashboard.tsx` | Modify — add Today tab, TodayTab component, ActionForm component |
| `src/components/Layout.tsx` | Modify — add notification badge |
| `src/utils/demo-data.ts` | Modify — add demo action generation |
