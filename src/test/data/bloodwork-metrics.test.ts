import { describe, it, expect } from 'vitest'
import { BLOODWORK_MARKERS, BLOODWORK_PANELS } from '@/data/bloodwork-metrics'

describe('bloodwork-metrics', () => {
  it('exports at least 20 core markers', () => {
    expect(BLOODWORK_MARKERS.length).toBeGreaterThanOrEqual(25)
  })

  it('every marker has id, name, unit, optimal, acceptable, panel', () => {
    BLOODWORK_MARKERS.forEach(m => {
      expect(m.id).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(m.unit).toBeTruthy()
      expect(m.optimal).toBeDefined()
      expect(m.acceptable).toBeDefined()
      expect(m.panel).toBeTruthy()
    })
  })

  it('HOMA-IR is marked as computed', () => {
    const homaIr = BLOODWORK_MARKERS.find(m => m.id === 'homa_ir')
    expect(homaIr?.computed).toBe(true)
  })

  it('panels list matches marker panels', () => {
    const markerPanels = new Set(BLOODWORK_MARKERS.map(m => m.panel))
    BLOODWORK_PANELS.forEach(p => expect(markerPanels.has(p)).toBe(true))
  })

  it('all markers with non-null range bounds have min <= max', () => {
    BLOODWORK_MARKERS.forEach(m => {
      const [optLow, optHigh] = m.optimal
      const [accLow, accHigh] = m.acceptable
      if (optLow !== null && optHigh !== null) expect(optLow).toBeLessThanOrEqual(optHigh)
      if (accLow !== null && accHigh !== null) expect(accLow).toBeLessThanOrEqual(accHigh)
    })
  })

  it('all markers have positive weight', () => {
    BLOODWORK_MARKERS.forEach(m => {
      expect(m.weight).toBeGreaterThan(0)
    })
  })

  it('hemoglobin has sexVariant with female ranges', () => {
    const hgb = BLOODWORK_MARKERS.find(m => m.id === 'hemoglobin')
    expect(hgb?.sexVariant?.female).toBeDefined()
  })
})
