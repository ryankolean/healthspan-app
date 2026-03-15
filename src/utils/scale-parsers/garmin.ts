import { v4 as uuidv4 } from 'uuid'
import type { BodyCompEntry } from '../../types/body-composition'

export function parseGarminScale(csv: string): BodyCompEntry[] {
  if (!csv.trim()) return []

  const lines = csv.trim().split('\n')
  const startIdx = lines[0].trim().toLowerCase() === 'body' ? 1 : 0
  if (lines.length < startIdx + 2) return []

  const headers = lines[startIdx].split(',').map(h => h.trim().toLowerCase())
  const weightIdx = headers.indexOf('weight')
  const fatIdx = headers.indexOf('fat')
  const dateIdx = headers.indexOf('date')

  if (weightIdx === -1 || dateIdx === -1) return []

  return lines.slice(startIdx + 1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const weightKg = parseFloat(cols[weightIdx])
    const fatRaw = fatIdx !== -1 ? parseFloat(cols[fatIdx]) : NaN
    const date = cols[dateIdx]

    if (isNaN(weightKg) || !date) return null

    const bodyFatPct = !isNaN(fatRaw) && fatRaw > 0 ? fatRaw : undefined
    const leanMassKg = bodyFatPct !== undefined
      ? Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10
      : undefined

    return {
      id: uuidv4(),
      date,
      source: 'garmin' as const,
      weightKg,
      bodyFatPct,
      leanMassKg,
    }
  }).filter((e): e is BodyCompEntry => e !== null)
}
