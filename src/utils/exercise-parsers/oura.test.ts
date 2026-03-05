import { parseOuraWorkouts } from './oura'

const SAMPLE_OURA_DATA = {
  workouts: [
    {
      id: 'oura-abc',
      activity: 'running',
      calories: 450,
      start: '2026-03-01T08:00:00+00:00',
      end: '2026-03-01T09:00:00+00:00',
      intensity: 'moderate',
    },
    {
      id: 'oura-def',
      activity: 'weight_training',
      calories: 300,
      start: '2026-03-02T10:00:00+00:00',
      end: '2026-03-02T11:00:00+00:00',
      intensity: 'high',
    },
  ],
}

describe('parseOuraWorkouts', () => {
  it('returns empty arrays for null input', () => {
    const result = parseOuraWorkouts(null)
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses running activity as cardio', () => {
    const result = parseOuraWorkouts(SAMPLE_OURA_DATA)
    expect(result.workouts).toHaveLength(2)
    const run = result.workouts.find(w => w.activityName === 'running')!
    expect(run.source).toBe('oura')
    expect(run.type).toBe('cardio')
    expect(run.durationMin).toBe(60)
    expect(run.calories).toBe(450)
    expect(run.date).toBe('2026-03-01')
    expect(run.sourceId).toBe('oura-abc')
  })

  it('parses weight_training as strength', () => {
    const result = parseOuraWorkouts(SAMPLE_OURA_DATA)
    const strength = result.workouts.find(w => w.type === 'strength')!
    expect(strength.activityName).toBe('weight_training')
  })

  it('returns empty vo2max array (Oura does not provide VO2 max)', () => {
    const result = parseOuraWorkouts(SAMPLE_OURA_DATA)
    expect(result.vo2max).toEqual([])
  })

  it('generates unique IDs', () => {
    const result = parseOuraWorkouts(SAMPLE_OURA_DATA)
    const ids = result.workouts.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
