// src/utils/exercise-parsers/samsung.ts
import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseType, VO2MaxEntry } from '../../types/exercise'

const CARDIO_ACTIVITIES = new Set([
  'Running', 'Walking', 'Cycling', 'Swimming', 'Hiking', 'Elliptical',
])

const STRENGTH_ACTIVITIES = new Set([
  'Weight Training', 'Strength',
])

const STABILITY_ACTIVITIES = new Set([
  'Yoga', 'Pilates', 'Stretching',
])

function titleToExerciseType(title: string): ExerciseType {
  if (CARDIO_ACTIVITIES.has(title)) return 'cardio'
  if (STRENGTH_ACTIVITIES.has(title)) return 'strength'
  if (STABILITY_ACTIVITIES.has(title)) return 'stability'
  return 'sport'
}

function parseOptionalInt(val: string): number | undefined {
  if (!val || val.trim() === '') return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}

export function parseSamsungExercise(csv: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  if (!csv || csv.trim() === '') return { workouts: [], vo2max: [] }

  const lines = csv.trim().split('\n')

  // Filter out comment lines starting with #
  const dataLines = lines.filter((line) => !line.startsWith('#'))

  if (dataLines.length < 2) return { workouts: [], vo2max: [] }

  const workouts: ExerciseWorkout[] = []

  for (let i = 1; i < dataLines.length; i++) {
    const line = dataLines[i].trim()
    if (!line) continue

    const fields = line.split(',')
    // Columns: exercise_type,start_time,end_time,duration,calorie,distance,mean_heart_rate,max_heart_rate,title
    const startTime = fields[1]?.trim() ?? ''
    const durationMs = parseOptionalInt(fields[3]?.trim() ?? '')
    const calorie = parseOptionalInt(fields[4]?.trim() ?? '')
    const distanceM = parseOptionalInt(fields[5]?.trim() ?? '')
    const meanHr = parseOptionalInt(fields[6]?.trim() ?? '')
    const maxHr = parseOptionalInt(fields[7]?.trim() ?? '')
    const title = fields[8]?.trim() ?? ''

    const date = startTime.slice(0, 10) // YYYY-MM-DD

    workouts.push({
      id: uuidv4(),
      source: 'samsung' as const,
      sourceId: `samsung-${startTime.replace(/[: ]/g, '-')}`,
      date,
      startTime,
      type: titleToExerciseType(title),
      activityName: title,
      durationMin: durationMs != null ? Math.round(durationMs / 60000) : undefined,
      distanceKm: distanceM != null ? distanceM / 1000 : undefined,
      avgHr: meanHr,
      maxHr,
      calories: calorie,
      createdAt: Date.now(),
    })
  }

  return { workouts, vo2max: [] }
}
