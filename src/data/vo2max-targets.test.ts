import { getVO2MaxTargets, VO2MAX_TARGETS } from './vo2max-targets'

describe('getVO2MaxTargets', () => {
  it('returns targets for a 40-year-old male', () => {
    const t = getVO2MaxTargets(40, 'male')
    expect(t.aboveAverage).toBeGreaterThan(0)
    expect(t.superior).toBeGreaterThan(t.aboveAverage)
    expect(t.elite).toBeGreaterThan(t.superior)
  })

  it('returns targets for a 40-year-old female', () => {
    const t = getVO2MaxTargets(40, 'female')
    expect(t.superior).toBe(41)
  })

  it('returns targets for a 50-year-old male', () => {
    const t = getVO2MaxTargets(50, 'male')
    expect(t).toBeDefined()
  })

  it('returns targets for edge age 20', () => {
    const t = getVO2MaxTargets(20, 'male')
    expect(t).toBeDefined()
  })

  it('returns targets for age 70 (uses 65+ bracket)', () => {
    const t = getVO2MaxTargets(70, 'male')
    expect(t).toBeDefined()
  })
})
