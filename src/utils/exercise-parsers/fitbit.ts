// src/utils/exercise-parsers/fitbit.ts
import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseType, VO2MaxEntry } from '../../types/exercise'

const CARDIO_ACTIVITIES = new Set([
  'Walk', 'Run', 'Hike', 'Bike', 'Swim', 'Elliptical', 'Treadmill',
])

const STRENGTH_ACTIVITIES = new Set([
  'Weights', 'Weight Training',
])

const STABILITY_ACTIVITIES = new Set([
  'Yoga', 'Pilates',
])

function fitbitTypeToExerciseType(activityName: string): ExerciseType {
  if (CARDIO_ACTIVITIES.has(activityName)) return 'cardio'
  if (STRENGTH_ACTIVITIES.has(activityName)) return 'strength'
  if (STABILITY_ACTIVITIES.has(activityName)) return 'stability'
  return 'sport'
}

interface FitbitActivity {
  logId: number
  activityName: string
  startTime: string
  duration: number // milliseconds
  averageHeartRate?: number
  calories?: number
  steps?: number
  distance?: number // km
}

export function parseFitbitExercise(jsonStr: string): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  const activities: FitbitActivity[] = JSON.parse(jsonStr)

  if (!Array.isArray(activities) || activities.length === 0) {
    return { workouts: [], vo2max: [] }
  }

  const workouts: ExerciseWorkout[] = activities.map((a) => {
    const date = a.startTime.slice(0, 10) // YYYY-MM-DD
    const durationMin = Math.round(a.duration / 60000)

    return {
      id: uuidv4(),
      source: 'fitbit' as const,
      sourceId: `fitbit-${a.logId}`,
      date,
      startTime: a.startTime,
      type: fitbitTypeToExerciseType(a.activityName),
      activityName: a.activityName,
      durationMin,
      distanceKm: a.distance,
      avgHr: a.averageHeartRate,
      calories: a.calories,
      createdAt: Date.now(),
    }
  })

  return { workouts, vo2max: [] }
}
