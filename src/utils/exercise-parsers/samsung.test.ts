import { parseSamsungExercise } from './samsung'

describe('parseSamsungExercise', () => {
  it('returns empty for empty input', () => {
    const result = parseSamsungExercise('')
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses a Samsung exercise CSV', () => {
    const csv = `exercise_type,start_time,end_time,duration,calorie,distance,mean_heart_rate,max_heart_rate,title
1001,2026-03-01 07:30:00,2026-03-01 08:02:00,1920000,380,5100,148,172,Running`
    const result = parseSamsungExercise(csv)
    expect(result.workouts).toHaveLength(1)
    expect(result.workouts[0].source).toBe('samsung')
    expect(result.workouts[0].type).toBe('cardio')
    expect(result.workouts[0].activityName).toBe('Running')
    expect(result.workouts[0].date).toBe('2026-03-01')
    expect(result.workouts[0].durationMin).toBe(32)
    expect(result.workouts[0].avgHr).toBe(148)
    expect(result.workouts[0].calories).toBe(380)
  })

  it('skips comment lines', () => {
    const csv = `# Samsung Health exercise data
exercise_type,start_time,end_time,duration,calorie,distance,mean_heart_rate,max_heart_rate,title
1002,2026-03-02 18:00:00,2026-03-02 18:45:00,2700000,200,,120,155,Weight Training`
    const result = parseSamsungExercise(csv)
    expect(result.workouts).toHaveLength(1)
    expect(result.workouts[0].type).toBe('strength')
  })

  it('vo2max is always empty', () => {
    const csv = `exercise_type,start_time,end_time,duration,calorie,distance,mean_heart_rate,max_heart_rate,title
1001,2026-03-01 07:30:00,2026-03-01 08:00:00,1800000,300,4000,140,165,Walking`
    expect(parseSamsungExercise(csv).vo2max).toEqual([])
  })
})
