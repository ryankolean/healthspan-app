// src/types/exercise.test.ts
import type { ExerciseWorkout, VO2MaxEntry, ExerciseSettings, ExerciseSource, ExerciseType } from './exercise'

describe('ExerciseWorkout type', () => {
  it('accepts a minimal valid workout', () => {
    const w: ExerciseWorkout = {
      id: 'abc',
      source: 'strava',
      sourceId: 'strava-1',
      date: '2026-03-01',
      type: 'cardio',
      activityName: 'Run',
      createdAt: Date.now(),
    }
    expect(w.id).toBe('abc')
  })

  it('accepts a strength workout with sets', () => {
    const w: ExerciseWorkout = {
      id: 'def',
      source: 'hevy',
      sourceId: 'hevy-1',
      date: '2026-03-01',
      type: 'strength',
      activityName: 'Push Day',
      sets: [{ exercise: 'Bench Press', setIndex: 0, reps: 10, weightKg: 80 }],
      createdAt: Date.now(),
    }
    expect(w.sets).toHaveLength(1)
  })

  it('accepts a VO2MaxEntry', () => {
    const entry: VO2MaxEntry = {
      id: 'v1',
      date: '2026-03-01',
      value: 52,
      source: 'apple_health',
      method: 'apple_watch',
      createdAt: Date.now(),
    }
    expect(entry.value).toBe(52)
  })

  it('accepts ExerciseSettings with global priority', () => {
    const settings: ExerciseSettings = {
      priorityMode: 'global',
      globalPriority: ['strava', 'hevy', 'apple_health', 'oura', 'manual'],
    }
    expect(settings.globalPriority[0]).toBe('strava')
  })
})
