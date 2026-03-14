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
  const lines = csv.trim().split('\n').filter(l => !l.startsWith('#'))
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

export function parseSamsungSleep(csv: string): { nights: SleepNight[] } {
  if (!csv.trim()) return { nights: [] }

  const rows = parseCsvRows(csv)

  const nights: SleepNight[] = rows.map(row => {
    const startTime = row['start_time'] ?? ''
    const endTime = row['end_time'] ?? ''
    const date = endTime.slice(0, 10)

    return {
      id: uuidv4(),
      source: 'samsung' as const,
      sourceId: `samsung-${date}`,
      date,
      bedtime: startTime,
      wakeTime: endTime,
      totalMin: parseOptionalInt(row['sleep_duration']),
      efficiency: parseOptionalInt(row['efficiency']),
      createdAt: Date.now(),
    }
  })

  return { nights }
}
