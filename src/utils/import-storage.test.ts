import { getImportHistory, addImportRecord, clearImportHistory, getLastImportForSource } from './import-storage'
import type { ImportRecord } from './import-storage'

beforeEach(() => localStorage.clear())

describe('import-storage', () => {
  it('returns empty array when no imports', () => {
    expect(getImportHistory()).toEqual([])
  })

  it('saves and retrieves an import record', () => {
    const record: ImportRecord = {
      id: 'test-1',
      sourceId: 'withings-scale',
      importedAt: '2026-03-13T10:00:00Z',
      recordCount: 42,
      domains: ['body-composition'],
      dateRange: { from: '2025-12-01', to: '2026-03-13' },
    }
    addImportRecord(record)
    const history = getImportHistory()
    expect(history).toHaveLength(1)
    expect(history[0].sourceId).toBe('withings-scale')
    expect(history[0].recordCount).toBe(42)
  })

  it('sorts by importedAt descending', () => {
    addImportRecord({ id: 'a', sourceId: 'oura', importedAt: '2026-03-01T00:00:00Z', recordCount: 10, domains: ['sleep'], dateRange: { from: '2026-02-01', to: '2026-03-01' } })
    addImportRecord({ id: 'b', sourceId: 'strava', importedAt: '2026-03-10T00:00:00Z', recordCount: 5, domains: ['exercise'], dateRange: { from: '2026-02-01', to: '2026-03-10' } })
    const history = getImportHistory()
    expect(history[0].id).toBe('b')
    expect(history[1].id).toBe('a')
  })

  it('clears all history', () => {
    addImportRecord({ id: 'a', sourceId: 'oura', importedAt: '2026-03-01T00:00:00Z', recordCount: 10, domains: ['sleep'], dateRange: { from: '2026-02-01', to: '2026-03-01' } })
    clearImportHistory()
    expect(getImportHistory()).toEqual([])
  })

  it('getLastImportForSource returns most recent for given sourceId', () => {
    addImportRecord({ id: 'a', sourceId: 'oura', importedAt: '2026-03-01T00:00:00Z', recordCount: 10, domains: ['sleep'], dateRange: { from: '2026-02-01', to: '2026-03-01' } })
    addImportRecord({ id: 'b', sourceId: 'oura', importedAt: '2026-03-10T00:00:00Z', recordCount: 20, domains: ['sleep'], dateRange: { from: '2026-03-01', to: '2026-03-10' } })
    addImportRecord({ id: 'c', sourceId: 'strava', importedAt: '2026-03-12T00:00:00Z', recordCount: 5, domains: ['exercise'], dateRange: { from: '2026-03-01', to: '2026-03-12' } })
    const last = getLastImportForSource('oura')
    expect(last).not.toBeNull()
    expect(last!.id).toBe('b')
  })

  it('getLastImportForSource returns null for unknown source', () => {
    expect(getLastImportForSource('unknown')).toBeNull()
  })
})
