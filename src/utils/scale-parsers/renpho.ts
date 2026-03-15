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

function findCol(row: Record<string, string>, prefix: string): string | undefined {
  const key = Object.keys(row).find(k => k.toLowerCase().startsWith(prefix))
  return key ? row[key] : undefined
}

export function parseRenphoScale(csv: string): BodyCompEntry[] {
  if (!csv.trim()) return []

  const rows = parseCsvRows(csv)

  return rows.map(row => {
    const dateStr = (row['Time of Measurement'] ?? '').slice(0, 10)
    const weightRaw = findCol(row, 'weight')
    const weightKg = weightRaw ? parseFloat(weightRaw) : NaN
    const bodyFatRaw = findCol(row, 'body fat')
    const bodyFatPct = bodyFatRaw && bodyFatRaw !== '' ? parseFloat(bodyFatRaw) : undefined

    if (isNaN(weightKg) || !dateStr) return null

    const leanMassKg = bodyFatPct !== undefined && !isNaN(bodyFatPct) && weightKg > 0
      ? weightKg * (1 - bodyFatPct / 100)
      : undefined

    return {
      id: uuidv4(),
      date: dateStr,
      source: 'renpho' as const,
      weightKg,
      bodyFatPct: bodyFatPct !== undefined && !isNaN(bodyFatPct)
        ? Math.round(bodyFatPct * 10) / 10
        : undefined,
      leanMassKg: leanMassKg !== undefined
        ? Math.round(leanMassKg * 10) / 10
        : undefined,
    }
  }).filter((e): e is NonNullable<typeof e> => e !== null)
}
