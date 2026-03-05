import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseSet, VO2MaxEntry } from '../../types/exercise'

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  })
}

export function parseHevyCsv(csv: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  if (!csv.trim()) return { workouts: [], vo2max: [] }

  const rows = parseCsvRows(csv)

  // Group by Date + Workout Name
  const groups = new Map<string, { date: string; name: string; sets: ExerciseSet[] }>()

  for (const row of rows) {
    const key = `${row['Date']}__${row['Workout Name']}`
    if (!groups.has(key)) {
      groups.set(key, { date: row['Date'], name: row['Workout Name'], sets: [] })
    }
    const group = groups.get(key)!
    const weightRaw = row['Weight']
    const repsRaw = row['Reps']
    const durationRaw = row['Duration']
    const weightKg = weightRaw ? parseFloat(weightRaw) : undefined
    const reps = repsRaw ? parseInt(repsRaw, 10) : undefined
    const durationSec = durationRaw ? parseInt(durationRaw, 10) : undefined
    group.sets.push({
      exercise: row['Exercise Name'],
      setIndex: parseInt(row['Set Order'], 10) - 1,
      weightKg: weightKg !== undefined && !isNaN(weightKg) ? weightKg : undefined,
      reps: reps !== undefined && !isNaN(reps) ? reps : undefined,
      durationSec: durationSec !== undefined && !isNaN(durationSec) ? durationSec : undefined,
    })
  }

  const workouts: ExerciseWorkout[] = Array.from(groups.values()).map(g => ({
    id: uuidv4(),
    source: 'hevy' as const,
    sourceId: `hevy-${g.date}-${g.name}`,
    date: g.date,
    type: 'strength' as const,
    activityName: g.name,
    sets: g.sets,
    createdAt: Date.now(),
  }))

  return { workouts, vo2max: [] }
}
