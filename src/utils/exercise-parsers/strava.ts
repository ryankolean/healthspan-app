// src/utils/exercise-parsers/strava.ts
import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseType, VO2MaxEntry } from '../../types/exercise'

interface StravaActivity {
  id: number
  sport_type: string
  start_date: string
  elapsed_time: number        // seconds
  distance?: number           // meters
  average_heartrate?: number
  max_heartrate?: number
  total_elevation_gain?: number
}

const STRENGTH_SPORT_TYPES = new Set([
  'WeightTraining', 'Yoga', 'Pilates', 'CrossFit', 'RockClimbing',
])

function stravaTypeToExerciseType(sportType: string): ExerciseType {
  if (STRENGTH_SPORT_TYPES.has(sportType)) return 'strength'
  return 'cardio'
}

export function parseStravaActivities(activities: StravaActivity[]): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  if (!activities?.length) return { workouts: [], vo2max: [] }

  const workouts: ExerciseWorkout[] = activities.map(a => {
    const distanceKm = a.distance && a.distance > 0 ? a.distance / 1000 : undefined
    return {
      id: uuidv4(),
      source: 'strava' as const,
      sourceId: `strava-${a.id}`,
      date: a.start_date.slice(0, 10),
      startTime: a.start_date,
      type: stravaTypeToExerciseType(a.sport_type),
      activityName: a.sport_type,
      durationMin: Math.round(a.elapsed_time / 60),
      distanceKm,
      avgHr: a.average_heartrate,
      maxHr: a.max_heartrate,
      createdAt: Date.now(),
    }
  })

  return { workouts, vo2max: [] }
}
