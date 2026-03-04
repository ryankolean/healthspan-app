import { BLOODWORK_MARKERS } from '../data/bloodwork-metrics'
import type { MarkerStatus } from '../types/bloodwork'

// Physiologically impossible bounds — values outside these are clearly data errors
const IMPOSSIBLE_BOUNDS: Record<string, { min?: number; max?: number }> = {
  fasting_glucose: { min: 20, max: 600 },
  hba1c: { min: 2, max: 20 },
  apob: { min: 10, max: 400 },
  ldl_c: { min: 10, max: 500 },
  hdl_c: { min: 5, max: 200 },
  triglycerides: { min: 20, max: 2000 },
  fasting_insulin: { min: 0.5, max: 300 },
  alt: { min: 0, max: 5000 },
  ast: { min: 0, max: 5000 },
  tsh: { min: 0.01, max: 100 },
  vitamin_d: { min: 5, max: 250 },
  testosterone_total: { min: 5, max: 3000 },
}

// Values that strongly suggest a unit mismatch
// e.g. ApoB entered as mmol/L value but unit field says mg/dL
const UNIT_MISMATCH_HINTS: Record<string, { suspectBelow?: number; suspectAbove?: number }> = {
  apob: { suspectBelow: 5 },
  ldl_c: { suspectBelow: 10 },
  triglycerides: { suspectBelow: 10 },
  testosterone_total: { suspectBelow: 5 },
  fasting_glucose: { suspectBelow: 20 },  // Values <20 strongly suggest mmol/L entry (normal mmol/L range is 3.9–7.0)
}

interface ValidationResult {
  flagged: boolean
  flagReason?: string
}

export function validateMarkerValue(
  markerId: string,
  value: number,
  _unit: string
): ValidationResult {
  // Check unit mismatch hints first — they are a more specific/actionable diagnosis
  const unitHint = UNIT_MISMATCH_HINTS[markerId]
  if (unitHint) {
    if (unitHint.suspectBelow !== undefined && value < unitHint.suspectBelow) {
      return { flagged: true, flagReason: `Value ${value} may indicate a unit mismatch — check units` }
    }
    if (unitHint.suspectAbove !== undefined && value > unitHint.suspectAbove) {
      return { flagged: true, flagReason: `Value ${value} may indicate a unit mismatch — check units` }
    }
  }

  const impossible = IMPOSSIBLE_BOUNDS[markerId]
  if (impossible) {
    if (impossible.min !== undefined && value < impossible.min) {
      return { flagged: true, flagReason: `Value ${value} is physiologically impossible (below minimum ${impossible.min})` }
    }
    if (impossible.max !== undefined && value > impossible.max) {
      return { flagged: true, flagReason: `Value ${value} is physiologically impossible (above maximum ${impossible.max})` }
    }
  }

  return { flagged: false }
}

export function computeMarkerStatus(markerId: string, value: number, sex?: 'male' | 'female'): MarkerStatus {
  const def = BLOODWORK_MARKERS.find(m => m.id === markerId)
  if (!def) return 'acceptable'

  // Use sex-variant ranges if available and sex is specified
  const optimal = (sex === 'female' && def.sexVariant?.female)
    ? def.sexVariant.female.optimal
    : def.optimal
  const acceptable = (sex === 'female' && def.sexVariant?.female)
    ? def.sexVariant.female.acceptable
    : def.acceptable
  const thresh = def.attentionThreshold

  // Strict comparison: < and > (not <= and >=) for attention thresholds
  if (thresh.low !== undefined && value < thresh.low) return 'attention'
  if (thresh.high !== undefined && value > thresh.high) return 'attention'

  const inOptLow = optimal[0] === null || value >= optimal[0]
  const inOptHigh = optimal[1] === null || value <= optimal[1]
  if (inOptLow && inOptHigh) return 'optimal'

  const inAccLow = acceptable[0] === null || value >= acceptable[0]
  const inAccHigh = acceptable[1] === null || value <= acceptable[1]
  if (inAccLow && inAccHigh) return 'acceptable'

  return 'attention'
}

export function computeHomaIr(
  glucose: number | null,
  insulin: number | null
): number | null {
  if (glucose === null || insulin === null) return null
  return (glucose * insulin) / 405
}
