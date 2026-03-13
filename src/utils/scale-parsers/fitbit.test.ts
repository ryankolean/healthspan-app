import { parseFitbitScale } from './fitbit'

describe('parseFitbitScale', () => {
  it('returns empty for empty input', () => {
    expect(parseFitbitScale('[]')).toEqual([])
  })

  it('parses Fitbit weight JSON', () => {
    const json = JSON.stringify([
      { logId: 1703663764000, weight: 180.9, bmi: 25.34, fat: 24.98, date: '03/01/26', time: '07:56:04', source: 'Aria' }
    ])
    const result = parseFitbitScale(json)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].weightKg).toBeCloseTo(82.1) // 180.9 * 0.453592
    expect(result[0].bodyFatPct).toBeCloseTo(24.98)
    expect(result[0].source).toBe('fitbit')
  })

  it('handles missing fat field', () => {
    const json = JSON.stringify([
      { logId: 1, weight: 170.0, bmi: 24.0, date: '03/01/26', time: '08:00:00', source: 'API' }
    ])
    const result = parseFitbitScale(json)
    expect(result[0].bodyFatPct).toBeUndefined()
  })
})
