import { v4 as uuidv4 } from 'uuid'
import type { SleepNight } from '../../types/sleep'

interface FitbitLevelsSummary {
  deep?: { minutes?: number }
  light?: { minutes?: number }
  rem?: { minutes?: number }
  wake?: { minutes?: number }
}

interface FitbitSleepEntry {
  dateOfSleep: string
  duration?: number
  efficiency?: number
  minutesAsleep?: number
  minutesAwake?: number
  levels?: {
    summary?: FitbitLevelsSummary
  }
}

export function parseFitbitSleep(jsonStr: string): { nights: SleepNight[] } {
  let entries: FitbitSleepEntry[]
  try {
    entries = JSON.parse(jsonStr)
  } catch {
    return { nights: [] }
  }

  if (!Array.isArray(entries) || entries.length === 0) return { nights: [] }

  const nights: SleepNight[] = entries.map(entry => {
    const summary = entry.levels?.summary
    const deepMin = summary?.deep?.minutes
    const lightMin = summary?.light?.minutes
    const remMin = summary?.rem?.minutes
    const awakeMin = summary?.wake?.minutes

    const hasStages = deepMin != null && lightMin != null && remMin != null
    const totalMin = hasStages ? deepMin + lightMin + remMin : entry.minutesAsleep

    return {
      id: uuidv4(),
      source: 'fitbit' as const,
      sourceId: `fitbit-${entry.dateOfSleep}`,
      date: entry.dateOfSleep,
      totalMin,
      deepMin,
      remMin,
      lightMin,
      awakeMin,
      efficiency: entry.efficiency,
      createdAt: Date.now(),
    }
  })

  return { nights }
}
