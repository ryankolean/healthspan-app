export interface BodyCompEntry {
  id: string
  date: string           // YYYY-MM-DD
  weightKg: number
  bodyFatPct?: number
  leanMassKg?: number    // auto-calculated: weightKg * (1 - bodyFatPct/100)
  waistCm?: number
  note?: string
}
