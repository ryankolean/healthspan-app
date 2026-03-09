// src/types/actions.ts
export type ActionFrequency =
  | { type: 'daily' }
  | { type: 'weekdays' }
  | { type: 'specific_days'; days: number[] }
  | { type: 'times_per_week'; count: number }

export type ActionDomain = 'exercise' | 'nutrition' | 'sleep' | 'emotional' | 'molecules'

export type AutoCompleteRule =
  | 'any_workout' | 'cardio_workout' | 'strength_workout'
  | 'any_meal' | 'all_meals' | 'breakfast' | 'lunch' | 'dinner'
  | 'any_sleep'
  | 'any_emotion'
  | 'any_supplement' | 'all_supplements'

export interface ActionDefinition {
  id: string
  label: string
  frequency: ActionFrequency
  domain?: ActionDomain
  autoCompleteRule?: AutoCompleteRule
  createdAt: string
  active: boolean
  sortOrder: number
}

export interface DailyActionEntry {
  actionId: string
  date: string             // YYYY-MM-DD
  completed: boolean
  completedAt?: string     // ISO timestamp
  autoCompleted: boolean
}

export interface ActionSettings {
  dayResetHour: number     // 0-23, default 0 (midnight)
}

export const DEFAULT_ACTION_SETTINGS: ActionSettings = {
  dayResetHour: 0,
}
