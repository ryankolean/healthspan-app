import { v4 as uuidv4 } from 'uuid'
import type { BodyCompEntry } from '../../types/body-composition'

const LBS_TO_KG = 0.453592

interface FitbitWeightEntry {
  logId: number
  weight: number    // lbs
  bmi: number
  fat?: number      // percentage
  date: string      // MM/DD/YY
  time: string
  source: string
}

function parseFitbitDate(dateStr: string): string {
  // MM/DD/YY → YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length !== 3) return ''
  const [month, day, year] = parts
  const fullYear = parseInt(year, 10) < 50 ? `20${year}` : `19${year}`
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function parseFitbitScale(jsonStr: string): BodyCompEntry[] {
  if (!jsonStr.trim()) return []

  let entries: FitbitWeightEntry[]
  try {
    entries = JSON.parse(jsonStr)
  } catch {
    return []
  }

  if (!Array.isArray(entries)) return []

  return entries.map(entry => {
    const date = parseFitbitDate(entry.date)
    const weightKg = Math.round(entry.weight * LBS_TO_KG * 10) / 10
    const bodyFatPct = entry.fat != null && entry.fat > 0 ? entry.fat : undefined

    if (!date || isNaN(weightKg)) return null

    const leanMassKg = bodyFatPct !== undefined
      ? Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10
      : undefined

    return {
      id: uuidv4(),
      date,
      source: 'fitbit' as const,
      weightKg,
      bodyFatPct,
      leanMassKg,
    }
  }).filter((e): e is BodyCompEntry => e !== null)
}
