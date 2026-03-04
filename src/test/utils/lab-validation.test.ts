import { describe, it, expect } from 'vitest'
import { validateMarkerValue, computeMarkerStatus, computeHomaIr } from '@/utils/lab-validation'

describe('validateMarkerValue', () => {
  it('flags physiologically impossible glucose', () => {
    const result = validateMarkerValue('fasting_glucose', 700, 'mg/dL')
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

  it('flags fasting glucose values that suggest mmol/L unit entry', () => {
    const result = validateMarkerValue('fasting_glucose', 5.2, 'mg/dL')
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

  it('uses female ranges for hemoglobin when sex is female', () => {
    // Female optimal is [12, 15] — value 13 should be optimal for female, acceptable for male
    expect(computeMarkerStatus('hemoglobin', 13, 'female')).toBe('optimal')
    expect(computeMarkerStatus('hemoglobin', 13)).toBe('acceptable')
  })

  it('returns attention at exact attentionThreshold boundary using strict comparison', () => {
    // homocysteine: acceptable [null, 12], attentionThreshold.high 12
    // Exactly 12 should NOT be attention (strict >), it falls within acceptable
    expect(computeMarkerStatus('homocysteine', 12)).toBe('acceptable')
    // 12.1 exceeds attentionThreshold.high of 12 — should be attention
    expect(computeMarkerStatus('homocysteine', 12.1)).toBe('attention')
  })

  it('handles null upper bound correctly (HDL-C style)', () => {
    // HDL-C optimal is [60, null] — value 80 should be optimal
    expect(computeMarkerStatus('hdl_c', 80)).toBe('optimal')
    // Value 45 is in acceptable [40, null]
    expect(computeMarkerStatus('hdl_c', 45)).toBe('acceptable')
    // Value 35 is below attentionThreshold.low: 40 — should be attention
    expect(computeMarkerStatus('hdl_c', 35)).toBe('attention')
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
