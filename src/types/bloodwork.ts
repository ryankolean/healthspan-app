export type MarkerStatus = 'optimal' | 'acceptable' | 'attention'
export type Confidence = 'high' | 'low'

export interface BloodMarker {
  id: string
  name: string
  value: number
  unit: string
  status: MarkerStatus
  flagged?: boolean
  flagReason?: string
  confidence?: Confidence
  rawText?: string
}

export interface LabResult {
  id: string
  /** ISO 8601 date string: YYYY-MM-DD */
  drawDate: string
  institution: string
  markers: BloodMarker[]
  createdAt: number
}

export interface ParsedMarker {
  name: string
  value: number
  unit: string
  rawText: string
  confidence: Confidence
}

export interface ParsedLabDoc {
  markers: ParsedMarker[]
  /** ISO 8601 date string: YYYY-MM-DD */
  drawDate: string
  institution: string
}
