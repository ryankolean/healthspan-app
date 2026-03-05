import {
  getSleepNights,
  saveSleepNights,
  getAllNightsRaw,
  getFlaggedSleepConflicts,
  resolveSleepConflict,
  mergeNights,
  importSleepNights,
  getSleepSettings,
  saveSleepSettings,
} from './sleep-storage'
import type { SleepNight, SleepSettings } from '../types/sleep'

const makeNight = (overrides: Partial<SleepNight> = {}): SleepNight => ({
  id: 'n1',
  source: 'oura',
  sourceId: 'oura-2026-03-01',
  date: '2026-03-01',
  totalMin: 480,
  createdAt: Date.now(),
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('getSleepNights / saveSleepNights', () => {
  it('returns empty array when nothing stored', () => {
    expect(getSleepNights()).toEqual([])
  })

  it('saves and retrieves nights', () => {
    saveSleepNights([makeNight()])
    expect(getSleepNights()).toHaveLength(1)
    expect(getSleepNights()[0].id).toBe('n1')
  })

  it('excludes flagged conflicts by default', () => {
    saveSleepNights([
      makeNight({ id: 'n1', flaggedConflict: false }),
      makeNight({ id: 'n2', flaggedConflict: true }),
    ])
    expect(getSleepNights()).toHaveLength(1)
    expect(getSleepNights()[0].id).toBe('n1')
  })

  it('filters by source', () => {
    saveSleepNights([
      makeNight({ id: 'a', source: 'oura' }),
      makeNight({ id: 'b', source: 'whoop' }),
    ])
    expect(getSleepNights({ source: 'oura' })).toHaveLength(1)
  })

  it('filters by date range', () => {
    saveSleepNights([
      makeNight({ id: 'old', date: '2026-01-01' }),
      makeNight({ id: 'new', date: '2026-03-01' }),
    ])
    expect(getSleepNights({ from: '2026-02-01', to: '2026-04-01' })).toHaveLength(1)
    expect(getSleepNights({ from: '2026-02-01', to: '2026-04-01' })[0].id).toBe('new')
  })
})

describe('getFlaggedSleepConflicts / resolveSleepConflict', () => {
  it('returns only flagged nights', () => {
    saveSleepNights([
      makeNight({ id: 'ok' }),
      makeNight({ id: 'bad', flaggedConflict: true }),
    ])
    expect(getFlaggedSleepConflicts()).toHaveLength(1)
    expect(getFlaggedSleepConflicts()[0].id).toBe('bad')
  })

  it('resolves conflict: keeps winner, removes loser', () => {
    saveSleepNights([
      makeNight({ id: 'keep', flaggedConflict: false }),
      makeNight({ id: 'drop', flaggedConflict: true }),
    ])
    resolveSleepConflict('keep', 'drop')
    const all = JSON.parse(localStorage.getItem('healthspan:sleep:nights') ?? '[]')
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('keep')
    expect(all[0].resolvedBy).toBe('manual')
  })

  it('is a no-op when keepId does not exist', () => {
    saveSleepNights([makeNight({ id: 'only', flaggedConflict: true })])
    resolveSleepConflict('nonexistent', 'only')
    const all = JSON.parse(localStorage.getItem('healthspan:sleep:nights') ?? '[]')
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('only')
  })
})

describe('mergeNights', () => {
  it('deduplicates by source + sourceId', () => {
    const existing = [makeNight({ id: 'e1', source: 'oura', sourceId: 'oura-d1' })]
    const incoming = [
      makeNight({ id: 'n1', source: 'oura', sourceId: 'oura-d1' }),
      makeNight({ id: 'n2', source: 'oura', sourceId: 'oura-d2' }),
    ]
    const settings: SleepSettings = { globalPriority: ['oura', 'apple_health', 'whoop', 'manual'] }
    const result = mergeNights(existing, incoming, settings)
    expect(result.filter(n => !n.flaggedConflict)).toHaveLength(2)
  })

  it('flags lower-priority source on same date', () => {
    const existing = [makeNight({
      id: 'e1', source: 'oura', sourceId: 'oura-d1', date: '2026-03-01',
    })]
    const incoming = [makeNight({
      id: 'n1', source: 'whoop', sourceId: 'whoop-d1', date: '2026-03-01',
    })]
    const settings: SleepSettings = { globalPriority: ['oura', 'apple_health', 'whoop', 'manual'] }
    const result = mergeNights(existing, incoming, settings)
    const flagged = result.filter(n => n.flaggedConflict)
    expect(flagged).toHaveLength(1)
    expect(flagged[0].source).toBe('whoop')
  })
})

describe('importSleepNights', () => {
  it('merges incoming into existing store', () => {
    saveSleepNights([makeNight({ id: 'e1', sourceId: 'oura-d1' })])
    importSleepNights([makeNight({ id: 'n1', sourceId: 'oura-d2' })])
    expect(getSleepNights()).toHaveLength(2)
  })

  it('skips exact duplicates', () => {
    saveSleepNights([makeNight({ id: 'e1', sourceId: 'oura-d1' })])
    importSleepNights([makeNight({ id: 'n1', sourceId: 'oura-d1' })])
    expect(getSleepNights()).toHaveLength(1)
  })

  it('uses getAllNightsRaw (includes flagged) for merge base', () => {
    saveSleepNights([makeNight({ id: 'f1', sourceId: 'oura-d1', flaggedConflict: true })])
    importSleepNights([makeNight({ id: 'n1', sourceId: 'oura-d1' })])
    const all = JSON.parse(localStorage.getItem('healthspan:sleep:nights') ?? '[]')
    expect(all).toHaveLength(1)
  })
})

describe('SleepSettings', () => {
  it('returns default settings when none stored', () => {
    const s = getSleepSettings()
    expect(s.globalPriority[0]).toBe('oura')
  })

  it('saves and retrieves settings', () => {
    const s: SleepSettings = { globalPriority: ['whoop', 'oura', 'apple_health', 'manual'] }
    saveSleepSettings(s)
    expect(getSleepSettings().globalPriority[0]).toBe('whoop')
  })
})
