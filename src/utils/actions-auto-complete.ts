// src/utils/actions-auto-complete.ts
import type { ActionDefinition, DailyActionEntry, AutoCompleteRule } from '../types/actions'
import { getWorkouts } from './exercise-storage'
import { getNutritionEntries } from './nutrition-storage'
import { getSleepNights } from './sleep-storage'
import { getEmotionalEntries } from './emotional-storage'
import { getMoleculeEntries, getDefinitions as getMoleculeDefinitions } from './molecules-storage'
import { getDailyEntries, saveDailyEntry } from './actions-storage'

function checkRule(rule: AutoCompleteRule, date: string): boolean {
  switch (rule) {
    // Exercise
    case 'any_workout':
      return getWorkouts({ from: date, to: date }).length > 0
    case 'cardio_workout':
      return getWorkouts({ from: date, to: date, type: 'cardio' }).length > 0
    case 'strength_workout':
      return getWorkouts({ from: date, to: date, type: 'strength' }).length > 0

    // Nutrition
    case 'any_meal':
      return getNutritionEntries({ from: date, to: date }).length > 0
    case 'all_meals':
      return getNutritionEntries({ from: date, to: date }).length >= 3
    case 'breakfast':
      return getNutritionEntries({ from: date, to: date }).some(e => e.mealType === 'breakfast')
    case 'lunch':
      return getNutritionEntries({ from: date, to: date }).some(e => e.mealType === 'lunch')
    case 'dinner':
      return getNutritionEntries({ from: date, to: date }).some(e => e.mealType === 'dinner')

    // Sleep — check yesterday's date since sleep is logged for the night before
    case 'any_sleep': {
      const yesterday = new Date(date + 'T12:00:00')
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      return getSleepNights({ from: yesterdayStr, to: yesterdayStr }).length > 0
    }

    // Emotional
    case 'any_emotion':
      return getEmotionalEntries({ from: date, to: date }).length > 0

    // Molecules
    case 'any_supplement':
      return getMoleculeEntries({ from: date, to: date }).some(e => e.taken)
    case 'all_supplements': {
      const activeDefs = getMoleculeDefinitions().filter(d => d.active)
      if (activeDefs.length === 0) return false
      const takenEntries = getMoleculeEntries({ from: date, to: date }).filter(e => e.taken)
      return activeDefs.every(def => takenEntries.some(e => e.moleculeId === def.id))
    }

    default:
      return false
  }
}

export interface ActionStatus {
  action: ActionDefinition
  completed: boolean
  autoCompleted: boolean
}

export function runAutoCompleteChecks(actions: ActionDefinition[], date: string): ActionStatus[] {
  const existingEntries = getDailyEntries(date)

  return actions.map(action => {
    const existing = existingEntries.find(e => e.actionId === action.id)

    // If manually completed or manually unchecked, respect that
    if (existing && !existing.autoCompleted) {
      return { action, completed: existing.completed, autoCompleted: false }
    }

    // If domain-linked with auto-complete rule, check it
    if (action.autoCompleteRule) {
      const isComplete = checkRule(action.autoCompleteRule, date)

      if (isComplete && (!existing || !existing.completed)) {
        // Auto-complete: save the entry
        const entry: DailyActionEntry = {
          actionId: action.id,
          date,
          completed: true,
          completedAt: new Date().toISOString(),
          autoCompleted: true,
        }
        saveDailyEntry(entry)
        return { action, completed: true, autoCompleted: true }
      }

      if (!isComplete && existing?.autoCompleted && existing.completed) {
        // Data was removed — un-auto-complete
        const entry: DailyActionEntry = {
          ...existing,
          completed: false,
          completedAt: undefined,
        }
        saveDailyEntry(entry)
        return { action, completed: false, autoCompleted: true }
      }

      if (existing) {
        return { action, completed: existing.completed, autoCompleted: existing.autoCompleted }
      }

      return { action, completed: false, autoCompleted: false }
    }

    // Custom action (no auto-complete)
    return {
      action,
      completed: existing?.completed ?? false,
      autoCompleted: false,
    }
  })
}

export function getIncompleteCount(actions: ActionDefinition[], date: string): number {
  const statuses = runAutoCompleteChecks(actions, date)
  return statuses.filter(s => !s.completed).length
}
