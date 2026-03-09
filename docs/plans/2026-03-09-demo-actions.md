# Demo Actions Data — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend demo mode to generate persona-specific daily actions with realistic 90-day completion histories and a partially-done "today" view.

**Architecture:** Add `actionAdherence` and `extraActions` to `PersonaTraits`, then rewrite `generateDemoActions()` to create persona-specific action definitions and 90 days of completion entries. Domain-linked actions auto-complete from existing demo data; custom actions use probabilistic generation.

**Tech Stack:** TypeScript 5.6, Vitest, localStorage

---

### Task 1: Add new traits to PersonaTraits and persona definitions

**Files:**
- Modify: `src/utils/demo-data.ts:21-39` (PersonaTraits interface)
- Modify: `src/utils/demo-data.ts:50-204` (persona definitions)
- Test: `src/utils/demo-data.test.ts`

**Step 1: Write the failing test**

Add to `src/utils/demo-data.test.ts` inside the `DEMO_PERSONAS` describe block:

```typescript
it('all personas have actionAdherence between 0 and 1', () => {
  for (const p of DEMO_PERSONAS) {
    expect(p.traits.actionAdherence).toBeGreaterThanOrEqual(0)
    expect(p.traits.actionAdherence).toBeLessThanOrEqual(1)
  }
})

it('all personas have extraActions array', () => {
  for (const p of DEMO_PERSONAS) {
    expect(Array.isArray(p.traits.extraActions)).toBe(true)
    expect(p.traits.extraActions!.length).toBeGreaterThanOrEqual(2)
  }
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/demo-data.test.ts --reporter=verbose`
Expected: FAIL — `actionAdherence` is undefined on all personas

**Step 3: Add traits to PersonaTraits interface**

In `src/utils/demo-data.ts`, add to the `PersonaTraits` interface (after `supplementCount`):

```typescript
actionAdherence?: number
extraActions?: { label: string; frequency: ActionFrequency }[]
```

Also add the import at the top of the file:

```typescript
import type { ActionDefinition, DailyActionEntry, ActionFrequency } from '../types/actions'
```

(Replace the existing `ActionDefinition, DailyActionEntry` import — just add `ActionFrequency`.)

**Step 4: Add trait values to each persona definition**

Add these fields to each persona's `traits` object:

**elite-athlete:**
```typescript
actionAdherence: 0.95,
extraActions: [
  { label: 'Zone 2 cardio session', frequency: { type: 'times_per_week', count: 3 } },
  { label: 'Stretch/mobility', frequency: { type: 'daily' } },
],
```

**hypertension-risk:**
```typescript
actionAdherence: 0.55,
extraActions: [
  { label: 'Walk 10,000 steps', frequency: { type: 'daily' } },
  { label: 'Blood pressure check', frequency: { type: 'weekdays' } },
],
```

**college-athlete:**
```typescript
actionAdherence: 0.70,
extraActions: [
  { label: 'Team practice', frequency: { type: 'weekdays' } },
  { label: 'Recovery ice bath', frequency: { type: 'times_per_week', count: 2 } },
],
```

**metabolic-syndrome:**
```typescript
actionAdherence: 0.45,
extraActions: [
  { label: 'Walk after meals', frequency: { type: 'daily' } },
  { label: 'Blood glucose check', frequency: { type: 'daily' } },
],
```

**postpartum-recovery:**
```typescript
actionAdherence: 0.75,
extraActions: [
  { label: 'Pelvic floor exercises', frequency: { type: 'daily' } },
  { label: 'Walk with baby', frequency: { type: 'daily' } },
],
```

**longevity-optimized:**
```typescript
actionAdherence: 0.92,
extraActions: [
  { label: 'Rapamycin protocol', frequency: { type: 'specific_days', days: [1] } },
  { label: 'Sauna session', frequency: { type: 'times_per_week', count: 3 } },
],
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/utils/demo-data.test.ts --reporter=verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add src/utils/demo-data.ts src/utils/demo-data.test.ts
git commit -m "feat(demo): add actionAdherence and extraActions traits to all personas"
```

---

### Task 2: Rewrite generateDemoActions to use traits

**Files:**
- Modify: `src/utils/demo-data.ts:795-823` (generateDemoActions function)
- Test: `src/utils/demo-data.test.ts`

**Step 1: Write the failing tests**

Add a new describe block to `src/utils/demo-data.test.ts`:

```typescript
import { getActionDefinitions, getDailyEntries } from './actions-storage'

describe('demo actions quality', () => {
  it('generates core actions plus persona extras', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const actions = getActionDefinitions()
    // 6 core + 2 extras
    expect(actions).toHaveLength(8)
    expect(actions.find(a => a.label === 'Zone 2 cardio session')).toBeDefined()
    expect(actions.find(a => a.label === 'Stretch/mobility')).toBeDefined()
  })

  it('generates completion entries for custom actions over 90 days', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    // Check a day from the past has entries
    const daysAgo30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const entries = getDailyEntries(daysAgo30)
    // Should have some entries (custom actions completed based on adherence)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('high-adherence persona has more completions than low-adherence', () => {
    // Elite athlete (0.95)
    const elite = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(elite)
    const eliteDay = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
    const eliteEntries = getDailyEntries(eliteDay).filter(e => e.completed)
    const eliteCount = eliteEntries.length

    localStorage.clear()

    // Metabolic syndrome (0.45)
    const metSyn = DEMO_PERSONAS.find(p => p.id === 'metabolic-syndrome')!
    generateAllDemoData(metSyn)
    // Check across 10 days to smooth out randomness
    let metTotal = 0
    let eliteTotal = 0
    for (let i = 20; i < 30; i++) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      metTotal += getDailyEntries(day).filter(e => e.completed).length
    }

    localStorage.clear()
    generateAllDemoData(elite)
    for (let i = 20; i < 30; i++) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      eliteTotal += getDailyEntries(day).filter(e => e.completed).length
    }

    expect(eliteTotal).toBeGreaterThan(metTotal)
  })

  it('today has some completed and some incomplete entries for partial feel', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const today = new Date().toISOString().slice(0, 10)
    const entries = getDailyEntries(today)
    const completed = entries.filter(e => e.completed)
    const incomplete = entries.filter(e => !e.completed)
    // Should have at least one of each
    expect(completed.length).toBeGreaterThan(0)
    expect(incomplete.length).toBeGreaterThan(0)
  })

  it('extra action ids are unique and prefixed with demo-extra-', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const actions = getActionDefinitions()
    const extraActions = actions.filter(a => a.id.startsWith('demo-extra-'))
    expect(extraActions).toHaveLength(2)
    const ids = actions.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('college-athlete has lower weekend adherence', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'college-athlete')!
    generateAllDemoData(persona)

    let weekdayCompleted = 0
    let weekdayTotal = 0
    let weekendCompleted = 0
    let weekendTotal = 0

    for (let i = 1; i < 60; i++) {
      const d = new Date(Date.now() - i * 86400000)
      const day = d.toISOString().slice(0, 10)
      const dow = d.getDay()
      const entries = getDailyEntries(day).filter(e => e.completed)
      if (dow === 0 || dow === 6) {
        weekendCompleted += entries.length
        weekendTotal++
      } else {
        weekdayCompleted += entries.length
        weekdayTotal++
      }
    }

    const weekdayRate = weekdayCompleted / weekdayTotal
    const weekendRate = weekendCompleted / weekendTotal
    expect(weekdayRate).toBeGreaterThan(weekendRate)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/demo-data.test.ts --reporter=verbose`
Expected: FAIL — current function only generates 6 actions with hydrate entries only

**Step 3: Rewrite generateDemoActions**

Replace the entire `generateDemoActions` function in `src/utils/demo-data.ts` (lines 795-823) with:

```typescript
function generateDemoActions(traits: PersonaTraits): void {
  const adherence = traits.actionAdherence ?? 0.8
  const extras = traits.extraActions ?? []

  // Core 6 actions (same as before)
  const actions: ActionDefinition[] = [
    { id: 'demo-workout', label: 'Log a workout', frequency: { type: 'times_per_week', count: traits.workoutsPerWeek ?? 4 }, domain: 'exercise', autoCompleteRule: 'any_workout', createdAt: new Date().toISOString(), active: true, sortOrder: 0 },
    { id: 'demo-meals', label: 'Log all meals', frequency: { type: 'daily' }, domain: 'nutrition', autoCompleteRule: 'all_meals', createdAt: new Date().toISOString(), active: true, sortOrder: 1 },
    { id: 'demo-sleep', label: 'Log sleep', frequency: { type: 'daily' }, domain: 'sleep', autoCompleteRule: 'any_sleep', createdAt: new Date().toISOString(), active: true, sortOrder: 2 },
    { id: 'demo-mood', label: 'Mood check-in', frequency: { type: 'daily' }, domain: 'emotional', autoCompleteRule: 'any_emotion', createdAt: new Date().toISOString(), active: true, sortOrder: 3 },
    { id: 'demo-supplements', label: 'Take all supplements', frequency: { type: 'daily' }, domain: 'molecules', autoCompleteRule: 'all_supplements', createdAt: new Date().toISOString(), active: true, sortOrder: 4 },
    { id: 'demo-hydrate', label: 'Drink 8 glasses of water', frequency: { type: 'daily' }, createdAt: new Date().toISOString(), active: true, sortOrder: 5 },
  ]

  // Add persona-specific extra actions
  extras.forEach((extra, i) => {
    actions.push({
      id: `demo-extra-${i}`,
      label: extra.label,
      frequency: extra.frequency,
      createdAt: new Date().toISOString(),
      active: true,
      sortOrder: 6 + i,
    })
  })

  localStorage.setItem('healthspan:actions:definitions', JSON.stringify(actions))
  localStorage.setItem('healthspan:actions:settings', JSON.stringify({ dayResetHour: 0 }))

  // Identify custom actions (no autoCompleteRule — these need manual entries)
  const customActions = actions.filter(a => !a.autoCompleteRule)

  // "Morning" actions that should show completed today (domain-linked)
  const morningActionIds = new Set(['demo-sleep', 'demo-supplements', 'demo-mood'])

  for (let i = 0; i < 90; i++) {
    const day = dateStr(i)
    const isToday = i === 0
    const d = new Date(Date.now() - i * 86400000)
    const dow = d.getDay() // 0=Sun..6=Sat
    const isWeekend = dow === 0 || dow === 6

    // Slight upward trend: adherence improves as days get more recent
    const trendBoost = (90 - i) / 90 * 0.05 // up to +0.05 for most recent day
    const dayAdherence = Math.min(1, adherence + trendBoost)

    // College-athlete weekend penalty
    const effectiveAdherence = (isWeekend && traits.extraActions?.some(e => e.label === 'Team practice'))
      ? dayAdherence * 0.8
      : dayAdherence

    const entries: DailyActionEntry[] = []

    for (const action of customActions) {
      // Check if action is due on this day
      if (!isDueOnDay(action, dow)) continue

      // For times_per_week, simple probabilistic approach
      if (action.frequency.type === 'times_per_week') {
        const weeklyProb = action.frequency.count / 7
        if (Math.random() > weeklyProb * (effectiveAdherence / 0.8)) continue
      }

      if (isToday) {
        // Today: mark as incomplete (afternoon/evening custom actions not done yet)
        entries.push({
          actionId: action.id,
          date: day,
          completed: false,
          autoCompleted: false,
        })
      } else {
        // Historical: complete based on adherence probability
        const completed = Math.random() < effectiveAdherence
        if (completed) {
          entries.push({
            actionId: action.id,
            date: day,
            completed: true,
            completedAt: `${day}T${jitter(16, 4).toString().padStart(2, '0')}:00:00Z`,
            autoCompleted: false,
          })
        }
      }
    }

    // Today: also create entries for "morning" domain-linked actions to show partial progress
    if (isToday) {
      for (const actionId of morningActionIds) {
        entries.push({
          actionId,
          date: day,
          completed: true,
          completedAt: `${day}T08:00:00Z`,
          autoCompleted: true,
        })
      }
      // Also add incomplete entries for afternoon domain actions
      entries.push({
        actionId: 'demo-workout',
        date: day,
        completed: false,
        autoCompleted: false,
      })
      entries.push({
        actionId: 'demo-meals',
        date: day,
        completed: false,
        autoCompleted: false,
      })
    }

    if (entries.length > 0) {
      // Merge with any existing entries for this day (e.g. from other generators)
      const existingRaw = localStorage.getItem(`healthspan:actions:entries:${day}`)
      const existing: DailyActionEntry[] = existingRaw ? JSON.parse(existingRaw) : []
      const existingIds = new Set(existing.map(e => e.actionId))
      const merged = [...existing, ...entries.filter(e => !existingIds.has(e.actionId))]
      localStorage.setItem(`healthspan:actions:entries:${day}`, JSON.stringify(merged))
    }
  }
}

/** Check if an action is due on a given day-of-week (0=Sun..6=Sat) */
function isDueOnDay(action: ActionDefinition, dow: number): boolean {
  switch (action.frequency.type) {
    case 'daily': return true
    case 'weekdays': return dow >= 1 && dow <= 5
    case 'specific_days': return action.frequency.days.includes(dow)
    case 'times_per_week': return true // handled probabilistically
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/demo-data.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Run full test suite and TypeScript check**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All tests pass, zero TS errors

**Step 6: Commit**

```bash
git add src/utils/demo-data.ts src/utils/demo-data.test.ts
git commit -m "feat(demo): generate persona-specific actions with adherence-based completion history"
```

---

### Task 3: Verify end-to-end with all personas

**Files:**
- Test: `src/utils/demo-data.test.ts`

**Step 1: Add cross-persona test**

Add to `demo actions quality` describe block:

```typescript
it('all personas generate valid action data without errors', () => {
  for (const persona of DEMO_PERSONAS) {
    localStorage.clear()
    generateAllDemoData(persona)
    const actions = getActionDefinitions()
    expect(actions.length).toBeGreaterThanOrEqual(8) // 6 core + 2+ extras
    // Verify all action ids are unique
    const ids = actions.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    // Verify today has entries
    const today = new Date().toISOString().slice(0, 10)
    const todayEntries = getDailyEntries(today)
    expect(todayEntries.length).toBeGreaterThan(0)
  }
})
```

**Step 2: Run tests**

Run: `npx vitest run src/utils/demo-data.test.ts --reporter=verbose`
Expected: PASS

**Step 3: Run full test suite + TypeScript + build**

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: All pass, zero errors, build succeeds

**Step 4: Commit**

```bash
git add src/utils/demo-data.test.ts
git commit -m "test(demo): add cross-persona validation for demo actions"
```
