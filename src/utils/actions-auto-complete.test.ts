// src/utils/actions-auto-complete.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { runAutoCompleteChecks, getIncompleteCount } from './actions-auto-complete'
import { saveDailyEntry } from './actions-storage'
import type { ActionDefinition } from '../types/actions'

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
