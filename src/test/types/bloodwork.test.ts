import { describe, it, expect } from 'vitest'
import type { BloodMarker, LabResult, ParsedLabDoc } from '@/types/bloodwork'

describe('bloodwork types', () => {
  it('BloodMarker has required fields', () => {
    const marker: BloodMarker = {
      id: 'apob',
      name: 'ApoB',
      value: 85,
      unit: 'mg/dL',
      status: 'optimal',
    }
    expect(marker.id).toBe('apob')
    expect(marker.status).toBe('optimal')
  })

  it('LabResult has markers array and drawDate', () => {
    const result: LabResult = {
      id: 'lab-2026-03-01',
      drawDate: '2026-03-01',
      institution: 'LabCorp',
      markers: [],
      createdAt: Date.now(),
    }
    expect(result.markers).toHaveLength(0)
  })

  it('ParsedLabDoc has confidence field per marker', () => {
    const doc: ParsedLabDoc = {
      markers: [{ name: 'ApoB', value: 85, unit: 'mg/dL', rawText: 'ApoB 85 mg/dL', confidence: 'high' }],
      drawDate: '2026-03-01',
      institution: 'LabCorp',
    }
    expect(doc.markers[0].confidence).toBe('high')
  })
})
