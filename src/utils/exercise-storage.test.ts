// src/utils/exercise-storage.test.ts
import {
  getWorkouts,
  saveWorkouts,
  getFlaggedConflicts,
  resolveConflict,
  getVO2Max,
  saveVO2Max,
  getExerciseSettings,
  saveExerciseSettings,
  mergeWorkouts,
} from './exercise-storage'
import type { ExerciseWorkout, VO2MaxEntry, ExerciseSettings } from '../types/exercise'

const makeWorkout = (overrides: Partial<ExerciseWorkout> = {}): ExerciseWorkout => ({
  id: 'w1',
  source: 'strava',
  sourceId: 's1',
  date: '2026-03-01',
  type: 'cardio',
  activityName: 'Run',
  createdAt: Date.now(),
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('getWorkouts / saveWorkouts', () => {
  it('returns empty array when nothing stored', () => {
    expect(getWorkouts()).toEqual([])
  })

  it('saves and retrieves workouts', () => {
    const w = makeWorkout()
    saveWorkouts([w])
    expect(getWorkouts()).toHaveLength(1)
    expect(getWorkouts()[0].id).toBe('w1')
  })

  it('excludes flagged conflicts by default', () => {
    const w1 = makeWorkout({ id: 'w1', flaggedConflict: false })
    const w2 = makeWorkout({ id: 'w2', flaggedConflict: true })
    saveWorkouts([w1, w2])
    expect(getWorkouts()).toHaveLength(1)
    expect(getWorkouts()[0].id).toBe('w1')
  })

  it('filters by type', () => {
    saveWorkouts([
      makeWorkout({ id: 'c1', type: 'cardio' }),
      makeWorkout({ id: 's1', type: 'strength' }),
    ])
    expect(getWorkouts({ type: 'cardio' })).toHaveLength(1)
    expect(getWorkouts({ type: 'strength' })).toHaveLength(1)
  })

  it('filters by source', () => {
    saveWorkouts([
      makeWorkout({ id: 'a', source: 'strava' }),
      makeWorkout({ id: 'b', source: 'hevy' }),
    ])
    expect(getWorkouts({ source: 'strava' })).toHaveLength(1)
  })

  it('filters by date range', () => {
    saveWorkouts([
      makeWorkout({ id: 'old', date: '2026-01-01' }),
      makeWorkout({ id: 'new', date: '2026-03-01' }),
    ])
    expect(getWorkouts({ from: '2026-02-01', to: '2026-04-01' })).toHaveLength(1)
    expect(getWorkouts({ from: '2026-02-01', to: '2026-04-01' })[0].id).toBe('new')
  })
})

describe('getFlaggedConflicts / resolveConflict', () => {
  it('returns only flagged workouts', () => {
    saveWorkouts([
      makeWorkout({ id: 'ok' }),
      makeWorkout({ id: 'bad', flaggedConflict: true }),
    ])
    expect(getFlaggedConflicts()).toHaveLength(1)
    expect(getFlaggedConflicts()[0].id).toBe('bad')
  })

  it('resolveConflict keeps winner, removes loser', () => {
    saveWorkouts([
      makeWorkout({ id: 'keep', flaggedConflict: false }),
      makeWorkout({ id: 'drop', flaggedConflict: true }),
    ])
    resolveConflict('keep', 'drop')
    const all = JSON.parse(localStorage.getItem('healthspan:exercise:workouts') ?? '[]')
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('keep')
    expect(all[0].flaggedConflict).toBe(false)
    expect(all[0].resolvedBy).toBe('manual')
  })
})

describe('mergeWorkouts', () => {
  it('deduplicates by sourceId + source', () => {
    const existing = [makeWorkout({ id: 'e1', source: 'strava', sourceId: 'sid1' })]
    const incoming = [
      makeWorkout({ id: 'new1', source: 'strava', sourceId: 'sid1' }), // duplicate
      makeWorkout({ id: 'new2', source: 'strava', sourceId: 'sid2' }), // new
    ]
    const settings: ExerciseSettings = { priorityMode: 'global', globalPriority: ['strava', 'hevy', 'apple_health', 'oura', 'manual'] }
    const result = mergeWorkouts(existing, incoming, settings)
    // sid1 already exists → skip; sid2 is new → add
    expect(result.filter(w => !w.flaggedConflict)).toHaveLength(2)
  })

  it('flags conflict when same date window and same type, lower priority wins', () => {
    const existing = [makeWorkout({
      id: 'e1', source: 'strava', sourceId: 's1',
      date: '2026-03-01', startTime: '2026-03-01T09:00:00Z', type: 'cardio',
    })]
    const incoming = [makeWorkout({
      id: 'n1', source: 'oura', sourceId: 'o1',
      date: '2026-03-01', startTime: '2026-03-01T09:10:00Z', type: 'cardio',
    })]
    const settings: ExerciseSettings = { priorityMode: 'global', globalPriority: ['strava', 'hevy', 'apple_health', 'oura', 'manual'] }
    const result = mergeWorkouts(existing, incoming, settings)
    const flagged = result.filter(w => w.flaggedConflict)
    expect(flagged).toHaveLength(1)
    expect(flagged[0].source).toBe('oura') // lower priority gets flagged
  })
})

describe('VO2 max storage', () => {
  it('returns empty array initially', () => {
    expect(getVO2Max()).toEqual([])
  })

  it('saves and returns entries sorted by date desc', () => {
    const e1: VO2MaxEntry = { id: 'v1', date: '2026-01-01', value: 48, source: 'manual', createdAt: Date.now() }
    const e2: VO2MaxEntry = { id: 'v2', date: '2026-03-01', value: 50, source: 'apple_health', createdAt: Date.now() }
    saveVO2Max(e1)
    saveVO2Max(e2)
    const all = getVO2Max()
    expect(all[0].date).toBe('2026-03-01')
    expect(all[1].date).toBe('2026-01-01')
  })
})

describe('ExerciseSettings', () => {
  it('returns default settings when none stored', () => {
    const s = getExerciseSettings()
    expect(s.priorityMode).toBe('global')
    expect(s.globalPriority[0]).toBe('strava')
  })

  it('saves and retrieves settings', () => {
    const s: ExerciseSettings = { priorityMode: 'global', globalPriority: ['hevy', 'strava', 'apple_health', 'oura', 'manual'] }
    saveExerciseSettings(s)
    expect(getExerciseSettings().globalPriority[0]).toBe('hevy')
  })
})
