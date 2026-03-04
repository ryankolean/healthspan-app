import { describe, it, expect, beforeEach } from 'vitest'
import { getOuraData, saveOuraData, hasOuraData } from '@/utils/oura-storage'

beforeEach(() => localStorage.clear())

describe('oura-storage', () => {
  it('returns null when no data is stored', () => {
    expect(getOuraData()).toBeNull()
  })

  it('hasOuraData returns false when empty', () => {
    expect(hasOuraData()).toBe(false)
  })

  it('saves and retrieves oura data', () => {
    const mockData = {
      sleep: [{ day: '2026-03-01', score: 85 }],
      sleepDetail: [], activity: [], readiness: [],
      spo2: [], stress: [], cvAge: [], workouts: [],
      resilience: [], sleeptime: [],
    }
    saveOuraData(mockData as any)
    const result = getOuraData()
    expect(result).not.toBeNull()
    expect(result!.sleep[0].day).toBe('2026-03-01')
  })

  it('hasOuraData returns true after save', () => {
    const empty = {
      sleep: [], sleepDetail: [], activity: [], readiness: [],
      spo2: [], stress: [], cvAge: [], workouts: [],
      resilience: [], sleeptime: [],
    }
    saveOuraData(empty as any)
    expect(hasOuraData()).toBe(true)
  })
})
