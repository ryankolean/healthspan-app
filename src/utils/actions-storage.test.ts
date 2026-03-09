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
