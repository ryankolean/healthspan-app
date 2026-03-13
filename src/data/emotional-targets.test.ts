import { EMOTIONAL_TARGETS, getEmotionalStatus } from './emotional-targets'

describe('EMOTIONAL_TARGETS', () => {
  it('has entries for mood, stress, anxiety, energy, wellbeing', () => {
    expect(EMOTIONAL_TARGETS).toHaveLength(5)
    const ids = EMOTIONAL_TARGETS.map(t => t.id)
    expect(ids).toContain('mood')
    expect(ids).toContain('stress')
    expect(ids).toContain('anxiety')
    expect(ids).toContain('energy')
    expect(ids).toContain('wellbeing')
  })

  it('mood target green threshold is 4', () => {
    const mood = EMOTIONAL_TARGETS.find(t => t.id === 'mood')!
    expect(mood.greenMin).toBe(4)
    expect(mood.lowerIsBetter).toBe(false)
  })

  it('stress target is lower-is-better', () => {
    const stress = EMOTIONAL_TARGETS.find(t => t.id === 'stress')!
    expect(stress.lowerIsBetter).toBe(true)
  })
})

describe('getEmotionalStatus', () => {
  it('returns green for mood >= 4', () => {
    expect(getEmotionalStatus('mood', 4)).toBe('green')
    expect(getEmotionalStatus('mood', 5)).toBe('green')
  })

  it('returns amber for mood 3', () => {
    expect(getEmotionalStatus('mood', 3)).toBe('amber')
  })

  it('returns red for mood < 3', () => {
    expect(getEmotionalStatus('mood', 2)).toBe('red')
    expect(getEmotionalStatus('mood', 1)).toBe('red')
  })

  it('returns green for stress <= 2', () => {
    expect(getEmotionalStatus('stress', 1)).toBe('green')
    expect(getEmotionalStatus('stress', 2)).toBe('green')
  })

  it('returns amber for stress 3', () => {
    expect(getEmotionalStatus('stress', 3)).toBe('amber')
  })

  it('returns red for stress > 3', () => {
    expect(getEmotionalStatus('stress', 4)).toBe('red')
    expect(getEmotionalStatus('stress', 5)).toBe('red')
  })

  it('returns green for anxiety <= 2', () => {
    expect(getEmotionalStatus('anxiety', 1)).toBe('green')
    expect(getEmotionalStatus('anxiety', 2)).toBe('green')
  })

  it('returns red for anxiety > 3', () => {
    expect(getEmotionalStatus('anxiety', 4)).toBe('red')
  })

  it('returns green for energy >= 4', () => {
    expect(getEmotionalStatus('energy', 4)).toBe('green')
    expect(getEmotionalStatus('energy', 5)).toBe('green')
  })

  it('returns amber for energy 3', () => {
    expect(getEmotionalStatus('energy', 3)).toBe('amber')
  })

  it('returns red for energy < 3', () => {
    expect(getEmotionalStatus('energy', 2)).toBe('red')
  })

  it('returns green for wellbeing >= 4', () => {
    expect(getEmotionalStatus('wellbeing', 4)).toBe('green')
    expect(getEmotionalStatus('wellbeing', 5)).toBe('green')
  })

  it('returns amber for wellbeing 3', () => {
    expect(getEmotionalStatus('wellbeing', 3)).toBe('amber')
  })

  it('returns red for wellbeing < 3', () => {
    expect(getEmotionalStatus('wellbeing', 2)).toBe('red')
    expect(getEmotionalStatus('wellbeing', 1)).toBe('red')
  })

  it('returns red for unknown metric', () => {
    expect(getEmotionalStatus('unknown', 5)).toBe('red')
  })
})
