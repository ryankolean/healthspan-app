import { MOLECULES_TARGETS, getAdherenceStatus } from './molecules-targets'

describe('MOLECULES_TARGETS', () => {
  it('has an adherence target', () => {
    expect(MOLECULES_TARGETS).toHaveLength(1)
    expect(MOLECULES_TARGETS[0].id).toBe('adherence')
  })

  it('adherence green threshold is 90', () => {
    const adherence = MOLECULES_TARGETS.find(t => t.id === 'adherence')!
    expect(adherence.greenMin).toBe(90)
    expect(adherence.amberMin).toBe(70)
  })
})

describe('getAdherenceStatus', () => {
  it('returns green for adherence >= 90%', () => {
    expect(getAdherenceStatus(90)).toBe('green')
    expect(getAdherenceStatus(95)).toBe('green')
    expect(getAdherenceStatus(100)).toBe('green')
  })

  it('returns amber for adherence >= 70% and < 90%', () => {
    expect(getAdherenceStatus(70)).toBe('amber')
    expect(getAdherenceStatus(80)).toBe('amber')
    expect(getAdherenceStatus(89)).toBe('amber')
  })

  it('returns red for adherence < 70%', () => {
    expect(getAdherenceStatus(69)).toBe('red')
    expect(getAdherenceStatus(50)).toBe('red')
    expect(getAdherenceStatus(0)).toBe('red')
  })

  it('handles edge case of exactly 90', () => {
    expect(getAdherenceStatus(90)).toBe('green')
  })

  it('handles edge case of exactly 70', () => {
    expect(getAdherenceStatus(70)).toBe('amber')
  })
})
