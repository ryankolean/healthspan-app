import { parseHevyCsv } from './hevy'

const SAMPLE_CSV = `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Duration
2026-03-01,Push Day,Bench Press,1,80,10,
2026-03-01,Push Day,Bench Press,2,80,8,
2026-03-01,Push Day,Overhead Press,1,60,10,
2026-03-02,Pull Day,Deadlift,1,120,5,`

describe('parseHevyCsv', () => {
  it('returns empty arrays for empty input', () => {
    const result = parseHevyCsv('')
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('groups rows by date + workout name', () => {
    const result = parseHevyCsv(SAMPLE_CSV)
    expect(result.workouts).toHaveLength(2)
  })

  it('sets type as strength', () => {
    const result = parseHevyCsv(SAMPLE_CSV)
    expect(result.workouts.every(w => w.type === 'strength')).toBe(true)
  })

  it('populates sets array correctly', () => {
    const result = parseHevyCsv(SAMPLE_CSV)
    const pushDay = result.workouts.find(w => w.activityName === 'Push Day')!
    expect(pushDay.sets).toHaveLength(3)
    expect(pushDay.sets![0].exercise).toBe('Bench Press')
    expect(pushDay.sets![0].weightKg).toBe(80)
    expect(pushDay.sets![0].reps).toBe(10)
  })

  it('sets source as hevy', () => {
    const result = parseHevyCsv(SAMPLE_CSV)
    expect(result.workouts.every(w => w.source === 'hevy')).toBe(true)
  })

  it('returns empty vo2max', () => {
    const result = parseHevyCsv(SAMPLE_CSV)
    expect(result.vo2max).toEqual([])
  })

  it('handles missing weight/reps gracefully', () => {
    const csv = `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Duration\n2026-03-01,Yoga,Child Pose,1,,,120`
    const result = parseHevyCsv(csv)
    expect(result.workouts[0].sets![0].weightKg).toBeUndefined()
    expect(result.workouts[0].sets![0].reps).toBeUndefined()
    expect(result.workouts[0].sets![0].durationSec).toBe(120)
  })

  it('handles workout names containing commas (quoted CSV fields)', () => {
    const csv = `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Duration\n2026-03-01,"Push, Chest & Tris",Bench Press,1,80,10,`
    const result = parseHevyCsv(csv)
    expect(result.workouts).toHaveLength(1)
    expect(result.workouts[0].activityName).toBe('Push, Chest & Tris')
  })
})
