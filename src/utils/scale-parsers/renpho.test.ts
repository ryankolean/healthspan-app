import { parseRenphoScale } from './renpho'

describe('parseRenphoScale', () => {
  it('returns empty for empty input', () => {
    expect(parseRenphoScale('')).toEqual([])
  })

  it('parses Renpho CSV', () => {
    const csv = `Time of Measurement,Weight(kg),BMI,Body Fat(%),Subcutaneous Fat(%),Visceral Fat,Body Water(%),Skeletal Muscle(%),Muscle Mass(kg),Bone Mass(kg),Protein(%),BMR(kcal),Metabolic Age
2026-03-01 08:30,77.5,23.8,18.5,15.2,8,55.3,45.2,35.1,3.2,16.5,1680,28`
    const result = parseRenphoScale(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(77.5)
    expect(result[0].bodyFatPct).toBeCloseTo(18.5)
    expect(result[0].source).toBe('renpho')
  })

  it('auto-calculates leanMassKg', () => {
    const csv = `Time of Measurement,Weight(kg),BMI,Body Fat(%),Subcutaneous Fat(%),Visceral Fat,Body Water(%),Skeletal Muscle(%),Muscle Mass(kg),Bone Mass(kg),Protein(%),BMR(kcal),Metabolic Age
2026-03-01 08:30,100.0,28.0,20.0,,,,,,,,,`
    const result = parseRenphoScale(csv)
    expect(result[0].leanMassKg).toBeCloseTo(80.0)
  })
})
