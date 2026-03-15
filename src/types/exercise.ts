// src/types/exercise.ts
export type ExerciseSource = 'oura' | 'apple_health' | 'strava' | 'hevy' | 'garmin' | 'fitbit' | 'strong' | 'samsung' | 'manual'
export type ExerciseType = 'cardio' | 'strength' | 'stability' | 'sport'

export interface ExerciseSet {
  exercise: string
  setIndex: number
  reps?: number
  weightKg?: number
  durationSec?: number
}

export interface ExerciseWorkout {
  id: string
  source: ExerciseSource
  sourceId: string
  date: string                    // ISO 8601 YYYY-MM-DD
  startTime?: string              // ISO 8601 datetime
  endTime?: string                // ISO 8601 datetime
  type: ExerciseType
  activityName: string
  durationMin?: number
  distanceKm?: number
  avgHr?: number
  maxHr?: number
  calories?: number
  zone2Min?: number               // minutes in Zone 2 (HR 60–70% of max HR)
  zone5Min?: number               // minutes in Zone 5 (HR ≥90% of max HR)
  sets?: ExerciseSet[]
  flaggedConflict?: boolean
  resolvedBy?: 'priority' | 'manual'
  createdAt: number
}

export interface VO2MaxEntry {
  id: string
  date: string
  value: number                   // mL/kg/min
  source: 'apple_health' | 'manual'
  method?: 'apple_watch' | 'clinical' | 'cooper_test' | 'ramp_test'
  notes?: string
  createdAt: number
}

export interface ExerciseSettings {
  priorityMode: 'global' | 'per_metric'
  globalPriority: ExerciseSource[]
  perMetricPriority?: {
    cardio: ExerciseSource[]
    strength: ExerciseSource[]
    steps: ExerciseSource[]
  }
}

export const DEFAULT_EXERCISE_SETTINGS = {
  priorityMode: 'global',
  globalPriority: ['strava', 'hevy', 'apple_health', 'oura', 'manual'],
} as const satisfies ExerciseSettings
