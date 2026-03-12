import { describe, it, expect } from 'vitest'
import type { BodyCompEntry } from '../types/body-composition'
import {
  getBodyCompEntries,
  saveBodyCompEntry,
  deleteBodyCompEntry,
  getLatestEntry,
  getCurrentWeightKg,
  calculateBMI,
} from './body-composition-storage'

function makeEntry(overrides: Partial<BodyCompEntry> = {}): BodyCompEntry {
  return {
    id: 'e1',
    date: '2026-03-10',
    weightKg: 80,
    ...overrides,
  }
}

describe('body-composition-storage', () => {
  describe('getBodyCompEntries', () => {
    it('returns empty array when none exist', () => {
      expect(getBodyCompEntries()).toEqual([])
    })

    it('returns entries sorted by date descending', () => {
      saveBodyCompEntry(makeEntry({ id: 'a', date: '2026-03-08' }))
      saveBodyCompEntry(makeEntry({ id: 'b', date: '2026-03-10' }))
      saveBodyCompEntry(makeEntry({ id: 'c', date: '2026-03-09' }))

      const entries = getBodyCompEntries()
      expect(entries.map(e => e.date)).toEqual([
        '2026-03-10',
        '2026-03-09',
        '2026-03-08',
      ])
    })
  })

  describe('saveBodyCompEntry', () => {
    it('saves and retrieves an entry', () => {
      const entry = makeEntry()
      saveBodyCompEntry(entry)

      const entries = getBodyCompEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('e1')
      expect(entries[0].weightKg).toBe(80)
    })

    it('auto-calculates leanMassKg when bodyFatPct provided', () => {
      saveBodyCompEntry(makeEntry({ weightKg: 80, bodyFatPct: 20 }))

      const entries = getBodyCompEntries()
      expect(entries[0].leanMassKg).toBe(64)
    })

    it('does NOT set leanMassKg when bodyFatPct not provided', () => {
      saveBodyCompEntry(makeEntry({ weightKg: 80 }))

      const entries = getBodyCompEntries()
      expect(entries[0].leanMassKg).toBeUndefined()
    })

    it('replaces entry with same id (upsert behavior)', () => {
      saveBodyCompEntry(makeEntry({ id: 'x', weightKg: 80 }))
      saveBodyCompEntry(makeEntry({ id: 'x', weightKg: 85 }))

      const entries = getBodyCompEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].weightKg).toBe(85)
    })
  })

  describe('deleteBodyCompEntry', () => {
    it('removes entry by id', () => {
      saveBodyCompEntry(makeEntry({ id: 'a' }))
      saveBodyCompEntry(makeEntry({ id: 'b' }))

      deleteBodyCompEntry('a')

      const entries = getBodyCompEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('b')
    })
  })

  describe('getLatestEntry', () => {
    it('returns null when empty', () => {
      expect(getLatestEntry()).toBeNull()
    })

    it('returns most recent entry by date', () => {
      saveBodyCompEntry(makeEntry({ id: 'old', date: '2026-03-01' }))
      saveBodyCompEntry(makeEntry({ id: 'new', date: '2026-03-10' }))

      expect(getLatestEntry()?.id).toBe('new')
    })
  })

  describe('getCurrentWeightKg', () => {
    it('returns latest body comp weight', () => {
      saveBodyCompEntry(makeEntry({ weightKg: 82 }))
      expect(getCurrentWeightKg()).toBe(82)
    })

    it('falls back to profile healthspan:userWeight', () => {
      localStorage.setItem('healthspan:userWeight', '75')
      expect(getCurrentWeightKg()).toBe(75)
    })

    it('returns null when nothing available', () => {
      expect(getCurrentWeightKg()).toBeNull()
    })
  })

  describe('calculateBMI', () => {
    it('returns correct BMI (80kg, 180cm = 24.69)', () => {
      expect(calculateBMI(80, 180)).toBe(24.69)
    })

    it('returns null for 0 height', () => {
      expect(calculateBMI(80, 0)).toBeNull()
    })

    it('returns null for 0 weight', () => {
      expect(calculateBMI(0, 180)).toBeNull()
    })
  })
})
