import { parseWhoopSleep } from './whoop'

const SAMPLE_CSV = `Cycle start time,Cycle end time,Sleep onset,Wake onset,Light sleep duration (min),SWS duration (min),REM duration (min),Awake duration (min),Sleep Score,HRV (ms),Respiratory Rate
2026-03-01T22:00:00Z,2026-03-02T06:30:00Z,2026-03-01T22:15:00Z,2026-03-02T06:20:00Z,240,95,110,15,82,48,14.2
2026-03-02T22:30:00Z,2026-03-03T07:00:00Z,2026-03-02T22:40:00Z,2026-03-03T06:50:00Z,210,80,100,20,75,42,15.0`

describe('parseWhoopSleep', () => {
  it('returns empty array for empty input', () => {
    expect(parseWhoopSleep('')).toEqual({ nights: [] })
  })

  it('parses two nights from sample CSV', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights).toHaveLength(2)
  })

  it('maps stage durations correctly', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    const night1 = result.nights[0]
    expect(night1.lightMin).toBe(240)
    expect(night1.deepMin).toBe(95)
    expect(night1.remMin).toBe(110)
    expect(night1.awakeMin).toBe(15)
  })

  it('computes total sleep (light + deep + rem)', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].totalMin).toBe(445)
  })

  it('includes HRV and respiratory rate', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].avgHrv).toBe(48)
    expect(result.nights[0].avgBreath).toBe(14.2)
  })

  it('includes sleep score', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].sleepScore).toBe(82)
  })

  it('sets bedtime and wake time from onset columns', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights[0].bedtime).toContain('2026-03-01')
    expect(result.nights[0].wakeTime).toContain('2026-03-02')
  })

  it('sets source as whoop', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    expect(result.nights.every(n => n.source === 'whoop')).toBe(true)
  })

  it('handles missing optional fields gracefully', () => {
    const csv = `Cycle start time,Cycle end time,Sleep onset,Wake onset,Light sleep duration (min),SWS duration (min),REM duration (min),Awake duration (min),Sleep Score,HRV (ms),Respiratory Rate
2026-03-01T22:00:00Z,2026-03-02T06:00:00Z,2026-03-01T22:15:00Z,2026-03-02T05:50:00Z,200,70,90,10,,,`
    const result = parseWhoopSleep(csv)
    expect(result.nights).toHaveLength(1)
    expect(result.nights[0].avgHrv).toBeUndefined()
    expect(result.nights[0].avgBreath).toBeUndefined()
  })

  it('generates unique IDs', () => {
    const result = parseWhoopSleep(SAMPLE_CSV)
    const ids = result.nights.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
