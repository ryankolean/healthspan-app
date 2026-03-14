import { parseGarminExercise } from './garmin'

describe('parseGarminExercise', () => {
  it('returns empty for empty input', () => {
    const result = parseGarminExercise('')
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses a cardio activity', () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss
Running,2026-03-01 07:30:00,false,Morning Run,5.2,420,0:32:15,145,172,6:12,5:30,25,20`
    const result = parseGarminExercise(csv)
    expect(result.workouts).toHaveLength(1)
    expect(result.workouts[0].source).toBe('garmin')
    expect(result.workouts[0].type).toBe('cardio')
    expect(result.workouts[0].activityName).toBe('Morning Run')
    expect(result.workouts[0].date).toBe('2026-03-01')
    expect(result.workouts[0].distanceKm).toBeCloseTo(5.2)
    expect(result.workouts[0].durationMin).toBe(32)
    expect(result.workouts[0].avgHr).toBe(145)
    expect(result.workouts[0].maxHr).toBe(172)
    expect(result.workouts[0].calories).toBe(420)
  })

  it('maps strength training type', () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss
Strength Training,2026-03-02 18:00:00,false,Upper Body,,350,0:45:00,120,155,,,,`
    const result = parseGarminExercise(csv)
    expect(result.workouts[0].type).toBe('strength')
  })

  it('maps stability types', () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss
Yoga,2026-03-03 06:00:00,false,Morning Yoga,,200,1:00:00,95,110,,,,`
    const result = parseGarminExercise(csv)
    expect(result.workouts[0].type).toBe('stability')
  })

  it('maps unknown activity types to sport', () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss
Tennis,2026-03-04 10:00:00,false,Tennis Match,,300,1:30:00,130,165,,,,`
    const result = parseGarminExercise(csv)
    expect(result.workouts[0].type).toBe('sport')
  })

  it('vo2max is always empty (Garmin CSV does not include it)', () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss
Running,2026-03-01 07:30:00,false,Run,5.0,400,0:30:00,140,170,6:00,5:30,,`
    const result = parseGarminExercise(csv)
    expect(result.vo2max).toEqual([])
  })

  it('handles missing optional fields', () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss
Walking,2026-03-05 12:00:00,false,Lunch Walk,2.1,,0:25:00,,,,,,`
    const result = parseGarminExercise(csv)
    expect(result.workouts[0].distanceKm).toBeCloseTo(2.1)
    expect(result.workouts[0].calories).toBeUndefined()
    expect(result.workouts[0].avgHr).toBeUndefined()
    expect(result.workouts[0].maxHr).toBeUndefined()
  })

  it('parses multiple activities', () => {
    const csv = `Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR,Max HR,Avg Pace,Best Pace,Elev Gain,Elev Loss
Running,2026-03-01 07:30:00,false,Morning Run,5.2,420,0:32:15,145,172,6:12,5:30,25,20
Cycling,2026-03-01 17:00:00,false,Evening Ride,25.0,600,1:05:00,135,160,,,50,45`
    const result = parseGarminExercise(csv)
    expect(result.workouts).toHaveLength(2)
    expect(result.workouts[0].activityName).toBe('Morning Run')
    expect(result.workouts[1].activityName).toBe('Evening Ride')
    expect(result.workouts[1].type).toBe('cardio')
  })
})
