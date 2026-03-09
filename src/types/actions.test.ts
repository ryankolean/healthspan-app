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
