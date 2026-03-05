import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseType, VO2MaxEntry } from '../../types/exercise'

interface OuraWorkout {
  id: string
  activity: string
  calories?: number
  start: string
  end: string
  intensity?: string
}

interface OuraData {
  workouts?: OuraWorkout[]
}

const STRENGTH_ACTIVITIES = new Set([
  'weight_training', 'strength_training', 'functional_training', 'yoga', 'pilates',
])

function ouraActivityToType(activity: string): ExerciseType {
  if (STRENGTH_ACTIVITIES.has(activity)) return 'strength'
  return 'cardio'
}

function durationMin(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

export function parseOuraWorkouts(data: OuraData | null): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  if (!data?.workouts?.length) return { workouts: [], vo2max: [] }

  const workouts: ExerciseWorkout[] = data.workouts.map(w => ({
    id: uuidv4(),
    source: 'oura' as const,
    sourceId: w.id,
    date: w.start.slice(0, 10),
    startTime: w.start,
    endTime: w.end,
    type: ouraActivityToType(w.activity),
    activityName: w.activity,
    durationMin: durationMin(w.start, w.end),
    calories: w.calories,
    createdAt: Date.now(),
  }))

  return { workouts, vo2max: [] }
}
