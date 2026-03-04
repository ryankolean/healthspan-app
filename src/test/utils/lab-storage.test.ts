import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveLabResult, getLabResults, getLabResult, deleteLabResult,
  getApiKey, setApiKey, clearApiKey,
} from '@/utils/lab-storage'
import type { LabResult } from '@/types/bloodwork'

const mockResult: LabResult = {
  id: 'lab-2026-03-01',
  drawDate: '2026-03-01',
  institution: 'LabCorp',
  markers: [],
  createdAt: 1234567890,
}

beforeEach(() => localStorage.clear())

describe('lab results', () => {
  it('saves and retrieves a lab result', () => {
    saveLabResult(mockResult)
    const results = getLabResults()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('lab-2026-03-01')
  })

  it('getLabResult returns single result by id', () => {
    saveLabResult(mockResult)
    const r = getLabResult('lab-2026-03-01')
    expect(r?.drawDate).toBe('2026-03-01')
  })

  it('returns null for missing id', () => {
    expect(getLabResult('missing')).toBeNull()
  })

  it('deletes a result', () => {
    saveLabResult(mockResult)
    deleteLabResult('lab-2026-03-01')
    expect(getLabResults()).toHaveLength(0)
  })

  it('does not overwrite existing results on save', () => {
    saveLabResult(mockResult)
    const second = { ...mockResult, id: 'lab-2026-02-01', drawDate: '2026-02-01' }
    saveLabResult(second)
    expect(getLabResults()).toHaveLength(2)
  })

  it('sorts results by drawDate descending', () => {
    saveLabResult(mockResult)
    const second = { ...mockResult, id: 'lab-2026-02-01', drawDate: '2026-02-01' }
    saveLabResult(second)
    const results = getLabResults()
    expect(results[0].drawDate).toBe('2026-03-01')
    expect(results[1].drawDate).toBe('2026-02-01')
  })
})

describe('api key', () => {
  it('saves and retrieves api key', () => {
    setApiKey('sk-ant-test')
    expect(getApiKey()).toBe('sk-ant-test')
  })

  it('clears api key', () => {
    setApiKey('sk-ant-test')
    clearApiKey()
    expect(getApiKey()).toBeNull()
  })
})
