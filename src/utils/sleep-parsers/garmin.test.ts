import { parseGarminSleep } from './garmin'

describe('parseGarminSleep', () => {
  it('returns empty for empty input', () => {
    expect(parseGarminSleep('').nights).toEqual([])
  })

  it('parses a single sleep night', () => {
    const csv = `Calendar Date,Sleep Start,Sleep End,Overall Sleep Score,Deep Sleep Duration,Light Sleep Duration,REM Sleep Duration,Awake Duration
2026-03-01,2026-02-28 22:30:00,2026-03-01 06:30:00,82,1:30,3:00,1:45,0:45`
    const result = parseGarminSleep(csv)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].date).toBe('2026-03-01')
    expect(result.nights[0].source).toBe('garmin')
    expect(result.nights[0].deepMin).toBe(90)
    expect(result.nights[0].lightMin).toBe(180)
    expect(result.nights[0].remMin).toBe(105)
    expect(result.nights[0].awakeMin).toBe(45)
    expect(result.nights[0].sleepScore).toBe(82)
    expect(result.nights[0].totalMin).toBe(375) // 90+180+105
  })

  it('handles missing durations', () => {
    const csv = `Calendar Date,Sleep Start,Sleep End,Overall Sleep Score,Deep Sleep Duration,Light Sleep Duration,REM Sleep Duration,Awake Duration
2026-03-01,,,72,,,,`
    const result = parseGarminSleep(csv)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].deepMin).toBeUndefined()
    expect(result.nights[0].sleepScore).toBe(72)
  })
})
