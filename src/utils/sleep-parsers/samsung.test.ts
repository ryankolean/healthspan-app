import { parseSamsungSleep } from './samsung'

describe('parseSamsungSleep', () => {
  it('returns empty for empty input', () => {
    expect(parseSamsungSleep('').nights).toEqual([])
  })

  it('parses Samsung sleep CSV', () => {
    const csv = `start_time,end_time,sleep_duration,quality,efficiency
2026-02-28 22:30:00,2026-03-01 06:30:00,480,3,90`
    const result = parseSamsungSleep(csv)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].source).toBe('samsung')
    expect(result.nights[0].date).toBe('2026-03-01') // uses end_time date
    expect(result.nights[0].totalMin).toBe(480)
    expect(result.nights[0].efficiency).toBe(90)
  })

  it('skips comment lines starting with #', () => {
    const csv = `# Samsung Health sleep data
start_time,end_time,sleep_duration,quality,efficiency
2026-02-28 23:00:00,2026-03-01 07:00:00,420,4,92`
    const result = parseSamsungSleep(csv)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].totalMin).toBe(420)
  })
})
