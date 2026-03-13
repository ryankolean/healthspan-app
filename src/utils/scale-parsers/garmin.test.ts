import { parseGarminScale } from './garmin'

describe('parseGarminScale', () => {
  it('returns empty for empty input', () => {
    expect(parseGarminScale('')).toEqual([])
  })

  it('parses Garmin body comp CSV', () => {
    const csv = `Body
weight,bmi,fat,date,time
83.6,24.1,18.5,2026-03-01,08:00:17
82.8,23.9,18.2,2026-03-02,22:02:16`
    const result = parseGarminScale(csv)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(83.6)
    expect(result[0].bodyFatPct).toBeCloseTo(18.5)
    expect(result[0].source).toBe('garmin')
  })

  it('handles zero fat percentage', () => {
    const csv = `Body
weight,bmi,fat,date,time
83.6,24.1,0.0,2026-03-01,08:00:17`
    const result = parseGarminScale(csv)
    expect(result[0].bodyFatPct).toBeUndefined() // 0.0 likely means no data
  })

  it('auto-calculates leanMassKg', () => {
    const csv = `Body
weight,bmi,fat,date,time
100.0,28.0,20.0,2026-03-01,08:00:00`
    const result = parseGarminScale(csv)
    expect(result[0].leanMassKg).toBeCloseTo(80.0)
  })
})
