import { parseOuraSleep } from './oura'

const SAMPLE_OURA = {
  sleep: [
    { day: '2026-03-01', score: 85, deep: 80, rem: 75, efficiency: 90 },
    { day: '2026-03-02', score: 72, deep: 60, rem: 65, efficiency: 82 },
  ],
  sleepDetail: [
    {
      day: '2026-03-01',
      deep_s: 5400,
      rem_s: 6600,
      light_s: 14400,
      total_s: 28800,
      avg_hr: 58,
      lowest_hr: 52,
      avg_hrv: 45,
      efficiency: 92,
      avg_breath: 14,
    },
    {
      day: '2026-03-02',
      deep_s: 3600,
      rem_s: 4500,
      light_s: 12600,
      total_s: 25200,
      avg_hr: 62,
      lowest_hr: 55,
      avg_hrv: 38,
      efficiency: 84,
    },
  ],
}

describe('parseOuraSleep', () => {
  it('returns empty array for null input', () => {
    expect(parseOuraSleep(null)).toEqual({ nights: [] })
  })

  it('returns empty array when sleep array is missing', () => {
    expect(parseOuraSleep({ sleep: [], sleepDetail: [] })).toEqual({ nights: [] })
  })

  it('parses two nights from sample data', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    expect(result.nights).toHaveLength(2)
  })

  it('converts seconds to minutes for sleep stages', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const night1 = result.nights.find(n => n.date === '2026-03-01')!
    expect(night1.deepMin).toBe(90)
    expect(night1.remMin).toBe(110)
    expect(night1.lightMin).toBe(240)
    expect(night1.totalMin).toBe(480)
  })

  it('includes HR, HRV, efficiency, breath from sleepDetail', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const night1 = result.nights.find(n => n.date === '2026-03-01')!
    expect(night1.avgHr).toBe(58)
    expect(night1.lowestHr).toBe(52)
    expect(night1.avgHrv).toBe(45)
    expect(night1.efficiency).toBe(92)
    expect(night1.avgBreath).toBe(14)
  })

  it('includes sleep score from DailySleep', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const night1 = result.nights.find(n => n.date === '2026-03-01')!
    expect(night1.sleepScore).toBe(85)
  })

  it('sets source as oura with correct sourceId', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    expect(result.nights.every(n => n.source === 'oura')).toBe(true)
    expect(result.nights[0].sourceId).toBe('oura-2026-03-01')
  })

  it('handles sleepDetail missing for a day (graceful fallback)', () => {
    const data = {
      sleep: [{ day: '2026-03-01', score: 80 }],
      sleepDetail: [],
    }
    const result = parseOuraSleep(data)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].sleepScore).toBe(80)
    expect(result.nights[0].deepMin).toBeUndefined()
  })

  it('generates unique IDs', () => {
    const result = parseOuraSleep(SAMPLE_OURA)
    const ids = result.nights.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
