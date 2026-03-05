// src/utils/exercise-parsers/strava.test.ts
import { parseStravaActivities } from './strava'

const SAMPLE = [
  {
    id: 11111,
    sport_type: 'Run',
    start_date: '2026-03-01T08:00:00Z',
    elapsed_time: 3600,
    distance: 10000,
    average_heartrate: 145,
    max_heartrate: 172,
    total_elevation_gain: 50,
  },
  {
    id: 22222,
    sport_type: 'Ride',
    start_date: '2026-03-02T07:00:00Z',
    elapsed_time: 5400,
    distance: 40000,
    average_heartrate: 135,
    max_heartrate: 165,
  },
  {
    id: 33333,
    sport_type: 'WeightTraining',
    start_date: '2026-03-03T09:00:00Z',
    elapsed_time: 3600,
    distance: 0,
  },
]

describe('parseStravaActivities', () => {
  it('returns empty arrays for empty input', () => {
    const result = parseStravaActivities([])
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses run correctly', () => {
    const result = parseStravaActivities(SAMPLE)
    const run = result.workouts.find(w => w.activityName === 'Run')!
    expect(run.source).toBe('strava')
    expect(run.type).toBe('cardio')
    expect(run.durationMin).toBe(60)
    expect(run.distanceKm).toBeCloseTo(10)
    expect(run.avgHr).toBe(145)
    expect(run.maxHr).toBe(172)
    expect(run.date).toBe('2026-03-01')
    expect(run.sourceId).toBe('strava-11111')
  })

  it('maps WeightTraining to strength type', () => {
    const result = parseStravaActivities(SAMPLE)
    const strength = result.workouts.find(w => w.activityName === 'WeightTraining')!
    expect(strength.type).toBe('strength')
  })

  it('returns empty vo2max', () => {
    const result = parseStravaActivities(SAMPLE)
    expect(result.vo2max).toEqual([])
  })

  it('omits distanceKm when distance is 0', () => {
    const result = parseStravaActivities(SAMPLE)
    const strength = result.workouts.find(w => w.type === 'strength')!
    expect(strength.distanceKm).toBeUndefined()
  })
})
