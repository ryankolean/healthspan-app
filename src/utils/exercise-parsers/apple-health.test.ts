// src/utils/exercise-parsers/apple-health.test.ts
import { parseAppleHealthXml } from './apple-health'

function makeXml(workouts: string, records: string = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  ${workouts}
  ${records}
</HealthData>`
}

const SAMPLE_XML = makeXml(
  `<Workout workoutActivityType="HKWorkoutActivityTypeRunning"
    startDate="2026-03-01 08:00:00 +0000"
    endDate="2026-03-01 09:00:00 +0000"
    duration="60.0"
    totalEnergyBurned="450"
    totalDistance="10.0" />
  <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining"
    startDate="2026-03-02 10:00:00 +0000"
    endDate="2026-03-02 11:00:00 +0000"
    duration="60.0"
    totalEnergyBurned="300" />`,
  `<Record type="HKQuantityTypeIdentifierVO2Max"
    startDate="2026-03-01 09:00:00 +0000"
    endDate="2026-03-01 09:00:00 +0000"
    value="52.3"
    unit="mL/min·kg" />`
)

describe('parseAppleHealthXml', () => {
  it('returns empty arrays for empty HealthData', () => {
    const result = parseAppleHealthXml('<HealthData></HealthData>', 35)
    expect(result.workouts).toEqual([])
    expect(result.vo2max).toEqual([])
  })

  it('parses running workout as cardio', () => {
    const result = parseAppleHealthXml(SAMPLE_XML, 35)
    expect(result.workouts).toHaveLength(2)
    const run = result.workouts.find(w => w.type === 'cardio')!
    expect(run.source).toBe('apple_health')
    expect(run.durationMin).toBeCloseTo(60, 0)
    expect(run.date).toBe('2026-03-01')
    expect(run.calories).toBe(450)
  })

  it('parses strength workout correctly', () => {
    const result = parseAppleHealthXml(SAMPLE_XML, 35)
    const strength = result.workouts.find(w => w.type === 'strength')!
    expect(strength.activityName).toContain('StrengthTraining')
  })

  it('parses VO2 max record', () => {
    const result = parseAppleHealthXml(SAMPLE_XML, 35)
    expect(result.vo2max).toHaveLength(1)
    expect(result.vo2max[0].value).toBeCloseTo(52.3, 1)
    expect(result.vo2max[0].source).toBe('apple_health')
    expect(result.vo2max[0].method).toBe('apple_watch')
  })

  it('generates unique IDs for workouts', () => {
    const result = parseAppleHealthXml(SAMPLE_XML, 35)
    const ids = result.workouts.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
