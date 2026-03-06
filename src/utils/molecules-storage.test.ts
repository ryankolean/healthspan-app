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

    const result = getDailyAdherence('2026-03-01')
    expect(result.taken).toBe(1)
    expect(result.total).toBe(2)
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
