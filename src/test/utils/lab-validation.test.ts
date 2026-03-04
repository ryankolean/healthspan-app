import { describe, it, expect } from 'vitest'
import { validateMarkerValue, computeMarkerStatus, computeHomaIr } from '@/utils/lab-validation'

describe('validateMarkerValue', () => {
  it('flags physiologically impossible glucose', () => {
    const result = validateMarkerValue('fasting_glucose', 4, 'mg/dL')
    expect(result.flagged).toBe(true)
    expect(result.flagReason).toContain('impossible')
  })

  it('flags impossibly high HbA1c', () => {
    const result = validateMarkerValue('hba1c', 45, '%')
    expect(result.flagged).toBe(true)
  })

  it('does not flag a normal ApoB', () => {
    const result = validateMarkerValue('apob', 85, 'mg/dL')
    expect(result.flagged).toBe(false)
  })

  it('flags a unit mismatch hint when value suggests wrong unit', () => {
    const result = validateMarkerValue('apob', 0.8, 'mg/dL')
    expect(result.flagged).toBe(true)
    expect(result.flagReason).toContain('unit')
  })
})

describe('computeMarkerStatus', () => {
  it('returns optimal when value is in optimal range', () => {
    expect(computeMarkerStatus('apob', 75)).toBe('optimal')
  })

  it('returns acceptable when value is outside optimal but inside acceptable', () => {
    expect(computeMarkerStatus('apob', 100)).toBe('acceptable')
  })

  it('returns attention when value exceeds attention threshold', () => {
    expect(computeMarkerStatus('apob', 130)).toBe('attention')
  })

  it('returns optimal for in-range glucose', () => {
    expect(computeMarkerStatus('fasting_glucose', 80)).toBe('optimal')
  })

  it('unknown marker id returns acceptable', () => {
    expect(computeMarkerStatus('unknown_marker', 50)).toBe('acceptable')
  })
})

describe('computeHomaIr', () => {
  it('computes HOMA-IR from glucose and insulin', () => {
    const result = computeHomaIr(85, 5)
    expect(result).toBeCloseTo(1.049, 2)
  })

  it('returns null if glucose is null', () => {
    expect(computeHomaIr(null, 5)).toBeNull()
  })

  it('returns null if insulin is null', () => {
    expect(computeHomaIr(85, null)).toBeNull()
  })
})
