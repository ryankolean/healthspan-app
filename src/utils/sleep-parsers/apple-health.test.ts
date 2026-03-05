import { parseAppleHealthSleep } from './apple-health'

function makeXml(records: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  ${records}
</HealthData>`
}

const SAMPLE_XML = makeXml(`
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisInBed"
    startDate="2026-03-01 22:00:00 +0000"
    endDate="2026-03-02 06:30:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAsleepDeep"
    startDate="2026-03-01 22:30:00 +0000"
    endDate="2026-03-02 00:00:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAsleepREM"
    startDate="2026-03-02 00:00:00 +0000"
    endDate="2026-03-02 01:45:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAsleepCore"
    startDate="2026-03-02 01:45:00 +0000"
    endDate="2026-03-02 05:30:00 +0000" />
  <Record type="HKCategoryTypeIdentifierSleepAnalysis"
    value="HKCategoryValueSleepAnalysisAwake"
    startDate="2026-03-02 05:30:00 +0000"
    endDate="2026-03-02 05:45:00 +0000" />
`)

describe('parseAppleHealthSleep', () => {
  it('returns empty array for empty HealthData', () => {
    const result = parseAppleHealthSleep('<HealthData></HealthData>')
    expect(result.nights).toEqual([])
  })

  it('parses one night from sample XML', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    expect(result.nights).toHaveLength(1)
  })

  it('computes stage durations in minutes', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    expect(night.deepMin).toBe(90)
    expect(night.remMin).toBe(105)
    expect(night.lightMin).toBe(225)
    expect(night.awakeMin).toBe(15)
  })

  it('sets bedtime and wake time from InBed record', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    expect(night.bedtime).toContain('2026-03-01')
    expect(night.wakeTime).toContain('2026-03-02')
  })

  it('computes total sleep minutes (stages excluding awake)', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    expect(night.totalMin).toBe(420)
  })

  it('computes efficiency = total sleep / time in bed * 100', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    const night = result.nights[0]
    expect(night.efficiency).toBeCloseTo(82.4, 0)
  })

  it('uses sleep start date as the night date', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    expect(result.nights[0].date).toBe('2026-03-01')
  })

  it('sets source as apple_health', () => {
    const result = parseAppleHealthSleep(SAMPLE_XML)
    expect(result.nights[0].source).toBe('apple_health')
  })

  it('generates unique IDs for multiple nights', () => {
    const xml = makeXml(`
      <Record type="HKCategoryTypeIdentifierSleepAnalysis"
        value="HKCategoryValueSleepAnalysisInBed"
        startDate="2026-03-01 22:00:00 +0000"
        endDate="2026-03-02 06:00:00 +0000" />
      <Record type="HKCategoryTypeIdentifierSleepAnalysis"
        value="HKCategoryValueSleepAnalysisInBed"
        startDate="2026-03-02 22:00:00 +0000"
        endDate="2026-03-03 06:00:00 +0000" />
    `)
    const result = parseAppleHealthSleep(xml)
    expect(result.nights).toHaveLength(2)
    expect(result.nights[0].id).not.toBe(result.nights[1].id)
  })
})
