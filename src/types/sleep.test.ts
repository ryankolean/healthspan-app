import type { SleepNight, SleepSettings, SleepSource } from './sleep'
import { DEFAULT_SLEEP_SETTINGS } from './sleep'

describe('Sleep types', () => {
  it('DEFAULT_SLEEP_SETTINGS has correct shape', () => {
    expect(DEFAULT_SLEEP_SETTINGS.globalPriority).toEqual(['oura', 'apple_health', 'whoop', 'garmin', 'fitbit', 'samsung', 'manual'])
  })

  it('DEFAULT_SLEEP_SETTINGS is deeply frozen (as const)', () => {
    expect(() => {
      ;(DEFAULT_SLEEP_SETTINGS as any).globalPriority = []
    }).toThrow()
  })

  it('SleepNight fields compile correctly', () => {
    const night: SleepNight = {
      id: 'test',
      source: 'oura',
      sourceId: 'oura-2026-03-01',
      date: '2026-03-01',
      totalMin: 480,
      deepMin: 90,
      remMin: 110,
      lightMin: 240,
      awakeMin: 40,
      efficiency: 92,
      createdAt: Date.now(),
    }
    expect(night.source).toBe('oura')
    expect(night.totalMin).toBe(480)
  })
})
