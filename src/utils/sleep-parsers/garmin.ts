import { v4 as uuidv4 } from 'uuid'
import type { SleepNight } from '../../types/sleep'

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

function parseOptionalInt(val: string): number | undefined {
  if (!val) return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}

function parseDurationToMin(val: string): number | undefined {
  if (!val) return undefined
  const parts = val.split(':')
  if (parts.length !== 2) return undefined
  const hours = parseInt(parts[0], 10)
  const mins = parseInt(parts[1], 10)
  if (isNaN(hours) || isNaN(mins)) return undefined
  return hours * 60 + mins
}

export function parseGarminSleep(csv: string): { nights: SleepNight[] } {
  if (!csv.trim()) return { nights: [] }

  const rows = parseCsvRows(csv)

  const nights: SleepNight[] = rows.map(row => {
    const date = row['Calendar Date'] ?? ''
    const sleepStart = row['Sleep Start'] ?? ''
    const sleepEnd = row['Sleep End'] ?? ''

    const deepMin = parseDurationToMin(row['Deep Sleep Duration'])
    const lightMin = parseDurationToMin(row['Light Sleep Duration'])
    const remMin = parseDurationToMin(row['REM Sleep Duration'])
    const awakeMin = parseDurationToMin(row['Awake Duration'])
    const totalMin = (deepMin ?? 0) + (lightMin ?? 0) + (remMin ?? 0)

    return {
      id: uuidv4(),
      source: 'garmin' as const,
      sourceId: `garmin-${date}`,
      date,
      bedtime: sleepStart || undefined,
      wakeTime: sleepEnd || undefined,
      totalMin: totalMin > 0 ? totalMin : undefined,
      deepMin,
      remMin,
      lightMin,
      awakeMin,
      sleepScore: parseOptionalInt(row['Overall Sleep Score']),
      createdAt: Date.now(),
    }
  })

  return { nights }
}
