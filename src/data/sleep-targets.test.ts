import { SLEEP_TARGETS, getSleepStatus } from './sleep-targets'

describe('SLEEP_TARGETS', () => {
  it('has entries for total, deep, rem, efficiency, onset', () => {
    expect(SLEEP_TARGETS).toHaveLength(5)
    const ids = SLEEP_TARGETS.map(t => t.id)
    expect(ids).toContain('total')
    expect(ids).toContain('deep')
    expect(ids).toContain('rem')
    expect(ids).toContain('efficiency')
    expect(ids).toContain('onset')
  })

  it('total sleep target is 420 min (7 hrs)', () => {
    const total = SLEEP_TARGETS.find(t => t.id === 'total')!
    expect(total.greenMin).toBe(420)
  })
})

describe('getSleepStatus', () => {
  it('returns green for total >= 420 min', () => {
    expect(getSleepStatus('total', 480)).toBe('green')
  })

  it('returns amber for total 360-419 min', () => {
    expect(getSleepStatus('total', 390)).toBe('amber')
  })

  it('returns red for total < 360 min', () => {
    expect(getSleepStatus('total', 300)).toBe('red')
  })

  it('returns green for efficiency >= 90', () => {
    expect(getSleepStatus('efficiency', 92)).toBe('green')
  })

  it('returns amber for efficiency 80-89', () => {
    expect(getSleepStatus('efficiency', 85)).toBe('amber')
  })

  it('returns red for efficiency < 80', () => {
    expect(getSleepStatus('efficiency', 75)).toBe('red')
  })

  it('returns green for onset <= 20 min (lower is better)', () => {
    expect(getSleepStatus('onset', 15)).toBe('green')
  })

  it('returns red for onset > 40 min', () => {
    expect(getSleepStatus('onset', 50)).toBe('red')
  })

  it('returns green for deep >= 90 min', () => {
    expect(getSleepStatus('deep', 95)).toBe('green')
  })

  it('returns green for rem >= 105 min', () => {
    expect(getSleepStatus('rem', 110)).toBe('green')
  })
})
