import { v4 as uuidv4 } from 'uuid'
import type { BodyCompEntry } from '../../types/body-composition'

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function parseWithingsScale(csv: string): BodyCompEntry[] {
  if (!csv.trim()) return []

  const rows = parseCsvRows(csv)

  return rows.map(row => {
    const dateStr = (row['Date'] ?? '').slice(0, 10)
    const weightKg = parseFloat(row['Weight'])
    const fatMassKg = row['Fat mass'] ? parseFloat(row['Fat mass']) : undefined

    if (isNaN(weightKg) || !dateStr) return null

    const bodyFatPct = fatMassKg !== undefined && !isNaN(fatMassKg) && weightKg > 0
      ? (fatMassKg / weightKg) * 100
      : undefined

    const leanMassKg = bodyFatPct !== undefined
      ? weightKg * (1 - bodyFatPct / 100)
      : undefined

    return {
      id: uuidv4(),
      date: dateStr,
      source: 'withings' as const,
      weightKg,
      bodyFatPct: bodyFatPct !== undefined ? Math.round(bodyFatPct * 10) / 10 : undefined,
      leanMassKg: leanMassKg !== undefined ? Math.round(leanMassKg * 10) / 10 : undefined,
      note: row['Comments'] || undefined,
    }
  }).filter((e): e is BodyCompEntry => e !== null)
}
