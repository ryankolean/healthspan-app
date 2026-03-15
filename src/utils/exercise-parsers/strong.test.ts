import { parseStrongCsv } from './strong'

describe('parseStrongCsv', () => {
  it('returns empty for empty input', () => {
    const result = parseStrongCsv('')
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses a strength workout', () => {
    const csv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes
2026-03-01,Push Day,45m,Bench Press,1,80,8,,,
2026-03-01,Push Day,45m,Bench Press,2,80,8,,,
2026-03-01,Push Day,45m,Overhead Press,1,40,10,,,`
    const result = parseStrongCsv(csv)
    expect(result.workouts).toHaveLength(1)
    expect(result.workouts[0].source).toBe('strong')
    expect(result.workouts[0].type).toBe('strength')
    expect(result.workouts[0].activityName).toBe('Push Day')
    expect(result.workouts[0].sets).toHaveLength(3)
    expect(result.workouts[0].sets![0].exercise).toBe('Bench Press')
    expect(result.workouts[0].sets![0].weightKg).toBe(80)
    expect(result.workouts[0].sets![0].reps).toBe(8)
  })

  it('groups by date + workout name', () => {
    const csv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes
2026-03-01,Push Day,45m,Bench Press,1,80,8,,,
2026-03-02,Pull Day,50m,Deadlift,1,120,5,,,`
    const result = parseStrongCsv(csv)
    expect(result.workouts).toHaveLength(2)
  })
})
