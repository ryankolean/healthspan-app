import {
  getEmotionalEntries,
  saveEmotionalEntry,
  deleteEmotionalEntry,
  getEntryByDate,
  getAllEntriesRaw,
} from './emotional-storage'
import type { EmotionalEntry } from '../types/emotional'

const makeEntry = (overrides: Partial<EmotionalEntry> = {}): EmotionalEntry => ({
  id: 'e1',
  source: 'manual',
  date: '2026-03-01',
  mood: 4,
  stress: 2,
  anxiety: 1,
  energy: 5,
  createdAt: Date.now(),
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('getEmotionalEntries / getAllEntriesRaw', () => {
  it('returns empty array when nothing stored', () => {
    expect(getEmotionalEntries()).toEqual([])
  })

  it('returns all stored entries', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', date: '2026-03-02' })]
    localStorage.setItem('healthspan:emotional:entries', JSON.stringify(entries))
    expect(getAllEntriesRaw()).toHaveLength(2)
  })

  it('filters by date range', () => {
    const entries = [
      makeEntry({ id: 'old', date: '2026-01-01' }),
      makeEntry({ id: 'new', date: '2026-03-01' }),
    ]
    localStorage.setItem('healthspan:emotional:entries', JSON.stringify(entries))
    expect(getEmotionalEntries({ from: '2026-02-01', to: '2026-04-01' })).toHaveLength(1)
    expect(getEmotionalEntries({ from: '2026-02-01', to: '2026-04-01' })[0].id).toBe('new')
  })
})

describe('saveEmotionalEntry', () => {
  it('saves a new entry', () => {
    saveEmotionalEntry(makeEntry())
    expect(getEmotionalEntries()).toHaveLength(1)
    expect(getEmotionalEntries()[0].id).toBe('e1')
  })

  it('upserts by date — replaces existing entry for same date', () => {
    saveEmotionalEntry(makeEntry({ id: 'first', date: '2026-03-01', mood: 3 }))
    saveEmotionalEntry(makeEntry({ id: 'second', date: '2026-03-01', mood: 5 }))
    const entries = getEmotionalEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('second')
    expect(entries[0].mood).toBe(5)
  })

  it('allows multiple entries for different dates', () => {
    saveEmotionalEntry(makeEntry({ id: 'a', date: '2026-03-01' }))
    saveEmotionalEntry(makeEntry({ id: 'b', date: '2026-03-02' }))
    expect(getEmotionalEntries()).toHaveLength(2)
  })
})

describe('deleteEmotionalEntry', () => {
  it('removes entry by id', () => {
    saveEmotionalEntry(makeEntry({ id: 'a', date: '2026-03-01' }))
    saveEmotionalEntry(makeEntry({ id: 'b', date: '2026-03-02' }))
    deleteEmotionalEntry('a')
    const entries = getEmotionalEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('b')
  })

  it('is a no-op for non-existent id', () => {
    saveEmotionalEntry(makeEntry())
    deleteEmotionalEntry('nonexistent')
    expect(getEmotionalEntries()).toHaveLength(1)
  })
})

describe('getEntryByDate', () => {
  it('returns entry for given date', () => {
    saveEmotionalEntry(makeEntry({ id: 'a', date: '2026-03-01' }))
    const entry = getEntryByDate('2026-03-01')
    expect(entry).not.toBeNull()
    expect(entry!.id).toBe('a')
  })

  it('returns null when no entry exists for date', () => {
    expect(getEntryByDate('2026-03-01')).toBeNull()
  })
})
