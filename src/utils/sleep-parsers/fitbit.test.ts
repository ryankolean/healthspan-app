import { parseFitbitSleep } from './fitbit'

describe('parseFitbitSleep', () => {
  it('returns empty for empty input', () => {
    expect(parseFitbitSleep('[]').nights).toEqual([])
  })

  it('parses a sleep log entry', () => {
    const json = JSON.stringify([{
      dateOfSleep: '2026-03-01',
      duration: 28800000, // 8 hours in ms
      efficiency: 92,
      minutesAsleep: 420,
      minutesAwake: 30,
      levels: {
        summary: {
          deep: { minutes: 90 },
          light: { minutes: 200 },
          rem: { minutes: 130 },
          wake: { minutes: 30 },
        }
      }
    }])
    const result = parseFitbitSleep(json)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].date).toBe('2026-03-01')
    expect(result.nights[0].source).toBe('fitbit')
    expect(result.nights[0].deepMin).toBe(90)
    expect(result.nights[0].lightMin).toBe(200)
    expect(result.nights[0].remMin).toBe(130)
    expect(result.nights[0].awakeMin).toBe(30)
    expect(result.nights[0].efficiency).toBe(92)
    expect(result.nights[0].totalMin).toBe(420) // deep+light+rem
  })

  it('handles missing levels data', () => {
    const json = JSON.stringify([{
      dateOfSleep: '2026-03-01',
      duration: 25200000,
      efficiency: 88,
      minutesAsleep: 380,
      minutesAwake: 40,
    }])
    const result = parseFitbitSleep(json)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].totalMin).toBe(380)
    expect(result.nights[0].deepMin).toBeUndefined()
  })
})
