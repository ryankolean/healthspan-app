// src/utils/exercise-parsers/garmin.ts
import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseType, VO2MaxEntry } from '../../types/exercise'

const CARDIO_ACTIVITIES = new Set([
  'Running', 'Cycling', 'Swimming', 'Walking', 'Hiking', 'Elliptical', 'Rowing',
])

const STRENGTH_ACTIVITIES = new Set([
  'Strength Training', 'Weight Training',
])

const STABILITY_ACTIVITIES = new Set([
  'Yoga', 'Pilates',
])

function garminTypeToExerciseType(activityType: string): ExerciseType {
  if (CARDIO_ACTIVITIES.has(activityType)) return 'cardio'
  if (STRENGTH_ACTIVITIES.has(activityType)) return 'strength'
  if (STABILITY_ACTIVITIES.has(activityType)) return 'stability'
  return 'sport'
}

function parseTimeToMin(val: string): number | undefined {
  if (!val) return undefined
  const parts = val.split(':')
  if (parts.length === 3) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  return undefined
}

function parseOptionalNumber(val: string): number | undefined {
  if (!val || val.trim() === '') return undefined
  const n = parseFloat(val)
  return isNaN(n) ? undefined : n
}

function parseOptionalInt(val: string): number | undefined {
  if (!val || val.trim() === '') return undefined
  const n = parseInt(val, 10)
  return isNaN(n) ? undefined : n
}

export function parseGarminExercise(csv: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  if (!csv || csv.trim() === '') return { workouts: [], vo2max: [] }

  const lines = csv.trim().split('\n')
  if (lines.length < 2) return { workouts: [], vo2max: [] }

  // Skip header row
  const workouts: ExerciseWorkout[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV fields (simple split — Garmin exports don't quote fields with commas)
    const fields = line.split(',')
    const activityType = fields[0]?.trim() ?? ''
    const dateStr = fields[1]?.trim() ?? ''
    // fields[2] = Favorite (ignored)
    const title = fields[3]?.trim() ?? ''
    const distance = fields[4]?.trim() ?? ''
    const calories = fields[5]?.trim() ?? ''
    const time = fields[6]?.trim() ?? ''
    const avgHr = fields[7]?.trim() ?? ''
    const maxHr = fields[8]?.trim() ?? ''
    // fields[9] = Avg Pace (ignored)
    // fields[10] = Best Pace (ignored)
    // fields[11] = Elev Gain (ignored)
    // fields[12] = Elev Loss (ignored)

    const date = dateStr.slice(0, 10) // YYYY-MM-DD

    workouts.push({
      id: uuidv4(),
      source: 'garmin' as const,
      sourceId: `garmin-${dateStr.replace(/[: ]/g, '-')}`,
      date,
      startTime: dateStr,
      type: garminTypeToExerciseType(activityType),
      activityName: title || activityType,
      durationMin: parseTimeToMin(time),
      distanceKm: parseOptionalNumber(distance),
      avgHr: parseOptionalInt(avgHr),
      maxHr: parseOptionalInt(maxHr),
      calories: parseOptionalInt(calories),
      createdAt: Date.now(),
    })
  }

  return { workouts, vo2max: [] }
}
