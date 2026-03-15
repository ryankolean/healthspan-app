import { v4 as uuidv4 } from 'uuid'
import type { NutritionEntry } from '../../types/nutrition'

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

function optionalInt(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = parseInt(value, 10)
  return isNaN(n) ? undefined : n
}

function findKey(row: Record<string, string>, prefix: string): string | undefined {
  const key = Object.keys(row).find(k => k.toLowerCase().startsWith(prefix))
  return key ? row[key] : undefined
}

export function parseCronometerCsv(csv: string): NutritionEntry[] {
  if (!csv.trim()) return []

  const rows = parseCsvRows(csv)

  return rows.map(row => ({
    id: uuidv4(),
    source: 'cronometer' as const,
    date: row['Date'],
    mealType: 'snack' as const,
    calories: optionalInt(findKey(row, 'calories')),
    proteinG: optionalInt(findKey(row, 'protein')),
    carbsG: optionalInt(findKey(row, 'carbs')),
    fatG: optionalInt(findKey(row, 'fat')),
    fiberG: optionalInt(findKey(row, 'fiber')),
    createdAt: Date.now(),
  }))
}
