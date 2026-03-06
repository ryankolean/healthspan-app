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
