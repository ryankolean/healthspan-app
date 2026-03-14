import { parseFitbitExercise } from './fitbit'

describe('parseFitbitExercise', () => {
  it('returns empty for empty input', () => {
    const result = parseFitbitExercise('[]')
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses a run activity', () => {
    const json = JSON.stringify([{
      logId: 12345,
      activityName: 'Run',
      startTime: '2026-03-01T07:30:00.000',
      duration: 1920000, // 32 min in ms
      averageHeartRate: 148,
      calories: 380,
      distance: 5.1,
    }])
    const result = parseFitbitExercise(json)
    expect(result.workouts).toHaveLength(1)
    expect(result.workouts[0].source).toBe('fitbit')
    expect(result.workouts[0].type).toBe('cardio')
    expect(result.workouts[0].date).toBe('2026-03-01')
    expect(result.workouts[0].durationMin).toBe(32)
    expect(result.workouts[0].avgHr).toBe(148)
    expect(result.workouts[0].distanceKm).toBeCloseTo(5.1)
  })

  it('maps weight training to strength', () => {
    const json = JSON.stringify([{
      logId: 99,
      activityName: 'Weights',
      startTime: '2026-03-02T18:00:00.000',
      duration: 2700000,
      calories: 200,
    }])
    const result = parseFitbitExercise(json)
    expect(result.workouts[0].type).toBe('strength')
  })

  it('vo2max is always empty', () => {
    const json = JSON.stringify([{
      logId: 1,
      activityName: 'Walk',
      startTime: '2026-03-01T12:00:00.000',
      duration: 1800000,
    }])
    expect(parseFitbitExercise(json).vo2max).toEqual([])
  })
})
