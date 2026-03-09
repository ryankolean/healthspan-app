// src/data/actions-rules.ts
import type { ActionDomain, AutoCompleteRule } from '../types/actions'

export interface RuleOption {
  value: AutoCompleteRule
  label: string
}

export const DOMAIN_RULES: Record<ActionDomain, RuleOption[]> = {
  exercise: [
    { value: 'any_workout', label: 'Any workout logged' },
    { value: 'cardio_workout', label: 'Cardio workout logged' },
    { value: 'strength_workout', label: 'Strength workout logged' },
  ],
  nutrition: [
    { value: 'any_meal', label: 'Any meal logged' },
    { value: 'all_meals', label: 'All meals logged (3+)' },
    { value: 'breakfast', label: 'Breakfast logged' },
    { value: 'lunch', label: 'Lunch logged' },
    { value: 'dinner', label: 'Dinner logged' },
  ],
  sleep: [
    { value: 'any_sleep', label: 'Sleep entry logged' },
  ],
  emotional: [
    { value: 'any_emotion', label: 'Mood check-in logged' },
  ],
  molecules: [
    { value: 'any_supplement', label: 'Any supplement taken' },
    { value: 'all_supplements', label: 'All supplements taken' },
  ],
}

export const DOMAIN_LABELS: Record<ActionDomain, string> = {
  exercise: 'Exercise',
  nutrition: 'Nutrition',
  sleep: 'Sleep',
  emotional: 'Emotional',
  molecules: 'Molecules',
}
