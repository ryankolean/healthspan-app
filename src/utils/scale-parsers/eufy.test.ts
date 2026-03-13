import { parseEufyScale } from './eufy'

describe('parseEufyScale', () => {
  it('returns empty for empty input', () => {
    expect(parseEufyScale('')).toEqual([])
  })

  it('parses Eufy CSV', () => {
    const csv = `Date,Weight (kg),Body Fat (%),BMI,Muscle Mass (kg)
2026-03-01 08:30,77.5,18.5,23.8,35.1`
    const result = parseEufyScale(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(77.5)
    expect(result[0].bodyFatPct).toBeCloseTo(18.5)
    expect(result[0].source).toBe('eufy')
  })

  it('auto-calculates leanMassKg', () => {
    const csv = `Date,Weight (kg),Body Fat (%),BMI,Muscle Mass (kg)
2026-03-01 08:30,100.0,20.0,28.0,`
    const result = parseEufyScale(csv)
    expect(result[0].leanMassKg).toBeCloseTo(80.0)
  })
})
