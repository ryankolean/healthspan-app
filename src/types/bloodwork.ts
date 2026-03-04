export type MarkerStatus = 'optimal' | 'acceptable' | 'attention'
export type Confidence = 'high' | 'low'

export interface BloodMarker {
  id: string
  name: string
  value: number
  unit: string
  status: MarkerStatus
  drawDate: string
  flagged?: boolean
  flagReason?: string
  confidence?: Confidence
  rawText?: string
}

export interface LabResult {
  id: string
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
  drawDate: string
  institution: string
}
