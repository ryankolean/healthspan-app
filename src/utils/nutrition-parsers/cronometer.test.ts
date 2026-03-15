import { parseCronometerCsv } from './cronometer'

describe('parseCronometerCsv', () => {
  it('returns empty for empty input', () => {
    expect(parseCronometerCsv('')).toEqual([])
  })

  it('parses daily nutrition summary', () => {
    const csv = `Date,Calories,Fat (g),Carbs (g),Fiber (g),Protein (g)
2026-03-01,2200,80,250,30,150`
    const result = parseCronometerCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].source).toBe('cronometer')
    expect(result[0].calories).toBe(2200)
    expect(result[0].fatG).toBe(80)
    expect(result[0].carbsG).toBe(250)
    expect(result[0].fiberG).toBe(30)
    expect(result[0].proteinG).toBe(150)
    expect(result[0].mealType).toBe('snack') // daily total
  })

  it('parses multiple days', () => {
    const csv = `Date,Calories,Fat (g),Carbs (g),Fiber (g),Protein (g)
2026-03-01,2200,80,250,30,150
2026-03-02,2100,75,240,28,145`
    const result = parseCronometerCsv(csv)
    expect(result).toHaveLength(2)
  })

  it('handles missing optional fields', () => {
    const csv = `Date,Calories
2026-03-01,2200`
    const result = parseCronometerCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].calories).toBe(2200)
    expect(result[0].proteinG).toBeUndefined()
    expect(result[0].fatG).toBeUndefined()
  })

  it('handles header-only CSV', () => {
    const csv = `Date,Calories,Fat (g),Carbs (g),Fiber (g),Protein (g)`
    const result = parseCronometerCsv(csv)
    expect(result).toEqual([])
  })
})
