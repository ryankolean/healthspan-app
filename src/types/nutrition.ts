export type NutritionSource = 'manual'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface NutritionEntry {
  id: string
  source: NutritionSource
  date: string                    // YYYY-MM-DD
  mealType: MealType
  mealName?: string               // e.g. "Grilled chicken salad"

  // Macros
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  fiberG?: number

  createdAt: number
}

export interface NutritionSettings {
  bodyweightLbs: number           // for protein target: 1g/lb
  dailyCalorieTarget: number      // user-set goal
}

export const DEFAULT_NUTRITION_SETTINGS: NutritionSettings = {
  bodyweightLbs: 170,
  dailyCalorieTarget: 2200,
}
