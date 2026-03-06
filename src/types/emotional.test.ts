import type { EmotionalEntry, EmotionalSource } from './emotional'

describe('Emotional types', () => {
  it('EmotionalEntry fields compile correctly', () => {
    const entry: EmotionalEntry = {
      id: 'test',
      source: 'manual',
      date: '2026-03-01',
      mood: 4,
      stress: 2,
      anxiety: 1,
      energy: 5,
      journalText: 'Feeling great today',
      createdAt: Date.now(),
    }
    expect(entry.source).toBe('manual')
    expect(entry.mood).toBe(4)
  })

  it('EmotionalSource only allows manual', () => {
    const source: EmotionalSource = 'manual'
    expect(source).toBe('manual')
  })

  it('optional fields are truly optional', () => {
    const entry: EmotionalEntry = {
      id: 'minimal',
      source: 'manual',
      date: '2026-03-01',
      createdAt: Date.now(),
    }
    expect(entry.mood).toBeUndefined()
    expect(entry.journalText).toBeUndefined()
    expect(entry.audioId).toBeUndefined()
    expect(entry.hasAudio).toBeUndefined()
  })
})
