import { parseWithingsScale } from './withings'

describe('parseWithingsScale', () => {
  it('returns empty array for empty input', () => {
    expect(parseWithingsScale('')).toEqual([])
  })

  it('parses a single row', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,77.5,12.4,3.2,35.1,52.3,`
    const result = parseWithingsScale(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(77.5)
    expect(result[0].bodyFatPct).toBeCloseTo(16.0) // 12.4 / 77.5 * 100
    expect(result[0].source).toBe('withings')
  })

  it('handles missing fat mass', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,77.5,,,,`
    const result = parseWithingsScale(csv)
    expect(result).toHaveLength(1)
    expect(result[0].bodyFatPct).toBeUndefined()
  })

  it('parses multiple rows', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,77.5,12.4,3.2,35.1,52.3,
2026-03-02 08:15:00,77.2,12.2,3.2,35.0,52.1,morning`
    const result = parseWithingsScale(csv)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[1].date).toBe('2026-03-02')
  })

  it('auto-calculates leanMassKg', () => {
    const csv = `Date,Weight,Fat mass,Bone mass,Muscle mass,Hydration,Comments
2026-03-01 08:30:00,80.0,16.0,,,`
    const result = parseWithingsScale(csv)
    expect(result[0].leanMassKg).toBeCloseTo(64.0) // 80 * (1 - 20/100)
  })
})
