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

function parseOptionalFloat(val: string): number | undefined {
  if (!val) return undefined
  const n = parseFloat(val)
  return isNaN(n) ? undefined : n
}

function parseOptionalInt(val: string): number | undefined {
  if (!val) return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}

export function parseWhoopSleep(csv: string): { nights: SleepNight[] } {
  if (!csv.trim()) return { nights: [] }

  const rows = parseCsvRows(csv)

  const nights: SleepNight[] = rows.map(row => {
    const sleepOnset = row['Sleep onset'] ?? ''
    const wakeOnset = row['Wake onset'] ?? ''
    const date = sleepOnset.slice(0, 10)

    const lightMin = parseOptionalInt(row['Light sleep duration (min)'])
    const deepMin = parseOptionalInt(row['SWS duration (min)'])
    const remMin = parseOptionalInt(row['REM duration (min)'])
    const awakeMin = parseOptionalInt(row['Awake duration (min)'])
    const totalMin = (lightMin ?? 0) + (deepMin ?? 0) + (remMin ?? 0)

    return {
      id: uuidv4(),
      source: 'whoop' as const,
      sourceId: `whoop-${date}`,
      date,
      bedtime: sleepOnset,
      wakeTime: wakeOnset,
      totalMin: totalMin > 0 ? totalMin : undefined,
      deepMin,
      remMin,
      lightMin,
      awakeMin,
      sleepScore: parseOptionalInt(row['Sleep Score']),
      avgHrv: parseOptionalInt(row['HRV (ms)']),
      avgBreath: parseOptionalFloat(row['Respiratory Rate']),
      createdAt: Date.now(),
    }
  })

  return { nights }
}
